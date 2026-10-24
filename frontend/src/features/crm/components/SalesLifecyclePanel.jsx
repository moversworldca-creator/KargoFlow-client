// On an Opportunity: each estimate's quote lifecycle, each planned job's
// confirmation (recorded during sales planning) and, once booked, the
// operational jobs with their five lifecycles. The backend owns every rule.
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import useCan from '../../../shared/auth/useCan';
import StatusBadge from '../../../shared/status/StatusBadge';
import { JOB_LIFECYCLES } from '../../../shared/status/statusCatalog';
import { asList, errorText, estimateLifecycleApi, jobsApi, plannedJobApi } from '../../operations/operationsApi';

const CONFIRMATION_ACTIONS = {
  not_requested: [['request-confirmation', 'Request confirmation'], ['confirm', 'Confirm']],
  requested: [['confirm', 'Confirm'], ['decline', 'Decline']],
  declined: [['request-confirmation', 'Request again']],
  confirmed: [],
};

export default function SalesLifecyclePanel({ opportunityId, locked = false }) {
  const { can } = useCan();
  const client = useQueryClient();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [accepting, setAccepting] = useState(null);
  const editable = can('opportunities.update') && !locked;
  const canViewJobs = can('jobs.view');
  const key = ['operations', 'opportunity', opportunityId];
  const estimatesQuery = useQuery({ queryKey: [...key, 'estimates'], queryFn: () => estimateLifecycleApi.list(opportunityId), retry: false });
  const plannedQuery = useQuery({ queryKey: [...key, 'planned'], queryFn: () => plannedJobApi.list(opportunityId), retry: false });
  const jobsQuery = useQuery({ queryKey: [...key, 'jobs'], queryFn: () => jobsApi.list({ opportunity_id: opportunityId }), retry: false, enabled: canViewJobs });
  const estimates = asList(estimatesQuery.data);
  const planned = asList(plannedQuery.data);
  const jobs = asList(jobsQuery.data);
  const load = () => client.invalidateQueries({ queryKey: key });

  const run = async (action) => {
    setBusy(true);
    setError('');
    try {
      await action();
      await load();
      return true;
    } catch (err) {
      setError(errorText(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const button = 'rounded-lg px-2 py-1 text-[11px] font-semibold disabled:opacity-50';
  return (
    <section aria-label="Sales and job status" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-bold text-slate-900 dark:text-white">Status</h2>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p>}

      <div>
        <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Estimates</h3>
        {!estimates.length ? <p className="text-xs text-slate-500">No estimates yet.</p> : (
          <ul className="space-y-1.5">
            {estimates.map((est) => (
              <li key={est.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800">
                <span className="font-semibold">{est.estimate_number}</span>
                <StatusBadge field="estimate.lifecycle" state={est.lifecycle_state} />
                {est.approved_by_name && est.lifecycle_state === 'accepted' && <span className="text-slate-500">by {est.approved_by_name}</span>}
                {editable && (
                  <span className="ml-auto flex flex-wrap gap-1">
                    {est.available_transitions.map((move) => (
                      <button key={move.to_state} type="button" disabled={busy} onClick={() => run(() => estimateLifecycleApi.move(est.id, move.to_state))}
                        className={`${button} ${move.to_state === 'cancelled' ? 'border border-rose-200 text-rose-700' : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'}`}>
                        {move.to_state === 'ready' ? 'Mark Ready' : `Mark ${move.label}`}
                      </button>
                    ))}
                    {est.can_record_acceptance && (
                      <button type="button" disabled={busy} onClick={() => setAccepting(est)} className={`${button} border border-slate-300`}>Record acceptance</button>
                    )}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-[11px] text-slate-500">Estimates become Sent when sent to the customer, Viewed when the customer opens the portal and Accepted when the customer accepts there.</p>
      </div>

      <div>
        <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Planned jobs</h3>
        {!planned.length ? <p className="text-xs text-slate-500">No planned jobs.</p> : (
          <ul className="space-y-1.5">
            {planned.map((job) => (
              <li key={job.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800">
                <span className="font-semibold">{job.title || `Job ${job.sequence}`}</span>
                {job.move_date && <span className="text-slate-500">{job.move_date}</span>}
                <StatusBadge field="planned_job.confirmation" state={job.confirmation_state} />
                {editable && (
                  <span className="ml-auto flex gap-1">
                    {(CONFIRMATION_ACTIONS[job.confirmation_state] || []).map(([action, label]) => (
                      <button key={action} type="button" disabled={busy} onClick={() => run(() => plannedJobApi.confirmation(opportunityId, job.id, action))}
                        className={`${button} ${action === 'decline' ? 'border border-rose-200 text-rose-700' : 'border border-slate-300'}`}>{label}</button>
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-[11px] text-slate-500">Booking creates one operational job per planned job that is not declined.</p>
      </div>

      {canViewJobs && (
        <div>
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Operational jobs</h3>
          {!jobs.length ? <p className="text-xs text-slate-500">Created when the opportunity is booked.</p> : (
            <ul className="space-y-1.5">
              {jobs.map((job) => (
                <li key={job.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800">
                  <Link to={`/jobs/${job.id}`} className="font-semibold text-brand-blue hover:underline">{job.title}</Link>
                  {JOB_LIFECYCLES.map(([domain, field, column, title]) => (
                    <span key={domain} className="inline-flex items-center gap-1"><span className="text-slate-500">{title}</span><StatusBadge field={field} state={job[column]} /></span>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {accepting && (
        <AcceptanceDialog estimate={accepting} busy={busy} onCancel={() => setAccepting(null)}
          onSubmit={async (data) => { if (await run(() => estimateLifecycleApi.recordAcceptance(accepting.id, data))) setAccepting(null); }} />
      )}
    </section>
  );
}

function AcceptanceDialog({ estimate, busy, onCancel, onSubmit }) {
  const [form, setForm] = useState({ accepted_by_name: '', accepted_by_email: '', note: '' });
  const field = (key, label, type = 'text') => (
    <label className="block text-xs font-semibold">{label}
      <input type={type} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
        value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </label>
  );
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="accept-title" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900">
        <h3 id="accept-title" className="text-sm font-bold">Record acceptance of {estimate.estimate_number}</h3>
        <p className="text-xs text-slate-500">For acceptance given in person or by phone. Portal acceptance is recorded automatically.</p>
        {field('accepted_by_name', 'Accepted by')}
        {field('accepted_by_email', 'Their email (optional)', 'email')}
        {field('note', 'How it was accepted (optional)')}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold">Cancel</button>
          <button type="button" disabled={busy || !form.accepted_by_name.trim()} onClick={() => onSubmit(form)}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900">Record acceptance</button>
        </div>
      </div>
    </div>
  );
}
