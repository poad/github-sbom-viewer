import { clearCsrfToken } from './csrf';
import { getCookieValue, revokeConsent } from './cookie-consent';

export function logout(): void {
  // クッキー同意を取り消し（クッキーも削除される）
  revokeConsent();
  clearCsrfToken();
  // ローカルストレージをクリア
  localStorage.clear();
  window.location.href = '/';
}

export function isAuthenticated(): boolean {
  return !!getCookieValue('token') && !!getCookieValue('user');
}

export function getCurrentUser(): string | null {
  return getCookieValue('user');
}
