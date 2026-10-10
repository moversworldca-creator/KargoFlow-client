import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import platformApi from '../api/platformApi';
import { useToast } from '../context/ToastContext';
import { usePlatformAuth } from '../auth/PlatformAuthContext';
import { PLATFORM_PERMISSIONS } from '../rbac/platformRbac';
import { useFeatures, usePlans, useInvalidatePlatformQueries } from '../hooks/usePlatformData';
import FeaturesCatalogTab from '../components/FeaturesCatalogTab';
import AccessDenied from '../components/AccessDenied';

export default function FeaturesPage() {
  const { showToast } = useToast();
  const { hasPermission } = usePlatformAuth();

  const canView = hasPermission(PLATFORM_PERMISSIONS.PLANS_VIEW);

  const { data: features = [], isLoading: isFeaturesLoading, refetch: refetchFeatures } = useFeatures();
  const { data: plans = [], isLoading: isPlansLoading, refetch: refetchPlans } = usePlans();
  const { invalidatePlans, invalidateAll } = useInvalidatePlatformQueries();

  const isLoading = isFeaturesLoading || isPlansLoading;

  const handleRefresh = async () => {
    try {
      await Promise.all([refetchFeatures(), refetchPlans()]);
      showToast('Features catalog refreshed.', 'success');
    } catch {
      showToast('Error syncing features catalog.', 'error');
    }
  };

  if (!canView) {
    return (
      <AccessDenied
        requiredPermission={PLATFORM_PERMISSIONS.PLANS_VIEW}
        title="Features Matrix Access Restricted"
        message="Your platform staff role does not have authorization to inspect feature catalog allocations."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 size={24} className="animate-spin text-blue-600" />
        <span className="text-xs font-semibold">Loading feature catalog...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <FeaturesCatalogTab
        features={features}
        plans={plans}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
