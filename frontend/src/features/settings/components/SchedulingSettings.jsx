import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import API from '../../../services/api';

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

const DEFAULT_CONFIG = {
  scheduling_horizon_days: 90,
  weekly_windows: [],
  default_arrival_window: { start: '', end: '' },
};

const createRowId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const normalizeTime = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '';
  return `${match[1].padStart(2, '0')}:${match[2]}`;
};

const timeToMinutes = (value) => {
  const normalized = normalizeTime(value);
  if (!normalized) return null;
  const [hours, minutes] = normalized.split(':').map(Number);
  return hours * 60 + minutes;
};

const formatTime = (value) => {
  const normalized = normalizeTime(value);
  if (!normalized) return '-';
  const [hourValue, minute] = normalized.split(':').map(Number);
  const suffix = hourValue >= 12 ? 'PM' : 'AM';
  const hour = hourValue % 12 || 12;
  return `${hour}:${String(minute).padStart(2, '0')} ${suffix}`;
};

const normalizeConfig = (value = DEFAULT_CONFIG) => {
  const config = value && typeof value === 'object' ? value : DEFAULT_CONFIG;
  const horizon = Number(config.scheduling_horizon_days);
  const windows = Array.isArray(config.weekly_windows) ? config.weekly_windows : [];
  const defaultWindow = config.default_arrival_window && typeof config.default_arrival_window === 'object'
    ? config.default_arrival_window
    : DEFAULT_CONFIG.default_arrival_window;
  const defaultStart = normalizeTime(defaultWindow.start);
  const defaultEnd = normalizeTime(defaultWindow.end);
  const uniqueWindows = [];
  const seenKeys = new Set();

  windows.forEach((window) => {
    const start = normalizeTime(window.start);
    const end = normalizeTime(window.end);
    const capacity = Math.max(1, Math.round(Number(window.capacity) || 1));
    const key = `${start}-${end}`;
    if (!start || !end || seenKeys.has(key)) return;
    seenKeys.add(key);
    uniqueWindows.push({
      id: createRowId(),
      start,
      end,
      capacity,
    });
  });

  return {
    scheduling_horizon_days: Number.isFinite(horizon) ? Math.max(0, Math.round(horizon)) : DEFAULT_CONFIG.scheduling_horizon_days,
    weekly_windows: uniqueWindows,
    default_arrival_window: {
      start: defaultStart,
      end: defaultEnd,
    },
  };
};

const buildPayload = ({ horizonDays, windows, defaultWindowId }) => {
  const defaultWindow = windows.find((window) => window.id === defaultWindowId);
  const defaultStart = normalizeTime(defaultWindow?.start);
  const defaultEnd = normalizeTime(defaultWindow?.end);

  return {
    scheduling_horizon_days: Math.max(0, Math.round(Number(horizonDays) || 0)),
    default_arrival_window: {
      start: defaultStart,
      end: defaultEnd,
    },
    weekly_windows: windows
      .flatMap((window) => {
        const start = normalizeTime(window.start);
        const end = normalizeTime(window.end);
        const capacity = Math.max(1, Math.round(Number(window.capacity) || 1));
        if (!start || !end) return [];
        return WEEKDAYS.map((weekday) => ({
          weekday,
          start,
          end,
          capacity,
        }));
      })
      .sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start) || a.end.localeCompare(b.end)),
  };
};

const SchedulingSettings = ({ branchId = null }) => {
  const [branches, setBranches] = useState([]);
  const [internalBranchId, setInternalBranchId] = useState('');
  const [horizonDays, setHorizonDays] = useState(DEFAULT_CONFIG.scheduling_horizon_days);
  const [windows, setWindows] = useState([]);
  const [defaultWindowId, setDefaultWindowId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const activeBranchId = branchId ? String(branchId) : internalBranchId;
  const selectedBranch = useMemo(
    () => branches.find((branch) => String(branch.id) === activeBranchId) || null,
    [branches, activeBranchId],
  );

  const loadBranches = async () => {
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await API.general.getBranches();
      const list = Array.isArray(response?.results) ? response.results : Array.isArray(response) ? response : [];
      setBranches(list);
      if (!branchId) {
        const fallback = list.find((branch) => branch.is_main) || list[0];
        setInternalBranchId((current) => current || (fallback ? String(fallback.id) : ''));
      }
    } catch (err) {
      console.error('Failed to load arrival windows:', err);
      setMessage({ type: 'error', text: 'Failed to load arrival windows.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedBranch) {
      setHorizonDays(DEFAULT_CONFIG.scheduling_horizon_days);
      setWindows([]);
      setDefaultWindowId('');
      setIsDirty(false);
      return;
    }

    const config = normalizeConfig(selectedBranch.scheduling_config || DEFAULT_CONFIG);
    setHorizonDays(config.scheduling_horizon_days);
    setWindows(config.weekly_windows);
    const defaultRow = config.weekly_windows.find(
      (window) => window.start === config.default_arrival_window.start && window.end === config.default_arrival_window.end,
    );
    setDefaultWindowId(defaultRow?.id || '');
    setIsDirty(false);
  }, [selectedBranch]);

  const markDirty = (updater) => {
    setWindows(updater);
    setIsDirty(true);
  };

  const handleAddRow = () => {
    const row = {
      id: createRowId(),
      start: '08:00',
      end: '10:00',
      capacity: 1,
    };
    if (!windows.length) setDefaultWindowId(row.id);
    markDirty((prev) => [...prev, row]);
  };

  const handleUpdateRow = (id, field, value) => {
    markDirty((prev) => prev.map((window) => (window.id === id ? { ...window, [field]: value } : window)));
  };

  const handleDeleteRow = (id) => {
    if (defaultWindowId === id) {
      setDefaultWindowId('');
    }
    markDirty((prev) => prev.filter((window) => window.id !== id));
  };

  const handleSetDefault = (id) => {
    setDefaultWindowId(id);
    setIsDirty(true);
  };

  const validate = () => {
    const duplicateKeys = new Set();
    const seenKeys = new Set();

    for (const window of windows) {
      const start = normalizeTime(window.start);
      const end = normalizeTime(window.end);
      const startMinutes = timeToMinutes(start);
      const endMinutes = timeToMinutes(end);

      if (!start || !end || startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
        return 'Each row needs a valid start time before its end time.';
      }

      const key = `${start}-${end}`;
      if (seenKeys.has(key)) duplicateKeys.add(key);
      seenKeys.add(key);
    }

    if (duplicateKeys.size) {
      return 'Remove duplicate windows before saving.';
    }

    if (windows.length && !windows.some((window) => window.id === defaultWindowId)) {
      return 'Choose a default arrival window.';
    }

    return '';
  };

  const handleSave = async () => {
    if (!selectedBranch) {
      setMessage({ type: 'error', text: 'Select a branch before saving.' });
      return;
    }

    const validationMessage = validate();
    if (validationMessage) {
      setMessage({ type: 'error', text: validationMessage });
      return;
    }

    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = buildPayload({ horizonDays, windows, defaultWindowId });
      const updated = await API.general.updateBranch(selectedBranch.id, { scheduling_config: payload });
      setBranches((prev) => prev.map((branch) => (branch.id === selectedBranch.id ? updated : branch)));
      setMessage({ type: 'success', text: 'Arrival windows saved.' });
      setIsDirty(false);
    } catch (err) {
      console.error('Failed to save arrival windows:', err);
      const errorText = err?.response?.data?.scheduling_config || err?.response?.data?.detail || 'Failed to save arrival windows.';
      setMessage({ type: 'error', text: Array.isArray(errorText) ? errorText.join(' ') : String(errorText) });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 bg-white">
      {message.text && (
        <div
          className={`mb-3 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
          {!branchId && (
            <div className="space-y-1.5">
              <label className="ml-1 text-[0.625rem] font-bold uppercase tracking-widest text-body">Branch</label>
              <select
                value={internalBranchId}
                onChange={(event) => setInternalBranchId(event.target.value)}
                className="w-full rounded-lg border-b-2 border-transparent bg-white px-4 py-3 text-sm font-medium shadow-sm outline-none ring-1 ring-disabled/30 transition-all focus:border-primary focus:ring-0"
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="ml-1 text-[0.625rem] font-bold uppercase tracking-widest text-body">Scheduling Horizon</label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-disabled" size={18} />
              <input
                type="number"
                min="0"
                max="730"
                value={horizonDays}
                onChange={(event) => {
                  setHorizonDays(event.target.value);
                  setIsDirty(true);
                }}
                className="w-full rounded-lg border-b-2 border-transparent bg-white py-3 pl-11 pr-4 text-sm font-medium shadow-sm outline-none ring-1 ring-disabled/30 transition-all focus:border-primary focus:ring-0"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadBranches}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            type="button"
            onClick={handleAddRow}
            disabled={!selectedBranch || isSaving}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-primary-dark disabled:opacity-60"
          >
            <Plus size={16} /> Add Row
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedBranch || isSaving || !isDirty}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 disabled:opacity-60"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {!selectedBranch ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm font-medium text-slate-500">
          Add a branch before configuring arrival windows.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200/80 bg-white shadow-sm">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200/80 bg-[#f8f9fa]">
                <th className="w-[20%] px-5 py-4 text-xs font-medium uppercase tracking-wide text-slate-800">Start Hour</th>
                <th className="w-[20%] px-5 py-4 text-xs font-medium uppercase tracking-wide text-slate-800">End Hour</th>
                <th className="w-[15%] px-5 py-4 text-xs font-medium uppercase tracking-wide text-slate-800">Capacity</th>
                <th className="w-[27%] px-5 py-4 text-xs font-medium uppercase tracking-wide text-slate-800">Window</th>
                <th className="w-[13%] px-5 py-4 text-xs font-medium uppercase tracking-wide text-slate-800">Default</th>
                <th className="w-[5%] px-5 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60">
              {windows.map((window) => (
                <tr key={window.id} className="transition-colors hover:bg-slate-50/50">
                  <td className="px-5 py-4">
                    <input
                      type="time"
                      value={window.start}
                      onChange={(event) => handleUpdateRow(window.id, 'start', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-primary"
                    />
                  </td>
                  <td className="px-5 py-4">
                    <input
                      type="time"
                      value={window.end}
                      onChange={(event) => handleUpdateRow(window.id, 'end', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-primary"
                    />
                  </td>
                  <td className="px-5 py-4">
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={window.capacity}
                      onChange={(event) => handleUpdateRow(window.id, 'capacity', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-primary"
                    />
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                    {formatTime(window.start)} - {formatTime(window.end)}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => handleSetDefault(window.id)}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                        defaultWindowId === window.id
                          ? 'border-primary bg-primary text-white'
                          : 'border-slate-200 bg-white text-slate-400 hover:border-primary hover:text-primary'
                      }`}
                      title="Set as default arrival window"
                      aria-label="Set as default arrival window"
                    >
                      {defaultWindowId === window.id ? <Check size={16} /> : null}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDeleteRow(window.id)}
                      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-[#FDE8E8]/40 hover:text-[#791F1F]"
                      title="Delete row"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {!windows.length && (
                <tr>
                  <td colSpan="6" className="px-5 py-10 text-center">
                    <p className="text-sm font-semibold text-slate-700">No arrival windows configured.</p>
                    <p className="mt-1 text-xs text-slate-400">Add rows to make booking availability selectable for this branch.</p>
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-primary-dark"
                    >
                      <Plus size={16} /> Add First Row
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SchedulingSettings;
