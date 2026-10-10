import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, RefreshCw, Building2 } from 'lucide-react';
import platformApi from '../api/platformApi';
import { useToast } from '../context/ToastContext';
import { usePlatformAuth } from '../auth/PlatformAuthContext';
import { PLATFORM_PERMISSIONS } from '../rbac/platformRbac';
import { useTenants, usePlans, useInvalidatePlatformQueries } from '../hooks/usePlatformData';
import TenantDirectoryTab from '../components/TenantDirectoryTab';
import ProvisionTenantModal from '../components/ProvisionTenantModal';
import AccessDenied from '../components/AccessDenied';

export default function TenantsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { hasPermission } = usePlatformAuth();

  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const canView = hasPermission(PLATFORM_PERMISSIONS.TENANTS_VIEW);

  const { data: tenants = [], isLoading: isTenantsLoading, refetch: refetchTenants } = useTenants();
  const { data: plans = [], isLoading: isPlansLoading, refetch: refetchPlans } = usePlans();
  const { invalidateTenants, invalidateAll } = useInvalidatePlatformQueries();

  const isLoading = isTenantsLoading || isPlansLoading;

  const handleRefresh = async () => {
    try {
      await Promise.all([refetchTenants(), refetchPlans()]);
      showToast('Tenant directory refreshed.', 'success');
    } catch {
      showToast('Error syncing tenants directory.', 'error');
    }
  };

  if (!canView) {
    return (
      <AccessDenied
        requiredPermission={PLATFORM_PERMISSIONS.TENANTS_VIEW}
        title="Tenant Directory Access Restricted"
        message="Your platform staff role does not have authorization to view tenant companies."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 size={24} className="animate-spin text-blue-600" />
        <span className="text-xs font-semibold">Loading tenant directory...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 max-w-7xl mx-auto pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Tenants Management
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Reload tenants list"
          >
            <RefreshCw size={14} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setShowProvisionModal(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={15} />
            <span>Provision Tenant</span>
          </button>
        </div>
      </div>

      <TenantDirectoryTab
        tenants={tenants}
        plans={plans}
        onRefresh={handleRefresh}
        onOpenProvisionModal={() => setShowProvisionModal(true)}
        onSelectTenantForEntitlements={(tenant) => {
          navigate(`/entitlements?tenant_id=${tenant.id}`);
        }}
        onInitiateSupportSession={(tenant) => {
          navigate(`/support?tenant_id=${tenant.id}`);
        }}
      />

      <ProvisionTenantModal
        isOpen={showProvisionModal}
        onClose={() => setShowProvisionModal(false)}
        plans={plans}
        onTenantProvisioned={() => {
          invalidateTenants();
          invalidateAll();
        }}
      />
    </div>
  );
}
