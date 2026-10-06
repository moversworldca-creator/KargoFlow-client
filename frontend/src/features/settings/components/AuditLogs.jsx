import React, { useEffect, useMemo, useState } from 'react';
import {
  History,
  Search,
  Loader2,
  Calendar,
  Filter,
  FileText,
  User,
  ArrowRight,
  RotateCcw,
  ClipboardList,
  PlusCircle,
  PencilLine,
  Trash2,
  Shield,
  Sparkles,
} from 'lucide-react';
import Card from '../../../shared/ui/Card';
import { getAuditLogs } from '../../../services/api';

const ACTION_META = {
  CREATE: {
    label: 'Created',
    icon: PlusCircle,
    className: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  },
  UPDATE: {
    label: 'Updated',
    icon: PencilLine,
    className: 'bg-blue-500/10 text-blue-700 border-blue-200',
  },
  DELETE: {
    label: 'Deleted',
    icon: Trash2,
    className: 'bg-rose-500/10 text-rose-700 border-rose-200',
  },
};

const formatDateTime = (value) => {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatRelativeTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const countChangedFields = (changes) => {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) return 0;
  return Object.keys(changes).length;
};

const getChangePreview = (changes) => {
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) return [];
  return Object.entries(changes).slice(0, 3);
};

const AuditLogRow = ({ log }) => {
  const action = String(log.action || '').toUpperCase();
  const meta = ACTION_META[action] || ACTION_META.UPDATE;
  const ActionIcon = meta.icon;
  const fieldCount = countChangedFields(log.changes);
  const changedFields = getChangePreview(log.changes);

  return (
    <div className="group rounded-3xl border border-white/70 bg-white/90 p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:border-primary/15 hover:shadow-[0_20px_50px_rgba(15,23,42,0.10)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${meta.className}`}>
            <ActionIcon size={20} />
          </div>

          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-heading text-base font-bold text-heading">
                {log.user_details?.full_name || log.user_email || 'System'}{' '}
                <span className="font-medium text-body">
                  {meta.label.toLowerCase()}
                </span>{' '}
                {log.model_name || 'record'}
              </h3>
              <span className="rounded-full border border-subtle bg-page px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-body">
                {action || 'EVENT'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-body">
              <span className="inline-flex items-center gap-1.5">
                <User size={14} className="text-primary" />
                {log.user_email || 'System'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={14} className="text-primary" />
                {formatDateTime(log.created_at)}
              </span>
              {formatRelativeTime(log.created_at) && (
                <span className="text-xs font-semibold text-disabled">
                  {formatRelativeTime(log.created_at)}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full bg-primary-tint/15 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                {log.model_name || 'Unknown model'}
              </div>
              {log.object_id && (
                <div className="rounded-full bg-page px-3 py-1.5 text-xs font-semibold text-body">
                  Object #{log.object_id}
                </div>
              )}
              {fieldCount > 0 && (
                <div className="rounded-full bg-page px-3 py-1.5 text-xs font-semibold text-body">
                  {fieldCount} field{fieldCount === 1 ? '' : 's'} changed
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 lg:items-end">
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] ${meta.className}`}>
            <ActionIcon size={12} />
            {meta.label}
          </div>
          <div className="text-xs text-disabled">
            Audit entry #{log.id}
          </div>
        </div>
      </div>

      {changedFields.length > 0 && (
        <div className="mt-5 rounded-2xl border border-subtle bg-page/60 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-body/70">
            <ClipboardList size={12} />
            Changed fields
          </div>
          <div className="flex flex-wrap gap-2">
            {changedFields.map(([field, value]) => {
              const nextValue = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '');
              return (
                <div key={field} className="rounded-xl border border-white bg-white px-3 py-2 text-left shadow-sm">
                  <div className="text-[0.625rem] font-bold uppercase tracking-[0.16em] text-body/60">{field}</div>
                  <div className="mt-1 max-w-[20rem] truncate text-sm font-medium text-heading">
                    {nextValue || 'Updated'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await getAuditLogs();
        setLogs(Array.isArray(response) ? response : []);
      } catch (err) {
        console.error('Failed to fetch audit logs:', err);
        setError('Failed to load audit logs.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const modelOptions = useMemo(() => {
    const values = new Set();
    logs.forEach((log) => {
      if (log?.model_name) values.add(log.model_name);
    });
    return ['all', ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();

    return logs.filter((log) => {
      const action = String(log.action || '').toUpperCase();
      const modelName = String(log.model_name || '').toLowerCase();
      const userName = String(log.user_details?.full_name || log.user_email || '').toLowerCase();
      const objectId = String(log.object_id || '').toLowerCase();
      const changeText = JSON.stringify(log.changes || {}).toLowerCase();

      const matchesSearch =
        !needle ||
        userName.includes(needle) ||
        modelName.includes(needle) ||
        objectId.includes(needle) ||
        changeText.includes(needle);

      const matchesAction = actionFilter === 'all' || action === actionFilter;
      const matchesModel = modelFilter === 'all' || modelName === modelFilter.toLowerCase();

      return matchesSearch && matchesAction && matchesModel;
    });
  }, [logs, searchTerm, actionFilter, modelFilter]);

  const stats = useMemo(() => {
    const counts = logs.reduce(
      (acc, log) => {
        const action = String(log.action || '').toUpperCase();
        if (action === 'CREATE') acc.create += 1;
        else if (action === 'UPDATE') acc.update += 1;
        else if (action === 'DELETE') acc.delete += 1;
        return acc;
      },
      { create: 0, update: 0, delete: 0 }
    );

    return [
      { label: 'Total entries', value: logs.length, icon: History, tone: 'bg-slate-900 text-white' },
      { label: 'Creates', value: counts.create, icon: PlusCircle, tone: 'bg-emerald-500/10 text-emerald-700' },
      { label: 'Updates', value: counts.update, icon: PencilLine, tone: 'bg-blue-500/10 text-blue-700' },
      { label: 'Deletes', value: counts.delete, icon: Trash2, tone: 'bg-rose-500/10 text-rose-700' },
    ];
  }, [logs]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  const hasActiveFilters = searchTerm || actionFilter !== 'all' || modelFilter !== 'all';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-br from-[#0F1E33] via-[#172B49] to-[#254A78] px-6 py-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] md:px-8">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -left-10 top-0 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute right-6 top-8 h-36 w-36 rounded-full bg-[#88C7FF]/20 blur-3xl" />
        </div>

        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/80">
                <Shield size={12} />
                System Audit Trail
              </div>
              <div className="space-y-2">
                <h3 className="font-heading text-3xl md:text-4xl font-bold">Activity Log</h3>
                <p className="max-w-2xl text-sm leading-7 text-white/75">
                  Track who changed what, when it happened, and which fields were updated. Use filters to narrow the timeline quickly.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/85">
              <Sparkles size={16} className="text-[#FFD98A]" />
              Audit entries update in real time when the data changes.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[0.625rem] font-bold uppercase tracking-[0.2em] text-white/65">{item.label}</p>
                      <p className="mt-2 font-heading text-3xl font-bold">{item.value}</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-3">
                      <Icon size={18} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Card className="border border-white/70 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h4 className="text-lg font-heading font-bold text-heading">Search and filters</h4>
            <p className="text-sm text-body">Search by person, model, object id, or field names.</p>
          </div>

          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setActionFilter('all');
              setModelFilter('all');
            }}
            disabled={!hasActiveFilters}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-subtle bg-page px-4 py-2 text-sm font-bold text-body transition-colors hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw size={16} />
            Reset filters
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="relative xl:col-span-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-disabled" size={18} />
            <input
              type="text"
              placeholder="Search audit logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-subtle bg-white px-11 py-3.5 text-sm outline-none transition-all focus:border-primary"
            />
          </div>

          <div className="relative xl:col-span-3">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-disabled" size={18} />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full appearance-none rounded-2xl border border-subtle bg-white px-11 py-3.5 text-sm font-medium outline-none transition-all focus:border-primary"
            >
              <option value="all">All actions</option>
              <option value="CREATE">Created</option>
              <option value="UPDATE">Updated</option>
              <option value="DELETE">Deleted</option>
            </select>
          </div>

          <div className="relative xl:col-span-3">
            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-disabled" size={18} />
            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="w-full appearance-none rounded-2xl border border-subtle bg-white px-11 py-3.5 text-sm font-medium outline-none transition-all focus:border-primary"
            >
              {modelOptions.map((model) => (
                <option key={model} value={model}>
                  {model === 'all' ? 'All models' : model}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-subtle bg-card p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-tint/20 text-primary">
              <History size={28} />
            </div>
            <h4 className="mt-5 font-heading text-xl font-bold text-heading">
              {logs.length === 0 ? 'No audit logs yet' : 'No matching activity'}
            </h4>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-body">
              {logs.length === 0
                ? 'When users create, update, or delete records, those events will appear here.'
                : 'Try clearing filters or using a broader search term to find the activity you need.'}
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => <AuditLogRow key={log.id} log={log} />)
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
