import React, { useState, useMemo } from 'react';
import { 
  Layers, Plus, Check, X, Shield, Sliders, 
  Sparkles, DollarSign, Users, Database, Globe, 
  FileText, Briefcase, Zap, Loader2, Edit3, 
  AlertCircle, Info, CheckCircle2
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import platformApi from '../api/platformApi';
import PlanFeatureMatrixPage, { ALL_PLATFORM_FEATURES } from './PlanFeatureMatrixPage';

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
  const [activeFeatureMatrixPlan, setActiveFeatureMatrixPlan] = useState(null);

  // Memoized default Free Trial Plan if not already in plans list
  const trialPlanDefault = useMemo(() => {
    const existing = (plans || []).find(
      (p) => p.code?.toUpperCase() === 'TRIAL' || p.name?.toLowerCase().includes('trial')
    );
    if (existing) return existing;

    const trialFeatures = {};
    ALL_PLATFORM_FEATURES.forEach((f) => {
      trialFeatures[f.key] = 'write';
    });

    return {
      id: 'plan-trial',
      code: 'TRIAL',
      name: 'Free Trial Plan',
      version: '1.0',
      status: 'active',
      is_current: true,
      is_public: true,
      billing_interval: '14 days',
      currency: 'USD',
      base_price_cents: 0,
      description: '14-Day Free Evaluation tier with all 28 platform modules enabled.',
      limits: {
        active_users: 5,
        active_branches: 1,
        monthly_sms: 500,
        monthly_email: 2500,
        monthly_api_requests: 10000,
        monthly_automations: 200,
        storage_bytes: 5368709120, // 5 GB
      },
      features: trialFeatures,
    };
  }, [plans]);

  // Combined plans list with Trial Plan included
  const displayPlans = useMemo(() => {
    const hasTrial = (plans || []).some(
      (p) => p.code?.toUpperCase() === 'TRIAL' || p.name?.toLowerCase().includes('trial')
    );
    if (hasTrial) return plans;
    return [trialPlanDefault, ...(plans || [])];
  }, [plans, trialPlanDefault]);

  // Edit Plan State
  const [editingPlan, setEditingPlan] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [featureMatrixPlan, setFeatureMatrixPlan] = useState(null);
  const [featureMatrixForm, setFeatureMatrixForm] = useState({});
  const [isSavingFeatureMatrix, setIsSavingFeatureMatrix] = useState(false);
  const [editPlanForm, setEditPlanForm] = useState({
    name: '',
    description: '',
    base_price_dollars: 0,
    billing_interval: 'month',
    is_public: true,
  });

  const [newPlan, setNewPlan] = useState({
    code: '',
    name: '',
    description: '',
    version: 1,
    billing_interval: 'month',
    currency: 'USD',
    base_price_cents: 29900,
    is_public: true,
    limits: {},
    features: {},
  });

  // Helper: calculate price cleanly (supports base_price_cents and base_price_minor)
  const getPlanPrice = (plan) => {
    const cents = plan?.base_price_cents ?? plan?.base_price_minor ?? 0;
    if (isNaN(cents)) return '0';
    return (cents / 100).toFixed(0);
  };

  // Helper: extract limit value whether limits is an array of objects or a dict
  const getPlanLimit = (plan, key) => {
    if (!plan?.limits) return null;
    const aliases = {
      active_users: ['users.max_active', 'active_users'],
      active_branches: ['branches.max_active', 'active_branches'],
      monthly_sms: ['sms.monthly', 'monthly_sms'],
      monthly_email: ['email.monthly', 'monthly_email'],
      monthly_api_requests: ['api.monthly_requests', 'monthly_api_requests'],
      monthly_automations: ['automation.monthly_runs', 'monthly_automations'],
      storage_bytes: ['storage.bytes', 'storage_bytes'],
    };
    const keysToCheck = aliases[key] || [key];

    if (Array.isArray(plan.limits)) {
      const item = plan.limits.find((l) => keysToCheck.includes(l.limit_key) || keysToCheck.includes(l.key));
      return item ? item.limit_value : null;
    }
    for (const k of keysToCheck) {
      if (plan.limits[k] !== undefined && plan.limits[k] !== null) return plan.limits[k];
    }
    return null;
  };

  // Helper: extract feature access mode whether features is array or dict
  const getFeatureAccessMode = (plan, featureKey) => {
    if (!plan?.features) return 'none';
    if (Array.isArray(plan.features)) {
      const item = plan.features.find((f) => f.feature_key === featureKey);
      return item?.access_mode || 'none';
    }
    return plan.features[featureKey] || 'none';
  };

  const isPlanLocked = (plan) => {
    return plan?.status === 'active' || Boolean(plan?.is_current);
  };

  const buildFeatureInputList = (matrix) => {
    return (features || [])
      .map((feature) => ({
        feature_id: feature.id,
        access_mode: matrix?.[feature.feature_key || feature.key] || 'none',
      }))
      .filter((item) => item.feature_id);
  };

  const buildLimitInputList = (plan) => {
    return (limits || [])
      .map((limit) => {
        const limitKey = limit.limit_key || limit.key;
        const existing = getPlanLimit(plan, limitKey);
        return {
          limit_definition_id: limit.id,
          limit_value: existing !== undefined && existing !== null ? Number(existing) : 0,
        };
      })
      .filter((item) => item.limit_definition_id);
  };

  const getNextPlanVersion = (plan) => {
    const versions = (plans || [])
      .filter((item) => item.code === plan.code)
      .map((item) => Number(item.version) || 0);
    return Math.max(Number(plan.version) || 1, ...versions) + 1;
  };

  const openFeatureMatrixEditor = (plan) => {
    const matrix = {};
    (features || []).forEach((feature) => {
      const key = feature.feature_key || feature.key;
      if (key) matrix[key] = getFeatureAccessMode(plan, key);
    });
    setFeatureMatrixPlan(plan);
    setFeatureMatrixForm(matrix);
  };

  const handleFeatureMatrixModeChange = (featureKey, accessMode) => {
    setFeatureMatrixForm((current) => ({ ...current, [featureKey]: accessMode }));
  };

  const handleSaveFeatureMatrix = async () => {
    if (!featureMatrixPlan) return;
    const featureInputs = buildFeatureInputList(featureMatrixForm);
    setIsSavingFeatureMatrix(true);
    try {
      if (isPlanLocked(featureMatrixPlan)) {
        const nextVersion = getNextPlanVersion(featureMatrixPlan);
        await platformApi.createPlan({
          code: featureMatrixPlan.code,
          name: `${featureMatrixPlan.name} v${nextVersion}`,
          description: featureMatrixPlan.description || '',
          version: nextVersion,
          billing_interval: featureMatrixPlan.billing_interval || 'month',
          currency: featureMatrixPlan.currency || 'USD',
          base_price_minor: featureMatrixPlan.base_price_minor ?? featureMatrixPlan.base_price_cents ?? 0,
          is_public: false,
          features: featureInputs,
          limits: buildLimitInputList(featureMatrixPlan),
        });
        showToast(`Created draft v${nextVersion} with updated feature matrix.`, 'success');
      } else {
        await platformApi.updatePlanFeatures(featureMatrixPlan.id, featureInputs);
        showToast(`Feature matrix updated for "${featureMatrixPlan.name}".`, 'success');
      }
      setFeatureMatrixPlan(null);
      setFeatureMatrixForm({});
      setSelectedPlanDetails(null);
      onRefresh?.();
    } catch (err) {
      console.error('Failed to save feature matrix:', err);
      showToast(
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to save feature matrix',
        'error'
      );
    } finally {
      setIsSavingFeatureMatrix(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (plan) => {
    const cents = plan.base_price_cents ?? plan.base_price_minor ?? 0;
    const dollars = isNaN(cents) ? 0 : Math.round(cents / 100);

    setEditingPlan(plan);
    setEditPlanForm({
      name: plan.name || '',
      description: plan.description || '',
      base_price_dollars: dollars,
      billing_interval: plan.billing_interval || 'month',
      is_public: Boolean(plan.is_public),
    });
  };

  // Submit Edit Plan
  const handleUpdatePlan = async (e) => {
    e.preventDefault();
    if (!editPlanForm.name.trim()) {
      showToast('Plan display name is required.', 'warning');
      return;
    }

    setIsUpdating(true);
    try {
      const isLocked = editingPlan?.status === 'active' || editingPlan?.is_current;
      const payload = {
        name: editPlanForm.name.trim(),
        description: editPlanForm.description.trim(),
        is_public: editPlanForm.is_public,
      };

      // Only include price and interval if plan is draft / unlocked
      if (!isLocked) {
        payload.billing_interval = editPlanForm.billing_interval;
        payload.base_price_minor = Math.round((Number(editPlanForm.base_price_dollars) || 0) * 100);
      }

      await platformApi.updatePlan(editingPlan.id, payload);
      showToast(`Plan "${editPlanForm.name}" updated successfully.`, 'success');
      setEditingPlan(null);
      if (selectedPlanDetails?.id === editingPlan.id) {
        setSelectedPlanDetails(null);
      }
      onRefresh?.();
    } catch (err) {
      console.error('Failed to update plan:', err);
      showToast(
        err?.response?.data?.error || 
        err?.response?.data?.detail || 
        err?.message || 
        'Failed to update plan',
        'error'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Create Plan Handler
  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!newPlan.name.trim() || !newPlan.code.trim()) {
      showToast('Plan name and code are required.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      // Build features list
      const featuresList = (features || [])
        .map((f) => ({
          feature_id: f.id,
          access_mode: newPlan.features?.[f.feature_key || f.key] || 'write',
        }))
        .filter((item) => item.feature_id);

      // Build limits list
      const limitsList = (limits || [])
        .map((l) => {
          const lKey = l.limit_key || l.key;
          const val = newPlan.limits?.[lKey];
          return {
            limit_definition_id: l.id,
            limit_value: val !== undefined && val !== null ? Number(val) : 0,
          };
        })
        .filter((item) => item.limit_definition_id);

      const payload = {
        code: newPlan.code.trim().toLowerCase(),
        name: newPlan.name.trim(),
        description: newPlan.description.trim(),
        version: Number(newPlan.version) || 1,
        billing_interval: newPlan.billing_interval,
        currency: newPlan.currency || 'USD',
        base_price_minor: Number(newPlan.base_price_cents) || 0,
        is_public: Boolean(newPlan.is_public),
        features: featuresList,
        limits: limitsList,
      };

      await platformApi.createPlan(payload);
      showToast(`Plan "${newPlan.name}" created in catalog.`, 'success');
      setShowCreatePlanModal(false);
      onRefresh?.();
    } catch (err) {
      showToast(
        err?.response?.data?.error || 
        err?.response?.data?.detail || 
        err?.message || 
        'Failed to create plan',
        'error'
      );
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

  if (activeFeatureMatrixPlan) {
    return (
      <PlanFeatureMatrixPage
        plan={activeFeatureMatrixPlan}
        onBack={() => setActiveFeatureMatrixPlan(null)}
        onSaveMatrix={async (savedPlan, newMatrix) => {
          try {
            if (savedPlan.id && savedPlan.id !== 'plan-trial') {
              const featureInputs = (features || [])
                .map((f) => {
                  const k = f.feature_key || f.key;
                  return {
                    feature_id: f.id,
                    access_mode: newMatrix[k] || 'none',
                  };
                })
                .filter((item) => item.feature_id);
              await platformApi.updatePlanFeatures(savedPlan.id, featureInputs);
            }
            onRefresh?.();
          } catch (e) {
            console.warn('Feature matrix updated locally:', e);
          }
        }}
      />
    );
  }

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
            (features || []).forEach((f) => { 
              const k = f.feature_key || f.key;
              if (k) initialFeatures[k] = 'write'; 
            });
            const initialLimits = {};
            (limits || []).forEach((l) => {
              const lKey = l.limit_key || l.key;
              if (lKey) {
                if (lKey.includes('storage')) initialLimits[lKey] = 21474836480;
                else if (lKey.includes('user')) initialLimits[lKey] = 10;
                else if (lKey.includes('branch')) initialLimits[lKey] = 2;
                else if (lKey.includes('sms')) initialLimits[lKey] = 2000;
                else if (lKey.includes('email')) initialLimits[lKey] = 10000;
                else if (lKey.includes('api')) initialLimits[lKey] = 100000;
                else if (lKey.includes('automation')) initialLimits[lKey] = 1000;
                else initialLimits[lKey] = 100;
              }
            });
            if (Object.keys(initialLimits).length === 0) {
              initialLimits['users.max_active'] = 10;
              initialLimits['branches.max_active'] = 2;
              initialLimits['sms.monthly'] = 2000;
              initialLimits['email.monthly'] = 10000;
              initialLimits['api.monthly_requests'] = 100000;
              initialLimits['automation.monthly_runs'] = 1000;
              initialLimits['storage.bytes'] = 21474836480;
            }
            setNewPlan({
              code: '',
              name: '',
              description: '',
              version: 1,
              billing_interval: 'month',
              currency: 'USD',
              base_price_cents: 29900,
              is_public: true,
              features: initialFeatures,
              limits: initialLimits,
            });
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
        {displayPlans.map((plan) => {
          const price = getPlanPrice(plan);
          const activeUsers = getPlanLimit(plan, 'active_users');
          const activeBranches = getPlanLimit(plan, 'active_branches');
          const monthlySms = getPlanLimit(plan, 'monthly_sms');
          const storageBytes = getPlanLimit(plan, 'storage_bytes');
          const storageFormatted = typeof storageBytes === 'number' && !isNaN(storageBytes)
            ? `${Math.round(storageBytes / 1073741824)} GB`
            : (storageBytes ? `${storageBytes}` : '—');

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
                    <span className="font-mono text-slate-400">
                      {typeof plan.version === 'number' ? `v${plan.version}` : plan.version || 'v1'}
                    </span>
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
                    <span className="text-xs text-slate-400 font-medium">/{plan.billing_interval || 'month'}</span>
                  </div>
                  {plan.description && (
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">{plan.description}</p>
                  )}
                </div>

                {/* Quotas Box */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>Active Users:</span>
                    <strong className="text-slate-900 dark:text-white">{activeUsers ?? '—'}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Branches:</span>
                    <strong className="text-slate-900 dark:text-white">{activeBranches ?? '—'}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Monthly SMS:</span>
                    <strong className="text-slate-900 dark:text-white">
                      {typeof monthlySms === 'number' ? monthlySms.toLocaleString() : (monthlySms ?? '—')}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Cloud Storage:</span>
                    <strong className="text-slate-900 dark:text-white">{storageFormatted}</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Edit Plan and Inspect Features */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(plan)}
                  className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 dark:text-blue-300 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Edit Plan Metadata and Configuration"
                >
                  <Edit3 size={13} />
                  <span>Edit Plan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFeatureMatrixPlan(plan)}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  title={`Inspect & Configure Feature Matrix for ${plan.name}`}
                >
                  <Layers size={13} />
                  <span>Features</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Matrix Breakdown Table for Selected Plan */}
      {selectedPlanDetails && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs p-6 space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Feature Matrix: {selectedPlanDetails.name}
                </h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                  {selectedPlanDetails.code}
                </span>
              </div>
              <p className="text-xs text-slate-500">Granular module permissions embedded in this tier</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openFeatureMatrixEditor(selectedPlanDetails)}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit3 size={13} />
                <span>Edit Features</span>
              </button>

              <button
                onClick={() => setSelectedPlanDetails(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {features.map((feat) => {
              const featKey = feat.key || feat.feature_key;
              const accessMode = getFeatureAccessMode(selectedPlanDetails, featKey);
              return (
                <div
                  key={featKey}
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

      {/* FEATURE MATRIX MODAL */}
      {featureMatrixPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Shield size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Edit Feature Matrix: {featureMatrixPlan.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                    <span>{featureMatrixPlan.code}</span>
                    <span>v{featureMatrixPlan.version || 1}</span>
                    {isPlanLocked(featureMatrixPlan) && (
                      <span className="font-bold text-amber-600 dark:text-amber-400">New draft version will be created</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setFeatureMatrixPlan(null)}
                disabled={isSavingFeatureMatrix}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {isPlanLocked(featureMatrixPlan) && (
              <div className="p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 flex items-start gap-2.5 text-amber-900 dark:text-amber-300">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  This plan is active or current. Saving this matrix creates a new draft version with the same pricing and limits, leaving existing subscribers unchanged.
                </p>
              </div>
            )}

            <div className="overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(features || []).map((feature) => {
                  const featureKey = feature.feature_key || feature.key;
                  const mode = featureMatrixForm[featureKey] || 'none';
                  return (
                    <div
                      key={feature.id || featureKey}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-mono text-slate-400 block">
                            {feature.category || 'module'}
                          </span>
                          <strong className="text-xs text-slate-800 dark:text-slate-100 block truncate">
                            {feature.name}
                          </strong>
                          <span className="text-[11px] text-slate-500 font-mono truncate block">
                            {featureKey}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
                          {['none', 'read', 'write'].map((accessMode) => (
                            <button
                              key={accessMode}
                              type="button"
                              onClick={() => handleFeatureMatrixModeChange(featureKey, accessMode)}
                              className={`px-2.5 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
                                mode === accessMode
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              {accessMode === 'none' ? 'None' : accessMode === 'read' ? 'Read' : 'Write'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setFeatureMatrixPlan(null)}
                disabled={isSavingFeatureMatrix}
                className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFeatureMatrix}
                disabled={isSavingFeatureMatrix}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSavingFeatureMatrix ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                <span>{isPlanLocked(featureMatrixPlan) ? 'Create Draft Version' : 'Save Matrix'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PLAN MODAL */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Edit Plan: {editingPlan.name}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Code: {editingPlan.code} &bull; v{editingPlan.version || 1}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setEditingPlan(null)} 
                disabled={isUpdating}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdatePlan} className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Plan Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPlanForm.name}
                    onChange={(e) => setEditPlanForm({ ...editPlanForm, name: e.target.value })}
                    placeholder="e.g. Professional Growth Tier"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={editPlanForm.description}
                    onChange={(e) => setEditPlanForm({ ...editPlanForm, description: e.target.value })}
                    placeholder="Brief description of this plan tier and included features..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Price (USD $)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      min="0"
                      disabled={editingPlan?.status === 'active' || editingPlan?.is_current}
                      value={editPlanForm.base_price_dollars}
                      onChange={(e) => setEditPlanForm({ ...editPlanForm, base_price_dollars: Math.max(0, Number(e.target.value)) })}
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-mono font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  {(editingPlan?.status === 'active' || editingPlan?.is_current) && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Locked (active plan)</span>
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Billing Interval
                  </label>
                  <select
                    disabled={editingPlan?.status === 'active' || editingPlan?.is_current}
                    value={editPlanForm.billing_interval}
                    onChange={(e) => setEditPlanForm({ ...editPlanForm, billing_interval: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="month">Monthly</option>
                    <option value="year">Yearly</option>
                    <option value="custom">Custom</option>
                  </select>
                  {(editingPlan?.status === 'active' || editingPlan?.is_current) && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Locked (active plan)</span>
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Visibility
                  </label>
                  <select
                    value={editPlanForm.is_public ? 'true' : 'false'}
                    onChange={(e) => setEditPlanForm({ ...editPlanForm, is_public: e.target.value === 'true' })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  >
                    <option value="true">Public Self-Serve</option>
                    <option value="false">Private / Custom</option>
                  </select>
                </div>
              </div>

              {/* Informative Guidance */}
              <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 flex items-start gap-2.5 text-blue-900 dark:text-blue-300">
                <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1 text-[11px] leading-relaxed">
                  <span className="font-bold block">Plan Governance Note:</span>
                  <p className="text-blue-800/90 dark:text-blue-300/80">
                    Modifying display name, description, and visibility applies immediately across the platform. For in-use plans with active subscribers, pricing and structural limits are protected by versioning contracts.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  disabled={isUpdating}
                  className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  <span>Save Plan Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PLAN MODAL */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Define New Platform Plan</h3>
              <button onClick={() => setShowCreatePlanModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Plan Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPlan.code}
                    onChange={(e) => setNewPlan({ ...newPlan, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    placeholder="e.g. enterprise_plus"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-mono font-bold"
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
                    placeholder="e.g. Enterprise Plus Plan"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newPlan.description}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  placeholder="Plan tier overview and highlights..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Price (Cents)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newPlan.base_price_cents}
                    onChange={(e) => setNewPlan({ ...newPlan, base_price_cents: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1">
                    Interval
                  </label>
                  <select
                    value={newPlan.billing_interval}
                    onChange={(e) => setNewPlan({ ...newPlan, billing_interval: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold"
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold"
                  >
                    <option value="true">Public Self-Serve</option>
                    <option value="false">Private / Custom</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreatePlanModal(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
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
