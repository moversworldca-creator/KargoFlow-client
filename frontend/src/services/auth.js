import api from './axios';
import {
  clearTenantSession, getSessionGeneration, nextSessionGeneration, setClientMode,
} from './tenantSession';

// The server sets the CSRF cookie that every state-changing request echoes.
const ensureCsrfCookie = (signal) => api.get('/auth/csrf/', { skipAuth: true, signal });

export const authService = {
  login: async (email, password, signal) => {
    clearTenantSession();
    setClientMode('tenant');
    nextSessionGeneration();
    await ensureCsrfCookie(signal);
    // The session token is set as an HttpOnly cookie and never reaches this code.
    const data = await api.post('/auth/login/', {
      email: email.trim(), password, identity_type: 'tenant',
    }, { skipAuth: true, signal });
    if (signal?.aborted) throw new Error('Sign-in cancelled.');
    if (data?.identity_type !== 'tenant' || !data?.company_id) {
      await authService.logout();
      throw new Error('The server did not return a valid tenant session.');
    }
    const generation = nextSessionGeneration();
    try {
      const user = await authService.me(signal);
      if (String(user.company.id) !== String(data.company_id)) {
        throw new Error('The session company does not match the signed-in account.');
      }
      return { user };
    } catch (error) {
      // Only revoke if no newer sign-in or sign-out has happened meanwhile.
      if (getSessionGeneration() === generation) await authService.logout();
      throw error;
    }
  },

  // Exchanges the one-time code the platform admin passes in the URL fragment
  // for a support-console cookie on this origin.
  exchangeSupportHandoff: async (code) => {
    clearTenantSession();
    setClientMode('support');
    nextSessionGeneration();
    await ensureCsrfCookie();
    const data = await api.post('/auth/support/exchange/', { code }, { skipAuth: true });
    nextSessionGeneration();
    return data;
  },

  // `probe` checks for an existing session on start-up: a 401 then just
  // means "signed out" and must not trigger the session-expired flow.
  me: async (signal, { probe = false } = {}) => {
    const data = await api.get('/tenant/users/me/', { signal, skipAuth: probe });
    if (!data?.user?.id || !['tenant', 'platform_support'].includes(data.user.identity_type) ||
        data.user.is_active !== true || !data?.company?.id ||
        String(data.user.company_id) !== String(data.company.id)) {
      throw new Error('Unable to validate the tenant account.');
    }
    return { ...data.user, company: data.company, permissions: data.permissions || [] };
  },

  logout: async () => {
    nextSessionGeneration();
    try {
      // The server revokes the session and deletes the cookie.
      await api.post('/auth/logout/', {}, { skipAuth: true, timeout: 10000 });
    } catch {
      // Local access is cleared below even when revocation is unavailable.
    } finally {
      clearTenantSession();
    }
  },
};
