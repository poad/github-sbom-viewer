export const SENSITIVE_STORAGE_KEYS = [
  'github-token',
  'user-session',
  'auth-state',
  'csrf-token',
  'session-data',
] as const;

export const SENSITIVE_COOKIE_NAMES = [
  'token',
  'user',
  'session',
  'csrf-token',
  'auth-state',
] as const;

export const COOKIE_PATHS = [
  '/',
  '/api/',
  '/auth/',
] as const;
