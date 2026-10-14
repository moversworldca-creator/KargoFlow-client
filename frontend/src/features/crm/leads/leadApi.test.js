import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../../services/axios';
import { leadApi, leadPayload } from './leadApi';
import { getPipelineQueue } from './pipelineApi';

vi.mock('../../../services/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

beforeEach(() => vi.clearAllMocks());

describe('lead API contract', () => {
  it('maps a lead form to backend fields without sending lifecycle state', async () => {
    api.post.mockResolvedValue({ id: 7, system_state: 'new', branch_id: 3 });
    const result = await leadApi.create({
      branch: '3', assigned_to: '12', first_name: 'Ada', phone: '5551234567',
      move_size_id: '8', status: 'new', origin_address_line1: '1 Main St',
    });
    expect(api.post).toHaveBeenCalledWith('/tenant/leads/', {
      branch_id: 3, assigned_user_id: 12, first_name: 'Ada', phone: '5551234567',
      move_size_id: 8, origin_street: '1 Main St',
    });
    expect(result.status).toBe('new');
  });

  it('requires a branch and valid catalog IDs', () => {
    expect(() => leadPayload({ first_name: 'Ada' }, { create: true })).toThrow(/branch/i);
    expect(() => leadPayload({ branch: 3, move_size_id: 'Studio' }, { create: true })).toThrow(/move_size_id/);
  });

  it('uses nested assignment and activity endpoints', async () => {
    api.post.mockResolvedValue({ id: 7, system_state: 'new' });
    await leadApi.assign(7, { user_id: 12 });
    await leadApi.createActivity(7, { activity_type: 'note', description: 'Called' });
    expect(api.post).toHaveBeenNthCalledWith(1, '/tenant/leads/7/assign/', { user_id: 12 });
    expect(api.post).toHaveBeenNthCalledWith(2, '/tenant/leads/7/activities/', { activity_type: 'note', description: 'Called' });
  });

  it('maps pipeline pagination and lead rows', async () => {
    api.get.mockResolvedValue({
      total: 1,
      items: [{ kind: 'lead', id: 7, system_state: 'new', sales_number: 900, customer_name: 'Ada' }],
    });
    const page = await getPipelineQueue({ row_type: 'lead', branch: '3', page: 2, page_size: 25 });
    expect(api.get).toHaveBeenCalledWith('/tenant/pipeline/', {
      params: { kind: 'lead', limit: 25, offset: 25, branch_id: 3 },
    });
    expect(page.results[0]).toMatchObject({ row_type: 'lead', lead_id: 7, name: 'Ada', workflow_stage: 'new_lead' });
  });
});
