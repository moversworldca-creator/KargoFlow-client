// An operational job's five lifecycles: office booking, customer confirmation,
// dispatch, execution and accounting. Only the moves the backend's rules allow
// from the current state are offered, each behind its own permission; the
// backend still checks the booking policy (e.g. confirmation before dispatch).
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useCan from '../../../shared/auth/useCan';
import StatusBadge from '../../../shared/status/StatusBadge';
import { JOB_LIFECYCLES } from '../../../shared/status/statusCatalog';
import { errorText, jobsApi } from '../operationsApi';

const PERMISSION = {
  booking: 'jobs.manage_booking', customer_confirmation: 'jobs.record_customer_confirmation',
  dispatch: 'jobs.dispatch', execution: 'jobs.execute', accounting: 'jobs.close',
};
const ROUTE = { booking: 'booking', customer_confirmation: 'customer-confirmation', dispatch: 'dispatch', execution: 'execution' };
const TIMESTAMPS = {
  booking: [['booking_confirmed_at', 'Confirmed']],
  customer_confirmation: [['customer_confirmation_requested_at', 'Requested'], ['customer_confirmed_at', 'Confirmed']],
  dispatch: [['dispatch_held_at', 'Held'], ['dispatch_scheduled_at', 'Scheduled'], ['dispatch_published_at', 'Published']],
  execution: [['en_route_at', 'En route'], ['arrived_at', 'Arrived'], ['started_at', 'Started'], ['completed_at', 'Completed']],
  accounting: [['closed_at', 'Closed']],
};
const when = (value) => (value ? new Date(value).toLocaleString() : null);

export default function JobLifecyclePanel({ jobId, onChanged }) {
  const { can } = useCan();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['operations', 'job', jobId], queryFn: () => jobsApi.get(jobId), retry: false, staleTime: 0 });
  const job = query.data;
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const run = async (action) => {
    setBusy(true);
    setError('');
    try {
      const updated = await action();
      client.setQueryData(['operations', 'job', jobId], updated);
      onChanged?.(updated);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (!job) {
    return query.isError
      ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{errorText(query.error, 'This job could not be loaded.')}</p>
      : <p className="p-4 text-sm text-slate-500">Loading job status…</p>;
  }

  return (
    <section aria-label="Job lifecycle" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Job status</h2>
        <p className="text-xs text-slate-500">{job.opportunity_number} · {job.title}{job.move_date ? ` · ${job.move_date}` : ''}</p>
      </header>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {JOB_LIFECYCLES.map(([domain, field, column, title]) => {
          const moves = job.available_transitions?.[domain] || [];
          const allowed = can(PERMISSION[domain]);
          return (
            <div key={domain} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">{title}</span>
                <StatusBadge field={field} state={job[column]} />
              </div>
              <dl className="space-y-0.5 text-[11px] text-slate-500">
                {TIMESTAMPS[domain].filter(([key]) => job[key]).map(([key, label]) => (
                  <div key={key} className="flex justify-between gap-2"><dt>{label}</dt><dd>{when(job[key])}</dd></div>
                ))}
              </dl>
              {allowed && (
                <div className="mt-auto flex flex-wrap gap-1">
                  {moves.map((move) => (
                    <button key={move.to_state} type="button" disabled={busy}
                      onClick={() => run(() => (domain === 'accounting' ? jobsApi.close(job.id) : jobsApi.move(job.id, ROUTE[domain], move.to_state)))}
                      className={`rounded-lg px-2 py-1 text-[11px] font-semibold disabled:opacity-50 ${['cancelled', 'declined'].includes(move.to_state)
                        ? 'border border-rose-200 text-rose-700 hover:bg-rose-50' : 'bg-slate-900 text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900'}`}>
                      {domain === 'accounting' ? 'Close' : move.label}
                    </button>
                  ))}
                  {domain === 'accounting' && job.can_finalize && (
                    <button type="button" disabled={busy} onClick={() => setFinalizing(true)}
                      className="rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-white dark:text-slate-900">
                      Finalize job
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {finalizing && (
        <FinalizeDialog busy={busy} onCancel={() => setFinalizing(false)}
          onSubmit={(data) => run(async () => { const updated = await jobsApi.finalize(job.id, data); setFinalizing(false); return updated; })} />
      )}
    </section>
  );
}

function FinalizeDialog({ busy, onCancel, onSubmit }) {
  const [form, setForm] = useState({ signature_complete: false, inventory_complete: false, payment_complete: false,
    payment_disposition: 'paid_in_full', outstanding_balance: '0' });
  const toggle = (key) => setForm({ ...form, [key]: !form[key] });
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="finalize-title" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900">
        <h3 id="finalize-title" className="text-sm font-bold">Finalize job</h3>
        <p className="text-xs text-slate-500">Confirm the job’s completion evidence. Accounting then moves to Pending Close.</p>
        {[['signature_complete', 'Customer signature collected'], ['inventory_complete', 'Inventory checked'], ['payment_complete', 'Payment handled']].map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form[key]} onChange={() => toggle(key)} />{label}</label>
        ))}
        <label className="block text-xs font-semibold">Balance handling
          <select className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900" value={form.payment_disposition}
            onChange={(e) => setForm({ ...form, payment_disposition: e.target.value })}>
            <option value="paid_in_full">Paid in full</option><option value="carry_balance">Carry balance</option>
            <option value="authorized_ar">Authorized accounts receivable</option><option value="invoice_later">Invoice later</option>
            <option value="not_required">Not required</option>
          </select>
        </label>
        <label className="block text-xs font-semibold">Outstanding balance
          <input inputMode="decimal" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            value={form.outstanding_balance} onChange={(e) => /^\d{0,9}(\.\d{0,2})?$/.test(e.target.value) && setForm({ ...form, outstanding_balance: e.target.value })} />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold">Cancel</button>
          <button type="button" disabled={busy} onClick={() => onSubmit(form)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900">Finalize</button>
        </div>
      </div>
    </div>
  );
}
