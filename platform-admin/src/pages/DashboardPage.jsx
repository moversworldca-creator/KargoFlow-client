import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, RefreshCw, Calendar } from 'lucide-react';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Platform Operations Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
            Monitor platform health, tenant activity, and system operations
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
          {/* Date & Time Widget */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 shadow-2xs">
            <Calendar size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <div className="leading-tight">
              <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                {formattedDate}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500">
                {formattedDayTime}
              </div>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-bold shadow-2xs cursor-pointer"
            title="Reload control plane data"
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-500'} />
            <span>Refresh</span>
          </button>

          {/* Provision Tenant Button */}
          <button
            onClick={() => setShowProvisionModal(true)}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={13} />
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
