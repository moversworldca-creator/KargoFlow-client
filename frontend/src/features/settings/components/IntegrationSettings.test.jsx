import React from 'react';
import { fireEvent, render, screen, waitFor, within, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import IntegrationSettings from './IntegrationSettings';
import * as api from '../../../services/api';

const context = vi.hoisted(() => ({ user: { is_superuser: true }, canAll: vi.fn(() => true), showToast: vi.fn() }));
vi.mock('../../auth/context/AuthContext', () => ({ useAuth: () => ({ user: context.user, isLoading: false }) }));
vi.mock('../../../shared/auth/useCan', () => ({ default: () => ({ canAll: context.canAll }) }));
vi.mock('../../../shared/context/ToastContext', () => ({ useToast: () => ({ showToast: context.showToast }) }));
vi.mock('../../../services/api', async (importOriginal) => ({
  ...await importOriginal(),
  getBranches: vi.fn(), getSendGridConfig: vi.fn(), getResendConfig: vi.fn(), getSMTPConfig: vi.fn(),
  getTelnyxSMSConfig: vi.fn(), getPaymentGateways: vi.fn(),
  testSendGridEmail: vi.fn(), testResendEmail: vi.fn(), testSMTPEmail: vi.fn(),
}));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  context.canAll.mockReturnValue(true);
  api.getBranches.mockResolvedValue([]);
  api.getSendGridConfig.mockResolvedValue([{ id: 11, sender_email: 'sender@example.com', api_key: '****' }]);
  api.getResendConfig.mockResolvedValue([{ id: 12, sender_email: 'sender@example.com', api_key: '****' }]);
  api.getSMTPConfig.mockResolvedValue([{ id: 13, sender_email: 'sender@example.com', host: 'smtp.example.com' }]);
  api.getTelnyxSMSConfig.mockRejectedValue({ response: { status: 404 } });
  api.getPaymentGateways.mockRejectedValue({ response: { status: 404 } });
});
async function section(title) {
  render(<IntegrationSettings view="delivery" />);
  const heading = await screen.findByRole('heading', { name: title });
  return within(heading.closest('.relative'));
}
it.each([
  ['SendGrid', 'testSendGridEmail', 11], ['Resend', 'testResendEmail', 12], ['SMTP Mail', 'testSMTPEmail', 13],
])('sends from saved %s settings to the trimmed recipient', async (title, method, id) => {
  api[method].mockResolvedValue({ message: 'Test email accepted for sending.' });
  const panel = await section(title);
  fireEvent.change(panel.getByRole('textbox', { name: 'Test Recipient' }), { target: { value: ' test@example.com ' } });
  fireEvent.click(panel.getByRole('button', { name: 'Send Test Email' }));
  await waitFor(() => expect(api[method]).toHaveBeenCalledWith(id, 'test@example.com'));
  expect(await panel.findByRole('status')).toHaveTextContent('Test email accepted for sending.');
});
it('rejects invalid recipients without sending', async () => {
  const panel = await section('SendGrid');
  for (const value of ['', 'invalid']) {
    fireEvent.change(panel.getByRole('textbox', { name: 'Test Recipient' }), { target: { value } });
    fireEvent.click(panel.getByRole('button', { name: 'Send Test Email' }));
    expect(await panel.findByRole('status')).toHaveTextContent('Enter a valid test recipient');
  }
  expect(api.testSendGridEmail).not.toHaveBeenCalled();
});
it('requires saving a new configuration', async () => {
  api.getSendGridConfig.mockResolvedValue([]);
  const panel = await section('SendGrid');
  fireEvent.click(panel.getByRole('button', { name: 'Send Test Email' }));
  expect(await panel.findByRole('status')).toHaveTextContent('Save this configuration');
  expect(api.testSendGridEmail).not.toHaveBeenCalled();
});
it('prevents duplicate sends and displays provider failure', async () => {
  let rejectSend;
  api.testResendEmail.mockImplementation(() => new Promise((resolve, reject) => { rejectSend = reject; }));
  const panel = await section('Resend');
  fireEvent.change(panel.getByRole('textbox', { name: 'Test Recipient' }), { target: { value: 'test@example.com' } });
  fireEvent.click(panel.getByRole('button', { name: 'Send Test Email' }));
  expect(panel.getByRole('button', { name: 'Sending…' })).toBeDisabled();
  expect(panel.getByRole('button', { name: 'Save' })).toBeDisabled();
  rejectSend({ response: { data: { detail: 'The provider rejected the configured credentials.' } } });
  expect(await panel.findByRole('status')).toHaveTextContent('The provider rejected the configured credentials.');
  expect(panel.getByRole('button', { name: 'Send Test Email' })).toBeEnabled();
});
