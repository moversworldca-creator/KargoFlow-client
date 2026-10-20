// Customer / contract pricing as a shallow overlay on ONE published Tariff
// revision: rate and cell overrides, rules switched off, negotiated
// adjustments and an optional constraint. The base revision is never changed.
// Overlays go through validate -> approve -> publish like revisions.
import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import useCan from '../../../shared/auth/useCan';
import AsyncSelect from '../../../shared/ui/AsyncSelect';
import { pricingApi } from '../api';
import { CONSTRAINT_TYPES } from '../constants';
import { formatDateTime, formatMoney, humanize } from '../format';
import { PRICING } from '../permissions';
import { pricingKeys, useInvalidatePricing, useOverlays, useRevision, useTariff, useTariffs } from '../queries';
import { searchCustomers } from './ApplicabilityEditor';
import {
  Badge, Button, CheckboxField, ConfirmDialog, DecimalField, Dialog, ErrorBanner, Field, QueryState, Section,
  SelectField, StateBadge, TextField, useAction,
} from './ui';

const OVERLAY_TONE = { draft: 'slate', validated: 'blue', approved: 'indigo', published: 'green', retired: 'dark', rejected: 'rose' };
const ACTIONS = [
  ['validate', 'Validate', PRICING.VALIDATE, ['draft']],
  ['approve', 'Approve', PRICING.APPROVE, ['validated']],
  ['publish', 'Publish', PRICING.PUBLISH, ['approved']],
  ['retire', 'Retire', PRICING.RETIRE, ['published']],
];

export default function OverlaysSettings() {
  const { can } = useCan();
  const overlays = useOverlays({});
  const invalidate = useInvalidatePricing();
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const act = useAction(({ id, action }) => pricingApi.overlayAction(id, action), {
    success: (_, { action }) => `Contract pricing ${action === 'validate' ? 'validated' : `${action}d`}.`,
    invalidate: () => invalidate(['pricing', 'overlays']), onSuccess: () => setConfirm(null),
  });
  const rows = overlays.data || [];
  return (
    <Section
      title="Contract pricing"
      description="Customer or contract pricing layered on one published Tariff revision. The base Tariff is never changed."
      actions={can(PRICING.CREATE) && <Button onClick={() => setEditing({})}><Plus size={14} aria-hidden="true" /> New contract pricing</Button>}
    >
      <QueryState query={overlays} empty={!rows.length} emptyText="No contract pricing yet.">
        <ul className="space-y-1.5">
          {rows.map((overlay) => (
            <li key={overlay.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs">
              <span className="font-semibold">{overlay.name}</span>
              <StateBadge state={overlay.state} tones={OVERLAY_TONE} />
              <span className="flex-1 text-slate-600">
                {overlay.customer_id ? `Customer #${overlay.customer_id}` : 'Any customer'}{overlay.contract_key && ` · contract ${overlay.contract_key}`}
                {' '}· on revision {overlay.base_revision_number}{overlay.published_at && ` · published ${formatDateTime(overlay.published_at)}`}
              </span>
              <Button variant="ghost" aria-expanded={expanded === overlay.id} onClick={() => setExpanded(expanded === overlay.id ? null : overlay.id)}>{expanded === overlay.id ? 'Hide overrides' : 'Show overrides'}</Button>
              {overlay.state === 'draft' && can(PRICING.UPDATE_DRAFT) && <Button variant="ghost" aria-label={`Edit ${overlay.name}`} onClick={() => setEditing(overlay)}><Pencil size={13} aria-hidden="true" /></Button>}
              {ACTIONS.filter(([, , permission, states]) => can(permission) && states.includes(overlay.state)).map(([action, label]) => (
                <Button key={action} variant={action === 'retire' ? 'danger' : 'ghost'} onClick={() => setConfirm({ id: overlay.id, action, label, name: overlay.name })}>{label}</Button>
              ))}
              {expanded === overlay.id && <OverlaySummary overlay={overlay} />}
            </li>
          ))}
        </ul>
      </QueryState>
      {editing && <OverlayDialog overlay={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); invalidate(['pricing', 'overlays']); }} />}
      {confirm && (
        <ConfirmDialog title={`${confirm.label} ${confirm.name}?`} confirmLabel={confirm.label} tone={confirm.action === 'retire' ? 'danger' : 'primary'}
          busy={act.busy} error={act.error?.message} onCancel={() => setConfirm(null)} onConfirm={() => act.run(confirm)}>
          {confirm.action === 'publish' && <p>New calculations for this customer / contract use the overlay. Existing Estimates keep their stored pricing.</p>}
          {confirm.action === 'retire' && <p>The overlay stops applying. If the customer is still expected to have contract pricing, pricing stops instead of falling back to retail rates.</p>}
        </ConfirmDialog>
      )}
    </Section>
  );
}

function OverlayDialog({ overlay, onClose, onSaved }) {
  const config = overlay.configuration || {};
  const tariffs = useTariffs({ limit: 200 });
  const [tariffId, setTariffId] = useState(overlay.catalog_id ? String(overlay.catalog_id) : '');
  const tariff = useTariff(Number(tariffId) || null);
  const baseRevisionId = overlay.base_catalog_revision_id || tariff.data?.current_published_revision_id || null;
  const base = useRevision(baseRevisionId);
  const [form, setForm] = useState({
    name: overlay.name || '', overlay_key: overlay.overlay_key || '', customer_id: overlay.customer_id || null,
    contract_key: overlay.contract_key || '', priority: String(overlay.priority ?? 100),
    effective_from: overlay.effective_from || '', effective_until: overlay.effective_until || '',
    rate_overrides: config.rate_overrides || [], cell_overrides: config.cell_overrides || [],
    disable_rules: config.disable_rules || [], adjustments: config.adjustments || [],
    constraint: config.constraint || null,
  });
  const set = (patch) => setForm({ ...form, ...patch });
  const rules = base.data?.content?.rules || [];
  const cells = useMemo(() => (base.data?.content?.rate_tables || []).flatMap((t) => (t.cells || []).map((c) => ({ table_key: t.table_key, cell_key: c.cell_key, amount: c.amount }))), [base.data]);

  const save = useAction(() => {
    const configuration = {};
    if (form.rate_overrides.length) configuration.rate_overrides = form.rate_overrides;
    if (form.cell_overrides.length) configuration.cell_overrides = form.cell_overrides;
    if (form.disable_rules.length) configuration.disable_rules = form.disable_rules;
    if (form.adjustments.length) configuration.adjustments = form.adjustments;
    if (form.constraint?.constraint_type) configuration.constraint = form.constraint;
    const body = {
      name: form.name, overlay_key: form.overlay_key, customer_id: form.customer_id, contract_key: form.contract_key,
      priority: Number(form.priority || 100), effective_from: form.effective_from || null, effective_until: form.effective_until || null,
      base_catalog_revision_id: baseRevisionId, configuration, lock_version: overlay.lock_version,
    };
    return overlay.id ? pricingApi.updateOverlay(overlay.id, body) : pricingApi.createOverlay(body);
  }, { success: 'Contract pricing saved as draft.', onSuccess: onSaved, silent: true });

  const listEditor = (key, blank, render) => (
    <div className="space-y-1">
      {form[key].map((row, index) => (
        <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          {render(row, (patch) => set({ [key]: form[key].map((r, i) => (i === index ? { ...r, ...patch } : r)) }), index)}
          <Button variant="ghost" aria-label="Remove" onClick={() => set({ [key]: form[key].filter((_, i) => i !== index) })}><Trash2 size={13} aria-hidden="true" /></Button>
        </div>
      ))}
      <Button variant="ghost" onClick={() => set({ [key]: [...form[key], blank] })}><Plus size={13} aria-hidden="true" /> Add</Button>
    </div>
  );

  return (
    <Dialog title={overlay.id ? 'Edit contract pricing' : 'New contract pricing'} onClose={onClose} size="lg" busy={save.busy} footer={(
      <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.run()} busy={save.busy} disabled={!baseRevisionId}>Save draft</Button></>
    )}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField label="Name" value={form.name} onChange={(v) => set({ name: v })} required />
          <TextField label="Key" value={form.overlay_key} onChange={(v) => set({ overlay_key: v.toLowerCase() })} disabled={Boolean(overlay.id)} required />
          <SelectField label="Base Tariff" value={tariffId} onChange={setTariffId} disabled={Boolean(overlay.id)}
            options={[['', 'Choose…'], ...(tariffs.data?.results || []).filter((t) => t.current_published_revision_id).map((t) => [String(t.id), t.name])]} />
          <Field label="Customer">
            <AsyncSelect aria-label="Customer" value={form.customer_id} onChange={(v) => set({ customer_id: v || null })} fetchOptions={searchCustomers} placeholder="Any customer" initialLabel={form.customer_id ? `Customer #${form.customer_id}` : ''} />
          </Field>
          <TextField label="Contract key" value={form.contract_key} onChange={(v) => set({ contract_key: v })} />
          <TextField label="Priority" value={form.priority} inputMode="numeric" onChange={(v) => set({ priority: v.replace(/\D/g, '') })} />
          <TextField label="Effective from" type="date" value={form.effective_from} onChange={(v) => set({ effective_from: v })} />
          <TextField label="Effective until" type="date" value={form.effective_until} onChange={(v) => set({ effective_until: v })} />
        </div>
        {baseRevisionId && <p className="text-xs text-slate-600">Based on revision {base.data?.revision_number ?? '…'} of the Tariff. Overrides below change only this customer&apos;s price.</p>}
        <fieldset><legend className="text-xs font-bold">Rule rate overrides</legend>
          {listEditor('rate_overrides', { rule_key: '', rate_amount: '' }, (row, update) => (
            <>
              <SelectField label="Rule" value={row.rule_key} onChange={(v) => update({ rule_key: v })} options={[['', 'Choose…'], ...rules.map((r) => [r.rule_key, r.name])]} />
              <DecimalField label="New rate / amount" value={row.rate_amount ?? row.base_amount ?? ''} onChange={(v) => {
                const rule = rules.find((r) => r.rule_key === row.rule_key);
                update(rule?.calculation_type === 'flat' ? { base_amount: v, rate_amount: undefined } : { rate_amount: v, base_amount: undefined });
              }} />
            </>
          ))}
        </fieldset>
        <fieldset><legend className="text-xs font-bold">Rate cell overrides</legend>
          {listEditor('cell_overrides', { table_key: '', cell_key: '', amount: '' }, (row, update) => (
            <>
              <SelectField label="Cell" value={row.table_key && row.cell_key ? `${row.table_key}::${row.cell_key}` : ''}
                onChange={(v) => { const [table_key, cell_key] = v.split('::'); update({ table_key, cell_key }); }}
                options={[['', 'Choose…'], ...cells.map((c) => [`${c.table_key}::${c.cell_key}`, `${c.table_key} › ${c.cell_key} (base ${c.amount})`])]} />
              <DecimalField label="Amount" value={row.amount} onChange={(v) => update({ amount: v })} />
            </>
          ))}
        </fieldset>
        <fieldset><legend className="text-xs font-bold">Negotiated adjustments</legend>
          {listEditor('adjustments', { key: '', name: '', percentage: '' }, (row, update, index) => (
            <>
              <TextField label="Name" value={row.name} onChange={(v) => update({ name: v, key: row.key || `adj${index + 1}` })} />
              <DecimalField label="Percent (negative = discount)" value={row.percentage} onChange={(v) => update({ percentage: v })} allowNegative />
            </>
          ))}
        </fieldset>
        <fieldset>
          <legend className="text-xs font-bold">Rules switched off for this customer</legend>
          <div className="mt-1 flex flex-wrap gap-3">
            {rules.filter((r) => !['tax', 'deposit'].includes(r.rule_type)).map((r) => (
              <CheckboxField key={r.rule_key} label={r.name} checked={form.disable_rules.includes(r.rule_key)}
                onChange={(on) => set({ disable_rules: on ? [...form.disable_rules, r.rule_key] : form.disable_rules.filter((k) => k !== r.rule_key) })} />
            ))}
          </div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Contract constraint" value={form.constraint?.constraint_type || ''} onChange={(v) => set({ constraint: v ? { ...(form.constraint || {}), constraint_type: v } : null })}
            options={[['', 'None'], ...CONSTRAINT_TYPES.filter((t) => t !== 'range').map((t) => [t, humanize(t)])]} />
          {form.constraint?.constraint_type && <DecimalField label="Constraint amount" value={form.constraint.amount || ''} onChange={(v) => set({ constraint: { ...form.constraint, amount: v } })} />}
        </div>
        {overlay.id && <Badge>Editing a draft. Publishing requires validation and approval.</Badge>}
      </div>
      <ErrorBanner message={save.error?.message} />
    </Dialog>
  );
}


/** Base Tariff revision + this customer's overrides, shown as before -> after. The base is never edited. */
export function OverlaySummary({ overlay }) {
  const base = useRevision(overlay.base_catalog_revision_id);
  const config = overlay.configuration || {};
  const rules = base.data?.content?.rules || [];
  const cells = (base.data?.content?.rate_tables || []).flatMap((t) => (t.cells || []).map((c) => ({ ...c, table_key: t.table_key })));
  const ruleName = (key) => rules.find((r) => r.rule_key === key)?.name || key;
  const before = (key) => {
    const rule = rules.find((r) => r.rule_key === key);
    return rule ? (rule.rate_amount ?? rule.base_amount ?? rule.percentage) : null;
  };
  const lines = [
    ...(config.rate_overrides || []).map((o) => [ruleName(o.rule_key), formatMoney(before(o.rule_key)), formatMoney(o.rate_amount ?? o.base_amount ?? o.percentage)]),
    ...(config.cell_overrides || []).map((o) => [`${o.table_key} › ${o.cell_key}`, formatMoney(cells.find((c) => c.table_key === o.table_key && c.cell_key === o.cell_key)?.amount), formatMoney(o.amount)]),
    ...(config.minimum_overrides || []).map((o) => [`${ruleName(o.rule_key)} minimum`, '—', o.minimum_amount ? formatMoney(o.minimum_amount) : `${o.minimum_quantity}`]),
    ...(config.disable_rules || []).map((key) => [ruleName(key), 'Standard', 'Waived']),
    ...(config.adjustments || []).map((a) => [a.name || a.key, '—', a.percentage ? `${a.percentage}%` : formatMoney(a.amount)]),
  ];
  return (
    <div className="mt-2 w-full rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
      <p className="text-[11px]"><span className="font-semibold">Base:</span> revision {overlay.base_revision_number} (unchanged) <span className="font-semibold">+ Contract:</span> {overlay.name}</p>
      {!lines.length ? <p className="mt-1 text-[11px] text-slate-500">No overrides.</p> : (
        <table className="mt-1 w-full text-left text-[11px]">
          <caption className="sr-only">Overrides of {overlay.name}</caption>
          <thead className="text-slate-500"><tr><th scope="col">Item</th><th scope="col">Base</th><th scope="col">Contract</th></tr></thead>
          <tbody>{lines.map(([item, from, to]) => (
            <tr key={`${item}-${to}`}><td className="py-0.5">{item}</td><td>{from}</td><td className="font-semibold">→ {to}</td></tr>
          ))}</tbody>
        </table>
      )}
      {config.constraint?.constraint_type && <p className="mt-1 text-[11px]">Contract {humanize(config.constraint.constraint_type)}: {formatMoney(config.constraint.amount)}</p>}
    </div>
  );
}
