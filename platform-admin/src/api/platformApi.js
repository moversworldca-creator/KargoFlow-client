import platformAxios from './platformAxios';

export const platformApi = {
  // Auth
  login: async (credentials) => {
    return platformAxios.post('/auth/login/', { identity_type: 'platform', ...credentials });
  },
  getPlatformAuthMe: async () => {
    return platformAxios.get('/auth/me/');
  },
  switchPlatformUser: async (userId) => {
    return platformAxios.post('/auth/switch/', { user_id: userId });
  },
  bootstrapSuperAdmin: async (data = {}) => {
    return platformAxios.post('/auth/bootstrap/', data);
  },

  // Dashboard
  getDashboard: async () => {
    return platformAxios.get('/core/dashboard/');
  },

  // Tenants
  getTenants: async (params = {}) => {
    return platformAxios.get('/core/tenants/', { params });
  },
  getTenant: async (id) => {
    return platformAxios.get(`/core/tenants/${id}/`);
  },
  provisionTenant: async (data = {}) => {
    return platformAxios.post('/core/tenants/', data);
  },
  updateTenant: async (id, data = {}) => {
    return platformAxios.patch(`/core/tenants/${id}/`, data);
  },
  updateTenantStatus: async (id, data = {}) => {
    return platformAxios.post(`/core/tenants/${id}/status/`, data);
  },

  // Plans
  getPlans: async () => {
    return platformAxios.get('/core/plans/');
  },
  createPlan: async (data = {}) => {
    return platformAxios.post('/core/plans/', data);
  },
  updatePlan: async (id, data = {}) => {
    return platformAxios.patch(`/core/plans/${id}/`, data);
  },
  updatePlanFeatures: async (id, features = []) => {
    return platformAxios.put(`/core/plans/${id}/features/`, { features });
  },

  // Features & Limits
  getFeatures: async () => {
    return platformAxios.get('/core/features/');
  },
  getLimits: async () => {
    return platformAxios.get('/core/limits/');
  },

  // Subscriptions
  getSubscriptions: async (params = {}) => {
    return platformAxios.get('/core/subscriptions/', { params });
  },
  transitionSubscription: async (id, data = {}) => {
    const newStatus = data.new_status || data.next_status || data.status;
    return platformAxios.post('/core/subscriptions/transition/', {
      subscription_id: Number(id),
      new_status: newStatus,
      reason: data.reason || 'Status transition',
      fields: data.fields,
      metadata: data.metadata,
      ...data,
      new_status: newStatus,
    });
  },
  changeSubscriptionPlan: async (companyOrSubId, data = {}) => {
    return platformAxios.post(`/core/subscriptions/${companyOrSubId}/change-plan/`, {
      plan_id: Number(data.new_plan_id || data.plan_id),
      effective: data.effective || data.effective_timing || 'immediate',
      reason: data.reason || 'Commercial plan change',
    });
  },
  cancelSubscription: async (id, data = {}) => {
    return platformAxios.post('/core/subscriptions/transition/', {
      subscription_id: Number(id),
      new_status: 'cancelled',
      reason: data.reason || 'Subscription cancelled',
      ...data,
      new_status: 'cancelled',
    });
  },
  reactivateSubscription: async (id, data = {}) => {
    return platformAxios.post('/core/subscriptions/transition/', {
      subscription_id: Number(id),
      new_status: 'active',
      reason: data.reason || 'Subscription reactivated',
      ...data,
      new_status: 'active',
    });
  },
  updateSubscriptionTrial: async (id, data = {}) => {
    return platformAxios.post('/core/subscriptions/trial/', {
      company_id: data.company_id || data.tenant_id,
      plan_id: data.plan_id,
      trial_ends_at: data.trial_ends_at,
      ...data,
    });
  },
  updateSubscriptionGracePeriod: async (companyOrSubId, data = {}) => {
    return platformAxios.post(`/core/subscriptions/${companyOrSubId}/grace/`, {
      grace_days: Number(data.grace_days || data.grace_period_days || 7),
      reason: data.reason || 'Grace period adjusted',
    });
  },

  // Entitlements & Overrides
  getTenantEntitlements: async (tenantId) => {
    return platformAxios.get(`/core/company-entitlements/${tenantId}/`);
  },
  createTenantOverride: async (tenantId, data = {}) => {
    return platformAxios.post(`/core/company-entitlements/${tenantId}/overrides/`, data);
  },
  deleteTenantOverride: async (tenantId, overrideId) => {
    return platformAxios.delete(`/core/company-entitlements/${tenantId}/overrides/${overrideId}/`);
  },

  // Addons
  getAddons: async () => {
    return platformAxios.get('/core/add-ons/');
  },
  assignTenantAddon: async (tenantId, data = {}) => {
    return platformAxios.post('/core/add-ons/assign/', { tenant_company_id: tenantId, ...data });
  },

  // Support Sessions
  getSupportSessions: async () => {
    return platformAxios.get('/core/tenant-sessions/');
  },
  createSupportSession: async (data = {}) => {
    return platformAxios.post('/core/tenant-sessions/', data);
  },
  endSupportSession: async (sessionId) => {
    return platformAxios.post(`/core/tenant-sessions/${sessionId}/end/`);
  },
  checkTenantAccess: async (tenantCompanyId, requestedAccessMode = 'read') => {
    return platformAxios.post('/core/tenant-access/check/', {
      tenant_company_id: tenantCompanyId,
      requested_access_mode: requestedAccessMode,
    });
  },

  // Audit Logs
  getAuditLogs: async (params = {}) => {
    return platformAxios.get('/core/audit-logs/', { params });
  },

  // Admins & Roles
  getAdmins: async (params = {}) => {
    return platformAxios.get('/core/platform-users/', { params });
  },
  getAdmin: async (id) => {
    return platformAxios.get(`/core/platform-users/${id}/`);
  },
  createAdmin: async (data = {}) => {
    return platformAxios.post('/core/platform-users/', data);
  },
  inviteAdmin: async (data = {}) => {
    return platformAxios.post('/core/platform-users/', data);
  },
  updateAdmin: async (id, data = {}) => {
    return platformAxios.patch(`/core/platform-users/${id}/`, data);
  },
  suspendAdmin: async (id, reason = '') => {
    return platformAxios.post(`/core/platform-users/${id}/suspend/`, { reason });
  },
  reactivateAdmin: async (id, reason = '') => {
    return platformAxios.post(`/core/platform-users/${id}/reactivate/`, { reason });
  },
  getRoles: async () => {
    return platformAxios.get('/core/platform-users/roles/');
  },

  // Seed / Reset Presentation Data
  seedDemoData: async (data = {}) => {
    return platformAxios.post('/core/seed-data/', data);
  },
  resetDemoData: async () => {
    return platformAxios.post('/core/reset-demo/');
  },
};

export default platformApi;
