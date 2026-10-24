import axios from 'axios';
import { readCsrfToken } from './csrf';

// The platform session lives in an HttpOnly cookie (kf_platform_sid) that the
// browser attaches itself; this code never sees a session token.
const platformAxios = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

const SAFE_METHODS = new Set(['get', 'head', 'options']);

platformAxios.interceptors.request.use((config) => {
  if (/(?:^|\/)tenant(?:\/|$)/i.test(config.url || '')) {
    throw new Error('Tenant requests must use the tenant API client.');
  }
  for (const header of ['Authorization', 'X-Tenant-Company-Id', 'X-Platform-Token', 'X-Platform-User-Id']) {
    if (typeof config.headers.delete === 'function') config.headers.delete(header);
    else delete config.headers[header];
  }
  // Names the platform session cookie; it is not a credential.
  config.headers['X-KF-Client'] = 'platform';
  if (!SAFE_METHODS.has(String(config.method || 'get').toLowerCase())) {
    const csrf = readCsrfToken();
    if (csrf) config.headers['X-CSRFToken'] = csrf;
  }
  return config;
});

platformAxios.interceptors.response.use((response) => response, (error) => {
  const status = error?.response?.status;
  const code = error?.response?.data?.code;
  if ((status === 401 || (status === 403 && ['ACCOUNT_SUSPENDED', 'ACCESS_EXPIRED', 'SESSION_REVOKED'].includes(code)))
    && !error.config?.url?.includes('/auth/login/') && !error.config?.skipSessionExpiry) {
    window.dispatchEvent(new CustomEvent('platform:session_expired', { detail: error.response?.data }));
  }
  return Promise.reject(error);
});

export default platformAxios;
