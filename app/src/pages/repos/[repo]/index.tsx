import { For, Show, createResource, createSignal } from 'solid-js';
import { A, useParams } from '@solidjs/router';
import { FadeLoader } from '../../../features/ui/components';
import Button from '../../../features/ui/components/Button';
import Table, { Th } from '../../../features/ui/components/Table';
import DependencyGraph from '../../../components/DependencyGraph';

export default function OrganizationRepos() {
  const { repo } = useParams();
  const user = document.cookie.split('; ').find(item => item.startsWith('user='))?.split('=')[1] ?? '';

  const [data] = createResource<Sbom[]>(() =>
    fetch(`/api/github/sbom/${user}/${repo}`).then((resp) => resp.json()),
  );
  const [viewMode, setViewMode] = createSignal<'table' | 'graph'>('table');
  return (
    <>
      <p style={{ 'margin-bottom': '20px', 'margin-left': '3rem' }}>
        <A href="/">HOME</A>
      </p>
      <h1>SBOM</h1>
      <div style={{ margin: '20px 0' }}>
        <Button
          onClick={() => setViewMode('table')}
          active={viewMode() === 'table'}
        >
          テーブル表示
        </Button>
        <Button
          onClick={() => setViewMode('graph')}
          active={viewMode() === 'graph'}
        >
          グラフ表示
        </Button>
      </div>
      <div>
        <Show when={!data.loading} fallback={(<FadeLoader />)}>
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
                          <tr style={{ background: '#e5e7eb' }}>
                            <td style={{
                              padding: '12px',
                              border: '1px solid #d1d5db',
                              color: '#374151',
                            }}>{pkg.name}</td>
                            <td style={{
                              padding: '12px',
                              border: '1px solid #d1d5db',
                              color: '#374151',
                            }}>{pkg.versionInfo}</td>
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
        </Show>
      </div>
    </>
  );
}
