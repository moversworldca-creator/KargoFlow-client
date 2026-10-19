import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { grant, renderScreen } from '../../pricing/__tests__/harness';
import EstimateDetail from '../components/EstimateDetail';
import EstimatesWorkspace from '../components/EstimatesWorkspace';
import { estimatesApi } from '../api';
import { pricingApi } from '../../pricing/api';

vi.mock('../../../shared/auth/useCan', async () => {
  const { canMock } = await import('../../pricing/__tests__/harness');
  return { default: () => canMock() };
});
vi.mock('../api', () => ({
  estimatesApi: {
    workspace: vi.fn(), getEstimate: vi.fn(), savePricingInputs: vi.fn(() => Promise.resolve({})),
    selectOption: vi.fn(() => Promise.resolve({})), bookingReadiness: vi.fn(), book: vi.fn(),
    markReady: vi.fn(), send: vi.fn(), getChangeOrder: vi.fn(),
  },
  portalApi: {},
}));
vi.mock('../../pricing/api', () => ({
  pricingApi: {
    getRun: vi.fn(), calculateEstimate: vi.fn(), listSkills: vi.fn(() => Promise.resolve([])),
    listOverrides: vi.fn(() => Promise.resolve([])), commitments: vi.fn(() => Promise.resolve([])),
    listApprovals: vi.fn(() => Promise.resolve([])), explainRun: vi.fn(), adoptForResend: vi.fn(),
  },
  newIdempotencyKey: () => 'idem-1',
}));

const run = (total = '1418.75', extra = {}) => ({
  id: 30, currency: 'USD', jobs: [{ job_id: 501, catalog_key: 'local', revision_number: 1, pricing_method: 'hourly', effective_date: '2026-10-21' }],
  charges: [{ charge_key: 'job501.labor', scope: 'job', job_id: 501, name: 'Labor', quantity: '5', unit: 'hour', unit_rate: '225.00', amount: '1125.00', customer_visible: true, source: { catalog_key: 'local', revision_number: 1, rule_key: 'labor' } }],
  adjustments: [], taxes: [], totals: { subtotal: '1418.75', adjustment_total: '0.00', constraint_adjustment: '0.00', tax_total: '0.00', grand_total: total, deposit_amount: '0.00' },
  constraint: { type: 'none' }, warnings: [], errors: [], ...extra,
});
const estimate = (extra = {}) => ({
  id: 9, opportunity_id: 4, estimate_number: 'EST-1-1', option_label: 'Standard', customer_display_label: 'Standard',
  lifecycle_state: 'draft', binding_type: 'non_binding', is_booked: false, pricing_stale: false, current_pricing_run_id: 30,
  grand_total: '1418.75', deposit_amount: '0.00', scope_jobs: [{ job_id: 501, title: 'Moving', is_included: true, is_primary: true }],
  pricing_inputs: { jobs: { 501: { estimated_hours: '5' } } }, pricing_inputs_lock_version: 1, pending_approvals: 0,
  versions: [], acceptances: [], portal_events: [], portal_link: null,
  available_actions: ['calculate', 'edit', 'edit_scope', 'mark_ready', 'send', 'cancel', 'revise'], updated_at: '2026-10-19T10:00:00Z', ...extra,
});

const openEstimate = (data) => {
  estimatesApi.getEstimate.mockResolvedValue(data);
  pricingApi.getRun.mockResolvedValue(run());
  return renderScreen(<EstimateDetail estimateId={9} opportunity={{ planned_jobs: [], opportunity: {} }} onBack={() => {}} />);
};

describe('EstimateDetail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('never hides stale pricing', async () => {
    grant('estimates.view', 'estimates.update_draft', 'estimates.send');
    openEstimate(estimate({ pricing_stale: true, pricing_stale_reason: 'Estimate scope (Planned Jobs) changed', available_actions: ['calculate', 'edit', 'edit_scope', 'cancel'] }));
    expect(await screen.findByText('Pricing is out of date')).toBeInTheDocument();
    expect(screen.getByText(/scope \(Planned Jobs\) changed/)).toBeInTheDocument();
    expect(await screen.findByText('Out of date')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
  });

  it('hides actions the user lacks permission for', async () => {
    grant('estimates.view');
    openEstimate(estimate());
    await screen.findByText('EST-1-1 · Standard');
    for (const name of ['Send', 'Mark ready', 'Cancel', 'Revise', /Calculate price/]) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });

  it('locks a booked Estimate', async () => {
    grant('estimates.view', 'estimates.update_draft', 'estimates.send', 'estimates.supersede');
    openEstimate(estimate({ is_booked: true, lifecycle_state: 'accepted', available_actions: [] }));
    expect(await screen.findByText('Booked and locked')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Calculate price/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revise' })).not.toBeInTheDocument();
  });

  it('sends the saved inputs to the Pricing Engine and shows its result', async () => {
    grant('estimates.view', 'estimates.update_draft');
    pricingApi.calculateEstimate.mockResolvedValue({ run: run('1500.00'), decision: { adopted: true, repricing_action: 'recalculate' } });
    openEstimate(estimate());
    fireEvent.click(await screen.findByRole('button', { name: /Calculate price/ }));
    await waitFor(() => expect(pricingApi.calculateEstimate).toHaveBeenCalled());
    const [id, body, key] = pricingApi.calculateEstimate.mock.calls[0];
    expect(id).toBe(9);
    expect(body.jobs).toEqual([{ job_id: 501, inputs: { estimated_hours: '5' } }]);
    expect(key).toBe('idem-1');
  });

  it('offers resend when a sent Estimate was repriced', async () => {
    grant('estimates.view', 'estimates.update_draft', 'estimates.send');
    pricingApi.calculateEstimate.mockResolvedValue({ run: run('1600.00', { id: 31 }), decision: { adopted: false, repricing_action: 'new_version_and_resend' } });
    openEstimate(estimate({ lifecycle_state: 'sent', sent_at: '2026-10-19T10:00:00Z', available_actions: ['calculate', 'reissue_link', 'resend', 'record_acceptance', 'cancel', 'revise'] }));
    fireEvent.click(await screen.findByRole('button', { name: /Calculate price/ }));
    expect(await screen.findByText('New price not yet sent')).toBeInTheDocument();
    expect(screen.getByText(/\$1,600\.00/, { selector: 'div' })).toBeInTheDocument();
  });

  it('shows cost and margin only when the backend included them', async () => {
    grant('estimates.view');
    openEstimate(estimate());
    await screen.findByText('Labor');
    expect(screen.queryByRole('tab', { name: 'Cost & margin' })).not.toBeInTheDocument();
  });
});

const workspace = {
  opportunity: { id: 4, opportunity_number: 'OPP-1', system_state: 'open', is_booked: false, booked_estimate_id: null, binding_type: 'non_binding', move_date: '2026-10-21' },
  planned_jobs: [{ id: 501, title: 'Moving', is_primary: true }],
  proposal_groups: [{ id: 3, name: 'Move options', state: 'open' }],
  estimates: [
    { id: 9, estimate_number: 'EST-1-1', option_label: 'Economy', lifecycle_state: 'draft', binding_type: 'non_binding', proposal_group_id: 3, current_pricing_run_id: 30, grand_total: '1200.00', pricing_stale: false },
    { id: 10, estimate_number: 'EST-1-2', option_label: 'Full service', lifecycle_state: 'draft', binding_type: 'non_binding', proposal_group_id: 3, current_pricing_run_id: null, grand_total: '0', pricing_stale: true },
  ],
  change_orders: [],
};

describe('EstimatesWorkspace', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists the options of one Opportunity and selects one without booking', async () => {
    grant('estimates.view', 'estimates.manage_options');
    estimatesApi.workspace.mockResolvedValue(workspace);
    renderScreen(<EstimatesWorkspace opportunityId={4} />);
    expect(await screen.findByText('Move options')).toBeInTheDocument();
    expect(screen.getByText('$1,200.00')).toBeInTheDocument();
    expect(screen.getByText('Not priced')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Choose Full service' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/does not book the move/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Choose this option' }));
    await waitFor(() => expect(estimatesApi.selectOption).toHaveBeenCalledWith(4, 3, 10));
    expect(estimatesApi.book).not.toHaveBeenCalled();
  });

  it('keeps booking separate and blocked until the policy is satisfied', async () => {
    grant('estimates.view', 'opportunities.book');
    estimatesApi.workspace.mockResolvedValue(workspace);
    estimatesApi.bookingReadiness.mockResolvedValue({
      ready: false, selected_estimate_id: 9, quote_sent: false, estimate_accepted: false, contract_signed: false,
      deposit_required: '0', paid_amount: '0', deposit_satisfied: true, move_date_present: true,
      requirements: { quote_sent: true, estimate_acceptance: true, contract_signature: false, deposit: false, move_date: true },
    });
    renderScreen(<EstimatesWorkspace opportunityId={4} />);
    expect(await screen.findByRole('button', { name: 'Book Opportunity' })).toBeDisabled();
    expect(screen.getByText(/Not ready: Estimate sent, Estimate accepted/)).toBeInTheDocument();
    expect(screen.queryByText(/Contract signed/)).not.toBeInTheDocument();
  });

  it('does not offer creation without estimates.create', async () => {
    grant('estimates.view');
    estimatesApi.workspace.mockResolvedValue(workspace);
    renderScreen(<EstimatesWorkspace opportunityId={4} />);
    await screen.findByText('Move options');
    expect(screen.queryByRole('button', { name: /New Estimate/ })).not.toBeInTheDocument();
  });
});
