import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Sparkles, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useDashboardData, usePlans, useInvalidatePlatformQueries } from '../hooks/usePlatformData';
import PlatformOverviewTab from '../components/PlatformOverviewTab';
import ProvisionTenantModal from '../components/ProvisionTenantModal';
import SeedDataModal from '../components/SeedDataModal';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
              Overview
            </span>
            <span className="text-xs text-slate-400 font-mono">Real-time telemetry</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Platform Operations Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSeedModal(true)}
            className="px-3.5 py-2.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Seed Test & Presentation Template Data"
          >
            <Sparkles size={14} className="text-purple-600 dark:text-purple-400" />
            <span className="hidden sm:inline">Seed Presentation Data</span>
          </button>

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
        onOpenSeedModal={() => setShowSeedModal(true)}
      />

      <ProvisionTenantModal
        isOpen={showProvisionModal}
        onClose={() => setShowProvisionModal(false)}
        plans={plans}
        onTenantProvisioned={() => invalidateAll()}
      />

      <SeedDataModal
        isOpen={showSeedModal}
        onClose={() => setShowSeedModal(false)}
        onDataSeeded={() => invalidateAll()}
      />
    </div>
  );
}
