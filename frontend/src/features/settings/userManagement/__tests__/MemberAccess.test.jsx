import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../../../services/api';
import MemberAccessPanel from '../MemberAccessPanel';
import { ExplainAccessPanel } from '../AccessControls';
import { renderWithProviders } from './testUtils';

vi.mock('../../../../services/api', () => ({
  getUserAccess: vi.fn(), deactivateUser: vi.fn(), reactivateUser: vi.fn(), addUserBranch: vi.fn(), removeUserBranch: vi.fn(),
  assignUserRole: vi.fn(), unassignUserRole: vi.fn(), createUserOverride: vi.fn(), revokeUserOverride: vi.fn(), explainAccess: vi.fn(),
}));

const ALL = { viewUsers: true, manageLogins: true, assignRoles: true, viewOverrides: true, manageOverrides: true, viewPermissions: true, viewBranches: true };
const employee = { id: 11, user_id: 21, first_name: 'Ada', last_name: 'Active', email: 'ada@x.test', employment_status: 'active' };
const branches = [{ id: 3, name: 'Toronto', is_active: true }, { id: 4, name: 'Ottawa', is_active: true }];
const catalog = [
  { permission_key: 'leads.view', allowed_scopes: ['company', 'branch', 'own'], description: 'View leads' },
  { permission_key: 'customers.merge', allowed_scopes: ['company'], description: 'Merge customers' },
];
const roles = [{ id: 5, name: 'Salesperson', is_active: true }, { id: 6, name: 'Dispatcher', is_active: true }];

const renderPanel = (props = {}) => renderWithProviders(
  <MemberAccessPanel employee={employee} login={{ id: 21, email: 'ada@x.test', is_active: true }} access={ALL} roles={roles}
    branches={branches} catalog={catalog} currentUserId={1} readOnly={false} onChanged={vi.fn()} {...props} />,
);

beforeEach(() => {
  vi.clearAllMocks();
  api.getUserAccess.mockResolvedValue({
    roles: [{ id: 5, name: 'Salesperson', is_active: true, branch_id: 3, branch_name: 'Toronto' }],
    branches: [{ branch_id: 3, name: 'Toronto', is_primary: true, is_active: true }],
    overrides: [{ id: 9, user_id: 21, permission_key: 'leads.view', effect: 'deny', scope: 'company', reason: 'Audit', expires_at: null, is_active: true }],
  });
});

describe('login and branch membership', () => {
  it('disables a login only after confirming, and says employment is unaffected', async () => {
    api.deactivateUser.mockResolvedValue({});
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Disable login' }));
    const confirm = await screen.findByRole('dialog');
    expect(within(confirm).getByText(/employment is not affected/i)).toBeInTheDocument();
    fireEvent.click(within(confirm).getByRole('button', { name: 'Disable login' }));
    await waitFor(() => expect(api.deactivateUser).toHaveBeenCalledWith(21));
  });

  it('primary branch cannot be removed here; other branches can be added', async () => {
    api.addUserBranch.mockResolvedValue([]);
    renderPanel();
    const toronto = (await screen.findAllByText('Toronto')).find((el) => el.closest('li')).closest('li');
    expect(within(toronto).getByText('Primary')).toBeInTheDocument();
    expect(within(toronto).queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Add membership'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(api.addUserBranch).toHaveBeenCalledWith(21, '4'));
  });

  it('shows the backend conflict when a membership change is refused', async () => {
    api.getUserAccess.mockResolvedValue({ roles: [], overrides: [], branches: [
      { branch_id: 3, name: 'Toronto', is_primary: true, is_active: true }, { branch_id: 4, name: 'Ottawa', is_primary: false, is_active: true }] });
    api.removeUserBranch.mockRejectedValue({ response: { status: 422, data: { error: 'domain_error', detail: 'A user must keep at least one branch.' } } });
    renderPanel();
    const ottawa = (await screen.findAllByText('Ottawa')).find((el) => el.closest('li')).closest('li');
    fireEvent.click(within(ottawa).getByRole('button', { name: 'Remove' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Remove' }));
    expect((await screen.findAllByText('A user must keep at least one branch.')).length).toBeGreaterThan(0);
  });
});

describe('roles by branch', () => {
  it('changes the role in a branch (replace) and removes it (users.assign_role)', async () => {
    api.assignUserRole.mockResolvedValue(undefined);
    api.unassignUserRole.mockResolvedValue(undefined);
    renderPanel();
    const toronto = await screen.findByRole('combobox', { name: 'Role in Toronto' });
    expect(toronto).toHaveValue('5');
    expect(screen.getByText(/only inside its branch/i)).toBeInTheDocument();
    fireEvent.change(toronto, { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save roles' }));
    await waitFor(() => expect(api.assignUserRole).toHaveBeenCalledWith({ user_id: 21, role_id: 6, branch_id: 3 }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Role in Toronto' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save roles' }));
    await waitFor(() => expect(api.unassignUserRole).toHaveBeenCalledWith({ user_id: 21, role_id: 5, branch_id: 3 }));
  });

  it('without users.assign_role, or on yourself, roles are read-only', async () => {
    const { unmount } = renderPanel({ access: { ...ALL, assignRoles: false } });
    expect(await screen.findByText('Salesperson')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Role in Toronto' })).not.toBeInTheDocument();
    expect(screen.getByText(/needs the users.assign_role permission/i)).toBeInTheDocument();
    unmount();
    renderPanel({ currentUserId: 21 });
    await screen.findByText('Salesperson');
    expect(screen.queryByRole('combobox', { name: 'Role in Toronto' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Disable login' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add override' })).not.toBeInTheDocument();
  });

  it('a person with no branch is told to add one first', async () => {
    api.getUserAccess.mockResolvedValue({ roles: [], branches: [], overrides: [] });
    renderPanel();
    expect(await screen.findByText(/add a branch membership first/i)).toBeInTheDocument();
  });
});

describe('personal exceptions (direct overrides)', () => {
  it('lists overrides readably and marks DENY distinctly', async () => {
    renderPanel();
    const deny = (await screen.findByText('Leads → View')).closest('tr');
    expect(within(deny).getByText('DENY')).toBeInTheDocument();
    expect(within(deny).getByText('leads.view')).toBeInTheDocument();
  });

  it('builds a DENY with a plain-language summary; reason required; only allowed scopes offered', async () => {
    api.createUserOverride.mockResolvedValue({ id: 10 });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Add override' }));
    const dialog = await screen.findByRole('dialog', { name: /personal exception/i });
    fireEvent.change(within(dialog).getByLabelText(/which permission/i), { target: { value: 'customers.merge' } });
    expect(within(dialog).getAllByRole('radio', { name: /whole company|their branches|their own|company/i }).filter((r) => r.name === 'override-scope')).toHaveLength(1);
    expect(within(dialog).getByText(/only works at this level/i)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/which permission/i), { target: { value: 'leads.view' } });
    fireEvent.click(within(dialog).getByRole('radio', { name: /^branch/i }));
    fireEvent.change(within(dialog).getByRole('combobox', { name: /^branch/i }), { target: { value: '4' } });
    expect(within(dialog).getByText('Ada Active will NOT be able to view — Leads in the Ottawa branch, even if one of their roles allows it.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Block permission' }));
    expect(await within(dialog).findByText('A reason is required.')).toBeInTheDocument();
    expect(api.createUserOverride).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: '7 days' }));
    fireEvent.change(within(dialog).getByLabelText(/^why/i), { target: { value: 'Covering a branch audit' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Block permission' }));
    await waitFor(() => expect(api.createUserOverride).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 21, permission_key: 'leads.view', effect: 'deny', scope: 'branch', branch_id: 4, reason: 'Covering a branch audit',
      expires_at: expect.any(String),
    })));
  });

  it('an ALLOW explains the company-scope delegation rule; backend refusal is shown', async () => {
    api.createUserOverride.mockRejectedValue({ response: { status: 403, data: { error: 'access_denied', detail: 'You can only grant permissions you hold at company scope' } } });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Add override' }));
    const dialog = await screen.findByRole('dialog', { name: /personal exception/i });
    fireEvent.click(within(dialog).getByRole('radio', { name: /grant extra access/i }));
    expect(within(dialog).getByText(/you can only grant extra access you hold yourself/i)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/which permission/i), { target: { value: 'customers.merge' } });
    fireEvent.change(within(dialog).getByLabelText(/^why/i), { target: { value: 'Data clean-up' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Grant extra access' }));
    expect(await within(dialog).findByText('You can only grant permissions you hold at company scope')).toBeInTheDocument();
  });

  it('revokes an override after confirmation', async () => {
    api.revokeUserOverride.mockResolvedValue(undefined);
    renderPanel();
    fireEvent.click(within((await screen.findByText('Leads → View')).closest('tr')).getByRole('button', { name: 'Revoke' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Revoke' }));
    await waitFor(() => expect(api.revokeUserOverride).toHaveBeenCalledWith(9));
  });
});

describe('explain access: shows the backend decision, computes nothing', () => {
  const renderExplain = () => renderWithProviders(<ExplainAccessPanel catalog={catalog} branches={branches} fixedUser={{ id: 21 }} />);
  const ask = () => {
    fireEvent.change(screen.getByLabelText(/^permission/i), { target: { value: 'leads.view' } });
    fireEvent.click(screen.getByRole('button', { name: 'Explain decision' }));
  };

  it('allowed by a role', async () => {
    api.explainAccess.mockResolvedValue({ permission_key: 'leads.view', allowed: true, decision_source: 'role', scope_used: 'branch', role_name: 'Salesperson', user_override_id: null, reason: 'Role grant validated by branch membership' });
    renderExplain();
    ask();
    const result = await screen.findByRole('region', { name: 'Decision' });
    expect(within(result).getByText('ALLOWED')).toBeInTheDocument();
    expect(within(result).getByText('Role grant')).toBeInTheDocument();
    expect(within(result).getByText('Salesperson')).toBeInTheDocument();
    expect(api.explainAccess).toHaveBeenCalledWith({ user_id: 21, permission_key: 'leads.view', branch_id: null, resource_type: '', resource_id: null });
  });

  it('denied by a direct override', async () => {
    api.explainAccess.mockResolvedValue({ permission_key: 'leads.view', allowed: false, decision_source: 'user_override', scope_used: 'company', role_name: null, user_override_id: 9, reason: 'Direct user DENY override' });
    renderExplain();
    ask();
    const result = await screen.findByRole('region', { name: 'Decision' });
    expect(within(result).getByText('DENIED')).toBeInTheDocument();
    expect(within(result).getByText('Direct override')).toBeInTheDocument();
    expect(within(result).getByText('Direct override #9')).toBeInTheDocument();
  });
});
