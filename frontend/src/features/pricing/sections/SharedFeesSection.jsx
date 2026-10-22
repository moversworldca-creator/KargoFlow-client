// Trip and Travel, Fuel Surcharge, Shuttle, Storage In Transit and Additional
// Services: ordered named fees using the eight shared fee methods (FEE-01..08,
// TRV, FSI, ADD-01/02), with amounts per pricing period.
import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Dialog, TextAreaField, TextField } from '../components/ui';
import {
  FEE_FACTORS, FEE_METHODS, FEE_SECTIONS, MILEAGE_TABLE_UNITS, PERCENTAGE_BASES, PER_MILE_BILLING, ROUTE_BASES, ROUTE_PORTIONS,
} from '../constants';
import { move, newId, periodOptions } from '../tariffConfig';
import { DecimalField, DecimalInput, IconButton, ReorderableList, SectionHeader, SectionProblems, SelectInput, Toggle } from './fields';

const label = (list, key) => list.find(([k]) => k === key)?.[1] || key;

// The amounts a method needs, per period (see config._fee_amounts).
const AMOUNT_FIELDS = {
  drive_time: [],
  flat: [['amount', 'Amount', 2]],
  flat_two_factor: [['rate', 'Rate', 4]],
  per_item_cwt: [['rate', 'Rate per CWT', 4]],
  per_item_flat: [['first_item_amount', 'First item', 2], ['additional_item_amount', 'Each additional item', 2], ['minimum', 'Minimum fee', 2]],
  per_mile: [['included_miles', 'Included miles', 2], ['minimum', 'Minimum cost', 2], ['rate', 'Cost per mile', 4]],
  percentage: [['percentage', 'Percent', 4]],
  mileage_table: [],
};

function describeFee(fee) {
  const parts = [label(FEE_METHODS, fee.method)];
  if (fee.method === 'percentage') parts.push(`of ${label(PERCENTAGE_BASES, fee.base)}`);
  if (fee.factor) parts.push(`× ${label(FEE_FACTORS, fee.factor).toLowerCase()}`);
  if (fee.route_basis) parts.push(`(${fee.route_basis})`);
  return parts.join(' ');
}

export default function SharedFeesSection({ sectionId, config, onChange, isReadOnly, problems }) {
  const meta = FEE_SECTIONS[sectionId];
  const fees = config[sectionId] || [];
  const [editing, setEditing] = useState(null);
  const set = (next) => onChange({ ...config, [sectionId]: next });
  const taken = Object.keys(FEE_SECTIONS).flatMap((s) => (config[s] || []).map((f) => f.id));
  const save = (fee) => {
    const index = fees.findIndex((f) => f.id === fee.id);
    set(index >= 0 ? fees.map((f, i) => (i === index ? fee : f)) : [...fees, fee]);
    setEditing(null);
  };
  return (
    <div className="space-y-4">
      <SectionHeader title={meta.title} description="Named charges in the order they are offered on the job. Each uses one of the shared fee pricing methods.">
        {!isReadOnly && <Button onClick={() => setEditing({ id: '', name: '', description: '', method: 'flat', periods: { default: {} } })}><Plus size={14} aria-hidden="true" /> Add Fee</Button>}
      </SectionHeader>
      <SectionProblems problems={problems} section={sectionId} />
      <ReorderableList items={fees} disabled={isReadOnly} emptyText="No fees yet." labelOf={(f) => f.name}
        onReorder={(from, to) => set(move(fees, from, to))} onEdit={(f) => setEditing(f)}
        onRemove={isReadOnly ? null : (f) => set(fees.filter((x) => x.id !== f.id))}
        render={(f) => (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{f.name}</span>
            <span className="text-slate-500">{describeFee(f)}</span>
            {meta.options.filter(([key]) => f[key]).map(([key, text]) => <Badge key={key} tone="blue">{text}</Badge>)}
          </div>
        )} />
      {editing && <FeeDialog fee={editing} meta={meta} config={config} taken={taken} readOnly={isReadOnly}
        onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function FeeDialog({ fee, meta, config, taken, readOnly, onClose, onSave }) {
  const [form, setForm] = useState(fee);
  const set = (patch) => setForm({ ...form, ...patch });
  const periods = periodOptions(config);
  const usesRoute = ['drive_time', 'mileage_table', 'per_mile'].includes(form.method);
  const usesFactor = ['flat_two_factor', 'per_item_cwt', 'per_item_flat'].includes(form.method);
  const setAmount = (pid, key, value) => set({ periods: { ...form.periods, [pid]: { ...(form.periods?.[pid] || {}), [key]: value } } });
  const setMethod = (method) => set({
    method, base: method === 'percentage' ? form.base || 'hourly_labor' : undefined,
    factor: ['flat_two_factor', 'per_item_cwt', 'per_item_flat'].includes(method) ? form.factor || 'items' : undefined,
    route_basis: ['drive_time', 'mileage_table', 'per_mile'].includes(method) ? form.route_basis || 'portion' : undefined,
    portions: form.portions || ROUTE_PORTIONS.map(([k]) => k),
    unit: method === 'mileage_table' ? form.unit || 'currency' : undefined,
    mileage_bands: method === 'mileage_table' ? form.mileage_bands || ['0'] : undefined,
    billing: method === 'per_mile' ? form.billing || 'overage' : undefined,
    periods: { default: {} },
  });
  const bands = form.mileage_bands || ['0'];
  const submit = () => {
    const out = { ...form, name: form.name.trim(), id: form.id || newId(form.name, taken) };
    Object.keys(out).forEach((k) => out[k] === undefined && delete out[k]);
    onSave(out);
  };
  return (
    <Dialog title={fee.id ? `Edit ${fee.name}` : 'Add fee'} onClose={onClose} size="lg" footer={(
      <><Button variant="ghost" onClick={onClose}>Cancel</Button>{!readOnly && <Button onClick={submit} disabled={!form.name.trim()}>Apply</Button>}</>
    )}>
      <fieldset disabled={readOnly} className="space-y-3">
        <TextField label="Name" value={form.name} onChange={(name) => set({ name })} required />
        <TextAreaField label="Description" value={form.description || ''} onChange={(description) => set({ description })} rows={2} />
        <SelectInput label="Pricing method" value={form.method} onChange={setMethod} options={FEE_METHODS} />
        {usesRoute && (
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectInput label="Route" value={form.route_basis} onChange={(route_basis) => set({ route_basis })} options={ROUTE_BASES} />
            {form.route_basis === 'portion' && (
              <div className="text-xs"><p className="mb-1 font-semibold">Legs included</p>
                {ROUTE_PORTIONS.map(([key, text]) => (
                  <Toggle key={key} label={text} checked={(form.portions || []).includes(key)}
                    onChange={(on) => set({ portions: on ? [...(form.portions || []), key] : (form.portions || []).filter((p) => p !== key) })} />
                ))}
              </div>
            )}
          </div>
        )}
        {form.method === 'drive_time' && <p className="text-[11px] text-slate-500">Drive time on the selected route is billed at the job’s hourly crew rate.</p>}
        {usesFactor && <SelectInput label="Multiplied by" value={form.factor} onChange={(factor) => set({ factor })} options={FEE_FACTORS} />}
        {form.method === 'percentage' && <SelectInput label="Percentage of" value={form.base} onChange={(base) => set({ base })} options={PERCENTAGE_BASES} />}
        {form.method === 'per_mile' && <SelectInput label="Beyond the included miles, bill" value={form.billing} onChange={(billing) => set({ billing })} options={PER_MILE_BILLING} />}
        {form.method === 'mileage_table' && (
          <SelectInput label="Each mileage band returns" value={form.unit} onChange={(unit) => set({ unit })} options={MILEAGE_TABLE_UNITS} />
        )}
        <div className="overflow-x-auto rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <p className="mb-2 text-xs font-semibold">Amounts by pricing period <span className="font-normal text-slate-500">— a blank period uses Default</span></p>
          {form.method === 'mileage_table' ? (
            <MileageTable bands={bands} periods={periods} form={form} set={set} readOnly={readOnly} />
          ) : AMOUNT_FIELDS[form.method].length === 0 ? <p className="text-xs text-slate-500">No amounts: this method uses the crew’s hourly rate.</p> : (
            <table className="text-xs" aria-label="Fee amounts by period">
              <thead><tr className="text-[11px] text-slate-500"><th scope="col" className="text-left">Period</th>
                {AMOUNT_FIELDS[form.method].map(([k, text]) => <th key={k} scope="col" className="px-1 text-right">{text}</th>)}</tr></thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.id}><th scope="row" className="pr-2 text-left font-semibold">{p.name}</th>
                    {AMOUNT_FIELDS[form.method].map(([k, text, places]) => (
                      <td key={k} className="px-1 py-0.5"><DecimalInput label={`${p.name} ${text}`} places={places} className="w-28 text-right"
                        value={form.periods?.[p.id]?.[k]} onChange={(v) => setAmount(p.id, k, v)} /></td>
                    ))}</tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="space-y-1">{meta.options.map(([key, text]) => <Toggle key={key} label={text} checked={form[key]} onChange={(v) => set({ [key]: v })} />)}</div>
        {meta.options.some(([k]) => k === 'pay_to_crew') && <p className="text-[11px] text-slate-500">Commission eligibility still depends on the payroll configuration.</p>}
      </fieldset>
    </Dialog>
  );
}

function MileageTable({ bands, periods, form, set, readOnly }) {
  const [next, setNext] = useState('');
  const values = (pid) => form.periods?.[pid]?.values || [];
  const setValue = (pid, index, value) => {
    const list = bands.map((_, i) => values(pid)[i] ?? null);
    list[index] = value;
    set({ periods: { ...form.periods, [pid]: { values: list } } });
  };
  const editBands = (op, index, value) => {
    const nextBands = [...bands];
    let at = index;
    if (op === 'add') { at = bands.filter((b) => Number(b) < Number(value)).length; nextBands.splice(at, 0, value); } else nextBands.splice(at, 1);
    const nextPeriods = Object.fromEntries(Object.entries(form.periods || {}).map(([pid, amounts]) => {
      const list = bands.map((_, i) => amounts?.values?.[i] ?? null);
      if (op === 'add') list.splice(at, 0, null); else list.splice(at, 1);
      return [pid, { values: list }];
    }));
    set({ mileage_bands: nextBands, periods: nextPeriods });
  };
  return (
    <div className="space-y-2">
      <table className="text-xs" aria-label="Mileage table">
        <thead><tr className="text-[11px] text-slate-500"><th scope="col" className="text-left">Period \ miles</th>
          {bands.map((b, i) => (
            <th key={b} scope="col" className="px-1 text-right">{b}+{!readOnly && i > 0 && <IconButton label={`Remove ${b} mile band`} onClick={() => editBands('remove', i)}><Trash2 size={11} /></IconButton>}</th>
          ))}</tr></thead>
        <tbody>
          {periods.map((p) => (
            <tr key={p.id}><th scope="row" className="pr-2 text-left font-semibold">{p.name}</th>
              {bands.map((b, i) => (
                <td key={b} className="px-1 py-0.5"><DecimalInput label={`${p.name} ${b}+ miles`} places={2} className="w-24 text-right"
                  value={values(p.id)[i]} onChange={(v) => setValue(p.id, i, v)} /></td>
              ))}</tr>
          ))}
        </tbody>
      </table>
      {!readOnly && (
        <div className="flex items-end gap-2">
          <DecimalField label="New band starts at (miles)" places={2} value={next} onChange={(v) => setNext(v ?? '')} />
          <Button variant="ghost" disabled={next === '' || bands.some((b) => Number(b) === Number(next))}
            onClick={() => { editBands('add', null, next); setNext(''); }}><Plus size={12} aria-hidden="true" /> Add band</Button>
        </div>
      )}
    </div>
  );
}
