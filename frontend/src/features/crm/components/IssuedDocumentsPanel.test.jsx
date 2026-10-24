import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import IssuedDocumentsPanel from './IssuedDocumentsPanel';
import * as api from '../../../services/api';
vi.mock('../../../services/api', () => ({ getIssuedPortals: vi.fn(), getPortalEstimates: vi.fn(), issueBuilderDocuments: vi.fn(), revokeIssuedPortal: vi.fn(), emailIssuedPortal: vi.fn(), downloadIssuedPortal: vi.fn() }));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  api.getIssuedPortals.mockResolvedValue([{ id: 1, kind: 'estimate', record_id: 2, signer_role: 'customer', expires_at: '2099-01-01', url: 'https://portal.example/link' }]);
  api.getPortalEstimates.mockResolvedValue([{ id: 2, estimate_number: 'EST-002', state: 'sent' }]);
});
it('publishes the selected estimate through the existing builder workflow', async () => {
  render(<IssuedDocumentsPanel opportunityId={9} canEdit />);
  await screen.findByRole('link', { name: 'Open portal' });
  fireEvent.change(screen.getByRole('combobox', { name: 'Estimate' }), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Publish documents' }));
  await waitFor(() => expect(api.issueBuilderDocuments).toHaveBeenCalledWith('estimate_send', { source: { type: 'estimate', id: 2 }, send: true }, expect.any(String)));
});
it('allows permitted staff to revoke only the chosen opportunity link', async () => {
  render(<IssuedDocumentsPanel opportunityId={9} canEdit />);
  fireEvent.click(await screen.findByRole('button', { name: 'Revoke link' }));
  await waitFor(() => expect(api.revokeIssuedPortal).toHaveBeenCalledWith(1, 9));
});
it('keeps edit actions hidden for read-only staff', async () => {
  render(<IssuedDocumentsPanel opportunityId={9} />);
  await screen.findByRole('link', { name: 'Open portal' });
  expect(screen.queryByRole('button', { name: 'Publish documents' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Revoke link' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Email link' })).not.toBeInTheDocument();
});

it('reuses the issue key when retrying an uncertain request', async () => {
  api.issueBuilderDocuments.mockRejectedValueOnce(new Error('Network interrupted')).mockResolvedValueOnce({});
  render(<IssuedDocumentsPanel opportunityId={9} canEdit />);
  await screen.findByRole('link', { name: 'Open portal' });
  fireEvent.change(screen.getByRole('combobox', { name: 'Estimate' }), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Publish documents' }));
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Publish documents' }));
  await waitFor(() => expect(api.issueBuilderDocuments).toHaveBeenCalledTimes(2));
  expect(api.issueBuilderDocuments.mock.calls[0][2]).toEqual(api.issueBuilderDocuments.mock.calls[1][2]);
});

it('keeps superseded links closed while retaining the archived PDF action', async () => {
  api.getIssuedPortals.mockResolvedValue([{ id: 1, kind: 'estimate', record_id: 2, signer_role: 'customer', is_current: false, expires_at: '2099-01-01', url: 'https://portal.example/old' }]);
  render(<IssuedDocumentsPanel opportunityId={9} canEdit />);
  expect(await screen.findByText('Superseded')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Open portal' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument();
});
