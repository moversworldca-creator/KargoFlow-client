import React, { useState } from 'react';
import { 
  Layers, Plus, Check, X, Shield, Sliders, 
  Sparkles, DollarSign, Users, Database, Globe, 
  FileText, Briefcase, Zap, Loader2 
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import platformApi from '../api/platformApi';

export default function PlansCatalogTab({ 
  plans = [], 
  features = [], 
  onRefresh 
}) {
  const { showToast } = useToast();
  const [selectedPlanDetails, setSelectedPlanDetails] = useState(null);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [newPlan, setNewPlan] = useState({
    code: '',
    name: '',
    version: 'v1.0',
    billing_interval: 'month',
    currency: 'USD',
    base_price_cents: 29900,
    is_public: true,
    limits: {
      active_users: 10,
      active_branches: 2,
      monthly_sms: 2000,
      monthly_email: 10000,
      monthly_api_requests: 100000,
      monthly_automations: 1000,
      storage_bytes: 21474836480, // 20 GB
    },
    features: {},
  });

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!newPlan.name.trim() || !newPlan.code.trim()) {
      showToast('Plan name and uppercase code are required.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      await platformApi.createPlan({
        ...newPlan,
        code: newPlan.code.trim().toUpperCase(),
      });
      showToast(`Plan "${newPlan.name}" created in catalog.`, 'success');
      setShowCreatePlanModal(false);
      onRefresh?.();
    } catch (err) {
      showToast(err?.response?.data?.error || err?.message || 'Failed to create plan', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const getFeatureAccessBadge = (mode) => {
    if (mode === 'write') {
      return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600"><Check size={13} /> Full (Write)</span>;
    }
    if (mode === 'read') {
      return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600"><Check size={13} /> Read-only</span>;
    }
    return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-300 dark:text-slate-600"><X size={13} /> None</span>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Platform Plan Catalog (Section 1.3)</h2>
          <p className="text-xs text-slate-500">Tier definitions, default quotas, and functional module access matrix</p>
        </div>
        <button
          onClick={() => {
            const initialFeatures = {};
            features.forEach((f) => { initialFeatures[f.key] = 'write'; });
            setNewPlan((p) => ({ ...p, features: initialFeatures }));
            setShowCreatePlanModal(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <Plus size={15} />
          <span>New Catalog Plan</span>
        </button>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const price = (plan.base_price_cents / 100).toFixed(0);
          return (
            <div
              key={plan.id}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {plan.code}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="font-mono text-slate-400">{plan.version}</span>
                    {plan.is_public ? (
                      <span className="text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">Public</span>
                    ) : (
                      <span className="text-purple-600 font-bold bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded">Private</span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">${price}</span>
                    <span className="text-xs text-slate-400 font-medium">/{plan.billing_interval}</span>
                  </div>
                </div>

                {/* Quotas Box */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>Active Users:</span>
                    <strong className="text-slate-900 dark:text-white">{plan.limits?.active_users}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Branches:</span>
                    <strong className="text-slate-900 dark:text-white">{plan.limits?.active_branches}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Monthly SMS:</span>
                    <strong className="text-slate-900 dark:text-white">{plan.limits?.monthly_sms?.toLocaleString()}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Cloud Storage:</span>
                    <strong className="text-slate-900 dark:text-white">
                      {Math.round(plan.limits?.storage_bytes / 1073741824)} GB
                    </strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPlanDetails(plan)}
                className="w-full py-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
              >
                Inspect Feature Matrix
              </button>
            </div>
          );
        })}
      </div>

      {/* Feature Matrix Breakdown Table for Selected Plan */}
      {selectedPlanDetails && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs p-6 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Feature Matrix: {selectedPlanDetails.name} ({selectedPlanDetails.code})
              </h3>
              <p className="text-xs text-slate-500">Granular module permissions embedded in this tier</p>
            </div>
            <button
              onClick={() => setSelectedPlanDetails(null)}
              className="text-xs font-bold text-slate-500 hover:text-slate-700"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {features.map((feat) => {
              const accessMode = selectedPlanDetails.features?.[feat.key] || 'none';
              return (
                <div
                  key={feat.key}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="pr-2">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">{feat.category}</span>
                    <strong className="text-slate-800 dark:text-slate-200">{feat.name}</strong>
                  </div>
                  <div className="shrink-0">
                    {getFeatureAccessBadge(accessMode)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Plan Modal */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Define New Platform Plan</h3>
              <button onClick={() => setShowCreatePlanModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Plan Code (Uppercase) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPlan.code}
                    onChange={(e) => setNewPlan({ ...newPlan, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. GROWTH"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Plan Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    placeholder="e.g. Growth Accelerator Plan"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Price (USD Cents)
                  </label>
                  <input
                    type="number"
                    value={newPlan.base_price_cents}
                    onChange={(e) => setNewPlan({ ...newPlan, base_price_cents: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Interval
                  </label>
                  <select
                    value={newPlan.billing_interval}
                    onChange={(e) => setNewPlan({ ...newPlan, billing_interval: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                  >
                    <option value="month">Monthly</option>
                    <option value="year">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Visibility
                  </label>
                  <select
                    value={newPlan.is_public ? 'true' : 'false'}
                    onChange={(e) => setNewPlan({ ...newPlan, is_public: e.target.value === 'true' })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                  >
                    <option value="true">Public Self-Serve</option>
                    <option value="false">Private / Custom</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 space-y-3">
                <h4 className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-[11px]">
                  Default Quota Limits
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-slate-500 text-[10px]">Max Users</label>
                    <input
                      type="number"
                      value={newPlan.limits.active_users}
                      onChange={(e) => setNewPlan({
                        ...newPlan,
                        limits: { ...newPlan.limits, active_users: Number(e.target.value) }
                      })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px]">Max Branches</label>
                    <input
                      type="number"
                      value={newPlan.limits.active_branches}
                      onChange={(e) => setNewPlan({
                        ...newPlan,
                        limits: { ...newPlan.limits, active_branches: Number(e.target.value) }
                      })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px]">SMS / mo</label>
                    <input
                      type="number"
                      value={newPlan.limits.monthly_sms}
                      onChange={(e) => setNewPlan({
                        ...newPlan,
                        limits: { ...newPlan.limits, monthly_sms: Number(e.target.value) }
                      })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 text-[10px]">Storage (Bytes)</label>
                    <input
                      type="number"
                      value={newPlan.limits.storage_bytes}
                      onChange={(e) => setNewPlan({
                        ...newPlan,
                        limits: { ...newPlan.limits, storage_bytes: Number(e.target.value) }
                      })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreatePlanModal(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                  <span>Save Plan to Catalog</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
