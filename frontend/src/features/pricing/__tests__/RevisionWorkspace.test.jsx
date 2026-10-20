import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { canMock, grant, renderScreen } from './harness';
import RevisionWorkspace from '../components/RevisionWorkspace';
import { pricingApi } from '../api';

vi.mock('../../../shared/auth/useCan', async () => {
  const { canMock: mock } = await import('./harness');
  return { default: () => mock() };
});
vi.mock('../../../services/api', () => ({
  getBranches: vi.fn(() => Promise.resolve([{ id: 11, name: 'Main' }])),
  getServiceTypes: vi.fn(() => Promise.resolve([])),
}));
vi.mock('../api', () => ({
  pricingApi: {
    getRevision: vi.fn(), getPolicy: vi.fn(() => Promise.resolve({ revision_workflow: 'full' })),
    revisionAction: vi.fn(() => Promise.resolve({ valid: true, issues: [], summary: { errors: 0, warnings: 0, info: 0 } })),
    createItem: vi.fn(() => Promise.resolve({ id: 99 })), listSkills: vi.fn(() => Promise.resolve([])),
    exportRevision: vi.fn(),
  },
  newIdempotencyKey: () => 'k',
}));

const tariff = { id: 1, catalog_key: 'local', name: 'Local' };
const revision = (state, extra = {}) => ({
  id: 7, catalog_id: 1, revision_number: 3, state, lock_version: 4, currency: 'USD', rounding_method: 'half_up',
  line_rounding_scale: 2, total_rounding_scale: 2, effective_start_date: '2026-11-01', validation: [],
  content: { rules: [{ id: 5, rule_key: 'labor', name: 'Labor', rule_type: 'labor', calculation_type: 'hourly', calculation_phase: 'base', priority: 10, is_active: true, condition_expression: {} }],
    rate_tables: [], applicability: [], constraints: [], scenarios: [] },
  ...extra,
});

const show = (state) => {
  pricingApi.getRevision.mockResolvedValue(revision(state));
  return renderScreen(<RevisionWorkspace revisionId={7} tariff={tariff} revisions={[revision(state)]} onOpenRevision={() => {}} onChanged={() => Promise.resolve()} />);
};

describe('RevisionWorkspace', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows a published revision read-only, with no editing controls', async () => {
    grant('pricing.view', 'pricing.update_draft', 'pricing.retire', 'pricing.rollback');
    show('published');
    expect(await screen.findByText('This revision is read-only')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /All rules/ }));
    expect(screen.queryByRole('button', { name: /Add rule/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit rule/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete draft' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retire' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restore as new revision' })).toBeInTheDocument();
  });

  it('offers only the transitions the user holds', async () => {
    grant('pricing.view', 'pricing.update_draft');
    show('draft');
    fireEvent.click(await screen.findByRole('tab', { name: /All rules/ }));
    expect(await screen.findByRole('button', { name: /Add rule/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Validate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit for approval' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
  });

  it('validates through the backend after confirmation', async () => {
    grant('pricing.view', 'pricing.update_draft', 'pricing.validate');
    show('draft');
    fireEvent.click(await screen.findByRole('button', { name: 'Validate' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/frozen until reopened/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Validate' }));
    await waitFor(() => expect(pricingApi.revisionAction).toHaveBeenCalledWith(7, 'validate', {}));
  });

  it('explains that publishing a future-dated revision schedules it', async () => {
    grant('pricing.view', 'pricing.publish');
    pricingApi.getRevision.mockResolvedValue(revision('approved', { effective_start_date: '2099-01-01' }));
    renderScreen(<RevisionWorkspace revisionId={7} tariff={tariff} revisions={[]} onOpenRevision={() => {}} onChanged={() => Promise.resolve()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Publish' }));
    expect(await screen.findByText(/scheduled and takes over on Jan 1, 2099/)).toBeInTheDocument();
    expect(screen.getByText(/keep their stored pricing/)).toBeInTheDocument();
  });

  it('adds a rule to a draft with the revision lock version', async () => {
    grant('pricing.view', 'pricing.update_draft');
    show('draft');
    fireEvent.click(await screen.findByRole('tab', { name: /All rules/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Add rule/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Key/), { target: { value: 'fuel' } });
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'Fuel' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add rule' }));
    await waitFor(() => expect(pricingApi.createItem).toHaveBeenCalled());
    const [revisionId, kind, body] = pricingApi.createItem.mock.calls[0];
    expect([revisionId, kind, body.rule_key, body.lock_version]).toEqual([7, 'rules', 'fuel', 4]);
  });
});
