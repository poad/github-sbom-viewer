import { getCsrfToken, refreshCsrfToken } from './csrf';
import { logout } from './auth';

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('token');
  
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
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(csrf && { 'X-CSRF-Token': csrf }),
    };

    return fetch(url, {
      ...options,
      headers,
    });
  };

  let response = await makeRequest(csrfToken);

  // CSRFトークンエラー（403）の場合は一度だけリトライ
  if (response.status === 403 && csrfToken) {
    try {
      const newCsrfToken = await refreshCsrfToken();
      if (newCsrfToken) {
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
