// People who hold a role, by branch, and giving it to more people in a branch
// (users.assign_role). One role per person per branch: giving this role in a
// branch replaces the role the person had there.
import React, { useMemo, useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import { assignUserRole, unassignUserRole } from '../../../services/api';
import { useUserAdminAccess } from './permissions';
import { describeError } from './errors';
import { canBeCompanyWide } from './logic';
import { useBranchCatalog, useRefreshAfterChange, useUsers } from './queries';
import { Badge, Button, ConfirmDialog, DeniedState, EmptyState, ErrorBanner, LoadingState, inputClass } from './ui';

const name = (u) => [u?.first_name, u?.last_name].filter(Boolean).join(' ') || u?.email || `User ${u?.id}`;
const COMPANY_WIDE = 'company';

export default function RolePeople({ role, readOnly }) {
  const { user } = useAuth();
  const can = useUserAdminAccess();
  const refresh = useRefreshAfterChange();
  const usersQuery = useUsers(can.viewUsers);
  const branchesQuery = useBranchCatalog(can.viewBranches);
  const [branch, setBranch] = useState('');
  const [picked, setPicked] = useState(new Set());
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [removing, setRemoving] = useState(null); // { user, branch_id, where }

  const users = useMemo(() => usersQuery.data || [], [usersQuery.data]);
  const companyWideAllowed = canBeCompanyWide(role);
  const branchOptions = useMemo(() => {
    const names = new Map();
    for (const b of branchesQuery.data || []) if (b.is_active !== false) names.set(String(b.id), b.name);
    // Without branches.view, the branches people belong to still name themselves.
    for (const u of users) for (const b of u.branch_details || []) if (b.is_active !== false && !names.has(String(b.branch_id))) names.set(String(b.branch_id), b.name);
    return [...names].map(([id, label]) => ({ id, label }))
      .filter((b) => role.branch_id == null || String(role.branch_id) === b.id)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [branchesQuery.data, users, role.branch_id]);
  const branchLabel = (id) => (id == null ? 'Company-wide' : branchOptions.find((b) => b.id === String(id))?.label || `Branch ${id}`);
  const heldHere = (u) => (u.role_details || []).filter((r) => String(r.id) === String(role.id));

  const holders = useMemo(() => users.map((u) => ({ user: u, where: heldHere(u) })).filter((h) => h.where.length),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [users, role.id]);
  const target = branch === COMPANY_WIDE ? null : branch;
  const candidates = useMemo(() => {
    if (!branch) return [];
    const q = query.trim().toLowerCase();
    return users
      .filter((u) => u.is_active !== false && String(u.id) !== String(user?.id))
      .filter((u) => (target == null ? true : (u.branch_details || []).some((b) => String(b.branch_id) === String(target))))
      .filter((u) => !heldHere(u).some((r) => String(r.branch_id ?? '') === String(target ?? '')))
      .filter((u) => !q || `${name(u)} ${u.email || ''}`.toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, branch, query, role.id, user?.id]);

  if (!can.viewUsers) return <DeniedState>Seeing who has this role needs the users.view permission.</DeniedState>;
  if (usersQuery.isLoading) return <LoadingState label="Loading people…" />;
  if (usersQuery.isError) return <ErrorBanner message={describeError(usersQuery.error).message} onRetry={() => usersQuery.refetch()} />;

  const canChange = can.assignRoles && !readOnly;
  const canAdd = canChange && role.is_active !== false;
  const replacing = (u) => (target == null ? null : (u.role_details || []).find((r) => String(r.branch_id) === String(target) && String(r.id) !== String(role.id)));

  const add = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    const failures = [];
    for (const id of picked) {
      try { await assignUserRole({ user_id: Number(id), role_id: Number(role.id), branch_id: target == null ? null : Number(target) }); }
      catch (err) { failures.push(`${name(users.find((u) => String(u.id) === String(id)))}: ${describeError(err).message}`); }
    }
    const added = picked.size - failures.length;
    setPicked(new Set());
    if (added) setNotice(`${role.name} given to ${added} ${added === 1 ? 'person' : 'people'} in ${branchLabel(target)}.`);
    if (failures.length) setError(failures.join(' '));
    setBusy(false);
    await refresh();
  };

  const remove = async () => {
    setBusy(true);
    setError('');
    try {
      await unassignUserRole({ user_id: Number(removing.user.id), role_id: Number(role.id), branch_id: removing.branch_id });
      setNotice(`${role.name} removed from ${name(removing.user)} in ${branchLabel(removing.branch_id)}.`);
      setRemoving(null);
      await refresh();
    } catch (err) {
      setError(describeError(err).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {notice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{notice}</p>}
      {!removing && <ErrorBanner message={error} />}

      <section className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">{holders.length} {holders.length === 1 ? 'person has' : 'people have'} this role</h4>
        {holders.length === 0 ? <EmptyState>Nobody has this role yet.</EmptyState> : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {holders.map(({ user: u, where }) => (
              <li key={u.id} className="space-y-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <span><span className="block font-semibold">{name(u)}</span><span className="text-slate-500">{u.email}</span></span>
                  {u.is_active === false && <Badge tone="slate">Login disabled</Badge>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {where.map((r) => (
                    <span key={r.branch_id ?? 'all'} className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                      {branchLabel(r.branch_id)}
                      {canChange && String(u.id) !== String(user?.id) && (
                        <button type="button" aria-label={`Remove ${role.name} from ${name(u)} in ${branchLabel(r.branch_id)}`}
                          onClick={() => { setError(''); setRemoving({ user: u, branch_id: r.branch_id ?? null }); }}
                          className="rounded-full p-0.5 hover:bg-sky-100"><X size={10} aria-hidden="true" /></button>
                      )}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canAdd && (
        <section className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200"><UserPlus size={14} aria-hidden="true" />Give {role.name} to people</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-[11px] font-semibold text-slate-600">In which branch?
              <select aria-label="Branch for this role" className={inputClass} value={branch} onChange={(e) => { setBranch(e.target.value); setPicked(new Set()); }}>
                <option value="">Choose a branch…</option>
                {companyWideAllowed && <option value={COMPANY_WIDE}>Company-wide (system role)</option>}
                {branchOptions.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
            </label>
            <label className="text-[11px] font-semibold text-slate-600">Search
              <input aria-label="Search people" placeholder="Search people…" value={query} onChange={(e) => setQuery(e.target.value)} className={inputClass} disabled={!branch} />
            </label>
          </div>
          {!branch ? <p className="text-[11px] text-slate-500">A role works only in the branch you give it in. Only members of that branch are listed.</p>
            : candidates.length === 0 ? <EmptyState>No one else to add in {branchLabel(target)}. People must be members of the branch first.</EmptyState> : (
              <ul className="max-h-56 space-y-1 overflow-y-auto">
                {candidates.map((u) => {
                  const old = replacing(u);
                  return (
                    <li key={u.id}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800">
                        <input type="checkbox" checked={picked.has(String(u.id))}
                          onChange={() => setPicked((prev) => { const next = new Set(prev); next.has(String(u.id)) ? next.delete(String(u.id)) : next.add(String(u.id)); return next; })} />
                        <span className="font-semibold">{name(u)}</span><span className="text-slate-500">{u.email}</span>
                        {old && <span className="ml-auto text-[10px] text-amber-700">replaces {old.name} here</span>}
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          <div className="flex justify-end">
            <Button onClick={add} busy={busy} disabled={!picked.size}>Give role to {picked.size || ''} {picked.size === 1 ? 'person' : 'people'}</Button>
          </div>
          <p className="text-[11px] text-slate-500">You can only hand out a role whose permissions you hold yourself; the server refuses others.</p>
        </section>
      )}
      {!can.assignRoles && <p className="text-[11px] text-slate-500">Changing who has this role needs the users.assign_role permission.</p>}
      {role.is_active === false && can.assignRoles && <p className="text-[11px] text-slate-500">This role is inactive; reactivate it before giving it to people.</p>}

      {removing && (
        <ConfirmDialog title="Remove role" confirmLabel="Remove" busy={busy} error={error} onConfirm={remove} onCancel={() => setRemoving(null)}>
          <p>Remove <strong>{role.name}</strong> from <strong>{name(removing.user)}</strong> in <strong>{branchLabel(removing.branch_id)}</strong>?</p>
          <p className="text-xs text-slate-500">They lose this role&apos;s access there straight away.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
