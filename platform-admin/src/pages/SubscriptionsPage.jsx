import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import platformApi from '../api/platformApi';
import { useToast } from '../context/ToastContext';
import { usePlatformAuth } from '../auth/PlatformAuthContext';
import { PLATFORM_PERMISSIONS } from '../rbac/platformRbac';
import { useSubscriptions, usePlans, useTenants, useInvalidatePlatformQueries } from '../hooks/usePlatformData';
import SubscriptionsTab from '../components/SubscriptionsTab';
import AccessDenied from '../components/AccessDenied';

export default function SubscriptionsPage() {
  const { showToast } = useToast();
  const { hasPermission } = usePlatformAuth();

  const canView = hasPermission(PLATFORM_PERMISSIONS.SUBSCRIPTIONS_VIEW);

  const { data: subscriptions = [], isLoading: isSubsLoading, refetch: refetchSubs } = useSubscriptions();
  const { data: plans = [], isLoading: isPlansLoading, refetch: refetchPlans } = usePlans();
  const { data: tenants = [], isLoading: isTenantsLoading, refetch: refetchTenants } = useTenants();
  const { invalidateSubscriptions, invalidateTenants, invalidateAll } = useInvalidatePlatformQueries();

  const isLoading = isSubsLoading || isPlansLoading || isTenantsLoading;

  const handleRefresh = async () => {
    try {
      await Promise.all([refetchSubs(), refetchPlans(), refetchTenants()]);
      showToast('Subscriptions refreshed.', 'success');
    } catch {
      showToast('Error syncing subscriptions data.', 'error');
    }
  };

  if (!canView) {
    return (
      <AccessDenied
        requiredPermission={PLATFORM_PERMISSIONS.SUBSCRIPTIONS_VIEW}
        title="Subscriptions Access Restricted"
        message="Your platform staff role does not have authorization to view tenant subscriptions."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 size={24} className="animate-spin text-blue-600" />
        <span className="text-xs font-semibold">Loading tenant subscriptions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
              Billing & Tiers
            </span>
            <span className="text-xs text-slate-400 font-mono">Lifecycle management</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Subscriptions & Lifecycle
          </h1>
        </div>

        <button
          onClick={handleRefresh}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-bold self-start sm:self-auto cursor-pointer"
          title="Reload subscriptions"
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      <SubscriptionsTab
        subscriptions={subscriptions}
        plans={plans}
        tenants={tenants}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
