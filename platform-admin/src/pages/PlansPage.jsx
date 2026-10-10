import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import platformApi from '../api/platformApi';
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
    <div className="max-w-7xl mx-auto pb-6">
      <PlansCatalogTab
        plans={plans}
        features={features}
        limits={limits}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
