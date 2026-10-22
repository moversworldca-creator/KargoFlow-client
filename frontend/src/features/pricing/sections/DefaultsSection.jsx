// Defaults / Automations (DEF-01..07): Pricing Method Defaults, Auto-Pricing
// Rules and Not To Exceed Defaults. Each rule applies ALWAYS, if ANY, or if ALL
// of its conditions match, and can be switched off. Rules are checked in order.
import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Dialog, TextField, inputClass } from '../components/ui';
import {
  BUILT_IN_FEES, CONDITION_FIELDS, DEFAULT_KINDS, FEE_SECTIONS, LABOR_PRICING_TYPES, NTE_METHODS, PACKING_PRICING_TYPES,
  RULE_MODES, WEEKDAYS, WEEKDAY_LABELS,
} from '../constants';
import { useBranchOptions, useOpportunityTypes } from '../queries';
import { move, newId, periodOptions } from '../tariffConfig';
import { DecimalField, IconButton, ReorderableList, SectionHeader, SectionProblems, SelectInput, Toggle } from './fields';

const label = (list, key) => list.find(([k]) => k === key)?.[1] || key;

const KINDS = {
  pricing_method_defaults: {
    title: 'Pricing Method Defaults',
    description: 'Choose the rate or method a job uses by default for hourly moving, distance, packing and valuation. The first enabled rule of a kind that applies is used.',
    blank: { kind: 'hourly_moving', value: 'hourly' },
  },
  auto_pricing_rules: {
    title: 'Auto-Pricing Rules',
    description: 'Add fees automatically when the conditions match, including Double Drive Time and Include Travel Time in Estimated Time.',
    blank: { fee_ids: [] },
  },
  not_to_exceed: {
    title: 'Not To Exceed Defaults',
    description: 'The first enabled rule that applies sets the Not To Exceed cap. The amount can still be edited on the job. This is separate from the binding type.',
    blank: { method: 'percentage', value: null, rounding: null },
  },
};

export default function DefaultsSection({ sectionId, config, onChange, isReadOnly, problems }) {
  const meta = KINDS[sectionId];
  const rules = config[sectionId] || [];
  const [editing, setEditing] = useState(null);
  const set = (next) => onChange({ ...config, [sectionId]: next });
  const save = (rule) => {
    const index = rules.findIndex((r) => r.id === rule.id);
    set(index >= 0 ? rules.map((r, i) => (i === index ? rule : r)) : [...rules, rule]);
    setEditing(null);
  };
  return (
    <div className="space-y-4">
      <SectionHeader title={meta.title} description={meta.description}>
        {!isReadOnly && <Button onClick={() => setEditing({ id: '', name: '', is_enabled: true, mode: 'always', conditions: [], ...meta.blank })}><Plus size={14} aria-hidden="true" /> Add Rule</Button>}
      </SectionHeader>
      <SectionProblems problems={problems} section={sectionId} />
      <ReorderableList items={rules} disabled={isReadOnly} emptyText="No rules." labelOf={(r) => r.name}
        onReorder={(from, to) => set(move(rules, from, to))} onEdit={(r) => setEditing(r)}
        onRemove={isReadOnly ? null : (r) => set(rules.filter((x) => x.id !== r.id))}
        render={(r) => (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{r.name}</span>
            {r.is_enabled ? <Badge tone="green">On</Badge> : <Badge>Off</Badge>}
            <Badge tone="blue">{label(RULE_MODES, r.mode)}{r.mode !== 'always' ? ` (${r.conditions.length})` : ''}</Badge>
            <span className="text-slate-500">{summary(sectionId, r, config)}</span>
          </div>
        )} />
      {editing && <RuleDialog sectionId={sectionId} rule={editing} config={config} taken={rules.map((r) => r.id)} readOnly={isReadOnly}
        onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function feeChoices(config) {
  return [...BUILT_IN_FEES, ...Object.keys(FEE_SECTIONS).flatMap((s) => (config[s] || []).map((f) => [f.id, `${f.name} (${FEE_SECTIONS[s].title})`]))];
}

function valueChoices(kind, config) {
  if (kind === 'hourly_moving') return LABOR_PRICING_TYPES;
  if (kind === 'packing') {
    return [...PACKING_PRICING_TYPES.filter(([k]) => k !== 'cwt'),
      ...(config.packing?.cwt_options || []).map((o) => [`cwt:${o.id}`, `CWT — ${o.name}`])];
  }
  if (kind === 'distance') return (config.distance_rates || []).map((d) => [d.id, d.name]);
  return (config.valuation?.options || []).map((o) => [o.id, o.name]);
}

function summary(sectionId, rule, config) {
  if (sectionId === 'pricing_method_defaults') return `${label(DEFAULT_KINDS, rule.kind)} → ${label(valueChoices(rule.kind, config), rule.value)}`;
  if (sectionId === 'auto_pricing_rules') return (rule.fee_ids || []).map((f) => label(feeChoices(config), f)).join(', ');
  return rule.method === 'amount' ? `Cap $${rule.value}` : `Estimate + ${rule.value}%${rule.rounding ? `, rounded up to $${rule.rounding}` : ''}`;
}

function RuleDialog({ sectionId, rule, config, taken, readOnly, onClose, onSave }) {
  const [form, setForm] = useState(rule);
  const set = (patch) => setForm({ ...form, ...patch });
  const choices = sectionId === 'pricing_method_defaults' ? valueChoices(form.kind, config) : [];
  const valid = form.name.trim() && (form.mode === 'always' || form.conditions.length)
    && (sectionId !== 'auto_pricing_rules' || form.fee_ids.length)
    && (sectionId !== 'not_to_exceed' || form.value)
    && (sectionId !== 'pricing_method_defaults' || choices.some(([k]) => k === form.value));
  return (
    <Dialog title={rule.id ? `Edit ${rule.name}` : `Add ${KINDS[sectionId].title.replace(/s$/, '').toLowerCase()}`} onClose={onClose} size="lg" footer={(
      <><Button variant="ghost" onClick={onClose}>Cancel</Button>{!readOnly && <Button disabled={!valid}
        onClick={() => onSave({ ...form, name: form.name.trim(), id: form.id || newId(form.name, taken), conditions: form.mode === 'always' ? [] : form.conditions })}>Apply</Button>}</>
    )}>
      <fieldset disabled={readOnly} className="space-y-3">
        <TextField label="Name" value={form.name} onChange={(name) => set({ name })} required />
        <Toggle label="Enabled" checked={form.is_enabled} onChange={(is_enabled) => set({ is_enabled })} />
        <SelectInput label="Apply" value={form.mode} onChange={(mode) => set({ mode })} options={RULE_MODES} />
        {form.mode !== 'always' && <ConditionsEditor conditions={form.conditions} onChange={(conditions) => set({ conditions })} config={config} />}
        {sectionId === 'pricing_method_defaults' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectInput label="Default for" value={form.kind} onChange={(kind) => set({ kind, value: valueChoices(kind, config)[0]?.[0] ?? '' })} options={DEFAULT_KINDS} />
            <SelectInput label="Use" value={form.value} onChange={(value) => set({ value })}
              options={choices.length ? choices : [['', 'Nothing configured yet']]} />
          </div>
        )}
        {sectionId === 'auto_pricing_rules' && (
          <div className="text-xs"><p className="mb-1 font-semibold">Fees to apply</p>
            {feeChoices(config).map(([id, text]) => (
              <Toggle key={id} label={text} checked={form.fee_ids.includes(id)}
                onChange={(on) => set({ fee_ids: on ? [...form.fee_ids, id] : form.fee_ids.filter((f) => f !== id) })} />
            ))}
          </div>
        )}
        {sectionId === 'not_to_exceed' && (
          <div className="grid gap-3 sm:grid-cols-3">
            <SelectInput label="Cap" value={form.method} onChange={(method) => set({ method })} options={NTE_METHODS} />
            <DecimalField label={form.method === 'amount' ? 'Amount' : 'Percent above the estimate'} places={2} value={form.value} onChange={(value) => set({ value })} />
            <DecimalField label="Round up to (optional)" places={2} value={form.rounding} onChange={(rounding) => set({ rounding })} hint="For example 10 rounds $1,234 up to $1,240." />
          </div>
        )}
      </fieldset>
    </Dialog>
  );
}

function ConditionsEditor({ conditions, onChange, config }) {
  const branches = useBranchOptions();
  const types = useOpportunityTypes();
  const optionsFor = (field) => {
    if (field === 'branch') return (branches.data || []).map((b) => [String(b.id), b.name]);
    if (field === 'opportunity_type') return (types.data || []).map((t) => [String(t.id), t.name]);
    if (field === 'period') return periodOptions(config).map((p) => [p.id, p.name]);
    if (field === 'weekday') return WEEKDAYS.map((d) => [d, WEEKDAY_LABELS[d]]);
    return [];
  };
  const setAt = (index, patch) => onChange(conditions.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-xs font-semibold">Conditions</p>
      {conditions.map((condition, index) => {
        const [, fieldLabel, kind] = CONDITION_FIELDS.find(([k]) => k === condition.field) || CONDITION_FIELDS[0];
        const options = optionsFor(condition.field);
        return (
          <div key={index} className="grid items-end gap-2 sm:grid-cols-[12rem_9rem_1fr_auto]">
            <SelectInput label={`Condition ${index + 1} field`} hideLabel value={condition.field}
              onChange={(field) => setAt(index, { field, operator: CONDITION_FIELDS.find(([k]) => k === field)[2] === 'number' ? 'gte' : 'in', value: [] })}
              options={CONDITION_FIELDS.map(([k, t]) => [k, t])} />
            <SelectInput label={`Condition ${index + 1} operator`} hideLabel value={condition.operator} onChange={(operator) => setAt(index, { operator })}
              options={kind === 'number' ? [['gte', 'at least'], ['lte', 'at most']] : [['in', 'is any of'], ['not_in', 'is none of']]} />
            {kind === 'number' ? (
              <DecimalField label={`${fieldLabel} value`} places={2} value={condition.value} onChange={(value) => setAt(index, { value })} />
            ) : kind === 'texts' ? (
              <label className="text-xs"><span className="sr-only">{fieldLabel} values</span>
                <input className={inputClass} placeholder="CA, NV" value={(condition.value || []).join(', ')}
                  onChange={(e) => setAt(index, { value: e.target.value.split(',').map((v) => v.trim().toUpperCase()).filter(Boolean) })} /></label>
            ) : (
              <label className="text-xs"><span className="sr-only">{fieldLabel} values</span>
                <select multiple className={`${inputClass} h-20`} value={(condition.value || []).map(String)}
                  onChange={(e) => setAt(index, { value: [...e.target.selectedOptions].map((o) => (kind === 'ids' ? Number(o.value) : o.value)) })}>
                  {options.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                </select></label>
            )}
            <IconButton label={`Remove condition ${index + 1}`} onClick={() => onChange(conditions.filter((_, i) => i !== index))}><Trash2 size={13} /></IconButton>
          </div>
        );
      })}
      <Button variant="ghost" onClick={() => onChange([...conditions, { field: 'opportunity_type', operator: 'in', value: [] }])}><Plus size={12} aria-hidden="true" /> Add condition</Button>
    </div>
  );
}
