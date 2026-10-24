import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import api from './axios';
import { nextSessionGeneration, setClientMode } from './tenantSession';

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); window.__activeCompanyId = null;
  document.cookie = 'csrftoken=csrf-value; path=/';
});
afterEach(() => {
  document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
});

const unauthorized = (config) => Promise.reject({ config, response: { status: 401, data: {} } });
const ok = (config) => Promise.resolve({ config, status: 200, statusText: 'OK', headers: {}, data: {} });

it('never sends a bearer token; the browser sends the HttpOnly session cookie', async () => {
  sessionStorage.setItem('tenant_access_token', 'legacy-token');
  const adapter = vi.fn(async config => {
    expect(config.headers.Authorization).toBeUndefined();
    expect(config.withCredentials).toBe(true);
    expect(config.headers['X-KF-Client']).toBe('tenant');
    return ok(config);
  });
  await api.get('/tenant/users/', { adapter });
  expect(adapter).toHaveBeenCalledTimes(1);
});

it('names the support-console cookie in a support tab', async () => {
  setClientMode('support');
  const adapter = vi.fn(async config => {
    expect(config.headers['X-KF-Client']).toBe('support');
    return ok(config);
  });
  await api.get('/tenant/users/', { adapter });
  expect(adapter).toHaveBeenCalledTimes(1);
});

it('sends the CSRF token on writes only', async () => {
  const seen = [];
  const adapter = async config => { seen.push([config.method, config.headers['X-CSRFToken']]); return ok(config); };
  await api.get('/tenant/users/', { adapter });
  await api.post('/tenant/users/', {}, { adapter });
  await api.delete('/tenant/users/1/', { adapter });
  expect(seen).toEqual([['get', undefined], ['post', 'csrf-value'], ['delete', 'csrf-value']]);
});

it('does not expire the session when a login attempt fails', async () => {
  const listener = vi.fn();
  window.addEventListener('tenant:session-expired', listener);
  await expect(api.post('/auth/login/', {}, { skipAuth: true, adapter: unauthorized })).rejects.toBeDefined();
  expect(listener).not.toHaveBeenCalled();
  window.removeEventListener('tenant:session-expired', listener);
});

it('expires the current session on 401 without deleting platform state', async () => {
  localStorage.setItem('platform_access_token', 'platform');
  setClientMode('support');
  const listener = vi.fn();
  window.addEventListener('tenant:session-expired', listener);
  await expect(api.get('/tenant/users/me/', { adapter: unauthorized })).rejects.toBeDefined();
  expect(sessionStorage.getItem('kf_client_mode')).toBeNull();
  expect(localStorage.getItem('platform_access_token')).toBe('platform');
  expect(listener).toHaveBeenCalledTimes(1);
  window.removeEventListener('tenant:session-expired', listener);
});

it('ignores a late 401 from an earlier session', async () => {
  const listener = vi.fn();
  window.addEventListener('tenant:session-expired', listener);
  await expect(api.get('/tenant/users/me/', { adapter: async config => {
    nextSessionGeneration();
    return unauthorized(config);
  } })).rejects.toBeDefined();
  expect(listener).not.toHaveBeenCalled();
  window.removeEventListener('tenant:session-expired', listener);
});

it('expires inactive employee access but preserves sessions on ordinary permission denials', async () => {
  const listener = vi.fn();
  window.addEventListener('tenant:session-expired', listener);
  const deny = code => config => Promise.reject({ config, response: { status: 403, data: { error: code } } });
  await expect(api.get('/tenant/users/', { adapter: deny('permission_denied') })).rejects.toBeDefined();
  expect(listener).not.toHaveBeenCalled();
  await expect(api.get('/tenant/users/', { adapter: deny('tenant_employee_inactive') })).rejects.toBeDefined();
  expect(listener).toHaveBeenCalledTimes(1);
  window.removeEventListener('tenant:session-expired', listener);
});
