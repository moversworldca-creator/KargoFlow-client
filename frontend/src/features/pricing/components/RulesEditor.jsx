// Rule builder. Each field maps to a column the Pricing Engine reads; the
// choices offered follow the engine's own rules (phase by rule type, models by
// calculation type) and the backend validates everything again. Formulas and
// conditions are text in the engine's safe expression language, checked by
// the backend's Validate (never evaluated in the browser).
import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { pricingApi } from '../api';
import {
  ALLOCATION_METHODS, ALLOWED_PHASES, CALCULATION_TYPES, CHARGE_SCOPES, COST_CATEGORIES, PERCENTAGE_BASES,
  PRICING_MODELS_BY_TYPE, RULE_TYPES, STACKING_BEHAVIORS, TAX_CLASSIFICATIONS,
} from '../constants';
import { humanize } from '../format';
import ConditionBuilder from './ConditionBuilder';
import FormulaField from './FormulaField';
import { describeCondition } from '../conditions';
import {
  Badge, Button, CheckboxField, ConfirmDialog, DecimalField, Dialog, EmptyState, ErrorBanner, SelectField, TextField,
  useAction,
} from './ui';

const BLANK = {
  rule_key: '', name: '', customer_display_name: '', rule_type: 'labor', calculation_type: 'hourly',
  calculation_phase: 'base', pricing_model: '', charge_scope: 'job', unit: '', base_amount: '', rate_amount: '',
  percentage: '', percentage_basis: '', basis_categories: [], minimum_amount: '', maximum_amount: '',
  minimum_quantity: '', quantity_source: '', rate_table_id: '', formula_expression: '', condition: '',
  priority: '100', stacking_behavior: 'stackable', tax_classification: 'taxable', allocation_method: 'estimate_only',
  cost_rate: '', cost_category: '', is_active: true,
};
const CATEGORY_OPTIONS = ['labor', 'transportation', 'travel', 'packing', 'material', 'storage', 'fuel', 'valuation', 'accessorial', 'surcharge', 'custom'];

export function fromRule(rule) {
  const text = (v) => (v === null || v === undefined ? '' : String(v));
  return {
    ...BLANK, ...Object.fromEntries(Object.keys(BLANK).map((k) => [k, rule[k] ?? BLANK[k]])),
    base_amount: text(rule.base_amount), rate_amount: text(rule.rate_amount), percentage: text(rule.percentage),
    minimum_amount: text(rule.minimum_amount), maximum_amount: text(rule.maximum_amount),
    minimum_quantity: text(rule.minimum_quantity), cost_rate: text(rule.cost_rate), priority: text(rule.priority ?? 100),
    rate_table_id: text(rule.rate_table_id), basis_categories: rule.basis_categories || [],
    condition: rule.condition_expression?.expr || '', percentage_basis: rule.percentage_basis || '',
  };
}

function toPayload(form) {
  const blankToNull = (v) => (v === '' ? null : v);
  return {
    rule_key: form.rule_key, name: form.name, customer_display_name: form.customer_display_name,
    rule_type: form.rule_type, calculation_type: form.calculation_type, calculation_phase: form.calculation_phase,
    pricing_model: form.pricing_model, charge_scope: form.charge_scope, unit: form.unit,
    base_amount: blankToNull(form.base_amount), rate_amount: blankToNull(form.rate_amount),
    percentage: blankToNull(form.percentage), percentage_basis: form.percentage_basis || null,
    basis_categories: form.percentage_basis === 'selected_categories' ? form.basis_categories : [],
    minimum_amount: blankToNull(form.minimum_amount), maximum_amount: blankToNull(form.maximum_amount),
    minimum_quantity: blankToNull(form.minimum_quantity), quantity_source: form.quantity_source,
    rate_table_id: form.rate_table_id ? Number(form.rate_table_id) : null,
    formula_expression: form.calculation_type === 'formula' ? form.formula_expression : '',
    condition_expression: form.condition.trim() ? { expr: form.condition.trim() } : {},
    priority: Number(form.priority || 100), stacking_behavior: form.stacking_behavior,
    tax_classification: form.tax_classification, allocation_method: form.allocation_method,
    cost_rate: blankToNull(form.cost_rate), cost_category: form.cost_category, is_active: form.is_active,
  };
}

/** What the rule will do, in words (no amounts are computed). */
export function describeRule(rule) {
  const amount = rule.rate_amount ?? rule.base_amount;
  switch (rule.calculation_type) {
    case 'hourly': return rule.rate_table_id ? 'Hourly, rate from a rate table' : `Hourly at ${amount ?? '—'}`;
    case 'flat': return `Flat ${rule.base_amount ?? '—'}`;
    case 'percentage': return `${rule.percentage ?? '—'}% of ${humanize(rule.percentage_basis || 'basis')}`;
    case 'formula': return 'Formula';
    default: return `${humanize(rule.calculation_type)}${rule.pricing_model ? ` · ${humanize(rule.pricing_model)}` : ''}`;
  }
}

export default function RulesEditor({ revision, editable, onChanged }) {
  const rules = revision.content?.rules || [];
  const tables = revision.content?.rate_tables || [];
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const remove = useAction((rule) => pricingApi.deleteItem(revision.id, 'rules', rule.id, revision.lock_version), {
    success: 'Rule removed.', invalidate: onChanged, onSuccess: () => setDeleting(null),
  });
  const ordered = useMemo(() => [...rules].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)), [rules]);

  return (
    <div className="space-y-2">
      {editable && (
        <div className="flex justify-end">
          <Button onClick={() => setEditing({ ...BLANK })}><Plus size={14} aria-hidden="true" /> Add rule</Button>
        </div>
      )}
      {!ordered.length ? <EmptyState>No rules yet.</EmptyState> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <caption className="sr-only">Pricing rules</caption>
            <thead className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="py-2 pr-3">Rule</th>
                <th scope="col" className="py-2 pr-3">Type</th>
                <th scope="col" className="py-2 pr-3">Phase</th>
                <th scope="col" className="py-2 pr-3">Calculation</th>
                <th scope="col" className="py-2 pr-3">Condition</th>
                <th scope="col" className="py-2 pr-3">Priority</th>
                <th scope="col" className="py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((rule) => (
                <tr key={rule.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-3">
                    <div className="font-semibold">{rule.name}</div>
                    <div className="text-[11px] text-slate-500">{rule.rule_key}{!rule.is_active && ' · inactive'}</div>
                  </td>
                  <td className="py-2 pr-3">{humanize(rule.rule_type)}</td>
                  <td className="py-2 pr-3">{humanize(rule.calculation_phase)}</td>
                  <td className="py-2 pr-3">{describeRule(rule)}</td>
                  <td className="py-2 pr-3">{describeCondition(rule.condition_expression)}</td>
                  <td className="py-2 pr-3 tabular-nums">{rule.priority}</td>
                  <td className="py-2 text-right">
                    {editable ? (
                      <span className="inline-flex gap-1">
                        <Button variant="ghost" aria-label={`Edit rule ${rule.name}`} onClick={() => setEditing(fromRule(rule))}><Pencil size={13} aria-hidden="true" /></Button>
                        <Button variant="ghost" aria-label={`Remove rule ${rule.name}`} onClick={() => setDeleting(rule)}><Trash2 size={13} aria-hidden="true" /></Button>
                      </span>
                    ) : <Button variant="ghost" onClick={() => setEditing({ ...fromRule(rule), readOnly: true })}>View</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <RuleDialog
          initial={editing} ruleId={rules.find((r) => r.rule_key === editing.rule_key && editing.rule_key)?.id}
          tables={tables} revision={revision} readOnly={editing.readOnly || !editable}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }}
        />
      )}
      {deleting && (
        <ConfirmDialog title={`Remove rule ${deleting.name}?`} confirmLabel="Remove" busy={remove.busy} error={remove.error?.message}
          onCancel={() => setDeleting(null)} onConfirm={() => remove.run(deleting)}>
          <p>The rule is removed from this draft only. Published revisions are unchanged.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}

export function RuleDialog({ initial, ruleId, tables, revision, readOnly, onClose, onSaved }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const phases = ALLOWED_PHASES[form.rule_type] || ['base'];
  const models = PRICING_MODELS_BY_TYPE[form.calculation_type] || [''];
  const issues = (revision.validation || []).filter((i) => i.object_key === form.rule_key && form.rule_key);
  const save = useAction((payload) => (ruleId
    ? pricingApi.updateItem(revision.id, 'rules', ruleId, payload)
    : pricingApi.createItem(revision.id, 'rules', payload)), { success: ruleId ? 'Rule saved.' : 'Rule added.', onSuccess: onSaved, silent: true });

  const submit = () => {
    const found = {};
    if (!/^[a-z0-9][a-z0-9_]*$/.test(form.rule_key)) found.rule_key = 'Lowercase letters, numbers and _.';
    if (!form.name.trim()) found.name = 'Name the rule.';
    if (form.calculation_type === 'formula' && !form.formula_expression.trim()) found.formula_expression = 'Enter the formula.';
    if (form.calculation_type === 'percentage' && !form.percentage) found.percentage = 'Enter the percentage.';
    if (form.percentage_basis === 'selected_categories' && !form.basis_categories.length) found.basis_categories = 'Choose at least one category.';
    setErrors(found);
    if (!Object.keys(found).length) save.run({ ...toPayload(form), lock_version: revision.lock_version });
  };

  return (
    <Dialog title={readOnly ? `Rule ${form.name}` : ruleId ? 'Edit rule' : 'Add rule'} onClose={onClose} size="lg" busy={save.busy}
      footer={readOnly ? <Button variant="ghost" onClick={onClose}>Close</Button> : (
        <>
          <Button variant="ghost" onClick={onClose} disabled={save.busy}>Cancel</Button>
          <Button onClick={submit} busy={save.busy}>{ruleId ? 'Save rule' : 'Add rule'}</Button>
        </>
      )}>
      <fieldset disabled={readOnly} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField label="Key" value={form.rule_key} onChange={(v) => set({ rule_key: v.toLowerCase() })} error={errors.rule_key} required disabled={Boolean(ruleId)} />
          <TextField label="Name" value={form.name} onChange={(v) => set({ name: v })} error={errors.name} required />
          <TextField label="Customer-facing name" value={form.customer_display_name} onChange={(v) => set({ customer_display_name: v })} hint="Shown on the customer's estimate." />
          <SelectField label="Rule type" value={form.rule_type} options={RULE_TYPES}
            onChange={(v) => set({ rule_type: v, calculation_phase: (ALLOWED_PHASES[v] || ['base'])[0] })} />
          <SelectField label="Calculation" value={form.calculation_type} options={CALCULATION_TYPES}
            onChange={(v) => set({ calculation_type: v, pricing_model: '' })} />
          <SelectField label="Phase" value={form.calculation_phase} options={phases} onChange={(v) => set({ calculation_phase: v })} hint="Order of execution in the engine." />
          {models.length > 1 && <SelectField label="Pricing model" value={form.pricing_model} options={models.map((m) => [m, m ? humanize(m) : 'Default'])} onChange={(v) => set({ pricing_model: v })} />}
          <SelectField label="Charge scope" value={form.charge_scope} options={CHARGE_SCOPES} onChange={(v) => set({ charge_scope: v })} hint="Per Planned Job, or once per Estimate." />
          {form.charge_scope === 'estimate' && <SelectField label="Allocation to jobs" value={form.allocation_method} options={ALLOCATION_METHODS} onChange={(v) => set({ allocation_method: v })} />}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {form.calculation_type === 'flat' && (
            <DecimalField label="Amount" value={form.base_amount} onChange={(v) => set({ base_amount: v })} allowNegative />
          )}
          {['hourly', 'quantity', 'distance', 'weight', 'volume'].includes(form.calculation_type) && (
            <>
              <DecimalField label="Rate per unit" value={form.rate_amount} onChange={(v) => set({ rate_amount: v })} hint={tables.length ? 'Or take the rate from a rate table.' : undefined} />
              {tables.length > 0 && (
                <SelectField label="Rate table" value={form.rate_table_id} onChange={(v) => set({ rate_table_id: v })}
                  options={[['', 'None (use the rate above)'], ...tables.map((t) => [String(t.id), t.name || t.table_key])]} />
              )}
              <TextField label="Quantity source" value={form.quantity_source} onChange={(v) => set({ quantity_source: v })} placeholder={form.calculation_type === 'hourly' ? 'labor_hours' : 'materials.box'} hint="Input the quantity comes from." />
              <DecimalField label="Minimum quantity" value={form.minimum_quantity} onChange={(v) => set({ minimum_quantity: v })} />
              <TextField label="Unit" value={form.unit} onChange={(v) => set({ unit: v })} placeholder="hour, mile, lb, cu_ft, item" />
            </>
          )}
          {form.calculation_type === 'percentage' && (
            <>
              <DecimalField label="Percentage" value={form.percentage} onChange={(v) => set({ percentage: v })} error={errors.percentage} allowNegative />
              <SelectField label="Basis" value={form.percentage_basis} onChange={(v) => set({ percentage_basis: v })} options={[['', 'Choose…'], ...PERCENTAGE_BASES.map((b) => [b, humanize(b)])]} />
            </>
          )}
          <DecimalField label="Line minimum" value={form.minimum_amount} onChange={(v) => set({ minimum_amount: v })} />
          <DecimalField label="Line maximum" value={form.maximum_amount} onChange={(v) => set({ maximum_amount: v })} />
        </div>

        {form.percentage_basis === 'selected_categories' && (
          <fieldset>
            <legend className="text-xs font-semibold text-slate-700">Percentage of these categories</legend>
            {errors.basis_categories && <p role="alert" className="text-[11px] text-rose-700">{errors.basis_categories}</p>}
            <div className="mt-1 flex flex-wrap gap-3">
              {CATEGORY_OPTIONS.map((category) => (
                <CheckboxField key={category} label={humanize(category)} checked={form.basis_categories.includes(category)}
                  onChange={(on) => set({ basis_categories: on ? [...form.basis_categories, category] : form.basis_categories.filter((c) => c !== category) })} />
              ))}
            </div>
          </fieldset>
        )}

        {form.calculation_type === 'formula' && (
          <FormulaField label="Formula" value={form.formula_expression} onChange={(v) => set({ formula_expression: v })} error={errors.formula_expression}
            issues={issues.filter((i) => i.code === 'FORMULA_ERROR')} tables={tables} readOnly={readOnly} />
        )}
        <ConditionBuilder value={form.condition} onChange={(v) => set({ condition: v })} disabled={readOnly} />

        <div className="grid gap-3 sm:grid-cols-3">
          <TextField label="Priority" value={form.priority} inputMode="numeric" onChange={(v) => set({ priority: v.replace(/\D/g, '') })} hint="Lower runs first within a phase." />
          <SelectField label="Stacking" value={form.stacking_behavior} options={STACKING_BEHAVIORS} onChange={(v) => set({ stacking_behavior: v })} />
          <SelectField label="Tax" value={form.tax_classification} options={TAX_CLASSIFICATIONS} onChange={(v) => set({ tax_classification: v })} />
          <DecimalField label="Internal cost rate" value={form.cost_rate} onChange={(v) => set({ cost_rate: v })} hint="Used for margin. Never shown to customers." />
          <SelectField label="Cost category" value={form.cost_category} options={COST_CATEGORIES.map((c) => [c, c ? humanize(c) : 'None'])} onChange={(v) => set({ cost_category: v })} />
          <CheckboxField label="Active" checked={form.is_active} onChange={(v) => set({ is_active: v })} />
        </div>
        {issues.length > 0 && (
          <div className="space-y-1" aria-label="Validation issues for this rule">
            {issues.map((issue) => <p key={issue.code + issue.message} className="text-[11px] text-rose-700"><Badge tone="red">{issue.code}</Badge> {issue.message}</p>)}
          </div>
        )}
      </fieldset>
      <ErrorBanner message={save.error && `${save.error.message}${save.error.detail ? ` (${save.error.detail})` : ''}`} />
    </Dialog>
  );
}
