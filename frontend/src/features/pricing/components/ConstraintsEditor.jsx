// Commercial constraints configured in the Tariff: Fixed Price, Not-to-Exceed,
// Minimum and Range. A Not-to-Exceed caps the price; it is not the same thing
// as a Binding / Non-Binding estimate (that is the Estimate's binding type).
import React, { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { pricingApi } from '../api';
import { CONSTRAINT_TYPES } from '../constants';
import { formatMoney, humanize } from '../format';
import FormulaField from './FormulaField';
import {
  Badge, Button, Callout, CheckboxField, ConfirmDialog, DecimalField, Dialog, EmptyState, ErrorBanner, SelectField,
  TextField, useAction,
} from './ui';

export default function ConstraintsEditor({ revision, editable, onChanged }) {
  const rows = revision.content?.constraints || [];
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const remove = useAction((row) => pricingApi.deleteItem(revision.id, 'constraints', row.id, revision.lock_version), {
    success: 'Removed.', invalidate: onChanged, onSuccess: () => setDeleting(null),
  });
  return (
    <div className="space-y-2">
      <Callout>Not-to-Exceed caps the total; it is independent of whether an Estimate is Binding or Non-Binding. A constraint set on an individual Estimate needs its own override permission.</Callout>
      {editable && <div className="flex justify-end"><Button onClick={() => setEditing({})}><Plus size={14} aria-hidden="true" /> Add constraint</Button></div>}
      {!rows.length ? <EmptyState>No Tariff-level constraints.</EmptyState> : (
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs">
              <span className="font-semibold">{row.constraint_key}</span>
              <Badge tone="blue">{humanize(row.constraint_type)}</Badge>
              <span className="flex-1">
                {row.constraint_type === 'range' ? `${formatMoney(row.range_min)} – ${formatMoney(row.range_max)}` : formatMoney(row.amount)}
                {row.condition_expression?.expr && <code className="ml-2 text-[11px] text-slate-500">when {row.condition_expression.expr}</code>}
                {row.requires_approval && <span className="ml-2 text-amber-700">needs approval</span>}
              </span>
              {editable && (
                <span className="inline-flex gap-1">
                  <Button variant="ghost" aria-label={`Edit ${row.constraint_key}`} onClick={() => setEditing(row)}><Pencil size={13} aria-hidden="true" /></Button>
                  <Button variant="ghost" aria-label={`Remove ${row.constraint_key}`} onClick={() => setDeleting(row)}><Trash2 size={13} aria-hidden="true" /></Button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {editing && <ConstraintDialog row={editing} revision={revision} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />}
      {deleting && (
        <ConfirmDialog title={`Remove ${deleting.constraint_key}?`} confirmLabel="Remove" busy={remove.busy} error={remove.error?.message}
          onCancel={() => setDeleting(null)} onConfirm={() => remove.run(deleting)}><p>Removed from this draft only.</p></ConfirmDialog>
      )}
    </div>
  );
}

function ConstraintDialog({ row, revision, onClose, onSaved }) {
  const text = (v) => (v === null || v === undefined ? '' : String(v));
  const [form, setForm] = useState({
    constraint_key: row.constraint_key || '', constraint_type: row.constraint_type || 'not_to_exceed',
    amount: text(row.amount), range_min: text(row.range_min), range_max: text(row.range_max),
    condition: row.condition_expression?.expr || '', priority: text(row.priority ?? 100),
    requires_approval: Boolean(row.requires_approval), is_active: row.is_active ?? true,
  });
  const set = (patch) => setForm({ ...form, ...patch });
  const save = useAction(() => {
    const body = {
      constraint_key: form.constraint_key, constraint_type: form.constraint_type,
      amount: form.constraint_type === 'range' ? null : form.amount || null,
      range_min: form.constraint_type === 'range' ? form.range_min || null : null,
      range_max: form.constraint_type === 'range' ? form.range_max || null : null,
      condition_expression: form.condition.trim() ? { expr: form.condition.trim() } : {},
      priority: Number(form.priority || 100), requires_approval: form.requires_approval, is_active: form.is_active,
      lock_version: revision.lock_version,
    };
    return row.id ? pricingApi.updateItem(revision.id, 'constraints', row.id, body) : pricingApi.createItem(revision.id, 'constraints', body);
  }, { success: 'Constraint saved.', onSuccess: onSaved, silent: true });
  return (
    <Dialog title={row.id ? 'Edit constraint' : 'Add constraint'} onClose={onClose} busy={save.busy} footer={(
      <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.run()} busy={save.busy}>Save</Button></>
    )}>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Key" value={form.constraint_key} onChange={(v) => set({ constraint_key: v.toLowerCase() })} disabled={Boolean(row.id)} required />
        <SelectField label="Type" value={form.constraint_type} onChange={(v) => set({ constraint_type: v })} options={CONSTRAINT_TYPES} />
        {form.constraint_type === 'range' ? (
          <>
            <DecimalField label="Range from" value={form.range_min} onChange={(v) => set({ range_min: v })} />
            <DecimalField label="Range to" value={form.range_max} onChange={(v) => set({ range_max: v })} />
          </>
        ) : <DecimalField label="Amount" value={form.amount} onChange={(v) => set({ amount: v })} />}
        <TextField label="Priority" value={form.priority} inputMode="numeric" onChange={(v) => set({ priority: v.replace(/\D/g, '') })} />
      </div>
      <div className="mt-3 space-y-3">
        <FormulaField label="Applies when (condition)" value={form.condition} onChange={(v) => set({ condition: v })} condition />
        <div className="flex gap-4">
          <CheckboxField label="Requires approval" checked={form.requires_approval} onChange={(v) => set({ requires_approval: v })} />
          <CheckboxField label="Active" checked={form.is_active} onChange={(v) => set({ is_active: v })} />
        </div>
      </div>
      <ErrorBanner message={save.error?.message} />
    </Dialog>
  );
}
