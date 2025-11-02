import { For, Show, createResource } from 'solid-js';
import { A, useParams } from '@solidjs/router';
import { FadeLoader } from '../../../features/ui/components';

interface OrganizationRepository {
  name: string;
  nameWithOwner: string;
  owner: string;
}

interface OrganizationApiResponse {
  repos: OrganizationRepository[];
}

export default function OrganizationRepos() {
  const { login } = useParams();
  const [data] = createResource<
    OrganizationApiResponse>(() =>
      fetch(`/api/github/owners/${login}`).then((resp) => resp.json()),
    );
  return (
    <>
      <h1>Repositories</h1>
      <p>
        <Show when={!data.loading} fallback={(<FadeLoader />)}>
          <ul>
            <For each={data()?.repos}>
              {(repo) => <li><A href={`./${repo.name}`}>{repo.nameWithOwner}</A></li>}
            </For>
          </ul>
        </Show>
      </p>
      <p>
        <A href="/">HOME</A>
      </p>
    </>
  );
}
