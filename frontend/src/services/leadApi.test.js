import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axios';
import {
  createLead,
  assignLead,
  createLeadActivity,
  leadPayload,
  leadRecord,
  getLeadProviders,
  createLeadProvider,
  rotateLeadProviderSecret,
  getLeadRoutingRules,
  getLeadIntakeEvents,
} from './api';

vi.mock('./axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

beforeEach(() => vi.clearAllMocks());

describe('integrated lead and inbound API contracts', () => {
  it('maps a lead form to backend fields without sending lifecycle state', async () => {
    api.post.mockResolvedValue({ id: 7, system_state: 'new', branch_id: 3 });
    const result = await createLead({
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

  it('normalizes a full name and ISO date for the lead detail page', () => {
    expect(leadRecord({ id: 7, full_name: 'Ada Lovelace', first_name: '', last_name: '', move_date: '2026-07-10T00:00:00Z' }))
      .toMatchObject({ first_name: 'Ada', last_name: 'Lovelace', full_name: 'Ada Lovelace', move_date: '2026-07-10' });
    expect(leadRecord({ id: 8, customer_name: 'Grace Hopper' }))
      .toMatchObject({ first_name: 'Grace', last_name: 'Hopper', full_name: 'Grace Hopper' });
  });

  it('uses nested assignment and activity endpoints', async () => {
    api.post.mockResolvedValue({ id: 7, system_state: 'new' });
    await assignLead(7, { user_id: 12 });
    await createLeadActivity({ lead: 7, activity_type: 'note', description: 'Called' });
    expect(api.post).toHaveBeenNthCalledWith(1, '/tenant/leads/7/assign/', { user_id: 12 });
    expect(api.post).toHaveBeenNthCalledWith(2, '/tenant/leads/7/activities/', { activity_type: 'note', description: 'Called' });
  });

  it('calls integrated inbound provider endpoints directly', async () => {
    api.get.mockResolvedValue([{ id: 1, name: 'Moving Waldo' }]);
    const providers = await getLeadProviders();
    expect(api.get).toHaveBeenCalledWith('/tenant/lead-providers/');
    expect(providers).toHaveLength(1);

    api.post.mockResolvedValue({ id: 1, api_secret: 'sec_123' });
    await createLeadProvider({ name: 'Web Intake' });
    expect(api.post).toHaveBeenCalledWith('/tenant/lead-providers/', { name: 'Web Intake' });

    await rotateLeadProviderSecret(1);
    expect(api.post).toHaveBeenCalledWith('/tenant/lead-providers/1/rotate-secret/');
  });

  it('calls integrated inbound routing and intake audit endpoints', async () => {
    api.get.mockResolvedValue([]);
    await getLeadRoutingRules({ is_active: true });
    expect(api.get).toHaveBeenCalledWith('/tenant/lead-routing-rules/', { params: { is_active: true } });

    await getLeadIntakeEvents({ status: 'processed' });
    expect(api.get).toHaveBeenCalledWith('/tenant/lead-intake-events/', {
      params: { limit: 100, offset: 0, status: 'processed' },
    });
  });
});
