// One Tariff: its settings, its revisions, and the SmartMoving-parity Tariff Configuration editor.
import React, { useEffect, useState } from 'react';
import { ArrowLeft, CopyPlus, Settings } from 'lucide-react';
import useCan from '../../../shared/auth/useCan';
import { pricingApi } from '../api';
import { PRICING_METHODS } from '../constants';
import { REVISION_STATE_TONE, TARIFF_STATE_TONE, formatDateOnly, formatDateTime, humanize } from '../format';
import { PRICING } from '../permissions';
import { pricingKeys, useInvalidatePricing, useTariff, useRevision } from '../queries';
import TariffParityEditor from './TariffParityEditor';
import RevisionWorkspace from './RevisionWorkspace';
import {
  Button, ConfirmDialog, Dialog, ErrorBanner, KeyValue, QueryState, Section, SelectField, StateBadge, TextField, useAction,
} from './ui';

export default function TariffDetail({ tariffId, revisionId, onBack, onOpenRevision }) {
  const query = useTariff(tariffId);
  return (
    <div className="space-y-3">
      <QueryState query={query}>
        {query.data ? (
          <TariffView
            tariff={query.data}
            tariffId={tariffId}
            revisionId={revisionId}
            onBack={onBack}
            onOpenRevision={onOpenRevision}
          />
        ) : null}
      </QueryState>
    </div>
  );
}

function TariffView({ tariff, tariffId, revisionId, onBack, onOpenRevision }) {
  const { can } = useCan();
  const invalidate = useInvalidatePricing();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const revisions = tariff.revisions || [];
  const selected = revisionId || tariff.current_published_revision_id || revisions[0]?.id || null;

  useEffect(() => {
    if (!revisionId && selected) onOpenRevision(selected);
  }, [revisionId, selected, onOpenRevision]);

  const refresh = () => Promise.all([
    invalidate(pricingKeys.tariff(tariffId), ['pricing', 'tariffs']),
    selected ? invalidate(pricingKeys.revision(selected)) : Promise.resolve(),
  ]);

  const stateAction = useAction(({ action }) => pricingApi.setTariffState(tariffId, action), {
    success: (_, { action }) => `Tariff ${action === 'archive' ? 'archived' : action === 'activate' ? 'activated' : 'deactivated'}.`,
    invalidate: refresh,
    onSuccess: () => setConfirm(null),
  });

  const revisionQuery = useRevision(selected);

  return (
    <div className="space-y-4">
      {/* If revision is loading or error */}
      <QueryState query={revisionQuery}>
        {revisionQuery.data ? (
          <TariffParityEditor
            key={revisionQuery.data.id}
            tariff={tariff}
            revision={revisionQuery.data}
            revisions={revisions}
            onBack={onBack}
            onOpenRevision={onOpenRevision}
            onChanged={refresh}
          />
        ) : null}
      </QueryState>

      {editing && (
        <TariffSettingsDialog
          tariff={tariff}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); refresh(); }}
        />
      )}

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
    </div>
  );
}

function TariffSettingsDialog({ tariff, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: tariff.name,
    description: tariff.description || '',
    primary_pricing_method: tariff.primary_pricing_method,
    resolver_priority: String(tariff.resolver_priority ?? ''),
  });
  const save = useAction(
    () => pricingApi.updateTariff(tariff.id, {
      ...form,
      resolver_priority: Number(form.resolver_priority),
      lock_version: tariff.lock_version,
    }),
    { success: 'Tariff settings saved.', onSuccess: onSaved, silent: true }
  );

  return (
    <Dialog
      title="Tariff settings"
      onClose={onClose}
      busy={save.busy}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={save.busy}>Cancel</Button>
          <Button onClick={() => save.run()} busy={save.busy}>Save</Button>
        </>
      )}
    >
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
