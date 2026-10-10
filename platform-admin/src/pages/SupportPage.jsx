import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { usePlatformAuth } from '../auth/PlatformAuthContext';
import { PLATFORM_PERMISSIONS, isTenantInScope } from '../rbac/platformRbac';
import { useSupportSessions, useTenants, useInvalidatePlatformQueries } from '../hooks/usePlatformData';
import SupportSessionsTab from '../components/SupportSessionsTab';
import AccessDenied from '../components/AccessDenied';

export default function SupportPage() {
  const [searchParams] = useSearchParams();
  const initialTenantId = searchParams.get('tenant_id');

  const { showToast } = useToast();
  const { hasPermission, platformUser } = usePlatformAuth();

  const canView = hasPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSIONS_VIEW);

  const { data: sessions = [], isLoading: isSessionsLoading, refetch: refetchSessions } = useSupportSessions();
  const { data: allTenants = [], isLoading: isTenantsLoading, refetch: refetchTenants } = useTenants();
  const { invalidateSupportSessions } = useInvalidatePlatformQueries();

  const isLoading = isSessionsLoading || isTenantsLoading;

  // Filter tenants within platform user's authorized company scope
  const scopedTenants = useMemo(() => {
    return (allTenants || []).filter((t) => isTenantInScope(platformUser, t.id));
  }, [allTenants, platformUser]);

  const requestedTenant = useMemo(() => {
    if (!initialTenantId) return null;
    return allTenants.find((t) => String(t.id) === String(initialTenantId)) || null;
  }, [initialTenantId, allTenants]);

  const isRequestedTenantAuthorized = useMemo(() => {
    if (!initialTenantId) return true;
    return isTenantInScope(platformUser, initialTenantId);
  }, [initialTenantId, platformUser]);

  const initialTargetTenant = isRequestedTenantAuthorized ? requestedTenant : null;

  const handleRefresh = async () => {
    try {
      const [sessRes, tenRes] = await Promise.all([refetchSessions(), refetchTenants()]);
      if (sessRes.status === 'error' || sessRes.isError || tenRes.status === 'error' || tenRes.isError) {
        showToast('Error syncing support sessions state.', 'error');
      } else {
        showToast('Support sessions refreshed.', 'success');
      }
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
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

      {initialTenantId && !isRequestedTenantAuthorized && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-rose-900 dark:text-rose-200 text-xs">
          <AlertTriangle className="shrink-0 text-rose-600 mt-0.5" size={16} />
          <div>
            <strong className="font-bold">Unauthorized Tenant Scope:</strong> The requested tenant (ID: {initialTenantId}) is outside your assigned platform company scope. You cannot view or create support sessions for this tenant.
          </div>
        </div>
      )}

      {initialTenantId && isRequestedTenantAuthorized && !requestedTenant && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3 text-amber-900 dark:text-amber-200 text-xs">
          <AlertTriangle className="shrink-0 text-amber-600 mt-0.5" size={16} />
          <div>
            <strong className="font-bold">Tenant Not Found:</strong> The requested tenant (ID: {initialTenantId}) could not be found among active tenants.
          </div>
        </div>
      )}

      <SupportSessionsTab
        sessions={sessions}
        tenants={scopedTenants}
        initialTargetTenant={initialTargetTenant}
        onRefresh={handleRefresh}
        onInvalidateSessions={invalidateSupportSessions}
      />
    </div>
  );
}
