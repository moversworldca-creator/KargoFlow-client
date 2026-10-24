import tenantAxios from './tenantAxios';

const data = (request) => request.then((response) => response.data);

export const tenantApi = {
  ensureCsrf: () => data(tenantAxios.get('/auth/csrf/')),
  login: (credentials) => data(tenantAxios.post('/auth/login/', { identity_type: 'tenant', ...credentials })),
  me: (options = {}) => data(tenantAxios.get('/auth/me/', options)),
  logout: () => data(tenantAxios.post('/auth/logout/', {}, { skipSessionExpiry: true })),
  company: () => data(tenantAxios.get('/tenant/companies/')),
  companySettings: () => data(tenantAxios.get('/tenant/company-settings/')),
  saveCompanySettings: (id, values) => data(tenantAxios.patch(`/tenant/company-settings/${id}/`, { values })),
  branches: () => data(tenantAxios.get('/tenant/branches/')),
  createBranch: (payload) => data(tenantAxios.post('/tenant/branches/', payload)),
  branchSettings: (id) => data(tenantAxios.get(`/tenant/branch-settings/${id}/`)),
  saveBranchSettings: (id, values) => data(tenantAxios.patch(`/tenant/branch-settings/${id}/`, { values })),
  resetBranchSetting: (id, key) => data(tenantAxios.delete(`/tenant/branch-settings/${id}/${encodeURIComponent(key)}/`)),
  branchAction: (id, action, payload) => data(tenantAxios.post(`/tenant/branches/${id}/${action}/`, payload)),
  employees: () => data(tenantAxios.get('/tenant/employees/')),
  createEmployee: (payload) => data(tenantAxios.post('/tenant/employees/', payload)),
  inviteEmployee: (id, email) => data(tenantAxios.post(`/tenant/employees/${id}/invite/`, { email })),
  acceptInvitation: (token, password) => data(tenantAxios.post('/tenant/invitations/accept/', { token, password })),
  invitations: () => data(tenantAxios.get('/tenant/employees/invitations/')),
  users: () => data(tenantAxios.get('/tenant/users/')),
  userAction: (id, action) => data(tenantAxios.post(`/tenant/users/${id}/${action}/`)),
  roles: () => data(tenantAxios.get('/tenant/rbac/roles/')),
  permissions: () => data(tenantAxios.get('/tenant/rbac/permissions/')),
  createRole: (payload) => data(tenantAxios.post('/tenant/rbac/roles/', payload)),
  updateRole: (id, payload) => data(tenantAxios.patch(`/tenant/rbac/roles/${id}/`, payload)),
  rolePermissions: (id) => data(tenantAxios.get(`/tenant/rbac/roles/${id}/permissions/`)),
  grantRolePermission: (id, payload) => data(tenantAxios.post(`/tenant/rbac/roles/${id}/permissions/`, payload)),
  revokeRolePermission: (id, payload) => data(tenantAxios.delete(`/tenant/rbac/roles/${id}/permissions/`, { params: payload })),
  assignRole: (payload) => data(tenantAxios.post('/tenant/users/assign-role/', payload)),
  userAccess: (id) => data(tenantAxios.get(`/tenant/users/${id}/access/`)),
  userBranches: (id) => data(tenantAxios.get(`/tenant/users/${id}/branches/`)),
  addUserBranch: (id, branchId) => data(tenantAxios.post(`/tenant/users/${id}/branches/`, { branch_id: branchId })),
  removeUserBranch: (id, branchId) => data(tenantAxios.delete(`/tenant/users/${id}/branches/${branchId}/`)),
  revokeInvitation: (id) => data(tenantAxios.post(`/tenant/employees/invitations/${id}/revoke/`)),
};

export default tenantApi;
