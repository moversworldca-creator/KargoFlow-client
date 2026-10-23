import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../../services/axios';
import { estimateApi } from './estimateApi';

vi.mock('../../../services/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('estimateApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('calls GET /tenant/estimates/ with opportunity_id', async () => {
      api.get.mockResolvedValueOnce([{ id: 1, estimate_number: 'EST-1' }]);
      const res = await estimateApi.list({ opportunity_id: 42 });
      expect(api.get).toHaveBeenCalledWith('/tenant/estimates/', {
        params: { opportunity_id: 42 },
      });
      expect(res).toEqual([{ id: 1, estimate_number: 'EST-1' }]);
    });

    it('translates legacy opportunity param to opportunity_id', async () => {
      api.get.mockResolvedValueOnce([]);
      await estimateApi.list({ opportunity: 42 });
      expect(api.get).toHaveBeenCalledWith('/tenant/estimates/', {
        params: { opportunity_id: 42 },
      });
    });

    it('accepts raw ID as param', async () => {
      api.get.mockResolvedValueOnce([]);
      await estimateApi.list(42);
      expect(api.get).toHaveBeenCalledWith('/tenant/estimates/', {
        params: { opportunity_id: 42 },
      });
    });

    it('throws when opportunity_id is missing', async () => {
      await expect(estimateApi.list({})).rejects.toThrow('opportunity_id is required');
    });
  });

  describe('create', () => {
    it('calls POST /tenant/estimates/ with opportunity_id and optional Idempotency-Key header', async () => {
      api.post.mockResolvedValueOnce({ id: 10, estimate_number: 'EST-10' });
      const res = await estimateApi.create(
        { opportunity_id: 42, binding_type: 'binding' },
        'key-abc-123'
      );
      expect(api.post).toHaveBeenCalledWith(
        '/tenant/estimates/',
        { opportunity_id: 42, binding_type: 'binding' },
        { headers: { 'Idempotency-Key': 'key-abc-123' } }
      );
      expect(res).toEqual({ id: 10, estimate_number: 'EST-10' });
    });

    it('maps opportunity to opportunity_id if provided', async () => {
      api.post.mockResolvedValueOnce({ id: 10 });
      await estimateApi.create({ opportunity: '42' });
      expect(api.post).toHaveBeenCalledWith(
        '/tenant/estimates/',
        { opportunity_id: 42 },
        undefined
      );
    });

    it('throws if opportunity_id is missing', async () => {
      await expect(estimateApi.create({})).rejects.toThrow('opportunity_id is required');
    });
  });

  describe('get', () => {
    it('calls GET /tenant/estimates/:id/', async () => {
      api.get.mockResolvedValueOnce({ id: 5 });
      const res = await estimateApi.get(5);
      expect(api.get).toHaveBeenCalledWith('/tenant/estimates/5/');
      expect(res).toEqual({ id: 5 });
    });
  });

  describe('update', () => {
    it('calls PATCH /tenant/estimates/:id/ with edit_version', async () => {
      api.patch.mockResolvedValueOnce({ id: 5, edit_version: 2 });
      const payload = { edit_version: 1, access_notes: 'Gate code 1234' };
      const res = await estimateApi.update(5, payload);
      expect(api.patch).toHaveBeenCalledWith('/tenant/estimates/5/', payload);
      expect(res).toEqual({ id: 5, edit_version: 2 });
    });
  });

  describe('recalculate', () => {
    it('calls POST /tenant/estimates/:id/recalculate/ with edit_version', async () => {
      api.post.mockResolvedValueOnce({ id: 5, edit_version: 3 });
      await estimateApi.recalculate(5, 2);
      expect(api.post).toHaveBeenCalledWith('/tenant/estimates/5/recalculate/', {
        edit_version: 2,
      });
    });

    it('accepts object with edit_version', async () => {
      api.post.mockResolvedValueOnce({ id: 5 });
      await estimateApi.recalculate(5, { edit_version: 4 });
      expect(api.post).toHaveBeenCalledWith('/tenant/estimates/5/recalculate/', {
        edit_version: 4,
      });
    });
  });

  describe('replaceInventory', () => {
    it('calls PUT /tenant/estimates/:id/inventory/ with rooms and edit_version', async () => {
      api.put.mockResolvedValueOnce({ id: 5 });
      const data = { edit_version: 1, rooms: [{ room_name: 'Living', items: [] }] };
      await estimateApi.replaceInventory(5, data);
      expect(api.put).toHaveBeenCalledWith('/tenant/estimates/5/inventory/', data);
    });
  });

  describe('charges', () => {
    it('calls POST /tenant/estimates/:id/charges/ to add charge', async () => {
      api.post.mockResolvedValueOnce({ id: 5 });
      const chargeData = {
        source: 'manual',
        name: 'Hoisting',
        unit_price: '150.00',
        quantity: '1',
        edit_version: 2,
      };
      await estimateApi.addCharge(5, chargeData);
      expect(api.post).toHaveBeenCalledWith('/tenant/estimates/5/charges/', chargeData);
    });

    it('calls PATCH /tenant/estimates/:id/charges/:chargeId/ to update charge or override', async () => {
      api.patch.mockResolvedValueOnce({ id: 5 });
      const updateData = { unit_price: '140', edit_version: 2 };
      await estimateApi.updateCharge(5, 12, updateData);
      expect(api.patch).toHaveBeenCalledWith('/tenant/estimates/5/charges/12/', updateData);
    });

    it('calls DELETE /tenant/estimates/:id/charges/:chargeId/ with edit_version in body', async () => {
      api.delete.mockResolvedValueOnce({ id: 5 });
      await estimateApi.deleteCharge(5, 12, 3);
      expect(api.delete).toHaveBeenCalledWith('/tenant/estimates/5/charges/12/', {
        data: { edit_version: 3 },
      });
    });

    it('clearOverride sends clear_override: true with edit_version', async () => {
      api.patch.mockResolvedValueOnce({ id: 5 });
      await estimateApi.clearOverride(5, 12, 4);
      expect(api.patch).toHaveBeenCalledWith('/tenant/estimates/5/charges/12/', {
        clear_override: true,
        edit_version: 4,
      });
    });
  });

  describe('lifecycle', () => {
    it('calls POST /tenant/estimates/:id/revise/ with edit_version', async () => {
      api.post.mockResolvedValueOnce({ id: 5 });
      await estimateApi.revise(5, 3);
      expect(api.post).toHaveBeenCalledWith('/tenant/estimates/5/revise/', {
        edit_version: 3,
      });
    });

    it('calls POST /tenant/estimates/:id/supersede/ with edit_version and reason', async () => {
      api.post.mockResolvedValueOnce({ id: 6 });
      await estimateApi.supersede(5, { edit_version: 3, reason: 'Scope expanded' });
      expect(api.post).toHaveBeenCalledWith('/tenant/estimates/5/supersede/', {
        edit_version: 3,
        reason: 'Scope expanded',
      });
    });

    it('calls POST /tenant/estimates/:id/send/ with edit_version and Idempotency-Key', async () => {
      api.post.mockResolvedValueOnce({ version_number: 1, estimate: { id: 5 } });
      await estimateApi.send(5, { edit_version: 3 }, 'key-send-1');
      expect(api.post).toHaveBeenCalledWith(
        '/tenant/estimates/5/send/',
        { edit_version: 3 },
        { headers: { 'Idempotency-Key': 'key-send-1' } }
      );
    });

    it('calls GET /tenant/estimates/:id/versions/:v/', async () => {
      api.get.mockResolvedValueOnce({ version_number: 1 });
      await estimateApi.getVersion(5, 1);
      expect(api.get).toHaveBeenCalledWith('/tenant/estimates/5/versions/1/');
    });

    it('calls POST /tenant/estimates/:id/request-approval/', async () => {
      api.post.mockResolvedValueOnce({ id: 5 });
      await estimateApi.requestApproval(5, { reason: 'Big discount' });
      expect(api.post).toHaveBeenCalledWith('/tenant/estimates/5/request-approval/', {
        reason: 'Big discount',
      });
    });

    it('calls POST /tenant/estimates/:id/approvals/:aid/:decision/', async () => {
      api.post.mockResolvedValueOnce({ id: 5 });
      await estimateApi.decideApproval(5, 7, 'approve', { comment: 'Looks good' });
      expect(api.post).toHaveBeenCalledWith(
        '/tenant/estimates/5/approvals/7/approve/',
        { comment: 'Looks good' }
      );
    });
  });

  describe('settings', () => {
    it('fetches discount presets', async () => {
      api.get.mockResolvedValueOnce([{ id: 1, label: '5% Off' }]);
      const res = await estimateApi.settings.getDiscountPresets();
      expect(api.get).toHaveBeenCalledWith('/tenant/estimate-settings/discount_presets/');
      expect(res).toEqual([{ id: 1, label: '5% Off' }]);
    });

    it('creates a discount preset', async () => {
      api.post.mockResolvedValueOnce({ id: 2 });
      await estimateApi.settings.createDiscountPreset({
        label: 'Senior Discount',
        discount_type: 'percentage',
        value: '10',
      });
      expect(api.post).toHaveBeenCalledWith('/tenant/estimate-settings/discount_presets/', {
        label: 'Senior Discount',
        discount_type: 'percentage',
        value: '10',
      });
    });

    it('updates a discount preset', async () => {
      api.patch.mockResolvedValueOnce({ id: 2 });
      await estimateApi.settings.updateDiscountPreset(2, { is_active: false });
      expect(api.patch).toHaveBeenCalledWith('/tenant/estimate-settings/discount_presets/2/', {
        is_active: false,
      });
    });

    it('fetches approval rules', async () => {
      api.get.mockResolvedValueOnce([{ id: 1, name: 'Deep discount' }]);
      await estimateApi.settings.getApprovalRules();
      expect(api.get).toHaveBeenCalledWith('/tenant/estimate-settings/approval_rules/');
    });
  });
});
