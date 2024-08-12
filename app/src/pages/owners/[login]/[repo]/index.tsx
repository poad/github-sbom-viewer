import { For, Show, createResource } from 'solid-js';
import { A, useParams } from '@solidjs/router';
import { FadeLoader } from '../../../../features/ui/components';

export default function OrganizationRepos() {
  const { login, repo } = useParams();
  const [data] = createResource<Sbom[]>(() =>
      fetch(`/api/github/sbom/${login}/${repo}`).then((resp) => resp.json()),
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
