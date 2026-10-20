import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { grant, renderScreen } from './harness';
import { LaborSection, PackingMaterialsSection, TravelSection } from '../components/RevisionSections';
import ConstraintsEditor from '../components/ConstraintsEditor';
import RevisionWorkspace from '../components/RevisionWorkspace';
import TariffsPage from '../components/TariffsPage';
import { pricingApi } from '../api';

vi.mock('../../../shared/auth/useCan', async () => {
  const { canMock } = await import('./harness');
  return { default: () => canMock() };
});
vi.mock('../../../services/api', () => ({
  getBranches: vi.fn(() => Promise.resolve([{ id: 11, name: 'Dallas' }])),
  getServiceTypes: vi.fn(() => Promise.resolve([])),
  getEntitlementSnapshot: vi.fn(() => Promise.resolve({ features: { 'crm.estimates': 'write' } })),
}));
vi.mock('../api', () => ({
  pricingApi: {
    listSkills: vi.fn(() => Promise.resolve([
      { id: 1, code: 'mover', name: 'Mover', default_selling_rate: '55.00', default_cost_rate: '32.00', is_active: true },
      { id: 2, code: 'driver', name: 'Driver', default_selling_rate: '70.00', default_cost_rate: '38.00', is_active: true },
    ])),
    createItem: vi.fn(() => Promise.resolve({ id: 99 })), updateItem: vi.fn(() => Promise.resolve({ id: 99 })),
    deleteItem: vi.fn(() => Promise.resolve()), getRevision: vi.fn(), getPolicy: vi.fn(() => Promise.resolve({})),
    revisionAction: vi.fn(), listTariffs: vi.fn(), exportRevision: vi.fn(), createTariff: vi.fn(), importRevision: vi.fn(),
    getTariff: vi.fn(() => Promise.resolve({ id: 3, name: 'Copy', revisions: [] })),
  },
  newIdempotencyKey: () => 'k',
}));

const revision = (rules = [], extra = {}) => ({
  id: 7, revision_number: 2, state: 'draft', lock_version: 5, currency: 'USD', validation: [],
  content: { rules, rate_tables: [], applicability: [], constraints: [], scenarios: [] }, ...extra,
});
const material = { id: 4, rule_key: 'material_box', name: 'Small box', customer_display_name: 'Small box', rule_type: 'material', calculation_type: 'quantity', quantity_source: 'materials.box', unit: 'each', rate_amount: '4.00', cost_rate: '1.20', tax_classification: 'taxable', is_active: true, condition_expression: {} };

describe('crew skill pricing', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows sell rates and hides cost without pricing.view_cost', async () => {
    grant('pricing.view');
    renderScreen(<LaborSection revision={revision()} editable={false} onChanged={() => {}} />);
    expect(await screen.findByText('$55.00/hr')).toBeInTheDocument();
    expect(screen.queryByText('$32.00/hr')).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Cost' })).not.toBeInTheDocument();
    expect(screen.getByText(/never a security role/)).toBeInTheDocument();
  });

  it('shows cost with pricing.view_cost', async () => {
    grant('pricing.view', 'pricing.view_cost');
    renderScreen(<LaborSection revision={revision()} editable={false} onChanged={() => {}} />);
    expect(await screen.findByText('$32.00/hr')).toBeInTheDocument();
  });
});

describe('packing and materials', () => {
  beforeEach(() => vi.clearAllMocks());

  it('material table hides cost without permission', () => {
    grant('pricing.view');
    renderScreen(<PackingMaterialsSection revision={revision([material])} editable={false} onChanged={() => {}} />);
    expect(screen.getByText('$4.00')).toBeInTheDocument();
    expect(screen.queryByText('$1.20')).not.toBeInTheDocument();
  });

  it('adds a material as one canonical quantity rule', async () => {
    grant('pricing.view', 'pricing.update_draft', 'pricing.view_cost');
    renderScreen(<PackingMaterialsSection revision={revision()} editable onChanged={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Material/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Material/), { target: { value: 'Wardrobe Box' } });
    fireEvent.change(within(dialog).getByLabelText(/Cost \(internal\)/), { target: { value: '8.00' } });
    fireEvent.change(within(dialog).getByLabelText(/Sell price/), { target: { value: '18.00' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(pricingApi.createItem).toHaveBeenCalled());
    expect(pricingApi.createItem.mock.calls[0]).toEqual([7, 'rules', expect.objectContaining({
      rule_key: 'material_wardrobe_box', rule_type: 'material', calculation_type: 'quantity', quantity_source: 'materials.wardrobe_box',
      rate_amount: '18.00', cost_rate: '8.00', tax_classification: 'taxable', lock_version: 5,
    })]);
  });
});

describe('travel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('saves the selected method with only its relevant fields', async () => {
    grant('pricing.view', 'pricing.update_draft');
    renderScreen(<TravelSection revision={revision()} editable onChanged={() => {}} />);
    fireEvent.click(screen.getByRole('radio', { name: /Round-trip mileage/ }));
    expect(screen.queryByLabelText('Travel charge')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Rate per mile/), { target: { value: '2.10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save travel' }));
    await waitFor(() => expect(pricingApi.createItem).toHaveBeenCalledWith(7, 'rules', expect.objectContaining({
      rule_type: 'travel', calculation_type: 'distance', pricing_model: 'round_trip_mileage', rate_amount: '2.10',
    })));
  });
});

describe('pricing constraints', () => {
  it('Fixed, NTE and Minimum take an amount; Range takes from / to', async () => {
    grant('pricing.view', 'pricing.update_draft');
    renderScreen(<ConstraintsEditor revision={revision()} editable onChanged={() => {}} />);
    expect(screen.getByText(/independent of whether an Estimate is Binding/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add constraint/ }));
    const dialog = await screen.findByRole('dialog');
    const type = within(dialog).getByLabelText('Type');
    for (const value of ['fixed_price', 'not_to_exceed', 'minimum']) {
      fireEvent.change(type, { target: { value } });
      expect(within(dialog).getByLabelText('Amount')).toBeInTheDocument();
    }
    fireEvent.change(type, { target: { value: 'range' } });
    expect(within(dialog).queryByLabelText('Amount')).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText('Range from')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Range to')).toBeInTheDocument();
  });
});

describe('validation is first-class', () => {
  it('counts errors and warnings and links each issue to its section', async () => {
    grant('pricing.view', 'pricing.update_draft');
    pricingApi.getRevision.mockResolvedValue(revision([{ ...material, rule_key: 'fuel', rule_type: 'fuel', name: 'Fuel' }], {
      validation: [
        { severity: 'error', code: 'CIRCULAR_PRICING_DEPENDENCY', message: 'Fuel rule depends on Grand Total.', object_type: 'rule', object_key: 'fuel' },
        { severity: 'error', code: 'RATE_MATRIX_OVERLAP', message: 'Rate matrix contains overlapping weight bands.', object_type: 'rate_table', object_key: 'weight_bands' },
        { severity: 'warning', code: 'NO_SATURDAY_RATE', message: 'Dallas has no Saturday rate.', object_type: 'revision', object_key: '' },
      ],
    }));
    renderScreen(<RevisionWorkspace revisionId={7} tariff={{ id: 1, catalog_key: 'x' }} revisions={[]} onOpenRevision={() => {}} onChanged={() => Promise.resolve()} />);
    fireEvent.click(await screen.findByRole('tab', { name: /Validation/ }));
    expect(screen.getByText('2 errors · 1 warning · 0 notes')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Go to Rule' }));
    expect(screen.getByRole('tab', { name: 'Adjustments' })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('tariff list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pricingApi.listTariffs.mockResolvedValue({ count: 1, results: [{
      id: 1, name: 'Dallas Local', catalog_key: 'dallas_local', primary_pricing_method: 'hourly', resolver_priority: 10,
      state: 'active', branch_id: 11, branch_ids: [], current_published_revision_id: 70, current_revision_number: 7,
      current_effective_start_date: '2027-03-01', latest_revision_id: 80, latest_revision_number: 8, latest_revision_state: 'draft',
      has_contract_pricing: true,
    }] });
  });

  it('shows live and latest revisions, branch, contract indicator; actions follow permissions', async () => {
    grant('pricing.view');
    renderScreen(<TariffsPage />);
    expect(await screen.findByText('Rev 7')).toBeInTheDocument();
    expect(screen.getByText(/from Mar 1, 2027/)).toBeInTheDocument();
    expect(screen.getByText('Rev 8')).toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: 'Tariffs' })).getByText('Customer / contract pricing')).toBeInTheDocument();
    expect(await within(screen.getByRole('table', { name: 'Tariffs' })).findByText('Dallas')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Clone/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument();
  });

  it('clones through export -> new Tariff -> import as draft', async () => {
    grant('pricing.view', 'pricing.create', 'pricing.update_draft');
    pricingApi.exportRevision.mockResolvedValue({ format: 'kargo-tariff/1', content: {} });
    pricingApi.createTariff.mockResolvedValue({ id: 3 });
    pricingApi.importRevision.mockResolvedValue({ id: 31 });
    renderScreen(<TariffsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Clone Dallas Local' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Clone' }));
    await waitFor(() => expect(pricingApi.importRevision).toHaveBeenCalledWith(3, { format: 'kargo-tariff/1', content: {} }));
    expect(pricingApi.exportRevision).toHaveBeenCalledWith(70);
    expect(pricingApi.createTariff).toHaveBeenCalledWith(expect.objectContaining({ catalog_key: 'dallas_local_copy', branch_id: 11 }));
  });
});
