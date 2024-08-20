const listOrganizationsQuery = `
  query paginate($cursor: String){
    viewer {
      login
      organizations (first: 100, after: $cursor) {
        nodes {
          name
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

const listCurrentUserRepositoriesQuery = `
  query paginate($cursor: String) {
    viewer {
      login
      repositories(first: 100, after: $cursor, orderBy: {field: NAME, direction: ASC}) {
        nodes {
          name
          nameWithOwner
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

const listOrganizationRepositoriesQuery = `
  query paginate($cursor: String, $login: String!){
    organization(login: $login) {
      login
      repositories(first: 100, after: $cursor, orderBy: { field: NAME, direction: ASC }) {
        nodes {
          name
          nameWithOwner
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

export {
  listOrganizationsQuery,
  listCurrentUserRepositoriesQuery,
  listOrganizationRepositoriesQuery,
};
