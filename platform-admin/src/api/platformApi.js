import platformAxios from './platformAxios';

export const platformApi = {
  // Auth
  // Sets the CSRF cookie that state-changing requests echo back.
  ensureCsrf: async () => {
    return platformAxios.get('/auth/csrf/');
  },
  login: async (credentials) => {
    return platformAxios.post('/auth/login/', { identity_type: 'platform', ...credentials });
  },
  // Revokes the session server-side and deletes the HttpOnly cookie.
  logout: async () => {
    return platformAxios.post('/auth/logout/', {}, { skipSessionExpiry: true, timeout: 10000 });
  },
  getPlatformAuthMe: async (options = {}) => {
    return platformAxios.get('/auth/me/', options);
  },
  switchPlatformUser: async (userId) => {
    return platformAxios.post('/auth/switch/', { user_id: userId });
  },
  bootstrapSuperAdmin: async (data = {}) => {
    return platformAxios.post('/auth/bootstrap/', data);
  },
  updateProfile: async (data = {}) => {
    return platformAxios.put('/auth/profile/', data);
  },
  changePassword: async (data = {}) => {
    return platformAxios.post('/auth/change-password/', data);
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
  activatePlan: async (id) => {
    return platformAxios.post(`/core/plans/${id}/activate/`);
  },
  retirePlan: async (id) => {
    return platformAxios.post(`/core/plans/${id}/retire/`);
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
  getSubscriptionHistory: async (id) => {
    return platformAxios.get(`/core/subscriptions/${id}/history/`);
  },
  transitionSubscription: async (id, data = {}) => {
    const { next_status, new_status, status, reason, grace_period_days, fields = {}, metadata, ...rest } = data;
    const finalNewStatus = new_status || next_status || status;
    const transitionFields = { ...fields };
    if (grace_period_days && !transitionFields.grace_period_ends_at) {
      transitionFields.grace_period_ends_at = new Date(Date.now() + Number(grace_period_days) * 86400000).toISOString();
    }
    const payload = {
      subscription_id: id,
      new_status: finalNewStatus,
      reason: reason || '',
      ...rest,
    };
    if (metadata) {
      payload.metadata = metadata;
    }
    if (Object.keys(transitionFields).length > 0) {
      payload.fields = transitionFields;
    }
    return platformAxios.post('/core/subscriptions/transition/', payload);
  },
  changeSubscriptionPlan: async (id, data = {}) => {
    const planId = data.new_plan_id || data.plan_id;
    const companyId = data.company_id || data.tenant_id;
    const effective = data.effective_timing || data.effective || 'immediate';
    const reason = data.reason || 'Commercial plan change';

    if (companyId) {
      try {
        return await platformAxios.post(`/core/subscriptions/${companyId}/change-plan/`, {
          plan_id: Number(planId),
          effective,
          reason,
        });
      } catch (err) {
        if (err?.response?.status !== 400 && err?.response?.status !== 404) {
          throw err;
        }
      }
    }

    return platformAxios.post('/core/subscriptions/transition/', {
      subscription_id: id,
      new_status: data.current_status || 'active',
      reason,
      fields: {
        plan_id: Number(planId),
      },
    });
  },
  cancelSubscription: async (id, data = {}) => {
    const companyId = data.company_id || data.tenant_id;
    const reason = data.reason || 'Subscription cancelled';
    if (data.cancel_mode === 'period_end' && companyId) {
      try {
        return await platformAxios.post(`/core/subscriptions/${companyId}/cancel-at-period-end/`, {
          reason,
        });
      } catch (err) {
        // Fall back to transition
      }
    }
    return platformAxios.post('/core/subscriptions/transition/', {
      subscription_id: id,
      new_status: 'cancelled',
      reason,
      ...(data.cancel_mode === 'period_end' ? { fields: { cancel_at_period_end: true } } : {}),
    });
  },
  reactivateSubscription: async (id, data = {}) => {
    return platformAxios.post('/core/subscriptions/transition/', {
      subscription_id: id,
      new_status: 'active',
      reason: data.reason || 'Subscription reactivated',
    });
  },
  updateSubscriptionTrial: async (id, data = {}) => {
    return platformAxios.post('/core/subscriptions/transition/', {
      subscription_id: id,
      new_status: data.current_status || 'trialing',
      reason: data.reason || 'Admin trial adjustment',
      fields: {
        trial_ends_at: data.trial_ends_at,
      },
    });
  },
  updateSubscriptionGracePeriod: async (id, data = {}) => {
    return platformAxios.post('/core/subscriptions/transition/', {
      subscription_id: id,
      new_status: data.current_status || 'past_due',
      reason: data.reason || 'Admin grace adjustment',
      fields: {
        grace_period_ends_at: data.grace_period_ends_at,
      },
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
  createTenantConsoleToken: async (sessionId) => {
    return platformAxios.post(`/core/tenant-sessions/${sessionId}/console-token/`);
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

  // Communication Infrastructure Console (Section 2.4)
  // Platform routes live under /core/: the API binds the acting platform user
  // (and therefore permissions and the audit trail) only on that prefix.
  getCommunicationOverview: async () => {
    return platformAxios.get('/core/communication/overview/');
  },
  getCommunicationResend: async () => {
    return platformAxios.get('/core/communication/resend/');
  },
  getCommunicationTelnyx: async () => {
    return platformAxios.get('/core/communication/telnyx/');
  },
  getCommunicationHealth: async () => {
    return platformAxios.get('/core/communication/health/');
  },
  getCommunicationAuditLogs: async (params = {}) => {
    return platformAxios.get('/core/communication/audit/', { params });
  },
  testCommunicationConnection: async (provider) => {
    return platformAxios.post('/core/communication/test-connection/', { provider });
  },
  rotateCommunicationKey: async (provider, newKey) => {
    return platformAxios.post('/core/communication/rotate-key/', { provider, new_key: newKey });
  },
  suspendCommunicationProvider: async (provider, confirmation, reason = '') => {
    return platformAxios.post('/core/communication/suspend-provider/', { provider, confirmation, reason });
  },
  resumeCommunicationProvider: async (provider) => {
    return platformAxios.post('/core/communication/resume-provider/', { provider });
  },
  verifyCommunicationDomainDns: async (domain) => {
    return platformAxios.post('/core/communication/verify-dns/', { domain });
  },
  configureCommunicationProvider: async (data = {}) => {
    return platformAxios.post('/core/communication/configure/', data);
  },
};

export default platformApi;
