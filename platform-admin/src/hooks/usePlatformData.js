import { useQuery, useQueryClient } from '@tanstack/react-query';
import platformApi from '../api/platformApi';

const DEFAULT_STALE_TIME = 60 * 1000; // 1 minute

export function useDashboardData() {
  return useQuery({
    queryKey: ['platform', 'dashboard'],
    queryFn: async () => {
      const res = await platformApi.getDashboard();
      return res.data;
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useTenants(params = {}) {
  return useQuery({
    queryKey: ['platform', 'tenants', params],
    queryFn: async () => {
      const res = await platformApi.getTenants(params);
      return res.data?.results || [];
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function usePlans() {
  return useQuery({
    queryKey: ['platform', 'plans'],
    queryFn: async () => {
      const res = await platformApi.getPlans();
      return res.data?.results || [];
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useFeatures() {
  return useQuery({
    queryKey: ['platform', 'features'],
    queryFn: async () => {
      const res = await platformApi.getFeatures();
      return res.data?.results || [];
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useSubscriptions(params = {}) {
  return useQuery({
    queryKey: ['platform', 'subscriptions', params],
    queryFn: async () => {
      const res = await platformApi.getSubscriptions(params);
      return res.data?.results || [];
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useAddons() {
  return useQuery({
    queryKey: ['platform', 'addons'],
    queryFn: async () => {
      const res = await platformApi.getAddons();
      return res.data?.results || [];
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useSupportSessions() {
  return useQuery({
    queryKey: ['platform', 'support_sessions'],
    queryFn: async () => {
      const res = await platformApi.getSupportSessions();
      return res.data?.results || [];
    },
    staleTime: 30 * 1000,
  });
}

export function usePlatformAdmins(params = {}) {
  return useQuery({
    queryKey: ['platform', 'admins', params],
    queryFn: async () => {
      const res = await platformApi.getAdmins(params);
      return res.data?.results || [];
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function usePlatformAuditLogs(params = {}) {
  return useQuery({
    queryKey: ['platform', 'audit_logs', params],
    queryFn: async () => {
      const res = await platformApi.getAuditLogs(params);
      return res.data?.results || [];
    },
    staleTime: 30 * 1000,
  });
}

export function useInvalidatePlatformQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: ['platform'] }),
    invalidateDashboard: () => queryClient.invalidateQueries({ queryKey: ['platform', 'dashboard'] }),
    invalidateTenants: () => queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] }),
    invalidateSubscriptions: () => queryClient.invalidateQueries({ queryKey: ['platform', 'subscriptions'] }),
    invalidatePlans: () => queryClient.invalidateQueries({ queryKey: ['platform', 'plans'] }),
    invalidateAdmins: () => queryClient.invalidateQueries({ queryKey: ['platform', 'admins'] }),
    invalidateSupportSessions: () => queryClient.invalidateQueries({ queryKey: ['platform', 'support_sessions'] }),
    invalidateAuditLogs: () => queryClient.invalidateQueries({ queryKey: ['platform', 'audit_logs'] }),
  };
}
