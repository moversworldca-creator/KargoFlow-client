import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Edit2, GripVertical, Lock, MoreVertical, RotateCcw, Trash2, Unlock, Send } from 'lucide-react';
import { Icon, Pill, StatusDot, IconButton, PrimaryBtn, GhostBtn } from '../../../shared/ui/RedesignAtoms';

const fmtMoney = (value) => {
  const amount = Number(value);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return `${safeAmount < 0 ? "−" : ""}$${Math.abs(safeAmount).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const fmtAccountingMoney = (n) => {
  const amount = Number(n || 0);
  if (!amount) return '--';
  const formatted = `$${Math.abs(amount).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return amount < 0 ? `(${formatted})` : formatted;
};

/* ---------- Estimate Header ---------- */
export function EstimateHeader({ 
  number, 
  status, 
  customerName, 
  jobSummary, 
  grandTotal, 
  branchLogo,
  onAction 
}) {
  const statusTone = {
    draft:  { bg: "bg-slate-100",    text: "text-slate-700", dot: "bg-slate-400" },
    sent:   { bg: "bg-amber-50",     text: "text-amber-700", dot: "bg-amber-500" },
    signed: { bg: "bg-emerald-50",   text: "text-emerald-700", dot: "bg-emerald-500" },
  }[String(status || 'draft').toLowerCase()] || { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400" };

  return (
    <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between gap-3 p-3 md:p-4">
        <div className="min-w-0 flex items-start sm:items-center gap-4">
          {branchLogo ? (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white overflow-hidden p-1 shrink-0">
              <img src={branchLogo} alt="Branch Logo" className="h-full w-full object-contain" />
            </div>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shrink-0">
              <Icon name="file-text" className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                Estimate <span className="font-mono text-slate-500">{number}</span>
              </h2>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone.bg} ${statusTone.text}`}>
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${statusTone.dot}`} />
                {(status || 'Draft').toUpperCase()}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{customerName} · {jobSummary}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
          <div className="text-left sm:text-right">
            <div className="label-eyebrow text-slate-400">Grand total</div>
            <div className="font-mono text-2xl font-black tracking-tight text-slate-900">
              {fmtMoney(grandTotal)}
            </div>
          </div>
          <div className="hidden h-10 w-px bg-slate-200 sm:block" />
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <GhostBtn icon="external-link" onClick={() => onAction?.("portal")}>View Estimate</GhostBtn>
            <PrimaryBtn icon="send" onClick={() => onAction?.("send")}>
              {status === 'sent' ? 'Resend' : 'Send estimate'}
            </PrimaryBtn>
            <IconButton name="more-horizontal" label="More" />
          </div>
        </div>
      </div>
    </header>
  );
}

/* ---------- Summary Bento ---------- */
export function SummaryBento({ totalVol, totalQty, zoneCount, estWeight, distance, duration, stopCount, balance, captured }) {
  const cards = [
    {
      label: "Total volume",
      value: (totalVol || 0).toLocaleString(),
      unit: "cu·ft",
      meta: `${totalQty || 0} items · ${zoneCount || 0} zones`,
      icon: "package",
      tone: "blue",
    },
    {
      label: "Est. weight",
      value: (estWeight || 0).toLocaleString(),
      unit: "lbs",
      meta: `${((estWeight || 0) / 2000).toFixed(2)} tons · gross`,
      icon: "scale",
      tone: "slate",
    },
    {
      label: "Route",
      value: distance || "0.0",
      unit: "km",
      meta: `~${duration || "0 min"} · ${stopCount || 0} stops`,
      icon: "map",
      tone: "slate",
    },
    {
      label: "Balance due",
      value: fmtMoney(balance || 0).replace("$", ""),
      unit: "CAD",
      meta: `${fmtMoney(captured || 0)} captured`,
      icon: "wallet",
      tone: (balance || 0) > 0 ? "amber" : "green",
    },
  ];

  const toneClasses = {
    blue:  "bg-slate-50 text-blue-700",
    slate: "bg-slate-50 text-slate-700",
    amber: "bg-slate-50 text-amber-700",
    green: "bg-slate-50 text-emerald-700",
  };

  const textClasses = {
    blue:  "text-blue-700",
    slate: "text-slate-700",
    amber: "text-amber-700",
    green: "text-emerald-700",
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-2xl border border-slate-200 bg-white p-3 shadow-card ${textClasses[c.tone]}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest">{c.label}</span>
            <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${toneClasses[c.tone]}`}>
              <Icon name={c.icon} className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-black tracking-tight">{c.value}</span>
            <span className="text-xs font-semibold opacity-80">{c.unit}</span>
          </div>
          <p className="mt-1 text-xs opacity-80">{c.meta}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------- Estimate Tabs Navigation ---------- */
export function EstimateTabs({ active, onChange, counts = {}, disabledTabs = {}, showAll = false }) {
  const allTabs = [
    { id: "charges",   label: "Charges & Pricing", icon: "receipt", count: counts.charges || 0 },
    { id: "route",     label: "Route Logistics",    icon: "map",   count: counts.stops || 0 },
    { id: "inventory", label: "Inventory",          icon: "boxes",   count: counts.items || 0 },
    { id: "documents", label: "Documents", icon: "file-text",  count: counts.docs || 0 },
  ];
  const tabs = showAll ? allTabs : allTabs.filter((t) => t.id !== 'documents');

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-1.5 shadow-card overflow-hidden">
      <nav className="flex items-center gap-1 overflow-x-auto flex-nowrap -mx-1.5 px-1.5" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        {tabs.map((t) => {
          const isActive = t.id === active;
          const disabledInfo = disabledTabs?.[t.id] || null;
          const isDisabled = Boolean(disabledInfo?.disabled);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => (isDisabled ? null : onChange(t.id))}
              disabled={isDisabled}
              title={isDisabled ? (disabledInfo?.reason || 'This section is locked.') : undefined}
              className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                isDisabled
                  ? "cursor-not-allowed opacity-50 text-slate-400"
                  : isActive
                    ? "bg-slate-900 text-white shadow-card"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon name={t.icon} className={`w-4 h-4 ${isActive ? "text-brand" : ""}`} />
              <span>{t.label}</span>
              <span className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                isActive ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
              }`}>{t.count}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/* ---------- Charges Tab ---------- */
export function ChargesTab({
  charges = [],
  subJobs = [],
  subJobServiceOptions = [],
  selectedSubJobId = '',
  onSelectedSubJobChange,
  onCreateSubJob,
  onRefreshSubJobs,
  onDeleteSelectedSubJob,
  selectedSubJob = null,
  onUpdateSelectedSubJob,
  totals,
  crewNotes = '',
  customerNotes = '',
  internalNotes = '',
  onCrewNotesChange,
  onCustomerNotesChange,
  onInternalNotesChange,
  onCrewNotesBlur,
  onCustomerNotesBlur,
  onInternalNotesBlur,
  taxPctInput = '',
  taxExempt = false,
  taxSaving = false,
  onTaxPctChange,
  onTaxPctBlur,
  onTaxExemptChange,
  discountPresets = [],
  selectedDiscountPresetId = '',
  appliedDiscountPresets = [],
  onDiscountPresetChange,
  onRemoveDiscount,
  discountInput = '',
  discountSaving = false,
  onDiscountChange,
  onDiscountBlur,
  onApplyCustomDiscount,
  onSaveTaxes,
  onAddCharge,
  onApplyPackage,
  onAddCatalogItem,
  onEditCharge,
  onDeleteCharge,
  onReorderCharges,
  isLocked = false,
  canEditEstimate = true,
  onOpenJobScheduler,
  paymentsContent = null,
}) {
  const [activeNoteTab, setActiveNoteTab] = useState('crew');
  const [noteDrafts, setNoteDrafts] = useState({ crew: '', customer: '', internal: '' });
  const [editingNoteIdx, setEditingNoteIdx] = useState(null);
  const [editingNoteDraft, setEditingNoteDraft] = useState('');
  const [draggedChargeId, setDraggedChargeId] = useState(null);
  const [customDiscountType, setCustomDiscountType] = useState('percent');
  const [customDiscountValue, setCustomDiscountValue] = useState('');
  const [isSubJobMenuOpen, setIsSubJobMenuOpen] = useState(false);
  const [isItemActionsMenuOpen, setIsItemActionsMenuOpen] = useState(false);
  const [activeActionMenuChargeId, setActiveActionMenuChargeId] = useState(null);
  const groupTone = {
    moving_labor: "bg-blue-50 text-blue-700",
    transportation: "bg-indigo-50 text-indigo-700",
    packing: "bg-violet-50 text-violet-700",
    materials: "bg-slate-100 text-slate-700",
    trip_and_travel: "bg-amber-50 text-amber-700",
    discount: "bg-emerald-50 text-emerald-700",
  };
  const activeNotesValue = activeNoteTab === 'crew' ? crewNotes : activeNoteTab === 'customer' ? customerNotes : internalNotes;
  const activeDraft = noteDrafts[activeNoteTab] || '';
  const displayCharges = charges.filter((c) => String(c?.category || '') !== 'discount');
  const selectedJobSubtotal = displayCharges.reduce((sum, c) => sum + Number(c.total_price || 0), 0);
  const chargeTotal = selectedJobSubtotal;
  const estimateLevelDiscount = Math.max(0, Number(totals?.discountAmount || 0));
  const estimateSubtotal = Number.isFinite(Number(totals?.subtotal)) ? Number(totals.subtotal) : selectedJobSubtotal;
  const selectedSubJobLabel = selectedSubJob?.sub_job_number
    || (selectedSubJob
      ? `${selectedSubJob.sales_number || selectedSubJob.display_number || selectedSubJob.id}-${selectedSubJob.sequence || 1}`
      : '');
  const selectedSubJobMatchedOption = (Array.isArray(subJobServiceOptions) ? subJobServiceOptions : []).find(
    (o) => String(o.value) === String(selectedSubJob?.service_type || '')
  );
  const selectedSubJobRawTitle = selectedSubJob?.title || selectedSubJobMatchedOption?.label || selectedSubJob?.service_type || 'Selected job';
  const selectedSubJobTitle = String(selectedSubJobRawTitle)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  const taxableSubtotal = (() => {
    const rawTaxableSubtotal = Number(totals?.taxableSubtotal);
    if (Number.isFinite(rawTaxableSubtotal)) {
      return Math.min(Math.max(0, rawTaxableSubtotal), estimateSubtotal);
    }
    return Math.max(0, estimateSubtotal - estimateLevelDiscount);
  })();
  const postedMessages = String(activeNotesValue || '')
    .split('\n\n')
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => {
      const [stamp, ...rest] = row.split('::');
      if (!rest.length) return { stamp: '', body: row };
      return { stamp: stamp.trim(), body: rest.join('::').trim() };
    });

    const postActiveMessage = () => {
    const text = String(activeDraft || '').trim();
    if (!text) return;
    const stamp = new Date().toLocaleString();
    const entry = `${stamp}::${text}`;
    const nextValue = activeNotesValue ? `${activeNotesValue}\n\n${entry}` : entry;
    if (activeNoteTab === 'crew') {
      onCrewNotesChange?.(nextValue);
      onCrewNotesBlur?.(nextValue);
    }
    if (activeNoteTab === 'customer') {
      onCustomerNotesChange?.(nextValue);
      onCustomerNotesBlur?.(nextValue);
    }
    if (activeNoteTab === 'internal') {
      onInternalNotesChange?.(nextValue);
      onInternalNotesBlur?.(nextValue);
    }
    setNoteDrafts((prev) => ({ ...prev, [activeNoteTab]: '' }));
  };

  const updateMessageList = (newMessages) => {
    const nextValue = newMessages.map(m => m.stamp ? `${m.stamp}::${m.body}` : m.body).join('\n\n');
    if (activeNoteTab === 'crew') {
      onCrewNotesChange?.(nextValue);
      onCrewNotesBlur?.(nextValue);
    }
    if (activeNoteTab === 'customer') {
      onCustomerNotesChange?.(nextValue);
      onCustomerNotesBlur?.(nextValue);
    }
    if (activeNoteTab === 'internal') {
      onInternalNotesChange?.(nextValue);
      onInternalNotesBlur?.(nextValue);
    }
  };

  const saveEditMessage = (idx) => {
    const newMessages = [...postedMessages];
    newMessages[idx].body = editingNoteDraft.trim();
    updateMessageList(newMessages);
    setEditingNoteIdx(null);
    setEditingNoteDraft('');
  };

  const deleteMessage = (idx) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    const newMessages = [...postedMessages];
    newMessages.splice(idx, 1);
    updateMessageList(newMessages);
  };

  return (
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-12">
      <section className="lg:col-span-8">
        <div className="overflow-visible rounded-3xl border border-slate-200 bg-white shadow-card flex flex-col">
          <div className="flex border-b border-slate-200 relative z-10">
            <div className="flex flex-1 overflow-x-auto no-scrollbar">
              {(Array.isArray(subJobs) ? subJobs : []).map((job) => {
                const number = job.sub_job_number || `${job.sales_number || job.display_number || job.id}-${job.sequence || 1}`;
                const matchedOption = (Array.isArray(subJobServiceOptions) ? subJobServiceOptions : []).find(
                  o => String(o.value) === String(job.service_type || '')
                );
                const segmentLabel = job.sub_job_number || `${job.sales_number || job.display_number || job.id}-${job.sequence || 1}`;
                const rawService = job.title || matchedOption?.label || job.service_type || 'Move';
                const service = String(rawService)
                  .split('_')
                  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                  .join(' ');
                const isSelected = String(selectedSubJobId) === String(job.id);
                
                return (
                  <button
                    key={job.id}
                    onClick={() => onSelectedSubJobChange?.(String(job.id))}
                    className={`flex flex-col items-start px-6 py-4 border-b-2 whitespace-nowrap transition-colors ${
                      isSelected 
                        ? 'border-brand text-brand bg-brand/5' 
                        : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="font-bold text-base">{segmentLabel}</div>
                    <div className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-slate-400">{service}</div>
                    <div className="text-sm mt-1 flex items-center gap-6">
                      <span>{job.move_date ? new Date(job.move_date).toLocaleDateString() : 'Unscheduled'}</span>
                      <span className="font-mono text-xs">{number}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            
            <div className="flex items-center px-4 border-l border-slate-100 relative">
              <button
                type="button"
                onClick={() => setIsSubJobMenuOpen((prev) => !prev)}
                className="flex items-center justify-center text-brand font-medium hover:text-brand-dark transition-colors px-4 py-2 rounded-lg hover:bg-brand/5 whitespace-nowrap"
              >
                <Icon name="plus" className="w-4 h-4 mr-2" /> Add Job
              </button>
              
              {isSubJobMenuOpen ? (
                <div className="absolute top-16 right-4 z-20 min-w-[280px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg mt-2">
                  <div className="border-b border-slate-100 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Create sub-job
                  </div>
                  {(Array.isArray(subJobServiceOptions) ? subJobServiceOptions : []).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setIsSubJobMenuOpen(false);
                        onCreateSubJob?.(option.value);
                      }}
                      disabled={isLocked}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Icon name="plus" className="w-4 h-4" />
                      {option.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSubJobMenuOpen(false);
                      onRefreshSubJobs?.();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Icon name="refresh-cw" className="w-4 h-4" />
                    Refresh sub-jobs
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {selectedSubJob ? (
            <div className="p-5 border-b border-slate-200 bg-white">
              <div className="flex justify-between items-start mb-4">
                <button
                  type="button"
                  onClick={() => onOpenJobScheduler?.(selectedSubJob?.id)}
                  className="text-left text-xl font-bold text-brand hover:text-brand-dark hover:underline"
                >
                  {selectedSubJobLabel || selectedSubJobTitle}
                  <span className="text-sm font-mono text-slate-600 ml-2 tracking-wide">
                    {selectedSubJobLabel ? selectedSubJobTitle : ''}
                  </span>
                </button>
                <div className="relative ml-2">
                  <button
                    type="button"
                    onClick={() => setIsItemActionsMenuOpen((prev) => !prev)}
                    className="p-1.5 rounded-md text-slate-900 transition-colors hover:bg-slate-100"
                    aria-label="Job actions"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {isItemActionsMenuOpen ? (
                    <div className="absolute right-0 top-full z-20 mt-1 min-w-[280px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setIsItemActionsMenuOpen(false);
                          onOpenJobScheduler?.(selectedSubJob?.id);
                        }}
                        disabled={isLocked}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-brand transition hover:bg-brand/5 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Icon name="calendar" className="w-4 h-4" />
                        Schedule window
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsItemActionsMenuOpen(false);
                          onApplyPackage?.();
                        }}
                        disabled={isLocked}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Icon name="package-plus" className="w-4 h-4" />
                        Apply package
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsItemActionsMenuOpen(false);
                          onAddCatalogItem?.();
                        }}
                        disabled={isLocked}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Icon name="plus" className="w-4 h-4" />
                        Add catalog item
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsItemActionsMenuOpen(false);
                          onAddCharge?.();
                        }}
                        data-testid="estimate-add-charge"
                        disabled={isLocked}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Icon name="plus" className="w-4 h-4" />
                        Add line item
                      </button>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        type="button"
                        onClick={() => {
                          setIsItemActionsMenuOpen(false);
                          onDeleteSelectedSubJob?.(selectedSubJobId);
                        }}
                        disabled={isLocked}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Icon name="trash-2" className="w-4 h-4" />
                        Delete selected job
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex justify-between flex-wrap items-center gap-3 mb-5">
                <button
                  type="button"
                  onClick={() => onOpenJobScheduler?.(selectedSubJob?.id)}
                  className="inline-flex items-center rounded-lg bg-brand/10 px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand/15"
                >
                  <Icon name="calendar" className="w-4 h-4 mr-2" />
                  {selectedSubJob.move_date
                    ? `${new Date(selectedSubJob.move_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}${selectedSubJob.arrival_window_start ? ` · ${selectedSubJob.arrival_window_start}` : ''}${selectedSubJob.arrival_window_end ? ` - ${selectedSubJob.arrival_window_end}` : ''}`
                    : 'Schedule Date'
                  }
                </button>
                <div className="inline-flex items-center rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-800 border border-slate-200">
                  <span>Selected job subtotal</span>
                  <span className="ml-4 font-mono text-base text-slate-900">{fmtMoney(chargeTotal)}</span>
                </div>
              </div>

            </div>
          ) : null}

          <div className="w-full overflow-x-auto no-scrollbar">
            <table className="w-full table-fixed min-w-[768px]">
              <colgroup>
                <col className="w-[4%]" />
                <col className="w-[22%]" />
                <col className="w-[27%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[9%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60">
                  <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-widest text-slate-500"></th>
                  <th className="px-5 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500">Name</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-slate-500">Rate</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-widest text-slate-500">Discount</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-widest text-slate-500">Subtotal</th>
                  <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-widest text-slate-500">Total Cost</th>
                  <th className="w-10 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayCharges.map((c) => {
                  const subtotal = c.subtotal;
                  const rowDiscount = c.discount_amount;
                  const totalCost = c.total_cost;
                  const isDragging = String(draggedChargeId || '') === String(c.id);
                  return (
                  <tr
                    key={c.id}
                    draggable
                    onDragStart={(event) => {
                      setDraggedChargeId(c.id);
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', String(c.id));
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const sourceId = event.dataTransfer.getData('text/plain') || draggedChargeId;
                      setDraggedChargeId(null);
                      if (sourceId && String(sourceId) !== String(c.id)) {
                        onReorderCharges?.(sourceId, c.id);
                      }
                    }}
                    onDragEnd={() => setDraggedChargeId(null)}
                    className={`group cursor-move transition hover:bg-slate-50/60 ${isDragging ? 'bg-blue-50/60 opacity-70' : ''}`}
                  >
                    <td className="px-3 py-3 text-slate-300">
                      <GripVertical className="h-4 w-4 cursor-grab active:cursor-grabbing" />
                    </td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => (isLocked ? null : onEditCharge(c))}
                        className="text-left text-sm font-semibold text-brand hover:text-brand-dark hover:underline"
                      >
                        {c.name}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-left font-mono text-sm leading-5 tabular-nums text-slate-700">
                      <span className="block whitespace-normal break-words" title={c.description || c.rate_display || fmtMoney(c.unit_price)}>
                        {c.description || c.rate_display || fmtMoney(c.unit_price)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm font-bold tabular-nums text-emerald-700">
                      {Number(rowDiscount || 0) !== 0
                        ? (Number(rowDiscount) < 0 ? '-' : '') + fmtMoney(Math.abs(Number(rowDiscount)))
                        : '--'}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm font-bold tabular-nums text-slate-900">
                      {fmtMoney(subtotal)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm font-bold tabular-nums text-slate-900">
                      {fmtMoney(totalCost)}
                    </td>
                    <td className="px-3 py-3">
                      {canEditEstimate ? (
                        <div className="relative flex justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isLocked) return;
                              setActiveActionMenuChargeId((prev) => (String(prev) === String(c.id) ? null : c.id));
                            }}
                            disabled={isLocked}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {String(activeActionMenuChargeId) === String(c.id) && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveActionMenuChargeId(null);
                                }}
                              />
                              <div className="absolute right-0 top-full z-20 mt-1 min-w-[130px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-in fade-in zoom-in-95 duration-100">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveActionMenuChargeId(null);
                                    if (!isLocked) onEditCharge(c);
                                  }}
                                  disabled={isLocked}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveActionMenuChargeId(null);
                                    if (!isLocked) onDeleteCharge(c.id);
                                  }}
                                  disabled={isLocked}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                )})}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50/80">
                  <td className="px-3 py-3" />
                  <td className="px-5 py-3 text-sm font-black text-slate-900" colSpan={3}>Charges Subtotal</td>
                  <td className="px-3 py-3 text-right font-mono text-sm font-black tabular-nums text-slate-900">{fmtMoney(selectedJobSubtotal)}</td>
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3" />
                </tr>
                <tr className="bg-slate-100/90">
                  <td className="px-3 py-3" />
                  <td className="px-5 py-3 text-sm font-black text-slate-900" colSpan={4}>Taxable Subtotal</td>
                  <td className="px-3 py-3 text-right font-mono text-sm font-black tabular-nums text-slate-900">{fmtMoney(taxableSubtotal)}</td>
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="bg-[#EBF3FA] text-[#133559] flex items-center justify-between border-t border-blue-100 px-4 py-2.5">
            {canEditEstimate ? (
              <button 
                onClick={isLocked ? undefined : onAddCharge}
                disabled={isLocked}
                data-testid="estimate-add-charge"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
              >
                <Icon name="plus" className="w-3.5 h-3.5" /> Add line item
              </button>
            ) : null}
            <span className="text-xs text-slate-400">Quantities and rates pull from your service catalog.</span>
          </div>
        </div>
        <div className="mt-2 rounded-3xl border border-slate-200 bg-white p-3 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Notes</span>
            {activeNoteTab === 'internal' ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                <Icon name="eye-off" className="w-3 h-3" /> Not visible to customer
              </span>
            ) : null}
          </div>
          <div className="mt-3 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            {[
              ['crew', 'Crew'],
              ['customer', 'Customer'],
              ['internal', 'Internal'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => (isLocked ? null : setActiveNoteTab(key))}
                disabled={isLocked}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeNoteTab === key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200">
                <Icon name="message-square" className="h-3.5 w-3.5" />
              </span>
              <span>{activeNoteTab === 'crew' ? 'Crew Message' : activeNoteTab === 'customer' ? 'Customer Message' : 'Internal Message'}</span>
            </div>
            <div className="max-h-44 space-y-2 overflow-auto pr-1">
              {postedMessages.length ? postedMessages.map((msg, idx) => (
                <div key={`${msg.stamp}-${idx}`} className="group relative rounded-2xl bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
                  {editingNoteIdx === idx ? (
                    <div className="space-y-2">
                      <textarea
                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm leading-relaxed text-slate-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10"
                        rows={3}
                        value={editingNoteDraft}
                        onChange={(e) => setEditingNoteDraft(e.target.value)}
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingNoteIdx(null)} className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">Cancel</button>
                        <button onClick={() => saveEditMessage(idx)} className="inline-flex h-8 items-center justify-center rounded-lg bg-brand px-3 text-xs font-bold text-white transition hover:bg-brand-dark">Save</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {msg.stamp ? <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{msg.stamp}</div> : null}
                      <div className="whitespace-pre-wrap leading-relaxed">{msg.body}</div>
                      <div className="absolute right-2 top-2 hidden items-center gap-1 group-hover:flex">
                        {canEditEstimate ? (
                          <>
                            <button 
                              onClick={() => { setEditingNoteIdx(idx); setEditingNoteDraft(msg.body); }}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition"
                              title="Edit"
                            >
                              <Icon name="edit-2" className="h-3 w-3" />
                            </button>
                            <button 
                              onClick={() => deleteMessage(idx)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition"
                              title="Delete"
                            >
                              <Icon name="trash-2" className="h-3 w-3" />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>
              )) : (
                <div className="rounded-2xl bg-white px-3 py-4 text-xs font-semibold text-slate-400 ring-1 ring-slate-200">No messages posted yet.</div>
              )}
            </div>
            <div className="mt-3 flex items-end gap-2">
              <textarea
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-700 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
                rows={3}
                value={activeDraft}
                onChange={(e) => {
                  if (isLocked) return;
                  setNoteDrafts((prev) => ({ ...prev, [activeNoteTab]: e.target.value }));
                }}
                disabled={isLocked}
                placeholder={
                  activeNoteTab === 'crew'
                    ? 'Type a message for the crew...'
                    : activeNoteTab === 'customer'
                      ? 'Type a message for the customer...'
                      : 'Type an internal message...'
                }
              />
              {canEditEstimate ? (
                <button
                  type="button"
                  onClick={postActiveMessage}
                  disabled={isLocked || !String(activeDraft || '').trim()}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Post
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <aside className="lg:col-span-4">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card flex flex-col">
          <div className="bg-[#EBF3FA] text-[#133559] border-b border-blue-100 px-4 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Estimate totals</span>
          </div>
	          <dl className="space-y-2 px-5 py-4 text-sm">
	            <div className="flex items-center justify-between gap-3">
	              <dt className="text-slate-500">Sales tax %</dt>
	              <dd className="flex items-center gap-2">
	                <input
                  type="number"
                  value={taxPctInput}
                  onChange={(e) => onTaxPctChange?.(e.target.value)}
                  onBlur={() => onTaxPctBlur?.()}
                  className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                  placeholder="0"
                  min="0"
                  step="1"
                  inputMode="numeric"
                />
                {taxSaving ? (
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Saving…</span>
                ) : null}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Tax exempt</dt>
              <dd className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(taxExempt)}
                  onChange={(e) => onTaxExemptChange?.(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-xs font-semibold text-slate-500">No tax applied</span>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Discount</dt>
              <dd className="flex flex-col items-end gap-2">
                <div className="flex w-56 items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    value={discountInput}
                    onChange={(e) => onDiscountChange?.(e.target.value)}
                    onBlur={() => onDiscountBlur?.()}
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                    aria-label="Discount amount"
                  />
                </div>
                <select
                  value={selectedDiscountPresetId}
                  onChange={(e) => onDiscountPresetChange?.(e.target.value)}
                  className="w-56 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                >
                  <option value="">Discount preset</option>
                  {discountPresets.map((preset) => {
                    const type = String(preset?.discount_type || '').toLowerCase();
                    const rawValue = Number(preset?.value || 0);
                    const formattedValue = type === 'fixed'
                      ? `$${rawValue.toFixed(2)}`
                      : `${rawValue.toFixed(2).replace(/\.00$/, '')}%`;
                    return (
                      <option key={String(preset?.id || '')} value={String(preset?.id || '')}>
                        {preset?.label} ({formattedValue})
                      </option>
                    );
                  })}
                  <option value="custom">Custom discount</option>
                </select>
                {selectedDiscountPresetId === 'custom' ? (
                  <div className="flex w-56 items-center gap-1">
                    <select
                      value={customDiscountType}
                      onChange={(e) => setCustomDiscountType(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-sm font-bold text-slate-900 outline-none focus:border-brand"
                    >
                      <option value="percent">%</option>
                      <option value="fixed">$</option>
                    </select>
                    <input
                      type="number"
                      value={customDiscountValue}
                      onChange={(e) => setCustomDiscountValue(e.target.value)}
                      placeholder="Amount"
                      className="flex-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-sm font-bold text-slate-900 outline-none focus:border-brand"
                    />
                    <button
                      type="button"
                      onClick={() => onApplyCustomDiscount?.(customDiscountType, customDiscountValue)}
                      disabled={!customDiscountValue}
                      className="rounded-xl bg-brand px-3 py-2 text-sm font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                ) : null}
                {discountSaving ? (
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Saving…</span>
                ) : null}
                {Array.isArray(appliedDiscountPresets) && appliedDiscountPresets.length ? (
                  <div className="flex max-w-md flex-wrap justify-end gap-2 text-right">
                    {appliedDiscountPresets.map((preset) => (
                      <span
                        key={String(preset?.id || `${preset?.label}-${preset?.value}`)}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                      >
                        <span>{preset?.label}</span>
                        <span className="font-mono text-[11px]">
                          {Number(preset?.applied_amount || 0) > 0 ? `-${Number(preset.applied_amount).toFixed(2)}` : '$0.00'}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemoveDiscount?.(preset?.id)}
                          className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-rose-600 ring-1 ring-inset ring-rose-200 hover:bg-rose-50"
                        >
                          Remove
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </dd>
            </div>
          </dl>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Estimate breakdown</div>
                <div className="mt-1 text-sm font-semibold text-slate-700">Estimate-wide totals update live</div>
              </div>
              <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Live preview
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Subtotal</div>
                <div className="mt-2 font-mono text-lg font-black tabular-nums text-slate-900">{fmtMoney(estimateSubtotal)}</div>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">Discount</div>
                <div className="mt-2 font-mono text-lg font-black tabular-nums text-emerald-700">
                  {Number(totals?.discountAmount || 0) > 0 ? fmtAccountingMoney(-Number(totals.discountAmount || 0)) : fmtAccountingMoney(0)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Taxable</div>
                <div className="mt-2 font-mono text-lg font-black tabular-nums text-slate-900">{fmtMoney(totals.taxableSubtotal)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Tax</div>
                <div className="mt-2 font-mono text-lg font-black tabular-nums text-slate-900">{fmtMoney(totals.taxAmount)}</div>
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-blue-200/80 bg-[#EBF3FA] px-4 py-3 text-slate-900 flex items-end justify-between shadow-sm">
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-widest text-[#133559]">Grand total</div>
                <div className="mt-1 text-[10px] font-semibold text-slate-600">Estimate-wide total, not selected job segment</div>
              </div>
              <div className="font-mono text-2xl font-black tabular-nums text-slate-900">{fmtMoney(totals.totalDue)}</div>
            </div>
          </div>
        </div>
        {paymentsContent ? <div className="mt-2">{paymentsContent}</div> : null}
      </aside>
    </div>
  );
}

/* ---------- Route Logistics Tab ---------- */
export function RouteTab({
  stops = [],
  distance,
  duration,
  onAddStop,
  onEditStop,
  onDeleteStop,
  onMoveStop,
  onReorderStops,
  onOptimize,
  mapContainerRef,
  mapTypeId = 'roadmap',
  onToggleMapType,
  onRecenterMap,
  onOpenRouteInGoogle,
  isLocked = false,
}) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const lastIndex = Math.max(0, stops.length - 1);
  const originIndex = stops.findIndex((stop) => stop?.type === 'origin');
  const destinationIndex = stops.findIndex((stop) => stop?.type === 'destination');

  const getSegment = (index) => {
    const stop = stops[index];
    if (!stop) return 'unknown';
    if (stop.type === 'origin' || stop.type === 'destination') return 'fixed';
    if (originIndex !== -1 && index < originIndex) return 'pre';
    if (destinationIndex !== -1 && index > destinationIndex) return 'post';
    return 'middle';
  };

  const isMovableIndex = (index) => true;

  const canMoveTo = (index, direction) => {
    const target = index + direction;
    return target >= 0 && target < stops.length;
  };

  const handleDragStart = (index, event) => {
    setDraggedIndex(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (index, event) => {
    if (draggedIndex === null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (index, event) => {
    if (draggedIndex === null) return;
    event.preventDefault();
    if (draggedIndex !== index) {
      onReorderStops?.(draggedIndex, index);
    }
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card flex flex-col">
        <div className="bg-[#EBF3FA] text-[#133559] flex items-center justify-between border-b border-blue-100 px-4 py-2.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Map</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={isLocked ? undefined : onToggleMapType}
              disabled={isLocked || !onToggleMapType}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              title={mapTypeId === 'satellite' ? 'Switch to road map' : 'Switch to satellite map'}
              aria-label={mapTypeId === 'satellite' ? 'Switch to road map' : 'Switch to satellite map'}
            >
              <Icon name="layers" className="w-3.5 h-3.5" />
              <span>{mapTypeId === 'satellite' ? 'Road' : 'Satellite'}</span>
            </button>
            <button
              type="button"
              onClick={isLocked ? undefined : onRecenterMap}
              disabled={isLocked || !onRecenterMap}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              title="Recenter map"
              aria-label="Recenter map"
            >
              <Icon name="locate" className="w-3.5 h-3.5" />
              <span>Recenter</span>
            </button>
            <button
              type="button"
              onClick={isLocked ? undefined : onOpenRouteInGoogle}
              disabled={isLocked || !onOpenRouteInGoogle}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              title="Open route in Google Maps"
              aria-label="Open route in Google Maps"
            >
              <Icon name="external-link" className="w-3.5 h-3.5" />
              <span>Open</span>
            </button>
          </div>
        </div>
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100" ref={mapContainerRef}>
          {/* Google Map renders here */}
          <div className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-3 rounded-xl bg-white px-3 py-2 shadow-card ring-1 ring-slate-200">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Distance</div>
              <div className="font-mono text-sm font-bold tabular-nums text-slate-900">{distance} km</div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Drive</div>
              <div className="font-mono text-sm font-bold tabular-nums text-slate-900">~{duration}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card flex flex-col">
        <div className="bg-[#EBF3FA] text-[#133559] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-blue-100 px-4 py-2.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Route stops</span>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => (isLocked ? null : onAddStop?.('before_origin'))}
              disabled={isLocked}
              className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              <Icon name="plus" className="w-3.5 h-3.5" /> Before origin
            </button>
            <button
              type="button"
              onClick={() => (isLocked ? null : onAddStop?.('middle'))}
              disabled={isLocked}
              className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-dark"
            >
              <Icon name="plus" className="w-3.5 h-3.5" /> Add stop
            </button>
            <button
              type="button"
              onClick={() => (isLocked ? null : onAddStop?.('after_destination'))}
              disabled={isLocked}
              className="inline-flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              <Icon name="plus" className="w-3.5 h-3.5" /> After destination
            </button>
          </div>
        </div>
        <ol className="p-3">
          {stops.map((s, i) => (
            <li
              key={s.id}
              draggable={isMovableIndex(i)}
              onDragStart={(event) => handleDragStart(i, event)}
              onDragOver={(event) => handleDragOver(i, event)}
              onDrop={(event) => handleDrop(i, event)}
              onDragEnd={handleDragEnd}
              className={`group flex items-start gap-3 rounded-2xl border border-transparent p-3 transition hover:border-slate-200 hover:bg-slate-50 ${
                draggedIndex === i ? 'scale-[0.99] border-dashed border-brand bg-brand/5 opacity-80' : ''
              } ${isMovableIndex(i) ? 'cursor-grab active:cursor-grabbing' : ''}`}
            >
              <button
                type="button"
                draggable={false}
                onDragStart={(event) => handleDragStart(i, event)}
                className={`mt-1 inline-flex h-6 w-6 items-center justify-center rounded-md transition ${
                  isMovableIndex(i) ? 'cursor-grab text-slate-300 hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing' : 'cursor-default text-slate-200'
                }`}
                aria-label={isMovableIndex(i) ? 'Drag stop to reorder' : 'Stop order fixed'}
                title={isMovableIndex(i) ? 'Drag to reorder' : 'Origin/destination cannot be moved'}
              >
                <GripVertical className="w-4 h-4" />
              </button>
              <div className="flex flex-col items-center pt-1">
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                  s.type === 'origin'
                    ? 'bg-slate-900 text-white'
                    : s.type === 'destination'
                      ? 'bg-emerald-600 text-white'
                      : s.type === 'pre_stop'
                        ? 'bg-amber-100 text-amber-700'
                        : s.type === 'post_stop'
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-blue-100 text-blue-700'
                }`}>
                  {i + 1}
                </span>
                {i < stops.length - 1 && <span className="my-1 h-8 w-px border-l-2 border-dashed border-slate-200" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {s.type === 'origin'
                      ? 'Pickup'
                      : s.type === 'destination'
                        ? 'Dropoff'
                        : s.type === 'pre_stop'
                          ? 'Before origin'
                          : s.type === 'post_stop'
                            ? 'After destination'
                            : 'Stop'}
                  </span>
                </div>
                <p className="mt-0.5 text-sm font-semibold text-slate-900 truncate">{s.address || 'Address not set'}</p>
                {s.details && <p className="mt-0.5 text-xs text-slate-500 truncate">{s.details.unit_number ? `#${s.details.unit_number} · ` : ''}{s.details.property_type}</p>}
              </div>
              <div className="flex items-center">
                <div className="flex items-center gap-1.5">
                  {isMovableIndex(i) && onMoveStop ? (
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => (isLocked ? null : onMoveStop(i, -1))}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Move stop up"
                        title="Move stop up"
                        disabled={isLocked || !canMoveTo(i, -1)}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => (isLocked ? null : onMoveStop(i, 1))}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Move stop down"
                        title="Move stop down"
                        disabled={isLocked || !canMoveTo(i, 1)}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => (isLocked ? null : onEditStop?.(s))}
                    disabled={isLocked}
                    className="p-1.5 bg-[#F5FEFA] text-emerald-700 hover:bg-[#e2f9ed] rounded-lg transition-colors border border-emerald-100/30"
                    aria-label="Edit stop"
                    title="Edit stop"
                  >
                    <Edit2 size={16} />
                  </button>
                  {s.type !== 'origin' && s.type !== 'destination' && onDeleteStop ? (
                    <button
                      type="button"
                      onClick={() => (isLocked ? null : onDeleteStop(i))}
                      disabled={isLocked}
                      className="p-1.5 rounded-lg border border-rose-100 bg-rose-50 text-rose-600 transition hover:bg-rose-100 hover:text-rose-700"
                      aria-label="Delete stop"
                      title="Delete stop"
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
        <div className="bg-[#EBF3FA] text-[#133559] flex items-center justify-between border-t border-blue-100 px-4 py-2.5">
          <span className="text-xs text-slate-500">Stops auto-optimize on calculate.</span>
          <button 
            onClick={isLocked ? undefined : onOptimize}
            disabled={isLocked}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
          >
            <Icon name="zap" className="w-3.5 h-3.5" /> Calculate route
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Inventory Tab ---------- */
const getPhotoUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  try {
    const origin = new URL(apiUrl).origin;
    return `${origin}${url}`;
  } catch (e) {
    return `http://localhost:8000${url}`;
  }
};

export function InventoryTab({
  items = [],
  photos = [],
  onAddPhoto,
  onAddItem,
  onRequestInventory,
  inventoryPortalLockedAt = null,
  onTogglePortalLock,
  isLocked = false,
}) {
  const isPortalLocked = Boolean(inventoryPortalLockedAt);
  return (
    <div className="space-y-3">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card flex flex-col">
        <div className="bg-[#EBF3FA] text-[#133559] flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Customer items</span>
            <span className="text-slate-300">·</span>
            <span className="text-xs font-medium text-slate-500">{items.length} items</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                isPortalLocked ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-100' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
              }`}
            >
              {isPortalLocked ? <Lock size={12} /> : <Unlock size={12} />}
              {isPortalLocked ? 'Portal locked' : 'Portal unlocked'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
            <GhostBtn icon="send" onClick={onRequestInventory} disabled={isLocked}>Request Inventory</GhostBtn>
            {onTogglePortalLock ? (
              <button
                type="button"
                onClick={isLocked ? undefined : onTogglePortalLock}
                disabled={isLocked}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                  isPortalLocked
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100'
                    : 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-100'
                }`}
              >
                {isPortalLocked ? <Unlock size={16} /> : <Lock size={16} />}
                {isPortalLocked ? 'Unlock portal' : 'Lock portal'}
              </button>
            ) : null}
            <PrimaryBtn icon="plus" onClick={onAddItem} disabled={isLocked}>Add item</PrimaryBtn>
          </div>
        </div>
        
        <div className="p-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-slate-400 text-sm">
            No items listed. Use the customer portal or add manually.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {/* Logic to group by room can be added here */}
            {items.map((item, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:border-slate-300">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[15px] font-bold text-slate-900">{item.name}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{item.quantity} units · {item.room_name}</div>
                  </div>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Icon name="box" className="w-4 h-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card flex flex-col">
        <div className="bg-[#EBF3FA] text-[#133559] flex items-center justify-between border-b border-blue-100 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Inventory photos</span>
            <span className="text-slate-300">·</span>
            <span className="text-xs font-medium text-slate-500">{photos.length} files</span>
          </div>
          <button 
            onClick={isLocked ? undefined : onAddPhoto}
            disabled={isLocked}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-100"
          >
            <Icon name="upload" className="w-3.5 h-3.5" /> Upload
          </button>
        </div>
        <div className="p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {photos.map((photo, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-slate-100 ring-1 ring-inset ring-slate-200">
              <img src={getPhotoUrl(photo.file || photo.file_url || photo.url)} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex items-end p-2 bg-gradient-to-t from-black/20 to-transparent">
                <span className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 backdrop-blur truncate">{photo.filename || photo.name}</span>
              </div>
            </div>
          ))}
        </div>
        </div>
      </section>
    </div>
  );
}

/* ---------- Payments Tab ---------- */
export function PaymentsTab({
  capturedTotal,
  pendingTotal,
  balanceDue,
  payments = [],
  onAddManual,
  canAddManualPayment = true,
  manualActionLabel = "Add manual",
  onCreateLink,
  onEditManualPayment,
  onDeleteManualPayment,
  onRefundPayment,
  onCopyPaymentRequestLink,
  onOpenPaymentRequestLink,
  onSendReceipt,
  hideSummary = false,
}) {
  const statusPill = {
    succeeded: { tone: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100", label: "Captured" },
    captured: { tone: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100", label: "Captured" },
    paid: { tone: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100", label: "Paid" },
    refunded: { tone: "bg-sky-50 text-sky-700 ring-1 ring-sky-100", label: "Refunded" },
    partially_refunded: { tone: "bg-sky-50 text-sky-700 ring-1 ring-sky-100", label: "Partially Refunded" },
    sent:     { tone: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",     label: "Sent" },
    created: { tone: "bg-amber-50 text-amber-700 ring-1 ring-amber-100", label: "Open" },
    draft: { tone: "bg-slate-100 text-slate-600 ring-1 ring-slate-200", label: "Draft" },
    pending:  { tone: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",    label: "Pending" },
    failed: { tone: "bg-rose-50 text-rose-700 ring-1 ring-rose-100", label: "Failed" },
    cancelled: { tone: "bg-slate-100 text-slate-600 ring-1 ring-slate-200", label: "Closed" },
    canceled: { tone: "bg-slate-100 text-slate-600 ring-1 ring-slate-200", label: "Closed" },
    expired: { tone: "bg-slate-100 text-slate-600 ring-1 ring-slate-200", label: "Expired" },
  };

  const kindIcon = {
    request: "link",
    manual:  "edit-3",
    gateway: "credit-card",
  };

  const kindColors = {
    gateway: "bg-blue-50/60 text-blue-600 border border-blue-100/50",
    manual:  "bg-emerald-50/60 text-emerald-600 border border-emerald-100/50",
    request: "bg-amber-50/60 text-amber-600 border border-amber-100/50",
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">

      <section className="max-h-[300px] overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-card flex flex-col">
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 px-4 py-2.5 bg-[#EBF3FA] text-[#133559]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Payments Ledger</span>
            <span className="text-slate-350">·</span>
            <span className="text-xs font-semibold text-slate-500">{payments.length} transactions</span>
          </div>
          <div className="flex items-center gap-2">
            <GhostBtn
              icon="edit-3"
              onClick={onAddManual}
              disabled={!canAddManualPayment}
              className="h-9 py-0 px-3.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
            >
              {manualActionLabel}
            </GhostBtn>
            <button 
              onClick={onCreateLink}
              className="inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-brand px-3.5 text-xs font-bold text-white shadow-pop transition hover:bg-brand-dark active:translate-y-px"
            >
              <Icon name="link" className="w-3.5 h-3.5" /> Create payment request
            </button>
          </div>
        </div>
        {!canAddManualPayment ? (
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-500">
            Use payment requests to collect payment before a job is created.
          </div>
        ) : null}

        {payments.length === 0 ? (
          <div className="flex min-h-[145px] items-center justify-center px-4 text-center text-slate-400 text-xs font-semibold uppercase tracking-wider">No payment records found.</div>
        ) : (
          <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
            {payments.map((p) => {
              const sp = statusPill[String(p.status).toLowerCase()] || statusPill.pending;
              const kind = p.kind || (p.method === 'stripe' ? 'gateway' : p.is_request ? 'request' : 'manual');
              const paymentStatus = String(p.status || '').toLowerCase();
              const canRefund = ['succeeded', 'partially_refunded'].includes(paymentStatus) && Number(p.amount || 0) > Number(p.refunded_amount || 0);
              const canOpenRequest = kind === 'request' && Boolean(p.checkout_url);
              const colorCls = kindColors[kind] || 'bg-slate-50 text-slate-650 border border-slate-100';
              
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4.5 transition hover:bg-slate-50/40">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-sm ${colorCls}`}>
                      <Icon name={kindIcon[kind]} className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-800">{kind.charAt(0).toUpperCase() + kind.slice(1)}</span>
                        <span className="text-slate-350">·</span>
                        <span className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                          {p.payment_method_display || p.method_summary || p.method || 'Payment'}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase ${sp.tone}`}>
                          {sp.label}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                        <span className="font-mono bg-slate-50 px-1 rounded">ID: {p.id}</span>
                        <span className="text-slate-300">·</span>
                        <span>{new Date(p.created_at).toLocaleString()}</span>
                        {p.note && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="truncate max-w-[250px] text-slate-500" title={p.note}>Note: {p.note}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="font-mono text-sm font-black text-slate-900 tabular-nums text-right">
                      {fmtMoney(p.amount)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {kind === 'manual' && onEditManualPayment && (
                        <button
                          type="button"
                          onClick={() => onEditManualPayment(p)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50/50 text-emerald-700 ring-1 ring-inset ring-emerald-100 transition hover:bg-emerald-50 hover:text-emerald-800 active:scale-95 shadow-sm"
                          aria-label="Edit payment"
                          title="Edit payment"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                      {kind === 'manual' && onDeleteManualPayment && (
                        <button
                          type="button"
                          onClick={() => onDeleteManualPayment(p)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50/50 text-rose-600 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-50 hover:text-rose-700 active:scale-95 shadow-sm"
                          aria-label="Delete payment"
                          title="Delete payment"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      {kind === 'gateway' && onRefundPayment && (
                        <button
                          type="button"
                          onClick={() => onRefundPayment(p)}
                          disabled={!canRefund}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 text-[11px] font-bold text-amber-700 ring-1 ring-inset ring-amber-250 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 shadow-sm"
                          aria-label="Refund payment"
                          title="Refund payment"
                        >
                          <RotateCcw size={12} />
                          Refund
                        </button>
                      )}
                      {kind === 'request' && onCopyPaymentRequestLink && (
                        <button
                          type="button"
                          onClick={() => onCopyPaymentRequestLink(p)}
                          disabled={!p.checkout_url}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 text-[11px] font-bold text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 shadow-sm"
                          aria-label="Copy payment link"
                          title="Copy payment link"
                        >
                          <Icon name="copy" className="w-3.5 h-3.5" />
                          Copy link
                        </button>
                      )}
                      {kind === 'request' && onOpenPaymentRequestLink && (
                        <button
                          type="button"
                          onClick={() => onOpenPaymentRequestLink(p)}
                          disabled={!canOpenRequest}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand/10 px-2.5 text-[11px] font-bold text-brand ring-1 ring-inset ring-brand/15 transition hover:bg-brand/15 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 shadow-sm"
                          aria-label="Open payment link"
                          title="Open payment link"
                        >
                          <Icon name="external-link" className="w-3.5 h-3.5" />
                          Open
                        </button>
                      )}
                      {kind === 'manual' && onSendReceipt && (
                        <button
                          type="button"
                          onClick={() => onSendReceipt(p)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 text-[11px] font-bold text-blue-700 ring-1 ring-inset ring-blue-200 transition hover:bg-blue-100 active:scale-95 shadow-sm"
                          aria-label="Send Receipt"
                          title="Send Receipt"
                        >
                          <Send size={12} />
                          Receipt
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
