import React, { useState } from 'react';
import { Clock, Info, Plus, Truck, Users } from 'lucide-react';
import { CREW_SIZES, TRUCK_OPTIONS, WEEKDAY_KEYS } from '../tariffConfigAdapter';

export default function HourlyMovingSection({ config, onChange, isReadOnly, selectedPeriodId, onSelectPeriod }) {
  const hourly = config.hourly_moving || {};
  const periods = config.periods || [];
  const currentPeriod = selectedPeriodId || periods[0]?.id || 'default';
  const [selectedTruck, setSelectedTruck] = useState('1_truck');

  const setHourly = (patch) => {
    onChange({
      ...config,
      hourly_moving: {
        ...hourly,
        ...patch,
      },
    });
  };

  const handleMinHourChange = (dayKey, val) => {
    setHourly({
      minimum_hours: {
        ...(hourly.minimum_hours || {}),
        [dayKey]: val,
      },
    });
  };

  const handleRateChange = (crewSize, dayKey, val) => {
    const truckKey = hourly.vary_by_trucks ? selectedTruck : '1_truck';
    const periodRates = hourly.rates?.[currentPeriod] || {};
    const truckRates = periodRates[truckKey] || {};
    const crewRates = truckRates[String(crewSize)] || {};

    setHourly({
      rates: {
        ...(hourly.rates || {}),
        [currentPeriod]: {
          ...periodRates,
          [truckKey]: {
            ...truckRates,
            [String(crewSize)]: {
              ...crewRates,
              [dayKey]: val,
            },
          },
        },
      },
    });
  };

  const getRate = (crewSize, dayKey) => {
    const truckKey = hourly.vary_by_trucks ? selectedTruck : '1_truck';
    return hourly.rates?.[currentPeriod]?.[truckKey]?.[String(crewSize)]?.[dayKey] ?? '';
  };

  return (
    <div className="space-y-6">
      {/* Header and Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Hourly Moving Rates</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure hourly crew rates and minimum hours by day of the week, with optional truck-count variation.
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            disabled={isReadOnly}
            checked={hourly.is_enabled !== false}
            onChange={(e) => setHourly({ is_enabled: e.target.checked })}
            className="rounded text-brand-blue focus:ring-brand-blue"
          />
          <span className="text-xs font-bold text-slate-800 dark:text-white">
            {hourly.is_enabled !== false ? 'Hourly Rates Active' : 'Hourly Rates Disabled'}
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

      {/* Pricing Model Option */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <label className="block text-xs font-bold text-slate-800 dark:text-white mb-2">Pricing Model</label>
          <div className="flex gap-4 text-xs">
            <label className="flex items-center gap-2 font-medium cursor-pointer">
              <input
                type="radio"
                name="hourly_pricing_model"
                disabled={isReadOnly}
                checked={hourly.pricing_model !== 'flat_plus_hourly'}
                onChange={() => setHourly({ pricing_model: 'hourly' })}
                className="text-brand-blue focus:ring-brand-blue"
              />
              Standard Hourly
            </label>
            <label className="flex items-center gap-2 font-medium cursor-pointer">
              <input
                type="radio"
                name="hourly_pricing_model"
                disabled={isReadOnly}
                checked={hourly.pricing_model === 'flat_plus_hourly'}
                onChange={() => setHourly({ pricing_model: 'flat_plus_hourly' })}
                className="text-brand-blue focus:ring-brand-blue"
              />
              Flat Rate Plus Hourly
            </label>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {hourly.pricing_model === 'flat_plus_hourly'
              ? 'Base flat charge covers the initial minimum hours; any additional hours use the entered incremental hourly rate.'
              : 'Continuous hourly billing at the entered rate for total job duration (subject to weekday minimum hours).'}
          </p>

          {hourly.pricing_model === 'flat_plus_hourly' && (
            <div className="mt-3 grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Base Flat Charge ($)
                </label>
                <input
                  type="number"
                  step="1.00"
                  disabled={isReadOnly}
                  value={hourly.flat_base_amount || ''}
                  onChange={(e) => setHourly({ flat_base_amount: e.target.value })}
                  placeholder="450.00"
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Included Hours
                </label>
                <input
                  type="number"
                  step="0.5"
                  disabled={isReadOnly}
                  value={hourly.flat_base_hours || ''}
                  onChange={(e) => setHourly({ flat_base_hours: e.target.value })}
                  placeholder="3"
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Truck variation toggle */}
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-800 dark:text-white">Rates Vary by Number of Trucks</label>
            <input
              type="checkbox"
              disabled={isReadOnly}
              checked={hourly.vary_by_trucks !== false}
              onChange={(e) => setHourly({ vary_by_trucks: e.target.checked })}
              className="rounded text-brand-blue focus:ring-brand-blue"
            />
          </div>
          <p className="text-[11px] text-slate-500 mb-3">
            When enabled, configure separate complete hourly rates for Labor Only, 1 Truck, 2 Trucks, etc. Cells represent complete crew + vehicle rates, not vehicle increments.
          </p>

          {hourly.vary_by_trucks !== false && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              {TRUCK_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSelectedTruck(opt.key)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    selectedTruck === opt.key
                      ? 'bg-brand-navy text-white shadow-sm dark:bg-blue-600'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Minimum Hours row */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-2">Minimum Hours by Weekday</h4>
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
                value={hourly.minimum_hours?.[day.key] ?? '3'}
                onChange={(e) => handleMinHourChange(day.key, e.target.value)}
                className="w-full text-center rounded-md border border-slate-300 bg-white py-1.5 text-xs font-bold text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Rate Matrix: Crew Size (Rows) x Weekday (Columns) */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between dark:bg-slate-800/60 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-brand-blue" />
            <span className="text-xs font-bold text-slate-800 dark:text-white">
              Hourly Rates ($/hr) — {hourly.vary_by_trucks ? TRUCK_OPTIONS.find((t) => t.key === selectedTruck)?.label : 'Standard Rates'}
            </span>
          </div>
          <span className="text-[11px] text-slate-500">Period: {periods.find((p) => p.id === currentPeriod)?.name}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 text-[11px] uppercase tracking-wide dark:border-slate-800 dark:bg-slate-900/50">
                <th scope="col" className="py-2.5 px-3 text-left w-36">Crew Size</th>
                {WEEKDAY_KEYS.map((day) => (
                  <th key={day.key} scope="col" className="py-2.5 px-2 text-center">{day.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {CREW_SIZES.map((crewSize) => (
                <tr key={crewSize} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                    {crewSize} {crewSize === 1 ? 'Mover' : 'Movers'}
                  </td>
                  {WEEKDAY_KEYS.map((day) => {
                    const rate = getRate(crewSize, day.key);
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
                            onChange={(e) => handleRateChange(crewSize, day.key, e.target.value)}
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

      {/* Additional Resource Rates */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="add-mover-rate" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Additional Mover Hourly Rate ($/hr)
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
            <input
              id="add-mover-rate"
              type="number"
              step="1.00"
              disabled={isReadOnly}
              value={hourly.additional_mover_rate || ''}
              onChange={(e) => setHourly({ additional_mover_rate: e.target.value })}
              placeholder="45.00"
              className="w-full rounded-md border border-slate-300 bg-white pl-7 pr-3 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Rate applied per extra mover beyond configured crew rows when auto-pricing adds resources.</p>
        </div>

        <div>
          <label htmlFor="add-truck-rate" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Additional Truck Hourly Rate ($/hr)
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
            <input
              id="add-truck-rate"
              type="number"
              step="1.00"
              disabled={isReadOnly}
              value={hourly.additional_truck_rate || ''}
              onChange={(e) => setHourly({ additional_truck_rate: e.target.value })}
              placeholder="50.00"
              className="w-full rounded-md border border-slate-300 bg-white pl-7 pr-3 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Rate applied per extra truck beyond configured truck rows.</p>
        </div>
      </div>
    </div>
  );
}
