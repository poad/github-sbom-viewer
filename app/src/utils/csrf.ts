import { showCsrfWarning } from './notification';

interface CsrfResponse {
  csrfToken: string;
}

interface CsrfTokenCache {
  token: string;
  expiry: number;
}

let csrfTokenCache: CsrfTokenCache | null = null;
const TOKEN_LIFETIME = 5 * 60 * 1000; // 5分
const MAX_RETRY_COUNT = 3;

export async function getCsrfToken(): Promise<string> {
  const now = Date.now();

  // キャッシュされたトークンが有効期限内の場合は再利用
  if (csrfTokenCache && now < csrfTokenCache.expiry) {
    return csrfTokenCache.token;
  }

  // 新しいトークンを取得（リトライ機能付き）
  for (let attempt = 1; attempt <= MAX_RETRY_COUNT; attempt++) {
    try {
      const response = await fetch('/api/csrf-token');

      if (!response.ok) {
        throw new Error(`CSRF token request failed: ${response.status}`);
      }

      const data = await response.json() as CsrfResponse;

      if (!data.csrfToken) {
        throw new Error('CSRF token not found in response');
      }

      csrfTokenCache = {
        token: data.csrfToken,
        expiry: now + TOKEN_LIFETIME,
      };

      return csrfTokenCache.token;
    } catch (error) {
      console.warn(`CSRF token retrieval attempt ${attempt} failed:`, error);

      if (attempt === MAX_RETRY_COUNT) {
        console.error('All CSRF token retrieval attempts failed');
        showCsrfWarning();
        // 最後の試行でも失敗した場合は空文字列を返す（フォールバック）
        return '';
      }

      // 次の試行前に少し待機
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  return '';
}

export function clearCsrfToken(): void {
  csrfTokenCache = null;
}

export async function refreshCsrfToken(): Promise<string> {
  try {
    clearCsrfToken();
    const newToken = await getCsrfToken();
    
    if (!newToken) {
      throw new Error('Failed to obtain new CSRF token');
    }
    
    return newToken;
  } catch (error) {
    console.error('CSRF token refresh failed:', error);
    // リフレッシュ失敗時はキャッシュをクリアして空文字列を返す
    clearCsrfToken();
    throw new Error('CSRF token refresh failed');
  }
}
