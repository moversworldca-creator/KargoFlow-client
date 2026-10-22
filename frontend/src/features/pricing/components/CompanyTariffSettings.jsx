// Company tariff settings outside a single tariff: Valuation Templates
// (VAL-01) and Settings → Storage → Storage Rates (STO-01..06).
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import useCan from '../../../shared/auth/useCan';
import { storageTariffsApi, valuationTemplatesApi } from '../api';
import { STORAGE_METHODS, VALUATION_TYPES } from '../constants';
import { formatRate } from '../format';
import { TARIFFS } from '../permissions';
import { tariffKeys, useInvalidateTariffs, useStorageTariffs, useValuationTemplates, useWarehouses } from '../queries';
import { DecimalField, SelectInput, Toggle } from '../sections/fields';
import { Badge, Button, Dialog, ErrorBanner, ProblemList, QueryState, Section, TextAreaField, TextField, useAction } from './ui';

const label = (list, key) => list.find(([k]) => k === key)?.[1] || key;

export function ValuationTemplatesPage() {
  const { can } = useCan();
  const query = useValuationTemplates();
  const [editing, setEditing] = useState(null);
  const rows = query.data || [];
  return (
    <Section title="Valuation Templates" description="Company valuation options (name, type and description). Each tariff prices them under Protection → Valuation."
      actions={can(TARIFFS.MANAGE) && <Button onClick={() => setEditing({ name: '', valuation_type: 'full_value', description: '', is_active: true })}><Plus size={14} aria-hidden="true" /> New Template</Button>}>
      <QueryState query={query} empty={!rows.length} emptyText="No valuation templates yet.">
        <ul className="space-y-1.5">
          {rows.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800">
              <span className="font-semibold">{t.name}</span><Badge tone="blue">{label(VALUATION_TYPES, t.valuation_type)}</Badge>
              {!t.is_active && <Badge>Inactive</Badge>}
              <span className="min-w-0 flex-1 truncate text-slate-500">{t.description}</span>
              {can(TARIFFS.MANAGE) && <Button variant="ghost" onClick={() => setEditing(t)} aria-label={`Edit ${t.name}`}>Edit</Button>}
            </li>
          ))}
        </ul>
      </QueryState>
      {editing && <TemplateDialog template={editing} onClose={() => setEditing(null)} />}
    </Section>
  );
}

function TemplateDialog({ template, onClose }) {
  const [form, setForm] = useState(template);
  const invalidate = useInvalidateTariffs();
  const save = useAction(() => (template.id ? valuationTemplatesApi.update(template.id, form) : valuationTemplatesApi.create(form)), {
    success: 'Valuation template saved.', silent: true, invalidate: () => invalidate(tariffKeys.valuationTemplates()), onSuccess: onClose,
  });
  return (
    <Dialog title={template.id ? `Edit ${template.name}` : 'New valuation template'} onClose={onClose} busy={save.busy} footer={(
      <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.run()} busy={save.busy} disabled={!form.name.trim()}>Save</Button></>
    )}>
      <div className="space-y-3">
        <TextField label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
        <SelectInput label="Valuation type" value={form.valuation_type} onChange={(valuation_type) => setForm({ ...form, valuation_type })} options={VALUATION_TYPES} />
        <TextAreaField label="Description" value={form.description} onChange={(description) => setForm({ ...form, description })} rows={4} />
        {template.id && <Toggle label="Active" checked={form.is_active} onChange={(is_active) => setForm({ ...form, is_active })} />}
      </div>
      <ErrorBanner message={save.error?.message} />
    </Dialog>
  );
}

const COMPONENTS = [['sit', 'SIT Recurring Storage'], ['permanent', 'Permanent Recurring Storage'], ['handling', 'Warehouse Handling'], ['valuation', 'Storage Valuation']];

export function StorageRatesPage() {
  const { can } = useCan();
  const query = useStorageTariffs();
  const warehouses = useWarehouses();
  const invalidate = useInvalidateTariffs();
  const [editing, setEditing] = useState(null);
  const rows = query.data || [];
  const assign = useAction(({ warehouse, tariff }) => storageTariffsApi.assign(warehouse, tariff), {
    success: 'Warehouse storage tariff updated.', invalidate: () => invalidate(tariffKeys.warehouses(), tariffKeys.storage()),
  });
  const describe = (row, key) => `${label(STORAGE_METHODS[key], row[`${key}_method`])}${row[`${key}_rate`] != null ? ` · ${formatRate(row[`${key}_rate`])}` : ''}`;
  return (
    <div className="space-y-3">
      <Section title="Storage Rates" description="Named storage tariffs for warehouses. These are separate from moving tariffs."
        actions={can(TARIFFS.MANAGE) && <Button onClick={() => setEditing({ name: '', is_active: true })}><Plus size={14} aria-hidden="true" /> New Storage Tariff</Button>}>
        <QueryState query={query} empty={!rows.length} emptyText="No storage tariffs yet.">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" aria-label="Storage tariffs">
              <thead className="text-[11px] uppercase text-slate-500"><tr><th scope="col" className="py-2 pr-3">Name</th>
                {COMPONENTS.map(([k, text]) => <th key={k} scope="col" className="py-2 pr-3">{text}</th>)}<th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>{rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-3 font-semibold">{row.name} {!row.is_active && <Badge>Inactive</Badge>}</td>
                  {COMPONENTS.map(([k]) => <td key={k} className="py-2 pr-3">{describe(row, k)}</td>)}
                  <td className="py-2 text-right">{can(TARIFFS.MANAGE) && <Button variant="ghost" onClick={() => setEditing(row)} aria-label={`Edit ${row.name}`}>Edit</Button>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </QueryState>
      </Section>
      <Section title="Warehouses" description="Each warehouse uses at most one storage tariff at a time.">
        <QueryState query={warehouses} empty={!(warehouses.data || []).length} emptyText="No warehouses yet.">
          <ul className="space-y-1.5">
            {(warehouses.data || []).map((w) => (
              <li key={w.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800">
                <span className="font-semibold">{w.name}</span><span className="text-slate-500">{w.code}</span>
                <span className="ml-auto w-64">
                  <SelectInput label={`Storage tariff for ${w.name}`} hideLabel value={w.storage_tariff_id ? String(w.storage_tariff_id) : ''}
                    disabled={!can(TARIFFS.MANAGE) || assign.busy}
                    onChange={(v) => assign.run({ warehouse: w.id, tariff: v ? Number(v) : null })}
                    options={[['', 'No storage tariff'], ...rows.filter((r) => r.is_active || r.id === w.storage_tariff_id).map((r) => [String(r.id), r.name])]} />
                </span>
              </li>
            ))}
          </ul>
        </QueryState>
      </Section>
      {editing && <StorageDialog row={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function StorageDialog({ row, onClose }) {
  const [form, setForm] = useState({ sit_method: 'cwt', permanent_method: 'cwt', handling_method: 'cwt', valuation_method: 'cwt', ...row });
  const invalidate = useInvalidateTariffs();
  const save = useAction(() => (row.id ? storageTariffsApi.update(row.id, form) : storageTariffsApi.create(form)), {
    success: 'Storage tariff saved.', silent: true, invalidate: () => invalidate(tariffKeys.storage(), tariffKeys.warehouses()), onSuccess: onClose,
  });
  return (
    <Dialog title={row.id ? `Edit ${row.name}` : 'New storage tariff'} onClose={onClose} size="lg" busy={save.busy} footer={(
      <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => save.run()} busy={save.busy} disabled={!form.name?.trim()}>Save</Button></>
    )}>
      <div className="space-y-3">
        <TextField label="Name" value={form.name} onChange={(name) => setForm({ ...form, name })} required />
        {COMPONENTS.map(([key, text]) => (
          <div key={key} className="grid gap-3 sm:grid-cols-2">
            <SelectInput label={text} value={form[`${key}_method`]} onChange={(v) => setForm({ ...form, [`${key}_method`]: v })} options={STORAGE_METHODS[key]} />
            <DecimalField label={`${text} rate`} value={form[`${key}_rate`]} onChange={(v) => setForm({ ...form, [`${key}_rate`]: v })} />
          </div>
        ))}
        {row.id && <Toggle label="Active" checked={form.is_active} onChange={(is_active) => setForm({ ...form, is_active })} />}
      </div>
      <ProblemList problems={save.error?.errors} />
      <ErrorBanner message={save.error?.message} />
    </Dialog>
  );
}
