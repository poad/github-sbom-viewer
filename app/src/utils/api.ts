import { getCsrfToken, refreshCsrfToken } from './csrf';
import { logout } from './auth';
import { hasGivenConsent } from './cookie-consent';

// エラータイプの定義
interface NetworkError extends Error {
  code: 'NETWORK_ERROR';
  originalError: Error;
}

interface HttpError extends Error {
  code: 'HTTP_ERROR';
  status: number;
  statusText: string;
}

// リトライ設定
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1秒
  maxDelay: 10000, // 10秒
};

// バックオフ戦略（指数バックオフ + ジッター）
const calculateDelay = (attempt: number): number => {
  const exponentialDelay = Math.min(
    RETRY_CONFIG.baseDelay * Math.pow(2, attempt - 1),
    RETRY_CONFIG.maxDelay,
  );
  // ジッターを追加（±25%）
  const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
  return Math.max(exponentialDelay + jitter, 100);
};

// ネットワークエラーかどうかを判定
const isNetworkError = (error: Error): boolean => {
  return error.name === 'TypeError' || 
         error.message.includes('fetch') ||
         error.message.includes('network') ||
         error.message.includes('Failed to fetch');
};

// ステータスコードに応じたエラーメッセージ
const getErrorMessage = (status: number): string => {
  switch (status) {
    case 400: return 'リクエストが無効です';
    case 401: return '認証が必要です';
    case 403: return 'アクセスが拒否されました';
    case 404: return 'リソースが見つかりません';
    case 429: return 'リクエスト回数が上限を超えました';
    case 500: return 'サーバーエラーが発生しました';
    case 502: return 'サーバーが一時的に利用できません';
    case 503: return 'サービスが一時的に利用できません';
    case 504: return 'サーバーの応答がタイムアウトしました';
    default: return `HTTPエラー: ${status}`;
  }
};

// リトライ可能なエラーかどうかを判定
const isRetryableError = (error: Error | Response): boolean => {
  if (error instanceof Response) {
    // 5xx系エラーと429はリトライ可能
    return error.status >= 500 || error.status === 429;
  }
  // ネットワークエラーはリトライ可能
  return isNetworkError(error);
};

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  // クッキー同意がない場合はエラー
  if (!hasGivenConsent()) {
    throw new Error('Cookie consent required');
  }

  let csrfToken: string;
  try {
    csrfToken = await getCsrfToken();
  } catch (error) {
    console.warn('CSRF token retrieval failed, proceeding without CSRF token:', error);
    csrfToken = '';
  }
  
  const makeRequest = async (csrf: string, attempt = 1): Promise<Response> => {
    const headers = {
      ...options.headers,
      ...(csrf && { 'X-CSRF-Token': csrf }),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      // HTTPエラーの場合
      if (!response.ok) {
        const httpError: HttpError = new Error(getErrorMessage(response.status)) as HttpError;
        httpError.code = 'HTTP_ERROR';
        httpError.status = response.status;
        httpError.statusText = response.statusText;

        // リトライ可能なエラーかつ最大リトライ回数未満の場合
        if (isRetryableError(response) && attempt < RETRY_CONFIG.maxRetries) {
          const delay = calculateDelay(attempt);
          console.warn(`Request failed (attempt ${attempt}), retrying in ${delay}ms:`, httpError.message);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return makeRequest(csrf, attempt + 1);
        }

        throw httpError;
      }

      return response;
    } catch (error) {
      // ネットワークエラーの場合
      if (isNetworkError(error as Error)) {
        const networkError: NetworkError = new Error('ネットワークエラーが発生しました') as NetworkError;
        networkError.code = 'NETWORK_ERROR';
        networkError.originalError = error as Error;

        // リトライ可能かつ最大リトライ回数未満の場合
        if (attempt < RETRY_CONFIG.maxRetries) {
          const delay = calculateDelay(attempt);
          console.warn(`Network error (attempt ${attempt}), retrying in ${delay}ms:`, error);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return makeRequest(csrf, attempt + 1);
        }

        throw networkError;
      }

      // その他のエラー
      throw error;
    }
  };

  let response = await makeRequest(csrfToken);

  // CSRFトークンエラー（403）の場合は一度だけリトライ
  if (response.status === 403 && csrfToken) {
    try {
      const newCsrfToken = await refreshCsrfToken();
      response = await makeRequest(newCsrfToken);
    } catch (error) {
      console.warn('CSRF token refresh failed:', error);
      // CSRFトークンリフレッシュ失敗時の処理
      const { showCsrfErrorNotification } = await import('./notification');
      showCsrfErrorNotification();
      
      // セッション切れの可能性が高い場合は再認証を促す
      if (response.status === 403) {
        const { showSessionExpiredNotification } = await import('./notification');
        showSessionExpiredNotification();
        logout();
        throw new Error('Session expired - please login again');
      }
    }
  }

  // 401エラーの場合はログアウト
  if (response.status === 401) {
    const { showSessionExpiredNotification } = await import('./notification');
    showSessionExpiredNotification();
    logout();
    throw new Error('Unauthorized');
  }

  return response;
}
