let notificationShown = false;

export function showCsrfWarning(): void {
  if (!notificationShown) {
    console.warn('CSRF protection is not available. Some security features may be limited.');
    notificationShown = true;
  }
}

export function resetNotificationState(): void {
  notificationShown = false;
}
