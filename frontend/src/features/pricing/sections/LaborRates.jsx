// The weekday x crew-size labor matrix shared by Hourly Moving Rates and
// Packing Rates: minimum hours, Hourly or Flat Rate Plus Hourly rows, and the
// per-additional mover / truck rates (MOV-01..07, PCK-01/02/07).
import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Tabs } from '../components/ui';
import { LABOR_PRICING_TYPES, WEEKDAYS, WEEKDAY_LABELS } from '../constants';
import { getIn, rowKey, rowLabel, setIn, sortRowKeys } from '../tariffConfig';
import { DecimalInput, IconButton, WeekdayHead, WeekdayInputs } from './fields';

export default function LaborRates({ section, onSectionChange, periodId, readOnly, varyByTrucks, withTrucks, label }) {
  const [pricingType, setPricingType] = useState('hourly');
  const [newRow, setNewRow] = useState({ crew: '', trucks: '1' });
  const periods = section.periods || {};
  const period = periods[periodId] || {};
  const setPeriod = (path, value) => onSectionChange(setIn(section, ['periods', periodId, ...path], value));
  // Rows are shared by every period of a pricing type; a period may leave cells blank.
  const rows = sortRowKeys([...new Set(Object.values(periods).flatMap((p) => Object.keys(p?.[pricingType] || {})))]);
  const addRow = () => {
    const key = rowKey(Number(newRow.crew), Number(newRow.trucks), varyByTrucks);
    if (!newRow.crew || rows.includes(key)) return;
    onSectionChange(setIn(section, ['periods', periodId, pricingType, key], getIn(period, [pricingType, key]) || {}));
    setNewRow({ crew: '', trucks: newRow.trucks });
  };
  const removeRow = (key) => {
    let next = section;
    Object.keys(periods).forEach((pid) => {
      const matrix = { ...(getIn(next, ['periods', pid, pricingType]) || {}) };
      delete matrix[key];
      next = setIn(next, ['periods', pid, pricingType], matrix);
    });
    onSectionChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-xs" aria-label={`${label} minimum hours`}>
          <WeekdayHead first="Minimum hours" />
          <tbody><tr><th scope="row" className="pr-2 text-left font-semibold">Minimum hours</th>
            <WeekdayInputs label="Minimum hours" values={period.minimum_hours} disabled={readOnly}
              onChange={(v) => setPeriod(['minimum_hours'], v)} />
          </tr></tbody>
        </table>
        <p className="mt-1 text-[11px] text-slate-500">Billable hours never fall below the minimum for the job’s weekday{pricingType === 'flat_plus_hourly' ? '; with Flat Rate Plus Hourly the flat charge covers these hours' : ''}.</p>
      </div>

      <Tabs label={`${label} pricing type`} active={pricingType} onChange={setPricingType}
        tabs={LABOR_PRICING_TYPES.map(([id, name]) => ({ id, label: name }))} />

      <div className="overflow-x-auto">
        <table className="w-full text-xs" aria-label={`${label} ${pricingType === 'hourly' ? 'hourly rates' : 'flat rate plus hourly'}`}>
          <WeekdayHead first={varyByTrucks ? 'Crew + trucks' : 'Crew size'} />
          <tbody>
            {!rows.length && <tr><td colSpan={9} className="py-3 text-center text-slate-500">No rate rows yet. Add a crew size below.</td></tr>}
            {rows.map((key) => (pricingType === 'hourly' ? (
              <tr key={key} className="border-t border-slate-100 dark:border-slate-800">
                <th scope="row" className="whitespace-nowrap pr-2 text-left font-semibold">{rowLabel(key)}</th>
                <WeekdayInputs label={`${rowLabel(key)} hourly rate`} values={getIn(period, ['hourly', key])} disabled={readOnly}
                  onChange={(v) => setPeriod(['hourly', key], v)} />
                <td>{!readOnly && <IconButton label={`Remove ${rowLabel(key)}`} onClick={() => removeRow(key)}><Trash2 size={13} /></IconButton>}</td>
              </tr>
            ) : (
              <React.Fragment key={key}>
                {[['flat', 'Flat (minimum hours)'], ['hourly', 'Each additional hour']].map(([part, partLabel], index) => (
                  <tr key={part} className={index === 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''}>
                    <th scope="row" className="whitespace-nowrap pr-2 text-left font-semibold">
                      {index === 0 && <span className="block">{rowLabel(key)}</span>}
                      <span className="font-normal text-slate-500">{partLabel}</span>
                    </th>
                    {WEEKDAYS.map((day) => (
                      <td key={day} className="px-1 py-1">
                        <DecimalInput label={`${rowLabel(key)} ${partLabel} ${WEEKDAY_LABELS[day]}`} places={2} disabled={readOnly}
                          value={getIn(period, ['flat_plus_hourly', key, day, part])} className="min-w-[4.5rem] text-right"
                          onChange={(v) => setPeriod(['flat_plus_hourly', key, day, part], v)} />
                      </td>
                    ))}
                    <td>{index === 0 && !readOnly && <IconButton label={`Remove ${rowLabel(key)}`} onClick={() => removeRow(key)}><Trash2 size={13} /></IconButton>}</td>
                  </tr>
                ))}
              </React.Fragment>
            )))}
          </tbody>
        </table>
      </div>
      {varyByTrucks && pricingType === 'hourly' && rows.length > 0 && (
        <p className="text-[11px] text-slate-500">Each crew + truck row is the complete hourly rate for that combination, not an amount added to the labor-only rate.</p>
      )}
      {!readOnly && (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs"><span className="mb-1 block font-semibold">Crew size</span>
            <input type="number" min="1" max="50" className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900"
              value={newRow.crew} onChange={(e) => setNewRow({ ...newRow, crew: e.target.value })} /></label>
          {varyByTrucks && (
            <label className="text-xs"><span className="mb-1 block font-semibold">Trucks</span>
              <select className="rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900" value={newRow.trucks}
                onChange={(e) => setNewRow({ ...newRow, trucks: e.target.value })}>
                {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 0 ? 'Labor only' : n}</option>)}
              </select></label>
          )}
          <Button variant="ghost" onClick={addRow} disabled={!newRow.crew}><Plus size={12} aria-hidden="true" /> Add row</Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 p-3 dark:border-slate-800">
        <p className="mb-2 text-xs font-semibold">Per-additional resources <span className="font-normal text-slate-500">— hourly amounts for movers{withTrucks ? ' and trucks' : ''} beyond the rows above, used only when automatic additional resources is on in the Auto-Pricing Engine.</span></p>
        <table className="w-full text-xs" aria-label={`${label} additional resources`}>
          <WeekdayHead />
          <tbody>
            {(withTrucks ? ['mover', 'truck'] : ['mover']).map((kind) => (
              <tr key={kind}>
                <th scope="row" className="whitespace-nowrap pr-2 text-left font-semibold">Per additional {kind}</th>
                <WeekdayInputs label={`Per additional ${kind}`} values={getIn(period, ['additional', pricingType, kind])} disabled={readOnly}
                  onChange={(v) => setPeriod(['additional', pricingType, kind], v)} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
