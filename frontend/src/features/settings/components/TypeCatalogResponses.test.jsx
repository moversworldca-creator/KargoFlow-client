import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import api from '../../../services/axios';
import MoverTypeSettings from './MoverTypeSettings';
import ServiceTypeSettings from './ServiceTypeSettings';
import { getMoveTypeLookups, getServices, getServiceTypes } from '../../../services/api';
vi.mock('../../../services/axios', () => ({ default: { get:vi.fn(), post:vi.fn(), patch:vi.fn(), delete:vi.fn() } }));
beforeEach(() => vi.resetAllMocks());
for (const [Component, path, name, empty] of [
  [MoverTypeSettings, '/tenant/move-types/', 'Local move', 'No mover types found.'],
  [ServiceTypeSettings, '/tenant/service-types/', 'Packing service', 'No service types found.'],
]) {
  it(`renders ${name} and status from the actual wrapped list/update response`, async () => {
    api.get.mockResolvedValue([{ id:7, data:{ id:7, name, description:'Catalog description', is_active:true } }]);
    api.patch.mockResolvedValue({ id:7, data:{ id:7, name, description:'Catalog description', is_active:false } });
    render(<Component />);
    expect(await screen.findByText(name)).toBeInTheDocument();
    expect(screen.getByText('Catalog description')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name:`Deactivate ${name}` }));
    expect(await screen.findByRole('button', { name:`Activate ${name}` })).toBeInTheDocument();
    expect(api.patch).toHaveBeenCalledWith(`${path}7/`, { is_active:false });
    expect(screen.getByText(name)).toBeInTheDocument();
  });
  it(`shows the ${name} name immediately after creation`, async () => {
    api.get.mockResolvedValue([]);
    api.post.mockResolvedValue({ id:7, data:{ id:7, name, description:'New description', is_active:true } });
    render(<Component branchId={1} />);
    await screen.findByText(empty);
    fireEvent.click(screen.getByRole('button', { name:/add type/i }));
    fireEvent.change(screen.getByLabelText('Type Name*'), { target:{ value:name } });
    fireEvent.click(screen.getByRole('button', { name:'Create Type' }));
    expect(await screen.findByText(name)).toBeInTheDocument();
    expect(screen.getByText('New description')).toBeInTheDocument();
    expect(screen.getByRole('button', { name:`Deactivate ${name}` })).toBeInTheDocument();
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(path, expect.objectContaining({ name, branch_id:1 })));
  });
}
it('normalizes lookup lists and paginated service lists while preserving IDs and counts', async () => {
  api.get.mockResolvedValueOnce([{ id:7, data:{ name:'Local' } }])
    .mockResolvedValueOnce([{ id:8, data:{ name:'Packing' } }])
    .mockResolvedValueOnce({ count:1, results:[{ id:8, data:{ name:'Packing' } }] });
  expect(await getMoveTypeLookups()).toEqual([{ id:7, name:'Local' }]);
  expect(await getServices()).toEqual([{ id:8, name:'Packing' }]);
  expect(await getServiceTypes()).toEqual({ count:1, results:[{ id:8, name:'Packing' }] });
});

it('normalizes move sizes for settings and lead dropdowns after listing, creating and updating', async () => {
  const { getMoverSizes, getMoverSizeLookups, createMoverSize, updateMoverSize } = await import('../../../services/api');
  const row = { id:4, data:{ name:'Two Bedrooms', is_active:true } };
  api.get.mockResolvedValue([row]); api.post.mockResolvedValue(row); api.patch.mockResolvedValue(row);
  expect(await getMoverSizes()).toEqual([{ id:4, name:'Two Bedrooms', is_active:true }]);
  expect(await getMoverSizeLookups()).toEqual([{ id:4, name:'Two Bedrooms', is_active:true }]);
  expect(await createMoverSize({ name:'Two Bedrooms' })).toMatchObject({ id:4, name:'Two Bedrooms' });
  expect(await updateMoverSize(4, { name:'Two Bedrooms' })).toMatchObject({ id:4, name:'Two Bedrooms' });
});
it('searches and pages full branch lists without offering inactive branches', async () => {
  const { getBranchLookupsPage } = await import('../../../services/api');
  api.get.mockResolvedValue([
    { id:1, name:'North Headquarters', is_active:true },
    { id:2, name:'South Headquarters', is_active:true },
    { id:3, name:'Retired Headquarters', is_active:false },
    { id:4, name:'Depot', is_active:true },
  ]);
  expect(await getBranchLookupsPage('headquarters',0,1)).toEqual({ count:2, results:[{ id:1, name:'North Headquarters', is_active:true }], hasMore:true });
  expect(await getBranchLookupsPage('headquarters',1,1)).toEqual({ count:2, results:[{ id:2, name:'South Headquarters', is_active:true }], hasMore:false });
  expect(await getBranchLookupsPage('missing',0,20)).toEqual({ count:0, results:[], hasMore:false });
});
