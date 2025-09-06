const CSRF_TOKEN_KEY = 'csrf-token';
const CSRF_EXPIRY_KEY = 'csrf-token-expiry';
const TOKEN_LIFETIME = 30 * 60 * 1000; // 30分
const MAX_RETRY_ATTEMPTS = 3;

interface CsrfTokenResponse {
  token?: string;
  csrfToken?: string;
  expires?: number;
}

const isTokenExpired = (expiry: string | null): boolean => {
  if (!expiry) return true;
  return Date.now() > parseInt(expiry);
};

const validateToken = (token: string): boolean => {
  // トークンの基本的な検証
  if (!token || token.length < 32) return false;
  // Base64形式の検証
  try {
    atob(token);
    return true;
  } catch {
    return false;
  }
};

export async function getCsrfToken(): Promise<string> {
  // 既存のトークンをチェック
  const existingToken = localStorage.getItem(CSRF_TOKEN_KEY);
  const tokenExpiry = localStorage.getItem(CSRF_EXPIRY_KEY);
  
  if (existingToken && !isTokenExpired(tokenExpiry) && validateToken(existingToken)) {
    return existingToken;
  }

  // 新しいトークンを取得
  return await fetchNewCsrfToken();
}

async function fetchNewCsrfToken(): Promise<string> {
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`CSRF token request failed: ${response.status}`);
      }

      const data = await response.json() as CsrfTokenResponse;
      const token = data.token || data.csrfToken;
      
      if (!token || !validateToken(token)) {
        throw new Error('Invalid CSRF token received');
      }

      // トークンと有効期限を保存
      const expiry = Date.now() + TOKEN_LIFETIME;
      localStorage.setItem(CSRF_TOKEN_KEY, token);
      localStorage.setItem(CSRF_EXPIRY_KEY, expiry.toString());

      return token;
    } catch (error) {
      console.warn(`CSRF token retrieval attempt ${attempt} failed:`, error);
      
      if (attempt === MAX_RETRY_ATTEMPTS) {
        console.error('All CSRF token retrieval attempts failed');
        const { showCsrfWarning } = await import('./notification');
        showCsrfWarning();
        return '';
      }

      // 指数バックオフで再試行
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return '';
}

export async function refreshCsrfToken(): Promise<string> {
  // 既存のトークンをクリア
  clearCsrfToken();
  
  try {
    const newToken = await fetchNewCsrfToken();
    if (!newToken) {
      throw new Error('Failed to obtain new CSRF token');
    }
    return newToken;
  } catch (error) {
    console.error('CSRF token refresh failed:', error);
    
    // セキュリティ上の理由でページをリロード
    if (typeof window !== 'undefined') {
      setTimeout(() => window.location.reload(), 1000);
    }
    
    throw new Error('CSRF token refresh failed');
  }
}

export function clearCsrfToken(): void {
  try {
    localStorage.removeItem(CSRF_TOKEN_KEY);
    localStorage.removeItem(CSRF_EXPIRY_KEY);
  } catch (error) {
    console.warn('Failed to clear CSRF token:', error);
  }
}

export function validateCsrfToken(): boolean {
  const token = localStorage.getItem(CSRF_TOKEN_KEY);
  const expiry = localStorage.getItem(CSRF_EXPIRY_KEY);
  
  return !!(token && !isTokenExpired(expiry) && validateToken(token));
}
