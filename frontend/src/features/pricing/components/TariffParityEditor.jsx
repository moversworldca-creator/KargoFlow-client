import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Search,
  Save,
  RotateCcw,
  CopyPlus,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  Calendar,
  Clock,
  Package,
  Boxes,
  Truck,
  Compass,
  Flame,
  Shuffle,
  FileSpreadsheet,
  PackagePlus,
  Warehouse,
  Shield,
  Sliders,
  Cpu,
  GitBranch,
  Wrench,
  Download,
} from 'lucide-react';
import useCan from '../../../shared/auth/useCan';
import { getBranches } from '../../../services/api';
import { pricingApi } from '../api';
import { PRICING } from '../permissions';
import { REVISION_STATE_TONE, TARIFF_STATE_TONE, formatDateTime, formatDateOnly, humanize } from '../format';
import { pricingKeys, useInvalidatePricing } from '../queries';
import { StateBadge } from './ui';
import { extractTariffConfig, prepareRevisionPayload } from '../tariffConfigAdapter';

// Section components
import CommonSection from '../sections/CommonSection';
import PeriodsSection from '../sections/PeriodsSection';
import HourlyMovingSection from '../sections/HourlyMovingSection';
import MaterialsSection from '../sections/MaterialsSection';
import PackingRatesSection from '../sections/PackingRatesSection';
import DistanceRatesSection from '../sections/DistanceRatesSection';
import SharedFeesSection from '../sections/SharedFeesSection';
import BulkyItemsSection from '../sections/BulkyItemsSection';
import ValuationSection from '../sections/ValuationSection';
import DefaultsSection from '../sections/DefaultsSection';
import AutoPricingEngineSection from '../sections/AutoPricingEngineSection';

// Technical workspace components for the Advanced/Lifecycle tab
import RateTablesEditor from './RateTablesEditor';
import RulesEditor from './RulesEditor';
import ApplicabilityEditor from './ApplicabilityEditor';
import ConstraintsEditor from './ConstraintsEditor';
import RevisionDiff from './RevisionDiff';
import SimulationPanel from './SimulationPanel';

function asList(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (Array.isArray(val.results)) return val.results;
  return [];
}

const SECTION_GROUPS = [
  {
    id: 'core_global',
    name: 'Core / Global Setup',
    items: [
      { id: 'common', name: 'Common', icon: Sliders, description: 'Basic settings, volume-to-weight, binding & branch scope' },
      { id: 'periods', name: 'Periods', icon: Calendar, description: 'Default & seasonal pricing date ranges' },
    ],
  },
  {
    id: 'core_labor',
    name: 'Core Labor Rates',
    items: [
      { id: 'hourly_moving', name: 'Hourly Moving Rates', icon: Clock, description: 'Crew size × weekday moving labor rates' },
      { id: 'materials', name: 'Materials', icon: Package, description: 'Packing supplies, boxes, container CP/PBO codes' },
      { id: 'packing_rates', name: 'Packing Rates', icon: Boxes, description: 'Hourly, Flat+Hourly, CWT & Pack By Container' },
    ],
  },
  {
    id: 'transportation',
    name: 'Transportation Rates',
    items: [
      { id: 'distance_rates', name: 'Distance Rates', icon: Compass, description: 'Mileage × weight/volume matrix schedules' },
      { id: 'trip_and_travel', name: 'Trip & Travel Fees', icon: Truck, description: 'Drive time, radius, portal-to-portal charges' },
      { id: 'fuel_surcharges', name: 'Fuel Surcharge', icon: Flame, description: 'Percentage & per-mile fuel index fees' },
      { id: 'shuttle_fees', name: 'Shuttle Fees', icon: Shuffle, description: 'Access limitation & secondary shuttle vehicle charges' },
    ],
  },
  {
    id: 'addons',
    name: 'Add-ons / Extra Services',
    items: [
      { id: 'additional_services', name: 'Additional Services', icon: FileSpreadsheet, description: 'Stairs, long carry, hoisting & custom charges' },
      { id: 'bulky_items', name: 'Bulky Items', icon: PackagePlus, description: 'Pianos, safes, pool tables & oversized item fees' },
      { id: 'storage_in_transit', name: 'Storage In Transit', icon: Warehouse, description: 'SIT recurring storage & handling charges' },
    ],
  },
  {
    id: 'protection',
    name: 'Protection',
    items: [
      { id: 'valuation', name: 'Valuation', icon: Shield, description: 'Released Value Protection & Full Value options' },
    ],
  },
  {
    id: 'defaults_automations',
    name: 'Defaults / Automations',
    items: [
      { id: 'not_to_exceed', name: 'Not To Exceed Defaults', icon: ShieldCheck, description: 'Binding NTE guaranteed cap rules' },
      { id: 'pricing_method_defaults', name: 'Pricing Method Defaults', icon: Sliders, description: 'Automatic hourly vs distance selection rules' },
      { id: 'auto_pricing_rules', name: 'Auto-Pricing Rules', icon: Layers, description: 'Double Drive Time & automatic fee triggers' },
      { id: 'auto_pricing_engine', name: 'Auto-Pricing Engine', icon: Cpu, description: 'Throughput factors, crew sizing & truck requirements' },
    ],
  },
  {
    id: 'advanced_lifecycle',
    name: 'Revision & Compliance',
    items: [
      { id: 'lifecycle', name: 'Technical & Lifecycle', icon: Wrench, description: 'Structural validation, approvals & price simulator' },
    ],
  },
];

export default function TariffParityEditor({
  tariff,
  revision,
  revisions = [],
  onBack,
  onOpenRevision,
  onChanged,
}) {
  const { can } = useCan();
  const invalidate = useInvalidatePricing();
  const branchesQuery = useQuery({
    queryKey: ['pricing', 'branch-options'],
    queryFn: getBranches,
    staleTime: 60_000,
    retry: false,
  });
  const branches = asList(branchesQuery.data);

  // Active section selection
  const [activeSectionId, setActiveSectionId] = useState('common');
  const [sectionSearch, setSectionSearch] = useState('');
  
  // Global active period synchronization between HourlyMoving and PackingRates
  const [activePeriod, setActivePeriod] = useState('default');

  // Working copy of tariff configuration
  const [config, setConfig] = useState(() => extractTariffConfig(revision, tariff));
  const [initialConfig, setInitialConfig] = useState(() => extractTariffConfig(revision, tariff));
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Advanced technical subtab when on 'lifecycle' section
  const [techTab, setTechTab] = useState('validation');

  // Track if revision or tariff prop changes from outside
  useEffect(() => {
    const extracted = extractTariffConfig(revision, tariff);
    setConfig(extracted);
    setInitialConfig(extracted);
    setSaveError(null);
  }, [revision?.id, revision?.lock_version, tariff?.id, tariff?.lock_version]);

  // Deep equality / dirty check
  const isDirty = useMemo(() => {
    return JSON.stringify(config) !== JSON.stringify(initialConfig);
  }, [config, initialConfig]);

  const isEditable = (revision?.state === 'draft') && can(PRICING.UPDATE_DRAFT);

  // Available pricing periods for selector in rate editors
  const availablePeriods = useMemo(() => {
    const list = Array.isArray(config.periods) ? config.periods : [];
    return list.map((p) => ({
      id: p.id,
      name: p.name || 'Unnamed Period',
      is_default: Boolean(p.is_default),
    }));
  }, [config.periods]);

  // Save handler
  const handleSave = async () => {
    if (!isEditable || isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // 1. Save revision configuration JSON
      const revisionPayload = prepareRevisionPayload(config);
      await pricingApi.updateRevision(revision.id, {
        configuration: revisionPayload.configuration,
        lock_version: revision.lock_version,
      });

      // 2. If common fields (name, description, branch_ids) changed, save tariff record
      if (
        config.common.name !== tariff.name ||
        config.common.description !== (tariff.description || '') ||
        JSON.stringify(config.common.branch_ids || []) !== JSON.stringify(tariff.branch_ids || [])
      ) {
        await pricingApi.updateTariff(tariff.id, {
          name: config.common.name || tariff.name,
          description: config.common.description || '',
          branch_ids: config.common.branch_ids || [],
          lock_version: tariff.lock_version,
        });
      }

      setInitialConfig(config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      await invalidate(pricingKeys.tariff(tariff.id), ['pricing', 'tariffs']);
      onChanged?.();
    } catch (err) {
      setSaveError(err.response?.data?.message || err.message || 'Failed to save tariff configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  // Discard handler
  const handleDiscard = () => {
    if (window.confirm('Discard all unsaved changes to this revision?')) {
      setConfig(initialConfig);
      setSaveError(null);
    }
  };

  // Clone to new draft
  const handleCreateDraft = async () => {
    try {
      setIsSaving(true);
      const created = await pricingApi.createRevision(tariff.id, { clone_from_revision_id: revision.id });
      await invalidate(pricingKeys.tariff(tariff.id), ['pricing', 'tariffs']);
      onOpenRevision(created.id);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to create new draft revision.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter sections by search
  const filteredGroups = useMemo(() => {
    if (!sectionSearch.trim()) return SECTION_GROUPS;
    const q = sectionSearch.toLowerCase();
    return SECTION_GROUPS.map((group) => {
      const matchedItems = group.items.filter(
        (it) => it.name.toLowerCase().includes(q) || it.description.toLowerCase().includes(q)
      );
      return { ...group, items: matchedItems };
    }).filter((group) => group.items.length > 0);
  }, [sectionSearch]);

  const activeItem = useMemo(() => {
    for (const g of SECTION_GROUPS) {
      const it = g.items.find((x) => x.id === activeSectionId);
      if (it) return it;
    }
    return SECTION_GROUPS[0].items[0];
  }, [activeSectionId]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-140px)] rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Top Banner & Header */}
      <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors mr-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Tariff Library
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="inline-flex items-center rounded-md bg-slate-200/70 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {tariff.catalog_key}
              </span>
              <StateBadge state={tariff.state} tones={TARIFF_STATE_TONE} />
            </div>

            <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <span>{config.common?.name || tariff.name}</span>
              {isDirty && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  Unsaved Changes
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {config.common?.description || tariff.description || 'Configured SmartMoving-parity Tariff rate schedules and auto-pricing settings.'}
            </p>
          </div>

          {/* Right Header Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Revision Picker Pills */}
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 text-xs dark:border-slate-700 dark:bg-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 px-2">Revision:</span>
              {revisions.map((rev) => (
                <button
                  key={rev.id}
                  type="button"
                  onClick={() => onOpenRevision(rev.id)}
                  className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                    rev.id === revision?.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>Rev {rev.revision_number}</span>
                  <StateBadge state={rev.state} tones={REVISION_STATE_TONE} />
                </button>
              ))}
            </div>

            {/* Read-Only State / Action Buttons */}
            {!isEditable ? (
              can(PRICING.CREATE) && (
                <button
                  type="button"
                  onClick={handleCreateDraft}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-600"
                >
                  <CopyPlus className="h-3.5 w-3.5" />
                  Create Draft to Edit
                </button>
              )
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDiscard}
                  disabled={!isDirty || isSaving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!isDirty || isSaving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-40"
                >
                  <Save className="h-3.5 w-3.5" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Banners */}
        {saveSuccess && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Tariff configuration saved successfully.</span>
          </div>
        )}

        {saveError && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs font-medium text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <span>{saveError}</span>
          </div>
        )}

        {!isEditable && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/70 p-2 text-xs font-medium text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
            <Lock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>
              Revision {revision?.revision_number} is {humanize(revision?.state || 'published')} and read-only. History is permanently preserved. Click &quot;Create Draft to Edit&quot; to make changes.
            </span>
          </div>
        )}
      </div>

      {/* Main Two-Column Layout */}
      <div className="flex flex-1 flex-col md:flex-row">
        {/* Left Navigation Sidebar */}
        <aside className="w-full md:w-64 shrink-0 border-r border-slate-200 bg-slate-50/40 p-4 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter sections..."
              value={sectionSearch}
              onChange={(e) => setSectionSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 shadow-xs focus:border-brand-blue focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <nav className="space-y-4 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
            {filteredGroups.map((group) => (
              <div key={group.id} className="space-y-1">
                <h4 className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {group.name}
                </h4>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSectionId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveSectionId(item.id)}
                        className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-brand-blue font-semibold text-white shadow-xs'
                            : 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                        <span className="truncate">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Central Configuration Workspace */}
        <main className="flex-1 p-6 overflow-x-auto">
          {/* Section Header with Period Selector if applicable */}
          {['hourly_moving', 'packing_rates'].includes(activeSectionId) && (
            <div className="mb-6 flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-brand-blue" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Active Pricing Period:
                </span>
                <select
                  value={activePeriod}
                  onChange={(e) => setActivePeriod(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-800 shadow-xs focus:border-brand-blue focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  {availablePeriods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.is_default ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-[11px] text-slate-500">
                Rates below apply specifically when move date matches{' '}
                <strong className="text-slate-700 dark:text-slate-300">
                  {availablePeriods.find((p) => p.id === activePeriod)?.name || 'Default'}
                </strong>.
              </div>
            </div>
          )}

          {/* Render Active Section Component */}
          {activeSectionId === 'common' && (
            <CommonSection
              config={config}
              onChange={setConfig}
              isReadOnly={!isEditable}
              branches={branches}
            />
          )}

          {activeSectionId === 'periods' && (
            <PeriodsSection
              config={config}
              onChange={setConfig}
              isReadOnly={!isEditable}
            />
          )}

          {activeSectionId === 'hourly_moving' && (
            <HourlyMovingSection
              config={config}
              onChange={setConfig}
              isReadOnly={!isEditable}
              activePeriod={activePeriod}
              onPeriodChange={setActivePeriod}
            />
          )}

          {activeSectionId === 'materials' && (
            <MaterialsSection
              config={config}
              onChange={setConfig}
              isReadOnly={!isEditable}
            />
          )}

          {activeSectionId === 'packing_rates' && (
            <PackingRatesSection
              config={config}
              onChange={setConfig}
              isReadOnly={!isEditable}
              activePeriod={activePeriod}
              onPeriodChange={setActivePeriod}
            />
          )}

          {activeSectionId === 'distance_rates' && (
            <DistanceRatesSection
              config={config}
              onChange={setConfig}
              isReadOnly={!isEditable}
            />
          )}

          {activeSectionId === 'trip_and_travel' && (
            <SharedFeesSection
              configKey="trip_and_travel"
              categoryTitle="Trip and Travel Fees"
              categoryDescription="Configure travel charges and route-based fees."
              allowPerTruck
              config={config}
              onChange={setConfig}
              isReadOnly={!isEditable}
            />
          )}

          {activeSectionId === 'fuel_surcharges' && (
            <SharedFeesSection
              configKey="fuel_surcharges"
              categoryTitle="Fuel Surcharge"
              categoryDescription="Configure fuel charges and their calculation basis."
              config={config}
              onChange={setConfig}
              isReadOnly={!isEditable}
            />
          )}

          {activeSectionId === 'shuttle_fees' && (
            <SharedFeesSection
              configKey="shuttle_fees"
              categoryTitle="Shuttle Fees"
              categoryDescription="Configure charges for shuttle vehicle access."
              config={config}
              onChange={setConfig}
              isReadOnly={!isEditable}
            />
          )}

          {activeSectionId === 'additional_services' && (
            <SharedFeesSection
              configKey="additional_services"
              categoryTitle="Additional Services"
              categoryDescription="Configure additional service charges."
              allowCrewSalesPay
              config={config}
              onChange={setConfig}
              isReadOnly={!isEditable}
            />
          )}

          {activeSectionId === 'bulky_items' && (
            <BulkyItemsSection
              config={config}
              onChange={setConfig}
              isReadOnly={!isEditable}
            />
          )}

          {activeSectionId === 'storage_in_transit' && (
            <SharedFeesSection
              configKey="storage_in_transit"
              categoryTitle="Storage In Transit"
              categoryDescription="Configure storage-in-transit charges."
              config={config}
              onChange={setConfig}
              isReadOnly={!isEditable}
            />
          )}

          {activeSectionId === 'valuation' && (
            <ValuationSection
              config={config}
              onChange={setConfig}
              isReadOnly={!isEditable}
            />
          )}

          {activeSectionId === 'not_to_exceed' && (
            <DefaultsSection
              mode="nte"
              config={config}
              onChange={setConfig}
              isReadOnly={!isEditable}
            />
          )}

          {activeSectionId === 'pricing_method_defaults' && (
            <DefaultsSection
              mode="pricing_methods"
              config={config}
              onChange={setConfig}
              isReadOnly={!isEditable}
            />
          )}

          {activeSectionId === 'auto_pricing_rules' && (
            <DefaultsSection
              mode="rules"
              config={config}
              onChange={setConfig}
              isReadOnly={!isEditable}
            />
          )}

          {activeSectionId === 'auto_pricing_engine' && (
            <AutoPricingEngineSection
              config={config}
              onChange={setConfig}
              isReadOnly={!isEditable}
            />
          )}

          {/* Technical and Lifecycle Tab */}
          {activeSectionId === 'lifecycle' && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Technical Revision & Compliance Details
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Inspect underlying formula rules, compile structural validation, compare revision history diffs, and simulate estimates.
                </p>
              </div>

              <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 text-xs font-semibold">
                {[
                  { id: 'validation', label: 'Validation Issues' },
                  { id: 'simulate', label: 'Price Simulator' },
                  { id: 'rules', label: 'Raw Rules Engine' },
                  { id: 'tables', label: 'Compiled Tables' },
                  { id: 'compare', label: 'Compare Revisions' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTechTab(t.id)}
                    className={`pb-2 transition-colors border-b-2 ${
                      techTab === t.id
                        ? 'border-brand-blue text-brand-blue dark:border-blue-400 dark:text-blue-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                {techTab === 'validation' && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-6 dark:border-slate-800 dark:bg-slate-900/60 text-xs">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                      Structural Validation Report
                    </h4>
                    {revision.validation?.length ? (
                      <ul className="space-y-2">
                        {revision.validation.map((v, i) => (
                          <li key={i} className="flex items-start gap-2 text-rose-600">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>{v.message || JSON.stringify(v)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>No structural validation errors found. This revision is sound.</span>
                      </div>
                    )}
                  </div>
                )}

                {techTab === 'simulate' && (
                  <SimulationPanel revision={revision} tariff={tariff} />
                )}

                {techTab === 'rules' && (
                  <RulesEditor revision={revision} editable={isEditable} onChanged={onChanged} />
                )}

                {techTab === 'tables' && (
                  <RateTablesEditor revision={revision} editable={isEditable} onChanged={onChanged} />
                )}

                {techTab === 'compare' && (
                  <RevisionDiff revision={revision} revisions={revisions} />
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
