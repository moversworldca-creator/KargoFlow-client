// Scenario tests: the Estimate screens rendered with Calculation Runs shaped
// exactly like the backend's (internal view). They check that each pricing
// method and workflow state is presented correctly, and that nothing the
// backend did not send (cost, margin) appears.
import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { grant, renderScreen } from '../../pricing/__tests__/harness';
import EstimateDetail from '../components/EstimateDetail';
import { estimatesApi } from '../api';
import { pricingApi } from '../../pricing/api';

vi.mock('../../../shared/auth/useCan', async () => {
  const { canMock } = await import('../../pricing/__tests__/harness');
  return { default: () => canMock() };
});
vi.mock('../api', () => ({
  estimatesApi: { getEstimate: vi.fn(), savePricingInputs: vi.fn(() => Promise.resolve({})) },
  portalApi: {},
}));
vi.mock('../../pricing/api', () => ({
  pricingApi: {
    getRun: vi.fn(), calculateEstimate: vi.fn(), listSkills: vi.fn(() => Promise.resolve([])), getPolicy: vi.fn(() => Promise.resolve({})),
    listOverrides: vi.fn(() => Promise.resolve([])), commitments: vi.fn(() => Promise.resolve([])),
    listApprovals: vi.fn(() => Promise.resolve([])), explainRun: vi.fn(() => Promise.resolve({ why_this_price: [], why_this_tariff: {} })),
    listTariffs: vi.fn(() => Promise.resolve({ results: [] })), createOverride: vi.fn(),
  },
  newIdempotencyKey: () => 'k',
}));

const source = (rule, extra = {}) => ({ catalog_key: 'dallas_local', revision_number: 7, rule_key: rule, ...extra });
const charge = (key, name, category, amount, extra = {}) => ({
  charge_key: key, scope: 'job', job_id: 501, category, name, amount, unit_rate: '0', quantity: '1', unit: 'each',
  customer_visible: true, source: source(key.split('.').pop()), ...extra,
});
const totals = (grand, extra = {}) => ({
  subtotal: grand, adjustment_total: '0.00', constraint_adjustment: '0.00', pre_constraint_total: grand, tax_total: '0.00',
  grand_total: grand, deposit_amount: '0.00', ...extra,
});
const run = (charges, grand, extra = {}) => ({
  id: 30, persisted: true, context: 'estimate', currency: 'USD', is_finalized: true, calculated_at: '2026-10-19T10:00:00Z',
  input_hash: 'a'.repeat(64), pricing_engine_version: 'kf-pricing-engine/16.1', pricing_dsl_version: 'kf-pricing-dsl/1',
  pricing_effective_date: '2026-10-21', effective_date_basis: 'job_service_date',
  jobs: [{ job_id: 501, catalog_key: 'dallas_local', revision_number: 7, pricing_method: 'hourly', effective_date: '2026-10-21' }],
  charges, adjustments: [], taxes: [], warnings: [], errors: [], constraint: { type: 'none' }, totals: totals(grand),
  inputs: { jobs: [] }, ...extra,
});
const estimate = (extra = {}) => ({
  id: 9, opportunity_id: 4, estimate_number: 'EST-1-1', option_label: 'Standard', customer_display_label: 'Standard',
  lifecycle_state: 'draft', binding_type: 'non_binding', is_booked: false, pricing_stale: false, current_pricing_run_id: 30,
  grand_total: '0', deposit_amount: '0', scope_jobs: [{ job_id: 501, title: 'Moving', is_included: true, is_primary: true }],
  pricing_inputs: {}, pricing_inputs_lock_version: 1, pending_approvals: 0, versions: [], acceptances: [], portal_events: [],
  portal_link: null, available_actions: ['calculate', 'edit', 'edit_scope', 'mark_ready', 'send', 'cancel', 'revise'], updated_at: 'x', ...extra,
});

const show = (theRun, theEstimate = estimate()) => {
  pricingApi.getRun.mockResolvedValue(theRun);
  estimatesApi.getEstimate.mockResolvedValue(theEstimate);
  return renderScreen(<EstimateDetail estimateId={9} opportunity={{ planned_jobs: [], opportunity: {} }} onBack={() => {}} />);
};

describe('pricing methods are presented from the backend run', () => {
  beforeEach(() => { vi.clearAllMocks(); grant('estimates.view', 'estimates.update_draft', 'pricing.view'); });

  it('local hourly: labor, travel, boxes and fuel, grouped', async () => {
    show(run([
      charge('job501.labor', 'Labor', 'labor', '1125.00', { quantity: '5', unit: 'hour', unit_rate: '225.00', source: source('labor', { rate_table_key: 'crew_rates', rate_cell_key: 'c3' }) }),
      charge('job501.travel', 'Travel', 'travel', '150.00'),
      charge('job501.material_box', 'Box', 'material', '80.00', { quantity: '20', unit_rate: '4.00' }),
      charge('job501.fuel', 'Fuel', 'fuel', '63.75'),
    ], '1418.75'));
    const table = await screen.findByRole('table', { name: 'Charges' });
    for (const group of ['Moving', 'Travel', 'Materials']) expect(within(table).getByRole('rowheader', { name: group })).toBeInTheDocument();
    expect(within(table).getByText('$1,125.00')).toBeInTheDocument();
    expect(within(table).getByText(/cell c3/)).toBeInTheDocument();
    expect(screen.getAllByText('$1,418.75').length).toBeGreaterThan(0);
  });

  it('weight / CWT: shows the CWT quantity and breakpoint explanation from the trace', async () => {
    pricingApi.explainRun.mockResolvedValue({ currency: 'USD', why_this_tariff: {}, why_this_price: [{ charge_key: 'job501.linehaul', name: 'Line haul', amount: '4100.00', how: '50 CWT × 82 (breakpoint)', tariff: 'ld', revision: 3, rule: 'linehaul', rate_table: 'weight_bands', rate_cell: '5,000 lb+', breakpoint: { applied: true } }] });
    show(run([charge('job501.linehaul', 'Line haul', 'transportation', '4100.00', { quantity: '50', unit: 'cwt', unit_rate: '82.00' })], '4100.00'));
    expect(await screen.findByText(/50 cwt/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Why?' }));
    expect(await screen.findByText('50 CWT × 82 (breakpoint)')).toBeInTheDocument();
    expect(screen.getByText(/weight breakpoint applied/)).toBeInTheDocument();
  });

  it('flat rate: one fixed service line', async () => {
    show(run([charge('job501.moving_service', 'Moving service', 'transportation', '3500.00', { unit: 'flat' })], '3500.00'));
    expect(await screen.findByText('Moving service')).toBeInTheDocument();
    expect(screen.getAllByText('$3,500.00').length).toBeGreaterThan(0);
  });

  it('skill-based commercial move: one line per pricing skill', async () => {
    show(run(['Mover', 'Driver', 'Foreman'].map((skill, i) => charge(`job501.labor.${skill.toLowerCase()}`, `Labor ${skill}`, 'labor', ['550.00', '350.00', '425.00'][i], { quantity: '5', unit: 'hour' })), '1325.00'));
    for (const skill of ['Labor Mover', 'Labor Driver', 'Labor Foreman']) expect(await screen.findByText(skill)).toBeInTheDocument();
  });

  it('hybrid: labor plus weight-based line haul in one estimate', async () => {
    show(run([charge('job501.labor', 'Labor', 'labor', '900.00'), charge('job501.linehaul', 'Line haul', 'transportation', '2400.00', { unit: 'cwt' })], '3300.00', { primary_pricing_method: 'hybrid' }));
    expect(await screen.findByText('Labor')).toBeInTheDocument();
    expect(screen.getByText('Line haul')).toBeInTheDocument();
  });

  it('NTE: calculated price and the not-to-exceed amount are shown separately, not as binding', async () => {
    show(run([charge('job501.labor', 'Labor', 'labor', '2850.00')], '2850.00', { constraint: { type: 'not_to_exceed', amount: '3200.00' } }), estimate({ binding_type: 'non_binding' }));
    expect(await screen.findByText(/Not-to-exceed \$3,200.00: the most the customer pays/)).toBeInTheDocument();
    expect(screen.getByText(/Separate from Non binding/)).toBeInTheDocument();
    expect(screen.getByText('Not to exceed $3,200.00')).toBeInTheDocument();
  });

  it('multi-job: charges by job plus shared Estimate-level charges', async () => {
    const theRun = run([
      charge('job501.labor', 'Labor', 'labor', '900.00'),
      charge('job502.packing', 'Packing', 'packing', '400.00', { job_id: 502 }),
      charge('est.fuel', 'Fuel', 'fuel', '65.00', { scope: 'estimate', job_id: null }),
    ], '1365.00');
    show(theRun, estimate({ scope_jobs: [{ job_id: 501, title: 'Moving day', is_included: true }, { job_id: 502, title: 'Packing day', is_included: true }] }));
    const table = await screen.findByRole('table', { name: 'Charges' });
    for (const title of ['Moving day', 'Packing day', 'Shared (whole Estimate)']) expect(within(table).getByRole('rowheader', { name: title })).toBeInTheDocument();
  });

  it('contract pricing: the overlay is indicated on the calculated job', async () => {
    show(run([charge('job501.labor', 'Labor', 'labor', '900.00')], '900.00', {
      jobs: [{ job_id: 501, catalog_key: 'dallas_local', revision_number: 7, pricing_method: 'hourly', effective_date: '2026-10-21', overlay: 'abc_corporate' }],
    }));
    expect(await screen.findByText('Contract pricing: abc_corporate')).toBeInTheDocument();
  });
});

describe('workflow states', () => {
  beforeEach(() => { vi.clearAllMocks(); grant('estimates.view', 'estimates.update_draft', 'estimates.send', 'estimates.supersede'); });

  it('current pricing', async () => {
    show(run([charge('job501.labor', 'Labor', 'labor', '900.00')], '900.00'));
    const summary = await screen.findByRole('complementary', { name: 'Estimate summary' });
    expect(within(summary).getByText('Current')).toBeInTheDocument();
  });

  it('stale pricing stays visible, marked, with Recalculate', async () => {
    show(run([charge('job501.labor', 'Labor', 'labor', '900.00')], '900.00'), estimate({ pricing_stale: true, pricing_stale_reason: 'Move date changed', available_actions: ['calculate', 'edit', 'edit_scope', 'cancel'] }));
    const summary = await screen.findByRole('complementary', { name: 'Estimate summary' });
    expect(within(summary).getByText('Stale')).toBeInTheDocument();
    expect(within(summary).getByText('Move date changed')).toBeInTheDocument();
    expect(await within(summary).findByText(/not the current price/)).toBeInTheDocument();
    expect(within(summary).getByRole('button', { name: /Recalculate/ })).toBeInTheDocument();
  });

  it('pricing error shows the backend reason in plain language', async () => {
    pricingApi.calculateEstimate.mockRejectedValue({ response: { status: 422, data: { error: 'pricing_error', code: 'INCOMPLETE_CONTRACT_PRICING', detail: 'Transportation rate is missing for 5,001-7,500 lb.' } } });
    show(run([], '0.00'), estimate({ current_pricing_run_id: null, pricing_stale: true }));
    fireEvent.click(await screen.findByRole('button', { name: /Calculate price/ }));
    const summary = screen.getByRole('complementary', { name: 'Estimate summary' });
    expect(await within(summary).findByText('Pricing error')).toBeInTheDocument();
    expect(within(summary).getByText(/contract pricing that does not cover this job.*5,001-7,500 lb/)).toBeInTheDocument();
  });

  it('accepted is not booked', async () => {
    show(run([charge('job501.labor', 'Labor', 'labor', '900.00')], '900.00'), estimate({ lifecycle_state: 'accepted', available_actions: ['calculate', 'revise'] }));
    expect(await screen.findByText('Accepted, not booked')).toBeInTheDocument();
    expect(screen.queryByText('Booked and locked')).not.toBeInTheDocument();
  });

  it('reapproval required offers review, recalculate and resend', async () => {
    show(run([charge('job501.labor', 'Labor', 'labor', '900.00')], '900.00'), estimate({ lifecycle_state: 'reapproval_required', available_actions: ['calculate', 'send', 'record_acceptance', 'cancel', 'revise'] }));
    expect(await screen.findByText(/no longer valid for the current commercial scope/)).toBeInTheDocument();
    for (const name of ['Review changes', 'Recalculate', 'Resend']) expect(screen.getAllByRole('button', { name }).length).toBeGreaterThan(0);
  });

  it('booked estimate is locked: no calculation, no revise, Change Order path explained', async () => {
    show(run([charge('job501.labor', 'Labor', 'labor', '900.00')], '900.00'), estimate({ lifecycle_state: 'accepted', is_booked: true, available_actions: [] }));
    expect(await screen.findByText(/use a Change Order for changes/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Calculate price/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revise' })).not.toBeInTheDocument();
  });
});

describe('margin visibility', () => {
  beforeEach(() => vi.clearAllMocks());
  const costed = run([charge('job501.labor', 'Labor', 'labor', '4800.00', { internal_cost: '3000.00' })], '4800.00', {
    cost: { internal_cost_total: '3000.00', gross_profit: '1800.00', gross_margin_pct: '37.50', margin_status: 'below_target' },
  });

  it('is shown when the backend includes cost (pricing.view_cost)', async () => {
    grant('estimates.view', 'pricing.view_cost');
    show(costed);
    const margin = await screen.findByRole('region', { name: 'Internal margin' });
    expect(within(margin).getByText('37.50%')).toBeInTheDocument();
    expect(within(margin).getByText('Below target')).toBeInTheDocument();
  });

  it('is absent when the backend sends no cost', async () => {
    grant('estimates.view');
    show(run([charge('job501.labor', 'Labor', 'labor', '4800.00')], '4800.00'));
    await screen.findByText('Labor');
    expect(screen.queryByRole('region', { name: 'Internal margin' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Gross profit/)).not.toBeInTheDocument();
  });
});

describe('overrides', () => {
  beforeEach(() => { vi.clearAllMocks(); grant('estimates.view', 'estimates.update_draft', 'pricing.override_rate'); });

  it('need a reason and show the current value', async () => {
    show(run([charge('job501.labor', 'Labor', 'labor', '1125.00', { unit_rate: '225.00', quantity: '5', unit: 'hour' })], '1125.00'));
    fireEvent.click(await screen.findByRole('button', { name: /Override a charge/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Override a charge' });
    expect(within(dialog).getByText('$1,125.00')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/New amount/), { target: { value: '1000' } });
    expect(within(dialog).getByRole('button', { name: 'Add override' })).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText(/Reason/), { target: { value: 'Long-time customer' } });
    pricingApi.createOverride.mockResolvedValue({ id: 1 });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add override' }));
    await waitFor(() => expect(pricingApi.createOverride).toHaveBeenCalledWith(9, expect.objectContaining({ reason: 'Long-time customer', value: { amount: '1000' } })));
  });
});
