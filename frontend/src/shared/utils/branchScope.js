export const getUserBranchIds = (user) => {
  if (!user) return [];
  const ids = new Set();
  const addId = (value) => {
    if (value === null || value === undefined || value === '') return;
    ids.add(String(value));
  };

  if (Array.isArray(user.branches)) {
    user.branches.forEach((branch) => {
      if (branch && typeof branch === 'object') addId(branch.id ?? branch.branch_id ?? branch.value);
      else addId(branch);
    });
  }

  if (Array.isArray(user.branch_details)) {
    user.branch_details.forEach((branch) => {
      if (branch && typeof branch === 'object') addId(branch.id ?? branch.branch_id ?? branch.value);
      else addId(branch);
    });
  }

  if (user.branch) {
    if (typeof user.branch === 'object') addId(user.branch.id ?? user.branch.branch_id ?? user.branch.value);
    else addId(user.branch);
  }

  if (user.branch_id) addId(user.branch_id);

  return Array.from(ids);
};

export const hasCompanyWideAccess = (user) => {
  if (!user) return false;
  if (user.is_superuser || user.is_system_admin || user.is_staff || user.is_company_admin) return true;

  const roleDetails = user.role_details || user.roles || [];
  if (Array.isArray(roleDetails)) {
    const hasAdmin = roleDetails.some((r) => {
      const name = String(r?.name || r?.label || r?.codename || r || '').toLowerCase();
      if (
        name.includes('company admin') ||
        name.includes('super admin') ||
        name.includes('workspace admin') ||
        name.includes('owner')
      ) {
        return true;
      }
      if (r && typeof r === 'object' && r.is_system_role && !r.branch_id && !r.branch) {
        return true;
      }
      return false;
    });
    if (hasAdmin) return true;
  }

  const permissions = Array.isArray(user.permissions)
    ? user.permissions
    : user.permissions instanceof Set
    ? Array.from(user.permissions)
    : [];
  if (
    permissions.includes('crm.workspace.admin') ||
    permissions.includes('branches.manage') ||
    permissions.includes('branches.view') ||
    permissions.includes('workspace.admin')
  ) {
    return true;
  }

  return false;
};

export const getAccessibleBranchIds = (user, branches = []) => {
  const branchList = Array.isArray(branches) ? branches : [];
  if (!user) return [];
  if (hasCompanyWideAccess(user)) return branchList.map((branch) => resolveBranchId(branch));
  const userBranchIds = new Set(getUserBranchIds(user));
  if (!userBranchIds.size) return [];
  return branchList.filter((branch) => userBranchIds.has(String(resolveBranchId(branch)))).map((branch) => resolveBranchId(branch));
};

export const filterAccessibleBranches = (user, branches = []) => {
  const branchList = Array.isArray(branches) ? branches : [];
  if (!user) return [];
  if (hasCompanyWideAccess(user)) return branchList;
  const userBranchIds = new Set(getUserBranchIds(user));
  if (!userBranchIds.size) return [];
  return branchList.filter((branch) => userBranchIds.has(String(resolveBranchId(branch))));
};

export const resolveBranchId = (branch) => {
  if (branch === null || branch === undefined || branch === '') return null;
  if (typeof branch === 'object') return branch.id ?? branch.branch_id ?? branch.value ?? null;
  return branch;
};

export const resolveRoleBranchId = (role) => {
  if (!role) return null;
  const direct = role.branch ?? role.branch_id;
  if (direct !== undefined && direct !== null && direct !== '') return resolveBranchId(direct);
  if (Array.isArray(role.branch_details) && role.branch_details[0]) return resolveBranchId(role.branch_details[0]);
  if (role.branch_details) return resolveBranchId(role.branch_details);
  return null;
};

export const resolveRoleName = (role) => {
  if (!role) return 'No Role';
  if (typeof role === 'string') return role;
  return role.name || role.label || role.codename || 'No Role';
};
