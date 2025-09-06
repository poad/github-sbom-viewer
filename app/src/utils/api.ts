import { getCsrfToken, refreshCsrfToken } from './csrf';
import { hasGivenConsent } from './cookie-consent';

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000,
} as const;

const RATE_LIMIT_CONFIG = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1分
  backoffMultiplier: 2,
} as const;

interface NetworkError extends Error {
  code: 'NETWORK_ERROR';
  originalError: Error;
}

interface HttpError extends Error {
  code: 'HTTP_ERROR';
  status: number;
  statusText: string;
  isRetryable: boolean;
}

interface SecurityError extends Error {
  code: 'SECURITY_ERROR';
  reason: string;
}

interface RateLimitErrorInterface extends Error {
  code: 'RATE_LIMIT_ERROR';
  retryAfter: number;
}

// レート制限追跡
const rateLimitTracker = {
  requests: new Map<string, number[]>(),
  
  isRateLimited(endpoint: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(endpoint) || [];
    
    // 古いリクエストを削除
    const validRequests = requests.filter(time => now - time < RATE_LIMIT_CONFIG.windowMs);
    this.requests.set(endpoint, validRequests);
    
    return validRequests.length >= RATE_LIMIT_CONFIG.maxRequests;
  },
  
  recordRequest(endpoint: string): void {
    const now = Date.now();
    const requests = this.requests.get(endpoint) || [];
    requests.push(now);
    this.requests.set(endpoint, requests);
  },
  
  getRetryAfter(endpoint: string): number {
    const requests = this.requests.get(endpoint) || [];
    if (requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...requests);
    return Math.max(0, RATE_LIMIT_CONFIG.windowMs - (Date.now() - oldestRequest));
  },
};

const isNetworkError = (error: Error): boolean => {
  return error.name === 'TypeError' || 
         error.message.includes('fetch') ||
         error.message.includes('network') ||
         error.message.includes('Failed to fetch');
};

// セキュアなエラーメッセージ（詳細情報を制限）
const getSecureErrorMessage = (status: number, isDevelopment = false): string => {
  const productionMessages: Record<number, string> = {
    400: 'リクエストに問題があります',
    401: '認証が必要です',
    403: 'アクセスが拒否されました',
    404: 'リソースが見つかりません',
    429: 'リクエスト制限に達しました。しばらく待ってから再試行してください',
    500: 'サーバーエラーが発生しました',
    502: 'サーバーに接続できません',
    503: 'サービスが一時的に利用できません',
    504: 'サーバーの応答がタイムアウトしました',
  };

  const developmentMessages: Record<number, string> = {
    400: 'リクエストが無効です (Bad Request)',
    401: '認証が必要です (Unauthorized)',
    403: 'アクセスが拒否されました (Forbidden)',
    404: 'リソースが見つかりません (Not Found)',
    429: 'リクエスト制限に達しました (Too Many Requests)',
    500: 'サーバー内部エラーが発生しました (Internal Server Error)',
    502: 'ゲートウェイエラーが発生しました (Bad Gateway)',
    503: 'サービスが利用できません (Service Unavailable)',
    504: 'ゲートウェイタイムアウトが発生しました (Gateway Timeout)',
  };

  const messages = isDevelopment ? developmentMessages : productionMessages;
  return messages[status] || '予期しないエラーが発生しました';
};

const isRetryableError = (error: Error | Response): boolean => {
  if (error instanceof Response) {
    // セキュリティ上の理由で認証・認可エラーはリトライしない
    if (error.status === 401 || error.status === 403) {
      return false;
    }
    // 4xx系エラー（クライアントエラー）は基本的にリトライしない
    if (error.status >= 400 && error.status < 500 && error.status !== 429) {
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
      throw new SecurityError('Unauthorized domain');
    }
    return urlObj.toString();
  } catch {
    throw new SecurityError('Invalid URL');
  }
};

// センシティブ情報をログから除外
const sanitizeForLogging = (data: unknown): unknown => {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization', 'cookie'];
  const sanitized = { ...data as Record<string, unknown> };

  Object.keys(sanitized).forEach(key => {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
  });

  return sanitized;
};

const handleRateLimit = async (response: Response, endpoint: string): Promise<void> => {
  const retryAfter = response.headers.get('Retry-After');
  const retryAfterMs = retryAfter ? parseInt(retryAfter) * 1000 : rateLimitTracker.getRetryAfter(endpoint);
  
  const rateLimitError: RateLimitErrorInterface = new Error(
    `レート制限に達しました。${Math.ceil(retryAfterMs / 1000)}秒後に再試行してください`,
  ) as RateLimitErrorInterface;
  rateLimitError.code = 'RATE_LIMIT_ERROR';
  rateLimitError.retryAfter = retryAfterMs;

  // レート制限情報をユーザーに通知
  const { showRateLimitNotification } = await import('./notification');
  showRateLimitNotification(Math.ceil(retryAfterMs / 1000));

  throw rateLimitError;
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
  const endpoint = new URL(sanitizedUrl).pathname;

  // レート制限チェック
  if (rateLimitTracker.isRateLimited(endpoint)) {
    const retryAfter = rateLimitTracker.getRetryAfter(endpoint);
    const rateLimitError: RateLimitErrorInterface = new Error(
      `レート制限に達しました。${Math.ceil(retryAfter / 1000)}秒後に再試行してください`,
    ) as RateLimitErrorInterface;
    rateLimitError.code = 'RATE_LIMIT_ERROR';
    rateLimitError.retryAfter = retryAfter;
    throw rateLimitError;
  }

  let csrfToken = '';
  
  try {
    csrfToken = await getCsrfToken();
  } catch (error) {
    console.warn('CSRF token retrieval failed:', sanitizeForLogging(error));
  }
  
  const makeRequest = async (csrf: string, attempt = 1): Promise<Response> => {
    const headers = {
      ...options.headers,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(csrf && { 'X-CSRF-Token': csrf }),
    };

    try {
      // リクエストを記録
      rateLimitTracker.recordRequest(endpoint);

      const response = await fetch(sanitizedUrl, {
        ...options,
        headers,
        credentials: 'same-origin',
        mode: 'cors',
        cache: 'no-store',
        signal: AbortSignal.timeout(30000), // 30秒タイムアウト
      });

      if (!response.ok) {
        // レート制限の特別処理
        if (response.status === 429) {
          await handleRateLimit(response, endpoint);
          return response; // この行は実行されない（handleRateLimitがthrowする）
        }

        const isDevelopment = process.env.NODE_ENV === 'development';
        const httpError: HttpError = new Error(
          getSecureErrorMessage(response.status, isDevelopment),
        ) as HttpError;
        httpError.code = 'HTTP_ERROR';
        httpError.status = response.status;
        httpError.statusText = response.statusText;
        httpError.isRetryable = isRetryableError(response);

        // リトライ可能エラーの場合
        if (httpError.isRetryable && attempt < RETRY_CONFIG.maxRetries) {
          const delay = Math.min(
            RETRY_CONFIG.baseDelay * Math.pow(RATE_LIMIT_CONFIG.backoffMultiplier, attempt - 1),
            RETRY_CONFIG.maxDelay,
          );
          
          const { showHttpErrorNotification } = await import('./notification');
          showHttpErrorNotification(response.status, attempt, RETRY_CONFIG.maxRetries);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return makeRequest(csrf, attempt + 1);
        }

        // センシティブ情報を除外してログ出力
        console.error('HTTP Error:', {
          status: response.status,
          statusText: response.statusText,
          url: sanitizedUrl,
          attempt,
        });

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
          const delay = Math.min(
            RETRY_CONFIG.baseDelay * Math.pow(RATE_LIMIT_CONFIG.backoffMultiplier, attempt - 1),
            RETRY_CONFIG.maxDelay,
          );
          
          const { showNetworkErrorNotification } = await import('./notification');
          showNetworkErrorNotification(attempt, RETRY_CONFIG.maxRetries);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return makeRequest(csrf, attempt + 1);
        }

        console.error('Network Error:', sanitizeForLogging(error));
        throw networkError;
      }

      // その他のエラー
      console.error('Request Error:', sanitizeForLogging(error));
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
        console.warn('CSRF token refresh failed:', sanitizeForLogging(refreshError));
        
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
      signal: AbortSignal.timeout(30000),
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

// SecurityErrorクラスの定義
class SecurityErrorClass extends Error {
  code = 'SECURITY_ERROR' as const;
  reason: string;

  constructor(message: string, reason = 'UNKNOWN') {
    super(message);
    this.name = 'SecurityError';
    this.reason = reason;
  }
}

// SecurityErrorのエクスポート
export const SecurityError = SecurityErrorClass;
