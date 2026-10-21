import React, { useState } from 'react';
import {
  Sliders,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Shield,
  Layers,
  Zap,
  Info,
  DollarSign,
  Percent,
} from 'lucide-react';

const CONDITION_FIELDS = [
  { value: 'opportunity_type', label: 'Opportunity Type' },
  { value: 'estimated_weight_lbs', label: 'Estimated Weight (lbs)' },
  { value: 'estimated_volume_cuft', label: 'Estimated Volume (cu ft)' },
  { value: 'move_distance_miles', label: 'Move Distance (miles)' },
  { value: 'service_day_of_week', label: 'Day of Week' },
];

const CONDITION_OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'greater_than', label: 'is greater than' },
  { value: 'less_than', label: 'is less than' },
];

export default function DefaultsSection({
  config,
  onChange,
  isReadOnly,
  mode = 'all', // "nte" | "pricing_methods" | "rules" | "all"
}) {
  const [activeTab, setActiveTab] = useState(
    mode === 'all' ? 'nte' : mode
  );

  const nteRules = Array.isArray(config.not_to_exceed) ? config.not_to_exceed : [];
  const pmdRules = Array.isArray(config.pricing_method_defaults) ? config.pricing_method_defaults : [];
  const autoRules = Array.isArray(config.auto_pricing_rules) ? config.auto_pricing_rules : [];

  // Available fee targets from tariff config
  const availableFees = [
    { id: 'double_drive_time', name: 'California Double Drive Time (DDT)' },
    { id: 'include_travel_in_labor', name: 'Include Travel Time in Estimated Time' },
    ...(config.trip_and_travel || []).map((f) => ({ id: f.id, name: `Travel: ${f.name}` })),
    ...(config.fuel_surcharges || []).map((f) => ({ id: f.id, name: `Fuel: ${f.name}` })),
    ...(config.shuttle_fees || []).map((f) => ({ id: f.id, name: `Shuttle: ${f.name}` })),
    ...(config.additional_services || []).map((f) => ({ id: f.id, name: `Service: ${f.name}` })),
  ];

  const updateConfig = (key, val) => {
    onChange({
      ...config,
      [key]: val,
    });
  };

  // --- NTE Handlers ---
  const handleAddNte = () => {
    const newRule = {
      id: `nte_${Date.now()}`,
      name: 'New Not To Exceed Cap',
      is_enabled: true,
      condition_mode: 'always',
      conditions: [],
      method: 'percentage',
      value: '10.0',
      rounding: '10',
    };
    updateConfig('not_to_exceed', [...nteRules, newRule]);
  };

  const handleUpdateNte = (id, updates) => {
    const next = nteRules.map((r) => (r.id === id ? { ...r, ...updates } : r));
    updateConfig('not_to_exceed', next);
  };

  const handleDeleteNte = (id) => {
    if (!window.confirm('Delete this Not To Exceed default rule?')) return;
    updateConfig('not_to_exceed', nteRules.filter((r) => r.id !== id));
  };

  // --- Pricing Method Defaults Handlers ---
  const handleAddPmd = () => {
    const newRule = {
      id: `pmd_${Date.now()}`,
      name: 'Default Pricing Method Rule',
      is_enabled: true,
      service_type: 'moving',
      condition_mode: 'always',
      conditions: [],
      default_method: 'hourly',
    };
    updateConfig('pricing_method_defaults', [...pmdRules, newRule]);
  };

  const handleUpdatePmd = (id, updates) => {
    const next = pmdRules.map((r) => (r.id === id ? { ...r, ...updates } : r));
    updateConfig('pricing_method_defaults', next);
  };

  const handleDeletePmd = (id) => {
    if (!window.confirm('Delete this Pricing Method default rule?')) return;
    updateConfig('pricing_method_defaults', pmdRules.filter((r) => r.id !== id));
  };

  // --- Auto-Pricing Rules Handlers ---
  const handleAddAutoRule = () => {
    const newRule = {
      id: `apr_${Date.now()}`,
      name: 'Automated Fee Rule',
      is_enabled: true,
      condition_mode: 'all',
      conditions: [{ field: 'move_distance_miles', operator: 'greater_than', value: '30' }],
      fees_to_apply: ['double_drive_time'],
    };
    updateConfig('auto_pricing_rules', [...autoRules, newRule]);
  };

  const handleUpdateAutoRule = (id, updates) => {
    const next = autoRules.map((r) => (r.id === id ? { ...r, ...updates } : r));
    updateConfig('auto_pricing_rules', next);
  };

  const handleDeleteAutoRule = (id) => {
    if (!window.confirm('Delete this Auto-Pricing fee rule?')) return;
    updateConfig('auto_pricing_rules', autoRules.filter((r) => r.id !== id));
  };

  // Condition Helpers
  const addCondition = (rule, updateFn) => {
    const conditions = Array.isArray(rule.conditions) ? [...rule.conditions] : [];
    conditions.push({ field: 'opportunity_type', operator: 'equals', value: 'local' });
    updateFn(rule.id, { conditions });
  };

  const updateCondition = (rule, index, updates, updateFn) => {
    const conditions = Array.isArray(rule.conditions) ? [...rule.conditions] : [];
    conditions[index] = { ...conditions[index], ...updates };
    updateFn(rule.id, { conditions });
  };

  const removeCondition = (rule, index, updateFn) => {
    const conditions = Array.isArray(rule.conditions) ? [...rule.conditions] : [];
    conditions.splice(index, 1);
    updateFn(rule.id, { conditions });
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Defaults & Auto-Pricing Rules
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Configure default pricing methods, automatic fee attachments (Double Drive Time), and Not-To-Exceed caps with ALWAYS, ANY, or ALL condition evaluation.
        </p>
      </div>

      {/* Tabs if in 'all' view */}
      {mode === 'all' && (
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          {[
            { id: 'nte', label: `Not To Exceed Defaults (${nteRules.length})` },
            { id: 'pricing_methods', label: `Pricing Method Defaults (${pmdRules.length})` },
            { id: 'rules', label: `Auto-Pricing Rules (${autoRules.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'border-brand-blue text-brand-blue dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ======================= NOT TO EXCEED (DEF-06, DEF-07) ======================= */}
      {(mode === 'nte' || (mode === 'all' && activeTab === 'nte')) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Not To Exceed (NTE) Defaults
              </h4>
              <p className="text-xs text-slate-500">
                Calculates maximum guaranteed binding cap above estimated labor & services.
              </p>
            </div>
            {!isReadOnly && (
              <button
                type="button"
                onClick={handleAddNte}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-600"
              >
                <Plus className="h-3.5 w-3.5" />
                Add NTE Rule
              </button>
            )}
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
            <Info className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Downstream Override Notice (DEF-07):</span>{' '}
              The Not To Exceed amount computed by this tariff default rule can be manually adjusted or overridden on individual opportunity estimates by sales reps and estimators.
            </div>
          </div>

          {nteRules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 dark:border-slate-800">
              No Not To Exceed default rules configured. Click "Add NTE Rule" to set up a cap.
            </div>
          ) : (
            <div className="space-y-4">
              {nteRules.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={rule.is_enabled !== false}
                        onChange={(e) => handleUpdateNte(rule.id, { is_enabled: e.target.checked })}
                        disabled={isReadOnly}
                        className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                      />
                      <input
                        type="text"
                        value={rule.name || ''}
                        disabled={isReadOnly}
                        onChange={(e) => handleUpdateNte(rule.id, { name: e.target.value })}
                        className="rounded border border-transparent font-bold text-sm text-slate-900 hover:border-slate-300 px-2 py-0.5 dark:text-white dark:hover:border-slate-700"
                      />
                    </div>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => handleDeleteNte(rule.id)}
                        className="text-slate-400 hover:text-rose-500"
                        title="Delete rule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Cap Calculation Method
                      </label>
                      <select
                        value={rule.method || 'percentage'}
                        disabled={isReadOnly}
                        onChange={(e) => handleUpdateNte(rule.id, { method: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="percentage">Percentage Above Estimate (%)</option>
                        <option value="amount">Fixed Dollar Amount ($)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {rule.method === 'amount' ? 'Cap Amount ($)' : 'Cap Percentage (%)'}
                      </label>
                      <div className="relative mt-1">
                        <input
                          type="number"
                          step={rule.method === 'amount' ? '10.00' : '0.5'}
                          min="0"
                          value={rule.value || '10'}
                          disabled={isReadOnly}
                          onChange={(e) => handleUpdateNte(rule.id, { value: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                          {rule.method === 'amount' ? '$' : '%'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Rounding Increment
                      </label>
                      <select
                        value={rule.rounding || '10'}
                        disabled={isReadOnly}
                        onChange={(e) => handleUpdateNte(rule.id, { rounding: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="none">No Rounding</option>
                        <option value="1">Nearest $1.00</option>
                        <option value="5">Nearest $5.00</option>
                        <option value="10">Nearest $10.00</option>
                        <option value="25">Nearest $25.00</option>
                        <option value="50">Nearest $50.00</option>
                      </select>
                    </div>
                  </div>

                  {/* Conditions Box */}
                  <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Apply rule:</span>
                        <select
                          value={rule.condition_mode || 'always'}
                          disabled={isReadOnly}
                          onChange={(e) => handleUpdateNte(rule.id, { condition_mode: e.target.value })}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        >
                          <option value="always">ALWAYS (All jobs)</option>
                          <option value="all">When ALL conditions match</option>
                          <option value="any">When ANY condition matches</option>
                        </select>
                      </div>
                      {rule.condition_mode !== 'always' && !isReadOnly && (
                        <button
                          type="button"
                          onClick={() => addCondition(rule, handleUpdateNte)}
                          className="text-xs font-semibold text-brand-blue hover:underline"
                        >
                          + Add Condition
                        </button>
                      )}
                    </div>

                    {rule.condition_mode !== 'always' && (
                      <div className="mt-3 space-y-2">
                        {(rule.conditions || []).map((cond, cIdx) => (
                          <div key={cIdx} className="flex items-center gap-2">
                            <select
                              value={cond.field}
                              disabled={isReadOnly}
                              onChange={(e) => updateCondition(rule, cIdx, { field: e.target.value }, handleUpdateNte)}
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            >
                              {CONDITION_FIELDS.map((f) => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                              ))}
                            </select>
                            <select
                              value={cond.operator}
                              disabled={isReadOnly}
                              onChange={(e) => updateCondition(rule, cIdx, { operator: e.target.value }, handleUpdateNte)}
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            >
                              {CONDITION_OPERATORS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={cond.value}
                              disabled={isReadOnly}
                              onChange={(e) => updateCondition(rule, cIdx, { value: e.target.value }, handleUpdateNte)}
                              placeholder="Value..."
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            />
                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() => removeCondition(rule, cIdx, handleUpdateNte)}
                                className="text-slate-400 hover:text-rose-500"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================= PRICING METHOD DEFAULTS (DEF-01..03) ======================= */}
      {(mode === 'pricing_methods' || (mode === 'all' && activeTab === 'pricing_methods')) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Pricing Method Defaults
              </h4>
              <p className="text-xs text-slate-500">
                Choose the default pricing method (Hourly, Flat Plus Hourly, Distance, Container) dynamically selected for new opportunities.
              </p>
            </div>
            {!isReadOnly && (
              <button
                type="button"
                onClick={handleAddPmd}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-600"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Pricing Method Default
              </button>
            )}
          </div>

          {pmdRules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 dark:border-slate-800">
              No pricing method defaults configured. Click "Add Pricing Method Default" to configure one.
            </div>
          ) : (
            <div className="space-y-4">
              {pmdRules.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={rule.is_enabled !== false}
                        onChange={(e) => handleUpdatePmd(rule.id, { is_enabled: e.target.checked })}
                        disabled={isReadOnly}
                        className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                      />
                      <input
                        type="text"
                        value={rule.name || ''}
                        disabled={isReadOnly}
                        onChange={(e) => handleUpdatePmd(rule.id, { name: e.target.value })}
                        className="rounded border border-transparent font-bold text-sm text-slate-900 hover:border-slate-300 px-2 py-0.5 dark:text-white dark:hover:border-slate-700"
                      />
                    </div>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => handleDeletePmd(rule.id)}
                        className="text-slate-400 hover:text-rose-500"
                        title="Delete rule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Service Category (DEF-01)
                      </label>
                      <select
                        value={rule.service_type || 'moving'}
                        disabled={isReadOnly}
                        onChange={(e) => handleUpdatePmd(rule.id, { service_type: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="moving">Hourly Moving Labor</option>
                        <option value="packing">Packing Services</option>
                        <option value="distance">Distance / Transportation</option>
                        <option value="valuation">Valuation Protection</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Default Pricing Model / Schedule (DEF-03)
                      </label>
                      <select
                        value={rule.default_method || 'hourly'}
                        disabled={isReadOnly}
                        onChange={(e) => handleUpdatePmd(rule.id, { default_method: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        {rule.service_type === 'packing' ? (
                          <>
                            <option value="hourly">Hourly Packing</option>
                            <option value="flat_plus_hourly">Flat Rate Plus Hourly</option>
                            <option value="cwt">Hundredweight (CWT)</option>
                            <option value="per_container">Pack By Container</option>
                          </>
                        ) : rule.service_type === 'distance' ? (
                          <>
                            <option value="schedule_standard">Standard Distance Schedule</option>
                            <option value="weight_cwt">Weight CWT Table</option>
                            <option value="volume_cuft">Volume Cu Ft Table</option>
                          </>
                        ) : (
                          <>
                            <option value="hourly">Hourly Rate Matrix</option>
                            <option value="flat_plus_hourly">Flat Rate Plus Hourly</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Conditions Box */}
                  <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Apply when:</span>
                        <select
                          value={rule.condition_mode || 'always'}
                          disabled={isReadOnly}
                          onChange={(e) => handleUpdatePmd(rule.id, { condition_mode: e.target.value })}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        >
                          <option value="always">ALWAYS</option>
                          <option value="all">When ALL conditions match</option>
                          <option value="any">When ANY condition matches</option>
                        </select>
                      </div>
                      {rule.condition_mode !== 'always' && !isReadOnly && (
                        <button
                          type="button"
                          onClick={() => addCondition(rule, handleUpdatePmd)}
                          className="text-xs font-semibold text-brand-blue hover:underline"
                        >
                          + Add Condition
                        </button>
                      )}
                    </div>

                    {rule.condition_mode !== 'always' && (
                      <div className="mt-3 space-y-2">
                        {(rule.conditions || []).map((cond, cIdx) => (
                          <div key={cIdx} className="flex items-center gap-2">
                            <select
                              value={cond.field}
                              disabled={isReadOnly}
                              onChange={(e) => updateCondition(rule, cIdx, { field: e.target.value }, handleUpdatePmd)}
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            >
                              {CONDITION_FIELDS.map((f) => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                              ))}
                            </select>
                            <select
                              value={cond.operator}
                              disabled={isReadOnly}
                              onChange={(e) => updateCondition(rule, cIdx, { operator: e.target.value }, handleUpdatePmd)}
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            >
                              {CONDITION_OPERATORS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={cond.value}
                              disabled={isReadOnly}
                              onChange={(e) => updateCondition(rule, cIdx, { value: e.target.value }, handleUpdatePmd)}
                              placeholder="Value..."
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            />
                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() => removeCondition(rule, cIdx, handleUpdatePmd)}
                                className="text-slate-400 hover:text-rose-500"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================= AUTO-PRICING RULES (DEF-04, DEF-05) ======================= */}
      {(mode === 'rules' || (mode === 'all' && activeTab === 'rules')) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Auto-Pricing Rules (Fees Attachment)
              </h4>
              <p className="text-xs text-slate-500">
                Automatically append travel charges, fuel surcharges, shuttle fees, or Double Drive Time based on shipment criteria.
              </p>
            </div>
            {!isReadOnly && (
              <button
                type="button"
                onClick={handleAddAutoRule}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-600"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Auto-Pricing Rule
              </button>
            )}
          </div>

          {autoRules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 dark:border-slate-800">
              No auto-pricing fee rules configured. Click "Add Auto-Pricing Rule" to create one.
            </div>
          ) : (
            <div className="space-y-4">
              {autoRules.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={rule.is_enabled !== false}
                        onChange={(e) => handleUpdateAutoRule(rule.id, { is_enabled: e.target.checked })}
                        disabled={isReadOnly}
                        className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                      />
                      <input
                        type="text"
                        value={rule.name || ''}
                        disabled={isReadOnly}
                        onChange={(e) => handleUpdateAutoRule(rule.id, { name: e.target.value })}
                        className="rounded border border-transparent font-bold text-sm text-slate-900 hover:border-slate-300 px-2 py-0.5 dark:text-white dark:hover:border-slate-700"
                      />
                    </div>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAutoRule(rule.id)}
                        className="text-slate-400 hover:text-rose-500"
                        title="Delete rule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Fee Selection Checkboxes (DEF-05) */}
                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Automatically Attach Fees (DEF-04, DEF-05):
                    </label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {availableFees.map((fee) => {
                        const isSelected = (rule.fees_to_apply || []).includes(fee.id);
                        return (
                          <label
                            key={fee.id}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-xs transition-colors ${
                              isSelected
                                ? 'border-brand-blue bg-blue-50/70 text-brand-blue font-semibold dark:border-blue-700 dark:bg-blue-950/30'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isReadOnly}
                              onChange={(e) => {
                                const current = Array.isArray(rule.fees_to_apply) ? [...rule.fees_to_apply] : [];
                                const next = e.target.checked
                                  ? [...current, fee.id]
                                  : current.filter((x) => x !== fee.id);
                                handleUpdateAutoRule(rule.id, { fees_to_apply: next });
                              }}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                            />
                            <span>{fee.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Conditions Box */}
                  <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Apply when:</span>
                        <select
                          value={rule.condition_mode || 'all'}
                          disabled={isReadOnly}
                          onChange={(e) => handleUpdateAutoRule(rule.id, { condition_mode: e.target.value })}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        >
                          <option value="always">ALWAYS</option>
                          <option value="all">When ALL conditions match</option>
                          <option value="any">When ANY condition matches</option>
                        </select>
                      </div>
                      {rule.condition_mode !== 'always' && !isReadOnly && (
                        <button
                          type="button"
                          onClick={() => addCondition(rule, handleUpdateAutoRule)}
                          className="text-xs font-semibold text-brand-blue hover:underline"
                        >
                          + Add Condition
                        </button>
                      )}
                    </div>

                    {rule.condition_mode !== 'always' && (
                      <div className="mt-3 space-y-2">
                        {(rule.conditions || []).map((cond, cIdx) => (
                          <div key={cIdx} className="flex items-center gap-2">
                            <select
                              value={cond.field}
                              disabled={isReadOnly}
                              onChange={(e) => updateCondition(rule, cIdx, { field: e.target.value }, handleUpdateAutoRule)}
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            >
                              {CONDITION_FIELDS.map((f) => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                              ))}
                            </select>
                            <select
                              value={cond.operator}
                              disabled={isReadOnly}
                              onChange={(e) => updateCondition(rule, cIdx, { operator: e.target.value }, handleUpdateAutoRule)}
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            >
                              {CONDITION_OPERATORS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={cond.value}
                              disabled={isReadOnly}
                              onChange={(e) => updateCondition(rule, cIdx, { value: e.target.value }, handleUpdateAutoRule)}
                              placeholder="Value..."
                              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            />
                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() => removeCondition(rule, cIdx, handleUpdateAutoRule)}
                                className="text-slate-400 hover:text-rose-500"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
