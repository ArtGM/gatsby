const { getPaginatedQuery } = require(`./graphql-queries`)
const fetchGraphql = require(`../../utils/fetch-graphql`)

const paginatedWpNodeFetch = async ({
  contentTypePlural,
  contentTypeSingular,
  url,
  query,
  allContentNodes = [],
  ...variables
}) => {
  // skip fetching media items for now
  if (contentTypePlural === `mediaItems`) {
    return allContentNodes
  }

  const paginatedQuery = getPaginatedQuery(query)

  const response = await fetchGraphql({
    url,
    query: paginatedQuery,
    variables,
  })

  const { data } = response

  if (!data[contentTypePlural] || !data[contentTypePlural].nodes) {
    return allContentNodes
  }

  const {
    [contentTypePlural]: {
      nodes,
      pageInfo: { hasNextPage, endCursor },
    },
  } = data

  if (nodes) {
    nodes.forEach(node => {
      node.contentType = contentTypeSingular
      node.wpId = node.id
      allContentNodes.push(node)
    })
  }

  if (hasNextPage) {
    await paginatedWpNodeFetch({
      first: 100,
      after: endCursor,
      url,
      contentTypePlural,
      contentTypeSingular,
      query,
      allContentNodes,
    })
  }

  return allContentNodes
}

module.exports = paginatedWpNodeFetch