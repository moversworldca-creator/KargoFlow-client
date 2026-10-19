import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderScreen } from '../../pricing/__tests__/harness';
import EstimatePortalPage from '../pages/EstimatePortalPage';
import { portalApi } from '../api';

vi.mock('../api', () => ({ estimatesApi: {}, portalApi: { view: vi.fn(), accept: vi.fn() } }));

const TOKEN = 'a'.repeat(43);
const view = (extra = {}) => ({
  kind: 'estimate',
  company: { company_name: 'Unique Movers', company_phone: '555', company_email: '', logo_url: '', currency: 'USD', branch_name: 'Main' },
  customer_name: 'Pat Customer',
  estimate: { number: 'EST-1-1', label: 'Standard move', option_label: 'Standard', description: '', binding_type: 'non_binding', state: 'viewed', version_number: 1, sent_at: '2026-10-19T10:00:00Z', expires_at: null, accepted_at: null, is_booked: false },
  jobs: [{ title: 'Moving', service_type: 'Moving', service_date: '2026-10-21' }],
  pricing: { currency: 'USD', lines: [{ name: 'Moving labor', scope: 'job', job: 'Moving', quantity: '5', unit: 'hour', unit_rate: '225.00', amount: '1125.00', taxable: true }], adjustments: [], taxes: [], constraint: { type: 'not_to_exceed', amount: '1600.00' }, totals: { subtotal: '1418.75', tax_total: '0.00', grand_total: '1418.75', deposit_amount: '141.88' } },
  pricing_current: true, can_accept: true,
  consent_text: 'By typing my name and selecting Accept, I accept the estimate. Accepting does not book my move.',
  acceptance: null, ...extra,
});

const open = (token = TOKEN) => renderScreen(<EstimatePortalPage />, { route: `/portal/estimate?token=${token}` });

describe('Customer portal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the customer-safe estimate with business dates unshifted', async () => {
    portalApi.view.mockResolvedValue(view());
    open();
    expect(await screen.findByRole('heading', { name: 'Standard move' })).toBeInTheDocument();
    expect(portalApi.view).toHaveBeenCalledWith(TOKEN);
    expect(screen.getByText(/Oct 21, 2026/)).toBeInTheDocument();
    expect(screen.getAllByText('$1,418.75').length).toBeGreaterThan(0);
    expect(screen.getByText(/Not-to-exceed: you will not pay more than \$1,600.00/)).toBeInTheDocument();
    expect(screen.getByText(/Non-binding estimate/)).toBeInTheDocument();
  });

  it('requires a typed name and explicit consent; acceptance is not booking', async () => {
    portalApi.view.mockResolvedValue(view());
    portalApi.accept.mockResolvedValue(view({ can_accept: false, estimate: { ...view().estimate, state: 'accepted' }, acceptance: { signer_name: 'Pat Customer', accepted_at: '2026-10-19T11:00:00Z', method: 'portal' } }));
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Accept' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/confirm that you accept/);
    expect(portalApi.accept).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Your full name'), { target: { value: 'Pat Customer' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    await waitFor(() => expect(portalApi.accept).toHaveBeenCalledWith(TOKEN, { signer_name: 'Pat Customer', signer_email: '', consent: true }));
    expect(await screen.findByText(/We will contact you to confirm your booking/)).toBeInTheDocument();
  });

  it('shows stale pricing and blocks acceptance', async () => {
    portalApi.view.mockResolvedValue(view({ pricing_current: false, can_accept: false }));
    open();
    expect(await screen.findByText('This estimate is being updated')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
  });

  it('gives one answer for an unknown, expired or revoked link', async () => {
    portalApi.view.mockRejectedValue({ response: { status: 404, data: { error: 'link_invalid' } } });
    open();
    expect(await screen.findByText('This link is not valid')).toBeInTheDocument();
  });

  it('handles a missing token without calling the backend', async () => {
    renderScreen(<EstimatePortalPage />, { route: '/portal/estimate' });
    expect(await screen.findByText('This link is not valid')).toBeInTheDocument();
    expect(portalApi.view).not.toHaveBeenCalled();
  });
});
