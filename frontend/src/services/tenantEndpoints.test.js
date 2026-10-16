import { beforeEach, expect, it, vi } from 'vitest';
import api from './axios';
import { assignUserRole, createEmployee, inviteEmployee, deactivateUser, reactivateUser, updateEmployee, deleteRole, getBranches, getBranchLookups, getBranchLookupsPage, getCompany, getLookupUsers, getNotifications, getTimelineEvents, sendRecordEmail, getUnreadNotificationsCount,
  markNotificationRead, markNotificationUnread, markAllNotificationsRead } from './api';

vi.mock('./axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());

it('loads company and branches through tenant routes', async () => {
  await getCompany(3);
  await getBranches();
  expect(api.get).toHaveBeenNthCalledWith(1, '/tenant/companies/3/');
  expect(api.get).toHaveBeenNthCalledWith(2, '/tenant/branches/');
});

it('loads assignable users through the tenant user route', async () => {
  await getLookupUsers({ limit: 100 });
  expect(api.get).toHaveBeenCalledWith('/tenant/users/', { params: { limit: 100 } });
});

it('loads branch dropdown options through the tenant branch route', async () => {
  await getBranchLookups({ limit: 50 });
  await getBranchLookupsPage('north', 0, 20);
  expect(api.get).toHaveBeenNthCalledWith(1, '/tenant/branches/', { params: { limit: 50 } });
  expect(api.get).toHaveBeenNthCalledWith(2, '/tenant/branches/', {
    params: { search: 'north', offset: 0, limit: 20 },
  });
});

it('attaches tenant roles without trusting a client supplied company id', async () => {
  await assignUserRole({ user_id: 12, role_id: 4 });
  expect(api.post).toHaveBeenCalledWith('/tenant/users/assign-role/', { user_id: 12, role_id: 4 });
});

it('changes login status through the supported command endpoints', async () => {
  await deactivateUser(7);
  await reactivateUser(7);
  expect(api.post).toHaveBeenNthCalledWith(1, '/tenant/users/7/deactivate/');
  expect(api.post).toHaveBeenNthCalledWith(2, '/tenant/users/7/reactivate/');
  expect(api.patch).not.toHaveBeenCalled();
});

it('updates team member profiles through the employee endpoint', async () => {
  await updateEmployee(91, { first_name: 'Test' });
  expect(api.patch).toHaveBeenCalledWith('/tenant/employees/91/', { first_name: 'Test' });
});

it('creates an employee and sends an invitation through supported endpoints', async () => {
  api.post.mockResolvedValueOnce({ id: 91 });
  const employee = await createEmployee({ first_name: 'Test', email: 'test@example.com' });
  await inviteEmployee(employee.id, { email: 'test@example.com' });
  expect(api.post).toHaveBeenNthCalledWith(1, '/tenant/employees/', { first_name: 'Test', email: 'test@example.com' });
  expect(api.post).toHaveBeenNthCalledWith(2, '/tenant/employees/91/invite/', { email: 'test@example.com' });
});

it('deactivates custom roles through the supported role update action', async () => {
  await deleteRole(4);
  expect(api.patch).toHaveBeenCalledWith('/tenant/rbac/roles/4/', { is_active: false });
});

it('uses tenant communication routes for lead timelines and email', async () => {
  await getTimelineEvents({ entity_type: 'lead', entity_id: 4, limit: 20 });
  await sendRecordEmail('lead', 4, { to: ['lead@example.com'], subject: 'Hello' });
  expect(api.get).toHaveBeenCalledWith('/tenant/leads/4/communications/', { params: { limit: 20 } });
  expect(api.post).toHaveBeenCalledWith('/tenant/leads/4/communications/email/', {
    to: ['lead@example.com'], subject: 'Hello',
  });
});

it('unwraps notification records for the header without dropping their fields', async () => {
  const notification = { id: 7, title: 'Update', message: 'Saved', read_at: null, created_at: '2026-10-13' };
  api.get.mockResolvedValue([{ id: 7, data: notification }]);
  expect(await getNotifications({ limit: 100 })).toEqual([notification]);
  expect(api.get).toHaveBeenCalledWith('/tenant/notifications/', { params: { limit: 100 } });
});

it('uses tenant notification actions and preserves the unread count', async () => {
  api.get.mockResolvedValue({ unread: 125 });
  expect(await getUnreadNotificationsCount()).toEqual({ unread: 125 });
  expect(api.get).toHaveBeenCalledWith('/tenant/notifications/unread-count/');
  api.post.mockResolvedValue({ id: 7, data: { id: 7, read_at: 'now' } });
  expect(await markNotificationRead(7)).toEqual({ id: 7, read_at: 'now' });
  await markNotificationUnread(7);
  await markAllNotificationsRead();
  expect(api.post.mock.calls.map(([url]) => url)).toEqual([
    '/tenant/notifications/7/mark-read/', '/tenant/notifications/7/mark-unread/',
    '/tenant/notifications/mark-all-read/',
  ]);
});
