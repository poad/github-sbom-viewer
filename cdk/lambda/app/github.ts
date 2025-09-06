import { Octokit } from '@octokit/core';
import { paginateGraphQL, paginateGraphQLInterface } from '@octokit/plugin-paginate-graphql';
import { Endpoints } from '@octokit/types';
import { PaginateInterface, paginateRest } from '@octokit/plugin-paginate-rest';

import {
  listOrganizationsQuery,
  listCurrentUserRepositoriesQuery,
  listOrganizationRepositoriesQuery,
} from './constants';


type OctokitInstance = Octokit & paginateGraphQLInterface & {
  paginate: PaginateInterface
};

interface ListOrganizationsResponse {
  viewer: {
    login: string
    organizations: {
      nodes: {
        name: string
      }[],
    },
  },
};

interface listCurrentUserRepositoriesResponse {
  viewer: {
    login: string
    repositories: {
      nodes: {
        name: string
        nameWithOwner: string
      }[],
    },
  },
};

interface listOrganizationRepositoriesResponse {
  organization: {
    login: string
    repositories: {
      nodes: {
        name: string
        nameWithOwner: string
      }[],
    },
  },
};

function newOctokit(token: string): OctokitInstance {
  const MyOctokit = Octokit.plugin(paginateGraphQL, paginateRest);
  return new MyOctokit({ auth: token });
}

async function listOwners(octokit: OctokitInstance): Promise<string[]> {
  const response = await octokit.graphql.paginate<ListOrganizationsResponse>(listOrganizationsQuery);
  return response.viewer.organizations.nodes.map((node) => node.name).concat(response.viewer.login);
}

async function listCurrentUserRepositories(
  octokit: OctokitInstance,
): Promise<{ name: string; nameWithOwner: string, owner: string }[]> {
  const response = await octokit.graphql.paginate<listCurrentUserRepositoriesResponse>(
    listCurrentUserRepositoriesQuery);

  const repositories = response.viewer.repositories;
  const owner = response.viewer.login;
  return repositories.nodes.map((node) => ({
    owner,
    name: node.name,
    nameWithOwner: node.nameWithOwner,
  }));
}

async function listOrganizationRepositories(
  octokit: OctokitInstance, org: string,
): Promise<{ name: string; nameWithOwner: string, owner: string }[]> {
  const response = await octokit.graphql.paginate<listOrganizationRepositoriesResponse>(
    listOrganizationRepositoriesQuery, {
      login: org,
    },
  );

  const repositories = response.organization.repositories;
  const owner = response.organization.login;
  return repositories.nodes.map((node) => ({
    owner,
    name: node.name,
    nameWithOwner: node.nameWithOwner,
  }));
}

type GetSbomResponse = Endpoints['GET /repos/{owner}/{repo}/dependency-graph/sbom']['response']['data'];

async function getSbom(
  octokit: OctokitInstance,
  { owner, repo }: { owner: string, repo: string },
) {
  return octokit.paginate<GetSbomResponse>(
    '/repos/{owner}/{repo}/dependency-graph/sbom', {
      owner,
      repo,
      method: 'GET',
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
      per_page: 100,
    },
  );
}

export function GitHub(token: string) {
  const octokit = newOctokit(token);
  return {
    listOwners: () => listOwners(octokit),
    listCurrentUserRepositories: () => listCurrentUserRepositories(octokit),
    listOrganizationRepositories: (org: string) => listOrganizationRepositories(octokit, org),
    getSbom:(param: { owner: string; repo: string; }) => getSbom(octokit, param),
  };
}

// Individual function exports for handler
export async function getOwners(token: string) {
  const octokit = newOctokit(token);
  return listOwners(octokit);
}

export async function getUserRepos(token: string) {
  const octokit = newOctokit(token);
  return listCurrentUserRepositories(octokit);
}

export async function getOwnerRepos(token: string, owner: string) {
  const octokit = newOctokit(token);
  return listOrganizationRepositories(octokit, owner);
}

export async function getSbomData(token: string, owner: string, repo: string) {
  const octokit = newOctokit(token);
  return getSbom(octokit, { owner, repo });
}
