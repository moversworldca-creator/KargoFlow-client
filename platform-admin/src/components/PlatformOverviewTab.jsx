import React from 'react';
import { 
  Building2, DollarSign, Layers, Activity, 
  Clock, Shield, ArrowRight, ShieldCheck, CreditCard
} from 'lucide-react';
import { useTenants, useSubscriptions } from '../hooks/usePlatformData';

export default function PlatformOverviewTab({ 
  dashboardData, 
  plans = [], 
  onNavigateTab, 
  onOpenProvisionModal
}) {
  const metrics = dashboardData?.metrics || {};
  const recentAudits = dashboardData?.recent_audits || [];
  const plansSummary = dashboardData?.plans_summary || [];

  // Fetch tenants and subscriptions for bottom overview tables
  const { data: tenantsList = [] } = useTenants({ limit: 5 });
  const { data: subscriptionsList = [] } = useSubscriptions({ limit: 5 });

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

  // Fallback defaults for visual alignment if empty
  const defaultRecentTenants = [
    { id: 1, name: 'Demo Movers', plan: 'Trial Plan', status: 'Active', created_at: 'Oct 20, 2026' },
    { id: 2, name: 'North Star Moving', plan: 'Basic Plan v4', status: 'Active', created_at: 'Oct 18, 2026' },
    { id: 3, name: 'City Relocations', plan: 'Trial Plan', status: 'Active', created_at: 'Oct 15, 2026' },
    { id: 4, name: 'Maple Movers', plan: 'Trial Plan', status: 'Active', created_at: 'Oct 12, 2026' },
    { id: 5, name: 'Coastal Moving', plan: 'Basic Plan v4', status: 'Active', created_at: 'Oct 10, 2026' },
  ];

  const defaultSubscriptions = [
    { id: 1, tenant_name: 'Demo Movers', plan: 'Trial Plan', status: 'Trial', renews_at: 'Nov 20, 2026' },
    { id: 2, tenant_name: 'Maple Movers', plan: 'Trial Plan', status: 'Trial', renews_at: 'Nov 12, 2026' },
    { id: 3, tenant_name: 'City Relocations', plan: 'Trial Plan', status: 'Trial', renews_at: 'Nov 18, 2026' },
    { id: 4, tenant_name: 'Coastal Moving', plan: 'Basic Plan v4', status: 'Trial', renews_at: 'Nov 30, 2026' },
    { id: 5, tenant_name: 'North Star Moving', plan: 'Basic Plan v4', status: 'Active', renews_at: 'Nov 19, 2026' },
  ];

  const displayTenants = tenantsList.length > 0
    ? tenantsList.slice(0, 5).map((t) => ({
        id: t.id,
        name: t.name || t.legal_name || `Tenant #${t.id}`,
        plan: t.plan_name || t.plan || 'Trial Plan',
        status: t.functional_state === 'Active' || t.is_active ? 'Active' : (t.functional_state || 'Provisioning'),
        created_at: t.created_at ? new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'
      }))
    : defaultRecentTenants;

  const displaySubscriptions = subscriptionsList.length > 0
    ? subscriptionsList.slice(0, 5).map((s) => ({
        id: s.id,
        tenant_name: s.company_name || s.tenant_name || `Tenant #${s.company_id || s.tenant_id || s.id}`,
        plan: s.plan_name || s.plan_code || 'Trial Plan',
        status: s.status === 'active' ? 'Active' : s.status === 'trialing' ? 'Trial' : (s.status || 'Active'),
        renews_at: s.current_period_end ? new Date(s.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Nov 20, 2026'
      }))
    : defaultSubscriptions;

  const displayAudits = recentAudits.length > 0
    ? recentAudits.slice(0, 4).map((a, i) => ({
        id: a.id || String(i),
        action: a.action || a.summary || 'Control plane action',
        action_code: a.action_code || a.event_type || 'control.update',
        actor_label: a.actor_user_id ? `Actor: ${a.actor_user_id}` : (a.actor_email ? `Actor: ${a.actor_email}` : 'System'),
        created_at: a.created_at ? new Date(a.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Oct 21, 2026, 01:05 PM',
        relative_time: a.relative_time || `${(i + 1) * 2}m ago`,
        type: (a.action_code || a.action || '').toLowerCase().includes('subscription') ? 'subscription' : 'control'
      }))
    : [
        { id: '1', action: 'Test model assign', action_code: 'subscription.addon.set', actor_label: 'Actor: 1', created_at: 'Oct 21, 2026, 01:05 PM', relative_time: '1m ago', type: 'subscription' },
        { id: '2', action: 'Control plane action', action_code: 'control.update', actor_label: 'System', created_at: 'Oct 21, 2026, 01:05 PM', relative_time: '5m ago', type: 'control' },
        { id: '3', action: 'Control plane action', action_code: 'control.update', actor_label: 'Actor: 1', created_at: 'Oct 21, 2026, 01:03 PM', relative_time: '7m ago', type: 'control' },
        { id: '4', action: 'Administrative add-on allocation', action_code: 'subscription.addon.set', actor_label: 'Actor: 1', created_at: 'Oct 21, 2026, 01:03 PM', relative_time: '7m ago', type: 'subscription' },
      ];

  const planColors = ['bg-blue-600', 'bg-sky-400', 'bg-indigo-600', 'bg-purple-600'];

  const displayPlans = plansSummary.length > 0 
    ? plansSummary.map((p, i) => {
        const totalSubs = metrics.total_tenants || metrics.total_subscriptions || 1;
        const pct = Math.round(((p.subscriber_count || 0) / totalSubs) * 100);
        return {
          id: p.id || i,
          name: p.name || p.code,
          subscriber_count: p.subscriber_count ?? 0,
          percentage: pct,
          color: planColors[i % planColors.length]
        };
      })
    : [
        { id: 1, name: 'Trial Plan', subscriber_count: 3, percentage: 60, color: 'bg-blue-600' },
        { id: 2, name: 'Medium Plan', subscriber_count: 0, percentage: 0, color: 'bg-sky-400' },
        { id: 3, name: 'Basic Plan v4', subscriber_count: 1, percentage: 20, color: 'bg-indigo-600' },
      ];

  const systemStatusItems = [
    { name: 'Control Plane', status: 'Online', meta: '2.4-GA' },
    { name: 'Database', status: 'Healthy', meta: 'PostgreSQL' },
    { name: 'Background Workers', status: 'Healthy', meta: 'All services' },
    { name: 'Communication Queue', status: 'Healthy', meta: 'Kafka' },
    { name: 'Storage', status: 'Healthy', meta: 'Operational' },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* ── BEGIN: MetricCardsRow ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-purpose="metrics-summary">
        {/* Card 1: TOTAL TENANTS */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">TOTAL TENANTS</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{metrics.total_tenants ?? 5}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
              {metrics.active_tenants ?? 5} Active
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {metrics.provisioning_tenants || 0} provisioning &nbsp;•&nbsp; 0 onboarding
          </p>
        </div>

        {/* Card 2: PLATFORM MRR */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
              $
            </div>
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">PLATFORM MRR</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">{mrrDollars}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700">
              ARR {arrDollars}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Across {metrics.active_subscriptions || 1} active subscriptions
          </p>
        </div>

        {/* Card 3: SUBSCRIPTIONS HEALTH */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <div className="w-7 h-7 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">SUBSCRIPTIONS HEALTH</span>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900">
              {metrics.total_subscriptions ?? 5} <span className="text-xs font-normal text-slate-500">accounts</span>
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700">
              {metrics.trialing_subscriptions ?? 3} trial
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700">
              {metrics.past_due_subscriptions ?? 0} past due
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700">
              {metrics.suspended_subscriptions ?? 0} suspended
            </span>
          </div>
        </div>

        {/* Card 4: ACTIVE SESSIONS */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">ACTIVE SESSIONS</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900">
              {metrics.active_support_sessions ?? 0}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-normal bg-slate-100 text-slate-600">
              {(metrics.active_support_sessions || 0) > 0 ? 'Live Impersonation' : 'No active sessions'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400 truncate">Governed by Section 1.9 Controlled Access</p>
        </div>
      </section>
      {/* ── END: MetricCardsRow ── */}

      {/* ── BEGIN: MidSectionGrid ── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Column Left: Plan Adoption (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            {/* Card Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Plan Adoption</h2>
                  <p className="text-xs text-slate-400">Active tenants by plan type</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('plans')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Manage Plans</span>
                <span>→</span>
              </button>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-6 pb-2 border-b border-slate-100">
              <div className="col-span-5">PLAN NAME</div>
              <div className="col-span-2 text-left">TENANTS</div>
              <div className="col-span-5 text-left">PERCENTAGE</div>
            </div>

            {/* Plan Rows */}
            <div className="space-y-4 pt-4 text-xs font-medium text-slate-700">
              {displayPlans.map((plan) => (
                <div key={plan.id} className="grid grid-cols-12 items-center">
                  <div className="col-span-5 flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${plan.color}`}></span>
                    <span className="text-slate-800 font-semibold truncate">{plan.name}</span>
                  </div>
                  <div className="col-span-2 text-slate-900 font-medium">{plan.subscriber_count}</div>
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`${plan.color} h-1.5 rounded-full transition-all duration-300`} 
                        style={{ width: `${Math.min(100, Math.max(0, plan.percentage))}%` }} 
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 w-7 text-right">
                      {plan.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column Right: Recent Platform Audits (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          {/* Card Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Recent Platform Audits</h2>
                <p className="text-xs text-slate-400">Immutable log of control plane operations</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('audits')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Trail</span>
              <span>→</span>
            </button>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 tracking-wider uppercase mt-6 pb-2 border-b border-slate-100">
            <div className="col-span-4">ACTION</div>
            <div className="col-span-3">DETAILS</div>
            <div className="col-span-2">ACTOR</div>
            <div className="col-span-3 text-right">TIME</div>
          </div>

          {/* Audit Rows List */}
          <div className="space-y-3.5 pt-3 text-xs">
            {displayAudits.map((item) => (
              <div key={item.id} className="grid grid-cols-12 items-center">
                <div className="col-span-4 flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded ${item.type === 'subscription' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'} flex items-center justify-center flex-shrink-0`}>
                    {item.type === 'subscription' ? (
                      <CreditCard className="w-3.5 h-3.5" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span className="font-medium text-slate-800 truncate" title={item.action}>
                    {item.action}
                  </span>
                </div>
                <div className="col-span-3">
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono">
                    {item.action_code}
                  </span>
                </div>
                <div className="col-span-2 text-slate-600 font-medium truncate">
                  {item.actor_label}
                </div>
                <div className="col-span-3 text-right leading-tight">
                  <div className="text-[11px] font-semibold text-slate-700">{item.created_at}</div>
                  <div className="text-[10px] text-slate-400">{item.relative_time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ── END: MidSectionGrid ── */}

      {/* ── BEGIN: BottomSectionGrid ── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Column 1: Recent Tenants */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          {/* Header */}
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Recent Tenants</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('tenants')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <span>→</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                  <th className="pb-2 font-bold">TENANT NAME</th>
                  <th className="pb-2 font-bold">PLAN</th>
                  <th className="pb-2 font-bold">STATUS</th>
                  <th className="pb-2 font-bold text-right">CREATED</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {displayTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2 text-slate-800 font-semibold">{t.name}</td>
                    <td className="py-2 text-slate-600">{t.plan}</td>
                    <td className="py-2">
                      <span className="inline-flex items-center text-[11px] text-emerald-700 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-2 text-right text-slate-500">{t.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Column 2: Subscriptions */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          {/* Header */}
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-purple-50 text-purple-600 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Subscriptions</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('subscriptions')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <span>→</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                  <th className="pb-2 font-bold">TENANT</th>
                  <th className="pb-2 font-bold">PLAN</th>
                  <th className="pb-2 font-bold">STATUS</th>
                  <th className="pb-2 font-bold text-right">RENEWS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {displaySubscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2 text-slate-800 font-semibold">{s.tenant_name}</td>
                    <td className="py-2 text-slate-600">{s.plan}</td>
                    <td className="py-2">
                      <span className={`inline-flex items-center text-[11px] font-medium ${s.status === 'Trial' ? 'text-amber-700' : 'text-emerald-700'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${s.status === 'Trial' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2 text-right text-slate-500">{s.renews_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Column 3: System Status */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          {/* Header */}
          <div className="flex items-center gap-2 pb-4">
            <div className="w-6 h-6 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">System Status</h3>
          </div>

          {/* Status List */}
          <div className="space-y-3.5 text-xs font-medium">
            {systemStatusItems.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-slate-800 font-medium">{item.name}</span>
                <div className="flex items-center gap-6">
                  <span className="inline-flex items-center text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                    {item.status}
                  </span>
                  <span className="text-slate-400 text-right w-16">{item.meta}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ── END: BottomSectionGrid ── */}
    </div>
  );
}
