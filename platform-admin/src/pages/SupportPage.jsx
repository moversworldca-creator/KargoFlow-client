import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, RefreshCw, AlertTriangle, Plus } from 'lucide-react';
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
  const canCreate = hasPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSIONS_CREATE);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
    <div className="space-y-3 max-w-7xl mx-auto pb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#0B132B] dark:text-white tracking-tight">
            Support Sessions & Tenant Impersonation
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleRefresh}
            className="px-3.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs sm:text-sm font-semibold cursor-pointer shadow-xs"
            title="Reload support sessions"
          >
            <RefreshCw size={13} className="text-slate-600 dark:text-slate-300" />
            <span>Refresh</span>
          </button>

          {canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-1.5 rounded-md bg-[#F25900] hover:bg-[#D94F00] text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>New Support Session</span>
            </button>
          )}
        </div>
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
        showCreateModal={showCreateModal}
        setShowCreateModal={setShowCreateModal}
        hideTopAction={true}
      />
    </div>
  );
}
