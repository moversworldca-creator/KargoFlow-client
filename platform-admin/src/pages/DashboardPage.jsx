import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, RefreshCw } from 'lucide-react';
import platformApi from '../api/platformApi';
import { useToast } from '../context/ToastContext';
import { useDashboardData, usePlans, useInvalidatePlatformQueries } from '../hooks/usePlatformData';
import PlatformOverviewTab from '../components/PlatformOverviewTab';
import ProvisionTenantModal from '../components/ProvisionTenantModal';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProvisionModal, setShowProvisionModal] = useState(false);

  const { data: dashboardData, isLoading: isDashLoading, refetch: refetchDash } = useDashboardData();
  const { data: plans = [], isLoading: isPlansLoading, refetch: refetchPlans } = usePlans();
  const { invalidateAll } = useInvalidatePlatformQueries();

  const isLoading = isDashLoading || isPlansLoading;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchDash(), refetchPlans()]);
      showToast('Dashboard metrics refreshed.', 'success');
    } catch {
      showToast('Error syncing dashboard metrics.', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleNavigateTab = (tab) => {
    const routeMap = {
      overview: '/',
      tenants: '/tenants',
      subscriptions: '/subscriptions',
      plans: '/plans',
      features: '/features',
      entitlements: '/entitlements',
      support: '/support',
      admins: '/admins',
      audits: '/audit',
    };
    navigate(routeMap[tab] || `/${tab}`);
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 size={24} className="animate-spin text-blue-600" />
        <span className="text-xs font-semibold">Loading Control Center metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 max-w-7xl mx-auto pb-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Platform Operations Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Reload control plane data"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
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

      <PlatformOverviewTab
        dashboardData={dashboardData}
        plans={plans}
        onNavigateTab={handleNavigateTab}
        onOpenProvisionModal={() => setShowProvisionModal(true)}
      />

      <ProvisionTenantModal
        isOpen={showProvisionModal}
        onClose={() => setShowProvisionModal(false)}
        plans={plans}
        onTenantProvisioned={() => invalidateAll()}
      />
    </div>
  );
}
