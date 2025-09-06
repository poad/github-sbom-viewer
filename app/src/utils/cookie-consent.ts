import { SENSITIVE_COOKIE_NAMES, COOKIE_PATHS } from '../config/security';
import { SecureCookieManager } from './secure-cookie';

const CONSENT_KEY = 'cookie-consent';

export function hasGivenConsent(): boolean {
  return localStorage.getItem(CONSENT_KEY) === 'true';
}

export function giveConsent(): void {
  localStorage.setItem(CONSENT_KEY, 'true');
}

function clearAllCookies(): void {
  try {
    const hostname = window.location.hostname;
    const domains = [
      hostname,
      `.${hostname}`,
      hostname.startsWith('www.') ? hostname.substring(4) : `www.${hostname}`,
    ];

    // SecureCookieManagerを使用してクッキーを削除
    SecureCookieManager.clear([...SENSITIVE_COOKIE_NAMES], [...COOKIE_PATHS], domains);
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
    alert('クッキーの削除中にエラーが発生しました。ブラウザの設定から手動でクッキーを削除してください。');
  }
}

export function getCookieValue(name: string): string | null {
  return SecureCookieManager.get(name);
}

// セキュアなクッキー設定のヘルパー関数（後方互換性のため）
export function setSecureCookie(name: string, value: string, options: {
  maxAge?: number;
  path?: string;
  domain?: string;
  httpOnly?: boolean;
} = {}): void {
  SecureCookieManager.set(name, value, options);
}

export function isCookieExpired(name: string): boolean {
  return !SecureCookieManager.exists(name);
}

export function setSessionCookie(name: string, value: string, path = '/'): void {
  SecureCookieManager.setSession(name, value, path);
}
