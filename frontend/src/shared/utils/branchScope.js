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

export const getAccessibleBranchIds = (user, branches = []) => {
  const userBranchIds = new Set(getUserBranchIds(user));
  if (!userBranchIds.size) return [];
  return (Array.isArray(branches) ? branches : []).filter((branch) => userBranchIds.has(String(resolveBranchId(branch)))).map((branch) => resolveBranchId(branch));
};

export const filterAccessibleBranches = (user, branches = []) => {
  const userBranchIds = new Set(getUserBranchIds(user));
  if (!userBranchIds.size) return [];
  return (Array.isArray(branches) ? branches : []).filter((branch) => userBranchIds.has(String(resolveBranchId(branch))));
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
