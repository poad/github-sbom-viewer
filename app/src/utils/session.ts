import { clearCsrfToken } from './csrf';

export function initSessionCleanup(): void {
  let hiddenTime: number | null = null;
  const CLEANUP_DELAY = 60000; // 1分後にクリーンアップ
  const SESSION_REVALIDATION_THRESHOLD = 15 * 60 * 1000; // 15分（トークン有効期限と同期）

  // センシティブなローカルストレージデータをクリア
  const clearSensitiveData = () => {
    clearCsrfToken();
    
    // ローカルストレージからセンシティブなデータを削除
    const sensitiveKeys = [
      'github-token',
      'user-session',
      'auth-state',
      'csrf-token',
      'session-data',
    ];
    
    sensitiveKeys.forEach(key => {
      localStorage.removeItem(key);
    });
  };

  // セッション再検証
  const revalidateSession = async () => {
    try {
      const response = await fetch('/api/session/validate', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        // セッションが無効な場合はクリーンアップ
        clearSensitiveData();
        // 必要に応じてログアウト処理
        const { logout } = await import('./auth');
        logout();
      }
    } catch (error) {
      console.warn('Session revalidation failed:', error);
      // ネットワークエラーの場合は何もしない（オフライン対応）
    }
  };

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
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      revalidateSession();
    }
  }, 15 * 60 * 1000);
}
