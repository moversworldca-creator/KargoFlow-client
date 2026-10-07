import React, { useState, useEffect } from 'react';
import { 
  Sliders, Building2, Plus, Trash2, CheckCircle2, 
  AlertTriangle, Shield, Clock, Loader2, Sparkles, 
  Zap, PackagePlus, ArrowRight 
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export default function EntitlementsTab({ 
  tenants = [], 
  initialTenantId = null,
  addons = [],
  features = []
}) {
  const { showToast } = useToast();
  const [selectedTenantId, setSelectedTenantId] = useState(initialTenantId || (tenants[0]?.id ? String(tenants[0].id) : '1'));
  const [entitlementsData, setEntitlementsData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Override Modal
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideType, setOverrideType] = useState('feature'); // 'feature' or 'limit'
  const [featureKey, setFeatureKey] = useState(features[0]?.key || 'crm_leads');
  const [featureMode, setFeatureMode] = useState('write');
  const [limitKey, setLimitKey] = useState('active_users');
  const [limitVal, setLimitVal] = useState(10);
  const [limitAction, setLimitAction] = useState('replace'); // 'replace' or 'add'
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideExpiresAt, setOverrideExpiresAt] = useState('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  // Addon Modal
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [selectedAddonId, setSelectedAddonId] = useState(addons[0]?.id || '');
  const [addonQuantity, setAddonQuantity] = useState(1);
  const [isSubmittingAddon, setIsSubmittingAddon] = useState(false);

  const fetchEntitlements = async (tId) => {
    if (!tId) return;
    setIsLoading(true);
    try {
      const res = await api.getTenantEntitlements(tId);
      setEntitlementsData(res.data);
    } catch (err) {
      showToast(err?.response?.data?.error || err?.message || 'Failed to load entitlements', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTenantId) {
      fetchEntitlements(selectedTenantId);
    }
  }, [selectedTenantId]);

  const handleCreateOverride = async (e) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      showToast('Reason is required for administrative entitlement overrides (Section 1.7).', 'warning');
      return;
    }

    setIsSubmittingOverride(true);
    try {
      const payload = {
        type: overrideType,
        reason: overrideReason.trim(),
        expires_at: overrideExpiresAt ? new Date(overrideExpiresAt).toISOString() : null,
      };

      if (overrideType === 'feature') {
        payload.feature_key = featureKey;
        payload.access_mode = featureMode;
      } else {
        payload.limit_key = limitKey;
        payload.override_type = limitAction;
        payload.value = Number(limitVal);
      }

      await api.createTenantOverride(selectedTenantId, payload);
      showToast('Entitlement override applied successfully.', 'success');
      setShowOverrideModal(false);
      setOverrideReason('');
      fetchEntitlements(selectedTenantId);
    } catch (err) {
      showToast(err?.response?.data?.error || err?.message || 'Failed to apply override', 'error');
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  const handleDeleteOverride = async (overrideId) => {
    try {
      await api.deleteTenantOverride(selectedTenantId, overrideId);
      showToast('Administrative override removed.', 'success');
      fetchEntitlements(selectedTenantId);
    } catch (err) {
      showToast(err?.response?.data?.error || err?.message || 'Failed to remove override', 'error');
    }
  };

  const handleAssignAddon = async (e) => {
    e.preventDefault();
    setIsSubmittingAddon(true);
    try {
      await api.assignTenantAddon(selectedTenantId, {
        addon_id: selectedAddonId,
        quantity: Number(addonQuantity) || 1,
      });
      showToast('Add-on assigned to tenant.', 'success');
      setShowAddonModal(false);
      fetchEntitlements(selectedTenantId);
    } catch (err) {
      showToast(err?.response?.data?.error || err?.message || 'Failed to assign add-on', 'error');
    } finally {
      setIsSubmittingAddon(false);
    }
  };

  const formatQuota = (key, val) => {
    if (key === 'storage_bytes') {
      return `${Math.round(val / 1073741824)} GB`;
    }
    return val?.toLocaleString?.() ?? val;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Tenant Selector & Action Header */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
            <Sliders size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Effective Entitlements & Overrides</h2>
            <p className="text-xs text-slate-500">Live computed capacity: Base Plan + Add-ons + Administrative Overrides</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tenant Selector */}
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-xs font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.subdomain})
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowAddonModal(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <PackagePlus size={15} />
            <span>Add-on</span>
          </button>

          <button
            onClick={() => setShowOverrideModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus size={15} />
            <span>Grant Override</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
          <Loader2 size={18} className="animate-spin text-blue-600" />
          <span>Computing effective entitlements...</span>
        </div>
      ) : entitlementsData ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Assigned Base Tier</span>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {entitlementsData.plan?.name}
              </div>
              <p className="text-xs text-slate-500">
                Code: <span className="font-mono font-bold text-blue-600">{entitlementsData.plan?.code}</span> • ${(entitlementsData.plan?.base_price_cents / 100).toFixed(0)}/{entitlementsData.plan?.billing_interval}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Effective Access Status</span>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 size={18} />
                <span>{entitlementsData.access_behavior?.access}</span>
              </div>
              <p className="text-xs text-slate-500">
                Derived: {entitlementsData.access_behavior?.label}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Modifications Active</span>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {entitlementsData.active_addons?.length || 0} Add-ons • {entitlementsData.active_overrides?.length || 0} Overrides
              </div>
              <p className="text-xs text-slate-500">
                Calculated live per Section 1.7 specification
              </p>
            </div>
          </div>

          {/* Quotas & Limits Progress */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Effective Usage & Quota Caps</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(entitlementsData.effective_limits || {}).map(([key, limit]) => {
                const usage = entitlementsData.current_usage?.[key] || 0;
                const pct = limit ? Math.min(Math.round((usage / limit) * 100), 100) : 0;
                return (
                  <div key={key} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="font-mono font-bold text-blue-600">
                        {formatQuota(key, usage)} / {formatQuota(key, limit)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct > 90 ? 'bg-rose-500' : pct > 75 ? 'bg-amber-500' : 'bg-blue-600'}`}
                        style={{ width: `${Math.max(pct, 3)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Overrides Table */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Administrative Overrides</h3>
                <p className="text-xs text-slate-500">Targeted adjustments bypassing base tier limits</p>
              </div>
              <button
                onClick={() => setShowOverrideModal(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus size={14} />
                <span>Add Override</span>
              </button>
            </div>

            {(entitlementsData.active_overrides || []).length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No active overrides applied to this tenant.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400">
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Target Key</th>
                      <th className="py-2.5 px-3">Adjustment</th>
                      <th className="py-2.5 px-3">Reason</th>
                      <th className="py-2.5 px-3">Expires</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {entitlementsData.active_overrides.map((ovr) => (
                      <tr key={ovr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-bold uppercase text-[10px] text-purple-600">
                          {ovr.type}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {ovr.type === 'feature' ? ovr.feature_key : ovr.limit_key}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-blue-600">
                          {ovr.type === 'feature' ? `Mode: ${ovr.access_mode}` : `${ovr.override_type} ${ovr.value}`}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          {ovr.reason}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {ovr.expires_at ? new Date(ovr.expires_at).toLocaleDateString() : 'Never (Indefinite)'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleDeleteOverride(ovr.id)}
                            className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Remove override"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Grant Administrative Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Grant Entitlement Override</h3>
              <button onClick={() => setShowOverrideModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateOverride} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                  Override Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOverrideType('feature')}
                    className={`py-2 rounded-xl font-bold transition-colors ${overrideType === 'feature' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                  >
                    Feature Flag
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverrideType('limit')}
                    className={`py-2 rounded-xl font-bold transition-colors ${overrideType === 'limit' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                  >
                    Quota / Limit
                  </button>
                </div>
              </div>

              {overrideType === 'feature' ? (
                <>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                      Target Feature Key
                    </label>
                    <select
                      value={featureKey}
                      onChange={(e) => setFeatureKey(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono font-bold"
                    >
                      {features.map((f) => (
                        <option key={f.key} value={f.key}>{f.name} ({f.key})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                      Grant Access Level
                    </label>
                    <select
                      value={featureMode}
                      onChange={(e) => setFeatureMode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                    >
                      <option value="write">Full Access (Write)</option>
                      <option value="read">Read-only</option>
                      <option value="none">Revoke (None)</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                      Target Quota Limit
                    </label>
                    <select
                      value={limitKey}
                      onChange={(e) => setLimitKey(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono font-bold"
                    >
                      <option value="active_users">active_users</option>
                      <option value="active_branches">active_branches</option>
                      <option value="monthly_sms">monthly_sms</option>
                      <option value="monthly_email">monthly_email</option>
                      <option value="monthly_api_requests">monthly_api_requests</option>
                      <option value="monthly_automations">monthly_automations</option>
                      <option value="storage_bytes">storage_bytes</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                        Action Type
                      </label>
                      <select
                        value={limitAction}
                        onChange={(e) => setLimitAction(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                      >
                        <option value="replace">Set Absolute Limit</option>
                        <option value="add">Add Increment</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                        Value
                      </label>
                      <input
                        type="number"
                        value={limitVal}
                        onChange={(e) => setLimitVal(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                  Audit Justification (Required) *
                </label>
                <textarea
                  required
                  rows={2}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. VIP contract concession or customer beta preview approval..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                  Expiration Date (Optional)
                </label>
                <input
                  type="date"
                  value={overrideExpiresAt}
                  onChange={(e) => setOverrideExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOverride}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
                >
                  {isSubmittingOverride ? <Loader2 size={14} className="animate-spin" /> : null}
                  <span>Apply Override</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Addon Modal */}
      {showAddonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Assign Metered Add-on Pack</h3>
              <button onClick={() => setShowAddonModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleAssignAddon} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                  Select Add-on
                </label>
                <select
                  value={selectedAddonId}
                  onChange={(e) => setSelectedAddonId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                >
                  {addons.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (${(a.price_cents / 100).toFixed(0)}/{a.interval})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                  Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={addonQuantity}
                  onChange={(e) => setAddonQuantity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddonModal(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAddon}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
                >
                  {isSubmittingAddon ? <Loader2 size={14} className="animate-spin" /> : null}
                  <span>Assign Add-on</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
