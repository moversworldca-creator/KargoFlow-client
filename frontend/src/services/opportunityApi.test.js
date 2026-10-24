import { beforeEach, expect, it, vi } from 'vitest';
import api from './axios';
import {
  createEstimate,
  createOpportunity,
  getContracts,
  getDocumentTemplates,
  getEstimateCatalogItems,
  getEstimateDiscountPresets,
  getEstimatePackages,
  getEstimatePortalInventory,
  getEstimatePortalTemplates,
  getEstimates,
  getJobAccountingSummary,
  getJobs,
  getOpportunityPlannedSubJobs,
  getPaymentRequests,
  getPayments,
  listFiles,
  requestEstimatePortal,
  updateOpportunity,
} from './api';

vi.mock('./axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

beforeEach(() => vi.resetAllMocks());

it('updates an opportunity through the tenant endpoint with tenant field names', async () => {
  api.patch.mockResolvedValue({ id: 1, system_state: 'opportunity', move_date: '2026-07-12', move_size_id: 8 });
  const result = await updateOpportunity(1, { move_date: '2026-07-12', mover_size: 8 });
  expect(api.patch).toHaveBeenCalledWith('/tenant/opportunities/1/', {
    move_date: '2026-07-12', move_size_id: 8,
  });
  expect(result).toMatchObject({ id: 1, status: 'opportunity', mover_size: 8 });
});

it('uses dedicated commands for status, assignment, and branch changes', async () => {
  api.put.mockResolvedValue({ id: 1 });
  api.post.mockResolvedValue({ id: 1, branch_id: 4, assigned_employee_id: 9, custom_status_code_id: 3 });
  await updateOpportunity(1, { custom_status_code: 3, assigned_user: 9, branch: 4 });
  expect(api.patch).not.toHaveBeenCalled();
  expect(api.put).toHaveBeenCalledWith('/tenant/opportunities/1/custom-status/', { status_code_id: 3 });
  expect(api.post).toHaveBeenCalledWith('/tenant/opportunities/1/assign/', { employee_id: 9 });
  expect(api.post).toHaveBeenCalledWith('/tenant/opportunities/1/change-branch/', {
    branch_id: 4, reason: 'Updated from sales details',
  });
});

it('creates opportunities through the tenant endpoint', async () => {
  api.post.mockResolvedValue({ id: 1, customer_id: 7, branch_id: 2 });
  await createOpportunity({ customer: 7, branch: 2, move_date: '2026-07-12', mover_size: 8 });
  expect(api.post).toHaveBeenCalledWith('/tenant/opportunities/', {
    customer_id: 7, branch_id: 2, move_date: '2026-07-12', move_size_id: 8,
  });
});

it('loads opportunity jobs through the tenant opportunity endpoint', async () => {
  api.get.mockResolvedValue([{ id: 12 }]);
  await expect(getJobs({ opportunity: 31 })).resolves.toEqual([{ id: 12 }]);
  expect(api.get).toHaveBeenCalledWith('/tenant/opportunities/31/jobs/');

  await getOpportunityPlannedSubJobs(31);
  expect(api.get).toHaveBeenLastCalledWith('/tenant/opportunities/31/jobs/');
});

it('does not request backend modules that are not mounted', async () => {
  api.get.mockResolvedValue({ data: { count: 0, results: [] } });
  await expect(getEstimates({ opportunity: 31 })).resolves.toEqual([]);
  await expect(getPaymentRequests({ opportunity_id: 31 })).resolves.toEqual([]);
  await expect(getPayments({ opportunity_id: 31 })).resolves.toEqual([]);
  await expect(getEstimateDiscountPresets()).resolves.toEqual([]);
  await expect(getEstimateCatalogItems({ branch: 1 })).resolves.toEqual([]);
  await expect(getEstimatePackages({ branch: 1 })).resolves.toEqual([]);
  await expect(getEstimatePortalTemplates({ is_active: true })).resolves.toEqual([]);
  await getDocumentTemplates({ template_type: 'contract', is_active: 'true', branch: 3 });
  expect(api.get).toHaveBeenCalledWith('/tenant/builder/templates/', {
    params: { kind: 'document', subtype: 'contract', state: 'active', branch_id: 3 },
  });
  await expect(getContracts({ opportunity: 31 })).resolves.toEqual([]);
  await expect(getEstimatePortalInventory('draft-1')).resolves.toEqual([]);
  await expect(getJobAccountingSummary(1)).resolves.toBeNull();
  await expect(listFiles({ target_type: 'sales.opportunity', target_id: 31 })).resolves.toEqual([]);
  await expect(createEstimate({ opportunity: 31, method: 'manual' })).rejects.toMatchObject({
    code: 'MODULE_NOT_AVAILABLE',
  });
  await expect(requestEstimatePortal('draft-1')).rejects.toMatchObject({
    code: 'MODULE_NOT_AVAILABLE',
  });
  expect(api.get).toHaveBeenCalledTimes(1);
  expect(api.post).not.toHaveBeenCalled();
});
