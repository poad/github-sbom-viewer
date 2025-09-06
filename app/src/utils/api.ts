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
  if (response.status === 403 && csrfToken) {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        const newCsrfToken = await refreshCsrfToken();
        if (newCsrfToken) {
          response = await makeRequest(newCsrfToken);
          break;
        }
      } catch (error) {
        console.warn(`CSRF token refresh attempt ${retryCount + 1} failed:`, error);
        retryCount++;
        if (retryCount === maxRetries) {
          throw new Error('CSRF token refresh failed after multiple attempts');
        }
        // 次の試行前に待機
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  }
        response = await makeRequest(newCsrfToken);
      }
    } catch (error) {
      console.warn('CSRF token refresh failed:', error);
    }
  }

  // 401エラーの場合はログアウト
  if (response.status === 401) {
    logout();
    throw new Error('Unauthorized');
  }

  return response;
}
