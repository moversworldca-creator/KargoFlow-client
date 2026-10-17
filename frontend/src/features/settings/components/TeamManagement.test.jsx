import { describe, expect, it } from 'vitest';
import { employeeUpdatePayload, mergeUsersWithEmployees, normalizeUserPayload } from './TeamManagement';

describe('normalizeUserPayload', () => {
  it('removes roles that are not allowed for the selected branch set', () => {
    const payload = normalizeUserPayload(
      {
        email: 'user@example.com',
        first_name: 'Test',
        last_name: 'User',
        phone: '555-0100',
        employee_type: 'dispatcher',
        is_active: true,
        roles: [11, 22, 33],
        branches: [7],
      },
      {
        companyId: 3,
        allowedRoleIds: [11, 33],
      },
    );

    expect(payload.roles).toEqual([11, 33]);
    expect(payload.branches).toEqual([7]);
    expect(payload.company).toBe(3);
  });

  it('keeps branch-scoped payload compact when no allowed role list is provided', () => {
    const payload = normalizeUserPayload(
      {
        email: 'user@example.com',
        first_name: 'Test',
        last_name: 'User',
        roles: [11, 22],
        branches: [1, 2],
      },
      {
        includePassword: true,
        companyId: { id: 9 },
      },
    );

    expect(payload.roles).toEqual([11, 22]);
    expect(payload.company).toBe(9);
    expect(payload.password).toBeUndefined();
  });
});

describe('employee-backed team editing', () => {
  it('resolves the employee id linked to a login', () => {
    expect(mergeUsersWithEmployees(
      [{ id: 4, email: 'user@example.com' }],
      [{ id: 91, user_id: 4, phone: '555', worker_type: 'office', primary_branch_id: 7 }],
    )).toEqual([expect.objectContaining({
      id: 4, employee_id: 91, phone: '555', employee_type: 'office', branches: [7],
    })]);
  });

  it('maps the edit form to employee API fields', () => {
    expect(employeeUpdatePayload({
      first_name: ' Test ', last_name: ' User ', email: ' user@example.com ', phone: ' 555 ',
      employee_type: 'office', branches: [7],
    })).toEqual({
      first_name: 'Test', last_name: 'User', email: 'user@example.com', phone: '555',
      worker_type: 'office', primary_branch_id: 7,
    });
  });
});


describe('team members without login accounts', () => {
  it('lists newly created employees before invitation acceptance', () => {
    const rows = mergeUsersWithEmployees([], [{
      id: 91, user_id: null, first_name: 'New', email: '', worker_type: 'office', primary_branch_id: 7,
    }]);
    expect(rows).toEqual([expect.objectContaining({
      id: 'employee-91', employee_id: 91, has_login: false, first_name: 'New',
      employee_type: 'office', branches: [7],
    })]);
  });

  it('lists linked employees missing from the login response without duplicating matched members', () => {
    const rows = mergeUsersWithEmployees([{ id: 4, email: 'existing@example.com' }], [
      { id: 91, user_id: 4 },
      { id: 92, user_id: 5, first_name: 'Other' },
      { id: 93, user_id: null, first_name: 'Pending' },
    ]);
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.employee_id)).toEqual([91, 92, 93]);
    expect(rows[1]).toMatchObject({ id: 5, has_login: true });
  });

  it('preserves attached roles and role_details on login accounts', () => {
    const roles = [{ id: 4, name: 'Company Admin', branch_id: null }];
    const rows = mergeUsersWithEmployees([
      { id: 4, email: 'admin@example.com', roles: [4], role_details: roles, branches: [1] },
    ], [
      { id: 91, user_id: 4, primary_branch_id: 1 },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].roles).toEqual([4]);
    expect(rows[0].role_details).toEqual(roles);
    expect(rows[0].branches).toEqual([1]);
  });
});

