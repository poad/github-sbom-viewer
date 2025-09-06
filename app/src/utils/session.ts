import { clearCsrfToken } from './csrf';

class SessionManager {
  private hiddenTime: number | null = null;
  private readonly CLEANUP_DELAY = 10000;

  constructor() {
    this.initCleanup();
  }

  private initCleanup(): void {
    window.addEventListener('beforeunload', () => {
      clearCsrfToken();
    });

    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });
  }

  private handleVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
      this.hiddenTime = Date.now();
      setTimeout(() => this.checkCleanup(), this.CLEANUP_DELAY);
    } else if (document.visibilityState === 'visible') {
      this.hiddenTime = null;
    }
  }

  private checkCleanup(): void {
    if (this.hiddenTime && document.visibilityState === 'hidden') {
      const hiddenDuration = Date.now() - this.hiddenTime;
      if (hiddenDuration >= this.CLEANUP_DELAY) {
        clearCsrfToken();
      }
    }
  }
}

export function initSessionCleanup(): void {
  new SessionManager();
}
  const CLEANUP_DELAY = 10000; // 10秒後にクリーンアップ

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
