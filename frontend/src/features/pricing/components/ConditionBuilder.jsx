// "Apply when" builder: common moving-company conditions as choices
// (weekends, given weekdays, months / season, month end, specific dates,
// (weekends, given weekdays, months / season, month end, specific dates) with
// the expression text the backend validates; nothing is evaluated here.
import React, { useState } from 'react';
import { MONTHS, WEEKDAYS } from '../constants';
import { buildCondition, parseCondition } from '../conditions';
import FormulaField from './FormulaField';
import { CheckboxField, SelectField, TextField } from './ui';

const KINDS = [
  ['always', 'Always'], ['weekend', 'Weekends'], ['weekdays', 'Specific weekdays'], ['months', 'Months / season'],
  ['month_end', 'Month end'], ['dates', 'Specific dates (holidays, events)'], ['custom', 'Custom expression'],
];

export default function ConditionBuilder({ value, onChange, disabled = false, label = 'Apply when' }) {
  const [state, setState] = useState(() => parseCondition(value));
  const update = (next) => { setState(next); onChange(buildCondition(next.kind, next.value)); };
  const toggle = (list = [], item) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  const v = state.value || {};
  return (
    <fieldset className="space-y-2 rounded-lg border border-slate-200 p-3" disabled={disabled}>
      <legend className="px-1 text-xs font-semibold text-slate-700">{label}</legend>
      <SelectField label="Condition" value={state.kind} onChange={(kind) => update({ kind, value: {} })} options={KINDS} />
      {state.kind === 'weekdays' && (
        <div className="flex flex-wrap gap-3">{WEEKDAYS.map((d) => (
          <CheckboxField key={d} label={d} checked={(v.days || []).includes(d)} onChange={() => update({ ...state, value: { days: toggle(v.days, d) } })} />
        ))}</div>
      )}
      {state.kind === 'months' && (
        <div className="flex flex-wrap gap-3">{MONTHS.map((m) => (
          <CheckboxField key={m} label={m} checked={(v.months || []).includes(m)} onChange={() => update({ ...state, value: { months: toggle(v.months, m) } })} />
        ))}</div>
      )}
      {state.kind === 'month_end' && (
        <TextField label="From day of month" value={v.fromDay || '25'} inputMode="numeric" onChange={(x) => update({ ...state, value: { fromDay: x.replace(/\D/g, '').slice(0, 2) } })} />
      )}
      {state.kind === 'dates' && (
        <div className="space-y-1">
          {(v.dates || ['']).map((date, index) => (
            // Date rows have no identity of their own.
            <TextField key={`d-${index}`} label={`Date ${index + 1}`} type="date" value={date}
              onChange={(x) => { const dates = [...(v.dates || [''])]; dates[index] = x; update({ ...state, value: { dates } }); }} />
          ))}
          <button type="button" className="text-xs font-semibold text-primary" onClick={() => update({ ...state, value: { dates: [...(v.dates || ['']), ''] } })}>Add date</button>
          <p className="text-[11px] text-slate-500">Dates are service dates in the branch&apos;s timezone.</p>
        </div>
      )}
      {state.kind === 'custom' && (
        <FormulaField label="Expression" value={v.expr || ''} condition onChange={(x) => update({ ...state, value: { expr: x } })} />
      )}
    </fieldset>
  );
}
