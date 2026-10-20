// Test harness for the Pricing / Estimates screens: a fresh query cache, a
// router, the toast provider, and a permission list that behaves like the
// session's (exact backend keys). Use canMock / authMock from vi.mock factories.
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { ToastProvider } from '../../../shared/context/ToastContext';

export const session = { permissions: new Set() };
export const grant = (...keys) => { session.permissions = new Set(keys); };

export const canMock = () => ({
  can: (keys) => (Array.isArray(keys) ? keys : [keys]).every((k) => session.permissions.has(k)),
  canAll: (keys) => (Array.isArray(keys) ? keys : [keys]).every((k) => session.permissions.has(k)),
  canAny: (keys) => (Array.isArray(keys) ? keys : [keys]).some((k) => session.permissions.has(k)),
});

export function renderScreen(ui, { route = '/' } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}
