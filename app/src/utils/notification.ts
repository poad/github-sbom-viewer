import { announceAlert, announceStatus } from './screen-reader';

export function showSessionExpiredNotification(): void {
  const message = '⏰ セッションの有効期限が切れました\n\n' +
    '対処方法：\n' +
    '1. 再度ログインしてください\n' +
    '2. 問題が続く場合は、ブラウザのキャッシュをクリアしてください';
  
  alert(message);
  announceAlert('セッションの有効期限が切れました。再度ログインしてください。');
}

export function showCsrfErrorNotification(): void {
  const message = '🔒 セキュリティトークンの更新に失敗しました\n\n' +
    '対処方法：\n' +
    '1. ページを再読み込み（F5キー）してください\n' +
    '2. 問題が続く場合は、ブラウザのキャッシュをクリアしてください';
  
  alert(message);
  announceAlert('セキュリティトークンの更新に失敗しました。ページを再読み込みしてください。');
}

export function showCsrfWarning(): void {
  // CSRFトークン取得失敗の警告を表示
  console.warn('セキュリティトークンの取得に失敗しました。一部の機能が制限される可能性があります。');
  announceStatus('セキュリティトークンの取得に失敗しました。');
}

export function showRateLimitNotification(retryAfterSeconds: number): void {
  const message = '⏱️ リクエスト制限に達しました\n\n' +
    `${retryAfterSeconds}秒後に再試行してください\n\n` +
    '対処方法：\n' +
    '1. しばらく待ってから操作を再開してください\n' +
    '2. 短時間での大量リクエストを避けてください\n' +
    '3. 必要に応じてページを再読み込みしてください';
  
  alert(message);
  announceAlert(`リクエスト制限に達しました。${retryAfterSeconds}秒後に再試行してください。`);
}

export function showNetworkErrorNotification(attempt: number, maxRetries: number): void {
  const isLastAttempt = attempt === maxRetries;
  
  if (isLastAttempt) {
    const message = '🌐 ネットワーク接続エラー\n\n' +
      `${maxRetries}回の再試行が失敗しました\n\n` +
      '対処方法：\n' +
      '1. インターネット接続を確認してください\n' +
      '2. Wi-Fiまたはモバイルデータを切り替えてみてください\n' +
      '3. ページを再読み込み（F5キー）してください\n' +
      '4. 問題が続く場合は、数分後に再度お試しください';
    
    alert(message);
    announceAlert(`ネットワーク接続エラーが発生しました。${maxRetries}回の再試行が失敗しました。`);
  } else {
    announceStatus(`ネットワークエラーのため再試行中です。${attempt}回目の試行です。`);
  }
}

export function showHttpErrorNotification(status: number, attempt: number, maxRetries: number): void {
  const isLastAttempt = attempt === maxRetries;
  
  if (isLastAttempt) {
    announceAlert(`HTTPエラー ${status} が発生しました。${maxRetries}回の再試行が失敗しました。`);
  } else {
    announceStatus(`HTTPエラー ${status} のため再試行中です。${attempt}回目の試行です。`);
  }
}
