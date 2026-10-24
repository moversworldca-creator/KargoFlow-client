// Team Members: the employee directory and login invitations.
//
// The list is of Employees (workforce records). A login (User) is optional and
// shown as its own column: "No login", "Invitation pending", "Login active",
// "Login disabled". Every action checks the single backend permission it
// needs, and only actions valid for the record's state are offered.
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, KeyRound, Lock, Search, UserPlus } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import { EMPLOYMENT_STATUSES, useUserAdminAccess } from './permissions';
import { describeError } from './errors';
import {
    isReadOnlyMode, useBranchCatalog, useEmployees, useEntitlements, useInvitations, usePermissionCatalog,
    useRefreshAfterChange, useRoles, useUsers,
} from './queries';
import EmployeeFormModal from './EmployeeFormModal';
import { RehireEmployeeModal, TerminateEmployeeModal } from './LifecycleModals';
import EmployeeDetailsPanel from './EmployeeDetailsPanel';
import LoginAccessModal from './LoginAccessModal';
import RoleAssignModal from './RoleAssignModal';
import InvitationsList from './InvitationsList';
import { assignmentLabel, invitationStatus, loginState, rowActions } from './logic';
import { Badge, Button, DeniedState, EmptyState, ErrorBanner, LoadingState, ReadOnlyNotice, inputClass } from './ui';
import { getOverQuotaUserIds, isUserOverQuota } from '../../../shared/utils/branchScope';

const PAGE_SIZE = 25;
const fullName = (e) => [e?.first_name, e?.last_name].filter(Boolean).join(' ') || e?.email || 'Unnamed employee';
const initials = (e) => `${e?.first_name?.[0] || e?.email?.[0] || '?'}${e?.last_name?.[0] || ''}`.toUpperCase();

export default function EmployeeDirectory({ branchId }) {
    const { user } = useAuth();
    const can = useUserAdminAccess();
    const refresh = useRefreshAfterChange();
    const [view, setView] = useState('employees');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(0);
    const [modal, setModal] = useState(null); // { kind, employee }
    const [notice, setNotice] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(0); }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const params = useMemo(() => ({
        limit: PAGE_SIZE, offset: page * PAGE_SIZE,
        ...(status ? { status } : {}), ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(branchId ? { branch_id: branchId } : {}),
    }), [page, status, debouncedSearch, branchId]);

    const employeesQuery = useEmployees(params, can.viewEmployees);
    // Names for the invitations view, which lists invitations across all pages.
    const allEmployeesQuery = useEmployees({ limit: 500, offset: 0, ...(branchId ? { branch_id: branchId } : {}) }, can.viewEmployees && view === 'invitations');
    const usersQuery = useUsers(can.viewUsers);
    const invitationsQuery = useInvitations(can.manageLogins);
    const rolesQuery = useRoles(can.viewRoles && (can.assignRoles || can.viewUsers));
    const catalogQuery = usePermissionCatalog(can.viewPermissions || can.manageOverrides);
    const branchesQuery = useBranchCatalog(can.viewBranches);
    const entitlementsQuery = useEntitlements(can.viewEntitlements);
    const activeUsersCount = useMemo(() => (usersQuery.data || []).filter((u) => u.is_active !== false).length, [usersQuery.data]);
    const userLimit = entitlementsQuery.data?.limits?.['users.max_active'] ?? entitlementsQuery.data?.resource_access?.user_limit;
    const hasExpiredUserAddon = Boolean(entitlementsQuery.data?.resource_access?.has_expired_user_addon);
    const isSeatLimitReached = Boolean(userLimit != null && activeUsersCount >= userLimit);
    const isUserAddonExpired = Boolean(hasExpiredUserAddon && isSeatLimitReached);
    const isOverallReadOnly = isReadOnlyMode(entitlementsQuery.data);
    const readOnly = Boolean(isOverallReadOnly || isSeatLimitReached || entitlementsQuery.data?.resource_access?.users_read_only);

    const loginsById = useMemo(() => new Map((usersQuery.data || []).map((u) => [String(u.id), u])), [usersQuery.data]);
    const pendingByEmployee = useMemo(() => new Map((invitationsQuery.data || [])
        .filter((i) => invitationStatus(i) === 'pending').map((i) => [String(i.employee_id), i])), [invitationsQuery.data]);
    const latestInvitationByEmployee = useMemo(() => {
        const map = new Map();
        for (const inv of invitationsQuery.data || []) {
            if (!['pending'].includes(inv.status)) continue;
            const prev = map.get(String(inv.employee_id));
            if (!prev || String(inv.created_at) > String(prev.created_at)) map.set(String(inv.employee_id), inv);
        }
        return map;
    }, [invitationsQuery.data]);
    // Branch names: the catalog when readable, otherwise the signed-in user's own memberships.
    const branches = useMemo(() => (branchesQuery.data?.length ? branchesQuery.data
        : (user?.branch_details || []).map((b) => ({ id: b.branch_id ?? b.id, name: b.name, is_active: b.is_active }))), [branchesQuery.data, user]);
    const branchNames = useMemo(() => new Map(branches.map((b) => [String(b.id), b.name])), [branches]);
    const branchName = (id) => branchNames.get(String(id)) || `Branch ${id}`;
    const employeeNames = useMemo(() => new Map(((allEmployeesQuery.data?.results) || employeesQuery.data?.results || [])
        .map((e) => [String(e.id), fullName(e)])), [allEmployeesQuery.data, employeesQuery.data]);

    if (!can.viewEmployees) {
        return <DeniedState title="Team members are not available">Viewing the employee directory needs the employees.view permission.</DeniedState>;
    }

    const rows = employeesQuery.data?.results || [];
    const total = employeesQuery.data?.count ?? 0;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const currentUserId = user?.id;
    const waitingInvitations = (invitationsQuery.data || []).filter((i) => ['pending', 'expired'].includes(invitationStatus(i))).length;

    const overQuotaUserIds = useMemo(() => {
        return getOverQuotaUserIds(usersQuery.data || [], userLimit);
    }, [usersQuery.data, userLimit]);

    const done = async (message) => {
        setModal(null);
        setNotice(message);
        await refresh();
    };
    const contextFor = (employee) => {
        const isSelf = employee.user_id != null && String(employee.user_id) === String(currentUserId);
        const isOverQuota = Boolean(employee.user_id != null && isUserOverQuota(employee.user_id, overQuotaUserIds));
        return {
            login: loginState(employee, loginsById, pendingByEmployee),
            loginRow: loginsById.get(String(employee.user_id)),
            invitation: latestInvitationByEmployee.get(String(employee.id)),
            isSelf,
            isOverQuota,
            actions: rowActions(employee, { can, isSelf, readOnly }),
        };
    };
    const open = (kind, employee) => setModal({ kind, employee });

    return (
        <div className="space-y-3">
            {readOnly && (
                <ReadOnlyNotice
                    title={isOverallReadOnly ? undefined : isUserAddonExpired ? "User Add-on Expired (Read-Only Mode)" : isSeatLimitReached ? "User Seat Limit Reached" : undefined}
                    message={
                        isOverallReadOnly
                            ? undefined
                            : isUserAddonExpired
                              ? `Your user add-on pack has expired and active users (${activeUsersCount} / ${userLimit}) meet or exceed your allowed limit. User management is in read-only mode until the add-on is renewed.`
                              : isSeatLimitReached
                                ? `Active users (${activeUsersCount} / ${userLimit}) have reached the maximum allowed limit. Adding new employees or issuing new logins is disabled until an additional add-on pack is acquired.`
                                : undefined
                    }
                />
            )}

            {can.manageLogins && (
                <div role="tablist" aria-label="Team members views" className="flex gap-1 rounded-xl bg-slate-100 p-1 text-xs dark:bg-slate-800">
                    {[['employees', 'Employees'], ['invitations', `Invitations${waitingInvitations ? ` (${waitingInvitations})` : ''}`]].map(([id, label]) => (
                        <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)}
                            className={`flex-1 rounded-lg px-3 py-1.5 font-semibold ${view === id ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-600'}`}>
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {notice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{notice}</p>}

            {view === 'invitations' && can.manageLogins ? (
                <InvitationsList query={invitationsQuery} employeeNames={employeeNames} readOnly={readOnly} onChanged={refresh} />
            ) : (
                <>
                    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                            <div className="relative max-w-sm flex-1">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                                <input aria-label="Search employees" placeholder="Search name, email or number…" value={search}
                                    onChange={(e) => setSearch(e.target.value)} className={`${inputClass} pl-8`} />
                            </div>
                            <select aria-label="Filter by employment status" className={`${inputClass} sm:w-44`} value={status}
                                onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
                                <option value="">All statuses</option>
                                {Object.entries(EMPLOYMENT_STATUSES).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
                            </select>
                        </div>
                        {can.manageEmployees && (
                            <Button onClick={() => setModal({ kind: 'create' })} disabled={readOnly} title={readOnly ? (isUserAddonExpired ? 'User add-on expired' : isSeatLimitReached ? 'User seat limit reached' : 'Read-only subscription') : undefined}>
                                <UserPlus size={14} aria-hidden="true" /> Add employee
                            </Button>
                        )}
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                        {employeesQuery.isLoading ? <LoadingState label="Loading employees…" /> : employeesQuery.isError ? (
                            describeError(employeesQuery.error).kind === 'denied'
                                ? <DeniedState>{describeError(employeesQuery.error).message}</DeniedState>
                                : <ErrorBanner message={describeError(employeesQuery.error).message} onRetry={() => employeesQuery.refetch()} />
                        ) : rows.length === 0 ? (
                            <EmptyState>{debouncedSearch || status ? 'No employees match these filters.' : 'No employees yet.'}</EmptyState>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                                        <tr>
                                            <th scope="col" className="px-3 py-2">Employee</th>
                                            <th scope="col" className="px-3 py-2">Employment</th>
                                            <th scope="col" className="px-3 py-2">Login</th>
                                            <th scope="col" className="px-3 py-2">Primary branch</th>
                                            {can.viewUsers && <th scope="col" className="px-3 py-2">Roles</th>}
                                            <th scope="col" className="px-3 py-2"><span className="sr-only">Actions</span></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {rows.map((employee) => {
                                            const statusMeta = EMPLOYMENT_STATUSES[employee.employment_status] || { label: employee.employment_status, tone: 'slate' };
                                            const ctx = contextFor(employee);
                                            return (
                                                <tr key={employee.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                                                    <td className="px-3 py-2">
                                                        <button type="button" onClick={() => open('details', employee)} className="group flex items-center gap-2.5 text-left">
                                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary" aria-hidden="true">{initials(employee)}</span>
                                                            <span>
                                                                <span className="block font-semibold text-slate-900 group-hover:text-primary group-hover:underline dark:text-white">
                                                                    {fullName(employee)}{ctx.isSelf && <span className="ml-1 font-normal text-slate-500">(you)</span>}
                                                                </span>
                                                                <span className="block text-[11px] text-slate-500">
                                                                    {employee.email || 'No email'} · <span className="capitalize">{employee.worker_type || '—'}</span>
                                                                </span>
                                                            </span>
                                                        </button>
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                                                        {employee.employment_status === 'terminated' && employee.rehire_eligible === false && <p className="mt-1 text-[11px] text-slate-500">Not eligible for rehire</p>}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <Badge tone={ctx.login.tone}>{ctx.login.label}</Badge>
                                                            {ctx.isOverQuota && (
                                                                <Badge tone="amber" title="This user account was added via an add-on pack that has expired or is over quota.">
                                                                    <Lock size={10} className="mr-0.5 inline" /> Over Quota
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2">{employee.primary_branch_id ? branchName(employee.primary_branch_id) : '—'}</td>
                                                    {can.viewUsers && (
                                                        <td className="px-3 py-2">
                                                            {employee.user_id == null ? <span className="text-slate-400" title="Roles are given to a login">—</span> : (
                                                                <div className="flex flex-wrap items-center gap-1">
                                                                    {(ctx.loginRow?.role_details || []).map((r) => (
                                                                        <Badge key={`${r.id}-${r.branch_id ?? 'all'}`} tone="blue" title={r.branch_id == null ? 'Held company-wide (system role)' : `Acts only in ${r.branch_name || branchName(r.branch_id)}`}>
                                                                            {assignmentLabel(r, branchName)}
                                                                        </Badge>
                                                                    ))}
                                                                    {!(ctx.loginRow?.role_details || []).length && <span className="text-[11px] text-amber-700">No roles</span>}
                                                                    {ctx.actions.assignRoles && (
                                                                        <button type="button" onClick={() => open('roles', employee)}
                                                                            className="rounded-full border border-dashed border-primary px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/5"
                                                                            aria-label={`Assign roles to ${fullName(employee)}`}>+ Assign roles</button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                    )}
                                                    <td className="px-3 py-2">
                                                        <div className="flex flex-wrap justify-end gap-1.5">
                                                            {ctx.actions.giveLogin && (
                                                                <Button variant="ghost" onClick={() => open('login', employee)}>
                                                                    <KeyRound size={13} aria-hidden="true" />{ctx.invitation ? 'Invitation…' : 'Give login access'}
                                                                </Button>
                                                            )}
                                                            {ctx.actions.edit && <Button variant="ghost" onClick={() => open('edit', employee)}>Edit</Button>}
                                                            {ctx.actions.terminate && <Button variant="ghost" className="!text-rose-700" onClick={() => open('terminate', employee)}>Terminate</Button>}
                                                            {ctx.actions.rehire && <Button variant="ghost" onClick={() => open('rehire', employee)}>Rehire</Button>}
                                                            <Button variant="ghost" onClick={() => open('details', employee)} aria-label={`Details for ${fullName(employee)}`}>
                                                                Details<ChevronRight size={13} aria-hidden="true" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {total > PAGE_SIZE && (
                            <nav aria-label="Pagination" className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-xs dark:border-slate-800">
                                <span>{page * PAGE_SIZE + 1}–{Math.min(total, (page + 1) * PAGE_SIZE)} of {total}</span>
                                <span className="flex gap-2">
                                    <Button variant="ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                                    <Button variant="ghost" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                                </span>
                            </nav>
                        )}
                    </div>
                </>
            )}

            {modal?.kind === 'details' && (() => {
                const ctx = contextFor(modal.employee);
                return (
                    <EmployeeDetailsPanel
                        employee={modal.employee} login={ctx.loginRow} loginStatus={ctx.login} actions={ctx.actions} branchName={branchName}
                        can={can} roles={rolesQuery.data} branches={branches} catalog={catalogQuery.data} currentUserId={currentUserId}
                        readOnly={readOnly} onClose={() => setModal(null)} onChanged={refresh}
                        onAction={(kind) => open(kind, modal.employee)}
                    />
                );
            })()}
            {(modal?.kind === 'create' || modal?.kind === 'edit') && (
                <EmployeeFormModal employee={modal.kind === 'edit' ? modal.employee : null} branches={branches}
                    canInvite={can.manageLogins} onClose={() => setModal(null)} onSaved={(_e, message) => done(message)} />
            )}
            {modal?.kind === 'terminate' && <TerminateEmployeeModal employee={modal.employee} onClose={() => setModal(null)} onDone={(_e, m) => done(m)} />}
            {modal?.kind === 'rehire' && <RehireEmployeeModal employee={modal.employee} branches={branches} onClose={() => setModal(null)} onDone={(_e, m) => done(m)} />}
            {modal?.kind === 'roles' && (
                <RoleAssignModal employee={modal.employee} roles={rolesQuery.data} branches={branches}
                    onClose={() => setModal(null)} onDone={done} />
            )}
            {modal?.kind === 'login' && (
                <LoginAccessModal employee={modal.employee} invitation={latestInvitationByEmployee.get(String(modal.employee.id))}
                    onClose={() => setModal(null)} onChanged={refresh} />
            )}
        </div>
    );
}
