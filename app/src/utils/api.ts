import { getCsrfToken } from './csrf';

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('token');
  const csrfToken = await getCsrfToken();
  
  const headers = {
    ...options.headers,
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // 401エラーの場合はログイン画面にリダイレクト
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
    throw new Error('Unauthorized');
  }

  return response;
}
