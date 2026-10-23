import { describe, expect, it } from 'vitest';
import { filterAccessibleBranches, getAccessibleBranchIds, getUserBranchIds } from './branchScope';

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
});

