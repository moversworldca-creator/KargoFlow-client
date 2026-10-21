export function recordWorkError(error, fallback = 'Request failed. Please retry.') {
  const status = error?.response?.status;
  const messages = { 401: 'Your session expired. Sign in again.', 403: 'You do not have permission for this action.', 404: 'This record no longer exists. Refresh the page.', 409: 'This record changed. Refresh and try again.', 500: 'The server could not complete the request. Please retry.' };
  if (messages[status]) return messages[status];
  if (error?.code === 'ECONNABORTED') return 'The request timed out. Please retry.';
  const data = error?.response?.data;
  if (data) {
    const value = data.detail || data.message || Object.values(data)[0];
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.join(' ');
  }
  return fallback;
}
