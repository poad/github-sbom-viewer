import { SENSITIVE_COOKIE_NAMES, COOKIE_PATHS } from '../config/security';

const CONSENT_KEY = 'cookie-consent';

export function hasGivenConsent(): boolean {
  return localStorage.getItem(CONSENT_KEY) === 'true';
}

export function giveConsent(): void {
  localStorage.setItem(CONSENT_KEY, 'true');
}

function deleteCookie(name: string, path = '/', domain?: string): void {
  try {
    const expires = 'expires=Thu, 01 Jan 1970 00:00:00 UTC';
    const cookieString = `${name}=; ${expires}; path=${path}; secure; SameSite=Strict${domain ? `; domain=${domain}` : ''}`;
    document.cookie = cookieString;
  } catch (error) {
    console.warn(`Failed to delete cookie ${name} at path ${path}${domain ? ` for domain ${domain}` : ''}:`, error);
  }
}

function clearAllCookies(): void {
  try {
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
  } catch (error) {
    console.error('Failed to clear cookies:', error);
  }
}

export function revokeConsent(): void {
  try {
    localStorage.removeItem(CONSENT_KEY);
    clearAllCookies();
  } catch (error) {
    console.error('Failed to revoke consent:', error);
    // 部分的な失敗でも続行（ユーザーに通知）
    alert('クッキーの削除中にエラーが発生しました。ブラウザの設定から手動でクッキーを削除してください。');
  }
}

export function getCookieValue(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}
