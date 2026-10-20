import { describe, expect, it } from 'vitest';
import { assignmentLabel, canBeCompanyWide, employeePayload, generatePassword, invitationStatus, loginState, passwordChecks, roleChanges, rolesForBranch, rowActions, validateEmployee, validateOverride, WORKER_TYPES } from '../logic';
import { describePermission, groupCatalog, overrideSummary } from '../permissionLabels';
import { buildMatrix, buildUserCells } from '../matrixModel';

const none = { manageEmployees: false, manageLogins: false, viewUsers: false, assignRoles: false, viewOverrides: false };
const active = { id: 1, user_id: null, employment_status: 'active', email: 'a@b.test', rehire_eligible: true };

describe('rowActions: one backend permission per action, only valid states', () => {
  it('view-only users get no change actions', () => {
    const { details, ...actions } = rowActions(active, { can: none, isSelf: false, readOnly: false });
    expect(details).toBe(true);
    expect(Object.values(actions).some(Boolean)).toBe(false);
  });

  it('employees.manage offers edit/terminate but not login actions', () => {
    const actions = rowActions(active, { can: { ...none, manageEmployees: true }, isSelf: false, readOnly: false });
    expect(actions).toMatchObject({ edit: true, terminate: true, rehire: false, giveLogin: false });
  });

  it('users.manage offers login invitation but not employee edits', () => {
    const actions = rowActions(active, { can: { ...none, manageLogins: true }, isSelf: false, readOnly: false });
    expect(actions).toMatchObject({ edit: false, terminate: false, giveLogin: true });
  });

  it('a terminated employee can be rehired, not terminated or edited', () => {
    const terminated = { ...active, employment_status: 'terminated' };
    const actions = rowActions(terminated, { can: { ...none, manageEmployees: true, manageLogins: true }, isSelf: false, readOnly: false });
    expect(actions).toMatchObject({ rehire: true, terminate: false, edit: false, giveLogin: false });
  });

  it('no rehire when not eligible; no invite for on-leave or already-linked employees', () => {
    const can = { ...none, manageEmployees: true, manageLogins: true };
    expect(rowActions({ ...active, employment_status: 'terminated', rehire_eligible: false }, { can }).rehire).toBe(false);
    expect(rowActions({ ...active, employment_status: 'on_leave' }, { can }).giveLogin).toBe(false);
    expect(rowActions({ ...active, user_id: 7 }, { can }).giveLogin).toBe(false);
  });

  it('you cannot terminate yourself', () => {
    expect(rowActions({ ...active, user_id: 1 }, { can: { ...none, manageEmployees: true }, isSelf: true }).terminate).toBe(false);
  });

  it('read-only subscription removes every change action', () => {
    const all = { manageEmployees: true, manageLogins: true, viewUsers: true, assignRoles: true, viewOverrides: true };
    const actions = rowActions(active, { can: all, isSelf: false, readOnly: true });
    expect(actions).toMatchObject({ edit: false, terminate: false, giveLogin: false });
  });

  it('access panel needs a login and some access permission', () => {
    expect(rowActions(active, { can: { ...none, viewUsers: true } }).access).toBe(false);
    expect(rowActions({ ...active, user_id: 5 }, { can: { ...none, viewUsers: true } }).access).toBe(true);
    expect(rowActions({ ...active, user_id: 5 }, { can: none }).access).toBe(false);
  });
});

describe('loginState: Employee is not User', () => {
  const logins = new Map([['5', { id: 5, is_active: true }], ['6', { id: 6, is_active: false }]]);
  const pending = new Map([['2', { id: 9 }]]);
  it.each([
    [{ id: 1, user_id: null }, 'No login'],
    [{ id: 2, user_id: null }, 'Invitation pending'],
    [{ id: 3, user_id: 5 }, 'Login active'],
    [{ id: 4, user_id: 6 }, 'Login disabled'],
    [{ id: 8, user_id: 99 }, 'Has login'],
  ])('%o -> %s', (employee, label) => {
    expect(loginState(employee, logins, pending).label).toBe(label);
  });
});

describe('employee payload and validation', () => {
  it('sends only backend employee fields; creating never sends login fields', () => {
    const body = employeePayload({ first_name: ' Ann ', email: ' A@B.TEST ', worker_type: 'crew', primary_branch_id: '7', password: 'x', roles: [1] }, { isCreate: true });
    expect(body).toEqual({ first_name: 'Ann', last_name: '', email: 'a@b.test', phone: '', worker_type: 'crew', primary_branch_id: 7, hire_date: null });
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('roles');
  });

  it('edits send employment status, which never includes terminated from the form', () => {
    expect(employeePayload({ first_name: 'A', employment_status: 'on_leave' }, { isCreate: false }).employment_status).toBe('on_leave');
  });

  it('requires a name and a valid email; invitation needs an email', () => {
    expect(validateEmployee({})).toHaveProperty('first_name');
    expect(validateEmployee({ first_name: 'A', email: 'nope' })).toHaveProperty('email');
    expect(validateEmployee({ last_name: 'B', wantsInvite: true })).toHaveProperty('email');
    expect(validateEmployee({ last_name: 'B' })).toEqual({});
  });

  it('worker types are the database values', () => {
    expect(WORKER_TYPES).toEqual(['office', 'crew', 'hybrid', 'owner', 'contractor', 'seasonal', 'service']);
  });
});

describe('override validation', () => {
  const base = { user_id: 2, permission_key: 'leads.view', scope: 'company', reason: 'audit', expires_at: '' };
  const now = new Date('2026-10-17T12:00:00Z');
  it('accepts a complete override', () => expect(validateOverride(base, now)).toEqual({}));
  it('requires a non-empty reason', () => expect(validateOverride({ ...base, reason: '   ' }, now)).toHaveProperty('reason'));
  it('requires a future expiry', () => {
    expect(validateOverride({ ...base, expires_at: '2026-10-15T00:00' }, now)).toHaveProperty('expires_at');
    expect(validateOverride({ ...base, expires_at: '2027-01-01T00:00' }, now)).toEqual({});
  });
  it('requires a branch for branch scope', () => {
    expect(validateOverride({ ...base, scope: 'branch' }, now)).toHaveProperty('branch_id');
    expect(validateOverride({ ...base, scope: 'branch', branch_id: 3 }, now)).toEqual({});
  });
});

describe('temporary password rules (mirror of the backend validators)', () => {
  const person = { first_name: 'Ada', last_name: 'Lovelace', email: 'ada@x.test' };
  const ok = (pw, confirm = pw) => passwordChecks(pw, confirm, person).every((c) => c.ok);
  it('needs 12+ characters, not only digits, matching confirmation', () => {
    expect(ok('Short1!')).toBe(false);
    expect(ok('123456789012')).toBe(false);
    expect(ok('Tr4ck-Plum-Kite', 'different')).toBe(false);
    expect(ok('Tr4ck-Plum-Kite')).toBe(true);
  });
  it('refuses the person\'s name and common passwords', () => {
    expect(ok('Lovelace-2026!!')).toBe(false);
    expect(ok('MyPassword2026')).toBe(false);
  });
  it('generated passwords always pass', () => {
    for (let i = 0; i < 25; i += 1) expect(ok(generatePassword())).toBe(true);
  });
});

describe('invitation status', () => {
  const now = new Date('2026-10-17T12:00:00Z');
  it('a pending invitation past its expiry is expired', () => {
    expect(invitationStatus({ status: 'pending', expires_at: '2026-10-16T00:00:00Z' }, now)).toBe('expired');
    expect(invitationStatus({ status: 'pending', expires_at: '2026-10-20T00:00:00Z' }, now)).toBe('pending');
    expect(invitationStatus({ status: 'accepted', expires_at: '2026-10-16T00:00:00Z' }, now)).toBe('accepted');
  });
});

describe('plain-language permission names', () => {
  it('names backend keys readably, and still copes with unknown keys', () => {
    expect(describePermission('leads.view').label).toBe('Leads → View');
    expect(describePermission('opportunities.book_without_deposit').label).toBe('Opportunities → Book without deposit');
    expect(describePermission('communications.conversations.send')).toMatchObject({ area: 'Communications', action: 'Send' });
    expect(describePermission('future_page.archive').label).toBe('Future page → Archive');
  });
  it('groups the catalog by area then page, with search over readable names', () => {
    const catalog = [{ permission_key: 'users.view' }, { permission_key: 'leads.view' }, { permission_key: 'leads.convert' }];
    const groups = groupCatalog(catalog);
    expect(groups.map((g) => g.area)).toEqual(['Sales', 'Team & security']);
    expect(groupCatalog(catalog, 'convert to')[0].pages[0].perms.map((p) => p.permission_key)).toEqual(['leads.convert']);
  });
  it('summarises an override in a sentence', () => {
    expect(overrideSummary({ person: 'Ada', effect: 'deny', permissionKey: 'leads.view', scope: 'branch', branchName: 'Toronto' }))
      .toBe('Ada will NOT be able to view — Leads in the Toronto branch, even if one of their roles allows it.');
  });
});

describe('permission matrix model', () => {
  const catalog = [
    { permission_key: 'leads.view', allowed_scopes: ['company', 'own'] }, { permission_key: 'leads.convert', allowed_scopes: ['company'] },
    { permission_key: 'users.view' }, { permission_key: 'users.assign_role' },
  ];
  it('rows are pages, standard actions are columns, the rest are special actions', () => {
    const [sales, team] = buildMatrix(catalog);
    expect(sales.area).toBe('Sales');
    const leads = sales.pages[0];
    expect(leads.page).toBe('Leads');
    expect(Array.from(leads.byAction.keys())).toEqual(['view']);
    expect(leads.other.map((i) => i.meta.action)).toEqual(['Convert to opportunity']);
    expect(leads.byAction.get('view').scopes).toEqual(['own', 'company']);
    expect(team.pages[0].other.map((i) => i.action)).toEqual(['assign_role']);
  });
  it('search keeps whole pages that match', () => {
    expect(buildMatrix(catalog, 'assign roles').map((a) => a.area)).toEqual(['Team & security']);
  });
  it('person cells: inactive roles and expired overrides grant nothing; DENY wins', () => {
    const now = new Date('2026-10-17T12:00:00Z');
    const cells = buildUserCells([
      { role: { name: 'Sales', is_active: true }, grants: [{ permission_key: 'leads.view', scope: 'branch' }] },
      { role: { name: 'Old', is_active: false }, grants: [{ permission_key: 'users.view', scope: 'company' }] },
    ], [
      { permission_key: 'leads.view', effect: 'allow', scope: 'company', is_active: true },
      { permission_key: 'leads.view', effect: 'deny', scope: 'company', is_active: true },
      { permission_key: 'users.view', effect: 'allow', scope: 'company', is_active: true, expires_at: '2026-10-01T00:00:00Z' },
    ], now);
    expect(cells.get('leads.view').roles).toEqual([{ role: 'Sales', scope: 'branch', branchName: null }]);
    expect(cells.get('leads.view').override.effect).toBe('deny');
    expect(cells.get('users.view')).toBeUndefined();
  });

  it('person cells: a role held in a branch is capped to that branch', () => {
    const cells = buildUserCells([
      { role: { name: 'Manager', is_active: true, branch_id: 3, branch_name: 'Toronto' }, grants: [{ permission_key: 'leads.view', scope: 'company' }] },
      { role: { name: 'Company Admin', is_active: true, branch_id: null }, grants: [{ permission_key: 'users.view', scope: 'company' }] },
    ], []);
    expect(cells.get('leads.view').roles).toEqual([{ role: 'Manager', scope: 'branch', branchName: 'Toronto' }]);
    expect(cells.get('users.view').roles).toEqual([{ role: 'Company Admin', scope: 'company', branchName: null }]);
  });
});

describe('roles by branch', () => {
  const assignments = [
    { id: 5, name: 'Sales', branch_id: 3 },
    { id: 6, name: 'Dispatch', branch_id: 4 },
    { id: 7, name: 'Company Admin', branch_id: null },
  ];

  it('only the Company Admin and crew system roles may be company-wide', () => {
    expect(canBeCompanyWide({ name: 'Company Admin', is_system_role: true })).toBe(true);
    expect(canBeCompanyWide({ name: 'Crew Lead', is_system_role: true })).toBe(true);
    expect(canBeCompanyWide({ name: 'Company Admin', is_system_role: false })).toBe(false);
    expect(canBeCompanyWide({ name: 'Sales', is_system_role: true })).toBe(false);
  });

  it('a branch offers active roles that are not made for another branch', () => {
    const roles = [{ id: 1, is_active: true }, { id: 2, is_active: false }, { id: 3, is_active: true, branch_id: 4 }, { id: 4, is_active: true, branch_id: 3 }];
    expect(rolesForBranch(roles, 3).map((r) => r.id)).toEqual([1, 4]);
  });

  it('computes replace, remove and company-wide changes', () => {
    const plan = { branches: { 3: '8', 4: '', 9: '5' }, companyWide: new Set() };
    expect(roleChanges(assignments, plan)).toEqual([
      { kind: 'assign', role_id: 8, branch_id: 3, replaces: 5 },
      { kind: 'unassign', role_id: 6, branch_id: 4 },
      { kind: 'assign', role_id: 5, branch_id: 9, replaces: null },
      { kind: 'unassign', role_id: 7, branch_id: null },
    ]);
    expect(roleChanges(assignments, { branches: { 3: '5', 4: '6' }, companyWide: new Set(['7']) })).toEqual([]);
  });

  it('labels an assignment with its branch', () => {
    expect(assignmentLabel({ name: 'Sales', branch_id: 3, branch_name: 'Toronto' })).toBe('Sales · Toronto');
    expect(assignmentLabel({ name: 'Company Admin', branch_id: null })).toBe('Company Admin · Company-wide');
  });
});
