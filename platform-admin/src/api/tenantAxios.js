import axios from 'axios';

const tenantAxios = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

tenantAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('tenant_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

tenantAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('tenant_access_token');
      localStorage.removeItem('tenant_user');
      window.dispatchEvent(new CustomEvent('tenant:session_expired'));
    }
    return Promise.reject(error);
  },
);

export default tenantAxios;
