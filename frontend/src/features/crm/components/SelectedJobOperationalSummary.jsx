import React from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Truck,
  Users,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Slash,
} from 'lucide-react';

export function fmtMoney(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return '$0.00';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatRouteDuration(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  if (total <= 0) return '0 min';
  const hrs = Math.floor(total / 60);
  const mins = total % 60;
  if (!hrs) return `${mins}m`;
  if (!mins) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

export function formatRouteDistance(miles) {
  const m = Number(miles || 0);
  if (!Number.isFinite(m) || m <= 0) return '0.0 mi';
  return `${m.toFixed(1)} mi`;
}

/**
 * Filter charges to only those belonging to the specified planned job.
 * Strictly excludes estimate-level discounts.
 */
export function getSelectedJobCharges(charges = [], selectedSubJobId, allSubJobs = []) {
  if (!Array.isArray(charges)) return [];
  const targetId = selectedSubJobId != null ? String(selectedSubJobId) : '';
  const numJobs = (Array.isArray(allSubJobs) ? allSubJobs : []).length;

  return charges.filter((c) => {
    // Estimate-level discounts must remain outside this subtotal
    const isDiscount =
      c?.source_type === 'discount' ||
      String(c?.category || '').toLowerCase() === 'discount';
    if (isDiscount) return false;

    const meta = c?.metadata && typeof c.metadata === 'object' ? c.metadata : {};
    const rawJobId =
      c?.planned_sub_job_id ??
      c?.planned_sub_job ??
      c?.planned_job_id ??
      c?.job_id ??
      meta.planned_sub_job_id ??
      meta.opportunity_sub_job_id ??
      meta.sub_job_id ??
      meta.job_id ??
      null;

    if (rawJobId != null) {
      return String(rawJobId) === targetId;
    }

    // If charge has no explicit job id and there's only 1 job, associate with this job
    if (numJobs <= 1) {
      return true;
    }

    // For multiple jobs without explicit job id on charge, associate with primary job
    const primaryJob =
      (allSubJobs || []).find((j) => j?.is_primary) || allSubJobs?.[0];
    if (primaryJob && String(primaryJob.id) === targetId) {
      return true;
    }
    return false;
  });
}

/**
 * Authoritatively calculate the selected job's charge subtotal.
 * Never includes estimate-level discounts.
 */
export function calculateSelectedJobSubtotal(charges = [], selectedSubJobId, allSubJobs = [], jobTrace = null) {
  const jobCharges = getSelectedJobCharges(charges, selectedSubJobId, allSubJobs);
  if (jobCharges.length > 0) {
    return jobCharges.reduce((sum, c) => {
      const val = Number(c.total_price ?? c.subtotal ?? c.amount ?? c.total ?? 0);
      return sum + (Number.isFinite(val) ? val : 0);
    }, 0);
  }
  if (jobTrace?.totals?.job_subtotal != null) {
    const traceTotal = Number(jobTrace.totals.job_subtotal);
    if (Number.isFinite(traceTotal)) return traceTotal;
  }
  return 0;
}

/**
 * Extracts tariff minimum hours if available.
 */
export function getTariffMinimumHours(resources, jobTrace, jobCharges = [], selectedSubJob = null, jobInputs = null) {
  if (resources?.minimum_hours != null && resources.minimum_hours !== '') {
    return Number(resources.minimum_hours);
  }
  if (jobTrace?.minimum_hours != null && jobTrace.minimum_hours !== '') {
    return Number(jobTrace.minimum_hours);
  }
  for (const c of jobCharges) {
    const minHours = c?.metadata?.detail?.minimum_hours;
    if (minHours != null && minHours !== '') {
      return Number(minHours);
    }
  }
  const jobId = selectedSubJob?.id;
  if (jobId && jobInputs?.[jobId]?.minimum_hours != null && jobInputs[jobId].minimum_hours !== '') {
    return Number(jobInputs[jobId].minimum_hours);
  }
  if (selectedSubJob?.minimum_hours != null && selectedSubJob.minimum_hours !== '') {
    return Number(selectedSubJob.minimum_hours);
  }
  if (selectedSubJob?.min_hours != null && selectedSubJob.min_hours !== '') {
    return Number(selectedSubJob.min_hours);
  }
  return null;
}

export function getConfirmationStateBadge(stateRaw) {
  const state = String(stateRaw || 'unconfirmed').trim().toLowerCase();
  switch (state) {
    case 'confirmed':
      return {
        label: 'Confirmed',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: CheckCircle2,
      };
    case 'tentative':
      return {
        label: 'Tentative',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: AlertCircle,
      };
    case 'declined':
      return {
        label: 'Declined',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: Slash,
      };
    case 'unconfirmed':
    default:
      return {
        label: 'Unconfirmed',
        badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
        icon: HelpCircle,
      };
  }
}

/**
 * SelectedJobOperationalSummary component
 *
 * Renders operational details of the selected job under the job title:
 * - service type and job number
 * - move date and arrival window
 * - confirmation state
 * - rated crew count, truck count, estimated labor hours from calculation_trace.jobs[].resources
 * - source badges: Auto-calculated, Manual inputs, or Missing
 * - tariff minimum hours when available
 * - selected job charge subtotal (isolated from other jobs and estimate discounts)
 * - route duration, route mileage and stop count (with empty state)
 */
export default function SelectedJobOperationalSummary({
  selectedSubJob,
  subJobServiceOptions = [],
  calculationTrace = null,
  estimate = null,
  charges = [],
  allSubJobs = [],
  routeSummary = null,
  routeStops = [],
  jobInputs = null,
  onOpenJobScheduler,
  isLocked = false,
}) {
  if (!selectedSubJob) {
    return (
      <div
        data-testid="selected-job-summary-empty"
        className="px-5 py-4 border-b border-slate-200 bg-slate-50 text-sm text-slate-500 italic"
      >
        No planned job selected.
      </div>
    );
  }

  // 1. Service type and job number
  const matchedServiceOption = (subJobServiceOptions || []).find(
    (o) => String(o.value) === String(selectedSubJob?.service_type || '')
  );
  const serviceTypeRaw =
    matchedServiceOption?.label ||
    selectedSubJob?.service_type ||
    selectedSubJob?.title ||
    'Service';
  const serviceTypeLabel = String(serviceTypeRaw)
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');

  const jobNumber =
    selectedSubJob?.sub_job_number ||
    (selectedSubJob
      ? `${selectedSubJob.sales_number || selectedSubJob.display_number || selectedSubJob.id}-${selectedSubJob.sequence || 1}`
      : '');

  // 2. Move date & arrival window
  const hasMoveDate = Boolean(selectedSubJob?.move_date);
  const formattedMoveDate = hasMoveDate
    ? new Date(selectedSubJob.move_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const arrivalWindow = [
    selectedSubJob?.arrival_window_start,
    selectedSubJob?.arrival_window_end,
  ]
    .filter(Boolean)
    .join(' - ');

  // 3. Confirmation state badge
  const confirmation = getConfirmationStateBadge(selectedSubJob?.confirmation_state);
  const ConfirmationIcon = confirmation.icon;

  // 4. Rated resources from calculation_trace.jobs[].resources matched via planned_job_id
  const trace = calculationTrace || estimate?.calculation_trace;
  const traceJobs = trace?.jobs || [];
  const matchedJobTrace = traceJobs.find(
    (j) => String(j?.planned_job_id) === String(selectedSubJob?.id)
  );
  const resources = matchedJobTrace?.resources || null;

  // Resource source badge:
  // - Auto-calculated when resources.auto is true
  // - Manual inputs when resources.auto is false
  // - Missing when tariff could not calculate resources (!resources)
  let resourceSource = {
    label: 'Missing',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    type: 'missing',
  };
  if (resources) {
    if (resources.auto === true) {
      resourceSource = {
        label: 'Auto-calculated',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        type: 'auto',
      };
    } else {
      resourceSource = {
        label: 'Manual inputs',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        type: 'manual',
      };
    }
  }

  const crewCount = resources?.crew != null ? resources.crew : null;
  const truckCount = resources?.trucks != null ? resources.trucks : null;
  const laborHours =
    resources?.estimated_hours != null
      ? resources.estimated_hours
      : resources?.hours != null
      ? resources.hours
      : null;

  // 5. Tariff minimum hours
  const jobCharges = getSelectedJobCharges(charges, selectedSubJob?.id, allSubJobs);
  const minHours = getTariffMinimumHours(
    resources,
    matchedJobTrace,
    jobCharges,
    selectedSubJob,
    jobInputs
  );

  // 6. Selected job charge subtotal
  const selectedJobSubtotal = calculateSelectedJobSubtotal(
    charges,
    selectedSubJob?.id,
    allSubJobs,
    matchedJobTrace
  );

  // 7. Route duration, route mileage and stop count
  const stops = selectedSubJob?.stops || routeStops || [];
  const stopCount = Array.isArray(stops) ? stops.length : 0;
  const distanceMiles = Number(
    selectedSubJob?.route_distance_miles ?? routeSummary?.distanceMiles ?? 0
  );
  const durationMinutes = Number(
    selectedSubJob?.route_duration_minutes ?? routeSummary?.durationMinutes ?? 0
  );
  const hasRouteInfo = stopCount > 0 || distanceMiles > 0 || durationMinutes > 0;

  return (
    <div
      data-testid="selected-job-summary"
      className="border-b border-slate-200 bg-white px-5 py-3.5 transition-colors"
    >
      {/* Top operational row: Service Type, Job Number, Date Button & Confirmation Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span
            data-testid="selected-job-service-type"
            className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200"
          >
            {serviceTypeLabel}
          </span>
          {jobNumber ? (
            <span
              data-testid="selected-job-number"
              className="text-xs font-mono font-semibold text-slate-500 tracking-wide"
            >
              #{jobNumber}
            </span>
          ) : null}

          {/* Confirmation state */}
          <span
            data-testid="selected-job-confirmation-state"
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${confirmation.badgeClass}`}
          >
            <ConfirmationIcon className="w-3 h-3" />
            <span>{confirmation.label}</span>
          </span>
        </div>

        {/* Schedule / Move Date button */}
        <button
          type="button"
          data-testid="selected-job-date-button"
          onClick={() => onOpenJobScheduler?.(selectedSubJob?.id)}
          disabled={isLocked}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
            hasMoveDate
              ? 'bg-brand/10 text-brand hover:bg-brand/15 border border-brand/20'
              : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 border-dashed'
          } disabled:cursor-not-allowed disabled:opacity-60`}
          title={hasMoveDate ? 'Click to adjust schedule' : 'Click to schedule date'}
        >
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>
            {hasMoveDate
              ? `${formattedMoveDate}${arrivalWindow ? ` @ ${arrivalWindow}` : ''}`
              : 'Unscheduled — Set Move Date'}
          </span>
        </button>
      </div>

      {/* Operational resources & logistics row */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-3 text-xs">
        {/* Left: Rated Resources (Crew, Trucks, Hours, Min Hours) with Source Badge */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* Resource Source Badge */}
          <span
            data-testid="resource-source-badge"
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${resourceSource.badgeClass}`}
          >
            {resourceSource.label}
          </span>

          {/* Trucks */}
          <div
            data-testid="job-truck-count"
            className="inline-flex items-center gap-1.5 text-slate-700 font-medium"
            title="Rated Trucks"
          >
            <Truck className="w-4 h-4 text-slate-400" />
            <span>
              {truckCount != null ? (
                <>
                  <strong className="font-semibold text-slate-900">{truckCount}</strong>{' '}
                  {truckCount === 1 ? 'Truck' : 'Trucks'}
                </>
              ) : (
                <span className="text-slate-400">— Trucks</span>
              )}
            </span>
          </div>

          {/* Crew */}
          <div
            data-testid="job-crew-count"
            className="inline-flex items-center gap-1.5 text-slate-700 font-medium"
            title="Rated Crew"
          >
            <Users className="w-4 h-4 text-slate-400" />
            <span>
              {crewCount != null ? (
                <>
                  <strong className="font-semibold text-slate-900">{crewCount}</strong>{' '}
                  {crewCount === 1 ? 'Mover' : 'Movers'}
                </>
              ) : (
                <span className="text-slate-400">— Movers</span>
              )}
            </span>
          </div>

          {/* Labor Hours */}
          <div
            data-testid="job-labor-hours"
            className="inline-flex items-center gap-1.5 text-slate-700 font-medium"
            title="Estimated Labor Hours"
          >
            <Clock className="w-4 h-4 text-slate-400" />
            <span>
              {laborHours != null ? (
                <>
                  <strong className="font-semibold text-slate-900">
                    {Number(laborHours).toFixed(2)}
                  </strong>{' '}
                  hrs
                </>
              ) : (
                <span className="text-slate-400">— hrs</span>
              )}
            </span>
          </div>

          {/* Minimum Hours */}
          <div
            data-testid="job-min-hours"
            className="text-[11px] text-slate-500 font-medium"
            title="Tariff Minimum Hours"
          >
            {minHours != null ? (
              <span>(Min. Hrs. {Number(minHours).toFixed(2)})</span>
            ) : (
              <span className="text-slate-400">(Min. Hrs. —)</span>
            )}
          </div>
        </div>

        {/* Right: Route logistics and isolated job subtotal */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Route info */}
          <div
            data-testid="selected-job-route-summary"
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1 text-slate-600 border border-slate-200/80"
          >
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {hasRouteInfo ? (
              <span className="font-medium text-slate-700">
                {formatRouteDuration(durationMinutes)} / {formatRouteDistance(distanceMiles)} ·{' '}
                {stopCount} {stopCount === 1 ? 'stop' : 'stops'}
              </span>
            ) : (
              <span className="text-slate-400 italic">Route logistics not configured</span>
            )}
          </div>

          {/* Job subtotal */}
          <div
            data-testid="selected-job-subtotal"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-100/80 px-3 py-1 border border-slate-200"
          >
            <span className="text-slate-600 font-medium">Job subtotal</span>
            <span className="font-mono text-sm font-bold text-slate-900">
              {fmtMoney(selectedJobSubtotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
