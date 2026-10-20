// One Estimate: scope (Planned Jobs), the builder's pricing inputs, explicit
// calculation by the Pricing Engine, the resulting price with its explanation,
// and the workflow (ready, send, acceptance, revise, cancel). The browser
// never computes a price: every amount on this screen came from a stored
// Calculation Run. Stale pricing is always shown, never hidden.
import React, { useState } from 'react';
import { ArrowLeft, Calculator, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import useCan from '../../../shared/auth/useCan';
import { newIdempotencyKey, pricingApi } from '../../pricing/api';
import { CONSTRAINT_TYPES } from '../../pricing/constants';
import { ESTIMATE_STATE_TONE, formatDateTime, formatMoney, humanize } from '../../pricing/format';
import { CONSTRAINT_PERMISSION, ESTIMATES, PRICING } from '../../pricing/permissions';
import { useCommitments, useOverrides, useRun, useSkills } from '../../pricing/queries';
import { ApprovalList } from '../../pricing/components/ApprovalsQueue';
import JobInputsForm, { EMPTY_JOB_INPUTS, cleanJobInputs, jobInputsToForm } from '../../pricing/components/JobInputsForm';
import RunViewer from '../../pricing/components/RunViewer';
import {
  Badge, Button, Callout, CheckboxField, DecimalField, ErrorBanner, KeyValue, LoadingState, Money, QueryState, Section,
  SelectField, StateBadge, Tabs, TextField, useAction,
} from '../../pricing/components/ui';
import { estimatesApi } from '../api';
import { useEstimate, useInvalidateEstimates } from '../queries';
import {
  EditEstimateDialog, OverrideDialog, ReasonDialog, RecordAcceptanceDialog, SendEstimateDialog,
} from './EstimateDialogs';

const EMPTY_ESTIMATE_INPUTS = { constraint_type: '', amount: '', range_min: '', range_max: '', promotions: [], manual_adjustments: [], tax_exempt: false };

/** Saved builder inputs + scope -> calculation request body (API shape). */
export function buildCalculationBody(scopeJobs, inputs = {}) {
  const jobs = scopeJobs.filter((j) => j.is_included !== false).map((j) => ({
    job_id: j.job_id, inputs: cleanJobInputs(inputs.jobs?.[j.job_id] || {}),
  }));
  const e = { ...EMPTY_ESTIMATE_INPUTS, ...(inputs.estimate || {}) };
  const estimate = {};
  if (e.constraint_type === 'range' && (e.range_min || e.range_max)) {
    estimate.constraints = [{ constraint_type: 'range', range_min: e.range_min || null, range_max: e.range_max || null }];
  } else if (e.constraint_type && e.amount) {
    estimate.constraints = [{ constraint_type: e.constraint_type, amount: e.amount }];
  }
  const promotions = e.promotions.filter((p) => p.percentage || p.amount);
  if (promotions.length) estimate.promotions = promotions.map((p, i) => ({ key: p.key || `promo${i + 1}`, name: p.name, ...(p.percentage ? { percentage: p.percentage } : { amount: p.amount }) }));
  const manual = e.manual_adjustments.filter((m) => m.amount);
  if (manual.length) estimate.manual_adjustments = manual.map((m, i) => ({ key: m.key || `adj${i + 1}`, name: m.name || 'Adjustment', amount: m.amount, reason: m.reason, source: 'manual' }));
  if (e.tax_exempt) estimate.tax_exempt = true;
  return { jobs, estimate };
}

// Loads the Estimate, then renders the view with it, so every callback in the
// view can rely on the Estimate being present.
export default function EstimateDetail({ estimateId, opportunity, onBack }) {
  const query = useEstimate(estimateId);
  if (query.isLoading) return <LoadingState />;
  if (!query.data) return <QueryState query={query}>{null}</QueryState>;
  return <EstimateView estimate={query.data} estimateId={estimateId} opportunity={opportunity} onBack={onBack} />;
}

function EstimateView({ estimate, estimateId, opportunity, onBack }) {
  const { can } = useCan();
  const invalidate = useInvalidateEstimates();
  const [tab, setTab] = useState('price');
  const [dialog, setDialog] = useState(null);
  const [draftInputs, setDraftInputs] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const run = useRun((estimate ? estimate.current_pricing_run_id : undefined));
  const skills = useSkills(can(PRICING.VIEW));
  const overrides = useOverrides(estimateId, can(ESTIMATES.VIEW));
  const commitments = useCommitments(estimateId, (estimate ? estimate.lifecycle_state : undefined) === 'accepted');

  const inputs = draftInputs || (estimate ? estimate.pricing_inputs : undefined) || {};
  const jobsById = Object.fromEntries(((estimate ? estimate.scope_jobs : undefined) || []).map((j) => [j.job_id, j.title]));
  const actions = new Set((estimate ? estimate.available_actions : undefined) || []);
  const locked = Boolean((estimate ? estimate.is_booked : undefined));
  const canEditInputs = !locked && can(ESTIMATES.UPDATE_DRAFT) && actions.has('calculate');
  const refresh = () => invalidate();

  // Values reach these actions as arguments, never through the closure: the
  // React Compiler evaluates closure reads during render, before data loads.
  const saveInputs = useAction(({ next, lock }) => estimatesApi.savePricingInputs(estimateId, next, lock), {
    invalidate: refresh, onSuccess: () => setDraftInputs(null), silent: true,
  });
  const calculate = useAction(async ({ draft, lock, body }) => {
    // Save what was typed first (optimistic lock), then price exactly that.
    if (draft) await estimatesApi.savePricingInputs(estimateId, draft, lock);
    return pricingApi.calculateEstimate(estimateId, body, newIdempotencyKey());
  }, {
    success: (data) => (data.decision?.adopted ? 'Price calculated and applied.' : 'Price calculated.'),
    invalidate: refresh,
    onSuccess: (data) => { setDraftInputs(null); setLastResult(data); },
  });
  const adopt = useAction((runId) => pricingApi.adoptForResend(estimateId, runId), {
    success: 'New price applied. Resend the Estimate to the customer.', invalidate: refresh,
    onSuccess: () => { setLastResult(null); setDialog('resend'); },
  });
  const ready = useAction(() => estimatesApi.markReady(estimateId), { success: 'Estimate is ready to send.', invalidate: refresh });
  const commit = useAction(() => pricingApi.commitConstraints(estimateId), { success: 'Accepted constraints recorded for Final Rating.', invalidate: refresh });
  const revokeOverride = useAction((id) => pricingApi.revokeOverride(estimateId, id, 'Removed by user'), { success: 'Override removed. Recalculate to apply.', invalidate: refresh });

  const runCalculation = () => calculate.run({
    draft: draftInputs, lock: estimate.pricing_inputs_lock_version, body: buildCalculationBody(estimate.scope_jobs, inputs),
  });
  const setJobInputs = (jobId, value) => setDraftInputs({ ...inputs, jobs: { ...(inputs.jobs || {}), [jobId]: value } });
  const estimateInputs = { ...EMPTY_ESTIMATE_INPUTS, ...(inputs.estimate || {}) };
  const setEstimateInputs = (patch) => setDraftInputs({ ...inputs, estimate: { ...estimateInputs, ...patch } });
  const unadopted = lastResult && !lastResult.decision?.adopted && lastResult.decision?.repricing_action === 'new_version_and_resend';
  const shownRun = unadopted ? lastResult.run : run.data;
  const currency = shownRun?.currency;

  const tabs = [
    { id: 'price', label: 'Pricing' },
    { id: 'scope', label: 'Jobs in scope', count: estimate.scope_jobs.length },
    { id: 'history', label: 'Versions & acceptance', count: estimate.versions.length || undefined },
    ...(can(PRICING.VIEW) ? [{ id: 'approvals', label: 'Approvals', count: estimate.pending_approvals || undefined }] : []),
  ];

  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft size={14} aria-hidden="true" /> All Estimates
      </button>
      <Section
        title={`${estimate.estimate_number} · ${estimate.option_label || 'Estimate'}`}
        description={estimate.customer_display_label && estimate.customer_display_label !== estimate.option_label ? `Customer sees: ${estimate.customer_display_label}` : undefined}
        actions={(
          <>
            <StateBadge state={estimate.lifecycle_state} tones={ESTIMATE_STATE_TONE} />
            <Badge tone="blue">{humanize(estimate.binding_type)}</Badge>
            {locked && <Badge tone="green"><Lock size={11} aria-hidden="true" /> Booked</Badge>}
            {actions.has('edit') && can(ESTIMATES.UPDATE_DRAFT) && <Button variant="ghost" onClick={() => setDialog('edit')}><Pencil size={13} aria-hidden="true" /> Details</Button>}
            {actions.has('mark_ready') && can(ESTIMATES.UPDATE_DRAFT) && <Button variant="ghost" onClick={() => ready.run()} busy={ready.busy}>Mark ready</Button>}
            {actions.has('send') && can(ESTIMATES.SEND) && <Button onClick={() => setDialog('send')}>{estimate.sent_at ? 'Resend' : 'Send'}</Button>}
            {actions.has('reissue_link') && can(ESTIMATES.SEND) && <Button variant="ghost" onClick={() => setDialog('reissue')}>New customer link</Button>}
            {actions.has('record_acceptance') && can(ESTIMATES.RECORD_ACCEPTANCE) && <Button variant="ghost" onClick={() => setDialog('accept')}>Record acceptance</Button>}
            {actions.has('revise') && can(ESTIMATES.SUPERSEDE) && <Button variant="ghost" onClick={() => setDialog('revise')}>Revise</Button>}
            {actions.has('cancel') && can(ESTIMATES.UPDATE_DRAFT) && <Button variant="danger" onClick={() => setDialog('cancel')}>Cancel</Button>}
          </>
        )}
      >
        <div className="space-y-3">
          {locked && <Callout tone="info" title="Booked and locked">This Estimate was booked. Its scope and price never change; use a Change Order for changes and Final Rating for actuals.</Callout>}
          {estimate.lifecycle_state === 'reapproval_required' && <Callout tone="warning" title="Customer reapproval needed">The accepted scope or price changed. Send the updated Estimate for the customer to accept again.</Callout>}
          {estimate.lifecycle_state === 'accepted' && !locked && (
            <Callout tone="success" title="Accepted, not booked">The customer accepted this Estimate. Booking is a separate step on the Opportunity.</Callout>
          )}
          {estimate.pricing_stale && !locked && !['superseded', 'cancelled', 'expired'].includes(estimate.lifecycle_state) && (
            <Callout tone="warning" title={estimate.current_pricing_run_id ? 'Pricing is out of date' : 'Not priced yet'}
              actions={canEditInputs && <Button onClick={runCalculation} busy={calculate.busy}><Calculator size={13} aria-hidden="true" /> Recalculate</Button>}>
              {estimate.current_pricing_run_id
                ? `The price below no longer matches the Estimate (${estimate.pricing_stale_reason || 'inputs changed'}). It cannot be sent or accepted until recalculated.`
                : 'Enter the job details and calculate to price this Estimate.'}
            </Callout>
          )}
          {estimate.pending_approvals > 0 && <Callout tone="warning" title="Approval pending">This price needs {estimate.pending_approvals} pricing approval(s) before it can be sent.</Callout>}
          {unadopted && (
            <Callout tone="warning" title="New price not yet sent" actions={can(ESTIMATES.SEND) && <Button onClick={() => adopt.run(lastResult.run.id)} busy={adopt.busy}>Apply new price and resend</Button>}>
              The customer has {estimate.lifecycle_state === 'viewed' ? 'seen' : 'been sent'} {formatMoney(estimate.grand_total, currency)}. The recalculated price is {formatMoney(lastResult.run.totals.grand_total, currency)}; it becomes the customer&apos;s price only as a new version that is resent.
            </Callout>
          )}
          <KeyValue items={[
            ['Total', <Money key="t" value={estimate.grand_total} currency={currency} strong />],
            ['Deposit', <Money key="d" value={estimate.deposit_amount} currency={currency} />],
            ['Priced', formatDateTime(estimate.pricing_calculated_at)],
            ['Sent', formatDateTime(estimate.sent_at)],
            ['Expires', formatDateTime(estimate.expires_at)],
            ['Customer link', estimate.portal_link ? `Active until ${formatDateTime(estimate.portal_link.expires_at)}` : 'None'],
          ]} />
          <Tabs tabs={tabs} active={tab} onChange={setTab} label="Estimate sections" />

          {tab === 'price' && (
            <div className="space-y-4">
              {estimate.scope_jobs.map((job) => (
                <fieldset key={job.job_id} className="rounded-xl border border-slate-200 p-3" disabled={!canEditInputs}>
                  <legend className="px-1 text-xs font-bold">{job.title}{job.service_type_name && ` · ${job.service_type_name}`}{job.is_primary && ' (primary)'}</legend>
                  <JobInputsForm value={jobInputsToForm(inputs.jobs?.[job.job_id] || EMPTY_JOB_INPUTS)} onChange={(v) => setJobInputs(job.job_id, v)} skills={skills.data || []} disabled={!canEditInputs} />
                </fieldset>
              ))}
              <EstimateLevelInputs value={estimateInputs} onChange={setEstimateInputs} disabled={!canEditInputs} />
              {canEditInputs && estimate.lifecycle_state === 'accepted' && (
                <Callout tone="warning">This Estimate is accepted. A price change moves it to Reapproval required and the customer must accept again.</Callout>
              )}
              {canEditInputs && (
                <div className="flex flex-wrap justify-end gap-2">
                  {draftInputs && <Button variant="ghost" onClick={() => saveInputs.run({ next: draftInputs, lock: estimate.pricing_inputs_lock_version })} busy={saveInputs.busy}>Save inputs</Button>}
                  <Button onClick={runCalculation} busy={calculate.busy}><Calculator size={13} aria-hidden="true" /> Calculate price</Button>
                </div>
              )}
              {draftInputs && <p className="text-right text-[11px] text-amber-700">Unsaved changes. The price below is from the last calculation.</p>}
              <ErrorBanner message={[calculate.error, saveInputs.error].filter(Boolean).map((e) => `${e.message}${e.detail ? ` (${e.detail})` : ''}`).join(' ')} />
              {shownRun ? (
                <div className={`rounded-xl border p-3 ${estimate.pricing_stale && !unadopted ? 'border-amber-300' : 'border-slate-200'}`}>
                  {estimate.pricing_stale && !unadopted && <Badge tone="amber">Out of date</Badge>}
                  <RunViewer run={shownRun} jobsById={jobsById} />
                </div>
              ) : estimate.current_pricing_run_id && <LoadingState />}
              <OverridesBlock estimate={estimate} overrides={overrides} charges={shownRun?.charges || []} onAdd={() => setDialog('override')} onRevoke={(id) => revokeOverride.run(id)} locked={locked} />
              {estimate.lifecycle_state === 'accepted' && (
                <Section title="Accepted commitments" description="Fixed price / Not-to-Exceed / Minimum the customer accepted. Final Rating honours them."
                  actions={can(ESTIMATES.RECORD_ACCEPTANCE) && !(commitments.data || []).length && <Button variant="ghost" onClick={() => commit.run()} busy={commit.busy}>Record commitments</Button>}>
                  {(commitments.data || []).length
                    ? <ul className="text-xs">{commitments.data.map((c) => <li key={c.id}>{humanize(c.constraint_type)} {formatMoney(c.amount, currency)}</li>)}</ul>
                    : <p className="text-xs text-slate-500">No accepted constraint recorded.</p>}
                </Section>
              )}
            </div>
          )}
          {tab === 'scope' && <ScopeEditor estimate={estimate} planned={opportunity?.planned_jobs || []} editable={!locked && actions.has('edit_scope') && can(ESTIMATES.UPDATE_DRAFT)} onSaved={refresh} />}
          {tab === 'history' && <HistoryBlock estimate={estimate} />}
          {tab === 'approvals' && <ApprovalList estimateId={estimate.id} />}
        </div>
      </Section>

      {dialog === 'edit' && <EditEstimateDialog estimate={estimate} onClose={() => setDialog(null)} onDone={() => { setDialog(null); refresh(); }} />}
      {['send', 'resend', 'reissue'].includes(dialog) && (
        <SendEstimateDialog estimate={estimate} opportunityId={estimate.opportunity_id} reissue={dialog === 'reissue'}
          customerEmail={opportunity?.customer_email} customerName={opportunity?.opportunity?.customer_name}
          onClose={() => setDialog(null)} onSent={refresh} />
      )}
      {dialog === 'accept' && (
        <RecordAcceptanceDialog title={`Record acceptance of ${estimate.estimate_number}`} onSubmit={(body) => estimatesApi.recordAcceptance(estimate.id, body)}
          onClose={() => setDialog(null)} onDone={() => { setDialog(null); refresh(); }} />
      )}
      {dialog === 'cancel' && (
        <ReasonDialog title={`Cancel ${estimate.estimate_number}?`} description="The Estimate and its customer link stop working. History is kept." confirmLabel="Cancel Estimate"
          success="Estimate cancelled." onSubmit={(reason) => estimatesApi.cancel(estimate.id, reason)} onClose={() => setDialog(null)} onDone={() => { setDialog(null); refresh(); }} />
      )}
      {dialog === 'revise' && (
        <ReasonDialog title={`Revise ${estimate.estimate_number}`} description="A new draft replaces this Estimate on the same Opportunity; this one is superseded and its customer link stops working." confirmLabel="Create revision" tone="primary" required={false}
          success="Revision created as a draft." onSubmit={(reason) => estimatesApi.revise(estimate.id, reason)} onClose={() => setDialog(null)}
          onDone={() => { setDialog(null); refresh(); onBack(); }} />
      )}
      {dialog === 'override' && <OverrideDialog estimate={estimate} charges={(run.data?.charges || []).filter((c) => !c.excluded)} onClose={() => setDialog(null)} onDone={() => { setDialog(null); refresh(); }} />}
    </div>
  );
}

function EstimateLevelInputs({ value, onChange, disabled }) {
  const { can } = useCan();
  const canDiscount = can(PRICING.APPLY_DISCOUNT);
  const constraintTypes = CONSTRAINT_TYPES.filter((t) => can(CONSTRAINT_PERMISSION[t]));
  const list = (key, blank) => ({
    add: () => onChange({ [key]: [...value[key], blank] }),
    set: (i, patch) => onChange({ [key]: value[key].map((r, j) => (j === i ? { ...r, ...patch } : r)) }),
    remove: (i) => onChange({ [key]: value[key].filter((_, j) => j !== i) }),
  });
  const promos = list('promotions', { name: '', percentage: '' });
  const manual = list('manual_adjustments', { name: '', amount: '', reason: '' });
  return (
    <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3" disabled={disabled}>
      <legend className="px-1 text-xs font-bold">Estimate terms</legend>
      {constraintTypes.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <SelectField label="Price constraint" value={value.constraint_type} onChange={(v) => onChange({ constraint_type: v })}
            options={[['', 'None'], ...constraintTypes.map((t) => [t, humanize(t)])]} hint="Not-to-Exceed caps the price; it is separate from Binding / Non-binding." />
          {value.constraint_type === 'range' ? (
            <>
              <DecimalField label="From" value={value.range_min} onChange={(v) => onChange({ range_min: v })} />
              <DecimalField label="To" value={value.range_max} onChange={(v) => onChange({ range_max: v })} />
            </>
          ) : value.constraint_type && <DecimalField label="Amount" value={value.amount} onChange={(v) => onChange({ amount: v })} />}
        </div>
      ) : value.constraint_type && <p className="text-xs text-slate-600">Constraint: {humanize(value.constraint_type)} {value.amount}</p>}
      {canDiscount ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-semibold">Promotions (%)</p>
            {value.promotions.map((p, i) => (
              // Promotion rows have no identity of their own.
              <div key={`promo-${i}`} className="grid grid-cols-[1.4fr_1fr_auto] items-end gap-2">
                <TextField label="Name" value={p.name} onChange={(v) => promos.set(i, { name: v })} />
                <DecimalField label="Percent" value={p.percentage} onChange={(v) => promos.set(i, { percentage: v })} allowNegative hint="Negative = discount" />
                <Button variant="ghost" aria-label="Remove promotion" onClick={() => promos.remove(i)}><Trash2 size={13} aria-hidden="true" /></Button>
              </div>
            ))}
            <Button variant="ghost" onClick={promos.add}><Plus size={13} aria-hidden="true" /> Promotion</Button>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold">Manual adjustments</p>
            {value.manual_adjustments.map((m, i) => (
              <div key={`adj-${i}`} className="grid grid-cols-[1fr_1fr_1.4fr_auto] items-end gap-2">
                <TextField label="Name" value={m.name} onChange={(v) => manual.set(i, { name: v })} />
                <DecimalField label="Amount" value={m.amount} onChange={(v) => manual.set(i, { amount: v })} allowNegative />
                <TextField label="Reason" value={m.reason} onChange={(v) => manual.set(i, { reason: v })} />
                <Button variant="ghost" aria-label="Remove adjustment" onClick={() => manual.remove(i)}><Trash2 size={13} aria-hidden="true" /></Button>
              </div>
            ))}
            <Button variant="ghost" onClick={manual.add}><Plus size={13} aria-hidden="true" /> Adjustment</Button>
          </div>
        </div>
      ) : (value.promotions.length + value.manual_adjustments.length > 0) && <p className="text-xs text-slate-600">Discounts and adjustments are set (you cannot change them).</p>}
      <CheckboxField label="Customer is tax exempt" hint="Uses the customer's approved exemption; the backend refuses without one." checked={value.tax_exempt} onChange={(v) => onChange({ tax_exempt: v })} />
    </fieldset>
  );
}

function OverridesBlock({ estimate, overrides, charges, onAdd, onRevoke, locked }) {
  const { can } = useCan();
  const rows = (overrides.data || []).filter((o) => o.state === 'active');
  const canOverride = !locked && can(ESTIMATES.UPDATE_DRAFT) && (can(PRICING.OVERRIDE_RATE) || can(PRICING.OVERRIDE_MINIMUM));
  if (!rows.length && !canOverride) return null;
  return (
    <Section title="Overrides" description="Hand-set rates or amounts on individual charges. They need a reason and may need approval."
      actions={canOverride && charges.length > 0 && !['sent', 'viewed'].includes(estimate.lifecycle_state) && <Button variant="ghost" onClick={onAdd}><Plus size={13} aria-hidden="true" /> Override a charge</Button>}>
      {!rows.length ? <p className="text-xs text-slate-500">No active overrides.</p> : (
        <ul className="space-y-1 text-xs">
          {rows.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5">
              <span className="font-semibold">{o.target_key}</span><span>{humanize(o.override_type)}: {Object.values(o.override_value || {}).join(', ')}</span>
              <span className="flex-1 text-slate-500">{o.reason}</span>
              {canOverride && <Button variant="ghost" onClick={() => onRevoke(o.id)}>Remove</Button>}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function ScopeEditor({ estimate, planned, editable, onSaved }) {
  const [selected, setSelected] = useState(() => estimate.scope_jobs.map((j) => j.job_id));
  const [primary, setPrimary] = useState(() => estimate.scope_jobs.find((j) => j.is_primary)?.job_id || null);
  const save = useAction(() => estimatesApi.setScope(estimate.id, {
    scope_jobs: selected.map((id) => ({ job_id: id, is_primary: id === primary })), updated_at: estimate.updated_at,
  }), { success: 'Scope saved. The price must be recalculated.', invalidate: onSaved });
  const jobs = planned.length ? planned : estimate.scope_jobs.map((j) => ({ id: j.job_id, title: j.title, service_type_name: j.service_type_name }));
  return (
    <div className="space-y-2">
      {!editable && <Callout>The scope can change only while the Estimate is a draft or ready. Revise a sent Estimate to change it.</Callout>}
      <ul className="space-y-1">
        {jobs.map((job) => (
          <li key={job.id} className="flex items-center gap-3 text-xs">
            <CheckboxField label={`${job.title}${job.service_type_name ? ` · ${job.service_type_name}` : ''}`} checked={selected.includes(job.id)} disabled={!editable}
              onChange={(on) => setSelected(on ? [...selected, job.id] : selected.filter((id) => id !== job.id))} />
            {selected.includes(job.id) && <label className="flex items-center gap-1"><input type="radio" name="scope-primary" disabled={!editable} checked={primary === job.id} onChange={() => setPrimary(job.id)} /> Primary</label>}
          </li>
        ))}
      </ul>
      {editable && <div className="flex justify-end"><Button onClick={() => save.run()} busy={save.busy} disabled={!selected.length}>Save scope</Button></div>}
    </div>
  );
}

function HistoryBlock({ estimate }) {
  return (
    <div className="space-y-3 text-xs">
      <Section title="Customer versions" description="Every version the customer was sent or accepted is kept unchanged.">
        {!estimate.versions.length ? <p className="text-slate-500">Not sent yet.</p> : (
          <ul className="space-y-1">
            {estimate.versions.map((v) => (
              <li key={v.id} className="flex flex-wrap gap-2 rounded-lg border border-slate-200 px-3 py-1.5">
                <span className="font-semibold">Version {v.version_number}</span><span>{humanize(v.version_reason)}</span>
                <span className="text-slate-500">{formatDateTime(v.created_at)} · run #{v.pricing_run_id}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Acceptance evidence">
        {!estimate.acceptances.length ? <p className="text-slate-500">No acceptance recorded.</p> : (
          <ul className="space-y-1">
            {estimate.acceptances.map((a) => (
              <li key={a.id} className="rounded-lg border border-slate-200 px-3 py-1.5">
                <span className="font-semibold">{a.signer_name}</span> accepted version {a.version_number} by {humanize(a.acceptance_method)} on {formatDateTime(a.accepted_at)}
                {a.consent_text && <span className="block text-slate-500">{a.consent_text}</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Customer activity">
        {!estimate.portal_events.length ? <p className="text-slate-500">No portal activity.</p> : (
          <ul className="space-y-0.5">{estimate.portal_events.map((e) => <li key={e.id}>{humanize(e.event_type)} · {formatDateTime(e.occurred_at)}</li>)}</ul>
        )}
      </Section>
    </div>
  );
}
