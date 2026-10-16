import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axios';
import { updateLead, getActivities, getTasks, createSalesActivity, updateSalesActivity, createTask, updateTask, getLookupEmployeesPage, getLookupUsersPage, sendRecordSms, convertLead, getOpportunity } from './api';
vi.mock('./axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());

describe('lead detail API contracts', () => {
  it('uses dedicated assignment and unassignment, without a discarded PATCH', async () => {
    api.post.mockResolvedValue({ id: 7, assigned_employee_id: 82 });
    await updateLead(7, { assigned_employee_id: 82 });
    expect(api.post).toHaveBeenCalledWith('/tenant/leads/7/assign/', { employee_id: 82 });
    expect(api.patch).not.toHaveBeenCalled();
    api.delete.mockResolvedValue({ id: 7, assigned_employee_id: null });
    await updateLead(7, { assigned_employee_id: null });
    expect(api.delete).toHaveBeenCalledWith('/tenant/leads/7/assignment/');
  });
  it('preserves numeric move-size IDs', async () => {
    api.patch.mockResolvedValue({ id: 7, move_size_id: 8 });
    await updateLead(7, { move_size_id: 8 });
    expect(api.patch).toHaveBeenCalledWith('/tenant/leads/7/', { move_size_id: 8 });
  });
  it('uses record-scoped activity endpoints and pages their response', async () => {
    api.get.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    expect(await getActivities({ lead: 7, limit: 1, offset: 1 })).toEqual([{ id: 2 }]);
    await createSalesActivity({ lead: 7, activity_type: 'note', description: 'Called' });
    await updateSalesActivity(2, { description: 'Updated', completed_at: 'unused' }, { lead: 7 });
    expect(api.get).toHaveBeenCalledWith('/tenant/leads/7/activities/');
    expect(api.post).toHaveBeenCalledWith('/tenant/leads/7/activities/', { activity_type: 'note', description: 'Called' });
    expect(api.patch).toHaveBeenCalledWith('/tenant/leads/7/activities/2/', { description: 'Updated' });
  });
  it('maps task fields and creates the task in a single request', async () => {
    api.get.mockResolvedValue([{ id: 9, activity_id: 10, title: 'Call', assigned_to_id: 5, status: 'pending' }]);
    expect((await getTasks({ lead: 7 }))[0]).toMatchObject({ assigned_to: 5, activity_details: { id: 10, subject: 'Call' } });
    await createTask({ lead: 7, title: 'Call', assigned_to: 5, notes: '' });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/tenant/leads/7/tasks/', { title: 'Call', assigned_to_id: 5, notes: '' });
    await updateTask(9, { status: 'completed' }, { lead: 7 });
    expect(api.patch).toHaveBeenCalledWith('/tenant/leads/7/tasks/9/', { status: 'completed' });
  });
  it('keeps employee and login lookup IDs separate and normalizes labels', async () => {
    api.get.mockResolvedValue({ count: 1, results: [{ id: 82, user_id: 7, first_name: 'Ada', last_name: 'Lovelace', primary_branch_id: 3 }] });
    expect((await getLookupEmployeesPage('', 0, 20, 3)).results[0]).toMatchObject({ id: 82, label: 'Ada Lovelace' });
    expect((await getLookupUsersPage('', 0, 20, 3)).results[0]).toMatchObject({ id: 7, label: 'Ada Lovelace' });
  });
  it('sends lead SMS through the communications service', async () => {
    await sendRecordSms('lead', 7, { to: '+15551234567', body: 'Hello' });
    expect(api.post).toHaveBeenCalledWith('/tenant/leads/7/communications/sms/', { to: '+15551234567', body: 'Hello' });
  });
  it('keeps a converted opportunity number separate from its record identifier', async () => {
    api.post.mockResolvedValue({ opportunity_id: 42, opportunity_number: 'OP-0042' });
    const result = await convertLead(7, { customer_id: 321 });
    expect(result.opportunity).toEqual({ id: 42, opportunity_number: 'OP-0042' });
    expect(result.opportunity.sales_number).toBeUndefined();
  });
  it('opens the converted opportunity using tenant detail endpoints', async () => {
    api.get.mockImplementation(async (url) => url === '/tenant/opportunities/42/'
      ? { id: 42, system_state: 'open', branch_id: 3, customer_id: 321, lead_id: 7 }
      : { item: { customer_name: 'Ada', email: 'ada@example.com', phone: '555', branch_name: 'Main' }, details: {}, customer: { id: 321, profile_name: 'Ada' } });
    const record = await getOpportunity(42);
    expect(record).toMatchObject({ id: 42, lead: 7, branch: 3, customer_details: { full_name: 'Ada', email: 'ada@example.com' } });
    expect(api.get).toHaveBeenCalledWith('/tenant/opportunities/42/');
    expect(api.get).toHaveBeenCalledWith('/tenant/pipeline/opportunity/42/');
  });

});
