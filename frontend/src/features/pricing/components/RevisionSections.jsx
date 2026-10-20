// Guided sections of a Tariff revision, in moving-company terms: Labor,
// Travel, Weight / Volume / Distance, Packing & Materials, Accessorials,
// Adjustments, Calendar and Taxes & Deposit. Every section reads and writes
// ordinary revision rules (the same canonical shapes the Simple setup
// compiles to); there is no second model and no price is computed here. The
// full rule editor stays available for anything a section does not cover.
import React, { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import useCan from '../../../shared/auth/useCan';
import { pricingApi } from '../api';
import { describeCondition, isCalendarCondition } from '../conditions';
import { formatDateOnly, formatMoney, humanize } from '../format';
import { PRICING } from '../permissions';
import { useSkills } from '../queries';
import { MatrixDialog } from './RateTablesEditor';
import { RuleDialog, describeRule, fromRule } from './RulesEditor';
import ConditionBuilder from './ConditionBuilder';
import {
  Badge, Button, Callout, CheckboxField, ConfirmDialog, DecimalField, Dialog, EmptyState, ErrorBanner, Money, Section,
  SelectField, TextField, useAction,
} from './ui';

// ── shared ───────────────────────────────────────────────────────────────────
const rulesOf = (revision) => revision.content?.rules || [];
const tablesOf = (revision) => revision.content?.rate_tables || [];
const keyFrom = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
const blank = (v) => (v === '' || v === undefined ? null : v);

/** Create / update / remove rules of this draft, with its lock version. */
export function useRuleWriter(revision, onChanged) {
  const save = useAction(({ id, body }) => {
    const payload = { ...body, lock_version: revision.lock_version };
    return id ? pricingApi.updateItem(revision.id, 'rules', id, payload) : pricingApi.createItem(revision.id, 'rules', payload);
  }, { success: 'Saved to the draft.', invalidate: onChanged, silent: true });
  const remove = useAction((rule) => pricingApi.deleteItem(revision.id, 'rules', rule.id, revision.lock_version), {
    success: 'Removed from the draft.', invalidate: onChanged,
  });
  return { save, remove };
}

/** Rules as a readable list with advanced edit and remove. */
function RuleRows({ rules, revision, editable, onChanged, empty, extra }) {
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const { remove } = useRuleWriter(revision, onChanged);
  if (!rules.length) return <EmptyState>{empty}</EmptyState>;
  return (
    <>
      <ul className="space-y-1.5">
        {rules.map((rule) => (
          <li key={rule.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800">
            <span className="font-semibold">{rule.customer_display_name || rule.name}</span>
            {!rule.is_active && <Badge>Inactive</Badge>}
            <span className="text-slate-600">{describeRule(rule)}</span>
            {rule.condition_expression?.expr && <span className="text-slate-500">· {describeCondition(rule.condition_expression)}</span>}
            {extra?.(rule)}
            <span className="ml-auto inline-flex gap-1">
              <Button variant="ghost" aria-label={`${editable ? 'Edit' : 'View'} ${rule.name}`} onClick={() => setEditing(rule)}><Pencil size={13} aria-hidden="true" /></Button>
              {editable && <Button variant="ghost" aria-label={`Remove ${rule.name}`} onClick={() => setRemoving(rule)}><Trash2 size={13} aria-hidden="true" /></Button>}
            </span>
          </li>
        ))}
      </ul>
      {editing && (
        <RuleDialog initial={fromRule(editing)} ruleId={editing.id} tables={tablesOf(revision)} revision={revision}
          readOnly={!editable} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />
      )}
      {removing && (
        <ConfirmDialog title={`Remove ${removing.name}?`} confirmLabel="Remove" busy={remove.busy} error={remove.error?.message}
          onCancel={() => setRemoving(null)} onConfirm={() => remove.run(removing).then(() => setRemoving(null))}>
          <p>Removed from this draft only. Published revisions are unchanged.</p>
        </ConfirmDialog>
      )}
    </>
  );
}

function GuidedDialog({ title, description, revision, onChanged, onClose, build, valid = true, children }) {
  const { save } = useRuleWriter(revision, onChanged);
  return (
    <Dialog title={title} description={description} onClose={onClose} busy={save.busy} size="lg"
      footer={(<><Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => save.run(build()).then((r) => r !== undefined && onClose())} busy={save.busy} disabled={!valid}>Save</Button></>)}>
      <div className="space-y-3">{children}</div>
      <ErrorBanner message={save.error && `${save.error.message}${save.error.detail ? ` (${save.error.detail})` : ''}`} />
    </Dialog>
  );
}

// ── Labor ────────────────────────────────────────────────────────────────────
const crewTables = (revision) => tablesOf(revision).filter((t) => (t.dimensions || []).some((d) => d.dimension_type === 'crew_size'));

export function LaborSection({ revision, editable, onChanged }) {
  const { can } = useCan();
  const skills = useSkills();
  const [matrix, setMatrix] = useState(null);
  const [adding, setAdding] = useState(false);
  const labor = rulesOf(revision).filter((r) => r.rule_type === 'labor');
  return (
    <div className="space-y-3">
      <Section title="Crew-size rates" description="Hourly rate by number of movers and trucks. This is pricing, not crew scheduling."
        actions={editable && <Button variant="ghost" onClick={() => setAdding(true)}><Plus size={13} aria-hidden="true" /> Labor rule</Button>}>
        {crewTables(revision).length === 0 ? <EmptyState>No crew-size rate table in this revision.</EmptyState> : crewTables(revision).map((table) => {
          const rows = [...(table.cells || [])].sort((a, b) => (a.coordinates?.crew_size ?? 0) - (b.coordinates?.crew_size ?? 0) || (a.coordinates?.truck_count ?? 0) - (b.coordinates?.truck_count ?? 0));
          return (
            <div key={table.id} className="mb-3">
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-semibold">{table.name || table.table_key}</p>
                <Button variant="ghost" onClick={() => setMatrix(table)}>{editable ? 'Edit crew rates' : 'View'}</Button>
              </div>
              <table className="w-full max-w-md text-left text-xs">
                <caption className="sr-only">{table.name || table.table_key}</caption>
                <thead className="text-[11px] uppercase text-slate-500"><tr><th scope="col" className="py-1">Crew</th><th scope="col">Trucks</th><th scope="col" className="text-right">Hourly rate</th></tr></thead>
                <tbody>{rows.map((cell) => (
                  <tr key={cell.id} className="border-t border-slate-100">
                    <td className="py-1">{cell.coordinates?.crew_size === '*' ? 'Any' : `${cell.coordinates?.crew_size} movers`}</td>
                    <td>{cell.coordinates?.truck_count ?? '—'}</td>
                    <td className="text-right"><Money value={cell.amount} currency={revision.currency} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          );
        })}
        <RuleRows rules={labor} revision={revision} editable={editable} onChanged={onChanged} empty="No labor rules." />
      </Section>
      <Section title="Skill rates" description="Rates by pricing skill (mover, driver, foreman, specialists). A pricing skill is a commercial capability, never a security role. Edit skills under Pricing Skills.">
        {!(skills.data || []).length ? <EmptyState>No pricing skills defined.</EmptyState> : (
          <table className="w-full max-w-lg text-left text-xs">
            <caption className="sr-only">Skill rates</caption>
            <thead className="text-[11px] uppercase text-slate-500"><tr><th scope="col" className="py-1">Skill</th><th scope="col" className="text-right">Sell rate</th>{can(PRICING.VIEW_COST) && <th scope="col" className="text-right">Cost</th>}<th scope="col">Status</th></tr></thead>
            <tbody>{skills.data.map((skill) => (
              <tr key={skill.id} className="border-t border-slate-100">
                <td className="py-1">{skill.name}</td>
                <td className="text-right">{skill.default_selling_rate ? `${formatMoney(skill.default_selling_rate)}/hr` : '—'}</td>
                {can(PRICING.VIEW_COST) && <td className="text-right">{skill.default_cost_rate ? `${formatMoney(skill.default_cost_rate)}/hr` : '—'}</td>}
                <td>{skill.is_active ? 'Active' : 'Inactive'}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Section>
      {matrix && <MatrixDialog table={matrix} dims={[...(matrix.dimensions || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))} revision={revision} editable={editable} onClose={() => setMatrix(null)} onSaved={onChanged} />}
      {adding && <LaborDialog revision={revision} onChanged={onChanged} onClose={() => setAdding(false)} />}
    </div>
  );
}

function LaborDialog({ revision, onChanged, onClose }) {
  const tables = crewTables(revision);
  const [form, setForm] = useState({ name: 'Labor', model: tables.length ? 'crew_size' : 'hourly', table: tables[0]?.id ? String(tables[0].id) : '', rate: '', minimum: '' });
  const set = (patch) => setForm({ ...form, ...patch });
  return (
    <GuidedDialog title="Add labor rule" revision={revision} onChanged={onChanged} onClose={onClose}
      valid={form.model !== 'hourly' || Boolean(form.rate)}
      build={() => ({ body: {
        rule_key: keyFrom(`labor_${form.name}`), name: form.name, rule_type: 'labor', calculation_type: 'hourly',
        calculation_phase: 'base', pricing_model: form.model === 'hourly' ? '' : form.model,
        rate_table_id: form.model === 'crew_size' && form.table ? Number(form.table) : null,
        rate_amount: form.model === 'hourly' ? form.rate : null, minimum_quantity: blank(form.minimum),
        quantity_source: 'labor_hours', priority: 10, is_active: true, condition_expression: {},
      } })}>
      <TextField label="Name" value={form.name} onChange={(v) => set({ name: v })} />
      <SelectField label="Rate from" value={form.model} onChange={(v) => set({ model: v })} options={[
        ...(tables.length ? [['crew_size', 'Crew-size rate table']] : []), ['crew_skill', 'Pricing skill rates (per person)'],
        ['hybrid', 'Crew-size table plus specialist skills'], ['hourly', 'One hourly rate'],
      ]} />
      {form.model === 'crew_size' && <SelectField label="Rate table" value={form.table} onChange={(v) => set({ table: v })} options={tables.map((t) => [String(t.id), t.name || t.table_key])} />}
      {form.model === 'hourly' && <DecimalField label="Hourly rate" value={form.rate} onChange={(v) => set({ rate: v })} required />}
      <DecimalField label="Minimum billable hours" value={form.minimum} onChange={(v) => set({ minimum: v })} />
    </GuidedDialog>
  );
}

// ── Travel ───────────────────────────────────────────────────────────────────
export const TRAVEL_METHODS = [
  ['none', 'No travel charge', 'Travel is not charged.'],
  ['flat', 'Flat travel charge', 'One fixed amount per job.'],
  ['travel_time', 'Travel time', 'Billed by the hour for travel hours.'],
  ['mileage', 'Mileage', 'Per mile driven to the job.'],
  ['round_trip_mileage', 'Round-trip mileage', 'Per mile, counting the return trip.'],
  ['zone', 'Zone', 'Price by origin / destination zone (rate table).'],
  ['radius', 'Radius', 'Price by distance band from the branch (rate table).'],
  ['drive_time', 'Drive time', 'Billed by the hour for calculated drive time.'],
];

export function travelMethodOf(rule) {
  if (!rule) return 'none';
  if (rule.calculation_type === 'flat') return 'flat';
  if (rule.calculation_type === 'formula') return 'custom';
  const model = rule.pricing_model || 'per_mile';
  return { hourly: 'travel_time', drive_time: 'drive_time', per_mile: 'mileage', mileage: 'mileage', round_trip_mileage: 'round_trip_mileage', zone: 'zone', zone_to_zone: 'zone', radius: 'radius', distance_band: 'radius', none: 'none' }[model] || 'custom';
}

export function travelRuleBody(method, form) {
  const base = { rule_key: 'travel', name: 'Travel', customer_display_name: 'Travel', rule_type: 'travel', calculation_phase: 'base', priority: 20, is_active: true, condition_expression: {} };
  if (method === 'flat') return { ...base, calculation_type: 'flat', base_amount: form.amount, pricing_model: '' };
  const model = { travel_time: 'hourly', drive_time: 'drive_time', mileage: 'mileage', round_trip_mileage: 'round_trip_mileage', zone: 'zone', radius: 'radius' }[method];
  const table = ['zone', 'radius'].includes(method);
  return {
    ...base, calculation_type: 'distance', pricing_model: model, rate_amount: table ? null : form.rate,
    rate_table_id: table && form.table ? Number(form.table) : null, minimum_quantity: blank(form.minimum),
    quantity_source: method === 'travel_time' ? 'travel_hours' : '', unit: ['mileage', 'round_trip_mileage'].includes(method) ? 'mile' : 'hour',
  };
}

export function TravelSection({ revision, editable, onChanged }) {
  const rule = rulesOf(revision).find((r) => r.rule_type === 'travel');
  const current = travelMethodOf(rule);
  const [method, setMethod] = useState(current === 'custom' ? 'flat' : current);
  const [form, setForm] = useState({
    amount: (rule ? rule.base_amount : undefined) ?? '', rate: (rule ? rule.rate_amount : undefined) ?? '', minimum: (rule ? rule.minimum_quantity : undefined) ?? '',
    table: (rule ? rule.rate_table_id : undefined) ? String(rule.rate_table_id) : '',
  });
  const { save, remove } = useRuleWriter(revision, onChanged);
  const set = (patch) => setForm({ ...form, ...patch });
  const needs = { flat: form.amount, travel_time: form.rate, drive_time: form.rate, mileage: form.rate, round_trip_mileage: form.rate, zone: form.table, radius: form.table }[method];
  const apply = () => (method === 'none'
    ? (rule ? remove.run(rule) : null)
    : save.run({ id: (rule ? rule.id : undefined), body: travelRuleBody(method, form) }));
  return (
    <Section title="Travel" description="How getting the crew and truck to the job is charged.">
      {current === 'custom' && <Callout tone="info">The travel rule uses a custom formula{(rule ? rule.formula_expression : undefined) ? `: ${rule.formula_expression}` : ''}. Choose a method below to replace it, or edit it under All rules.</Callout>}
      <fieldset className="mt-2 grid gap-2 sm:grid-cols-2" disabled={!editable}>
        <legend className="sr-only">Travel method</legend>
        {TRAVEL_METHODS.map(([value, label, hint]) => (
          <label key={value} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${method === value ? 'border-primary bg-primary/5' : 'border-slate-200'}`}>
            <input type="radio" name="travel-method" checked={method === value} onChange={() => setMethod(value)} className="mt-0.5" />
            <span><span className="block font-semibold">{label}</span><span className="text-slate-500">{hint}</span></span>
          </label>
        ))}
      </fieldset>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {method === 'flat' && <DecimalField label="Travel charge" value={form.amount} onChange={(v) => set({ amount: v })} disabled={!editable} required />}
        {['travel_time', 'drive_time'].includes(method) && <DecimalField label="Rate per hour" value={form.rate} onChange={(v) => set({ rate: v })} disabled={!editable} required />}
        {['mileage', 'round_trip_mileage'].includes(method) && <DecimalField label="Rate per mile" value={form.rate} onChange={(v) => set({ rate: v })} disabled={!editable} required />}
        {['travel_time', 'drive_time', 'mileage', 'round_trip_mileage'].includes(method) && (
          <DecimalField label={method.includes('mileage') ? 'Minimum miles' : 'Minimum hours'} value={form.minimum} onChange={(v) => set({ minimum: v })} disabled={!editable} />
        )}
        {['zone', 'radius'].includes(method) && (
          <SelectField label="Rate table" value={form.table} onChange={(v) => set({ table: v })} disabled={!editable}
            options={[['', tablesOf(revision).length ? 'Choose…' : 'Add a rate table first (Rate tables)'], ...tablesOf(revision).map((t) => [String(t.id), t.name || t.table_key])]} />
        )}
      </div>
      {editable && (
        <div className="mt-3 flex justify-end">
          <Button onClick={apply} busy={save.busy || remove.busy} disabled={method !== 'none' && !needs}>{method === 'none' ? 'Remove travel charge' : 'Save travel'}</Button>
        </div>
      )}
      <ErrorBanner message={save.error?.message || remove.error?.message} />
    </Section>
  );
}

// ── Weight / Volume / Distance ───────────────────────────────────────────────
const TRANSPORT_MODELS = {
  weight: [['per_lb', 'Per pound'], ['per_cwt', 'Per CWT (100 lb)'], ['weight_band', 'Weight bands'], ['breakpoint', 'Weight bands with breakpoints'], ['minimum_weight', 'Minimum weight']],
  volume: [['per_cu_ft', 'Per cubic foot'], ['per_cubic_meter', 'Per cubic meter'], ['volume_band', 'Volume bands'], ['volume_matrix', 'Volume matrix'], ['minimum_volume', 'Minimum volume']],
  distance: [['per_mile', 'Per mile'], ['per_km', 'Per kilometer'], ['distance_band', 'Distance bands'], ['zone_to_zone', 'Zone to zone'], ['matrix', 'Distance matrix']],
};
const BAND_MODELS = ['weight_band', 'breakpoint', 'volume_band', 'volume_matrix', 'distance_band', 'zone_to_zone', 'matrix'];
const basisOf = (rule) => (['weight', 'volume', 'distance'].includes(rule.calculation_type) ? rule.calculation_type : null);

export function TransportSection({ revision, editable, onChanged }) {
  const [adding, setAdding] = useState(false);
  const [conversion, setConversion] = useState(false);
  const rules = rulesOf(revision).filter((r) => r.rule_type === 'transportation' && basisOf(r));
  const lbPerCuFt = revision.configuration?.conversions?.lb_per_cu_ft;
  return (
    <Section title="Weight, volume and distance" description="Long-distance and line-haul pricing by pounds / CWT, cubic feet or miles."
      actions={editable && <Button variant="ghost" onClick={() => setAdding(true)}><Plus size={13} aria-hidden="true" /> Transportation rule</Button>}>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800">
        <span className="font-semibold">Volume to weight:</span>
        <span>{lbPerCuFt ? `1 cu ft = ${lbPerCuFt} lb` : 'Not set (volume is not converted to weight)'}</span>
        {editable && <Button variant="ghost" className="ml-auto" onClick={() => setConversion(true)}>Change</Button>}
      </div>
      <RuleRows rules={rules} revision={revision} editable={editable} onChanged={onChanged} empty="No weight, volume or distance pricing in this revision."
        extra={(rule) => (rule.pricing_model === 'breakpoint' ? <Badge tone="blue">Breakpoint: a heavier band is billed when it is cheaper</Badge> : null)} />
      {adding && <TransportDialog revision={revision} onChanged={onChanged} onClose={() => setAdding(false)} />}
      {conversion && <ConversionDialog revision={revision} onChanged={onChanged} onClose={() => setConversion(false)} />}
    </Section>
  );
}

function TransportDialog({ revision, onChanged, onClose }) {
  const [form, setForm] = useState({ name: 'Transportation', basis: 'weight', model: 'per_cwt', rate: '', minimum: '', table: '' });
  const set = (patch) => setForm({ ...form, ...patch });
  const band = BAND_MODELS.includes(form.model);
  const createTable = useAction(async () => {
    const table = await pricingApi.createItem(revision.id, 'rate_tables', {
      table_key: keyFrom(`${form.basis}_bands`), name: `${humanize(form.basis)} bands`, result_type: 'money',
      result_unit: form.basis === 'weight' ? 'per_cwt' : form.basis === 'volume' ? 'per_cu_ft' : 'per_mile', is_active: true,
      metadata: form.basis === 'weight' ? { rate_unit: 'cwt' } : {}, lock_version: revision.lock_version,
    });
    const fresh = await pricingApi.getRevision(revision.id);
    await pricingApi.createItem(revision.id, 'dimensions', {
      rate_table_id: table.id, dimension_key: form.basis, name: humanize(form.basis), dimension_type: form.basis,
      unit: { weight: 'lb', volume: 'cu_ft', distance: 'mile' }[form.basis], sort_order: 1, is_required: true, lock_version: fresh.lock_version,
    });
    return table;
  }, { success: 'Band table created. Add the bands under Rate tables.', invalidate: onChanged, onSuccess: (t) => set({ table: String(t.id) }) });
  return (
    <GuidedDialog title="Add transportation pricing" revision={revision} onChanged={onChanged} onClose={onClose}
      valid={band ? Boolean(form.table) : Boolean(form.rate)}
      build={() => ({ body: {
        rule_key: keyFrom(`${form.basis}_${form.name}`), name: form.name, rule_type: 'transportation', calculation_type: form.basis,
        calculation_phase: 'base', pricing_model: form.model, rate_amount: band ? null : form.rate,
        rate_table_id: band ? Number(form.table) : null, minimum_quantity: blank(form.minimum), priority: 15, is_active: true,
        condition_expression: {},
      } })}>
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField label="Name" value={form.name} onChange={(v) => set({ name: v })} />
        <SelectField label="Priced by" value={form.basis} onChange={(v) => set({ basis: v, model: TRANSPORT_MODELS[v][0][0], table: '' })} options={[['weight', 'Weight'], ['volume', 'Volume'], ['distance', 'Distance']]} />
        <SelectField label="Method" value={form.model} onChange={(v) => set({ model: v })} options={TRANSPORT_MODELS[form.basis]} />
      </div>
      {form.model === 'breakpoint' && <Callout>With breakpoints the engine also prices the next band&apos;s minimum weight and bills whichever is cheaper (for example 4,700 lb billed as 5,000 lb at the lower rate). The calculation shows when this happens.</Callout>}
      {band ? (
        <div className="grid items-end gap-3 sm:grid-cols-2">
          <SelectField label="Band table" value={form.table} onChange={(v) => set({ table: v })} options={[['', 'Choose…'], ...tablesOf(revision).map((t) => [String(t.id), t.name || t.table_key])]} />
          <Button variant="ghost" onClick={() => createTable.run()} busy={createTable.busy}>Create a {form.basis} band table</Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <DecimalField label={`Rate per ${{ per_lb: 'lb', per_cwt: 'CWT', minimum_weight: 'CWT', per_cu_ft: 'cu ft', per_cubic_meter: 'cubic meter', minimum_volume: 'cu ft', per_mile: 'mile', per_km: 'km' }[form.model]}`} value={form.rate} onChange={(v) => set({ rate: v })} required />
          <DecimalField label="Minimum billable quantity" value={form.minimum} onChange={(v) => set({ minimum: v })} />
        </div>
      )}
    </GuidedDialog>
  );
}

function ConversionDialog({ revision, onChanged, onClose }) {
  const [value, setValue] = useState(String(revision.configuration?.conversions?.lb_per_cu_ft ?? ''));
  const save = useAction(() => pricingApi.updateRevision(revision.id, {
    configuration: { ...(revision.configuration || {}), conversions: { ...(revision.configuration?.conversions || {}), lb_per_cu_ft: value || null } },
    lock_version: revision.lock_version,
  }), { success: 'Conversion saved.', invalidate: onChanged, onSuccess: onClose, silent: true });
  return (
    <Dialog title="Volume to weight conversion" description="Used when a job has a volume but the Tariff prices by weight (and the reverse)." onClose={onClose} busy={save.busy}
      footer={(<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.run()} busy={save.busy}>Save</Button></>)}>
      <DecimalField label="Pounds per cubic foot" value={value} onChange={setValue} hint="Common industry value: 7 lb per cu ft. Leave empty for no conversion." />
      <ErrorBanner message={save.error?.message} />
    </Dialog>
  );
}

// ── Packing & Materials ──────────────────────────────────────────────────────
const isMaterial = (rule) => rule.rule_type === 'material' && String(rule.quantity_source || '').startsWith('materials.');

export function PackingMaterialsSection({ revision, editable, onChanged }) {
  const { can } = useCan();
  const [material, setMaterial] = useState(null);
  const [packing, setPacking] = useState(false);
  const { remove } = useRuleWriter(revision, onChanged);
  const materials = rulesOf(revision).filter(isMaterial);
  const packingRules = rulesOf(revision).filter((r) => r.rule_type === 'packing' || (r.rule_type === 'material' && !isMaterial(r)));
  return (
    <div className="space-y-3">
      <Section title="Materials" description="Boxes, tape and supplies, charged per unit used."
        actions={editable && <Button variant="ghost" onClick={() => setMaterial({})}><Plus size={13} aria-hidden="true" /> Material</Button>}>
        {!materials.length ? <EmptyState>No materials priced in this revision.</EmptyState> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs">
              <caption className="sr-only">Materials</caption>
              <thead className="text-[11px] uppercase text-slate-500"><tr>
                <th scope="col" className="py-1">Material</th><th scope="col">Unit</th>
                {can(PRICING.VIEW_COST) && <th scope="col" className="text-right">Cost</th>}
                <th scope="col" className="text-right">Sell</th><th scope="col">Taxable</th><th scope="col"><span className="sr-only">Actions</span></th>
              </tr></thead>
              <tbody>{materials.map((rule) => (
                <tr key={rule.id} className="border-t border-slate-100">
                  <td className="py-1.5">{rule.customer_display_name || rule.name} <span className="text-slate-500">({rule.quantity_source.slice(10)})</span></td>
                  <td>{rule.unit || 'each'}</td>
                  {can(PRICING.VIEW_COST) && <td className="text-right"><Money value={rule.cost_rate} currency={revision.currency} /></td>}
                  <td className="text-right"><Money value={rule.rate_amount} currency={revision.currency} /></td>
                  <td>{rule.tax_classification === 'non_taxable' ? 'No' : 'Yes'}</td>
                  <td className="text-right">{editable && (
                    <span className="inline-flex gap-1">
                      <Button variant="ghost" aria-label={`Edit ${rule.name}`} onClick={() => setMaterial(rule)}><Pencil size={13} aria-hidden="true" /></Button>
                      <Button variant="ghost" aria-label={`Remove ${rule.name}`} onClick={() => remove.run(rule)}><Trash2 size={13} aria-hidden="true" /></Button>
                    </span>
                  )}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Section>
      <Section title="Packing" description="Packing labor, packing by room or item, and packing packages."
        actions={editable && <Button variant="ghost" onClick={() => setPacking(true)}><Plus size={13} aria-hidden="true" /> Packing rule</Button>}>
        <RuleRows rules={packingRules} revision={revision} editable={editable} onChanged={onChanged} empty="No packing pricing in this revision." />
      </Section>
      {material && <MaterialDialog rule={material} revision={revision} onChanged={onChanged} onClose={() => setMaterial(null)} />}
      {packing && <PackingDialog revision={revision} onChanged={onChanged} onClose={() => setPacking(false)} />}
    </div>
  );
}

function MaterialDialog({ rule, revision, onChanged, onClose }) {
  const { can } = useCan();
  const [form, setForm] = useState({
    name: rule.customer_display_name || rule.name || '', code: rule.quantity_source ? rule.quantity_source.slice(10) : '',
    unit: rule.unit || 'each', sell: rule.rate_amount ?? '', cost: rule.cost_rate ?? '', taxable: rule.tax_classification !== 'non_taxable',
  });
  const set = (patch) => setForm({ ...form, ...patch });
  const code = form.code || keyFrom(form.name);
  return (
    <GuidedDialog title={rule.id ? `Edit ${form.name}` : 'Add material'} revision={revision} onChanged={onChanged} onClose={onClose}
      valid={Boolean(form.name && form.sell && code)}
      build={() => ({ id: rule.id, body: {
        rule_key: rule.rule_key || `material_${code}`, name: form.name, customer_display_name: form.name, rule_type: 'material',
        calculation_type: 'quantity', calculation_phase: 'quantity_rate', quantity_source: `materials.${code}`, unit: form.unit,
        rate_amount: form.sell, ...(can(PRICING.VIEW_COST) ? { cost_rate: blank(form.cost), cost_category: 'materials' } : {}),
        tax_classification: form.taxable ? 'taxable' : 'non_taxable', priority: 30, is_active: true, condition_expression: {},
      } })}>
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField label="Material" value={form.name} onChange={(v) => set({ name: v })} required />
        <TextField label="Code (used in job inputs)" value={code} onChange={(v) => set({ code: keyFrom(v) })} disabled={Boolean(rule.id)} />
        <SelectField label="Unit" value={form.unit} onChange={(v) => set({ unit: v })} options={['each', 'roll', 'bundle', 'pack', 'sheet', 'foot']} />
        {can(PRICING.VIEW_COST) && <DecimalField label="Cost (internal)" value={form.cost} onChange={(v) => set({ cost: v })} />}
        <DecimalField label="Sell price" value={form.sell} onChange={(v) => set({ sell: v })} required />
        <CheckboxField label="Taxable" checked={form.taxable} onChange={(v) => set({ taxable: v })} />
      </div>
    </GuidedDialog>
  );
}

function PackingDialog({ revision, onChanged, onClose }) {
  const [form, setForm] = useState({ name: 'Packing labor', kind: 'labor', code: '', rate: '' });
  const set = (patch) => setForm({ ...form, ...patch });
  const shape = {
    labor: { calculation_type: 'hourly', pricing_model: '', quantity_source: 'packing.hours', unit: 'hour' },
    room: { calculation_type: 'quantity', pricing_model: 'per_room', quantity_source: 'packing.rooms', unit: 'room' },
    item: { calculation_type: 'quantity', pricing_model: 'per_item', quantity_source: `packing.${keyFrom(form.code)}`, unit: 'item' },
    package: { calculation_type: 'quantity', pricing_model: 'package', quantity_source: '', unit: 'package' },
  }[form.kind];
  return (
    <GuidedDialog title="Add packing pricing" revision={revision} onChanged={onChanged} onClose={onClose}
      valid={Boolean(form.rate && (form.kind !== 'item' || form.code))}
      build={() => ({ body: {
        rule_key: keyFrom(`packing_${form.kind}_${form.code || form.name}`), name: form.name, customer_display_name: form.name,
        rule_type: 'packing', calculation_phase: form.kind === 'labor' ? 'base' : 'quantity_rate', ...shape,
        ...(form.kind === 'package' ? { base_amount: form.rate } : { rate_amount: form.rate }), priority: 25, is_active: true,
        condition_expression: {},
      } })}>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField label="Packing priced by" value={form.kind} onChange={(v) => set({ kind: v })} options={[['labor', 'Packing labor (per hour)'], ['room', 'Per room'], ['item', 'Per item'], ['package', 'Package (fixed price)']]} />
        <TextField label="Name" value={form.name} onChange={(v) => set({ name: v })} />
        {form.kind === 'item' && <TextField label="Item code" value={form.code} onChange={(v) => set({ code: keyFrom(v) })} placeholder="tv" />}
        <DecimalField label={form.kind === 'package' ? 'Package price' : `Rate per ${shape.unit}`} value={form.rate} onChange={(v) => set({ rate: v })} required />
      </div>
      <p className="text-[11px] text-slate-500">The quantity comes from the job&apos;s packing inputs ({shape.quantity_source || 'one package'}).</p>
    </GuidedDialog>
  );
}

// ── Accessorials ─────────────────────────────────────────────────────────────
export const ACCESSORIAL_PRESETS = [
  ['stairs', 'Stairs', 'per_unit', 'flight'], ['elevator', 'Elevator', 'when_present', 'job'], ['long_carry', 'Long carry', 'per_unit', 'foot'],
  ['shuttle', 'Shuttle', 'when_present', 'job'], ['piano', 'Piano', 'when_present', 'job'], ['safe', 'Safe', 'when_present', 'job'],
  ['bulky_item', 'Bulky item', 'per_unit', 'item'], ['hoisting', 'Hoisting', 'per_unit', 'item'], ['waiting_time', 'Waiting time', 'per_hour', 'hour'],
  ['extra_stop', 'Extra stop', 'per_stop', 'stop'], ['special_handling', 'Special handling', 'when_present', 'job'],
];

export function accessorialRuleBody({ code, name, method, unit, rate }) {
  const base = { rule_key: `acc_${code}`, name, customer_display_name: name, rule_type: 'accessorial', calculation_phase: 'accessorial', priority: 35, is_active: true };
  // "Once when present": quantity 1 on the job's accessorial input. A missing
  // input counts as zero, so jobs without it are simply not charged.
  if (method === 'when_present') return { ...base, calculation_type: 'quantity', quantity_source: `accessorials.${code}`, rate_amount: rate, unit: 'job', condition_expression: {} };
  if (method === 'per_stop') return { ...base, calculation_type: 'quantity', quantity_source: 'extra_stops', rate_amount: rate, unit: 'stop', condition_expression: {} };
  if (method === 'per_hour') return { ...base, calculation_type: 'hourly', quantity_source: `accessorials.${code}`, rate_amount: rate, unit: 'hour', calculation_phase: 'quantity_rate', condition_expression: {} };
  return { ...base, calculation_type: 'quantity', quantity_source: `accessorials.${code}`, rate_amount: rate, unit, condition_expression: {} };
}

export function AccessorialsSection({ revision, editable, onChanged }) {
  const [adding, setAdding] = useState(false);
  const rules = rulesOf(revision).filter((r) => r.rule_type === 'accessorial');
  return (
    <Section title="Accessorials" description="Stairs, elevators, long carries, pianos and other site conditions."
      actions={editable && <Button variant="ghost" onClick={() => setAdding(true)}><Plus size={13} aria-hidden="true" /> Accessorial</Button>}>
      <RuleRows rules={rules} revision={revision} editable={editable} onChanged={onChanged} empty="No accessorials priced in this revision." />
      {adding && <AccessorialDialog revision={revision} onChanged={onChanged} onClose={() => setAdding(false)} existing={rules} />}
    </Section>
  );
}

function AccessorialDialog({ revision, onChanged, onClose, existing }) {
  const taken = new Set(existing.map((r) => r.rule_key));
  const first = ACCESSORIAL_PRESETS.find(([code]) => !taken.has(`acc_${code}`)) || ACCESSORIAL_PRESETS[0];
  const [form, setForm] = useState({ code: first[0], name: first[1], method: first[2], unit: first[3], rate: '' });
  const set = (patch) => setForm({ ...form, ...patch });
  const pick = (code) => {
    const preset = ACCESSORIAL_PRESETS.find(([c]) => c === code);
    set(preset ? { code, name: preset[1], method: preset[2], unit: preset[3] } : { code: 'custom', name: '' });
  };
  const code = form.code === 'custom' ? keyFrom(form.name) : form.code;
  return (
    <GuidedDialog title="Add accessorial" revision={revision} onChanged={onChanged} onClose={onClose} valid={Boolean(form.rate && code)}
      build={() => ({ body: accessorialRuleBody({ ...form, code }) })}>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField label="Accessorial" value={form.code} onChange={pick} options={[...ACCESSORIAL_PRESETS.map(([c, n]) => [c, n]), ['custom', 'Other…']]} />
        {form.code === 'custom' && <TextField label="Name" value={form.name} onChange={(v) => set({ name: v })} />}
        <SelectField label="Charged" value={form.method} onChange={(v) => set({ method: v })} options={[['per_unit', `Per ${form.unit || 'unit'}`], ['when_present', 'Once, when present on the job'], ['per_hour', 'Per hour'], ['per_stop', 'Per extra stop']]} />
        <DecimalField label="Rate" value={form.rate} onChange={(v) => set({ rate: v })} required />
      </div>
      <p className="text-[11px] text-slate-500">
        {form.method === 'when_present' ? `Charged once when the job's accessorial "${code}" is set to 1.` : form.method === 'per_stop' ? 'Counts stops beyond pickup and delivery.' : `Quantity comes from the job's accessorial "${code}".`}
      </p>
    </GuidedDialog>
  );
}

// ── Adjustments & Calendar ───────────────────────────────────────────────────
const ADJUSTMENT_TYPES = ['surcharge', 'discount', 'fuel'];

function adjustmentBody({ key, name, kind, percentage, amount, basis, condition, priority }) {
  const discount = kind === 'discount';
  return {
    rule_key: key, name, customer_display_name: name, rule_type: kind,
    calculation_phase: discount ? 'discount_credit' : 'surcharge',
    calculation_type: percentage ? 'percentage' : 'flat', percentage: blank(percentage), base_amount: percentage ? null : blank(amount),
    percentage_basis: percentage ? basis : null, condition_expression: condition ? { expr: condition } : {},
    priority: Number(priority) || 50, is_active: true,
  };
}

function AdjustmentDialog({ revision, onChanged, onClose, title, defaults }) {
  const [form, setForm] = useState({ name: '', kind: 'surcharge', mode: 'percentage', percentage: '', amount: '', basis: 'pre_discount_subtotal', condition: '', priority: '50', ...defaults });
  const set = (patch) => setForm({ ...form, ...patch });
  return (
    <GuidedDialog title={title} revision={revision} onChanged={onChanged} onClose={onClose}
      valid={Boolean(form.name && (form.mode === 'percentage' ? form.percentage : form.amount))}
      build={() => ({ body: adjustmentBody({ ...form, key: keyFrom(`${form.kind}_${form.name}`), percentage: form.mode === 'percentage' ? form.percentage : null }) })}>
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField label="Name" value={form.name} onChange={(v) => set({ name: v })} required />
        <SelectField label="Type" value={form.kind} onChange={(v) => set({ kind: v })} options={ADJUSTMENT_TYPES.map((t) => [t, { surcharge: 'Surcharge (adds)', discount: 'Discount (reduces)', fuel: 'Fuel surcharge' }[t]])} />
        <SelectField label="Amount as" value={form.mode} onChange={(v) => set({ mode: v })} options={[['percentage', 'Percentage'], ['flat', 'Fixed amount']]} />
        {form.mode === 'percentage'
          ? <DecimalField label="Percent" value={form.percentage} onChange={(v) => set({ percentage: v })} required />
          : <DecimalField label="Amount" value={form.amount} onChange={(v) => set({ amount: v })} required />}
        {form.mode === 'percentage' && <SelectField label="Of" value={form.basis} onChange={(v) => set({ basis: v })} options={[['pre_discount_subtotal', 'Charges before discounts'], ['labor', 'Labor'], ['transportation', 'Transportation'], ['packing', 'Packing'], ['materials', 'Materials']]} />}
        <TextField label="Priority" value={form.priority} inputMode="numeric" onChange={(v) => set({ priority: v.replace(/\D/g, '') })} hint="Lower runs first." />
      </div>
      <ConditionBuilder value={form.condition} onChange={(v) => set({ condition: v })} />
    </GuidedDialog>
  );
}

export function AdjustmentsSection({ revision, editable, onChanged }) {
  const [adding, setAdding] = useState(false);
  const rules = rulesOf(revision).filter((r) => ADJUSTMENT_TYPES.includes(r.rule_type));
  return (
    <Section title="Surcharges and discounts" description="Tariff-level adjustments. Discounts on an individual Estimate are applied there, with their own permission."
      actions={editable && <Button variant="ghost" onClick={() => setAdding(true)}><Plus size={13} aria-hidden="true" /> Adjustment</Button>}>
      <RuleRows rules={rules} revision={revision} editable={editable} onChanged={onChanged} empty="No surcharges or discounts in this revision." />
      {adding && <AdjustmentDialog title="Add surcharge or discount" revision={revision} onChanged={onChanged} onClose={() => setAdding(false)} />}
    </Section>
  );
}

const PERIODS = [
  ['weekend', 'Weekend', { condition: 'is_weekend' }],
  ['weekday', 'Weekday', { condition: 'weekday == 1 or weekday == 2 or weekday == 3 or weekday == 4 or weekday == 5' }],
  ['peak', 'Peak season', { condition: 'month == 6 or month == 7 or month == 8' }],
  ['month_end', 'Month end', { condition: 'day_of_month >= 25' }],
  ['holiday', 'Holiday', { condition: '' }],
  ['special_event', 'Special event', { condition: '' }],
  ['promotion', 'Promotion', { kind: 'discount' }],
];

export function CalendarSection({ revision, editable, onChanged }) {
  const [period, setPeriod] = useState(null);
  const [blackout, setBlackout] = useState(false);
  const rules = rulesOf(revision).filter((r) => isCalendarCondition(r.condition_expression));
  const dated = (revision.content?.applicability || []).filter((a) => a.service_date_from || a.service_date_until || a.weekday_mask || a.month_mask);
  return (
    <div className="space-y-3">
      <Section title="Pricing calendar" description="Date-based pricing: weekends, peak season, month end, holidays, events and promotions. Dates are service dates in the branch's timezone."
        actions={editable && (
          <span className="flex flex-wrap gap-1">
            {PERIODS.map(([key, label]) => <Button key={key} variant="ghost" onClick={() => setPeriod(key)}><Plus size={12} aria-hidden="true" /> {label}</Button>)}
            <Button variant="ghost" onClick={() => setBlackout(true)}><Plus size={12} aria-hidden="true" /> Blackout dates</Button>
          </span>
        )}>
        <RuleRows rules={[...rules].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))} revision={revision} editable={editable} onChanged={onChanged}
          empty="No date-based pricing in this revision." extra={(rule) => <span className="text-slate-500">priority {rule.priority}</span>} />
      </Section>
      <Section title="When this Tariff applies" description="Date ranges, weekdays and seasons that limit or exclude the whole Tariff (from Applicability).">
        {!dated.length ? <EmptyState>The Tariff applies on every date.</EmptyState> : (
          <ul className="space-y-1 text-xs">
            {dated.map((a) => (
              <li key={a.id} className="rounded-lg border border-slate-200 px-3 py-1.5">
                {a.is_exclusion ? <Badge tone="red">Blackout / exclusion</Badge> : <Badge tone="blue">Applies</Badge>}{' '}
                {a.service_date_from || a.service_date_until ? `${formatDateOnly(a.service_date_from)} – ${formatDateOnly(a.service_date_until)}` : ''}
                {' '}<span className="text-slate-500">({a.applicability_key}, priority {a.priority})</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
      {period && (() => {
        const [, label, defaults] = PERIODS.find(([key]) => key === period);
        return <AdjustmentDialog title={`Add ${label.toLowerCase()} pricing`} revision={revision} onChanged={onChanged} onClose={() => setPeriod(null)}
          defaults={{ name: label, kind: defaults.kind || 'surcharge', condition: defaults.condition ?? '' }} />;
      })()}
      {blackout && <BlackoutDialog revision={revision} onChanged={onChanged} onClose={() => setBlackout(false)} />}
    </div>
  );
}

function BlackoutDialog({ revision, onChanged, onClose }) {
  const [form, setForm] = useState({ name: 'Blackout', from: '', until: '' });
  const save = useAction(() => pricingApi.createItem(revision.id, 'applicability', {
    applicability_key: keyFrom(`blackout_${form.name}_${form.from}`), service_date_from: form.from, service_date_until: form.until || form.from,
    is_exclusion: true, is_active: true, priority: 100, lock_version: revision.lock_version,
  }), { success: 'Blackout dates added.', invalidate: onChanged, onSuccess: onClose, silent: true });
  return (
    <Dialog title="Blackout dates" description="On these dates this Tariff does not price jobs. If no other Tariff applies, pricing stops with “No applicable Tariff”." onClose={onClose} busy={save.busy}
      footer={(<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.run()} busy={save.busy} disabled={!form.from}>Add</Button></>)}>
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <TextField label="From" type="date" value={form.from} onChange={(v) => setForm({ ...form, from: v })} required />
        <TextField label="Until" type="date" value={form.until} onChange={(v) => setForm({ ...form, until: v })} />
      </div>
      <ErrorBanner message={save.error?.message} />
    </Dialog>
  );
}

// ── Taxes & Deposit ──────────────────────────────────────────────────────────
export function TaxDepositSection({ revision, editable, onChanged }) {
  const rules = rulesOf(revision);
  const deposit = rules.find((r) => r.rule_type === 'deposit');
  const minimum = rules.find((r) => r.rule_type === 'minimum');
  const nonTaxable = rules.filter((r) => r.tax_classification === 'non_taxable');
  const [depositForm, setDepositForm] = useState({ mode: (deposit ? deposit.calculation_type : undefined) === 'flat' ? 'flat' : 'percentage', value: (deposit ? deposit.percentage : undefined) ?? (deposit ? deposit.base_amount : undefined) ?? '' });
  const [minimumValue, setMinimumValue] = useState((minimum ? minimum.minimum_amount : undefined) ?? (minimum ? minimum.base_amount : undefined) ?? '');
  const { save, remove } = useRuleWriter(revision, onChanged);
  return (
    <div className="space-y-3">
      <Section title="Deposit" description="The deposit requested to book. Calculating a deposit never books the move.">
        <div className="grid items-end gap-3 sm:grid-cols-3">
          <SelectField label="Deposit" value={depositForm.mode} onChange={(v) => setDepositForm({ ...depositForm, mode: v })} disabled={!editable} options={[['percentage', 'Percent of the estimate'], ['flat', 'Fixed amount']]} />
          <DecimalField label={depositForm.mode === 'percentage' ? 'Percent' : 'Amount'} value={depositForm.value} onChange={(v) => setDepositForm({ ...depositForm, value: v })} disabled={!editable} />
          {editable && (
            <span className="flex gap-2">
              <Button onClick={() => save.run({ id: (deposit ? deposit.id : undefined), body: {
                rule_key: 'deposit', name: 'Deposit', rule_type: 'deposit', calculation_phase: 'deposit', priority: 90, is_active: true,
                calculation_type: depositForm.mode, percentage: depositForm.mode === 'percentage' ? depositForm.value : null,
                base_amount: depositForm.mode === 'flat' ? depositForm.value : null, metadata: { deposit_basis: 'whole_estimate' }, condition_expression: {},
              } })} busy={save.busy} disabled={!depositForm.value}>Save deposit</Button>
              {deposit && <Button variant="ghost" onClick={() => remove.run(deposit)}>No deposit</Button>}
            </span>
          )}
        </div>
      </Section>
      <Section title="Minimum charge" description="If the calculated job is below this amount, a separate minimum line brings it up.">
        <div className="grid items-end gap-3 sm:grid-cols-3">
          <DecimalField label="Minimum job total" value={minimumValue} onChange={setMinimumValue} disabled={!editable} />
          {editable && (
            <span className="flex gap-2">
              <Button onClick={() => save.run({ id: (minimum ? minimum.id : undefined), body: {
                rule_key: 'minimum', name: 'Minimum charge', customer_display_name: 'Minimum charge', rule_type: 'minimum', calculation_type: 'flat',
                calculation_phase: 'minimum', minimum_amount: minimumValue, priority: 80, is_active: true, condition_expression: {},
              } })} busy={save.busy} disabled={!minimumValue}>Save minimum</Button>
              {minimum && <Button variant="ghost" onClick={() => remove.run(minimum)}>No minimum</Button>}
            </span>
          )}
        </div>
      </Section>
      <Section title="Tax treatment" description="Tax rates come from the branch tax profile (Settings › Pricing Taxes). Each charge is taxable unless marked otherwise.">
        {!nonTaxable.length ? <p className="text-xs text-slate-600">Every charge in this revision is taxable.</p> : (
          <p className="text-xs text-slate-600">Not taxed: {nonTaxable.map((r) => r.customer_display_name || r.name).join(', ')}.</p>
        )}
      </Section>
      <ErrorBanner message={save.error?.message || remove.error?.message} />
    </div>
  );
}

/** Which section shows a rule of this type (used to link validation issues). */
export function sectionForRule(rule) {
  if (!rule) return 'rules';
  if (isCalendarCondition(rule.condition_expression)) return 'calendar';
  return {
    labor: 'labor', travel: 'travel', transportation: basisOf(rule) ? 'transport' : 'rules', material: 'packing', packing: 'packing',
    accessorial: 'accessorials', surcharge: 'adjustments', discount: 'adjustments', fuel: 'adjustments', deposit: 'taxes', minimum: 'taxes',
  }[rule.rule_type] || 'rules';
}
