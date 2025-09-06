import { createSignal, Show, onMount, onCleanup } from 'solid-js';
import { hasGivenConsent, giveConsent } from '../utils/cookie-consent';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = createSignal(!hasGivenConsent());
  let buttonRef: HTMLButtonElement | undefined;
  let dialogRef: HTMLDivElement | undefined;
  let previousActiveElement: Element | null = null;

  const handleAccept = () => {
    giveConsent();
    setShowBanner(false);
    // フォーカスを元の要素に戻す
    if (previousActiveElement && 'focus' in previousActiveElement) {
      (previousActiveElement as HTMLElement).focus();
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleAccept();
      return;
    }

    // キーボードトラップの実装
    if (event.key === 'Tab') {
      event.preventDefault();
      buttonRef?.focus();
    }
  };

  // モーダルが表示されたときのフォーカス管理
  onMount(() => {
    if (showBanner()) {
      // 現在のフォーカス要素を保存
      previousActiveElement = document.activeElement;
      
      // 背景要素のフォーカスを無効化
      const focusableElements = document.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      
      focusableElements.forEach((element) => {
        if (!dialogRef?.contains(element)) {
          element.setAttribute('tabindex', '-1');
          element.setAttribute('data-original-tabindex', element.getAttribute('tabindex') || '0');
        }
      });

      // ダイアログにフォーカスを設定
      setTimeout(() => {
        buttonRef?.focus();
      }, 100);
    }
  });

  // クリーンアップ時にフォーカスを復元
  onCleanup(() => {
    // 背景要素のフォーカスを復元
    const disabledElements = document.querySelectorAll('[data-original-tabindex]');
    disabledElements.forEach((element) => {
      const originalTabindex = element.getAttribute('data-original-tabindex');
      element.removeAttribute('data-original-tabindex');
      if (originalTabindex === '0') {
        element.removeAttribute('tabindex');
      } else {
        element.setAttribute('tabindex', originalTabindex || '0');
      }
    });
  });

  return (
    <Show when={showBanner()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-consent-title"
        aria-describedby="cookie-consent-description"
        aria-live="polite"
        onKeyDown={handleKeyDown}
        style={{
          position: 'fixed',
          bottom: '0',
          left: '0',
          right: '0',
          'background-color': '#333',
          color: 'white',
          padding: '1.5rem',
          'z-index': '1000',
          'box-shadow': '0 -2px 10px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ 'max-width': '800px', margin: '0 auto' }}>
          <h2
            id="cookie-consent-title"
            style={{
              margin: '0 0 1rem 0',
              'font-size': '1.2rem',
              'font-weight': 'bold',
            }}
          >
            クッキーの使用について
          </h2>
          <div
            id="cookie-consent-description"
            style={{ margin: '0 0 1.5rem 0', 'line-height': '1.5' }}
          >
            <p style={{ margin: '0 0 0.5rem 0' }}>
              このサイトでは、以下の目的でクッキーを使用します：
            </p>
            <ul style={{ margin: '0 0 0.5rem 1.5rem', 'text-align': 'left' }}>
              <li>GitHub OAuth認証の維持</li>
              <li>CSRFトークンによるセキュリティ保護</li>
              <li>ユーザーセッションの管理</li>
            </ul>
            <p style={{ margin: '0', 'font-size': '0.9rem' }}>
              継続してご利用いただくには、クッキーの使用に同意してください。
            </p>
          </div>
          <button
            ref={buttonRef}
            onClick={handleAccept}
            aria-label="クッキーの使用に同意してバナーを閉じる"
            style={{
              'background-color': '#007bff',
              color: 'white',
              border: '2px solid transparent',
              padding: '0.75rem 1.5rem',
              'border-radius': '4px',
              cursor: 'pointer',
              'font-size': '1rem',
              'font-weight': 'bold',
              transition: 'all 0.2s ease',
            }}
            onFocus={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.outline = '2px solid #fff';
              target.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.outline = 'none';
            }}
            onMouseEnter={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.backgroundColor = '#0056b3';
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.backgroundColor = '#007bff';
            }}
          >
            同意する
          </button>
        </div>
      </div>
    </Show>
  );
}
