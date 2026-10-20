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

platformAxios.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('platform_access_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // For /tenant/* endpoints, also attach the tenant session token when available
  // so the backend recognises an active tenant session for platform users.
  const isTenantRoute = config.url && /(?:^|\/)(?:api\/)?tenant(\/|$)/i.test(config.url);
  if (isTenantRoute) {
    const tenantId =
      config.headers['X-Tenant-Company-Id'] ||
      localStorage.getItem('platform_builder_tenant_id');
    if (tenantId && !config.headers['X-Tenant-Company-Id']) {
      config.headers['X-Tenant-Company-Id'] = String(tenantId);
    }

    let tenantToken = localStorage.getItem('tenant_access_token');
    const boundTenantId = localStorage.getItem('platform_tenant_token_tenant_id');
    if (token && (!tenantId || !tenantToken || boundTenantId !== String(tenantId))) {
      if (!tenantId) {
        throw new Error('Select a tenant before accessing this tenant API.');
      }
      const { tenantSessionManager } = await import('../services/tenantSessionManager');
      tenantToken = await tenantSessionManager.ensureTenantSession(tenantId);
    }
    if (tenantToken) {
      config.headers['Authorization'] = `Bearer ${tenantToken}`;
      if (token) {
        config.headers['X-Platform-Token'] = token;
      }
    } else if (token) {
      if (typeof config.headers.delete === 'function') {
        config.headers.delete('Authorization');
      } else {
        delete config.headers['Authorization'];
      }
      throw new Error('A tenant session is required to access this tenant API.');
    }
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

  const builderTenantId = localStorage.getItem('platform_builder_tenant_id');
  if (builderTenantId && !config.headers['X-Tenant-Company-Id']) {
    config.headers['X-Tenant-Company-Id'] = builderTenantId;
  }

  return config;
});

platformAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;
    const errorKey = error?.response?.data?.error;
    const detail = error?.response?.data?.detail;
    const requiresTenantSession =
      errorKey === 'platform_tenant_session_required' ||
      (typeof detail === 'string' && /active platform tenant session is required|platform users need an active tenant session/i.test(detail));

    // For /tenant/* routes, a 401 or 403 (platform_tenant_session_required) means
    // the tenant session is missing or expired — do NOT trigger a platform logout.
    const isTenantRoute = error.config?.url && /\/tenant(\/|$)/i.test(error.config.url);
    if (isTenantRoute && (status === 401 || (status === 403 && requiresTenantSession))) {
      localStorage.removeItem('tenant_access_token');

      // Attempt transparent auto-recovery once if not already retried
      if (!error.config._tenantSessionRetry) {
        error.config._tenantSessionRetry = true;
        try {
          const { tenantSessionManager } = await import('../services/tenantSessionManager');
          const targetTenantId =
            error.config.headers?.['X-Tenant-Company-Id'] ||
            tenantSessionManager.getActiveTenantId();

          if (targetTenantId) {
            const token = await tenantSessionManager.ensureTenantSession(targetTenantId);
            if (token) {
              error.config.headers['Authorization'] = `Bearer ${token}`;
              error.config.headers['X-Tenant-Company-Id'] = String(targetTenantId);
              const platformToken = localStorage.getItem('platform_access_token');
              if (platformToken) {
                error.config.headers['X-Platform-Token'] = platformToken;
              }
              return platformAxios(error.config);
            }
          }
        } catch (retryErr) {
          console.warn('Tenant session auto-recovery failed:', retryErr);
        }
      }

      return Promise.reject(error);
    }

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
