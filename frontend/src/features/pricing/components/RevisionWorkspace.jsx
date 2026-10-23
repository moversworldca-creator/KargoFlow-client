// A Tariff revision: its lifecycle (draft -> validated -> pending approval ->
// approved -> published / scheduled -> retired) and its content editors.
// Only a draft is editable; everything else is shown read-only and changed by
// creating a new draft. Every transition is a backend command with its own
// permission; the backend refuses an invalid one and the refusal is shown.
import React, { useState } from 'react';
import { Download, Lock } from 'lucide-react';
import useCan from '../../../shared/auth/useCan';
import { pricingApi } from '../api';
import { ROUNDING_METHODS } from '../constants';
import { REVISION_STATE_TONE, formatDateOnly, formatDateTime, humanize } from '../format';
import { PRICING } from '../permissions';
import { pricingKeys, useInvalidatePricing, usePolicy, useRevision } from '../queries';
import ApplicabilityEditor from './ApplicabilityEditor';
import ConstraintsEditor from './ConstraintsEditor';
import RateTablesEditor from './RateTablesEditor';
import RevisionDiff from './RevisionDiff';
import RulesEditor from './RulesEditor';
import ScenariosPanel from './ScenariosPanel';
import SimulationPanel from './SimulationPanel';
import {
  Button, Callout, ConfirmDialog, Dialog, ErrorBanner, IssueList, KeyValue, QueryState, Section, SelectField,
  StateBadge, Tabs, TextField, TextAreaField, useAction,
} from './ui';

const TRANSITIONS = [
  // [action, label, permission, states it is offered in, tone, confirmation text]
  ['validate', 'Validate', PRICING.VALIDATE, ['draft'], 'primary',
    'Runs every structural check and the regression tests. With no blocking error the revision becomes Validated and is frozen until reopened.'],
  ['reopen', 'Reopen for editing', PRICING.UPDATE_DRAFT, ['validated', 'rejected'], 'ghost',
    'The revision returns to Draft. It must be validated again before submission.'],
  ['submit', 'Submit for approval', PRICING.SUBMIT, ['draft', 'validated'], 'primary',
    'The revision is validated again and sent for approval. It cannot be edited while pending.'],
  ['approve', 'Approve', PRICING.APPROVE, ['pending_approval'], 'primary',
    'Approve this revision for publication. You cannot approve a revision you submitted when independent approval is required.'],
  ['reject', 'Reject', PRICING.APPROVE, ['pending_approval'], 'danger', null],
  ['publish', 'Publish', PRICING.PUBLISH, ['approved'], 'primary', null],
  ['retire', 'Retire', PRICING.RETIRE, ['published', 'scheduled'], 'danger',
    'The revision stops being used for new pricing. Estimates already priced with it keep their stored pricing.'],
  ['rollback', 'Restore as new revision', PRICING.ROLLBACK, ['published', 'retired'], 'ghost',
    'Creates the next revision number with this revision\'s content. History is not rewritten.'],
];

// Loads the revision, then renders the view with it. Everything inside the
// view (including action callbacks) can rely on the revision being present.
export default function RevisionWorkspace(props) {
  const query = useRevision(props.revisionId);
  return <QueryState query={query}>{query.data ? <RevisionView {...props} revision={query.data} /> : null}</QueryState>;
}

function RevisionView({ revisionId, revision, tariff, revisions, onOpenRevision, onChanged }) {
  const { can } = useCan();
  const policy = usePolicy();
  const invalidate = useInvalidatePricing();
  const [tab, setTab] = useState('rules');
  const [pending, setPending] = useState(null);
  const [reason, setReason] = useState('');
  const [validation, setValidation] = useState(null);
  const [editingSettings, setEditingSettings] = useState(false);
  const editable = (revision ? revision.state : undefined) === 'draft' && can(PRICING.UPDATE_DRAFT);
  const simplified = policy.data?.revision_workflow === 'simplified';

  const refresh = () => Promise.all([invalidate(pricingKeys.revision(revisionId)), onChanged?.()]);
  const transition = useAction(({ action, body }) => pricingApi.revisionAction(revisionId, action, body), {
    success: (data, { action }) => ({
      validate: data?.valid ? 'Validation passed. The revision is now Validated.' : 'Validation found blocking errors.',
      reopen: 'Revision reopened as a draft.', submit: 'Submitted for approval.', approve: 'Revision approved.',
      reject: 'Revision rejected.', publish: data?.state === 'scheduled' ? 'Revision scheduled for its start date.' : 'Revision published.',
      retire: 'Revision retired.', rollback: 'Restored as a new revision.',
    }[action]),
    invalidate: refresh,
    onSuccess: (data, { action }) => {
      setPending(null);
      setReason('');
      if (action === 'validate') { setValidation(data); setTab('validation'); }
      if (action === 'rollback' && data?.id) onOpenRevision(data.id);
    },
  });
  const removeDraft = useAction(() => pricingApi.deleteRevision(revisionId), {
    success: 'Draft revision deleted.', invalidate: () => onChanged?.(),
    onSuccess: () => { setPending(null); const other = revisions.find((r) => r.id !== revisionId); onOpenRevision(other?.id || null); },
  });
  const exportRevision = async () => {
    const document = await pricingApi.exportRevision(revisionId);
    const blob = new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' });
    const link = window.document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${tariff.catalog_key}-rev${revision.revision_number}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const offered = revision ? TRANSITIONS.filter(([action, , permission, states]) => can(permission) && (
    states.includes(revision.state) || (action === 'publish' && simplified && revision.state === 'validated')
  )) : [];
  const content = (revision ? revision.content : undefined) || {};
  const issues = validation?.issues || (revision ? revision.validation : undefined) || [];

  const tabs = [
    { id: 'rules', label: 'Rules', count: content.rules?.length },
    { id: 'rates', label: 'Rate tables', count: content.rate_tables?.length },
    { id: 'applicability', label: 'Applicability', count: content.applicability?.length },
    { id: 'constraints', label: 'Constraints', count: content.constraints?.length },
    { id: 'tests', label: 'Tests', count: content.scenarios?.length },
    { id: 'validation', label: 'Validation', count: issues.length || undefined },
    { id: 'compare', label: 'Compare' },
    ...(can(PRICING.SIMULATE) ? [{ id: 'simulate', label: 'Simulate' }] : []),
  ];

  return (
    <>
      {revision && (
        <Section
          title={`Revision ${revision.revision_number}`}
          description={`Created ${formatDateTime(revision.created_at)}${revision.created_reason ? ` · ${humanize(revision.created_reason)}` : ''}`}
          actions={(
            <>
              <StateBadge state={revision.state} tones={REVISION_STATE_TONE} />
              {offered.map(([action, label, , , tone]) => (
                <Button key={action} variant={tone} onClick={() => setPending(action)}>{label}</Button>
              ))}
              {editable && <Button variant="ghost" onClick={() => setEditingSettings(true)}>Dates &amp; rounding</Button>}
              {editable && <Button variant="danger" onClick={() => setPending('delete')}>Delete draft</Button>}
              <Button variant="ghost" onClick={exportRevision} aria-label="Export revision as JSON"><Download size={14} aria-hidden="true" /> Export</Button>
            </>
          )}
        >
          <div className="space-y-3">
            {revision.state !== 'draft' && (
              <Callout tone="info" title={['published', 'scheduled', 'retired'].includes(revision.state) ? 'This revision is read-only' : 'Frozen while in review'}>
                <span className="inline-flex items-center gap-1"><Lock size={12} aria-hidden="true" />
                  {['published', 'scheduled', 'retired'].includes(revision.state)
                    ? 'Published revisions are never edited. Create a new draft revision to change pricing.'
                    : 'Reopen it (when allowed) to make changes.'}
                </span>
              </Callout>
            )}
            {revision.state === 'rejected' && revision.rejection_reason && (
              <Callout tone="warning" title="Rejected">{revision.rejection_reason}</Callout>
            )}
            <KeyValue items={[
              ['Effective from', formatDateOnly(revision.effective_start_date)],
              ['Effective until', revision.effective_end_date ? formatDateOnly(revision.effective_end_date) : 'Open-ended'],
              ['Currency', revision.currency],
              ['Rounding', `${humanize(revision.rounding_method)} · lines ${revision.line_rounding_scale} / totals ${revision.total_rounding_scale}`],
              ['Published', revision.published_at ? formatDateTime(revision.published_at) : '—'],
              ['Content hash', revision.content_hash && revision.content_hash !== '0'.repeat(64) ? `${revision.content_hash.slice(0, 12)}…` : '—'],
            ]} />
            <Tabs tabs={tabs} active={tab} onChange={setTab} label="Revision content" />
            <div role="tabpanel" aria-label={tabs.find((t) => t.id === tab)?.label}>
              {tab === 'rules' && <RulesEditor revision={revision} editable={editable} onChanged={refresh} />}
              {tab === 'rates' && <RateTablesEditor revision={revision} editable={editable} onChanged={refresh} />}
              {tab === 'applicability' && <ApplicabilityEditor revision={revision} editable={editable} onChanged={refresh} />}
              {tab === 'constraints' && <ConstraintsEditor revision={revision} editable={editable} onChanged={refresh} />}
              {tab === 'tests' && <ScenariosPanel revision={revision} editable={editable} onChanged={refresh} />}
              {tab === 'validation' && (
                <div className="space-y-2">
                  {validation?.summary && (
                    <p className="text-xs text-slate-600">{validation.summary.errors} errors · {validation.summary.warnings} warnings · {validation.summary.info} notes</p>
                  )}
                  <IssueList issues={issues} />
                  {!issues.length && revision.state === 'draft' && <p className="text-xs text-slate-500">Run Validate to check this draft.</p>}
                </div>
              )}
              {tab === 'compare' && <RevisionDiff revision={revision} revisions={revisions} />}
              {tab === 'simulate' && <SimulationPanel revision={revision} tariff={tariff} />}
            </div>
          </div>
        </Section>
      )}

      {pending && pending !== 'delete' && (() => {
        const [action, label, , , tone, text] = TRANSITIONS.find(([a]) => a === pending);
        const future = action === 'publish' && revision.effective_start_date && revision.effective_start_date > new Date().toISOString().slice(0, 10);
        return (
          <ConfirmDialog
            title={`${label}: revision ${revision.revision_number}`}
            confirmLabel={label}
            tone={tone === 'ghost' ? 'primary' : tone}
            busy={transition.busy}
            error={transition.error?.message}
            onCancel={() => { setPending(null); transition.reset(); }}
            onConfirm={() => transition.run({ action, body: ['reject', 'approve'].includes(action) ? { comment: reason, reason } : {} })}
          >
            {text && <p>{text}</p>}
            {action === 'publish' && (
              <p>
                {future
                  ? `The revision is scheduled and takes over on ${formatDateOnly(revision.effective_start_date)}.`
                  : 'The revision becomes the live price list for new calculations immediately.'}
                {' '}Estimates already priced keep their stored pricing; they are repriced only by an explicit recalculation.
              </p>
            )}
            {['reject', 'approve'].includes(action) && (
              <TextAreaField label={action === 'reject' ? 'Reason (shown to the submitter)' : 'Comment (optional)'} value={reason} onChange={setReason} required={action === 'reject'} />
            )}
          </ConfirmDialog>
        );
      })()}
      {pending === 'delete' && (
        <ConfirmDialog title="Delete this draft revision?" confirmLabel="Delete draft" busy={removeDraft.busy} error={removeDraft.error?.message}
          onCancel={() => setPending(null)} onConfirm={() => removeDraft.run()}>
          <p>Only drafts can be deleted. Published history is never removed.</p>
        </ConfirmDialog>
      )}
      {editingSettings && revision && (
        <RevisionSettingsDialog revision={revision} onClose={() => setEditingSettings(false)} onSaved={() => { setEditingSettings(false); refresh(); }} />
      )}
    </>
  );
}

function RevisionSettingsDialog({ revision, onClose, onSaved }) {
  const [form, setForm] = useState({
    effective_start_date: revision.effective_start_date || '', effective_end_date: revision.effective_end_date || '',
    rounding_method: revision.rounding_method || 'half_up', line_rounding_scale: String(revision.line_rounding_scale ?? 2),
    total_rounding_scale: String(revision.total_rounding_scale ?? 2), tax_rounding_scale: String(revision.tax_rounding_scale ?? 2),
  });
  const save = useAction(() => pricingApi.updateRevision(revision.id, {
    effective_start_date: form.effective_start_date || null, effective_end_date: form.effective_end_date || null,
    rounding_method: form.rounding_method, line_rounding_scale: Number(form.line_rounding_scale),
    total_rounding_scale: Number(form.total_rounding_scale), tax_rounding_scale: Number(form.tax_rounding_scale),
    lock_version: revision.lock_version,
  }), { success: 'Revision settings saved.', onSuccess: onSaved, silent: true });
  const set = (patch) => setForm({ ...form, ...patch });
  return (
    <Dialog title="Effective dates and rounding" description="Dates are business dates in the branch's timezone." onClose={onClose} busy={save.busy} footer={(
      <>
        <Button variant="ghost" onClick={onClose} disabled={save.busy}>Cancel</Button>
        <Button onClick={() => save.run()} busy={save.busy}>Save</Button>
      </>
    )}>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Effective from" type="date" value={form.effective_start_date} onChange={(v) => set({ effective_start_date: v })} />
        <TextField label="Effective until (inclusive)" type="date" value={form.effective_end_date} onChange={(v) => set({ effective_end_date: v })} hint="Leave empty for open-ended." />
        <SelectField label="Rounding method" value={form.rounding_method} onChange={(v) => set({ rounding_method: v })} options={ROUNDING_METHODS} />
        <SelectField label="Line decimals" value={form.line_rounding_scale} onChange={(v) => set({ line_rounding_scale: v })} options={['0', '1', '2', '3', '4']} />
        <SelectField label="Tax decimals" value={form.tax_rounding_scale} onChange={(v) => set({ tax_rounding_scale: v })} options={['0', '1', '2', '3', '4']} />
        <SelectField label="Total decimals" value={form.total_rounding_scale} onChange={(v) => set({ total_rounding_scale: v })} options={['0', '1', '2', '3', '4']} />
      </div>
      <ErrorBanner message={save.error?.message} />
    </Dialog>
  );
}
