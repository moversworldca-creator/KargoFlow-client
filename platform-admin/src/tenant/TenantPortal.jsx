import React, { useState } from 'react';
import { NavLink, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, CircleAlert, DoorOpen, Loader2, LogOut, Plus, Settings2, ShieldCheck, Users } from 'lucide-react';
import { useTenantAuth } from '../auth/TenantAuthContext';
import tenantApi from '../api/tenantApi';
import TenantLoginPage from './TenantLoginPage';

const nav = [
  { to: '/tenant', label: 'Overview', icon: Building2, end: true },
  { to: '/tenant/company', label: 'Company settings', icon: Settings2 },
  { to: '/tenant/branches', label: 'Branches', icon: DoorOpen },
  { to: '/tenant/people', label: 'Employees & users', icon: Users },
  { to: '/tenant/access', label: 'Roles & permissions', icon: ShieldCheck },
];

function Loading() { return <div className="flex items-center gap-2 py-10 text-sm text-slate-500"><Loader2 size={17} className="animate-spin" />Loading workspace data...</div>; }
function ErrorMessage({ error }) { return error ? <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-rose-700"><CircleAlert size={16} className="mt-0.5 shrink-0" />{error?.response?.data?.detail || error?.response?.data?.error || error?.message || 'The request failed.'}</p> : null; }
function useTenantData(key, fn, enabled = true) { return useQuery({ queryKey: ['tenant', key], queryFn: fn, enabled }); }
function useRefresh() { const client = useQueryClient(); return () => client.invalidateQueries({ queryKey: ['tenant'] }); }
function SectionTitle({ title, detail, action }) { return <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-xl font-semibold">{title}</h1>{detail && <p className="mt-1 text-sm text-slate-500">{detail}</p>}</div>{action}</div>; }

function OverviewPage() {
  const company = useTenantData('company', tenantApi.company);
  const branches = useTenantData('branches', tenantApi.branches);
  const employees = useTenantData('employees', tenantApi.employees);
  const users = useTenantData('users', tenantApi.users);
  const isLoading = company.isLoading || branches.isLoading || employees.isLoading || users.isLoading;
  const name = company.data?.[0]?.name || company.data?.name || 'Your company';
  if (isLoading) return <Loading />;
  return <><SectionTitle title="Company overview" detail={name} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['Branches', branches.data?.length || 0], ['Employees', employees.data?.results?.length ?? employees.data?.length ?? 0], ['Login users', users.data?.length || 0], ['Active branches', (branches.data || []).filter((b) => b.is_active !== false).length]].map(([label, value]) => <div key={label} className="border-y border-slate-200 py-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p></div>)}</div><div className="mt-8 border-t border-slate-200 pt-5"><h2 className="text-sm font-semibold">Branches</h2><div className="mt-3 divide-y divide-slate-200">{(branches.data || []).slice(0, 5).map((branch) => <div key={branch.id} className="flex items-center justify-between py-3 text-sm"><span className="font-medium">{branch.name}</span><span className="text-slate-500">{branch.is_main ? 'Main branch' : branch.is_active === false ? 'Inactive' : 'Active'}</span></div>)}</div></div></>;
}

function CompanySettingsPage() {
  const settings = useTenantData('company-settings', tenantApi.companySettings);
  const refresh = useRefresh();
  const [values, setValues] = useState(null);
  const [error, setError] = useState(null);
  const record = settings.data;
  const initialValues = record?.values || {};
  const current = values || initialValues;
  const mutation = useMutation({ mutationFn: () => tenantApi.saveCompanySettings(record?.company_id, Object.fromEntries(Object.entries(current).filter(([key]) => ['deposit_enabled', 'default_deposit_pct', 'allow_booking_without_deposit', 'sales_tax_rate'].includes(key)))), onSuccess: () => { setError(null); refresh(); }, onError: setError });
  if (settings.isLoading) return <Loading />;
  if (settings.isError) return <ErrorMessage error={settings.error} />;
  const entries = Object.entries(current);
  return <><SectionTitle title="Company settings" detail="Defaults inherited by branches unless a branch has an override." action={<button disabled={mutation.isPending || !entries.some(([key]) => ['deposit_enabled', 'default_deposit_pct', 'allow_booking_without_deposit', 'sales_tax_rate'].includes(key))} onClick={() => mutation.mutate()} className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{mutation.isPending ? 'Saving...' : 'Save changes'}</button>} /><ErrorMessage error={error} />{!entries.length ? <p className="text-sm text-slate-500">No configurable company settings were returned.</p> : <div className="divide-y divide-slate-200 border-y border-slate-200">{entries.map(([key, value]) => { const editable = ['deposit_enabled', 'default_deposit_pct', 'allow_booking_without_deposit', 'sales_tax_rate'].includes(key); return <SettingField key={key} settingKey={key} value={value} onChange={(next) => setValues((prev) => ({ ...(prev || initialValues), [key]: next }))} readOnly={!editable} />; })}</div>}</>;
}

function SettingField({ settingKey, value, onChange, inherited = false, onReset, readOnly = false }) {
  const label = settingKey.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  const inputType = typeof value === 'boolean' ? 'checkbox' : typeof value === 'number' ? 'number' : 'text';
  return <div className="grid gap-2 py-3 sm:grid-cols-[minmax(180px,1fr)_minmax(220px,2fr)_auto] sm:items-center"><div><label className="text-sm font-medium" htmlFor={`setting-${settingKey}`}>{label}</label>{inherited && <p className="text-xs text-slate-500">Inherited from company</p>}</div><div>{inputType === 'checkbox' ? <input id={`setting-${settingKey}`} type="checkbox" checked={Boolean(value)} disabled={readOnly} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-emerald-700" /> : <input id={`setting-${settingKey}`} type={inputType} value={value ?? ''} readOnly={readOnly} onChange={(event) => onChange(inputType === 'number' ? Number(event.target.value) : event.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none read-only:bg-slate-50 read-only:text-slate-500 focus:border-emerald-700" />}</div>{onReset && <button type="button" onClick={onReset} className="text-xs font-medium text-slate-600 underline decoration-slate-300 underline-offset-4">Reset override</button>}</div>;
}

function BranchesPage() {
  const query = useTenantData('branches', tenantApi.branches);
  const refresh = useRefresh();
  const [newBranch, setNewBranch] = useState('');
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [branchValues, setBranchValues] = useState(null);
  const detail = useTenantData(`branch-settings-${selected}`, () => tenantApi.branchSettings(selected));
  const mutation = useMutation({ mutationFn: ({ id, action }) => tenantApi.branchAction(id, action, { reason: 'Updated from tenant administration' }), onSuccess: refresh, onError: setError });
  const create = useMutation({ mutationFn: () => tenantApi.createBranch({ name: newBranch.trim() }), onSuccess: () => { setNewBranch(''); setError(null); refresh(); }, onError: setError });
  const effectiveSettings = detail.data?.settings || {};
  const save = useMutation({ mutationFn: () => tenantApi.saveBranchSettings(selected, branchValues || Object.fromEntries(Object.entries(effectiveSettings).filter(([, item]) => item.source !== 'resolved').map(([key, item]) => [key, item.value]))), onSuccess: refresh, onError: setError });
  const reset = useMutation({ mutationFn: (key) => tenantApi.resetBranchSetting(selected, key), onSuccess: () => { setBranchValues(null); refresh(); }, onError: setError });
  if (query.isLoading) return <Loading />;
  return <><SectionTitle title="Branches" detail="Manage locations and branch specific settings." /><ErrorMessage error={error || query.error} /><form className="mb-5 flex max-w-xl gap-2" onSubmit={(event) => { event.preventDefault(); if (newBranch.trim()) create.mutate(); }}><input value={newBranch} onChange={(event) => setNewBranch(event.target.value)} placeholder="New branch name" className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" /><button disabled={!newBranch.trim() || create.isPending} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50"><Plus size={16} />Add branch</button></form><div className="divide-y divide-slate-200 border-y border-slate-200">{(query.data || []).map((branch) => <div key={branch.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{branch.name} {branch.is_main && <span className="ml-1 text-xs font-normal text-emerald-700">Main</span>}</p><p className="mt-0.5 text-xs text-slate-500">{branch.is_active === false ? 'Inactive' : 'Active'} · ID {branch.id}</p></div><div className="flex items-center gap-2"><button onClick={() => { setSelected(branch.id); setBranchValues(null); }} className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium">Settings</button>{branch.is_active === false ? <button onClick={() => mutation.mutate({ id: branch.id, action: 'activate' })} className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs">Activate</button> : <button disabled={branch.is_main} onClick={() => mutation.mutate({ id: branch.id, action: 'deactivate' })} className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs disabled:opacity-40">Deactivate</button>}{!branch.is_main && branch.is_active !== false && <button onClick={() => mutation.mutate({ id: branch.id, action: 'make-main' })} className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs">Make main</button>}</div></div>)}</div>{selected && <div className="mt-7 border-t border-slate-200 pt-5"><SectionTitle title={`Branch settings · ${selected}`} action={<button onClick={() => save.mutate()} disabled={save.isPending || !detail.data} className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Save changes</button>} />{detail.isLoading ? <Loading /> : detail.isError ? <ErrorMessage error={detail.error} /> : <div className="divide-y divide-slate-200">{Object.entries(effectiveSettings).filter(([, item]) => item.source !== 'resolved').map(([key, item]) => <SettingField key={key} settingKey={key} value={branchValues?.[key] ?? item.value} inherited={item.source === 'inherited'} onChange={(next) => setBranchValues((prev) => ({ ...(prev || Object.fromEntries(Object.entries(effectiveSettings).filter(([, setting]) => setting.source !== 'resolved').map(([name, setting]) => [name, setting.value]))), [key]: next }))} onReset={item.source === 'overridden' ? () => reset.mutate(key) : null} />)}</div>}</div>}</>;
}

function PeoplePage() {
  const employees = useTenantData('employees', tenantApi.employees);
  const users = useTenantData('users', tenantApi.users);
  const branches = useTenantData('branches', tenantApi.branches);
  const invitations = useTenantData('invitations', tenantApi.invitations);
  const refresh = useRefresh();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', worker_type: 'office', primary_branch_id: '' });
  const [error, setError] = useState(null);
  const create = useMutation({ mutationFn: () => tenantApi.createEmployee({ ...form, primary_branch_id: Number(form.primary_branch_id) }), onSuccess: () => { setForm({ first_name: '', last_name: '', email: '', worker_type: 'office', primary_branch_id: '' }); setError(null); refresh(); }, onError: setError });
  const invite = useMutation({ mutationFn: ({ id, email }) => tenantApi.inviteEmployee(id, email), onSuccess: refresh, onError: setError });
  const userAction = useMutation({ mutationFn: ({ id, action }) => tenantApi.userAction(id, action), onSuccess: refresh, onError: setError });
  const membership = useMutation({ mutationFn: ({ userId, branchId, remove }) => remove ? tenantApi.removeUserBranch(userId, branchId) : tenantApi.addUserBranch(userId, branchId), onSuccess: refresh, onError: setError });
  const revoke = useMutation({ mutationFn: tenantApi.revokeInvitation, onSuccess: refresh, onError: setError });
  if (employees.isLoading || users.isLoading || branches.isLoading || invitations.isLoading) return <Loading />;
  const employeeList = employees.data?.results || employees.data || [];
  const activeBranches = (branches.data || []).filter((branch) => branch.is_active);
  return (
    <>
      <SectionTitle title="Employees & users" detail="Create the employee at a branch, then invite them to activate a login." />
      <ErrorMessage error={error} />
      {!activeBranches.length && <p className="mb-3 text-sm text-amber-800">Create and activate a branch before adding a branch employee.</p>}
      <form onSubmit={(event) => { event.preventDefault(); create.mutate(); }} className="grid gap-2 border-y border-slate-200 py-4 sm:grid-cols-2 xl:grid-cols-6">
        <input aria-label="First name" required placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <input aria-label="Last name" required placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <input aria-label="Email" type="email" required placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <select aria-label="Worker type" value={form.worker_type} onChange={(e) => setForm({ ...form, worker_type: e.target.value })} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"><option value="office">Office</option><option value="crew">Crew</option><option value="hybrid">Hybrid</option><option value="owner">Owner</option><option value="contractor">Contractor</option><option value="seasonal">Seasonal</option><option value="service">Service</option></select>
        <select aria-label="Primary branch" required value={form.primary_branch_id} onChange={(e) => setForm({ ...form, primary_branch_id: e.target.value })} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Primary branch</option>{activeBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
        <button disabled={create.isPending || !form.primary_branch_id} className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Add employee</button>
      </form>
      <h2 className="mt-6 text-sm font-semibold">Employees</h2>
      <div className="mt-2 divide-y divide-slate-200">{employeeList.map((person) => <div key={person.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{[person.first_name, person.last_name].filter(Boolean).join(' ') || `Employee ${person.id}`}</p><p className="text-xs text-slate-500">{person.email || 'No email'} · {person.employment_status || 'active'} · {activeBranches.find((branch) => branch.id === person.primary_branch_id)?.name || 'No primary branch'}</p></div>{person.email && !person.has_login && <button disabled={invite.isPending} onClick={() => invite.mutate({ id: person.id, email: person.email })} className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium">Invite to sign in</button>}</div>)}</div>
      <h2 className="mt-7 border-t border-slate-200 pt-5 text-sm font-semibold">Login users</h2>
      <div className="divide-y divide-slate-200">{(users.data || []).map((user) => <TenantUserRow key={user.id} user={user} branches={branches.data || []} onMembership={(branchId, remove) => membership.mutate({ userId: user.id, branchId, remove })} onToggle={() => userAction.mutate({ id: user.id, action: user.is_active === false ? 'reactivate' : 'deactivate' })} busy={membership.isPending || userAction.isPending} />)}</div>
      <h2 className="mt-7 border-t border-slate-200 pt-5 text-sm font-semibold">Invitations</h2>
      <div className="divide-y divide-slate-200">{(invitations.data || []).map((item) => <div key={item.id} className="flex justify-between gap-3 py-3 text-sm"><span>{item.email}</span><span className="flex items-center gap-3 text-slate-500">{item.status || 'Pending'}{(item.status || 'pending') === 'pending' && <button onClick={() => revoke.mutate(item.id)} className="text-xs font-medium text-slate-700 underline">Revoke</button>}</span></div>)}</div>
    </>
  );
}

function TenantUserRow({ user, branches, onMembership, onToggle, busy }) {
  const memberships = useTenantData(`user-branches-${user.id}`, () => tenantApi.userBranches(user.id));
  const current = memberships.data || [];
  const branchIds = new Set(current.map((item) => Number(item.branch_id ?? item.id)));
  const options = branches.filter((branch) => !branchIds.has(Number(branch.id)));
  return <div className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{[user.first_name, user.last_name].filter(Boolean).join(' ') || user.email}</p><p className="text-xs text-slate-500">{user.email}{user.is_active === false ? ' · Inactive' : ''}</p><div className="mt-2 flex flex-wrap gap-1.5">{current.map((branch) => { const id = Number(branch.branch_id ?? branch.id); return <button key={id} disabled={busy} onClick={() => onMembership(id, true)} title="Remove branch access" className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600">{branch.name || branches.find((item) => Number(item.id) === id)?.name || `Branch ${id}`} ×</button>; })}<select aria-label={`Add branch access for ${user.email}`} value="" disabled={busy || !options.length} onChange={(event) => onMembership(Number(event.target.value), false)} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"><option value="">Add branch access</option>{options.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></div></div><button disabled={busy} onClick={onToggle} className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs">{user.is_active === false ? 'Reactivate' : 'Deactivate'}</button></div>;
}

function AccessPage() {
  const roles = useTenantData('roles', tenantApi.roles);
  const permissions = useTenantData('permissions', tenantApi.permissions);
  const users = useTenantData('users', tenantApi.users);
  const company = useTenantData('company', tenantApi.company);
  const refresh = useRefresh();
  const [selectedRole, setSelectedRole] = useState('');
  const [newRole, setNewRole] = useState('');
  const [permissionScope, setPermissionScope] = useState('company');
  const [error, setError] = useState(null);
  const roleId = selectedRole || roles.data?.[0]?.id;
  const currentRole = (roles.data || []).find((role) => String(role.id) === String(roleId));
  const assigned = useTenantData(`role-permissions-${roleId}`, () => tenantApi.rolePermissions(roleId), Boolean(roleId));
  const create = useMutation({ mutationFn: () => tenantApi.createRole({ name: newRole.trim() }), onSuccess: () => { setNewRole(''); refresh(); }, onError: setError });
  const grant = useMutation({ mutationFn: (payload) => tenantApi.grantRolePermission(roleId, payload), onSuccess: refresh, onError: setError });
  const revoke = useMutation({ mutationFn: (payload) => tenantApi.revokeRolePermission(roleId, payload), onSuccess: refresh, onError: setError });
  const assign = useMutation({ mutationFn: (payload) => tenantApi.assignRole(payload), onSuccess: refresh, onError: setError });
  if (roles.isLoading || permissions.isLoading || users.isLoading || company.isLoading) return <Loading />;
  const granted = assigned.data || [];
  const grantedSet = new Set(granted.map((row) => `${row.permission_key}:${row.scope}`));
  return <>
    <SectionTitle title="Roles & permissions" detail="Review access by role and scope. The API remains authoritative for every action." />
    <ErrorMessage error={error} />
    {currentRole?.is_system_role && <p className="mb-3 text-xs text-slate-500">System role permissions are managed by the platform.</p>}
    <div className="flex flex-wrap gap-2 border-y border-slate-200 py-4">
      <select aria-label="Role" value={roleId || ''} onChange={(e) => setSelectedRole(e.target.value)} className="min-w-48 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">{(roles.data || []).map((role) => <option key={role.id} value={role.id}>{role.name}{role.is_system_role ? ' · system' : ''}</option>)}</select>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newRole.trim()) create.mutate(); }}><input aria-label="New role name" value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="Custom role name" className="w-48 rounded-md border border-slate-300 px-3 py-2 text-sm" /><button disabled={create.isPending || !newRole.trim()} className="rounded-md border border-slate-300 px-3 py-2 text-sm">Create role</button></form>
      <select aria-label="Permission scope" value={permissionScope} onChange={(e) => setPermissionScope(e.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"><option value="own">Own scope</option><option value="assigned">Assigned scope</option><option value="branch">Branch scope</option><option value="company">Company scope</option></select>
    </div>
    <div className="mt-5 grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.65fr)]">
      <section><h2 className="mb-2 text-sm font-semibold">Permission catalog</h2><div className="max-h-[560px] divide-y divide-slate-200 overflow-auto border-y border-slate-200">{(permissions.data || []).map((permission) => { const key = permission.permission_key; const tuple = `${key}:${permissionScope}`; const hasIt = grantedSet.has(tuple); return <label key={key} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span><span className="font-medium">{key}</span><span className="ml-2 text-xs text-slate-500">{permission.description || ''}</span></span><input aria-label={`${hasIt ? 'Remove' : 'Grant'} ${key} at ${permissionScope} scope`} type="checkbox" checked={hasIt} disabled={currentRole?.is_system_role} onChange={() => (hasIt ? revoke : grant).mutate({ permission_key: key, scope: permissionScope })} className="h-4 w-4 shrink-0 accent-emerald-700" /></label>; })}</div></section>
      <section><h2 className="mb-2 text-sm font-semibold">User role assignment</h2><div className="divide-y divide-slate-200 border-y border-slate-200">{(users.data || []).map((user) => <RoleAssignmentRow key={user.id} user={user} roles={roles.data || []} companyId={company.data?.[0]?.id} onAssign={(payload) => assign.mutate(payload)} />)}</div></section>
    </div>
  </>;
}

function RoleAssignmentRow({ user, roles, companyId, onAssign }) {
  const access = useTenantData(`user-access-${user.id}`, () => tenantApi.userAccess(user.id));
  return <div className="py-3"><div className="flex items-center justify-between gap-2"><span className="min-w-0 truncate text-sm">{[user.first_name, user.last_name].filter(Boolean).join(' ') || user.email}</span><select aria-label={`Assign role to ${user.email}`} value="" onChange={(e) => onAssign({ company_id: companyId, user_id: user.id, role_id: Number(e.target.value) })} className="max-w-40 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs"><option value="" disabled>Assign role</option>{roles.filter((role) => role.is_active).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></div><div className="mt-1 flex flex-wrap gap-1 text-xs text-slate-500">{access.isLoading ? 'Loading assigned roles...' : access.data?.roles?.length ? access.data.roles.map((role) => <span key={role.id} className="rounded bg-slate-100 px-1.5 py-0.5">{role.name}</span>) : 'No roles assigned'}</div></div>;
}

function TenantShell() {
  const { user, logout } = useTenantAuth();
  const navigate = useNavigate();
  return <div className="min-h-screen bg-white text-slate-900"><header className="flex h-14 items-center justify-between border-b border-slate-200 px-4 sm:px-7"><NavLink to="/tenant" className="flex items-center gap-2 font-semibold"><span className="grid h-8 w-8 place-items-center rounded-md bg-emerald-700 text-white"><Building2 size={17} /></span>KargoFlow <span className="hidden text-sm font-normal text-slate-500 sm:inline">Company admin</span></NavLink><div className="flex items-center gap-3"><span className="hidden max-w-56 truncate text-sm text-slate-600 sm:block">{user?.email}</span><button title="Sign out" onClick={async () => { await logout(); navigate('/tenant/login'); }} className="grid h-9 w-9 place-items-center rounded-md text-slate-600 hover:bg-slate-100"><LogOut size={17} /></button></div></header><div className="mx-auto grid max-w-[1440px] md:grid-cols-[220px_minmax(0,1fr)]"><aside className="border-b border-slate-200 p-3 md:min-h-[calc(100vh-56px)] md:border-b-0 md:border-r md:p-4"><nav className="flex gap-1 overflow-x-auto md:flex-col">{nav.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm ${isActive ? 'bg-emerald-50 font-semibold text-emerald-800' : 'text-slate-600 hover:bg-slate-50'}`}><Icon size={16} />{label}</NavLink>)}</nav></aside><main className="min-w-0 p-4 sm:p-7"><Outlet /></main></div></div>;
}

function TenantGuard() {
  const { isLoading, isAuthenticated } = useTenantAuth();
  if (isLoading) return <div className="grid min-h-screen place-items-center text-sm text-slate-500"><span className="flex items-center gap-2"><Loader2 size={18} className="animate-spin" />Restoring tenant session...</span></div>;
  if (!isAuthenticated) return <Navigate to="/tenant/login" replace />;
  return <Outlet />;
}

export default function TenantPortal() {
  return <Routes><Route path="login" element={<TenantLoginPage />} /><Route path="accept-invitation" element={<TenantLoginPage />} /><Route element={<TenantGuard />}><Route element={<TenantShell />}><Route index element={<OverviewPage />} /><Route path="company" element={<CompanySettingsPage />} /><Route path="branches" element={<BranchesPage />} /><Route path="people" element={<PeoplePage />} /><Route path="access" element={<AccessPage />} /><Route path="*" element={<Navigate to="/tenant" replace />} /></Route></Route></Routes>;
}
