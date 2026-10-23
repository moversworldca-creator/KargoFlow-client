// Employment lifecycle commands. Termination and rehire are backend commands,
// never a status edit (the backend refuses a PATCH into or out of "terminated").
import React, { useId, useState } from 'react';
import { rehireEmployee, terminateEmployee } from '../../../services/api';
import { describeError } from './errors';
import { Button, Dialog, ErrorBanner, Field, inputClass } from './ui';

const today = () => new Date().toISOString().slice(0, 10);
const hasLogin = (employee) => employee?.has_login ?? employee?.user_id != null;
const fullName = (employee) => [employee?.first_name, employee?.last_name].filter(Boolean).join(' ') || employee?.email || 'this employee';

export function TerminateEmployeeModal({ employee, onClose, onDone }) {
  const ids = { date: useId(), reason: useId(), rehire: useId() };
  const [form, setForm] = useState({ termination_date: today(), reason: '', rehire_eligible: true });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    const problems = {};
    if (!form.termination_date) problems.termination_date = 'A termination date is required.';
    if (!form.reason.trim()) problems.reason = 'A reason is required.';
    setErrors(problems);
    if (Object.keys(problems).length) return;
    setBusy(true);
    setSubmitError('');
    try {
      const updated = await terminateEmployee(employee.id, {
        termination_date: form.termination_date, reason: form.reason.trim(), rehire_eligible: form.rehire_eligible,
      });
      onDone(updated, `${fullName(employee)} was terminated.`);
    } catch (error) {
      setSubmitError(describeError(error, 'The employee could not be terminated.').message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title={`Terminate ${fullName(employee)}`} onClose={onClose} busy={busy}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div role="note" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-semibold">What termination does</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>Employment ends on the date below. The employee record and its history are kept, not deleted.</li>
            <li>{hasLogin(employee) ? 'Their login stops working and active sessions end.' : 'They have no login, so no access changes.'}</li>
            <li>Roles and branch access stay on record but grant nothing while terminated.</li>
          </ul>
          <p className="mt-1">To remove only login access without ending employment, use Disable login instead.</p>
        </div>
        <Field label="Termination date" htmlFor={ids.date} error={errors.termination_date} required>
          <input id={ids.date} type="date" className={inputClass} value={form.termination_date}
            onChange={(e) => setForm((p) => ({ ...p, termination_date: e.target.value }))} required />
        </Field>
        <Field label="Reason" htmlFor={ids.reason} error={errors.reason} required hint="Recorded on the employee history.">
          <textarea id={ids.reason} rows={3} className={inputClass} value={form.reason} maxLength={2000}
            onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} required />
        </Field>
        <label htmlFor={ids.rehire} className="flex items-center gap-2 text-xs">
          <input id={ids.rehire} type="checkbox" checked={form.rehire_eligible}
            onChange={(e) => setForm((p) => ({ ...p, rehire_eligible: e.target.checked }))} />
          Eligible for rehire
        </label>
        <ErrorBanner message={submitError} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="danger" busy={busy}>Terminate employment</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function RehireEmployeeModal({ employee, branches, onClose, onDone }) {
  const branchId = useId();
  const [primaryBranch, setPrimaryBranch] = useState(employee.primary_branch_id ?? '');
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setSubmitError('');
    try {
      const updated = await rehireEmployee(employee.id, { primary_branch_id: primaryBranch ? Number(primaryBranch) : null });
      onDone(updated, `${fullName(employee)} was rehired.`);
    } catch (error) {
      setSubmitError(describeError(error, 'The employee could not be rehired.').message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title={`Rehire ${fullName(employee)}`} onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Employment becomes active again.{hasLogin(employee) ? ' Their existing login is re-enabled; sensitive capabilities such as payment collection are not restored automatically.' : ''}
        </p>
        <Field label="Primary branch" htmlFor={branchId} hint="Optional. Leave unchanged to keep the previous branch.">
          <select id={branchId} className={inputClass} value={primaryBranch} onChange={(e) => setPrimaryBranch(e.target.value)}>
            <option value="">Keep previous</option>
            {(branches || []).filter((b) => b.is_active !== false).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <ErrorBanner message={submitError} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" busy={busy}>Rehire</Button>
        </div>
      </form>
    </Dialog>
  );
}
