// Server state for pricing administration (TanStack Query). Administrative
// screens read what is true now; every mutation invalidates what it changed.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getEntitlementSnapshot } from '../../services/api';
import { pricingApi } from './api';

export const pricingKeys = {
  all: ['pricing'],
  tariffs: (params) => ['pricing', 'tariffs', params],
  tariff: (id) => ['pricing', 'tariff', id],
  revision: (id) => ['pricing', 'revision', id],
  skills: () => ['pricing', 'skills'],
  employeeSkills: (id) => ['pricing', 'employee-skills', id],
  overlays: (params) => ['pricing', 'overlays', params],
  policy: () => ['pricing', 'policy'],
  taxComponents: (profileId) => ['pricing', 'tax', profileId],
  exemptions: (params) => ['pricing', 'exemptions', params],
  approvals: (params) => ['pricing', 'approvals', params],
  runs: (params) => ['pricing', 'runs', params],
  run: (id, view) => ['pricing', 'run', id, view || 'internal'],
  explain: (id) => ['pricing', 'explain', id],
  overrides: (estimateId) => ['pricing', 'overrides', estimateId],
  commitments: (estimateId) => ['pricing', 'commitments', estimateId],
};

const fresh = { staleTime: 0, refetchOnMount: 'always', retry: false };
const list = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

export const useTariffs = (params) => useQuery({
  queryKey: pricingKeys.tariffs(params), queryFn: () => pricingApi.listTariffs(params),
  placeholderData: (previous) => previous, ...fresh,
});
export const useTariff = (id) => useQuery({
  queryKey: pricingKeys.tariff(id), queryFn: () => pricingApi.getTariff(id), enabled: Boolean(id), ...fresh,
});
export const useRevision = (id) => useQuery({
  queryKey: pricingKeys.revision(id), queryFn: () => pricingApi.getRevision(id), enabled: Boolean(id), ...fresh,
});
export const useSkills = (enabled = true) => useQuery({
  queryKey: pricingKeys.skills(), queryFn: async () => list(await pricingApi.listSkills()), enabled, ...fresh,
});
export const useEmployeeSkills = (employeeId) => useQuery({
  queryKey: pricingKeys.employeeSkills(employeeId), queryFn: async () => list(await pricingApi.employeeSkills(employeeId)),
  enabled: Boolean(employeeId), ...fresh,
});
export const useOverlays = (params) => useQuery({
  queryKey: pricingKeys.overlays(params), queryFn: async () => list(await pricingApi.listOverlays(params)), ...fresh,
});
export const usePolicy = (enabled = true) => useQuery({ queryKey: pricingKeys.policy(), queryFn: pricingApi.getPolicy, enabled, ...fresh });
export const useTaxComponents = (profileId) => useQuery({
  queryKey: pricingKeys.taxComponents(profileId), queryFn: () => pricingApi.taxComponents(profileId),
  enabled: Boolean(profileId), ...fresh,
});
export const useExemptions = (params) => useQuery({
  queryKey: pricingKeys.exemptions(params), queryFn: async () => list(await pricingApi.listExemptions(params)), ...fresh,
});
export const useApprovals = (params, enabled = true) => useQuery({
  queryKey: pricingKeys.approvals(params), queryFn: async () => list(await pricingApi.listApprovals(params)), enabled, ...fresh,
});
export const useRun = (id, view) => useQuery({
  queryKey: pricingKeys.run(id, view), queryFn: () => pricingApi.getRun(id, view), enabled: Boolean(id), staleTime: Infinity, retry: false,
});
export const useExplain = (id, enabled = true) => useQuery({
  // A Calculation Run is immutable, so its explanation never goes stale.
  queryKey: pricingKeys.explain(id), queryFn: () => pricingApi.explainRun(id), enabled: Boolean(id) && enabled, staleTime: Infinity, retry: false,
});
export const useOverrides = (estimateId, enabled = true) => useQuery({
  queryKey: pricingKeys.overrides(estimateId), queryFn: async () => list(await pricingApi.listOverrides(estimateId)),
  enabled: Boolean(estimateId) && enabled, ...fresh,
});
export const useCommitments = (estimateId, enabled = true) => useQuery({
  queryKey: pricingKeys.commitments(estimateId), queryFn: async () => list(await pricingApi.commitments(estimateId)),
  enabled: Boolean(estimateId) && enabled, ...fresh,
});

/** Refetch everything pricing-related after a change. */
export function useInvalidatePricing() {
  const client = useQueryClient();
  return useCallback((...keys) => {
    if (!keys.length) return client.invalidateQueries({ queryKey: pricingKeys.all });
    return Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })));
  }, [client]);
}

/**
 * Access to the Estimates / Pricing feature (SaaS entitlement "crm.estimates").
 * Returns null when the plan cannot be read (no entitlements.view): then the
 * backend's own answer to each request decides. Never a plan name.
 */
export const ESTIMATES_FEATURE = 'crm.estimates';
export function useEstimatesFeature(canReadPlan) {
  const query = useQuery({
    queryKey: ['user-admin', 'entitlements'], queryFn: getEntitlementSnapshot, enabled: Boolean(canReadPlan),
    staleTime: 60 * 1000, retry: false,
  });
  if (!canReadPlan || !query.data) return null;
  const mode = query.data.features?.[ESTIMATES_FEATURE];
  return { mode: mode ?? 'none', readOnly: ['read_only', 'blocked'].includes(query.data.access_mode) || mode === 'read' };
}
