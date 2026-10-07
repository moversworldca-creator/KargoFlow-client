import platformAxios from './axios';

/**
 * Authentication service module for Platform Admin.
 * Handles login, session info, persona switching, logout, and token persistence.
 */

export const login = async (emailOrCredentials, maybePassword) => {
  let credentials = {};

  if (typeof emailOrCredentials === 'object' && emailOrCredentials !== null) {
    credentials = emailOrCredentials;
  } else {
    credentials = {
      email: emailOrCredentials,
      password: maybePassword,
    };
  }

  const response = await platformAxios.post('/auth/login/', credentials);
  const data = response?.data;

  // Save access token returned by the backend
  const token = data?.access_token || data?.token || data?.access;

  if (token) {
    localStorage.setItem('platform_access_token', token);
  }

  // Backend login response contains user_id, but not a full user object
  const user =
    data?.user ||
    (data?.user_id
      ? {
          id: data.user_id,
          email: credentials.email,
          name: credentials.email ? credentials.email.split('@')[0] : 'Platform Admin',
          role: data.role || (data.identity_type === 'platform' ? 'super_admin' : 'super_admin'),
          status: 'active',
          is_active: true,
          company_scope_type: 'all',
          identity_type: data.identity_type || 'platform',
          company_id: data.company_id,
          token_type: data.token_type,
          expires_at: data.expires_at,
        }
      : null);

  if (user) {
    localStorage.setItem('platform_user', JSON.stringify(user));
  }

  return response;
};

/**
 * The backend does not provide /api/auth/me/.
 * Return the currently cached platform user instead.
 */
export const getCurrentUser = async () => {
  const raw = localStorage.getItem('platform_user');

  if (!raw) {
    return null;
  }

  try {
    const user = JSON.parse(raw);

    return {
      data: {
        user,
      },
    };
  } catch {
    localStorage.removeItem('platform_user');
    return null;
  }
};

/**
 * Persona switching.
 * Keep this available for compatibility until the backend endpoint
 * is confirmed/used by the Platform Admin UI.
 */
export const switchUser = async (userId) => {
  const payload =
    typeof userId === 'object' && userId !== null
      ? userId
      : { user_id: userId };

  const response = await platformAxios.post('/auth/switch-user/', payload);
  const data = response?.data;

  const token = data?.access_token || data?.token || data?.access;

  if (token) {
    localStorage.setItem('platform_access_token', token);
  }

  const activeUser = data?.active_user || data?.user;

  if (activeUser) {
    localStorage.setItem(
      'platform_user',
      JSON.stringify(activeUser)
    );
  }

  return response;
};

/**
 * Logout
 */
export const logout = async () => {
  try {
    await platformAxios.post('/auth/logout/');
  } catch {
    // Ignore network errors during logout
  } finally {
    localStorage.removeItem('platform_access_token');
    localStorage.removeItem('platform_user');

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('platform:session_expired')
      );
    }
  }
};

/**
 * Check whether a platform access token exists.
 */
export const isAuthenticated = () => {
  return Boolean(
    localStorage.getItem('platform_access_token')
  );
};

/**
 * Get cached platform user.
 */
export const getUser = () => {
  try {
    const raw = localStorage.getItem('platform_user');

    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Compatibility aliases
export const getPlatformAuthMe = getCurrentUser;
export const switchPlatformUser = switchUser;

export const auth = {
  login,
  getCurrentUser,
  getPlatformAuthMe,
  switchUser,
  switchPlatformUser,
  logout,
  isAuthenticated,
  getUser,
};

export default auth;