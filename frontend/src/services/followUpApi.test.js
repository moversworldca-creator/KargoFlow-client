import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './axios';
import {
  completeFollowUp,
  createFollowUp,
  deleteFollowUp,
  getFollowUp,
  getFollowUps,
  updateFollowUp,
} from './api';

vi.mock('./axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

beforeEach(() => vi.resetAllMocks());

describe('follow-up API', () => {
  it('uses the unified tenant collection for list and create', async () => {
    await getFollowUps({ lead_id: 12, only_open: true });
    expect(api.get).toHaveBeenCalledWith('/tenant/followups/', {
      params: { lead_id: 12, only_open: true },
    });

    const payload = { opportunity_id: 8, title: 'Call customer' };
    await createFollowUp(payload);
    expect(api.post).toHaveBeenCalledWith('/tenant/followups/', payload);
  });

  it('uses record routes for retrieve, update, complete, and delete', async () => {
    await getFollowUp(41);
    await updateFollowUp(41, { status: 'pending' });
    await completeFollowUp(41);
    await deleteFollowUp(41);

    expect(api.get).toHaveBeenCalledWith('/tenant/followups/41/');
    expect(api.patch).toHaveBeenCalledWith('/tenant/followups/41/', { status: 'pending' });
    expect(api.post).toHaveBeenCalledWith('/tenant/followups/41/complete/', {});
    expect(api.delete).toHaveBeenCalledWith('/tenant/followups/41/');
  });
});
