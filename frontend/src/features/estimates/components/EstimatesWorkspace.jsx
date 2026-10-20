// Opportunity › Estimate tab: every Estimate of this ONE Opportunity
// (options are Estimates, never extra Opportunities), option groups and the
// customer's choice, booking (a separate Opportunity command; acceptance
// alone never books), Change Orders and Final Rating after booking.
import React, { useState } from 'react';
import { Layers, Lock, Plus } from 'lucide-react';
import useCan from '../../../shared/auth/useCan';
import { ESTIMATE_STATE_TONE, formatDateOnly, formatMoney, humanize } from '../../pricing/format';
import { ENTITLEMENTS_VIEW, ESTIMATES, OPPORTUNITY } from '../../pricing/permissions';
import {
  Badge, Button, Callout, ConfirmDialog, LoadingState, PlanGate, QueryState, Section, StateBadge, TextAreaField, useAction,
} from '../../pricing/components/ui';
import { useEstimatesFeature } from '../../pricing/queries';
import { estimatesApi } from '../api';
import { useBookingReadiness, useInvalidateEstimates, useWorkspace } from '../queries';
import ChangeOrdersPanel from './ChangeOrdersPanel';
import EstimateDetail from './EstimateDetail';
import { CreateEstimateDialog, ProposalGroupDialog } from './EstimateDialogs';
import FinalRatingPanel from './FinalRatingPanel';

const CLOSED = ['superseded', 'cancelled', 'expired'];

export default function EstimatesWorkspace({ opportunityId, customerEmail, recipients = [] }) {
  const { can } = useCan();
  const feature = useEstimatesFeature(can(ENTITLEMENTS_VIEW));
  const query = useWorkspace(opportunityId);
  const invalidate = useInvalidateEstimates();
  const [openId, setOpenId] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [showClosed, setShowClosed] = useState(false);
  const workspace = query.data;
  const select = useAction(({ groupId, estimateId }) => estimatesApi.selectOption(opportunityId, groupId, estimateId), {
    success: 'Option selected. The other options were superseded; nothing was booked.', invalidate: () => invalidate(), onSuccess: () => setDialog(null),
  });

  if (feature && !['write', 'read'].includes(feature.mode)) return <PlanGate feature={feature} />;
  if (!can(ESTIMATES.VIEW)) return <Callout>You do not have access to Estimates.</Callout>;
  if (query.isLoading) return <LoadingState label="Loading Estimates…" />;
  if (!workspace) return <QueryState query={query}>{null}</QueryState>;

  if (openId) {
    return <EstimateDetail estimateId={openId} opportunity={{ ...workspace, customer_email: customerEmail, recipients }} onBack={() => { setOpenId(null); invalidate(); }} />;
  }

  const opportunity = workspace.opportunity;
  const estimates = workspace.estimates.filter((e) => showClosed || !CLOSED.includes(e.lifecycle_state));
  const closedCount = workspace.estimates.length - workspace.estimates.filter((e) => !CLOSED.includes(e.lifecycle_state)).length;
  const groups = workspace.proposal_groups || [];
  const ungrouped = estimates.filter((e) => !e.proposal_group_id);

  const card = (estimate) => (
    <li key={estimate.id}>
      <button type="button" onClick={() => setOpenId(estimate.id)}
        className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-xs hover:border-primary dark:border-slate-800 dark:bg-slate-900">
        <span className="font-bold">{estimate.estimate_number}</span>
        <span className="text-slate-700">{estimate.option_label}</span>
        <StateBadge state={estimate.lifecycle_state} tones={ESTIMATE_STATE_TONE} />
        <Badge>{humanize(estimate.binding_type)}</Badge>
        {estimate.is_booked && <Badge tone="green"><Lock size={11} aria-hidden="true" /> Booked</Badge>}
        {estimate.pricing_stale && !CLOSED.includes(estimate.lifecycle_state) && !estimate.is_booked && (
          <Badge tone="amber">{estimate.current_pricing_run_id ? 'Price out of date' : 'Not priced'}</Badge>
        )}
        <span className="ml-auto text-sm font-bold tabular-nums">{estimate.current_pricing_run_id ? formatMoney(estimate.grand_total) : '—'}</span>
      </button>
    </li>
  );

  return (
    <div className="space-y-3">
      <Section
        title="Estimates"
        description={`Opportunity ${opportunity.opportunity_number}${opportunity.move_date ? ` · move ${formatDateOnly(opportunity.move_date)}` : ''}`}
        actions={(
          <>
            {opportunity.system_state === 'open' && can(ESTIMATES.MANAGE_OPTIONS) && ungrouped.filter((e) => e.lifecycle_state === 'draft').length >= 2 && (
              <Button variant="ghost" onClick={() => setDialog('group')}><Layers size={13} aria-hidden="true" /> Offer as options</Button>
            )}
            {opportunity.system_state === 'open' && can(ESTIMATES.CREATE) && (
              <Button onClick={() => setDialog('create')}><Plus size={14} aria-hidden="true" /> New Estimate</Button>
            )}
          </>
        )}
      >
        {opportunity.is_booked && <Callout tone="success" title="Booked">The booked Estimate is locked. Use Change Orders and Final Rating below.</Callout>}
        {!workspace.planned_jobs.length && <Callout tone="warning">Add a Planned Job to this Opportunity before creating an Estimate.</Callout>}
        {!estimates.length ? <p className="py-6 text-center text-xs text-slate-500">No Estimates yet.</p> : (
          <div className="mt-2 space-y-3">
            {groups.map((group) => {
              const members = estimates.filter((e) => e.proposal_group_id === group.id);
              if (!members.length) return null;
              return (
                <div key={group.id} className="rounded-xl border border-dashed border-slate-300 p-2">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
                    <Layers size={13} aria-hidden="true" /><span className="font-semibold">{group.name}</span>
                    <Badge tone={group.state === 'selected' ? 'green' : 'slate'}>{group.state === 'selected' ? 'Option chosen' : 'Customer chooses one'}</Badge>
                    {group.state === 'open' && can(ESTIMATES.MANAGE_OPTIONS) && (
                      <span className="ml-auto">{members.filter((m) => !CLOSED.includes(m.lifecycle_state)).map((m) => (
                        <Button key={m.id} variant="ghost" className="ml-1" onClick={() => setDialog({ select: { groupId: group.id, estimate: m } })}>Choose {m.option_label}</Button>
                      ))}</span>
                    )}
                  </div>
                  <ul className="space-y-1.5">{members.map(card)}</ul>
                </div>
              );
            })}
            {ungrouped.length > 0 && <ul className="space-y-1.5">{ungrouped.map(card)}</ul>}
          </div>
        )}
        {closedCount > 0 && (
          <button type="button" className="mt-2 text-xs font-semibold text-primary" onClick={() => setShowClosed(!showClosed)}>
            {showClosed ? 'Hide' : 'Show'} {closedCount} superseded, cancelled or expired
          </button>
        )}
      </Section>

      <BookingPanel workspace={workspace} onBooked={() => invalidate()} />
      <ChangeOrdersPanel workspace={workspace} customerEmail={customerEmail || recipients[0]?.value} />
      <FinalRatingPanel workspace={workspace} />

      {dialog === 'create' && <CreateEstimateDialog opportunityId={opportunityId} workspace={workspace} onClose={() => setDialog(null)} onCreated={(created) => { setDialog(null); invalidate(); setOpenId(created.id); }} />}
      {dialog === 'group' && <ProposalGroupDialog opportunityId={opportunityId} estimates={workspace.estimates} onClose={() => setDialog(null)} onDone={() => { setDialog(null); invalidate(); }} />}
      {dialog?.select && (
        <ConfirmDialog title={`Choose ${dialog.select.estimate.option_label}?`} confirmLabel="Choose this option" tone="primary"
          busy={select.busy} error={select.error?.message} onCancel={() => setDialog(null)}
          onConfirm={() => select.run({ groupId: dialog.select.groupId, estimateId: dialog.select.estimate.id })}>
          <p>The other options in this group are superseded and their customer links stop working. This does not book the move.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}

// [readiness fact, label, policy requirement that makes it mandatory]
const REQUIREMENTS = [
  ['quote_sent', 'Estimate sent', 'quote_sent'], ['estimate_accepted', 'Estimate accepted', 'estimate_acceptance'],
  ['contract_signed', 'Contract signed', 'contract_signature'], ['deposit_satisfied', 'Deposit received', 'deposit'],
  ['move_date_present', 'Move date set', 'move_date'],
];
const OVERRIDABLE = {
  estimate_accepted: ['acceptance', OPPORTUNITY.BOOK_WITHOUT_ACCEPTANCE], contract_signed: ['signature', OPPORTUNITY.BOOK_WITHOUT_SIGNATURE],
  deposit_satisfied: ['deposit', OPPORTUNITY.BOOK_WITHOUT_DEPOSIT],
};

function BookingPanel({ workspace, onBooked }) {
  const { can } = useCan();
  const opportunity = workspace.opportunity;
  const readiness = useBookingReadiness(opportunity.id, opportunity.system_state === 'open' && can(OPPORTUNITY.BOOK));
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const data = readiness.data;
  const required = REQUIREMENTS.filter(([, , policy]) => data?.requirements?.[policy] !== false);
  const missing = data ? required.filter(([key]) => data[key] === false) : [];
  const overrides = missing.map(([key]) => OVERRIDABLE[key]).filter(Boolean).filter(([, permission]) => can(permission)).map(([code]) => code);
  const blocking = missing.filter(([key]) => !OVERRIDABLE[key] || !can(OVERRIDABLE[key][1]));
  const book = useAction(() => estimatesApi.book(opportunity.id, { override_requirements: overrides, override_reason: reason }), {
    success: 'Opportunity booked. The selected Estimate is now locked.', invalidate: onBooked, onSuccess: () => setConfirming(false),
  });
  if (opportunity.system_state !== 'open' || !can(OPPORTUNITY.BOOK)) return null;
  const selected = workspace.estimates.find((e) => e.id === data?.selected_estimate_id);
  return (
    <Section title="Booking" description="Booking is a separate step: it locks the selected Estimate as the commercial agreement.">
      {readiness.isLoading ? <LoadingState /> : data && (
        <div className="space-y-2 text-xs">
          <p>Estimate to book: <span className="font-semibold">{selected ? `${selected.estimate_number} · ${selected.option_label}` : 'none'}</span></p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {required.map(([key, label]) => (
              <li key={key} className={data[key] ? 'text-emerald-700' : 'text-amber-800'}>{data[key] ? '✓' : '•'} {label}{key === 'deposit_satisfied' && Number(data.deposit_required) > 0 ? ` (${formatMoney(data.paid_amount)} of ${formatMoney(data.deposit_required)})` : ''}</li>
            ))}
          </ul>
          <div className="flex justify-end">
            <Button onClick={() => setConfirming(true)} disabled={!selected || blocking.length > 0}>Book Opportunity</Button>
          </div>
          {blocking.length > 0 && <p className="text-right text-amber-800">Not ready: {blocking.map(([, l]) => l).join(', ')}.</p>}
        </div>
      )}
      {confirming && (
        <ConfirmDialog title="Book this Opportunity?" confirmLabel="Book" tone="primary" busy={book.busy} error={book.error?.message}
          onCancel={() => setConfirming(false)} onConfirm={() => book.run()}>
          <p>{selected?.estimate_number} becomes the booked Estimate and is locked. Later changes need a Change Order.</p>
          {overrides.length > 0 && (
            <>
              <p className="text-amber-800">Booking without: {overrides.map(humanize).join(', ')}. This exception is recorded.</p>
              <TextAreaField label="Reason for the exception" value={reason} onChange={setReason} required />
            </>
          )}
        </ConfirmDialog>
      )}
    </Section>
  );
}
