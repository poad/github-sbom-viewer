import { A } from '@solidjs/router';
import { createResource, For, Show } from 'solid-js';
import { FadeLoader } from '../../features/ui/components';

export default function UserRepos() {
  const [data] = createResource<
    {
      repos: {
        name: string;
        nameWithOwner: string;
        owner: string;
      }[];
    }>(() =>
      fetch('/api/github/repos').then((resp) => resp.json()),
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
