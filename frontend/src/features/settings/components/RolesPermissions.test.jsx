import React from 'react';
import { screen, waitFor, fireEvent, act, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RolesPermissions from './RolesPermissions';
import { computePermissionDiffs, areGrantsEqual, resolvePermissionMeta } from './rolesPermissionsUtils';
import * as api from '../../../services/api';
import { authMock, canMock, grant, renderWithProviders, session } from '../userManagement/__tests__/testUtils';

const { mocks } = vi.hoisted(() => ({ mocks: { showToast: vi.fn() } }));

vi.mock('../../../services/api');
vi.mock('../../../shared/auth/useCan', () => ({ default: () => canMock(), useCan: () => canMock() }));
vi.mock('../../auth/context/AuthContext', () => ({ useAuth: () => authMock() }));
vi.mock('../../../shared/context/ToastContext', () => {
  const fn = () => ({ showToast: mocks.showToast });
  return { useToast: fn, default: fn };
});

describe('RolesPermissions helpers', () => {
  it('calculates permission diffs for grants, revokes and scope changes', () => {
    const current = new Map([['perm.a', 'company'], ['perm.b', 'branch'], ['perm.c', 'own']]);
    const draft = new Map([['perm.a', 'company'], ['perm.b', 'company'], ['perm.d', 'branch']]);
    const { toGrant, toRevoke } = computePermissionDiffs(current, draft);
    expect(toGrant).toEqual([{ permission_key: 'perm.b', scope: 'company' }, { permission_key: 'perm.d', scope: 'branch' }]);
    expect(toRevoke).toEqual([{ permission_key: 'perm.b', scope: 'branch' }, { permission_key: 'perm.c', scope: 'own' }]);
  });

  it('checks grant equality', () => {
    const a = new Map([['p1', 'company'], ['p2', 'branch']]);
    expect(areGrantsEqual(a, new Map([['p1', 'company'], ['p2', 'branch']]))).toBe(true);
    expect(areGrantsEqual(a, new Map([['p1', 'company'], ['p2', 'company']]))).toBe(false);
    expect(areGrantsEqual(a, new Map([['p1', 'company']]))).toBe(false);
  });

  it('resolves readable meta from backend keys, with a company fallback scope', () => {
    const meta = resolvePermissionMeta({ permission_key: 'leads.view', allowed_scopes: ['company', 'own', 'branch'] });
    expect(meta.key).toBe('leads.view');
    expect(meta.allowedScopes).toEqual(['own', 'branch', 'company']);
    expect(meta.module).toContain('Leads');
    expect(resolvePermissionMeta({ permission_key: 'custom.perm' }).allowedScopes).toEqual(['company']);
  });
});

describe('RolesPermissions screen', () => {
  const ROLES = [
    { id: 1, name: 'Company Admin', description: 'Default admin role', is_system_role: true, is_active: true },
    { id: 2, name: 'Sales Manager', description: 'Handles branch sales', is_system_role: false, is_active: true },
    { id: 3, name: 'Legacy Rep', description: 'Archived role', is_system_role: false, is_active: false },
  ];
  const CATALOG = [
    { id: 101, permission_key: 'leads.view', allowed_scopes: ['own', 'branch', 'company'] },
    { id: 102, permission_key: 'leads.create', allowed_scopes: ['branch', 'company'] },
    { id: 103, permission_key: 'rbac_roles.manage', allowed_scopes: ['company'] },
  ];
  const ROLE2 = [{ permission_key: 'leads.view', scope: 'branch' }];
  const MANAGER = ['rbac_roles.view', 'rbac_roles.manage', 'rbac_roles.create', 'rbac_permissions.view'];

  const pick = async (name) => {
    // The role list entry (the heading on the right also carries the name).
    const entry = (await screen.findAllByText(name)).find((el) => el.tagName !== 'H3');
    fireEvent.click(entry);
    await waitFor(() => expect(screen.getByText(name, { selector: 'h3' })).toBeInTheDocument());
  };

  beforeEach(() => {
    vi.clearAllMocks();
    grant(...MANAGER);
    session.user = { id: 1, branch_details: [] };
    api.getRoles.mockResolvedValue(ROLES);
    api.getPermissions.mockResolvedValue(CATALOG);
    api.getRolePermissions.mockImplementation((id) => Promise.resolve(
      id === 2 ? ROLE2 : id === 1 ? CATALOG.map((p) => ({ permission_key: p.permission_key, scope: 'company' })) : [],
    ));
    api.getUsers.mockResolvedValue([]);
    api.getBranches.mockResolvedValue([]);
    api.getEntitlementSnapshot.mockResolvedValue({ access_mode: 'full', features: {} });
    api.grantRolePermission.mockResolvedValue({ id: 99 });
    api.revokeRolePermission.mockResolvedValue({});
    api.createRole.mockResolvedValue({ id: 4, name: 'Operations Lead', is_system_role: false, is_active: true });
    api.updateRole.mockResolvedValue({ id: 2, name: 'Sales Manager' });
    api.deactivateRole.mockResolvedValue({});
    api.reactivateRole.mockResolvedValue({});
  });

  it('loads roles and the first role; a system role is read-only', async () => {
    renderWithProviders(<RolesPermissions />);
    expect(await screen.findByText('System Role (Read-Only)')).toBeInTheDocument();
    expect(screen.getByText('Sales Manager')).toBeInTheDocument();
    expect(screen.getByText('Legacy Rep')).toBeInTheDocument();
    await waitFor(() => expect(api.getRolePermissions).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.getAllByRole('checkbox', { name: /Leads/ }).length).toBeGreaterThan(0));
    for (const box of screen.getAllByRole('checkbox', { name: /Leads|roles/i })) expect(box).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Edit Details/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Deactivate Role/i })).not.toBeInTheDocument();
    expect(screen.getByText(/one role per branch/i)).toBeInTheDocument();
  });

  it('shows a custom role\'s grants with their scope', async () => {
    renderWithProviders(<RolesPermissions />);
    await pick('Sales Manager');
    const view = await screen.findByRole('checkbox', { name: 'Leads → View' });
    expect(view).toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Scope for Leads → View' })).toHaveValue('branch');
    expect(screen.getByRole('checkbox', { name: 'Leads → Create' })).not.toBeChecked();
  });

  it('saves exactly the changed grants (scope change = revoke old + grant new)', async () => {
    renderWithProviders(<RolesPermissions />);
    await pick('Sales Manager');
    fireEvent.change(await screen.findByRole('combobox', { name: 'Scope for Leads → View' }), { target: { value: 'company' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Leads → Create' }));
    expect(screen.getByText(/unsaved changes to this role/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));
    await waitFor(() => {
      expect(api.revokeRolePermission).toHaveBeenCalledWith(2, { permission_key: 'leads.view', scope: 'branch' });
      expect(api.grantRolePermission).toHaveBeenCalledWith(2, { permission_key: 'leads.view', scope: 'company' });
      expect(api.grantRolePermission).toHaveBeenCalledWith(2, expect.objectContaining({ permission_key: 'leads.create' }));
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Permissions updated successfully.', 'success');
  });

  it('shows the backend detail on a partial failure and never claims success', async () => {
    api.grantRolePermission.mockRejectedValueOnce({ response: { status: 403, data: { error: 'access_denied', detail: 'You can only grant permissions you hold' } } });
    renderWithProviders(<RolesPermissions />);
    await pick('Sales Manager');
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Leads → Create' }));
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));
    expect(await screen.findByText(/Error Saving Permissions/i)).toBeInTheDocument();
    expect(screen.getByText(/You can only grant permissions you hold/)).toBeInTheDocument();
    expect(mocks.showToast).toHaveBeenCalledWith('Partial failure saving permissions. Reloaded latest grants.', 'error');
    expect(mocks.showToast).not.toHaveBeenCalledWith('Permissions updated successfully.', 'success');
  });

  it('without rbac_roles.manage everything is read-only; New Role needs rbac_roles.create', async () => {
    grant('rbac_roles.view', 'rbac_permissions.view', 'rbac_roles.create');
    const { unmount } = renderWithProviders(<RolesPermissions />);
    expect(await screen.findByText('Read-only access')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New Role/i })).toBeInTheDocument();
    await pick('Sales Manager');
    expect(await screen.findByRole('checkbox', { name: 'Leads → View' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Deactivate Role/i })).not.toBeInTheDocument();
    unmount();
    grant('rbac_roles.view', 'rbac_permissions.view', 'rbac_roles.manage');
    renderWithProviders(<RolesPermissions />);
    await screen.findByText('Sales Manager');
    expect(screen.queryByRole('button', { name: /New Role/i })).not.toBeInTheDocument();
  });

  it('says when the plan does not include custom roles, and hides New Role', async () => {
    grant(...MANAGER, 'entitlements.view');
    api.getEntitlementSnapshot.mockResolvedValue({ access_mode: 'full', features: { 'crm.custom_roles': 'read' } });
    renderWithProviders(<RolesPermissions />);
    expect(await screen.findByText(/plan does not include custom roles/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /New Role/i })).not.toBeInTheDocument();
  });

  it('a read-only subscription blocks every change', async () => {
    grant(...MANAGER, 'entitlements.view');
    api.getEntitlementSnapshot.mockResolvedValue({ access_mode: 'read_only', features: {} });
    renderWithProviders(<RolesPermissions />);
    expect(await screen.findByText(/subscription is read-only/i)).toBeInTheDocument();
    await pick('Sales Manager');
    expect(await screen.findByRole('checkbox', { name: 'Leads → View' })).toBeDisabled();
  });

  it('creates a role', async () => {
    renderWithProviders(<RolesPermissions />);
    fireEvent.click(await screen.findByRole('button', { name: /New Role/i }));
    fireEvent.change(screen.getByLabelText(/Role Name/i), { target: { value: 'Operations Lead' } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Oversees logistics' } });
    fireEvent.click(screen.getByRole('button', { name: /^Create Role$/i }));
    await waitFor(() => expect(api.createRole).toHaveBeenCalledWith({ name: 'Operations Lead', description: 'Oversees logistics' }));
    expect(mocks.showToast).toHaveBeenCalledWith('Role "Operations Lead" created.', 'success');
  });

  it('a refused role creation explains permission and plan', async () => {
    api.createRole.mockRejectedValue({ response: { status: 403, data: { error: 'access_denied', detail: 'This operation is not permitted.' } } });
    renderWithProviders(<RolesPermissions />);
    fireEvent.click(await screen.findByRole('button', { name: /New Role/i }));
    fireEvent.change(screen.getByLabelText(/Role Name/i), { target: { value: 'X role' } });
    fireEvent.click(screen.getByRole('button', { name: /^Create Role$/i }));
    await waitFor(() => expect(mocks.showToast).toHaveBeenCalledWith(expect.stringMatching(/rbac_roles\.create.*custom roles/), 'error'));
  });

  it('deactivates and reactivates after confirmation', async () => {
    renderWithProviders(<RolesPermissions />);
    await pick('Sales Manager');
    fireEvent.click(screen.getByRole('button', { name: /Deactivate Role/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Deactivate$/i }));
    await waitFor(() => expect(api.deactivateRole).toHaveBeenCalledWith(2));
    await pick('Legacy Rep');
    fireEvent.click(screen.getByRole('button', { name: /Reactivate Role/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Reactivate$/i }));
    await waitFor(() => expect(api.reactivateRole).toHaveBeenCalledWith(3));
  });

  it('offers retry when a role\'s grants fail to load', async () => {
    api.getRolePermissions.mockImplementation((id) => (id === 2 ? Promise.reject(new Error('Network error')) : Promise.resolve([])));
    renderWithProviders(<RolesPermissions />);
    await pick('Sales Manager');
    const retry = await screen.findByRole('button', { name: /Retry/i });
    api.getRolePermissions.mockImplementation((id) => Promise.resolve(id === 2 ? ROLE2 : []));
    fireEvent.click(retry);
    expect(await screen.findByRole('checkbox', { name: 'Leads → View' })).toBeChecked();
  });

  it('ignores a slow response for a role the user already left', async () => {
    let resolveRole2;
    api.getRolePermissions.mockImplementation((id) => {
      if (id === 2) return new Promise((resolve) => { resolveRole2 = resolve; });
      if (id === 3) return Promise.resolve([{ permission_key: 'rbac_roles.manage', scope: 'company' }]);
      return Promise.resolve([]);
    });
    renderWithProviders(<RolesPermissions />);
    await screen.findByText('Sales Manager');
    fireEvent.click(screen.getByText('Sales Manager'));
    await pick('Legacy Rep');
    await act(async () => { resolveRole2([{ permission_key: 'leads.view', scope: 'branch' }]); });
    expect(await screen.findByRole('checkbox', { name: /Roles.*Manage|Manage/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Leads → View' })).not.toBeChecked();
  });

  it('asks before discarding unsaved changes when switching roles', async () => {
    renderWithProviders(<RolesPermissions />);
    await pick('Sales Manager');
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Leads → Create' }));
    fireEvent.click(screen.getByText('Legacy Rep'));
    const dialog = screen.getByRole('dialog', { name: /Unsaved Changes/i });
    fireEvent.click(within(dialog).getByRole('button', { name: /Keep Editing/i }));
    expect(screen.getByText('Sales Manager', { selector: 'h3' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('Legacy Rep'));
    fireEvent.click(screen.getByRole('button', { name: /Discard & Switch/i }));
    await waitFor(() => expect(screen.getByText('Legacy Rep', { selector: 'h3' })).toBeInTheDocument());
  });

  it('People tab: gives the role to members of a chosen branch', async () => {
    grant(...MANAGER, 'users.view', 'users.assign_role', 'branches.view');
    api.getBranches.mockResolvedValue([{ id: 3, name: 'Toronto', is_active: true }, { id: 4, name: 'Ottawa', is_active: true }]);
    api.getUsers.mockResolvedValue([
      { id: 21, first_name: 'Ada', last_name: 'Active', email: 'ada@x.test', is_active: true,
        branch_details: [{ branch_id: 3, name: 'Toronto', is_active: true }],
        role_details: [{ id: 2, name: 'Sales Manager', branch_id: 3, branch_name: 'Toronto' }] },
      { id: 22, first_name: 'Ben', last_name: 'Branch', email: 'ben@x.test', is_active: true,
        branch_details: [{ branch_id: 3, name: 'Toronto', is_active: true }, { branch_id: 4, name: 'Ottawa', is_active: true }],
        role_details: [{ id: 9, name: 'Dispatcher', branch_id: 4, branch_name: 'Ottawa' }] },
    ]);
    api.assignUserRole.mockResolvedValue(undefined);
    api.unassignUserRole.mockResolvedValue(undefined);
    renderWithProviders(<RolesPermissions />);
    await pick('Sales Manager');
    fireEvent.click(screen.getByRole('tab', { name: 'People' }));
    expect(await screen.findByText('1 person has this role')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Branch for this role' }), { target: { value: '4' } });
    // Only Ben is a member of Ottawa; giving it there replaces his Dispatcher role.
    expect(screen.getByText('replaces Dispatcher here')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Ada Active/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /Ben Branch/ }));
    fireEvent.click(screen.getByRole('button', { name: /Give role to 1 person/i }));
    await waitFor(() => expect(api.assignUserRole).toHaveBeenCalledWith({ user_id: 22, role_id: 2, branch_id: 4 }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Sales Manager from Ada Active in Toronto' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(api.unassignUserRole).toHaveBeenCalledWith({ user_id: 21, role_id: 2, branch_id: 3 }));
  });
});
