// Server state for tariffs (TanStack Query). Settings screens read what is
// true now; every mutation invalidates what it changed.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getBranches, getEntitlementSnapshot } from '../../services/api';
import { opportunityTariffApi, referenceApi, storageTariffsApi, tariffsApi, valuationTemplatesApi } from './api';

export const tariffKeys = {
  all: ['tariffs'],
  list: (params) => ['tariffs', 'list', params],
  tariff: (id) => ['tariffs', 'tariff', id],
  valuationTemplates: () => ['tariffs', 'valuation-templates'],
  storage: () => ['tariffs', 'storage'],
  warehouses: () => ['tariffs', 'warehouses'],
  opportunity: (id) => ['tariffs', 'opportunity', id],
};

const fresh = { staleTime: 0, refetchOnMount: 'always', retry: false };
const asList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

export const useTariffs = (params) => useQuery({
  queryKey: tariffKeys.list(params), queryFn: async () => asList(await tariffsApi.list(params)),
  placeholderData: (previous) => previous, ...fresh,
});
export const useTariff = (id) => useQuery({
  queryKey: tariffKeys.tariff(id), queryFn: () => tariffsApi.get(id), enabled: Boolean(id), ...fresh,
});
export const useValuationTemplates = (enabled = true) => useQuery({
  queryKey: tariffKeys.valuationTemplates(), queryFn: async () => asList(await valuationTemplatesApi.list()), enabled, ...fresh,
});
export const useStorageTariffs = () => useQuery({
  queryKey: tariffKeys.storage(), queryFn: async () => asList(await storageTariffsApi.list()), ...fresh,
});
export const useWarehouses = () => useQuery({
  queryKey: tariffKeys.warehouses(), queryFn: async () => asList(await storageTariffsApi.warehouses()), ...fresh,
});
export const useOpportunityTariff = (opportunityId, enabled = true) => useQuery({
  queryKey: tariffKeys.opportunity(opportunityId), queryFn: () => opportunityTariffApi.get(opportunityId),
  enabled: Boolean(opportunityId) && enabled, ...fresh,
});

export const useBranchOptions = () => useQuery({
  queryKey: ['tariffs', 'branch-options'], queryFn: async () => asList(await getBranches()), staleTime: 60_000, retry: false,
});
export const useOpportunityTypes = () => useQuery({
  queryKey: ['tariffs', 'opportunity-types'], queryFn: async () => asList(await referenceApi.opportunityTypes()),
  staleTime: 60_000, retry: false,
});

/** The tariff feature as the plan allows it ('write' | 'read' | 'none'); null when unknown. */
export function useTariffFeature(enabled) {
  const query = useQuery({
    queryKey: ['tariffs', 'entitlement'], queryFn: getEntitlementSnapshot, enabled, staleTime: 60_000, retry: false,
  });
  if (!enabled || !query.data) return null;
  const mode = query.data.features?.['crm.estimates'];
  return { mode: mode || 'none', accessMode: query.data.access_mode };
}

/** Refetch what a change touched. */
export function useInvalidateTariffs() {
  const client = useQueryClient();
  return useCallback((...keys) => Promise.all(
    (keys.length ? keys : [tariffKeys.all]).map((queryKey) => client.invalidateQueries({ queryKey })),
  ), [client]);
}
