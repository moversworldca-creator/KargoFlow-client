import React from 'react';
import {
  Cpu,
  Clock,
  Users,
  Truck,
  Plus,
  Trash2,
  Info,
  Sliders,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';

export default function AutoPricingEngineSection({ config, onChange, isReadOnly }) {
  const engine = config.auto_pricing_engine || {
    max_hours_per_job: '8.0',
    crew_ability_unit: 'cuft_per_hour',
    crew_ability: { '2': '150', '3': '225', '4': '300', '5': '375', '6': '450' },
    crew_required_thresholds: [],
    trucks_required_thresholds: [],
    auto_add_resources: true,
    additional_mover_rate: '45.00',
    additional_truck_rate: '50.00',
  };

  const updateEngine = (updates) => {
    onChange({
      ...config,
      auto_pricing_engine: {
        ...engine,
        ...updates,
      },
    });
  };

  const setCrewAbility = (crewSize, rate) => {
    updateEngine({
      crew_ability: {
        ...(engine.crew_ability || {}),
        [crewSize]: rate,
      },
    });
  };

  // Threshold helpers for crew
  const addCrewThreshold = () => {
    const list = Array.isArray(engine.crew_required_thresholds)
      ? [...engine.crew_required_thresholds]
      : [];
    list.push({ max_volume: 2000, min_crew: 4 });
    updateEngine({ crew_required_thresholds: list });
  };

  const updateCrewThreshold = (idx, field, val) => {
    const list = [...(engine.crew_required_thresholds || [])];
    list[idx] = { ...list[idx], [field]: Number(val) || 0 };
    updateEngine({ crew_required_thresholds: list });
  };

  const deleteCrewThreshold = (idx) => {
    const list = [...(engine.crew_required_thresholds || [])];
    list.splice(idx, 1);
    updateEngine({ crew_required_thresholds: list });
  };

  // Threshold helpers for trucks
  const addTruckThreshold = () => {
    const list = Array.isArray(engine.trucks_required_thresholds)
      ? [...engine.trucks_required_thresholds]
      : [];
    list.push({ max_volume: 2500, trucks: 2 });
    updateEngine({ trucks_required_thresholds: list });
  };

  const updateTruckThreshold = (idx, field, val) => {
    const list = [...(engine.trucks_required_thresholds || [])];
    list[idx] = { ...list[idx], [field]: Number(val) || 0 };
    updateEngine({ trucks_required_thresholds: list });
  };

  const deleteTruckThreshold = (idx) => {
    const list = [...(engine.trucks_required_thresholds || [])];
    list.splice(idx, 1);
    updateEngine({ trucks_required_thresholds: list });
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Auto-Pricing Engine
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Configures automatic calculation of labor duration, crew sizing, and truck assignments based on shipment volume or weight productivity factors.
        </p>
      </div>

      {/* Non-Labor Time Notice (AUTO-08) */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div>
          <span className="font-semibold">Non-Labor Time Rule (AUTO-08):</span> If non-labor duration (travel time, drive time, or mandatory prep) exceeds labor handling duration, the auto-pricing engine will <span className="underline font-semibold">not</span> add movers solely to compress the total job within maximum hours, because added movers cannot accelerate travel time.
        </div>
      </div>

      {/* Maximum Hours per Job (AUTO-01) & Automatic Resources Toggle (AUTO-05..07) */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <Clock className="h-4 w-4 text-brand-blue" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Maximum Hours Per Job (AUTO-01)
            </h4>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Target Maximum Labor Hours
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="4"
                max="16"
                disabled={isReadOnly}
                value={engine.max_hours_per_job || '8.0'}
                onChange={(e) => updateEngine({ max_hours_per_job: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white pl-3 pr-16 py-2 text-xs font-semibold text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                hours
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              When estimated job hours exceed this threshold, the auto-pricing engine attempts to increase crew size to complete the job within target hours.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <Cpu className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Resource Extension (AUTO-05..07)
            </h4>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={engine.auto_add_resources !== false}
              disabled={isReadOnly}
              onChange={(e) => updateEngine({ auto_add_resources: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
            />
            <div>
              <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                Automatically Add Resources Beyond Tariff Rows
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {engine.auto_add_resources !== false
                  ? 'Enabled: Price additional movers/trucks using per-additional rates when shipment exceeds table rows (AUTO-06).'
                  : 'Disabled: Restrict recommendations strictly within configured tariff rate table rows (AUTO-07).'}
              </p>
            </div>
          </label>

          {engine.auto_add_resources !== false && (
            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Additional Mover ($/hr)
                </label>
                <div className="relative mt-1">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                  <input
                    type="number"
                    step="1.00"
                    min="0"
                    disabled={isReadOnly}
                    value={engine.additional_mover_rate || '45.00'}
                    onChange={(e) => updateEngine({ additional_mover_rate: e.target.value })}
                    className="w-full rounded border border-slate-300 bg-white pl-6 pr-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Additional Truck ($/hr)
                </label>
                <div className="relative mt-1">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                  <input
                    type="number"
                    step="1.00"
                    min="0"
                    disabled={isReadOnly}
                    value={engine.additional_truck_rate || '50.00'}
                    onChange={(e) => updateEngine({ additional_truck_rate: e.target.value })}
                    className="w-full rounded border border-slate-300 bg-white pl-6 pr-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Crew Ability / Productivity Factors (AUTO-02) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-blue" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Crew Ability & Handling Speed (AUTO-02)
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Unit:</span>
            <select
              value={engine.crew_ability_unit || 'cuft_per_hour'}
              disabled={isReadOnly}
              onChange={(e) => updateEngine({ crew_ability_unit: e.target.value })}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="cuft_per_hour">Cubic Feet per Hour (cu ft / hr)</option>
              <option value="lbs_per_hour">Pounds per Hour (lbs / hr)</option>
            </select>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Define the expected loading & handling throughput for each crew size. Estimated labor hours = shipment volume ÷ crew handling rate.
        </p>

        <div className="grid gap-3 sm:grid-cols-5">
          {['2', '3', '4', '5', '6'].map((size) => {
            const currentVal = engine.crew_ability?.[size] || '150';
            return (
              <div key={size} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-center dark:border-slate-800 dark:bg-slate-800/40">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {size} Movers
                </span>
                <div className="relative mt-2">
                  <input
                    type="number"
                    step="25"
                    min="50"
                    disabled={isReadOnly}
                    value={currentVal}
                    onChange={(e) => setCrewAbility(size, e.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-center font-mono text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <span className="block mt-1 text-[10px] text-slate-400">
                    {engine.crew_ability_unit === 'lbs_per_hour' ? 'lbs / hr' : 'cu ft / hr'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Crew Required Thresholds (AUTO-03) & Trucks Required Thresholds (AUTO-04) */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Crew Thresholds */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Crew Required Thresholds (AUTO-03)
              </h4>
              <p className="text-[11px] text-slate-500">Minimum crew based on shipment volume</p>
            </div>
            {!isReadOnly && (
              <button
                type="button"
                onClick={addCrewThreshold}
                className="text-xs font-semibold text-brand-blue hover:underline"
              >
                + Add Tier
              </button>
            )}
          </div>

          <div className="space-y-2">
            {(engine.crew_required_thresholds || []).map((t, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 whitespace-nowrap">Up to</span>
                <input
                  type="number"
                  step="100"
                  value={t.max_volume}
                  disabled={isReadOnly}
                  onChange={(e) => updateCrewThreshold(idx, 'max_volume', e.target.value)}
                  className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-center dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <span className="text-slate-500 whitespace-nowrap">cu ft →</span>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={t.min_crew}
                  disabled={isReadOnly}
                  onChange={(e) => updateCrewThreshold(idx, 'min_crew', e.target.value)}
                  className="w-14 rounded border border-slate-300 bg-white px-2 py-1 text-center font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <span className="text-slate-700 dark:text-slate-300">Movers min</span>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => deleteCrewThreshold(idx)}
                    className="ml-auto text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Trucks Thresholds */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Trucks Required Thresholds (AUTO-04)
              </h4>
              <p className="text-[11px] text-slate-500">Fleet requirement based on shipment volume</p>
            </div>
            {!isReadOnly && (
              <button
                type="button"
                onClick={addTruckThreshold}
                className="text-xs font-semibold text-brand-blue hover:underline"
              >
                + Add Tier
              </button>
            )}
          </div>

          <div className="space-y-2">
            {(engine.trucks_required_thresholds || []).map((t, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 whitespace-nowrap">Up to</span>
                <input
                  type="number"
                  step="100"
                  value={t.max_volume}
                  disabled={isReadOnly}
                  onChange={(e) => updateTruckThreshold(idx, 'max_volume', e.target.value)}
                  className="w-20 rounded border border-slate-300 bg-white px-2 py-1 text-center dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <span className="text-slate-500 whitespace-nowrap">cu ft →</span>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={t.trucks}
                  disabled={isReadOnly}
                  onChange={(e) => updateTruckThreshold(idx, 'trucks', e.target.value)}
                  className="w-14 rounded border border-slate-300 bg-white px-2 py-1 text-center font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <span className="text-slate-700 dark:text-slate-300">Truck(s)</span>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => deleteTruckThreshold(idx)}
                    className="ml-auto text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
