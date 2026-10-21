// Access of one login: login state, branch memberships, roles, direct
// overrides and the backend's explanation of a decision.
//
// Identity model (backend): an Employee is the workforce record; a User is the
// optional login linked to it. Roles, branch membership and overrides belong
// to the login.
import React, { useId, useMemo, useState } from 'react';
import { addUserBranch, deactivateUser, reactivateUser, removeUserBranch } from '../../../services/api';
import BranchRolesEditor from './BranchRolesEditor';
import { describeError } from './errors';
import { OverrideFormModal, OverridesTable, ExplainAccessPanel } from './AccessControls';
import { Badge, Button, ConfirmDialog, DeniedState, EmptyState, ErrorBanner, LoadingState, inputClass } from './ui';
import { useUserAccess } from './queries';

const name = (person) => [person?.first_name, person?.last_name].filter(Boolean).join(' ') || person?.email || 'this user';

function Section({ title, action, children }) {
  return (
    <section className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function MemberAccessPanel({
  employee, login, access: can, roles, branches, catalog, currentUserId, readOnly, onChanged, showExplain = true,
}) {
  const userId = employee.user_id;
  const isSelf = String(userId) === String(currentUserId);
  const accessQuery = useUserAccess(userId, can.viewUsers);
  const access = accessQuery.data;
  const [confirm, setConfirm] = useState(null); // { kind, payload }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [branchToAdd, setBranchToAdd] = useState('');
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const branchSelectId = useId();

  const memberBranches = access?.branches || [];
  const memberRoles = access?.roles || [];
  const overrides = access?.overrides || [];
  const branchNames = useMemo(() => new Map((branches || []).map((b) => [String(b.id), b.name])), [branches]);
  const memberBranchIds = new Set(memberBranches.map((b) => String(b.branch_id)));
  const addableBranches = (branches || []).filter((b) => b.is_active !== false && !memberBranchIds.has(String(b.id)));
  const loginActive = login?.is_active !== false;
  const employeeActive = employee.employment_status === 'active';

  const run = async (action, message) => {
    setBusy(true);
    setError('');
    try {
      await action();
      setNotice(message);
      setConfirm(null);
      await onChanged?.();
    } catch (err) {
      setError(describeError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmContent = {
    disableLogin: {
      title: 'Disable login', label: 'Disable login',
      body: <><p>Disable the login of <strong>{name(employee)}</strong>? They are signed out and cannot sign in.</p><p className="text-xs text-slate-500">Employment is not affected. To end employment, terminate the employee.</p></>,
      action: () => run(() => deactivateUser(userId), 'Login disabled.'),
    },
    enableLogin: {
      title: 'Enable login', label: 'Enable login', tone: 'primary',
      body: <p>Allow <strong>{name(employee)}</strong> to sign in again?</p>,
      action: () => run(() => reactivateUser(userId), 'Login enabled.'),
    },
    removeBranch: {
      title: 'Remove branch membership', label: 'Remove',
      body: <><p>Remove <strong>{name(employee)}</strong> from <strong>{confirm?.payload?.name}</strong>?</p><p className="text-xs text-slate-500">The role they hold in that branch is removed too. Membership alone never grants access.</p></>,
      action: () => run(() => removeUserBranch(userId, confirm.payload.branch_id), 'Branch membership removed.'),
    },
  }[confirm?.kind];

  return (
    <>
      <div className="space-y-3">
        {notice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{notice}</p>}
        <ErrorBanner message={error} />

        <Section
          title="Login"
          action={can.manageLogins && !readOnly && !isSelf && (
            loginActive
              ? <Button variant="danger" onClick={() => setConfirm({ kind: 'disableLogin' })}>Disable login</Button>
              : <Button variant="primary" onClick={() => setConfirm({ kind: 'enableLogin' })} disabled={!employeeActive} title={!employeeActive ? 'Only an active employee can sign in.' : undefined}>Enable login</Button>
          )}
        >
          <p className="flex flex-wrap items-center gap-2 text-xs">
            {loginActive ? <Badge tone="green">Login active</Badge> : <Badge tone="slate">Login disabled</Badge>}
            {!employeeActive && <Badge tone="amber">Employee {employee.employment_status.replace('_', ' ')}: cannot sign in</Badge>}
            {isSelf && <span className="text-slate-500">This is your own account.</span>}
          </p>
        </Section>

        {!can.viewUsers ? (
          <DeniedState>Viewing roles and branch access needs the users.view permission.</DeniedState>
        ) : accessQuery.isLoading ? (
          <LoadingState label="Loading access…" />
        ) : accessQuery.isError ? (
          <ErrorBanner message={describeError(accessQuery.error).message} onRetry={() => accessQuery.refetch()} />
        ) : (
          <>
            <Section title="Branch membership">
              <p className="text-[11px] text-slate-500">The branches this person works in. Membership alone grants nothing; give them a role in the branch below.</p>
              {memberBranches.length === 0 ? <EmptyState>No branch memberships.</EmptyState> : (
                <ul className="divide-y divide-slate-100 text-xs dark:divide-slate-800">
                  {memberBranches.map((b) => (
                    <li key={b.branch_id} className="flex items-center justify-between py-1.5">
                      <span className="flex items-center gap-2">
                        {b.name || branchNames.get(String(b.branch_id)) || `Branch ${b.branch_id}`}
                        {b.is_primary && <Badge tone="blue">Primary</Badge>}
                        {b.is_active === false && <Badge tone="slate">Branch inactive</Badge>}
                      </span>
                      {can.manageLogins && !readOnly && !b.is_primary && (
                        <Button variant="ghost" onClick={() => setConfirm({ kind: 'removeBranch', payload: { branch_id: b.branch_id, name: b.name } })}>Remove</Button>
                      )}
                      {b.is_primary && <span className="text-[11px] text-slate-500">Change the primary branch on the employee to move it.</span>}
                    </li>
                  ))}
                </ul>
              )}
              {can.manageLogins && !readOnly && (
                addableBranches.length > 0 ? (
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label htmlFor={branchSelectId} className="text-[11px] font-semibold text-slate-600">Add membership</label>
                      <select id={branchSelectId} className={inputClass} value={branchToAdd} onChange={(e) => setBranchToAdd(e.target.value)}>
                        <option value="">Choose a branch…</option>
                        {addableBranches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <Button disabled={!branchToAdd} busy={busy && !confirm} onClick={() => run(async () => { await addUserBranch(userId, branchToAdd); setBranchToAdd(''); }, 'Branch membership added.')}>Add</Button>
                  </div>
                ) : !can.viewBranches ? <p className="text-[11px] text-slate-500">Adding memberships needs the branch list (branches.view).</p> : null
              )}
            </Section>

            <Section title="Roles by branch">
              <BranchRolesEditor
                userId={userId} person={name(employee)}
                editable={can.assignRoles && !readOnly && !isSelf}
                assignments={memberRoles} memberships={memberBranches.filter((b) => b.is_active !== false)}
                roles={roles} branches={branches}
                onSaved={async (message) => { if (message) setNotice(message); await onChanged?.(); await accessQuery.refetch(); }}
              />
              {isSelf && can.assignRoles && <p className="text-[11px] text-slate-500">You cannot change your own roles.</p>}
              {!can.assignRoles && <p className="text-[11px] text-slate-500">Changing roles needs the users.assign_role permission.</p>}
            </Section>

            <Section
              title="Direct overrides"
              action={can.manageOverrides && !readOnly && !isSelf && catalog?.length > 0 && <Button variant="ghost" onClick={() => setShowOverrideForm(true)}>Add override</Button>}
            >
              <p className="text-[11px] text-slate-500">A direct DENY wins over role grants; a direct ALLOW grants without a role.</p>
              <OverridesTable
                overrides={overrides} branches={branches} canManage={can.manageOverrides && !readOnly}
                currentUserId={currentUserId} showUser={false}
                onRevoked={async (message) => { setNotice(message); await onChanged?.(); }}
              />
            </Section>

            {showExplain && can.viewPermissions && catalog?.length > 0 && (
              <Section title="Explain access">
                <ExplainAccessPanel catalog={catalog} branches={branches} fixedUser={{ id: userId, ...login }} />
              </Section>
            )}
          </>
        )}
      </div>

      {confirmContent && (
        <ConfirmDialog title={confirmContent.title} confirmLabel={confirmContent.label} tone={confirmContent.tone || 'danger'}
          busy={busy} error={error} onConfirm={confirmContent.action} onCancel={() => setConfirm(null)}>
          {confirmContent.body}
        </ConfirmDialog>
      )}
      {showOverrideForm && (
        <OverrideFormModal
          catalog={catalog} branches={branches} fixedUser={{ id: userId, ...login, first_name: employee.first_name, last_name: employee.last_name }}
          currentUserId={currentUserId}
          onClose={() => setShowOverrideForm(false)}
          onSaved={async (_saved, message) => { setShowOverrideForm(false); setNotice(message); await onChanged?.(); }}
        />
      )}
    </>
  );
}
