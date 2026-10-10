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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');
  const [modelOptions, setModelOptions] = useState(['all']);
  const [serverStats, setServerStats] = useState({ total: 0, create: 0, update: 0, delete: 0 });
  const [error, setError] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch paginated audit logs from server
  useEffect(() => {
    let isSubscribed = true;
    setIsFetching(true);
    setError('');

    const params = {
      page,
      page_size: pageSize,
    };
    if (debouncedSearch) params.search = debouncedSearch;
    if (actionFilter !== 'all') params.action = actionFilter;
    if (modelFilter !== 'all') params.model_name = modelFilter;

    getAuditLogs(params)
      .then((response) => {
        if (!isSubscribed) return;
        if (response && typeof response === 'object' && !Array.isArray(response) && response.results) {
          setLogs(response.results || []);
          const count = Number(response.count ?? (response.results || []).length);
          setTotalCount(count);
          setTotalPages(Number(response.total_pages ?? Math.max(1, Math.ceil(count / pageSize))));
          if (response.stats) {
            setServerStats(response.stats);
          }
          if (Array.isArray(response.results)) {
            setModelOptions((prev) => {
              const set = new Set(prev);
              response.results.forEach((r) => {
                if (r.model_name) set.add(r.model_name);
              });
              return Array.from(set);
            });
          }
        } else if (Array.isArray(response)) {
          // Backward compatibility fallback for flat array
          const total = response.length;
          setTotalCount(total);
          setTotalPages(Math.max(1, Math.ceil(total / pageSize)));
          const start = (page - 1) * pageSize;
          setLogs(response.slice(start, start + pageSize));
          const counts = response.reduce(
            (acc, log) => {
              const act = String(log.action || '').toUpperCase();
              if (act === 'CREATE') acc.create += 1;
              else if (act === 'UPDATE') acc.update += 1;
              else if (act === 'DELETE') acc.delete += 1;
              return acc;
            },
            { create: 0, update: 0, delete: 0 }
          );
          setServerStats({ total, ...counts });
        } else {
          setLogs([]);
          setTotalCount(0);
          setTotalPages(1);
        }
      })
      .catch((err) => {
        if (!isSubscribed) return;
        console.error('Failed to fetch audit logs:', err);
        setError('Failed to load audit logs.');
      })
      .finally(() => {
        if (isSubscribed) {
          setIsLoading(false);
          setIsFetching(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [page, pageSize, debouncedSearch, actionFilter, modelFilter]);

  const stats = useMemo(() => [
    { label: 'Total entries', value: serverStats.total, icon: History, tone: 'bg-slate-900 text-white' },
    { label: 'Creates', value: serverStats.create, icon: PlusCircle, tone: 'bg-emerald-500/10 text-emerald-700' },
    { label: 'Updates', value: serverStats.update, icon: PencilLine, tone: 'bg-blue-500/10 text-blue-700' },
    { label: 'Deletes', value: serverStats.delete, icon: Trash2, tone: 'bg-rose-500/10 text-rose-700' },
  ], [serverStats]);

  const hasActiveFilters = Boolean(searchTerm || actionFilter !== 'all' || modelFilter !== 'all');

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setActionFilter('all');
    setModelFilter('all');
    setPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleActionChange = (e) => {
    setActionFilter(e.target.value);
    setPage(1);
  };

  const handleModelChange = (e) => {
    setModelFilter(e.target.value);
    setPage(1);
  };

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  // Generate page numbers for pagination bar
  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i += 1) pages.push(i);
    } else {
      let start = Math.max(1, page - 2);
      let end = Math.min(totalPages, page + 2);
      if (page <= 3) {
        start = 1;
        end = maxVisible;
      } else if (page >= totalPages - 2) {
        start = totalPages - maxVisible + 1;
        end = totalPages;
      }
      for (let i = start; i <= end; i += 1) pages.push(i);
    }
    return pages;
  }, [page, totalPages]);

  const startIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalCount);

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

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
              Audit entries update in real time when data changes.
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
                      <p className="mt-2 font-heading text-3xl font-bold">{item.value.toLocaleString()}</p>
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
            <p className="text-sm text-body">Search by person, model, object id, or action.</p>
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
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
              onChange={handleSearchChange}
              className="w-full rounded-2xl border border-subtle bg-white px-11 py-3.5 text-sm outline-none transition-all focus:border-primary"
            />
          </div>

          <div className="relative xl:col-span-3">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-disabled" size={18} />
            <select
              value={actionFilter}
              onChange={handleActionChange}
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
              onChange={handleModelChange}
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

      {/* Log items container with fetching state overlay */}
      <div className="relative space-y-4">
        {isFetching && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-white/50 backdrop-blur-[1px]">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        )}

        {logs.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-subtle bg-card p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-tint/20 text-primary">
              <History size={28} />
            </div>
            <h4 className="mt-5 font-heading text-xl font-bold text-heading">
              {totalCount === 0 && !hasActiveFilters ? 'No audit logs yet' : 'No matching activity'}
            </h4>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-body">
              {totalCount === 0 && !hasActiveFilters
                ? 'When users create, update, or delete records, those events will appear here.'
                : 'Try clearing filters or using a broader search term to find the activity you need.'}
            </p>
          </div>
        ) : (
          logs.map((log) => <AuditLogRow key={log.id} log={log} />)
        )}
      </div>

      {/* Pagination Footer */}
      {totalCount > 0 && (
        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-subtle bg-white px-5 py-4 shadow-sm sm:flex-row">
          <div className="flex items-center gap-4 text-xs font-medium text-body">
            <span>
              Showing <strong className="font-bold text-heading">{startIndex}</strong> to{' '}
              <strong className="font-bold text-heading">{endIndex}</strong> of{' '}
              <strong className="font-bold text-heading">{totalCount.toLocaleString()}</strong> entries
            </span>

            <div className="flex items-center gap-1.5 border-l border-subtle pl-4">
              <span className="text-body/70">Per page:</span>
              <select
                value={pageSize}
                onChange={handlePageSizeChange}
                className="rounded-lg border border-subtle bg-page px-2 py-1 text-xs font-bold text-heading outline-none focus:border-primary"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(1)}
              disabled={page === 1 || isFetching}
              title="First Page"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-subtle bg-page text-body transition-colors hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1 || isFetching}
              title="Previous Page"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-subtle bg-page text-body transition-colors hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1 px-1">
              {pageNumbers.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  disabled={isFetching}
                  className={`h-8 min-w-[2rem] rounded-xl px-2 text-xs font-bold transition-all ${
                    p === page
                      ? 'bg-primary text-white shadow-sm'
                      : 'border border-subtle bg-page text-body hover:bg-subtle'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || isFetching}
              title="Next Page"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-subtle bg-page text-body transition-colors hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages || isFetching}
              title="Last Page"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-subtle bg-page text-body transition-colors hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
