import React, { useState } from 'react';
import { 
  Layers, Plus, Check, X, Shield, Sliders, 
  Sparkles, DollarSign, Users, Database, Globe, 
  FileText, Briefcase, Zap, Loader2 
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export default function PlansCatalogTab({ 
  plans = [], 
  features = [], 
  limits = [], 
  onRefresh 
}) {
  const { showToast } = useToast();
  const [selectedPlanDetails, setSelectedPlanDetails] = useState(null);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [newPlan, setNewPlan] = useState({
    code: '',
    name: '',
    version: 1,
    billing_interval: 'month',
    currency: 'USD',
    base_price_cents: 29900,
    is_public: false,
    status: 'draft',
    limits: {},
    features: {},
  });

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    const cleanCode = newPlan.code.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!newPlan.name.trim() || !cleanCode) {
      showToast('Plan name and code are required.', 'warning');
      return;
    }

    if (!/^[a-z][a-z0-9_]{1,79}$/.test(cleanCode)) {
      showToast('Plan code must start with a lowercase letter and contain only lowercase letters, numbers, and underscores (2-80 chars).', 'warning');
      return;
    }

    // Format features as a list of { feature_id: int, access_mode: "none"|"read"|"write" }
    const formattedFeatures = Array.isArray(features)
      ? features
          .filter((f) => f && f.id)
          .map((f) => ({
            feature_id: Number(f.id),
            access_mode: (typeof newPlan.features === 'object' && (newPlan.features[f.id] || newPlan.features[f.feature_key])) || 'write',
          }))
      : [];

    // Format limits as a list of { limit_definition_id: int, limit_value: int|null }
    const formattedLimits = Array.isArray(limits)
      ? limits
          .filter((l) => l && l.id)
          .map((l) => {
            const val = typeof newPlan.limits === 'object' ? (newPlan.limits[l.id] || newPlan.limits[l.limit_key]) : null;
            return {
              limit_definition_id: Number(l.id),
              limit_value: val !== undefined && val !== '' && !isNaN(Number(val)) ? Number(val) : null,
            };
          })
      : [];

    // Backend domain constraint: Draft plans cannot be public or current
    const isPublic = (newPlan.status && newPlan.status !== 'draft') ? Boolean(newPlan.is_public) : false;

    const payload = {
      code: cleanCode,
      name: newPlan.name.trim(),
      version: Number(newPlan.version) || 1,
      billing_interval: newPlan.billing_interval || 'month',
      currency: (newPlan.currency || 'USD').toUpperCase(),
      base_price_minor: Math.round(Number(newPlan.base_price_cents || newPlan.base_price_minor || 0)),
      is_public: isPublic,
      description: newPlan.description || '',
      features: formattedFeatures,
      limits: formattedLimits,
    };

    setIsSaving(true);
    try {
      await api.plans.create(payload);
      showToast(`Plan "${newPlan.name}" created in catalog.`, 'success');
      setShowCreatePlanModal(false);
      onRefresh?.();
    } catch (err) {
      const errData = err?.response?.data;
      const msg =
        errData?.detail ||
        errData?.message ||
        (typeof errData?.error === 'string' && errData.error !== 'domain_error' ? errData.error : null) ||
        (typeof errData === 'object' && errData !== null ? Object.entries(errData).map(([k, v]) => `${k}: ${v}`).join('; ') : null) ||
        err?.message ||
        'Failed to create plan';
      showToast(typeof msg === 'string' ? msg : JSON.stringify(msg), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const [editingFeatures, setEditingFeatures] = useState({});
  const [editingLimits, setEditingLimits] = useState({});
  const [isSavingFeatures, setIsSavingFeatures] = useState(false);
  const [isSavingLimits, setIsSavingLimits] = useState(false);
  const [activeDetailsTab, setActiveDetailsTab] = useState('features');

  const handleSelectPlan = (plan) => {
    setSelectedPlanDetails(plan);
    // Initialize feature access modes
    const featMap = {};
    if (Array.isArray(plan?.features)) {
      plan.features.forEach((f) => {
        const mode = f.access_mode || 'none';
        if (f.feature_id) featMap[f.feature_id] = mode;
        if (f.feature_key) featMap[f.feature_key] = mode;
        if (f.id) featMap[f.id] = mode;
      });
    } else if (plan?.features && typeof plan.features === 'object') {
      Object.entries(plan.features).forEach(([k, v]) => {
        featMap[k] = v;
      });
    }
    setEditingFeatures(featMap);

    // Initialize limit values
    const limitMap = {};
    if (Array.isArray(plan?.limits)) {
      plan.limits.forEach((l) => {
        const val = l.limit_value !== undefined && l.limit_value !== null ? l.limit_value : (l.value !== undefined ? l.value : '');
        if (l.limit_definition_id) limitMap[l.limit_definition_id] = val;
        if (l.limit_id) limitMap[l.limit_id] = val;
        if (l.limit_key) limitMap[l.limit_key] = val;
        if (l.limit_code) limitMap[l.limit_code] = val;
        if (l.code) limitMap[l.code] = val;
        if (l.key) limitMap[l.key] = val;
        if (l.id) limitMap[l.id] = val;
        if (l.limit_definition?.id) limitMap[l.limit_definition.id] = val;
        if (l.limit_definition?.code) limitMap[l.limit_definition.code] = val;
      });
    } else if (plan?.limits && typeof plan.limits === 'object') {
      Object.entries(plan.limits).forEach(([k, v]) => {
        const val = (v && typeof v === 'object') ? (v.limit_value ?? v.value ?? '') : (v !== null && v !== undefined ? v : '');
        limitMap[k] = val;
      });
    }
    setEditingLimits(limitMap);
  };

  const handleSaveFeatures = async () => {
    if (!selectedPlanDetails?.id) return;
    setIsSavingFeatures(true);
    try {
      const payload = Array.isArray(features)
        ? features
            .filter((f) => f && f.id)
            .map((f) => ({
              feature_id: Number(f.id),
              access_mode: editingFeatures[f.id] || editingFeatures[f.feature_key] || 'none',
            }))
        : [];

      await api.plans.updateFeatures(selectedPlanDetails.id, payload);
      showToast(`Feature matrix updated for "${selectedPlanDetails.name}".`, 'success');
      onRefresh?.();
    } catch (err) {
      const errData = err?.response?.data;
      const msg =
        errData?.detail ||
        errData?.message ||
        (typeof errData?.error === 'string' && errData.error !== 'domain_error' ? errData.error : null) ||
        (typeof errData === 'object' && errData !== null ? Object.entries(errData).map(([k, v]) => `${k}: ${v}`).join('; ') : null) ||
        err?.message ||
        'Failed to update plan features';
      showToast(typeof msg === 'string' ? msg : JSON.stringify(msg), 'error');
    } finally {
      setIsSavingFeatures(false);
    }
  };

  const handleSaveLimits = async () => {
    if (!selectedPlanDetails?.id) return;
    setIsSavingLimits(true);
    try {
      const payload = Array.isArray(limits)
        ? limits
            .filter((l) => l && l.id)
            .map((l) => {
              const val = editingLimits[l.id] !== undefined ? editingLimits[l.id] : editingLimits[l.limit_key];
              const limitValue = val !== '' && val !== null && val !== undefined && !isNaN(Number(val))
                ? Number(val)
                : null;
              return {
                limit_definition_id: Number(l.id),
                limit_value: limitValue,
              };
            })
        : [];

      await api.plans.updateLimits(selectedPlanDetails.id, payload);
      showToast(`Quota limits updated for "${selectedPlanDetails.name}".`, 'success');
      onRefresh?.();
    } catch (err) {
      const errData = err?.response?.data;
      const msg =
        errData?.detail ||
        errData?.message ||
        (typeof errData?.error === 'string' && errData.error !== 'domain_error' ? errData.error : null) ||
        (typeof errData === 'object' && errData !== null ? Object.entries(errData).map(([k, v]) => `${k}: ${v}`).join('; ') : null) ||
        err?.message ||
        'Failed to update plan limits';
      showToast(typeof msg === 'string' ? msg : JSON.stringify(msg), 'error');
    } finally {
      setIsSavingLimits(false);
    }
  };

  const getLimitDisplay = (plan, limitKey) => {
    if (!plan || !Array.isArray(plan.limits)) return '—';

    const keyMap = {
      'users.max_active': { key: 'users.max_active', defId: 1 },
      'branches.max_active': { key: 'branches.max_active', defId: 2 },
      'sms.monthly': { key: 'sms.monthly', defId: 3 },
      'storage.bytes': { key: 'storage.bytes', defId: 7 },
      active_users: { key: 'users.max_active', defId: 1 },
      active_branches: { key: 'branches.max_active', defId: 2 },
      monthly_sms: { key: 'sms.monthly', defId: 3 },
      storage_bytes: { key: 'storage.bytes', defId: 7 },
    };

    const target = keyMap[limitKey] || { key: limitKey, defId: null };

    const item = plan.limits.find((l) => {
      if (!l) return false;
      const lDefId = l.limit_definition_id ?? l.id;
      if (target.defId && lDefId === target.defId) return true;
      const lKey = l.limit_key || l.key || l.code;
      if (lKey && lKey === target.key) return true;
      return false;
    });

    if (!item) return '—';

    const val = item.limit_value;
    if (val === null || val === undefined || val === '') {
      return '—';
    }

    return typeof val === 'number' ? val.toLocaleString() : String(val);
  };

  const getStorageDisplay = (plan) => {
    if (!plan || !Array.isArray(plan.limits)) return '—';

    const item = plan.limits.find((l) => {
      if (!l) return false;
      const lDefId = l.limit_definition_id ?? l.id;
      if (lDefId === 7) return true;
      const lKey = l.limit_key || l.key || l.code;
      return lKey === 'storage.bytes';
    });

    if (!item) return '—';

    const val = item.limit_value;
    if (val === null || val === undefined || val === '') {
      return '—';
    }

    const num = Number(val);
    if (!isNaN(num)) {
      if (num >= 1073741824) {
        return `${Math.round(num / 1073741824)} GB`;
      }
      if (num >= 1048576) {
        return `${Math.round(num / 1048576)} MB`;
      }
      if (num > 0) {
        return `${num} GB`;
      }
    }

    return typeof val === 'number' ? val.toLocaleString() : String(val);
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
            if (Array.isArray(features)) {
              features.forEach((f) => {
                const key = f.id || f.feature_key;
                if (key) initialFeatures[key] = 'write';
              });
            }
            setNewPlan((p) => ({
              ...p,
              code: '',
              name: '',
              version: 1,
              base_price_cents: 29900,
              billing_interval: 'month',
              currency: 'USD',
              is_public: false,
              status: 'draft',
              features: initialFeatures,
              limits: {},
            }));
            setShowCreatePlanModal(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
        >
          <Plus size={15} />
          <span>New Catalog Plan</span>
        </button>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const priceMinor = Number(plan.base_price_minor ?? plan.base_price_cents ?? 0);
          const price = Number.isFinite(priceMinor) ? (priceMinor / 100).toFixed(0) : '0';
          const isSelected = selectedPlanDetails?.id === plan.id;
          return (
            <div
              key={plan.id}
              className={`p-5 rounded-3xl bg-white dark:bg-slate-900 border ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md' : 'border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md'} transition-all flex flex-col justify-between space-y-4`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {plan.code}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="font-mono text-slate-400">v{plan.version}</span>
                    {plan.status === 'draft' ? (
                      <span className="text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">Draft</span>
                    ) : plan.is_public ? (
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
                    <strong className="text-slate-900 dark:text-white">{getLimitDisplay(plan, 'users.max_active')}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Branches:</span>
                    <strong className="text-slate-900 dark:text-white">{getLimitDisplay(plan, 'branches.max_active')}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Monthly SMS:</span>
                    <strong className="text-slate-900 dark:text-white">{getLimitDisplay(plan, 'sms.monthly')}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Cloud Storage:</span>
                    <strong className="text-slate-900 dark:text-white">
                      {getStorageDisplay(plan)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectPlan(plan)}
                  className={`flex-1 py-2 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'} rounded-xl text-xs font-bold transition-colors cursor-pointer`}
                >
                  Configure Matrix & Quotas
                </button>
                {plan.status === 'draft' && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await api.plans.activate(plan.id);
                        showToast(`Plan "${plan.name}" activated successfully.`, 'success');
                        onRefresh?.();
                      } catch (err) {
                        showToast(err?.response?.data?.detail || err?.message || 'Failed to activate plan', 'error');
                      }
                    }}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                    title="Promote draft plan to active"
                  >
                    Activate
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Matrix & Quota Limits Configuration Panel for Selected Plan */}
      {selectedPlanDetails && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs p-6 space-y-5 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Plan Configuration: {selectedPlanDetails.name}
                </h3>
                <span className="font-mono text-xs text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold">
                  {selectedPlanDetails.code}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure module access permissions and default resource limits for this plan
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {activeDetailsTab === 'features' ? (
                <button
                  type="button"
                  onClick={handleSaveFeatures}
                  disabled={isSavingFeatures}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  {isSavingFeatures ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Save Features</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveLimits}
                  disabled={isSavingLimits}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  {isSavingLimits ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Save Limits</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedPlanDetails(null)}
                className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

          {/* Sub-tabs: Feature Matrix vs Quota Limits */}
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveDetailsTab('features')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeDetailsTab === 'features'
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Feature Matrix ({Array.isArray(features) ? features.length : 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveDetailsTab('limits')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeDetailsTab === 'limits'
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Quota Limits ({Array.isArray(limits) ? limits.length : 0})
            </button>
          </div>

          {/* Tab 1: Feature Matrix */}
          {activeDetailsTab === 'features' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Array.isArray(features) && features.map((feat) => {
                  const currentMode = editingFeatures[feat.id] ?? editingFeatures[feat.feature_key] ?? 'none';
                  return (
                    <div
                      key={feat.id || feat.feature_key}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="pr-1 overflow-hidden">
                        <span className="text-[10px] uppercase font-mono text-slate-400 block truncate">
                          {feat.category || 'crm'} • {feat.feature_key}
                        </span>
                        <strong className="text-slate-800 dark:text-slate-200 block truncate" title={feat.name}>
                          {feat.name}
                        </strong>
                      </div>
                      <select
                        value={currentMode}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingFeatures((prev) => ({
                            ...prev,
                            [feat.id]: val,
                            [feat.feature_key]: val,
                          }));
                        }}
                        className={`shrink-0 px-2.5 py-1 text-xs font-bold rounded-xl border transition-colors ${
                          currentMode === 'write'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300'
                            : currentMode === 'read'
                            ? 'border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300'
                            : 'border-slate-200 bg-white text-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'
                        }`}
                      >
                        <option value="none">None</option>
                        <option value="read">Read-only</option>
                        <option value="write">Full (Write)</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 2: Quota Limits */}
          {activeDetailsTab === 'limits' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Array.isArray(limits) && limits.map((l) => {
                  const currentVal = editingLimits[l.id] ?? editingLimits[l.limit_key] ?? '';
                  return (
                    <div
                      key={l.id || l.limit_key}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="pr-1 overflow-hidden">
                        <span className="text-[10px] uppercase font-mono text-slate-400 block truncate">
                          {l.reset_period && l.reset_period !== 'none' ? `${l.reset_period} • ` : ''}{l.limit_key}
                        </span>
                        <strong className="text-slate-800 dark:text-slate-200 block truncate" title={l.name}>
                          {l.name}
                        </strong>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          value={currentVal}
                          placeholder="Unlimited"
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditingLimits((prev) => ({
                              ...prev,
                              [l.id]: val,
                              [l.limit_key]: val,
                            }));
                          }}
                          className="w-28 px-2.5 py-1 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-right"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
                    Plan Code (e.g. starter_tier) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPlan.code}
                    onChange={(e) => setNewPlan({ ...newPlan, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                    placeholder="e.g. starter_tier"
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
                    <option value="false">Private / Draft (Default)</option>
                    <option value="true">Public Self-Serve</option>
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
