import { clearCsrfToken } from './csrf';

export function logout(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  clearCsrfToken();
  window.location.href = '/';
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('token') && !!localStorage.getItem('user');
}
