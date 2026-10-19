// Final Rating: the booked Estimate + accepted Change Orders + permitted
// actuals (hours, weight ...) priced on the booked Tariff revisions, capped by
// the accepted commitments (e.g. Not-to-Exceed). The booked Estimate is
// never rewritten; each Final Rating is its own stored Calculation Run.
import React, { useState } from 'react';
import { Calculator } from 'lucide-react';
import useCan from '../../../shared/auth/useCan';
import { newIdempotencyKey, pricingApi } from '../../pricing/api';
import { formatMoney } from '../../pricing/format';
import { OPPORTUNITY } from '../../pricing/permissions';
import JobInputsForm, { EMPTY_JOB_INPUTS, cleanJobInputs, jobInputsToForm } from '../../pricing/components/JobInputsForm';
import RunViewer from '../../pricing/components/RunViewer';
import { Button, ErrorBanner, KeyValue, Money, Section, useAction } from '../../pricing/components/ui';
import { useEstimate } from '../queries';

export default function FinalRatingPanel({ workspace }) {
  const { can } = useCan();
  const opportunity = workspace.opportunity;
  const booked = useEstimate(opportunity.booked_estimate_id);
  const [inputs, setInputs] = useState(null);
  const [result, setResult] = useState(null);
  const scope = booked.data?.scope_jobs || [];
  const base = booked.data?.pricing_inputs?.jobs || {};
  const current = inputs || Object.fromEntries(scope.map((j) => [j.job_id, jobInputsToForm(base[j.job_id] || EMPTY_JOB_INPUTS)]));
  const rate = useAction(() => pricingApi.finalRating(opportunity.id, {
    jobs: scope.map((j) => ({ job_id: j.job_id, inputs: cleanJobInputs(current[j.job_id]) })),
  }, newIdempotencyKey()), { success: 'Final Rating calculated.', onSuccess: setResult, silent: true });
  if (!opportunity.is_booked || !can(OPPORTUNITY.UPDATE)) return null;
  const jobsById = Object.fromEntries(scope.map((j) => [j.job_id, j.title]));
  return (
    <Section title="Final Rating" description="Price the job with the actuals. Accepted constraints (e.g. Not-to-Exceed) and accepted Change Orders apply; the booked Estimate is not changed.">
      <div className="space-y-3">
        {scope.map((job) => (
          <fieldset key={job.job_id} className="rounded-xl border border-slate-200 p-3">
            <legend className="px-1 text-xs font-bold">{job.title}: actuals</legend>
            <JobInputsForm value={current[job.job_id]} onChange={(v) => setInputs({ ...current, [job.job_id]: v })} showValuation={false} />
          </fieldset>
        ))}
        <div className="flex justify-end"><Button onClick={() => rate.run()} busy={rate.busy} disabled={!scope.length}><Calculator size={13} aria-hidden="true" /> Calculate Final Rating</Button></div>
        <ErrorBanner message={rate.error && `${rate.error.message}${rate.error.detail ? ` (${rate.error.detail})` : ''}`} />
        {result && (
          <div className="space-y-3 rounded-xl border border-slate-200 p-3">
            <KeyValue items={[
              ['Booked Estimate', formatMoney(result.decision.booked_estimate_total, result.run.currency)],
              ['Accepted Change Orders', formatMoney(result.decision.accepted_change_orders_total, result.run.currency)],
              ['Calculated from actuals', formatMoney(result.decision.calculated_before_constraints, result.run.currency)],
              ['Final amount', <Money key="f" value={result.decision.final_commercial_amount} currency={result.run.currency} strong />],
            ]} />
            <RunViewer run={result.run} jobsById={jobsById} />
          </div>
        )}
      </div>
    </Section>
  );
}
