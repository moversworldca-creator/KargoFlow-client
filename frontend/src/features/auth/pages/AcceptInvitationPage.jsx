import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { acceptEmployeeInvitation } from '../../../services/api';
import logo from '../../../assets/full_logo.png';

export default function AcceptInvitationPage() {
  const location = useLocation();
  const [token, setToken] = useState(() => new URLSearchParams(location.hash.slice(1)).get('token') || '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setError('');
    if (!token.trim()) return setError('Enter the invitation code from your email.');
    if (password !== confirmation) return setError('Passwords do not match.');
    setSaving(true);
    try {
      const result = await acceptEmployeeInvitation({ token: token.trim(), password });
      setEmail(result.email);
      setPassword('');
      setConfirmation('');
      setToken('');
      window.history.replaceState(null, '', location.pathname);
    } catch (err) {
      const data = err?.response?.data;
      const detail = data?.detail || data?.password || data?.token || data?.non_field_errors;
      setError((Array.isArray(detail) ? detail.join(' ') : typeof detail === 'string' ? detail : '') ||
        'Unable to accept invitation. It may have expired or already been used. Ask your administrator for a new invitation.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-7 shadow-lg space-y-5">
        <img src={logo} alt="KargoFlow" className="h-8 mx-auto" />
        <h1 className="text-2xl font-bold text-slate-900">Set up your login</h1>
        {email ? <div role="status" className="space-y-4">
          <p>Your login for {email} is ready. Sign in with your new password. Your administrator can assign your role and access.</p>
          <Link to="/login" className="text-primary font-semibold">Go to sign in</Link>
        </div> : <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-slate-600">Choose a password to accept your team invitation.</p>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <label className="block text-sm space-y-1">Invitation code
            <input aria-label="Invitation code" className={inputClass} value={token} onChange={(e) => setToken(e.target.value)} required autoComplete="off" disabled={saving} />
          </label>
          <label className="block text-sm space-y-1">New password
            <input aria-label="New password" className={inputClass} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={saving} />
          </label>
          <label className="block text-sm space-y-1">Confirm password
            <input aria-label="Confirm password" className={inputClass} type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required disabled={saving} />
          </label>
          <button disabled={saving} className="w-full rounded-lg bg-primary text-white py-2 font-semibold disabled:opacity-60">{saving ? 'Creating login…' : 'Create login'}</button>
          <Link to="/login" className="block text-center text-sm text-primary">Back to sign in</Link>
        </form>}
      </section>
    </main>
  );
}
