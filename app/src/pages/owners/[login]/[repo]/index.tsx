import DependencyGraph from '../../../../components/DependencyGraph';
import { FadeLoader } from '../../../../features/ui/components';
import Button from '../../../../features/ui/components/Button';
import Table, { Th } from '../../../../features/ui/components/Table';

import { useParams } from '@solidjs/router';
import { createMemo, Errored, For, Loading, Show, createSignal } from 'solid-js';

export default function OrganizationRepos() {
  const params = useParams();
  const data = createMemo(() =>
    fetch(`/api/github/sbom/${params.login}/${params.repo}`).then(
      (resp) => resp.json() as Promise<Sbom[]>,
    ),
  );
  const [viewMode, setViewMode] = createSignal<'table' | 'graph'>('table');
  return (
    <>
      <h1>SBOM</h1>
      <div style={{ margin: '20px 0' }}>
        <Button onClick={() => setViewMode('table')} active={viewMode() === 'table'}>
          テーブル表示
        </Button>
        <Button onClick={() => setViewMode('graph')} active={viewMode() === 'graph'}>
          グラフ表示
        </Button>
      </div>
      <div>
        <Errored fallback={<p role="alert">Failed to load SBOM.</p>}>
          <Loading fallback={<FadeLoader />}>
            <For each={data()}>
              {(sbom) => (
                <>
                  <h2>{sbom.sbom.name}</h2>
                  <Show when={viewMode() === 'table'}>
                    <Table>
                      <thead>
                        <tr style={{ background: '#374151', color: 'white' }}>
                          <Th>name</Th>
                          <Th>version info</Th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={sbom.sbom.packages}>
                          {(pkg) => (
                            <tr style={{ background: '#cbd5e1' }}>
                              <td
                                style={{
                                  padding: '12px',
                                  border: '1px solid #d1d5db',
                                }}
                              >
                                {pkg.name}
                              </td>
                              <td
                                style={{
                                  padding: '12px',
                                  border: '1px solid #d1d5db',
                                }}
                              >
                                {pkg.versionInfo}
                              </td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </Table>
                  </Show>
                  <Show when={viewMode() === 'graph'}>
                    <div style={{ margin: '20px 0' }}>
                      <DependencyGraph
                        packages={sbom.sbom.packages}
                        mainPackageName={sbom.sbom.name}
                        width={800}
                        height={600}
                      />
                    </div>
                  </Show>
                </>
              )}
            </For>
          </Loading>
        </Errored>
      </div>
      <p>
        <a href="/">HOME</a>
      </p>
    </>
  );
}
