// An Opportunity's tariff and materials (CM-05/06, RER-01..05). Changing the
// tariff reapplies its rates; materials move across by name for an unmanaged
// tariff, and anything that cannot be matched is flagged Inventory Out of Sync.
// Prices and line totals come from the backend.
import React, { useState } from 'react';
import { AlertTriangle, Plus, RefreshCw, Trash2 } from 'lucide-react';
import useCan from '../../../shared/auth/useCan';
import { opportunityTariffApi } from '../api';
import { formatMoney } from '../format';
import { OPPORTUNITIES } from '../permissions';
import { tariffKeys, useInvalidateTariffs, useOpportunityTariff } from '../queries';
import { DecimalInput, IconButton, SelectInput } from '../sections/fields';
import { Badge, Button, Callout, ConfirmDialog, LoadingState, QueryState, Section, useAction } from './ui';

export default function OpportunityTariffPanel({ opportunityId, locked = false }) {
  const query = useOpportunityTariff(opportunityId);
  return (
    <QueryState query={query} deniedText="You cannot view this opportunity’s tariff.">
      {query.data ? <PanelView key={JSON.stringify(query.data.materials)} state={query.data} locked={locked} /> : <LoadingState />}
    </QueryState>
  );
}

function PanelView({ state, locked }) {
  const { can } = useCan();
  const invalidate = useInvalidateTariffs();
  const editable = can(OPPORTUNITIES.UPDATE) && !locked;
  const [choice, setChoice] = useState(state.tariff_id ? String(state.tariff_id) : '');
  const [confirming, setConfirming] = useState(false);
  const [rows, setRows] = useState(() => state.materials.map((m) => ({ ...m })));
  const tariff = state.tariff;
  const refresh = () => invalidate(tariffKeys.opportunity(state.opportunity_id));
  const change = useAction(() => opportunityTariffApi.change(state.opportunity_id, Number(choice)), {
    success: 'Tariff changed and its rates reapplied.', invalidate: refresh, onSuccess: () => setConfirming(false),
  });
  const save = useAction(() => opportunityTariffApi.saveMaterials(state.opportunity_id, rows.map((r) => ({
    material_key: r.material_key, material_name: r.material_name, quantity: r.quantity, pack_quantity: r.pack_quantity, unpack_quantity: r.unpack_quantity,
  }))), { success: 'Materials saved.', invalidate: refresh });
  const rerate = useAction(() => opportunityTariffApi.rerate(state.opportunity_id), { success: 'Tariff rates reapplied.', invalidate: refresh });
  const dirty = JSON.stringify(rows.map(({ material_name, quantity, pack_quantity, unpack_quantity }) => [material_name, quantity, pack_quantity, unpack_quantity]))
    !== JSON.stringify(state.materials.map(({ material_name, quantity, pack_quantity, unpack_quantity }) => [material_name, quantity, pack_quantity, unpack_quantity]));
  const available = (tariff?.materials || []).filter((m) => !rows.some((r) => r.material_name.toLowerCase() === m.name.toLowerCase()));
  const setRow = (index, patch) => setRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  return (
    <Section title="Tariff" description={tariff ? `Rates for this opportunity come from ${tariff.name}.` : 'No tariff applies yet.'}
      actions={editable && tariff && <Button variant="ghost" onClick={() => rerate.run()} busy={rerate.busy} disabled={dirty}><RefreshCw size={14} aria-hidden="true" /> Reapply tariff rates</Button>}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-72">
            <SelectInput label="Tariff" value={choice} onChange={setChoice} disabled={!editable}
              options={[...(state.tariff_id ? [] : [['', 'Choose a tariff']]),
                ...state.eligible_tariffs.map((t) => [String(t.id), `${t.name}${t.is_managed ? ' (managed)' : ''}`]),
                ...(tariff && !state.eligible_tariffs.some((t) => t.id === tariff.id) ? [[String(tariff.id), `${tariff.name} (no longer eligible)`]] : [])]} />
          </div>
          {editable && <Button onClick={() => setConfirming(true)} disabled={!choice || choice === String(state.tariff_id) || dirty}>Change tariff</Button>}
          {tariff?.minimum_booking_amount && <span className="text-xs text-slate-500">Minimum booking amount {formatMoney(tariff.minimum_booking_amount)}</span>}
        </div>
        {state.inventory_out_of_sync && (
          <Callout tone="warning" title="Inventory Out of Sync">
            {tariff?.is_managed
              ? 'This is a managed tariff: materials are not migrated automatically. Review the materials marked below and correct them.'
              : 'Some materials are not in this tariff (or are named differently). Review the materials marked below.'}
          </Callout>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" aria-label="Opportunity materials">
            <thead className="text-[11px] uppercase text-slate-500"><tr>
              <th scope="col" className="py-1 pr-2">Material</th><th scope="col" className="py-1 pr-2 text-right">Quantity</th>
              <th scope="col" className="py-1 pr-2 text-right">Packed (CP)</th><th scope="col" className="py-1 pr-2 text-right">Unpacked</th>
              <th scope="col" className="py-1 pr-2 text-right">Price</th><th scope="col" className="py-1 pr-2 text-right">Total</th>
              <th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {!rows.length && <tr><td colSpan={7} className="py-3 text-center text-slate-500">No materials.</td></tr>}
              {rows.map((row, index) => (
                <tr key={row.material_name} className="border-t border-slate-100 dark:border-slate-800">
                  <th scope="row" className="py-1 pr-2 font-semibold">{row.material_name} {row.out_of_sync && <Badge tone="amber"><AlertTriangle size={11} aria-hidden="true" /> Out of sync</Badge>}</th>
                  {['quantity', 'pack_quantity', 'unpack_quantity'].map((key) => (
                    <td key={key} className="py-1 pr-2"><DecimalInput label={`${row.material_name} ${key.replace('_', ' ')}`} places={2} disabled={!editable}
                      className="w-20 text-right" value={row[key]} onChange={(v) => setRow(index, { [key]: v ?? '0' })} /></td>
                  ))}
                  <td className="py-1 pr-2 text-right tabular-nums">{row.unit_price == null ? '—' : formatMoney(row.unit_price)}</td>
                  <td className="py-1 pr-2 text-right tabular-nums">{row.line_total == null ? '—' : formatMoney(row.line_total)}</td>
                  <td>{editable && <IconButton label={`Remove ${row.material_name}`} onClick={() => setRows(rows.filter((_, i) => i !== index))}><Trash2 size={13} /></IconButton>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {editable && tariff && (
          <div className="flex flex-wrap items-end gap-2">
            {available.length > 0 && (
              <div className="w-64"><SelectInput label="Add material" value="" onChange={(id) => {
                const material = available.find((m) => m.id === id);
                if (material) setRows([...rows, { material_key: material.id, material_name: material.name, quantity: '1', pack_quantity: '0', unpack_quantity: '0', unit_price: material.unit_price, line_total: null, out_of_sync: false }]);
              }} options={[['', 'Choose…'], ...available.map((m) => [m.id, m.name])]} /></div>
            )}
            <Button onClick={() => save.run()} busy={save.busy} disabled={!dirty}><Plus size={14} aria-hidden="true" /> Save materials</Button>
            {dirty && <span className="text-[11px] text-slate-500">Totals update after saving.</span>}
          </div>
        )}
      </div>
      {confirming && (
        <ConfirmDialog title="Change the tariff?" confirmLabel="Change tariff" busy={change.busy} error={change.error?.message}
          onCancel={() => setConfirming(false)} onConfirm={() => change.run()}>
          <p>The new tariff’s rates are reapplied to this opportunity.</p>
          <p className="mt-1">Materials with the same name move across with their quantities; others are kept and marked Inventory Out of Sync. A managed tariff never moves materials automatically.</p>
        </ConfirmDialog>
      )}
    </Section>
  );
}
