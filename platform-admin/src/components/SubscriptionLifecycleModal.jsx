import React, { useState } from 'react';
import { 
  CreditCard, ArrowRight, Clock, AlertTriangle, 
  CheckCircle2, XCircle, PauseCircle, ShieldAlert, 
  RefreshCw, History, Layers, Sliders, X, 
  Loader2, Sparkles, AlertCircle, Info, Calendar, 
  TrendingUp, TrendingDown 
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useModal } from '../hooks/useModal';
import platformApi from '../api/platformApi';

// Approved Section 2.10 Transition Matrix
const ALLOWED_TRANSITIONS = {
  trialing: ['active', 'cancelled', 'suspended'],
  active: ['past_due', 'paused', 'cancelled', 'expired', 'suspended'],
  past_due: ['active', 'paused', 'cancelled', 'expired', 'suspended'],
  paused: ['active', 'cancelled', 'expired', 'suspended'],
  cancelled: ['active', 'suspended'],
  expired: ['active', 'suspended'],
  suspended: ['active'],
};

// Approved Section 2.4 Access Behaviors
const STATUS_ACCESS_INFO = {
  active: { access: 'Full', desc: 'Normal plan entitlement; features, limits, add-ons and RBAC apply.' },
  trialing: { access: 'Full (if valid) / Read-only (if expired)', desc: 'Valid trial grants full plan access; expired trial drops to read-only.' },
  past_due: { access: 'Grace / operational write (if grace active) / Read-only (if expired)', desc: 'Writes remain available while grace period is active; read-only once grace expires.' },
  paused: { access: 'Read-only', desc: 'Subscription is intentionally held; data is retained; mutation blocked.' },
  cancelled: { access: 'Read-only initially', desc: 'Customer data remains visible for export and recovery; long-term retention TBD.' },
  expired: { access: 'Read-only initially', desc: 'Ended/non-renewed contract retains read access initially.' },
  suspended: { access: 'Blocked', desc: 'Administrative/security condition blocks tenant operation completely while retaining data.' },
};

export default function SubscriptionLifecycleModal({ 
  isOpen, 
  onClose, 
  subscription, 
  plans = [], 
  tenants = [], 
  onSubscriptionUpdated 
}) {
  useModal(isOpen, onClose);
  const { showToast } = useToast();
  const activeSubscription = subscription || {};

  const [activeSubTab, setActiveSubTab] = useState('transition'); // 'transition', 'plan_change', 'dates', 'cancel_reactivate', 'history'

  // Transition form
  const allowedNextStatuses = ALLOWED_TRANSITIONS[activeSubscription.status] || [];
  const [targetStatus, setTargetStatus] = useState(allowedNextStatuses[0] || 'active');
  const [transitionReason, setTransitionReason] = useState('');
  const [graceDays, setGraceDays] = useState(7);

  // Plan change form (Section 2.9)
  const currentPlan = plans.find((p) => p.id === activeSubscription.plan_id) || { name: activeSubscription.plan_id };
  const [newPlanId, setNewPlanId] = useState(plans[0]?.id || '');
  const [billingInterval, setBillingInterval] = useState(activeSubscription.billing_interval || 'month');
  const [effectiveTiming, setEffectiveTiming] = useState('immediate');
  const [planChangeReason, setPlanChangeReason] = useState('');

  // Dates form (Trial & Grace)
  const [trialEndsAt, setTrialEndsAt] = useState(activeSubscription.trial_ends_at ? activeSubscription.trial_ends_at.slice(0, 10) : '');
  const [graceEndsAt, setGraceEndsAt] = useState(activeSubscription.grace_period_ends_at ? activeSubscription.grace_period_ends_at.slice(0, 10) : '');
  const [datesReason, setDatesReason] = useState('');

  // Cancel / Reactivate form
  const [cancelMode, setCancelMode] = useState('period_end');
  const [cancelReason, setCancelReason] = useState('');
  const [reactivateReason, setReactivateReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quota check for plan change
  const targetPlan = plans.find((p) => p.id === newPlanId);
  const targetTenant = tenants.find((t) => String(t.id) === String(activeSubscription.tenant_id));
  const isDowngrade = targetPlan && currentPlan && (targetPlan.base_price_cents || 0) < (currentPlan.base_price_cents || 0);

  if (!isOpen || !subscription) return null;

  // 1. Submit Status Transition
  const handleTransitionSubmit = async (e) => {
    e.preventDefault();
    if (!transitionReason.trim()) {
      showToast('Mandatory audit reason is required for status transitions (Section 2.11).', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await platformApi.transitionSubscription(subscription.id, {
        next_status: targetStatus,
        reason: transitionReason.trim(),
        grace_period_days: targetStatus === 'past_due' ? graceDays : undefined,
      });
      showToast(`Subscription transitioned to "${targetStatus}".`, 'success');
      onSubscriptionUpdated?.(res.data?.subscription || res.data);
      onClose();
    } catch (err) {
      showToast(err?.response?.data?.error || err?.message || 'Transition failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Submit Plan Change (Section 2.9)
  const handlePlanChangeSubmit = async (e) => {
    e.preventDefault();
    if (!planChangeReason.trim()) {
      showToast('Audit reason is required for commercial plan changes (Section 2.9).', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await platformApi.changeSubscriptionPlan(subscription.id, {
        new_plan_id: newPlanId,
        billing_interval: billingInterval,
        effective_timing: effectiveTiming,
        reason: planChangeReason.trim(),
      });
      showToast(res.data?.message || 'Plan changed successfully.', 'success');
      if (res.data?.downgrade_warning) {
        showToast(res.data.downgrade_warning, 'warning');
      }
      onSubscriptionUpdated?.(res.data?.subscription || res.data);
      onClose();
    } catch (err) {
      showToast(err?.response?.data?.error || err?.message || 'Plan change failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Submit Dates (Trial / Grace)
  const handleDatesSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (subscription.status === 'trialing' && trialEndsAt) {
        await platformApi.updateSubscriptionTrial(subscription.id, {
          trial_ends_at: new Date(trialEndsAt).toISOString(),
          reason: datesReason.trim() || 'Admin trial adjustment',
        });
      }
      if (graceEndsAt) {
        await platformApi.updateSubscriptionGracePeriod(subscription.id, {
          grace_period_ends_at: new Date(graceEndsAt).toISOString(),
          reason: datesReason.trim() || 'Admin grace adjustment',
        });
      }
      showToast('Subscription lifecycle dates updated.', 'success');
      onSubscriptionUpdated?.();
      onClose();
    } catch (err) {
      showToast(err?.response?.data?.error || err?.message || 'Failed to update dates', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Submit Cancel
  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      showToast('Reason is required for cancellation (Section 2.8).', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await platformApi.cancelSubscription(subscription.id, {
        cancel_mode: cancelMode,
        reason: cancelReason.trim(),
      });
      showToast(res.data?.message || 'Cancellation recorded.', 'success');
      onSubscriptionUpdated?.(res.data?.subscription || res.data);
      onClose();
    } catch (err) {
      showToast(err?.response?.data?.error || err?.message || 'Cancellation failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Submit Reactivate
  const handleReactivateSubmit = async (e) => {
    e.preventDefault();
    if (!reactivateReason.trim()) {
      showToast('Reason is required for reactivation (Section 2.8).', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await platformApi.reactivateSubscription(subscription.id, {
        reason: reactivateReason.trim(),
      });
      showToast(res.data?.message || 'Subscription reactivated.', 'success');
      onSubscriptionUpdated?.(res.data?.subscription || res.data);
      onClose();
    } catch (err) {
      showToast(err?.response?.data?.error || err?.message || 'Reactivation failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/10 text-purple-600 flex items-center justify-center">
              <CreditCard size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Subscription Lifecycle Governance</h2>
              <p className="text-xs text-slate-500">
                {subscription.tenant_name} • Sub #{subscription.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="px-6 py-2.5 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
          {[
            { id: 'transition', label: 'Status Matrix (2.10)' },
            { id: 'plan_change', label: 'Upgrade / Downgrade (2.9)' },
            { id: 'dates', label: 'Trial & Grace Periods' },
            { id: 'cancel_reactivate', label: 'Cancellation / Reactivation' },
            { id: 'history', label: 'Audit Timeline (2.11)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Current State Summary Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Status</span>
              <span className="font-bold text-slate-900 dark:text-white capitalize">{subscription.status}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Plan</span>
              <span className="font-bold text-blue-600">{currentPlan.name}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Billing Period</span>
              <span className="font-mono text-slate-600 dark:text-slate-300">
                {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Derived Access</span>
              <span className="font-bold text-emerald-600">
                {STATUS_ACCESS_INFO[subscription.status]?.access || 'Active'}
              </span>
            </div>
          </div>

          {/* TAB 1: Status Transition Matrix (Section 2.10) */}
          {activeSubTab === 'transition' && (
            <form onSubmit={handleTransitionSubmit} className="space-y-4 animate-in fade-in">
              <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-300">
                <strong>Section 2.10 Approved Transition Guard:</strong> Only explicitly permitted transitions are accepted. Current status <strong>{subscription.status}</strong> may transition only to: {allowedNextStatuses.join(', ') || 'No allowed transitions'}.
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                  Allowed Target Status
                </label>
                {allowedNextStatuses.length === 0 ? (
                  <p className="text-slate-400 italic">No transitions available from current state.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {allowedNextStatuses.map((st) => {
                      const isSel = targetStatus === st;
                      return (
                        <div
                          key={st}
                          onClick={() => setTargetStatus(st)}
                          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                            isSel
                              ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 ring-2 ring-blue-600/30 font-bold'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                          }`}
                        >
                          <span className="capitalize block text-slate-900 dark:text-white font-bold">{st}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{STATUS_ACCESS_INFO[st]?.access}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {targetStatus === 'past_due' && (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                    Grace Period Days (Section 2.6)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={graceDays}
                    onChange={(e) => setGraceDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">Operational writes remain enabled until grace period ends.</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                  Mandatory Audit Reason (Section 2.11) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={transitionReason}
                  onChange={(e) => setTransitionReason(e.target.value)}
                  placeholder="e.g. Card charge declined 3 times via Stripe webhook, placing subscription into past_due with 7 days grace..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || allowedNextStatuses.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold flex items-center gap-1.5 shadow-sm"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                  <span>Execute Status Transition</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Commercial Plan Change (Section 2.9) */}
          {activeSubTab === 'plan_change' && (
            <form onSubmit={handlePlanChangeSubmit} className="space-y-4 animate-in fade-in">
              <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 text-[11px] text-purple-900 dark:text-purple-300">
                <strong>Section 2.9 Specification Rule:</strong> When the base plan changes, the previous subscription record is ended and a new current subscription record is created, preserving plan history.
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                  Select Target Commercial Plan
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {plans.map((p) => {
                    const isSel = newPlanId === p.id;
                    const price = (p.base_price_cents / 100).toFixed(0);
                    return (
                      <div
                        key={p.id}
                        onClick={() => setNewPlanId(p.id)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                          isSel
                            ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 ring-2 ring-blue-600/30'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">{p.name}</span>
                          <span className="font-mono font-bold text-blue-600">${price}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Users: {p.limits?.active_users} • Branches: {p.limits?.active_branches}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Downgrade Limit Verification Warning (Section 2.9) */}
              {isDowngrade && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300 text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <TrendingDown size={14} className="text-amber-600" />
                    <span>Plan Downgrade Check (Section 2.9):</span>
                  </div>
                  <p>
                    Existing users and branches will <strong>not</strong> be silently deleted or deactivated. If current usage exceeds target limits, existing resources remain visible, but new creations are blocked until remediated.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                    Billing Interval
                  </label>
                  <select
                    value={billingInterval}
                    onChange={(e) => setBillingInterval(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                  >
                    <option value="month">Monthly</option>
                    <option value="year">Yearly (Annual)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                    Effective Timing
                  </label>
                  <select
                    value={effectiveTiming}
                    onChange={(e) => setEffectiveTiming(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                  >
                    <option value="immediate">Immediate Switch (New Record)</option>
                    <option value="next_period">At Next Renewal Period</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                  Commercial Plan Change Reason (Required) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={planChangeReason}
                  onChange={(e) => setPlanChangeReason(e.target.value)}
                  placeholder="e.g. Customer upgraded to Enterprise tier for multi-branch and white-label access..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                  <span>Execute Plan Change</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Trial & Grace Periods (Section 2.4, 2.6) */}
          {activeSubTab === 'dates' && (
            <form onSubmit={handleDatesSubmit} className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                    <Clock size={16} className="text-blue-600" />
                    <span>Trial Period (Section 2.4)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Valid trial grants Full access; expired trial drops to Read-only access.
                  </p>
                  <div>
                    <label className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Trial End Date</label>
                    <input
                      type="date"
                      value={trialEndsAt}
                      onChange={(e) => setTrialEndsAt(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                    <AlertTriangle size={16} className="text-amber-600" />
                    <span>Past-Due Grace (Section 2.6)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Active grace permits operational writes; expired grace becomes Read-only.
                  </p>
                  <div>
                    <label className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Grace Period End Date</label>
                    <input
                      type="date"
                      value={graceEndsAt}
                      onChange={(e) => setGraceEndsAt(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                  Adjustment Explanation
                </label>
                <input
                  type="text"
                  value={datesReason}
                  onChange={(e) => setDatesReason(e.target.value)}
                  placeholder="e.g. Customer requested 14-day trial extension for branch onboarding..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                  <span>Save Lifecycle Dates</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: Cancellation & Reactivation (Section 2.8) */}
          {activeSubTab === 'cancel_reactivate' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Cancellation Box */}
              <div className="p-4 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-3">
                <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300 text-sm">
                  <XCircle size={16} />
                  <span>Subscription Cancellation (Section 2.8)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Normal cancellation is scheduled for the end of the current period; immediate cancellation is for administrative exceptions. Both produce Read-only mode initially.
                </p>

                <form onSubmit={handleCancelSubmit} className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCancelMode('period_end')}
                      className={`py-2 rounded-xl font-bold transition-colors ${cancelMode === 'period_end' ? 'bg-rose-600 text-white shadow-2xs' : 'bg-white dark:bg-slate-900 border border-slate-200 text-slate-700'}`}
                    >
                      Cancel at Period End
                    </button>
                    <button
                      type="button"
                      onClick={() => setCancelMode('immediate')}
                      className={`py-2 rounded-xl font-bold transition-colors ${cancelMode === 'immediate' ? 'bg-rose-600 text-white shadow-2xs' : 'bg-white dark:bg-slate-900 border border-slate-200 text-slate-700'}`}
                    >
                      Immediate Cancellation
                    </button>
                  </div>

                  <input
                    type="text"
                    required
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Cancellation reason (required)..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-sm"
                    >
                      Confirm Cancellation
                    </button>
                  </div>
                </form>
              </div>

              {/* Reactivation Box */}
              <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-3">
                <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300 text-sm">
                  <RefreshCw size={16} />
                  <span>Subscription Reactivation (Section 2.8)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Reactivation reuses the same tenant/company and preserves all existing customers, leads, estimates, jobs, invoices, accounting data, and users.
                </p>

                <form onSubmit={handleReactivateSubmit} className="space-y-3 pt-1">
                  <input
                    type="text"
                    required
                    value={reactivateReason}
                    onChange={(e) => setReactivateReason(e.target.value)}
                    placeholder="Reactivation reason / agreement ref..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm"
                    >
                      Reactivate to Active
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 5: Status History Timeline (Section 2.11) */}
          {activeSubTab === 'history' && (
            <div className="space-y-3 animate-in fade-in max-h-80 overflow-y-auto pr-1">
              {(subscription.status_history || []).length === 0 ? (
                <p className="text-slate-400 py-8 text-center italic">No status changes recorded.</p>
              ) : (
                subscription.status_history.map((h, i) => (
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
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
