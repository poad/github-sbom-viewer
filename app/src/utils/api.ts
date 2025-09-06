import { getCsrfToken } from './csrf';

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('token');
  const csrfToken = await getCsrfToken();
  
  const headers = {
    ...options.headers,
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
  };

  return fetch(url, {
    ...options,
    headers,
  });
}
