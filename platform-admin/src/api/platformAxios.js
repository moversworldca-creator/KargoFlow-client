import axios from 'axios';

const platformAxios = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

platformAxios.interceptors.request.use((config) => {
  if (/(?:^|\/)tenant(?:\/|$)/i.test(config.url || '')) {
    throw new Error('Tenant requests must use the tenant API client.');
  }
  const token = localStorage.getItem('platform_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  for (const header of ['X-Tenant-Company-Id', 'X-Platform-Token', 'X-Platform-User-Id']) {
    if (typeof config.headers.delete === 'function') config.headers.delete(header);
    else delete config.headers[header];
  }
  const csrf = typeof document !== 'undefined' && document.cookie.match(/(^|;)\s*csrftoken\s*=\s*([^;]+)/);
  if (csrf) config.headers['X-CSRFToken'] = decodeURIComponent(csrf[2]);
  return config;
});

platformAxios.interceptors.response.use((response) => response, (error) => {
  const status = error?.response?.status;
  const code = error?.response?.data?.code;
  if ((status === 401 || (status === 403 && ['ACCOUNT_SUSPENDED', 'ACCESS_EXPIRED', 'SESSION_REVOKED'].includes(code)))
    && !error.config?.url?.includes('/auth/login/')) {
    localStorage.removeItem('platform_access_token');
    localStorage.removeItem('platform_user');
    window.dispatchEvent(new CustomEvent('platform:session_expired', { detail: error.response?.data }));
  }
  return Promise.reject(error);
});

export default platformAxios;
