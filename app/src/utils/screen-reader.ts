// スクリーンリーダー通知の管理
class ScreenReaderNotifier {
  private politeRegion: HTMLElement | null = null;
  private assertiveRegion: HTMLElement | null = null;
  private statusRegion: HTMLElement | null = null;

  private ensureRegion(type: 'polite' | 'assertive' | 'status'): HTMLElement {
    const regionId = `sr-${type}-region`;
    let region = document.getElementById(regionId);
    
    if (!region) {
      region = document.createElement('div');
      region.id = regionId;
      region.setAttribute('aria-live', type === 'status' ? 'polite' : type);
      region.setAttribute('aria-atomic', 'true');
      region.className = 'sr-only';
      region.style.cssText = `
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      `;
      
      document.body.appendChild(region);
      
      // 参照を保存
      if (type === 'polite') this.politeRegion = region;
      else if (type === 'assertive') this.assertiveRegion = region;
      else this.statusRegion = region;
    }
    
    return region;
  }

  announce(message: string, priority: 'polite' | 'assertive' | 'status' = 'polite'): void {
    if (!message.trim()) return;
    
    const region = this.ensureRegion(priority);
    
    // 既存のメッセージをクリアしてから新しいメッセージを設定
    region.textContent = '';
    
    // 短い遅延でメッセージを設定（スクリーンリーダーが変更を検知するため）
    setTimeout(() => {
      region.textContent = message;
    }, 10);
  }

  announceStatus(message: string): void {
    this.announce(message, 'status');
  }

  announceAlert(message: string): void {
    this.announce(message, 'assertive');
  }

  clear(priority?: 'polite' | 'assertive' | 'status'): void {
    if (priority) {
      const region = priority === 'polite' ? this.politeRegion :
        priority === 'assertive' ? this.assertiveRegion :
          this.statusRegion;
      if (region) {
        region.textContent = '';
      }
    } else {
      // すべてのリージョンをクリア
      [this.politeRegion, this.assertiveRegion, this.statusRegion].forEach(region => {
        if (region) {
          region.textContent = '';
        }
      });
    }
  }

  cleanup(): void {
    [this.politeRegion, this.assertiveRegion, this.statusRegion].forEach(region => {
      if (region && region.parentNode) {
        region.parentNode.removeChild(region);
      }
    });
    
    this.politeRegion = null;
    this.assertiveRegion = null;
    this.statusRegion = null;
  }
}

// シングルトンインスタンス
const screenReaderNotifier = new ScreenReaderNotifier();

// エクスポート関数
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' | 'status' = 'polite'): void {
  screenReaderNotifier.announce(message, priority);
}

export function announceStatus(message: string): void {
  screenReaderNotifier.announceStatus(message);
}

export function announceAlert(message: string): void {
  screenReaderNotifier.announceAlert(message);
}

export function clearScreenReaderAnnouncements(priority?: 'polite' | 'assertive' | 'status'): void {
  screenReaderNotifier.clear(priority);
}

// ページ離脱時のクリーンアップ
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    screenReaderNotifier.cleanup();
  });
}
