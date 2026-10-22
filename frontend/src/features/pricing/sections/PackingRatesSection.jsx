// Packing Rates (PCK-01..07): an independent labor schedule, CWT price options,
// and per-material item / pack / unpack rates, each per pricing period.
import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Tabs, inputClass } from '../components/ui';
import { getIn, newId, setIn } from '../tariffConfig';
import LaborRates from './LaborRates';
import { DecimalInput, IconButton, PeriodPicker, SectionHeader, SectionProblems, Toggle } from './fields';

export default function PackingRatesSection({ config, onChange, isReadOnly, selectedPeriodId, onSelectPeriod, problems }) {
  const packing = config.packing || { periods: {}, cwt_options: [] };
  const periodId = selectedPeriodId || 'default';
  const [tab, setTab] = useState('labor');
  const set = (next) => onChange({ ...config, packing: next });
  return (
    <div className="space-y-4">
      <SectionHeader title="Packing Rates" description="Packing has its own rates and minimums, separate from moving labor.">
        <Toggle label="Packing rates enabled" checked={packing.is_enabled !== false} disabled={isReadOnly}
          onChange={(is_enabled) => set({ ...packing, is_enabled })} />
      </SectionHeader>
      <SectionProblems problems={problems} section="packing" />
      <PeriodPicker config={config} value={periodId} onChange={onSelectPeriod} />
      <Tabs label="Packing pricing" active={tab} onChange={setTab}
        tabs={[{ id: 'labor', label: 'Hourly / Flat Plus Hourly' }, { id: 'cwt', label: 'By CWT' }, { id: 'materials', label: 'Materials & Pack By Container' }]} />
      {tab === 'labor' && (
        <LaborRates label="Packing" section={packing} onSectionChange={set} periodId={periodId} readOnly={isReadOnly}
          varyByTrucks={false} withTrucks={false} />
      )}
      {tab === 'cwt' && <CwtOptions packing={packing} set={set} periodId={periodId} readOnly={isReadOnly} />}
      {tab === 'materials' && <MaterialRates config={config} packing={packing} set={set} periodId={periodId} readOnly={isReadOnly} />}
    </div>
  );
}

function CwtOptions({ packing, set, periodId, readOnly }) {
  const options = packing.cwt_options || [];
  const [name, setName] = useState('');
  const add = () => {
    if (!name.trim()) return;
    set({ ...packing, cwt_options: [...options, { id: newId(name, options.map((o) => o.id)), name: name.trim() }] });
    setName('');
  };
  const remove = (option) => {
    let next = { ...packing, cwt_options: options.filter((o) => o.id !== option.id) };
    Object.keys(next.periods || {}).forEach((pid) => {
      const rates = { ...(getIn(next, ['periods', pid, 'cwt']) || {}) };
      delete rates[option.id];
      next = setIn(next, ['periods', pid, 'cwt'], rates);
    });
    set(next);
  };
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">Named price options (for example Full Pack, Partial Pack, Room Pack). The rate is charged per 100 lbs of shipment weight.</p>
      <table className="w-full max-w-xl text-xs" aria-label="CWT packing options">
        <thead><tr className="text-[11px] uppercase text-slate-500"><th scope="col" className="text-left">Option</th><th scope="col" className="text-right">Rate per CWT</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>
          {!options.length && <tr><td colSpan={3} className="py-3 text-center text-slate-500">No CWT options yet.</td></tr>}
          {options.map((option) => (
            <tr key={option.id} className="border-t border-slate-100 dark:border-slate-800">
              <th scope="row" className="py-1 text-left font-semibold">{option.name}</th>
              <td className="py-1"><DecimalInput label={`${option.name} rate per CWT`} disabled={readOnly} className="text-right"
                value={getIn(packing, ['periods', periodId, 'cwt', option.id])}
                onChange={(v) => set(setIn(packing, ['periods', periodId, 'cwt', option.id], v))} /></td>
              <td>{!readOnly && <IconButton label={`Remove ${option.name}`} onClick={() => remove(option)}><Trash2 size={13} /></IconButton>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!readOnly && (
        <div className="flex max-w-xl items-end gap-2">
          <label className="flex-1 text-xs"><span className="mb-1 block font-semibold">New option</span>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Pack" /></label>
          <Button variant="ghost" onClick={add} disabled={!name.trim()}><Plus size={12} aria-hidden="true" /> Add option</Button>
        </div>
      )}
    </div>
  );
}

function MaterialRates({ config, packing, set, periodId, readOnly }) {
  const materials = config.materials || [];
  if (!materials.length) return <p className="text-xs text-slate-500">Add materials under Core Labor Rates → Materials first.</p>;
  const cell = (id, name, material) => (
    <td className="px-1 py-1">
      {name !== 'item_rate' && !material.is_container ? <span className="block text-center text-slate-400" aria-label="Not a container">—</span> : (
        <DecimalInput label={`${material.name} ${name.replace('_', ' ')}`} places={2} disabled={readOnly} className="text-right"
          value={getIn(packing, ['periods', periodId, 'materials', id, name])}
          placeholder={name === 'item_rate' && periodId === 'default' ? material.price ?? '' : ''}
          onChange={(v) => set(setIn(packing, ['periods', periodId, 'materials', id, name], v))} />
      )}
    </td>
  );
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">Item Rate is the material sale; Pack and Unpack Rates are labor per container (Pack By Container) and apply to container materials only. The pack price never includes the material sale.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs" aria-label="Material rates">
          <thead><tr className="text-[11px] uppercase text-slate-500"><th scope="col" className="text-left">Material</th><th scope="col" className="text-right">Item rate</th><th scope="col" className="text-right">Pack rate</th><th scope="col" className="text-right">Unpack rate</th></tr></thead>
          <tbody>
            {materials.map((m) => (
              <tr key={m.id} className="border-t border-slate-100 dark:border-slate-800">
                <th scope="row" className="py-1 pr-2 text-left font-semibold">{m.name}</th>
                {cell(m.id, 'item_rate', m)}{cell(m.id, 'pack_rate', m)}{cell(m.id, 'unpack_rate', m)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
