import { For, Show, createResource } from 'solid-js';
import { A, useParams } from '@solidjs/router';
import { FadeLoader } from '../../../features/ui/components';

export default function OrganizationRepos() {
  const { repo } = useParams();
  const user = document.cookie.split('; ').find(item => item.startsWith('user='))?.split('=')[1] ?? '';

  const [data] = createResource<Sbom[]>(() =>
    fetch(`/api/github/sbom/${user}/${repo}`).then((resp) => resp.json()),
  );
  return (
    <>
      <h1>SBOM</h1>
      <p>
        <Show when={!data.loading} fallback={(<FadeLoader />)}>
          <For each={data()}>
            {(sbom) => (
              <>
                <h2>{sbom.sbom.name}</h2>
                <table>
                  <thead>
                    <tr>
                      <th>name</th><th>version info</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={sbom.sbom.packages}>
                      {(pkg) => <tr><td>{pkg.name}</td><td>{pkg.versionInfo}</td></tr>}
                    </For>
                  </tbody>
                </table>
              </>
            )}
          </For>
        </Show>
      </p>
      <p>
        <A href="/">HOME</A>
      </p>
    </>
  );
}
