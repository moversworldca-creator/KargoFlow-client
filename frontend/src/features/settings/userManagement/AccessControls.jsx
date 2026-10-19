// Direct user overrides (ALLOW / DENY) and the backend's authorization
// explanation. Nothing here decides access: the backend evaluates every
// request; these screens show its configuration and its answers.
import React, { useId, useMemo, useState } from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { createUserOverride, explainAccess, revokeUserOverride } from '../../../services/api';
import { SCOPE_LABELS, sortScopes } from './permissions';
import { SCOPE_HELP, describePermission, groupCatalog, overrideSummary } from './permissionLabels';
import { describeError, fieldErrors } from './errors';
import { validateOverride } from './logic';
import { Badge, Button, ConfirmDialog, Dialog, EmptyState, ErrorBanner, Field, inputClass } from './ui';

const userLabel = (user) => [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || `User ${user?.id}`;
const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '');

/** Permission picker: readable names grouped by area and page, searchable. */
function PermissionSelect({ id, catalog, value, onChange, error }) {
  const [query, setQuery] = useState('');
  const groups = useMemo(() => groupCatalog(catalog || [], query), [catalog, query]);
  const selected = value ? describePermission(value) : null;
  return (
    <div className="space-y-1.5">
      <input aria-label="Search permissions" placeholder="Search, e.g. “leads view” or “book”…" className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} />
      <select id={id} className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(error) || undefined}>
        <option value="">Choose what this applies to…</option>
        {groups.map(({ area, pages }) => pages.map(({ page, perms }) => (
          <optgroup key={`${area}-${page}`} label={`${area} · ${page}`}>
            {perms.map((perm) => <option key={perm.permission_key} value={perm.permission_key}>{perm.meta.action}</option>)}
          </optgroup>
        )))}
      </select>
      {selected && (
        <p className="text-[11px] text-slate-500">
          <span className="font-semibold text-slate-700 dark:text-slate-200">{selected.label}</span>
          {' · '}<code className="font-mono">{value}</code>
        </p>
      )}
    </div>
  );
}

const EXPIRY_PRESETS = [['', 'No expiry'], ['1', '1 day'], ['7', '7 days'], ['30', '30 days'], ['custom', 'Pick a date']];
const toLocalInput = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};


export function OverrideFormModal({ catalog, users, branches, fixedUser, currentUserId, onClose, onSaved, initial }) {
  const ids = { user: useId(), perm: useId(), branch: useId(), reason: useId(), expires: useId() };
  const [form, setForm] = useState(() => {
    const start = { user_id: fixedUser?.id ?? '', permission_key: '', effect: 'deny', scope: '', branch_id: '', reason: '', expires_at: '', ...initial };
    if (start.permission_key && !start.scope) {
      const perm = (catalog || []).find((p) => p.permission_key === start.permission_key);
      const allowed = sortScopes(perm?.allowed_scopes?.length ? perm.allowed_scopes : ['company']);
      start.scope = allowed.includes('company') ? 'company' : allowed[0] || '';
    }
    return start;
  });
  const [expiryPreset, setExpiryPreset] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);

  const permission = (catalog || []).find((p) => p.permission_key === form.permission_key);
  const scopes = sortScopes(permission?.allowed_scopes?.length ? permission.allowed_scopes : ['company']);
  const selectableUsers = (users || []).filter((u) => String(u.id) !== String(currentUserId));
  const person = fixedUser ? userLabel(fixedUser) : userLabel(selectableUsers.find((u) => String(u.id) === String(form.user_id)));
  const branchName = (branches || []).find((b) => String(b.id) === String(form.branch_id))?.name;

  const update = (patch) => setForm((prev) => {
    const next = { ...prev, ...patch };
    if ('permission_key' in patch) {
      const perm = (catalog || []).find((p) => p.permission_key === patch.permission_key);
      const allowed = sortScopes(perm?.allowed_scopes?.length ? perm.allowed_scopes : ['company']);
      if (!allowed.includes(next.scope)) next.scope = allowed.includes('company') ? 'company' : allowed[0] || '';
    }
    if (next.scope !== 'branch') next.branch_id = '';
    return next;
  });

  const choosePreset = (preset) => {
    setExpiryPreset(preset);
    if (preset === '' ) update({ expires_at: '' });
    else if (preset !== 'custom') update({ expires_at: toLocalInput(new Date(Date.now() + Number(preset) * 86400000)) });
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    const problems = validateOverride(form);
    setErrors(problems);
    if (Object.keys(problems).length) return;
    setBusy(true);
    setSubmitError('');
    try {
      const body = {
        user_id: Number(form.user_id), permission_key: form.permission_key, effect: form.effect, scope: form.scope,
        branch_id: form.scope === 'branch' ? Number(form.branch_id) : null, reason: form.reason.trim(),
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      };
      const saved = await createUserOverride(body);
      onSaved(saved, `${form.effect === 'deny' ? 'Block' : 'Extra access'} saved: ${describePermission(form.permission_key).label}.`);
    } catch (error) {
      setErrors((prev) => ({ ...prev, ...fieldErrors(error) }));
      setSubmitError(describeError(error, 'The override could not be saved.').message);
    } finally {
      setBusy(false);
    }
  };

  const isDeny = form.effect === 'deny';
  const summary = overrideSummary({ person, effect: form.effect, permissionKey: form.permission_key, scope: form.scope, branchName, expiresAt: form.expires_at });
  return (
    <Dialog title="Add a personal exception" description="Give or take away one permission for one person, on top of their roles." onClose={onClose} busy={busy} size="lg">
      <form onSubmit={submit} noValidate className="space-y-4">
        {fixedUser ? (
          <p className="text-xs text-slate-600 dark:text-slate-300">For <span className="font-semibold">{person}</span></p>
        ) : (
          <Field label="Who" htmlFor={ids.user} error={errors.user_id} required hint="You cannot change your own exceptions.">
            <select id={ids.user} className={inputClass} value={form.user_id} onChange={(e) => update({ user_id: e.target.value })}>
              <option value="">Choose a person…</option>
              {selectableUsers.map((u) => <option key={u.id} value={u.id}>{userLabel(u)}{u.email ? ` (${u.email})` : ''}</option>)}
            </select>
          </Field>
        )}

        <fieldset className="space-y-1">
          <legend className="text-xs font-semibold text-slate-700 dark:text-slate-200">What do you want to do?</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup">
            {[['deny', 'Block a permission', 'DENY · wins over every role that allows it.', ShieldAlert, 'border-rose-300 bg-rose-50 text-rose-900 ring-1 ring-rose-300'],
              ['allow', 'Grant extra access', 'ALLOW · works even without a role that grants it.', ShieldCheck, 'border-emerald-300 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-300']].map(([value, title, text, Icon, active]) => (
              <label key={value} className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-xs ${form.effect === value ? active : 'border-slate-200'}`}>
                <input type="radio" name="override-effect" value={value} checked={form.effect === value} onChange={() => update({ effect: value })} className="mt-0.5" />
                <Icon size={18} aria-hidden="true" />
                <span><span className="block text-sm font-bold">{title}</span>{text}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Which permission" htmlFor={ids.perm} error={errors.permission_key} required>
          <PermissionSelect id={ids.perm} catalog={catalog} value={form.permission_key} onChange={(value) => update({ permission_key: value })} error={errors.permission_key} />
        </Field>

        {permission && (
          <fieldset className="space-y-1">
            <legend className="text-xs font-semibold text-slate-700 dark:text-slate-200">Where it applies<span className="text-rose-700" aria-hidden="true"> *</span></legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup">
              {scopes.map((s) => (
                <label key={s} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-xs ${form.scope === s ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-slate-200'}`}>
                  <input type="radio" name="override-scope" value={s} checked={form.scope === s} onChange={() => update({ scope: s })} className="mt-0.5" />
                  <span><span className="block font-semibold">{SCOPE_LABELS[s] || s}</span><span className="text-slate-500">{SCOPE_HELP[s]}</span></span>
                </label>
              ))}
            </div>
            {scopes.length === 1 && <p className="text-[11px] text-slate-500">This permission only works at this level.</p>}
            {errors.scope && <p role="alert" className="text-[11px] font-medium text-rose-700">{errors.scope}</p>}
          </fieldset>
        )}

        {form.scope === 'branch' && (
          <Field label="Branch" htmlFor={ids.branch} error={errors.branch_id} required>
            <select id={ids.branch} className={inputClass} value={form.branch_id} onChange={(e) => update({ branch_id: e.target.value })}>
              <option value="">Choose a branch…</option>
              {(branches || []).map((b) => <option key={b.id} value={b.id}>{b.name}{b.is_active === false ? ' (inactive)' : ''}</option>)}
            </select>
          </Field>
        )}

        <fieldset className="space-y-1.5">
          <legend className="text-xs font-semibold text-slate-700 dark:text-slate-200">For how long</legend>
          <div className="flex flex-wrap gap-1.5">
            {EXPIRY_PRESETS.map(([value, label]) => (
              <button key={value || 'none'} type="button" aria-pressed={expiryPreset === value} onClick={() => choosePreset(value)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${expiryPreset === value ? 'border-primary bg-primary text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                {label}
              </button>
            ))}
          </div>
          {expiryPreset === 'custom' && (
            <input id={ids.expires} aria-label="Expires at" type="datetime-local" className={inputClass} value={form.expires_at}
              onChange={(e) => update({ expires_at: e.target.value })} />
          )}
          {errors.expires_at && <p role="alert" className="text-[11px] font-medium text-rose-700">{errors.expires_at}</p>}
        </fieldset>

        <Field label="Why" htmlFor={ids.reason} error={errors.reason} required hint="Required. Kept with the exception for auditing, e.g. “Covering for Sam until Friday”.">
          <textarea id={ids.reason} rows={2} className={inputClass} value={form.reason} maxLength={2000} onChange={(e) => update({ reason: e.target.value })} />
        </Field>

        {summary && (
          <p role="note" className={`rounded-lg border p-3 text-sm ${isDeny ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
            {summary}
          </p>
        )}
        {!isDeny && (
          <p className="text-[11px] text-slate-500">You can only grant extra access you hold yourself company-wide; the server refuses anything else.</p>
        )}
        <ErrorBanner message={submitError} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant={isDeny ? 'danger' : 'primary'} busy={busy}>{isDeny ? 'Block permission' : 'Grant extra access'}</Button>
        </div>
      </form>
    </Dialog>
  );
}

const overrideState = (row, now = new Date()) => {
  if (!row.is_active) return ['Revoked', 'slate'];
  if (row.expires_at && new Date(row.expires_at) <= now) return ['Expired', 'slate'];
  return ['Active', 'green'];
};

/** Direct overrides list. DENY is marked distinctly; revoking needs rbac_overrides.manage. */
export function OverridesTable({ overrides, users, branches, canManage, currentUserId, onRevoked, showUser = true }) {
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const userById = useMemo(() => new Map((users || []).map((u) => [String(u.id), u])), [users]);
  const branchById = useMemo(() => new Map((branches || []).map((b) => [String(b.id), b.name])), [branches]);

  if (!overrides?.length) return <EmptyState>No direct overrides.</EmptyState>;

  const revoke = async () => {
    setBusy(true);
    setError('');
    try {
      await revokeUserOverride(target.id);
      setTarget(null);
      onRevoked?.('Override revoked.');
    } catch (err) {
      setError(describeError(err, 'The override could not be revoked.').message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              {showUser && <th className="px-2 py-2">User</th>}
              <th className="px-2 py-2">Effect</th>
              <th className="px-2 py-2">Permission</th>
              <th className="px-2 py-2">Scope</th>
              <th className="px-2 py-2">Reason</th>
              <th className="px-2 py-2">Expires</th>
              <th className="px-2 py-2">State</th>
              <th className="px-2 py-2"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {overrides.map((row) => {
              const [stateLabel, stateTone] = overrideState(row);
              const isDeny = row.effect === 'deny';
              return (
                <tr key={row.id} className={isDeny && row.is_active ? 'bg-rose-50/40' : undefined}>
                  {showUser && <td className="px-2 py-2">{userLabel(userById.get(String(row.user_id)) || { id: row.user_id })}</td>}
                  <td className="px-2 py-2">
                    {isDeny
                      ? <Badge tone="red" title="Wins over role grants"><ShieldAlert size={12} aria-hidden="true" />DENY</Badge>
                      : <Badge tone="green"><ShieldCheck size={12} aria-hidden="true" />ALLOW</Badge>}
                  </td>
                  <td className="px-2 py-2"><span className="block font-semibold">{describePermission(row.permission_key).label}</span><code className="font-mono text-[10px] text-slate-500">{row.permission_key}</code></td>
                  <td className="px-2 py-2">{SCOPE_LABELS[row.scope] || row.scope}{row.scope === 'branch' && row.branch_id ? `: ${branchById.get(String(row.branch_id)) || `Branch ${row.branch_id}`}` : ''}</td>
                  <td className="max-w-[16rem] px-2 py-2 text-slate-600">{row.reason}</td>
                  <td className="px-2 py-2">{formatDateTime(row.expires_at) || 'Never'}</td>
                  <td className="px-2 py-2"><Badge tone={stateTone}>{stateLabel}</Badge></td>
                  <td className="px-2 py-2 text-right">
                    {canManage && stateLabel === 'Active' && String(row.user_id) !== String(currentUserId) && (
                      <Button variant="ghost" onClick={() => { setTarget(row); setError(''); }}>Revoke</Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {target && (
        <ConfirmDialog title="Revoke override" confirmLabel="Revoke" busy={busy} error={error} onConfirm={revoke} onCancel={() => setTarget(null)}>
          <p>Remove the {target.effect === 'deny' ? 'block' : 'extra access'} on <strong>{describePermission(target.permission_key).label}</strong>?</p>
          <p className="text-xs text-slate-500">The user&apos;s access then follows their roles again. The override stays in the history.</p>
        </ConfirmDialog>
      )}
    </>
  );
}

const SOURCE_LABELS = {
  role: 'Role grant', user_override: 'Direct override', default_deny: 'No grant (default deny)', saas: 'Plan / subscription',
  identity: 'User or company inactive', employment: 'Employee not active', branch: 'Branch rule', resource: 'Record not found',
  permission: 'Unknown or inactive permission', context: 'Tenant context', platform_session: 'Support session',
};

/** Asks the backend to explain one decision and shows exactly what it returns. */
export function ExplainAccessPanel({ catalog, users, branches, fixedUser }) {
  const ids = { user: useId(), perm: useId(), branch: useId(), type: useId(), rid: useId() };
  const [form, setForm] = useState({ user_id: fixedUser?.id ?? '', permission_key: '', branch_id: '', resource_type: '', resource_id: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.user_id || !form.permission_key || busy) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      setResult(await explainAccess({
        user_id: Number(form.user_id), permission_key: form.permission_key,
        branch_id: form.branch_id ? Number(form.branch_id) : null,
        resource_type: form.resource_id ? form.resource_type : '',
        resource_id: form.resource_id && form.resource_type ? Number(form.resource_id) : null,
      }));
    } catch (err) {
      setError(describeError(err, 'The decision could not be explained.').message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {!fixedUser && (
          <Field label="User" htmlFor={ids.user} required>
            <select id={ids.user} className={inputClass} value={form.user_id} onChange={(e) => setForm((p) => ({ ...p, user_id: e.target.value }))}>
              <option value="">Choose a user…</option>
              {(users || []).map((u) => <option key={u.id} value={u.id}>{userLabel(u)}</option>)}
            </select>
          </Field>
        )}
        <Field label="Permission" htmlFor={ids.perm} required>
          <PermissionSelect id={ids.perm} catalog={catalog} value={form.permission_key} onChange={(value) => setForm((p) => ({ ...p, permission_key: value }))} />
        </Field>
        <Field label="Branch" htmlFor={ids.branch} hint="Optional: judge a branch-scoped grant for this branch.">
          <select id={ids.branch} className={inputClass} value={form.branch_id} onChange={(e) => setForm((p) => ({ ...p, branch_id: e.target.value }))}>
            <option value="">Any / not branch-specific</option>
            {(branches || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Record type" htmlFor={ids.type} hint="Optional">
            <select id={ids.type} className={inputClass} value={form.resource_type} onChange={(e) => setForm((p) => ({ ...p, resource_type: e.target.value }))}>
              <option value="">None</option>
              <option value="lead">Lead</option>
              <option value="opportunity">Opportunity</option>
              <option value="customer">Customer</option>
            </select>
          </Field>
          <Field label="Record ID" htmlFor={ids.rid}>
            <input id={ids.rid} inputMode="numeric" className={inputClass} value={form.resource_id} disabled={!form.resource_type}
              onChange={(e) => setForm((p) => ({ ...p, resource_id: e.target.value.replace(/\D/g, '') }))} />
          </Field>
        </div>
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" busy={busy} disabled={!form.user_id || !form.permission_key}>Explain decision</Button>
        </div>
      </form>
      <ErrorBanner message={error} />
      {result && (
        <section aria-live="polite" aria-label="Decision" className={`rounded-lg border p-3 text-xs ${result.allowed ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
          <p className="mb-2 flex items-center gap-2 text-sm font-bold">
            {result.allowed ? <Badge tone="green">ALLOWED</Badge> : <Badge tone="red">DENIED</Badge>}
            <span>{describePermission(result.permission_key).label}</span>
          </p>
          <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1">
            <dt className="text-slate-500">Decided by</dt><dd>{SOURCE_LABELS[result.decision_source] || result.decision_source}</dd>
            <dt className="text-slate-500">Scope</dt><dd>{result.scope_used ? (SCOPE_LABELS[result.scope_used] || result.scope_used) : '—'}</dd>
            {result.role_name && (<><dt className="text-slate-500">Role</dt><dd>{result.role_name}</dd></>)}
            {result.user_override_id && (<><dt className="text-slate-500">Override</dt><dd>Direct override #{result.user_override_id}</dd></>)}
            <dt className="text-slate-500">Reason</dt><dd>{result.reason || '—'}</dd>
          </dl>
          <p className="mt-2 text-[11px] text-slate-500">This is the server&apos;s decision for the inputs above; the UI does not compute access.</p>
        </section>
      )}
    </div>
  );
}
