import { A } from '@solidjs/router';
import { createResource, For, Show } from 'solid-js';
import { FadeLoader } from '../../features/ui/components';
import styles from './index.module.css';

interface Repository {
  name: string;
  nameWithOwner: string;
  owner: string;
}

interface UserRepositories {
  repos: Repository[];
}

export default function UserRepos() {
  const [data] = createResource<
    UserRepositories>(() =>
      fetch('/api/github/repos').then((resp) => resp.json()),
    );
  return (
    <>
      <header class={styles.header}>
        <A href="/">TOP</A>
      </header>
      <div style={{ width: 'calc(100vw - 12px)', 'text-align': 'center' }}>
        <h1 style={{ 'margin-left': 'auto', 'margin-right': 'auto' }}>Repositories</h1>
        <p>
          <Show when={!data.loading} fallback={(<FadeLoader />)}>
            <ul>
              <For each={data()?.repos}>
                {(repo) => <li><A href={`./${repo.name}`}>{repo.nameWithOwner}</A></li>}
              </For>
            </ul>
          </Show>
        </p>
      </div>
    </>
  );
}
