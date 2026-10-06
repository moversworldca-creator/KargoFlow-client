import { describe, expect, it } from 'vitest';
import { normalizeUserPayload } from './TeamManagement';

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
