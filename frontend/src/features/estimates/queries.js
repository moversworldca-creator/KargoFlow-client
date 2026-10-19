// Server state for Estimates / Quotes (TanStack Query).
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { estimatesApi } from './api';

export const estimateKeys = {
  all: ['estimates'],
  workspace: (opportunityId) => ['estimates', 'workspace', opportunityId],
  estimate: (id) => ['estimates', 'estimate', id],
  changeOrder: (id) => ['estimates', 'change-order', id],
  readiness: (opportunityId) => ['estimates', 'booking-readiness', opportunityId],
};

const fresh = { staleTime: 0, refetchOnMount: 'always', retry: false };

export const useWorkspace = (opportunityId) => useQuery({
  queryKey: estimateKeys.workspace(opportunityId), queryFn: () => estimatesApi.workspace(opportunityId),
  enabled: Boolean(opportunityId), ...fresh,
});
export const useEstimate = (id) => useQuery({
  queryKey: estimateKeys.estimate(id), queryFn: () => estimatesApi.getEstimate(id), enabled: Boolean(id), ...fresh,
});
export const useChangeOrder = (id) => useQuery({
  queryKey: estimateKeys.changeOrder(id), queryFn: () => estimatesApi.getChangeOrder(id), enabled: Boolean(id), ...fresh,
});
export const useBookingReadiness = (opportunityId, enabled = true) => useQuery({
  queryKey: estimateKeys.readiness(opportunityId), queryFn: () => estimatesApi.bookingReadiness(opportunityId),
  enabled: Boolean(opportunityId) && enabled, ...fresh,
});

/** Refetch the workspace, an Estimate / Change Order and dependent pricing views. */
export function useInvalidateEstimates() {
  const client = useQueryClient();
  return useCallback((...keys) => Promise.all([
    client.invalidateQueries({ queryKey: estimateKeys.all }),
    client.invalidateQueries({ queryKey: ['pricing', 'overrides'] }),
    client.invalidateQueries({ queryKey: ['pricing', 'approvals'] }),
    client.invalidateQueries({ queryKey: ['pricing', 'commitments'] }),
    ...keys.map((queryKey) => client.invalidateQueries({ queryKey })),
  ]), [client]);
}
