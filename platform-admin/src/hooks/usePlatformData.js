import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const DEFAULT_STALE_TIME = 60 * 1000;

function unwrapResults(res) {
  if (!res) return [];

  const data = res.data ?? res;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;

  return data || [];
}

/**
 * Platform Dashboard
 *
 * The backend does not expose /api/dashboard/.
 * Dashboard data is therefore composed from the existing Core APIs.
 */
export function useDashboardData() {
  const plansQuery = useQuery({
    queryKey: ['platform', 'dashboard', 'plans'],
    queryFn: async () => {
      const res = await api.plans.getAll();
      return unwrapResults(res);
    },
    staleTime: DEFAULT_STALE_TIME,
  });

  const featuresQuery = useQuery({
    queryKey: ['platform', 'dashboard', 'features'],
    queryFn: async () => {
      const res = await api.features.getAll();
      return unwrapResults(res);
    },
    staleTime: DEFAULT_STALE_TIME,
  });

  const subscriptionsQuery = useQuery({
    queryKey: ['platform', 'dashboard', 'subscriptions'],
    queryFn: async () => {
      const res = await api.subscriptions.getAll();
      return unwrapResults(res);
    },
    staleTime: DEFAULT_STALE_TIME,
  });

  const tenantsQuery = useQuery({
    queryKey: ['platform', 'dashboard', 'tenants'],
    queryFn: async () => {
      const res = await api.tenantAccess.getCompanies();
      return unwrapResults(res);
    },
    staleTime: DEFAULT_STALE_TIME,
  });

  return {
    data: {
      plans: plansQuery.data || [],
      features: featuresQuery.data || [],
      subscriptions: subscriptionsQuery.data || [],
      tenants: tenantsQuery.data || [],
    },

    isLoading:
      plansQuery.isLoading ||
      featuresQuery.isLoading ||
      subscriptionsQuery.isLoading ||
      tenantsQuery.isLoading,

    isFetching:
      plansQuery.isFetching ||
      featuresQuery.isFetching ||
      subscriptionsQuery.isFetching ||
      tenantsQuery.isFetching,

    isError:
      plansQuery.isError ||
      featuresQuery.isError ||
      subscriptionsQuery.isError ||
      tenantsQuery.isError,

    error:
      plansQuery.error ||
      featuresQuery.error ||
      subscriptionsQuery.error ||
      tenantsQuery.error,

    refetch: async () => {
      await Promise.all([
        plansQuery.refetch(),
        featuresQuery.refetch(),
        subscriptionsQuery.refetch(),
        tenantsQuery.refetch(),
      ]);
    },
  };
}

export function useTenants(params = {}) {
  return useQuery({
    queryKey: ['platform', 'tenants', params],
    queryFn: async () => {
      const res = await api.getTenants(params);
      return unwrapResults(res);
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function usePlans(params = {}) {
  return useQuery({
    queryKey: ['platform', 'plans', params],
    queryFn: async () => {
      const res = await api.plans.getAll(params);
      const plansList = unwrapResults(res);
      if (!Array.isArray(plansList) || plansList.length === 0) {
        return plansList;
      }
      const detailedPlans = await Promise.all(
        plansList.map(async (p) => {
          try {
            const detailRes = await api.plans.get(p.id);
            const detail = detailRes?.data || detailRes || {};
            return {
              ...p,
              ...detail,
              features: detail.features || p.features || [],
              limits: detail.limits || p.limits || [],
            };
          } catch {
            return p;
          }
        })
      );
      return detailedPlans;
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useFeatures(params = {}) {
  return useQuery({
    queryKey: ['platform', 'features', params],
    queryFn: async () => {
      const res = await api.features.getAll(params);
      return unwrapResults(res);
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useLimits(params = {}) {
  return useQuery({
    queryKey: ['platform', 'limits', params],
    queryFn: async () => {
      const res = await api.limits.getAll(params);
      return unwrapResults(res);
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useSubscriptions(params = {}) {
  return useQuery({
    queryKey: ['platform', 'subscriptions', params],
    queryFn: async () => {
      const res = await api.subscriptions.getAll(params);
      return unwrapResults(res);
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useAddons(params = {}) {
  return useQuery({
    queryKey: ['platform', 'addons', params],
    queryFn: async () => {
      const res = await api.getAddons(params);
      return unwrapResults(res);
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useSupportSessions(params = {}) {
  return useQuery({
    queryKey: ['platform', 'support_sessions', params],
    queryFn: async () => {
      const res = await api.tenantSessions.getAll(params);
      return unwrapResults(res);
    },
    staleTime: 30 * 1000,
  });
}

export function usePlatformAdmins(params = {}) {
  return useQuery({
    queryKey: ['platform', 'admins', params],
    queryFn: async () => {
      const res = await api.platformUsers.getAll(params);
      return unwrapResults(res).map((user) => ({
        ...user,
        name:
          user.name ||
          `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
          user.email ||
          'Unknown User',
        status: user.status || (user.is_active ? 'active' : 'suspended'),
        role: user.role || 'super_admin',
        company_scope_type: user.company_scope_type || 'all',
        assigned_companies: user.assigned_companies || [],
        expires_at: user.expires_at || null,
      }));
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function usePlatformAuditLogs(params = {}) {
  return useQuery({
    queryKey: ['platform', 'audit_logs', params],
    queryFn: async () => {
      const res = await api.auditLogs.getAll(params);
      return unwrapResults(res);
    },
    staleTime: 30 * 1000,
  });
}

export function useTenantAccess(params = {}) {
  return useQuery({
    queryKey: ['platform', 'tenant_access', params],
    queryFn: async () => {
      const res = await api.tenantAccess.getAll(params);
      return unwrapResults(res);
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useInvalidatePlatformQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: ['platform'] }),

    invalidateDashboard: () =>
      queryClient.invalidateQueries({
        queryKey: ['platform', 'dashboard'],
      }),

    invalidateTenants: () =>
      queryClient.invalidateQueries({
        queryKey: ['platform', 'tenants'],
      }),

    invalidateSubscriptions: () =>
      queryClient.invalidateQueries({
        queryKey: ['platform', 'subscriptions'],
      }),

    invalidatePlans: () =>
      queryClient.invalidateQueries({
        queryKey: ['platform', 'plans'],
      }),

    invalidateFeatures: () =>
      queryClient.invalidateQueries({
        queryKey: ['platform', 'features'],
      }),

    invalidateLimits: () =>
      queryClient.invalidateQueries({
        queryKey: ['platform', 'limits'],
      }),

    invalidateAdmins: () =>
      queryClient.invalidateQueries({
        queryKey: ['platform', 'admins'],
      }),

    invalidateSupportSessions: () =>
      queryClient.invalidateQueries({
        queryKey: ['platform', 'support_sessions'],
      }),

    invalidateAuditLogs: () =>
      queryClient.invalidateQueries({
        queryKey: ['platform', 'audit_logs'],
      }),

    invalidateTenantAccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['platform', 'tenant_access'],
      }),
  };
}