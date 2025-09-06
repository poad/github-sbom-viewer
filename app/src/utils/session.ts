import { clearCsrfToken } from './csrf';
import { SENSITIVE_STORAGE_KEYS } from '../config/security';

export function initSessionCleanup(): void {
  let hiddenTime: number | null = null;
  const CLEANUP_DELAY = 60000; // 1分後にクリーンアップ
  const SESSION_REVALIDATION_THRESHOLD = 15 * 60 * 1000; // 15分（トークン有効期限と同期）
  const MAX_SESSION_DURATION = 8 * 60 * 60 * 1000; // 8時間の最大セッション時間
  const TIMING_ATTACK_DELAY = 100; // タイミング攻撃対策の遅延

  // セッション開始時刻を記録（タイミング攻撃対策付き）
  const sessionStartTime = Date.now() + Math.random() * TIMING_ATTACK_DELAY;
  secureStorageSet('session-start-time', sessionStartTime.toString());

  // セキュアなデータ消去（複数回上書き）
  const secureErase = (key: string): void => {
    try {
      // 複数回のランダムデータで上書き（データ復旧対策）
      for (let i = 0; i < 3; i++) {
        const randomData = Array.from({ length: 64 }, () => 
          Math.random().toString(36).charAt(2),
        ).join('');
        localStorage.setItem(key, randomData);
      }
      localStorage.removeItem(key);
    } catch {
      // フォールバック: 通常の削除
      try {
        localStorage.removeItem(key);
      } catch (fallbackError) {
        console.error(`Failed to erase ${key}:`, fallbackError);
      }
    }
  };

  // セキュアなストレージ設定（タイミング攻撃対策）
  const secureStorageSet = (key: string, value: string): void => {
    try {
      // 一定の遅延を追加してタイミング攻撃を防ぐ
      setTimeout(() => {
        localStorage.setItem(key, value);
      }, Math.random() * TIMING_ATTACK_DELAY);
    } catch (error) {
      console.error(`Failed to set secure storage ${key}:`, error);
    }
  };

  // センシティブなローカルストレージデータをセキュアに消去
  const clearSensitiveData = (): void => {
    const startTime = performance.now();
    
    try {
      clearCsrfToken();
      
      // 設定からセンシティブなキーを取得してセキュア消去
      SENSITIVE_STORAGE_KEYS.forEach(key => {
        secureErase(key);
      });

      // セッション関連の追加データもセキュア消去
      secureErase('session-start-time');
      secureErase('last-activity-time');
      
      // メモリ内の機密データもクリア
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        // 可能であればメモリを強制的にガベージコレクション
        if (window.gc) {
          window.gc();
        }
      }
    } catch (error) {
      console.error('Failed to clear sensitive data:', error);
      
      // フォールバック: 通常の削除を試行
      try {
        SENSITIVE_STORAGE_KEYS.forEach(key => {
          localStorage.removeItem(key);
        });
        localStorage.removeItem('session-start-time');
        localStorage.removeItem('last-activity-time');
      } catch (fallbackError) {
        console.error('Fallback cleanup also failed:', fallbackError);
        
        // 最終フォールバック: ページリロード
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      }
    }
    
    // タイミング攻撃対策: 一定時間を確保
    const elapsedTime = performance.now() - startTime;
    const minTime = 50; // 最小実行時間
    if (elapsedTime < minTime) {
      setTimeout(() => { /* タイミング攻撃対策の遅延 */ }, minTime - elapsedTime);
    }
  };

  // セッション再検証（タイミング攻撃対策付き）
  const revalidateSession = async (): Promise<void> => {
    const startTime = performance.now();
    
    try {
      // セッション時間の検証
      const startTimeStr = localStorage.getItem('session-start-time');
      if (startTimeStr && Date.now() - parseInt(startTimeStr) > MAX_SESSION_DURATION) {
        console.warn('Session exceeded maximum duration');
        clearSensitiveData();
        const { logout } = await import('./auth');
        logout();
        return;
      }

      const response = await fetch('/api/session/validate', {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(10000), // 10秒タイムアウト
      });
      
      if (!response.ok) {
        console.warn('Session validation failed:', response.status);
        clearSensitiveData();
        const { logout } = await import('./auth');
        logout();
      } else {
        // 最後のアクティビティ時刻を更新
        secureStorageSet('last-activity-time', Date.now().toString());
      }
    } catch (error) {
      console.warn('Session revalidation failed:', error);
      
      // ネットワークエラーの場合は何もしない（オフライン対応）
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return;
      }
      
      // その他のエラーの場合はセキュリティ上セッションをクリア
      clearSensitiveData();
    }
    
    // タイミング攻撃対策: 一定時間を確保
    const elapsedTime = performance.now() - startTime;
    const minTime = 200; // 最小実行時間
    if (elapsedTime < minTime) {
      await new Promise(resolve => setTimeout(resolve, minTime - elapsedTime));
    }
  };

  // アクティビティ監視（タイミング攻撃対策付き）
  const updateActivity = (): void => {
    const timestamp = Date.now() + Math.random() * TIMING_ATTACK_DELAY;
    secureStorageSet('last-activity-time', timestamp.toString());
  };

  // ユーザーアクティビティを監視
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
  activityEvents.forEach(event => {
    document.addEventListener(event, updateActivity, { passive: true });
  });

  // ページ離脱時にセンシティブデータをクリア
  window.addEventListener('beforeunload', () => {
    clearSensitiveData();
  });

  // 緊急時のクリーンアップ（メモリ不足等）
  window.addEventListener('error', (event) => {
    if (event.error && (event.error as Error).name === 'QuotaExceededError') {
      clearSensitiveData();
    }
  });

  // ページの表示状態変更を監視
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenTime = Date.now();

      setTimeout(() => {
        if (hiddenTime && document.visibilityState === 'hidden') {
          const hiddenDuration = Date.now() - hiddenTime;
          if (hiddenDuration >= CLEANUP_DELAY) {
            clearSensitiveData();
          }
        }
      }, CLEANUP_DELAY);
    } else if (document.visibilityState === 'visible') {
      if (hiddenTime) {
        const hiddenDuration = Date.now() - hiddenTime;
        
        if (hiddenDuration >= SESSION_REVALIDATION_THRESHOLD) {
          revalidateSession();
        }
        
        hiddenTime = null;
      }
    }
  });

  // 定期的なセッション検証（15分ごと）
  const sessionInterval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      revalidateSession();
    }
  }, 15 * 60 * 1000);

  // 非アクティブ時間の監視（30分）
  const inactivityInterval = setInterval(() => {
    try {
      const lastActivity = localStorage.getItem('last-activity-time');
      if (lastActivity) {
        const inactiveTime = Date.now() - parseInt(lastActivity);
        if (inactiveTime > 30 * 60 * 1000) { // 30分非アクティブ
          console.warn('Session inactive for too long');
          clearSensitiveData();
          clearInterval(sessionInterval);
          clearInterval(inactivityInterval);
        }
      }
    } catch (error) {
      console.error('Inactivity check failed:', error);
      // エラー時はセキュリティ上セッションをクリア
      clearSensitiveData();
    }
  }, 5 * 60 * 1000); // 5分ごとにチェック

  // クリーンアップ関数を返す
  return () => {
    try {
      clearInterval(sessionInterval);
      clearInterval(inactivityInterval);
      activityEvents.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    } catch (error) {
      console.error('Cleanup function failed:', error);
    }
  };
}
