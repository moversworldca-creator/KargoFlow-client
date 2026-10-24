import React, { useState, useEffect } from 'react';
import {
  CreditCard, Search, ArrowRight, Clock, AlertTriangle,
  CheckCircle2, XCircle, PauseCircle, RefreshCw, History,
  Loader2, ShieldAlert, Sparkles, Filter, Calendar, ChevronDown, Download, MoreHorizontal
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import platformApi from '../api/platformApi';
import SubscriptionLifecycleModal from './SubscriptionLifecycleModal';

const ALLOWED_TRANSITIONS = {
  trialing: ['active', 'cancelled', 'suspended'],
  active: ['past_due', 'paused', 'cancelled', 'expired', 'suspended'],
  past_due: ['active', 'paused', 'cancelled', 'expired', 'suspended'],
  paused: ['active', 'cancelled', 'expired', 'suspended'],
  cancelled: ['active', 'suspended'],
  expired: ['active', 'suspended'],
  suspended: ['active'],
};

export default function SubscriptionsTab({
  subscriptions = [],
  plans = [],
  tenants = [],
  onRefresh
}) {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTenantId, setSelectedTenantId] = useState('all');
  const [selectedSubForLifecycle, setSelectedSubForLifecycle] = useState(null);
  const [lifecycleInitialTab, setLifecycleInitialTab] = useState('transition');
  const [viewHistorySub, setViewHistorySub] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (viewHistorySub?.id) {
      setHistoryLoading(true);
      platformApi.getSubscriptionHistory(viewHistorySub.id)
        .then((res) => {
          setHistoryRecords(res.data || []);
        })
        .catch(() => {
          setHistoryRecords(viewHistorySub.status_history || []);
        })
        .finally(() => {
          setHistoryLoading(false);
        });
    } else {
      setHistoryRecords([]);
    }
  }, [viewHistorySub]);

  const statusCounts = React.useMemo(() => {
    const counts = { all: subscriptions.length };
    subscriptions.forEach((s) => {
      counts[s.status] = (counts[s.status] || 0) + 1;
    });
    return counts;
  }, [subscriptions]);

  const filteredSubs = subscriptions.filter((s) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.tenant_name?.toLowerCase().includes(q) ||
      String(s.id)?.toLowerCase().includes(q) ||
      s.provider_subscription_id?.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (selectedTenantId !== 'all') {
      const matchId = String(s.tenant_id) === String(selectedTenantId) ||
                      String(s.tenant_company_id) === String(selectedTenantId);
      if (!matchId) return false;
    }
    return true;
  });

  const handleExportCSV = () => {
    if (!filteredSubs.length) {
      showToast('No subscriptions to export', 'info');
      return;
    }
    const headers = ['Sub ID', 'Tenant', 'Plan', 'Billing Interval', 'Status', 'Trial Ends At', 'Current Period End', 'Provider Ref'];
    const rows = filteredSubs.map((s) => [
      s.id,
      `"${s.tenant_name || ''}"`,
      `"${plans.find((p) => p.id === s.plan_id)?.name || s.plan_id}"`,
      s.billing_interval || 'month',
      s.status,
      s.trial_ends_at || '',
      s.current_period_end || '',
      `"${s.provider_subscription_id || s.provider_name || 'manual'}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `subscriptions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Subscriptions exported to CSV.', 'success');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E6F8EE] text-[#059669] border border-[#A7F3D0]/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            Active
          </span>
        );
      case 'trialing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Trialing
          </span>
        );
      case 'past_due':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Past Due
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200/60 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            Paused
          </span>
        );
      case 'cancelled':
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            {status}
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Suspended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Search, Status Filters, Tenant Scope & Export CSV Bar */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-wrap lg:flex-nowrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenant name, subscription ID, provider customer..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Quick Status Filter Pills & Actions */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: 'All', count: statusCounts.all || 0 },
              { id: 'active', label: 'Active', count: statusCounts.active || 0 },
              { id: 'trialing', label: 'Trial', count: statusCounts.trialing || 0 },
              { id: 'past_due', label: 'Past Due', count: statusCounts.past_due || 0 },
              { id: 'paused', label: 'Paused', count: statusCounts.paused || 0 },
              { id: 'suspended', label: 'Suspended', count: statusCounts.suspended || 0 },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === f.id
                    ? 'bg-blue-600 text-white font-bold shadow-2xs'
                    : 'bg-slate-100/90 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80'
                }`}
              >
                <span>{f.label}</span>
                <span className="text-[11px] font-medium opacity-90">{f.count}</span>
              </button>
            ))}
          </div>

          <div className="relative inline-block shrink-0">
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
            >
              <option value="all">All Tenants</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
            title="Export Subscriptions as CSV"
          >
            <Download size={14} className="text-slate-600 dark:text-slate-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">SUB ID</th>
                <th className="py-3.5 px-4">TENANT</th>
                <th className="py-3.5 px-4">PLAN / INTERVAL</th>
                <th className="py-3.5 px-4">CURRENT STATUS</th>
                <th className="py-3.5 px-4">BILLING PERIOD</th>
                <th className="py-3.5 px-4">PROVIDER REF</th>
                <th className="py-3.5 px-4">CAPACITY</th>
                <th className="py-3.5 px-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 dark:text-slate-500">
                    No subscriptions found.
                  </td>
                </tr>
              ) : (
                filteredSubs.map((sub) => {
                  const planObj = plans.find((p) => p.id === sub.plan_id) || { name: sub.plan_id };
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="w-7 h-7 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center font-mono">
                          {sub.id}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">
                          {sub.tenant_name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-normal">
                          Tenant #{sub.tenant_id || sub.tenant_company_id || 1}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold uppercase text-blue-600 dark:text-blue-400 text-xs tracking-tight">
                            {planObj.name}
                          </span>
                          {planObj.version && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold">
                              v{planObj.version}
                            </span>
                          )}
                          {planObj.status === 'retired' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/50">
                              Grandfathered
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 uppercase font-semibold font-mono block mt-0.5">
                          {sub.billing_interval || 'MONTH'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {getStatusBadge(sub.status)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-500 dark:text-slate-400 text-xs font-normal">
                            {sub.current_period_end
                              ? `Expires ${new Date(sub.current_period_end).toLocaleDateString()}`
                              : 'Active lifetime'}
                          </span>
                          {sub.trial_ends_at ? (
                            <span className="text-amber-500 font-semibold text-xs">
                              Trial ends {new Date(sub.trial_ends_at).toLocaleDateString()}
                            </span>
                          ) : sub.grace_period_ends_at ? (
                            <span className="text-rose-500 font-semibold text-xs">
                              Grace until {new Date(sub.grace_period_ends_at).toLocaleDateString()}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400 font-normal">
                        {sub.provider_name ? `${sub.provider_name} • ${sub.provider_subscription_id || 'n/a'}` : 'manual'}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5 text-xs text-slate-500 dark:text-slate-400 font-normal">
                          <div>
                            Users: <strong className="text-slate-800 dark:text-slate-200 font-bold">{sub.max_users || sub.users_count || planObj?.limits?.['users.max_active'] || planObj?.features?.max_users || 1}</strong>
                          </div>
                          <div>
                            Branches: <strong className="text-slate-800 dark:text-slate-200 font-bold">{sub.max_branches || sub.branches_count || planObj?.limits?.['branches.max_active'] || planObj?.features?.max_branches || 4}</strong>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => {
                              setLifecycleInitialTab('transition');
                              setSelectedSubForLifecycle(sub);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-[#F0F7FF] hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap"
                            title="Plans Control"
                          >
                            <span>Plans Control</span>
                            <ArrowRight size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subscription Lifecycle Modal (Section 2: Transition, Upgrade, Downgrade, Grace, Cancel, Reactivate) */}
      <SubscriptionLifecycleModal
        isOpen={Boolean(selectedSubForLifecycle)}
        onClose={() => setSelectedSubForLifecycle(null)}
        subscription={selectedSubForLifecycle}
        plans={plans}
        tenants={tenants}
        initialTab={lifecycleInitialTab}
        onSubscriptionUpdated={() => onRefresh?.()}
      />

      {/* Subscription Timeline History Modal */}
      {viewHistorySub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Subscription Status Timeline</h3>
                <p className="text-xs text-slate-500">{viewHistorySub.tenant_name} • {viewHistorySub.id}</p>
              </div>
              <button onClick={() => setViewHistorySub(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {historyLoading ? (
                <div className="py-8 flex justify-center items-center text-slate-400">
                  <Loader2 size={20} className="animate-spin text-blue-600" />
                </div>
              ) : (historyRecords || []).length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No recorded status changes yet.</p>
              ) : (
                historyRecords.map((h, i) => (
                  <div key={h.id || i} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-600 dark:text-slate-400">{h.old_status || 'Initial'}</span>
                        <ArrowRight size={13} className="text-slate-400" />
                        <span className="font-bold text-blue-600 dark:text-blue-400 uppercase">{h.new_status}</span>
                      </div>
                      <span className="text-[11px] text-slate-400">{new Date(h.timestamp || h.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 font-medium pt-1">
                      {h.reason || 'Reason not recorded'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Actor: {h.actor || (h.actor_platform_user_id ? `Platform Admin #${h.actor_platform_user_id}` : 'system')}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setViewHistorySub(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
