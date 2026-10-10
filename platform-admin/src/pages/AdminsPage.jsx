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
    <div className="max-w-7xl mx-auto pb-10">
      <PlatformAdminsTab
        admins={admins}
        tenants={tenants}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
