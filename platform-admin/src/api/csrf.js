// Django's CSRF cookie is deliberately readable; every state-changing request
// echoes it in X-CSRFToken. Session cookies stay HttpOnly.
export function readCsrfToken() {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}
