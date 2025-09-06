const CONSENT_KEY = 'cookie-consent';

export function hasGivenConsent(): boolean {
  return localStorage.getItem(CONSENT_KEY) === 'true';
}

export function giveConsent(): void {
  localStorage.setItem(CONSENT_KEY, 'true');
}

export function revokeConsent(): void {
  localStorage.removeItem(CONSENT_KEY);
  // クッキーを削除
  document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; SameSite=Strict; domain=' + window.location.hostname + '; HttpOnly';
  document.cookie = 'user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; SameSite=Strict; domain=' + window.location.hostname;
}

export function getCookieValue(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}
