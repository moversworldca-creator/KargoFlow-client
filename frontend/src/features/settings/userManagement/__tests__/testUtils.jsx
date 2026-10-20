// Test harness: the real screens, a fresh query cache, a router, and a
// permission list that behaves like the session's (exact backend keys).
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';

export const session = { permissions: new Set(), user: { id: 1, branch_details: [] }, refreshSession: async () => null };

export const grant = (...keys) => { session.permissions = new Set(keys); };

export const renderWithProviders = (ui) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);
};

// Use from vi.mock factories:
export const canMock = () => ({
  canAll: (keys) => (Array.isArray(keys) ? keys : [keys]).every((k) => session.permissions.has(k)),
  canAny: (keys) => (Array.isArray(keys) ? keys : [keys]).some((k) => session.permissions.has(k)),
});
export const authMock = () => ({ user: session.user, refreshSession: session.refreshSession, permissionSet: session.permissions });
