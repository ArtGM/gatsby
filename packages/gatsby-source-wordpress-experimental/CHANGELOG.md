# Change Log

## 0.1.4

### New Features

- Inline links in any node content (custom fields or in post_content) will be replaced with local relative links. https://your-beautiful-wp-site.com/page-2 will become /page-2 so that Gatsby can make sense of it.

## 0.1.3

### Bug fixes

- Previously root fields that were lists of non_null built in Scalars or non_null lists of Scalars on RootQuery fields that weren't lists of nodes could throw errors in some cases. This release fixes that.

## 0.1.2

### New Features

- Using the types.TypeName.lazyNodes option now works properly. Essentially what this option does is prevent fetching remote files and processing them via gatsby-image/Sharp unless they're queried for. When queried for, remote files are fetched in the gql resolver if the file doesn't exist locally. It's not recommended to use this if you're using gatsby-image a lot as fetching images this way is much slower. You might want to use this if you mostly use the original WP hosted media files 95% of the time and then just use a few gatsby-image's locally.

## 0.1.1

### Breaking changes

- Changed accepted WPGatsby version range to ~0.2.3

### Bug Fixes

- Because everything is fetched in a flat list, hierarchical terms weren't being properly sourced. Code was added to specifically support the Category type, but this will be made generic for all types soon as this is a reocurring problem.

## 0.1.0

### Breaking changes

- Changed accepted WPGatsby version range to ~0.2.2
- Changed accepted WPGraphQL version range to ~0.8.3
- Removed custom WpContentTypes type and contentTypes field as WPGraphQL 0.8.3 has this built in now

## 0.0.42

### Bug Fixes

- Scoped babel plugin source-map-support to just development env to prevent `warn Module not found: Error: Can't resolve 'fs' in warn Module not found: Error: Can't resolve 'module' in` errors

## 0.0.41

### Bug Fixes

- The `copyQueryOnError` plugin option was throwing cryptic errors on systems that don't support copy (namely CI). Now this is in a try/catch and the error is tossed away. This helps ensure users see relevant errors.

## 0.0.40 - skipped

## 0.0.39

### Bug Fixes

- Fixed normalizeUri helper to account for null uri (if a node has no uri)

### Features

- Improved fetch error messages. Some users were getting confused when they added www. to their api url setting. Visiting that URL in browser brought them to the GraphQL api endpoint. The problem is that WP seems to sometimes redirect in browser and axios can't handle this. The new error messages account for this.

## 0.0.38

### Bug Fixes

- For fields that are connections to lists of nodes, default variables were added to grab the first 100, before the max was 10. In the future an API will need to be added to resolve these lists of connections on the Gatsby-side, for now this works for a good deal of use-cases

## 0.0.37

### Bug Fixes

- Adding Preview support in an earlier release broke inc-builds in an effort to speed up previews. This release restores inc-builds functionality

## 0.0.36

### Bug Fixes

- Fixed lists of non_null types which have their type on type.ofType.ofType instead of type.ofType

## 0.0.35

### Bug Fixes

- Lists of MediaItems were not being recognized as media files that are referenced. This means those media items weren't being sourced as we only source referenced media items. This version fixes that issue!

## 0.0.34

### Bug Fixes

- Fixed an error where queries return null for some posts and we were checking properties on null. https://github.com/TylerBarnes/using-gatsby-source-wordpress-experimental/issues/6

## 0.0.33

### Features

- Updated Readme for npm

## 0.0.32

### Bug Fixes

- In the schema, lists of non null types weren't being properly ingested. For example a NON_NULL list of Blocks. This is now fixed! Thanks Peter Pristas!
