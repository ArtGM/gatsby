import fetchGraphql from "~/utils/fetch-graphql"
import store from "~/store"
import { formatLogMessage } from "~/utils/format-log-message"
import chalk from "chalk"
import { getQueryInfoBySingleFieldName } from "../../helpers"
import { getGatsbyApi } from "~/utils/get-gatsby-api"
import { CREATED_NODE_IDS } from "~/constants"
// import { findConnectedNodeIds } from "~/steps/source-nodes/create-nodes/create-nodes"
import {
  buildTypeName,
  getTypeSettingsByType,
} from "~/steps/create-schema-customization/helpers"

export const fetchAndCreateSingleNode = async ({
  singleName,
  id,
  actionType,
  cachedNodeIds,
  previewId = null,
  token = null,
}) => {
  const { nodeQuery, previewQuery } =
    getQueryInfoBySingleFieldName(singleName) || {}

  const query = previewId ? previewQuery : nodeQuery

  const {
    helpers: { reporter, getNode },
  } = getGatsbyApi()

  if (!query) {
    reporter.log(``)
    reporter.warn(
      formatLogMessage(
        `A ${singleName} was updated, but no query was found for this node type.`
      )
    )
    reporter.log(``)

    return { node: null }
  }

  const queryId = previewId ?? id

  const headers = token
    ? {
        // don't change this header..
        // underscores and the word auth are being
        // stripped on the php side for some reason
        WPGatsbyPreview: token,
      }
    : {}

  let { data } = await fetchGraphql({
    headers,
    query,
    variables: {
      id: queryId,
    },
  })

  // if we ask for a node that doesn't exist
  if (!data || (data && data[singleName] === null)) {
    return { node: null }
  }

  const existingNode = await getNode(id)

  let remoteNode = data[singleName]

  console.log(`------`)
  console.log(`new preview`)
  console.log(`------`)
  console.log(remoteNode.uri)

  console.log(remoteNode)

  if (previewId && existingNode && remoteNode.status !== `draft`) {
    // this is a preview of an existing post
    const originalFieldsToRetain = {
      uri: existingNode.uri,
      link: existingNode.link,
      status: existingNode.status,
      slug: existingNode.slug,
      parent: existingNode.parent,
      databaseId: existingNode.databaseId,
      guid: existingNode.guid,
      id,
    }

    remoteNode = {
      ...remoteNode,
      ...originalFieldsToRetain,
    }
  }

  console.log(remoteNode.uri)

  if (remoteNode.uri.includes(`?`)) {
    // this is a brand new post preview of a draft
    // we can use it as is, but the path may be something like ?p=5543.
    // That is no good for Gatsby, we need to convert that to something like /p/5543
    // seems the easiest solution is to replace ? and = with /
    const newUri = remoteNode.uri.replace(`?`, ``).replace(`=`, `/`)

    console.log(newUri)

    remoteNode.uri = newUri
  }

  data[singleName] = remoteNode

  // returns an object
  const createdNode = await createSingleNode({
    singleName,
    id,
    actionType,
    data,
    cachedNodeIds,
  })

  return createdNode || null
}

export const createSingleNode = async ({
  singleName,
  id,
  actionType,
  data,
  cachedNodeIds,
}) => {
  const { helpers } = getGatsbyApi()
  const { typeInfo } = getQueryInfoBySingleFieldName(singleName)

  if (!cachedNodeIds) {
    cachedNodeIds = await helpers.cache.get(CREATED_NODE_IDS)
  }

  const updatedNodeContent = {
    ...data[singleName],
    nodeType: typeInfo.nodesTypeName,
    type: typeInfo.nodesTypeName,
  }

  const { actions } = helpers

  const { createContentDigest } = helpers

  let remoteNode = {
    ...updatedNodeContent,
    id: id,
    parent: null,
    internal: {
      contentDigest: createContentDigest(updatedNodeContent),
      type: buildTypeName(typeInfo.nodesTypeName),
    },
  }

  /**
   * @todo This commented code will be used to refetch connected nodes that might need to be connected back to this node but aren't currently
   * see the note at the top find-connected-nodes.js for more info
   */
  // const connectedNodeIds = findConnectedNodeIds(updatedNodeContent) || []
  // .filter(
  //   async childNodeId => {
  //     const childNode = await getNode(childNodeId)
  //     return childNode
  //   }
  // )

  // if (connectedNodeIds && connectedNodeIds.length) {
  //   dump(childNodeIds)
  // } else {
  //   dump(remoteNode)
  //   helpers.reporter.info(`no children for ${singleName}`)
  // }

  const typeSettings = getTypeSettingsByType({
    name: typeInfo.nodesTypeName,
  })

  let additionalNodeIds
  let cancelUpdate

  if (
    typeSettings.beforeChangeNode &&
    typeof typeSettings.beforeChangeNode === `function`
  ) {
    const {
      additionalNodeIds: receivedAdditionalNodeIds,
      remoteNode: receivedRemoteNode,
      cancelUpdate: receivedCancelUpdate,
    } =
      (await typeSettings.beforeChangeNode({
        actionType: actionType,
        remoteNode,
        actions,
        helpers,
        fetchGraphql,
        typeSettings,
        buildTypeName,
        type: typeInfo.nodesTypeName,
        wpStore: store,
      })) || {}

    additionalNodeIds = receivedAdditionalNodeIds
    cancelUpdate = receivedCancelUpdate

    if (receivedRemoteNode) {
      remoteNode = receivedRemoteNode
    }
  }

  if (cancelUpdate) {
    return {
      additionalNodeIds,
      remoteNode: null,
    }
  }

  if (remoteNode) {
    await actions.createNode(remoteNode)

    cachedNodeIds.push(remoteNode.id)

    if (additionalNodeIds && additionalNodeIds.length) {
      additionalNodeIds.forEach(id => cachedNodeIds.push(id))
    }

    await helpers.cache.set(CREATED_NODE_IDS, cachedNodeIds)
  }

  return { additionalNodeIds, node: remoteNode }
}

const wpActionUPDATE = async ({
  helpers,
  wpAction,
  // intervalRefetching,
}) => {
  const reportUpdate = ({ setAction } = {}) => {
    const actionType = setAction || wpAction.actionType

    reporter.log(``)
    reporter.info(
      formatLogMessage(
        `${chalk.bold(
          `${actionType.toLowerCase()} ${wpAction.referencedNodeSingularName}`
        )} ${wpAction.title} (#${wpAction.referencedNodeID})`
      )
    )
    reporter.log(``)
  }

  const { reporter, cache, actions } = helpers

  let cachedNodeIds = await cache.get(CREATED_NODE_IDS)

  const state = store.getState()
  const {
    gatsbyApi: {
      pluginOptions: { verbose },
      helpers: { getNode },
    },
  } = state

  const nodeId = wpAction.referencedNodeGlobalRelayID

  const existingNode = await getNode(nodeId)

  if (wpAction.referencedNodeStatus !== `publish`) {
    // if the post status isn't publish anymore, we need to remove the node
    // by removing it from cached nodes so it's garbage collected by Gatsby
    const validNodeIds = cachedNodeIds.filter(cachedId => cachedId !== nodeId)

    await cache.set(CREATED_NODE_IDS, validNodeIds)

    if (existingNode) {
      await actions.touchNode({ nodeId })
      await actions.deleteNode({ node: existingNode })
      reportUpdate({ setAction: `DELETE` })
    }

    return
  }

  const { node } = await fetchAndCreateSingleNode({
    id: nodeId,
    actionType: wpAction.actionType,
    singleName: wpAction.referencedNodeSingularName,
    cachedNodeIds,
  })

  if (node) {
    reportUpdate()

    if (verbose) {
      const nodeEntries = existingNode ? Object.entries(existingNode) : null

      if (nodeEntries && nodeEntries.length) {
        nodeEntries
          .filter(([key]) => !key.includes(`modifiedGmt`) && key !== `modified`)
          .forEach(([key, value]) => {
            if (!node || !node[key]) {
              return
            }

            if (
              // if the value of this field changed, log it
              typeof node[key] === `string` &&
              value !== node[key]
            ) {
              reporter.log(``)
              reporter.info(chalk.bold(`${key} changed`))
              reporter.log(``)
              reporter.log(`${chalk.italic.bold(`    from`)}`)
              reporter.log(`      ${value}`)
              reporter.log(chalk.italic.bold(`    to`))
              reporter.log(`      ${node[key]}`)
              reporter.log(``)
            }
          })

        reporter.log(``)
      }
    }
  }

  // return cachedNodeIds
}

export default wpActionUPDATE
