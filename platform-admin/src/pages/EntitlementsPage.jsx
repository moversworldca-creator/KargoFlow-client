import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { usePlatformAuth } from '../auth/PlatformAuthContext';
import { PLATFORM_PERMISSIONS } from '../rbac/platformRbac';
import { useTenants, useAddons, useFeatures, useLimits } from '../hooks/usePlatformData';
import EntitlementsTab from '../components/EntitlementsTab';
import AccessDenied from '../components/AccessDenied';

export default function EntitlementsPage() {
  const [searchParams] = useSearchParams();
  const initialTenantId = searchParams.get('tenant_id');

  const { showToast } = useToast();
  const { hasPermission } = usePlatformAuth();

  const canManage = hasPermission(PLATFORM_PERMISSIONS.OVERRIDES_MANAGE);

  const { data: tenants = [], isLoading: isTenantsLoading, refetch: refetchTenants } = useTenants();
  const { data: addons = [], isLoading: isAddonsLoading, refetch: refetchAddons } = useAddons();
  const { data: features = [], isLoading: isFeaturesLoading, refetch: refetchFeatures } = useFeatures();
  const { data: limits = [], isLoading: isLimitsLoading, refetch: refetchLimits } = useLimits();

  const isLoading = isTenantsLoading || isAddonsLoading || isFeaturesLoading || isLimitsLoading;

  const handleRefresh = async () => {
    try {
      await Promise.all([refetchTenants(), refetchAddons(), refetchFeatures(), refetchLimits()]);
      showToast('Entitlements refreshed.', 'success');
    } catch {
      showToast('Error syncing entitlements state.', 'error');
    }
  };

  if (!canManage) {
    return (
      <AccessDenied
        requiredPermission={PLATFORM_PERMISSIONS.OVERRIDES_MANAGE}
        title="Entitlement Overrides Access Restricted"
        message="Your platform staff role does not have authorization to manage tenant entitlement overrides."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 size={24} className="animate-spin text-blue-600" />
        <span className="text-xs font-semibold">Loading entitlements & overrides...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-7xl mx-auto pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Entitlements & Add-ons
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage tenant feature flags, usage quotas, and administrative overrides.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium self-start sm:self-auto cursor-pointer shadow-2xs"
          title="Reload entitlements data"
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      <EntitlementsTab
        tenants={tenants}
        initialTenantId={initialTenantId ? Number(initialTenantId) : undefined}
        addons={addons}
        features={features}
        limits={limits}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
