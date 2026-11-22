import { useCookieConsent } from '../contexts/CookieConsentContext';
import { FadeLoader, CookieConsent } from '../features/ui/components';
import styles from './index.module.css';

import { type JSX } from '@solidjs/web';
import { createMemo, Errored, For, Loading, Show } from 'solid-js';

interface OwnersResponse {
  owners: string[];
}

export default function (): JSX.Element {
  const clientID = ((import.meta.env.VITE_GITHUB_APPS_CLIENT_ID as string) || undefined) ?? '';
  const { consentStatus } = useCookieConsent();

  const data = createMemo(() => {
    if (
      consentStatus() === 'accepted' &&
      document.cookie.split('; ').some((item) => item.startsWith('user='))
    ) {
      return fetch('/api/github').then((resp) => resp.json() as Promise<OwnersResponse>);
    }
    return undefined;
  });
  const user = createMemo(() =>
    consentStatus() === 'accepted'
      ? document.cookie
          .split('; ')
          .find((item) => item.startsWith('user='))
          ?.split('=')[1]
      : undefined,
  );

  return (
    <div class={styles.App}>
      <header class={styles.header}>
        <Show when={!user() && consentStatus() === 'accepted'}>
          <p>
            <a href={`https://github.com/login/oauth/authorize?client_id=${clientID}`}>
              Login with GitHub
            </a>
          </p>
        </Show>
        <Show when={consentStatus() === 'rejected'}>
          <p>Cookieの使用が拒否されているため、ログイン機能は利用できません。</p>
        </Show>
      </header>
      <Errored fallback={<p role="alert">Failed to load owners.</p>}>
        <Loading fallback={<FadeLoader />}>
          <Show when={data()?.owners}>
            <h1>owners</h1>
            <ul>
              <For each={data()?.owners}>
                {(owner) => {
                  if (user()?.trim() === owner.trim()) {
                    return (
                      <li>
                        <a href="/repos">{owner}</a>
                      </li>
                    );
                  }
                  return (
                    <li>
                      <a href={`/owners/${owner}`}>{owner}</a>
                    </li>
                  );
                }}
              </For>
            </ul>
          </Show>
        </Loading>
      </Errored>
      <CookieConsent />
    </div>
  );
}
