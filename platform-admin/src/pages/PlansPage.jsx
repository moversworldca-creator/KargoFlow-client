import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { usePlatformAuth } from '../auth/PlatformAuthContext';
import { PLATFORM_PERMISSIONS } from '../rbac/platformRbac';
import { usePlans, useFeatures, useLimits, useInvalidatePlatformQueries } from '../hooks/usePlatformData';
import PlansCatalogTab from '../components/PlansCatalogTab';
import AccessDenied from '../components/AccessDenied';

export default function PlansPage() {
  const { showToast } = useToast();
  const { hasPermission } = usePlatformAuth();

  const canView = hasPermission(PLATFORM_PERMISSIONS.PLANS_VIEW);

  const { data: plans = [], isLoading: isPlansLoading, refetch: refetchPlans } = usePlans();
  const { data: features = [], isLoading: isFeaturesLoading, refetch: refetchFeatures } = useFeatures();
  const { data: limits = [], isLoading: isLimitsLoading, refetch: refetchLimits } = useLimits();
  const { invalidatePlans, invalidateAll } = useInvalidatePlatformQueries();

  const isLoading = isPlansLoading || isFeaturesLoading || isLimitsLoading;

  const handleRefresh = async () => {
    try {
      await Promise.all([refetchPlans(), refetchFeatures(), refetchLimits()]);
      showToast('Plans catalog refreshed.', 'success');
    } catch {
      showToast('Error syncing plans catalog.', 'error');
    }
  };

  if (!canView) {
    return (
      <AccessDenied
        requiredPermission={PLATFORM_PERMISSIONS.PLANS_VIEW}
        title="Plans Catalog Access Restricted"
        message="Your platform staff role does not have authorization to view pricing plans."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 size={24} className="animate-spin text-blue-600" />
        <span className="text-xs font-semibold">Loading plans catalog...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
              Packaging & Pricing
            </span>
            <span className="text-xs text-slate-400 font-mono">Plan templates</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Plans Catalog
          </h1>
        </div>

        <button
          onClick={handleRefresh}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-bold self-start sm:self-auto cursor-pointer"
          title="Reload plans catalog"
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      <PlansCatalogTab
        plans={plans}
        features={features}
        limits={limits}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
