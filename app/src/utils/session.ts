import { clearCsrfToken } from './csrf';
import { SENSITIVE_STORAGE_KEYS } from '../config/security';

export function initSessionCleanup(): void {
  let hiddenTime: number | null = null;
  const CLEANUP_DELAY = 60000; // 1分後にクリーンアップ
  const SESSION_REVALIDATION_THRESHOLD = 15 * 60 * 1000; // 15分（トークン有効期限と同期）
  const MAX_SESSION_DURATION = 8 * 60 * 60 * 1000; // 8時間の最大セッション時間

  // セッション開始時刻を記録
  const sessionStartTime = Date.now();
  localStorage.setItem('session-start-time', sessionStartTime.toString());

  // センシティブなローカルストレージデータをクリア
  const clearSensitiveData = () => {
    try {
      clearCsrfToken();
      
      // 設定からセンシティブなキーを取得して削除
      SENSITIVE_STORAGE_KEYS.forEach(key => {
        localStorage.removeItem(key);
      });

      // セッション関連の追加データも削除
      localStorage.removeItem('session-start-time');
      localStorage.removeItem('last-activity-time');
    } catch (error) {
      console.error('Failed to clear sensitive data:', error);
    }
  };

  // セッション再検証
  const revalidateSession = async () => {
    try {
      // セッション時間の検証
      const startTime = localStorage.getItem('session-start-time');
      if (startTime && Date.now() - parseInt(startTime) > MAX_SESSION_DURATION) {
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
      });
      
      if (!response.ok) {
        // セッションが無効な場合はクリーンアップ
        console.warn('Session validation failed:', response.status);
        clearSensitiveData();
        // 必要に応じてログアウト処理
        const { logout } = await import('./auth');
        logout();
      } else {
        // 最後のアクティビティ時刻を更新
        localStorage.setItem('last-activity-time', Date.now().toString());
      }
    } catch (error) {
      console.warn('Session revalidation failed:', error);
      // ネットワークエラーの場合は何もしない（オフライン対応）
    }
  };

  // アクティビティ監視
  const updateActivity = () => {
    localStorage.setItem('last-activity-time', Date.now().toString());
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

  // ページの表示状態変更を監視
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // ページが非表示になった時刻を記録
      hiddenTime = Date.now();

      // 一定時間後にクリーンアップを実行
      setTimeout(() => {
        if (hiddenTime && document.visibilityState === 'hidden') {
          const hiddenDuration = Date.now() - hiddenTime;
          if (hiddenDuration >= CLEANUP_DELAY) {
            clearSensitiveData();
          }
        }
      }, CLEANUP_DELAY);
    } else if (document.visibilityState === 'visible') {
      // ページが再表示された場合
      if (hiddenTime) {
        const hiddenDuration = Date.now() - hiddenTime;
        
        // 長期間非表示だった場合はセッション再検証
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
  }, 5 * 60 * 1000); // 5分ごとにチェック

  // クリーンアップ関数を返す
  return () => {
    clearInterval(sessionInterval);
    clearInterval(inactivityInterval);
    activityEvents.forEach(event => {
      document.removeEventListener(event, updateActivity);
    });
  };
}
