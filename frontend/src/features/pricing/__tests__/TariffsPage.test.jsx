import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { grant, renderScreen } from './harness';
import TariffsPage from '../components/TariffsPage';
import RunViewer from '../components/RunViewer';
import { pricingApi } from '../api';

vi.mock('../../../shared/auth/useCan', async () => {
  const { canMock } = await import('./harness');
  return { default: () => canMock() };
});
vi.mock('../../../services/api', () => ({ getBranches: vi.fn(() => Promise.resolve([{ id: 11, name: 'Main' }])) }));
vi.mock('../api', () => ({
  pricingApi: { listTariffs: vi.fn(), createTariff: vi.fn(), getTariff: vi.fn(), explainRun: vi.fn() },
  newIdempotencyKey: () => 'k',
}));

const tariffs = { count: 1, results: [{ id: 1, name: 'Local residential', catalog_key: 'local_residential', primary_pricing_method: 'hourly', resolver_priority: 10, state: 'active', branch_ids: [], current_published_revision_id: 7 }] };

describe('TariffsPage', () => {
  beforeEach(() => { vi.clearAllMocks(); pricingApi.listTariffs.mockResolvedValue(tariffs); });

  it('lists Tariffs; creating needs pricing.create', async () => {
    grant('pricing.view');
    renderScreen(<TariffsPage />);
    expect(await screen.findByRole('button', { name: 'Local residential' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /New Tariff/ })).not.toBeInTheDocument();
  });

  it('creates a Simple Tariff as a draft with the compiled configuration', async () => {
    grant('pricing.view', 'pricing.create');
    pricingApi.createTariff.mockResolvedValue({ id: 2, draft_revision: { id: 8 } });
    pricingApi.getTariff.mockResolvedValue({ id: 2, name: 'Weekend', revisions: [] });
    renderScreen(<TariffsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /New Tariff/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'Weekend Local' } });
    fireEvent.change(within(dialog).getByLabelText('Rate per hour'), { target: { value: '180' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create draft' }));
    await waitFor(() => expect(pricingApi.createTariff).toHaveBeenCalled());
    expect(pricingApi.createTariff.mock.calls[0][0]).toMatchObject({
      catalog_key: 'weekend_local', name: 'Weekend Local', primary_pricing_method: 'hourly', branch_id: null,
      simple: { crew_rates: [{ crew_size: 2, truck_count: 1, rate: '180' }] },
    });
  });

  it('refuses a non-decimal rate as typed', async () => {
    grant('pricing.view', 'pricing.create');
    renderScreen(<TariffsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /New Tariff/ }));
    const input = within(await screen.findByRole('dialog')).getByLabelText('Rate per hour');
    fireEvent.change(input, { target: { value: '1e5' } });
    expect(input).toHaveValue('');
  });
});

describe('RunViewer', () => {
  const run = {
    id: 30, currency: 'USD', jobs: [], charges: [], adjustments: [], taxes: [], warnings: [], errors: [],
    totals: { subtotal: '100.00', adjustment_total: '0.00', constraint_adjustment: '-20.00', pre_constraint_total: '120.00', tax_total: '0.00', grand_total: '100.00', deposit_amount: '0.00' },
    constraint: { type: 'not_to_exceed', amount: '100.00' },
  };

  it('shows the constraint effect from the stored totals and no cost without the backend sending it', () => {
    renderScreen(<RunViewer run={run} />);
    expect(screen.getByText(/The calculated price \$120.00 was adjusted by -\$20.00/)).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Cost & margin' })).not.toBeInTheDocument();
  });

  it('shows cost and margin when the backend included them', () => {
    renderScreen(<RunViewer run={{ ...run, cost: { internal_cost_total: '60.00', gross_profit: '40.00', gross_margin_pct: '40.00', margin_status: 'ok' } }} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Cost & margin' }));
    expect(screen.getByText('$60.00')).toBeInTheDocument();
  });
});
