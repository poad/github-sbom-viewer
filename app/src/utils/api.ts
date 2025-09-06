import { getCsrfToken, refreshCsrfToken } from './csrf';
import { logout } from './auth';
import { hasGivenConsent } from './cookie-consent';

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  // クッキー同意がない場合はエラー
  if (!hasGivenConsent()) {
    throw new Error('Cookie consent required');
  }

  let csrfToken: string;
  try {
    csrfToken = await getCsrfToken();
  } catch (error) {
    console.warn('CSRF token retrieval failed, proceeding without CSRF token:', error);
    csrfToken = '';
  }
  
  const makeRequest = async (csrf: string) => {
    const headers = {
      ...options.headers,
      ...(csrf && { 'X-CSRF-Token': csrf }),
    };

    return fetch(url, {
      ...options,
      headers,
      credentials: 'include', // クッキーを含める
    });
  };

  let response = await makeRequest(csrfToken);

  // CSRFトークンエラー（403）の場合は一度だけリトライ
  if (response.status === 403 && csrfToken) {
    try {
      const newCsrfToken = await refreshCsrfToken();
      response = await makeRequest(newCsrfToken);
    } catch (error) {
      console.warn('CSRF token refresh failed:', error);
      // CSRFトークンリフレッシュ失敗時の処理
      const { showCsrfErrorNotification } = await import('./notification');
      showCsrfErrorNotification();
      
      // セッション切れの可能性が高い場合は再認証を促す
      if (response.status === 403) {
        const { showSessionExpiredNotification } = await import('./notification');
        showSessionExpiredNotification();
        logout();
        throw new Error('Session expired - please login again');
      }
    }
  }

  // 401エラーの場合はログアウト
  if (response.status === 401) {
    const { showSessionExpiredNotification } = await import('./notification');
    showSessionExpiredNotification();
    logout();
    throw new Error('Unauthorized');
  }

  return response;
}
