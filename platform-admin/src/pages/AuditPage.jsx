import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { usePlatformAuth } from '../auth/PlatformAuthContext';
import { PLATFORM_PERMISSIONS } from '../rbac/platformRbac';
import { usePlatformAuditLogs, useInvalidatePlatformQueries } from '../hooks/usePlatformData';
import PlatformAuditLogsTab from '../components/PlatformAuditLogsTab';
import AccessDenied from '../components/AccessDenied';

export default function AuditPage() {
  const { showToast } = useToast();
  const { hasPermission } = usePlatformAuth();

  const canView = hasPermission(PLATFORM_PERMISSIONS.AUDIT_VIEW);

  const { data: auditLogs = [], isLoading, refetch } = usePlatformAuditLogs();
  const { invalidateAuditLogs } = useInvalidatePlatformQueries();

  const handleRefresh = async () => {
    try {
      await refetch();
      showToast('Audit trail refreshed.', 'success');
    } catch {
      showToast('Error syncing audit trail.', 'error');
    }
  };

  if (!canView) {
    return (
      <AccessDenied
        requiredPermission={PLATFORM_PERMISSIONS.AUDIT_VIEW}
        title="Audit Trail Access Restricted"
        message="Your platform role does not have authorization to view immutable audit logs."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 size={24} className="animate-spin text-blue-600" />
        <span className="text-xs font-semibold">Loading platform audit logs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
              Compliance & Security
            </span>
            <span className="text-xs text-slate-400 font-mono">Immutable Append-only Footprint</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Platform Audit Trail
          </h1>
        </div>

        <button
          onClick={handleRefresh}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-bold self-start sm:self-auto cursor-pointer"
          title="Reload audit records"
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      <PlatformAuditLogsTab
        auditLogs={auditLogs}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
