import React from 'react';
import { 
  Building2, Layers, Activity, 
  ArrowRight, PieChart, FileText, 
  Settings, Shield, BarChart2
} from 'lucide-react';

const PALETTE = [
  { dot: 'bg-blue-600', bar: 'bg-blue-600', stroke: '#2563eb' },
  { dot: 'bg-sky-400', bar: 'bg-sky-400', stroke: '#38bdf8' },
  { dot: 'bg-indigo-500', bar: 'bg-indigo-500', stroke: '#6366f1' },
  { dot: 'bg-purple-500', bar: 'bg-purple-500', stroke: '#a855f7' },
  { dot: 'bg-emerald-500', bar: 'bg-emerald-500', stroke: '#10b981' },
  { dot: 'bg-slate-400 dark:bg-slate-500', bar: 'bg-slate-400 dark:bg-slate-500', stroke: '#94a3b8' },
];

function formatAuditDate(rawDate) {
  if (!rawDate) return null;
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

function formatRelativeTime(rawDate) {
  if (!rawDate) return '';
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return '';
  const diffSecs = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (diffSecs < 60) return 'Just now';
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function PlatformOverviewTab({ 
  dashboardData, 
  plans = [], 
  onNavigateTab, 
  onOpenProvisionModal
}) {
  const metrics = dashboardData?.metrics || {};
  const recentAudits = dashboardData?.recent_audits || [];
  const plansSummary = dashboardData?.plans_summary || [];

  const totalTenants = Number(metrics.total_tenants ?? 0);
  const activeTenants = Number(metrics.active_tenants ?? 0);
  const provisioningTenants = Number(metrics.provisioning_tenants ?? 0);
  const onboardingTenants = Number(metrics.onboarding_tenants ?? 0);

  const totalSubscriptions = Number(metrics.total_subscriptions ?? 0);
  const activeSubscriptions = Number(metrics.active_subscriptions ?? 0);
  const trialingSubscriptions = Number(metrics.trialing_subscriptions ?? 0);
  const pastDueSubscriptions = Number(metrics.past_due_subscriptions ?? 0);
  const suspendedSubscriptions = Number(metrics.suspended_subscriptions ?? 0);

  const activeSupportSessions = Number(metrics.active_support_sessions ?? 0);

  const mrrDollars = (metrics.mrr_cents ? metrics.mrr_cents / 100 : 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  const arrDollars = (metrics.arr_cents ? metrics.arr_cents / 100 : 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  // Calculate real subscription health bar chart heights dynamically
  const maxSubValue = Math.max(totalSubscriptions, trialingSubscriptions, activeSubscriptions, 1);
  const barH1 = Math.max(4, Math.round((trialingSubscriptions / maxSubValue) * 32));
  const barH2 = Math.max(4, Math.round((activeSubscriptions / maxSubValue) * 32));
  const barH3 = Math.max(4, Math.round((pastDueSubscriptions / maxSubValue) * 32));
  const barH4 = Math.max(4, Math.round((suspendedSubscriptions / maxSubValue) * 32));
  const barH5 = Math.max(4, Math.round((totalSubscriptions / maxSubValue) * 32));

  // Build Real Plans Adoption Data from API
  // Use plansSummary if available, else merge with catalog plans
  const rawPlanList = plansSummary.length > 0 
    ? plansSummary 
    : plans.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        subscriber_count: p.subscriber_count || 0,
      }));

  const totalSubscribersAllPlans = rawPlanList.reduce(
    (sum, p) => sum + (Number(p.subscriber_count) || 0),
    0
  );

  const denominator = totalSubscriptions > 0 
    ? totalSubscriptions 
    : (totalSubscribersAllPlans > 0 ? totalSubscribersAllPlans : 0);

  const realPlans = rawPlanList.map((p, idx) => {
    const count = Number(p.subscriber_count) || 0;
    const pct = denominator > 0 ? Math.round((count / denominator) * 100) : 0;
    const theme = PALETTE[idx % PALETTE.length];
    return {
      id: p.id || idx,
      name: p.name || 'Unnamed Plan',
      count,
      pct,
      dotClass: theme.dot,
      barClass: theme.bar,
      stroke: theme.stroke,
    };
  });

  // Donut Chart: Represents real tenant plan adoption percentage
  const adoptionPercentage = totalTenants > 0 
    ? Math.min(100, Math.round((activeSubscriptions / totalTenants) * 100))
    : (denominator > 0 ? 100 : 0);

  const donutRadius = 50;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const strokeDashoffset = donutCircumference - (adoptionPercentage / 100) * donutCircumference;

  // Real Self-Serve vs Custom Sales Ratio based on plan visibility
  const publicSubscribers = rawPlanList.reduce((sum, p) => {
    const planDef = plans.find((pl) => pl.id === p.id || pl.code === p.code);
    const isPublic = planDef ? planDef.is_public !== false : true;
    return isPublic ? sum + (Number(p.subscriber_count) || 0) : sum;
  }, 0);

  const customSubscribers = rawPlanList.reduce((sum, p) => {
    const planDef = plans.find((pl) => pl.id === p.id || pl.code === p.code);
    const isCustom = planDef ? planDef.is_public === false : false;
    return isCustom ? sum + (Number(p.subscriber_count) || 0) : sum;
  }, 0);

  const totalClassifiedSubscribers = publicSubscribers + customSubscribers;
  const selfServeRatio = totalClassifiedSubscribers > 0 
    ? Math.round((publicSubscribers / totalClassifiedSubscribers) * 100) 
    : 0;
  const customSalesRatio = totalClassifiedSubscribers > 0 
    ? 100 - selfServeRatio 
    : 0;

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* 4 Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Tenants */}
        <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Building2 size={16} />
              </div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Tenants
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {totalTenants}
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full">
                {activeTenants} Active
              </span>
            </div>
          </div>

          <div className="pt-3 flex items-end justify-between relative z-10">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {provisioningTenants} provisioning / {onboardingTenants} onboarding
            </p>
          </div>

          {/* Blue Decorative Sparkline Wave */}
          <div className="absolute right-0 bottom-0 pointer-events-none opacity-80">
            <svg viewBox="0 0 110 44" className="w-28 h-11" fill="none">
              <defs>
                <linearGradient id="blueSpark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0,36 C25,36 35,26 55,26 C75,26 85,12 110,12 L110,44 L0,44 Z" fill="url(#blueSpark)" />
              <path d="M0,36 C25,36 35,26 55,26 C75,26 85,12 110,12" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Metric 2: Platform MRR */}
        <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                $
              </div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Platform MRR
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {mrrDollars}
              </div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-0.5 rounded-full">
                ARR {arrDollars}
              </span>
            </div>
          </div>

          <div className="pt-3 flex items-end justify-between relative z-10">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Across {activeSubscriptions} active subscriptions
            </p>
          </div>

          {/* Green Decorative Sparkline Wave */}
          <div className="absolute right-0 bottom-0 pointer-events-none opacity-80">
            <svg viewBox="0 0 110 44" className="w-28 h-11" fill="none">
              <defs>
                <linearGradient id="greenSpark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0,38 C25,38 40,32 60,32 C80,32 90,16 110,16 L110,44 L0,44 Z" fill="url(#greenSpark)" />
              <path d="M0,38 C25,38 40,32 60,32 C80,32 90,16 110,16" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Metric 3: Subscriptions Health */}
        <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Layers size={16} />
              </div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Subscriptions Health
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {totalSubscriptions}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">accounts</span>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 font-bold text-[11px]">
                {trialingSubscriptions} trial
              </span>
              <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 font-bold text-[11px]">
                {pastDueSubscriptions} past due
              </span>
              <span className="px-2 py-0.5 rounded-md bg-purple-50/60 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 font-bold text-[11px]">
                {suspendedSubscriptions} susp.
              </span>
            </div>

            {/* Dynamic Lavender/Purple Mini Bar Chart Scaled from Real Subscriptions */}
            <div className="flex items-end gap-1 h-8 shrink-0 pl-2">
              <div 
                className="w-1.5 rounded-t-sm bg-purple-100 dark:bg-purple-950/80 transition-all duration-300"
                style={{ height: `${barH1}px` }}
                title={`Trialing: ${trialingSubscriptions}`}
              />
              <div 
                className="w-1.5 rounded-t-sm bg-purple-200 dark:bg-purple-900/60 transition-all duration-300"
                style={{ height: `${barH2}px` }}
                title={`Active: ${activeSubscriptions}`}
              />
              <div 
                className="w-1.5 rounded-t-sm bg-purple-300 dark:bg-purple-800/70 transition-all duration-300"
                style={{ height: `${barH3}px` }}
                title={`Past Due: ${pastDueSubscriptions}`}
              />
              <div 
                className="w-1.5 rounded-t-sm bg-purple-400 dark:bg-purple-700/80 transition-all duration-300"
                style={{ height: `${barH4}px` }}
                title={`Suspended: ${suspendedSubscriptions}`}
              />
              <div 
                className="w-1.5 rounded-t-sm bg-purple-500 dark:bg-purple-600 transition-all duration-300"
                style={{ height: `${barH5}px` }}
                title={`Total: ${totalSubscriptions}`}
              />
            </div>
          </div>
        </div>

        {/* Metric 4: Active Sessions */}
        <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Activity size={16} />
              </div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Active Sessions
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {activeSupportSessions}
              </div>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                activeSupportSessions > 0 
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 animate-pulse' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}>
                {activeSupportSessions > 0 ? 'Live Impersonation' : 'No active sessions'}
              </span>
            </div>
          </div>

          <div className="pt-3 flex items-end justify-between relative z-10">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Governed by Section 1.9 Controlled Access
            </p>
          </div>

          {/* Orange Decorative Sparkline Wave */}
          <div className="absolute right-0 bottom-0 pointer-events-none opacity-80">
            <svg viewBox="0 0 110 44" className="w-28 h-11" fill="none">
              <defs>
                <linearGradient id="amberSpark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0,38 C20,38 35,34 50,34 C70,34 85,14 110,14 L110,44 L0,44 Z" fill="url(#amberSpark)" />
              <path d="M0,38 C20,38 35,34 50,34 C70,34 85,14 110,14" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Two Column Section: Plan Adoption Distribution + Recent Platform Audits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Left Card: Plan Adoption Distribution */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-5">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <PieChart size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    Plan Adoption Distribution
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Tier breakdown across active tenant orgs
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('plans')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Manage Plans</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Main Area: Donut Chart + Plan Rows */}
            {realPlans.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                No active plans found in catalog.
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
                {/* Donut Chart */}
                <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 130 130">
                    {/* Background Track Circle */}
                    <circle
                      cx="65"
                      cy="65"
                      r={donutRadius}
                      className="stroke-slate-100 dark:stroke-slate-800"
                      strokeWidth="14"
                      fill="transparent"
                    />
                    {/* Real Progress Segment */}
                    <circle
                      cx="65"
                      cy="65"
                      r={donutRadius}
                      stroke="#2563eb"
                      strokeWidth="14"
                      strokeDasharray={donutCircumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>

                  {/* Donut Chart Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                    <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                      {totalTenants}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
                      {totalTenants === 1 ? 'Tenant' : 'Tenants'}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {adoptionPercentage}%
                    </span>
                  </div>
                </div>

                {/* Real Plans Progress Bars */}
                <div className="flex-1 w-full space-y-3.5">
                  {realPlans.map((plan) => (
                    <div key={plan.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${plan.dotClass}`} />
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {plan.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400 dark:text-slate-500">
                            {plan.count} {plan.count === 1 ? 'tenant' : 'tenants'}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 w-8 text-right">
                            {plan.pct}%
                          </span>
                        </div>
                      </div>
                      {/* Bar track */}
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${plan.barClass}`}
                          style={{ width: `${plan.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Card Footer: Real Self-serve vs Custom Sales Ratio */}
          <div className="rounded-xl bg-blue-50/50 dark:bg-slate-800/40 border border-blue-100/60 dark:border-slate-800 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-100/70 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <BarChart2 size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Self-serve vs custom sales ratio
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500">
                    Distribution of how tenants are onboarded
                  </div>
                </div>
              </div>
              <div className="text-sm font-black text-slate-800 dark:text-slate-200">
                {selfServeRatio}% / {customSalesRatio}%
              </div>
            </div>
            {/* Split Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
              <div 
                className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                style={{ width: `${selfServeRatio}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Right Card: Recent Platform Audits (Only Real Audits) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    Recent Platform Audits
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Immutable log of control plane operations
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('audits')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Trail</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Audit List Items (Real Data Only) */}
            {recentAudits.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <FileText size={18} />
                </div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  No recent platform audit logs
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Control plane actions will automatically appear here as operations occur.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {recentAudits.slice(0, 4).map((audit, i) => {
                  const rawDate = audit.occurred_at || audit.created_at || audit.timestamp;
                  const dateFormatted = formatAuditDate(rawDate) || 'Recently';
                  const relativeTime = formatRelativeTime(rawDate);

                  // Dynamically select action category icon
                  const actionStr = String(audit.action || '').toLowerCase();
                  let iconEl;
                  if (actionStr.includes('bootstrap') || actionStr.includes('admin') || actionStr.includes('auth') || actionStr.includes('security')) {
                    iconEl = (
                      <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Shield size={15} />
                      </div>
                    );
                  } else if (actionStr.includes('config') || actionStr.includes('setting') || actionStr.includes('feature') || actionStr.includes('limit')) {
                    iconEl = (
                      <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Settings size={15} />
                      </div>
                    );
                  } else if (actionStr.includes('tenant') || actionStr.includes('company') || actionStr.includes('subscription')) {
                    iconEl = (
                      <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <Layers size={15} />
                      </div>
                    );
                  } else {
                    iconEl = (
                      <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <FileText size={15} />
                      </div>
                    );
                  }

                  return (
                    <div key={audit.id || `audit-${i}`} className="py-3 flex items-start justify-between gap-3 text-xs">
                      <div className="flex items-start gap-3 min-w-0">
                        {iconEl}
                        <div className="space-y-1 min-w-0">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 inline-block">
                            {audit.action || 'system.operation'}
                          </span>
                          <p className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                            {audit.reason || audit.description || audit.tenant_name || 'Control plane action'}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">
                            Actor: {audit.actor_email || audit.platform_user_id || 'System'} • IP: {audit.ip_address || '—'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 pt-0.5 space-y-0.5">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {dateFormatted}
                        </div>
                        {relativeTime && (
                          <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            {relativeTime}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
