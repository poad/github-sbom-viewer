import { FadeLoader } from '../../../features/ui/components';

import { useParams } from '@solidjs/router';
import { createMemo, Errored, For, Loading } from 'solid-js';

interface OrganizationRepository {
  name: string;
  nameWithOwner: string;
  owner: string;
}

interface OrganizationApiResponse {
  repos: OrganizationRepository[];
}

export default function OrganizationRepos() {
  const params = useParams();
  const data = createMemo(() =>
    fetch(`/api/github/owners/${params.login}`).then(
      (resp) => resp.json() as Promise<OrganizationApiResponse>,
    ),
  );
  return (
    <>
      <h1>Repositories</h1>
      <p>
        <Errored fallback={<p role="alert">Failed to load repositories.</p>}>
          <Loading fallback={<FadeLoader />}>
            <ul>
              <For each={data()?.repos}>
                {(repo) => (
                  <li>
                    <a href={`/owners/${params.login}/${repo.name}`}>{repo.nameWithOwner}</a>
                  </li>
                )}
              </For>
            </ul>
          </Loading>
        </Errored>
      </p>
      <p>
        <a href="/">HOME</a>
      </p>
    </>
  );
}
