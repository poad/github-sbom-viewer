import { clearCsrfToken } from './csrf';

export function initSessionCleanup(): void {
  const checkTokenExpiry = () => {
    const token = localStorage.getItem('token');
    const expiryTime = localStorage.getItem('tokenExpiry');
    if (token && expiryTime && Date.now() > parseInt(expiryTime)) {
      logout();
    }
  };
  setInterval(checkTokenExpiry, 60000);

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
