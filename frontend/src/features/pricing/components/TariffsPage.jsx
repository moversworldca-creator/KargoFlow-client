// Settings › Pricing › Tariffs: the Tariff catalog. The selected Tariff and
// revision live in the URL (?tariff=&revision=) so a link opens the same view.
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import useCan from '../../../shared/auth/useCan';
import { PRICING_METHODS, TARIFF_STATES } from '../constants';
import { TARIFF_STATE_TONE, humanize } from '../format';
import { PRICING } from '../permissions';
import { useTariffs } from '../queries';
import TariffCreateDialog from './TariffCreateDialog';
import TariffDetail from './TariffDetail';
import { Button, QueryState, Section, StateBadge, inputClass } from './ui';

export default function TariffsPage() {
  const { can } = useCan();
  const [params, setParams] = useSearchParams();
  const tariffId = Number(params.get('tariff')) || null;
  const [filters, setFilters] = useState({ q: '', state: '', primary_pricing_method: '' });
  const [creating, setCreating] = useState(false);
  const query = useTariffs({ ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), limit: 100 });
  const rows = query.data?.results || [];

  const open = (id, revisionId) => {
    const next = new URLSearchParams(params);
    if (id) next.set('tariff', String(id)); else next.delete('tariff');
    if (revisionId) next.set('revision', String(revisionId)); else next.delete('revision');
    setParams(next);
  };

  if (tariffId) {
    return <TariffDetail tariffId={tariffId} revisionId={Number(params.get('revision')) || null} onBack={() => open(null)} onOpenRevision={(id) => open(tariffId, id)} />;
  }

  return (
    <div className="space-y-3">
      <Section
        title="Tariffs"
        description="Published Tariff revisions price every Estimate, Change Order and Final Rating. Drafts never affect live pricing."
        actions={can(PRICING.CREATE) && (
          <Button onClick={() => setCreating(true)}><Plus size={14} aria-hidden="true" /> New Tariff</Button>
        )}
      >
        <div className="mb-3 grid gap-2 sm:grid-cols-[2fr_1fr_1fr]">
          <label className="relative block">
            <span className="sr-only">Search Tariffs</span>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input type="search" className={`${inputClass} pl-9`} placeholder="Search by name or key" value={filters.q}
              onChange={(event) => setFilters({ ...filters, q: event.target.value })} />
          </label>
          <label>
            <span className="sr-only">State</span>
            <select className={inputClass} value={filters.state} onChange={(event) => setFilters({ ...filters, state: event.target.value })}>
              <option value="">Active and inactive</option>
              {TARIFF_STATES.map((state) => <option key={state} value={state}>{humanize(state)}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Pricing method</span>
            <select className={inputClass} value={filters.primary_pricing_method} onChange={(event) => setFilters({ ...filters, primary_pricing_method: event.target.value })}>
              <option value="">All methods</option>
              {PRICING_METHODS.map((m) => <option key={m} value={m}>{humanize(m)}</option>)}
            </select>
          </label>
        </div>
        <QueryState query={query} empty={!rows.length} emptyText="No Tariffs yet. Create one to start pricing Estimates." deniedText="Your role does not include viewing Tariffs.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <caption className="sr-only">Tariffs</caption>
              <thead className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-800">
                <tr>
                  <th scope="col" className="py-2 pr-3">Tariff</th>
                  <th scope="col" className="py-2 pr-3">Method</th>
                  <th scope="col" className="py-2 pr-3">Scope</th>
                  <th scope="col" className="py-2 pr-3">Priority</th>
                  <th scope="col" className="py-2 pr-3">Published revision</th>
                  <th scope="col" className="py-2">State</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                    <td className="py-2 pr-3">
                      <button type="button" className="text-left font-semibold text-primary hover:underline" onClick={() => open(row.id)}>{row.name}</button>
                      <div className="text-[11px] text-slate-500">{row.catalog_key}</div>
                    </td>
                    <td className="py-2 pr-3">{humanize(row.primary_pricing_method)}</td>
                    <td className="py-2 pr-3">{row.branch_id ? `Branch #${row.branch_id}` : row.branch_ids?.length ? `${row.branch_ids.length} branches` : 'Company-wide'}</td>
                    <td className="py-2 pr-3 tabular-nums">{row.resolver_priority}</td>
                    <td className="py-2 pr-3">{row.current_published_revision_id ? 'Published' : <span className="text-amber-700">None yet</span>}</td>
                    <td className="py-2"><StateBadge state={row.state} tones={TARIFF_STATE_TONE} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </Section>
      {creating && (
        <TariffCreateDialog
          onClose={() => setCreating(false)}
          onCreated={(created) => { setCreating(false); open(created.id, created.draft_revision?.id); }}
        />
      )}
    </div>
  );
}
