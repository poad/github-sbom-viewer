import { createSignal, Show, onMount, onCleanup } from 'solid-js';
import { hasGivenConsent, giveConsent } from '../utils/cookie-consent';
import { disableBackgroundFocus, restoreBackgroundFocus, saveFocus, restoreFocus, getFocusableElements } from '../utils/focus-management';
import { announceToScreenReader, announceAlert } from '../utils/screen-reader';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = createSignal(!hasGivenConsent());
  let acceptButtonRef: HTMLButtonElement | undefined;
  let rejectButtonRef: HTMLButtonElement | undefined;
  let dialogRef: HTMLDivElement | undefined;
  let previousActiveElement: Element | null = null;
  let focusableElements: HTMLElement[] = [];

  const handleAccept = () => {
    giveConsent();
    setShowBanner(false);
    
    // フォーカスを適切に復元
    restoreFocus(previousActiveElement);
    restoreBackgroundFocus();
    
    announceToScreenReader('クッキーの使用に同意しました', 'status');
  };

  const handleReject = () => {
    setShowBanner(false);
    
    // フォーカスを適切に復元
    restoreFocus(previousActiveElement);
    restoreBackgroundFocus();
    
    announceToScreenReader('クッキーの使用を拒否しました', 'status');
  };

  const updateFocusableElements = () => {
    if (!dialogRef) return;
    focusableElements = getFocusableElements(dialogRef);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        handleReject();
        break;
      
      case 'Tab': {
        event.preventDefault();
        if (focusableElements.length === 0) return;
        
        const currentIndex = focusableElements.findIndex(el => el === document.activeElement);
        let nextIndex: number;
        
        if (event.shiftKey) {
          // Shift+Tab: 前の要素へ
          nextIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
        } else {
          // Tab: 次の要素へ
          nextIndex = currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1;
        }
        
        focusableElements[nextIndex]?.focus();
        break;
      }
      
      case 'Enter':
      case ' ':
        // ボタンがフォーカスされている場合のみ処理
        if (document.activeElement === acceptButtonRef) {
          event.preventDefault();
          handleAccept();
        } else if (document.activeElement === rejectButtonRef) {
          event.preventDefault();
          handleReject();
        }
        break;
      
      case 'Home':
        event.preventDefault();
        focusableElements[0]?.focus();
        break;
      
      case 'End':
        event.preventDefault();
        focusableElements[focusableElements.length - 1]?.focus();
        break;
      
      case 'ArrowRight':
      case 'ArrowDown': {
        event.preventDefault();
        if (focusableElements.length === 0) return;
        
        const currentRightIndex = focusableElements.findIndex(el => el === document.activeElement);
        const nextRightIndex = currentRightIndex >= focusableElements.length - 1 ? 0 : currentRightIndex + 1;
        focusableElements[nextRightIndex]?.focus();
        break;
      }
      
      case 'ArrowLeft':
      case 'ArrowUp': {
        event.preventDefault();
        if (focusableElements.length === 0) return;
        
        const currentLeftIndex = focusableElements.findIndex(el => el === document.activeElement);
        const nextLeftIndex = currentLeftIndex <= 0 ? focusableElements.length - 1 : currentLeftIndex - 1;
        focusableElements[nextLeftIndex]?.focus();
        break;
      }
    }
  };

  onMount(() => {
    if (showBanner()) {
      previousActiveElement = saveFocus();
      
      if (dialogRef) {
        disableBackgroundFocus(dialogRef);
        updateFocusableElements();
      }

      // スクリーンリーダーに重要な通知として伝える
      announceAlert('クッキー使用に関する重要な通知が表示されました');

      setTimeout(() => {
        acceptButtonRef?.focus();
      }, 100);
    }
  });

  onCleanup(() => {
    // コンポーネント破棄時に確実にフォーカスを復元
    if (showBanner()) {
      restoreFocus(previousActiveElement);
    }
    restoreBackgroundFocus();
  });

  return (
    <Show when={showBanner()}>
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cookie-consent-title"
        aria-describedby="cookie-consent-description"
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
          border: '2px solid #555',
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
          <div style={{ display: 'flex', gap: '1rem', 'flex-wrap': 'wrap' }}>
            <button
              ref={acceptButtonRef}
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
                'min-width': '120px',
              }}
              onFocus={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.outline = '3px solid #fff';
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
            <button
              ref={rejectButtonRef}
              onClick={handleReject}
              aria-label="クッキーの使用を拒否してバナーを閉じる"
              style={{
                'background-color': 'transparent',
                color: 'white',
                border: '2px solid #ccc',
                padding: '0.75rem 1.5rem',
                'border-radius': '4px',
                cursor: 'pointer',
                'font-size': '1rem',
                'font-weight': 'bold',
                transition: 'all 0.2s ease',
                'min-width': '120px',
              }}
              onFocus={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.outline = '3px solid #fff';
                target.style.outlineOffset = '2px';
              }}
              onBlur={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.outline = 'none';
              }}
              onMouseEnter={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.backgroundColor = '#555';
                target.style.borderColor = '#fff';
              }}
              onMouseLeave={(e) => {
                const target = e.target as HTMLButtonElement;
                target.style.backgroundColor = 'transparent';
                target.style.borderColor = '#ccc';
              }}
            >
              拒否する
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
