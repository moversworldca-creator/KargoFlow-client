import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { grant, renderScreen } from './harness';
import TariffEditor from '../components/TariffEditor';
import TariffsPage from '../components/TariffsPage';
import OpportunityTariffPanel from '../components/OpportunityTariffPanel';
import { StorageRatesPage } from '../components/CompanyTariffSettings';
import { changedSections, emptyConfiguration, move, newId, rowLabel, sortRowKeys } from '../tariffConfig';
import { opportunityTariffApi, storageTariffsApi, tariffsApi } from '../api';

vi.mock('../../../shared/auth/useCan', async () => {
  const { canMock } = await import('./harness');
  return { default: () => canMock() };
});
vi.mock('../../../services/api', () => ({
  getBranches: vi.fn(() => Promise.resolve([{ id: 11, name: 'Dallas' }, { id: 12, name: 'Austin' }])),
  getEntitlementSnapshot: vi.fn(() => Promise.resolve({ features: { 'crm.estimates': 'write' } })),
}));
vi.mock('../api', () => ({
  tariffsApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), updateCommon: vi.fn(), saveSection: vi.fn(), activate: vi.fn(), deactivate: vi.fn() },
  valuationTemplatesApi: { list: vi.fn(() => Promise.resolve([])) },
  storageTariffsApi: { list: vi.fn(), warehouses: vi.fn(), assign: vi.fn(), create: vi.fn(), update: vi.fn() },
  opportunityTariffApi: { get: vi.fn(), change: vi.fn(), saveMaterials: vi.fn(), rerate: vi.fn() },
  referenceApi: { opportunityTypes: vi.fn(() => Promise.resolve([{ id: 1, name: 'Local' }, { id: 3, name: 'Interstate' }])) },
}));

const tariff = (extra = {}) => ({
  id: 5, name: 'Local Moving', is_active: true, is_managed: false, lock_version: 3, volume_to_weight_ratio: '7.00',
  applies_to_all_branches: true, branch_ids: [], applies_to_all_opportunity_types: true, opportunity_type_ids: [],
  minimum_booking_amount: '150.00', minimum_weight_lbs: null, default_binding_type: 'not_set', problems: [],
  configuration: emptyConfiguration(), ...extra,
});

beforeEach(() => vi.clearAllMocks());

describe('tariff configuration helpers', () => {
  it('reports only the sections that changed, in save order', () => {
    const initial = emptyConfiguration();
    const current = { ...initial, materials: [{ id: 'box', name: 'Box' }], periods: [{ id: 'peak' }] };
    expect(changedSections(current, initial)).toEqual(['periods', 'materials']);
  });

  it('makes unique ids and orders labor rows', () => {
    expect(newId('Small Box', ['small_box'])).toBe('small_box_2');
    expect(move(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(sortRowKeys(['3:1', '2:1', '2:0'])).toEqual(['2:0', '2:1', '3:1']);
    expect(rowLabel('2:0')).toBe('2 movers, labor only');
    expect(rowLabel('3:2')).toBe('3 movers + 2 trucks');
    expect(rowLabel('2')).toBe('2 movers');
  });
});

describe('Tariff Library', () => {
  beforeEach(() => tariffsApi.list.mockResolvedValue([tariff({ applies_to_all_branches: false, branch_ids: [12] })]));

  it('lists tariffs; creating needs tariffs.manage', async () => {
    grant('tariffs.view');
    renderScreen(<TariffsPage />);
    const table = await screen.findByRole('table', { name: 'Tariffs' });
    expect(within(table).getByRole('button', { name: 'Local Moving' })).toBeInTheDocument();
    expect(await within(table).findByText('Austin')).toBeInTheDocument();
    expect(within(table).getByText('Not set')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /New Tariff/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument();
  });

  it('creates a tariff by name and opens it', async () => {
    grant('tariffs.view', 'tariffs.manage');
    tariffsApi.create.mockResolvedValue({ id: 9 });
    tariffsApi.get.mockResolvedValue(tariff({ id: 9, name: 'Weekend' }));
    renderScreen(<TariffsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /New Tariff/ }));
    fireEvent.change(within(screen.getByRole('dialog')).getByLabelText(/Tariff Name/), { target: { value: ' Weekend ' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(tariffsApi.create).toHaveBeenCalledWith({ name: 'Weekend' }));
    expect(await screen.findByRole('heading', { name: /Weekend/ })).toBeInTheDocument();
  });
});

describe('Tariff editor', () => {
  it('shows the SmartMoving navigation groups', async () => {
    grant('tariffs.view');
    tariffsApi.get.mockResolvedValue(tariff());
    renderScreen(<TariffEditor tariffId={5} onBack={() => {}} />);
    const nav = await screen.findByRole('navigation', { name: 'Tariff sections' });
    for (const name of ['Common', 'Periods', 'Hourly Moving Rates', 'Materials', 'Packing Rates', 'Distance Rates',
      'Trip and Travel Fees', 'Fuel Surcharge', 'Shuttle Fees', 'Additional Services', 'Bulky Items', 'Storage In Transit',
      'Valuation', 'Not To Exceed Defaults', 'Pricing Method Defaults', 'Auto-Pricing Rules', 'Auto-Pricing Engine']) {
      expect(within(nav).getByRole('button', { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: /Save Changes/ })).not.toBeInTheDocument();   // view only
    expect(screen.getByLabelText(/Tariff Name/)).toBeDisabled();
  });

  it('saves Common then each changed screen, carrying the lock version', async () => {
    grant('tariffs.view', 'tariffs.manage');
    tariffsApi.get.mockResolvedValue(tariff());
    tariffsApi.updateCommon.mockResolvedValue(tariff({ lock_version: 4, minimum_booking_amount: '200.00' }));
    tariffsApi.saveSection.mockImplementation((id, section, value, lock) => Promise.resolve(
      tariff({ lock_version: lock + 1, configuration: { ...emptyConfiguration(), [section]: value } })));
    renderScreen(<TariffEditor tariffId={5} onBack={() => {}} />);
    fireEvent.change(await screen.findByLabelText('Minimum Booking Amount'), { target: { value: '200' } });
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Tariff sections' })).getByRole('button', { name: 'Materials' }));
    fireEvent.click(screen.getByRole('button', { name: /Add Material/ }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'Small Box' } });
    fireEvent.click(within(dialog).getByLabelText(/Is Container/));
    fireEvent.change(within(dialog).getByLabelText(/CP code/), { target: { value: 'sm1' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }));
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));
    await waitFor(() => expect(tariffsApi.saveSection).toHaveBeenCalled());
    expect(tariffsApi.updateCommon).toHaveBeenCalledWith(5, { minimum_booking_amount: '200', lock_version: 3 });
    const [, section, value, lock] = tariffsApi.saveSection.mock.calls[0];
    expect([section, lock]).toEqual(['materials', 4]);
    expect(value[0]).toMatchObject({ id: 'small_box', name: 'Small Box', is_container: true, cp_code: 'SM1' });
    expect(await screen.findByText('Tariff saved.')).toBeInTheDocument();
  });

  it('a concurrent save is reported with a reload, not overwritten', async () => {
    grant('tariffs.view', 'tariffs.manage');
    tariffsApi.get.mockResolvedValue(tariff());
    tariffsApi.updateCommon.mockRejectedValue({ response: { status: 409, data: { code: 'STALE_VERSION', detail: 'x' } } });
    renderScreen(<TariffEditor tariffId={5} onBack={() => {}} />);
    fireEvent.change(await screen.findByLabelText('Minimum Booking Amount'), { target: { value: '200' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));
    expect(await screen.findByText(/Someone else saved this tariff first/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload tariff' })).toBeInTheDocument();
  });

  it('shows backend validation problems on their screen', async () => {
    grant('tariffs.view', 'tariffs.manage');
    tariffsApi.get.mockResolvedValue(tariff());
    tariffsApi.saveSection.mockRejectedValue({ response: { status: 422, data: { code: 'INVALID_TARIFF', detail: '1 problem',
      errors: [{ path: 'periods.[0].date_ranges', message: 'Add a date range or a single date.' }] } } });
    renderScreen(<TariffEditor tariffId={5} onBack={() => {}} />);
    fireEvent.click(within(await screen.findByRole('navigation', { name: 'Tariff sections' })).getByRole('button', { name: 'Periods' }));
    fireEvent.click(screen.getByRole('button', { name: /Add Period/ }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Name/), { target: { value: 'Peak' } });
    fireEvent.change(within(dialog).getByLabelText(/^From/), { target: { value: '2027-06-01' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }));
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));
    expect(await screen.findByText(/Add a date range or a single date/)).toBeInTheDocument();
    expect(tariffsApi.saveSection.mock.calls[0][2]).toEqual([{ id: 'peak', name: 'Peak', is_enabled: true, date_ranges: [{ start: '2027-06-01', end: '2027-06-01' }] }]);
  });

  it('a managed tariff allows only eligibility, minimums and valuation', async () => {
    grant('tariffs.view', 'tariffs.manage');
    tariffsApi.get.mockResolvedValue(tariff({ is_managed: true }));
    renderScreen(<TariffEditor tariffId={5} onBack={() => {}} />);
    expect(await screen.findByText(/Managed tariff: its rates come from an authorized template/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tariff Name/)).toBeDisabled();
    expect(screen.getByLabelText('Minimum Booking Amount')).not.toBeDisabled();
    expect(screen.getByLabelText(/Minimum Weight/)).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Tariff sections' })).getByRole('button', { name: 'Materials' }));
    expect(screen.queryByRole('button', { name: /Add Material/ })).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Tariff sections' })).getByRole('button', { name: 'Valuation' }));
    expect(screen.getByRole('button', { name: /Add Option/ })).toBeInTheDocument();
  });

  it('hourly moving rows are crew + truck combinations with weekday rates', async () => {
    grant('tariffs.view', 'tariffs.manage');
    tariffsApi.get.mockResolvedValue(tariff({ configuration: { ...emptyConfiguration(), hourly_moving: { is_enabled: true, vary_by_trucks: true, periods: {} } } }));
    tariffsApi.saveSection.mockImplementation((id, section, value, lock) => Promise.resolve(tariff({ lock_version: lock + 1, configuration: { ...emptyConfiguration(), [section]: value } })));
    renderScreen(<TariffEditor tariffId={5} onBack={() => {}} />);
    fireEvent.click(within(await screen.findByRole('navigation', { name: 'Tariff sections' })).getByRole('button', { name: 'Hourly Moving Rates' }));
    fireEvent.change(screen.getByLabelText('Crew size'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Trucks'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /Add row/ }));
    fireEvent.change(screen.getByLabelText('3 movers + 2 trucks hourly rate Sat'), { target: { value: '280' } });
    fireEvent.change(screen.getByLabelText('Minimum hours Sat'), { target: { value: '4' } });
    expect(screen.getByText(/complete hourly rate for that combination/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));
    await waitFor(() => expect(tariffsApi.saveSection).toHaveBeenCalled());
    expect(tariffsApi.saveSection.mock.calls[0][2].periods.default).toMatchObject({ minimum_hours: { sat: '4' }, hourly: { '3:2': { sat: '280' } } });
  });

  it('adding a distance band inserts an empty column without shifting rates', async () => {
    grant('tariffs.view', 'tariffs.manage');
    const rate = { id: 'ld', name: 'LD', rate_type: 'weight_cwt', breakpoints: false, mileage_bands: ['0'], size_bands: ['0', '5000'], periods: { default: [['90', '70']] } };
    tariffsApi.get.mockResolvedValue(tariff({ configuration: { ...emptyConfiguration(), distance_rates: [rate] } }));
    tariffsApi.saveSection.mockImplementation((id, section, value, lock) => Promise.resolve(tariff({ lock_version: lock + 1, configuration: { ...emptyConfiguration(), [section]: value } })));
    renderScreen(<TariffEditor tariffId={5} onBack={() => {}} />);
    fireEvent.click(within(await screen.findByRole('navigation', { name: 'Tariff sections' })).getByRole('button', { name: 'Distance Rates' }));
    fireEvent.change(screen.getByLabelText(/Add to Weight bands/), { target: { value: '2000' } });
    fireEvent.click(screen.getAllByRole('button', { name: /^Add$/ })[1]);
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));
    await waitFor(() => expect(tariffsApi.saveSection).toHaveBeenCalled());
    expect(tariffsApi.saveSection.mock.calls[0][2][0]).toMatchObject({ size_bands: ['0', '2000', '5000'], periods: { default: [['90', null, '70']] } });
  });

  it('fees take the method and its amounts per period', async () => {
    grant('tariffs.view', 'tariffs.manage');
    tariffsApi.get.mockResolvedValue(tariff());
    tariffsApi.saveSection.mockImplementation((id, section, value, lock) => Promise.resolve(tariff({ lock_version: lock + 1, configuration: { ...emptyConfiguration(), [section]: value } })));
    renderScreen(<TariffEditor tariffId={5} onBack={() => {}} />);
    fireEvent.click(within(await screen.findByRole('navigation', { name: 'Tariff sections' })).getByRole('button', { name: 'Trip and Travel Fees' }));
    fireEvent.click(screen.getByRole('button', { name: /Add Fee/ }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox', { name: /^Name/ }), { target: { value: 'Travel' } });
    fireEvent.change(within(dialog).getByLabelText('Pricing method'), { target: { value: 'per_mile' } });
    fireEvent.change(within(dialog).getByLabelText('Default Included miles'), { target: { value: '20' } });
    fireEvent.change(within(dialog).getByLabelText('Default Cost per mile'), { target: { value: '2.5' } });
    fireEvent.click(within(dialog).getByLabelText('Bill per truck'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }));
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));
    await waitFor(() => expect(tariffsApi.saveSection).toHaveBeenCalled());
    expect(tariffsApi.saveSection.mock.calls[0].slice(1, 3)).toEqual(['trip_travel', [expect.objectContaining({
      id: 'travel', method: 'per_mile', route_basis: 'portion', billing: 'overage', bill_per_truck: true,
      periods: { default: { included_miles: '20', rate: '2.5' } } })]]);
  });
});

describe('Storage Rates', () => {
  it('assigns one storage tariff per warehouse', async () => {
    grant('tariffs.view', 'tariffs.manage');
    storageTariffsApi.list.mockResolvedValue([{ id: 1, name: 'Main', sit_method: 'cwt', sit_rate: '4.50', permanent_method: 'container', permanent_rate: null,
      handling_method: 'hour', handling_rate: '120.0000', valuation_method: 'flat', valuation_rate: null, is_active: true, lock_version: 1 }]);
    storageTariffsApi.warehouses.mockResolvedValue([{ id: 7, name: 'North Warehouse', code: 'N1', storage_tariff_id: null }]);
    storageTariffsApi.assign.mockResolvedValue([]);
    renderScreen(<StorageRatesPage />);
    expect(await screen.findByText('By Hour · $120.00')).toBeInTheDocument();
    fireEvent.change(await screen.findByLabelText('Storage tariff for North Warehouse'), { target: { value: '1' } });
    await waitFor(() => expect(storageTariffsApi.assign).toHaveBeenCalledWith(7, 1));
  });
});

describe('Opportunity tariff', () => {
  const state = (extra = {}) => ({
    opportunity_id: 40, tariff_id: 5, inventory_out_of_sync: false,
    tariff: { id: 5, name: 'Local Moving', is_managed: false, is_active: true, default_binding_type: 'not_set', minimum_booking_amount: '150.00',
      materials: [{ id: 'box', name: 'Small Box', is_container: true, unit_price: '3.75' }, { id: 'tape', name: 'Tape', is_container: false, unit_price: '6.00' }] },
    materials: [{ id: 1, material_key: 'box', material_name: 'Small Box', quantity: '10.00', pack_quantity: '0.00', unpack_quantity: '0.00', unit_price: '3.75', out_of_sync: false, line_total: '37.50' }],
    eligible_tariffs: [{ id: 5, name: 'Local Moving', is_managed: false }, { id: 6, name: 'Managed LD', is_managed: true }],
    ...extra,
  });

  it('shows backend totals and flags out-of-sync materials', async () => {
    grant('opportunities.view');
    opportunityTariffApi.get.mockResolvedValue(state({ inventory_out_of_sync: true,
      materials: [{ ...state().materials[0] }, { id: 2, material_key: '', material_name: 'Bubble Wrap', quantity: '2.00', pack_quantity: '0', unpack_quantity: '0', unit_price: null, out_of_sync: true, line_total: null }] }));
    renderScreen(<OpportunityTariffPanel opportunityId={40} />);
    expect(await screen.findByText('$37.50')).toBeInTheDocument();
    expect(screen.getByText('Inventory Out of Sync')).toBeInTheDocument();
    expect(screen.getByText(/Out of sync/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Change tariff' })).not.toBeInTheDocument();   // no opportunities.update
  });

  it('changes the tariff after confirming and saves materials picked from the tariff', async () => {
    grant('opportunities.view', 'opportunities.update');
    const withTape = state({ materials: [...state().materials, { id: 2, material_key: 'tape', material_name: 'Tape', quantity: '3.00',
      pack_quantity: '0.00', unpack_quantity: '0.00', unit_price: '6.00', out_of_sync: false, line_total: '18.00' }] });
    opportunityTariffApi.get.mockResolvedValueOnce(state()).mockResolvedValue(withTape);
    opportunityTariffApi.change.mockResolvedValue(state({ tariff_id: 6 }));
    opportunityTariffApi.saveMaterials.mockResolvedValue(state());
    renderScreen(<OpportunityTariffPanel opportunityId={40} />);
    fireEvent.change(await screen.findByLabelText('Add material'), { target: { value: 'tape' } });
    fireEvent.change(screen.getByLabelText('Tape quantity'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /Save materials/ }));
    await waitFor(() => expect(opportunityTariffApi.saveMaterials).toHaveBeenCalledWith(40, [
      { material_key: 'box', material_name: 'Small Box', quantity: '10.00', pack_quantity: '0.00', unpack_quantity: '0.00' },
      { material_key: 'tape', material_name: 'Tape', quantity: '3', pack_quantity: '0', unpack_quantity: '0' }]));
    expect(await screen.findByText('$18.00')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Tariff'), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change tariff' }));
    expect(within(screen.getByRole('dialog')).getByText(/A managed tariff never moves materials automatically/)).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Change tariff' }));
    await waitFor(() => expect(opportunityTariffApi.change).toHaveBeenCalledWith(40, 6));
  });
});
