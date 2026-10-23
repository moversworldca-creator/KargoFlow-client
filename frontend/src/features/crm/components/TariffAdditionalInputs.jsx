import React from 'react';

const FEE_SECTIONS = ['trip_travel', 'fuel_surcharges', 'shuttle_fees', 'storage_in_transit', 'additional_services'];
const ROUTES = ['office_to_origin', 'origin_to_destination', 'destination_to_office', 'radius'];
const title = (value) => value.replaceAll('_', ' ');

export default function TariffAdditionalInputs({ configuration = {}, value, onChange, disabled }) {
  const update = (key, next) => onChange({ ...value, [key]: next });
  const number = (label, current, change) => (
    <label className="flex flex-col gap-1 text-xs text-slate-600">
      {label}
      <input aria-label={label} type="number" min="0" step="any" value={current ?? ''} disabled={disabled}
        placeholder="Tariff default" onChange={(e) => change(e.target.value === '' ? null : e.target.value)}
        className="rounded-lg border border-slate-200 p-2" />
    </label>
  );
  const select = (label, current, options, change) => (
    <label className="flex flex-col gap-1 text-xs text-slate-600">{label}
      <select aria-label={label} value={current || ''} disabled={disabled} onChange={(e) => change(e.target.value || null)}
        className="rounded-lg border border-slate-200 p-2">
        <option value="">Tariff default</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  );
  const fees = FEE_SECTIONS.flatMap((section) => configuration[section] || []);
  return (
    <details className="col-span-full rounded-xl border border-slate-200 p-3">
      <summary className="cursor-pointer text-xs font-bold">Packing, materials, fees, valuation and route inputs</summary>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {select('Packing method', value.packing?.pricing_type, [
          { id: 'hourly', name: 'Hourly' }, { id: 'flat_plus_hourly', name: 'Flat Rate Plus Hourly' },
          { id: 'per_container', name: 'Per container' },
          ...(configuration.packing?.cwt_options || []).map((o) => ({ ...o, id: `cwt:${o.id}` })),
        ], (next) => update('packing', { ...value.packing, pricing_type: next }))}
        {number('Packing crew', value.packing?.crew_size, (next) => update('packing', { ...value.packing, crew_size: next == null ? null : Number(next) }))}
        {number('Packing hours', value.packing?.hours, (next) => update('packing', { ...value.packing, hours: next }))}
        <button type="button" disabled={disabled} onClick={() => update('packing', null)} className="text-xs underline">Remove packing inputs</button>
        {select('Valuation option', value.valuation?.option_id, configuration.valuation?.options || [],
          (next) => update('valuation', { ...value.valuation, option_id: next }))}
        {number('Declared value', value.valuation?.declared_value, (next) => update('valuation', { ...value.valuation, declared_value: next }))}
        {number('Valuation deductible', value.valuation?.deductible, (next) => update('valuation', { ...value.valuation, deductible: next }))}
        {number('Non-labor hours', value.non_labor_hours, (next) => update('non_labor_hours', next))}
        {fees.map((fee) => {
          const chosen = (value.fees || []).find((row) => row.fee_id === fee.id);
          return <div key={fee.id} className="rounded-lg border p-2">
            <label className="text-xs"><input type="checkbox" checked={!!chosen} disabled={disabled}
              onChange={(e) => update('fees', e.target.checked ? [...(value.fees || []), { fee_id: fee.id }] : (value.fees || []).filter((row) => row.fee_id !== fee.id))} /> {fee.name}</label>
            {chosen && number(`${fee.name} quantity`, chosen.quantity, (next) => update('fees', value.fees.map((row) => row.fee_id === fee.id ? { ...row, quantity: next } : row)))}
          </div>;
        })}
        <p className="col-span-full text-xs text-slate-500">Matching automatic tariff rules can also add fees.</p>
        <label className="col-span-full text-xs"><input type="checkbox" disabled={disabled} checked={value.materials != null}
          onChange={(e) => update('materials', e.target.checked ? [] : null)} /> Set materials for this job (otherwise use opportunity materials on the primary job)</label>
        {value.materials != null && (configuration.materials || []).map((material) => {
          const row = value.materials.find((item) => item.material_id === material.id) || {};
          const setQuantity = (key, next) => update('materials', [...value.materials.filter((item) => item.material_id !== material.id), { ...row, material_id: material.id, [key]: next }]);
          return <div key={material.id} className="col-span-full grid grid-cols-3 gap-2">
            <strong className="col-span-full text-xs">{material.name}</strong>
            {number(`${material.name} quantity`, row.quantity, (next) => setQuantity('quantity', next))}
            {number(`${material.name} pack quantity`, row.pack_quantity, (next) => setQuantity('pack_quantity', next))}
            {number(`${material.name} unpack quantity`, row.unpack_quantity, (next) => setQuantity('unpack_quantity', next))}
          </div>;
        })}
        {ROUTES.map((portion) => <div key={portion} className="grid grid-cols-2 gap-2">
          {['miles', 'minutes'].map((unit) => <React.Fragment key={unit}>{number(`${title(portion)} ${unit}`, value.route?.[portion]?.[unit],
            (next) => update('route', { ...value.route, [portion]: { ...value.route?.[portion], [unit]: next } }))}</React.Fragment>)}
        </div>)}
      </div>
    </details>
  );
}
