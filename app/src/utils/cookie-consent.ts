import { SENSITIVE_COOKIE_NAMES, COOKIE_PATHS } from '../config/security';

const CONSENT_KEY = 'cookie-consent';

export function hasGivenConsent(): boolean {
  return localStorage.getItem(CONSENT_KEY) === 'true';
}

export function giveConsent(): void {
  localStorage.setItem(CONSENT_KEY, 'true');
}

function deleteCookie(name: string, path = '/', domain?: string): void {
  const expires = 'expires=Thu, 01 Jan 1970 00:00:00 UTC';
  const cookieString = `${name}=; ${expires}; path=${path}; secure; SameSite=Strict${domain ? `; domain=${domain}` : ''}`;
  document.cookie = cookieString;
}

function clearAllCookies(): void {
  const hostname = window.location.hostname;
  const domains = [
    hostname,
    `.${hostname}`,
    hostname.startsWith('www.') ? hostname.substring(4) : `www.${hostname}`,
  ];

  // 設定から取得したクッキー名、パス、ドメインの組み合わせで削除
  SENSITIVE_COOKIE_NAMES.forEach(name => {
    COOKIE_PATHS.forEach(path => {
      // ドメイン指定なし
      deleteCookie(name, path);
      // 各ドメインで削除
      domains.forEach(domain => {
        deleteCookie(name, path, domain);
      });
    });
  });
}

export function revokeConsent(): void {
  localStorage.removeItem(CONSENT_KEY);
  clearAllCookies();
}

export function getCookieValue(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}
