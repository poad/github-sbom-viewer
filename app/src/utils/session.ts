import { clearCsrfToken } from './csrf';

export function initSessionCleanup(): void {
  // ページ離脱時にCSRFトークンをクリア
  window.addEventListener('beforeunload', () => {
    clearCsrfToken();
  });

  // ページが非表示になった時にCSRFトークンをクリア
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      clearCsrfToken();
    }
  });
}
