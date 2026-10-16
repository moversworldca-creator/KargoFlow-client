import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RolesPermissions from './RolesPermissions';
import {
  computePermissionDiffs,
  areGrantsEqual,
  resolvePermissionMeta,
} from './rolesPermissionsUtils';
import * as api from '../../../services/api';

const { mocks, state } = vi.hoisted(() => ({
  mocks: {
    showToast: vi.fn(),
  },
  state: {
    canManage: true,
  },
}));

vi.mock('../../../services/api');
vi.mock('../../../shared/auth/useCan', () => {
  const fn = () => ({ canAll: () => state.canManage });
  return { useCan: fn, default: fn };
});
vi.mock('../../../shared/context/ToastContext', () => {
  const fn = () => ({ showToast: mocks.showToast });
  return { useToast: fn, default: fn };
});

describe('RolesPermissions Helpers', () => {
  it('correctly calculates permission diffs for grants, revokes, and scope updates', () => {
    const current = new Map([
      ['perm.a', 'company'],
      ['perm.b', 'branch'],
      ['perm.c', 'own'],
    ]);

    const draft = new Map([
      ['perm.a', 'company'], // unchanged
      ['perm.b', 'company'], // scope changed
      ['perm.d', 'branch'],  // newly added
      // perm.c removed
    ]);

    const { toGrant, toRevoke } = computePermissionDiffs(current, draft);

    // toGrant: newly added perm.d, and new scope for perm.b
    expect(toGrant).toEqual([
      { permission_key: 'perm.b', scope: 'company' },
      { permission_key: 'perm.d', scope: 'branch' },
    ]);

    // toRevoke: removed perm.c, and old scope for perm.b
    expect(toRevoke).toEqual([
      { permission_key: 'perm.b', scope: 'branch' },
      { permission_key: 'perm.c', scope: 'own' },
    ]);
  });

  it('checks grant equality correctly', () => {
    const a = new Map([['p1', 'company'], ['p2', 'branch']]);
    const b = new Map([['p1', 'company'], ['p2', 'branch']]);
    const c = new Map([['p1', 'company'], ['p2', 'company']]);
    const d = new Map([['p1', 'company']]);

    expect(areGrantsEqual(a, b)).toBe(true);
    expect(areGrantsEqual(a, c)).toBe(false);
    expect(areGrantsEqual(a, d)).toBe(false);
  });

  it('resolves permission meta with allowed scopes fallback', () => {
    const permWithScopes = {
      permission_key: 'crm.leads.view',
      allowed_scopes: ['own', 'branch', 'company'],
      description: 'Can view leads',
    };
    const meta1 = resolvePermissionMeta(permWithScopes);
    expect(meta1.key).toBe('crm.leads.view');
    expect(meta1.allowedScopes).toEqual(['own', 'branch', 'company']);

    const permWithoutScopes = {
      permission_key: 'custom.perm',
      description: 'Custom permission',
    };
    const meta2 = resolvePermissionMeta(permWithoutScopes);
    expect(meta2.allowedScopes).toEqual(['company']);
    expect(meta2.module).toBe('Custom');
  });
});

describe('RolesPermissions Component', () => {

  const mockRoles = [
    {
      id: 1,
      name: 'System Administrator',
      description: 'Default admin role',
      is_system_role: true,
      is_active: true,
    },
    {
      id: 2,
      name: 'Sales Manager',
      description: 'Handles branch sales',
      is_system_role: false,
      is_active: true,
    },
    {
      id: 3,
      name: 'Legacy Rep',
      description: 'Archived role',
      is_system_role: false,
      is_active: false,
    },
  ];

  const mockPermissions = [
    {
      id: 101,
      permission_key: 'crm.leads.view',
      description: 'View Leads list',
      allowed_scopes: ['own', 'branch', 'company'],
      module: 'Leads',
    },
    {
      id: 102,
      permission_key: 'crm.leads.create',
      description: 'Create new leads',
      allowed_scopes: ['branch', 'company'],
      module: 'Leads',
    },
    {
      id: 103,
      permission_key: 'crm.settings.roles.manage',
      description: 'Manage roles and grants',
      allowed_scopes: ['company'],
      module: 'Settings',
    },
  ];

  const mockRole2Grants = [
    { permission_key: 'crm.leads.view', scope: 'branch' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    state.canManage = true;

    api.getRoles.mockResolvedValue(mockRoles);
    api.getPermissions.mockResolvedValue(mockPermissions);
    api.getRolePermissions.mockImplementation((roleId) => {
      if (roleId === 2) return Promise.resolve(mockRole2Grants);
      if (roleId === 1) {
        return Promise.resolve([
          { permission_key: 'crm.leads.view', scope: 'company' },
          { permission_key: 'crm.leads.create', scope: 'company' },
          { permission_key: 'crm.settings.roles.manage', scope: 'company' },
        ]);
      }
      return Promise.resolve([]);
    });

    api.grantRolePermission.mockResolvedValue({ id: 99 });
    api.revokeRolePermission.mockResolvedValue({});
    api.createRole.mockResolvedValue({ id: 4, name: 'New Role', is_system_role: false, is_active: true });
    api.updateRole.mockResolvedValue({ id: 2, name: 'Updated Sales Manager' });
    api.deactivateRole.mockResolvedValue({});
    api.reactivateRole.mockResolvedValue({});
  });

  it('loads roles, catalog, and selected role grants', async () => {
    render(<RolesPermissions />);

    // Waits for initial fetch
    const adminElements = await screen.findAllByText('System Administrator');
    expect(adminElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Sales Manager')).toBeInTheDocument();
    expect(screen.getByText('Legacy Rep')).toBeInTheDocument();

    // System Administrator is first role and selected by default
    await waitFor(() => {
      expect(api.getRolePermissions).toHaveBeenCalledWith(1);
    });

    // Check system badge
    expect(screen.getByText('System Role (Read-Only)')).toBeInTheDocument();
  });

  it('selects a custom role and displays scope selector and toggle states', async () => {
    render(<RolesPermissions />);

    expect(await screen.findByText('Sales Manager')).toBeInTheDocument();

    // Click on Sales Manager role
    fireEvent.click(screen.getByText('Sales Manager'));

    await waitFor(() => {
      expect(api.getRolePermissions).toHaveBeenCalledWith(2);
    });

    expect(screen.getByText('Custom Role')).toBeInTheDocument();

    // crm.leads.view should be granted with scope 'branch'
    const viewLeadsToggle = screen.getByLabelText(/Toggle permission View Leads/i);
    expect(viewLeadsToggle).toBeChecked();

    const scopeSelect = screen.getByLabelText(/Scope selector for View Leads/i);
    expect(scopeSelect).toHaveValue('branch');
    expect(scopeSelect).not.toBeDisabled();
  });

  it('changes permission scope and saves exact diffs successfully', async () => {
    render(<RolesPermissions />);

    expect(await screen.findByText('Sales Manager')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Sales Manager'));

    await waitFor(() => expect(api.getRolePermissions).toHaveBeenCalledWith(2));

    const scopeSelect = await screen.findByLabelText(/Scope selector for View Leads/i);
    // Change scope from branch to company
    fireEvent.change(scopeSelect, { target: { value: 'company' } });

    // Also grant crm.leads.create (currently not granted)
    const createToggle = screen.getByLabelText(/Toggle permission Create Leads/i);
    expect(createToggle).not.toBeChecked();
    fireEvent.click(createToggle);
    expect(createToggle).toBeChecked();

    // Dirty state banner should appear
    expect(screen.getByText(/You have unsaved changes to this role/i)).toBeInTheDocument();

    // Click Save Changes
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);

    // Verify diffs:
    // 1. revoke old scope for leads.view: { permission_key: 'crm.leads.view', scope: 'branch' }
    // 2. grant new scope for leads.view: { permission_key: 'crm.leads.view', scope: 'company' }
    // 3. grant new leads.create: { permission_key: 'crm.leads.create', scope: 'company' }
    await waitFor(() => {
      expect(api.revokeRolePermission).toHaveBeenCalledWith(2, {
        permission_key: 'crm.leads.view',
        scope: 'branch',
      });
      expect(api.grantRolePermission).toHaveBeenCalledWith(2, {
        permission_key: 'crm.leads.view',
        scope: 'company',
      });
      expect(api.grantRolePermission).toHaveBeenCalledWith(2, {
        permission_key: 'crm.leads.create',
        scope: 'company',
      });
    });

    expect(mocks.showToast).toHaveBeenCalledWith('Permissions updated successfully.', 'success');
  });

  it('surfaces error banner on partial failure and does not claim success', async () => {
    api.grantRolePermission.mockRejectedValueOnce(new Error('Permission quota exceeded'));

    render(<RolesPermissions />);
    fireEvent.click(await screen.findByText('Sales Manager'));
    await waitFor(() => expect(api.getRolePermissions).toHaveBeenCalledWith(2));

    // Grant crm.leads.create
    const createToggle = screen.getByLabelText(/Toggle permission Create Leads/i);
    fireEvent.click(createToggle);

    // Click Save Changes
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    // Should surface partial failure and reload grants
    await waitFor(() => {
      expect(screen.getByText(/Error Saving Permissions/i)).toBeInTheDocument();
      expect(screen.getByText(/Permission quota exceeded/i)).toBeInTheDocument();
    });

    expect(mocks.showToast).toHaveBeenCalledWith(
      'Partial failure saving permissions. Reloaded latest grants.',
      'error',
    );
    // Should NOT have called toast with success
    expect(mocks.showToast).not.toHaveBeenCalledWith(
      'Permissions updated successfully.',
      'success',
    );
  });

  it('disables mutation controls for system roles', async () => {
    render(<RolesPermissions />);

    // System Administrator is selected
    expect(await screen.findByText('System Role (Read-Only)')).toBeInTheDocument();

    // Checkboxes should be disabled
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((cb) => {
      expect(cb).toBeDisabled();
    });

    // Save Changes button or Edit Details should not be present
    expect(screen.queryByRole('button', { name: /Edit Details/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Deactivate Role/i })).not.toBeInTheDocument();
  });

  it('disables mutation controls when user lacks rbac manage permissions', async () => {
    state.canManage = false;
    render(<RolesPermissions />);

    expect(await screen.findByText('Read-only access')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /New Role/i })).not.toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((cb) => {
      expect(cb).toBeDisabled();
    });
  });

  it('supports role creation modal and updates role list', async () => {
    render(<RolesPermissions />);

    const newRoleBtn = await screen.findByRole('button', { name: /New Role/i });
    fireEvent.click(newRoleBtn);

    expect(screen.getByRole('dialog', { name: /Create Role/i })).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/Role Name/i);
    fireEvent.change(nameInput, { target: { value: 'Operations Lead' } });

    const descInput = screen.getByLabelText(/Description/i);
    fireEvent.change(descInput, { target: { value: 'Oversees logistics' } });

    const submitBtn = screen.getByRole('button', { name: /^Create Role$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.createRole).toHaveBeenCalledWith({
        name: 'Operations Lead',
        description: 'Oversees logistics',
      });
    });

    expect(mocks.showToast).toHaveBeenCalledWith('Role "Operations Lead" created.', 'success');
  });

  it('supports role deactivation and reactivation confirmation dialogs', async () => {
    render(<RolesPermissions />);

    // Select Sales Manager
    fireEvent.click(await screen.findByText('Sales Manager'));
    await waitFor(() => expect(api.getRolePermissions).toHaveBeenCalledWith(2));

    // Click Deactivate Role button
    const deactivateBtn = screen.getByRole('button', { name: /Deactivate Role/i });
    fireEvent.click(deactivateBtn);

    expect(screen.getByRole('dialog', { name: /Deactivate Role/i })).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to deactivate/i)).toBeInTheDocument();

    // Confirm deactivation
    const confirmBtn = screen.getByRole('button', { name: /^Deactivate$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.deactivateRole).toHaveBeenCalledWith(2);
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Role "Sales Manager" deactivated.', 'success');

    // Now select Legacy Rep (which is inactive)
    fireEvent.click(screen.getByText('Legacy Rep'));
    await waitFor(() => expect(api.getRolePermissions).toHaveBeenCalledWith(3));

    const reactivateBtn = screen.getByRole('button', { name: /Reactivate Role/i });
    fireEvent.click(reactivateBtn);

    expect(screen.getByRole('dialog', { name: /Reactivate Role/i })).toBeInTheDocument();
    const confirmReactivateBtn = screen.getByRole('button', { name: /^Reactivate$/i });
    fireEvent.click(confirmReactivateBtn);

    await waitFor(() => {
      expect(api.reactivateRole).toHaveBeenCalledWith(3);
    });
    expect(mocks.showToast).toHaveBeenCalledWith('Role "Legacy Rep" reactivated.', 'success');
  });

  it('exposes a retry button when loading grants fails', async () => {
    api.getRolePermissions.mockImplementation((roleId) => {
      if (roleId === 2) return Promise.reject(new Error('Network error'));
      return Promise.resolve([]);
    });

    render(<RolesPermissions />);

    fireEvent.click(await screen.findByText('Sales Manager'));

    expect(await screen.findByText(/Could not load permissions for this role/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /Retry/i });

    api.getRolePermissions.mockImplementation((roleId) => {
      if (roleId === 2) return Promise.resolve(mockRole2Grants);
      return Promise.resolve([]);
    });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(api.getRolePermissions).toHaveBeenCalledTimes(3);
    });
  });

  it('drops stale responses when user rapidly switches roles', async () => {
    let resolveRole2;
    api.getRolePermissions.mockImplementation((roleId) => {
      if (roleId === 2) {
        return new Promise((resolve) => {
          resolveRole2 = resolve;
        });
      }
      if (roleId === 3) {
        return Promise.resolve([{ permission_key: 'crm.settings.roles.manage', scope: 'company' }]);
      }
      return Promise.resolve([]);
    });

    render(<RolesPermissions />);
    await screen.findByText('Sales Manager');

    // Click Sales Manager (Role 2) - its promise is pending
    fireEvent.click(screen.getByText('Sales Manager'));

    // Rapidly click Legacy Rep (Role 3) - its promise resolves immediately
    fireEvent.click(screen.getByText('Legacy Rep'));
    await waitFor(() => {
      expect(screen.getByText('Legacy Rep', { selector: 'h3' })).toBeInTheDocument();
    });

    // Now resolve Role 2's slow request
    await act(async () => {
      resolveRole2([{ permission_key: 'crm.leads.view', scope: 'branch' }]);
    });

    // Role 3's grant (crm.settings.roles.manage) should remain active and not get replaced by Role 2
    await waitFor(() => {
      const toggle = screen.getByLabelText(/Toggle permission Manage roles and grants/i);
      expect(toggle).toBeChecked();
    });
  });

  it('prompts confirmation when switching roles with unsaved changes', async () => {
    render(<RolesPermissions />);

    fireEvent.click(await screen.findByText('Sales Manager'));
    await waitFor(() => expect(api.getRolePermissions).toHaveBeenCalledWith(2));

    // Toggle crm.leads.create to make state dirty
    const createToggle = screen.getByLabelText(/Toggle permission Create Leads/i);
    fireEvent.click(createToggle);
    expect(screen.getByText(/You have unsaved changes/i)).toBeInTheDocument();

    // Attempt to switch to Legacy Rep
    fireEvent.click(screen.getByText('Legacy Rep'));

    // Confirmation dialog should open
    expect(screen.getByRole('dialog', { name: /Unsaved Changes/i })).toBeInTheDocument();

    // Click Keep Editing
    fireEvent.click(screen.getByRole('button', { name: /Keep Editing/i }));
    expect(screen.queryByRole('dialog', { name: /Unsaved Changes/i })).not.toBeInTheDocument();
    expect(screen.getByText('Sales Manager', { selector: 'h3' })).toBeInTheDocument();

    // Attempt switch again and click Discard & Switch
    fireEvent.click(screen.getByText('Legacy Rep'));
    fireEvent.click(screen.getByRole('button', { name: /Discard & Switch/i }));

    // Now switched to Legacy Rep
    await waitFor(() => {
      expect(screen.getByText('Legacy Rep', { selector: 'h3' })).toBeInTheDocument();
    });
  });
});
