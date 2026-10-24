import axios from 'axios';
import { readCsrfToken } from './csrf';

// The tenant session lives in an HttpOnly cookie (kf_tenant_sid) that the
// browser attaches itself; this code never sees a session token.
const tenantAxios = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

const SAFE_METHODS = new Set(['get', 'head', 'options']);

tenantAxios.interceptors.request.use((config) => {
  // Names the tenant session cookie; it is not a credential.
  config.headers['X-KF-Client'] = 'tenant';
  if (!SAFE_METHODS.has(String(config.method || 'get').toLowerCase())) {
    const csrf = readCsrfToken();
    if (csrf) config.headers['X-CSRFToken'] = csrf;
  }
  return config;
});

tenantAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && !error.config?.skipSessionExpiry) {
      window.dispatchEvent(new CustomEvent('tenant:session_expired'));
    }
    return Promise.reject(error);
  },
);

export default tenantAxios;
