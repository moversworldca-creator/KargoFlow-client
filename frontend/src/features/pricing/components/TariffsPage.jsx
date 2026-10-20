// Settings › Pricing › Tariffs: the Tariff catalog. The selected Tariff and
// revision live in the URL (?tariff=&revision=) so a link opens the same view.
import React, { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Copy, Plus, Search } from 'lucide-react';
import useCan from '../../../shared/auth/useCan';
import { getBranches } from '../../../services/api';
import { pricingApi } from '../api';
import { PRICING_METHODS, REVISION_STATES, TARIFF_STATES } from '../constants';
import { REVISION_STATE_TONE, TARIFF_STATE_TONE, formatDateOnly, formatDateTime, humanize } from '../format';
import { ENTITLEMENTS_VIEW, PRICING } from '../permissions';
import { pricingKeys, useEstimatesFeature, useInvalidatePricing, useTariffs } from '../queries';
import TariffCreateDialog from './TariffCreateDialog';
import TariffDetail from './TariffDetail';
import {
  Badge, Button, ConfirmDialog, Dialog, EmptyState, ErrorBanner, PlanGate, QueryState, Section, StateBadge, TextField, inputClass, useAction,
} from './ui';

const asList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

export default function TariffsPage() {
  const { can } = useCan();
  const feature = useEstimatesFeature(can(ENTITLEMENTS_VIEW));
  const [params, setParams] = useSearchParams();
  const tariffId = Number(params.get('tariff')) || null;
  const [filters, setFilters] = useState({ q: '', state: '', primary_pricing_method: '', revision_state: '', contract_pricing: '', branch_id: '' });
  const [creating, setCreating] = useState(false);
  const [cloning, setCloning] = useState(null);
  const [toggling, setToggling] = useState(null);
  const invalidate = useInvalidatePricing();
  const branches = useQuery({ queryKey: ['pricing', 'branch-options'], queryFn: getBranches, staleTime: 60_000, retry: false });
  const branchNames = Object.fromEntries(asList(branches.data).map((b) => [b.id, b.name]));
  const query = useTariffs({ ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), limit: 100 });
  const rows = query.data?.results || [];
  const filtered = Object.values(filters).some(Boolean);
  const toggle = useAction(({ id, action }) => pricingApi.setTariffState(id, action), {
    success: (_, { action }) => (action === 'activate' ? 'Tariff activated.' : 'Tariff deactivated.'),
    invalidate: () => invalidate(['pricing', 'tariffs']), onSuccess: () => setToggling(null),
  });

  const open = useCallback((id, revisionId) => {
    const next = new URLSearchParams(params);
    if (id) next.set('tariff', String(id)); else next.delete('tariff');
    if (revisionId) next.set('revision', String(revisionId)); else next.delete('revision');
    setParams(next);
  }, [params, setParams]);

  if (feature && !['write', 'read'].includes(feature.mode)) return <PlanGate feature={feature} />;
  if (tariffId) {
    return <TariffDetail tariffId={tariffId} revisionId={Number(params.get('revision')) || null} onBack={() => open(null)} onOpenRevision={(id) => open(tariffId, id)} />;
  }

  const scope = (row) => (row.branch_id ? branchNames[row.branch_id] || `Branch #${row.branch_id}`
    : row.branch_ids?.length ? row.branch_ids.map((id) => branchNames[id] || `#${id}`).join(', ') : 'All branches');
  const select = (key, options, label) => (
    <label>
      <span className="sr-only">{label}</span>
      <select className={inputClass} value={filters[key]} onChange={(event) => setFilters({ ...filters, [key]: event.target.value })}>
        {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </label>
  );

  return (
    <div className="space-y-3">
      {feature?.readOnly && <PlanGate feature={feature} />}
      <Section
        title="Tariffs"
        description="Published Tariff revisions price every Estimate, Change Order and Final Rating. Drafts never affect live pricing."
        actions={can(PRICING.CREATE) && <Button onClick={() => setCreating(true)}><Plus size={14} aria-hidden="true" /> New Tariff</Button>}
      >
        <div className="mb-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <label className="relative block sm:col-span-3 lg:col-span-2">
            <span className="sr-only">Search Tariffs</span>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input type="search" className={`${inputClass} pl-9`} placeholder="Search by name or code" value={filters.q}
              onChange={(event) => setFilters({ ...filters, q: event.target.value })} />
          </label>
          {select('state', [['', 'Active and inactive'], ...TARIFF_STATES.map((s) => [s, humanize(s)])], 'Status')}
          {select('primary_pricing_method', [['', 'All methods'], ...PRICING_METHODS.map((m) => [m, humanize(m)])], 'Pricing method')}
          {select('revision_state', [['', 'Any revision state'], ...REVISION_STATES.map((s) => [s, `Has ${humanize(s).toLowerCase()} revision`])], 'Revision state')}
          {select('contract_pricing', [['', 'All pricing'], ['true', 'Customer / contract pricing'], ['false', 'Standard pricing only']], 'Customer / contract pricing')}
          {select('branch_id', [['', 'All branches'], ...asList(branches.data).map((b) => [String(b.id), b.name])], 'Branch')}
        </div>
        <QueryState query={query} empty={!rows.length}
          emptyText={filtered ? 'No Tariffs match these filters.' : 'No Tariffs yet. Create your first Tariff to begin pricing Estimates.'}
          deniedText="Your role does not include viewing Tariffs.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-xs">
              <caption className="sr-only">Tariffs</caption>
              <thead className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-800">
                <tr>
                  <th scope="col" className="py-2 pr-3">Tariff</th>
                  <th scope="col" className="py-2 pr-3">Method</th>
                  <th scope="col" className="py-2 pr-3">Branches</th>
                  <th scope="col" className="py-2 pr-3">Live revision</th>
                  <th scope="col" className="py-2 pr-3">Latest revision</th>
                  <th scope="col" className="py-2 pr-3">Status</th>
                  <th scope="col" className="py-2"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                    <td className="py-2 pr-3">
                      <button type="button" className="text-left font-semibold text-primary hover:underline" onClick={() => open(row.id)}>{row.name}</button>
                      <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                        {row.catalog_key}
                        {row.has_contract_pricing && <Badge tone="blue">Customer / contract pricing</Badge>}
                      </div>
                    </td>
                    <td className="py-2 pr-3">{humanize(row.primary_pricing_method)}</td>
                    <td className="py-2 pr-3">{scope(row)}</td>
                    <td className="py-2 pr-3">
                      {row.current_revision_number
                        ? <>Rev {row.current_revision_number}<div className="text-[11px] text-slate-500">from {formatDateOnly(row.current_effective_start_date)}{row.current_published_at && ` · published ${formatDateTime(row.current_published_at)}`}</div></>
                        : <span className="text-amber-700">None published</span>}
                    </td>
                    <td className="py-2 pr-3">{row.latest_revision_number ? <span className="inline-flex items-center gap-1">Rev {row.latest_revision_number} <StateBadge state={row.latest_revision_state} tones={REVISION_STATE_TONE} /></span> : '—'}</td>
                    <td className="py-2 pr-3"><StateBadge state={row.state} tones={TARIFF_STATE_TONE} /></td>
                    <td className="py-2 text-right">
                      <span className="inline-flex gap-1">
                        <Button variant="ghost" onClick={() => open(row.id)}>Open</Button>
                        {can(PRICING.CREATE) && row.latest_revision_id && <Button variant="ghost" aria-label={`Clone ${row.name}`} onClick={() => setCloning(row)}><Copy size={13} aria-hidden="true" /> Clone</Button>}
                        {can(PRICING.UPDATE_DRAFT) && row.state === 'active' && <Button variant="ghost" onClick={() => setToggling({ row, action: 'deactivate' })}>Deactivate</Button>}
                        {can(PRICING.UPDATE_DRAFT) && row.state === 'inactive' && <Button variant="ghost" onClick={() => setToggling({ row, action: 'activate' })}>Activate</Button>}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
        {!query.isLoading && !rows.length && !filtered && can(PRICING.CREATE) && (
          <EmptyState><Button onClick={() => setCreating(true)}><Plus size={14} aria-hidden="true" /> Create your first Tariff</Button></EmptyState>
        )}
      </Section>
      {creating && (
        <TariffCreateDialog onClose={() => setCreating(false)} onCreated={(created) => { setCreating(false); open(created.id, created.draft_revision?.id); }} />
      )}
      {cloning && <CloneDialog tariff={cloning} onClose={() => setCloning(null)} onCloned={(id, revision) => { setCloning(null); invalidate(pricingKeys.all); open(id, revision); }} />}
      {toggling && (
        <ConfirmDialog title={`${humanize(toggling.action)} ${toggling.row.name}?`} confirmLabel={humanize(toggling.action)} tone="primary"
          busy={toggle.busy} error={toggle.error?.message} onCancel={() => setToggling(null)} onConfirm={() => toggle.run({ id: toggling.row.id, action: toggling.action })}>
          <p>{toggling.action === 'deactivate' ? 'The Tariff stops applying to new calculations. Estimates already priced keep their stored pricing.' : 'The Tariff applies again to new calculations.'}</p>
        </ConfirmDialog>
      )}
    </div>
  );
}

/** Clone = export the source revision, create a new Tariff, import it as a draft. */
function CloneDialog({ tariff, onClose, onCloned }) {
  const [name, setName] = useState(`${tariff.name} (copy)`);
  const [key, setKey] = useState(`${tariff.catalog_key}_copy`);
  const clone = useAction(async () => {
    const document = await pricingApi.exportRevision(tariff.current_published_revision_id || tariff.latest_revision_id);
    const created = await pricingApi.createTariff({
      catalog_key: key, name, primary_pricing_method: tariff.primary_pricing_method, resolver_priority: tariff.resolver_priority,
      branch_id: tariff.branch_id || null, branch_ids: tariff.branch_ids || [],
    });
    const draft = await pricingApi.importRevision(created.id, document);
    return { id: created.id, revision: draft.id };
  }, { success: 'Tariff cloned as a new draft.', onSuccess: (r) => onCloned(r.id, r.revision), silent: true });
  return (
    <Dialog title={`Clone ${tariff.name}`} description="Copies the live (or latest) revision into a new Tariff as a draft. The original is not changed." onClose={onClose} busy={clone.busy}
      footer={(<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => clone.run()} busy={clone.busy} disabled={!name || !/^[a-z0-9][a-z0-9_]*$/.test(key)}>Clone</Button></>)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="New name" value={name} onChange={setName} required />
        <TextField label="New code" value={key} onChange={(v) => setKey(v.toLowerCase())} required hint="Lowercase letters, numbers and _." />
      </div>
      <ErrorBanner message={clone.error && `${clone.error.message}${clone.error.detail ? ` (${clone.error.detail})` : ''}`} />
    </Dialog>
  );
}
