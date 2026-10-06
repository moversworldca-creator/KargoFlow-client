import platformAxios from './platformAxios';

export const platformApi = {
  // Auth
  login: async (credentials) => {
    return platformAxios.post('/auth/login/', credentials);
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
    return platformAxios.get('/dashboard/');
  },

  // Tenants
  getTenants: async (params = {}) => {
    return platformAxios.get('/tenants/', { params });
  },
  getTenant: async (id) => {
    return platformAxios.get(`/tenants/${id}/`);
  },
  provisionTenant: async (data = {}) => {
    return platformAxios.post('/tenants/', data);
  },
  updateTenant: async (id, data = {}) => {
    return platformAxios.patch(`/tenants/${id}/`, data);
  },
  updateTenantStatus: async (id, data = {}) => {
    return platformAxios.post(`/tenants/${id}/status/`, data);
  },

  // Plans
  getPlans: async () => {
    return platformAxios.get('/plans/');
  },
  createPlan: async (data = {}) => {
    return platformAxios.post('/plans/', data);
  },
  updatePlan: async (id, data = {}) => {
    return platformAxios.patch(`/plans/${id}/`, data);
  },

  // Features
  getFeatures: async () => {
    return platformAxios.get('/features/');
  },

  // Subscriptions
  getSubscriptions: async (params = {}) => {
    return platformAxios.get('/subscriptions/', { params });
  },
  transitionSubscription: async (id, data = {}) => {
    return platformAxios.post(`/subscriptions/${id}/transition/`, data);
  },
  changeSubscriptionPlan: async (id, data = {}) => {
    return platformAxios.post(`/subscriptions/${id}/plan-change/`, data);
  },
  cancelSubscription: async (id, data = {}) => {
    return platformAxios.post(`/subscriptions/${id}/cancel/`, data);
  },
  reactivateSubscription: async (id, data = {}) => {
    return platformAxios.post(`/subscriptions/${id}/reactivate/`, data);
  },
  updateSubscriptionTrial: async (id, data = {}) => {
    return platformAxios.post(`/subscriptions/${id}/trial/`, data);
  },
  updateSubscriptionGracePeriod: async (id, data = {}) => {
    return platformAxios.post(`/subscriptions/${id}/grace-period/`, data);
  },

  // Entitlements & Overrides
  getTenantEntitlements: async (tenantId) => {
    return platformAxios.get(`/tenants/${tenantId}/entitlements/`);
  },
  createTenantOverride: async (tenantId, data = {}) => {
    return platformAxios.post(`/tenants/${tenantId}/overrides/`, data);
  },
  deleteTenantOverride: async (tenantId, overrideId) => {
    return platformAxios.delete(`/tenants/${tenantId}/overrides/${overrideId}/`);
  },

  // Addons
  getAddons: async () => {
    return platformAxios.get('/add-ons/');
  },
  assignTenantAddon: async (tenantId, data = {}) => {
    return platformAxios.post(`/tenants/${tenantId}/add-ons/`, data);
  },

  // Support Sessions
  getSupportSessions: async () => {
    return platformAxios.get('/support-sessions/');
  },
  createSupportSession: async (data = {}) => {
    return platformAxios.post('/support-sessions/', data);
  },
  endSupportSession: async (sessionId) => {
    return platformAxios.post(`/support-sessions/${sessionId}/end/`);
  },

  // Audit Logs
  getAuditLogs: async (params = {}) => {
    return platformAxios.get('/audit-logs/', { params });
  },

  // Admins & Roles
  getAdmins: async (params = {}) => {
    return platformAxios.get('/admins/', { params });
  },
  getAdmin: async (id) => {
    return platformAxios.get(`/admins/${id}/`);
  },
  createAdmin: async (data = {}) => {
    return platformAxios.post('/admins/', data);
  },
  inviteAdmin: async (data = {}) => {
    return platformAxios.post('/admins/invite/', data);
  },
  updateAdmin: async (id, data = {}) => {
    return platformAxios.patch(`/admins/${id}/`, data);
  },
  suspendAdmin: async (id, reason = '') => {
    return platformAxios.post(`/admins/${id}/suspend/`, { reason });
  },
  reactivateAdmin: async (id, reason = '') => {
    return platformAxios.post(`/admins/${id}/reactivate/`, { reason });
  },
  getRoles: async () => {
    return platformAxios.get('/roles/');
  },

  // Seed / Reset Presentation Data
  seedDemoData: async (data = {}) => {
    return platformAxios.post('/seed-data/', data);
  },
  resetDemoData: async () => {
    return platformAxios.post('/reset-demo/');
  },
};

export default platformApi;
