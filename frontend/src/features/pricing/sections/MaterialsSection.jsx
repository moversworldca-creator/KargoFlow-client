// Materials (MAT-01..07): the packing supplies this tariff offers, in the
// order used wherever materials are picked. Period prices live in Packing Rates.
import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Badge, Button, Dialog, TextAreaField, TextField } from '../components/ui';
import { formatMoney } from '../format';
import { move, newId } from '../tariffConfig';
import { DecimalField, ReorderableList, SectionHeader, SectionProblems, Toggle } from './fields';

const BLANK = { id: '', name: '', description: '', price: null, cost: null, editable_rate: false, is_container: false,
  cp_code: '', pbo_code: '', pack_minutes: null, unpack_minutes: null, volume_cuft: null, weight_lbs: null };

export default function MaterialsSection({ config, onChange, isReadOnly, problems }) {
  const materials = config.materials || [];
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const set = (next) => onChange({ ...config, materials: next });
  const q = query.trim().toLowerCase();
  const visible = q ? materials.filter((m) => [m.name, m.cp_code, m.pbo_code].some((v) => String(v || '').toLowerCase().includes(q))) : materials;
  const remove = (material) => {
    // Its packing rates go with it.
    const periods = Object.fromEntries(Object.entries(config.packing?.periods || {}).map(([pid, p]) => {
      const rates = { ...(p?.materials || {}) };
      delete rates[material.id];
      return [pid, { ...p, materials: rates }];
    }));
    onChange({ ...config, materials: materials.filter((m) => m.id !== material.id), packing: { ...config.packing, periods } });
  };
  const save = (material) => {
    const index = materials.findIndex((m) => m.id === material.id);
    set(index >= 0 ? materials.map((m, i) => (i === index ? material : m)) : [...materials, material]);
    setEditing(null);
  };
  return (
    <div className="space-y-4">
      <SectionHeader title="Materials" description="Packing supplies and containers. Period-specific sell, pack and unpack prices are set under Packing Rates → Materials.">
        {!isReadOnly && <Button onClick={() => setEditing(BLANK)}><Plus size={14} aria-hidden="true" /> Add Material</Button>}
      </SectionHeader>
      <SectionProblems problems={problems} section="materials" />
      <label className="relative block max-w-xs text-xs">
        <span className="sr-only">Search materials by name or CP / PBO code</span>
        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or CP / PBO code"
          className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-2 dark:border-slate-700 dark:bg-slate-900" />
      </label>
      <ReorderableList
        items={visible} disabled={isReadOnly || Boolean(q)} emptyText={q ? 'No material matches.' : 'No materials yet.'}
        labelOf={(m) => m.name}
        onReorder={(from, to) => set(move(materials, from, to))}
        onEdit={(m) => setEditing(m)} onRemove={isReadOnly ? null : remove}
        render={(m) => (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{m.name}</span>
            {m.is_container ? <Badge tone="blue">Container</Badge> : <Badge>Supply</Badge>}
            {m.cp_code && <span className="font-mono text-[11px] text-slate-500">CP {m.cp_code}</span>}
            {m.pbo_code && <span className="font-mono text-[11px] text-slate-500">PBO {m.pbo_code}</span>}
            <span className="ml-auto tabular-nums">{formatMoney(m.price)}</span>
          </div>
        )}
      />
      {editing && <MaterialDialog material={editing} materials={materials} readOnly={isReadOnly} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function MaterialDialog({ material, materials, readOnly, onClose, onSave }) {
  const [form, setForm] = useState({ ...BLANK, ...material });
  const set = (patch) => setForm({ ...form, ...patch });
  const codeOk = (code) => !code || /^[A-Za-z0-9]{3}$/.test(code);
  const valid = form.name.trim() && codeOk(form.cp_code) && codeOk(form.pbo_code);
  const submit = () => onSave({
    ...form, name: form.name.trim(), id: form.id || newId(form.name, materials.map((m) => m.id)),
    cp_code: form.is_container ? form.cp_code.toUpperCase() : '', pbo_code: form.is_container ? form.pbo_code.toUpperCase() : '',
  });
  return (
    <Dialog title={material.id ? `Edit ${material.name}` : 'Add material'} onClose={onClose} size="lg" footer={(
      <><Button variant="ghost" onClick={onClose}>Cancel</Button>{!readOnly && <Button onClick={submit} disabled={!valid}>Apply</Button>}</>
    )}>
      <fieldset disabled={readOnly} className="space-y-3">
        <TextField label="Name" value={form.name} onChange={(name) => set({ name })} required />
        <TextAreaField label="Description" value={form.description} onChange={(description) => set({ description })} rows={2} />
        <div className="grid gap-3 sm:grid-cols-2">
          <DecimalField label="Price" places={2} value={form.price} onChange={(price) => set({ price })} hint="Initial item (sale) price." />
          <DecimalField label="Cost" places={2} value={form.cost} onChange={(cost) => set({ cost })} />
        </div>
        <Toggle label="Rate editable on the job" checked={form.editable_rate} onChange={(editable_rate) => set({ editable_rate })} />
        <Toggle label="Is Container" checked={form.is_container} onChange={(is_container) => set({ is_container })}
          hint="Containers have CP / PBO codes, size and pack time, and can be priced per container under Packing Rates." />
        {form.is_container && (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="CP code (carrier packed)" value={form.cp_code} onChange={(cp_code) => set({ cp_code: cp_code.slice(0, 3) })}
              error={codeOk(form.cp_code) ? '' : 'Three letters or digits.'} />
            <TextField label="PBO code (packed by owner)" value={form.pbo_code} onChange={(pbo_code) => set({ pbo_code: pbo_code.slice(0, 3) })}
              error={codeOk(form.pbo_code) ? '' : 'Three letters or digits.'} />
            <DecimalField label="Pack time (minutes)" places={2} value={form.pack_minutes} onChange={(pack_minutes) => set({ pack_minutes })} />
            <DecimalField label="Unpack time (minutes)" places={2} value={form.unpack_minutes} onChange={(unpack_minutes) => set({ unpack_minutes })} />
            <DecimalField label="Volume (cu ft)" places={2} value={form.volume_cuft} onChange={(volume_cuft) => set({ volume_cuft })} />
            <DecimalField label="Weight (lbs)" places={2} value={form.weight_lbs} onChange={(weight_lbs) => set({ weight_lbs })} />
          </div>
        )}
      </fieldset>
    </Dialog>
  );
}
