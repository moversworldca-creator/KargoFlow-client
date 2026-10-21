import React, { useState } from 'react';
import { Clock, Map, Percent, Plus, Trash2 } from 'lucide-react';

const RATE_TYPES = [
  { value: 'weight_cwt', label: 'Weight (per 100 lbs / CWT)' },
  { value: 'volume_cuft', label: 'Volume (per cubic foot)' },
  { value: 'flat_weight', label: 'Flat by Weight Tier' },
  { value: 'flat_volume', label: 'Flat by Volume Tier' },
];

export default function DistanceRatesSection({ config, onChange, isReadOnly, selectedPeriodId, onSelectPeriod }) {
  const distanceSchedules = config.distance_rates || [];
  const periods = config.periods || [];
  const currentPeriod = selectedPeriodId || periods[0]?.id || 'default';
  const [activeScheduleId, setActiveScheduleId] = useState(distanceSchedules[0]?.id || null);
  const [scalePct, setScalePct] = useState('5.0');

  const setSchedules = (updated) => {
    onChange({
      ...config,
      distance_rates: updated,
    });
  };

  const currentSchedule = distanceSchedules.find((s) => s.id === activeScheduleId) || distanceSchedules[0];

  const handleAddSchedule = () => {
    const newId = `dist_${Date.now()}`;
    const newSched = {
      id: newId,
      name: `Distance Schedule ${distanceSchedules.length + 1}`,
      rate_type: 'weight_cwt',
      auto_scale_pct: '0',
      enable_breakpoints: true,
      overage_per_cwt: '2.50',
      overage_per_mile: '1.75',
      mileage_bands: ['0 - 50', '51 - 100', '101 - 250', '251 - 500', '501+'],
      weight_bands: ['1,000 lbs', '2,500 lbs', '5,000 lbs', '8,000 lbs', '10,000+ lbs'],
      matrix: {
        '0': { '0': '25.00', '1': '22.00', '2': '19.50', '3': '17.00', '4': '15.00' },
        '1': { '0': '32.00', '1': '28.00', '2': '25.00', '3': '22.00', '4': '19.50' },
        '2': { '0': '45.00', '1': '40.00', '2': '36.00', '3': '32.00', '4': '28.00' },
      },
    };
    setSchedules([...distanceSchedules, newSched]);
    setActiveScheduleId(newId);
  };

  const handleUpdateCurrent = (patch) => {
    if (!currentSchedule) return;
    setSchedules(
      distanceSchedules.map((s) => (s.id === currentSchedule.id ? { ...s, ...patch } : s))
    );
  };

  const handleDeleteCurrent = () => {
    if (isReadOnly || !currentSchedule) return;
    const remaining = distanceSchedules.filter((s) => s.id !== currentSchedule.id);
    setSchedules(remaining);
    setActiveScheduleId(remaining[0]?.id || null);
  };

  const handleCellChange = (mIdx, wIdx, val) => {
    const matrix = { ...(currentSchedule.matrix || {}) };
    matrix[String(mIdx)] = { ...(matrix[String(mIdx)] || {}), [String(wIdx)]: val };
    handleUpdateCurrent({ matrix });
  };

  const handleApplyScaling = (percent) => {
    if (isReadOnly || !currentSchedule) return;
    const factor = 1 + Number(percent) / 100;
    const matrix = { ...(currentSchedule.matrix || {}) };

    Object.keys(matrix).forEach((mKey) => {
      matrix[mKey] = { ...matrix[mKey] };
      Object.keys(matrix[mKey]).forEach((wKey) => {
        const val = parseFloat(matrix[mKey][wKey]);
        if (!isNaN(val)) {
          matrix[mKey][wKey] = (val * factor).toFixed(2);
        }
      });
    });

    handleUpdateCurrent({ matrix });
  };

  return (
    <div className="space-y-6">
      {/* Header and Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Distance Rates</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure mileage and shipment weight/volume rate matrices for intrastate and interstate long-distance moves.
          </p>
        </div>
        {!isReadOnly && (
          <button
            type="button"
            onClick={handleAddSchedule}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition dark:bg-blue-600"
          >
            <Plus size={14} /> Add Schedule
          </button>
        )}
      </div>

      {/* Schedule Tabs */}
      {distanceSchedules.length > 0 ? (
        <>
          <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-2">
            {distanceSchedules.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveScheduleId(s.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                  (currentSchedule?.id === s.id)
                    ? 'bg-brand-navy text-white shadow-sm dark:bg-blue-600'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {currentSchedule && (
            <div className="space-y-4">
              {/* Schedule Metadata */}
              <div className="grid gap-4 sm:grid-cols-3 p-4 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Schedule Name
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={currentSchedule.name}
                    onChange={(e) => handleUpdateCurrent({ name: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Rate Type
                  </label>
                  <select
                    disabled={isReadOnly}
                    value={currentSchedule.rate_type}
                    onChange={(e) => handleUpdateCurrent({ rate_type: e.target.value })}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  >
                    {RATE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end justify-between">
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      disabled={isReadOnly}
                      checked={currentSchedule.enable_breakpoints !== false}
                      onChange={(e) => handleUpdateCurrent({ enable_breakpoints: e.target.checked })}
                      className="rounded text-brand-blue focus:ring-brand-blue"
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-white">Enable Breakpoints</span>
                  </label>
                  {!isReadOnly && distanceSchedules.length > 1 && (
                    <button
                      type="button"
                      onClick={handleDeleteCurrent}
                      className="text-xs font-semibold text-rose-600 hover:underline pb-2"
                    >
                      Delete Schedule
                    </button>
                  )}
                </div>
              </div>

              {/* Auto-scaling Utility Bar */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center gap-2 text-xs">
                  <Percent size={14} className="text-brand-blue" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Auto-Scale Rates:</span>
                  <input
                    type="number"
                    step="0.5"
                    disabled={isReadOnly}
                    value={scalePct}
                    onChange={(e) => setScalePct(e.target.value)}
                    className="w-16 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs text-center dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <span className="text-slate-500">%</span>
                  {!isReadOnly && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApplyScaling(scalePct)}
                        className="rounded bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200"
                      >
                        +{scalePct}%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyScaling(`-${scalePct}`)}
                        className="rounded bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200"
                      >
                        -{scalePct}%
                      </button>
                    </>
                  )}
                </div>
                <span className="text-[11px] text-slate-400">Values scale proportionally; cells remain manually editable.</span>
              </div>

              {/* 2D Rate Matrix */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 text-[11px] uppercase tracking-wide dark:border-slate-800 dark:bg-slate-900/50">
                        <th scope="col" className="py-2.5 px-3 text-left w-32">Miles \ Weight</th>
                        {(currentSchedule.weight_bands || []).map((wBand, wIdx) => (
                          <th key={wIdx} scope="col" className="py-2.5 px-2 text-center">{wBand}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(currentSchedule.mileage_bands || []).map((mBand, mIdx) => (
                        <tr key={mIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">{mBand}</td>
                          {(currentSchedule.weight_bands || []).map((_, wIdx) => {
                            const val = currentSchedule.matrix?.[String(mIdx)]?.[String(wIdx)] ?? '';
                            return (
                              <td key={wIdx} className="py-1 px-2 text-center">
                                <div className="relative">
                                  <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    disabled={isReadOnly}
                                    value={val}
                                    onChange={(e) => handleCellChange(mIdx, wIdx, e.target.value)}
                                    placeholder="0.00"
                                    className="w-full text-center rounded border border-slate-200 bg-white py-1 pl-4 pr-1 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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

              {/* Overage Charges */}
              <div className="grid gap-4 sm:grid-cols-2 p-4 rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Charge per Additional 100 lbs (above max weight tier)
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      disabled={isReadOnly}
                      value={currentSchedule.overage_per_cwt || ''}
                      onChange={(e) => handleUpdateCurrent({ overage_per_cwt: e.target.value })}
                      placeholder="2.50"
                      className="w-full rounded border border-slate-300 bg-white pl-7 pr-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Charge per Additional Mile (above max mileage tier)
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      disabled={isReadOnly}
                      value={currentSchedule.overage_per_mile || ''}
                      onChange={(e) => handleUpdateCurrent({ overage_per_mile: e.target.value })}
                      placeholder="1.75"
                      className="w-full rounded border border-slate-300 bg-white pl-7 pr-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="p-8 text-center text-xs text-slate-500">
          No distance schedules configured. Click &quot;Add Schedule&quot; to create one.
        </div>
      )}
    </div>
  );
}
