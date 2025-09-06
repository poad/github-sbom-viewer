interface CsrfResponse {
  csrfToken: string;
}

interface CsrfTokenCache {
  token: string;
  expiry: number;
}

let csrfTokenCache: CsrfTokenCache | null = null;
const TOKEN_LIFETIME = 30 * 60 * 1000; // 30分

export async function getCsrfToken(): Promise<string> {
  const now = Date.now();
  
  // キャッシュされたトークンが有効期限内の場合は再利用
  if (csrfTokenCache && now < csrfTokenCache.expiry) {
    return csrfTokenCache.token;
  }
  
  // 新しいトークンを取得
  const response = await fetch('/api/csrf-token');
  const data = await response.json() as CsrfResponse;
  
  csrfTokenCache = {
    token: data.csrfToken,
    expiry: now + TOKEN_LIFETIME,
  };
  
  return csrfTokenCache.token;
}

export function clearCsrfToken(): void {
  csrfTokenCache = null;
}

export function refreshCsrfToken(): Promise<string> {
  clearCsrfToken();
  return getCsrfToken();
}
