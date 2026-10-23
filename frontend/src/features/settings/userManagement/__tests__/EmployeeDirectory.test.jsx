import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../../../services/api';
import EmployeeDirectory from '../EmployeeDirectory';
import { authMock, canMock, grant, renderWithProviders, session } from './testUtils';

vi.mock('../../../../services/api', () => ({
  getEmployees: vi.fn(), getUsers: vi.fn(), getEmployeeInvitations: vi.fn(), getRoles: vi.fn(), getPermissions: vi.fn(),
  getBranches: vi.fn(), getEntitlementSnapshot: vi.fn(), getUserAccess: vi.fn(), getUserOverrides: vi.fn(), getRolePermissions: vi.fn(),
  createEmployee: vi.fn(), updateEmployee: vi.fn(), inviteEmployee: vi.fn(), terminateEmployee: vi.fn(), rehireEmployee: vi.fn(),
  revokeEmployeeInvitation: vi.fn(), deactivateUser: vi.fn(), reactivateUser: vi.fn(), addUserBranch: vi.fn(), removeUserBranch: vi.fn(),
  assignUserRole: vi.fn(), unassignUserRole: vi.fn(), createUserOverride: vi.fn(), revokeUserOverride: vi.fn(), explainAccess: vi.fn(),
  setEmployeeTemporaryPassword: vi.fn(),
}));
vi.mock('../../../../shared/auth/useCan', () => ({ default: () => canMock(), useCan: () => canMock() }));
vi.mock('../../../auth/context/AuthContext', () => ({ useAuth: () => authMock() }));

const EMPLOYEES = [
  { id: 10, user_id: null, first_name: 'Nolan', last_name: 'Login', email: 'nolan@x.test', employment_status: 'active', worker_type: 'crew', primary_branch_id: 3, rehire_eligible: true },
  { id: 11, user_id: 21, first_name: 'Ada', last_name: 'Active', email: 'ada@x.test', employment_status: 'active', worker_type: 'office', primary_branch_id: 3, rehire_eligible: true },
  { id: 12, user_id: 22, first_name: 'Dee', last_name: 'Disabled', email: 'dee@x.test', employment_status: 'on_leave', worker_type: 'office', primary_branch_id: null, rehire_eligible: true },
  { id: 13, user_id: null, first_name: 'Tess', last_name: 'Terminated', email: 'tess@x.test', employment_status: 'terminated', worker_type: 'crew', primary_branch_id: 3, rehire_eligible: true },
];

beforeEach(() => {
  vi.clearAllMocks();
  session.user = { id: 1, branch_details: [] };
  api.getEmployees.mockResolvedValue({ count: EMPLOYEES.length, results: EMPLOYEES });
  api.getUsers.mockResolvedValue([
    { id: 21, is_active: true, role_details: [{ id: 5, name: 'Salesperson', branch_id: 3, branch_name: 'Toronto' }] },
    { id: 22, is_active: false, role_details: [] },
  ]);
  api.getEmployeeInvitations.mockResolvedValue([]);
  api.getRoles.mockResolvedValue([]);
  api.getPermissions.mockResolvedValue([]);
  api.getBranches.mockResolvedValue([{ id: 3, name: 'Toronto', is_active: true }, { id: 4, name: 'Closed', is_active: false }]);
  api.getEntitlementSnapshot.mockResolvedValue({ access_mode: 'full', features: {} });
});

const row = async (name) => (await screen.findByText(name)).closest('tr');

describe('page access', () => {
  it('without employees.view the directory is not loaded and access is explained', async () => {
    grant('users.view');
    renderWithProviders(<EmployeeDirectory />);
    expect(screen.getByText('Team members are not available')).toBeInTheDocument();
    expect(api.getEmployees).not.toHaveBeenCalled();
  });

  it('while loading shows a loading state, never an empty "no employees" message', async () => {
    grant('employees.view');
    let resolve;
    api.getEmployees.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderWithProviders(<EmployeeDirectory />);
    expect(screen.getByText('Loading employees…')).toBeInTheDocument();
    expect(screen.queryByText('No employees yet.')).not.toBeInTheDocument();
    resolve({ count: 0, results: [] });
    expect(await screen.findByText('No employees yet.')).toBeInTheDocument();
  });

  it('a 403 from the list is shown as access denied, not as an error crash', async () => {
    grant('employees.view');
    api.getEmployees.mockRejectedValue({ response: { status: 403, data: { detail: 'Company-scope grant required.' } } });
    renderWithProviders(<EmployeeDirectory />);
    expect(await screen.findByText('Company-scope grant required.')).toBeInTheDocument();
  });
});

describe('what each permission shows', () => {
  it('view only: list and statuses, no create/edit/terminate/invite', async () => {
    grant('employees.view', 'users.view');
    renderWithProviders(<EmployeeDirectory />);
    expect(within(await row('Nolan Login')).getByText('No login')).toBeInTheDocument();
    expect(within(await row('Ada Active')).getByText('Login active')).toBeInTheDocument();
    expect(within(await row('Dee Disabled')).getByText('Login disabled')).toBeInTheDocument();
    expect(within(await row('Dee Disabled')).getByText('On leave')).toBeInTheDocument();
    expect(within(await row('Tess Terminated')).getByText('Terminated')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add employee/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Terminate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /give login access/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rehire' })).not.toBeInTheDocument();
  });

  it('employees.manage: create, edit, terminate active, rehire terminated', async () => {
    grant('employees.view', 'employees.manage');
    renderWithProviders(<EmployeeDirectory />);
    expect(await screen.findByRole('button', { name: /add employee/i })).toBeInTheDocument();
    const active = await row('Ada Active');
    expect(within(active).getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(within(active).getByRole('button', { name: 'Terminate' })).toBeInTheDocument();
    const terminated = await row('Tess Terminated');
    expect(within(terminated).getByRole('button', { name: 'Rehire' })).toBeInTheDocument();
    expect(within(terminated).queryByRole('button', { name: 'Terminate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /give login access/i })).not.toBeInTheDocument();
  });

  it('users.manage only: login access without employee edits', async () => {
    grant('employees.view', 'users.manage');
    renderWithProviders(<EmployeeDirectory />);
    const noLogin = await row('Nolan Login');
    expect(within(noLogin).getByRole('button', { name: /give login access/i })).toBeInTheDocument();
    expect(within(noLogin).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(within(await row('Ada Active')).queryByRole('button', { name: /give login access/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add employee/i })).not.toBeInTheDocument();
  });

  it('branch membership does not show actions: only permissions do', async () => {
    grant('employees.view');
    session.user = { id: 1, branch_details: [{ branch_id: 3, name: 'Toronto' }] };
    renderWithProviders(<EmployeeDirectory branchId={3} />);
    await row('Ada Active');
    expect(screen.queryByRole('button', { name: /add employee/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(api.getEmployees).toHaveBeenCalledWith(expect.objectContaining({ branch_id: 3 }));
  });

  it('read-only subscription: notice shown and change actions removed', async () => {
    grant('employees.view', 'employees.manage', 'users.manage', 'entitlements.view');
    api.getEntitlementSnapshot.mockResolvedValue({ access_mode: 'read_only', features: {} });
    renderWithProviders(<EmployeeDirectory />);
    expect(await screen.findByText(/subscription is read-only/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: /add employee/i })).toBeDisabled());
    expect(screen.queryByRole('button', { name: 'Terminate' })).not.toBeInTheDocument();
  });
});

describe('employee flows', () => {
  it('creates an employee without a login unless an invitation is asked for', async () => {
    grant('employees.view', 'employees.manage', 'users.manage', 'branches.view');
    api.createEmployee.mockResolvedValue({ id: 50 });
    renderWithProviders(<EmployeeDirectory />);
    fireEvent.click(await screen.findByRole('button', { name: /add employee/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('First name'), { target: { value: 'Ivy' } });
    fireEvent.change(within(dialog).getByLabelText(/primary branch/i), { target: { value: '3' } });
    expect(within(dialog).queryByRole('option', { name: 'Closed' })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add employee' }));
    await waitFor(() => expect(api.createEmployee).toHaveBeenCalledWith(expect.objectContaining({ first_name: 'Ivy', primary_branch_id: 3, worker_type: 'office' })));
    expect(api.inviteEmployee).not.toHaveBeenCalled();
    expect(await screen.findByText(/no login until you invite them/i)).toBeInTheDocument();
  });

  it('validates the name before calling the backend and shows backend validation', async () => {
    grant('employees.view', 'employees.manage');
    api.createEmployee.mockRejectedValue({ response: { status: 422, data: { error: 'domain_error', detail: 'Primary branch must be an active branch of the company' } } });
    renderWithProviders(<EmployeeDirectory />);
    fireEvent.click(await screen.findByRole('button', { name: /add employee/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add employee' }));
    expect(await within(dialog).findByText('Enter a first or last name.')).toBeInTheDocument();
    expect(api.createEmployee).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText('Last name'), { target: { value: 'Ng' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add employee' }));
    expect(await within(dialog).findByText('Primary branch must be an active branch of the company')).toBeInTheDocument();
  });

  it('terminates with the backend command, requiring a reason', async () => {
    grant('employees.view', 'employees.manage');
    api.terminateEmployee.mockResolvedValue({ id: 11, employment_status: 'terminated' });
    renderWithProviders(<EmployeeDirectory />);
    fireEvent.click(within(await row('Ada Active')).getByRole('button', { name: 'Terminate' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/history are kept, not deleted/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/login stops working/i)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Terminate employment' }));
    expect(await within(dialog).findByText('A reason is required.')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/reason/i), { target: { value: 'Contract ended' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Terminate employment' }));
    await waitFor(() => expect(api.terminateEmployee).toHaveBeenCalledWith(11, expect.objectContaining({ reason: 'Contract ended', rehire_eligible: true })));
    expect(api.updateEmployee).not.toHaveBeenCalled();
  });

  it('rehires with the backend command and shows why it was refused', async () => {
    grant('employees.view', 'employees.manage');
    api.rehireEmployee.mockRejectedValue({ response: { status: 422, data: { error: 'domain_error', detail: 'Employee is not eligible for rehire' } } });
    renderWithProviders(<EmployeeDirectory />);
    fireEvent.click(within(await row('Tess Terminated')).getByRole('button', { name: 'Rehire' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rehire' }));
    expect(await within(dialog).findByText('Employee is not eligible for rehire')).toBeInTheDocument();
    expect(api.rehireEmployee).toHaveBeenCalledWith(13, { primary_branch_id: 3 });
  });

  it('gives login access by email invitation and shows backend refusals', async () => {
    grant('employees.view', 'users.manage');
    api.inviteEmployee.mockRejectedValueOnce({ response: { status: 422, data: { error: 'domain_error', detail: 'This email address already has a login.' } } });
    api.inviteEmployee.mockResolvedValueOnce({ id: 8, employee_id: 10, status: 'pending' });
    renderWithProviders(<EmployeeDirectory />);
    fireEvent.click(within(await row('Nolan Login')).getByRole('button', { name: /give login access/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('radio', { name: /email invitation/i })).toHaveAttribute('aria-checked', 'true');
    expect(within(dialog).getByLabelText(/send the invitation to/i)).toHaveValue('nolan@x.test');
    fireEvent.click(within(dialog).getByRole('button', { name: /send invitation/i }));
    expect(await within(dialog).findByText('This email address already has a login.')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/send the invitation to/i), { target: { value: 'nolan.work@x.test' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /send invitation/i }));
    expect(await screen.findByText('Invitation sent to nolan.work@x.test.')).toBeInTheDocument();
    expect(api.inviteEmployee).toHaveBeenLastCalledWith(10, { email: 'nolan.work@x.test' });
  });

  it('gives login access with a temporary password once the rules are met', async () => {
    grant('employees.view', 'users.manage');
    api.setEmployeeTemporaryPassword.mockResolvedValue({ user_id: 40, employee_id: 10, email: 'nolan@x.test' });
    renderWithProviders(<EmployeeDirectory />);
    fireEvent.click(within(await row('Nolan Login')).getByRole('button', { name: /give login access/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('radio', { name: /temporary password/i }));
    const create = within(dialog).getByRole('button', { name: /create login/i });
    fireEvent.change(within(dialog).getByLabelText(/^temporary password/i), { target: { value: 'short' } });
    expect(create).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('button', { name: /generate a strong password/i }));
    expect(create).toBeEnabled();
    const generated = within(dialog).getByLabelText(/^temporary password/i).value;
    fireEvent.click(create);
    await waitFor(() => expect(api.setEmployeeTemporaryPassword).toHaveBeenCalledWith(10, generated));
    expect(await screen.findByText('Login created for nolan@x.test.')).toBeInTheDocument();
    expect(screen.getByText(/not shown again/i)).toBeInTheDocument();
  });

  it('temporary password needs an employee email first', async () => {
    grant('employees.view', 'users.manage');
    api.getEmployees.mockResolvedValue({ count: 1, results: [{ ...EMPLOYEES[0], email: '' }] });
    renderWithProviders(<EmployeeDirectory />);
    fireEvent.click(within(await row('Nolan Login')).getByRole('button', { name: /give login access/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('radio', { name: /temporary password/i }));
    expect(within(dialog).getByText(/has no email address/i)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /create login/i })).not.toBeInTheDocument();
  });

  it('invitations tab lists status and revokes a pending invitation with POST', async () => {
    grant('employees.view', 'users.manage');
    api.getEmployeeInvitations.mockResolvedValue([
      { id: 77, employee_id: 10, email: 'nolan@x.test', status: 'pending', created_at: '2026-10-16T10:00:00Z', expires_at: '2099-01-01T00:00:00Z' },
      { id: 78, employee_id: 13, email: 'tess@x.test', status: 'pending', created_at: '2026-10-01T10:00:00Z', expires_at: '2026-10-02T00:00:00Z' },
    ]);
    api.revokeEmployeeInvitation.mockResolvedValue(undefined);
    renderWithProviders(<EmployeeDirectory />);
    fireEvent.click(await screen.findByRole('tab', { name: /invitations \(2\)/i }));
    const pending = (await screen.findByText('nolan@x.test')).closest('tr');
    expect(within(pending).getByText('Pending')).toBeInTheDocument();
    expect(within((await screen.findByText('tess@x.test')).closest('tr')).getByText('Expired')).toBeInTheDocument();
    fireEvent.click(within(pending).getByRole('button', { name: /revoke/i }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Revoke invitation' }));
    await waitFor(() => expect(api.revokeEmployeeInvitation).toHaveBeenCalledWith(77));
  });

  it('opens employee details with profile, employment and login information', async () => {
    grant('employees.view', 'users.view', 'employees.manage');
    api.getUserAccess.mockResolvedValue({ roles: [{ id: 5, name: 'Salesperson', branch_id: 3, branch_name: 'Toronto' }], branches: [{ branch_id: 3, name: 'Toronto', is_primary: true, is_active: true }], overrides: [] });
    renderWithProviders(<EmployeeDirectory />);
    fireEvent.click(within(await row('Ada Active')).getByRole('button', { name: 'Details for Ada Active' }));
    const panel = await screen.findByRole('dialog');
    expect(within(panel).getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    expect(within(panel).getByText('Login active')).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Edit details' })).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole('tab', { name: 'Roles & access' }));
    expect(await within(panel).findByText('Salesperson')).toBeInTheDocument();
    expect(within(panel).getAllByText('Primary').length).toBeGreaterThan(0);
  });

  it('assigns one role per branch from the Roles column', async () => {
    grant('employees.view', 'users.view', 'users.assign_role', 'rbac_roles.view');
    api.getRoles.mockResolvedValue([
      { id: 5, name: 'Salesperson', is_active: true, is_system_role: false },
      { id: 6, name: 'Dispatcher', is_active: true, is_system_role: false, description: 'Plans the day' },
      { id: 7, name: 'Company Admin', is_active: true, is_system_role: true },
      { id: 8, name: 'Old role', is_active: false, is_system_role: false },
      { id: 9, name: 'Ottawa desk', is_active: true, is_system_role: false, branch_id: 4 },
    ]);
    api.getUserAccess.mockResolvedValue({
      roles: [{ id: 5, name: 'Salesperson', branch_id: 3, branch_name: 'Toronto', is_active: true }],
      branches: [{ branch_id: 3, name: 'Toronto', is_primary: true, is_active: true }, { branch_id: 4, name: 'Ottawa', is_primary: false, is_active: true }],
      overrides: [],
    });
    api.assignUserRole.mockResolvedValue(undefined);
    renderWithProviders(<EmployeeDirectory />);
    const ada = await row('Ada Active');
    expect(within(ada).getByText('Salesperson · Toronto')).toBeInTheDocument();
    expect(within(await row('Nolan Login')).queryByRole('button', { name: /assign roles/i })).not.toBeInTheDocument();
    fireEvent.click(within(ada).getByRole('button', { name: 'Assign roles to Ada Active' }));
    const dialog = await screen.findByRole('dialog', { name: /roles for ada active/i });
    const toronto = await within(dialog).findByRole('combobox', { name: 'Role in Toronto' });
    const ottawa = within(dialog).getByRole('combobox', { name: 'Role in Ottawa' });
    expect(toronto).toHaveValue('5');
    expect(ottawa).toHaveValue('');
    // Inactive roles and roles made for another branch are not offered.
    expect(within(toronto).queryByRole('option', { name: /old role/i })).not.toBeInTheDocument();
    expect(within(toronto).queryByRole('option', { name: /ottawa desk/i })).not.toBeInTheDocument();
    expect(within(ottawa).getByRole('option', { name: /ottawa desk/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Save roles' })).toBeDisabled();
    fireEvent.change(toronto, { target: { value: '6' } });
    fireEvent.change(ottawa, { target: { value: '5' } });
    fireEvent.click(within(dialog).getByRole('checkbox', { name: /company admin/i }));
    expect(within(dialog).getByText('3 unsaved changes')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save roles' }));
    await waitFor(() => expect(api.assignUserRole).toHaveBeenCalledTimes(3));
    expect(api.assignUserRole).toHaveBeenCalledWith({ user_id: 21, role_id: 6, branch_id: 3 });
    expect(api.assignUserRole).toHaveBeenCalledWith({ user_id: 21, role_id: 5, branch_id: 4 });
    expect(api.assignUserRole).toHaveBeenCalledWith({ user_id: 21, role_id: 7, branch_id: null });
  });

  it('shows the server refusal for a branch role and keeps the dialog open', async () => {
    grant('employees.view', 'users.view', 'users.assign_role', 'rbac_roles.view');
    api.getRoles.mockResolvedValue([{ id: 6, name: 'Dispatcher', is_active: true }]);
    api.getUserAccess.mockResolvedValue({ roles: [], branches: [{ branch_id: 3, name: 'Toronto', is_active: true }], overrides: [] });
    api.assignUserRole.mockRejectedValue({ response: { status: 422, data: { error: 'domain_error', detail: 'Add the user to the branch before giving them a role there' } } });
    renderWithProviders(<EmployeeDirectory />);
    fireEvent.click(within(await row('Ada Active')).getByRole('button', { name: 'Assign roles to Ada Active' }));
    const dialog = await screen.findByRole('dialog', { name: /roles for ada active/i });
    fireEvent.change(await within(dialog).findByRole('combobox', { name: 'Role in Toronto' }), { target: { value: '6' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save roles' }));
    expect(await within(dialog).findByText(/Dispatcher in Toronto: Add the user to the branch/)).toBeInTheDocument();
  });

  it('shows what a person can do: role grants, blocks and extras, and pre-fills an exception from a cell', async () => {
    grant('employees.view', 'users.view', 'rbac_roles.view', 'rbac_overrides.manage', 'rbac_permissions.view');
    api.getPermissions.mockResolvedValue([
      { permission_key: 'leads.view', allowed_scopes: ['own', 'branch', 'company'] },
      { permission_key: 'leads.update', allowed_scopes: ['own', 'branch', 'company'] },
      { permission_key: 'leads.convert', allowed_scopes: ['branch', 'company'] },
      { permission_key: 'customers.merge', allowed_scopes: ['company'] },
    ]);
    api.getUserAccess.mockResolvedValue({
      roles: [{ id: 5, name: 'Salesperson', is_active: true, branch_id: 3, branch_name: 'Toronto' }],
      branches: [],
      overrides: [{ id: 9, user_id: 21, permission_key: 'leads.update', effect: 'deny', scope: 'company', is_active: true, reason: 'x' },
        { id: 10, user_id: 21, permission_key: 'customers.merge', effect: 'allow', scope: 'company', is_active: true, reason: 'y' }],
    });
    api.getRolePermissions.mockResolvedValue([{ permission_key: 'leads.view', scope: 'branch' }, { permission_key: 'leads.update', scope: 'own' }]);
    renderWithProviders(<EmployeeDirectory />);
    fireEvent.click(within(await row('Ada Active')).getByRole('button', { name: 'Details for Ada Active' }));
    const panel = await screen.findByRole('dialog');
    fireEvent.click(within(panel).getByRole('tab', { name: 'What they can do' }));
    expect(await within(panel).findByRole('button', { name: 'Leads → View: via Salesperson in Toronto' })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Leads → Edit: blocked by a personal exception' })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: /Customers → Merge duplicates: extra access/ })).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole('button', { name: 'Leads → View: via Salesperson in Toronto' }));
    const form = await screen.findByRole('dialog', { name: /personal exception/i });
    expect(within(form).getByRole('radio', { name: /block a permission/i })).toBeChecked();
    expect(within(form).getByLabelText(/which permission/i)).toHaveValue('leads.view');
  });
});
