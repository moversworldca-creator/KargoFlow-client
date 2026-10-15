import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CommunicationSetup from './CommunicationSetup';
import * as api from '../../../services/api';
vi.mock('../../../shared/context/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../../services/api', async (original) => ({
  ...await original(), getCommunicationEmailDomains: vi.fn(), getSmsNumbers: vi.fn(), getSmsNumberOrders: vi.fn(),
  getCommunicationMailboxes: vi.fn(), getBranchCommunicationSettings: vi.fn(), testBranchEmailIdentity: vi.fn(), searchSmsNumbers: vi.fn(),
}));
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  for (const name of ['getCommunicationEmailDomains', 'getSmsNumbers', 'getSmsNumberOrders', 'getCommunicationMailboxes']) api[name].mockResolvedValue([]);
  api.getBranchCommunicationSettings.mockResolvedValue({ default_email_identity_id: 8, email_identities: [
    { id: 8, sender_name: 'Sales', sender_email: 'sales@example.com', state: 'active' },
  ] });
});
it('sends a test from Branch Senders using the saved sender', async () => {
  api.testBranchEmailIdentity.mockResolvedValue({ message: 'Test accepted.' });
  render(<CommunicationSetup branchId={3} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Branch Senders' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Branch Senders' }));
  const button = await screen.findByRole('button', { name: 'Send Test Email' });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Test recipient'), { target: { value: ' test@example.com ' } });
  fireEvent.click(button);
  await waitFor(() => expect(api.testBranchEmailIdentity).toHaveBeenCalledWith(3, 8, 'test@example.com'));
  expect(await screen.findByRole('status')).toHaveTextContent('Test accepted.');
});
it('rejects an invalid recipient without sending', async () => {
  render(<CommunicationSetup branchId={3} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Branch Senders' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Branch Senders' }));
  const button = await screen.findByRole('button', { name: 'Send Test Email' });
  fireEvent.click(button);
  expect(await screen.findByRole('status')).toHaveTextContent('Enter a valid test recipient');
  expect(api.testBranchEmailIdentity).not.toHaveBeenCalled();
});
it('disables testing without a branch', async () => {
  render(<CommunicationSetup />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Branch Senders' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Branch Senders' }));
  expect(await screen.findByRole('button', { name: 'Send Test Email' })).toBeDisabled();
});
it('shows a provider error and re-enables sending', async () => {
  api.testBranchEmailIdentity.mockRejectedValue({ response: { data: { detail: 'Verify the sending domain first.' } } });
  render(<CommunicationSetup branchId={3} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Branch Senders' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Branch Senders' }));
  const button = await screen.findByRole('button', { name: 'Send Test Email' });
  fireEvent.change(screen.getByLabelText('Test recipient'), { target: { value: 'test@example.com' } });
  fireEvent.click(button);
  expect(await screen.findByRole('status')).toHaveTextContent('Verify the sending domain first.');
  expect(button).toBeEnabled();
});

it('shows the test email option only on Branch Senders', async () => {
  render(<CommunicationSetup branchId={3} />);
  await screen.findByRole('button', { name: 'Branch Senders' });
  expect(screen.queryByRole('button', { name: 'Send Test Email' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Email Domain' }));
  expect(screen.queryByRole('button', { name: 'Send Test Email' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Branch Senders' }));
  expect(screen.getByRole('button', { name: 'Send Test Email' })).toBeInTheDocument();
});

const multipleSenders = {
  default_email_identity_id: '9',
  email_identities: [
    { id: 8, sender_name: 'Sales', sender_email: 'sales@example.com', state: 'active' },
    { id: 9, sender_name: 'Dispatch', sender_email: 'dispatch@example.com', state: 'active', is_default_automation_sender: true },
  ],
};

it('uses the branch default email in both the dropdown and sender form', async () => {
  api.getBranchCommunicationSettings.mockResolvedValue(multipleSenders);
  render(<CommunicationSetup branchId={3} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Branch Senders' }));
  expect(screen.getByLabelText('Test sender')).toHaveValue('9');
  expect(screen.getByLabelText('Sender email')).toHaveValue('dispatch@example.com');
});

it('keeps the chosen configured email synchronized with the dropdown and send request', async () => {
  api.getBranchCommunicationSettings.mockResolvedValue(multipleSenders);
  api.testBranchEmailIdentity.mockResolvedValue({ message: 'Test accepted.' });
  render(<CommunicationSetup branchId={3} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Branch Senders' }));
  fireEvent.click(screen.getByRole('button', { name: /Sales sales@example.com/ }));
  expect(screen.getByLabelText('Test sender')).toHaveValue('8');
  expect(screen.getByLabelText('Sender email')).toHaveValue('sales@example.com');
  fireEvent.change(screen.getByLabelText('Test sender'), { target: { value: '9' } });
  expect(screen.getByLabelText('Sender email')).toHaveValue('dispatch@example.com');
  fireEvent.change(screen.getByLabelText('Test recipient'), { target: { value: 'test@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send Test Email' }));
  await waitFor(() => expect(api.testBranchEmailIdentity).toHaveBeenCalledWith(3, 9, 'test@example.com'));
});

it('discards an older branch response instead of showing the wrong emails', async () => {
  let resolveOldBranch;
  api.getBranchCommunicationSettings.mockImplementation((id) => id === 3
    ? new Promise((resolve) => { resolveOldBranch = resolve; })
    : Promise.resolve({ branch_id: 4, email_identities: [{ id: 10, sender_name: 'West', sender_email: 'west@example.com', state: 'active' }] }));
  const { rerender } = render(<CommunicationSetup branchId={3} />);
  await waitFor(() => expect(api.getBranchCommunicationSettings).toHaveBeenCalledWith(3));
  rerender(<CommunicationSetup branchId={4} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Branch Senders' }));
  expect(screen.getByLabelText('Test sender')).toHaveValue('10');
  resolveOldBranch(multipleSenders);
  await waitFor(() => expect(screen.getByLabelText('Test sender')).toHaveValue('10'));
  expect(screen.queryByRole('option', { name: /sales@example.com/ })).not.toBeInTheDocument();
});

it('searches Canadian SMS numbers with the country_code API field', async () => {
  api.searchSmsNumbers.mockResolvedValue([]);
  render(<CommunicationSetup branchId={3} />);
  fireEvent.click(await screen.findByRole('button', { name: 'SMS Numbers' }));
  fireEvent.change(screen.getByLabelText('Country code (CA / US)'), { target: { value: 'ca' } });
  fireEvent.change(screen.getByLabelText('Area code'), { target: { value: '437' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  await waitFor(() => expect(api.searchSmsNumbers).toHaveBeenCalledWith({
    country_code: 'CA', area_code: '437', number_type: 'local', limit: 10,
  }));
});

it('does not send a calling code as the SMS country code', async () => {
  render(<CommunicationSetup branchId={3} />);
  fireEvent.click(await screen.findByRole('button', { name: 'SMS Numbers' }));
  fireEvent.change(screen.getByLabelText('Country code (CA / US)'), { target: { value: '+1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  expect(api.searchSmsNumbers).not.toHaveBeenCalled();
});
