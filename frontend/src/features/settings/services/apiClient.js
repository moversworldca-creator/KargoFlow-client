import axiosInstance from '../../../services/axios';

export class ApiError extends Error {
  constructor(message, status, errors = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

export async function apiRequest(path, options = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const method = (options.method || 'GET').toLowerCase();
  const config = {
    method,
    url: normalizedPath,
    headers: { ...(options.headers || {}) },
  };

  if (options.branchId) {
    config.headers['X-Branch-ID'] = String(options.branchId);
  }

  if (options.body !== undefined) {
    if (typeof options.body === 'string') {
      try {
        config.data = JSON.parse(options.body);
      } catch {
        config.data = options.body;
      }
    } else {
      config.data = options.body;
    }
  }

  try {
    const response = await axiosInstance(config);
    return response.data;
  } catch (error) {
    const status = error.response?.status || 500;
    const errors =
      error.response?.data && typeof error.response.data === 'object' && !Array.isArray(error.response.data)
        ? error.response.data
        : {};
    const message =
      typeof errors.detail === 'string'
        ? errors.detail
        : error.message || `Request failed with status ${status}`;
    throw new ApiError(message, status, errors);
  }
}

export function percentageToDecimal(value) {
  return Number((value / 100).toFixed(4));
}
