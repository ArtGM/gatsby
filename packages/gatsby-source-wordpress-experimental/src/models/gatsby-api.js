import merge from "lodash/merge"
import { createRemoteMediaItemNode } from "~/steps/source-nodes/create-nodes/create-remote-media-item-node"

const defaultPluginOptions = {
  url: null,
  verbose: false,
  debug: {
    graphql: {
      showQueryOnError: false,
      showQueryVarsOnError: false,
      copyQueryOnError: false,
      panicOnError: false,
    },
  },
  develop: {
    nodeUpdateInterval: 300,
  },
  schema: {
    queryDepth: 10,
    typePrefix: `Wp`,
  },
  type: {
    MediaItem: {
      lazyNodes: true,
      beforeChangeNode: async ({ remoteNode, actionType }) => {
        if (actionType === `CREATE` || actionType === `UPDATE`) {
          const createdMediaItem = await createRemoteMediaItemNode({
            mediaItemNode: remoteNode,
          })

          if (createdMediaItem) {
            remoteNode.remoteFile = {
              id: createdMediaItem.id,
            }
          }
        }
      },
    },
    ContentNode: {
      nodeInterface: true,
    },
    ActionMonitorAction: {
      limit: 1,
    },
    Menu: {
      /**
       * This is used to fetch child menu items
       * on Menus as it's problematic to fetch them otherwise
       * in WPGQL currently
       *
       * So after a Menu Node is fetched and processed, this function runs
       * It loops through the child menu items, generates a query for them,
       * fetches them, and creates nodes out of them.
       *
       * This runs when initially fetching all nodes, and after an incremental
       * fetch happens
       *
       * When we can get a list of all menu items regardless of location in WPGQL, this can be removed.
       */
      beforeChangeNode: async ({
        remoteNode,
        actionType,
        wpStore,
        fetchGraphql,
        helpers,
        actions,
        buildTypeName,
      }) => {
        if (
          (actionType !== `UPDATE` &&
            actionType !== `CREATE_ALL` &&
            actionType !== `CREATE`) ||
          !remoteNode.menuItems ||
          !remoteNode.menuItems.nodes ||
          !remoteNode.menuItems.nodes.length
        ) {
          // no need to update child MenuItems if we're not updating an existing menu
          // if we're creating a new menu it will be empty initially.
          // so we run this function when updating nodes or when initially
          // creating all nodes
          return null
        }

        const selectionSet = wpStore.getState().remoteSchema.nodeQueries
          .menuItems.selectionSet

        const query = `
        fragment MENU_ITEM_FIELDS on MenuItem {
          ${selectionSet}
        }

        query {
            ${remoteNode.menuItems.nodes
              .map(
                ({ id }, index) =>
                  `id__${index}: menuItem(id: "${id}") { ...MENU_ITEM_FIELDS }`
              )
              .join(` `)}
          }`

        const { data } = await fetchGraphql({
          query,
        })

        const remoteChildMenuItemNodes = Object.values(data)

        await Promise.all(
          remoteChildMenuItemNodes.map(async remoteMenuItemNode => {
            await actions.createNode({
              ...remoteMenuItemNode,
              nodeType: `MenuItem`,
              type: `MenuItem`,
              parent: null,
              internal: {
                contentDigest: helpers.createContentDigest(remoteMenuItemNode),
                type: buildTypeName(`MenuItem`),
              },
            })
          })
        )

        return remoteChildMenuItemNodes.map(({ id }) => id)
      },
    },
    MenuItem: {
      /**
       * This was my previous attempt at fetching problematic menuItems
       * I temporarily solved this above, but I'm leaving this here as
       * a reminder of the nodeListQueries API
       *
       * this worked to pull all menus in the initial fetch, but menus had to be assigned to a location
       * that was problematic because saving a menu would then fetch those menu items using the incremental fetching logic in this plugin. So menu items that previously existed in WP wouldn't show up initially if they had no location set, then as menus were saved they would show up.
       */
      // nodeListQueries: ({
      //   name,
      //   store,
      //   transformedFields,
      //   helpers: { buildNodesQueryOnFieldName },
      // }) => {
      //   const menuLocationEnumValues = store
      //     .getState()
      //     .remoteSchema.introspectionData.__schema.types.find(
      //       type => type.name === `MenuLocationEnum`
      //     )
      //     .enumValues.map(value => value.name)
      //   const queries = menuLocationEnumValues.map(enumValue =>
      //     buildNodesQueryOnFieldName({
      //       fields: transformedFields,
      //       fieldName: name,
      //       fieldVariables: `where: { location: ${enumValue} }`,
      //     })
      //   )
      //   return queries
      // },
    },
  },
}

const gatsbyApi = {
  state: {
    helpers: {},
    pluginOptions: defaultPluginOptions,
  },

  reducers: {
    setState(state, payload) {
      return merge(state, payload)
    },
  },
}

export default gatsbyApi