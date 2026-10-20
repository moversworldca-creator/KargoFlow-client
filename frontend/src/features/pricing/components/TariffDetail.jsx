// One Tariff: its settings, its revisions (history is never rewritten) and the
// selected revision's workspace.
import React, { useEffect, useState } from 'react';
import { ArrowLeft, CopyPlus } from 'lucide-react';
import useCan from '../../../shared/auth/useCan';
import { pricingApi } from '../api';
import { PRICING_METHODS } from '../constants';
import { REVISION_STATE_TONE, TARIFF_STATE_TONE, formatDateOnly, formatDateTime, humanize } from '../format';
import { PRICING } from '../permissions';
import { pricingKeys, useInvalidatePricing, useTariff } from '../queries';
import RevisionWorkspace from './RevisionWorkspace';
import {
  Button, ConfirmDialog, Dialog, ErrorBanner, KeyValue, QueryState, Section, SelectField, StateBadge, TextField, useAction,
} from './ui';

// Loads the Tariff, then renders the view with it, so every callback in the
// view can rely on the Tariff being present.
export default function TariffDetail({ tariffId, revisionId, onBack, onOpenRevision }) {
  const query = useTariff(tariffId);
  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft size={14} aria-hidden="true" /> All Tariffs
      </button>
      <QueryState query={query}>
        {query.data ? <TariffView tariff={query.data} tariffId={tariffId} revisionId={revisionId} onOpenRevision={onOpenRevision} /> : null}
      </QueryState>
    </div>
  );
}

function TariffView({ tariff, tariffId, revisionId, onOpenRevision }) {
  const { can } = useCan();
  const invalidate = useInvalidatePricing();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const revisions = tariff.revisions || [];
  const selected = revisionId || tariff.current_published_revision_id || revisions[0]?.id || null;

  useEffect(() => {
    if (!revisionId && selected) onOpenRevision(selected);
  }, [revisionId, selected, onOpenRevision]);

  const refresh = () => invalidate(pricingKeys.tariff(tariffId), ['pricing', 'tariffs']);
  const stateAction = useAction(({ action }) => pricingApi.setTariffState(tariffId, action), {
    success: (_, { action }) => `Tariff ${action === 'archive' ? 'archived' : action === 'activate' ? 'activated' : 'deactivated'}.`,
    invalidate: refresh, onSuccess: () => setConfirm(null),
  });
  // Values reach the action as arguments, never through the closure (the React
  // Compiler evaluates closure reads while the Tariff may still be loading).
  const newDraft = useAction((cloneFrom) => pricingApi.createRevision(tariffId, { clone_from_revision_id: cloneFrom }), {
    success: 'New draft revision created from the current one.',
    invalidate: refresh, onSuccess: (created) => onOpenRevision(created.id),
  });
  const hasDraft = revisions.some((r) => ['draft', 'validated', 'pending_approval', 'approved'].includes(r.state));

  return (
          <>
            <Section
              title={tariff.name}
              description={tariff.description || `Key ${tariff.catalog_key}`}
              actions={(
                <>
                  <StateBadge state={tariff.state} tones={TARIFF_STATE_TONE} />
                  {can(PRICING.UPDATE_DRAFT) && tariff.state !== 'archived' && <Button variant="ghost" onClick={() => setEditing(true)}>Edit settings</Button>}
                  {can(PRICING.UPDATE_DRAFT) && tariff.state === 'inactive' && <Button variant="ghost" onClick={() => setConfirm('activate')}>Activate</Button>}
                  {can(PRICING.UPDATE_DRAFT) && tariff.state === 'active' && <Button variant="ghost" onClick={() => setConfirm('deactivate')}>Deactivate</Button>}
                  {can(PRICING.RETIRE) && tariff.state !== 'archived' && <Button variant="danger" onClick={() => setConfirm('archive')}>Archive</Button>}
                </>
              )}
            >
              <KeyValue items={[
                ['Pricing method', humanize(tariff.primary_pricing_method)],
                ['Resolver priority', tariff.resolver_priority],
                ['Scope', tariff.branch_id ? `Branch #${tariff.branch_id}` : tariff.branch_ids?.length ? `Branches ${tariff.branch_ids.join(', ')}` : 'Company-wide'],
                ['Effective date basis', humanize(tariff.default_effective_date_basis)],
                ['Regulated', tariff.is_regulated ? `Yes (${tariff.regulatory_profile_key || 'profile not set'})` : 'No'],
                ['Updated', formatDateTime(tariff.updated_at)],
              ]} />
            </Section>

            <Section
              title="Revisions"
              description="Published revisions are read-only. A change is a new draft revision that goes through validation and approval."
              actions={can(PRICING.CREATE) && (
                <Button variant="ghost" onClick={() => newDraft.run(tariff.current_published_revision_id || revisions[0]?.id || null)} busy={newDraft.busy} disabled={hasDraft} title={hasDraft ? 'Finish or delete the open draft first' : undefined}>
                  <CopyPlus size={14} aria-hidden="true" /> New draft revision
                </Button>
              )}
            >
              <ul className="flex flex-wrap gap-2" aria-label="Revisions">
                {revisions.map((revision) => (
                  <li key={revision.id}>
                    <button
                      type="button"
                      aria-current={revision.id === selected ? 'true' : undefined}
                      onClick={() => onOpenRevision(revision.id)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${revision.id === selected ? 'border-primary bg-primary/5' : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                      <span className="font-semibold">Rev {revision.revision_number}</span>
                      <StateBadge state={revision.state} tones={REVISION_STATE_TONE} />
                      {revision.effective_start_date && <span className="text-slate-500">from {formatDateOnly(revision.effective_start_date)}</span>}
                      {revision.id === tariff.current_published_revision_id && <span className="text-emerald-700">current</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </Section>

            {selected && (
              <RevisionWorkspace
                key={selected}
                revisionId={selected}
                tariff={tariff}
                revisions={revisions}
                onOpenRevision={onOpenRevision}
                onChanged={refresh}
              />
            )}

            {editing && <TariffSettingsDialog tariff={tariff} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); refresh(); }} />}
            {confirm && (
              <ConfirmDialog
                title={`${humanize(confirm)} Tariff?`}
                confirmLabel={humanize(confirm)}
                tone={confirm === 'archive' ? 'danger' : 'primary'}
                busy={stateAction.busy}
                error={stateAction.error?.message}
                onCancel={() => setConfirm(null)}
                onConfirm={() => stateAction.run({ action: confirm })}
              >
                {confirm === 'archive' && <p>An archived Tariff is never used for new pricing. Its revisions and every Estimate priced with it are kept unchanged.</p>}
                {confirm === 'deactivate' && <p>The Tariff stops applying to new calculations. Existing Estimates keep their stored pricing.</p>}
                {confirm === 'activate' && <p>The Tariff&apos;s published revision applies again to new calculations.</p>}
              </ConfirmDialog>
            )}
          </>
  );
}

function TariffSettingsDialog({ tariff, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: tariff.name, description: tariff.description || '', primary_pricing_method: tariff.primary_pricing_method,
    resolver_priority: String(tariff.resolver_priority ?? ''),
  });
  const save = useAction(() => pricingApi.updateTariff(tariff.id, {
    ...form, resolver_priority: Number(form.resolver_priority), lock_version: tariff.lock_version,
  }), { success: 'Tariff settings saved.', onSuccess: onSaved, silent: true });
  return (
    <Dialog title="Tariff settings" onClose={onClose} busy={save.busy} footer={(
      <>
        <Button variant="ghost" onClick={onClose} disabled={save.busy}>Cancel</Button>
        <Button onClick={() => save.run()} busy={save.busy}>Save</Button>
      </>
    )}>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
        <SelectField label="Primary pricing method" value={form.primary_pricing_method} onChange={(v) => setForm({ ...form, primary_pricing_method: v })} options={PRICING_METHODS} />
        <TextField label="Resolver priority" value={form.resolver_priority} inputMode="numeric" onChange={(v) => setForm({ ...form, resolver_priority: v.replace(/\D/g, '') })} />
        <TextField label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
      </div>
      <ErrorBanner message={save.error?.message} />
    </Dialog>
  );
}
