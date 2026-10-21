import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import InventoryPortalPanel from './InventoryPortalPanel';
import * as api from '../../../services/api';
vi.mock('../../../services/api', () => ({ getInventoryPortal: vi.fn(), manageInventoryPortal: vi.fn(), getPortalEstimates: vi.fn() }));
afterEach(cleanup);
const data = { locked: false, items: [], photos: [], portal: null };
beforeEach(() => { vi.clearAllMocks(); api.getInventoryPortal.mockResolvedValue(data); api.manageInventoryPortal.mockResolvedValue(data); api.getPortalEstimates.mockResolvedValue([{ id: 12, estimate_number: 'EST-012' }]); });
it('issues links against the selected lead', async () => {
  render(<InventoryPortalPanel leadId={2} canEdit />);
  fireEvent.click(await screen.findByRole('button', { name: 'Create inventory link' }));
  await waitFor(() => expect(api.manageInventoryPortal).toHaveBeenCalledWith('lead', 2, 'issue', undefined));
});
it('resolves estimate inventory through the opportunity estimate selector', async () => {
  render(<InventoryPortalPanel opportunityId={9} canEdit />);
  await screen.findByRole('button', { name: 'Create inventory link' });
  expect(api.getPortalEstimates).toHaveBeenCalledWith(9);
  expect(api.getInventoryPortal).toHaveBeenCalledWith('estimate', 12);
});
it('hides management actions for viewers and shows submitted items', async () => {
  api.getInventoryPortal.mockResolvedValue({ ...data, items: [{ id: 1, room_name: 'Bedroom', item_name: 'Bed', quantity: 2, notes: 'Fragile frame' }] });
  render(<InventoryPortalPanel leadId={2} />);
  await screen.findByText('Fragile frame');
  expect(screen.queryByRole('button', { name: 'Create inventory link' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Lock inventory' })).not.toBeInTheDocument();
});
it('locks an issued portal and preserves its read-only link', async () => {
  api.getInventoryPortal.mockResolvedValue({ ...data, portal: { id: 1, url: '/portal/inventory?token=abc', expires_at: '2099-01-01' } });
  render(<InventoryPortalPanel leadId={2} canEdit />);
  fireEvent.click(await screen.findByRole('button', { name: 'Lock inventory' }));
  await waitFor(() => expect(api.manageInventoryPortal).toHaveBeenCalledWith('lead', 2, 'lock', undefined));
});
