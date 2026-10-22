// Protection → Valuation (VAL-01..07). Valuation is not an insurance product.
import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Dialog, TextAreaField, TextField } from '../components/ui';
import { COST_PER_VALUE_UNITS, VALUATION_PRICING, VALUATION_ROUNDING, VALUATION_TYPES } from '../constants';
import { useValuationTemplates } from '../queries';
import { move, newId, periodOptions } from '../tariffConfig';
import { DecimalField, DecimalInput, IconButton, ReorderableList, SectionHeader, SectionProblems, SelectInput } from './fields';

const label = (list, key) => list.find(([k]) => k === key)?.[1] || key;

export default function ValuationSection({ config, onChange, isReadOnly, problems }) {
  const options = config.valuation?.options || [];
  const templates = useValuationTemplates();
  const [editing, setEditing] = useState(null);
  const set = (next) => onChange({ ...config, valuation: { ...config.valuation, options: next } });
  const save = (option) => {
    const index = options.findIndex((o) => o.id === option.id);
    set(index >= 0 ? options.map((o, i) => (i === index ? option : o)) : [...options, option]);
    setEditing(null);
  };
  return (
    <div className="space-y-4">
      <SectionHeader title="Valuation" description="The valuation options this tariff offers and their prices. Company-wide option names and descriptions come from Valuation Templates.">
        {!isReadOnly && <Button onClick={() => setEditing({ id: '', template_id: null, name: '', valuation_type: 'full_value', pricing: 'cost_per_value', per: '100', rounding: 'none', periods: {} })}><Plus size={14} aria-hidden="true" /> Add Option</Button>}
      </SectionHeader>
      <SectionProblems problems={problems} section="valuation" />
      <ReorderableList items={options} disabled={isReadOnly} emptyText="No valuation options." labelOf={(o) => o.name}
        onReorder={(from, to) => set(move(options, from, to))} onEdit={(o) => setEditing(o)}
        onRemove={isReadOnly ? null : (o) => set(options.filter((x) => x.id !== o.id))}
        render={(o) => (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{o.name}</span><Badge tone="blue">{label(VALUATION_TYPES, o.valuation_type)}</Badge>
            <span className="text-slate-500">{label(VALUATION_PRICING, o.pricing)}</span>
          </div>
        )} />
      {editing && <OptionDialog option={editing} config={config} templates={templates.data || []} taken={options.map((o) => o.id)}
        readOnly={isReadOnly} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function OptionDialog({ option, config, templates, taken, readOnly, onClose, onSave }) {
  const [form, setForm] = useState(option);
  const set = (patch) => setForm({ ...form, ...patch });
  const periods = periodOptions(config);
  const useTemplate = (id) => {
    const template = templates.find((t) => String(t.id) === id);
    set(template ? { template_id: template.id, name: form.name || template.name, valuation_type: template.valuation_type,
      description: form.description || template.description } : { template_id: null });
  };
  const values = form.declared_values || [];
  const deductibles = form.deductibles || [];
  // Adding or removing a declared value / deductible inserts or drops that row / column in every period.
  const editList = (name, op, value, removeAt) => {
    const list = [...(form[name] || [])];
    const index = op === 'add' ? list.filter((v) => Number(v) < Number(value)).length : removeAt;
    if (op === 'add') list.splice(index, 0, value); else list.splice(index, 1);
    const rows = name === 'declared_values';
    const nextPeriods = Object.fromEntries(Object.entries({ default: [], ...form.periods }).map(([pid, grid]) => {
      const copy = values.map((_, r) => deductibles.map((__, c) => (Array.isArray(grid) ? grid?.[r]?.[c] ?? null : null)));
      if (rows) { if (op === 'add') copy.splice(index, 0, deductibles.map(() => null)); else copy.splice(index, 1); }
      else copy.forEach((row) => (op === 'add' ? row.splice(index, 0, null) : row.splice(index, 1)));
      return [pid, copy];
    }));
    set({ [name]: list, periods: nextPeriods });
  };
  return (
    <Dialog title={option.id ? `Edit ${option.name}` : 'Add valuation option'} onClose={onClose} size="lg" footer={(
      <><Button variant="ghost" onClick={onClose}>Cancel</Button>{!readOnly && <Button disabled={!form.name.trim()}
        onClick={() => onSave({ ...form, name: form.name.trim(), id: form.id || newId(form.name, taken) })}>Apply</Button>}</>
    )}>
      <fieldset disabled={readOnly} className="space-y-3">
        <SelectInput label="Valuation template" value={form.template_id ? String(form.template_id) : ''} onChange={useTemplate}
          options={[['', 'None'], ...templates.filter((t) => t.is_active || t.id === form.template_id).map((t) => [String(t.id), t.name])]} />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Name" value={form.name} onChange={(name) => set({ name })} required />
          <SelectInput label="Valuation type" value={form.valuation_type} onChange={(valuation_type) => set({ valuation_type })} options={VALUATION_TYPES} />
        </div>
        <TextAreaField label="Description" value={form.description || ''} onChange={(description) => set({ description })} rows={3} />
        <SelectInput label="Pricing" value={form.pricing} onChange={(pricing) => set({ pricing, periods: {} })} options={VALUATION_PRICING} />
        <div className="grid gap-3 sm:grid-cols-2">
          <DecimalField label="Default value per pound" places={2} value={form.default_value_per_lb} onChange={(v) => set({ default_value_per_lb: v })}
            hint="Declared value = weight × this, when the customer does not state one." />
          <DecimalField label="Maximum declared value" places={2} value={form.max_declared_value} onChange={(v) => set({ max_declared_value: v })} />
        </div>
        {form.pricing === 'released_value' && (
          <div className="grid gap-3 sm:grid-cols-3">
            <SelectInput label="Liability rate" value={form.rate_basis || 'per_pound'} onChange={(rate_basis) => set({ rate_basis })}
              options={[['per_pound', 'Per pound'], ['per_article', 'Per article']]} />
            <DecimalField label="Rate" places={2} value={form.liability_rate} onChange={(liability_rate) => set({ liability_rate })} hint="For example $0.60." />
            <DecimalField label="Customer price" places={2} value={form.customer_price ?? '0'} onChange={(customer_price) => set({ customer_price })} hint="Released value is normally free." />
          </div>
        )}
        {form.pricing === 'cost_per_value' && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <SelectInput label="Price" value={String(form.per || '100')} onChange={(per) => set({ per })} options={COST_PER_VALUE_UNITS} />
              <DecimalField label="Minimum price" places={2} value={form.minimum_price} onChange={(minimum_price) => set({ minimum_price })} />
              <SelectInput label="Rounding" value={form.rounding || 'none'} onChange={(rounding) => set({ rounding })} options={VALUATION_ROUNDING} />
            </div>
            <table className="text-xs" aria-label="Cost per value by period"><tbody>
              {periods.map((p) => (
                <tr key={p.id}><th scope="row" className="pr-2 text-left font-semibold">{p.name}</th>
                  <td><DecimalInput label={`${p.name} cost ${label(COST_PER_VALUE_UNITS, String(form.per || '100'))}`} className="w-28 text-right"
                    value={form.periods?.[p.id]} onChange={(v) => set({ periods: { ...form.periods, [p.id]: v } })} /></td></tr>
              ))}
            </tbody></table>
          </>
        )}
        {form.pricing === 'flat_matrix' && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <ListInput label="Declared values" values={values} onEdit={(op, v, i) => editList('declared_values', op, v, i)} />
              <ListInput label="Deductibles" values={deductibles} onEdit={(op, v, i) => editList('deductibles', op, v, i)} />
            </div>
            {periods.map((p) => (
              <div key={p.id} className="overflow-x-auto">
                <p className="text-xs font-semibold">{p.name}</p>
                <table className="text-xs" aria-label={`${p.name} declared value by deductible`}>
                  <thead><tr className="text-[11px] text-slate-500"><th scope="col" className="text-left">Declared \ deductible</th>
                    {deductibles.map((d) => <th key={d} scope="col" className="px-1 text-right">${d}</th>)}</tr></thead>
                  <tbody>{values.map((v, r) => (
                    <tr key={v}><th scope="row" className="pr-2 text-left font-semibold">${Number(v).toLocaleString()}</th>
                      {deductibles.map((d, c) => (
                        <td key={d} className="px-1 py-0.5"><DecimalInput label={`${p.name} $${v} declared, $${d} deductible`} places={2} className="w-24 text-right"
                          value={form.periods?.[p.id]?.[r]?.[c]} onChange={(val) => {
                            const grid = values.map((_, i) => deductibles.map((__, j) => form.periods?.[p.id]?.[i]?.[j] ?? null));
                            grid[r][c] = val;
                            set({ periods: { ...form.periods, [p.id]: grid } });
                          }} /></td>
                      ))}</tr>
                  ))}</tbody>
                </table>
              </div>
            ))}
          </>
        )}
      </fieldset>
    </Dialog>
  );
}

function ListInput({ label: text, values, onEdit }) {
  const [next, setNext] = useState('');
  return (
    <div className="text-xs">
      <p className="mb-1 font-semibold">{text}</p>
      <div className="flex flex-wrap items-center gap-1">
        {values.map((v, i) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
            ${Number(v).toLocaleString()}<IconButton label={`Remove ${v}`} onClick={() => onEdit('remove', v, i)}><Trash2 size={11} /></IconButton>
          </span>
        ))}
        <DecimalInput label={`Add to ${text}`} places={2} value={next} onChange={(v) => setNext(v ?? '')} className="w-24" />
        <Button variant="ghost" disabled={next === '' || values.some((v) => Number(v) === Number(next))}
          onClick={() => { onEdit('add', next); setNext(''); }}><Plus size={12} aria-hidden="true" /> Add</Button>
      </div>
    </div>
  );
}
