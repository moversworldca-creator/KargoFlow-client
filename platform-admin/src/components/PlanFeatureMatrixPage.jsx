import React, { useState, useMemo } from 'react';
import { ArrowLeft, Search, Save, Check, X, Filter, Layers } from 'lucide-react';
import { useToast } from '../context/ToastContext';

// Master catalog of all 28 platform modules requested
export const ALL_PLATFORM_FEATURES = [
  {
    key: 'integration_api',
    name: 'API Access',
    category: 'Integration',
    description: 'Developer REST APIs, webhook subscriptions, and platform access tokens.',
    defaultMode: 'write',
  },
  {
    key: 'finance_accounting',
    name: 'Accounting',
    category: 'Finance',
    description: 'Invoice journals, chart of accounts, and automated ledger reconciliation.',
    defaultMode: 'write',
  },
  {
    key: 'reporting_advanced',
    name: 'Advanced Reports',
    category: 'Reporting',
    description: 'Executive analytics, moving job profitability, and sales rep KPI scorecards.',
    defaultMode: 'write',
  },
  {
    key: 'automation_automations',
    name: 'Automations',
    category: 'Automation',
    description: 'Automated workflow triggers, status cascades, and scheduled drip messaging.',
    defaultMode: 'write',
  },
  {
    key: 'crm_claims',
    name: 'Claims Management',
    category: 'CRM',
    description: 'Customer claim intake, photo inspection upload, damage valuation, and payouts.',
    defaultMode: 'write',
  },
  {
    key: 'operations_crew_app',
    name: 'Crew App',
    category: 'Operations',
    description: 'Mobile field application for movers, job timers, and digital BOL execution.',
    defaultMode: 'write',
  },
  {
    key: 'security_custom_roles',
    name: 'Custom Roles',
    category: 'Security',
    description: 'Granular role-based access control, customized staff permissions, and audit scopes.',
    defaultMode: 'write',
  },
  {
    key: 'customer_portal',
    name: 'Customer Portal',
    category: 'Customer',
    description: 'Self-serve customer portal for inventory confirmation, quote review, and tracking.',
    defaultMode: 'write',
  },
  {
    key: 'operations_dispatch',
    name: 'Dispatch',
    category: 'Operations',
    description: 'Real-time vehicle dispatch board, route optimization, and driver assignments.',
    defaultMode: 'write',
  },
  {
    key: 'crm_dispatch_scheduling',
    name: 'Dispatch & Resource Scheduling',
    category: 'CRM',
    description: 'Visual calendar resource scheduling for trucks, moving crews, and equipment.',
    defaultMode: 'write',
  },
  {
    key: 'documents_storage',
    name: 'Documents',
    category: 'Documents',
    description: 'Central moving documents repository, Bills of Lading, and agreement archives.',
    defaultMode: 'write',
  },
  {
    key: 'documents_signatures',
    name: 'E-signatures',
    category: 'Documents',
    description: 'Legally-binding electronic signature capture on moving contracts and waivers.',
    defaultMode: 'write',
  },
  {
    key: 'comms_email',
    name: 'Email',
    category: 'Communication',
    description: 'Synchronized two-way customer email communication and branded templates.',
    defaultMode: 'write',
  },
  {
    key: 'crm_estimates',
    name: 'Estimates',
    category: 'CRM',
    description: 'Tariff calculation engine, cubic feet/weight estimation, and quote generation.',
    defaultMode: 'write',
  },
  {
    key: 'platform_files_storage',
    name: 'Files & Document Storage',
    category: 'Platform',
    description: 'Cloud document and photo storage for inventory pictures and moving receipts.',
    defaultMode: 'write',
  },
  {
    key: 'integration_integrations',
    name: 'Integrations',
    category: 'Integration',
    description: 'Third-party lead provider aggregators, QuickBooks, Stripe, and telephony connections.',
    defaultMode: 'write',
  },
  {
    key: 'operations_jobs',
    name: 'Jobs',
    category: 'Operations',
    description: 'Operational moving job execution, billable hours, work orders, and job completion.',
    defaultMode: 'write',
  },
  {
    key: 'crm_leads',
    name: 'Leads',
    category: 'CRM',
    description: 'Inbound lead capture pipelines, auto-assignment rules, and qualification intake.',
    defaultMode: 'write',
  },
  {
    key: 'platform_multibranch',
    name: 'Multi-branch',
    category: 'Platform',
    description: 'Multi-location terminal support, regional franchise settings, and branch scoping.',
    defaultMode: 'write',
  },
  {
    key: 'finance_payments',
    name: 'Payments',
    category: 'Finance',
    description: 'Credit card processing, terminal deposits, payment links, and automated receipts.',
    defaultMode: 'write',
  },
  {
    key: 'crm_surveys',
    name: 'Pre-Move Surveys',
    category: 'CRM',
    description: 'Virtual video walkthroughs and on-site room-by-room moving surveys.',
    defaultMode: 'write',
  },
  {
    key: 'crm_reporting_bi',
    name: 'Reporting & BI',
    category: 'CRM',
    description: 'Real-time sales velocity, lead source ROI, and operational conversion metrics.',
    defaultMode: 'write',
  },
  {
    key: 'comms_sms',
    name: 'SMS',
    category: 'Communication',
    description: 'Two-way automated and agent SMS messaging to customers and crew members.',
    defaultMode: 'write',
  },
  {
    key: 'crm_sales',
    name: 'Sales CRM',
    category: 'CRM',
    description: 'Visual sales opportunity pipelines, deal stages, and moving sales follow-up cadences.',
    defaultMode: 'write',
  },
  {
    key: 'crm_storage_warehouse',
    name: 'Storage & Warehouse',
    category: 'CRM',
    description: 'Vault management, storage-in-transit (SIT), and monthly recurring storage billing.',
    defaultMode: 'write',
  },
  {
    key: 'platform_template_builder',
    name: 'Template & Builder Engine',
    category: 'Platform',
    description: 'Visual drag-and-drop document and estimate proposal template designer.',
    defaultMode: 'write',
  },
  {
    key: 'platform_template_library',
    name: 'Template Library & Starter Packs',
    category: 'Platform',
    description: 'Pre-built moving industry contracts, tariff templates, and email starter packs.',
    defaultMode: 'write',
  },
  {
    key: 'platform_white_label',
    name: 'White Label',
    category: 'Platform',
    description: 'Custom domain mapping, branded tenant portals, and white-labeled communications.',
    defaultMode: 'write',
  },
];

export default function PlanFeatureMatrixPage({
  plan,
  onBack,
  onSaveMatrix,
}) {
  const { showToast } = useToast();

  // Initialize matrix state: default to plan features or Full (Write)
  const [matrixState, setMatrixState] = useState(() => {
    const state = {};
    const isTrial = plan?.code?.toUpperCase() === 'TRIAL' || plan?.name?.toLowerCase().includes('trial');
    
    ALL_PLATFORM_FEATURES.forEach((item) => {
      if (plan?.features && !Array.isArray(plan.features) && plan.features[item.key]) {
        state[item.key] = plan.features[item.key];
      } else if (Array.isArray(plan?.features)) {
        const found = plan.features.find((f) => f.feature_key === item.key);
        state[item.key] = found ? found.access_mode : (isTrial ? 'write' : item.defaultMode);
      } else {
        state[item.key] = isTrial ? 'write' : (plan?.features?.[item.key] || 'write');
      }
    });
    return state;
  });

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'selected' | 'not_selected'
  const [groupByCategory, setGroupByCategory] = useState(true);

  // Derive distinct categories list
  const categories = useMemo(() => {
    return Array.from(new Set(ALL_PLATFORM_FEATURES.map((f) => f.category)));
  }, []);

  // Top Statistics Counters: Selected vs Not Selected
  const stats = useMemo(() => {
    let selected = 0;
    let notSelected = 0;
    let writeCount = 0;
    let readCount = 0;

    ALL_PLATFORM_FEATURES.forEach((item) => {
      const mode = matrixState[item.key] || 'write';
      if (mode === 'none') {
        notSelected++;
      } else {
        selected++;
        if (mode === 'write') writeCount++;
        if (mode === 'read') readCount++;
      }
    });

    return {
      total: ALL_PLATFORM_FEATURES.length,
      selected,
      notSelected,
      writeCount,
      readCount,
    };
  }, [matrixState]);

  // Filter features based on search query, category filter, and selected status filter
  const filteredFeatures = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ALL_PLATFORM_FEATURES.filter((f) => {
      const mode = matrixState[f.key] || 'write';
      const isSelected = mode !== 'none';

      // Status filter (Selected vs Not Selected)
      if (statusFilter === 'selected' && !isSelected) return false;
      if (statusFilter === 'not_selected' && isSelected) return false;

      // Category filter
      if (selectedCategory !== 'all' && f.category !== selectedCategory) {
        return false;
      }

      // Search query
      if (q) {
        const matches =
          f.name.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q) ||
          f.key.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [search, selectedCategory, statusFilter, matrixState]);

  // Group filtered features by category if groupByCategory is enabled
  const groupedFeatures = useMemo(() => {
    const groups = {};
    filteredFeatures.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredFeatures]);

  const handleModeChange = (featureKey, newMode) => {
    setMatrixState((prev) => ({
      ...prev,
      [featureKey]: newMode,
    }));
  };

  const handleEnableAllWrite = () => {
    const updated = {};
    ALL_PLATFORM_FEATURES.forEach((f) => {
      updated[f.key] = 'write';
    });
    setMatrixState(updated);
    showToast('All 28 platform modules set to Full (Write).', 'info');
  };

  const handleSave = () => {
    if (onSaveMatrix) {
      onSaveMatrix(plan, matrixState);
    }
    showToast(`Feature matrix saved for "${plan.name}".`, 'success');
  };

  // Helper to render an item row
  const renderRow = (item) => {
    const currentMode = matrixState[item.key] || 'write';
    const isSelected = currentMode !== 'none';

    return (
      <tr
        key={item.key}
        className={`transition-colors ${
          isSelected
            ? 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
            : 'bg-slate-50/40 dark:bg-slate-900/40 opacity-75 hover:opacity-100 hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
        }`}
      >
        {/* Module Name */}
        <td className="py-2.5 px-4">
          <span className="font-bold text-slate-900 dark:text-white">
            {item.name}
          </span>
        </td>

        {/* Category */}
        <td className="py-2.5 px-3">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {item.category}
          </span>
        </td>

        {/* Description */}
        <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 text-xs">
          {item.description}
        </td>

        {/* Access Level Controls */}
        <td className="py-2.5 px-4 text-right whitespace-nowrap">
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-950">
            <button
              type="button"
              onClick={() => handleModeChange(item.key, 'none')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors cursor-pointer flex items-center gap-1 ${
                currentMode === 'none'
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
              title="Not Selected (Disabled)"
            >
              <X size={11} />
              <span>None</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange(item.key, 'read')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors cursor-pointer ${
                currentMode === 'read'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300'
              }`}
              title="Read-only access"
            >
              Read
            </button>
            <button
              type="button"
              onClick={() => handleModeChange(item.key, 'write')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors cursor-pointer flex items-center gap-1 ${
                currentMode === 'write'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-300'
              }`}
              title="Full (Write) access"
            >
              <Check size={11} className="stroke-[3]" />
              <span>Write</span>
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 animate-in fade-in duration-150">
      {/* 1. Header Bar with Back Button, Plan Code, and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Back to Plans Catalog"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                Feature Matrix : {plan.name}
              </h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {plan.code}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Configure access permissions for all 28 modules in this plan
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleEnableAllWrite}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Enable All Full (Write)
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Save size={14} />
            <span>Save Matrix</span>
          </button>
        </div>
      </div>

      {/* 2. TOP DISPLAY: Clear, Easy-to-Understand Status Cards */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Metric Chips */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Selected Card */}
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'selected' ? 'all' : 'selected')}
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                statusFilter === 'selected'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-950 dark:bg-emerald-950/60 dark:border-emerald-500 dark:text-emerald-100 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-emerald-50/50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-900/60 dark:text-emerald-300 hover:bg-emerald-50'
              }`}
              title="Click to view only Selected modules"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white font-bold text-xs shrink-0">
                <Check size={13} className="stroke-[3]" />
              </div>
              <div className="text-left">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold text-slate-800 dark:text-white">Selected:</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {stats.selected} of {stats.total}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {stats.readCount === 0 && stats.selected === stats.total ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      All {stats.writeCount} Full (Write)
                    </span>
                  ) : stats.readCount === 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {stats.writeCount} Full (Write)
                    </span>
                  ) : (
                    <span>
                      <strong className="text-emerald-600 dark:text-emerald-400">{stats.writeCount}</strong> Write,{' '}
                      <strong className="text-blue-600 dark:text-blue-400">{stats.readCount}</strong> Read
                    </span>
                  )}
                </div>
              </div>
            </button>

            {/* Not Selected Card */}
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'not_selected' ? 'all' : 'not_selected')}
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                statusFilter === 'not_selected'
                  ? 'bg-slate-100 border-slate-400 text-slate-900 dark:bg-slate-800 dark:border-slate-500 dark:text-white ring-2 ring-slate-400/20 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 hover:bg-slate-100'
              }`}
              title="Click to view only Not Selected (disabled) modules"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs shrink-0">
                <X size={13} />
              </div>
              <div className="text-left">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold text-slate-800 dark:text-white">Not Selected:</span>
                  <span className="text-sm font-black text-slate-700 dark:text-slate-300">
                    {stats.notSelected}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {stats.notSelected === 0 ? 'None disabled' : `${stats.notSelected} disabled`}
                </div>
              </div>
            </button>

            {/* Total Modules Card */}
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-blue-50 border-blue-400 text-blue-900 dark:bg-blue-950/60 dark:border-blue-500 dark:text-blue-100 ring-2 ring-blue-500/20 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 hover:bg-slate-50'
              }`}
              title="Click to view all modules"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 shrink-0">
                <Layers size={13} />
              </div>
              <div className="text-left">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold text-slate-800 dark:text-white">Total:</span>
                  <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                    {stats.total}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  All modules
                </div>
              </div>
            </button>
          </div>

          {/* Group by Category Toggle */}
          <button
            type="button"
            onClick={() => setGroupByCategory((prev) => !prev)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer ${
              groupByCategory
                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
            title="Toggle Category Grouping"
          >
            <Layers size={13} />
            <span>Group by Category: <strong>{groupByCategory ? 'ON' : 'OFF'}</strong></span>
          </button>
        </div>

        {/* Multi-Segment Proportion Bar */}
        <div
          className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden flex"
          title={`${stats.writeCount} Write, ${stats.readCount} Read, ${stats.notSelected} Disabled`}
        >
          <div
            style={{ width: `${(stats.writeCount / stats.total) * 100}%` }}
            className="bg-emerald-500 h-full transition-all duration-300"
          />
          <div
            style={{ width: `${(stats.readCount / stats.total) * 100}%` }}
            className="bg-blue-500 h-full transition-all duration-300"
          />
          <div
            style={{ width: `${(stats.notSelected / stats.total) * 100}%` }}
            className="bg-slate-300 dark:bg-slate-700 h-full transition-all duration-300"
          />
        </div>
      </div>

      {/* 3. Filter Toolbar: Category Grouping Filter & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search 28 modules..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Grouping Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Categories ({ALL_PLATFORM_FEATURES.length})</option>
              {categories.map((cat) => {
                const count = ALL_PLATFORM_FEATURES.filter((f) => f.category === cat).length;
                return (
                  <option key={cat} value={cat}>
                    {cat} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <span className="text-xs text-slate-500 font-medium shrink-0">
          Showing {filteredFeatures.length} of {ALL_PLATFORM_FEATURES.length} modules
          {statusFilter !== 'all' && (
            <span className="ml-1 text-blue-600 dark:text-blue-400 font-bold">
              ({statusFilter === 'selected' ? 'Selected only' : 'Not Selected only'})
            </span>
          )}
        </span>
      </div>

      {/* 4. Table with Category Grouping */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-1/4">Module Name</th>
                <th className="py-3 px-3 w-32">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 w-44 text-right">Access Permission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredFeatures.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No modules match the current filter.
                  </td>
                </tr>
              ) : groupByCategory ? (
                // Grouped by Category
                Object.entries(groupedFeatures).map(([catName, items]) => {
                  const selectedInGroup = items.filter(
                    (i) => (matrixState[i.key] || 'write') !== 'none'
                  ).length;

                  return (
                    <React.Fragment key={catName}>
                      {/* Category Section Header Divider */}
                      <tr className="bg-slate-100/70 dark:bg-slate-800/60 border-y border-slate-200/70 dark:border-slate-700/60">
                        <td colSpan={4} className="py-2 px-4 text-xs font-bold text-slate-700 dark:text-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <span className="text-[11px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400">
                                {catName}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                ({items.length} {items.length === 1 ? 'module' : 'modules'})
                              </span>
                            </span>
                            <span className="text-[11px] font-medium text-slate-500">
                              <strong className="text-emerald-600 dark:text-emerald-400">{selectedInGroup}</strong> of {items.length} selected
                            </span>
                          </div>
                        </td>
                      </tr>
                      {/* Category Rows */}
                      {items.map((item) => renderRow(item))}
                    </React.Fragment>
                  );
                })
              ) : (
                // Flat Table Rows
                filteredFeatures.map((item) => renderRow(item))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
