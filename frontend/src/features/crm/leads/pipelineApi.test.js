import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../../services/axios';
import { getPipelineQueue } from './pipelineApi';
vi.mock('../../../services/axios', () => ({ default: { get: vi.fn() } }));
const item = (id, fields = {}) => ({ id, kind: 'lead', system_state: 'new', created_at: '2026-10-01T10:00:00Z', lead_cost: '10', ...fields });
beforeEach(() => vi.resetAllMocks());

describe('pipeline contract', () => {
  it('resolves login IDs to employee IDs and forwards branch scope', async () => {
    api.get.mockImplementation(async (url) => url === '/tenant/employees/'
      ? { count: 1, results: [{ id: 82, user_id: 7 }] } : { total: 1, items: [item(1)] });
    await getPipelineQueue({ branch: 5, assigned_user: 7 });
    expect(api.get).toHaveBeenLastCalledWith('/tenant/pipeline/', { params: expect.objectContaining({ branch_id: 5, assigned_employee_id: 82 }) });
  });
  it('filters tab membership and sorts before pagination, with matching totals', async () => {
    api.get.mockResolvedValue({ total: 5, items: [
      item(1), item(2, { assigned_employee_id: 7, estimated_amount: 10 }),
      item(3, { kind: 'opportunity', system_state: 'booked' }),
      item(4, { kind: 'opportunity', system_state: 'quoted', estimated_amount: '90' }),
      item(5, { kind: 'opportunity', system_state: 'lost' }),
    ] });
    const page = await getPipelineQueue({ exclude_unassigned_leads: true, opp_exclude_status: 'booked,lost', ordering: '-lead_cost', page_size: 1 });
    expect(page.count).toBe(2);
    expect(page.results[0].id).toBe(4);
    expect(page.summary.value_total).toBe(100);
    expect(page.summary.new_count).toBe(1);
    expect(page.total_pages).toBe(2);
  });
  it('walks all backend pages without clamping requested report sizes', async () => {
    api.get.mockImplementation(async (_url, { params }) => ({ total: 205,
      items: Array.from({ length: params.offset ? 5 : 200 }, (_, i) => item(params.offset + i)) }));
    const page = await getPipelineQueue({ limit: 500 });
    expect(page.results).toHaveLength(205);
    expect(api.get).toHaveBeenCalledTimes(2);
  });
  it('respects inclusive table dates and exclusive dashboard end dates', async () => {
    api.get.mockResolvedValue({ total: 3, items: [item(1), item(2, { created_at: '2026-10-02T00:00:00Z' }), item(3, { created_at: null })] });
    const params = { date_field: 'created_at', startDate: '2026-10-01', endDate: '2026-10-02' };
    expect((await getPipelineQueue(params)).count).toBe(2);
    expect((await getPipelineQueue({ ...params, endExclusive: true })).count).toBe(1);
  });
  it('does not include leads in booked-opportunity queries', async () => {
    api.get.mockResolvedValue({ total: 3, items: [item(1), item(2, { kind: 'opportunity', system_state: 'booked' }), item(3, { kind: 'opportunity', system_state: 'lost' })] });
    expect((await getPipelineQueue({ opp_status: 'booked' })).results.map((row) => row.id)).toEqual([2]);
  });
  it('propagates failed pages instead of returning partial totals', async () => {
    api.get.mockRejectedValue(new Error('Unavailable'));
    await expect(getPipelineQueue()).rejects.toThrow('Unavailable');
  });
  it('applies custom catalog status independently of booked tab membership', async () => {
    api.get.mockResolvedValue({ total: 3, items: [
      item(1, { kind: 'opportunity', system_state: 'booked', custom_status_code_id: 9 }),
      item(2, { kind: 'opportunity', system_state: 'booked', custom_status_code_id: 10 }),
      item(3, { kind: 'opportunity', system_state: 'lost', custom_status_code_id: 9 }),
    ] });
    const page = await getPipelineQueue({ row_type: 'opportunity', opp_status: 'booked', custom_status_code: '9' });
    expect(page.results.map((row) => row.id)).toEqual([1]);
  });

});
