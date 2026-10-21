import React, { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LeadSpecs from './LeadSpecs';
const auth = vi.hoisted(() => ({ user: {}, hasPermission: () => false }));
vi.mock('../../auth/context/AuthContext', () => ({ useAuth: () => auth }));
beforeEach(() => { auth.user = {}; });
const props = {
  opportunity: { id: 2 }, isEditing: true,
  view: { isLead: true, branchName: 'Main Headquarters', assignedName: 'Current manager' },
  branches: [{ id: 1, name: 'Main Headquarters' }, { id: 2, name: 'Other Branch' }],
};
function Harness({ initialForm = {}, ...overrides }) {
  const [form, setForm] = useState({ branch: '1', ...initialForm });
  return <><LeadSpecs {...props} {...overrides} form={form} setForm={setForm} /><output data-testid="form">{JSON.stringify(form)}</output></>;
}
const currentForm = () => JSON.parse(screen.getByTestId('form').textContent);
describe('LeadSpecs dropdowns', () => {
  it('allows a lead editor to choose job size without estimate price override permission', () => {
    render(<Harness moverSizes={[{ id: 13, name: 'Two Bedrooms' }]} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Job Size' }), { target: { value: '13' } });
    expect(currentForm().move_size).toBe('13');
  });
  it('preserves the estimate permission restriction on opportunity sizes', () => {
    render(<Harness view={{ isLead: false }} moverSizes={[{ id: 13, name: 'Two Bedrooms' }]} />);
    expect(screen.queryByRole('combobox', { name: 'Job Size' })).not.toBeInTheDocument();
    expect(screen.getByText('Move size changes require permission.')).toBeInTheDocument();
  });
  it('saves the selected catalog IDs for service, type, size, status and source', () => {
    render(<Harness serviceTypes={[{ id: 11, name: 'Moving' }]} moveTypes={[{ id: 12, name: 'Local' }]}
      moverSizes={[{ id: 13, name: 'Two Bedrooms' }]} leadStatusCodes={[{ value: 14, label: 'Follow up' }]}
      referralSources={[{ id: 15, name: 'Website' }]} />);
    for (const [label, value] of [['Job Service','11'],['Job Type','12'],['Job Size','13'],['Job Status','14'],['Lead Source','15']]) {
      fireEvent.change(screen.getByRole('combobox', { name: label }), { target: { value } });
      expect(screen.getByRole('combobox', { name: label })).toHaveValue(value);
    }
    expect(currentForm()).toMatchObject({ service_type:'11', move_type:'12', move_size:'13', custom_status_code:'14', referral_source:'15' });
  });
  it('does not offer legacy text values when lead catalogs are empty', () => {
    render(<Harness />);
    for (const label of ['Job Service','Job Type','Job Size']) {
      expect(within(screen.getByRole('combobox', { name: label })).getAllByRole('option')).toHaveLength(1);
    }
  });
  it('includes active employees by primary branch and clears incompatible assignment on branch change', () => {
    render(<Harness initialForm={{ assigned_to: '20' }} users={[
      { id: 20, first_name: 'Main employee', primary_branch_id: 1, employment_status: 'active' },
      { id: 21, first_name: 'Other employee', branch_id: 2, employment_status: 'active' },
      { id: 22, first_name: 'Inactive employee', primary_branch_id: 1, employment_status: 'inactive' },
    ]} />);
    const manager = screen.getByRole('combobox', { name: 'Move Manager' });
    expect(within(manager).getByRole('option', { name: 'Main employee' })).toBeInTheDocument();
    expect(within(manager).queryByRole('option', { name: 'Inactive employee' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Target Branch' }), { target: { value: '2' } });
    expect(currentForm()).toMatchObject({ branch:'2', assigned_to:'' });
    expect(within(manager).getByRole('option', { name: 'Other employee' })).toBeInTheDocument();
    expect(within(manager).queryByRole('option', { name: 'Main employee' })).not.toBeInTheDocument();
  });
  it('keeps a manager who belongs to the new branch', () => {
    render(<Harness initialForm={{ assigned_to:'20' }} users={[{ id:20, first_name:'Shared', branches:[1,2] }]} />);
    fireEvent.change(screen.getByRole('combobox', { name:'Target Branch' }), { target:{ value:'2' } });
    expect(currentForm().assigned_to).toBe('20');
  });
  it('hides inactive choices while showing the saved inactive selection', () => {
    render(<Harness initialForm={{ service_type:'11' }} serviceTypes={[
      { id:11, name:'Retired service', is_active:false }, { id:12, name:'Other retired', is_active:false }, { id:13, name:'Active service' },
    ]} />);
    const service = screen.getByRole('combobox', { name:'Job Service' });
    expect(service).toHaveValue('11');
    expect(within(service).getByRole('option', { name:'Retired service' })).toBeDisabled();
    expect(within(service).queryByRole('option', { name:'Other retired' })).not.toBeInTheDocument();
  });
  it('preserves saved IDs while their catalog options are unavailable', () => {
    render(<Harness initialForm={{ service_type:'11', move_type:'12', move_size:'13' }} />);
    expect(screen.getByRole('combobox', { name:'Job Service' })).toHaveValue('11');
    expect(screen.getByRole('combobox', { name:'Job Type' })).toHaveValue('12');
    expect(screen.getByRole('combobox', { name:'Job Size' })).toHaveValue('13');
  });
});

it('shows move size and branch names in read mode from loaded catalogs', () => {
  render(<Harness isEditing={false} initialForm={{ move_size:13, branch:1 }}
    view={{ isLead:true }} moverSizes={[{ id:13, name:'Two Bedrooms' }]} />);
  expect(screen.getByText('Two Bedrooms')).toBeInTheDocument();
  expect(screen.getAllByText('Main Headquarters').length).toBeGreaterThan(0);
  expect(screen.queryByText('13')).not.toBeInTheDocument();
});
it('keeps object-valued move size and branch selections matched to their options', () => {
  render(<Harness initialForm={{ move_size:{ id:13, name:'Two Bedrooms' }, branch:{ id:1, name:'Main Headquarters' } }}
    moverSizes={[{ id:13, name:'Two Bedrooms' }]} />);
  expect(screen.getByRole('combobox', { name:'Job Size' })).toHaveValue('13');
  expect(screen.getByRole('combobox', { name:'Target Branch' })).toHaveValue('1');
});

it('normalizes object selections for every catalog dropdown', () => {
  render(<Harness initialForm={{ service_type: { id: 11 }, move_type: { id: 12 },
    custom_status_code: { value: 14 }, referral_source: { id: 15 }, assigned_to: { id: 20 } }}
    serviceTypes={[{ id: 11, name: 'Moving' }]} moveTypes={[{ id: 12, name: 'Local' }]}
    leadStatusCodes={[{ value: 14, label: 'Follow up' }]} referralSources={[{ id: 15, name: 'Website' }]}
    users={[{ id: 20, full_name: 'Ada', primary_branch_id: 1 }]} />);
  for (const [label, value] of [['Job Service', '11'], ['Job Type', '12'], ['Job Status', '14'], ['Lead Source', '15'], ['Move Manager', '20']]) {
    expect(screen.getByRole('combobox', { name: label })).toHaveValue(value);
  }
});

it('resolves current catalog labels ahead of stale API display names', () => {
  render(<Harness isEditing={false} initialForm={{ service_type: 11, move_type: 12 }}
    opportunity={{ id: 2, service_type_name: 'Old service', move_type_name: 'Old type' }}
    serviceTypes={[{ id: 11, name: 'Current service' }]} moveTypes={[{ id: 12, name: 'Current type' }]} />);
  expect(screen.getByText('Current service')).toBeInTheDocument();
  expect(screen.getByText('Current type')).toBeInTheDocument();
});
