import React, { useState, useMemo } from 'react';
import { 
  Layers, Plus, Check, X, Shield, Sliders, 
  Sparkles, DollarSign, Users, Database, Globe, 
  FileText, Briefcase, Zap, Loader2, Edit3, 
  AlertCircle, Info, CheckCircle2, GitBranch,
  Archive, ArrowUpCircle, History, Clock,
  ChevronRight, ArrowRight, CornerDownRight, CheckCircle,
  Search, MoreVertical, ChevronDown, RefreshCw,
  MessageSquare, Mail, Cloud, HardDrive, Filter
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import platformApi from '../api/platformApi';
import PlanFeatureMatrixPage, { ALL_PLATFORM_FEATURES, FEATURE_KEY_BACKEND_MAP, REVERSE_FEATURE_MAP } from './PlanFeatureMatrixPage';

// Helper: extract numeric price for sorting and comparison
const getNumericPrice = (p) => {
  if (!p) return 0;
  const cents = p.base_price_cents ?? p.base_price_minor;
  if (cents !== undefined && cents !== null && !isNaN(Number(cents))) {
    return Number(cents) / 100;
  }
  const dollars = Number(p.base_price_dollars ?? p.price);
  return isNaN(dollars) ? 0 : dollars;
};

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
  const [createPlanModalTab, setCreatePlanModalTab] = useState('details'); // 'details' | 'limits' | 'features'
  const [createPlanFeatureSearch, setCreatePlanFeatureSearch] = useState('');
  const [createPlanFeatureCategory, setCreatePlanFeatureCategory] = useState('all');
  const [createPlanErrors, setCreatePlanErrors] = useState({});
  const [createPlanTouched, setCreatePlanTouched] = useState({});

  // Versioning & Lifecycle State
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'timeline'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'draft' | 'retired'
  const [visibilityFilter, setVisibilityFilter] = useState('all'); // 'all' | 'public' | 'private'
  const [sortBy, setSortBy] = useState('price-asc'); // 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc'
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

  // Unique plan family codes sorted by base price ascending
  const planCodes = useMemo(() => {
    const codes = Object.keys(plansByCode);
    return codes.sort((codeA, codeB) => {
      const planA = plansByCode[codeA]?.find((p) => p.status === 'active' || p.is_current) || plansByCode[codeA]?.[0];
      const planB = plansByCode[codeB]?.find((p) => p.status === 'active' || p.is_current) || plansByCode[codeB]?.[0];
      const priceA = getNumericPrice(planA);
      const priceB = getNumericPrice(planB);
      if (priceA !== priceB) return priceA - priceB;
      return codeA.localeCompare(codeB);
    });
  }, [plansByCode]);

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

    // Apply sorting (Price: Low to High by default)
    baseList.sort((a, b) => {
      if (sortBy === 'price-desc') {
        const diff = getNumericPrice(b) - getNumericPrice(a);
        return diff !== 0 ? diff : (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'name-asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'name-desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      // Default: 'price-asc' (Price: Low to High)
      const diff = getNumericPrice(a) - getNumericPrice(b);
      return diff !== 0 ? diff : (a.name || '').localeCompare(b.name || '');
    });

    return baseList;
  }, [planCodes, familyOverview, statusFilter, displayPlans, visibilityFilter, searchQuery, sortBy]);

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
    ALL_PLATFORM_FEATURES.forEach((f) => {
      initialFeatures[f.key] = getFeatureAccessMode(basePlan, f.key);
    });
    (features || []).forEach((f) => {
      const k = f.feature_key || f.key;
      if (k) initialFeatures[k] = getFeatureAccessMode(basePlan, k);
    });

    const rawStorage = getPlanLimit(basePlan, 'storage_bytes');
    const storageGb = typeof rawStorage === 'number' && rawStorage > 0 
      ? Math.round(rawStorage / 1073741824) 
      : 20;

    const initialLimits = {
      active_users: getPlanLimit(basePlan, 'active_users') ?? 10,
      active_branches: getPlanLimit(basePlan, 'active_branches') ?? 2,
      monthly_sms: getPlanLimit(basePlan, 'monthly_sms') ?? 2000,
      storage_gb: storageGb,
      monthly_email: getPlanLimit(basePlan, 'monthly_email') ?? 10000,
      monthly_api_requests: getPlanLimit(basePlan, 'monthly_api_requests') ?? 100000,
      monthly_automations: getPlanLimit(basePlan, 'monthly_automations') ?? 1000,
    };
    (limits || []).forEach((l) => {
      const k = l.limit_key || l.key;
      if (k) {
        const val = getPlanLimit(basePlan, k);
        if (val !== null && val !== undefined) initialLimits[k] = val;
      }
    });

    const cleanBaseName = (basePlan.name || '').replace(/\s*v\d+(\.\d+)?$/i, '');
    const cents = basePlan.base_price_cents ?? basePlan.base_price_minor ?? 4900;
    const dollars = isNaN(cents) ? 49 : parseFloat((cents / 100).toFixed(2));
    setNewPlan({
      code: (basePlan.code || '').toLowerCase(),
      name: `${cleanBaseName} v${nextVer}`,
      description: basePlan.description || '',
      version: nextVer,
      billing_interval: basePlan.billing_interval || 'month',
      currency: basePlan.currency || 'USD',
      base_price_dollars: dollars,
      is_public: false,
      features: initialFeatures,
      limits: initialLimits,
    });
    setCreatePlanModalTab('details');
    setCreatePlanFeatureSearch('');
    setCreatePlanFeatureCategory('all');
    setCreatePlanErrors({});
    setCreatePlanTouched({});
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
    base_price_dollars: 49,
    is_public: true,
    limits: {
      active_users: '',
      active_branches: '',
      monthly_sms: '',
      storage_gb: '',
      monthly_email: '',
      monthly_api_requests: '',
      monthly_automations: '',
    },
    features: {},
  });

  const handleOpenCreatePlanModal = () => {
    const initialFeatures = {};
    ALL_PLATFORM_FEATURES.forEach((f) => {
      initialFeatures[f.key] = f.defaultMode || 'write';
    });
    (features || []).forEach((f) => { 
      const k = f.feature_key || f.key;
      if (k) initialFeatures[k] = 'write'; 
    });

    const initialLimits = {
      active_users: '',
      active_branches: '',
      monthly_sms: '',
      storage_gb: '',
      monthly_email: '',
      monthly_api_requests: '',
      monthly_automations: '',
    };
    (limits || []).forEach((l) => {
      const lKey = l.limit_key || l.key;
      if (lKey) {
        initialLimits[lKey] = '';
      }
    });

    setNewPlan({
      code: '',
      name: '',
      description: '',
      version: 1,
      billing_interval: 'month',
      currency: 'USD',
      base_price_dollars: 49,
      is_public: true,
      features: initialFeatures,
      limits: initialLimits,
    });
    setCreatePlanModalTab('details');
    setCreatePlanFeatureSearch('');
    setCreatePlanFeatureCategory('all');
    setCreatePlanErrors({});
    setCreatePlanTouched({});
    setShowCreatePlanModal(true);
  };

  // Full Validation for Step 1 (Identity & Pricing)
  const validateCreatePlanDetails = (planData = newPlan) => {
    const errors = {};
    const code = (planData.code || '').trim().toLowerCase();
    const name = (planData.name || '').trim();
    const priceStr = String(planData.base_price_dollars ?? '').trim();
    const price = parseFloat(priceStr);

    if (!code) {
      errors.code = 'Plan code is required.';
    } else if (code.length < 2) {
      errors.code = 'Plan code must be at least 2 characters.';
    } else if (!/^[a-z0-9_]+$/.test(code)) {
      errors.code = 'Plan code can only contain lowercase alphanumeric characters and underscores.';
    } else {
      const matchingCodePlan = (plans || []).find((p) => (p.code || '').toLowerCase() === code && Number(p.version || 1) === Number(planData.version || 1));
      if (matchingCodePlan) {
        errors.code = `Plan code "${code}" (v${matchingCodePlan.version || 1}) already exists in catalog. Please choose a unique code.`;
      }
    }

    if (!name) {
      errors.name = 'Plan display name is required.';
    } else if (name.length < 2) {
      errors.name = 'Plan display name must be at least 2 characters.';
    }

    if (priceStr === '') {
      errors.base_price_dollars = 'Base price is required.';
    } else if (isNaN(price) || price < 0) {
      errors.base_price_dollars = 'Base price must be a valid number equal to or greater than $0.00.';
    }

    if (!planData.billing_interval || !['month', 'year'].includes(planData.billing_interval)) {
      errors.billing_interval = 'Please select a valid billing interval.';
    }

    return errors;
  };

  // Full Validation for Step 2 (Capacity & Resource Limits)
  const validateCreatePlanLimits = (planData = newPlan) => {
    const errors = {};
    const limitsObj = planData.limits || {};

    const limitFields = [
      { key: 'active_users', label: 'Active Users' },
      { key: 'active_branches', label: 'Branches & Depots' },
      { key: 'monthly_sms', label: 'Monthly SMS' },
      { key: 'monthly_email', label: 'Monthly Emails' },
      { key: 'storage_gb', label: 'Cloud Storage (GB)' },
      { key: 'monthly_api_requests', label: 'API Requests' },
      { key: 'monthly_automations', label: 'Monthly Automations' },
    ];

    limitFields.forEach(({ key, label }) => {
      const val = limitsObj[key];
      if (val === undefined || val === null || val === '') {
        errors[key] = `${label} limit is required (enter 0 or more).`;
      } else {
        const num = Number(val);
        if (isNaN(num) || num < 0) {
          errors[key] = `${label} must be a valid non-negative number (0 or greater).`;
        }
      }
    });

    return errors;
  };

  // Full Combined Validation Across All 3 Steps
  const validateFullCreatePlan = (planData = newPlan) => {
    const detailsErrors = validateCreatePlanDetails(planData);
    const limitsErrors = validateCreatePlanLimits(planData);
    const featureErrors = {};

    if (!planData.features || Object.keys(planData.features).length === 0) {
      featureErrors.features = 'At least one module permission must be configured.';
    }

    const allErrors = { ...detailsErrors, ...limitsErrors, ...featureErrors };
    return {
      isValid: Object.keys(allErrors).length === 0,
      detailsErrors,
      limitsErrors,
      featureErrors,
      allErrors,
    };
  };

  const handleNextFromDetails = () => {
    const dErrors = validateCreatePlanDetails();
    if (Object.keys(dErrors).length > 0) {
      setCreatePlanErrors((prev) => ({ ...prev, ...dErrors }));
      setCreatePlanTouched((prev) => ({
        ...prev,
        code: true,
        name: true,
        base_price_dollars: true,
        billing_interval: true,
      }));
      const firstMsg = Object.values(dErrors)[0];
      showToast(firstMsg, 'warning');
      return;
    }
    setCreatePlanErrors((prev) => {
      const copy = { ...prev };
      delete copy.code;
      delete copy.name;
      delete copy.base_price_dollars;
      delete copy.billing_interval;
      return copy;
    });
    setCreatePlanModalTab('limits');
  };

  const handleNextFromLimits = () => {
    const lErrors = validateCreatePlanLimits();
    if (Object.keys(lErrors).length > 0) {
      setCreatePlanErrors((prev) => ({ ...prev, ...lErrors }));
      const firstMsg = Object.values(lErrors)[0];
      showToast(firstMsg, 'warning');
      return;
    }
    setCreatePlanErrors((prev) => {
      const copy = { ...prev };
      delete copy.active_users;
      delete copy.active_branches;
      delete copy.monthly_sms;
      delete copy.monthly_email;
      delete copy.storage_gb;
      delete copy.monthly_api_requests;
      delete copy.monthly_automations;
      return copy;
    });
    setCreatePlanModalTab('features');
  };

  const handleTabSwitch = (targetTab) => {
    if (targetTab === 'limits') {
      const dErrors = validateCreatePlanDetails();
      if (Object.keys(dErrors).length > 0) {
        setCreatePlanErrors((prev) => ({ ...prev, ...dErrors }));
        setCreatePlanTouched((prev) => ({ ...prev, code: true, name: true, base_price_dollars: true }));
        showToast(Object.values(dErrors)[0], 'warning');
        return;
      }
    } else if (targetTab === 'features') {
      const dErrors = validateCreatePlanDetails();
      if (Object.keys(dErrors).length > 0) {
        setCreatePlanModalTab('details');
        setCreatePlanErrors((prev) => ({ ...prev, ...dErrors }));
        setCreatePlanTouched((prev) => ({ ...prev, code: true, name: true, base_price_dollars: true }));
        showToast(Object.values(dErrors)[0], 'warning');
        return;
      }
      const lErrors = validateCreatePlanLimits();
      if (Object.keys(lErrors).length > 0) {
        setCreatePlanModalTab('limits');
        setCreatePlanErrors((prev) => ({ ...prev, ...lErrors }));
        showToast(Object.values(lErrors)[0], 'warning');
        return;
      }
    }
    setCreatePlanModalTab(targetTab);
  };


  // Helper: calculate price cleanly (supports base_price_cents and base_price_minor)
  const getPlanPrice = (plan) => {
    const cents = plan?.base_price_cents ?? plan?.base_price_minor ?? 0;
    if (isNaN(cents)) return '0';
    const dollars = cents / 100;
    return cents % 100 === 0 ? dollars.toFixed(0) : dollars.toFixed(2);
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
    const dollars = isNaN(cents) ? 0 : parseFloat((cents / 100).toFixed(2));

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
        payload.base_price_minor = Math.round((parseFloat(editPlanForm.base_price_dollars) || 0) * 100);
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
    if (e) e.preventDefault();

    // Full 3-step validation
    const { isValid, detailsErrors, limitsErrors, featureErrors, allErrors } = validateFullCreatePlan();
    if (!isValid) {
      setCreatePlanErrors(allErrors);
      setCreatePlanTouched({
        code: true,
        name: true,
        base_price_dollars: true,
        billing_interval: true,
      });

      if (Object.keys(detailsErrors).length > 0) {
        setCreatePlanModalTab('details');
        showToast(`Step 1 Details Error: ${Object.values(detailsErrors)[0]}`, 'warning');
        return;
      }
      if (Object.keys(limitsErrors).length > 0) {
        setCreatePlanModalTab('limits');
        showToast(`Step 2 Limits Error: ${Object.values(limitsErrors)[0]}`, 'warning');
        return;
      }
      if (Object.keys(featureErrors).length > 0) {
        setCreatePlanModalTab('features');
        showToast(Object.values(featureErrors)[0], 'warning');
        return;
      }
      return;
    }

    setIsSaving(true);
    try {
      // 1. Build features list
      const featuresList = [];
      const featureKeySet = new Set();

      (features || []).forEach((f) => {
        const k = f.feature_key || f.key;
        const altKey = REVERSE_FEATURE_MAP[k] || k?.replace(/\./g, '_');
        const accessMode = newPlan.features?.[k] || newPlan.features?.[altKey] || 'write';
        if (f.id) {
          featuresList.push({
            feature_id: f.id,
            access_mode: accessMode,
          });
          featureKeySet.add(k);
        }
      });

      // Fallback if backend features list is empty: map directly by canonical key
      if (featuresList.length === 0) {
        ALL_PLATFORM_FEATURES.forEach((f) => {
          const mode = newPlan.features?.[f.key] || f.defaultMode || 'write';
          const backendKey = FEATURE_KEY_BACKEND_MAP[f.key] || f.key;
          featuresList.push({
            feature_key: backendKey,
            access_mode: mode,
          });
        });
      }

      // 2. Build limits list (convert storage_gb to bytes)
      const storageGbVal = Number.isFinite(Number(newPlan.limits?.storage_gb)) ? Number(newPlan.limits?.storage_gb) : 0;
      const storageBytesVal = Math.round(storageGbVal * 1073741824);
      const activeUsersVal = Number.isFinite(Number(newPlan.limits?.active_users)) ? Number(newPlan.limits?.active_users) : 0;
      const activeBranchesVal = Number.isFinite(Number(newPlan.limits?.active_branches)) ? Number(newPlan.limits?.active_branches) : 0;
      const monthlySmsVal = Number.isFinite(Number(newPlan.limits?.monthly_sms)) ? Number(newPlan.limits?.monthly_sms) : 0;
      const monthlyEmailVal = Number.isFinite(Number(newPlan.limits?.monthly_email)) ? Number(newPlan.limits?.monthly_email) : 0;
      const monthlyApiVal = Number.isFinite(Number(newPlan.limits?.monthly_api_requests)) ? Number(newPlan.limits?.monthly_api_requests) : 0;
      const monthlyAutoVal = Number.isFinite(Number(newPlan.limits?.monthly_automations)) ? Number(newPlan.limits?.monthly_automations) : 0;


      const limitsList = [];
      (limits || []).forEach((l) => {
        const lKey = l.limit_key || l.key;
        let val = newPlan.limits?.[lKey];
        if (lKey === 'storage.bytes' || lKey === 'storage_bytes') {
          val = storageBytesVal;
        } else if (lKey === 'users.max_active' || lKey === 'active_users') {
          val = activeUsersVal;
        } else if (lKey === 'branches.max_active' || lKey === 'active_branches') {
          val = activeBranchesVal;
        } else if (lKey === 'sms.monthly' || lKey === 'monthly_sms') {
          val = monthlySmsVal;
        } else if (lKey === 'email.monthly' || lKey === 'monthly_email') {
          val = monthlyEmailVal;
        } else if (lKey === 'api.monthly_requests' || lKey === 'monthly_api_requests') {
          val = monthlyApiVal;
        } else if (lKey === 'automation.monthly_runs' || lKey === 'monthly_automations') {
          val = monthlyAutoVal;
        }
        if (l.id && val !== undefined && val !== null) {
          limitsList.push({
            limit_definition_id: l.id,
            limit_value: Number(val),
          });
        }
      });

      if (limitsList.length === 0) {
        limitsList.push(
          { limit_key: 'users.max_active', limit_value: activeUsersVal },
          { limit_key: 'branches.max_active', limit_value: activeBranchesVal },
          { limit_key: 'sms.monthly', limit_value: monthlySmsVal },
          { limit_key: 'storage.bytes', limit_value: storageBytesVal },
          { limit_key: 'email.monthly', limit_value: monthlyEmailVal },
          { limit_key: 'api.monthly_requests', limit_value: monthlyApiVal },
          { limit_key: 'automation.monthly_runs', limit_value: monthlyAutoVal }
        );
      }

      const payload = {
        code: newPlan.code.trim().toLowerCase(),
        name: newPlan.name.trim(),
        description: newPlan.description.trim(),
        version: Number(newPlan.version) || 1,
        billing_interval: newPlan.billing_interval,
        currency: newPlan.currency || 'USD',
        base_price_minor: Math.round((parseFloat(newPlan.base_price_dollars) || 0) * 100),
        is_public: Boolean(newPlan.is_public),
        features: featuresList,
        limits: limitsList,
      };

      await platformApi.createPlan(payload);
      showToast(`Plan "${newPlan.name}" created in catalog with configured limits and features.`, 'success');
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

  const getFeatureCategoryBadgeColor = (cat) => {
    switch (cat) {
      case 'CRM':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/80 dark:border-blue-900/60';
      case 'Operations':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-900/60';
      case 'Finance':
        return 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border-violet-200/80 dark:border-violet-900/60';
      case 'Communication':
        return 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-200/80 dark:border-cyan-900/60';
      case 'Documents':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/80 dark:border-amber-900/60';
      case 'Platform':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700';
      case 'Integration':
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-900/60';
      case 'Security':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200/80 dark:border-rose-900/60';
      case 'Customer':
        return 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border-teal-200/80 dark:border-teal-900/60';
      case 'Reporting':
        return 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border-orange-200/80 dark:border-orange-900/60';
      case 'Automation':
        return 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/50 dark:text-fuchsia-300 border-fuchsia-200/80 dark:border-fuchsia-900/60';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const createPlanFeatureCounts = useMemo(() => {
    let write = 0;
    let read = 0;
    let none = 0;
    ALL_PLATFORM_FEATURES.forEach((f) => {
      const mode = newPlan.features?.[f.key] || f.defaultMode || 'write';
      if (mode === 'write') write++;
      else if (mode === 'read') read++;
      else none++;
    });
    return { write, read, none, total: ALL_PLATFORM_FEATURES.length };
  }, [newPlan.features]);

  const featureCategoriesList = useMemo(() => {
    const cats = new Set(ALL_PLATFORM_FEATURES.map((f) => f.category));
    return ['all', ...Array.from(cats).sort()];
  }, []);

  const filteredNewPlanFeatures = useMemo(() => {
    return ALL_PLATFORM_FEATURES.filter((f) => {
      const matchesCat = createPlanFeatureCategory === 'all' || f.category === createPlanFeatureCategory;
      const q = createPlanFeatureSearch.trim().toLowerCase();
      const matchesQuery = !q || 
        f.name.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.key.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [createPlanFeatureCategory, createPlanFeatureSearch]);

  const applyLimitPreset = (presetKey) => {
    if (presetKey === 'zero' || presetKey === 'reset') {
      setNewPlan((prev) => ({
        ...prev,
        limits: {
          ...prev.limits,
          active_users: 0,
          'users.max_active': 0,
          active_branches: 0,
          'branches.max_active': 0,
          monthly_sms: 0,
          'sms.monthly': 0,
          storage_gb: 0,
          'storage.bytes': 0,
          monthly_email: 0,
          'email.monthly': 0,
          monthly_api_requests: 0,
          'api.monthly_requests': 0,
          monthly_automations: 0,
          'automation.monthly_runs': 0,
        },
      }));
    } else if (presetKey === 'starter') {
      setNewPlan((prev) => ({
        ...prev,
        limits: {
          ...prev.limits,
          active_users: 5,
          'users.max_active': 5,
          active_branches: 1,
          'branches.max_active': 1,
          monthly_sms: 500,
          'sms.monthly': 500,
          storage_gb: 5,
          'storage.bytes': 5 * 1073741824,
          monthly_email: 2500,
          'email.monthly': 2500,
          monthly_api_requests: 10000,
          'api.monthly_requests': 10000,
          monthly_automations: 250,
          'automation.monthly_runs': 250,
        },
      }));
    } else if (presetKey === 'growth') {
      setNewPlan((prev) => ({
        ...prev,
        limits: {
          ...prev.limits,
          active_users: 10,
          'users.max_active': 10,
          active_branches: 2,
          'branches.max_active': 2,
          monthly_sms: 2000,
          'sms.monthly': 2000,
          storage_gb: 20,
          'storage.bytes': 20 * 1073741824,
          monthly_email: 10000,
          'email.monthly': 10000,
          monthly_api_requests: 100000,
          'api.monthly_requests': 100000,
          monthly_automations: 1000,
          'automation.monthly_runs': 1000,
        },
      }));
    } else if (presetKey === 'enterprise') {
      setNewPlan((prev) => ({
        ...prev,
        limits: {
          ...prev.limits,
          active_users: 50,
          'users.max_active': 50,
          active_branches: 10,
          'branches.max_active': 10,
          monthly_sms: 10000,
          'sms.monthly': 10000,
          storage_gb: 100,
          'storage.bytes': 100 * 1073741824,
          monthly_email: 50000,
          'email.monthly': 50000,
          monthly_api_requests: 500000,
          'api.monthly_requests': 500000,
          monthly_automations: 10000,
          'automation.monthly_runs': 10000,
        },
      }));
    }
  };

  const handleSetAllCreatePlanFeatures = (mode) => {
    const updated = {};
    ALL_PLATFORM_FEATURES.forEach((f) => {
      updated[f.key] = mode;
    });
    setNewPlan((prev) => ({
      ...prev,
      features: updated,
    }));
  };

  const handleApplyLogisticsFeaturePreset = () => {
    const updated = {};
    ALL_PLATFORM_FEATURES.forEach((f) => {
      if (['CRM', 'Operations', 'Communication', 'Finance', 'Documents'].includes(f.category)) {
        updated[f.key] = 'write';
      } else if (['Platform', 'Customer', 'Reporting'].includes(f.category)) {
        updated[f.key] = 'read';
      } else {
        updated[f.key] = 'none';
      }
    });
    setNewPlan((prev) => ({
      ...prev,
      features: updated,
    }));
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
    <div className="space-y-4 animate-in fade-in duration-150">
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

        {/* Sort by dropdown */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full sm:w-auto pl-3.5 pr-8 py-2 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs appearance-none cursor-pointer"
          >
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name-asc">Name: A to Z</option>
            <option value="name-desc">Name: Z to A</option>
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
            {filteredPlans.map((plan) => {
              const price = getPlanPrice(plan);
              const activeUsers = getPlanLimit(plan, 'active_users');
              const activeBranches = getPlanLimit(plan, 'active_branches');
              const monthlySms = getPlanLimit(plan, 'monthly_sms');
              const monthlyEmail = getPlanLimit(plan, 'monthly_email');
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
                  className="p-4 sm:p-4.5 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between space-y-3.5 relative"
                >
                  {/* Top Content */}
                  <div className="space-y-3">
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
                        <span>Monthly Email</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {typeof monthlyEmail === 'number' ? monthlyEmail.toLocaleString() : (monthlyEmail ?? '—')}
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

                    {/* Primary Action Row: Edit plan (solid blue primary), Features (neutral secondary), Three-dot menu */}
                    <div className="flex items-center gap-2 relative">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(plan)}
                        className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Edit3 size={13} />
                        <span>Edit plan</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveFeatureMatrixPlan(plan)}
                        className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
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
        <div className="space-y-3.5">
          {/* Family Code Quick Filter Bar */}
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
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
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4"
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
                      const monthlyEmail = getPlanLimit(vPlan, 'monthly_email');
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
                                ✉️ Monthly Email: <strong className="text-slate-900 dark:text-white">
                                  {typeof monthlyEmail === 'number' ? monthlyEmail.toLocaleString() : (monthlyEmail ?? '—')}
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
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
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
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
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
                      step="0.01"
                      min="0"
                      disabled={editingPlan?.status === 'active' || editingPlan?.is_current}
                      value={editPlanForm.base_price_dollars}
                      onChange={(e) => setEditPlanForm({ ...editPlanForm, base_price_dollars: e.target.value })}
                      placeholder="e.g. 3.99"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Define New Platform Plan
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure tier identity, pricing, resource capacity limits, and all 28 platform modules
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowCreatePlanModal(false)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Tab Navigation Header */}
            <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1 bg-slate-200/60 dark:bg-slate-800/60 rounded-2xl text-xs">
                <button
                  type="button"
                  onClick={() => handleTabSwitch('details')}
                  className={`flex items-center justify-between px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                    createPlanModalTab === 'details'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} />
                    <span>1. Identity & Pricing</span>
                  </div>
                  {newPlan.base_price_dollars !== undefined && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      createPlanModalTab === 'details' 
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-blue-300' 
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      ${newPlan.base_price_dollars || 0}/{newPlan.billing_interval || 'mo'}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSwitch('limits')}
                  className={`flex items-center justify-between px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                    createPlanModalTab === 'limits'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sliders size={14} />
                    <span>2. Capacity Limits</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    createPlanModalTab === 'limits' 
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-blue-300' 
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {newPlan.limits?.active_users ?? 0} Users · {newPlan.limits?.storage_gb ?? 0} GB
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabSwitch('features')}
                  className={`flex items-center justify-between px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                    createPlanModalTab === 'features'
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Layers size={14} />
                    <span>3. Features & Functions</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    createPlanModalTab === 'features' 
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-300' 
                      : 'bg-emerald-100/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                  }`}>
                    {createPlanFeatureCounts.write} Modules
                  </span>
                </button>
              </div>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreatePlan} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              
              {/* TAB 1: IDENTITY & PRICING */}
              {createPlanModalTab === 'details' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 flex items-start gap-3 text-blue-900 dark:text-blue-300">
                    <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed">
                      Define the core brand identifier, catalog listing name, and billing schedule for this plan tier. In step 2 and 3, you will configure resource quotas (users, SMS, storage) and modular permissions.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1 text-[11px]">
                        Plan Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={newPlan.code}
                        onChange={(e) => {
                          const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                          setNewPlan({ ...newPlan, code: val });
                          if (createPlanErrors.code) {
                            setCreatePlanErrors((prev) => {
                              const next = { ...prev };
                              delete next.code;
                              return next;
                            });
                          }
                        }}
                        onBlur={() => {
                          setCreatePlanTouched((prev) => ({ ...prev, code: true }));
                          const dErrors = validateCreatePlanDetails({ ...newPlan });
                          if (dErrors.code) {
                            setCreatePlanErrors((prev) => ({ ...prev, code: dErrors.code }));
                          }
                        }}
                        placeholder="e.g. medium_tier or growth_pro"
                        className={`w-full h-10 px-3.5 rounded-xl border bg-white dark:bg-slate-950 font-mono font-bold text-slate-900 dark:text-white outline-none text-xs transition-colors ${
                          createPlanErrors.code && createPlanTouched.code
                            ? 'border-rose-500 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20'
                            : 'border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600'
                        }`}
                      />
                      {createPlanErrors.code && createPlanTouched.code ? (
                        <span className="text-[10px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle size={11} className="shrink-0" />
                          {createPlanErrors.code}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Unique machine identifier (lowercase alphanumeric and underscores only)
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1 text-[11px]">
                        Plan Display Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={newPlan.name}
                        onChange={(e) => {
                          setNewPlan({ ...newPlan, name: e.target.value });
                          if (createPlanErrors.name) {
                            setCreatePlanErrors((prev) => {
                              const next = { ...prev };
                              delete next.name;
                              return next;
                            });
                          }
                        }}
                        onBlur={() => {
                          setCreatePlanTouched((prev) => ({ ...prev, name: true }));
                          const dErrors = validateCreatePlanDetails({ ...newPlan });
                          if (dErrors.name) {
                            setCreatePlanErrors((prev) => ({ ...prev, name: dErrors.name }));
                          }
                        }}
                        placeholder="e.g. Medium Plan"
                        className={`w-full h-10 px-3.5 rounded-xl border bg-white dark:bg-slate-950 font-bold text-slate-900 dark:text-white outline-none text-xs transition-colors ${
                          createPlanErrors.name && createPlanTouched.name
                            ? 'border-rose-500 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20'
                            : 'border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600'
                        }`}
                      />
                      {createPlanErrors.name && createPlanTouched.name ? (
                        <span className="text-[10px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle size={11} className="shrink-0" />
                          {createPlanErrors.name}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Public title rendered on the plan cards in the tenant portal and catalog
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1 text-[11px]">
                      Description & Target Fleet Profile
                    </label>
                    <textarea
                      rows={3}
                      value={newPlan.description}
                      onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                      placeholder="e.g. Perfect for growing logistics carriers and regional movers with multi-truck fleets requiring dispatch scheduling and SMS..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none leading-relaxed text-xs resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1 text-[11px]">
                        Base Price (USD $) *
                      </label>
                      <div className={`flex items-center rounded-xl border bg-white dark:bg-slate-950 overflow-hidden shadow-2xs transition-all h-10 ${
                        createPlanErrors.base_price_dollars && createPlanTouched.base_price_dollars
                          ? 'border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20 focus-within:border-rose-600'
                          : 'border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-600'
                      }`}>
                        <span className="px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0 select-none">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={newPlan.base_price_dollars}
                          onChange={(e) => {
                            setNewPlan({ ...newPlan, base_price_dollars: e.target.value });
                            if (createPlanErrors.base_price_dollars) {
                              setCreatePlanErrors((prev) => {
                                const next = { ...prev };
                                delete next.base_price_dollars;
                                return next;
                              });
                            }
                          }}
                          onBlur={() => {
                            setCreatePlanTouched((prev) => ({ ...prev, base_price_dollars: true }));
                            const dErrors = validateCreatePlanDetails({ ...newPlan });
                            if (dErrors.base_price_dollars) {
                              setCreatePlanErrors((prev) => ({ ...prev, base_price_dollars: dErrors.base_price_dollars }));
                            }
                          }}
                          placeholder="49.00"
                          className="w-full px-3 py-2 bg-transparent font-mono font-bold text-slate-900 dark:text-white text-xs outline-none"
                        />
                      </div>
                      {createPlanErrors.base_price_dollars && createPlanTouched.base_price_dollars ? (
                        <span className="text-[10px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle size={11} className="shrink-0" />
                          {createPlanErrors.base_price_dollars}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 mt-1 block">Recurring baseline tier cost (must be $0 or greater)</span>
                      )}
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1 text-[11px]">
                        Billing Interval
                      </label>
                      <div className="relative">
                        <select
                          value={newPlan.billing_interval}
                          onChange={(e) => setNewPlan({ ...newPlan, billing_interval: e.target.value })}
                          className="w-full h-10 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none text-xs cursor-pointer appearance-none pr-8 shadow-2xs"
                        >
                          <option value="month">Monthly Cycle</option>
                          <option value="year">Annual Cycle</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">Invoice renewal recurrence</span>
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1 text-[11px]">
                        Catalog Visibility
                      </label>
                      <div className="relative">
                        <select
                          value={newPlan.is_public ? 'true' : 'false'}
                          onChange={(e) => setNewPlan({ ...newPlan, is_public: e.target.value === 'true' })}
                          className="w-full h-10 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none text-xs cursor-pointer appearance-none pr-8 shadow-2xs"
                        >
                          <option value="true">Public Self-Serve</option>
                          <option value="false">Private / Custom Assisted</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">Self-signup vs sales negotiated</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CAPACITY & RESOURCE LIMITS */}
              {createPlanModalTab === 'limits' && (
                <div className="space-y-3.5 animate-in fade-in duration-100">
                  {Object.keys(createPlanErrors).some((k) =>
                    ['active_users', 'active_branches', 'monthly_sms', 'monthly_email', 'storage_gb', 'monthly_api_requests', 'monthly_automations'].includes(k)
                  ) && (
                    <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                      <AlertCircle size={15} className="shrink-0 text-rose-600" />
                      <span>Please ensure all resource capacity limits are valid non-negative numbers (0 or greater).</span>
                    </div>
                  )}

                  {/* Resource Limits Table View */}
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-2xs max-h-[55vh] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider shadow-2xs">
                        <tr>
                          <th className="py-2.5 px-5 text-left">Resource Metric</th>
                          <th className="py-2.5 px-4 text-center w-40">Scope</th>
                          <th className="py-2.5 px-5 text-right w-64">Allowance Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {/* SECTION 1: CORE PLAN CARD LIMITS */}
                        <tr className="bg-slate-50/80 dark:bg-slate-900/70">
                          <td colSpan={3} className="py-2 px-5 text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                                <CheckCircle size={12} className="text-blue-600 dark:text-blue-400" />
                                Core Plan Card Limits (Included on Public Card)
                              </span>
                              <span className="text-[10px] font-normal text-slate-400 font-sans normal-case">
                                Displayed directly on tenant pricing tiers and public catalog cards
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* 1. Active Users */}
                        <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="py-3 px-5 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                <Users size={16} />
                              </div>
                              <span className="text-xs font-semibold text-slate-900 dark:text-white">Active Users</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 align-middle text-center">
                            <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-md border uppercase font-mono bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/80 dark:border-blue-900/60">
                              Public Card
                            </span>
                          </td>
                          <td className="py-3 px-5 align-middle text-right">
                            <div className={`inline-flex items-center rounded-xl border bg-white dark:bg-slate-950 overflow-hidden shadow-2xs transition-all w-52 ${
                              createPlanErrors.active_users
                                ? 'border-rose-500 ring-2 ring-rose-500/20'
                                : 'border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-600'
                            }`}>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                placeholder=""
                                value={newPlan.limits?.active_users !== undefined && newPlan.limits?.active_users !== null ? newPlan.limits.active_users : ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                                  setNewPlan({
                                    ...newPlan,
                                    limits: {
                                      ...newPlan.limits,
                                      active_users: val,
                                      'users.max_active': val,
                                    }
                                  });
                                  if (createPlanErrors.active_users) {
                                    setCreatePlanErrors((prev) => { const n = { ...prev }; delete n.active_users; return n; });
                                  }
                                }}
                                className="w-full px-3 py-1.5 bg-transparent font-mono font-bold text-slate-900 dark:text-white text-xs outline-none text-right"
                              />
                              <span className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 select-none min-w-[70px] text-center">
                                Users
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* 2. Branches & Depots */}
                        <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="py-3 px-5 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                <GitBranch size={16} />
                              </div>
                              <span className="text-xs font-semibold text-slate-900 dark:text-white">Branches & Depots</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 align-middle text-center">
                            <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-md border uppercase font-mono bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/80 dark:border-blue-900/60">
                              Public Card
                            </span>
                          </td>
                          <td className="py-3 px-5 align-middle text-right">
                            <div className={`inline-flex items-center rounded-xl border bg-white dark:bg-slate-950 overflow-hidden shadow-2xs transition-all w-52 ${
                              createPlanErrors.active_branches
                                ? 'border-rose-500 ring-2 ring-rose-500/20'
                                : 'border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-600'
                            }`}>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                placeholder=""
                                value={newPlan.limits?.active_branches !== undefined && newPlan.limits?.active_branches !== null ? newPlan.limits.active_branches : ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                                  setNewPlan({
                                    ...newPlan,
                                    limits: {
                                      ...newPlan.limits,
                                      active_branches: val,
                                      'branches.max_active': val,
                                    }
                                  });
                                  if (createPlanErrors.active_branches) {
                                    setCreatePlanErrors((prev) => { const n = { ...prev }; delete n.active_branches; return n; });
                                  }
                                }}
                                className="w-full px-3 py-1.5 bg-transparent font-mono font-bold text-slate-900 dark:text-white text-xs outline-none text-right"
                              />
                              <span className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 select-none min-w-[78px] text-center">
                                Branches
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* 3. Monthly SMS */}
                        <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="py-3 px-5 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <MessageSquare size={16} />
                              </div>
                              <span className="text-xs font-semibold text-slate-900 dark:text-white">Monthly SMS</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 align-middle text-center">
                            <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-md border uppercase font-mono bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/80 dark:border-blue-900/60">
                              Public Card
                            </span>
                          </td>
                          <td className="py-3 px-5 align-middle text-right">
                            <div className={`inline-flex items-center rounded-xl border bg-white dark:bg-slate-950 overflow-hidden shadow-2xs transition-all w-52 ${
                              createPlanErrors.monthly_sms
                                ? 'border-rose-500 ring-2 ring-rose-500/20'
                                : 'border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-600'
                            }`}>
                              <input
                                type="number"
                                min="0"
                                step="100"
                                placeholder=""
                                value={newPlan.limits?.monthly_sms !== undefined && newPlan.limits?.monthly_sms !== null ? newPlan.limits.monthly_sms : ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                                  setNewPlan({
                                    ...newPlan,
                                    limits: {
                                      ...newPlan.limits,
                                      monthly_sms: val,
                                      'sms.monthly': val,
                                    }
                                  });
                                  if (createPlanErrors.monthly_sms) {
                                    setCreatePlanErrors((prev) => { const n = { ...prev }; delete n.monthly_sms; return n; });
                                  }
                                }}
                                className="w-full px-3 py-1.5 bg-transparent font-mono font-bold text-slate-900 dark:text-white text-xs outline-none text-right"
                              />
                              <span className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 select-none min-w-[70px] text-center">
                                SMS
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* 4. Monthly Emails */}
                        <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="py-3 px-5 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                <Mail size={16} />
                              </div>
                              <span className="text-xs font-semibold text-slate-900 dark:text-white">Monthly Emails</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 align-middle text-center">
                            <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-md border uppercase font-mono bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/80 dark:border-blue-900/60">
                              Public Card
                            </span>
                          </td>
                          <td className="py-3 px-5 align-middle text-right">
                            <div className={`inline-flex items-center rounded-xl border bg-white dark:bg-slate-950 overflow-hidden shadow-2xs transition-all w-52 ${
                              createPlanErrors.monthly_email
                                ? 'border-rose-500 ring-2 ring-rose-500/20'
                                : 'border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-600'
                            }`}>
                              <input
                                type="number"
                                min="0"
                                step="500"
                                placeholder=""
                                value={newPlan.limits?.monthly_email !== undefined && newPlan.limits?.monthly_email !== null ? newPlan.limits.monthly_email : ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                                  setNewPlan({
                                    ...newPlan,
                                    limits: {
                                      ...newPlan.limits,
                                      monthly_email: val,
                                      'email.monthly': val,
                                    }
                                  });
                                  if (createPlanErrors.monthly_email) {
                                    setCreatePlanErrors((prev) => { const n = { ...prev }; delete n.monthly_email; return n; });
                                  }
                                }}
                                className="w-full px-3 py-1.5 bg-transparent font-mono font-bold text-slate-900 dark:text-white text-xs outline-none text-right"
                              />
                              <span className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 select-none min-w-[70px] text-center">
                                Emails
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* 5. Cloud Storage (GB) */}
                        <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="py-3 px-5 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <Cloud size={16} />
                              </div>
                              <span className="text-xs font-semibold text-slate-900 dark:text-white">Cloud Storage (GB)</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 align-middle text-center">
                            <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-md border uppercase font-mono bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/80 dark:border-blue-900/60">
                              Public Card
                            </span>
                          </td>
                          <td className="py-3 px-5 align-middle text-right">
                            <div 
                              className={`inline-flex items-center rounded-xl border bg-white dark:bg-slate-950 overflow-hidden shadow-2xs transition-all w-52 ${
                                createPlanErrors.storage_gb
                                  ? 'border-rose-500 ring-2 ring-rose-500/20'
                                  : 'border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-600'
                              }`}
                              title={`${((Number(newPlan.limits?.storage_gb) || 0) * 1073741824).toLocaleString()} bytes`}
                            >
                              <input
                                type="number"
                                min="0"
                                step="1"
                                placeholder=""
                                value={newPlan.limits?.storage_gb !== undefined && newPlan.limits?.storage_gb !== null ? newPlan.limits.storage_gb : ''}
                                onChange={(e) => {
                                  const gb = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                                  setNewPlan({
                                    ...newPlan,
                                    limits: {
                                      ...newPlan.limits,
                                      storage_gb: gb,
                                      'storage.bytes': gb === '' ? '' : gb * 1073741824,
                                    }
                                  });
                                  if (createPlanErrors.storage_gb) {
                                    setCreatePlanErrors((prev) => { const n = { ...prev }; delete n.storage_gb; return n; });
                                  }
                                }}
                                className="w-full px-3 py-1.5 bg-transparent font-mono font-bold text-slate-900 dark:text-white text-xs outline-none text-right"
                              />
                              <span className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 select-none min-w-[70px] text-center">
                                GB
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* SECTION 2: EXTENDED OPERATIONS & TELEPHONY */}
                        <tr className="bg-slate-50/80 dark:bg-slate-900/70 border-y border-slate-200/60 dark:border-slate-800/60">
                          <td colSpan={3} className="py-2 px-5 text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                                <Sliders size={12} className="text-indigo-600 dark:text-indigo-400" />
                                Extended Operations & Telephony Limits
                              </span>
                              <span className="text-[10px] font-normal text-slate-400 font-sans normal-case">
                                Enforced backend rate limits, messaging gateways & automated execution runs
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* 6. API Requests */}
                        <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="py-3 px-5 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                                <Zap size={16} />
                              </div>
                              <span className="text-xs font-semibold text-slate-900 dark:text-white">API Requests</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 align-middle text-center">
                            <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-md border uppercase font-mono bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border-sky-200/80 dark:border-sky-900/60">
                              Developer API
                            </span>
                          </td>
                          <td className="py-3 px-5 align-middle text-right">
                            <div className={`inline-flex items-center rounded-xl border bg-white dark:bg-slate-950 overflow-hidden shadow-2xs transition-all w-52 ${
                              createPlanErrors.monthly_api_requests
                                ? 'border-rose-500 ring-2 ring-rose-500/20'
                                : 'border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-600'
                            }`}>
                              <input
                                type="number"
                                min="0"
                                step="5000"
                                placeholder=""
                                value={newPlan.limits?.monthly_api_requests !== undefined && newPlan.limits?.monthly_api_requests !== null ? newPlan.limits.monthly_api_requests : ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                                  setNewPlan({
                                    ...newPlan,
                                    limits: {
                                      ...newPlan.limits,
                                      monthly_api_requests: val,
                                      'api.monthly_requests': val,
                                    }
                                  });
                                  if (createPlanErrors.monthly_api_requests) {
                                    setCreatePlanErrors((prev) => { const n = { ...prev }; delete n.monthly_api_requests; return n; });
                                  }
                                }}
                                className="w-full px-3 py-1.5 bg-transparent font-mono font-bold text-slate-900 dark:text-white text-xs outline-none text-right"
                              />
                              <span className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 select-none min-w-[78px] text-center">
                                Req / mo
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* 7. Monthly Automations */}
                        <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="py-3 px-5 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                                <Sliders size={16} />
                              </div>
                              <span className="text-xs font-semibold text-slate-900 dark:text-white">Monthly Automations</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 align-middle text-center">
                            <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-md border uppercase font-mono bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border-violet-200/80 dark:border-violet-900/60">
                              Automation
                            </span>
                          </td>
                          <td className="py-3 px-5 align-middle text-right">
                            <div className={`inline-flex items-center rounded-xl border bg-white dark:bg-slate-950 overflow-hidden shadow-2xs transition-all w-52 ${
                              createPlanErrors.monthly_automations
                                ? 'border-rose-500 ring-2 ring-rose-500/20'
                                : 'border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-600'
                            }`}>
                              <input
                                type="number"
                                min="0"
                                step="100"
                                placeholder=""
                                value={newPlan.limits?.monthly_automations !== undefined && newPlan.limits?.monthly_automations !== null ? newPlan.limits.monthly_automations : ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10) || 0);
                                  setNewPlan({
                                    ...newPlan,
                                    limits: {
                                      ...newPlan.limits,
                                      monthly_automations: val,
                                      'automation.monthly_runs': val,
                                    }
                                  });
                                  if (createPlanErrors.monthly_automations) {
                                    setCreatePlanErrors((prev) => { const n = { ...prev }; delete n.monthly_automations; return n; });
                                  }
                                }}
                                className="w-full px-3 py-1.5 bg-transparent font-mono font-bold text-slate-900 dark:text-white text-xs outline-none text-right"
                              />
                              <span className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 select-none min-w-[78px] text-center">
                                Runs / mo
                              </span>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: FEATURES & FUNCTIONS (28 MODULES) */}
              {createPlanModalTab === 'features' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  {/* Step 3 Full Validation Status Banner */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-transparent border border-emerald-500/30 dark:border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>Step 3 of 3: Platform Modules & Final Review</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold">
                            Plan Form Validated
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <strong className="text-slate-800 dark:text-slate-200">{newPlan.name || 'Untitled Plan'}</strong> ({newPlan.code || 'code'}) · 
                          ${newPlan.base_price_dollars || 0}/{newPlan.billing_interval || 'mo'} · 
                          {newPlan.limits?.active_users ?? 0} Users · {newPlan.limits?.storage_gb ?? 0} GB · 
                          {createPlanFeatureCounts.write} Read/Write Modules
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Features Toolbar: Search, Filter, Presets */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                      {/* Search box */}
                      <div className="relative flex-1 min-w-[200px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={createPlanFeatureSearch}
                          onChange={(e) => setCreatePlanFeatureSearch(e.target.value)}
                          placeholder="Search 28 platform modules & functions..."
                          className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      {/* Category selector */}
                      <div className="relative">
                        <select
                          value={createPlanFeatureCategory}
                          onChange={(e) => setCreatePlanFeatureCategory(e.target.value)}
                          className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
                        >
                          <option value="all">All Categories ({ALL_PLATFORM_FEATURES.length})</option>
                          {featureCategoriesList.filter((c) => c !== 'all').map((cat) => (
                            <option key={cat} value={cat}>
                              {cat} ({ALL_PLATFORM_FEATURES.filter((f) => f.category === cat).length})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSetAllCreatePlanFeatures('write')}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold hover:bg-emerald-100 transition-colors cursor-pointer text-[11px]"
                        >
                          Enable All (Write)
                        </button>
                        <button
                          type="button"
                          onClick={handleApplyLogisticsFeaturePreset}
                          className="px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold hover:bg-blue-100 transition-colors cursor-pointer text-[11px]"
                        >
                          Logistics Core
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetAllCreatePlanFeatures('none')}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 font-bold transition-colors cursor-pointer text-[11px]"
                        >
                          Disable All
                        </button>
                      </div>
                    </div>

                    {/* Breakdown status counters */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px]">
                      <span className="font-semibold text-slate-500">Feature Status:</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold">
                        <Check size={11} /> {createPlanFeatureCounts.write} Full Access
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-bold">
                        <Check size={11} /> {createPlanFeatureCounts.read} Read Only
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                        <X size={11} /> {createPlanFeatureCounts.none} Disabled
                      </span>
                      <span className="ml-auto text-slate-400 font-mono">
                        Showing {filteredNewPlanFeatures.length} of {ALL_PLATFORM_FEATURES.length} platform modules
                      </span>
                    </div>
                  </div>

                  {/* 28 Modules Table View */}
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-2xs max-h-[50vh] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider shadow-2xs">
                        <tr>
                          <th className="py-2.5 px-4 w-1/4">Module Name</th>
                          <th className="py-2.5 px-3 w-32">Category</th>
                          <th className="py-2.5 px-4">Description & Operational Function</th>
                          <th className="py-2.5 px-4 w-48 text-right">Access Permission</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {filteredNewPlanFeatures.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-400">
                              No modules match your search or filter.
                            </td>
                          </tr>
                        ) : (
                          filteredNewPlanFeatures.map((feat) => {
                            const currentMode = newPlan.features?.[feat.key] || feat.defaultMode || 'write';
                            return (
                              <tr
                                key={feat.key}
                                className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors"
                              >
                                <td className="py-3 px-4 align-middle">
                                  <span className="font-bold text-slate-900 dark:text-white text-xs block" title={feat.key}>
                                    {feat.name}
                                  </span>
                                </td>
                                <td className="py-3 px-3 align-middle">
                                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase font-mono ${getFeatureCategoryBadgeColor(feat.category)}`}>
                                    {feat.category}
                                  </span>
                                </td>
                                <td className="py-3 px-4 align-middle text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                  {feat.description}
                                </td>
                                <td className="py-3 px-4 align-middle text-right whitespace-nowrap">
                                  <div className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <button
                                      type="button"
                                      onClick={() => setNewPlan({
                                        ...newPlan,
                                        features: { ...newPlan.features, [feat.key]: 'none' }
                                      })}
                                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                                        currentMode === 'none'
                                          ? 'bg-slate-700 text-white shadow-2xs'
                                          : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                      }`}
                                      title="Disabled (No access)"
                                    >
                                      <X size={11} />
                                      <span>None</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setNewPlan({
                                        ...newPlan,
                                        features: { ...newPlan.features, [feat.key]: 'read' }
                                      })}
                                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                                        currentMode === 'read'
                                          ? 'bg-blue-600 text-white shadow-2xs'
                                          : 'text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300'
                                      }`}
                                      title="Read-only access"
                                    >
                                      <span>Read</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setNewPlan({
                                        ...newPlan,
                                        features: { ...newPlan.features, [feat.key]: 'write' }
                                      })}
                                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                                        currentMode === 'write'
                                          ? 'bg-emerald-600 text-white shadow-2xs'
                                          : 'text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-300'
                                      }`}
                                      title="Full Write access"
                                    >
                                      <Check size={11} className="stroke-[3]" />
                                      <span>Write</span>
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
              )}

              {/* Fixed Modal Footer with Navigation */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreatePlanModal(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  {/* Step 1: Only Cancel and Next */}
                  {createPlanModalTab === 'details' && (
                    <button
                      type="button"
                      onClick={handleNextFromDetails}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <span>Next: Capacity Limits</span>
                      <ArrowRight size={14} />
                    </button>
                  )}

                  {/* Step 2 (Image Area): STRICTLY ONLY Cancel and Next */}
                  {createPlanModalTab === 'limits' && (
                    <button
                      type="button"
                      onClick={handleNextFromLimits}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <span>Next: Features & Functions</span>
                      <ArrowRight size={14} />
                    </button>
                  )}

                  {/* Step 3 (Plan Form 3): Back to limits and Save Plan with Full Validation */}
                  {createPlanModalTab === 'features' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setCreatePlanModalTab('limits')}
                        className="px-4 py-2 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                      >
                        ← Back: Limits
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={15} />}
                        <span>Save Plan to Catalog</span>
                      </button>
                    </>
                  )}
                </div>
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
