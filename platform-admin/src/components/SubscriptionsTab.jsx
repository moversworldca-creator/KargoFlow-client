import React, { useState } from 'react';
import { 
  CreditCard, Search, ArrowRight, Clock, AlertTriangle, 
  CheckCircle2, XCircle, PauseCircle, RefreshCw, History, 
  Loader2, ShieldAlert, Sparkles, Filter 
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
  const [selectedSubForLifecycle, setSelectedSubForLifecycle] = useState(null);
  const [viewHistorySub, setViewHistorySub] = useState(null);

  const filteredSubs = subscriptions.filter((s) => {
    return (
      s.tenant_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.id?.toLowerCase().includes(search.toLowerCase()) ||
      s.provider_subscription_id?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50"><CheckCircle2 size={11} />Active</span>;
      case 'trialing':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/50"><Clock size={11} />Trialing</span>;
      case 'past_due':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50"><AlertTriangle size={11} />Past Due</span>;
      case 'paused':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200/50"><PauseCircle size={11} />Paused</span>;
      case 'cancelled':
      case 'expired':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200"><XCircle size={11} />{status}</span>;
      case 'suspended':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/50"><ShieldAlert size={11} />Suspended</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Banner Notice */}
      <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 flex items-center justify-between text-xs text-blue-900 dark:text-blue-300">
        <div className="flex items-center gap-2.5">
          <CreditCard size={18} className="text-blue-600 shrink-0" />
          <span>
            <strong>Controlled State Transitions:</strong> Every status transition follows the specification matrix (Section 2.10) and appends immutable audit events (Section 2.11).
          </span>
        </div>
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          title="Refresh subscriptions"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenant name, subscription ID, provider customer..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
          />
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Sub ID</th>
                <th className="py-3.5 px-4">Tenant</th>
                <th className="py-3.5 px-4">Plan / Interval</th>
                <th className="py-3.5 px-4">Current Status</th>
                <th className="py-3.5 px-4">Billing Period</th>
                <th className="py-3.5 px-4">Provider Ref</th>
                <th className="py-3.5 px-4 text-right">Transition Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No subscriptions found.
                  </td>
                </tr>
              ) : (
                filteredSubs.map((sub) => {
                  const planObj = plans.find((p) => p.id === sub.plan_id) || { name: sub.plan_id };
                  const allowed = ALLOWED_TRANSITIONS[sub.status] || [];
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[11px] text-slate-600 dark:text-slate-400">
                        {sub.id}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {sub.tenant_name}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{planObj.name}</span>
                          {planObj.version && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                              v{planObj.version}
                            </span>
                          )}
                          {planObj.status === 'retired' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/50">
                              Grandfathered
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block uppercase font-mono">{sub.billing_interval}</span>
                      </td>

                      <td className="py-3 px-4">
                        {getStatusBadge(sub.status)}
                      </td>

                      <td className="py-3 px-4 text-[11px] text-slate-500">
                        {sub.current_period_end ? (
                          <>Renewal: {new Date(sub.current_period_end).toLocaleDateString()}</>
                        ) : (
                          'Active lifetime'
                        )}
                        {sub.trial_ends_at && (
                          <span className="block text-amber-600 font-medium">Trial ends {new Date(sub.trial_ends_at).toLocaleDateString()}</span>
                        )}
                        {sub.grace_period_ends_at && (
                          <span className="block text-rose-600 font-medium">Grace until {new Date(sub.grace_period_ends_at).toLocaleDateString()}</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {sub.provider_name ? `${sub.provider_name} • ${sub.provider_subscription_id || 'n/a'}` : 'manual'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewHistorySub(sub)}
                            title="View Lifecycle History"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <History size={15} />
                          </button>

                          <button
                            onClick={() => setSelectedSubForLifecycle(sub)}
                            className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                            title="Manage Subscription Lifecycle (Section 2)"
                          >
                            <span>Manage Lifecycle</span>
                            <ArrowRight size={13} />
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
              {(viewHistorySub.status_history || []).length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No recorded status changes yet.</p>
              ) : (
                viewHistorySub.status_history.map((h, i) => (
                  <div key={h.id || i} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-600 dark:text-slate-400">{h.old_status || 'Initial'}</span>
                        <ArrowRight size={13} className="text-slate-400" />
                        <span className="font-bold text-blue-600 dark:text-blue-400 uppercase">{h.new_status}</span>
                      </div>
                      <span className="text-[11px] text-slate-400">{new Date(h.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 font-medium pt-1">
                      {h.reason || 'Reason not recorded'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Actor: {h.actor || 'system'}
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
