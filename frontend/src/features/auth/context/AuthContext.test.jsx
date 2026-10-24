import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { authService } from '../../../services/auth';
import { expireTenantSession } from '../../../services/tenantSession';

vi.mock('../../../services/auth', () => ({
  authService: { me: vi.fn(), login: vi.fn(), logout: vi.fn(), exchangeSupportHandoff: vi.fn() },
}));
function State() {
  const { isAuthenticated, isLoading, supportConsoleContext } = useAuth();
  return (
    <div>
      <span>{isLoading ? 'loading' : isAuthenticated ? 'signed in' : 'signed out'}</span>
      {supportConsoleContext?.tenantName ? <span>{supportConsoleContext.tenantName}</span> : null}
    </div>
  );
}
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear(); sessionStorage.clear();
  window.history.replaceState(null, '', '/');
});
it('discards legacy demo credentials and cached admin permissions', async () => {
  localStorage.setItem('access_token', 'demo-jwt-access-token');
  localStorage.setItem('user', JSON.stringify({ is_superuser: true }));
  authService.me.mockRejectedValue(new Error('unauthorized'));
  render(<AuthProvider><State /></AuthProvider>);
  expect(await screen.findByText('signed out')).toBeInTheDocument();
  expect(localStorage.getItem('access_token')).toBeNull();
  expect(localStorage.getItem('user')).toBeNull();
});
it('asks the server for the cookie session on start-up without treating 401 as expiry', async () => {
  authService.me.mockResolvedValue({ id: 7, company: { id: 3 }, permissions: [] });
  render(<AuthProvider><State /></AuthProvider>);
  expect(await screen.findByText('signed in')).toBeInTheDocument();
  expect(authService.me).toHaveBeenCalledWith(undefined, { probe: true });
  expect(window.__activeCompanyId).toBe(3);
});
it('does not restore access when session validation fails', async () => {
  sessionStorage.setItem('tenant_access_token', 'legacy');
  authService.me.mockRejectedValue(new Error('unauthorized'));
  render(<AuthProvider><State /></AuthProvider>);
  expect(await screen.findByText('signed out')).toBeInTheDocument();
  expect(sessionStorage.getItem('tenant_access_token')).toBeNull();
});
it('clears authenticated state when the API expires the session', async () => {
  authService.me.mockResolvedValue({ id: 7, company: { id: 3 }, permissions: [] });
  render(<AuthProvider><State /></AuthProvider>);
  await screen.findByText('signed in');
  act(() => expireTenantSession());
  await waitFor(() => expect(screen.getByText('signed out')).toBeInTheDocument());
  expect(window.__activeCompanyId).toBeNull();
});
it('exchanges the one-time support code once and removes it from the address bar', async () => {
  window.history.replaceState(null, '', '/dashboard#support_code=one-time&tenant_id=3&tenant_name=Acme%20Moves&access_mode=support_write&expires_at=2026-10-14T12%3A00%3A00Z');
  authService.exchangeSupportHandoff.mockResolvedValue({ access_mode: 'support_write' });
  authService.me.mockResolvedValue({ id: 7, company: { id: 3 }, permissions: [] });
  render(<React.StrictMode><AuthProvider><State /></AuthProvider></React.StrictMode>);
  expect(await screen.findByText('signed in')).toBeInTheDocument();
  expect(screen.getByText('Acme Moves')).toBeInTheDocument();
  expect(authService.exchangeSupportHandoff).toHaveBeenCalledTimes(1);
  expect(authService.exchangeSupportHandoff).toHaveBeenCalledWith('one-time');
  expect(window.location.hash).toBe('');
  expect(sessionStorage.getItem('tenant_access_token')).toBeNull();
});
it('ignores a legacy support_token in the URL', async () => {
  window.history.replaceState(null, '', '/dashboard#support_token=leaked.jwt&tenant_name=Acme');
  authService.me.mockRejectedValue(new Error('unauthorized'));
  render(<AuthProvider><State /></AuthProvider>);
  expect(await screen.findByText('signed out')).toBeInTheDocument();
  expect(authService.exchangeSupportHandoff).not.toHaveBeenCalled();
  expect(window.location.hash).toBe('');
  expect(sessionStorage.getItem('tenant_access_token')).toBeNull();
});
