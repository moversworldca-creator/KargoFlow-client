import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axios';
import { authService } from './auth';
import { getTenantToken } from './tenantSession';

vi.mock('./axios', () => ({ default: { post: vi.fn(), get: vi.fn() } }));
const profile = {
  user: { id: 7, company_id: 3, email: 'user@example.com', identity_type: 'tenant', is_active: true },
  company: { id: 3, name: 'Company' }, permissions: ['leads.view'],
};
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

describe('tenant authentication', () => {
  it('rejects incorrect credentials without creating a demo session', async () => {
    api.post.mockRejectedValue(new Error('invalid_credentials'));
    await expect(authService.login('wrong@example.com', 'wrong')).rejects.toThrow();
    expect(getTenantToken()).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('requires a tenant identity and validates the profile before login succeeds', async () => {
    api.post.mockResolvedValue({ access_token: 'session', identity_type: 'tenant', company_id: 3 });
    api.get.mockResolvedValue(profile);
    const result = await authService.login(' user@example.com ', 'secret');
    expect(api.post).toHaveBeenCalledWith('/auth/login/', {
      email: 'user@example.com', password: 'secret', identity_type: 'tenant',
    }, expect.objectContaining({ skipAuth: true }));
    expect(result.user.company.id).toBe(3);
    expect(result.user.permissions).toEqual(['leads.view']);
    expect(getTenantToken()).toBe('session');
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it.each([
    { access: 'demo-jwt-access-token' },
    { access_token: 'platform-session', identity_type: 'platform', company_id: 3 },
    { access_token: 'unbound-session', identity_type: 'tenant' },
  ])('rejects malformed or non-tenant login results', async (result) => {
    api.post.mockResolvedValue(result);
    await expect(authService.login('user@example.com', 'secret')).rejects.toThrow();
    expect(getTenantToken()).toBeNull();
  });

  it('revokes a session whose profile belongs to another company', async () => {
    api.post.mockResolvedValue({ access_token: 'session', identity_type: 'tenant', company_id: 9 });
    api.get.mockResolvedValue(profile);
    await expect(authService.login('user@example.com', 'secret')).rejects.toThrow('company');
    expect(getTenantToken()).toBeNull();
    expect(api.post).toHaveBeenLastCalledWith('/auth/logout/', {}, expect.objectContaining({
      headers: { Authorization: 'Bearer session' },
    }));
  });

  it('fails closed when profile validation is unavailable', async () => {
    api.post.mockResolvedValue({ access_token: 'session', identity_type: 'tenant', company_id: 3 });
    api.get.mockRejectedValue(new Error('Network error'));
    await expect(authService.login('user@example.com', 'secret')).rejects.toThrow();
    expect(getTenantToken()).toBeNull();
  });

  it('clears tenant credentials on logout even offline, preserving platform credentials', async () => {
    sessionStorage.setItem('tenant_access_token', 'session');
    localStorage.setItem('platform_access_token', 'platform-session');
    api.post.mockRejectedValue(new Error('offline'));
    await authService.logout();
    expect(getTenantToken()).toBeNull();
    expect(localStorage.getItem('platform_access_token')).toBe('platform-session');
  });
});
