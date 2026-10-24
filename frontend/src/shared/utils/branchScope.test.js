import { describe, expect, it } from 'vitest';
import {
  filterAccessibleBranches,
  getAccessibleBranchIds,
  getOverQuotaBranchIds,
  getOverQuotaUserIds,
  getUserBranchIds,
  isBranchOverQuota,
  isUserOverQuota,
} from './branchScope';

describe('branchScope', () => {
  it('extracts branch ids from user records', () => {
    const ids = getUserBranchIds({
      branches: [{ id: 4 }, { id: 7 }],
      branch_details: [{ id: 9 }],
      branch: { id: 11 },
      branch_id: 13,
    });

    expect(ids).toEqual(['4', '7', '9', '11', '13']);
  });

  it('filters branch lists to the user accessible branches', () => {
    const user = { branches: [{ id: 2 }, { id: 5 }] };
    const branches = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 5, name: 'C' }];

    expect(getAccessibleBranchIds(user, branches)).toEqual([2, 5]);
    expect(filterAccessibleBranches(user, branches)).toEqual([
      { id: 2, name: 'B' },
      { id: 5, name: 'C' },
    ]);
  });

  it('returns an empty list when the user has no branch assignments', () => {
    expect(filterAccessibleBranches(null, [{ id: 1 }])).toEqual([]);
  });

  it('allows company-wide users to access all branches', () => {
    const adminUser = { id: 1, is_superuser: true, branches: [{ id: 1 }] };
    const branches = [{ id: 1, name: 'Main' }, { id: 2, name: 'Second' }, { id: 3, name: 'Third' }];

    expect(filterAccessibleBranches(adminUser, branches)).toEqual(branches);
    expect(getAccessibleBranchIds(adminUser, branches)).toEqual([1, 2, 3]);

    const ownerUser = { id: 2, worker_type: 'owner', branches: [{ id: 1 }] };
    expect(filterAccessibleBranches(ownerUser, branches)).toEqual(branches);

    const companyAdminRoleUser = {
      id: 3,
      role_details: [{ name: 'Company Admin', branch_id: null }],
      branches: [{ id: 1 }],
    };
    expect(filterAccessibleBranches(companyAdminRoleUser, branches)).toEqual(branches);

    const branchManagerWithPerms = {
      id: 4,
      permissions: ['branches.manage'],
      branches: [{ id: 1 }],
    };
    expect(filterAccessibleBranches(branchManagerWithPerms, branches)).toEqual(branches);

    const companyAdminStringRole = {
      id: 5,
      role: 'company_admin',
      branches: [{ id: 1 }],
    };
    expect(filterAccessibleBranches(companyAdminStringRole, branches)).toEqual(branches);
  });

  describe('getOverQuotaBranchIds and isBranchOverQuota', () => {
    it('returns empty set if limit is null, undefined, or invalid', () => {
      const branches = [{ id: 1, is_main: true }, { id: 2 }];
      expect(getOverQuotaBranchIds(branches, null)).toEqual(new Set());
      expect(getOverQuotaBranchIds(branches, undefined)).toEqual(new Set());
      expect(getOverQuotaBranchIds(branches, 'invalid')).toEqual(new Set());
    });

    it('returns empty set when active branches count is within limit', () => {
      const branches = [
        { id: 1, name: 'Main HQ', is_main: true, is_active: true },
        { id: 2, name: 'Branch 2', is_active: true },
        { id: 3, name: 'Branch 3 (Inactive)', is_active: false },
      ];
      expect(getOverQuotaBranchIds(branches, 2)).toEqual(new Set());
      expect(getOverQuotaBranchIds(branches, 3)).toEqual(new Set());
      expect(getOverQuotaBranchIds(branches, 0)).toEqual(new Set());
      expect(getOverQuotaBranchIds(branches, -1)).toEqual(new Set());
    });

    it('identifies excess active branches beyond the plan limit, preserving main and lowest IDs', () => {
      const branches = [
        { id: 10, name: 'Add-on Branch 10', is_active: true },
        { id: 1, name: 'Main HQ', is_main: true, is_active: true },
        { id: 5, name: 'Branch 5', is_active: true },
        { id: 99, name: 'Inactive Branch', is_active: false },
      ];
      // Active sorted: Main (id 1), then id 5, then id 10.
      // Limit 2: Main (id 1) and Branch 5 are within quota. Branch 10 is over quota.
      const overQuota = getOverQuotaBranchIds(branches, 2);
      expect(overQuota).toEqual(new Set(['10']));
      expect(isBranchOverQuota(10, overQuota)).toBe(true);
      expect(isBranchOverQuota('10', overQuota)).toBe(true);
      expect(isBranchOverQuota(1, overQuota)).toBe(false);
      expect(isBranchOverQuota(5, overQuota)).toBe(false);
    });
  });

  describe('getOverQuotaUserIds and isUserOverQuota', () => {
    it('returns empty set if limit is null, undefined, not a number, or <= 0 (unlimited)', () => {
      const users = [{ id: 1 }, { id: 2 }];
      expect(getOverQuotaUserIds(users, null)).toEqual(new Set());
      expect(getOverQuotaUserIds(users, undefined)).toEqual(new Set());
      expect(getOverQuotaUserIds(users, 'invalid')).toEqual(new Set());
      expect(getOverQuotaUserIds(users, 0)).toEqual(new Set());
      expect(getOverQuotaUserIds(users, -1)).toEqual(new Set());
    });

    it('returns empty set if users count does not exceed limit', () => {
      const users = [
        { id: 1, is_active: true },
        { id: 2, is_active: true },
      ];
      expect(getOverQuotaUserIds(users, 2)).toEqual(new Set());
      expect(getOverQuotaUserIds(users, 3)).toEqual(new Set());
    });

    it('identifies excess active users beyond limit and prioritizes admins/owners', () => {
      const users = [
        { id: 50, name: 'Standard User 50', is_active: true },
        { id: 100, name: 'Admin User 100', is_superuser: true, is_active: true },
        { id: 10, name: 'Standard User 10', is_active: true },
        { id: 999, name: 'Inactive User', is_active: false },
      ];
      // Active users ordered: Admin (id 100), then id 10, then id 50.
      // Limit 2: Admin (100) and User 10 within quota; User 50 is over quota.
      const overQuota = getOverQuotaUserIds(users, 2);
      expect(overQuota).toEqual(new Set(['50']));
      expect(isUserOverQuota(50, overQuota)).toBe(true);
      expect(isUserOverQuota('50', overQuota)).toBe(true);
      expect(isUserOverQuota(100, overQuota)).toBe(false);
      expect(isUserOverQuota(10, overQuota)).toBe(false);
    });
  });
});


