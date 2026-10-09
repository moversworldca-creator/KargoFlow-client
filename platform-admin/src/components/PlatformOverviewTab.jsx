import React from 'react';
import { 
  Building2, DollarSign, Users, ShieldAlert, 
  Layers, Activity, TrendingUp, AlertTriangle, 
  Clock, Plus, Shield, CheckCircle2, ArrowRight
} from 'lucide-react';

export default function PlatformOverviewTab({ 
  dashboardData, 
  plans = [], 
  onNavigateTab, 
  onOpenProvisionModal
}) {
  const metrics = dashboardData?.metrics || {};
  const recentAudits = dashboardData?.recent_audits || [];
  const plansSummary = dashboardData?.plans_summary || [];

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

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner with Quick Actions */}
     

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Total Tenants</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <Building2 size={16} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {metrics.total_tenants ?? 0}
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              {metrics.active_tenants ?? 0} Active
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {metrics.provisioning_tenants || 0} provisioning / onboarding
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Platform MRR</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {mrrDollars}
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
              ARR {arrDollars}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Across {metrics.active_subscriptions || 0} active subscriptions
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Subscriptions Health</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {metrics.total_subscriptions ?? 0}
            </div>
            <span className="text-xs text-slate-400 font-medium">accounts</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-bold">
              {metrics.trialing_subscriptions || 0} trial
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-bold">
              {metrics.past_due_subscriptions || 0} past due
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              {metrics.suspended_subscriptions || 0} susp.
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Active Sessions</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
              <Activity size={16} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {metrics.active_support_sessions ?? 0}
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              (metrics.active_support_sessions || 0) > 0 
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 animate-pulse' 
                : 'bg-slate-100 text-slate-500'
            }`}>
              {(metrics.active_support_sessions || 0) > 0 ? 'Live Impersonation' : 'No active sessions'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Governed by Section 1.9 Controlled Access
          </p>
        </div>
      </div>

      {/* Two Column Layout: Plan Distribution + Recent Platform Audits */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Plans Distribution Card */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Plan Adoption Distribution</h3>
              <p className="text-xs text-slate-500">Tier breakdown across active tenant orgs</p>
            </div>
            <button
              onClick={() => onNavigateTab('plans')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Manage Plans</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="space-y-4">
            {plansSummary.map((p) => {
              const totalSubs = metrics.total_subscriptions || 1;
              const pct = Math.round(((p.subscriber_count || 0) / totalSubs) * 100);
              return (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{p.name}</span>
                    <span className="font-semibold text-slate-500">
                      {p.subscriber_count} tenants ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Self-serve vs custom sales ratio</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">80% / 20%</span>
          </div>
        </div>

        {/* Recent Platform Audit Trail Card */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Platform Audits</h3>
              <p className="text-xs text-slate-500">Immutable log of control plane operations</p>
            </div>
            <button
              onClick={() => onNavigateTab('audits')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View Full Trail</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentAudits.slice(0, 4).map((audit) => {
              const timeFormatted = new Date(audit.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <div key={audit.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full font-mono font-bold text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {audit.action}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">{audit.tenant_name}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 line-clamp-1">
                      {audit.reason || 'Routine operation'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Actor: {audit.actor_email} • IP: {audit.ip_address}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0 font-medium">{timeFormatted}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
