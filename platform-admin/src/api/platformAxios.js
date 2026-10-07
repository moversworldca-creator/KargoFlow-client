import axios from 'axios';

function getCsrfToken() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(^|;)\s*csrftoken\s*=\s*([^;]+)/);
  return match ? decodeURIComponent(match[2]) : null;
}

const platformAxios = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

platformAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('platform_access_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // Fallback for simulation / direct persona switching
  try {
    const storedUser = localStorage.getItem('platform_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user?.id) {
        config.headers['X-Platform-User-Id'] = user.id;
      }
    }
  } catch {
    // Ignore JSON parse errors
  }

  const csrfToken = getCsrfToken();
  if (csrfToken && !config.headers['X-CSRFToken']) {
    config.headers['X-CSRFToken'] = csrfToken;
  }

  return config;
});

platformAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;

    // Handle token invalidation / revocation / suspension
    if (
      status === 401 ||
      (status === 403 && (code === 'ACCOUNT_SUSPENDED' || code === 'ACCESS_EXPIRED' || code === 'SESSION_REVOKED'))
    ) {
      // Don't auto-redirect if already attempting to login
      const isLoginRequest = error.config?.url?.includes('/auth/login/');
      if (!isLoginRequest) {
        localStorage.removeItem('platform_access_token');
        localStorage.removeItem('platform_user');
        window.dispatchEvent(new CustomEvent('platform:session_expired', { detail: error.response?.data }));
      }
    }

    return Promise.reject(error);
  }
);

export default platformAxios;

