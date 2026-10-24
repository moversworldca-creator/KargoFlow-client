import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, RefreshCw, Calendar, LayoutGrid } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useDashboardData, usePlans, useTenants, useSubscriptions, useInvalidatePlatformQueries } from '../hooks/usePlatformData';
import PlatformOverviewTab from '../components/PlatformOverviewTab';
import ProvisionTenantModal from '../components/ProvisionTenantModal';
import TenantLifecycleModal from '../components/TenantLifecycleModal';
import SubscriptionLifecycleModal from '../components/SubscriptionLifecycleModal';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const { data: dashboardData, isLoading: isDashLoading, refetch: refetchDash } = useDashboardData();
  const { data: plans = [], isLoading: isPlansLoading, refetch: refetchPlans } = usePlans();
  const { data: tenants = [], isLoading: isTenantsLoading, refetch: refetchTenants } = useTenants({ page_size: 5 });
  const { data: subscriptions = [], isLoading: isSubsLoading, refetch: refetchSubs } = useSubscriptions({ page_size: 5 });
  const { invalidateAll } = useInvalidatePlatformQueries();

  const isLoading = isDashLoading || isPlansLoading;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchDash(), refetchPlans(), refetchTenants(), refetchSubs()]);
      showToast('Dashboard metrics refreshed.', 'success');
    } catch {
      showToast('Error syncing dashboard metrics.', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleNavigateTab = (tab, filterQuery = '') => {
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
    const target = routeMap[tab] || `/${tab}`;
    navigate(filterQuery ? `${target}?${filterQuery}` : target);
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
    <div className="w-full space-y-1.5 pb-0.5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1">
        {/* Left: Icon Badge & Dashboard Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-50/90 border border-blue-100/60 dark:bg-blue-950/40 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 shrink-0 shadow-2xs">
            <LayoutGrid size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Platform Operations Dashboard
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              Monitor platform health, tenant activity, and system operations
            </p>
          </div>
        </div>

        {/* Right: Date/Time Pill, Refresh Pill, Provision Button */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Date & Time Widget Pill */}
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-2xs">
            <Calendar size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700/80" />
            <div className="leading-tight">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {formattedDate}
              </div>
              <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                {formattedDayTime}
              </div>
            </div>
          </div>

          {/* Refresh Pill Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-full border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 text-xs font-bold shadow-2xs cursor-pointer disabled:opacity-60"
            title="Reload control plane data"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-500 dark:text-slate-400'} />
            <span>Refresh</span>
          </button>

          {/* Provision Tenant Button */}
          <button
            onClick={() => setShowProvisionModal(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={15} className="stroke-[2.5]" />
            <span>Provision Tenant</span>
          </button>
        </div>
      </div>

      <PlatformOverviewTab
        dashboardData={dashboardData}
        plans={plans}
        tenants={tenants}
        subscriptions={subscriptions}
        onNavigateTab={handleNavigateTab}
        onOpenProvisionModal={() => setShowProvisionModal(true)}
        onSelectTenant={(tenant) => setSelectedTenant(tenant)}
        onSelectSubscription={(sub) => setSelectedSubscription(sub)}
      />

      <ProvisionTenantModal
        isOpen={showProvisionModal}
        onClose={() => setShowProvisionModal(false)}
        plans={plans}
        onTenantProvisioned={() => invalidateAll()}
      />

      {/* Tenant Lifecycle Action Modal */}
      <TenantLifecycleModal
        isOpen={Boolean(selectedTenant)}
        onClose={() => setSelectedTenant(null)}
        tenant={selectedTenant}
        onTenantUpdated={() => invalidateAll()}
      />

      {/* Subscription Lifecycle Action Modal */}
      <SubscriptionLifecycleModal
        isOpen={Boolean(selectedSubscription)}
        onClose={() => setSelectedSubscription(null)}
        subscription={selectedSubscription}
        plans={plans}
        tenants={tenants}
        onSubscriptionUpdated={() => invalidateAll()}
      />
    </div>
  );
}
