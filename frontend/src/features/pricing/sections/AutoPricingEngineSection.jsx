// Auto-Pricing Engine (AUTO-01..08): crew, trucks and expected hours from
// shipment size and configured productivity.
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../components/ui';
import { ABILITY_UNITS, LABOR_PRICING_TYPES } from '../constants';
import { DecimalField, DecimalInput, IconButton, SectionHeader, SectionProblems, SelectInput, Toggle } from './fields';

export default function AutoPricingEngineSection({ config, onChange, isReadOnly, problems }) {
  const engine = config.auto_pricing_engine || {};
  const set = (patch) => onChange({ ...config, auto_pricing_engine: { ...engine, ...patch } });
  const unit = engine.ability_unit === 'lbs_per_hour' ? 'lbs' : 'cu ft';
  const ability = engine.crew_ability || {};
  const crews = Object.keys(ability).map(Number).sort((a, b) => a - b);
  return (
    <div className="space-y-4">
      <SectionHeader title="Auto-Pricing Engine" description="Chooses the crew, trucks and expected labor hours from the shipment size. Rates come from the moving and packing rate tables." />
      <SectionProblems problems={problems} section="auto_pricing_engine" />
      <fieldset disabled={isReadOnly} className="grid gap-3 sm:grid-cols-3">
        <DecimalField label="Maximum hours per job" places={2} value={engine.max_hours_per_job} onChange={(max_hours_per_job) => set({ max_hours_per_job })}
          hint="Crew size increases (when feasible) to keep the job within this." />
        <SelectInput label="Crew ability measured in" value={engine.ability_unit || 'cuft_per_hour'} onChange={(ability_unit) => set({ ability_unit })} options={ABILITY_UNITS} />
        <label className="block text-xs"><span className="mb-1 block font-semibold">Minimum crew size</span>
          <input type="number" min="1" max="50" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900"
            value={engine.minimum_crew ?? 1} onChange={(e) => set({ minimum_crew: Number(e.target.value) || 1 })} /></label>
      </fieldset>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <p className="mb-2 text-xs font-bold">Crew ability ({unit} per hour)</p>
          <table className="w-full text-xs" aria-label="Crew ability"><tbody>
            {crews.map((crew) => (
              <tr key={crew}><th scope="row" className="pr-2 text-left font-semibold">{crew} movers</th>
                <td><DecimalInput label={`${crew} movers ${unit} per hour`} places={2} disabled={isReadOnly} className="text-right"
                  value={ability[crew]} onChange={(v) => set({ crew_ability: { ...ability, [crew]: v } })} /></td>
                <td>{!isReadOnly && <IconButton label={`Remove ${crew} movers`} onClick={() => { const next = { ...ability }; delete next[crew]; set({ crew_ability: next }); }}><Trash2 size={13} /></IconButton>}</td></tr>
            ))}
          </tbody></table>
          {!isReadOnly && <Button variant="ghost" onClick={() => set({ crew_ability: { ...ability, [(crews.at(-1) || 1) + 1]: null } })}><Plus size={12} aria-hidden="true" /> Add crew size</Button>}
        </div>
        <Thresholds title={`Crew required (from ${unit})`} rows={engine.crew_required || []} target="crew" targetLabel="Movers" readOnly={isReadOnly}
          onChange={(crew_required) => set({ crew_required })} />
        <Thresholds title={`Trucks required (from ${unit})`} rows={engine.trucks_required || []} target="trucks" targetLabel="Trucks" readOnly={isReadOnly}
          onChange={(trucks_required) => set({ trucks_required })} />
      </div>

      <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
        <p className="mb-1 text-xs font-bold">Automatically Add Resources Based on Auto-Pricing Settings</p>
        <p className="mb-2 text-[11px] text-slate-500">When on, movers and trucks beyond the rate table rows are priced with the per-additional rates. When off, no resources beyond the configured rows are estimated. Movers are never added only to shorten travel or other non-labor time.</p>
        <div className="grid gap-1 sm:grid-cols-2">
          {['moving', 'packing'].flatMap((kind) => LABOR_PRICING_TYPES.map(([type, text]) => (
            <Toggle key={`${kind}.${type}`} label={`${kind === 'moving' ? 'Moving' : 'Packing'} — ${text}`} disabled={isReadOnly}
              checked={engine.auto_add_resources?.[`${kind}.${type}`]}
              onChange={(on) => set({ auto_add_resources: { ...(engine.auto_add_resources || {}), [`${kind}.${type}`]: on } })} />
          )))}
        </div>
      </div>
    </div>
  );
}

function Thresholds({ title, rows, target, targetLabel, readOnly, onChange }) {
  const setAt = (index, patch) => onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <p className="mb-2 text-xs font-bold">{title}</p>
      <table className="w-full text-xs" aria-label={title}>
        <thead><tr className="text-[11px] text-slate-500"><th scope="col" className="text-left">From</th><th scope="col" className="text-left">{targetLabel}</th></tr></thead>
        <tbody>{rows.map((row, index) => (
          <tr key={index}>
            <td><DecimalInput label={`${title} row ${index + 1} from`} places={2} disabled={readOnly} value={row.from} onChange={(from) => setAt(index, { from })} /></td>
            <td><input type="number" min="1" max="50" aria-label={`${title} row ${index + 1} ${targetLabel}`} disabled={readOnly}
              className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900"
              value={row[target] ?? ''} onChange={(e) => setAt(index, { [target]: Number(e.target.value) || null })} /></td>
            <td>{!readOnly && <IconButton label={`Remove ${title} row ${index + 1}`} onClick={() => onChange(rows.filter((_, i) => i !== index))}><Trash2 size={13} /></IconButton>}</td>
          </tr>
        ))}</tbody>
      </table>
      {!readOnly && <Button variant="ghost" onClick={() => onChange([...rows, { from: null, [target]: null }])}><Plus size={12} aria-hidden="true" /> Add threshold</Button>}
    </div>
  );
}
