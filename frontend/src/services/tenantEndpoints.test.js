import { beforeEach, expect, it, vi } from 'vitest';
import api from './axios';
import { getBranches, getCompany, getNotifications, getUnreadNotificationsCount,
  markNotificationRead, markNotificationUnread, markAllNotificationsRead } from './api';

vi.mock('./axios', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());

it('loads company and branches through tenant routes', async () => {
  await getCompany(3);
  await getBranches();
  expect(api.get).toHaveBeenNthCalledWith(1, '/tenant/companies/3/');
  expect(api.get).toHaveBeenNthCalledWith(2, '/tenant/branches/');
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
