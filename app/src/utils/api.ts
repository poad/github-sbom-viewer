import { getCsrfToken, refreshCsrfToken } from './csrf';
import { logout } from './auth';

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('token');
  let csrfToken = await getCsrfToken();
  
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
  if (response.status === 403) {
    csrfToken = await refreshCsrfToken();
    response = await makeRequest(csrfToken);
  }

  // 401エラーの場合はログアウト
  if (response.status === 401) {
    logout();
    throw new Error('Unauthorized');
  }

  return response;
}
