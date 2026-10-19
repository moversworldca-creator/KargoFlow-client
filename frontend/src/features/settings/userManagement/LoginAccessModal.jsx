// "Give login access" for an employee without a login. Two ways, both backend
// commands that need users.manage:
//   - email invitation: the employee sets their own password from a link
//   - temporary password: the administrator sets one now and shares it
import React, { useId, useState } from 'react';
import { Check, Copy, Eye, EyeOff, KeyRound, Mail, RefreshCw, X } from 'lucide-react';
import { inviteEmployee, revokeEmployeeInvitation, setEmployeeTemporaryPassword } from '../../../services/api';
import { describeError } from './errors';
import { passwordChecks, generatePassword } from './logic';
import { Badge, Button, Dialog, ErrorBanner, Field, inputClass } from './ui';

const name = (e) => [e?.first_name, e?.last_name].filter(Boolean).join(' ') || e?.email || 'this employee';
const fmt = (value) => (value ? new Date(value).toLocaleString() : '');

function OptionCard({ selected, onSelect, icon: Icon, title, text, badge }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onSelect}
      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700'}`}>
      <span className={`rounded-lg p-2 ${selected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}><Icon size={16} aria-hidden="true" /></span>
      <span className="flex-1">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">{title}{badge}</span>
        <span className="mt-0.5 block text-xs text-slate-600 dark:text-slate-300">{text}</span>
      </span>
    </button>
  );
}

export default function LoginAccessModal({ employee, invitation, onClose, onChanged }) {
  const ids = { email: useId(), pw: useId(), confirm: useId() };
  const expired = invitation && invitation.expires_at && new Date(invitation.expires_at) <= new Date();
  const [method, setMethod] = useState('invite');
  const [email, setEmail] = useState(invitation?.email || employee.email || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(null); // { kind, text }

  const checks = passwordChecks(password, confirm, employee);
  const passwordOk = checks.every((c) => c.ok);

  const run = async (kind, action, text) => {
    setBusy(kind);
    setError('');
    try {
      await action();
      setDone({ kind, text });
      await onChanged?.();
    } catch (err) {
      setError(describeError(err).message);
    } finally {
      setBusy('');
    }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(password); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard unavailable */ }
  };

  if (done) {
    return (
      <Dialog title="Login access" onClose={onClose} size="md"
        footer={<Button onClick={onClose}>Done</Button>}>
        <div role="status" className="space-y-3 text-sm">
          <p className="flex items-center gap-2 font-semibold text-emerald-800"><Check size={16} aria-hidden="true" />{done.text}</p>
          {done.kind === 'password' && (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p>Share the temporary password with {name(employee)} in person or through a secure channel. It is not shown again after you close this window.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-white px-2 py-1 font-mono text-sm">{show ? password : '•'.repeat(password.length)}</code>
                <Button variant="ghost" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={14} /> : <Eye size={14} />}</Button>
                <Button variant="ghost" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy'}</Button>
              </div>
              <p>Sign-in email: <strong>{employee.email}</strong>. Ask them to change the password after signing in.</p>
            </div>
          )}
          {done.kind === 'invite' && <p className="text-xs text-slate-600">They get an email with a link to choose their password. The link expires after a few days; you can resend it from Invitations.</p>}
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog title={`Give login access: ${name(employee)}`} description="An employee can work without a login. Choose how they get one." onClose={onClose} size="lg" busy={Boolean(busy)}>
      <div className="space-y-4">
        <div role="radiogroup" aria-label="How to give login access" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <OptionCard selected={method === 'invite'} onSelect={() => setMethod('invite')} icon={Mail} title="Email invitation"
            badge={<Badge tone="green">Recommended</Badge>} text="They receive a link and choose their own password." />
          <OptionCard selected={method === 'password'} onSelect={() => setMethod('password')} icon={KeyRound} title="Temporary password"
            text="You set a password now and share it with them. Useful when they cannot get email." />
        </div>

        {method === 'invite' ? (
          <div className="space-y-3">
            {invitation && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
                <span>
                  {expired ? <Badge tone="amber">Expired</Badge> : <Badge tone="blue">Pending</Badge>}{' '}
                  Invitation sent to <strong>{invitation.email}</strong> on {fmt(invitation.created_at)}
                  {invitation.expires_at && <> · {expired ? 'expired' : 'expires'} {fmt(invitation.expires_at)}</>}
                </span>
                <Button variant="ghost" busy={busy === 'revoke'} disabled={Boolean(busy)}
                  onClick={() => run('revoke', () => revokeEmployeeInvitation(invitation.id), 'Invitation revoked.')}>
                  <X size={14} aria-hidden="true" />Revoke
                </Button>
              </div>
            )}
            <Field label="Send the invitation to" htmlFor={ids.email} required hint="Defaults to the employee's email.">
              <input id={ids.email} type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <ErrorBanner message={error} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose} disabled={Boolean(busy)}>Cancel</Button>
              <Button busy={busy === 'invite'} disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || Boolean(busy)}
                onClick={() => run('invite', () => inviteEmployee(employee.id, { email: email.trim() }), `Invitation sent to ${email.trim()}.`)}>
                <Mail size={14} aria-hidden="true" />{invitation ? 'Send a new invitation' : 'Send invitation'}
              </Button>
            </div>
            {invitation && <p className="text-[11px] text-slate-500">Sending a new invitation cancels the previous link.</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {!employee.email ? (
              <ErrorBanner message="This employee has no email address. Edit the employee and add one first: it becomes their sign-in email." />
            ) : (
              <>
                <p className="text-xs text-slate-600 dark:text-slate-300">Sign-in email: <strong>{employee.email}</strong></p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Temporary password" htmlFor={ids.pw} required>
                    <div className="flex gap-1">
                      <input id={ids.pw} type={show ? 'text' : 'password'} autoComplete="new-password" className={inputClass} value={password}
                        onChange={(e) => setPassword(e.target.value)} />
                      <Button variant="ghost" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={14} /> : <Eye size={14} />}</Button>
                    </div>
                  </Field>
                  <Field label="Confirm password" htmlFor={ids.confirm} required>
                    <input id={ids.confirm} type={show ? 'text' : 'password'} autoComplete="new-password" className={inputClass} value={confirm}
                      onChange={(e) => setConfirm(e.target.value)} />
                  </Field>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="ghost" onClick={() => { const p = generatePassword(); setPassword(p); setConfirm(p); setShow(true); }}>
                    <RefreshCw size={14} aria-hidden="true" />Generate a strong password
                  </Button>
                  {password && <Button variant="ghost" onClick={copy}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy'}</Button>}
                </div>
                <ul aria-label="Password requirements" className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                  {checks.map((c) => (
                    <li key={c.label} className={`flex items-center gap-1.5 ${c.ok ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {c.ok ? <Check size={12} aria-hidden="true" /> : <X size={12} aria-hidden="true" />}
                      <span>{c.label}</span><span className="sr-only">{c.ok ? '(met)' : '(not met)'}</span>
                    </li>
                  ))}
                </ul>
                <ErrorBanner message={error} />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={onClose} disabled={Boolean(busy)}>Cancel</Button>
                  <Button busy={busy === 'password'} disabled={!passwordOk || Boolean(busy)}
                    onClick={() => run('password', () => setEmployeeTemporaryPassword(employee.id, password), `Login created for ${employee.email}.`)}>
                    <KeyRound size={14} aria-hidden="true" />Create login
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
