import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  HelpCircle,
  Lock,
  RefreshCw,
  Send,
  Sliders,
} from 'lucide-react';

export const fmtMoney = (value) => {
  const amount = Number(value);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return `${safeAmount < 0 ? '−' : ''}$${Math.abs(safeAmount).toLocaleString('en-CA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export function formatBindingType(bindingType) {
  if (!bindingType) return 'Non-Binding';
  const norm = String(bindingType).toLowerCase().trim();
  if (norm === 'binding') return 'Binding';
  if (norm === 'non_binding') return 'Non-Binding';
  if (norm === 'not_to_exceed' || norm === 'nte') return 'Not-to-Exceed';
  if (norm === 'hourly') return 'Hourly Rate';
  if (norm === 'not_set') return 'Not Set';
  return bindingType;
}

export function getEstimatePricingStatus(estimate, { isOpportunityLocked = false } = {}) {
  if (!estimate || !estimate.id) {
    return {
      status: 'Incomplete',
      label: 'Incomplete',
      rawStatus: 'Incomplete',
      tone: 'slate',
      description: 'Estimate inputs or charges are incomplete.',
    };
  }

  const lifecycle = String(estimate.lifecycle_state || '').toLowerCase();
  const isLocked = Boolean(
    estimate.locked_reason ||
    isOpportunityLocked ||
    lifecycle === 'accepted' ||
    ['cancelled', 'expired', 'superseded', 'voided'].includes(lifecycle)
  );

  if (isLocked) {
    const reason = estimate.locked_reason ? ` (${estimate.locked_reason})` : '';
    return {
      status: 'Locked',
      label: `Locked${reason}`,
      rawStatus: 'Locked',
      tone: 'rose',
      description: 'This estimate is locked against pricing edits.',
    };
  }

  if (estimate.repricing?.needed || estimate.requires_reapproval) {
    const firstReason = estimate.repricing?.reasons?.[0];
    const reasonText = firstReason ? `: ${firstReason.replace(/_/g, ' ')}` : '';
    return {
      status: 'Repricing Required',
      label: 'Repricing Required',
      rawStatus: 'Repricing Required',
      reason: reasonText,
      tone: 'amber',
      description: `Rate inputs have changed and require recalculation${reasonText}.`,
    };
  }

  const charges = Array.isArray(estimate.charges) ? estimate.charges : [];
  if (charges.length === 0) {
    return {
      status: 'Incomplete',
      label: 'Incomplete',
      rawStatus: 'Incomplete',
      tone: 'slate',
      description: 'No charge lines have been calculated yet.',
    };
  }

  const hasOverrides = charges.some((c) => Boolean(c.is_manual_override)) || Boolean(estimate.not_to_exceed_is_manual);
  if (hasOverrides) {
    return {
      status: 'Overridden',
      label: 'Overridden',
      rawStatus: 'Overridden',
      tone: 'blue',
      description: 'Contains manually overridden charges or NTE.',
    };
  }

  return {
    status: 'Current',
    label: 'Current',
    rawStatus: 'Current',
    tone: 'emerald',
    description: 'Estimate pricing matches tariff rules and inputs.',
  };
}

const LIFECYCLE_TONES = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  ready: 'bg-blue-50 text-blue-700 border-blue-200',
  sent: 'bg-sky-50 text-sky-800 border-sky-200',
  viewed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  accepted: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
  superseded: 'bg-slate-100 text-slate-600 border-slate-200',
  expired: 'bg-rose-50 text-rose-700 border-rose-200',
};

const PRICING_STATUS_CONFIG = {
  Current: {
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400/20',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
  },
  'Repricing Required': {
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-400/30',
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
  },
  Locked: {
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-400/20',
    icon: Lock,
    iconColor: 'text-rose-600',
  },
  Overridden: {
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-300 ring-1 ring-blue-400/20',
    icon: Sliders,
    iconColor: 'text-blue-600',
  },
  Incomplete: {
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 ring-1 ring-slate-400/20',
    icon: HelpCircle,
    iconColor: 'text-slate-500',
  },
};

export default function EstimateSummaryHeader({
  estimate,
  opportunity,
  inventorySummary,
  isOpportunityLocked = false,
  canEditOpportunity = true,
  canSendEmail = true,
  isRecalculating = false,
  onRecalculate,
  onPreview,
  onSend,
  // Legacy / fallback props
  number,
  status,
  customerName: legacyCustomerName,
  grandTotal: legacyGrandTotal,
  branchLogo,
  onAction,
}) {
  const authoritativeGrandTotal = estimate?.grand_total ?? legacyGrandTotal ?? 0;
  const estimateNumber = estimate?.estimate_number
    ? `#${estimate.estimate_number}`
    : estimate?.id
    ? `#${estimate.id}`
    : number || '--';

  const lifecycleLabel = String(
    estimate?.lifecycle_label || estimate?.lifecycle_state || status || 'Draft'
  );
  const lifecycleKey = String(estimate?.lifecycle_state || status || 'draft').toLowerCase();
  const lifecycleTone = LIFECYCLE_TONES[lifecycleKey] || LIFECYCLE_TONES.draft;

  const pricingStatus = getEstimatePricingStatus(estimate, { isOpportunityLocked });
  const isLocked = pricingStatus.rawStatus === 'Locked';
  const pricingConfig = PRICING_STATUS_CONFIG[pricingStatus.rawStatus] || PRICING_STATUS_CONFIG.Incomplete;
  const PricingIcon = pricingConfig.icon;

  const volume =
    estimate?.inventory?.volume_cuft != null
      ? Number(estimate.inventory.volume_cuft)
      : inventorySummary?.totalVol ?? opportunity?.estimated_volume_cuft ?? 0;

  const weight =
    estimate?.inventory?.weight_lbs != null
      ? Number(estimate.inventory.weight_lbs)
      : inventorySummary?.totalWeightLbs ?? opportunity?.estimated_weight_lbs ?? 0;

  const tariffName =
    estimate?.calculation_trace?.tariff_name ||
    opportunity?.tariff_name ||
    opportunity?.tariff?.name ||
    (estimate?.tariff_id ? `Tariff #${estimate.tariff_id}` : 'Not assigned');

  const bindingType = formatBindingType(estimate?.binding_type || opportunity?.binding_type);

  const nteText =
    estimate?.not_to_exceed_amount && Number(estimate.not_to_exceed_amount) > 0
      ? fmtMoney(estimate.not_to_exceed_amount)
      : 'Not configured';

  const customerName =
    opportunity?.customer?.name ||
    opportunity?.customer_name ||
    opportunity?.contact_name ||
    legacyCustomerName ||
    '';

  const serviceType =
    opportunity?.service_type_name ||
    opportunity?.service_type ||
    opportunity?.opportunity_type_name ||
    '';

  // Cost / Profit data (only if authoritative backend data is present)
  const hasTrustedProfit =
    estimate?.estimated_profit != null && Number.isFinite(Number(estimate.estimated_profit));
  const profitAmount = hasTrustedProfit ? Number(estimate.estimated_profit) : null;
  const profitMargin =
    estimate?.profit_margin != null && Number.isFinite(Number(estimate.profit_margin))
      ? Number(estimate.profit_margin)
      : null;

  const isSent = lifecycleKey === 'sent' || Boolean(estimate?.sent_at);

  const handlePreviewClick = () => {
    if (onPreview) onPreview();
    else onAction?.('preview');
  };

  const handleRecalculateClick = () => {
    if (onRecalculate) onRecalculate();
    else onAction?.('recalculate');
  };

  const handleSendClick = () => {
    if (onSend) onSend();
    else onAction?.('send');
  };

  return (
    <header
      className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm space-y-3"
      aria-label="Estimate summary"
      data-testid="estimate-summary-header"
    >
      {/* Top row: Identity & Primary Total / Actions */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Estimate Identity */}
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          {branchLogo ? (
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white overflow-hidden p-1 shrink-0">
              <img src={branchLogo} alt="Branch Logo" className="h-full w-full object-contain" />
            </div>
          ) : null}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900">
                Estimate{' '}
                <span className="font-mono text-slate-600" data-testid="estimate-number">
                  {estimateNumber}
                </span>
              </h2>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${lifecycleTone}`}
                data-testid="estimate-lifecycle-badge"
              >
                {lifecycleLabel}
              </span>
            </div>
            {(customerName || serviceType) && (
              <p className="mt-0.5 text-xs text-slate-500 truncate" data-testid="estimate-customer-summary">
                {customerName}
                {customerName && serviceType ? ' · ' : ''}
                {serviceType}
              </p>
            )}
          </div>
        </div>

        {/* Right: Authoritative Total & Actions */}
        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 sm:gap-4">
          {/* Grand Total & Pricing Status */}
          <div className="flex flex-col items-start sm:items-end">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Estimated Total
            </span>
            <div className="flex items-baseline gap-2">
              <span
                className="font-mono text-2xl sm:text-3xl font-black tracking-tight text-slate-900"
                data-testid="estimate-grand-total"
              >
                {fmtMoney(authoritativeGrandTotal)}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${pricingConfig.badgeClass}`}
                data-testid="estimate-pricing-status"
                title={pricingStatus.description}
                aria-label={`Pricing status: ${pricingStatus.label}`}
              >
                <PricingIcon size={12} className={pricingConfig.iconColor} aria-hidden="true" />
                <span>{pricingStatus.label}</span>
              </span>
            </div>
          </div>

          <div className="hidden h-10 w-px bg-slate-200 lg:block" />

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="action-preview-estimate"
              onClick={handlePreviewClick}
              disabled={!estimate?.id && !number}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 active:translate-y-px disabled:pointer-events-none disabled:opacity-40"
            >
              <Eye size={14} className="text-slate-500" aria-hidden="true" />
              <span>Preview</span>
            </button>

            <button
              type="button"
              data-testid="action-recalculate-estimate"
              onClick={handleRecalculateClick}
              disabled={!estimate?.id || isLocked || isRecalculating || !canEditOpportunity}
              title={
                isLocked
                  ? 'Cannot recalculate a locked estimate'
                  : !canEditOpportunity
                  ? 'You do not have permission to edit this estimate'
                  : 'Recalculate rates with current tariff inputs'
              }
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold shadow-sm transition active:translate-y-px disabled:pointer-events-none disabled:opacity-40 ${
                pricingStatus.rawStatus === 'Repricing Required'
                  ? 'border-amber-300 bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200/50'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <RefreshCw size={14} className={isRecalculating ? 'animate-spin' : ''} aria-hidden="true" />
              <span>{isRecalculating ? 'Recalculating…' : 'Recalculate'}</span>
            </button>

            <button
              type="button"
              data-testid="action-send-estimate"
              onClick={handleSendClick}
              disabled={!estimate?.id || isLocked || (!canSendEmail && !canEditOpportunity)}
              title={
                isLocked
                  ? 'Cannot send a locked estimate'
                  : !canSendEmail && !canEditOpportunity
                  ? 'You do not have permission to send estimates'
                  : 'Send estimate to customer'
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white shadow-pop transition hover:bg-brand-dark active:translate-y-px disabled:pointer-events-none disabled:opacity-40"
            >
              <Send size={14} aria-hidden="true" />
              <span>{isSent ? 'Resend' : 'Send Estimate'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Secondary metadata facts row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-2.5 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-medium">Tariff:</span>
          <span className="font-semibold text-slate-800" data-testid="estimate-tariff-name" title={tariffName}>
            {tariffName}
          </span>
        </div>

        <span className="hidden sm:inline text-slate-300">·</span>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-medium">Binding:</span>
          <span className="font-semibold text-slate-800" data-testid="estimate-binding-type">
            {bindingType}
          </span>
        </div>

        <span className="hidden sm:inline text-slate-300">·</span>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-medium">NTE:</span>
          <span className="font-semibold text-slate-800" data-testid="estimate-nte-amount">
            {nteText}
          </span>
        </div>

        <span className="hidden sm:inline text-slate-300">·</span>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-medium">Vol & Wt:</span>
          <span className="font-semibold text-slate-800 font-mono" data-testid="estimate-volume-weight">
            {Number(volume).toLocaleString()} cu ft · {Number(weight).toLocaleString()} lbs
          </span>
        </div>

        {hasTrustedProfit && (
          <>
            <span className="hidden sm:inline text-slate-300">·</span>
            <div className="flex items-center gap-1.5" data-testid="estimate-profit">
              <span className="text-slate-400 font-medium">Est. Profit:</span>
              <span className="font-semibold text-emerald-700 font-mono">
                {fmtMoney(profitAmount)} ({profitMargin}%)
              </span>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
