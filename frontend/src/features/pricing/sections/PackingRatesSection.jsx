import React, { useState } from 'react';
import { Box, Clock, Layers, Plus, Trash2, Users } from 'lucide-react';
import { CREW_SIZES, WEEKDAY_KEYS } from '../tariffConfigAdapter';

const PACKING_MODELS = [
  { value: 'hourly', label: 'Hourly Packing' },
  { value: 'flat_plus_hourly', label: 'Flat Plus Hourly' },
  { value: 'cwt', label: 'Hundredweight (CWT)' },
  { value: 'per_container', label: 'Pack By Container' },
];

export default function PackingRatesSection({ config, onChange, isReadOnly, selectedPeriodId, onSelectPeriod }) {
  const packing = config.packing_rates || {};
  const periods = config.periods || [];
  const currentPeriod = selectedPeriodId || periods[0]?.id || 'default';
  const materials = config.materials || [];
  const containerMaterials = materials.filter((m) => m.is_container);

  const setPacking = (patch) => {
    onChange({
      ...config,
      packing_rates: {
        ...packing,
        ...patch,
      },
    });
  };

  const handleMinHourChange = (dayKey, val) => {
    setPacking({
      minimum_hours: {
        ...(packing.minimum_hours || {}),
        [dayKey]: val,
      },
    });
  };

  const handleHourlyRateChange = (crewSize, dayKey, val) => {
    const periodRates = packing.rates?.[currentPeriod] || {};
    const crewRates = periodRates[String(crewSize)] || {};

    setPacking({
      rates: {
        ...(packing.rates || {}),
        [currentPeriod]: {
          ...periodRates,
          [String(crewSize)]: {
            ...crewRates,
            [dayKey]: val,
          },
        },
      },
    });
  };

  const getHourlyRate = (crewSize, dayKey) => {
    return packing.rates?.[currentPeriod]?.[String(crewSize)]?.[dayKey] ?? '';
  };

  const handleContainerRateChange = (matId, field, val) => {
    const periodRates = packing.container_rates?.[currentPeriod] || {};
    const matRates = periodRates[matId] || {};

    setPacking({
      container_rates: {
        ...(packing.container_rates || {}),
        [currentPeriod]: {
          ...periodRates,
          [matId]: {
            ...matRates,
            [field]: val,
          },
        },
      },
    });
  };

  const getContainerRate = (matId, field) => {
    return packing.container_rates?.[currentPeriod]?.[matId]?.[field] ?? '';
  };

  const handleAddCwtOption = () => {
    const newId = `cwt_${Date.now()}`;
    const next = [
      ...(packing.cwt_options || []),
      { id: newId, name: 'Custom Pack Service', rate_per_cwt: '25.00' },
    ];
    setPacking({ cwt_options: next });
  };

  const handleUpdateCwtOption = (id, patch) => {
    const next = (packing.cwt_options || []).map((opt) => (opt.id === id ? { ...opt, ...patch } : opt));
    setPacking({ cwt_options: next });
  };

  const handleDeleteCwtOption = (id) => {
    const next = (packing.cwt_options || []).filter((opt) => opt.id !== id);
    setPacking({ cwt_options: next });
  };

  return (
    <div className="space-y-6">
      {/* Header & Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Packing Rates</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Independent packing labor and container pricing schedules. Supports hourly, CWT, and per-container configurations.
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            disabled={isReadOnly}
            checked={packing.is_enabled !== false}
            onChange={(e) => setPacking({ is_enabled: e.target.checked })}
            className="rounded text-brand-blue focus:ring-brand-blue"
          />
          <span className="text-xs font-bold text-slate-800 dark:text-white">
            {packing.is_enabled !== false ? 'Packing Rates Active' : 'Packing Disabled'}
          </span>
        </label>
      </div>

      {/* Pricing Period Selector */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-brand-blue" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Active Pricing Period:</span>
        </div>
        <select
          value={currentPeriod}
          onChange={(e) => onSelectPeriod?.(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} {p.is_default ? '(Default)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Method selector tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-4">
          {PACKING_MODELS.map((model) => (
            <button
              key={model.value}
              type="button"
              onClick={() => setPacking({ pricing_model: model.value })}
              className={`border-b-2 py-2 px-1 text-xs font-bold transition ${
                (packing.pricing_model || 'hourly') === model.value
                  ? 'border-brand-navy text-brand-navy dark:border-blue-500 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 dark:text-slate-400'
              }`}
            >
              {model.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Hourly and Flat Plus Hourly Mode */}
      {((packing.pricing_model || 'hourly') === 'hourly' || packing.pricing_model === 'flat_plus_hourly') && (
        <div className="space-y-4">
          {packing.pricing_model === 'flat_plus_hourly' && (
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Base Flat Packing Charge ($)
                </label>
                <input
                  type="number"
                  step="1.00"
                  disabled={isReadOnly}
                  value={packing.flat_base_amount || ''}
                  onChange={(e) => setPacking({ flat_base_amount: e.target.value })}
                  placeholder="200.00"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Included Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  disabled={isReadOnly}
                  value={packing.flat_base_hours || ''}
                  onChange={(e) => setPacking({ flat_base_hours: e.target.value })}
                  placeholder="2"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Minimum Hours */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-2">Packing Minimum Hours by Weekday</h4>
            <div className="grid grid-cols-7 gap-2">
              {WEEKDAY_KEYS.map((day) => (
                <div key={day.key} className="text-center">
                  <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {day.label}
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    disabled={isReadOnly}
                    value={packing.minimum_hours?.[day.key] ?? '2'}
                    onChange={(e) => handleMinHourChange(day.key, e.target.value)}
                    className="w-full text-center rounded-md border border-slate-300 bg-white py-1.5 text-xs font-bold text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Matrix */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 text-[11px] uppercase tracking-wide dark:border-slate-800 dark:bg-slate-900/50">
                    <th scope="col" className="py-2.5 px-3 text-left w-36">Packers Crew</th>
                    {WEEKDAY_KEYS.map((day) => (
                      <th key={day.key} scope="col" className="py-2.5 px-2 text-center">{day.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {CREW_SIZES.slice(0, 5).map((crewSize) => (
                    <tr key={crewSize} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {crewSize} {crewSize === 1 ? 'Packer' : 'Packers'}
                      </td>
                      {WEEKDAY_KEYS.map((day) => {
                        const rate = getHourlyRate(crewSize, day.key);
                        return (
                          <td key={day.key} className="py-1.5 px-2 text-center">
                            <div className="relative">
                              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">$</span>
                              <input
                                type="number"
                                step="1.00"
                                min="0"
                                disabled={isReadOnly}
                                value={rate}
                                onChange={(e) => handleHourlyRateChange(crewSize, day.key, e.target.value)}
                                placeholder="0.00"
                                className="w-full text-center rounded-md border border-slate-200 bg-white py-1 pl-4 pr-1 text-xs font-medium text-slate-800 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
        </div>
      )}

      {/* Hundredweight (CWT) Mode */}
      {packing.pricing_model === 'cwt' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Configure named Hundredweight (CWT) packing tiers. Rates are applied per 100 lbs of estimated or actual shipment weight.
            </p>
            {!isReadOnly && (
              <button
                type="button"
                onClick={handleAddCwtOption}
                className="inline-flex items-center gap-1 rounded bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
              >
                <Plus size={13} /> Add CWT Tier
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(packing.cwt_options || []).map((opt) => (
              <div key={opt.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex-1">
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={opt.name}
                    onChange={(e) => handleUpdateCwtOption(opt.id, { name: e.target.value })}
                    className="w-full font-bold text-xs text-slate-800 border-0 p-0 focus:ring-0 dark:bg-transparent dark:text-white"
                    placeholder="Tier Name"
                  />
                  <div className="text-[11px] text-slate-400 mt-0.5">Rate per 100 lbs</div>
                </div>
                <div className="relative w-28">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    disabled={isReadOnly}
                    value={opt.rate_per_cwt}
                    onChange={(e) => handleUpdateCwtOption(opt.id, { rate_per_cwt: e.target.value })}
                    className="w-full rounded border border-slate-300 bg-white py-1 pl-6 pr-2 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCwtOption(opt.id)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pack By Container Mode */}
      {packing.pricing_model === 'per_container' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            <strong>Container requirement:</strong> Only materials marked as <em>&quot;Is Container&quot;</em> in the Materials screen can have per-container pack and unpack labor rates. Notice that Item Rate (material sale), Pack Rate (labor), and Unpack Rate (labor) are strictly separated.
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/60">
                <tr>
                  <th scope="col" className="py-2.5 px-3">Container Box</th>
                  <th scope="col" className="py-2.5 px-3 w-32 text-center">Item Rate (Sale $)</th>
                  <th scope="col" className="py-2.5 px-3 w-32 text-center">Pack Rate (Labor $)</th>
                  <th scope="col" className="py-2.5 px-3 w-32 text-center">Unpack Rate (Labor $)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {containerMaterials.map((mat) => (
                  <tr key={mat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-800 dark:text-white">{mat.name}</div>
                      <div className="text-[11px] text-slate-400">{mat.container_volume_cuft ? `${mat.container_volume_cuft} cu ft` : 'Container'} · CP: {mat.cp_code || 'N/A'}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          disabled={isReadOnly}
                          value={getContainerRate(mat.id, 'item_rate') || mat.unit_price || ''}
                          onChange={(e) => handleContainerRateChange(mat.id, 'item_rate', e.target.value)}
                          className="w-full text-center rounded border border-slate-300 bg-white py-1 pl-6 pr-2 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          disabled={isReadOnly}
                          value={getContainerRate(mat.id, 'pack_rate')}
                          onChange={(e) => handleContainerRateChange(mat.id, 'pack_rate', e.target.value)}
                          placeholder="0.00"
                          className="w-full text-center rounded border border-slate-300 bg-white py-1 pl-6 pr-2 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          disabled={isReadOnly}
                          value={getContainerRate(mat.id, 'unpack_rate')}
                          onChange={(e) => handleContainerRateChange(mat.id, 'unpack_rate', e.target.value)}
                          placeholder="0.00"
                          className="w-full text-center rounded border border-slate-300 bg-white py-1 pl-6 pr-2 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {containerMaterials.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-xs text-slate-400">
                      No materials are designated as containers. Enable &quot;Is Container&quot; on materials in the Materials screen to configure per-container pack rates.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
