import { FadeLoader } from '../../features/ui/components';
import styles from './index.module.css';

import { createMemo, Errored, For, Loading } from 'solid-js';

interface Repository {
  name: string;
  nameWithOwner: string;
  owner: string;
}

interface UserRepositories {
  repos: Repository[];
}

export default function UserRepos() {
  const data = createMemo(() =>
    fetch('/api/github/repos').then((resp) => resp.json() as Promise<UserRepositories>),
  );
  return (
    <>
      <header class={styles.header}>
        <a href="/">TOP</a>
      </header>
      <div style={{ width: 'calc(100vw - 12px)', 'text-align': 'center' }}>
        <h1 style={{ 'margin-left': 'auto', 'margin-right': 'auto' }}>Repositories</h1>
        <p>
          <Errored fallback={<p role="alert">Failed to load repositories.</p>}>
            <Loading fallback={<FadeLoader />}>
              <ul>
                <For each={data()?.repos}>
                  {(repo) => (
                    <li>
                      <a href={`/repos/${repo.name}`}>{repo.nameWithOwner}</a>
                    </li>
                  )}
                </For>
              </ul>
            </Loading>
          </Errored>
        </p>
      </div>
    </>
  );
}
