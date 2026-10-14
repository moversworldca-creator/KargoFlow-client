import { beforeEach, expect, it, vi } from 'vitest';
import api from './axios';

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); window.__activeCompanyId = null;
});

const unauthorized = (config) => Promise.reject({ config, response: { status: 401, data: {} } });

it('does not attach a stored session to a login attempt or attempt token refresh', async () => {
  sessionStorage.setItem('tenant_access_token', 'existing');
  const adapter = vi.fn(async config => {
    expect(config.headers.Authorization).toBeUndefined();
    return unauthorized(config);
  });
  await expect(api.post('/auth/login/', {}, { skipAuth: true, adapter })).rejects.toBeDefined();
  expect(adapter).toHaveBeenCalledTimes(1);
  expect(sessionStorage.getItem('tenant_access_token')).toBe('existing');
});

it('expires the current session on 401 without deleting platform credentials', async () => {
  sessionStorage.setItem('tenant_access_token', 'expired');
  localStorage.setItem('platform_access_token', 'platform');
  const listener = vi.fn();
  window.addEventListener('tenant:session-expired', listener);
  await expect(api.get('/tenant/users/me/', { adapter: unauthorized })).rejects.toBeDefined();
  expect(sessionStorage.getItem('tenant_access_token')).toBeNull();
  expect(localStorage.getItem('platform_access_token')).toBe('platform');
  expect(listener).toHaveBeenCalledTimes(1);
  window.removeEventListener('tenant:session-expired', listener);
});

it('ignores a late 401 from an earlier session', async () => {
  sessionStorage.setItem('tenant_access_token', 'old');
  await expect(api.get('/tenant/users/me/', { adapter: async config => {
    sessionStorage.setItem('tenant_access_token', 'new');
    return unauthorized(config);
  } })).rejects.toBeDefined();
  expect(sessionStorage.getItem('tenant_access_token')).toBe('new');
});

it('expires inactive employee access but preserves sessions on ordinary permission denials', async () => {
  sessionStorage.setItem('tenant_access_token', 'session');
  const deny = code => config => Promise.reject({ config, response: { status: 403, data: { error: code } } });
  await expect(api.get('/tenant/users/', { adapter: deny('permission_denied') })).rejects.toBeDefined();
  expect(sessionStorage.getItem('tenant_access_token')).toBe('session');
  await expect(api.get('/tenant/users/', { adapter: deny('tenant_employee_inactive') })).rejects.toBeDefined();
  expect(sessionStorage.getItem('tenant_access_token')).toBeNull();
});
