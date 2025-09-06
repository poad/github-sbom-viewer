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

export const COOKIE_SECURITY_CONFIG = {
  // デフォルトのクッキー有効期限（秒）
  DEFAULT_MAX_AGE: 24 * 60 * 60, // 24時間
  SESSION_MAX_AGE: 8 * 60 * 60, // 8時間（セッション用）
  CSRF_MAX_AGE: 30 * 60, // 30分（CSRF用）
  
  // セキュリティ設定
  REQUIRE_SECURE: true, // HTTPS必須
  SAME_SITE: 'Strict' as const, // 最も厳格なSameSite設定
  HTTP_ONLY: true, // JavaScript からのアクセスを制限
  
  // ドメイン設定
  ALLOWED_DOMAINS: [
    // 本番環境では実際のドメインを設定
    'localhost',
    '127.0.0.1',
  ],
} as const;
