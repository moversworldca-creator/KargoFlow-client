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

export const isCompanyWideUser = (user) => {
  if (!user || typeof user !== 'object') return false;
  if (user.is_superuser || user.is_system_admin) return true;
  if (user.is_owner || user.worker_type === 'owner' || user.employee_type === 'owner') return true;
  if (user.role === 'admin' || user.role === 'owner' || user.role === 'super_admin') return true;
  if (Array.isArray(user.roles) && user.roles.some((r) => typeof r === 'string' && ['admin', 'owner', 'company admin', 'company owner', 'super admin'].includes(r.toLowerCase()))) {
    return true;
  }
  if (Array.isArray(user.role_details)) {
    const isCompanyRole = user.role_details.some(
      (r) =>
        r &&
        (r.branch_id === null ||
          r.branch_id === undefined ||
          r.scope === 'company' ||
          ['Company Admin', 'Company Owner', 'Super Admin', 'Admin', 'Owner'].includes(r.name))
    );
    if (isCompanyRole) return true;
  }
  if (Array.isArray(user.permissions)) {
    const hasAdminPerm = user.permissions.some((p) =>
      ['crm.admin', 'branches.manage', 'branches.view', 'settings.manage', 'company.manage'].includes(p)
    );
    if (hasAdminPerm) return true;
  }
  return false;
};

export const getAccessibleBranchIds = (user, branches = []) => {
  const allBranches = Array.isArray(branches) ? branches : [];
  if (!user) return [];
  if (isCompanyWideUser(user)) {
    return allBranches.map((branch) => resolveBranchId(branch));
  }
  const userBranchIds = new Set(getUserBranchIds(user));
  if (!userBranchIds.size) return [];
  return allBranches.filter((branch) => userBranchIds.has(String(resolveBranchId(branch)))).map((branch) => resolveBranchId(branch));
};

export const filterAccessibleBranches = (user, branches = []) => {
  const allBranches = Array.isArray(branches) ? branches : [];
  if (!user) return [];
  if (isCompanyWideUser(user)) {
    return allBranches;
  }
  const userBranchIds = new Set(getUserBranchIds(user));
  if (!userBranchIds.size) return [];
  return allBranches.filter((branch) => userBranchIds.has(String(resolveBranchId(branch))));
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
