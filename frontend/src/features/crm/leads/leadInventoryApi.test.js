import { vi, it, expect, beforeEach } from 'vitest';
import api from '../../../services/axios';
import { listLeadInventory, createLeadInventoryItem, updateLeadInventoryItem, deleteLeadInventoryItem, inventorySummary, recordInventoryLeadId } from './leadInventoryApi';
import { recordTasks, createRecordTask, updateRecordTask, completeRecordTask } from './recordWorkApi';
vi.mock('../../../services/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());
it('uses canonical inventory routes and strips unsupported fields', async () => {
  await listLeadInventory(12);
  expect(api.get).toHaveBeenCalledWith('/tenant/leads/12/inventory/');
  const payload = { room_name: 'Lounge', item_name: 'Sofa', quantity: 2, weight_lbs_each: '85.00', is_fragile: true, is_special: false, notes: '' };
  await createLeadInventoryItem(12, { ...payload, volume_cuft_each: 50 });
  expect(api.post).toHaveBeenCalledWith('/tenant/leads/12/inventory/', payload);
  await updateLeadInventoryItem(12, 7, { quantity: 3, submitted_by_name: 'ignored' });
  expect(api.patch).toHaveBeenCalledWith('/tenant/leads/12/inventory/7/', { quantity: 3 });
  await deleteLeadInventoryItem(12, 7);
  expect(api.delete).toHaveBeenCalledWith('/tenant/leads/12/inventory/7/');
});
it('calculates counts, weight and handling quantities', () => {
  expect(inventorySummary([{ room_name: 'A', quantity: 2, weight_lbs_each: '85', is_fragile: true }, { room_name: 'A', quantity: 1, weight_lbs_each: '5', is_special: true }])).toEqual({ rooms: new Set(['A']), quantity: 3, weight: 175, fragile: 2, special: 1 });
});
it('resolves only canonical lead IDs', () => {
  expect(recordInventoryLeadId(true, '900', { id: 12, sales_number: 900 }, true)).toBe(12);
  expect(recordInventoryLeadId(false, '900', { id: 99, sales_number: 900, lead_id: 12 }, true)).toBe(12);
  expect(recordInventoryLeadId(true, '12', { opportunity_id: 99 })).toBe('12');
  expect(recordInventoryLeadId(false, '99', { id: 99, lead_id: 12 })).toBe(12);
  expect(recordInventoryLeadId(false, '99', { id: 99 })).toBeNull();
  expect(recordInventoryLeadId(false, '99', { id: 98, lead_id: 12 })).toBeNull();
});
it.each(['lead','opportunity'])('uses parent-scoped %s task routes', async kind => {
  const target = { [kind]: 12 }, route = `/tenant/${kind === 'lead' ? 'leads' : 'opportunities'}/12/tasks/`;
  api.get.mockResolvedValue([{ id: 7, title: 'Call', status: 'pending' }]);
  await recordTasks(target);
  expect(api.get).toHaveBeenCalledWith(route);
  const payload = { title: 'Call', notes: '', due_date: '2026-10-22T09:00:00.000Z', assigned_to_id: 7, task_type: 'call', status: 'pending' };
  await createRecordTask({ ...target, ...payload });
  expect(api.post).toHaveBeenCalledWith(route, payload);
  await updateRecordTask(7, { title: 'Email' }, target);
  expect(api.patch).toHaveBeenCalledWith(`${route}7/`, { title: 'Email' });
  await completeRecordTask(7, target);
  expect(api.post).toHaveBeenCalledWith(`${route}7/complete/`, {});
  await updateRecordTask(7, { status: 'pending', completed_at: null }, target);
  expect(api.patch).toHaveBeenLastCalledWith(`${route}7/`, { status: 'pending' });
});
