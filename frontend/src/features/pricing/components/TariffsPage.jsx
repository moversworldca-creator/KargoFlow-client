// Settings → Tariffs → Tariff Library. The open tariff lives in the URL
// (?tariff=) so a link opens the same tariff.
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import useCan from '../../../shared/auth/useCan';
import { tariffsApi } from '../api';
import { BINDING_TYPES } from '../constants';
import { formatMoney } from '../format';
import { ENTITLEMENTS_VIEW, TARIFFS } from '../permissions';
import { tariffKeys, useBranchOptions, useInvalidateTariffs, useOpportunityTypes, useTariffFeature, useTariffs } from '../queries';
import TariffEditor from './TariffEditor';
import { Badge, Button, ConfirmDialog, Dialog, ErrorBanner, PlanGate, QueryState, Section, TextField, inputClass, useAction } from './ui';

const bindingLabel = (key) => (key === 'not_set' ? 'Not set' : BINDING_TYPES.find(([k]) => k === key)?.[1] || key);

export default function TariffsPage() {
  const { can } = useCan();
  const feature = useTariffFeature(can(ENTITLEMENTS_VIEW));
  const [params, setParams] = useSearchParams();
  const tariffId = Number(params.get('tariff')) || null;
  const open = (id) => {
    const next = new URLSearchParams(params);
    if (id) next.set('tariff', String(id)); else next.delete('tariff');
    setParams(next);
  };
  if (feature && feature.mode === 'none') return <PlanGate feature={feature} />;
  if (tariffId) return <TariffEditor tariffId={tariffId} onBack={() => open(null)} />;
  return <Library onOpen={open} />;
}

function Library({ onOpen }) {
  const { can } = useCan();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState(null);
  const invalidate = useInvalidateTariffs();
  const query = useTariffs({ ...(q ? { q } : {}), ...(status ? { active: status === 'active' ? 1 : 0 } : {}) });
  const branches = useBranchOptions();
  const types = useOpportunityTypes();
  const names = (list, ids) => ids.map((id) => (list.data || []).find((x) => x.id === id)?.name || `#${id}`).join(', ');
  const rows = query.data || [];
  const toggle = useAction(({ id, active }) => (active ? tariffsApi.activate(id) : tariffsApi.deactivate(id)), {
    success: (_, { active }) => (active ? 'Tariff activated.' : 'Tariff deactivated.'),
    invalidate: () => invalidate(tariffKeys.all), onSuccess: () => setToggling(null),
  });
  return (
    <Section title="Tariff Library" description="Select a tariff to configure its rates. New opportunities start with the active tariff that applies to their branch and opportunity type."
      actions={can(TARIFFS.MANAGE) && <Button onClick={() => setCreating(true)}><Plus size={14} aria-hidden="true" /> New Tariff</Button>}>
      <div className="mb-3 grid gap-2 sm:grid-cols-[2fr_1fr]">
        <label className="relative block">
          <span className="sr-only">Search tariffs</span>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input type="search" className={`${inputClass} pl-9`} placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label><span className="sr-only">Status</span>
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Active and inactive</option><option value="active">Active</option><option value="inactive">Inactive</option>
          </select></label>
      </div>
      <QueryState query={query} empty={!rows.length} emptyText={q || status ? 'No tariff matches.' : 'No tariffs yet.'}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" aria-label="Tariffs">
            <thead className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-800">
              <tr><th scope="col" className="py-2 pr-3">Tariff</th><th scope="col" className="py-2 pr-3">Branches</th>
                <th scope="col" className="py-2 pr-3">Opportunity types</th><th scope="col" className="py-2 pr-3">Binding default</th>
                <th scope="col" className="py-2 pr-3">Minimum booking</th><th scope="col" className="py-2 pr-3">Status</th>
                <th scope="col"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <td className="py-2 pr-3">
                    <button type="button" className="font-semibold text-brand-blue hover:underline" onClick={() => onOpen(t.id)}>{t.name}</button>
                    {t.is_managed && <Badge tone="blue">Managed</Badge>}
                  </td>
                  <td className="py-2 pr-3">{t.applies_to_all_branches ? 'All' : names(branches, t.branch_ids)}</td>
                  <td className="py-2 pr-3">{t.applies_to_all_opportunity_types ? 'All' : names(types, t.opportunity_type_ids)}</td>
                  <td className="py-2 pr-3">{bindingLabel(t.default_binding_type)}</td>
                  <td className="py-2 pr-3 tabular-nums">{t.minimum_booking_amount == null ? '—' : formatMoney(t.minimum_booking_amount)}</td>
                  <td className="py-2 pr-3">{t.is_active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}</td>
                  <td className="py-2 text-right">
                    {can(TARIFFS.MANAGE) && (
                      <Button variant="ghost" onClick={() => setToggling({ id: t.id, name: t.name, active: !t.is_active })}>{t.is_active ? 'Deactivate' : 'Activate'}</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </QueryState>
      {creating && <CreateDialog onClose={() => setCreating(false)} onCreated={(t) => { setCreating(false); onOpen(t.id); }} />}
      {toggling && (
        <ConfirmDialog title={`${toggling.active ? 'Activate' : 'Deactivate'} ${toggling.name}?`} confirmLabel={toggling.active ? 'Activate' : 'Deactivate'}
          busy={toggle.busy} error={toggle.error?.message} onCancel={() => setToggling(null)} onConfirm={() => toggle.run(toggling)}>
          <p>{toggling.active ? 'New opportunities can start with this tariff again.' : 'New opportunities stop receiving this tariff. Opportunities that already use it keep it.'}</p>
        </ConfirmDialog>
      )}
    </Section>
  );
}

function CreateDialog({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const invalidate = useInvalidateTariffs();
  const create = useAction(() => tariffsApi.create({ name: name.trim() }), {
    success: 'Tariff created.', silent: true, invalidate: () => invalidate(tariffKeys.all), onSuccess: onCreated,
  });
  return (
    <Dialog title="New tariff" onClose={onClose} busy={create.busy} footer={(
      <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => create.run()} busy={create.busy} disabled={!name.trim()}>Create</Button></>
    )}>
      <TextField label="Tariff Name" value={name} onChange={setName} required />
      <p className="mt-2 text-xs text-slate-500">The tariff starts with only the Default period and empty rate screens.</p>
      <ErrorBanner message={create.error?.message} />
    </Dialog>
  );
}
