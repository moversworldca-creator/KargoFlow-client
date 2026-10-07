import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { usePlatformAuth } from '../auth/PlatformAuthContext';
import { PLATFORM_PERMISSIONS } from '../rbac/platformRbac';
import { useSupportSessions, useTenants, useInvalidatePlatformQueries } from '../hooks/usePlatformData';
import SupportSessionsTab from '../components/SupportSessionsTab';
import AccessDenied from '../components/AccessDenied';

export default function SupportPage() {
  const [searchParams] = useSearchParams();
  const initialTenantId = searchParams.get('tenant_id');

  const { showToast } = useToast();
  const { hasPermission } = usePlatformAuth();

  const canView = hasPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSIONS_VIEW);

  const { data: sessions = [], isLoading: isSessionsLoading, refetch: refetchSessions } = useSupportSessions();
  const { data: tenants = [], isLoading: isTenantsLoading, refetch: refetchTenants } = useTenants();
  const { invalidateSupportSessions, invalidateAll } = useInvalidatePlatformQueries();

  const isLoading = isSessionsLoading || isTenantsLoading;

  const handleRefresh = async () => {
    try {
      await Promise.all([refetchSessions(), refetchTenants()]);
      showToast('Support sessions refreshed.', 'success');
    } catch {
      showToast('Error syncing support sessions state.', 'error');
    }
  };

  if (!canView) {
    return (
      <AccessDenied
        requiredPermission={PLATFORM_PERMISSIONS.SUPPORT_SESSIONS_VIEW}
        title="Support Sessions Access Restricted"
        message="Your platform staff role does not have authorization to view or initiate controlled support sessions."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 size={24} className="animate-spin text-blue-600" />
        <span className="text-xs font-semibold">Loading support sessions...</span>
      </div>
    );
  }

  const initialTargetTenant = initialTenantId
    ? tenants.find((t) => String(t.id) === String(initialTenantId))
    : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
              Controlled Access
            </span>
            <span className="text-xs text-slate-400 font-mono">Time-boxed Audited Sessions</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Support Sessions & Tenant Impersonation
          </h1>
        </div>

        <button
          onClick={handleRefresh}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-bold self-start sm:self-auto cursor-pointer"
          title="Reload support sessions"
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      <SupportSessionsTab
        sessions={sessions}
        tenants={tenants}
        initialTargetTenant={initialTargetTenant}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
