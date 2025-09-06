import { For, Show, createResource, createSignal } from 'solid-js';
import { A, useParams } from '@solidjs/router';
import { FadeLoader } from '../../../../features/ui/components';
import { fetchWithAuth } from '../../../../utils/api';
import { DependencyGraph } from '../../../../components/DependencyGraph';
import styles from './styles.module.css';

export default function OrganizationRepos() {
  const { login, repo } = useParams();
  const [viewMode, setViewMode] = createSignal<'table' | 'graph'>('table');

  const [data] = createResource<Sbom[]>(async () => {
    const response = await fetchWithAuth(`/api/github/sbom/${login}/${repo}`);
    return response.json();
  });

  return (
    <>
      <h1>SBOM</h1>
      <div class={styles.viewModeContainer}>
        <button
          onClick={() => setViewMode('table')}
          class={`${styles.viewModeButton} ${viewMode() === 'table' ? styles.active : styles.inactive}`}
        >
          テーブル表示
        </button>
        <button
          onClick={() => setViewMode('graph')}
          class={`${styles.viewModeButton} ${viewMode() === 'graph' ? styles.active : styles.inactive}`}
        >
          依存関係グラフ
        </button>
      </div>
      <div>
        <Show when={!data.loading} fallback={(<FadeLoader />)}>
          <For each={data()}>
            {(sbom) => (
              <>
                <h2>{sbom.sbom.name}</h2>
                <Show when={viewMode() === 'table'}>
                  <table class={styles.table}>
                    <thead>
                      <tr class={styles.tableHeader}>
                        <th class={styles.tableHeaderCell}>名前</th>
                        <th class={styles.tableHeaderCell}>バージョン</th>
                        <th class={styles.tableHeaderCell}>ライセンス</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={sbom.sbom.packages}>
                        {(pkg) => (
                          <tr>
                            <td class={styles.tableCell}>{pkg.name || 'N/A'}</td>
                            <td class={styles.tableCell}>{pkg.versionInfo || 'N/A'}</td>
                            <td class={styles.tableCell}>{pkg.licenseConcluded || 'N/A'}</td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </Show>
                <Show when={viewMode() === 'graph'}>
                  <div class={styles.graphContainer}>
                    <DependencyGraph packages={sbom.sbom.packages} width={1000} height={700} />
                  </div>
                </Show>
              </>
            )}
          </For>
        </Show>
      </div>
      <p class={styles.homeLink}>
        <A href="/">HOME</A>
      </p>
    </>
  );
}
