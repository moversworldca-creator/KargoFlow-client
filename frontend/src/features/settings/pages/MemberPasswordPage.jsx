import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getEmployee, setEmployeeTemporaryPassword } from '../../../services/api';

const errorMessage = (err, fallback) => {
  const data = err?.response?.data;
  const detail = data?.detail || data?.password || data?.non_field_errors;
  return (Array.isArray(detail) ? detail.join(' ') : typeof detail === 'string' ? detail : '') || fallback;
};

export default function MemberPasswordPage() {
  const { employeeId } = useParams();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true); setEmployee(null); setCreated(false); setError('');
    setPassword(''); setConfirmation('');
    getEmployee(employeeId).then((data) => { if (active) setEmployee(data); })
      .catch((err) => { if (active) setError(errorMessage(err, 'Unable to load this team member.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [employeeId]);

  const hasLogin = employee?.has_login || employee?.user_id != null;
  const canCreate = employee && !hasLogin && employee.employment_status === 'active' && employee.email;
  const submit = async (event) => {
    event.preventDefault();
    if (!canCreate || saving) return;
    setError('');
    if (password !== confirmation) return setError('Passwords do not match.');
    setSaving(true);
    try {
      await setEmployeeTemporaryPassword(employeeId, password);
      setCreated(true); setPassword(''); setConfirmation(''); setShowPassword(false);
    } catch (err) {
      setError(errorMessage(err, 'Unable to create login. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return <div className="h-full overflow-y-auto p-3 sm:p-6">
    <section className="max-w-lg mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-5">
      <Link to="/settings/team/members" className="text-sm text-primary">← Back to team members</Link>
      <h1 className="text-xl font-bold text-heading">Set temporary password</h1>
      {loading ? <p role="status">Loading member…</p> : <>
        {employee && <div><p className="font-semibold text-heading">{employee.first_name} {employee.last_name}</p><p className="text-sm text-body">{employee.email}</p></div>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {created ? <div role="status" className="space-y-3 text-sm">
          <p>Login created. The member can sign in with {employee.email} and the password you entered.</p>
          <p>Share the password securely and ask them to change it in Profile → Password after signing in.</p>
          <Link to="/settings/team/members" className="inline-block text-primary font-semibold">Return to members to attach a role</Link>
        </div> : canCreate ? <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-body">Create login access for this member. Share the password with them and ask them to change it after signing in.</p>
          <label className="block text-sm text-heading space-y-1">Temporary password
            <input aria-label="Temporary password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required maxLength={128} disabled={saving} className="w-full rounded-lg border border-slate-300 p-2 dark:bg-slate-800" />
          </label>
          <label className="block text-sm text-heading space-y-1">Confirm password
            <input aria-label="Confirm password" type={showPassword ? 'text' : 'password'} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="new-password" required maxLength={128} disabled={saving} className="w-full rounded-lg border border-slate-300 p-2 dark:bg-slate-800" />
          </label>
          <label className="flex gap-2 text-sm text-body"><input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />Show password</label>
          <button disabled={saving} className="w-full rounded-lg bg-primary text-white py-2 font-semibold disabled:opacity-60">{saving ? 'Creating login…' : 'Create login'}</button>
        </form> : employee && <p className="text-sm text-body">{hasLogin ? 'This member already has a login.' : employee.employment_status !== 'active' ? 'Only active members can receive login access.' : 'Edit this member and add an email address first.'}</p>}
      </>}
    </section>
  </div>;
}
