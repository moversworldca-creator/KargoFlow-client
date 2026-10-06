import axios from 'axios';

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
      const storedCompanyId = localStorage.getItem('active_company_id');
      return storedCompanyId ? String(storedCompanyId) : '';
    };

    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const branchId = readBranchId();
    if (branchId) {
      config.headers['X-Branch-ID'] = branchId;
    } else if (config.headers?.['X-Branch-ID']) {
      delete config.headers['X-Branch-ID'];
    }
    const companyId = readCompanyId();
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

// Interceptor to handle token refresh on 401 response
axiosInstance.interceptors.response.use(
  (response) => response.data, // Directly return data
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken) {
        try {
          // Call refresh token endpoint directly to avoid circular dependency
          const response = await axios.post(`${API_BASE_URL}/token/refresh/`, { 
            refresh: refreshToken 
          });
          const { access } = response.data;
          localStorage.setItem('access_token', access);
          
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return axiosInstance(originalRequest);
        } catch (refreshError) {
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        localStorage.clear();
        window.location.href = '/login';
      }
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
