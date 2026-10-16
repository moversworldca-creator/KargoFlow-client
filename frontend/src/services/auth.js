import api from './axios';
import { clearTenantSession, getTenantToken } from './tenantSession';

export const authService = {
  login: async (email, password, signal) => {
    clearTenantSession();
    const data = await api.post('/auth/login/', {
      email: email.trim(), password, identity_type: 'tenant',
    }, { skipAuth: true, signal });
    if (signal?.aborted) throw new Error('Sign-in cancelled.');
    if (data?.identity_type !== 'tenant' || !data?.access_token || !data?.company_id) {
      throw new Error('The server did not return a valid tenant session.');
    }
    sessionStorage.setItem('tenant_access_token', data.access_token);
    try {
      const user = await authService.me(signal);
      if (String(user.company.id) !== String(data.company_id)) {
        throw new Error('The session company does not match the signed-in account.');
      }
      return { user };
    } catch (error) {
      if (getTenantToken() === data.access_token) await authService.logout();
      throw error;
    }
  },

  me: async (signal) => {
    const data = await api.get('/tenant/users/me/', { signal });
    if (!data?.user?.id || !['tenant', 'platform_support'].includes(data.user.identity_type) ||
        data.user.is_active !== true || !data?.company?.id ||
        String(data.user.company_id) !== String(data.company.id)) {
      throw new Error('Unable to validate the tenant account.');
    }
    return { ...data.user, company: data.company, permissions: data.permissions || [] };
  },

  logout: async () => {
    const token = getTenantToken();
    clearTenantSession();
    if (token) {
      try {
        await api.post('/auth/logout/', {}, {
          skipAuth: true, headers: { Authorization: `Bearer ${token}` }, timeout: 10000,
        });
      } catch {
        // Local access is already cleared even when revocation is unavailable.
      }
    }
  },
};
