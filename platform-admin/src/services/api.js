import platformAxios from './axios';
import auth from './auth';

/**
 * Platform Admin Centralized API Service
 * Maps directly to backend Django endpoints under /api/core/ and /api/auth/.
 */

// 1. Features
export const features = {
  getAll: (params = {}) => platformAxios.get('/core/features/', { params }),
  get: (id) => platformAxios.get(`/core/features/${id}/`),
  create: (data = {}) => platformAxios.post('/core/features/', data),
  update: (id, data = {}) => platformAxios.patch(`/core/features/${id}/`, data),
  activate: (id) => platformAxios.post(`/core/features/${id}/activate/`),
  retire: (id) => platformAxios.post(`/core/features/${id}/retire/`),
};

// 2. Limits
export const limits = {
  getAll: (params = {}) => platformAxios.get('/core/limits/', { params }),
  get: (id) => platformAxios.get(`/core/limits/${id}/`),
  create: (data = {}) => platformAxios.post('/core/limits/', data),
  update: (id, data = {}) => platformAxios.patch(`/core/limits/${id}/`, data),
  activate: (id) => platformAxios.post(`/core/limits/${id}/activate/`),
  retire: (id) => platformAxios.post(`/core/limits/${id}/retire/`),
};

// 3. Plans
export const plans = {
  getAll: (params = {}) => platformAxios.get('/core/plans/', { params }),
  get: (id) => platformAxios.get(`/core/plans/${id}/`),
  getLimits: (id) => platformAxios.get(`/core/plans/${id}/limits/`),
  create: (data = {}) => platformAxios.post('/core/plans/', data),
  update: (id, data = {}) => platformAxios.patch(`/core/plans/${id}/`, data),
  activate: (id) => platformAxios.post(`/core/plans/${id}/activate/`),
  updateFeatures: (id, featureData = {}) => platformAxios.put(`/core/plans/${id}/features/`, featureData),
  updateLimits: (id, limitData = {}) => platformAxios.put(`/core/plans/${id}/limits/`, limitData),
  retire: (id) => platformAxios.post(`/core/plans/${id}/retire/`),
};

// 4. Platform Users
export const platformUsers = {
  getAll: (params = {}) => platformAxios.get('/core/platform-users/', { params }),
  create: (data = {}) => platformAxios.post('/core/platform-users/', data),
  get: (id) => platformAxios.get(`/core/platform-users/${id}/`),
  getRoles: (id) => platformAxios.get(`/core/platform-users/${id}/roles/`),
  grantRole: (data = {}) => {
    const payload = typeof data === 'object' && data !== null ? {
      target_platform_user_id: Number(data.target_platform_user_id ?? data.selectedUser?.id ?? data.userId ?? data.id),
      role_code: data.role_code ?? data.selectedRole ?? data.role ?? data.roleCode,
    } : data;
    return platformAxios.post('/core/platform-users/grant-role/', payload);
  },
};

// 5. Subscriptions
export const subscriptions = {
  // Note: Backend does not expose a global list endpoint (GET /api/core/subscriptions/).
  getAll: async () => ({ data: [] }),
  get: (id) => platformAxios.get(`/core/subscriptions/${id}/`),
  getHistory: (id) => platformAxios.get(`/core/subscriptions/${id}/history/`),
  transition: (data = {}) => platformAxios.post('/core/subscriptions/transition/', data),
  trial: (data = {}) => platformAxios.post('/core/subscriptions/trial/', data),
  createTrial: (data = {}) => platformAxios.post('/core/subscriptions/trial/', data),
};

// 6. Tenant Access
export const tenantAccess = {
  getAll: (params = {}) => platformAxios.get('/core/tenant-access/', { params }),
  check: (data = {}) => platformAxios.post('/core/tenant-access/check/', data),
  getCompanies: (params = {}) => platformAxios.get('/core/tenant-access/companies/', { params }),
  set: (data = {}) => platformAxios.post('/core/tenant-access/set/', data),
};

// 7. Tenant Sessions
export const tenantSessions = {
  // Note: Backend does not expose a list endpoint (GET /api/core/tenant-sessions/).
  getAll: async () => ({ data: [] }),
  create: (data = {}) => platformAxios.post('/core/tenant-sessions/', data),
  end: (id) => platformAxios.post(`/core/tenant-sessions/${id}/end/`),
};

// 8. Company Entitlements
export const companyEntitlements = {
  get: (id) => platformAxios.get(`/core/company-entitlements/${id}/`),
};

// 9. Audit Logs
export const auditLogs = {
  getAll: (params = {}) => platformAxios.get('/core/audit-logs/', { params }),
};

// 10. Direct Helper & Compatibility Aliases
export const api = {
  // Namespaces
  features,
  limits,
  plans,
  platformUsers,
  subscriptions,
  tenantAccess,
  tenantSessions,
  companyEntitlements,
  auditLogs,
  auth,

  // Features
  getFeatures: features.getAll,
  getFeature: features.get,
  createFeature: features.create,
  updateFeature: features.update,
  activateFeature: features.activate,
  retireFeature: features.retire,

  // Limits
  getLimits: limits.getAll,
  getLimit: limits.get,
  createLimit: limits.create,
  updateLimit: limits.update,
  activateLimit: limits.activate,
  retireLimit: limits.retire,

  // Plans
  getPlans: plans.getAll,
  getPlan: plans.get,
  getPlanLimits: plans.getLimits,
  createPlan: plans.create,
  updatePlan: plans.update,
  activatePlan: plans.activate,
  updatePlanFeatures: plans.updateFeatures,
  updatePlanLimits: plans.updateLimits,
  retirePlan: plans.retire,

  // Platform Users / Staff
  getPlatformUsers: platformUsers.getAll,
  getAdmins: platformUsers.getAll,
  getPlatformUser: platformUsers.get,
  getAdmin: platformUsers.get,
  createPlatformUser: platformUsers.create,
  createAdmin: platformUsers.create,
  inviteAdmin: platformUsers.create,
  updatePlatformUser: (id, data = {}) => platformAxios.patch(`/core/platform-users/${id}/`, data),
  updateAdmin: (id, data = {}) => platformAxios.patch(`/core/platform-users/${id}/`, data),
  suspendAdmin: (id, reason = '') =>
    platformAxios.patch(`/core/platform-users/${id}/`, { is_active: false, status: 'suspended', reason }),
  reactivateAdmin: (id, reason = '') =>
    platformAxios.patch(`/core/platform-users/${id}/`, { is_active: true, status: 'active', reason }),
  getPlatformUserRoles: platformUsers.getRoles,
  getRoles: (id) => (id ? platformUsers.getRoles(id) : platformUsers.getAll()),
  grantPlatformUserRole: platformUsers.grantRole,
  grantRole: platformUsers.grantRole,

  // Subscriptions
  getSubscriptions: subscriptions.getAll,
  getSubscription: subscriptions.get,
  getSubscriptionHistory: subscriptions.getHistory,
  transitionSubscription: (idOrData, extra = {}) => {
    if (typeof idOrData === 'object' && idOrData !== null) {
      return subscriptions.transition(idOrData);
    }
    return subscriptions.transition({ subscription_id: idOrData, ...extra });
  },
  createSubscriptionTrial: subscriptions.trial,
  updateSubscriptionTrial: (id, data = {}) => subscriptions.trial(data),
  changeSubscriptionPlan: (id, data = {}) =>
    subscriptions.transition({ subscription_id: id, ...data }),
  cancelSubscription: (id, data = {}) =>
    subscriptions.transition({ subscription_id: id, new_status: 'cancelled', ...data }),
  reactivateSubscription: (id, data = {}) =>
    subscriptions.transition({ subscription_id: id, new_status: 'active', ...data }),
  updateSubscriptionGracePeriod: (id, data = {}) =>
    subscriptions.transition({ subscription_id: id, ...data }),

  // Tenant Access & Support Sessions
  getTenantAccess: tenantAccess.getAll,
  checkTenantAccess: tenantAccess.check,
  getTenantAccessCompanies: tenantAccess.getCompanies,
  setTenantAccess: tenantAccess.set,
  getSupportSessions: tenantSessions.getAll,
  createSupportSession: tenantSessions.create,
  endSupportSession: tenantSessions.end,

  // Company Entitlements
  getCompanyEntitlements: companyEntitlements.get,
  getTenantEntitlements: (tenantId) => companyEntitlements.get(tenantId),
  createTenantOverride: (tenantId, data = {}) => platformAxios.post('/tenant/entitlements/override/', data),
  deleteTenantOverride: (tenantId, overrideId) => platformAxios.delete(`/tenant/entitlements/override/${overrideId}/`),
  getAddons: (params = {}) => features.getAll(params),
  assignTenantAddon: (tenantId, data = {}) => platformAxios.post('/tenant/entitlements/add-ons/', data),

  // Audit Logs
  getAuditLogs: auditLogs.getAll,

  // Auth
  login: auth.login,
  getCurrentUser: auth.getCurrentUser,
  getPlatformAuthMe: auth.getPlatformAuthMe,
  switchUser: auth.switchUser,
  switchPlatformUser: auth.switchPlatformUser,
  logout: auth.logout,

  // Multi-tenant Directory & Onboarding (Cross-cutting UI helpers)
  getDashboard: () => platformAxios.get('/dashboard/'),
  getTenants: (params = {}) => platformAxios.get('/core/tenant-access/companies/', { params }),
  getTenant: (id) => platformAxios.get(`/tenant/companies/${id}/`),
  provisionTenant: (data = {}) => platformAxios.post('/tenant/onboarding/', data),
  updateTenant: (id, data = {}) => platformAxios.patch(`/tenant/companies/${id}/`, data),
  updateTenantStatus: (id, data = {}) => platformAxios.patch(`/tenant/companies/${id}/`, data),

  // Presentation / Demo seed helpers
  seedDemoData: (data = {}) => platformAxios.post('/seed-data/', data),
  resetDemoData: () => platformAxios.post('/reset-demo/'),
};

export default api;
