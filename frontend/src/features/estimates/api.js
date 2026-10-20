// Estimates / Quotes API. Staff calls go to /api/tenant/...; the customer
// portal calls /api/public/estimate-portal/ without a session (skipAuth) and
// sends its link secret in the request body, never in the URL path.
import api from '../../services/axios';

export const estimatesApi = {
  workspace: (opportunityId) => api.get(`/tenant/opportunity-estimates/${opportunityId}/`),
  createEstimate: (opportunityId, data) => api.post(`/tenant/opportunity-estimates/${opportunityId}/estimates/`, data),
  createProposalGroup: (opportunityId, data) => api.post(`/tenant/opportunity-estimates/${opportunityId}/proposal-groups/`, data),
  addOption: (opportunityId, groupId, estimateId) => api.post(`/tenant/opportunity-estimates/${opportunityId}/proposal-groups/${groupId}/options/`, { estimate_id: estimateId }),
  selectOption: (opportunityId, groupId, estimateId) => api.post(`/tenant/opportunity-estimates/${opportunityId}/proposal-groups/${groupId}/select/`, { estimate_id: estimateId }),
  createChangeOrder: (opportunityId, data) => api.post(`/tenant/opportunity-estimates/${opportunityId}/change-orders/`, data),

  getEstimate: (id) => api.get(`/tenant/estimates/${id}/`),
  updateEstimate: (id, data) => api.patch(`/tenant/estimates/${id}/`, data),
  setScope: (id, data) => api.put(`/tenant/estimates/${id}/scope/`, data),
  savePricingInputs: (id, inputs, lockVersion) => api.put(`/tenant/estimates/${id}/pricing-inputs/`, { inputs, lock_version: lockVersion ?? null }),
  markReady: (id) => api.post(`/tenant/estimates/${id}/ready/`),
  send: (id, data = {}) => api.post(`/tenant/estimates/${id}/send/`, data),
  reissueLink: (id) => api.post(`/tenant/estimates/${id}/reissue-link/`),
  recordAcceptance: (id, data) => api.post(`/tenant/estimates/${id}/accept/`, data),
  cancel: (id, reason) => api.post(`/tenant/estimates/${id}/cancel/`, { reason }),
  revise: (id, reason) => api.post(`/tenant/estimates/${id}/revise/`, { reason }),

  getChangeOrder: (id) => api.get(`/tenant/change-orders/${id}/`),
  updateChangeOrder: (id, data) => api.patch(`/tenant/change-orders/${id}/`, data),
  changeOrderReady: (id) => api.post(`/tenant/change-orders/${id}/ready/`),
  sendChangeOrder: (id) => api.post(`/tenant/change-orders/${id}/send/`),
  recordChangeOrderAcceptance: (id, data) => api.post(`/tenant/change-orders/${id}/accept/`, data),
  cancelChangeOrder: (id, reason) => api.post(`/tenant/change-orders/${id}/cancel/`, { reason }),

  // Booking is the Opportunity's own command; acceptance never books.
  bookingReadiness: (opportunityId) => api.get(`/tenant/opportunities/${opportunityId}/booking-readiness/`),
  book: (opportunityId, data = {}) => api.post(`/tenant/opportunities/${opportunityId}/book/`, data),

  // Sending the link goes through Communications (the Opportunity's email).
  sendEmail: (opportunityId, data) => api.post(`/tenant/opportunities/${opportunityId}/communications/email/`, data),
};

export const portalApi = {
  view: (token, optionKey) => api.post('/public/estimate-portal/view/', { token, ...(optionKey ? { option_key: optionKey } : {}) }, { skipAuth: true }),
  accept: (token, data) => api.post('/public/estimate-portal/accept/', { token, ...data }, { skipAuth: true }),
};
