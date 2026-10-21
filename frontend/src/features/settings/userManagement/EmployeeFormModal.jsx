// Create / edit an Employee (the workforce record). A login is a separate
// thing: creating an employee never creates a login.
import React, { useId, useState } from 'react';
import { createEmployee, inviteEmployee, updateEmployee } from '../../../services/api';
import { EDITABLE_EMPLOYMENT_STATUSES, EMPLOYMENT_STATUSES } from './permissions';
import { describeError, fieldErrors } from './errors';
import { Button, Dialog, ErrorBanner, Field, inputClass } from './ui';
import { WORKER_TYPES, employeePayload, validateEmployee } from './logic';

const label = (value) => value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');



export default function EmployeeFormModal({ employee, branches, canInvite, onClose, onSaved }) {
  const isCreate = !employee;
  const ids = { first: useId(), last: useId(), email: useId(), phone: useId(), type: useId(), branch: useId(), hire: useId(), number: useId(), status: useId(), invite: useId() };
  const [form, setForm] = useState(() => ({
    first_name: employee?.first_name || '',
    last_name: employee?.last_name || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    worker_type: employee?.worker_type || 'office',
    primary_branch_id: employee?.primary_branch_id ?? '',
    hire_date: employee?.hire_date || '',
    employee_number: employee?.employee_number || '',
    employment_status: employee?.employment_status || 'active',
    wantsInvite: false,
  }));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const set = (name) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [name]: value }));
    setDirty(true);
  };

  const activeBranches = (branches || []).filter((branch) => branch.is_active !== false
    || String(branch.id) === String(employee?.primary_branch_id));
  const statusEditable = !isCreate && employee.employment_status !== 'terminated';

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    const problems = validateEmployee(form);
    setErrors(problems);
    if (Object.keys(problems).length) return;
    setSaving(true);
    setSubmitError('');
    try {
      const body = employeePayload(form, { isCreate });
      const saved = isCreate ? await createEmployee(body) : await updateEmployee(employee.id, body);
      let notice = isCreate ? 'Employee created. They have no login until you invite them.' : 'Employee updated.';
      if (isCreate && form.wantsInvite && canInvite) {
        try {
          await inviteEmployee(saved.id, { email: body.email });
          notice = `Employee created and a login invitation was sent to ${body.email}.`;
        } catch (inviteError) {
          notice = `Employee created, but the invitation was not sent: ${describeError(inviteError).message}`;
        }
      }
      onSaved(saved, notice);
    } catch (error) {
      setErrors((prev) => ({ ...prev, ...fieldErrors(error) }));
      setSubmitError(describeError(error, 'The employee could not be saved.').message);
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    if (dirty && !saving && typeof window !== 'undefined' && !window.confirm('Discard your changes?')) return;
    onClose();
  };

  return (
    <Dialog
      title={isCreate ? 'Add employee' : `Edit ${[employee.first_name, employee.last_name].filter(Boolean).join(' ') || 'employee'}`}
      description={isCreate ? 'Adds a person to your workforce. Login access is a separate step.' : undefined}
      onClose={close}
      busy={saving}
      size="lg"
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="First name" htmlFor={ids.first} error={errors.first_name}>
            <input id={ids.first} className={inputClass} value={form.first_name} onChange={set('first_name')} maxLength={150} />
          </Field>
          <Field label="Last name" htmlFor={ids.last} error={errors.last_name}>
            <input id={ids.last} className={inputClass} value={form.last_name} onChange={set('last_name')} maxLength={150} />
          </Field>
          <Field label="Email" htmlFor={ids.email} error={errors.email} hint="Used for the login invitation.">
            <input id={ids.email} type="email" className={inputClass} value={form.email} onChange={set('email')} maxLength={254} />
          </Field>
          <Field label="Phone" htmlFor={ids.phone} error={errors.phone}>
            <input id={ids.phone} className={inputClass} value={form.phone} onChange={set('phone')} maxLength={30} />
          </Field>
          <Field label="Worker type" htmlFor={ids.type} error={errors.worker_type}>
            <select id={ids.type} className={inputClass} value={form.worker_type} onChange={set('worker_type')}>
              {WORKER_TYPES.map((value) => <option key={value} value={value}>{label(value)}</option>)}
            </select>
          </Field>
          <Field label="Primary branch" htmlFor={ids.branch} error={errors.primary_branch_id} hint="Only active branches of your company can be chosen.">
            <select id={ids.branch} className={inputClass} value={form.primary_branch_id} onChange={set('primary_branch_id')}>
              <option value="">No primary branch</option>
              {activeBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </Field>
          <Field label="Hire date" htmlFor={ids.hire} error={errors.hire_date}>
            <input id={ids.hire} type="date" className={inputClass} value={form.hire_date || ''} onChange={set('hire_date')} />
          </Field>
          <Field label="Employee number" htmlFor={ids.number} error={errors.employee_number} hint={isCreate ? 'Leave empty to number automatically.' : undefined}>
            <input id={ids.number} className={inputClass} value={form.employee_number} onChange={set('employee_number')} maxLength={80} />
          </Field>
          {statusEditable && (
            <Field label="Employment status" htmlFor={ids.status} error={errors.employment_status} hint="Use Terminate to end employment.">
              <select id={ids.status} className={inputClass} value={form.employment_status} onChange={set('employment_status')}>
                {EDITABLE_EMPLOYMENT_STATUSES.map((value) => <option key={value} value={value}>{EMPLOYMENT_STATUSES[value].label}</option>)}
              </select>
            </Field>
          )}
        </div>

        {isCreate && canInvite && (
          <label htmlFor={ids.invite} className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-700">
            <input id={ids.invite} type="checkbox" checked={form.wantsInvite} onChange={set('wantsInvite')} className="mt-0.5" />
            <span>
              <span className="font-semibold">Also send a login invitation</span>
              <span className="block text-slate-500">Optional. The employee chooses a password from the email; until then they have no login.</span>
            </span>
          </label>
        )}

        <ErrorBanner message={submitError} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={close} disabled={saving}>Cancel</Button>
          <Button type="submit" busy={saving}>{isCreate ? 'Add employee' : 'Save changes'}</Button>
        </div>
      </form>
    </Dialog>
  );
}
