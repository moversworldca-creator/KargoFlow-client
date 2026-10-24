import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { IssuedEstimatePortal, IssuedDocumentPortal } from './IssuedCustomerPortal';
import * as api from '../../../services/api';

vi.mock('../../../services/api', () => ({
  getPublicEstimatePortal: vi.fn(), getPublicContractPortal: vi.fn(), approvePublicEstimatePortal: vi.fn(),
  signPublicContractPortal: vi.fn(), downloadPublicPortal: vi.fn(),
  publicPortalImageUrl: (kind, token, id) => `/api/public/${kind}/image/?token=${token}&asset_id=${id}`,
}));
vi.mock('../../../shared/ui/SignaturePadModal', () => ({ default: ({ open, onSave }) => open ? <button onClick={() => onSave('data:image/png;base64,signature')}>Save drawn signature</button> : null }));
const initial = { title: 'Moving Estimate', status: 'sent', submitted: false, snapshot_id: 12, content_html: '<h1>Issued terms</h1>', signer_role: 'customer', consent_text: 'I agree to sign electronically.', required_fields: [{ field_key: 'signature', field_type: 'signature', is_required: true, label: 'Signature' }] };
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  api.getPublicEstimatePortal.mockResolvedValue(initial);
  api.getPublicContractPortal.mockResolvedValue(initial);
});
function estimate() {
  return render(<MemoryRouter initialEntries={['/portal/estimate?token=issued-token']}><IssuedEstimatePortal /></MemoryRouter>);
}
it('renders the frozen document in a sandbox and submits only the displayed snapshot fields', async () => {
  estimate();
  await screen.findByRole('heading', { name: 'Moving Estimate' });
  const frame = screen.getByTitle('Issued document');
  expect(frame).toHaveAttribute('sandbox', '');
  expect(frame.getAttribute('srcdoc')).toContain("default-src 'none'");
  fireEvent.change(screen.getByRole('textbox', { name: 'Your name' }), { target: { value: 'Customer' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add signature' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save drawn signature' }));
  fireEvent.click(screen.getByRole('checkbox', { name: initial.consent_text }));
  api.getPublicEstimatePortal.mockResolvedValue({ ...initial, submitted: true, status: 'accepted' });
  fireEvent.click(screen.getByRole('button', { name: 'Approve estimate' }));
  await waitFor(() => expect(api.approvePublicEstimatePortal).toHaveBeenCalledWith({ token: 'issued-token', snapshot_id: 12, approved_by_name: 'Customer', approved_by_email: '', consent_accepted: true, fields: [{ field_key: 'signature', signature_payload: 'data:image/png;base64,signature' }] }));
  expect(await screen.findByText('Your response has been recorded.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Approve estimate' })).not.toBeInTheDocument();
});
it('shows unavailable link errors without rendering a signing form', async () => {
  api.getPublicEstimatePortal.mockRejectedValue({ response: { data: { detail: 'This document has expired.' } } });
  estimate();
  expect(await screen.findByRole('alert')).toHaveTextContent('This document has expired.');
  expect(screen.queryByRole('button', { name: 'Approve estimate' })).not.toBeInTheDocument();
});
it('does not permit changes when the signer has already completed their fields', async () => {
  api.getPublicContractPortal.mockResolvedValue({ ...initial, title: 'Moving Contract', submitted: true });
  render(<MemoryRouter initialEntries={['/portal/contracts/signer-token']}><Routes><Route path="/portal/contracts/:token" element={<IssuedDocumentPortal />} /></Routes></MemoryRouter>);
  await screen.findByRole('heading', { name: 'Moving Contract' });
  expect(api.getPublicContractPortal).toHaveBeenCalledWith('signer-token');
  expect(screen.queryByRole('button', { name: 'Submit signature' })).not.toBeInTheDocument();
});
it('prevents duplicate submissions while a signing request is pending', async () => {
  let resolve;
  api.signPublicContractPortal.mockImplementation(() => new Promise((done) => { resolve = done; }));
  render(<MemoryRouter initialEntries={['/portal/contracts/signer-token']}><Routes><Route path="/portal/contracts/:token" element={<IssuedDocumentPortal />} /></Routes></MemoryRouter>);
  await screen.findByRole('heading', { name: 'Moving Estimate' });
  fireEvent.change(screen.getByRole('textbox', { name: 'Your name' }), { target: { value: 'Customer' } });
  fireEvent.click(screen.getByRole('checkbox', { name: initial.consent_text }));
  fireEvent.click(screen.getByRole('button', { name: 'Submit signature' }));
  expect(await screen.findByRole('button', { name: 'Submitting…' })).toBeDisabled();
  expect(api.signPublicContractPortal).toHaveBeenCalledTimes(1);
  await act(async () => resolve({ success: true }));
});
