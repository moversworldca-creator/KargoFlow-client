import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Calendar, Check, Copy, GripVertical, Plus, Trash2 } from 'lucide-react';

export default function PeriodsSection({ config, onChange, isReadOnly }) {
  const periods = config.periods || [];
  const [editingId, setEditingId] = useState(null);

  const setPeriods = (updated) => {
    onChange({
      ...config,
      periods: updated,
    });
  };

  const handleAddPeriod = () => {
    const newId = `period_${Date.now()}`;
    const newPeriod = {
      id: newId,
      name: `Peak Season ${periods.length}`,
      is_default: false,
      is_active: true,
      priority: periods.length + 1,
      date_type: 'range', // "range" | "single"
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    };
    // Insert before default period (default is lowest priority / fallback)
    const nonDefault = periods.filter((p) => !p.is_default);
    const defaultP = periods.find((p) => p.is_default) || {
      id: 'default',
      name: 'Default (All Dates)',
      is_default: true,
      is_active: true,
      priority: 999,
      date_type: 'all',
    };
    const next = [...nonDefault, newPeriod, defaultP].map((p, idx) => ({
      ...p,
      priority: idx + 1,
    }));
    setPeriods(next);
    setEditingId(newId);
  };

  const handleToggleActive = (id) => {
    if (isReadOnly) return;
    setPeriods(
      periods.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p))
    );
  };

  const handleDelete = (id) => {
    if (isReadOnly) return;
    setPeriods(periods.filter((p) => p.id !== id || p.is_default));
  };

  const handleMove = (index, direction) => {
    if (isReadOnly) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= periods.length) return;
    // Don't move past or swap the default period
    if (periods[index].is_default || periods[targetIndex].is_default) return;

    const copy = [...periods];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    // Re-assign priorities
    setPeriods(copy.map((p, idx) => ({ ...p, priority: idx + 1 })));
  };

  const handleUpdate = (id, patch) => {
    setPeriods(periods.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Pricing Periods</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure seasonal dates (peak, holiday, off-peak). Periods are evaluated top-to-bottom; the first matching period applies.
          </p>
        </div>
        {!isReadOnly && (
          <button
            type="button"
            onClick={handleAddPeriod}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <Plus size={14} /> Add Period ({periods.length})
          </button>
        )}
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300">
        <strong>First-match priority rule:</strong> When pricing an estimate or job, KargoFlow evaluates the periods in the order listed below. The first active period whose date range covers the move date is chosen. The <em>Default</em> period applies to any dates not covered by custom periods.
      </div>

      <div className="space-y-3" role="list" aria-label="Pricing periods">
        {periods.map((period, index) => {
          const isDefault = period.is_default;
          const isEditing = editingId === period.id;

          return (
            <div
              key={period.id}
              role="listitem"
              className={`rounded-xl border transition-all ${
                period.is_active
                  ? 'border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'
                  : 'border-slate-200/60 bg-slate-50/60 opacity-60 dark:border-slate-800/60 dark:bg-slate-950'
              }`}
            >
              <div className="flex items-center gap-3 p-3">
                {/* Drag / Priority indicator */}
                <div className="flex items-center gap-1 text-slate-400">
                  <span className="w-5 text-center text-xs font-bold text-slate-400">{index + 1}</span>
                  {!isDefault && !isReadOnly && (
                    <div className="flex flex-col">
                      <button
                        type="button"
                        aria-label={`Move ${period.name} up`}
                        disabled={index === 0}
                        onClick={() => handleMove(index, -1)}
                        className="rounded p-0.5 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${period.name} down`}
                        disabled={index >= periods.length - 2} // Before default
                        onClick={() => handleMove(index, 1)}
                        className="rounded p-0.5 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Period Info & Quick edit */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                      {period.name}
                    </span>
                    {isDefault ? (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        Default Fallback
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {period.date_type === 'single'
                          ? `Date: ${period.start_date}`
                          : `${period.start_date} → ${period.end_date}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Toggle & Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {!isDefault && (
                    <button
                      type="button"
                      onClick={() => setEditingId(isEditing ? null : period.id)}
                      className="text-xs font-semibold text-brand-blue hover:underline px-2 py-1"
                    >
                      {isEditing ? 'Done' : 'Edit Dates'}
                    </button>
                  )}

                  <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={isDefault || isReadOnly}
                      checked={period.is_active}
                      onChange={() => handleToggleActive(period.id)}
                      className="rounded text-brand-blue focus:ring-brand-blue"
                    />
                    <span className="text-[11px] text-slate-500">{period.is_active ? 'Active' : 'Disabled'}</span>
                  </label>

                  {!isDefault && !isReadOnly && (
                    <button
                      type="button"
                      aria-label={`Delete ${period.name}`}
                      onClick={() => handleDelete(period.id)}
                      className="rounded p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Inline editor panel if open */}
              {isEditing && !isDefault && (
                <div className="border-t border-slate-100 bg-slate-50/70 p-3 rounded-b-xl dark:border-slate-800 dark:bg-slate-900/70 grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Period Name
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={period.name}
                      onChange={(e) => handleUpdate(period.id, { name: e.target.value })}
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Date Type
                    </label>
                    <select
                      disabled={isReadOnly}
                      value={period.date_type}
                      onChange={(e) => handleUpdate(period.id, { date_type: e.target.value })}
                      className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    >
                      <option value="range">Date Range</option>
                      <option value="single">Single Date</option>
                    </select>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        {period.date_type === 'single' ? 'Date' : 'Start Date'}
                      </label>
                      <input
                        type="date"
                        disabled={isReadOnly}
                        value={period.start_date || ''}
                        onChange={(e) => handleUpdate(period.id, { start_date: e.target.value })}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                    {period.date_type === 'range' && (
                      <div className="flex-1">
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          disabled={isReadOnly}
                          value={period.end_date || ''}
                          onChange={(e) => handleUpdate(period.id, { end_date: e.target.value })}
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
