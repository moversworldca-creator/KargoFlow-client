import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import platformApi from '../api/platformApi';
import { useToast } from '../context/ToastContext';
import { usePlatformAuth } from '../auth/PlatformAuthContext';
import { PLATFORM_PERMISSIONS } from '../rbac/platformRbac';
import { usePlatformAdmins, useTenants, useInvalidatePlatformQueries } from '../hooks/usePlatformData';
import PlatformAdminsTab from '../components/PlatformAdminsTab';
import AccessDenied from '../components/AccessDenied';

export default function AdminsPage() {
  const { showToast } = useToast();
  const { hasPermission } = usePlatformAuth();

  const canView = hasPermission(PLATFORM_PERMISSIONS.USERS_VIEW);

  const { data: admins = [], isLoading: isAdminsLoading, refetch: refetchAdmins } = usePlatformAdmins();
  const { data: tenants = [], isLoading: isTenantsLoading, refetch: refetchTenants } = useTenants();
  const { invalidateAdmins, invalidateAll } = useInvalidatePlatformQueries();

  const isLoading = isAdminsLoading || isTenantsLoading;

  const handleRefresh = async () => {
    try {
      invalidateAdmins();
      await Promise.all([refetchAdmins(), refetchTenants()]);
      showToast('Platform staff list refreshed.', 'success');
    } catch {
      showToast('Error syncing platform staff list.', 'error');
    }
  };

  const handleDataMutated = async () => {
    invalidateAdmins();
    await refetchAdmins();
  };

  if (!canView) {
    return (
      <AccessDenied
        requiredPermission={PLATFORM_PERMISSIONS.USERS_VIEW}
        title="Platform Staff Management Restricted"
        message="Your platform role does not have authorization to view or manage platform administrator accounts."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 size={24} className="animate-spin text-blue-600" />
        <span className="text-xs font-semibold">Loading platform staff accounts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
              Security & Identity
            </span>
            <span className="text-xs text-slate-400 font-mono">Platform RBAC Matrix</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Platform Staff & RBAC
          </h1>
        </div>

        <button
          onClick={handleRefresh}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-bold self-start sm:self-auto cursor-pointer"
          title="Reload staff accounts"
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      <PlatformAdminsTab
        admins={admins}
        tenants={tenants}
        onRefresh={handleDataMutated}
      />
    </div>
  );
}
