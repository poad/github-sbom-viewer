import { createSignal, Show } from 'solid-js';
import { hasGivenConsent, giveConsent } from '../utils/cookie-consent';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = createSignal(!hasGivenConsent());

  const handleAccept = () => {
    giveConsent();
    setShowBanner(false);
  };

  return (
    <Show when={showBanner()}>
      <div style={{
        position: 'fixed',
        bottom: '0',
        left: '0',
        right: '0',
        'background-color': '#333',
        color: 'white',
        padding: '1rem',
        'z-index': '1000',
        'text-align': 'center',
      }}>
        <p style={{ margin: '0 0 1rem 0' }}>
          このサイトでは、認証とセキュリティのためにクッキーを使用します。
          継続してご利用いただくには、クッキーの使用に同意してください。
        </p>
        <button 
          onClick={handleAccept}
          style={{
            'background-color': '#007bff',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            'border-radius': '4px',
            cursor: 'pointer',
          }}
        >
          同意する
        </button>
      </div>
    </Show>
  );
}
