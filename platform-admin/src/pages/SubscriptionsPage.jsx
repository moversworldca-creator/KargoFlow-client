import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw, Layers } from 'lucide-react';
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchSubs(), refetchPlans(), refetchTenants()]);
      showToast('Subscriptions refreshed.', 'success');
    } catch {
      showToast('Error syncing subscriptions data.', 'error');
    } finally {
      setIsRefreshing(false);
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
    <div className="space-y-4 max-w-7xl mx-auto pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center shadow-2xs shrink-0">
            <Layers size={22} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Subscriptions & Lifecycle
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage tenant subscriptions, plans, and lifecycle states.
            </p>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-4 py-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-semibold cursor-pointer shadow-2xs inline-flex items-center gap-2 self-start sm:self-auto"
          title="Reload subscriptions"
        >
          <RefreshCw size={15} className={`text-slate-500 dark:text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
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
