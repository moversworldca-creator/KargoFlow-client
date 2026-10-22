// One tariff, edited live (no revisions): Settings → Tariffs → Tariff Library →
// tariff. The working copy is saved screen by screen; every save carries the
// lock version read, so a concurrent edit is reported instead of overwritten.
import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, Boxes, Calendar, CheckCircle2, Clock, Compass, Cpu, FileSpreadsheet, Flame, Layers, Lock,
  Package, PackagePlus, RotateCcw, Save, Search, Shield, ShieldCheck, Shuffle, Sliders, Truck, Warehouse,
} from 'lucide-react';
import useCan from '../../../shared/auth/useCan';
import { tariffsApi } from '../api';
import { pricingError } from '../errors';
import { TARIFFS } from '../permissions';
import { tariffKeys, useInvalidateTariffs, useTariff } from '../queries';
import { changedSections, withDefaults } from '../tariffConfig';
import AutoPricingEngineSection from '../sections/AutoPricingEngineSection';
import BulkyItemsSection from '../sections/BulkyItemsSection';
import CommonSection from '../sections/CommonSection';
import DefaultsSection from '../sections/DefaultsSection';
import DistanceRatesSection from '../sections/DistanceRatesSection';
import HourlyMovingSection from '../sections/HourlyMovingSection';
import MaterialsSection from '../sections/MaterialsSection';
import PackingRatesSection from '../sections/PackingRatesSection';
import PeriodsSection from '../sections/PeriodsSection';
import SharedFeesSection from '../sections/SharedFeesSection';
import ValuationSection from '../sections/ValuationSection';
import { Badge, Button, LoadingState, QueryState, useUnsavedChanges } from './ui';

// Navigation as SmartMoving groups it (spec §2).
const SECTION_GROUPS = [
  { name: 'Core / Global Setup', items: [
    { id: 'common', name: 'Common', icon: Sliders },
    { id: 'periods', name: 'Periods', icon: Calendar },
  ] },
  { name: 'Core Labor Rates', items: [
    { id: 'hourly_moving', name: 'Hourly Moving Rates', icon: Clock },
    { id: 'materials', name: 'Materials', icon: Package },
    { id: 'packing', name: 'Packing Rates', icon: Boxes },
  ] },
  { name: 'Transportation Rates', items: [
    { id: 'distance_rates', name: 'Distance Rates', icon: Compass },
    { id: 'trip_travel', name: 'Trip and Travel Fees', icon: Truck },
    { id: 'fuel_surcharges', name: 'Fuel Surcharge', icon: Flame },
    { id: 'shuttle_fees', name: 'Shuttle Fees', icon: Shuffle },
  ] },
  { name: 'Add-ons / Extra Services', items: [
    { id: 'additional_services', name: 'Additional Services', icon: FileSpreadsheet },
    { id: 'bulky_items', name: 'Bulky Items', icon: PackagePlus },
    { id: 'storage_in_transit', name: 'Storage In Transit', icon: Warehouse },
  ] },
  { name: 'Protection', items: [{ id: 'valuation', name: 'Valuation', icon: Shield }] },
  { name: 'Defaults / Automations', items: [
    { id: 'not_to_exceed', name: 'Not To Exceed Defaults', icon: ShieldCheck },
    { id: 'pricing_method_defaults', name: 'Pricing Method Defaults', icon: Sliders },
    { id: 'auto_pricing_rules', name: 'Auto-Pricing Rules', icon: Layers },
    { id: 'auto_pricing_engine', name: 'Auto-Pricing Engine', icon: Cpu },
  ] },
];

const COMMON_FIELDS = ['name', 'volume_to_weight_ratio', 'applies_to_all_branches', 'branch_ids', 'applies_to_all_opportunity_types',
  'opportunity_type_ids', 'minimum_booking_amount', 'minimum_weight_lbs', 'default_binding_type'];
const MANAGED_COMMON = ['applies_to_all_branches', 'branch_ids', 'applies_to_all_opportunity_types', 'opportunity_type_ids',
  'minimum_booking_amount', 'minimum_weight_lbs'];
const commonOf = (tariff) => Object.fromEntries(COMMON_FIELDS.map((k) => [k, tariff[k] ?? (k.endsWith('_ids') ? [] : null)]));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export default function TariffEditor({ tariffId, onBack }) {
  const query = useTariff(tariffId);
  // The editor keeps its own working copy and lock version after saving; it is
  // reset only when the user asks to reload (after someone else saved).
  const [reloads, setReloads] = useState(0);
  const reload = async () => { await query.refetch(); setReloads((n) => n + 1); };
  return (
    <QueryState query={query}>
      {query.data ? <EditorView key={`${query.data.id}:${reloads}`} tariff={query.data} onBack={onBack} reload={reload} /> : <LoadingState />}
    </QueryState>
  );
}

function EditorView({ tariff, onBack, reload }) {
  const { can } = useCan();
  const invalidate = useInvalidateTariffs();
  const [active, setActive] = useState('common');
  const [search, setSearch] = useState('');
  const [periodId, setPeriodId] = useState('default');
  const [loaded, setLoaded] = useState(() => ({ config: withDefaults(tariff.configuration), common: commonOf(tariff), lock: tariff.lock_version }));
  const [config, setConfig] = useState(loaded.config);
  const [common, setCommon] = useState(loaded.common);
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const [problems, setProblems] = useState([]);
  const managed = tariff.is_managed;
  const canEdit = can(TARIFFS.MANAGE);
  const sectionReadOnly = (id) => !canEdit || (managed && id !== 'valuation');
  const dirtySections = changedSections(config, loaded.config);
  const dirtyCommon = !same(common, loaded.common);
  const dirty = dirtyCommon || dirtySections.length > 0;
  useUnsavedChanges(dirty);

  const allProblems = [...(tariff.problems || []), ...problems];
  const countFor = (id) => allProblems.filter((p) => p.path === id || p.path.startsWith(`${id}.`)).length;
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SECTION_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !q || i.name.toLowerCase().includes(q)) })).filter((g) => g.items.length);
  }, [search]);

  const save = async () => {
    setSaving(true); setOutcome(null); setProblems([]);
    let lock = loaded.lock;
    let latest = null;
    let saved = { ...loaded };
    try {
      if (dirtyCommon) {
        const fields = managed ? MANAGED_COMMON : COMMON_FIELDS;
        const changes = Object.fromEntries(fields.filter((k) => !same(common[k], loaded.common[k])).map((k) => [k, common[k]]));
        latest = await tariffsApi.updateCommon(tariff.id, { ...changes, lock_version: lock });
        lock = latest.lock_version;
        saved = { ...saved, common, lock };
      }
      for (const section of dirtySections) {
        latest = await tariffsApi.saveSection(tariff.id, section, config[section], lock);
        lock = latest.lock_version;
        saved = { ...saved, config: { ...saved.config, [section]: latest.configuration[section] }, lock };
      }
      setLoaded(saved);
      setConfig((current) => ({ ...current, ...Object.fromEntries(dirtySections.map((s) => [s, saved.config[s]])) }));
      setOutcome({ tone: 'success', text: 'Tariff saved.' });
      await invalidate(tariffKeys.all);
    } catch (error) {
      const info = pricingError(error);
      // Keep what did save; report the screen that did not.
      setLoaded(saved);
      setProblems(info.errors.length ? info.errors : []);
      setOutcome({ tone: 'error', text: info.message, stale: info.code === 'STALE_VERSION' });
      const first = info.errors[0]?.path?.split('.')[0];
      if (first) setActive(first);
    } finally {
      setSaving(false);
    }
  };
  const discard = () => {
    if (window.confirm('Discard your unsaved changes?')) { setConfig(loaded.config); setCommon(loaded.common); setProblems([]); setOutcome(null); }
  };
  const back = () => {
    if (!dirty || window.confirm('Leave without saving your changes?')) onBack();
  };

  const props = { config, onChange: setConfig, isReadOnly: sectionReadOnly(active), problems: allProblems,
    selectedPeriodId: periodId, onSelectPeriod: setPeriodId };
  const sectionView = {
    common: <CommonSection common={common} onCommonChange={setCommon} isReadOnly={!canEdit} isManaged={managed} problems={allProblems} />,
    periods: <PeriodsSection {...props} />,
    hourly_moving: <HourlyMovingSection {...props} />,
    materials: <MaterialsSection {...props} />,
    packing: <PackingRatesSection {...props} />,
    distance_rates: <DistanceRatesSection {...props} />,
    bulky_items: <BulkyItemsSection {...props} />,
    valuation: <ValuationSection {...props} />,
    auto_pricing_engine: <AutoPricingEngineSection {...props} />,
  }[active] || (['pricing_method_defaults', 'auto_pricing_rules', 'not_to_exceed'].includes(active)
    ? <DefaultsSection sectionId={active} {...props} />
    : <SharedFeesSection sectionId={active} {...props} />);

  return (
    <div className="flex min-h-[calc(100vh-140px)] flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 bg-slate-50/60 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <button type="button" onClick={back} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Tariff Library
            </button>
            <h1 className="flex flex-wrap items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <span>{common.name || tariff.name}</span>
              {tariff.is_active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}
              {managed && <Badge tone="blue">Managed</Badge>}
              {dirty && <Badge tone="amber">Unsaved changes</Badge>}
            </h1>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={discard} disabled={!dirty || saving}><RotateCcw size={14} aria-hidden="true" /> Discard</Button>
              <Button onClick={save} disabled={!dirty || saving} busy={saving}><Save size={14} aria-hidden="true" /> Save Changes</Button>
            </div>
          )}
        </div>
        {outcome && (
          <div role={outcome.tone === 'error' ? 'alert' : 'status'} className={`mt-3 flex flex-wrap items-center gap-2 rounded-lg border p-2.5 text-xs font-medium ${outcome.tone === 'error'
            ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200'
            : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200'}`}>
            {outcome.tone === 'error' ? <AlertTriangle size={14} aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}
            <span>{outcome.text}</span>
            {outcome.stale && <Button variant="ghost" onClick={reload}>Reload tariff</Button>}
          </div>
        )}
        {managed && (
          <p className="mt-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/70 p-2 text-xs text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
            <Lock size={14} aria-hidden="true" /> Managed tariff: its rates come from an authorized template. You can set branch and opportunity type eligibility, the booking minimum, the minimum weight and the valuation options.
          </p>
        )}
        {!canEdit && !managed && (
          <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Lock size={14} aria-hidden="true" /> You can view this tariff. Editing needs the Manage tariffs permission.</p>
        )}
      </div>
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="w-full shrink-0 border-r border-slate-200 bg-slate-50/40 p-4 md:w-64 dark:border-slate-800 dark:bg-slate-900/40">
          <label className="relative mb-3 block">
            <span className="sr-only">Filter tariff sections</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input type="search" placeholder="Filter sections…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
          </label>
          <nav aria-label="Tariff sections" className="space-y-4">
            {groups.map((group) => (
              <div key={group.name} className="space-y-1">
                <h2 className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{group.name}</h2>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const issues = countFor(item.id);
                  const changed = item.id === 'common' ? dirtyCommon : dirtySections.includes(item.id);
                  return (
                    <button key={item.id} type="button" onClick={() => setActive(item.id)} aria-current={active === item.id ? 'page' : undefined}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold ${active === item.id
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                      <Icon size={14} aria-hidden="true" /><span className="flex-1">{item.name}</span>
                      {changed && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-label="unsaved" />}
                      {issues > 0 && <Badge tone="red">{issues}</Badge>}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 p-6">{sectionView}</main>
      </div>
    </div>
  );
}
