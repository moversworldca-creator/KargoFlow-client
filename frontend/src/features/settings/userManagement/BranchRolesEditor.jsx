// Roles of one person, by branch. One role per branch; the role acts only in
// that branch. A few system roles (Company Admin, crew roles) may instead be
// held company-wide. The server enforces every rule; this only shows them.
import React, { useMemo, useState } from 'react';
import { Building2, ShieldCheck } from 'lucide-react';
import { assignUserRole, unassignUserRole } from '../../../services/api';
import { describeError } from './errors';
import { canBeCompanyWide, roleChanges, rolesForBranch } from './logic';
import { Badge, Button, EmptyState, ErrorBanner, inputClass } from './ui';

const initialPlan = (assignments, memberships) => ({
  branches: Object.fromEntries((memberships || []).map((m) => [String(m.branch_id),
    String((assignments || []).find((a) => String(a.branch_id) === String(m.branch_id))?.id || '')])),
  companyWide: new Set((assignments || []).filter((a) => a.branch_id == null).map((a) => String(a.id))),
});

export default function BranchRolesEditor({
  userId, person = 'this person', assignments = [], memberships = [], roles = [], branches = [], editable, onSaved,
}) {
  const [plan, setPlan] = useState(() => initialPlan(assignments, memberships));
  // Follow the server after a save or refresh (the error stays visible).
  const signature = JSON.stringify([(assignments || []).map((a) => [a.id, a.branch_id]), (memberships || []).map((m) => m.branch_id)]);
  const [synced, setSynced] = useState(signature);
  if (synced !== signature) {
    setSynced(signature);
    setPlan(initialPlan(assignments, memberships));
  }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const branchName = useMemo(() => {
    const names = new Map((branches || []).map((b) => [String(b.id), b.name]));
    for (const m of memberships || []) if (m.name) names.set(String(m.branch_id), m.name);
    return (id) => names.get(String(id)) || `Branch ${id}`;
  }, [branches, memberships]);
  const roleName = (id) => (roles || []).find((r) => String(r.id) === String(id))?.name
    || (assignments || []).find((a) => String(a.id) === String(id))?.name || `Role ${id}`;
  const changes = roleChanges(assignments, plan);
  const companyWideRoles = (roles || []).filter((r) => r.is_active !== false && canBeCompanyWide(r));
  const companyWideHeld = (assignments || []).filter((a) => a.branch_id == null);

  const setBranchRole = (branchId, roleId) => setPlan((p) => ({ ...p, branches: { ...p.branches, [String(branchId)]: roleId } }));
  const toggleCompanyWide = (roleId) => setPlan((p) => {
    const next = new Set(p.companyWide);
    next.has(String(roleId)) ? next.delete(String(roleId)) : next.add(String(roleId));
    return { ...p, companyWide: next };
  });

  const save = async () => {
    setBusy(true);
    setError('');
    const failures = [];
    for (const change of changes) {
      const where = change.branch_id == null ? 'company-wide' : `in ${branchName(change.branch_id)}`;
      try {
        const payload = { user_id: Number(userId), role_id: change.role_id, branch_id: change.branch_id };
        if (change.kind === 'assign') await assignUserRole(payload);
        else await unassignUserRole(payload);
      } catch (err) {
        failures.push(`${roleName(change.role_id)} ${where}: ${describeError(err).message}`);
      }
    }
    setBusy(false);
    if (failures.length) setError(failures.join(' '));
    await onSaved?.(failures.length ? null : `Roles for ${person} updated.`);
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-600 dark:text-slate-300">
        One role per branch. A role gives access <strong>only inside its branch</strong>; it never gives company-wide access.
        {editable ? ' Choosing a different role for a branch replaces the current one.' : ''}
      </p>

      {memberships.length === 0 ? (
        <EmptyState>{person} is not a member of any branch yet. Add a branch membership first; roles are given per branch.</EmptyState>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          {memberships.map((m) => {
            const id = String(m.branch_id);
            const value = plan.branches[id] ?? '';
            const options = rolesForBranch(roles, id);
            const current = (assignments || []).find((a) => String(a.branch_id) === id);
            return (
              <li key={id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs">
                <span className="flex min-w-[9rem] flex-1 items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">
                  <Building2 size={13} className="text-slate-400" aria-hidden="true" />
                  {branchName(id)}
                  {m.is_primary && <Badge tone="blue">Primary</Badge>}
                  {m.is_active === false && <Badge tone="slate">Branch inactive</Badge>}
                </span>
                {editable ? (
                  <select aria-label={`Role in ${branchName(id)}`} className={`${inputClass} !w-56 !py-1.5 !text-xs`} value={value}
                    onChange={(e) => setBranchRole(id, e.target.value)} disabled={busy}>
                    <option value="">No role (no access here)</option>
                    {current && !options.some((r) => String(r.id) === String(current.id)) && (
                      <option value={String(current.id)}>{current.name} (inactive)</option>
                    )}
                    {options.map((r) => <option key={r.id} value={String(r.id)}>{r.name}{r.is_system_role ? ' (System)' : ''}</option>)}
                  </select>
                ) : (
                  current ? <Badge tone={current.is_active === false ? 'slate' : 'blue'}><ShieldCheck size={11} aria-hidden="true" />{current.name}</Badge>
                    : <span className="text-[11px] text-amber-700">No role: no access here</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {(companyWideHeld.length > 0 || (editable && companyWideRoles.length > 0)) && (
        <section className="space-y-1.5 rounded-xl border border-dashed border-slate-300 p-3 dark:border-slate-700">
          <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Company-wide system roles</h4>
          <p className="text-[11px] text-slate-500">Only the Company Admin and crew app roles can be held without a branch. Crew roles reach only the jobs the person is assigned to.</p>
          <div className="flex flex-wrap gap-2">
            {(editable ? companyWideRoles : companyWideHeld).map((r) => (
              editable ? (
                <label key={r.id} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-slate-700">
                  <input type="checkbox" checked={plan.companyWide.has(String(r.id))} onChange={() => toggleCompanyWide(r.id)} disabled={busy} />
                  {r.name}
                </label>
              ) : <Badge key={r.id} tone="blue">{r.name} · Company-wide</Badge>
            ))}
          </div>
        </section>
      )}

      <ErrorBanner message={error} />
      {editable && (
        <div className="flex items-center justify-end gap-2">
          {changes.length > 0 && <span className="text-[11px] text-slate-500">{changes.length} unsaved {changes.length === 1 ? 'change' : 'changes'}</span>}
          <Button onClick={save} busy={busy} disabled={!changes.length}>Save roles</Button>
        </div>
      )}
    </div>
  );
}
