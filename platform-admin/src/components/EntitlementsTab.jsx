import React, { useState, useEffect } from 'react';
import { 
  Sliders, Building2, Plus, Trash2, CheckCircle2, 
  AlertTriangle, Shield, Clock, Loader2, Sparkles, 
  Zap, PackagePlus, ArrowRight, ChevronDown, Package, Info, AlertCircle 
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import platformApi from '../api/platformApi';

const DEFAULT_FEATURES = [
  { feature_key: 'crm.leads', name: 'Leads' },
  { feature_key: 'crm.sales', name: 'Sales CRM' },
  { feature_key: 'crm.estimates', name: 'Estimates' },
  { feature_key: 'crm.customer_portal', name: 'Customer Portal' },
  { feature_key: 'crm.documents', name: 'Documents' },
  { feature_key: 'crm.esign', name: 'E-signatures' },
  { feature_key: 'crm.payments', name: 'Payments' },
  { feature_key: 'crm.jobs', name: 'Jobs' },
  { feature_key: 'crm.dispatch', name: 'Dispatch' },
  { feature_key: 'crm.crew_app', name: 'Crew App' },
  { feature_key: 'crm.accounting', name: 'Accounting' },
  { feature_key: 'crm.automations', name: 'Automations' },
  { feature_key: 'crm.integrations', name: 'Integrations' },
  { feature_key: 'crm.advanced_reports', name: 'Advanced Reports' },
  { feature_key: 'crm.api', name: 'API Access' },
  { feature_key: 'crm.multi_branch', name: 'Multi-branch' },
  { feature_key: 'crm.custom_roles', name: 'Custom Roles' },
  { feature_key: 'crm.white_label', name: 'White Label' },
  { feature_key: 'crm.sms', name: 'SMS' },
  { feature_key: 'crm.email', name: 'Email' },
  { feature_key: 'ops.dispatch', name: 'Dispatch & Resource Scheduling' },
  { feature_key: 'ops.storage', name: 'Storage & Warehouse' },
  { feature_key: 'ops.claims', name: 'Claims Management' },
  { feature_key: 'ops.premove_surveys', name: 'Pre-Move Surveys' },
  { feature_key: 'analytics.bi', name: 'Reporting & BI' },
  { feature_key: 'platform.files', name: 'Files & Document Storage' },
  { feature_key: 'platform.template_engine', name: 'Template & Builder Engine' },
  { feature_key: 'platform.template_library', name: 'Template Library & Starter Packs' },
];

const DEFAULT_LIMITS = [
  { limit_key: 'users.max_active', name: 'Active Users (users.max_active)' },
  { limit_key: 'branches.max_active', name: 'Active Branches (branches.max_active)' },
  { limit_key: 'sms.monthly', name: 'Monthly SMS (sms.monthly)' },
  { limit_key: 'email.monthly', name: 'Monthly Email (email.monthly)' },
  { limit_key: 'api.monthly_requests', name: 'Monthly API Requests (api.monthly_requests)' },
  { limit_key: 'automation.monthly_runs', name: 'Monthly Automation Runs (automation.monthly_runs)' },
  { limit_key: 'storage.bytes', name: 'Storage Quota in Bytes (storage.bytes)' },
];

export default function EntitlementsTab({ 
  tenants = [], 
  initialTenantId = null,
  addons = [],
  features = [],
  limits = [],
  onRefresh
}) {
  const { showToast } = useToast();
  const [selectedTenantId, setSelectedTenantId] = useState(initialTenantId || (tenants[0]?.id ? String(tenants[0].id) : '1'));
  const [entitlementsData, setEntitlementsData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Features and Limits catalogue
  const displayFeatures = React.useMemo(() => {
    if (features && features.length > 0) return features;
    return DEFAULT_FEATURES;
  }, [features]);

  const displayLimits = React.useMemo(() => {
    if (limits && limits.length > 0) return limits;
    return DEFAULT_LIMITS;
  }, [limits]);

  // Override Modal
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideType, setOverrideType] = useState('feature'); // 'feature' or 'limit'
  const [featureKey, setFeatureKey] = useState(
    () => (features[0]?.feature_key || features[0]?.key || 'crm.leads')
  );
  const [featureMode, setFeatureMode] = useState('write');
  const [limitKey, setLimitKey] = useState(
    () => (limits[0]?.limit_key || limits[0]?.key || 'users.max_active')
  );
  const [limitVal, setLimitVal] = useState(10);
  const [limitAction, setLimitAction] = useState('replace'); // 'replace' or 'add'
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideExpiresAt, setOverrideExpiresAt] = useState('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  // Synchronize featureKey whenever features/displayFeatures are loaded
  useEffect(() => {
    if (displayFeatures.length > 0) {
      const exists = displayFeatures.some((f) => (f.feature_key || f.key) === featureKey);
      if (!featureKey || !exists) {
        setFeatureKey(displayFeatures[0].feature_key || displayFeatures[0].key);
      }
    }
  }, [displayFeatures, featureKey]);

  // Synchronize limitKey whenever limits/displayLimits are loaded
  useEffect(() => {
    if (displayLimits.length > 0) {
      const exists = displayLimits.some((l) => (l.limit_key || l.key) === limitKey);
      if (!limitKey || !exists) {
        setLimitKey(displayLimits[0].limit_key || displayLimits[0].key);
      }
    }
  }, [displayLimits, limitKey]);

  // Addon Modal
  const [showAddonModal, setShowAddonModal] = useState(false);
  const displayAddons = React.useMemo(() => {
    if (addons && addons.length > 0) return addons;
    return [
      { id: 1, code: 'extra_users_5', name: '5 Extra Users Pack', price_cents: 1500, interval: 'month' },
      { id: 2, code: 'extra_storage_10gb', name: '10 GB Cloud Storage Pack', price_cents: 1000, interval: 'month' },
      { id: 3, code: 'extra_branches_1', name: '1 Additional Branch Terminal', price_cents: 4900, interval: 'month' },
      { id: 4, code: 'extra_sms_1000', name: '1,000 SMS Message Pack', price_cents: 2000, interval: 'month' },
      { id: 5, code: 'addon_premium_support', name: '24/7 Priority Support SLA', price_cents: 9900, interval: 'month' },
      { id: 6, code: 'extra_email_10000', name: '10,000 Email Pack', price_cents: 1500, interval: 'month' },
      { id: 7, code: 'extra_api_50000', name: '50,000 API Requests Pack', price_cents: 3500, interval: 'month' },
      { id: 8, code: 'extra_automations_500', name: '500 Automation Runs Pack', price_cents: 2500, interval: 'month' },
    ];
  }, [addons]);

  const [selectedAddonId, setSelectedAddonId] = useState(
    () => (addons[0]?.id ? String(addons[0].id) : '1')
  );
  const [addonQuantity, setAddonQuantity] = useState(1);
  const [addonReason, setAddonReason] = useState('Administrative add-on allocation');
  const [isSubmittingAddon, setIsSubmittingAddon] = useState(false);
  const [removingAddonId, setRemovingAddonId] = useState(null);
  const [addonActionMode, setAddonActionMode] = useState('add');
  const [adjustingAddonId, setAdjustingAddonId] = useState(null);

  // Synchronize selectedAddonId whenever addons/displayAddons are available
  useEffect(() => {
    if (displayAddons.length > 0) {
      const exists = displayAddons.some((a) => String(a.id) === String(selectedAddonId));
      if (!selectedAddonId || !exists) {
        setSelectedAddonId(String(displayAddons[0].id));
      }
    }
  }, [displayAddons, selectedAddonId]);

  const fetchEntitlements = async (tId, { silent = false } = {}) => {
    if (!tId) return;
    if (!silent) {
      setIsLoading(true);
    }
    try {
      const res = await platformApi.getTenantEntitlements(tId);
      setEntitlementsData(res.data);
    } catch (err) {
      showToast(err?.response?.data?.error || err?.message || 'Failed to load entitlements', 'error');
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (selectedTenantId) {
      setEntitlementsData(null);
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
      let expiresAt = null;
      if (overrideExpiresAt && !isNaN(new Date(overrideExpiresAt).getTime())) {
        expiresAt = new Date(overrideExpiresAt).toISOString();
      }

      const payload = {
        type: overrideType,
        reason: overrideReason.trim(),
        expires_at: expiresAt,
      };

      if (overrideType === 'feature') {
        payload.feature_key = featureKey;
        payload.access_mode = featureMode;
      } else {
        payload.limit_key = limitKey;
        payload.limit_action = limitAction;
        payload.limit_value = Number(limitVal);
      }

      await platformApi.createTenantOverride(selectedTenantId, payload);
      showToast('Entitlement override applied successfully.', 'success');
      setShowOverrideModal(false);
      setOverrideReason('');
      setOverrideExpiresAt('');
      fetchEntitlements(selectedTenantId, { silent: true });
    } catch (err) {
      const errorMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        (typeof err?.response?.data === 'object' ? Object.values(err.response.data).flat().join(', ') : null) ||
        err?.message ||
        'Failed to apply override';
      showToast(errorMsg, 'error');
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  const handleDeleteOverride = async (overrideId) => {
    try {
      await platformApi.deleteTenantOverride(selectedTenantId, overrideId);
      showToast('Administrative override removed.', 'success');
      fetchEntitlements(selectedTenantId, { silent: true });
    } catch (err) {
      showToast(err?.response?.data?.error || err?.message || 'Failed to remove override', 'error');
    }
  };

  const handleAssignAddon = async (e) => {
    e.preventDefault();
    const parsedAddonId = Number(selectedAddonId);
    if (!parsedAddonId || isNaN(parsedAddonId)) {
      showToast('Please select a valid add-on package.', 'warning');
      return;
    }
    if (!addonReason.trim()) {
      showToast('Reason is required to assign an add-on.', 'warning');
      return;
    }

    const existing = entitlementsData?.active_addons?.find(
      (a) => Number(a.addon_id) === parsedAddonId
    );
    const qty = Math.max(1, Number(addonQuantity) || 1);
    const finalQuantity = (existing && addonActionMode === 'add')
      ? (Number(existing.quantity) || 0) + qty
      : qty;

    setIsSubmittingAddon(true);
    try {
      await platformApi.assignTenantAddon(selectedTenantId, {
        tenant_company_id: Number(selectedTenantId),
        addon_id: parsedAddonId,
        quantity: finalQuantity,
        reason: addonReason.trim(),
      });
      showToast(`Add-on updated (${finalQuantity} pack${finalQuantity > 1 ? 's' : ''}).`, 'success');
      setShowAddonModal(false);
      fetchEntitlements(selectedTenantId, { silent: true });
    } catch (err) {
      showToast(
        err?.response?.data?.error || 
        err?.response?.data?.detail || 
        (typeof err?.response?.data === 'object' ? Object.values(err.response.data).flat().join(', ') : null) ||
        err?.message || 
        'Failed to assign add-on', 
        'error'
      );
    } finally {
      setIsSubmittingAddon(false);
    }
  };

  const handleQuickAdjustAddonQuantity = async (addon, delta) => {
    const currentQty = Number(addon.quantity) || 1;
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      handleRemoveAddon(addon);
      return;
    }
    setAdjustingAddonId(addon.addon_id);

    // Optimistic UI update so quantity changes immediately without full page flicker
    const previousAddons = entitlementsData?.active_addons;
    if (entitlementsData?.active_addons) {
      setEntitlementsData((prev) => {
        if (!prev || !prev.active_addons) return prev;
        return {
          ...prev,
          active_addons: prev.active_addons.map((a) =>
            a.addon_id === addon.addon_id ? { ...a, quantity: newQty } : a
          ),
        };
      });
    }

    try {
      await platformApi.assignTenantAddon(selectedTenantId, {
        tenant_company_id: Number(selectedTenantId),
        addon_id: addon.addon_id,
        quantity: newQty,
        reason: `Quantity ${delta > 0 ? 'increased' : 'decreased'} via quick adjustment to ${newQty}`,
      });
      showToast(`Updated "${addon.name || addon.code}" to ${newQty} pack(s).`, 'success');
      fetchEntitlements(selectedTenantId, { silent: true });
    } catch (err) {
      // Revert optimistic update on failure
      if (previousAddons) {
        setEntitlementsData((prev) => (prev ? { ...prev, active_addons: previousAddons } : prev));
      }
      showToast(err?.response?.data?.error || err?.message || 'Failed to adjust quantity', 'error');
    } finally {
      setAdjustingAddonId(null);
    }
  };

  const handleRemoveAddon = async (addon) => {
    const addonTitle = addon.name || addon.code || 'Add-on';
    if (!window.confirm(`Are you sure you want to remove the "${addonTitle}" add-on from this tenant?`)) {
      return;
    }

    setRemovingAddonId(addon.addon_id);
    try {
      await platformApi.removeTenantAddon(
        selectedTenantId,
        addon.addon_id,
        'Administrative add-on removal via Entitlements console'
      );
      showToast(`Add-on "${addonTitle}" removed successfully.`, 'success');
      fetchEntitlements(selectedTenantId, { silent: true });
    } catch (err) {
      showToast(err?.response?.data?.error || err?.message || 'Failed to remove add-on', 'error');
    } finally {
      setRemovingAddonId(null);
    }
  };

  const getAddonImpact = (addonCode, quantity = 1) => {
    const qty = Number(quantity) || 1;
    switch (addonCode) {
      case 'extra_sms_1000':
        return `+${(1000 * qty).toLocaleString()} Monthly SMS`;
      case 'extra_users_5':
        return `+${5 * qty} Active Users`;
      case 'extra_branches_1':
        return `+${1 * qty} Additional Branch`;
      case 'extra_storage_10gb':
        return `+${10 * qty} GB Cloud Storage`;
      case 'extra_email_10000':
        return `+${(10000 * qty).toLocaleString()} Monthly Emails`;
      case 'extra_api_50000':
        return `+${(50000 * qty).toLocaleString()} API Requests`;
      case 'extra_automations_500':
        return `+${(500 * qty).toLocaleString()} Monthly Automation Runs`;
      case 'addon_premium_support':
        return '24/7 Priority SLA Support';
      default:
        return `${qty}x Allocated Pack`;
    }
  };

  const getAddonBoostForLimit = (limitKey) => {
    if (!entitlementsData?.active_addons?.length) return 0;
    let boost = 0;
    for (const addon of entitlementsData.active_addons) {
      const qty = Number(addon.quantity) || 1;
      if (limitKey === 'sms.monthly' && addon.code === 'extra_sms_1000') {
        boost += 1000 * qty;
      } else if (limitKey === 'users.max_active' && addon.code === 'extra_users_5') {
        boost += 5 * qty;
      } else if (limitKey === 'branches.max_active' && addon.code === 'extra_branches_1') {
        boost += 1 * qty;
      } else if ((limitKey === 'storage_bytes' || limitKey === 'storage.bytes') && addon.code === 'extra_storage_10gb') {
        boost += 10 * 1073741824 * qty;
      } else if (limitKey === 'email.monthly' && addon.code === 'extra_email_10000') {
        boost += 10000 * qty;
      } else if (limitKey === 'api.monthly_requests' && addon.code === 'extra_api_50000') {
        boost += 50000 * qty;
      } else if (limitKey === 'automation.monthly_runs' && (addon.code === 'extra_automations_500' || addon.code.includes('automation'))) {
        boost += 500 * qty;
      }
    }
    return boost;
  };

  const PREFERRED_LIMIT_ORDER = [
    'sms.monthly',
    'email.monthly',
    'storage.bytes',
    'storage_bytes',
    'users.max_active',
    'branches.max_active',
    'api.monthly_requests',
    'automation.monthly_runs',
  ];

  const formatLimitTitle = (key) => {
    return key
      .replace(/[._]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const sortedEffectiveLimits = React.useMemo(() => {
    if (!entitlementsData?.effective_limits) return [];
    const entries = Object.entries(entitlementsData.effective_limits);
    return entries.sort(([a], [b]) => {
      const idxA = PREFERRED_LIMIT_ORDER.indexOf(a);
      const idxB = PREFERRED_LIMIT_ORDER.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [entitlementsData?.effective_limits]);

  const formatQuota = (key, val) => {
    if (key === 'storage_bytes' || key === 'storage.bytes') {
      return `${Math.round((val || 0) / 1073741824)} GB`;
    }
    return val?.toLocaleString?.() ?? (val ?? 0);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* High-Density Control Bar: Tenant Scope & Primary Actions */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200 shrink-0">
            Tenant Scope
          </span>
          <div className="relative inline-block">
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-colors shadow-2xs"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.subdomain || `ID #${t.id}`})
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-blue-600" />
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => {
              if (displayAddons.length > 0 && !selectedAddonId) {
                setSelectedAddonId(String(displayAddons[0].id));
              }
              setAddonQuantity(1);
              setAddonReason('Administrative add-on allocation');
              setShowAddonModal(true);
            }}
            className="px-6 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            Add-on
          </button>

          <button
            onClick={() => setShowOverrideModal(true)}
            className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            Grant Override
          </button>
        </div>
      </div>

      {isLoading && !entitlementsData ? (
        <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center text-slate-400 flex items-center justify-center gap-2.5 shadow-2xs">
          <Loader2 size={18} className="animate-spin text-blue-600" />
          <span className="text-xs font-medium">Computing effective tenant entitlements...</span>
        </div>
      ) : entitlementsData ? (
        <div className="space-y-4">
          {/* Three Top Summary KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Assigned Base Tier */}
            <div className="p-4 rounded-2xl bg-[#F0F7FF] dark:bg-blue-950/20 border border-[#D9EAFD] dark:border-blue-900/40 flex items-center gap-4 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-[#DDEBFC] dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Sliders size={22} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
                  ASSIGNED BASE TIER
                </span>
                <div className="text-base font-extrabold text-slate-900 dark:text-white truncate uppercase tracking-tight">
                  {entitlementsData.plan?.name || 'PRO MAX PLAN'}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {entitlementsData.plan?.code || 'promax_plan'}
                  {entitlementsData.plan?.base_price_cents != null
                    ? ` • $${(entitlementsData.plan.base_price_cents / 100).toFixed(0)}/${entitlementsData.plan?.billing_interval || 'month'}`
                    : ' • $489/month'}
                </p>
              </div>
            </div>

            {/* Card 2: Effective Access Status */}
            <div className="p-4 rounded-2xl bg-[#F0FDF4] dark:bg-emerald-950/20 border border-[#DCFCE7] dark:border-emerald-900/40 flex items-center gap-4 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-[#DCFCE7] dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={22} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
                  EFFECTIVE ACCESS STATUS
                </span>
                <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 truncate tracking-tight">
                  {entitlementsData.access_behavior?.access
                    ? entitlementsData.access_behavior.access.charAt(0).toUpperCase() + entitlementsData.access_behavior.access.slice(1)
                    : 'Full'}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {entitlementsData.access_behavior?.label || 'Full (Active)'}
                </p>
              </div>
            </div>

            {/* Card 3: Active Modifications */}
            <div className="p-4 rounded-2xl bg-[#FAF5FF] dark:bg-purple-950/20 border border-[#F3E8FF] dark:border-purple-900/40 flex items-center gap-4 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-[#F3E8FF] dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Sparkles size={22} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
                  ACTIVE MODIFICATIONS
                </span>
                <div className="text-base font-extrabold text-slate-900 dark:text-white truncate tracking-tight">
                  {entitlementsData.active_addons?.length || 0} Add-on{(entitlementsData.active_addons?.length || 0) === 1 ? '' : 's'} • {entitlementsData.active_overrides?.length || 0} Override{(entitlementsData.active_overrides?.length || 0) === 1 ? '' : 's'}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  Live calculated database policies
                </p>
              </div>
            </div>
          </div>

          {/* Quotas & Limits Progress Section */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                EFFECTIVE USAGE & QUOTA CAPS
              </h3>
              <span className="text-xs text-slate-400 font-normal">Base capacity + Add-ons + Overrides</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedEffectiveLimits.map(([key, limit]) => {
                const usage = entitlementsData.current_usage?.[key] || 0;
                const isAtOrOverLimit = limit > 0 && usage >= limit;
                const pct = limit > 0 ? Math.min(Math.round((usage / limit) * 100), 100) : 0;
                const activeOverride = (entitlementsData.active_overrides || []).find(
                  (o) => o.type === 'limit' && (o.limit_key === key || o.limit_key === key.replace('.', '_') || o.limit_key === key.replace('_', '.'))
                );
                const addonBoost = getAddonBoostForLimit(key);
                return (
                  <div key={key} className="p-4 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">
                        {formatLimitTitle(key)}
                      </span>
                      <span className="font-bold text-blue-600 dark:text-blue-400 text-sm font-mono shrink-0">
                        {formatQuota(key, usage)} / {formatQuota(key, limit)}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 min-w-[8px] ${
                          isAtOrOverLimit ? 'bg-[#FF3B5C]' : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.max(pct, 3)}%` }}
                      />
                    </div>
                    {(activeOverride || addonBoost > 0) && (
                      <div className="flex flex-col gap-1 pt-0.5 text-xs">
                        {activeOverride && (
                          <div className="flex items-center justify-between text-amber-500 font-medium">
                            <span className="flex items-center gap-1.5">
                              <AlertTriangle size={13} className="shrink-0 text-amber-500" />
                              Override: {activeOverride.override_type || activeOverride.limit_action || 'replace'} {activeOverride.value ?? activeOverride.limit_value}
                            </span>
                            <span className="text-slate-400 font-normal">
                              {(activeOverride.override_type || activeOverride.limit_action) === 'add' ? 'adds to base limit' : 'replaces base limit'}
                            </span>
                          </div>
                        )}
                        {addonBoost > 0 && (
                          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                            <span>+{formatQuota(key, addonBoost)} from add-on pack</span>
                            <span className="text-slate-400 font-normal">active</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Assigned Add-ons Table Section */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Package size={20} className="text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    ACTIVE ASSIGNED ADD-ON PACKAGES
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Purchased or administratively allocated capacity & feature packs
                </p>
              </div>
              <button
                onClick={() => {
                  if (displayAddons.length > 0 && !selectedAddonId) {
                    setSelectedAddonId(String(displayAddons[0].id));
                  }
                  setAddonQuantity(1);
                  setAddonReason('Administrative add-on allocation');
                  setShowAddonModal(true);
                }}
                className="px-4 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-[#F0F7FF] dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs self-start sm:self-auto"
              >
                <Plus size={14} className="text-blue-600 dark:text-blue-400" />
                <span>Assign Add-on</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] dark:bg-slate-800/60 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    <th className="py-2.5 px-4 rounded-l-lg">ADD-ON</th>
                    <th className="py-2.5 px-4">TYPE</th>
                    <th className="py-2.5 px-4">STATUS</th>
                    <th className="py-2.5 px-4">ASSIGNED ON</th>
                    <th className="py-2.5 px-4">EXPIRES ON</th>
                    <th className="py-2.5 px-4 text-right rounded-r-lg">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {(entitlementsData.active_addons || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs font-normal">
                        No active add-on packages assigned to this tenant.
                      </td>
                    </tr>
                  ) : (
                    entitlementsData.active_addons.map((addon) => (
                      <tr key={addon.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {addon.name || addon.code}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400">
                            {addon.code}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-xs text-blue-600 dark:text-blue-400">
                          {getAddonImpact(addon.code, addon.quantity)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/50">
                            <CheckCircle2 size={10} />
                            {addon.status || 'Active'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                          {addon.starts_at ? new Date(addon.starts_at).toLocaleDateString() : 'Active'}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                          {addon.ends_at ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/50">
                              {new Date(addon.ends_at).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-slate-400">Active Renewal (Indefinite)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="inline-flex items-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleQuickAdjustAddonQuantity(addon, -1)}
                                disabled={adjustingAddonId === addon.addon_id}
                                className="px-2 py-0.5 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer text-xs font-bold disabled:opacity-40"
                                title="Decrease by 1 pack"
                              >
                                -
                              </button>
                              <span className="px-2 py-0.5 text-[11px] font-bold font-mono text-slate-700 dark:text-slate-300 border-x border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                                {addon.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQuickAdjustAddonQuantity(addon, 1)}
                                disabled={adjustingAddonId === addon.addon_id}
                                className="px-2 py-0.5 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer text-xs font-bold disabled:opacity-40"
                                title="Increase by 1 pack"
                              >
                                +
                              </button>
                            </div>
                            <button
                              onClick={() => handleRemoveAddon(addon)}
                              disabled={removingAddonId === addon.addon_id}
                              className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
                              title="Remove / Cancel Add-on"
                            >
                              {removingAddonId === addon.addon_id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Overrides Table Section */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Active Administrative Overrides
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Targeted adjustments bypassing base tier limits
                </p>
              </div>
              <button
                onClick={() => setShowOverrideModal(true)}
                className="px-4 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-[#F0F7FF] dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs self-start sm:self-auto"
              >
                <Plus size={14} className="text-blue-600 dark:text-blue-400" />
                <span>Add Override</span>
              </button>
            </div>

            {(entitlementsData.active_overrides || []).length === 0 ? (
              <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs font-normal">
                No active overrides applied to this tenant.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F8FAFC] dark:bg-slate-800/60 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                      <th className="py-2.5 px-4 rounded-l-lg">Type</th>
                      <th className="py-2.5 px-4">Target Key</th>
                      <th className="py-2.5 px-4">Adjustment</th>
                      <th className="py-2.5 px-4">Reason</th>
                      <th className="py-2.5 px-4">Expires</th>
                      <th className="py-2.5 px-4 text-right rounded-r-lg">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {entitlementsData.active_overrides.map((ovr) => (
                      <tr key={ovr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${
                            ovr.type === 'feature'
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-900/50'
                              : 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/60 dark:border-purple-900/50'
                          }`}>
                            {ovr.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs font-medium text-slate-800 dark:text-slate-200">
                          {ovr.type === 'feature' ? ovr.feature_key : ovr.limit_key}
                        </td>
                        <td className="py-3 px-4 font-semibold text-xs text-blue-600 dark:text-blue-400">
                          {ovr.type === 'feature' ? `Mode: ${ovr.access_mode}` : `${ovr.override_type} ${ovr.value}`}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 font-normal">
                          {ovr.reason}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                          {ovr.expires_at ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/50">
                              {new Date(ovr.expires_at).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-slate-400">Never (Indefinite)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteOverride(ovr.id)}
                            className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-5 space-y-3.5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Grant Entitlement Override</h3>
              <button onClick={() => setShowOverrideModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateOverride} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Override Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOverrideType('feature')}
                    className={`py-1.5 rounded-xl font-semibold transition-colors cursor-pointer text-xs ${
                      overrideType === 'feature'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Feature Flag
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverrideType('limit')}
                    className={`py-1.5 rounded-xl font-semibold transition-colors cursor-pointer text-xs ${
                      overrideType === 'limit'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Quota / Limit
                  </button>
                </div>
              </div>

              {overrideType === 'feature' ? (
                <>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Target Feature Key
                    </label>
                    <select
                      value={featureKey}
                      onChange={(e) => setFeatureKey(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-xs font-medium outline-none cursor-pointer"
                    >
                      {displayFeatures.map((f) => {
                        const key = f.feature_key || f.key;
                        return (
                          <option key={key} value={key}>
                            {f.name} ({key})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Grant Access Level
                    </label>
                    <select
                      value={featureMode}
                      onChange={(e) => setFeatureMode(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium text-xs outline-none cursor-pointer"
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
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Target Quota Limit
                    </label>
                    <select
                      value={limitKey}
                      onChange={(e) => setLimitKey(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-xs font-medium outline-none cursor-pointer"
                    >
                      {displayLimits.map((l) => {
                        const key = l.limit_key || l.key;
                        return (
                          <option key={key} value={key}>
                            {l.name || key}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                        Action Type
                      </label>
                      <select
                        value={limitAction}
                        onChange={(e) => setLimitAction(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium text-xs outline-none cursor-pointer"
                      >
                        <option value="replace">Set Absolute Limit</option>
                        <option value="add">Add Increment</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                        Value
                      </label>
                      <input
                        type="number"
                        value={limitVal}
                        onChange={(e) => setLimitVal(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-xs font-medium outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Audit Justification (Required) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Contract concession or customer expansion preview approval..."
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-normal text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Expiration Date (Optional)
                </label>
                <input
                  type="date"
                  value={overrideExpiresAt}
                  onChange={(e) => setOverrideExpiresAt(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-3.5 py-1.5 font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOverride}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingOverride ? <Loader2 size={13} className="animate-spin" /> : null}
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-5 space-y-3.5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Assign Metered Add-on Pack</h3>
              <button onClick={() => setShowAddonModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleAssignAddon} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Select Add-on
                </label>
                <select
                  value={selectedAddonId}
                  onChange={(e) => setSelectedAddonId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium text-xs outline-none cursor-pointer"
                >
                  {displayAddons.length === 0 ? (
                    <option value="">No add-on packages available</option>
                  ) : (
                    displayAddons.map((a) => {
                      const priceCents = a.price_cents ?? a.unit_price_minor ?? 0;
                      const priceDisplay = (priceCents / 100).toFixed(0);
                      return (
                        <option key={a.id} value={a.id}>
                          {a.name} (${priceDisplay}/{a.interval || 'month'})
                        </option>
                      );
                    })
                  )}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Quantity (Packs)
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={addonQuantity}
                  onChange={(e) => setAddonQuantity(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium text-xs outline-none"
                />
              </div>

              {(() => {
                const existing = (entitlementsData?.active_addons || []).find(
                  (a) => String(a.addon_id) === String(selectedAddonId)
                );
                if (!existing) return null;
                const qty = Number(addonQuantity) || 1;
                const totalIfAdd = (Number(existing.quantity) || 0) + qty;
                return (
                  <div className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-blue-900 dark:text-blue-200">
                      <span>Currently Assigned:</span>
                      <span className="font-mono bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded">
                        {existing.quantity} {existing.quantity === 1 ? 'pack' : 'packs'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                        Allocation Action
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAddonActionMode('add')}
                          className={`p-1.5 rounded-lg border text-left text-[11px] transition-all cursor-pointer ${
                            addonActionMode === 'add'
                              ? 'border-blue-600 bg-white dark:bg-slate-900 font-bold text-blue-600 shadow-2xs'
                              : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-white/50'
                          }`}
                        >
                          <div>+ Add to Existing</div>
                          <div className="text-[10px] font-normal text-slate-500">
                            New Total: <strong className="text-blue-600">{totalIfAdd} packs</strong>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddonActionMode('set')}
                          className={`p-1.5 rounded-lg border text-left text-[11px] transition-all cursor-pointer ${
                            addonActionMode === 'set'
                              ? 'border-blue-600 bg-white dark:bg-slate-900 font-bold text-blue-600 shadow-2xs'
                              : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-white/50'
                          }`}
                        >
                          <div>Set Total Directly</div>
                          <div className="text-[10px] font-normal text-slate-500">
                            Total: <strong className="text-blue-600">{qty} pack{qty > 1 ? 's' : ''}</strong>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Administrative Reason <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addonReason}
                  onChange={(e) => setAddonReason(e.target.value)}
                  placeholder="e.g. Approved capacity expansion"
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-normal text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddonModal(false)}
                  className="px-3.5 py-1.5 font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAddon || !selectedAddonId || displayAddons.length === 0}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingAddon ? <Loader2 size={13} className="animate-spin" /> : null}
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
