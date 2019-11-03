module.exports = {
  plugins: [
    {
      resolve: `gatsby-source-wpgraphql`,
      options: {
        url: `http://wpgraphql.local/graphql`,
      },
    },
    `gatsby-plugin-chakra-ui`,
  ],
}
