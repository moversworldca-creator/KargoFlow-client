import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { canMock, grant, renderScreen } from './harness';
import TariffParityEditor from '../components/TariffParityEditor';
import { pricingApi } from '../api';

vi.mock('../../../shared/auth/useCan', async () => {
  const { canMock: mock } = await import('./harness');
  return { default: () => mock() };
});

vi.mock('../../../services/api', () => ({
  getBranches: vi.fn(() => Promise.resolve([{ id: 11, name: 'Main Branch' }, { id: 12, name: 'West Branch' }])),
  getServiceTypes: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../api', () => ({
  pricingApi: {
    getRevision: vi.fn(),
    updateRevision: vi.fn(() => Promise.resolve({ id: 7, lock_version: 5 })),
    updateTariff: vi.fn(() => Promise.resolve({ id: 1, lock_version: 3 })),
    createRevision: vi.fn(() => Promise.resolve({ id: 8 })),
    listSkills: vi.fn(() => Promise.resolve([])),
  },
  newIdempotencyKey: () => 'test_idempotency_key',
}));

const mockTariff = {
  id: 1,
  catalog_key: 'local_residential',
  name: 'Local Residential Tariff',
  description: 'Standard local household goods moving tariff.',
  state: 'active',
  resolver_priority: 10,
  branch_ids: [11],
  lock_version: 2,
};

const mockRevision = {
  id: 7,
  catalog_id: 1,
  revision_number: 1,
  state: 'draft',
  lock_version: 4,
  currency: 'USD',
  rounding_method: 'half_up',
  line_rounding_scale: 2,
  total_rounding_scale: 2,
  effective_start_date: '2026-11-01',
  validation: [],
  configuration: {
    common: {
      volume_to_weight_ratio: '7.00',
      applies_to_opportunity_types: 'all',
      minimum_booking_amount: '150.00',
      default_binding_type: 'not_set',
    },
    periods: [
      { id: 'default', name: 'Default (All Dates)', is_default: true, is_active: true, priority: 1 },
    ],
    materials: [
      {
        id: 'mat_box_sm',
        name: 'Small Box (1.5 cu ft)',
        unit_price: '3.50',
        cost: '1.20',
        pack_time_minutes: '5',
        unpack_time_minutes: '3',
        editable_rate: true,
        is_container: true,
        cp_code: 'SM1',
        pbo_code: 'SM0',
        container_volume_cuft: '1.5',
        container_weight_lbs: '40',
      },
    ],
    hourly_moving: {
      is_enabled: true,
      pricing_model: 'hourly',
      vary_by_trucks: true,
      minimum_hours: { mon: '3', tue: '3', wed: '3', thu: '3', fri: '3', sat: '4', sun: '4' },
      additional_mover_rate: '45.00',
      additional_truck_rate: '50.00',
      rates: {
        default: {
          '1_truck': {
            '2': { mon: '150.00', tue: '150.00', wed: '150.00', thu: '150.00', fri: '165.00', sat: '180.00', sun: '180.00' },
          },
        },
      },
    },
  },
};

describe('TariffParityEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    grant('pricing.view', 'pricing.update_draft', 'pricing.create');
  });

  it('T01: renders Common settings with volume-weight ratio, default factor 7.00, and binding types', async () => {
    renderScreen(
      <TariffParityEditor
        tariff={mockTariff}
        revision={mockRevision}
        revisions={[mockRevision]}
        onBack={vi.fn()}
        onOpenRevision={vi.fn()}
      />
    );

    // Common section is default active
    expect(await screen.findByRole('heading', { name: 'Common Settings' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Volume to Weight Ratio/)).toHaveValue(7.0);
    expect(screen.getByText(/industry standard density factor is/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Default Binding Type/)).toHaveValue('not_set');
    expect(screen.getByText(/defaults newly created opportunities to Non-Binding/)).toBeInTheDocument();
  });

  it('T02: switches to Periods section and explains first-match priority', async () => {
    renderScreen(
      <TariffParityEditor
        tariff={mockTariff}
        revision={mockRevision}
        revisions={[mockRevision]}
        onBack={vi.fn()}
        onOpenRevision={vi.fn()}
      />
    );

    // Switch to Periods
    fireEvent.click(screen.getByRole('button', { name: /Periods/ }));
    expect(await screen.findByRole('heading', { name: 'Pricing Periods' })).toBeInTheDocument();
    expect(screen.getByText('Default (All Dates)')).toBeInTheDocument();
    expect(screen.getByText(/First-match priority rule:/i)).toBeInTheDocument();
  });

  it('T03 & T04: displays Hourly Moving matrix with weekday columns and truck count views', async () => {
    renderScreen(
      <TariffParityEditor
        tariff={mockTariff}
        revision={mockRevision}
        revisions={[mockRevision]}
        onBack={vi.fn()}
        onOpenRevision={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Hourly Moving Rates/ }));
    expect(await screen.findByRole('heading', { name: 'Hourly Moving Rates' })).toBeInTheDocument();
    expect(screen.getByText(/Minimum Hours by Weekday/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 Truck' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Labor Only/ })).toBeInTheDocument();
  });

  it('T05: displays Auto-Pricing Engine with maximum hours and non-labor exception', async () => {
    renderScreen(
      <TariffParityEditor
        tariff={mockTariff}
        revision={mockRevision}
        revisions={[mockRevision]}
        onBack={vi.fn()}
        onOpenRevision={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Auto-Pricing Engine/ }));
    expect(await screen.findByRole('heading', { name: 'Auto-Pricing Engine' })).toBeInTheDocument();
    expect(screen.getByText(/Non-Labor Time Rule/)).toBeInTheDocument();
    expect(screen.getByText(/Maximum Hours Per Job/)).toBeInTheDocument();
    expect(screen.getByText(/Crew Ability & Handling Speed/)).toBeInTheDocument();
  });

  it('T06: displays Materials with container toggle and CP/PBO 3-digit short codes', async () => {
    renderScreen(
      <TariffParityEditor
        tariff={mockTariff}
        revision={mockRevision}
        revisions={[mockRevision]}
        onBack={vi.fn()}
        onOpenRevision={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /^Materials$/ }));
    expect(await screen.findByRole('heading', { name: 'Materials & Packing Supplies' })).toBeInTheDocument();
    expect(screen.getByText('Small Box (1.5 cu ft)')).toBeInTheDocument();
    expect(screen.getByText(/SM1 \/ SM0/)).toBeInTheDocument();
  });

  it('T07: displays Packing Rates with Pack By Container option restricted to container items', async () => {
    renderScreen(
      <TariffParityEditor
        tariff={mockTariff}
        revision={mockRevision}
        revisions={[mockRevision]}
        onBack={vi.fn()}
        onOpenRevision={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Packing Rates/ }));
    expect(await screen.findByRole('heading', { name: 'Packing Rates' })).toBeInTheDocument();
    expect(screen.getByText('Pack By Container')).toBeInTheDocument();
    expect(screen.getByText('Hundredweight (CWT)')).toBeInTheDocument();
  });

  it('T08: displays Distance Rates matrix schedule with scaling', async () => {
    renderScreen(
      <TariffParityEditor
        tariff={mockTariff}
        revision={mockRevision}
        revisions={[mockRevision]}
        onBack={vi.fn()}
        onOpenRevision={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Distance Rates/ }));
    expect(await screen.findByRole('heading', { name: 'Distance Rates' })).toBeInTheDocument();
    expect(screen.getByText('Standard Distance Schedule')).toBeInTheDocument();
    expect(screen.getByText(/Auto-Scale Rates:/)).toBeInTheDocument();
  });

  it.each([
    ['Trip and Travel Fees', 'trip_and_travel'],
    ['Fuel Surcharge', 'fuel_surcharges'],
    ['Shuttle Fees', 'shuttle_fees'],
    ['Additional Services', 'additional_services'],
    ['Storage In Transit', 'storage_in_transit'],
  ])('opens %s and saves fees under the correct configuration key', async (title, key) => {
    renderScreen(
      <TariffParityEditor tariff={mockTariff} revision={mockRevision}
        revisions={[mockRevision]} onBack={vi.fn()} onOpenRevision={vi.fn()} />
    );
    fireEvent.click(screen.getByRole('button', { name: title.replace(' and ', ' & ') }));
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Add / }));
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));
    await waitFor(() => expect(pricingApi.updateRevision).toHaveBeenCalled());
    const configuration = pricingApi.updateRevision.mock.calls[0][1].configuration;
    const added = configuration[key].at(-1);
    expect(added.name).toMatch(/^New /);
    expect(added.calculation_method).toBe(key === 'fuel_surcharges' ? 'percentage' : 'flat_fee');
    expect(configuration).not.toHaveProperty('undefined');
  });

  it('T11: displays Bulky Items with category grouping and independent fee notice', async () => {
    renderScreen(
      <TariffParityEditor
        tariff={mockTariff}
        revision={mockRevision}
        revisions={[mockRevision]}
        onBack={vi.fn()}
        onOpenRevision={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Bulky Items/ }));
    expect(await screen.findByRole('heading', { name: 'Bulky Items' })).toBeInTheDocument();
    expect(screen.getByText(/Independent Item Pricing/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Manage Categories/ })).toBeInTheDocument();
  });

  it('T12: displays Valuation with RVP rate, zero customer charge, and Full Value options', async () => {
    renderScreen(
      <TariffParityEditor
        tariff={mockTariff}
        revision={mockRevision}
        revisions={[mockRevision]}
        onBack={vi.fn()}
        onOpenRevision={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Valuation/ }));
    expect(await screen.findByRole('heading', { name: 'Protection & Valuation' })).toBeInTheDocument();
    expect(screen.getByText(/Carrier Liability Notice/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('0.00 (Mandatory No-Charge)')).toBeInTheDocument();
  });

  it('T13: displays Not To Exceed and Auto-Pricing rules with ALWAYS/ANY/ALL logic', async () => {
    renderScreen(
      <TariffParityEditor
        tariff={mockTariff}
        revision={mockRevision}
        revisions={[mockRevision]}
        onBack={vi.fn()}
        onOpenRevision={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Not To Exceed Defaults/ }));
    expect(await screen.findByRole('heading', { name: 'Defaults & Auto-Pricing Rules' })).toBeInTheDocument();
    expect(screen.getByText(/Downstream Override Notice/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Auto-Pricing Rules/ }));
    expect(await screen.findByText(/California Double Drive Time/)).toBeInTheDocument();
  });

  it('saves changes to backend revision with lock_version', async () => {
    renderScreen(
      <TariffParityEditor
        tariff={mockTariff}
        revision={mockRevision}
        revisions={[mockRevision]}
        onBack={vi.fn()}
        onOpenRevision={vi.fn()}
      />
    );

    // Modify volume to weight ratio
    const vwrInput = screen.getByLabelText(/Volume to Weight Ratio/);
    fireEvent.change(vwrInput, { target: { value: '8.50' } });

    // Save button should become enabled
    const saveButton = screen.getByRole('button', { name: /Save Changes/ });
    expect(saveButton).toBeEnabled();

    fireEvent.click(saveButton);

    await waitFor(() => expect(pricingApi.updateRevision).toHaveBeenCalled());
    const [revId, payload] = pricingApi.updateRevision.mock.calls[0];
    expect(revId).toBe(7);
    expect(payload.lock_version).toBe(4);
    expect(payload.configuration.common.volume_to_weight_ratio).toBe('8.50');
  });

  it('renders read-only mode with Create Draft button when viewing published revision', async () => {
    const publishedRev = { ...mockRevision, state: 'published' };
    renderScreen(
      <TariffParityEditor
        tariff={mockTariff}
        revision={publishedRev}
        revisions={[publishedRev]}
        onBack={vi.fn()}
        onOpenRevision={vi.fn()}
      />
    );

    expect(await screen.findByText(/Revision 1 is Published and read-only/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Draft to Edit/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save Changes/ })).not.toBeInTheDocument();
  });
});
