import api from '../../../services/axios';

/**
 * Inbound Lead Engine API Client
 * Interfaces with Django DRF tenant controllers:
 * - LeadProviderController (/tenant/lead-providers/)
 * - LeadRoutingRuleController (/tenant/lead-routing-rules/)
 * - LeadBranchRouteController (/tenant/lead-branch-routes/)
 * - LeadSalesSettingsController (/tenant/lead-settings/)
 * - LeadIntakeEventController (/tenant/lead-intake-events/)
 */

export const providerApi = {
  list: async () => {
    const res = await api.get('/tenant/lead-providers/');
    return Array.isArray(res) ? res : res?.results || [];
  },
  get: (id) => api.get(`/tenant/lead-providers/${id}/`),
  create: (data) => api.post('/tenant/lead-providers/', data),
  update: (id, data) => api.patch(`/tenant/lead-providers/${id}/`, data),
  rotateSecret: (id) => api.post(`/tenant/lead-providers/${id}/rotate-secret/`),

  // Provider Branch Targets (Selected branch fan-out)
  listBranches: async (providerId) => {
    const res = await api.get(`/tenant/lead-providers/${providerId}/branches/`);
    return Array.isArray(res) ? res : res?.results || [];
  },
  addBranch: (providerId, data) => api.post(`/tenant/lead-providers/${providerId}/branches/`, data),
  updateBranch: (providerId, recordId, data) => api.patch(`/tenant/lead-providers/${providerId}/branches/${recordId}/`, data),
  removeBranch: (providerId, recordId) => api.delete(`/tenant/lead-providers/${providerId}/branches/${recordId}/`),

  // Provider Normalization Mappings
  listMappings: async (providerId) => {
    const res = await api.get(`/tenant/lead-providers/${providerId}/mappings/`);
    return Array.isArray(res) ? res : res?.results || [];
  },
  createMapping: (providerId, data) => api.post(`/tenant/lead-providers/${providerId}/mappings/`, data),
  updateMapping: (providerId, recordId, data) => api.patch(`/tenant/lead-providers/${providerId}/mappings/${recordId}/`, data),
  removeMapping: (providerId, recordId) => api.delete(`/tenant/lead-providers/${providerId}/mappings/${recordId}/`),
};

export const routingApi = {
  listRules: async (params = {}) => {
    const res = await api.get('/tenant/lead-routing-rules/', { params });
    return Array.isArray(res) ? res : res?.results || [];
  },
  createRule: (data) => api.post('/tenant/lead-routing-rules/', data),
  updateRule: (id, data) => api.patch(`/tenant/lead-routing-rules/${id}/`, data),
  deleteRule: (id) => api.delete(`/tenant/lead-routing-rules/${id}/`),

  listBranchRoutes: async () => {
    const res = await api.get('/tenant/lead-branch-routes/');
    return Array.isArray(res) ? res : res?.results || [];
  },
  createBranchRoute: (data) => api.post('/tenant/lead-branch-routes/', data),
  deleteBranchRoute: (id) => api.delete(`/tenant/lead-branch-routes/${id}/`),

  getSalesSettings: () => api.get('/tenant/lead-settings/'),
  updateSalesSettings: (data) => api.patch('/tenant/lead-settings/', data),
};

export const intakeAuditApi = {
  listEvents: async (params = {}) => {
    const res = await api.get('/tenant/lead-intake-events/', { params: { limit: 100, offset: 0, ...params } });
    return Array.isArray(res) ? res : res?.results || [];
  },
  getEvent: (id) => api.get(`/tenant/lead-intake-events/${id}/`),
  getBranchResults: async (id) => {
    const res = await api.get(`/tenant/lead-intake-events/${id}/branch-results/`);
    return Array.isArray(res) ? res : res?.results || [];
  },
};
