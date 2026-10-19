import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, RefreshCw, Calendar } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useDashboardData, usePlans, useInvalidatePlatformQueries } from '../hooks/usePlatformData';
import PlatformOverviewTab from '../components/PlatformOverviewTab';
import ProvisionTenantModal from '../components/ProvisionTenantModal';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

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

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(currentDateTime);

  const formattedDayTime = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(currentDateTime);

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 size={24} className="animate-spin text-blue-600" />
        <span className="text-xs font-semibold">Loading Control Center metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Platform Operations Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal mt-1">
            Monitor platform health, tenant activity, and system operations
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Date & Time Widget */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 shadow-2xs">
            <Calendar size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <div className="leading-tight">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {formattedDate}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500">
                {formattedDayTime}
              </div>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-bold shadow-2xs cursor-pointer"
            title="Reload control plane data"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-500'} />
            <span>Refresh</span>
          </button>

          {/* Provision Tenant Button */}
          <button
            onClick={() => setShowProvisionModal(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
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
