import React from 'react';
import { Building2, Info, Scale, ShieldCheck } from 'lucide-react';

const BINDING_TYPES = [
  { value: 'not_set', label: 'Not set (Default)' },
  { value: 'non_binding', label: 'Non-Binding' },
  { value: 'binding', label: 'Binding' },
];

const OPPORTUNITY_TYPES = [
  { value: 'all', label: 'All Opportunity Types' },
  { value: 'local', label: 'Local Moves Only' },
  { value: 'intrastate', label: 'Intrastate Moves Only' },
  { value: 'interstate', label: 'Interstate / Long Distance Moves Only' },
];

export default function CommonSection({ config, onChange, isReadOnly, branches = [] }) {
  const common = config.common || {};

  const setField = (field, val) => {
    onChange({
      ...config,
      common: {
        ...common,
        [field]: val,
      },
    });
  };

  const handleBranchToggle = (branchId) => {
    const current = Array.isArray(common.branch_ids) ? [...common.branch_ids] : [];
    const exists = current.includes(branchId);
    const updated = exists ? current.filter((id) => id !== branchId) : [...current, branchId];
    setField('branch_ids', updated);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Common Settings</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Global parameters controlling shipment weight estimation, binding rules, minimum booking thresholds, and branch applicability.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tariff Name */}
        <div className="space-y-1.5">
          <label htmlFor="tariff-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Tariff Name <span className="text-rose-500">*</span>
          </label>
          <input
            id="tariff-name"
            type="text"
            disabled={isReadOnly}
            value={common.name || ''}
            onChange={(e) => setField('name', e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            placeholder="e.g. Standard Local Tariff"
          />
          <p className="text-[11px] text-slate-500">The public identity of this tariff shown in the Tariff Library and estimates.</p>
        </div>

        {/* Volume to Weight Ratio */}
        <div className="space-y-1.5">
          <label htmlFor="tariff-vwr" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Volume to Weight Ratio (lbs / cu ft)
          </label>
          <div className="relative">
            <input
              id="tariff-vwr"
              type="number"
              step="0.01"
              min="1"
              max="20"
              disabled={isReadOnly}
              value={common.volume_to_weight_ratio || '7.00'}
              onChange={(e) => setField('volume_to_weight_ratio', e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white pl-3 pr-24 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
              lbs / cu ft
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Estimated weight = shipment cubic feet × ratio. SmartMoving and industry standard density factor is <strong className="text-slate-700 dark:text-slate-300">7.00</strong>.
          </p>
        </div>

        {/* Minimum Booking Amount */}
        <div className="space-y-1.5">
          <label htmlFor="tariff-min-booking" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Minimum Booking Amount ($)
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">$</span>
            <input
              id="tariff-min-booking"
              type="number"
              step="1.00"
              min="0"
              disabled={isReadOnly}
              value={common.minimum_booking_amount || ''}
              onChange={(e) => setField('minimum_booking_amount', e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white pl-7 pr-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              placeholder="150.00"
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Minimum required charge for a job priced under this tariff. A Sales Manager may override this threshold on individual opportunities.
          </p>
        </div>

        {/* Default Binding Type */}
        <div className="space-y-1.5">
          <label htmlFor="tariff-binding-type" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Default Binding Type
          </label>
          <select
            id="tariff-binding-type"
            disabled={isReadOnly}
            value={common.default_binding_type || 'not_set'}
            onChange={(e) => setField('default_binding_type', e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {BINDING_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500">
            Selecting <strong className="text-slate-700 dark:text-slate-300">&quot;Not set&quot;</strong> defaults newly created opportunities to Non-Binding. Changes on an existing opportunity are preserved and never overwritten.
          </p>
        </div>

        {/* Opportunity Types */}
        <div className="space-y-1.5 md:col-span-2">
          <label htmlFor="tariff-opp-type" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Applies to Opportunity Types
          </label>
          <select
            id="tariff-opp-type"
            disabled={isReadOnly}
            value={common.applies_to_opportunity_types || 'all'}
            onChange={(e) => setField('applies_to_opportunity_types', e.target.value)}
            className="w-full md:w-1/2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {OPPORTUNITY_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500">Restrict tariff automatic selection to specific job scopes (Local, Intrastate, Interstate) or make it universal.</p>
        </div>
      </div>

      {/* Branch Applicability Section */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={16} className="text-brand-blue" />
          <h4 className="text-xs font-bold text-slate-800 dark:text-white">Applies to Branches</h4>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Select whether this tariff applies company-wide across all locations, or only to designated branches.
        </p>

        <div className="flex items-center gap-4 mb-3 text-xs">
          <label className="flex items-center gap-2 font-medium cursor-pointer">
            <input
              type="radio"
              name="branch_scope_mode"
              disabled={isReadOnly}
              checked={!common.branch_ids || common.branch_ids.length === 0}
              onChange={() => setField('branch_ids', [])}
              className="text-brand-blue focus:ring-brand-blue"
            />
            All Branches (Company-wide)
          </label>
          <label className="flex items-center gap-2 font-medium cursor-pointer">
            <input
              type="radio"
              name="branch_scope_mode"
              disabled={isReadOnly}
              checked={Array.isArray(common.branch_ids) && common.branch_ids.length > 0}
              onChange={() => setField('branch_ids', branches[0] ? [branches[0].id] : [1])}
              className="text-brand-blue focus:ring-brand-blue"
            />
            Specific Branches Only
          </label>
        </div>

        {Array.isArray(common.branch_ids) && common.branch_ids.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            {branches.map((b) => {
              const checked = common.branch_ids.includes(b.id) || common.branch_ids.includes(String(b.id)) || common.branch_ids.includes(Number(b.id));
              return (
                <label key={b.id} className="flex items-center gap-2 text-xs p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={isReadOnly}
                    checked={checked}
                    onChange={() => handleBranchToggle(b.id)}
                    className="rounded text-brand-blue focus:ring-brand-blue"
                  />
                  <span className="truncate font-medium text-slate-700 dark:text-slate-300">{b.name}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
