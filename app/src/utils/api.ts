import { getCsrfToken, refreshCsrfToken } from './csrf';
import { hasGivenConsent } from './cookie-consent';

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000,
} as const;

interface NetworkError extends Error {
  code: 'NETWORK_ERROR';
  originalError: Error;
}

interface HttpError extends Error {
  code: 'HTTP_ERROR';
  status: number;
  statusText: string;
}

interface SecurityError extends Error {
  code: 'SECURITY_ERROR';
  reason: string;
}

const isNetworkError = (error: Error): boolean => {
  return error.name === 'TypeError' || 
         error.message.includes('fetch') ||
         error.message.includes('network') ||
         error.message.includes('Failed to fetch');
};

const getErrorMessage = (status: number): string => {
  switch (status) {
    case 400: return 'リクエストが無効です';
    case 401: return '認証が必要です';
    case 403: return 'アクセスが拒否されました';
    case 404: return 'リソースが見つかりません';
    case 429: return 'リクエスト制限に達しました';
    case 500: return 'サーバー内部エラーが発生しました';
    case 502: return 'ゲートウェイエラーが発生しました';
    case 503: return 'サービスが利用できません';
    case 504: return 'ゲートウェイタイムアウトが発生しました';
    default: return `予期しないエラーが発生しました (${status})`;
  }
};

const isRetryableError = (error: Error | Response): boolean => {
  if (error instanceof Response) {
    // セキュリティ上の理由で認証・認可エラーはリトライしない
    if (error.status === 401 || error.status === 403) {
      return false;
    }
    // 5xx系エラーと429のみリトライ可能
    return error.status >= 500 || error.status === 429;
  }
  // ネットワークエラーはリトライ可能
  return isNetworkError(error);
};

const sanitizeUrl = (url: string): string => {
  try {
    const urlObj = new URL(url, window.location.origin);
    // 同一オリジンまたは許可されたドメインのみ
    const allowedHosts = ['api.github.com', 'github.com', window.location.hostname];
    if (!allowedHosts.includes(urlObj.hostname)) {
      throw new Error('Unauthorized domain');
    }
    return urlObj.toString();
  } catch {
    throw new Error('Invalid URL');
  }
};

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  // セキュリティチェック
  if (!hasGivenConsent()) {
    const securityError: SecurityError = new Error('Cookie consent required') as SecurityError;
    securityError.code = 'SECURITY_ERROR';
    securityError.reason = 'CONSENT_REQUIRED';
    throw securityError;
  }

  const sanitizedUrl = sanitizeUrl(url);
  let csrfToken = '';
  
  try {
    csrfToken = await getCsrfToken();
  } catch (error) {
    console.warn('CSRF token retrieval failed, proceeding without CSRF token:', error);
  }
  
  const makeRequest = async (csrf: string, attempt = 1): Promise<Response> => {
    const headers = {
      ...options.headers,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest', // CSRF保護
      ...(csrf && { 'X-CSRF-Token': csrf }),
    };

    try {
      const response = await fetch(sanitizedUrl, {
        ...options,
        headers,
        credentials: 'same-origin', // セキュリティ強化
        mode: 'cors',
        cache: 'no-store', // センシティブデータのキャッシュ防止
      });

      if (!response.ok) {
        const httpError: HttpError = new Error(getErrorMessage(response.status)) as HttpError;
        httpError.code = 'HTTP_ERROR';
        httpError.status = response.status;
        httpError.statusText = response.statusText;

        // リトライ可能エラーの場合
        if (isRetryableError(response) && attempt < RETRY_CONFIG.maxRetries) {
          const delay = Math.min(RETRY_CONFIG.baseDelay * Math.pow(2, attempt - 1), RETRY_CONFIG.maxDelay);
          const { showHttpErrorNotification } = await import('./notification');
          showHttpErrorNotification(response.status, attempt, RETRY_CONFIG.maxRetries);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return makeRequest(csrf, attempt + 1);
        }

        throw httpError;
      }

      return response;
    } catch (error) {
      // ネットワークエラーの処理
      if (isNetworkError(error as Error)) {
        const networkError: NetworkError = new Error('ネットワークエラーが発生しました') as NetworkError;
        networkError.code = 'NETWORK_ERROR';
        networkError.originalError = error as Error;

        // リトライ可能な場合
        if (attempt < RETRY_CONFIG.maxRetries) {
          const delay = Math.min(RETRY_CONFIG.baseDelay * Math.pow(2, attempt - 1), RETRY_CONFIG.maxDelay);
          const { showNetworkErrorNotification } = await import('./notification');
          showNetworkErrorNotification(attempt, RETRY_CONFIG.maxRetries);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return makeRequest(csrf, attempt + 1);
        }

        throw networkError;
      }

      // その他のエラー
      throw error;
    }
  };

  try {
    return await makeRequest(csrfToken);
  } catch (error) {
    // CSRF関連エラーの場合、トークンを更新して再試行
    if ((error as HttpError).status === 403 && csrfToken) {
      try {
        const newCsrfToken = await refreshCsrfToken();
        return await makeRequest(newCsrfToken);
      } catch (refreshError) {
        console.warn('CSRF token refresh failed:', refreshError);
        
        const { showCsrfErrorNotification } = await import('./notification');
        showCsrfErrorNotification();
      }
    }

    // 認証エラーの場合、セッション期限切れとして処理
    if ((error as HttpError).status === 401) {
      const { showSessionExpiredNotification } = await import('./notification');
      showSessionExpiredNotification();
      
      const securityError: SecurityError = new Error('Session expired - please login again') as SecurityError;
      securityError.code = 'SECURITY_ERROR';
      securityError.reason = 'SESSION_EXPIRED';
      throw securityError;
    }

    throw error;
  }
}

export async function fetchWithoutAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const sanitizedUrl = sanitizeUrl(url);
  
  // 認証不要でもセキュリティヘッダーは追加
  const headers = {
    ...options.headers,
    'X-Requested-With': 'XMLHttpRequest',
  };

  try {
    const response = await fetch(sanitizedUrl, {
      ...options,
      headers,
      credentials: 'same-origin',
      mode: 'cors',
      cache: 'no-store',
    });

    if (!response.ok) {
      const securityError: SecurityError = new Error('Unauthorized') as SecurityError;
      securityError.code = 'SECURITY_ERROR';
      securityError.reason = 'UNAUTHORIZED';
      throw securityError;
    }

    return response;
  } catch (error) {
    if (isNetworkError(error as Error)) {
      const networkError: NetworkError = new Error('ネットワークエラーが発生しました') as NetworkError;
      networkError.code = 'NETWORK_ERROR';
      networkError.originalError = error as Error;
      throw networkError;
    }
    throw error;
  }
}
