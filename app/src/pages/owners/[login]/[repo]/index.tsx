import { For, Show, createResource, createSignal } from 'solid-js';
import { A, useParams } from '@solidjs/router';
import { FadeLoader } from '../../../../features/ui/components';
import DependencyGraph from '../../../../components/DependencyGraph';

export default function OrganizationRepos() {
  const { login, repo } = useParams();
  const [data] = createResource<Sbom[]>(() =>
    fetch(`/api/github/sbom/${login}/${repo}`).then((resp) => resp.json()),
  );
  const [viewMode, setViewMode] = createSignal<'table' | 'graph'>('table');
  return (
    <>
      <h1>SBOM</h1>
      <div style={{ margin: '20px 0' }}>
        <button
          onClick={() => setViewMode('table')}
          aria-label="Table View"
          aria-pressed={viewMode() === 'table'}
          style={{
            padding: '8px 16px',
            margin: '0 8px 0 0',
            background: viewMode() === 'table' ? '#2563eb' : '#e5e7eb',
            color: viewMode() === 'table' ? 'white' : '#374151',
            border: 'none',
            'border-radius': '4px',
            cursor: 'pointer',
          }}
        >
          テーブル表示
        </button>
        <button
          onClick={() => setViewMode('graph')}
          style={{
            padding: '8px 16px',
            background: viewMode() === 'graph' ? '#2563eb' : '#e5e7eb',
            color: viewMode() === 'graph' ? 'white' : '#374151',
            border: 'none',
            'border-radius': '4px',
            cursor: 'pointer',
          }}
        >
          グラフ表示
        </button>
      </div>
      <div>
        <Show when={!data.loading} fallback={(<FadeLoader />)}>
          <For each={data()}>
            {(sbom) => (
              <>
                <h2>{sbom.sbom.name}</h2>
                <Show when={viewMode() === 'table'}>
                  <table style={{
                    width: '100%',
                    'border-collapse': 'collapse',
                    border: '1px solid #d1d5db',
                  }}>
                    <thead>
                      <tr style={{ background: '#374151', color: 'white' }}>
                        <th style={{
                          padding: '12px',
                          'text-align': 'left',
                          border: '1px solid #d1d5db',
                        }}>name</th>
                        <th style={{
                          padding: '12px',
                          'text-align': 'left',
                          border: '1px solid #d1d5db',
                        }}>version info</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={sbom.sbom.packages}>
                        {(pkg) => (
                          <tr style={{ background: '#cbd5e1' }}>
                            <td style={{
                              padding: '12px',
                              border: '1px solid #d1d5db',
                            }}>{pkg.name}</td>
                            <td style={{
                              padding: '12px',
                              border: '1px solid #d1d5db',
                            }}>{pkg.versionInfo}</td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
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
      <p>
        <A href="/">HOME</A>
      </p>
    </>
  );
}
