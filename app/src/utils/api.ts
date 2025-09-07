import { getCsrfToken } from './csrf';
import { hasGivenConsent } from './cookie-consent';
import { validateAndSanitizeURL, getDevConfig, getProdConfig } from './url-sanitizer';
import { 
  showSessionExpiredNotification,
} from './notification';


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


const sanitizeUrl = (url: string): string => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const config = isDevelopment ? getDevConfig() : getProdConfig();
  
  const validation = validateAndSanitizeURL(url, config);
  
  if (!validation.isValid) {
    const securityError: SecurityError = new Error(`URL validation failed: ${validation.error}`) as SecurityError;
    securityError.code = 'SECURITY_ERROR';
    securityError.reason = 'INVALID_URL';
    throw securityError;
  }

  if (validation.warnings && validation.warnings.length > 0) {
    console.warn('URL validation warnings:', validation.warnings);
  }

  return validation.sanitizedUrl || url;
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
    console.warn('CSRF token retrieval failed:', sanitizeForLogging(error));
  }
  
  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
  };

  try {
    const response = await fetch(sanitizedUrl, {
      ...options,
      headers,
      credentials: 'include',
      mode: 'cors',
      cache: 'no-store',
      signal: AbortSignal.timeout(30000), // 30秒タイムアウト
    });

    if (!response.ok) {
      const isDevelopment = process.env.NODE_ENV === 'development';
      const httpError: HttpError = new Error(
        getSecureErrorMessage(response.status, isDevelopment),
      ) as HttpError;
      httpError.code = 'HTTP_ERROR';
      httpError.status = response.status;
      httpError.statusText = response.statusText;
      httpError.isRetryable = false;

      // 認証エラーの場合
      if (response.status === 401) {
        showSessionExpiredNotification();
      }

      console.error('HTTP Error:', {
        status: response.status,
        statusText: response.statusText,
        url: sanitizedUrl,
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

      console.error('Network Error:', sanitizeForLogging(error));
      throw networkError;
    }

    // その他のエラー
    console.error('Request Error:', sanitizeForLogging(error));
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
