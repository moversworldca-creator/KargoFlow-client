// Rate tables and matrices: dimensions (crew size, trucks, weight bands ...)
// and the cells that hold a rate for each coordinate. Cells are edited as a
// grid and saved as a whole; the backend checks the matrix (gaps, overlaps,
// duplicates, missing combinations) and its findings are shown next to it.
import React, { useMemo, useState } from 'react';
import { Pencil, Percent, Plus, Trash2 } from 'lucide-react';
import { pricingApi } from '../api';
import { DIMENSION_TYPES, RANGE_DIMENSION_TYPES, RESULT_TYPES } from '../constants';
import { humanize } from '../format';
import {
  Button, Callout, CheckboxField, ConfirmDialog, DecimalField, Dialog, EmptyState, ErrorBanner, IssueList, Section,
  SelectField, TextField, inputClass, useAction,
} from './ui';

const isRange = (dimension) => RANGE_DIMENSION_TYPES.includes(dimension.dimension_type)
  && (dimension.metadata?.range ?? true);

function coordinateText(dimension, value) {
  if (value === undefined || value === null || value === '*') return 'Any';
  if (typeof value === 'object') {
    const lo = value.min ?? '';
    const hi = value.max ?? '';
    const left = value.min_inclusive === false ? '>' : '≥';
    const right = value.max_inclusive ? '≤' : '<';
    if (hi === '' || hi === null) return `${left} ${lo}`;
    return `${left} ${lo} and ${right} ${hi}`;
  }
  return String(value);
}

export default function RateTablesEditor({ revision, editable, onChanged }) {
  const tables = revision.content?.rate_tables || [];
  const [tableDialog, setTableDialog] = useState(null);
  const [bulk, setBulk] = useState(false);
  return (
    <div className="space-y-3">
      {editable && (
        <div className="flex flex-wrap justify-end gap-2">
          {tables.length > 0 && <Button variant="ghost" onClick={() => setBulk(true)}><Percent size={14} aria-hidden="true" /> Bulk rate change</Button>}
          <Button onClick={() => setTableDialog({})}><Plus size={14} aria-hidden="true" /> Add rate table</Button>
        </div>
      )}
      {!tables.length && <EmptyState>No rate tables. Hourly crew rates, weight bands and distance matrices live here.</EmptyState>}
      {tables.map((table) => (
        <RateTableCard key={table.id} table={table} revision={revision} editable={editable} onChanged={onChanged} onEdit={() => setTableDialog(table)} />
      ))}
      {tableDialog && <TableDialog table={tableDialog} revision={revision} onClose={() => setTableDialog(null)} onSaved={() => { setTableDialog(null); onChanged(); }} />}
      {bulk && <BulkRatesDialog revision={revision} onClose={() => setBulk(false)} onSaved={() => { setBulk(false); onChanged(); }} />}
    </div>
  );
}

function RateTableCard({ table, revision, editable, onChanged, onEdit }) {
  const [dimensionDialog, setDimensionDialog] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [gridOpen, setGridOpen] = useState(false);
  const dims = [...(table.dimensions || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const remove = useAction(({ kind, id }) => pricingApi.deleteItem(revision.id, kind, id, revision.lock_version), {
    success: 'Removed.', invalidate: onChanged, onSuccess: () => setRemoving(null),
  });
  return (
    <Section
      title={table.name || table.table_key}
      description={`${table.table_key} · ${humanize(table.result_type)}${table.result_unit ? ` ${humanize(table.result_unit)}` : ''} · ${table.cells?.length || 0} cells`}
      actions={(
        <>
          <Button variant="ghost" onClick={() => setGridOpen(true)}>{editable ? 'Edit rates' : 'View rates'}</Button>
          {editable && <Button variant="ghost" aria-label={`Edit table ${table.table_key}`} onClick={onEdit}><Pencil size={13} aria-hidden="true" /></Button>}
          {editable && <Button variant="ghost" aria-label={`Remove table ${table.table_key}`} onClick={() => setRemoving({ kind: 'rate_tables', id: table.id, label: table.table_key })}><Trash2 size={13} aria-hidden="true" /></Button>}
        </>
      )}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold text-slate-600">Dimensions:</span>
        {dims.length === 0 && <span className="text-slate-500">none (a single rate)</span>}
        {dims.map((dimension) => (
          <span key={dimension.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5">
            {dimension.name || dimension.dimension_key} <span className="text-slate-500">({humanize(dimension.dimension_type)}{dimension.unit ? `, ${dimension.unit}` : ''})</span>
            {editable && (
              <>
                <button type="button" aria-label={`Edit dimension ${dimension.dimension_key}`} onClick={() => setDimensionDialog(dimension)}><Pencil size={11} aria-hidden="true" /></button>
                <button type="button" aria-label={`Remove dimension ${dimension.dimension_key}`} onClick={() => setRemoving({ kind: 'dimensions', id: dimension.id, label: dimension.dimension_key })}><Trash2 size={11} aria-hidden="true" /></button>
              </>
            )}
          </span>
        ))}
        {editable && <Button variant="ghost" onClick={() => setDimensionDialog({ rate_table_id: table.id })}><Plus size={12} aria-hidden="true" /> Dimension</Button>}
      </div>
      {gridOpen && <MatrixDialog table={table} dims={dims} revision={revision} editable={editable} onClose={() => setGridOpen(false)} onSaved={onChanged} />}
      {dimensionDialog && <DimensionDialog dimension={dimensionDialog} revision={revision} onClose={() => setDimensionDialog(null)} onSaved={() => { setDimensionDialog(null); onChanged(); }} />}
      {removing && (
        <ConfirmDialog title={`Remove ${removing.label}?`} confirmLabel="Remove" busy={remove.busy} error={remove.error?.message}
          onCancel={() => setRemoving(null)} onConfirm={() => remove.run(removing)}>
          <p>Removed from this draft only.</p>
        </ConfirmDialog>
      )}
    </Section>
  );
}

function TableDialog({ table, revision, onClose, onSaved }) {
  const [form, setForm] = useState({ table_key: table.table_key || '', name: table.name || '', description: table.description || '', result_type: table.result_type || 'money', result_unit: table.result_unit || '' });
  const save = useAction(() => (table.id
    ? pricingApi.updateItem(revision.id, 'rate_tables', table.id, { ...form, lock_version: revision.lock_version })
    : pricingApi.createItem(revision.id, 'rate_tables', { ...form, is_active: true, lock_version: revision.lock_version })), { success: 'Rate table saved.', onSuccess: onSaved, silent: true });
  return (
    <Dialog title={table.id ? 'Edit rate table' : 'Add rate table'} onClose={onClose} busy={save.busy} footer={(
      <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.run()} busy={save.busy}>Save</Button></>
    )}>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Key" value={form.table_key} onChange={(v) => setForm({ ...form, table_key: v.toLowerCase() })} disabled={Boolean(table.id)} required />
        <TextField label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <SelectField label="Result" value={form.result_type} onChange={(v) => setForm({ ...form, result_type: v })} options={RESULT_TYPES} />
        <TextField label="Result unit" value={form.result_unit} onChange={(v) => setForm({ ...form, result_unit: v })} placeholder="per_hour, per_cwt, per_mile" />
      </div>
      <ErrorBanner message={save.error?.message} />
    </Dialog>
  );
}

function DimensionDialog({ dimension, revision, onClose, onSaved }) {
  const [form, setForm] = useState({
    dimension_key: dimension.dimension_key || '', name: dimension.name || '', dimension_type: dimension.dimension_type || 'number',
    unit: dimension.unit || '', sort_order: String(dimension.sort_order ?? 1), is_required: dimension.is_required ?? true,
  });
  const save = useAction(() => {
    const body = { ...form, sort_order: Number(form.sort_order || 1), rate_table_id: dimension.rate_table_id, lock_version: revision.lock_version };
    return dimension.id ? pricingApi.updateItem(revision.id, 'dimensions', dimension.id, body) : pricingApi.createItem(revision.id, 'dimensions', body);
  }, { success: 'Dimension saved.', onSuccess: onSaved, silent: true });
  return (
    <Dialog title={dimension.id ? 'Edit dimension' : 'Add dimension'} onClose={onClose} busy={save.busy} footer={(
      <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.run()} busy={save.busy}>Save</Button></>
    )}>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Key" value={form.dimension_key} onChange={(v) => setForm({ ...form, dimension_key: v.toLowerCase() })} disabled={Boolean(dimension.id)} hint="The input it reads, e.g. crew_size, weight." required />
        <TextField label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <SelectField label="Type" value={form.dimension_type} onChange={(v) => setForm({ ...form, dimension_type: v })} options={DIMENSION_TYPES} />
        <TextField label="Unit" value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} placeholder="lb, mile, cu_ft" />
        <TextField label="Order" value={form.sort_order} inputMode="numeric" onChange={(v) => setForm({ ...form, sort_order: v.replace(/\D/g, '') })} />
        <CheckboxField label="Required" checked={form.is_required} onChange={(v) => setForm({ ...form, is_required: v })} />
      </div>
      <ErrorBanner message={save.error?.message} />
    </Dialog>
  );
}

const resultField = (table) => (table.result_type === 'percentage' ? 'percentage' : table.result_type === 'text' ? 'result_text' : 'amount');

function toRows(table, dims) {
  return (table.cells || []).map((cell) => ({
    cell_key: cell.cell_key,
    coordinates: dims.reduce((acc, d) => ({ ...acc, [d.dimension_key]: cell.coordinates?.[d.dimension_key] ?? '*' }), {}),
    value: String(cell[resultField(table)] ?? ''),
    priority: cell.priority ?? 100,
  }));
}

function MatrixDialog({ table, dims, revision, editable, onClose, onSaved }) {
  const [rows, setRows] = useState(() => toRows(table, dims));
  const [issues, setIssues] = useState(null);
  const [view, setView] = useState('rows');
  const field = resultField(table);
  const discrete = dims.filter((d) => !isRange(d));
  const pivotable = dims.length === 2 && discrete.length === 2;
  const save = useAction(() => pricingApi.replaceCells(revision.id, table.id, {
    lock_version: revision.lock_version,
    cells: rows.map((row, index) => ({
      cell_key: row.cell_key || `c${index + 1}`, coordinates: row.coordinates, priority: row.priority, is_active: true,
      [field]: field === 'result_text' ? row.value : (row.value === '' ? null : row.value),
    })),
  }), { success: (data) => `Saved ${data.cells} cells.`, onSuccess: (data) => { setIssues(data.issues); onSaved(); } });

  const setRow = (index, patch) => setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const setCoord = (index, key, value) => setRow(index, { coordinates: { ...rows[index].coordinates, [key]: value } });
  const addRow = () => setRows([...rows, {
    cell_key: '', priority: 100, value: '',
    coordinates: dims.reduce((acc, d) => ({ ...acc, [d.dimension_key]: isRange(d) ? { min: '', max: '', min_inclusive: true, max_inclusive: false } : '' }), {}),
  }]);

  return (
    <Dialog title={`${table.name || table.table_key}: rates`} description={editable ? 'Edit cells, then save. The backend checks gaps, overlaps and duplicates.' : 'Read-only.'}
      onClose={onClose} size="lg" busy={save.busy}
      footer={editable ? (<><Button variant="ghost" onClick={onClose}>Close</Button><Button onClick={() => save.run()} busy={save.busy}>Save matrix</Button></>) : <Button variant="ghost" onClick={onClose}>Close</Button>}>
      {pivotable && (
        <div className="mb-2 flex gap-2 text-xs" role="group" aria-label="Matrix view">
          <Button variant={view === 'rows' ? 'primary' : 'ghost'} onClick={() => setView('rows')}>Rows</Button>
          <Button variant={view === 'grid' ? 'primary' : 'ghost'} onClick={() => setView('grid')}>Grid</Button>
        </div>
      )}
      {view === 'grid' && pivotable
        ? <PivotGrid dims={dims} rows={rows} setRows={setRows} editable={editable} />
        : (
          <div className="max-h-[50vh] overflow-auto">
            <table className="w-full text-left text-xs">
              <caption className="sr-only">Rate cells</caption>
              <thead className="sticky top-0 bg-white text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-900">
                <tr>
                  {dims.map((d) => <th key={d.id} scope="col" className="py-1.5 pr-2">{d.name || d.dimension_key}</th>)}
                  <th scope="col" className="py-1.5 pr-2">{humanize(table.result_type)}</th>
                  <th scope="col" className="py-1.5 pr-2">Priority</th>
                  {editable && <th scope="col"><span className="sr-only">Remove</span></th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-t border-slate-100">
                    {dims.map((d) => (
                      <td key={d.id} className="py-1 pr-2 align-top">
                        {!editable ? coordinateText(d, row.coordinates[d.dimension_key]) : isRange(d) ? (
                          <RangeInput label={`${d.dimension_key} row ${index + 1}`} value={row.coordinates[d.dimension_key]} onChange={(v) => setCoord(index, d.dimension_key, v)} />
                        ) : (
                          <input aria-label={`${d.dimension_key} row ${index + 1}`} className={`${inputClass} py-1`} value={row.coordinates[d.dimension_key] ?? ''}
                            onChange={(event) => setCoord(index, d.dimension_key, numericOrText(d, event.target.value))} placeholder="* = any" />
                        )}
                      </td>
                    ))}
                    <td className="py-1 pr-2 align-top">
                      {editable
                        ? <input aria-label={`Rate row ${index + 1}`} inputMode="decimal" className={`${inputClass} py-1`} value={row.value} onChange={(event) => setRow(index, { value: event.target.value })} />
                        : <span className="tabular-nums">{row.value}</span>}
                    </td>
                    <td className="py-1 pr-2 align-top">
                      {editable
                        ? <input aria-label={`Priority row ${index + 1}`} inputMode="numeric" className={`${inputClass} w-20 py-1`} value={row.priority} onChange={(event) => setRow(index, { priority: Number(event.target.value.replace(/\D/g, '') || 0) })} />
                        : row.priority}
                    </td>
                    {editable && (
                      <td className="py-1 align-top">
                        <Button variant="ghost" aria-label={`Remove row ${index + 1}`} onClick={() => setRows(rows.filter((_, i) => i !== index))}><Trash2 size={13} aria-hidden="true" /></Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {editable && <Button variant="ghost" className="mt-2" onClick={addRow}><Plus size={13} aria-hidden="true" /> Add row</Button>}
          </div>
        )}
      {issues && <div className="mt-3"><IssueList issues={issues} /></div>}
      <ErrorBanner message={save.error?.message} />
    </Dialog>
  );
}

const numericOrText = (dimension, raw) => {
  if (raw === '*' || raw === '') return raw;
  if (['crew_size', 'truck_count'].includes(dimension.dimension_type) && /^\d+$/.test(raw)) return Number(raw);
  return raw;
};

function RangeInput({ label, value, onChange }) {
  const v = typeof value === 'object' && value ? value : { min: '', max: '', min_inclusive: true, max_inclusive: false };
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <select aria-label={`${label} lower bound`} className="rounded border border-slate-200 px-1 py-1 text-[11px]" value={v.min_inclusive === false ? '>' : '>='} onChange={(e) => onChange({ ...v, min_inclusive: e.target.value === '>=' })}>
        <option value=">=">≥</option><option value=">">&gt;</option>
      </select>
      <input aria-label={`${label} from`} inputMode="decimal" className="w-20 rounded border border-slate-200 px-1.5 py-1 text-xs" value={v.min ?? ''} onChange={(e) => onChange({ ...v, min: e.target.value })} />
      <select aria-label={`${label} upper bound`} className="rounded border border-slate-200 px-1 py-1 text-[11px]" value={v.max_inclusive ? '<=' : '<'} onChange={(e) => onChange({ ...v, max_inclusive: e.target.value === '<=' })}>
        <option value="<">&lt;</option><option value="<=">≤</option>
      </select>
      <input aria-label={`${label} to`} inputMode="decimal" className="w-20 rounded border border-slate-200 px-1.5 py-1 text-xs" value={v.max ?? ''} placeholder="no limit" onChange={(e) => onChange({ ...v, max: e.target.value === '' ? null : e.target.value })} />
    </div>
  );
}

/** Two discrete dimensions shown as a matrix (rows x columns). */
function PivotGrid({ dims, rows, setRows, editable }) {
  const [rowDim, colDim] = dims;
  const values = (dim) => [...new Set(rows.map((r) => r.coordinates[dim.dimension_key]).filter((v) => v !== '' && v !== undefined))]
    .sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))));
  const rowValues = useMemo(() => values(rowDim), [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const colValues = useMemo(() => values(colDim), [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const find = (r, c) => rows.findIndex((row) => row.coordinates[rowDim.dimension_key] === r && row.coordinates[colDim.dimension_key] === c);
  const setCell = (r, c, value) => {
    const index = find(r, c);
    if (index >= 0) setRows(rows.map((row, i) => (i === index ? { ...row, value } : row)));
    else setRows([...rows, { cell_key: '', priority: 100, value, coordinates: { [rowDim.dimension_key]: r, [colDim.dimension_key]: c } }]);
  };
  if (!rowValues.length || !colValues.length) return <Callout>Add rows first; the grid shows the combinations that exist.</Callout>;
  return (
    <div className="overflow-auto">
      <table className="text-xs">
        <caption className="sr-only">{`${rowDim.dimension_key} by ${colDim.dimension_key}`}</caption>
        <thead>
          <tr>
            <th scope="col" className="p-1.5 text-left text-slate-500">{rowDim.name || rowDim.dimension_key} \ {colDim.name || colDim.dimension_key}</th>
            {colValues.map((c) => <th key={String(c)} scope="col" className="p-1.5 text-left">{String(c)}</th>)}
          </tr>
        </thead>
        <tbody>
          {rowValues.map((r) => (
            <tr key={String(r)}>
              <th scope="row" className="p-1.5 text-left">{String(r)}</th>
              {colValues.map((c) => {
                const index = find(r, c);
                return (
                  <td key={String(c)} className="p-1">
                    {editable
                      ? <input aria-label={`${rowDim.dimension_key} ${r}, ${colDim.dimension_key} ${c}`} inputMode="decimal" className="w-24 rounded border border-slate-200 px-1.5 py-1" value={index >= 0 ? rows[index].value : ''} onChange={(e) => setCell(r, c, e.target.value)} />
                      : <span className="tabular-nums">{index >= 0 ? rows[index].value : '—'}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BulkRatesDialog({ revision, onClose, onSaved }) {
  const [mode, setMode] = useState('percentage');
  const [value, setValue] = useState('');
  const [tables, setTables] = useState([]);
  const save = useAction(() => pricingApi.bulkRates(revision.id, {
    [mode]: value, table_keys: tables, lock_version: revision.lock_version,
  }), { success: (data) => `${data.changed} rates changed.`, onSuccess: onSaved, silent: true });
  return (
    <Dialog title="Bulk rate change" description="Applies to this draft's rate cells (and rule rates when no table is selected)." onClose={onClose} busy={save.busy} footer={(
      <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.run()} busy={save.busy} disabled={!value}>Apply</Button></>
    )}>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField label="Change by" value={mode} onChange={setMode} options={[['percentage', 'Percentage'], ['amount', 'Fixed amount']]} />
        <DecimalField label={mode === 'percentage' ? 'Percent (e.g. 5 or -3)' : 'Amount (e.g. 10 or -5)'} value={value} onChange={setValue} allowNegative />
      </div>
      <fieldset className="mt-3">
        <legend className="text-xs font-semibold text-slate-700">Only these tables (optional)</legend>
        <div className="mt-1 flex flex-wrap gap-3">
          {(revision.content?.rate_tables || []).map((t) => (
            <CheckboxField key={t.id} label={t.table_key} checked={tables.includes(t.table_key)} onChange={(on) => setTables(on ? [...tables, t.table_key] : tables.filter((k) => k !== t.table_key))} />
          ))}
        </div>
      </fieldset>
      <ErrorBanner message={save.error?.message} />
    </Dialog>
  );
}
