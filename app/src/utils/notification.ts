export function showSessionExpiredNotification(): void {
  // セッション期限切れの通知を表示
  alert('セッションの有効期限が切れました。再度ログインしてください。');
}

export function showCsrfErrorNotification(): void {
  // CSRF関連エラーの通知を表示
  alert('セキュリティトークンの更新に失敗しました。ページを再読み込みしてください。');
}

export function showCsrfWarning(): void {
  // CSRFトークン取得失敗の警告を表示
  console.warn('セキュリティトークンの取得に失敗しました。一部の機能が制限される可能性があります。');
}
