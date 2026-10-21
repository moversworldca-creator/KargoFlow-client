import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  HelpCircle,
  Info,
  DollarSign,
  Scale,
  FileText,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const VALUATION_TYPES = [
  { value: 'full_value', label: 'Full Value Protection (FVP)' },
  { value: 'actual_cash_value', label: 'Actual Cash Value (ACV)' },
  { value: 'replacement_cost', label: 'Replacement Cost Protection' },
  { value: 'other', label: 'Custom / Other Protection' },
];

const PRICING_TYPES = [
  { value: 'cost_per_value', label: 'Cost Per Declared Value (e.g. $X per $100)' },
  { value: 'flat_matrix', label: 'Declared Value × Deductible Matrix' },
];

const COST_UNITS = [
  { value: '100', label: 'per $100 of Declared Value' },
  { value: '1000', label: 'per $1,000 of Declared Value' },
  { value: '1', label: 'per $1 of Declared Value' },
];

const ROUNDING_OPTIONS = [
  { value: 'none', label: 'No Rounding (Exact Cents)' },
  { value: 'up_1', label: 'Round Up to Nearest $1.00' },
  { value: 'up_5', label: 'Round Up to Nearest $5.00' },
  { value: 'up_10', label: 'Round Up to Nearest $10.00' },
];

export default function ValuationSection({ config, onChange, isReadOnly }) {
  const valuation = config.valuation || {
    rvp_rate_per_lb: '0.60',
    rvp_customer_price: '0.00',
    options: [],
  };
  const options = Array.isArray(valuation.options) ? valuation.options : [];

  const [activeOptionId, setActiveOptionId] = useState(options[0]?.id || null);
  const [editingOption, setEditingOption] = useState(null);
  const [isAddingOption, setIsAddingOption] = useState(false);

  const updateValuation = (updatedValuation) => {
    onChange({
      ...config,
      valuation: updatedValuation,
    });
  };

  const handleUpdateRvp = (field, val) => {
    updateValuation({
      ...valuation,
      [field]: val,
    });
  };

  const openAddOption = () => {
    const newId = `val_${Date.now()}`;
    const newOpt = {
      id: newId,
      name: 'Full Value Protection ($500 Deductible)',
      valuation_type: 'full_value',
      pricing_type: 'cost_per_value',
      cost_unit: '100',
      cost_per_hundred: '1.00',
      min_charge: '60.00',
      rounding: 'none',
      default_value_per_lb: '6.00',
      max_declared_value: '200000.00',
      description: 'Carrier pays for repair, replacement with like kind, or cash settlement subject to customer deductible.',
      matrix: {
        declared_tiers: ['10,000', '25,000', '50,000', '100,000'],
        deductibles: ['0', '250', '500'],
        prices: {
          '0': { '0': '125.00', '1': '95.00', '2': '75.00' },
          '1': { '0': '250.00', '1': '200.00', '2': '160.00' },
          '2': { '0': '450.00', '1': '375.00', '2': '310.00' },
          '3': { '0': '850.00', '1': '700.00', '2': '580.00' },
        },
      },
    };
    const nextOptions = [...options, newOpt];
    updateValuation({ ...valuation, options: nextOptions });
    setActiveOptionId(newId);
  };

  const handleDeleteOption = (idToDelete) => {
    if (!window.confirm('Are you sure you want to delete this valuation option?')) return;
    const nextOptions = options.filter((o) => o.id !== idToDelete);
    updateValuation({ ...valuation, options: nextOptions });
    if (activeOptionId === idToDelete) {
      setActiveOptionId(nextOptions[0]?.id || null);
    }
  };

  const handleUpdateOption = (id, updates) => {
    const nextOptions = options.map((opt) => (opt.id === id ? { ...opt, ...updates } : opt));
    updateValuation({ ...valuation, options: nextOptions });
  };

  const activeOption = options.find((o) => o.id === activeOptionId) || options[0];

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Protection & Valuation</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Configure Released Value Protection (RVP) mandated carrier liability and Full Value / Actual Cash Value options and deductibles.
        </p>
      </div>

      {/* Regulatory Notice */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300">
        <ShieldCheck className="h-4 w-4 shrink-0 text-brand-blue mt-0.5" />
        <div>
          <span className="font-semibold">Carrier Liability Notice (VAL-01, VAL-02):</span> Valuation is tariff-governed carrier liability, not insurance. Released Value Protection is provided at no extra charge to the customer ($0.00 price), defaulting to $0.60 per pound per article under federal and state moving regulations.
        </div>
      </div>

      {/* Released Value Protection Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <ShieldAlert className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Released Value Protection (RVP) - Basic Carrier Liability
          </h4>
        </div>

        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Coverage Rate Per Pound ($ / lb / article) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">$</span>
              <input
                type="number"
                step="0.05"
                min="0.10"
                disabled={isReadOnly}
                value={valuation.rvp_rate_per_lb || '0.60'}
                onChange={(e) => handleUpdateRvp('rvp_rate_per_lb', e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white pl-7 pr-3 py-2 text-xs font-semibold text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <p className="text-[11px] text-slate-500">Standard federal rate is $0.60 per pound per article.</p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Customer Price ($)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">$</span>
              <input
                type="text"
                disabled
                value="0.00 (Mandatory No-Charge)"
                className="w-full rounded-lg border border-slate-200 bg-slate-100 pl-7 pr-3 py-2 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400"
              />
            </div>
            <p className="text-[11px] text-slate-500">Basic carrier liability cannot be charged to the customer under FMCSR rules.</p>
          </div>
        </div>
      </div>

      {/* Upgraded Valuation Options */}
      <div className="space-y-4">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Upgraded Protection Options (Full Value & Deductibles)
            </h4>
            <p className="text-xs text-slate-500">
              Options presented to customers for higher valuation coverage with configurable deductibles and pricing models.
            </p>
          </div>
          {!isReadOnly && (
            <button
              type="button"
              onClick={openAddOption}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-600 focus:outline-none"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Valuation Option
            </button>
          )}
        </div>

        {/* Options Tabs */}
        {options.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setActiveOptionId(opt.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeOption?.id === opt.id
                    ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                <span>{opt.name || 'Unnamed Option'}</span>
                {!isReadOnly && options.length > 1 && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteOption(opt.id);
                    }}
                    className="rounded p-0.5 text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="h-3 w-3" />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Active Option Form */}
        {activeOption ? (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Option Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={activeOption.name || ''}
                  onChange={(e) => handleUpdateOption(activeOption.id, { name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Valuation Type
                </label>
                <select
                  disabled={isReadOnly}
                  value={activeOption.valuation_type || 'full_value'}
                  onChange={(e) => handleUpdateOption(activeOption.id, { valuation_type: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {VALUATION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Default Value Per Pound ($ / lb)
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.50"
                    min="1"
                    disabled={isReadOnly}
                    value={activeOption.default_value_per_lb || '6.00'}
                    onChange={(e) => handleUpdateOption(activeOption.id, { default_value_per_lb: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white pl-7 pr-3 py-2 text-xs font-semibold text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <p className="text-[11px] text-slate-500">Calculates initial declared value = shipment weight × $6.00.</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Maximum Declared Value ($)
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">$</span>
                  <input
                    type="number"
                    step="5000"
                    min="0"
                    disabled={isReadOnly}
                    value={activeOption.max_declared_value || '200000.00'}
                    onChange={(e) => handleUpdateOption(activeOption.id, { max_declared_value: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white pl-7 pr-3 py-2 text-xs font-semibold text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Pricing Model Choice */}
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Pricing Calculation Method
              </h5>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {PRICING_TYPES.map((pt) => (
                  <label
                    key={pt.value}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-xs transition-colors ${
                      activeOption.pricing_type === pt.value
                        ? 'border-brand-blue bg-blue-50/60 text-brand-blue dark:border-blue-700 dark:bg-blue-950/30'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`pricing_type_${activeOption.id}`}
                      value={pt.value}
                      checked={activeOption.pricing_type === pt.value}
                      onChange={() => handleUpdateOption(activeOption.id, { pricing_type: pt.value })}
                      disabled={isReadOnly}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="font-semibold block">{pt.label}</span>
                    </div>
                  </label>
                ))}
              </div>

              {/* Sub-form based on pricing method */}
              {activeOption.pricing_type === 'cost_per_value' ? (
                <div className="mt-4 grid gap-4 border-t border-slate-200 pt-4 dark:border-slate-700 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Rate ($)
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">$</span>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        disabled={isReadOnly}
                        value={activeOption.cost_per_hundred || '1.25'}
                        onChange={(e) => handleUpdateOption(activeOption.id, { cost_per_hundred: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white pl-7 pr-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Cost Base Unit
                    </label>
                    <select
                      disabled={isReadOnly}
                      value={activeOption.cost_unit || '100'}
                      onChange={(e) => handleUpdateOption(activeOption.id, { cost_unit: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {COST_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Minimum Fee ($)
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">$</span>
                      <input
                        type="number"
                        step="1.00"
                        min="0"
                        disabled={isReadOnly}
                        value={activeOption.min_charge || '75.00'}
                        onChange={(e) => handleUpdateOption(activeOption.id, { min_charge: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white pl-7 pr-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Rounding Precision (VAL-05)
                    </label>
                    <select
                      disabled={isReadOnly}
                      value={activeOption.rounding || 'none'}
                      onChange={(e) => handleUpdateOption(activeOption.id, { rounding: e.target.value })}
                      className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {ROUNDING_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                /* Flat matrix editor */
                <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                  <p className="text-xs text-slate-500 mb-3">
                    Configure fixed protection fees by declared valuation amount tier and customer deductible amount (VAL-04).
                  </p>
                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        <tr>
                          <th className="px-3 py-2 border-r border-slate-200 dark:border-slate-700">Declared Value Tier</th>
                          <th className="px-3 py-2 text-center">$0 Deductible</th>
                          <th className="px-3 py-2 text-center">$250 Deductible</th>
                          <th className="px-3 py-2 text-center">$500 Deductible</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {[
                          { tier: 'Up to $10,000', key: '0' },
                          { tier: '$10,001 - $25,000', key: '1' },
                          { tier: '$25,001 - $50,000', key: '2' },
                          { tier: '$50,001 - $100,000', key: '3' },
                        ].map((row) => (
                          <tr key={row.key}>
                            <td className="px-3 py-2 font-medium bg-slate-50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-slate-700">
                              {row.tier}
                            </td>
                            {['0', '1', '2'].map((dedIdx) => {
                              const cellVal = activeOption.matrix?.prices?.[row.key]?.[dedIdx] || '100.00';
                              return (
                                <td key={dedIdx} className="px-2 py-1.5 text-center">
                                  <div className="relative inline-block w-24">
                                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                    <input
                                      type="number"
                                      step="5.00"
                                      disabled={isReadOnly}
                                      value={cellVal}
                                      onChange={(e) => {
                                        const nextPrices = { ...(activeOption.matrix?.prices || {}) };
                                        if (!nextPrices[row.key]) nextPrices[row.key] = {};
                                        nextPrices[row.key][dedIdx] = e.target.value;
                                        handleUpdateOption(activeOption.id, {
                                          matrix: { ...(activeOption.matrix || {}), prices: nextPrices },
                                        });
                                      }}
                                      className="w-full rounded border border-slate-300 bg-white pl-5 pr-2 py-1 text-center font-mono text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                    />
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Description & Disclosure */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Customer Disclosure & Terms (VAL-06)
              </label>
              <textarea
                rows={3}
                disabled={isReadOnly}
                value={activeOption.description || ''}
                onChange={(e) => handleUpdateOption(activeOption.id, { description: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="Disclose exact settlement terms, depreciated vs replacement valuation, and deductible conditions..."
              />
              <p className="text-[11px] text-slate-500">
                Printed on the Bill of Lading, estimate terms, and proposal document signature sections.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 dark:border-slate-700">
            No upgraded valuation options configured yet. Click "Add Valuation Option" to set up Full Value Protection.
          </div>
        )}
      </div>
    </div>
  );
}
