// Pricing approvals (discounts, overrides, constraints, margin) bound to the
// exact Calculation Run they were requested for. A recalculation invalidates
// them; approving here never changes the price itself.
import React, { useState } from 'react';
import useCan from '../../../shared/auth/useCan';
import { pricingApi } from '../api';
import { formatDateTime, humanize } from '../format';
import { PRICING } from '../permissions';
import { useApprovals, useInvalidatePricing, useRun } from '../queries';
import RunViewer from './RunViewer';
import { Badge, Button, Dialog, ErrorBanner, QueryState, Section, SelectField, TextAreaField, useAction } from './ui';

export function ApprovalList({ estimateId, compact = false }) {
  const { can } = useCan();
  const [state, setState] = useState('pending');
  const params = { state: state || undefined, estimate_id: estimateId || undefined };
  const approvals = useApprovals(params, can(PRICING.VIEW));
  const invalidate = useInvalidatePricing();
  const [deciding, setDeciding] = useState(null);
  const rows = approvals.data || [];
  return (
    <div className="space-y-2">
      {!compact && (
        <div className="max-w-[200px]">
          <SelectField label="Show" value={state} onChange={setState} options={[['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['invalidated', 'Invalidated'], ['', 'All']]} />
        </div>
      )}
      <QueryState query={approvals} empty={!rows.length} emptyText={state === 'pending' ? 'No pricing approvals waiting.' : 'Nothing to show.'}>
        <ul className="space-y-1.5">
          {rows.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs">
              <Badge tone={{ pending: 'amber', approved: 'green', rejected: 'red' }[a.state] || 'slate'}>{humanize(a.state)}</Badge>
              <span className="font-semibold">{humanize(a.approval_type)}</span>
              <span className="flex-1 text-slate-600">{a.reason || '—'} · Estimate #{a.estimate_id} · run #{a.calculation_run_id} · {formatDateTime(a.requested_at)}</span>
              {a.state === 'pending' && can(PRICING.APPROVE_ADJUSTMENT) && <Button variant="ghost" onClick={() => setDeciding(a)}>Review</Button>}
            </li>
          ))}
        </ul>
      </QueryState>
      {deciding && <DecisionDialog approval={deciding} onClose={() => setDeciding(null)} onDone={() => { setDeciding(null); invalidate(['pricing', 'approvals']); }} />}
    </div>
  );
}

function DecisionDialog({ approval, onClose, onDone }) {
  const [comment, setComment] = useState('');
  const run = useRun(approval.calculation_run_id);
  const decide = useAction((approve) => pricingApi.decideApproval(approval.id, approve, comment), {
    success: (_, approve) => (approve ? 'Approved.' : 'Rejected.'), onSuccess: onDone, silent: true,
  });
  return (
    <Dialog title={`${humanize(approval.approval_type)} approval`} description="You are approving this exact calculation. Any recalculation needs a new approval." onClose={onClose} size="lg" busy={decide.busy}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={() => decide.run(false)} busy={decide.busy} disabled={!comment.trim()}>Reject</Button>
          <Button onClick={() => decide.run(true)} busy={decide.busy}>Approve</Button>
        </>
      )}>
      <div className="space-y-3">
        <p className="text-xs">{approval.reason}</p>
        {run.data && <RunViewer run={run.data} compact />}
        <TextAreaField label="Comment (required to reject)" value={comment} onChange={setComment} />
      </div>
      <ErrorBanner message={decide.error?.message} />
    </Dialog>
  );
}

export default function ApprovalsQueue() {
  return (
    <Section title="Pricing approvals" description="Discounts, overrides, constraints and low-margin prices waiting for a decision.">
      <ApprovalList />
    </Section>
  );
}
