import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { PlatformAuthProvider, usePlatformAuth } from './PlatformAuthContext';
import { TenantAuthProvider, useTenantAuth } from './TenantAuthContext';
import platformApi from '../api/platformApi';
import tenantApi from '../api/tenantApi';

vi.mock('../api/platformApi', () => ({
  default: { ensureCsrf: vi.fn(), login: vi.fn(), logout: vi.fn(), getPlatformAuthMe: vi.fn(), switchPlatformUser: vi.fn() },
}));
vi.mock('../api/tenantApi', () => ({
  default: { ensureCsrf: vi.fn(), login: vi.fn(), logout: vi.fn(), me: vi.fn(), acceptInvitation: vi.fn() },
}));

function PlatformState() {
  const { isLoading, isAuthenticated, login, logout } = usePlatformAuth();
  return (
    <div>
      <span>{isLoading ? 'loading' : isAuthenticated ? 'signed in' : 'signed out'}</span>
      <button onClick={() => login('staff@example.test', 'secret')}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}
function TenantState() {
  const { isLoading, isAuthenticated } = useTenantAuth();
  return <span>{isLoading ? 'tenant loading' : isAuthenticated ? 'tenant signed in' : 'tenant signed out'}</span>;
}
const renderAt = (path, child) => render(
  <MemoryRouter initialEntries={[path]}><PlatformAuthProvider><TenantAuthProvider>{child}</TenantAuthProvider></PlatformAuthProvider></MemoryRouter>,
);
const unauthorized = () => Promise.reject({ response: { status: 401 } });

beforeEach(() => {
  vi.resetAllMocks();
  platformApi.logout.mockResolvedValue({});
  platformApi.ensureCsrf.mockResolvedValue({});
  tenantApi.ensureCsrf.mockResolvedValue({});
});

it('restores the platform session from the server and stores nothing in the browser', async () => {
  localStorage.setItem('platform_access_token', 'legacy');
  localStorage.setItem('platform_user', '{"id":1}');
  platformApi.getPlatformAuthMe.mockResolvedValue({ data: { user: { id: 1 }, permissions: [] } });
  renderAt('/', <PlatformState />);
  expect(await screen.findByText('signed in')).toBeInTheDocument();
  expect(platformApi.getPlatformAuthMe).toHaveBeenCalledWith({ skipSessionExpiry: true });
  expect(localStorage.getItem('platform_access_token')).toBeNull();
  expect(localStorage.getItem('platform_user')).toBeNull();
});

it('treats a 401 on start-up as signed out', async () => {
  platformApi.getPlatformAuthMe.mockImplementation(unauthorized);
  renderAt('/', <PlatformState />);
  expect(await screen.findByText('signed out')).toBeInTheDocument();
});

it('logs in with a CSRF cookie and no token, and logout revokes on the server', async () => {
  platformApi.getPlatformAuthMe.mockImplementation(unauthorized);
  platformApi.login.mockResolvedValue({ status: 200, data: { user: { id: 1 }, permissions: ['dashboard'] } });
  renderAt('/', <PlatformState />);
  await screen.findByText('signed out');
  await act(async () => screen.getByText('login').click());
  expect(platformApi.ensureCsrf).toHaveBeenCalled();
  expect(await screen.findByText('signed in')).toBeInTheDocument();
  expect(Object.keys(localStorage)).toHaveLength(0);
  await act(async () => screen.getByText('logout').click());
  expect(platformApi.logout).toHaveBeenCalled();
  expect(await screen.findByText('signed out')).toBeInTheDocument();
});

it('does not probe the tenant session on platform pages', async () => {
  platformApi.getPlatformAuthMe.mockImplementation(unauthorized);
  renderAt('/tenants', <TenantState />);
  expect(await screen.findByText('tenant signed out')).toBeInTheDocument();
  expect(tenantApi.me).not.toHaveBeenCalled();
});

it('restores the company-admin session on /tenant routes quietly', async () => {
  platformApi.getPlatformAuthMe.mockImplementation(unauthorized);
  tenantApi.me.mockResolvedValue({ user: { id: 5, identity_type: 'tenant' }, permissions: [] });
  renderAt('/tenant', <TenantState />);
  expect(screen.getByText('tenant loading')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText('tenant signed in')).toBeInTheDocument());
  expect(tenantApi.me).toHaveBeenCalledWith({ skipSessionExpiry: true });
});
