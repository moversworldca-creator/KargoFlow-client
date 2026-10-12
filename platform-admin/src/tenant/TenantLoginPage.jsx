import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Building2, Loader2, LockKeyhole, Mail } from 'lucide-react';
import { useTenantAuth } from '../auth/TenantAuthContext';

function InvitationAcceptance() {
  const { acceptInvitation } = useTenantAuth();
  const navigate = useNavigate();
  const [token, setToken] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await acceptInvitation(token.trim(), password); setDone(true); window.history.replaceState(null, '', window.location.pathname); }
    catch (err) { setError(err?.response?.data?.detail || err?.response?.data?.error || err.message || 'Invitation could not be accepted.'); }
    finally { setBusy(false); }
  };
  return <main className="min-h-screen bg-[#f5f7f6] text-slate-900 flex items-center justify-center px-4 py-10"><section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-7 shadow-sm"><h1 className="text-xl font-semibold">Accept your invitation</h1><p className="mt-1 text-sm text-slate-500">Set a password to activate your company login.</p>{done ? <div className="mt-5"><p role="status" className="text-sm text-emerald-800">Invitation accepted. Sign in with your invited email and new password.</p><button onClick={() => navigate('/tenant/login', { replace: true })} className="mt-4 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Go to sign in</button></div> : <form onSubmit={submit} className="mt-5 space-y-4">{error && <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}<label className="block text-sm font-medium">Invitation token<input required value={token} onChange={(event) => setToken(event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm" /></label><label className="block text-sm font-medium">New password<input required minLength={8} autoComplete="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm" /></label><button disabled={busy} className="w-full rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Accepting invitation...' : 'Set password'}</button></form>}</section></main>;
}

export default function TenantLoginPage() {
  const { login, isAuthenticated } = useTenantAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (window.location.pathname.endsWith('/accept-invitation')) return <InvitationAcceptance />;
  if (isAuthenticated) return <Navigate to="/tenant" replace />;
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await login(email.trim(), password); navigate(location.state?.from?.pathname || '/tenant', { replace: true }); }
    catch (err) { setError(err?.response?.data?.error || err?.response?.data?.detail || err.message || 'Sign in failed. Check your credentials.'); }
    finally { setBusy(false); }
  };
  return (
    <main className="min-h-screen bg-[#f5f7f6] text-slate-900 flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-lg bg-emerald-700 text-white"><Building2 size={22} /></span><div><p className="text-lg font-bold">KargoFlow</p><p className="text-sm text-slate-500">Company administration</p></div></div>
        <div className="rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
          <h1 className="text-xl font-semibold">Sign in to your workspace</h1>
          <p className="mt-1 text-sm text-slate-500">Use your company account credentials.</p>
          {error && <div role="alert" className="mt-5 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div>}
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium">Email<div className="relative mt-1.5"><Mail size={16} className="absolute left-3 top-3 text-slate-400" /><input autoComplete="username" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" /></div></label>
            <label className="block text-sm font-medium">Password<div className="relative mt-1.5"><LockKeyhole size={16} className="absolute left-3 top-3 text-slate-400" /><input autoComplete="current-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" /></div></label>
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{busy && <Loader2 size={16} className="animate-spin" />}Sign in</button>
          </form>
        </div>
      </section>
    </main>
  );
}
