// Dialogs of the Estimate workflow: create, send (link + email through
// Communications), record acceptance, cancel, revise, proposal options and
// pricing overrides. Each is one backend command; its refusal is shown as is.
import React, { useState } from 'react';
import { Copy } from 'lucide-react';
import useCan from '../../../shared/auth/useCan';
import { pricingApi } from '../../pricing/api';
import { OVERRIDE_TYPES, RECALCULATION_POLICIES } from '../../pricing/constants';
import { formatDateTime, formatMoney, humanize, isoToLocalInput, localInputToIso } from '../../pricing/format';
import { OPPORTUNITY } from '../../pricing/permissions';
import {
  Button, Callout, CheckboxField, DecimalField, Dialog, ErrorBanner, SelectField, TextAreaField, TextField, useAction,
} from '../../pricing/components/ui';
import { estimatesApi } from '../api';

export function CreateEstimateDialog({ opportunityId, workspace, onClose, onCreated }) {
  const jobs = workspace?.planned_jobs || [];
  const [form, setForm] = useState({
    option_label: '', option_description: '', binding_type: workspace?.opportunity?.binding_type || 'non_binding',
    jobIds: jobs.map((j) => j.id), primary: jobs.find((j) => j.is_primary)?.id || jobs[0]?.id || null,
    proposal_group_id: '', copy_from: '',
  });
  const set = (patch) => setForm({ ...form, ...patch });
  const groups = (workspace?.proposal_groups || []).filter((g) => g.state === 'open');
  const create = useAction(async () => {
    let pricingInputs;
    if (form.copy_from) {
      const source = await estimatesApi.getEstimate(Number(form.copy_from));
      pricingInputs = source.pricing_inputs;
    }
    return estimatesApi.createEstimate(opportunityId, {
      option_label: form.option_label || 'Estimate', option_description: form.option_description,
      binding_type: form.binding_type, proposal_group_id: form.proposal_group_id ? Number(form.proposal_group_id) : null,
      scope_jobs: form.jobIds.map((id) => ({ job_id: id, is_primary: id === form.primary })),
      ...(pricingInputs ? { pricing_inputs: pricingInputs } : {}),
    });
  }, { success: 'Estimate created as a draft.', onSuccess: onCreated, silent: true });
  const toggle = (id) => set({ jobIds: form.jobIds.includes(id) ? form.jobIds.filter((j) => j !== id) : [...form.jobIds, id] });
  return (
    <Dialog title="New Estimate" description="Another Estimate on this same Opportunity. Use options to offer alternatives (e.g. economy vs full service)." onClose={onClose} busy={create.busy}
      footer={(<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => create.run()} busy={create.busy} disabled={!form.jobIds.length}>Create draft</Button></>)}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Option name" value={form.option_label} onChange={(v) => set({ option_label: v })} placeholder="Standard, Economy, Full pack…" />
          <SelectField label="Estimate type" value={form.binding_type} onChange={(v) => set({ binding_type: v })} options={[['non_binding', 'Non-binding'], ['binding', 'Binding']]} />
          {groups.length > 0 && <SelectField label="Add to option group" value={form.proposal_group_id} onChange={(v) => set({ proposal_group_id: v })} options={[['', 'No group'], ...groups.map((g) => [String(g.id), g.name])]} />}
          {(workspace?.estimates || []).length > 0 && (
            <SelectField label="Copy pricing inputs from" value={form.copy_from} onChange={(v) => set({ copy_from: v })}
              options={[['', 'Start empty'], ...workspace.estimates.map((e) => [String(e.id), `${e.estimate_number} · ${e.option_label}`])]} />
          )}
        </div>
        <TextAreaField label="Description shown to the customer" value={form.option_description} onChange={(v) => set({ option_description: v })} rows={2} />
        <fieldset>
          <legend className="text-xs font-semibold text-slate-700">Planned Jobs in this Estimate</legend>
          {!jobs.length && <Callout tone="warning">This Opportunity has no Planned Jobs. Add one before creating an Estimate.</Callout>}
          <ul className="mt-1 space-y-1">
            {jobs.map((job) => (
              <li key={job.id} className="flex items-center gap-3 text-xs">
                <CheckboxField label={`${job.title}${job.service_type_name ? ` · ${job.service_type_name}` : ''}`} checked={form.jobIds.includes(job.id)} onChange={() => toggle(job.id)} />
                {form.jobIds.includes(job.id) && (
                  <label className="flex items-center gap-1 text-slate-600"><input type="radio" name="primary-job" checked={form.primary === job.id} onChange={() => set({ primary: job.id })} /> Primary</label>
                )}
              </li>
            ))}
          </ul>
        </fieldset>
      </div>
      <ErrorBanner message={create.error?.message} />
    </Dialog>
  );
}

const linkFor = (portal) => portal?.url || (typeof window !== 'undefined' ? `${window.location.origin}${portal?.path || ''}` : portal?.path);

export function SendEstimateDialog({ estimate, opportunityId, customerEmail, customerName, recipients = [], onClose, onSent, reissue = false }) {
  const { can } = useCan();
  const [expiresAt, setExpiresAt] = useState(isoToLocalInput(estimate.expires_at));
  const [portal, setPortal] = useState(null);
  const options = recipients.length ? recipients : (customerEmail ? [{ label: customerEmail, value: customerEmail }] : []);
  const [selected, setSelected] = useState(() => (options[0] ? [options[0].value] : []));
  const [extra, setExtra] = useState('');
  const [email, setEmail] = useState({ subject: `Your estimate ${estimate.estimate_number}`, body: '' });
  const to = [...selected, ...extra.split(',').map((v) => v.trim()).filter(Boolean)];
  const [copied, setCopied] = useState(false);
  const send = useAction(() => (reissue
    ? estimatesApi.reissueLink(estimate.id)
    : estimatesApi.send(estimate.id, expiresAt !== isoToLocalInput(estimate.expires_at) ? { expires_at: localInputToIso(expiresAt) } : {})), {
    success: reissue ? 'A new link was issued; the previous one no longer works.' : 'Estimate sent. A customer version was recorded.',
    onSuccess: (data) => {
      setPortal(data.portal);
      const url = linkFor(data.portal);
      setEmail((prev) => ({ ...prev, body: `Hello ${customerName || ''},\n\nYour estimate "${estimate.customer_display_label || estimate.option_label}" is ready. Review and accept it here:\n${url}\n\nThis link is personal to you.` }));
      onSent?.(data);
    },
    silent: true,
  });
  const mail = useAction(() => estimatesApi.sendEmail(opportunityId, {
    to, subject: email.subject, body_text: email.body,
    body_html: email.body.split('\n').map((line) => line.replace(/&/g, '&amp;').replace(/</g, '&lt;')).join('<br>'),
  }), { success: 'Email queued.', onSuccess: onClose, silent: true });
  const copy = async () => {
    try { await navigator.clipboard.writeText(linkFor(portal)); setCopied(true); } catch { setCopied(false); }
  };
  return (
    <Dialog title={reissue ? 'New customer link' : `Send ${estimate.estimate_number}`} onClose={onClose} busy={send.busy || mail.busy} size="lg"
      footer={portal ? <Button variant="ghost" onClick={onClose}>Done</Button> : (
        <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => send.run()} busy={send.busy}>{reissue ? 'Issue new link' : 'Send estimate'}</Button></>
      )}>
      {!portal ? (
        <div className="space-y-3">
          {!reissue && <p className="text-xs text-slate-600">Sending records the version the customer sees and creates a personal link. Accepting the estimate does not book the move.</p>}
          {!reissue && <TextField label="Estimate expires" type="datetime-local" value={expiresAt} onChange={setExpiresAt} hint="Optional. In your local time." />}
          <ErrorBanner message={send.error && `${send.error.message}${send.error.detail ? ` (${send.error.detail})` : ''}`} />
        </div>
      ) : (
        <div className="space-y-3">
          <Callout tone="success" title="Customer link">
            <span className="break-all font-mono text-[11px]">{linkFor(portal)}</span>
            <span className="block">Valid until {formatDateTime(portal.expires_at)}. It is shown only now; issue a new one if it is lost.</span>
          </Callout>
          <Button variant="ghost" onClick={copy}><Copy size={13} aria-hidden="true" /> {copied ? 'Copied' : 'Copy link'}</Button>
          {can(OPPORTUNITY.SEND_EMAIL) ? (
            <div className="space-y-2 rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-semibold">Email the customer</p>
              <fieldset>
                <legend className="text-xs font-semibold text-slate-700">Recipients (Opportunity contacts)</legend>
                {!options.length && <p className="text-[11px] text-amber-800">This Opportunity has no contact email. Add one, or type an address below.</p>}
                {options.map((option) => (
                  <CheckboxField key={option.value} label={option.label} checked={selected.includes(option.value)}
                    onChange={(on) => setSelected(on ? [...selected, option.value] : selected.filter((v) => v !== option.value))} />
                ))}
              </fieldset>
              <TextField label="Other recipients" value={extra} onChange={setExtra} placeholder="name@example.com, other@example.com" />
              <TextField label="Subject" value={email.subject} onChange={(v) => setEmail({ ...email, subject: v })} />
              <TextAreaField label="Message" value={email.body} onChange={(v) => setEmail({ ...email, body: v })} rows={6} />
              <div className="flex justify-end"><Button onClick={() => mail.run()} busy={mail.busy} disabled={!to.length}>Send email</Button></div>
              <ErrorBanner message={mail.error?.message} />
            </div>
          ) : <Callout>You cannot send emails. Copy the link and share it with the customer.</Callout>}
        </div>
      )}
    </Dialog>
  );
}

const STAFF_METHODS = [
  ['in_person', 'In person'],
  ['phone_with_documented_consent', 'By phone (consent documented)'],
  ['offline_signed_document', 'Signed document received'],
  ['other_approved', 'Other approved method'],
];

export function RecordAcceptanceDialog({ title, onSubmit, onClose, onDone }) {
  const [form, setForm] = useState({ method: 'in_person', signer_name: '', signer_email: '', consent_note: '', evidence_asset_id: '' });
  const set = (patch) => setForm({ ...form, ...patch });
  const save = useAction(() => onSubmit({ ...form, evidence_asset_id: form.evidence_asset_id ? Number(form.evidence_asset_id) : null }), {
    success: 'Acceptance recorded.', onSuccess: onDone, silent: true,
  });
  return (
    <Dialog title={title} description="Record how the customer accepted. Nothing is signed on the customer's behalf; online acceptance happens in the customer portal." onClose={onClose} busy={save.busy}
      footer={(<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.run()} busy={save.busy} disabled={!form.signer_name.trim()}>Record acceptance</Button></>)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField label="How did the customer accept?" value={form.method} onChange={(v) => set({ method: v })} options={STAFF_METHODS} />
        <TextField label="Customer name" value={form.signer_name} onChange={(v) => set({ signer_name: v })} required />
        <TextField label="Customer email" type="email" value={form.signer_email} onChange={(v) => set({ signer_email: v })} />
        {form.method === 'offline_signed_document' && <TextField label="Signed document (file id)" value={form.evidence_asset_id} inputMode="numeric" onChange={(v) => set({ evidence_asset_id: v.replace(/\D/g, '') })} hint="Upload the signed document in Files, then enter its id." required />}
      </div>
      {['phone_with_documented_consent', 'other_approved'].includes(form.method) && (
        <div className="mt-3"><TextAreaField label="How consent was documented" value={form.consent_note} onChange={(v) => set({ consent_note: v })} required placeholder="Call on Oct 19 at 10:42, customer confirmed the total and terms." /></div>
      )}
      <ErrorBanner message={save.error?.message} />
    </Dialog>
  );
}

export function ReasonDialog({ title, description, confirmLabel, tone = 'danger', required = true, onSubmit, onClose, onDone, success }) {
  const [reason, setReason] = useState('');
  const save = useAction(() => onSubmit(reason), { success, onSuccess: onDone, silent: true });
  return (
    <Dialog title={title} description={description} onClose={onClose} busy={save.busy} size="sm"
      footer={(<><Button variant="ghost" onClick={onClose}>Back</Button><Button variant={tone} onClick={() => save.run()} busy={save.busy} disabled={required && !reason.trim()}>{confirmLabel}</Button></>)}>
      <TextAreaField label={required ? 'Reason' : 'Reason (optional)'} value={reason} onChange={setReason} required={required} />
      <ErrorBanner message={save.error?.message} />
    </Dialog>
  );
}

export function ProposalGroupDialog({ opportunityId, estimates, onClose, onDone }) {
  const candidates = estimates.filter((e) => e.lifecycle_state === 'draft' && !e.proposal_group_id);
  const [name, setName] = useState('Move options');
  const [ids, setIds] = useState(candidates.map((e) => e.id));
  const save = useAction(() => estimatesApi.createProposalGroup(opportunityId, { name, estimate_ids: ids }), {
    success: 'Options grouped. The customer picks one; the others are then superseded.', onSuccess: onDone, silent: true,
  });
  return (
    <Dialog title="Offer as options" description="Group draft Estimates of this Opportunity as alternatives. All stay on this one Opportunity." onClose={onClose} busy={save.busy}
      footer={(<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.run()} busy={save.busy} disabled={ids.length < 2}>Group options</Button></>)}>
      <TextField label="Group name" value={name} onChange={setName} />
      <fieldset className="mt-3"><legend className="text-xs font-semibold">Options (draft Estimates)</legend>
        {candidates.length < 2 && <Callout>At least two draft Estimates outside a group are needed.</Callout>}
        {candidates.map((e) => <CheckboxField key={e.id} label={`${e.estimate_number} · ${e.option_label}`} checked={ids.includes(e.id)} onChange={(on) => setIds(on ? [...ids, e.id] : ids.filter((i) => i !== e.id))} />)}
      </fieldset>
      <ErrorBanner message={save.error?.message} />
    </Dialog>
  );
}

export function OverrideDialog({ estimate, charges, onClose, onDone }) {
  const [form, setForm] = useState({ target_key: charges[0]?.charge_key || '', override_type: 'line_total_override', value: '', reason: '', recalculation_behavior: 'preserve' });
  const set = (patch) => setForm({ ...form, ...patch });
  const valueField = { rate_override: 'unit_rate', quantity_override: 'quantity', line_total_override: 'amount', fixed_charge_override: 'amount' }[form.override_type];
  const target = charges.find((c) => c.charge_key === form.target_key);
  const current = target ? { unit_rate: formatMoney(target.unit_rate), quantity: `${target.quantity ?? '—'} ${target.unit || ''}`, amount: formatMoney(target.amount) }[valueField || 'amount'] : '—';
  const save = useAction(() => pricingApi.createOverride(estimate.id, {
    target_key: form.target_key, override_type: form.override_type, reason: form.reason,
    recalculation_behavior: form.recalculation_behavior, value: valueField ? { [valueField]: form.value } : {},
  }), { success: 'Override added. Recalculate to apply it.', onSuccess: onDone, silent: true });
  return (
    <Dialog title="Override a charge" description="Overrides need their own permission, a reason, and may need approval. The Estimate must be recalculated." onClose={onClose} busy={save.busy}
      footer={(<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.run()} busy={save.busy} disabled={!form.reason.trim() || (valueField && !form.value)}>Add override</Button></>)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField label="Charge" value={form.target_key} onChange={(v) => set({ target_key: v })} options={charges.map((c) => [c.charge_key, `${c.name} (${c.amount})`])} />
        <SelectField label="Override" value={form.override_type} onChange={(v) => set({ override_type: v })} options={OVERRIDE_TYPES.filter((t) => t !== 'fixed_charge_override')} />
        <p className="text-xs sm:col-span-2"><span className="font-semibold">Current value:</span> {current}</p>
        {valueField && <DecimalField label={`New ${humanize(valueField).toLowerCase()}`} value={form.value} onChange={(v) => set({ value: v })} required />}
        <SelectField label="On recalculation" value={form.recalculation_behavior} onChange={(v) => set({ recalculation_behavior: v })} options={RECALCULATION_POLICIES} />
      </div>
      <div className="mt-3"><TextAreaField label="Reason (required)" value={form.reason} onChange={(v) => set({ reason: v })} required /></div>
      <p className="mt-2 text-[11px] text-slate-500">If the override needs approval, the price shows “Approval required” until an approver decides. Overrides are kept on recalculation according to the option above.</p>
      <ErrorBanner message={save.error && `${save.error.message}${save.error.detail ? ` (${save.error.detail})` : ''}`} />
    </Dialog>
  );
}

export function EditEstimateDialog({ estimate, onClose, onDone }) {
  const [form, setForm] = useState({
    option_label: estimate.option_label || '', customer_display_label: estimate.customer_display_label || '',
    option_description: estimate.option_description || '', binding_type: estimate.binding_type,
    expires_at: isoToLocalInput(estimate.expires_at),
  });
  const set = (patch) => setForm({ ...form, ...patch });
  const save = useAction(() => estimatesApi.updateEstimate(estimate.id, {
    option_label: form.option_label, customer_display_label: form.customer_display_label,
    option_description: form.option_description, binding_type: form.binding_type,
    expires_at: form.expires_at ? localInputToIso(form.expires_at) : null, updated_at: estimate.updated_at,
  }), { success: 'Estimate saved.', onSuccess: onDone, silent: true });
  return (
    <Dialog title="Estimate details" onClose={onClose} busy={save.busy}
      footer={(<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.run()} busy={save.busy}>Save</Button></>)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Option name (internal)" value={form.option_label} onChange={(v) => set({ option_label: v })} />
        <TextField label="Title shown to the customer" value={form.customer_display_label} onChange={(v) => set({ customer_display_label: v })} />
        <SelectField label="Estimate type" value={form.binding_type} onChange={(v) => set({ binding_type: v })} options={[['non_binding', 'Non-binding'], ['binding', 'Binding']]} hint="Changing it makes the pricing stale." />
        <TextField label="Expires" type="datetime-local" value={form.expires_at} onChange={(v) => set({ expires_at: v })} />
      </div>
      <div className="mt-3"><TextAreaField label="Description shown to the customer" value={form.option_description} onChange={(v) => set({ option_description: v })} rows={3} /></div>
      <ErrorBanner message={save.error?.message} />
    </Dialog>
  );
}
