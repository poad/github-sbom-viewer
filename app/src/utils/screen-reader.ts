// スクリーンリーダー通知の管理（キューイング対応）
interface QueuedMessage {
  message: string;
  priority: 'polite' | 'assertive' | 'status';
  timestamp: number;
  id: string;
}

class ScreenReaderNotifier {
  private politeRegion: HTMLElement | null = null;
  private assertiveRegion: HTMLElement | null = null;
  private statusRegion: HTMLElement | null = null;
  
  // メッセージキュー
  private messageQueue: QueuedMessage[] = [];
  private isProcessing = false;
  private currentTimeouts = new Map<string, number>();
  
  // キュー設定
  private readonly QUEUE_DELAY = 1500; // メッセージ間の遅延（ミリ秒）
  private readonly MAX_QUEUE_SIZE = 10; // 最大キューサイズ
  private readonly MESSAGE_DURATION = 3000; // メッセージ表示時間

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

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addToQueue(message: string, priority: 'polite' | 'assertive' | 'status'): void {
    // 重複メッセージのチェック
    const isDuplicate = this.messageQueue.some(
      queued => queued.message === message && queued.priority === priority,
    );
    
    if (isDuplicate) return;

    const queuedMessage: QueuedMessage = {
      message,
      priority,
      timestamp: Date.now(),
      id: this.generateMessageId(),
    };

    // 優先度に基づく挿入位置の決定
    if (priority === 'assertive') {
      // assertive は最優先で先頭に挿入
      this.messageQueue.unshift(queuedMessage);
    } else {
      // polite と status は末尾に追加
      this.messageQueue.push(queuedMessage);
    }

    // キューサイズの制限
    if (this.messageQueue.length > this.MAX_QUEUE_SIZE) {
      // 古い低優先度メッセージを削除
      const lowPriorityIndex = this.messageQueue.findIndex(
        msg => msg.priority !== 'assertive',
      );
      if (lowPriorityIndex !== -1) {
        this.messageQueue.splice(lowPriorityIndex, 1);
      } else {
        // すべてが高優先度の場合は最古のものを削除
        this.messageQueue.pop();
      }
    }

    // キュー処理開始
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.messageQueue.length === 0) return;

    this.isProcessing = true;

    while (this.messageQueue.length > 0) {
      const queuedMessage = this.messageQueue.shift();
      if (!queuedMessage) break;

      await this.announceMessage(queuedMessage);
      
      // 次のメッセージまでの遅延
      if (this.messageQueue.length > 0) {
        await this.delay(this.QUEUE_DELAY);
      }
    }

    this.isProcessing = false;
  }

  private async announceMessage(queuedMessage: QueuedMessage): Promise<void> {
    const region = this.ensureRegion(queuedMessage.priority);
    
    // 既存のメッセージをクリア
    region.textContent = '';
    
    // 短い遅延でメッセージを設定
    await this.delay(10);
    region.textContent = queuedMessage.message;

    // メッセージの自動クリア
    const timeoutId = window.setTimeout(() => {
      if (region.textContent === queuedMessage.message) {
        region.textContent = '';
      }
      this.currentTimeouts.delete(queuedMessage.id);
    }, this.MESSAGE_DURATION);

    this.currentTimeouts.set(queuedMessage.id, timeoutId);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  announce(message: string, priority: 'polite' | 'assertive' | 'status' = 'polite'): void {
    if (!message.trim()) return;
    
    // 緊急メッセージは即座に通知、その他はキューに追加
    if (priority === 'assertive' && this.messageQueue.length === 0 && !this.isProcessing) {
      this.announceMessage({
        message,
        priority,
        timestamp: Date.now(),
        id: this.generateMessageId(),
      });
    } else {
      this.addToQueue(message, priority);
    }
  }

  announceStatus(message: string): void {
    this.announce(message, 'status');
  }

  announceAlert(message: string): void {
    this.announce(message, 'assertive');
  }

  // 即座に通知（キューをバイパス）
  announceImmediate(message: string, priority: 'polite' | 'assertive' | 'status' = 'assertive'): void {
    if (!message.trim()) return;
    
    this.announceMessage({
      message,
      priority,
      timestamp: Date.now(),
      id: this.generateMessageId(),
    });
  }

  clear(priority?: 'polite' | 'assertive' | 'status'): void {
    if (priority) {
      // 特定優先度のキューをクリア
      this.messageQueue = this.messageQueue.filter(msg => msg.priority !== priority);
      
      const region = priority === 'polite' ? this.politeRegion :
        priority === 'assertive' ? this.assertiveRegion :
          this.statusRegion;
      if (region) {
        region.textContent = '';
      }
    } else {
      // すべてのキューとリージョンをクリア
      this.messageQueue = [];
      [this.politeRegion, this.assertiveRegion, this.statusRegion].forEach(region => {
        if (region) {
          region.textContent = '';
        }
      });
    }

    // 進行中のタイムアウトをクリア
    this.currentTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.currentTimeouts.clear();
  }

  // キューの状態取得
  getQueueStatus(): {
    queueLength: number;
    isProcessing: boolean;
    nextMessage?: QueuedMessage;
    priorityBreakdown: Record<'polite' | 'assertive' | 'status', number>;
  } {
    const priorityBreakdown = {
      polite: 0,
      assertive: 0,
      status: 0,
    };

    this.messageQueue.forEach(msg => {
      priorityBreakdown[msg.priority]++;
    });

    return {
      queueLength: this.messageQueue.length,
      isProcessing: this.isProcessing,
      nextMessage: this.messageQueue[0],
      priorityBreakdown,
    };
  }

  // 特定メッセージの削除
  removeMessage(messageId: string): boolean {
    const index = this.messageQueue.findIndex(msg => msg.id === messageId);
    if (index !== -1) {
      this.messageQueue.splice(index, 1);
      
      // タイムアウトもクリア
      const timeoutId = this.currentTimeouts.get(messageId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.currentTimeouts.delete(messageId);
      }
      
      return true;
    }
    return false;
  }

  cleanup(): void {
    // キュー処理停止
    this.isProcessing = false;
    this.messageQueue = [];
    
    // タイムアウトクリア
    this.currentTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.currentTimeouts.clear();
    
    // DOM要素削除
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

export function announceImmediate(message: string, priority: 'polite' | 'assertive' | 'status' = 'assertive'): void {
  screenReaderNotifier.announceImmediate(message, priority);
}

export function clearScreenReaderAnnouncements(priority?: 'polite' | 'assertive' | 'status'): void {
  screenReaderNotifier.clear(priority);
}

export function getScreenReaderQueueStatus(): ReturnType<ScreenReaderNotifier['getQueueStatus']> {
  return screenReaderNotifier.getQueueStatus();
}

export function removeScreenReaderMessage(messageId: string): boolean {
  return screenReaderNotifier.removeMessage(messageId);
}

// ページ離脱時のクリーンアップ
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    screenReaderNotifier.cleanup();
  });
}
