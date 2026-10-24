import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axios';
import { authService } from './auth';
import { getClientMode } from './tenantSession';

vi.mock('./axios', () => ({ default: { post: vi.fn(), get: vi.fn() } }));
const profile = {
  user: { id: 7, company_id: 3, email: 'user@example.com', identity_type: 'tenant', is_active: true },
  company: { id: 3, name: 'Company' }, permissions: ['leads.view'],
};
const csrfThen = (result) => (url) => (url === '/auth/csrf/' ? Promise.resolve({}) : result());
const noTokenStored = () => {
  for (const store of [sessionStorage, localStorage]) {
    for (let i = 0; i < store.length; i += 1) expect(store.getItem(store.key(i))).not.toMatch(/session/);
  }
};
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

describe('tenant authentication', () => {
  it('rejects incorrect credentials without creating a demo session', async () => {
    api.get.mockResolvedValue({});
    api.post.mockRejectedValue(new Error('invalid_credentials'));
    await expect(authService.login('wrong@example.com', 'wrong')).rejects.toThrow();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/auth/csrf/', expect.objectContaining({ skipAuth: true }));
  });

  it('gets a CSRF cookie, signs in and validates the profile without storing a token', async () => {
    api.post.mockResolvedValue({ identity_type: 'tenant', company_id: 3 });
    api.get.mockImplementation(csrfThen(() => Promise.resolve(profile)));
    const result = await authService.login(' user@example.com ', 'secret');
    expect(api.get.mock.calls[0][0]).toBe('/auth/csrf/');
    expect(api.post).toHaveBeenCalledWith('/auth/login/', {
      email: 'user@example.com', password: 'secret', identity_type: 'tenant',
    }, expect.objectContaining({ skipAuth: true }));
    expect(result.user.company.id).toBe(3);
    expect(result.user.permissions).toEqual(['leads.view']);
    expect(getClientMode()).toBe('tenant');
    expect(sessionStorage.getItem('tenant_access_token')).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('ignores a token even if an old server still returns one', async () => {
    api.post.mockResolvedValue({ access_token: 'session-leak', identity_type: 'tenant', company_id: 3 });
    api.get.mockImplementation(csrfThen(() => Promise.resolve(profile)));
    await authService.login('user@example.com', 'secret');
    noTokenStored();
  });

  it.each([
    { access: 'demo-jwt-access-token' },
    { identity_type: 'platform', company_id: 3 },
    { identity_type: 'tenant' },
  ])('rejects malformed or non-tenant login results and revokes them', async (result) => {
    api.get.mockResolvedValue({});
    api.post.mockImplementation((url) => (url === '/auth/login/' ? Promise.resolve(result) : Promise.resolve({})));
    await expect(authService.login('user@example.com', 'secret')).rejects.toThrow();
    expect(api.post).toHaveBeenLastCalledWith('/auth/logout/', {}, expect.objectContaining({ skipAuth: true }));
  });

  it('revokes a session whose profile belongs to another company', async () => {
    api.post.mockImplementation((url) => (url === '/auth/login/'
      ? Promise.resolve({ identity_type: 'tenant', company_id: 9 }) : Promise.resolve({})));
    api.get.mockImplementation(csrfThen(() => Promise.resolve(profile)));
    await expect(authService.login('user@example.com', 'secret')).rejects.toThrow('company');
    expect(api.post).toHaveBeenLastCalledWith('/auth/logout/', {}, expect.objectContaining({ skipAuth: true }));
  });

  it('fails closed when profile validation is unavailable', async () => {
    api.post.mockResolvedValue({ identity_type: 'tenant', company_id: 3 });
    api.get.mockImplementation(csrfThen(() => Promise.reject(new Error('Network error'))));
    await expect(authService.login('user@example.com', 'secret')).rejects.toThrow();
    expect(api.post).toHaveBeenLastCalledWith('/auth/logout/', {}, expect.objectContaining({ skipAuth: true }));
  });

  it('clears tenant state on logout even offline, preserving platform state', async () => {
    sessionStorage.setItem('kf_client_mode', 'support');
    localStorage.setItem('platform_access_token', 'platform-session');
    api.post.mockRejectedValue(new Error('offline'));
    await authService.logout();
    expect(api.post).toHaveBeenCalledWith('/auth/logout/', {}, expect.objectContaining({ skipAuth: true }));
    expect(sessionStorage.getItem('kf_client_mode')).toBeNull();
    expect(localStorage.getItem('platform_access_token')).toBe('platform-session');
  });

  it('exchanges a support handoff code in support mode', async () => {
    api.get.mockResolvedValue({});
    api.post.mockResolvedValue({ identity_type: 'platform_support', access_mode: 'read' });
    await authService.exchangeSupportHandoff('one-time-code');
    expect(api.get).toHaveBeenCalledWith('/auth/csrf/', expect.anything());
    expect(api.post).toHaveBeenCalledWith('/auth/support/exchange/', { code: 'one-time-code' }, expect.anything());
    expect(getClientMode()).toBe('support');
  });

  it('probes for an existing session without triggering session expiry', async () => {
    api.get.mockResolvedValue(profile);
    await authService.me(undefined, { probe: true });
    expect(api.get).toHaveBeenCalledWith('/tenant/users/me/', expect.objectContaining({ skipAuth: true }));
  });

  it('accepts a server-validated platform support profile', async () => {
    api.get.mockResolvedValue({
      user: {
        id: 7,
        company_id: 3,
        identity_type: 'platform_support',
        is_active: true,
        access_mode: 'read',
      },
      company: { id: 3, name: 'Acme Moves' },
      permissions: ['crm.dashboard.view'],
    });

    await expect(authService.me()).resolves.toMatchObject({
      identity_type: 'platform_support',
      company: { id: 3 },
      permissions: ['crm.dashboard.view'],
    });
  });

  it('still rejects an unrecognized identity type', async () => {
    api.get.mockResolvedValue({
      user: { id: 7, company_id: 3, identity_type: 'platform', is_active: true },
      company: { id: 3 },
    });

    await expect(authService.me()).rejects.toThrow('validate the tenant account');
  });
});
