import axios from 'axios';
import { getTenantToken, expireTenantSession } from './tenantSession';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json',
  },
});

// Interceptor to add the access token to the request headers
axiosInstance.interceptors.request.use(
  (config) => {
    const readBranchId = () => {
      const explicitHeader = config.headers?.['X-Branch-ID'] || config.headers?.['x-branch-id'];
      if (explicitHeader) return String(explicitHeader);

      const paramsBranch = config.params?.branch ?? config.params?.branch_id;
      if (paramsBranch !== undefined && paramsBranch !== null && paramsBranch !== '') {
        return String(paramsBranch);
      }

      const data = config.data;
      if (typeof FormData !== 'undefined' && data instanceof FormData) {
        const formBranch = data.get('branch') ?? data.get('branch_id');
        if (formBranch !== undefined && formBranch !== null && formBranch !== '') {
          return String(formBranch);
        }
      } else if (data && typeof data === 'object') {
        const bodyBranch = data.branch ?? data.branch_id;
        if (bodyBranch !== undefined && bodyBranch !== null && bodyBranch !== '') {
          return String(bodyBranch);
        }
      }

      return '';
    };

    const readCompanyId = () => {
      const explicitHeader = config.headers?.['X-Company-ID'] || config.headers?.['x-company-id'];
      if (explicitHeader) return String(explicitHeader);
      if (typeof window !== 'undefined' && window.__activeCompanyId) {
        return String(window.__activeCompanyId);
      }
      return '';
    };

    const token = config.skipAuth ? null : getTenantToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const branchId = readBranchId();
    if (branchId) {
      config.headers['X-Branch-ID'] = branchId;
    } else if (config.headers?.['X-Branch-ID']) {
      delete config.headers['X-Branch-ID'];
    }
    const companyId = config.skipAuth ? '' : readCompanyId();
    if (companyId) {
      config.headers['X-Company-ID'] = companyId;
    } else if (config.headers?.['X-Company-ID']) {
      delete config.headers['X-Company-ID'];
    }
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      // Let the browser set multipart boundaries.
      delete config.headers['Content-Type'];
    } else if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Backend sessions are opaque and revocable; expiry requires a new login.
axiosInstance.interceptors.response.use(
  (response) => response.data, // Directly return data
  async (error) => {
    const originalRequest = error.config;
    
    const accountUnavailable = error.response?.status === 403 &&
      ['tenant_user_not_found', 'tenant_employee_inactive', 'tenant_blocked'].includes(error.response?.data?.error);
    if ((error.response?.status === 401 || accountUnavailable) && !originalRequest?.skipAuth &&
        originalRequest?.headers?.Authorization === `Bearer ${getTenantToken()}`) {
      expireTenantSession();
    }
    
    if (error.response?.status === 403) {
      const data = error.response?.data || {};
      const message =
        (typeof data.detail === 'string' && data.detail) ||
        (typeof data.message === 'string' && data.message) ||
        'Access denied (403).';
      const method = String(originalRequest?.method || 'get').toLowerCase();
      const shouldNotify = originalRequest?._showForbiddenToast !== false && method !== 'get';
      if (shouldNotify && !originalRequest?._forbiddenNotified) {
        originalRequest._forbiddenNotified = true;
        window.dispatchEvent(new CustomEvent('app:forbidden', { detail: { message } }));
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
