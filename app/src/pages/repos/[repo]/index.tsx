import { For, Show, createResource, createSignal } from 'solid-js';
import { A, useParams } from '@solidjs/router';
import { FadeLoader } from '../../../features/ui/components';
import { fetchWithAuth } from '../../../utils/api';
import { DependencyGraph } from '../../../components/DependencyGraph';

export default function OrganizationRepos() {
  const { repo } = useParams();
  const user = localStorage.getItem('user') ?? '';
  const [viewMode, setViewMode] = createSignal<'table' | 'graph'>('table');

  const [data] = createResource<Sbom[]>(async () => {
    const response = await fetchWithAuth(`/api/github/sbom/${user}/${repo}`);
    return response.json();
  });
  
  return (
    <>
      <h1>SBOM</h1>
      <div style={{ margin: '20px 0' }}>
        <button 
          onClick={() => setViewMode('table')}
          style={{
            padding: '8px 16px',
            margin: '0 5px',
            background: viewMode() === 'table' ? '#2196F3' : '#f0f0f0',
            color: viewMode() === 'table' ? 'white' : 'black',
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
            margin: '0 5px',
            background: viewMode() === 'graph' ? '#2196F3' : '#f0f0f0',
            color: viewMode() === 'graph' ? 'white' : 'black',
            border: 'none',
            'border-radius': '4px',
            cursor: 'pointer',
          }}
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
                  <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f5f5f5' }}>
                        <th style={{ padding: '12px', border: '1px solid #ddd', 'text-align': 'left' }}>名前</th>
                        <th style={{ padding: '12px', border: '1px solid #ddd', 'text-align': 'left' }}>バージョン</th>
                        <th style={{ padding: '12px', border: '1px solid #ddd', 'text-align': 'left' }}>ライセンス</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={sbom.sbom.packages}>
                        {(pkg) => (
                          <tr>
                            <td style={{ padding: '12px', border: '1px solid #ddd' }}>{pkg.name || 'N/A'}</td>
                            <td style={{ padding: '12px', border: '1px solid #ddd' }}>{pkg.versionInfo || 'N/A'}</td>
                            <td style={{ padding: '12px', border: '1px solid #ddd' }}>{pkg.licenseConcluded || 'N/A'}</td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </Show>
                <Show when={viewMode() === 'graph'}>
                  <div style={{ margin: '20px 0' }}>
                    <DependencyGraph packages={sbom.sbom.packages} width={1000} height={700} />
                  </div>
                </Show>
              </>
            )}
          </For>
        </Show>
      </div>
      <p style={{ margin: '20px 0' }}>
        <A href="/">HOME</A>
      </p>
    </>
  );
}
