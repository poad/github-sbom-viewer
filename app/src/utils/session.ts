import { clearCsrfToken } from './csrf';

export function initSessionCleanup(): void {
  let hiddenTime: number | null = null;
  const CLEANUP_DELAY = 30000; // 30秒後にクリーンアップ

  // ページ離脱時にCSRFトークンをクリア
  window.addEventListener('beforeunload', () => {
    clearCsrfToken();
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
            clearCsrfToken();
          }
        }
      }, CLEANUP_DELAY);
    } else if (document.visibilityState === 'visible') {
      // ページが再表示されたらタイマーをリセット
      hiddenTime = null;
    }
  });
}
