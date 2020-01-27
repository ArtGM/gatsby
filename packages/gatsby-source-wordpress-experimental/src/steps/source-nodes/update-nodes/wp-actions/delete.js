import { formatLogMessage } from "~/utils/format-log-message"
import store from "~/store"

const wpActionDELETE = async ({ helpers, cachedNodeIds, wpAction }) => {
  const { reporter, actions, getNode } = helpers

  // get the node ID from the WPGQL id
  const nodeId = wpAction.referencedNodeGlobalRelayID

  const { verbose } = store.getState().gatsbyApi.pluginOptions

  reporter.log(``)
  reporter.info(
    formatLogMessage(
      `deleted ${wpAction.referencedNodeSingularName}${
        verbose
          ? `

  {
    ${wpAction.referencedNodeSingularName}Id: ${wpAction.referencedNodeID},
    id: ${nodeId}
  }`
          : ` ${wpAction.referencedNodeID}`
      }`
    )
  )

  reporter.log(``)

  const node = await getNode(nodeId)

  if (node) {
    // @todo figure out why touching nodes before deleting was necessary
    await actions.touchNode({ nodeId })
    await actions.deleteNode({ node })
  }

  // Remove this from cached node id's so we don't try to touch it
  const validNodeIds = cachedNodeIds.filter(cachedId => cachedId !== nodeId)

  return validNodeIds
}

module.exports = wpActionDELETE