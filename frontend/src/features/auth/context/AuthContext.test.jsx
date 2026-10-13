import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { authService } from '../../../services/auth';
import { expireTenantSession } from '../../../services/tenantSession';

vi.mock('../../../services/auth', () => ({ authService: { me: vi.fn(), login: vi.fn(), logout: vi.fn() } }));
function State() {
  const { isAuthenticated, isLoading } = useAuth();
  return <div>{isLoading ? 'loading' : isAuthenticated ? 'signed in' : 'signed out'}</div>;
}
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear(); sessionStorage.clear();
});
it('discards legacy demo credentials and cached admin permissions', async () => {
  localStorage.setItem('access_token', 'demo-jwt-access-token');
  localStorage.setItem('user', JSON.stringify({ is_superuser: true }));
  render(<AuthProvider><State /></AuthProvider>);
  expect(await screen.findByText('signed out')).toBeInTheDocument();
  expect(authService.me).not.toHaveBeenCalled();
  expect(localStorage.getItem('user')).toBeNull();
});
it('does not restore access when session validation fails', async () => {
  sessionStorage.setItem('tenant_access_token', 'expired');
  authService.me.mockRejectedValue(new Error('unauthorized'));
  render(<AuthProvider><State /></AuthProvider>);
  expect(await screen.findByText('signed out')).toBeInTheDocument();
  expect(sessionStorage.getItem('tenant_access_token')).toBeNull();
});
it('clears authenticated state when the API expires the session', async () => {
  sessionStorage.setItem('tenant_access_token', 'valid');
  authService.me.mockResolvedValue({ id: 7, company: { id: 3 }, permissions: [] });
  render(<AuthProvider><State /></AuthProvider>);
  await screen.findByText('signed in');
  act(() => expireTenantSession());
  await waitFor(() => expect(screen.getByText('signed out')).toBeInTheDocument());
  expect(window.__activeCompanyId).toBeNull();
});
