import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../../services/axios';
import { getTenantSalesOverview, getTenantTasks, updateTenantTask, getTenantStaff } from './salesOverviewApi';
vi.mock('../../../services/axios', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());
const lead = { id: 10, kind: 'lead', system_state: 'new', created_at: '2026-10-01T12:00:00Z' };

describe('tenant sales overview', () => {
  it('counts leads separately from opportunities and keeps date boundaries consistent', async () => {
    api.get.mockResolvedValue({ total: 4, items: [lead,
      { ...lead, id: 11, kind: 'opportunity', system_state: 'booked' },
      { ...lead, id: 12, system_state: 'lost' },
      { ...lead, id: 13, created_at: '2026-10-02T00:00:00Z' },
    ] });
    const summary = await getTenantSalesOverview({ startDate: '2026-10-01', endDate: '2026-10-02' });
    expect(summary).toMatchObject({ leadsCount: 2, wonCount: 1, lostCount: 1, unavailable: ['payments'] });
    expect(summary.dailyBreakdown).toEqual([{ date: '2026-10-01', count: 2, label: '2026-10-01', shortLabel: '10-01' }]);
    expect(api.get).toHaveBeenCalledTimes(1);
  });
  it('aggregates native tasks and filters task assignees before paging', async () => {
    api.get.mockImplementation(async (url) => url === '/tenant/pipeline/'
      ? { total: 1, items: [lead] }
      : [{ id: 1, title: 'Call', status: 'pending', assigned_to_id: 7 }, { id: 2, title: 'Done', status: 'completed', assigned_to_id: 7 }, { id: 3, title: 'Other', status: 'pending', assigned_to_id: 8 }]);
    const page = await getTenantTasks({ assigned_user: 7, status: 'pending', page_size: 1 });
    expect(page.count).toBe(1);
    expect(page.results[0]).toMatchObject({ id: 1, lead: 10, record_kind: 'lead', activity_details: { subject: 'Call' } });
  });
  it('updates a task through its parent record instead of the legacy activity route', async () => {
    await updateTenantTask({ related_type: 'opportunity', related_id: 42, task_id: 9 }, { status: 'completed' });
    expect(api.patch).toHaveBeenCalledWith('/tenant/opportunities/42/tasks/9/', { status: 'completed' });
  });
  it('does not turn denied task requests into an empty success', async () => {
    api.get.mockImplementation(async (url) => {
      if (url === '/tenant/pipeline/') return { total: 1, items: [lead] };
      throw new Error('Forbidden');
    });
    await expect(getTenantTasks()).rejects.toThrow('Forbidden');
  });
  it('keeps staff login and employee identities distinct', async () => {
    api.get.mockResolvedValue({ count: 1, results: [{ id: 82, user_id: 7, primary_branch_id: 5, first_name: 'Ada' }] });
    expect(await getTenantStaff()).toEqual([expect.objectContaining({ id: 7, employee_id: 82, branches: [5] })]);
  });
  it('keeps records usable when staff lookup permission is denied', async () => {
    api.get.mockRejectedValue({ response: { status: 403 } });
    expect(await getTenantStaff()).toEqual([]);
  });

});
