import { type JSX } from 'solid-js/jsx-runtime';
import styles from './index.module.css';
import { createResource, For, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { FadeLoader, CookieConsent } from '../features/ui/components';
import { useCookieConsent } from '../contexts/CookieConsentContext';

export default function (): JSX.Element {
  const clientID = (import.meta.env.VITE_GITHUB_APPS_CLIENT_ID as string || undefined) ?? '';
  const { consentStatus } = useCookieConsent();
  
  const [data] = createResource<{ owners: string[] } | undefined>(() => {
    if (consentStatus() === 'accepted' && document.cookie.split('; ').some((item) => item.startsWith('user='))) {
      return fetch('/api/github').then((resp) => resp.json());
    }
    return undefined;
  });
  const user = consentStatus() === 'accepted' ? document.cookie.split('; ').find(item => item.startsWith('user='))?.split('=')[1] : undefined;

  return (
    <div class={styles.App}>
      <header class={styles.header}>
        <Show when={!user && consentStatus() === 'accepted'}>
          <p>
            <a href={`https://github.com/login/oauth/authorize?client_id=${clientID}`}>Login with GitHub</a>
          </p>
        </Show>
        <Show when={consentStatus() === 'rejected'}>
          <p>Cookieの使用が拒否されているため、ログイン機能は利用できません。</p>
        </Show>
      </header>
      <Show when={!data.loading} fallback={(<FadeLoader />)}>
        <Show when={!data.error && data()}>
          <h1>owners</h1>
          <ul>
            <For each={data()?.owners}>
              {(owner) => {
                if (user?.trim() === owner.trim()) {
                  return <li><A href={'./repos/'}>{owner}</A></li>;
                }
                return <li><A href={`./owners/${owner}`}>{owner}</A></li>;
              }}
            </For>
          </ul>
        </Show>
      </Show>
      <CookieConsent />
    </div>
  );
}
