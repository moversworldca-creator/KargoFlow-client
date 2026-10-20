import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { grant, renderScreen } from './harness';
import SkillsSettings from '../components/SkillsSettings';
import OverlaysSettings from '../components/OverlaysSettings';
import ApprovalsQueue from '../components/ApprovalsQueue';
import { PolicySettings } from '../components/PolicyAndTaxSettings';
import { PricingCalendarsPage, PricingTestsPage } from '../components/CompanyPricingPages';
import { pricingApi } from '../api';

vi.mock('../../../shared/auth/useCan', async () => {
  const { canMock } = await import('./harness');
  return { default: () => canMock() };
});
vi.mock('../../../services/api', () => ({
  getEmployees: vi.fn(() => Promise.resolve([])),
  getBranchTaxProfiles: vi.fn(() => Promise.resolve([])),
}));
vi.mock('../api', () => ({
  pricingApi: {
    listSkills: vi.fn(), createSkill: vi.fn(() => Promise.resolve({ id: 9 })), updateSkill: vi.fn(),
    listOverlays: vi.fn(), overlayAction: vi.fn(() => Promise.resolve({})),
    listApprovals: vi.fn(), decideApproval: vi.fn(() => Promise.resolve({})), getRun: vi.fn(() => new Promise(() => {})),
    getPolicy: vi.fn(), savePolicy: vi.fn(() => Promise.resolve({})),
    listTariffs: vi.fn(), getRevision: vi.fn(), runScenarios: vi.fn(),
  },
  newIdempotencyKey: () => 'k',
}));

beforeEach(() => vi.clearAllMocks());

describe('Pricing Skills settings', () => {
  beforeEach(() => pricingApi.listSkills.mockResolvedValue([
    { id: 1, code: 'mover', name: 'Mover', default_selling_rate: '55.00', default_cost_rate: '32.00', is_active: true },
  ]));

  it('is read-only without pricing.update_draft and hides cost without pricing.view_cost', async () => {
    grant('pricing.view');
    renderScreen(<SkillsSettings />);
    expect(await screen.findByText('$55.00')).toBeInTheDocument();
    expect(screen.queryByText('$32.00')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add skill/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Mover' })).not.toBeInTheDocument();
    expect(screen.getByText(/never grants access/)).toBeInTheDocument();
  });

  it('never sends a cost rate the user cannot see', async () => {
    grant('pricing.view', 'pricing.update_draft');
    renderScreen(<SkillsSettings />);
    fireEvent.click(await screen.findByRole('button', { name: /Add skill/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Code/), { target: { value: 'piano' } });
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'Piano' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(pricingApi.createSkill).toHaveBeenCalled());
    expect(pricingApi.createSkill.mock.calls[0][0]).toMatchObject({ code: 'piano', name: 'Piano' });
    expect(pricingApi.createSkill.mock.calls[0][0]).not.toHaveProperty('default_cost_rate');
  });
});

describe('Contract Pricing settings', () => {
  beforeEach(() => pricingApi.listOverlays.mockResolvedValue([
    { id: 4, name: 'ABC Corporate', state: 'published', customer_id: 7, base_revision_number: 5, configuration: {} },
  ]));

  it('offers Retire only with pricing.retire and retires after confirmation', async () => {
    grant('pricing.view');
    const { unmount } = renderScreen(<OverlaysSettings />);
    expect(await screen.findByText('ABC Corporate')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retire' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /New contract pricing/ })).not.toBeInTheDocument();
    unmount();

    grant('pricing.view', 'pricing.retire');
    renderScreen(<OverlaysSettings />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retire' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/pricing stops instead of falling back/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Retire' }));
    await waitFor(() => expect(pricingApi.overlayAction).toHaveBeenCalledWith(4, 'retire'));
  });
});

describe('Pricing Settings (policy)', () => {
  beforeEach(() => pricingApi.getPolicy.mockResolvedValue({
    default: true, revision_workflow: 'full', effective_date_basis: 'service_date', external_failure_policy: 'fail_closed',
    require_independent_approval: true, margin_minimum_action: 'warn', margin_hard_floor_action: 'block',
  }));

  it('is read-only without pricing.publish and hides margin policy without pricing.view_cost', async () => {
    grant('pricing.view');
    renderScreen(<PolicySettings />);
    expect(await screen.findByLabelText('Revision workflow')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save settings' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Target margin (%)')).not.toBeInTheDocument();
  });

  it('saves edits through the backend, blanks as null', async () => {
    grant('pricing.view', 'pricing.publish', 'pricing.view_cost');
    renderScreen(<PolicySettings />);
    fireEvent.change(await screen.findByLabelText('Target margin (%)'), { target: { value: '35' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() => expect(pricingApi.savePolicy).toHaveBeenCalled());
    expect(pricingApi.savePolicy.mock.calls[0][0]).toMatchObject({ margin_target_pct: '35', margin_minimum_pct: null, revision_workflow: 'full' });
  });
});

describe('Pricing Approvals', () => {
  beforeEach(() => pricingApi.listApprovals.mockResolvedValue([
    { id: 3, state: 'pending', approval_type: 'discount', reason: '15% discount', estimate_id: 12, calculation_run_id: 40, requested_at: '2026-10-18T10:00:00Z' },
  ]));

  it('shows Review only to approvers; rejecting needs a comment', async () => {
    grant('pricing.view');
    const { unmount } = renderScreen(<ApprovalsQueue />);
    expect(await screen.findByText(/15% discount/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Review' })).not.toBeInTheDocument();
    unmount();

    grant('pricing.view', 'pricing.approve_adjustment');
    renderScreen(<ApprovalsQueue />);
    fireEvent.click(await screen.findByRole('button', { name: 'Review' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Reject' })).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText(/Comment/), { target: { value: 'Too deep' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(pricingApi.decideApproval).toHaveBeenCalledWith(3, false, 'Too deep'));
  });
});

const tariffRow = (extra) => ({
  id: 1, name: 'Dallas Local', catalog_key: 'dallas_local', state: 'active', current_published_revision_id: 70, current_revision_number: 7,
  latest_revision_id: 80, latest_revision_number: 8, latest_revision_state: 'draft', ...extra,
});
const revisionWith = (id, content, extra = {}) => ({
  id, revision_number: id / 10, state: id === 70 ? 'published' : 'draft', currency: 'USD',
  content: { rules: [], applicability: [], scenarios: [], ...content }, ...extra,
});

describe('Pricing Calendars', () => {
  it('lists the live revision’s date-based rules and blackouts, and flags a pending draft', async () => {
    grant('pricing.view');
    pricingApi.listTariffs.mockResolvedValue({ count: 2, results: [tariffRow(), tariffRow({ id: 2, name: 'Not yet live', current_published_revision_id: null })] });
    pricingApi.getRevision.mockResolvedValue(revisionWith(70, {
      rules: [
        { id: 1, rule_key: 'weekend', name: 'Weekend surcharge', rule_type: 'surcharge', percentage: '10', priority: 50, condition_expression: { expr: 'is_weekend' } },
        { id: 2, rule_key: 'labor', name: 'Labor', rule_type: 'labor', priority: 10, condition_expression: {} },
      ],
      applicability: [{ id: 5, applicability_key: 'xmas', service_date_from: '2026-12-24', service_date_until: '2026-12-26', is_exclusion: true }],
    }));
    renderScreen(<PricingCalendarsPage />);
    const card = await screen.findByRole('article', { name: 'Calendar of Dallas Local' });
    expect(await within(card).findByText('Weekend surcharge')).toBeInTheDocument();
    expect(within(card).getByText('Weekends (Saturday and Sunday)')).toBeInTheDocument();
    expect(within(card).queryByText('Labor')).not.toBeInTheDocument();
    expect(within(card).getByText('Blackout')).toBeInTheDocument();
    expect(within(card).getByText('Rev 8 Draft')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Open Tariff' })).toHaveAttribute('href', '/settings/pricing/tariffs?tariff=1&revision=80');
    expect(pricingApi.getRevision).toHaveBeenCalledWith(70);
    expect(screen.queryByRole('article', { name: 'Calendar of Not yet live' })).not.toBeInTheDocument();
  });
});

describe('Pricing Tests', () => {
  beforeEach(() => {
    pricingApi.listTariffs.mockResolvedValue({ count: 1, results: [tariffRow()] });
    pricingApi.getRevision.mockResolvedValue(revisionWith(80, {
      scenarios: [{ id: 1, scenario_key: 'two_bed', name: 'Two bedroom', is_required_for_publish: true, expected_snapshot: { grand_total: '900.00' } }],
    }));
  });

  it('runs every Tariff’s tests on its newest revision and shows the backend verdict', async () => {
    grant('pricing.view', 'pricing.simulate');
    pricingApi.runScenarios.mockResolvedValue([{ scenario_key: 'two_bed', passed: false, totals: { grand_total: '950.00' }, failures: ['Grand total 950.00 is not 900.00'] }]);
    renderScreen(<PricingTestsPage />);
    expect(await screen.findByText('Two bedroom')).toBeInTheDocument();
    expect(pricingApi.getRevision).toHaveBeenCalledWith(80);
    fireEvent.click(screen.getByRole('button', { name: /Run all tests/ }));
    await waitFor(() => expect(pricingApi.runScenarios).toHaveBeenCalledWith(80));
    expect(await screen.findByText('1 failed')).toBeInTheDocument();
    expect(screen.getByText('$950.00')).toBeInTheDocument();
    expect(screen.getByText('Grand total 950.00 is not 900.00')).toBeInTheDocument();
  });

  it('cannot run tests without pricing.simulate', async () => {
    grant('pricing.view');
    renderScreen(<PricingTestsPage />);
    expect(await screen.findByText('Two bedroom')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Run all tests/ })).not.toBeInTheDocument();
  });
});
