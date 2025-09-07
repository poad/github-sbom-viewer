import { type JSX, createSignal } from 'solid-js';
import { Show } from 'solid-js';
import styles from './styles.module.css';
import { useCookieConsent } from '../../../../contexts/CookieConsentContext';

export function CookieConsent(): JSX.Element {
  const { consentStatus, setConsentStatus } = useCookieConsent();
  const [showBanner, setShowBanner] = createSignal<boolean>(!consentStatus());

  const handleAccept = () => {
    setConsentStatus('accepted');
    setShowBanner(false);
  };

  const handleReject = () => {
    setConsentStatus('rejected');
    setShowBanner(false);
  };

  const handleEnableCookies = () => {
    setConsentStatus('accepted');
    window.location.reload();
  };

  return (
    <>
      <Show when={showBanner()}>
        <div class={styles.banner}>
          <div class={styles.content}>
            <p class={styles.message}>
              このサイトではCookieを使用してユーザー体験を向上させています。
              GitHubログイン機能を使用するにはCookieの使用に同意する必要があります。
            </p>
            <div class={styles.buttons}>
              <button 
                class={`${styles.button} ${styles.accept}`}
                onClick={handleAccept}
              >
                同意する
              </button>
              <button 
                class={`${styles.button} ${styles.reject}`}
                onClick={handleReject}
              >
                拒否する
              </button>
            </div>
          </div>
        </div>
      </Show>
      
      <Show when={consentStatus() === 'rejected'}>
        <div class={styles.rejectedNotice}>
          <p>Cookieの使用が拒否されています。ログイン機能を使用するにはCookieを有効にしてください。</p>
          <button 
            class={`${styles.button} ${styles.enable}`}
            onClick={handleEnableCookies}
          >
            Cookieを有効にする
          </button>
        </div>
      </Show>
    </>
  );
}