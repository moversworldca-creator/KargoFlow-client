// Change Orders: post-booking commercial changes priced on the booked
// Tariff revisions as a delta (positive or negative). The booked Estimate is
// never rewritten. Accepted Change Orders feed Final Rating.
import React, { useState } from 'react';
import { Calculator, Copy, Plus } from 'lucide-react';
import useCan from '../../../shared/auth/useCan';
import { newIdempotencyKey, pricingApi } from '../../pricing/api';
import { CHANGE_ORDER_STATE_TONE, decimalSign, formatDateTime, formatMoney, humanize } from '../../pricing/format';
import { CHANGE_ORDERS, OPPORTUNITY } from '../../pricing/permissions';
import { useRun } from '../../pricing/queries';
import JobInputsForm, { EMPTY_JOB_INPUTS, cleanJobInputs, jobInputsToForm } from '../../pricing/components/JobInputsForm';
import RunViewer from '../../pricing/components/RunViewer';
import {
  Button, Callout, Dialog, ErrorBanner, LoadingState, Section, SelectField, StateBadge, TextAreaField, TextField,
  useAction,
} from '../../pricing/components/ui';
import { estimatesApi } from '../api';
import { useChangeOrder, useEstimate, useInvalidateEstimates } from '../queries';
import { ReasonDialog, RecordAcceptanceDialog } from './EstimateDialogs';

export default function ChangeOrdersPanel({ workspace, customerEmail }) {
  const { can } = useCan();
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);
  const invalidate = useInvalidateEstimates();
  const orders = workspace.change_orders || [];
  const booked = workspace.opportunity?.is_booked && workspace.opportunity?.booked_estimate_id;
  if (!can(CHANGE_ORDERS.VIEW)) return null;
  return (
    <Section title="Change Orders" description="Changes after booking: added, modified or removed work, priced as a difference on the booked Tariffs."
      actions={booked && can(CHANGE_ORDERS.CREATE) && <Button variant="ghost" onClick={() => setCreating(true)}><Plus size={13} aria-hidden="true" /> New Change Order</Button>}>
      {!booked && <p className="text-xs text-slate-500">Available once the Opportunity is booked. Before booking, revise the Estimate instead.</p>}
      {booked && !orders.length && <p className="text-xs text-slate-500">No Change Orders.</p>}
      <ul className="space-y-1.5">
        {orders.map((o) => (
          <li key={o.id}>
            <button type="button" onClick={() => setOpenId(o.id)} className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-xs hover:bg-slate-50">
              <span className="font-semibold">{o.change_order_number}</span><span>{o.title}</span>
              <StateBadge state={o.lifecycle_state} tones={CHANGE_ORDER_STATE_TONE} />
              <span className={`ml-auto tabular-nums ${decimalSign(o.delta_total) < 0 ? 'text-emerald-700' : ''}`}>{o.pricing_run_id ? `${decimalSign(o.delta_total) > 0 ? '+' : ''}${formatMoney(o.delta_total)}` : 'Not priced'}</span>
            </button>
          </li>
        ))}
      </ul>
      {creating && <CreateChangeOrderDialog workspace={workspace} onClose={() => setCreating(false)} onCreated={(o) => { setCreating(false); invalidate(); setOpenId(o.id); }} />}
      {openId && <ChangeOrderDialog id={openId} workspace={workspace} customerEmail={customerEmail} onClose={() => { setOpenId(null); invalidate(); }} />}
    </Section>
  );
}

function CreateChangeOrderDialog({ workspace, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', reason: '', jobs: {} });
  const save = useAction(() => estimatesApi.createChangeOrder(workspace.opportunity.id, {
    title: form.title, reason: form.reason,
    scope_jobs: Object.entries(form.jobs).filter(([, t]) => t).map(([id, change_type]) => ({ job_id: Number(id), change_type })),
  }), { success: 'Change Order created as a draft.', onSuccess: onCreated, silent: true });
  return (
    <Dialog title="New Change Order" onClose={onClose} busy={save.busy}
      footer={(<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.run()} busy={save.busy} disabled={!form.reason.trim()}>Create</Button></>)}>
      <div className="space-y-3">
        <TextField label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Extra boxes, added storage…" />
        <TextAreaField label="Reason" value={form.reason} onChange={(v) => setForm({ ...form, reason: v })} required />
        <fieldset><legend className="text-xs font-semibold">Affected Planned Jobs</legend>
          {(workspace.planned_jobs || []).map((job) => (
            <div key={job.id} className="mt-1 grid grid-cols-[1fr_160px] items-center gap-2 text-xs">
              <span>{job.title}</span>
              <SelectField label={`Change to ${job.title}`} value={form.jobs[job.id] || ''} onChange={(v) => setForm({ ...form, jobs: { ...form.jobs, [job.id]: v } })}
                options={[['', 'Unchanged'], ['add', 'Added'], ['modify', 'Modified'], ['remove', 'Removed']]} />
            </div>
          ))}
        </fieldset>
      </div>
      <ErrorBanner message={save.error?.message} />
    </Dialog>
  );
}

// Loads the Change Order, then renders the view with it, so every callback
// in the view can rely on the Change Order being present.
function ChangeOrderDialog({ id, workspace, customerEmail, onClose }) {
  const query = useChangeOrder(id);
  if (!query.data) return <Dialog title="Change Order" onClose={onClose}><LoadingState /></Dialog>;
  return <ChangeOrderView id={id} order={query.data} workspace={workspace} customerEmail={customerEmail} onClose={onClose} />;
}

function ChangeOrderView({ id, order, workspace, customerEmail, onClose }) {
  const { can } = useCan();
  const booked = useEstimate(workspace.opportunity.booked_estimate_id);
  const run = useRun((order ? order.pricing_run_id : undefined));
  const invalidate = useInvalidateEstimates();
  const [inputs, setInputs] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [portal, setPortal] = useState(null);
  const [lastDelta, setLastDelta] = useState(null);
  const baseInputs = booked.data?.pricing_inputs?.jobs || {};
  const jobs = (workspace.planned_jobs || []).filter((j) => ((order ? order.scope_jobs : undefined) || []).every((s) => s.job_id !== j.id || s.change_type !== 'remove'));
  const current = inputs || Object.fromEntries(jobs.map((j) => [j.id, jobInputsToForm(baseInputs[j.id] || EMPTY_JOB_INPUTS)]));
  const actions = new Set((order ? order.available_actions : undefined) || []);
  const refresh = () => invalidate();

  const calculate = useAction(() => pricingApi.calculateChangeOrder(id, {
    jobs: jobs.map((j) => ({ job_id: j.id, inputs: cleanJobInputs(current[j.id]) })),
  }, newIdempotencyKey()), { success: 'Change Order priced.', invalidate: refresh, onSuccess: (data) => setLastDelta(data.decision) });
  const ready = useAction(() => estimatesApi.changeOrderReady(id), { success: 'Change Order ready to send.', invalidate: refresh });
  const send = useAction(() => estimatesApi.sendChangeOrder(id), { success: 'Change Order sent.', invalidate: refresh, onSuccess: (data) => setPortal(data.portal) });
  const mail = useAction(({ number, link }) => estimatesApi.sendEmail(workspace.opportunity.id, {
    to: [customerEmail], subject: `Change Order ${number}`,
    body_text: `Please review and accept Change Order ${number}:\n${link}`,
  }), { success: 'Email queued.' });

  return (
    <Dialog title={`${order.change_order_number} · ${order.title}`} description={order.reason} onClose={onClose} size="lg">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <StateBadge state={order.lifecycle_state} tones={CHANGE_ORDER_STATE_TONE} />
          <span>Booked Estimate {order.booked_estimate.estimate_number}: {formatMoney(order.booked_estimate.grand_total)}</span>
          {order.pricing_run_id && <span className="font-semibold">Change: {decimalSign(order.delta_total) > 0 ? '+' : ''}{formatMoney(order.delta_total)}</span>}
        </div>
        {(order.scope_jobs || []).length > 0 && <p className="text-xs text-slate-600">{order.scope_jobs.map((s) => `${s.title}: ${humanize(s.change_type)}`).join(' · ')}</p>}
        {actions.has('calculate') && can(CHANGE_ORDERS.UPDATE_DRAFT) && (
          <div className="space-y-3">
            <p className="text-xs text-slate-600">Enter the job details as they will be after the change. The difference to the booked price is the Change Order amount.</p>
            {jobs.map((job) => (
              <fieldset key={job.id} className="rounded-xl border border-slate-200 p-3">
                <legend className="px-1 text-xs font-bold">{job.title}</legend>
                <JobInputsForm value={current[job.id]} onChange={(v) => setInputs({ ...current, [job.id]: v })} showValuation={false} />
              </fieldset>
            ))}
            <div className="flex justify-end"><Button onClick={() => calculate.run()} busy={calculate.busy}><Calculator size={13} aria-hidden="true" /> Calculate change</Button></div>
          </div>
        )}
        {lastDelta && <Callout tone="info">Booked price {formatMoney(lastDelta.booked_estimate_total)} · change {formatMoney(lastDelta.delta?.total)}</Callout>}
        {run.data && <RunViewer run={run.data} compact />}
        {portal && (
          <Callout tone="success" title="Customer link (shown once)" actions={(
            <>
              <Button variant="ghost" onClick={() => navigator.clipboard?.writeText(portal.url || `${window.location.origin}${portal.path}`)}><Copy size={13} aria-hidden="true" /> Copy</Button>
              {customerEmail && can(OPPORTUNITY.SEND_EMAIL) && <Button onClick={() => mail.run({ number: order.change_order_number, link: portal.url || `${window.location.origin}${portal.path}` })} busy={mail.busy}>Email customer</Button>}
            </>
          )}>
            <span className="break-all font-mono text-[11px]">{portal.url || portal.path}</span> · valid until {formatDateTime(portal.expires_at)}
          </Callout>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          {actions.has('mark_ready') && can(CHANGE_ORDERS.UPDATE_DRAFT) && <Button variant="ghost" onClick={() => ready.run()} busy={ready.busy}>Mark ready</Button>}
          {(actions.has('send') || actions.has('reissue_link')) && can(CHANGE_ORDERS.SEND) && <Button onClick={() => send.run()} busy={send.busy}>{actions.has('send') ? 'Send to customer' : 'New customer link'}</Button>}
          {actions.has('record_acceptance') && can(CHANGE_ORDERS.RECORD_ACCEPTANCE) && <Button variant="ghost" onClick={() => setDialog('accept')}>Record acceptance</Button>}
          {actions.has('cancel') && can(CHANGE_ORDERS.UPDATE_DRAFT) && <Button variant="danger" onClick={() => setDialog('cancel')}>Cancel</Button>}
        </div>
        {(order.acceptances || []).map((a) => <p key={a.id} className="text-xs text-emerald-800">Accepted by {a.signer_name} ({humanize(a.acceptance_method)}) on {formatDateTime(a.accepted_at)}</p>)}
      </div>
      {dialog === 'accept' && <RecordAcceptanceDialog title={`Record acceptance of ${order.change_order_number}`} onSubmit={(body) => estimatesApi.recordChangeOrderAcceptance(id, body)} onClose={() => setDialog(null)} onDone={() => { setDialog(null); refresh(); }} />}
      {dialog === 'cancel' && <ReasonDialog title={`Cancel ${order.change_order_number}?`} confirmLabel="Cancel Change Order" success="Change Order cancelled." onSubmit={(reason) => estimatesApi.cancelChangeOrder(id, reason)} onClose={() => setDialog(null)} onDone={() => { setDialog(null); refresh(); }} />}
    </Dialog>
  );
}
