// Employee details: one place for the workforce record, its login and access.
import React, { useState } from 'react';
import { Briefcase, KeyRound, Mail, Phone, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { EMPLOYMENT_STATUSES } from './permissions';
import { ExplainAccessPanel } from './AccessControls';
import MemberAccessPanel from './MemberAccessPanel';
import UserAccessMatrix from './UserAccessMatrix';
import { useUserAccess } from './queries';
import { Badge, Button, DeniedState, Dialog } from './ui';

const fullName = (e) => [e?.first_name, e?.last_name].filter(Boolean).join(' ') || e?.email || 'Unnamed employee';
const fmtDate = (value) => (value ? new Date(`${value}`.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString() : '—');
const initials = (e) => `${e?.first_name?.[0] || e?.email?.[0] || '?'}${e?.last_name?.[0] || ''}`.toUpperCase();

function Row({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon size={15} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
      <dt className="w-32 shrink-0 text-xs text-slate-500">{label}</dt>
      <dd className="flex-1 text-sm text-slate-900 dark:text-slate-100">{children}</dd>
    </div>
  );
}

export default function EmployeeDetailsPanel({
  employee, login, loginStatus, actions, branchName, can, roles, branches, catalog, currentUserId, readOnly,
  onClose, onChanged, onAction, initialTab,
}) {
  const hasLogin = employee.user_id != null;
  const tabs = [
    { id: 'overview', label: 'Overview' },
    ...(hasLogin ? [{ id: 'access', label: 'Roles & access' }] : []),
    ...(hasLogin && can.viewUsers && catalog?.length ? [{ id: 'matrix', label: 'What they can do' }] : []),
    ...(hasLogin && can.viewPermissions && catalog?.length ? [{ id: 'explain', label: 'Explain access' }] : []),
  ];
  const [tab, setTab] = useState(initialTab || 'overview');
  const accessQuery = useUserAccess(employee.user_id, hasLogin && can.viewUsers);
  const status = EMPLOYMENT_STATUSES[employee.employment_status] || { label: employee.employment_status, tone: 'slate' };

  return (
    <Dialog variant="drawer" title={fullName(employee)} description={employee.email || 'No email'} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary" aria-hidden="true">{initials(employee)}</span>
          <div className="flex flex-wrap gap-1.5">
            <Badge tone={status.tone}>{status.label}</Badge>
            <Badge tone={loginStatus.tone}>{loginStatus.label}</Badge>
            {employee.worker_type && <Badge tone="slate"><span className="capitalize">{employee.worker_type}</span></Badge>}
          </div>
        </div>

        {/* Quick actions: the same rules as the list. */}
        <div className="flex flex-wrap gap-2">
          {actions.edit && <Button variant="ghost" onClick={() => onAction('edit')}>Edit details</Button>}
          {actions.assignRoles && <Button variant="ghost" onClick={() => onAction('roles')}><ShieldCheck size={14} aria-hidden="true" />Assign roles</Button>}
          {actions.giveLogin && <Button onClick={() => onAction('login')}><KeyRound size={14} aria-hidden="true" />Give login access</Button>}
          {actions.terminate && <Button variant="ghost" className="!text-rose-700" onClick={() => onAction('terminate')}>Terminate</Button>}
          {actions.rehire && <Button variant="ghost" onClick={() => onAction('rehire')}>Rehire</Button>}
        </div>

        <div role="tablist" aria-label="Employee sections" className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-3 py-2 text-xs font-semibold ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div role="tabpanel" className="space-y-4">
            <section>
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Profile</h3>
              <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                <Row icon={Mail} label="Email">{employee.email || '—'}</Row>
                <Row icon={Phone} label="Phone">{employee.phone || '—'}</Row>
                <Row icon={UserRound} label="Employee number">{employee.employee_number || '—'}</Row>
                <Row icon={Briefcase} label="Primary branch">{employee.primary_branch_id ? (branchName(employee.primary_branch_id)) : 'None'}</Row>
              </dl>
            </section>
            <section>
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Employment</h3>
              <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                <Row icon={Briefcase} label="Status">{status.label}</Row>
                <Row icon={Briefcase} label="Hired">{fmtDate(employee.hire_date)}</Row>
                {employee.employment_status === 'terminated' && (
                  <>
                    <Row icon={Briefcase} label="Terminated">{fmtDate(employee.termination_date)}</Row>
                    <Row icon={Briefcase} label="Reason">{employee.termination_reason || '—'}</Row>
                    <Row icon={Briefcase} label="Rehire">{employee.rehire_eligible === false ? 'Not eligible' : 'Eligible'}</Row>
                  </>
                )}
              </dl>
            </section>
            <section className="rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800">
              <h3 className="mb-1 flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200"><ShieldCheck size={14} aria-hidden="true" />Login</h3>
              {hasLogin ? (
                <p className="text-slate-600 dark:text-slate-300">
                  Signs in as <strong>{login?.email || employee.email}</strong>. {loginStatus.key === 'disabled' ? 'The login is disabled.' : ''}
                  {' '}See <button type="button" className="font-semibold text-primary underline" onClick={() => setTab('access')}>Roles &amp; access</button> for roles, branches and personal exceptions.
                </p>
              ) : (
                <p className="flex items-start gap-1.5 text-slate-600 dark:text-slate-300">
                  <Sparkles size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>No login yet. This person can still be scheduled and assigned work.{actions.giveLogin ? ' Use "Give login access" to send an invitation or set a temporary password.' : ''}</span>
                </p>
              )}
            </section>
          </div>
        )}

        {tab === 'access' && hasLogin && (
          <div role="tabpanel">
            <MemberAccessPanel employee={employee} login={login} access={can} roles={roles} branches={branches}
              catalog={catalog} currentUserId={currentUserId} readOnly={readOnly} onChanged={onChanged} showExplain={false} />
          </div>
        )}

        {tab === 'matrix' && hasLogin && (
          <div role="tabpanel">
            {accessQuery.isLoading ? <p className="text-xs text-slate-500">Loading…</p> : (
              <UserAccessMatrix employee={employee} login={login} access={accessQuery.data} can={can} catalog={catalog}
                branches={branches} currentUserId={currentUserId} readOnly={readOnly} onChanged={onChanged} />
            )}
          </div>
        )}

        {tab === 'explain' && (
          <div role="tabpanel" className="space-y-2">
            {can.viewPermissions ? (
              <>
                <p className="text-xs text-slate-600 dark:text-slate-300">Ask why {fullName(employee)} can or cannot do something. The answer comes from the server.</p>
                <ExplainAccessPanel catalog={catalog} branches={branches} fixedUser={{ id: employee.user_id, ...login }} />
              </>
            ) : <DeniedState />}
          </div>
        )}
      </div>
    </Dialog>
  );
}
