import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { getUserBranchIds } from '../../../shared/utils/branchScope';
import {
  Activity,
  Zap,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Truck,
  CalendarClock,
  UserPlus,
  FileText,
  CalendarCheck,
  XCircle,
  AlertTriangle,
  User,
  Phone,
  ArrowRight,
  Search,
  Bell,
  Clock,
  ChevronRight,
  Plus,
  RefreshCw,
  Building2,
  ExternalLink,
  X,
  CheckCircle2,
  SlidersHorizontal,
  Calendar,
  Receipt
} from 'lucide-react';
import { getDashboardSummary } from '../../../services/api';

/* ---------- Native Lucide Icon Helper ---------- */
const IconMap = {
  'activity': Activity,
  'zap': Zap,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'dollar-sign': DollarSign,
  'target': Target,
  'truck': Truck,
  'calendar-clock': CalendarClock,
  'user-plus': UserPlus,
  'file-text': FileText,
  'calendar-check-2': CalendarCheck,
  'x-circle': XCircle,
  'alert-triangle': AlertTriangle,
  'user': User,
  'phone': Phone,
  'arrow-right': ArrowRight,
  'search': Search,
  'bell': Bell,
  'clock': Clock,
  'chevron-right': ChevronRight,
  'plus': Plus,
  'refresh-cw': RefreshCw,
  'building-2': Building2,
  'external-link': ExternalLink,
  'x': X,
  'check-circle-2': CheckCircle2,
  'calendar': Calendar,
  'receipt': Receipt,
};

function Icon({ name, className = "w-4 h-4", strokeWidth = 2 }) {
  const IconComponent = IconMap[name];
  if (!IconComponent) return null;
  return <IconComponent className={className} strokeWidth={strokeWidth} />;
}

const fmtMoney = (n) =>
  `$${Math.round(n || 0).toLocaleString("en-CA")}`;
const fmtMoneyShort = (n) => {
  const val = Number(n) || 0;
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000)     return `$${(val / 1_000).toFixed(1)}k`;
  return `$${Math.round(val).toLocaleString("en-CA")}`;
};

const ALL_BRANCHES = 'all';
const REFRESH_INTERVAL_MS = 30000;

/* ===========================================================
   1. Page Header with Unified Telemetry & Actions
   =========================================================== */
function DashboardHeader({ 
  branches, 
  selectedBranchId, 
  onBranchChange, 
  activeJobsCount,
  isRealTime,
  onRealTimeToggle,
  isSyncing,
  lastUpdated,
  onRefresh,
  syncError,
  isRefreshing
}) {
  const today = new Date();
  const dateFormatted = today.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });
  const navigate = useNavigate();
  const selectedBranch = branches.find((b) => String(b.id) === String(selectedBranchId));
  const selectedBranchLabel = selectedBranchId === ALL_BRANCHES
    ? 'All Branches'
    : selectedBranch?.name || `Branch #${selectedBranchId}`;

  return (
    <header className="flex flex-col gap-4 pb-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Dashboard</h1>
            <span className="text-xs text-slate-400 font-medium hidden md:inline">·</span>
            <span className="text-xs text-slate-500 font-medium hidden md:inline">{selectedBranchLabel}</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 font-medium">{dateFormatted}</p>
        </div>

        {/* Action & Telemetry Cluster */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Branch Select */}
          <div className="relative inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-xs hover:border-slate-300 transition-colors">
            <Building2 className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
            <label htmlFor="branch-select" className="sr-only">Branch</label>
            <select
              id="branch-select"
              aria-label="Branch"
              value={selectedBranchId}
              onChange={(e) => onBranchChange(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 outline-none cursor-pointer pr-1"
            >
              <option value={ALL_BRANCHES}>All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Sync / Live Status Pill */}
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-xs">
            <span className="relative flex h-2 w-2 shrink-0">
              {isRealTime && !syncError && (
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSyncing ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                syncError ? 'bg-rose-500' : (isRealTime ? (isSyncing ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-slate-400')
              }`} />
            </span>
            <span className="text-[11px] font-semibold text-slate-600 select-none">
              {syncError ? 'Sync Error' : (isRealTime ? (isSyncing ? 'Syncing...' : 'Live') : 'Paused')}
            </span>

            <div className="h-3.5 w-px bg-slate-200 mx-0.5" />

            <button
              type="button"
              onClick={() => onRealTimeToggle(!isRealTime)}
              className="text-[10px] font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer select-none"
              title={isRealTime ? "Pause 30s auto-refresh" : "Enable 30s auto-refresh"}
            >
              {isRealTime ? "Pause" : "Live"}
            </button>

            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing || isSyncing}
              className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-50 p-0.5"
              title={lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Refresh dashboard'}
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing || isSyncing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>

          {/* Active Jobs Badge (Clickable) */}
          <button
            type="button"
            onClick={() => navigate('/jobs')}
            className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-xs hover:border-slate-300 hover:bg-slate-50/80 transition-all cursor-pointer text-left group"
            title="View today's active jobs"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
              <Truck className="w-3 h-3" />
            </span>
            <span className="text-[11px] font-medium text-slate-600">
              Active today: <span className="font-mono font-bold tabular-nums text-slate-900">{activeJobsCount}</span>
            </span>
            <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-slate-600 transition-colors -ml-0.5" />
          </button>

          {/* Primary Action: Instant Booking */}
          <button
            type="button"
            onClick={() => navigate('/leads/new')}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 active:scale-98 transition-all cursor-pointer whitespace-nowrap"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Instant booking</span>
          </button>
        </div>
      </div>

      {/* Quick Navigation Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs text-slate-600 scrollbar-none">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 shrink-0">Quick Access:</span>
        <button
          type="button"
          onClick={() => navigate('/leads/table/pipeline')}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/80 hover:bg-slate-200/70 text-slate-700 transition-colors font-medium cursor-pointer shrink-0"
        >
          <Target className="w-3 h-3 text-blue-600" />
          <span>Pipeline & Quotes</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/jobs')}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/80 hover:bg-slate-200/70 text-slate-700 transition-colors font-medium cursor-pointer shrink-0"
        >
          <Calendar className="w-3 h-3 text-emerald-600" />
          <span>Dispatch & Jobs</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/accounting/invoices')}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/80 hover:bg-slate-200/70 text-slate-700 transition-colors font-medium cursor-pointer shrink-0"
        >
          <Receipt className="w-3 h-3 text-violet-600" />
          <span>Billing & Invoices</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/leads/new')}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/80 hover:bg-slate-200/70 text-slate-700 transition-colors font-medium cursor-pointer shrink-0"
        >
          <UserPlus className="w-3 h-3 text-amber-600" />
          <span>New Lead</span>
        </button>
      </div>
    </header>
  );
}

/* ===========================================================
   2. Top KPI Bento Grid with Direct Drilldown
   =========================================================== */
function DeltaBadge({ value, suffix = "%" }) {
  if (value == null) return null;
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold font-mono tabular-nums ${
      up ? "text-emerald-600" : "text-rose-600"
    }`}>
      <Icon name={up ? "trending-up" : "trending-down"} className="w-3 h-3" />
      {up ? "+" : ""}{value.toFixed(1)}{suffix}
    </span>
  );
}

function KpiCard({ icon, tint, label, value, sub, delta, deltaSuffix, onClick, hint }) {
  return (
    <div 
      onClick={onClick}
      className={`rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs transition-all duration-150 ${
        onClick ? 'hover:border-slate-300 hover:shadow-md cursor-pointer group' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 ${tint} transition-transform duration-150 ${onClick ? 'group-hover:scale-105' : ''}`}>
          <Icon name={icon} className="w-4 h-4" />
        </span>
        <div className="flex items-center gap-1.5">
          {delta != null && <DeltaBadge value={delta} suffix={deltaSuffix} />}
          {onClick && (
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
          )}
        </div>
      </div>
      <div className="mt-3.5">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</div>
        <div className="mt-1 font-mono text-2xl font-bold tracking-tight tabular-nums text-slate-900">{value}</div>
        {sub && (
          <div className="mt-1 text-xs text-slate-500 font-medium truncate" title={sub}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiBento({ todayStats, conversionStats, monthStats }) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        icon="dollar-sign"
        tint="text-emerald-700"
        label="Revenue today"
        value={fmtMoney(todayStats.revenue)}
        sub={`vs. ${fmtMoney(todayStats.yesterdayRevenue)} yesterday`}
        delta={todayStats.revenueDelta}
        onClick={() => navigate('/accounting/invoices')}
        hint="View invoices & payments"
      />
      <KpiCard
        icon="target"
        tint="text-blue-700"
        label="Conversion rate"
        value={`${conversionStats.rate}%`}
        sub={`${conversionStats.booked} of ${conversionStats.quotes} quotes booked`}
        delta={conversionStats.delta}
        onClick={() => navigate('/leads/table/pipeline')}
        hint="View quotes pipeline"
      />
      <KpiCard
        icon="truck"
        tint="text-violet-700"
        label="Moves this month"
        value={monthStats.moves}
        sub={`${fmtMoneyShort(monthStats.value)} booked · target ${monthStats.target}`}
        delta={monthStats.delta}
        onClick={() => navigate('/jobs')}
        hint="View booked jobs"
      />
      <KpiCard
        icon="calendar-clock"
        tint="text-amber-700"
        label="Jobs today"
        value={todayStats.activeJobs}
        sub={`${todayStats.booked} booked · ${todayStats.canceled} canceled`}
        onClick={() => navigate('/jobs')}
        hint="View dispatch schedule"
      />
    </div>
  );
}

/* ===========================================================
   3. Revenue Chart Section (with Days / Weeks / Months / Years)
   =========================================================== */
function RevenueChart({ revenueHistory = [] }) {
  // 'weeks' is default to match existing expectations
  const [mode, setMode] = useState('weeks'); // 'days' | 'weeks' | 'months' | 'years'
  const [hovered, setHovered] = useState(null);

  const chartData = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthFull = today.toLocaleString('en-US', { month: 'long' });
    const normalizeItems = (items = []) => items.map((item) => ({
      ...item,
      v: Number(item?.v) || 0,
      jobs: Number(item?.jobs) || 0,
      today: Boolean(item?.today),
    }));
    const legacyDays = Array.isArray(revenueHistory) ? normalizeItems(revenueHistory) : [];
    const history = revenueHistory && !Array.isArray(revenueHistory) ? revenueHistory : {};

    if (mode === 'days') {
      const items = normalizeItems(history.days || legacyDays);
      return {
        headerTitle: `Daily Revenue This Week`,
        avgLabel: 'Daily avg',
        items
      };
    }

    if (mode === 'weeks') {
      const items = normalizeItems(history.weeks || legacyDays);
      return {
        headerTitle: `Weeks of ${currentMonthFull} ${currentYear}`,
        avgLabel: 'Weekly avg',
        items
      };
    }

    if (mode === 'months') {
      const items = normalizeItems(history.months);
      return {
        headerTitle: `Months of ${currentYear}`,
        avgLabel: 'Monthly avg',
        items
      };
    }

    // mode === 'years'
    const items = normalizeItems(history.years);
    const startYear = items[0]?.d || currentYear - 4;
    const endYear = items[items.length - 1]?.d || currentYear;

    return {
      headerTitle: `Yearly Revenue History (${startYear} - ${endYear})`,
      avgLabel: 'Yearly avg',
      items
    };
  }, [mode, revenueHistory]);

  const items = chartData.items;
  const maxValue = Math.max(...items.map(d => d.v), 0);
  const chartMax = maxValue > 0 ? maxValue : 1000;
  const total = items.reduce((a, b) => a + b.v, 0);
  const avg = items.length ? total / items.length : 0;

  // y-axis ticks
  const ticks = [1, 0.75, 0.5, 0.25, 0].map(t => Math.round((chartMax * t) / 1000) * 1000);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Revenue history</div>
          <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">{chartData.headerTitle}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total</div>
            <div className="font-mono text-base font-bold tabular-nums text-slate-900">{fmtMoney(total)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{chartData.avgLabel}</div>
            <div className="font-mono text-base font-bold tabular-nums text-slate-900">{fmtMoney(avg)}</div>
          </div>

          {/* Segmented Filter Control */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('days')}
              className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                mode === 'days' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Days
            </button>
            <button
              type="button"
              onClick={() => setMode('weeks')}
              className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                mode === 'weeks' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Weeks
            </button>
            <button
              type="button"
              onClick={() => setMode('months')}
              className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                mode === 'months' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Months
            </button>
            <button
              type="button"
              onClick={() => setMode('years')}
              className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                mode === 'years' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Years
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex h-64">
        {/* Y axis labels */}
        <div className="mr-3 flex w-12 flex-col justify-between py-1 text-right text-[10px] font-medium text-slate-400">
          {ticks.map((v, i) => (
            <span key={i} className="font-mono tabular-nums">{fmtMoneyShort(v)}</span>
          ))}
        </div>

        {/* Plot area */}
        <div className="relative flex-1">
          {/* Subtle horizontal gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <div
              key={t}
              className="absolute left-0 right-0 border-t border-slate-100"
              style={{ top: `${t * 100}%` }}
            />
          ))}

          {/* Average reference line (stable, no jitter) */}
          {avg > 0 && chartMax > 0 && (
            <div
              className="absolute left-0 right-0 border-t border-dashed border-emerald-400/80 z-5"
              style={{ top: `${Math.max(4, Math.min(96, (1 - avg / chartMax) * 100))}%` }}
            >
              <span className="absolute -top-3 right-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200/60 font-mono tabular-nums">
                AVG · {fmtMoneyShort(avg)}
              </span>
            </div>
          )}

          {/* Bars */}
          <div className="absolute inset-0 flex items-end gap-2 px-1">
            {items.map((d, i) => {
              const h = maxValue > 0 ? (d.v / chartMax) * 100 : 0;
              const isHover = hovered === i;
              return (
                <div
                  key={i}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  className="group relative h-full flex-1 cursor-pointer flex items-end"
                >
                  <div
                    className={`w-full rounded-t-md transition-all duration-150 ${
                      d.today
                        ? "bg-blue-600 shadow-sm shadow-blue-200"
                        : isHover
                          ? "bg-slate-700 shadow-xs"
                          : "bg-slate-200 group-hover:bg-slate-300"
                    }`}
                    style={{ height: `${d.v > 0 ? Math.max(h, 4) : 0}%` }}
                  />

                  {/* Refined Tooltip */}
                  {isHover && (
                    <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-xl ring-1 ring-white/10">
                      <div className="text-[10px] text-slate-400 font-medium">{d.full || d.d}</div>
                      <div className="font-mono tabular-nums text-sm font-bold text-white mt-0.5">{fmtMoney(d.v)}</div>
                      <div className="text-[10px] text-slate-300 font-medium mt-0.5 flex items-center gap-1.5">
                        <Truck className="w-3 h-3 text-slate-400" />
                        <span>{d.jobs} {d.jobs === 1 ? 'job' : 'jobs'}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* X axis */}
      <div className="ml-[60px] mt-2 flex gap-2 px-1 border-t border-slate-100 pt-2">
        {items.map((d, i) => (
          <div key={i} className={`flex-1 text-center text-[10px] font-semibold truncate ${
            d.today ? "text-blue-700 font-bold" : "text-slate-400"
          }`}>
            {d.d}
            {d.today && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-600 align-middle" />}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ===========================================================
   4. Revenue Leaderboard with Working "View All" Modal
   =========================================================== */
function RepsModal({ isOpen, onClose, reps = [] }) {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  if (!isOpen) return null;

  const filtered = reps.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) || 
    r.initials.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Sales Representatives</h3>
            <p className="text-xs text-slate-500 mt-0.5">Performance and revenue rankings this month</p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search representative..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-slate-400"
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-2">
          {filtered.map((r, i) => (
            <div 
              key={r.id || i}
              onClick={() => {
                onClose();
                navigate('/leads/table/pipeline');
              }}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <span className="w-5 text-center font-mono text-xs font-bold text-slate-400">{i + 1}</span>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200">
                  {r.initials}
                </span>
                <div>
                  <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{r.name}</div>
                  <div className="text-xs text-slate-500 font-mono tabular-nums">{r.deals} closed deals</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-bold tabular-nums text-slate-900">{fmtMoney(r.revenue)}</div>
                <div className={`font-mono text-xs font-semibold ${r.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {r.delta >= 0 ? '+' : ''}{r.delta.toFixed(1)}% vs prev
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400">
              No sales representatives found.
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">{reps.length} active sales reps</span>
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/leads');
            }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Open Leads Pipeline</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Leaderboard({ reps = [] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const max = Math.max(...reps.map(r => r.revenue), 1000);

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Revenue leaderboard</div>
            <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Top reps this month</h3>
          </div>
          <button 
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition cursor-pointer"
          >
            View all
          </button>
        </div>

        <ul className="mt-4 space-y-3">
          {reps.map((r, i) => (
            <li 
              key={r.id || i} 
              onClick={() => navigate('/leads/table/pipeline')}
              className="flex items-center gap-3 p-1.5 -mx-1.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
              title={`View ${r.name}'s deals`}
            >
              <span className="w-4 text-center font-mono text-xs font-bold text-slate-400">{i + 1}</span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700 border border-slate-200">
                {r.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{r.name}</span>
                  <span className="font-mono text-xs font-bold tabular-nums text-slate-900">{fmtMoneyShort(r.revenue)}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${i === 0 ? "bg-blue-600" : "bg-slate-400"}`}
                      style={{ width: `${Math.min(100, Math.max(4, (r.revenue / max) * 100))}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 font-mono tabular-nums">{r.deals} deals</span>
                  <span className={`font-mono text-[10px] font-bold tabular-nums ${r.delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {r.delta >= 0 ? "+" : ""}{r.delta.toFixed(1)}%
                  </span>
                </div>
              </div>
            </li>
          ))}

          {reps.length === 0 && (
            <li className="py-6 text-center text-xs text-slate-400">
              No sales representative records found.
            </li>
          )}
        </ul>
      </section>

      <RepsModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        reps={reps} 
      />
    </>
  );
}

/* ===========================================================
   5. Funnel Velocity Table with Interactive Row Navigation
   =========================================================== */
function ActivityTable({ activity }) {
  const navigate = useNavigate();
  const { headers, rows } = activity;

  const handleRowClick = (label) => {
    switch (label?.toLowerCase()) {
      case 'leads':
        navigate('/leads/table/all-leads');
        break;
      case 'quotes':
        navigate('/leads/table/pipeline');
        break;
      case 'booked':
        navigate('/leads/table/booked');
        break;
      case 'canceled':
        navigate('/leads/table/all-leads');
        break;
      default:
        navigate('/leads');
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Activity</div>
          <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Funnel velocity</h3>
        </div>
        <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">Click row to filter</span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="pb-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Stage</th>
              {headers.map((h) => (
                <th key={h} className="pb-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
              ))}
              <th className="pb-2.5 w-6"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr 
                key={r.label} 
                onClick={() => handleRowClick(r.label)}
                className="text-sm hover:bg-slate-50 transition-colors cursor-pointer group"
                title={`Filter ${r.label.toLowerCase()} leads`}
              >
                <td className="py-2.5 pr-2">
                  <span className="inline-flex items-center gap-2.5">
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition-transform duration-150 group-hover:scale-105 ${
                      r.label === "Canceled" ? "bg-rose-50 text-rose-600" :
                      r.label === "Booked"   ? "bg-emerald-50 text-emerald-700" :
                      r.label === "Quotes"   ? "bg-blue-50 text-blue-700" :
                                               "bg-slate-100 text-slate-600"
                    }`}>
                      <Icon name={r.icon} className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{r.label}</span>
                  </span>
                </td>
                <td className="py-2.5 text-right font-mono font-bold tabular-nums text-slate-900">{r.today}</td>
                <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">{r.week}</td>
                <td className="py-2.5 text-right font-mono tabular-nums text-slate-500">{r.month}</td>
                <td className="py-2.5 text-right pl-1">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors inline-block" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ===========================================================
   6. Pipeline Alert Card with Working Snooze & Resolve Handlers
   =========================================================== */
function AlertCard({ alerts }) {
  const navigate = useNavigate();
  const [snoozed, setSnoozed] = useState(false);

  if (snoozed) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 shadow-xs flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>Pipeline risk alert snoozed for this session.</span>
        </div>
        <button
          type="button"
          onClick={() => setSnoozed(false)}
          className="font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          Undo
        </button>
      </section>
    );
  }

  if (alerts.stagnant === 0) {
    return (
      <section className="overflow-hidden rounded-2xl border border-slate-200 border-l-4 border-l-emerald-500 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-4">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-900">Pipeline healthy</h3>
            <p className="text-xs text-slate-500 mt-0.5">No opportunities are currently stagnant. All leads have active recent contact.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-rose-200/80 border-l-4 border-l-rose-500 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-start gap-4">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
          <AlertTriangle className="w-5 h-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              {alerts.stagnant} leads stagnant for {alerts.oldest}+
            </h3>
            <span className="text-xs font-semibold text-rose-600 tracking-wide uppercase">
              · High Priority
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            <span className="font-mono font-bold tabular-nums text-slate-900">{fmtMoneyShort(alerts.pipelineRisk)}</span> in
            pipeline value is at risk. These leads have not been contacted in over 14 days
            and require immediate re-engagement.
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>{alerts.qualifiedCount} in qualified stage</span>
            </span>
            <span className="text-slate-300">·</span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>{alerts.estimateCount} awaiting estimate</span>
            </span>
            <span className="text-slate-300">·</span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>Last touch &gt; 14 days</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button 
            type="button"
            onClick={() => setSnoozed(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
          >
            Snooze
          </button>
          <button 
            type="button"
            onClick={() => navigate('/leads/table/pipeline')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-rose-700 cursor-pointer"
          >
            <span>Resolve</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ===========================================================
   Premium Skeleton Loading Placeholders
   =========================================================== */
function SkeletonBar({ className }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />;
}

function KpiBentoSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map(n => (
        <div key={n} className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-200" />
            <div className="h-4 w-12 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="mt-3.5 space-y-2">
            <SkeletonBar className="h-3 w-20" />
            <SkeletonBar className="h-7 w-32" />
            <SkeletonBar className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

function RevenueChartSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <SkeletonBar className="h-3 w-24" />
          <SkeletonBar className="h-5 w-32" />
        </div>
        <div className="flex gap-3">
          <div className="h-8 w-16 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-8 w-16 animate-pulse rounded-lg bg-slate-100" />
        </div>
      </div>
      <div className="mt-6 flex h-64 items-end gap-2 px-1 pl-12 border-l border-b border-slate-100">
        {[45, 70, 35, 85, 50, 65, 40, 75, 30, 90, 55, 80, 45, 60].map((h, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse rounded-t bg-slate-200"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBar className="h-3 w-32" />
          <SkeletonBar className="h-5 w-40" />
        </div>
      </div>
      <div className="mt-4 space-y-4">
        {[1, 2, 3, 4, 5].map(n => (
          <div key={n} className="flex items-center gap-3">
            <div className="h-4 w-4 animate-pulse rounded bg-slate-200" />
            <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between">
                <SkeletonBar className="h-4 w-24" />
                <SkeletonBar className="h-4 w-12" />
              </div>
              <SkeletonBar className="h-2 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===========================================================
   Dashboard Main Component
   =========================================================== */
const Dashboard = () => {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const accessibleBranchIds = useMemo(() => getUserBranchIds(user), [user]);
  const restrictToAccessibleBranches = accessibleBranchIds.length > 0 && !user?.is_superuser && !user?.is_system_admin;
  const defaultBranchId = restrictToAccessibleBranches && accessibleBranchIds.length === 1 ? accessibleBranchIds[0] : ALL_BRANCHES;
  const [selectedBranchId, setSelectedBranchId] = useState(defaultBranchId);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [isRealTime, setIsRealTime] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);

  const loadDashboardData = useCallback(async ({ silent = false, branchOverride } = {}) => {
    const effectiveBranchId = branchOverride !== undefined ? branchOverride : selectedBranchId;
    if (!silent) {
      setLoading(true);
      setError(null);
    } else {
      setIsSyncing(true);
    }
    setIsRefreshing(true);
    setSyncError(null);
    try {
      const response = await getDashboardSummary({
        branch: effectiveBranchId === ALL_BRANCHES ? undefined : effectiveBranchId
      });
      const payload = response?.data || response || {};
      const nextBranches = Array.isArray(payload.branches) ? payload.branches : [];
      const scopedBranches = restrictToAccessibleBranches
        ? nextBranches.filter((branch) => accessibleBranchIds.includes(String(branch.id)))
        : nextBranches;
      setBranches(scopedBranches);
      if (restrictToAccessibleBranches) {
        const currentBranchIsAllowed = selectedBranchId === ALL_BRANCHES
          || scopedBranches.some((branch) => String(branch.id) === String(selectedBranchId));
        if (!currentBranchIsAllowed) {
          setSelectedBranchId(scopedBranches.length === 1 ? String(scopedBranches[0].id) : ALL_BRANCHES);
        }
      }
      setDashboardStats(payload.stats || null);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error("Dashboard backend load failed:", err);
      if (!silent) setError("Failed to load real-time statistics from the CRM backend. Please check connection.");
      else setSyncError("Background sync failed. Showing cached data.");
    } finally {
      if (!silent) setLoading(false);
      else setIsSyncing(false);
      setIsRefreshing(false);
    }
  }, [accessibleBranchIds, restrictToAccessibleBranches, selectedBranchId]);

  const handleBranchChange = useCallback((nextBranchId) => {
    setSelectedBranchId(nextBranchId);
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (!isRealTime) return undefined;

    const refreshTimer = window.setInterval(() => {
      loadDashboardData({ silent: true });
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(refreshTimer);
  }, [isRealTime, loadDashboardData]);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <DashboardHeader 
        key={`dashboard-header-${selectedBranchId}`}
        branches={branches} 
        selectedBranchId={selectedBranchId} 
        onBranchChange={handleBranchChange} 
        activeJobsCount={dashboardStats?.today?.activeJobs || 0}
        isRealTime={isRealTime}
        onRealTimeToggle={setIsRealTime}
        isSyncing={isSyncing}
        lastUpdated={lastUpdated}
        onRefresh={() => loadDashboardData({ silent: true })}
        syncError={syncError}
        isRefreshing={isRefreshing}
      />
      
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800 flex items-center justify-between">
          <span>{error}</span>
          <button 
            type="button"
            onClick={() => loadDashboardData()}
            className="text-red-900 underline font-bold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {syncError && !error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>{syncError}</span>
          </div>
          <button 
            type="button"
            onClick={() => loadDashboardData({ silent: true })} 
            className="text-amber-900 hover:text-amber-950 underline font-bold uppercase tracking-wider text-[10px] cursor-pointer"
          >
            Retry Sync
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-5">
          <KpiBentoSkeleton />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <RevenueChartSkeleton />
            </div>
            <div className="lg:col-span-4">
              <LeaderboardSkeleton />
            </div>
          </div>
        </div>
      ) : dashboardStats ? (
        <div className="space-y-5">
          <KpiBento
            key={`dashboard-kpis-${selectedBranchId}`}
            todayStats={dashboardStats.today} 
            conversionStats={dashboardStats.conversion} 
            monthStats={dashboardStats.month} 
          />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
            <div className="lg:col-span-8 space-y-5">
              <RevenueChart key={`dashboard-revenue-${selectedBranchId}`} revenueHistory={dashboardStats.revenueHistory} />
              <AlertCard key={`dashboard-alerts-${selectedBranchId}`} alerts={dashboardStats.alerts} />
            </div>
            <div className="space-y-5 lg:col-span-4">
              <Leaderboard key={`dashboard-leaderboard-${selectedBranchId}`} reps={dashboardStats.reps} />
              <ActivityTable key={`dashboard-activity-${selectedBranchId}`} activity={dashboardStats.activity} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Dashboard;
