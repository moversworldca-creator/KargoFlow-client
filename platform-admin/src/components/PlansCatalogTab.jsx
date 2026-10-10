import React, { useState, useMemo } from 'react';
import { 
  Layers, Plus, Check, X, Shield, Sliders, 
  Sparkles, DollarSign, Users, Database, Globe, 
  FileText, Briefcase, Zap, Loader2, Edit3, 
  AlertCircle, Info, CheckCircle2, GitBranch,
  Archive, ArrowUpCircle, History, Clock,
  ChevronRight, ArrowRight, CornerDownRight, CheckCircle,
  Search, MoreVertical, ChevronDown, RefreshCw
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import platformApi from '../api/platformApi';
import PlanFeatureMatrixPage, { ALL_PLATFORM_FEATURES, FEATURE_KEY_BACKEND_MAP, REVERSE_FEATURE_MAP } from './PlanFeatureMatrixPage';

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

  // Versioning & Lifecycle State
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'timeline'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'draft' | 'retired'
  const [visibilityFilter, setVisibilityFilter] = useState('all'); // 'all' | 'public' | 'private'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuPlanId, setActiveMenuPlanId] = useState(null);
  const [promotingPlan, setPromotingPlan] = useState(null);
  const [conflictingActivePlan, setConflictingActivePlan] = useState(null);
  const [isPromoting, setIsPromoting] = useState(false);
  const [retiringPlan, setRetiringPlan] = useState(null);
  const [isRetiring, setIsRetiring] = useState(false);
  const [selectedTimelineCode, setSelectedTimelineCode] = useState(null);

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

  // Group plans by plan family code for Version History Timeline / Tree
  const plansByCode = useMemo(() => {
    const map = {};
    displayPlans.forEach((p) => {
      const code = (p.code || 'UNKNOWN').toUpperCase();
      if (!map[code]) map[code] = [];
      map[code].push(p);
    });
    // Sort each family descending by numeric version (e.g. v3, v2, v1), then updated_at / created_at / id
    Object.keys(map).forEach((code) => {
      map[code].sort((a, b) => {
        const vA = parseFloat(String(a.version).replace(/[^0-9.]/g, '')) || 0;
        const vB = parseFloat(String(b.version).replace(/[^0-9.]/g, '')) || 0;
        if (vB !== vA) return vB - vA;
        const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
        const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      });
    });
    return map;
  }, [displayPlans]);

  // Unique plan family codes
  const planCodes = useMemo(() => Object.keys(plansByCode), [plansByCode]);

  // For each tier family: identify the active/current plan and any pending draft plan
  const familyOverview = useMemo(() => {
    const result = {};
    planCodes.forEach((code) => {
      const family = plansByCode[code] || [];
      const activeVersion = family.find((p) => p.status === 'active' || p.is_current);
      const draftVersion = family.find((p) => p.status === 'draft');
      const latestVersion = family[0];
      result[code] = {
        code,
        family,
        activeVersion,
        draftVersion,
        latestVersion,
        primaryPlan: activeVersion || latestVersion,
      };
    });
    return result;
  }, [planCodes, plansByCode]);

  // Accurate lifecycle status counts across all tracked plan versions
  const statusCounts = useMemo(() => {
    return {
      all: planCodes.length,
      active: displayPlans.filter((p) => p.status === 'active' || p.is_current).length,
      draft: displayPlans.filter((p) => p.status === 'draft').length,
      retired: displayPlans.filter((p) => p.status === 'retired').length,
    };
  }, [planCodes, displayPlans]);

  // Filtered plans for Cards Grid
  const filteredPlans = useMemo(() => {
    let baseList = [];
    if (statusFilter === 'all') {
      baseList = planCodes.map((code) => familyOverview[code]?.primaryPlan).filter(Boolean);
    } else if (statusFilter === 'active') {
      baseList = planCodes.map((code) => familyOverview[code]?.activeVersion).filter(Boolean);
    } else if (statusFilter === 'draft') {
      baseList = displayPlans.filter((p) => p.status === 'draft');
    } else if (statusFilter === 'retired') {
      baseList = displayPlans.filter((p) => p.status === 'retired');
    } else {
      baseList = planCodes.map((code) => familyOverview[code]?.primaryPlan).filter(Boolean);
    }

    // Apply visibility filter
    if (visibilityFilter === 'public') {
      baseList = baseList.filter((p) => Boolean(p.is_public));
    } else if (visibilityFilter === 'private') {
      baseList = baseList.filter((p) => !p.is_public);
    }

    // Apply search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      baseList = baseList.filter((p) => 
        (p.name || '').toLowerCase().includes(q) ||
        (p.code || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    }

    return baseList;
  }, [planCodes, familyOverview, statusFilter, displayPlans, visibilityFilter, searchQuery]);

  // Promotion Handlers
  const handleOpenPromoteModal = (plan) => {
    // Locate any currently active version for this code
    const conflict = displayPlans.find(
      (p) => (p.code || '').toUpperCase() === (plan.code || '').toUpperCase() &&
             (p.status === 'active' || p.is_current) &&
             p.id !== plan.id
    );
    setPromotingPlan(plan);
    setConflictingActivePlan(conflict || null);
  };

  const handleConfirmPromotion = async () => {
    if (!promotingPlan) return;
    setIsPromoting(true);
    try {
      if (conflictingActivePlan && conflictingActivePlan.id && conflictingActivePlan.id !== 'plan-trial') {
        await platformApi.retirePlan(conflictingActivePlan.id);
      }
      if (promotingPlan.id && promotingPlan.id !== 'plan-trial') {
        await platformApi.activatePlan(promotingPlan.id);
      }
      showToast(`Plan "${promotingPlan.name}" (v${promotingPlan.version}) promoted to Active & Current!`, 'success');
      setPromotingPlan(null);
      setConflictingActivePlan(null);
      onRefresh?.();
    } catch (err) {
      console.error('Failed to promote plan:', err);
      showToast(
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to promote plan to active',
        'error'
      );
    } finally {
      setIsPromoting(false);
    }
  };

  // Retirement Handlers
  const handleOpenRetireModal = (plan) => {
    setRetiringPlan(plan);
  };

  const handleConfirmRetire = async () => {
    if (!retiringPlan) return;
    setIsRetiring(true);
    try {
      if (retiringPlan.id && retiringPlan.id !== 'plan-trial') {
        await platformApi.retirePlan(retiringPlan.id);
      }
      showToast(`Plan "${retiringPlan.name}" (v${retiringPlan.version}) retired. Existing subscribers remain grandfathered.`, 'success');
      setRetiringPlan(null);
      onRefresh?.();
    } catch (err) {
      console.error('Failed to retire plan:', err);
      showToast(
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to retire plan',
        'error'
      );
    } finally {
      setIsRetiring(false);
    }
  };

  // Start new draft pre-populated from an existing plan version
  const handleStartNewVersionDraft = (basePlan) => {
    const nextVer = getNextPlanVersion(basePlan);
    const initialFeatures = {};
    (features || []).forEach((f) => {
      const k = f.feature_key || f.key;
      if (k) initialFeatures[k] = getFeatureAccessMode(basePlan, k);
    });
    const initialLimits = {};
    (limits || []).forEach((l) => {
      const k = l.limit_key || l.key;
      if (k) {
        const val = getPlanLimit(basePlan, k);
        if (val !== null && val !== undefined) initialLimits[k] = val;
      }
    });

    const cleanBaseName = (basePlan.name || '').replace(/\s*v\d+(\.\d+)?$/i, '');
    setNewPlan({
      code: (basePlan.code || '').toLowerCase(),
      name: `${cleanBaseName} v${nextVer}`,
      description: basePlan.description || '',
      version: nextVer,
      billing_interval: basePlan.billing_interval || 'month',
      currency: basePlan.currency || 'USD',
      base_price_cents: basePlan.base_price_cents ?? basePlan.base_price_minor ?? 29900,
      is_public: false,
      features: initialFeatures,
      limits: initialLimits,
    });
    setShowCreatePlanModal(true);
  };

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

  const handleOpenCreatePlanModal = () => {
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
  };

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
      .map((feature) => {
        const k = feature.feature_key || feature.key;
        const altKey = REVERSE_FEATURE_MAP[k] || k.replace(/\./g, '_');
        return {
          feature_id: feature.id,
          access_mode: matrix?.[k] || matrix?.[altKey] || 'none',
        };
      })
      .filter((item) => item.feature_id);
  };

  const buildLimitInputList = (plan) => {
    return (limits || [])
      .map((limit) => {
        const limitKey = limit.limit_key || limit.key;
        const existing = getPlanLimit(plan, limitKey);
        return {
          limit_definition_id: limit.id,
          limit_value: existing !== undefined && existing !== null ? Number(existing) : null,
        };
      })
      .filter((item) => item.limit_definition_id);
  };

  const getNextPlanVersion = (plan) => {
    const versions = (plans || [])
      .filter((item) => (item.code || '').toLowerCase() === (plan.code || '').toLowerCase())
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
        const cleanName = (featureMatrixPlan.name || '').replace(/\s*v\d+(\.\d+)?$/i, '');
        await platformApi.createPlan({
          code: featureMatrixPlan.code,
          name: `${cleanName} v${nextVersion}`,
          description: featureMatrixPlan.description || '',
          version: nextVersion,
          billing_interval: featureMatrixPlan.billing_interval || 'month',
          currency: featureMatrixPlan.currency || 'USD',
          base_price_minor: featureMatrixPlan.base_price_minor ?? featureMatrixPlan.base_price_cents ?? 0,
          is_public: false,
          features: featureInputs,
          limits: buildLimitInputList(featureMatrixPlan),
        });
        showToast(`Created draft v${nextVersion} with updated feature matrix (Active plans cannot be modified directly).`, 'success');
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
        features={features}
        onBack={() => setActiveFeatureMatrixPlan(null)}
        onSaveMatrix={async (savedPlan, newMatrix) => {
          try {
            const featureInputs = (features || [])
              .map((f) => {
                const k = f.feature_key || f.key;
                const altKey = REVERSE_FEATURE_MAP[k] || k.replace(/\./g, '_');
                const accessMode = newMatrix[k] || newMatrix[altKey] || 'none';
                return {
                  feature_id: f.id,
                  access_mode: accessMode,
                };
              })
              .filter((item) => item.feature_id);

            if (isPlanLocked(savedPlan)) {
              const nextVersion = getNextPlanVersion(savedPlan);
              const cleanName = (savedPlan.name || '').replace(/\s*v\d+(\.\d+)?$/i, '');
              await platformApi.createPlan({
                code: savedPlan.code,
                name: `${cleanName} v${nextVersion}`,
                description: savedPlan.description || '',
                version: nextVersion,
                billing_interval: savedPlan.billing_interval || 'month',
                currency: savedPlan.currency || 'USD',
                base_price_minor: savedPlan.base_price_minor ?? savedPlan.base_price_cents ?? 0,
                is_public: false,
                features: featureInputs,
                limits: buildLimitInputList(savedPlan),
              });
              showToast(`Created draft v${nextVersion} with updated feature matrix (Active plans cannot be modified directly).`, 'success');
            } else {
              await platformApi.updatePlanFeatures(savedPlan.id, featureInputs);
              showToast(`Feature matrix updated for "${savedPlan.name}".`, 'success');
            }
            setActiveFeatureMatrixPlan(null);
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
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Page Header with Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {/* Breadcrumb: Platform Admin / Plans */}
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1.5">
            <span>Platform Admin</span>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300 font-semibold">Plans</span>
          </nav>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Plans & Pricing
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage plan versions, pricing, and included limits.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle: Grid Cards vs Version Timeline */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Layers size={13} />
              <span>Cards Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <GitBranch size={13} />
              <span>Timeline Tree</span>
            </button>
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs"
              title="Refresh catalog"
            >
              <RefreshCw size={14} />
            </button>
          )}

          {/* Blue + Create plan button */}
          <button
            type="button"
            onClick={handleOpenCreatePlanModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={15} />
            <span>Create plan</span>
          </button>
        </div>
      </div>

      {/* 2. Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search plans input with search icon */}
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search plans..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
          />
        </div>

        {/* All status dropdown */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto pl-3.5 pr-8 py-2 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs appearance-none cursor-pointer"
          >
            <option value="all">All status</option>
            <option value="active">Active ({statusCounts.active})</option>
            <option value="draft">Draft ({statusCounts.draft})</option>
            <option value="retired">Retired ({statusCounts.retired})</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Visibility dropdown */}
        <div className="relative">
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
            className="w-full sm:w-auto pl-3.5 pr-8 py-2 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs appearance-none cursor-pointer"
          >
            <option value="all">All visibility</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Menu Backdrop */}
      {activeMenuPlanId && (
        <div className="fixed inset-0 z-10" onClick={() => setActiveMenuPlanId(null)} />
      )}

      {/* VIEW MODE 1: Plan Cards Grid */}
      {viewMode === 'grid' && (
        filteredPlans.length === 0 ? (
          <div className="p-12 text-center rounded-[14px] bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 space-y-3 shadow-xs">
            <Layers className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No plans found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No plan versions match the selected search query or lifecycle filters. Try clearing filters or creating a new plan.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {filteredPlans.map((plan) => {
              const price = getPlanPrice(plan);
              const activeUsers = getPlanLimit(plan, 'active_users');
              const activeBranches = getPlanLimit(plan, 'active_branches');
              const monthlySms = getPlanLimit(plan, 'monthly_sms');
              const storageBytes = getPlanLimit(plan, 'storage_bytes');
              const storageFormatted = typeof storageBytes === 'number' && !isNaN(storageBytes)
                ? `${Math.round(storageBytes / 1073741824)} GB`
                : (storageBytes ? `${storageBytes}` : '—');
              const isAct = plan.status === 'active' || plan.is_current;
              const isDraft = plan.status === 'draft';
              const isRetired = plan.status === 'retired';
              const familyCode = (plan.code || '').toUpperCase();
              const familyPlans = plansByCode[familyCode] || [];

              return (
                <div
                  key={plan.id}
                  className="p-6 rounded-[14px] bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between space-y-4 relative"
                >
                  {/* Top Content */}
                  <div className="space-y-4">
                    {/* Top row: Plan code badge, Version badge, Status badge, Visibility badge */}
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        {/* Plan code badge */}
                        <span className="font-bold text-slate-700 dark:text-slate-300 uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[11px]">
                          {plan.code}
                        </span>
                        {/* Version badge */}
                        <span className="font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-900/40 text-[11px]">
                          v{plan.version || 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs">
                        {/* Status badge */}
                        {isAct && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200/70 dark:border-emerald-800/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        )}
                        {isDraft && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-0.5 rounded-full border border-amber-200/70 dark:border-amber-800/50">
                            <Clock size={11} />
                            Draft
                          </span>
                        )}
                        {isRetired && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                            <Archive size={11} />
                            Retired
                          </span>
                        )}

                        {/* Visibility badge */}
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                          plan.is_public
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700'
                            : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/70 dark:border-purple-800/60'
                        }`}>
                          {plan.is_public ? 'Public' : 'Private'}
                        </span>
                      </div>
                    </div>

                    {/* Plan details: Name, Price, Billing Period, Description */}
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1" title={plan.name}>
                        {plan.name}
                      </h3>

                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                          ${price}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          /{plan.billing_interval || 'month'}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2rem]">
                        {plan.description || <span className="italic text-slate-400">No description provided</span>}
                      </p>
                    </div>

                    {/* Included limits: Names on left, values on right, subtle horizontal divider */}
                    <div className="py-2.5 border-y border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>Active users</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {activeUsers ?? '—'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>Branches</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {activeBranches ?? '—'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>Monthly SMS</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {typeof monthlySms === 'number' ? monthlySms.toLocaleString() : (monthlySms ?? '—')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>Cloud storage</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {storageFormatted}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Section: Edit plan, Features, Three-dot menu */}
                  <div className="space-y-2.5 pt-2">
                    {/* Pending Draft Indicator Banner */}
                    {isAct && familyPlans.some((p) => p.status === 'draft') && (
                      <div className="p-2.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex items-center justify-between text-[11px] text-amber-900 dark:text-amber-300">
                        <span className="font-semibold flex items-center gap-1.5">
                          <Clock size={12} className="text-amber-600 dark:text-amber-400" />
                          Draft v{familyPlans.find((p) => p.status === 'draft')?.version} pending
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenPromoteModal(familyPlans.find((p) => p.status === 'draft'))}
                          className="font-bold underline text-amber-700 dark:text-amber-400 hover:text-amber-800 cursor-pointer"
                        >
                          Review & Promote
                        </button>
                      </div>
                    )}

                    {/* Primary Action Row: Edit plan, Features with blue accent, Three-dot menu */}
                    <div className="flex items-center gap-2 relative">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(plan)}
                        className="flex-1 py-2 px-3 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-[#E2E8F0] dark:border-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Edit3 size={13} />
                        <span>Edit plan</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveFeatureMatrixPlan(plan)}
                        className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Layers size={13} />
                        <span>Features</span>
                      </button>

                      {/* Three-dot menu for secondary actions */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setActiveMenuPlanId(activeMenuPlanId === plan.id ? null : plan.id)}
                          className="p-2 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border border-[#E2E8F0] dark:border-slate-700 rounded-xl transition-colors cursor-pointer shadow-xs"
                          title="More actions"
                        >
                          <MoreVertical size={14} />
                        </button>

                        {activeMenuPlanId === plan.id && (
                          <div className="absolute right-0 bottom-full mb-1 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-1 z-20 animate-in fade-in zoom-in-95 duration-100">
                            {/* Draft Next Version */}
                            {isAct && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuPlanId(null);
                                  handleStartNewVersionDraft(plan);
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <GitBranch size={13} className="text-blue-600" />
                                <span>Draft next version (v{getNextPlanVersion(plan)})</span>
                              </button>
                            )}

                            {/* Promote Draft if draft */}
                            {isDraft && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuPlanId(null);
                                  handleOpenPromoteModal(plan);
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <ArrowUpCircle size={13} />
                                <span>Promote draft to active</span>
                              </button>
                            )}

                            {/* Retire if active */}
                            {isAct && plan.id !== 'plan-trial' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuPlanId(null);
                                  handleOpenRetireModal(plan);
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Archive size={13} />
                                <span>Retire obsolete version</span>
                              </button>
                            )}

                            {/* View Timeline Tree */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuPlanId(null);
                                setSelectedTimelineCode(familyCode);
                                setViewMode('timeline');
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <GitBranch size={13} />
                              <span>View timeline tree</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {isRetired && (
                      <div className="py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500 dark:text-slate-400 text-center font-medium">
                        Grandfathered tier (read-only)
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* VIEW MODE 2: Version History Timeline / Tree */}
      {viewMode === 'timeline' && (
        <div className="space-y-6">
          {/* Family Code Quick Filter Bar */}
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Plan Family:</span>
            <button
              type="button"
              onClick={() => setSelectedTimelineCode(null)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                selectedTimelineCode === null
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              All Plan Families ({planCodes.length})
            </button>
            {planCodes.map((code) => {
              const count = plansByCode[code]?.length || 0;
              const isSelected = selectedTimelineCode === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setSelectedTimelineCode(code)}
                  className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  <span className="font-mono">{code}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Families Render */}
          {planCodes
            .filter((code) => !selectedTimelineCode || selectedTimelineCode === code)
            .map((code) => {
              const familyPlans = plansByCode[code] || [];
              const activeVersion = familyPlans.find((p) => p.status === 'active' || p.is_current);
              const latestVersion = familyPlans[0];

              return (
                <div
                  key={code}
                  className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-6"
                >
                  {/* Family Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-black text-xs uppercase tracking-wider">
                          {code}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {activeVersion?.name || latestVersion?.name || code}
                        </h3>
                        <span className="text-xs text-slate-400">
                          ({familyPlans.length} {familyPlans.length === 1 ? 'version' : 'versions'} tracked)
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {activeVersion ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <CheckCircle2 size={13} />
                            Currently offering: v{activeVersion.version} (${getPlanPrice(activeVersion)}/{activeVersion.billing_interval || 'month'})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                            <AlertCircle size={13} />
                            No active version currently serving new signups
                          </span>
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartNewVersionDraft(activeVersion || latestVersion)}
                      className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 dark:text-blue-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto"
                    >
                      <GitBranch size={13} />
                      <span>Draft Next Version (v{getNextPlanVersion(latestVersion)})</span>
                    </button>
                  </div>

                  {/* Vertical Timeline Tree */}
                  <div className="relative pl-6 space-y-6 before:absolute before:top-3 before:bottom-3 before:left-[11px] before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                    {familyPlans.map((vPlan, idx) => {
                      const isAct = vPlan.status === 'active' || vPlan.is_current;
                      const isDraft = vPlan.status === 'draft';
                      const isRetired = vPlan.status === 'retired';
                      const price = getPlanPrice(vPlan);
                      const activeUsers = getPlanLimit(vPlan, 'active_users');
                      const activeBranches = getPlanLimit(vPlan, 'active_branches');
                      const monthlySms = getPlanLimit(vPlan, 'monthly_sms');
                      const storageBytes = getPlanLimit(vPlan, 'storage_bytes');
                      const storageFormatted = typeof storageBytes === 'number' && !isNaN(storageBytes)
                        ? `${Math.round(storageBytes / 1073741824)} GB`
                        : (storageBytes ? `${storageBytes}` : '—');

                      return (
                        <div key={vPlan.id || idx} className="relative group">
                          {/* Timeline Node Marker */}
                          <div className={`absolute -left-6 top-3 w-6 h-6 rounded-full flex items-center justify-center -translate-x-1/2 ring-4 ring-white dark:ring-slate-900 ${
                            isAct
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : isDraft
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-400 text-white'
                          }`}>
                            {isAct ? (
                              <CheckCircle2 size={13} />
                            ) : isDraft ? (
                              <Clock size={12} />
                            ) : (
                              <Archive size={11} />
                            )}
                          </div>

                          {/* Version Node Card */}
                          <div className={`p-4 rounded-2xl border transition-all ${
                            isAct
                              ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200/80 dark:border-emerald-900/50 shadow-2xs'
                              : isDraft
                              ? 'bg-amber-50/20 dark:bg-amber-950/10 border-amber-200/80 dark:border-amber-900/50'
                              : 'bg-slate-50/40 dark:bg-slate-800/30 border-slate-200/80 dark:border-slate-800 opacity-90'
                          }`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                  {typeof vPlan.version === 'number' ? `v${vPlan.version}` : vPlan.version || 'v1'}
                                </span>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                  {vPlan.name}
                                </h4>

                                {isAct && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Active & Current
                                  </span>
                                )}
                                {isDraft && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                                    <Clock size={10} />
                                    Draft Version
                                  </span>
                                )}
                                {isRetired && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    <Archive size={10} />
                                    Retired (Grandfathered)
                                  </span>
                                )}

                                {vPlan.is_public ? (
                                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                                    Public Self-Serve
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-purple-600 font-bold bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded">
                                    Private / Custom
                                  </span>
                                )}
                              </div>

                              <div className="flex items-baseline gap-1">
                                <span className="text-lg font-black text-slate-900 dark:text-white">${price}</span>
                                <span className="text-xs text-slate-400">/{vPlan.billing_interval || 'month'}</span>
                              </div>
                            </div>

                            {vPlan.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                {vPlan.description}
                              </p>
                            )}

                            {/* Quotas & Limits Chips */}
                            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-slate-600 dark:text-slate-300">
                              <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px]">
                                👥 Users: <strong className="text-slate-900 dark:text-white">{activeUsers ?? '—'}</strong>
                              </span>
                              <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px]">
                                🏢 Branches: <strong className="text-slate-900 dark:text-white">{activeBranches ?? '—'}</strong>
                              </span>
                              <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px]">
                                💬 Monthly SMS: <strong className="text-slate-900 dark:text-white">
                                  {typeof monthlySms === 'number' ? monthlySms.toLocaleString() : (monthlySms ?? '—')}
                                </strong>
                              </span>
                              <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px]">
                                ☁️ Cloud Storage: <strong className="text-slate-900 dark:text-white">{storageFormatted}</strong>
                              </span>
                            </div>

                            {/* Version Actions Bar */}
                            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                              {/* Draft actions */}
                              {isDraft && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPromoteModal(vPlan)}
                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                                  >
                                    <ArrowUpCircle size={13} />
                                    <span>Promote to Active & Current</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(vPlan)}
                                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 dark:text-blue-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    <Edit3 size={12} />
                                    <span>Edit Draft</span>
                                  </button>
                                </>
                              )}

                              {/* Active actions */}
                              {isAct && vPlan.id !== 'plan-trial' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRetireModal(vPlan)}
                                    className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 hover:border-amber-400 text-slate-700 hover:text-amber-700 dark:text-slate-300 dark:hover:text-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Archive size={13} />
                                    <span>Retire Obsolete Version</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleStartNewVersionDraft(vPlan)}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus size={12} />
                                    <span>Branch Next Draft</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(vPlan)}
                                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 dark:text-blue-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    <Edit3 size={12} />
                                    <span>Edit Plan</span>
                                  </button>
                                </>
                              )}

                              {/* Common Feature Matrix inspector */}
                              <button
                                type="button"
                                onClick={() => setActiveFeatureMatrixPlan(vPlan)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Layers size={12} />
                                <span>Feature Matrix</span>
                              </button>

                              {isRetired && (
                                <span className="text-[11px] text-slate-400 italic ml-2">
                                  Existing subscribers grandfathered at ${price}/{vPlan.billing_interval || 'month'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}

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

      {/* PROMOTE DRAFT TO ACTIVE MODAL */}
      {promotingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ArrowUpCircle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Promote Draft to Active & Current
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    {promotingPlan.code} • v{promotingPlan.version}
                  </span>
                </div>
              </div>
              <button
                onClick={() => { setPromotingPlan(null); setConflictingActivePlan(null); }}
                disabled={isPromoting}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Plan Tier:</span>
                <strong className="text-slate-900 dark:text-white">{promotingPlan.name}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Pricing:</span>
                <strong className="text-slate-900 dark:text-white">
                  ${getPlanPrice(promotingPlan)} / {promotingPlan.billing_interval || 'month'}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Target Version:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">v{promotingPlan.version}</span>
              </div>
            </div>

            {/* Conflict Warning or Info Note */}
            {conflictingActivePlan ? (
              <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 space-y-2 text-xs text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle size={16} className="text-amber-600 shrink-0" />
                  <span>Existing Active Version Replacement</span>
                </div>
                <p className="leading-relaxed text-[11px]">
                  <strong>{conflictingActivePlan.name} (v{conflictingActivePlan.version})</strong> is currently the active version for code <code className="font-mono px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50">{promotingPlan.code}</code>.
                </p>
                <p className="leading-relaxed text-[11px]">
                  Promoting this draft will automatically <strong>retire v{conflictingActivePlan.version}</strong> and set <strong>v{promotingPlan.version}</strong> as the current public tier. Existing tenant subscriptions on v{conflictingActivePlan.version} will remain <strong>grandfathered and undisturbed</strong>.
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/50 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
                <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  This draft will become the current active tier for code <code className="font-mono font-bold">{promotingPlan.code}</code>. All new tenant subscriptions will receive this version.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => { setPromotingPlan(null); setConflictingActivePlan(null); }}
                disabled={isPromoting}
                className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPromotion}
                disabled={isPromoting}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                {isPromoting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                <span>Confirm & Promote to Active</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RETIRE OBSOLETE PLAN VERSION MODAL */}
      {retiringPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Archive size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Retire Obsolete Plan Version
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    {retiringPlan.code} • v{retiringPlan.version}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setRetiringPlan(null)}
                disabled={isRetiring}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Plan Tier:</span>
                <strong className="text-slate-900 dark:text-white">{retiringPlan.name}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Pricing:</span>
                <strong className="text-slate-900 dark:text-white">
                  ${getPlanPrice(retiringPlan)} / {retiringPlan.billing_interval || 'month'}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Retiring Version:</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">v{retiringPlan.version}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 space-y-2 text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle size={16} className="text-amber-600 shrink-0" />
                <span>Catalog Retirement & Grandfathering Protection</span>
              </div>
              <p className="leading-relaxed text-[11px]">
                Retiring this plan version will remove it from the public catalog and disable new tenant signups on this tier.
              </p>
              <p className="leading-relaxed text-[11px]">
                <strong>Continuity Guarantee:</strong> Existing active subscriptions linked to this version will <strong>not</strong> be interrupted or downgraded. Their locked pricing and quota limits remain grandfathered.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setRetiringPlan(null)}
                disabled={isRetiring}
                className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRetire}
                disabled={isRetiring}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                {isRetiring ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                <span>Confirm Retirement</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
