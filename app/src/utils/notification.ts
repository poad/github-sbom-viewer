export function showSessionExpiredNotification(): void {
  alert('⏰ セッションの有効期限が切れました\n\n' +
    '対処方法：\n' +
    '1. 再度ログインしてください\n' +
    '2. 問題が続く場合は、ブラウザのキャッシュをクリアしてください');
}

export function showCsrfErrorNotification(): void {
  alert('🔒 セキュリティトークンの更新に失敗しました\n\n' +
    '対処方法：\n' +
    '1. ページを再読み込み（F5キー）してください\n' +
    '2. 問題が続く場合は、ブラウザのキャッシュをクリアしてください');
}

export function showCsrfWarning(): void {
  // CSRFトークン取得失敗の警告を表示
  console.warn('セキュリティトークンの取得に失敗しました。一部の機能が制限される可能性があります。');
}

export function showNetworkErrorNotification(attempt: number, maxRetries: number): void {
  const isLastAttempt = attempt === maxRetries;
  
  if (isLastAttempt) {
    alert('🌐 ネットワーク接続エラー\n\n' +
      `${maxRetries}回の再試行が失敗しました\n\n` +
      '対処方法：\n' +
      '1. インターネット接続を確認してください\n' +
      '2. Wi-Fiまたはモバイルデータを切り替えてみてください\n' +
      '3. ページを再読み込み（F5キー）してください\n' +
      '4. 問題が続く場合は、数分後に再度お試しください');
  } else {
    console.warn(`🔄 ネットワークエラー - 再試行中 (${attempt}/${maxRetries})`);
  }
}

export function showHttpErrorNotification(status: number, attempt: number, maxRetries: number): void {
  const isLastAttempt = attempt === maxRetries;
  
  const getErrorDetails = (status: number) => {
    switch (status) {
      case 400:
        return {
          title: '⚠️ 不正なリクエスト',
          actions: ['入力内容を確認してください', 'ページを再読み込みしてください'],
        };
      case 401:
        return {
          title: '🔐 認証エラー',
          actions: ['再度ログインしてください', 'ブラウザのキャッシュをクリアしてください'],
        };
      case 403:
        return {
          title: '🚫 アクセス拒否',
          actions: ['リポジトリのアクセス権限を確認してください', '管理者にお問い合わせください'],
        };
      case 404:
        return {
          title: '📄 ページが見つかりません',
          actions: ['URLを確認してください', 'リポジトリが存在するか確認してください'],
        };
      case 429:
        return {
          title: '⏱️ リクエスト制限',
          actions: ['5分程度お待ちください', 'GitHub APIの制限に達している可能性があります'],
        };
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          title: '🔧 サーバーエラー',
          actions: ['しばらく時間をおいてから再度お試しください', 'GitHubのステータスページを確認してください'],
        };
      default:
        return {
          title: '❌ 予期しないエラー',
          actions: ['ページを再読み込みしてください', 'しばらく時間をおいてから再度お試しください'],
        };
    }
  };

  if (isLastAttempt) {
    const { title, actions } = getErrorDetails(status);
    const actionList = actions.map((action, index) => `${index + 1}. ${action}`).join('\n');
    
    alert(`${title} (${status})\n\n` +
      `${maxRetries}回の再試行が失敗しました\n\n` +
      `対処方法：\n${actionList}`);
  } else {
    console.warn(`🔄 HTTPエラー ${status} - 再試行中 (${attempt}/${maxRetries})`);
  }
}
