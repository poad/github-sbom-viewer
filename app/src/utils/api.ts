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

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        timeout: 5000, // 5秒タイムアウト
      });

      if (!response.ok) {
        if (response.status === 403) {
          csrfToken = await refreshCsrfToken();
          return makeRequest(csrfToken);
        }
        if (response.status === 401) {
          logout();
          throw new Error('認証エラー');
        }
        throw new Error(`APIエラー: ${response.status}`);
      }

      return response;
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('ネットワークエラー');
      }
      throw error;
    }
  };

  return makeRequest(csrfToken);
}
