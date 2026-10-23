// The pricing inputs of one Planned Job, in the calculation API's own shape:
// crew, hours, distance, weight, volume, materials, accessorials, flags,
// valuation. Values stay decimal strings exactly as typed; the backend
// normalizes and prices them.
import React, { useId } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { UNITS } from '../constants';
import { Button, CheckboxField, DecimalField, SelectField, TextField, inputClass } from './ui';

export const EMPTY_JOB_INPUTS = {
  crew: { crew_size: '', truck_count: '', skills: {} },
  estimated_hours: '', travel_hours: '',
  distance: { value: '', unit: 'mile' }, weight: { value: '', unit: 'lb' }, volume: { value: '', unit: 'cu_ft' },
  materials: {}, accessorials: {}, flags: {}, declared_value: '', coverage_tier: '',
};

/** Form state -> API `inputs`, dropping what was left empty. */
export function cleanJobInputs(inputs = {}) {
  const out = {};
  const crew = inputs.crew || {};
  const crewOut = {};
  if (crew.crew_size !== '' && crew.crew_size != null) crewOut.crew_size = Number(crew.crew_size);
  if (crew.truck_count !== '' && crew.truck_count != null) crewOut.truck_count = Number(crew.truck_count);
  const skills = Object.fromEntries(Object.entries(crew.skills || {}).filter(([k, v]) => k && v !== '' && v != null).map(([k, v]) => [k, Number(v)]));
  if (Object.keys(skills).length) crewOut.skills = skills;
  if (Object.keys(crewOut).length) out.crew = crewOut;
  for (const key of ['estimated_hours', 'travel_hours', 'declared_value']) if (inputs[key]) out[key] = String(inputs[key]);
  if (inputs.coverage_tier) out.coverage_tier = inputs.coverage_tier;
  for (const key of ['distance', 'weight', 'volume']) if (inputs[key]?.value) out[key] = { value: String(inputs[key].value), unit: inputs[key].unit };
  for (const key of ['materials', 'accessorials']) {
    const entries = Object.entries(inputs[key] || {}).filter(([k, v]) => k && v !== '' && v != null);
    if (entries.length) out[key] = Object.fromEntries(entries.map(([k, v]) => [k, Number(v)]));
  }
  const flags = Object.fromEntries(Object.entries(inputs.flags || {}).filter(([, v]) => v));
  if (Object.keys(flags).length) out.flags = flags;
  if (inputs.tariff_id) out.tariff_id = Number(inputs.tariff_id);
  if (inputs.revision_id) out.revision_id = Number(inputs.revision_id);
  return out;
}

/** API `inputs` -> form state. */
export function jobInputsToForm(inputs = {}) {
  return {
    ...EMPTY_JOB_INPUTS, ...inputs,
    crew: { crew_size: String(inputs.crew?.crew_size ?? ''), truck_count: String(inputs.crew?.truck_count ?? ''), skills: inputs.crew?.skills || {} },
    distance: { ...EMPTY_JOB_INPUTS.distance, ...(inputs.distance || {}) },
    weight: { ...EMPTY_JOB_INPUTS.weight, ...(inputs.weight || {}) },
    volume: { ...EMPTY_JOB_INPUTS.volume, ...(inputs.volume || {}) },
    materials: inputs.materials || {}, accessorials: inputs.accessorials || {}, flags: inputs.flags || {},
  };
}

function KeyQuantityList({ label, value, onChange, disabled, placeholder }) {
  const entries = Object.entries(value || {});
  const update = (index, key, qty) => {
    const next = entries.map((entry, i) => (i === index ? [key, qty] : entry));
    onChange(Object.fromEntries(next));
  };
  return (
    <fieldset className="space-y-1" disabled={disabled}>
      <legend className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</legend>
      {entries.map(([key, qty], index) => (
        <div key={index} className="grid grid-cols-[1.5fr_1fr_auto] gap-2">
          <input aria-label={`${label} item ${index + 1}`} className={inputClass} value={key} placeholder={placeholder} onChange={(e) => update(index, e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'), qty)} />
          <input aria-label={`${label} quantity ${index + 1}`} className={inputClass} value={qty} inputMode="numeric" onChange={(e) => update(index, key, e.target.value.replace(/[^\d]/g, ''))} />
          <Button variant="ghost" aria-label={`Remove ${key || 'item'}`} onClick={() => onChange(Object.fromEntries(entries.filter((_, i) => i !== index)))}><Trash2 size={13} aria-hidden="true" /></Button>
        </div>
      ))}
      <Button variant="ghost" onClick={() => onChange({ ...Object.fromEntries(entries), '': '' })} disabled={disabled || entries.some(([k]) => !k)}>
        <Plus size={13} aria-hidden="true" /> Add
      </Button>
    </fieldset>
  );
}

function Measure({ label, value, units, onChange, disabled }) {
  const id = useId();
  return (
    <div className="grid grid-cols-[1fr_auto] items-end gap-1">
      <DecimalField label={label} value={value.value} onChange={(v) => onChange({ ...value, value: v })} disabled={disabled} />
      <label htmlFor={id} className="sr-only">{`${label} unit`}</label>
      <select id={id} className={`${inputClass} w-24`} value={value.unit} onChange={(e) => onChange({ ...value, unit: e.target.value })} disabled={disabled}>
        {units.map((u) => <option key={u} value={u}>{u.replace('_', ' ')}</option>)}
      </select>
    </div>
  );
}

export default function JobInputsForm({ value, onChange, disabled = false, skills = [], showValuation = true }) {
  const v = value || EMPTY_JOB_INPUTS;
  const set = (patch) => onChange({ ...v, ...patch });
  const setCrew = (patch) => set({ crew: { ...v.crew, ...patch } });
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-4">
        <TextField label="Movers" value={v.crew.crew_size} inputMode="numeric" disabled={disabled} onChange={(x) => setCrew({ crew_size: x.replace(/\D/g, '') })} />
        <TextField label="Trucks" value={v.crew.truck_count} inputMode="numeric" disabled={disabled} onChange={(x) => setCrew({ truck_count: x.replace(/\D/g, '') })} />
        <DecimalField label="Estimated hours" value={v.estimated_hours} disabled={disabled} onChange={(x) => set({ estimated_hours: x })} />
        <DecimalField label="Travel hours" value={v.travel_hours} disabled={disabled} onChange={(x) => set({ travel_hours: x })} />
      </div>
      {skills.length > 0 && (
        <fieldset disabled={disabled}>
          <legend className="text-xs font-semibold text-slate-700 dark:text-slate-200">Crew by pricing skill (count per skill)</legend>
          <div className="mt-1 grid gap-2 sm:grid-cols-4">
            {skills.filter((s) => s.is_active).map((skill) => (
              <TextField key={skill.code} label={skill.name} value={String(v.crew.skills?.[skill.code] ?? '')} inputMode="numeric"
                onChange={(x) => setCrew({ skills: { ...v.crew.skills, [skill.code]: x.replace(/\D/g, '') } })} />
            ))}
          </div>
        </fieldset>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <Measure label="Distance" value={v.distance} units={UNITS.distance} disabled={disabled} onChange={(x) => set({ distance: x })} />
        <Measure label="Weight" value={v.weight} units={UNITS.weight} disabled={disabled} onChange={(x) => set({ weight: x })} />
        <Measure label="Volume" value={v.volume} units={UNITS.volume} disabled={disabled} onChange={(x) => set({ volume: x })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <KeyQuantityList label="Materials" value={v.materials} placeholder="box" disabled={disabled} onChange={(x) => set({ materials: x })} />
        <KeyQuantityList label="Accessorials" value={v.accessorials} placeholder="stairs_flights" disabled={disabled} onChange={(x) => set({ accessorials: x })} />
      </div>
      <fieldset className="flex flex-wrap gap-4" disabled={disabled}>
        <legend className="sr-only">Site conditions</legend>
        {[['has_stairs', 'Stairs'], ['has_elevator', 'Elevator'], ['long_carry', 'Long carry'], ['piano', 'Piano / special item']].map(([flag, label]) => (
          <CheckboxField key={flag} label={label} checked={Boolean(v.flags?.[flag])} onChange={(on) => set({ flags: { ...v.flags, [flag]: on } })} />
        ))}
      </fieldset>
      {showValuation && (
        <div className="grid gap-3 sm:grid-cols-2">
          <DecimalField label="Declared value" value={v.declared_value} disabled={disabled} onChange={(x) => set({ declared_value: x })} />
          <SelectField label="Coverage" value={v.coverage_tier} disabled={disabled} onChange={(x) => set({ coverage_tier: x })}
            options={[['', 'Not specified'], ['basic', 'Basic (released value)'], ['full_value', 'Full value protection']]} />
        </div>
      )}
    </div>
  );
}
