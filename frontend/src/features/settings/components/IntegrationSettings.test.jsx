import React from 'react';
import { fireEvent, render, screen, waitFor, within, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import IntegrationSettings from './IntegrationSettings';
import * as api from '../../../services/api';

const context = vi.hoisted(() => ({ user: { is_superuser: true }, canAll: vi.fn(() => true), showToast: vi.fn() }));
vi.mock('../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: context.user, isLoading: false }) }));
vi.mock('../../../shared/auth/useCan', () => ({ default: () => ({ canAll: context.canAll }) }));
vi.mock('../../../shared/context/ToastContext', () => ({ useToast: () => ({ showToast: context.showToast }) }));
vi.mock('../../../services/api', () => ({
  getAuthorizeNetSettings: vi.fn(), saveAuthorizeNetSettings: vi.fn(), verifyAuthorizeNetSettings: vi.fn(),
}));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  context.canAll.mockReturnValue(true);
  api.getAuthorizeNetSettings.mockResolvedValue({});
});

it('saves Authorize.Net configuration, preserves blank secrets, and exposes no transaction controls', async () => {
  api.getAuthorizeNetSettings.mockResolvedValue({ api_login_id: 'merchant', environment: 'sandbox', has_transaction_key: true });
  api.saveAuthorizeNetSettings.mockResolvedValue({ api_login_id: 'merchant', environment: 'production', has_transaction_key: true });
  render(<IntegrationSettings view="gateways" />);
  const heading = await screen.findByRole('heading', { name: 'Authorize.net' });
  const panel = within(heading.closest('.relative'));
  fireEvent.change(panel.getByRole('combobox'), { target: { value: 'production' } });
  fireEvent.click(panel.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(api.saveAuthorizeNetSettings).toHaveBeenCalledWith({ api_login_id: 'merchant', environment: 'production', is_active: false, transaction_key: '', signature_key: '' }));
  expect(screen.queryByText('Payment Activity')).not.toBeInTheDocument();
  expect(screen.queryByText('Create Payment Request')).not.toBeInTheDocument();
  expect(screen.queryByText('Create Refund')).not.toBeInTheDocument();
});

it('verifies saved Authorize.Net credentials and enforces management permission', async () => {
  api.getAuthorizeNetSettings.mockResolvedValue({ api_login_id: 'merchant', has_transaction_key: true });
  api.verifyAuthorizeNetSettings.mockResolvedValue({ success: true, message: 'Connection verified.' });
  render(<IntegrationSettings view="gateways" />);
  const heading = await screen.findByRole('heading', { name: 'Authorize.net' });
  const panel = within(heading.closest('.relative'));
  fireEvent.click(panel.getByRole('button', { name: 'Verify' }));
  expect(await panel.findByRole('status')).toHaveTextContent('Connection verified.');
  expect(api.verifyAuthorizeNetSettings).toHaveBeenCalledWith();
  context.canAll.mockReturnValue(false);
  fireEvent.click(panel.getByRole('button', { name: 'Verify' }));
  expect(api.verifyAuthorizeNetSettings).toHaveBeenCalledTimes(1);
});


it('shows only the gateway configuration without obsolete categories or providers', async () => {
  render(<IntegrationSettings />);
  expect(await screen.findByRole('heading', { name: 'Authorize.net' })).toBeInTheDocument();
  expect(screen.getAllByRole('combobox')).toHaveLength(1);
  for (const text of ['Hub Overview', 'SendGrid', 'Resend', 'SMTP Mail', 'SMS Messaging', 'Upcoming', 'Calendar Sync', 'AI Assistant', 'Accounting', 'Advanced Provider Fields']) {
    expect(screen.queryByText(text)).not.toBeInTheDocument();
  }
  expect(api.getAuthorizeNetSettings).toHaveBeenCalledTimes(1);
});

it('prevents saving when configuration could not be loaded', async () => {
  api.getAuthorizeNetSettings.mockRejectedValue(new Error('Unavailable'));
  render(<IntegrationSettings />);
  await screen.findByRole('heading', { name: 'Authorize.net' });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Refresh to load saved settings');
  expect(api.saveAuthorizeNetSettings).not.toHaveBeenCalled();
});
