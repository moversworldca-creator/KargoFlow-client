// Distance Rates (DST-01..07): named mileage x weight / volume tables.
import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Badge, Button, TextField, inputClass } from '../components/ui';
import { DISTANCE_RATE_TYPES } from '../constants';
import { move, newId, setIn } from '../tariffConfig';
import { DecimalField, DecimalInput, IconButton, PeriodPicker, ReorderableList, SectionHeader, SectionProblems, SelectInput, Toggle } from './fields';

const BLANK = (taken) => ({ id: newId('distance rate', taken), name: 'New distance rate', rate_type: 'weight_cwt', breakpoints: false,
  mileage_bands: ['0'], size_bands: ['0'], periods: { default: [[null]] } });

/** Resizes every period's grid to the current band counts, keeping values. */
function reshape(rate) {
  const periods = Object.fromEntries(Object.entries(rate.periods || {}).map(([pid, grid]) => [pid,
    rate.mileage_bands.map((_, r) => rate.size_bands.map((__, c) => grid?.[r]?.[c] ?? null))]));
  return { ...rate, periods: Object.keys(periods).length ? periods : { default: rate.mileage_bands.map(() => rate.size_bands.map(() => null)) } };
}

export default function DistanceRatesSection({ config, onChange, isReadOnly, selectedPeriodId, onSelectPeriod, problems }) {
  const rates = config.distance_rates || [];
  const [openId, setOpenId] = useState(rates[0]?.id || null);
  const set = (next) => onChange({ ...config, distance_rates: next });
  const open = rates.find((r) => r.id === openId);
  const update = (next) => set(rates.map((r) => (r.id === next.id ? next : r)));
  return (
    <div className="space-y-4">
      <SectionHeader title="Distance Rates" description="Mileage × shipment weight or volume tables. Rows are mileage bands, columns are weight or volume bands, both given by their starting value.">
        {!isReadOnly && <Button onClick={() => { const rate = BLANK(rates.map((r) => r.id)); set([...rates, rate]); setOpenId(rate.id); }}><Plus size={14} aria-hidden="true" /> Add Distance Rate</Button>}
      </SectionHeader>
      <SectionProblems problems={problems} section="distance_rates" />
      <ReorderableList items={rates} disabled={isReadOnly} emptyText="No distance rates." labelOf={(r) => r.name}
        onReorder={(from, to) => set(move(rates, from, to))} onEdit={(r) => setOpenId(r.id)}
        onRemove={isReadOnly ? null : (r) => set(rates.filter((x) => x.id !== r.id))}
        render={(r) => (
          <button type="button" className="flex w-full items-center gap-2 text-left" onClick={() => setOpenId(r.id)} aria-pressed={r.id === openId}>
            <span className="font-semibold">{r.name}</span>
            <Badge tone="blue">{DISTANCE_RATE_TYPES.find(([k]) => k === r.rate_type)?.[1]}</Badge>
            {r.id === openId && <Badge tone="green">Editing</Badge>}
          </button>
        )} />
      {open && <RateEditor key={open.id} rate={open} update={update} config={config} periodId={selectedPeriodId || 'default'}
        onSelectPeriod={onSelectPeriod} readOnly={isReadOnly} />}
    </div>
  );
}

function RateEditor({ rate, update, config, periodId, onSelectPeriod, readOnly }) {
  const [scale, setScale] = useState('');
  const flat = rate.rate_type.startsWith('flat_');
  const byWeight = ['weight_cwt', 'flat_weight'].includes(rate.rate_type);
  const sizeUnit = byWeight ? 'lbs' : 'cu ft';
  const grid = rate.periods?.[periodId] || [];
  // Adding or removing a band inserts or drops that row / column in every period.
  const editBands = (name, op, value, removeAt) => {
    const bands = [...rate[name]];
    const rows = name === 'mileage_bands';
    const index = op === 'add' ? bands.filter((b) => Number(b) < Number(value)).length : removeAt;
    if (op === 'add') bands.splice(index, 0, value); else bands.splice(index, 1);
    const periods = Object.fromEntries(Object.entries(rate.periods || {}).map(([pid, grid]) => {
      const copy = (grid || []).map((row) => [...row]);
      if (rows) {
        if (op === 'add') copy.splice(index, 0, rate.size_bands.map(() => null)); else copy.splice(index, 1);
      } else {
        copy.forEach((row) => (op === 'add' ? row.splice(index, 0, null) : row.splice(index, 1)));
      }
      return [pid, copy];
    }));
    update(reshape({ ...rate, [name]: bands, periods }));
  };
  // DST-04: scale the entered rates by a fixed percentage; they stay editable.
  const applyScale = () => {
    const factor = 1 + Number(scale) / 100;
    if (!Number.isFinite(factor) || factor <= 0) return;
    const scaled = grid.map((row) => row.map((v) => (v == null || v === '' ? v : (Math.round(Number(v) * factor * 100) / 100).toFixed(2))));
    update(setIn(rate, ['periods', periodId], scaled));
    setScale('');
  };
  return (
    <div className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <fieldset disabled={readOnly} className="grid gap-3 sm:grid-cols-2">
        <TextField label="Name" value={rate.name} onChange={(name) => update({ ...rate, name })} required />
        <SelectInput label="Rate type" value={rate.rate_type} options={DISTANCE_RATE_TYPES}
          onChange={(rate_type) => update({ ...rate, rate_type, breakpoints: rate_type.startsWith('flat_') ? false : rate.breakpoints })} />
        {!flat && <Toggle label="Use breakpoints" checked={rate.breakpoints} onChange={(breakpoints) => update({ ...rate, breakpoints })}
          hint="A shipment is priced at the next tier’s starting size when that is cheaper." />}
      </fieldset>
      {flat && (
        <fieldset disabled={readOnly} className="grid gap-3 sm:grid-cols-4">
          <DecimalField label={`Top ${byWeight ? 'weight' : 'volume'} range ends at (${sizeUnit})`} places={2} value={rate.size_range_end} onChange={(v) => update({ ...rate, size_range_end: v })} />
          <DecimalField label={byWeight ? 'Per additional 100 lbs' : 'Per additional cu ft'} value={rate.additional_size_rate} onChange={(v) => update({ ...rate, additional_size_rate: v })} />
          <DecimalField label="Mileage range ends at (miles)" places={2} value={rate.mileage_range_end} onChange={(v) => update({ ...rate, mileage_range_end: v })} />
          <DecimalField label="Per additional mile" value={rate.additional_mile_rate} onChange={(v) => update({ ...rate, additional_mile_rate: v })} />
        </fieldset>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        <BandEditor label="Mileage bands (miles, starting value)" values={rate.mileage_bands} onEdit={(op, v, i) => editBands('mileage_bands', op, v, i)} readOnly={readOnly} />
        <BandEditor label={`${byWeight ? 'Weight' : 'Volume'} bands (${sizeUnit}, starting value)`} values={rate.size_bands} onEdit={(op, v, i) => editBands('size_bands', op, v, i)} readOnly={readOnly} />
      </div>
      <PeriodPicker config={config} value={periodId} onChange={onSelectPeriod} />
      <div className="overflow-x-auto">
        <table className="text-xs" aria-label={`${rate.name} rates`}>
          <thead><tr className="text-[11px] text-slate-500">
            <th scope="col" className="px-1 text-left">Miles \ {sizeUnit}</th>
            {rate.size_bands.map((s) => <th key={s} scope="col" className="px-1 text-right">{Number(s).toLocaleString()}+</th>)}
          </tr></thead>
          <tbody>
            {rate.mileage_bands.map((m, r) => (
              <tr key={m}>
                <th scope="row" className="px-1 text-left font-semibold">{Number(m).toLocaleString()}+</th>
                {rate.size_bands.map((s, c) => (
                  <td key={s} className="px-1 py-0.5">
                    <DecimalInput label={`${m}+ miles, ${s}+ ${sizeUnit}`} disabled={readOnly} className="min-w-[5rem] text-right"
                      value={grid[r]?.[c]} onChange={(v) => update(setIn(reshape(rate), ['periods', periodId, r, c], v))} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-500">{flat ? 'Each cell is the flat charge.' : `Each cell is the rate ${byWeight ? 'per 100 lbs' : 'per cubic foot'}.`}</p>
      {!readOnly && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs"><span className="mb-1 block font-semibold">Auto-Scale Rates (%)</span>
            <input className={`${inputClass} w-28`} inputMode="decimal" value={scale} onChange={(e) => /^-?\d{0,3}(\.\d{0,2})?$/.test(e.target.value) && setScale(e.target.value)} placeholder="5" /></label>
          <Button variant="ghost" onClick={applyScale} disabled={!scale}>Scale this period’s rates</Button>
        </div>
      )}
    </div>
  );
}

function BandEditor({ label, values, onEdit, readOnly }) {
  const [next, setNext] = useState('');
  const add = () => {
    if (next === '' || values.some((v) => Number(v) === Number(next))) return;
    onEdit('add', next);
    setNext('');
  };
  return (
    <div className="text-xs">
      <p className="mb-1 font-semibold">{label}</p>
      <div className="flex flex-wrap items-center gap-1">
        {values.map((v, i) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
            {Number(v).toLocaleString()}
            {!readOnly && i > 0 && <IconButton label={`Remove band ${v}`} onClick={() => onEdit('remove', v, i)}><Trash2 size={11} /></IconButton>}
          </span>
        ))}
        {!readOnly && (
          <>
            <DecimalInput label={`Add to ${label}`} value={next} onChange={(v) => setNext(v ?? '')} places={2} className="w-24" />
            <Button variant="ghost" onClick={add} disabled={next === ''}><Plus size={12} aria-hidden="true" /> Add</Button>
          </>
        )}
      </div>
    </div>
  );
}

