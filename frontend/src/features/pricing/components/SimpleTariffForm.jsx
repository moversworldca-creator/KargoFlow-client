// Guided "Simple" Tariff setup for a small moving company. It produces the
// Simple configuration the backend compiles into ordinary rules and rate
// tables (the same engine, the same Revision workflow); nothing is priced here.
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, DecimalField, SelectField, TextField } from './ui';

export const EMPTY_SIMPLE = {
  mode: 'hourly',
  crew_rates: [{ crew_size: '2', truck_count: '1', rate: '' }],
  flat_rate: '',
  minimum_hours: '',
  travel_model: 'none',
  travel_amount: '',
  travel_hours: '',
  weekend_surcharge_pct: '',
  deposit_pct: '',
  materials: [],
};

/** Simple form state -> backend `simple` configuration. Returns { config, errors }. */
export function toSimpleConfig(form) {
  const errors = {};
  const config = {};
  if (form.mode === 'hourly') {
    const rows = form.crew_rates.filter((row) => row.crew_size || row.rate);
    if (!rows.length) errors.crew_rates = 'Add at least one crew rate.';
    const seen = new Set();
    rows.forEach((row, index) => {
      const key = `${row.crew_size}-${row.truck_count}`;
      if (!/^\d+$/.test(String(row.crew_size)) || Number(row.crew_size) < 1) errors[`crew_${index}`] = 'Crew size must be a whole number.';
      if (!/^\d+$/.test(String(row.truck_count))) errors[`truck_${index}`] = 'Trucks must be a whole number.';
      if (!row.rate) errors[`rate_${index}`] = 'Enter the hourly rate.';
      if (seen.has(key)) errors[`crew_${index}`] = 'This crew and truck combination is listed twice.';
      seen.add(key);
    });
    config.crew_rates = rows.map((row) => ({ crew_size: Number(row.crew_size), truck_count: Number(row.truck_count || 1), rate: row.rate }));
    if (form.minimum_hours) config.minimum_hours = form.minimum_hours;
  } else {
    if (!form.flat_rate) errors.flat_rate = 'Enter the flat price.';
    config.flat_rate = form.flat_rate;
  }
  if (form.travel_model === 'flat') {
    if (!form.travel_amount) errors.travel_amount = 'Enter the travel charge.';
    config.travel = { model: 'flat', amount: form.travel_amount };
  } else if (form.travel_model === 'crew_hours') {
    if (!form.travel_hours) errors.travel_hours = 'Enter the travel hours.';
    config.travel = { model: 'crew_hours', hours: form.travel_hours };
  }
  if (form.weekend_surcharge_pct) config.weekend_surcharge_pct = form.weekend_surcharge_pct;
  if (form.deposit_pct) config.deposit_pct = form.deposit_pct;
  const materials = {};
  form.materials.forEach((row, index) => {
    if (!row.key && !row.price) return;
    if (!/^[a-z0-9_]+$/.test(row.key)) errors[`material_${index}`] = 'Use lowercase letters, numbers and _ (e.g. box_large).';
    if (!row.price) errors[`material_price_${index}`] = 'Enter a price.';
    materials[row.key] = row.price;
  });
  if (Object.keys(materials).length) config.materials = materials;
  return { config, errors };
}

export default function SimpleTariffForm({ value, onChange, errors = {} }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const setRow = (index, patch) => set({ crew_rates: value.crew_rates.map((row, i) => (i === index ? { ...row, ...patch } : row)) });
  const setMaterial = (index, patch) => set({ materials: value.materials.map((row, i) => (i === index ? { ...row, ...patch } : row)) });

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-slate-700 dark:text-slate-200">How do you charge?</legend>
        <div className="flex flex-wrap gap-3 text-xs">
          {[['hourly', 'By the hour (crew rates)'], ['flat', 'One flat price']].map(([mode, label]) => (
            <label key={mode} className="flex items-center gap-1.5">
              <input type="radio" name="simple-mode" checked={value.mode === mode} onChange={() => set({ mode })} /> {label}
            </label>
          ))}
        </div>
      </fieldset>

      {value.mode === 'hourly' ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Hourly crew rates</p>
          {errors.crew_rates && <p role="alert" className="text-[11px] text-rose-700">{errors.crew_rates}</p>}
          {value.crew_rates.map((row, index) => (
            <div key={index} className="grid grid-cols-[1fr_1fr_1.4fr_auto] items-end gap-2">
              <TextField label="Movers" value={row.crew_size} inputMode="numeric" error={errors[`crew_${index}`]} onChange={(v) => setRow(index, { crew_size: v.replace(/\D/g, '') })} />
              <TextField label="Trucks" value={row.truck_count} inputMode="numeric" error={errors[`truck_${index}`]} onChange={(v) => setRow(index, { truck_count: v.replace(/\D/g, '') })} />
              <DecimalField label="Rate per hour" value={row.rate} error={errors[`rate_${index}`]} onChange={(v) => setRow(index, { rate: v })} />
              <Button variant="ghost" aria-label={`Remove crew rate ${index + 1}`} onClick={() => set({ crew_rates: value.crew_rates.filter((_, i) => i !== index) })} disabled={value.crew_rates.length === 1}>
                <Trash2 size={14} aria-hidden="true" />
              </Button>
            </div>
          ))}
          <Button variant="ghost" onClick={() => set({ crew_rates: [...value.crew_rates, { crew_size: '', truck_count: '1', rate: '' }] })}>
            <Plus size={14} aria-hidden="true" /> Add crew rate
          </Button>
          <DecimalField label="Minimum billable hours" value={value.minimum_hours} onChange={(v) => set({ minimum_hours: v })} hint="Optional. Jobs shorter than this are billed at the minimum." />
        </div>
      ) : (
        <DecimalField label="Flat price" value={value.flat_rate} error={errors.flat_rate} onChange={(v) => set({ flat_rate: v })} required />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField label="Travel" value={value.travel_model} onChange={(v) => set({ travel_model: v })}
          options={[['none', 'No travel charge'], ['flat', 'Flat travel charge'], ['crew_hours', 'Crew hours (billed at the crew rate)']]} />
        {value.travel_model === 'flat' && <DecimalField label="Travel charge" value={value.travel_amount} error={errors.travel_amount} onChange={(v) => set({ travel_amount: v })} />}
        {value.travel_model === 'crew_hours' && <DecimalField label="Travel hours" value={value.travel_hours} error={errors.travel_hours} onChange={(v) => set({ travel_hours: v })} />}
        <DecimalField label="Weekend surcharge (%)" value={value.weekend_surcharge_pct} onChange={(v) => set({ weekend_surcharge_pct: v })} hint="Optional. Applied on Saturdays and Sundays." />
        <DecimalField label="Deposit (%)" value={value.deposit_pct} onChange={(v) => set({ deposit_pct: v })} hint="Optional. Deposit requested at booking." />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Materials (price per unit)</p>
        {value.materials.map((row, index) => (
          <div key={index} className="grid grid-cols-[1.4fr_1fr_auto] items-end gap-2">
            <TextField label="Item code" value={row.key} error={errors[`material_${index}`]} placeholder="box" onChange={(v) => setMaterial(index, { key: v.toLowerCase() })} />
            <DecimalField label="Price" value={row.price} error={errors[`material_price_${index}`]} onChange={(v) => setMaterial(index, { price: v })} />
            <Button variant="ghost" aria-label={`Remove material ${row.key || index + 1}`} onClick={() => set({ materials: value.materials.filter((_, i) => i !== index) })}>
              <Trash2 size={14} aria-hidden="true" />
            </Button>
          </div>
        ))}
        <Button variant="ghost" onClick={() => set({ materials: [...value.materials, { key: '', price: '' }] })}>
          <Plus size={14} aria-hidden="true" /> Add material
        </Button>
      </div>
    </div>
  );
}
