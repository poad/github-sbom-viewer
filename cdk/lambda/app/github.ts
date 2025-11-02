import { Octokit } from '@octokit/core';
import { paginateGraphQL, paginateGraphQLInterface } from '@octokit/plugin-paginate-graphql';
import { Endpoints } from '@octokit/types';
import { PaginateInterface, paginateRest } from '@octokit/plugin-paginate-rest';

import {
  listOrganizationsQuery,
  listCurrentUserRepositoriesQuery,
  listOrganizationRepositoriesQuery,
} from './constants';

interface Pagenation {
  paginate: PaginateInterface
};

type OctokitInstance = Octokit & paginateGraphQLInterface & Pagenation;

interface Organization {
  name: string
}

interface OrganizationNode {
  nodes: Organization[],
}

interface Organizations {
  organizations: OrganizationNode
}

interface Viewer {
  login: string
}

interface ListOrganizationsResponse {
  viewer: Viewer & Organizations,
};

interface Repository {
  name: string
  nameWithOwner: string
};

interface Repositories {
  nodes: Repository[],
};

interface RepositoryViewer extends Viewer {
  repositories: Repositories
}

interface listCurrentUserRepositoriesResponse {
  viewer: RepositoryViewer,
};

interface listOrganizationRepositoriesResponse {
  organization: RepositoryViewer,
};

function newOctokit(token: string): OctokitInstance {
  const MyOctokit = Octokit.plugin(paginateGraphQL, paginateRest);
  return new MyOctokit({ auth: token });
}

async function listOwners(octokit: OctokitInstance): Promise<string[]> {
  const response = await octokit.graphql.paginate<ListOrganizationsResponse>(listOrganizationsQuery);
  return response.viewer.organizations.nodes.map((node) => node.name).concat(response.viewer.login);
}

interface ListCurrentUserRepositoriesResponse { name: string; nameWithOwner: string, owner: string };

async function listCurrentUserRepositories(
  octokit: OctokitInstance,
): Promise<ListCurrentUserRepositoriesResponse[]> {
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

interface ListOrganizationRepositoriesResponse { name: string; nameWithOwner: string, owner: string };
async function listOrganizationRepositories(
  octokit: OctokitInstance, org: string,
): Promise<ListOrganizationRepositoriesResponse[]> {
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

interface GetSbomProps { owner: string, repo: string }

async function getSbom(
  octokit: OctokitInstance,
  { owner, repo }: GetSbomProps,
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
    getSbom: (param: GetSbomProps) => getSbom(octokit, param),
  };
}
