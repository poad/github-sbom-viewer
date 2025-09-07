export function getCookieConsentStatus(): 'accepted' | 'rejected' | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem('cookie-consent') as 'accepted' | 'rejected' | null;
}

export function isCookieAccepted(): boolean {
  return getCookieConsentStatus() === 'accepted';
}

export function isCookieRejected(): boolean {
  return getCookieConsentStatus() === 'rejected';
}