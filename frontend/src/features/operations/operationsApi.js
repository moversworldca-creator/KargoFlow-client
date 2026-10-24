// Operational jobs and estimate lifecycle (/api/tenant/jobs/, /api/tenant/estimate-lifecycle/).
// The backend decides which moves are allowed and records them.
import api from '../../services/axios';

export const jobsApi = {
  list: (params) => api.get('/tenant/jobs/', { params }),
  get: (id) => api.get(`/tenant/jobs/${id}/`),
  /** domain: booking | customer-confirmation | dispatch | execution */
  move: (id, domain, toState, reason = '') => api.post(`/tenant/jobs/${id}/${domain}/`, { to_state: toState, reason }),
  finalize: (id, data) => api.post(`/tenant/jobs/${id}/finalize/`, data),
  close: (id, reason = '') => api.post(`/tenant/jobs/${id}/close/`, { reason }),
};

export const estimateLifecycleApi = {
  list: (opportunityId) => api.get('/tenant/estimate-lifecycle/', { params: { opportunity_id: opportunityId } }),
  move: (id, toState, reason = '') => api.post(`/tenant/estimate-lifecycle/${id}/transition/`, { to_state: toState, reason }),
  recordAcceptance: (id, data) => api.post(`/tenant/estimate-lifecycle/${id}/record-acceptance/`, data),
};

export const plannedJobApi = {
  list: (opportunityId) => api.get(`/tenant/opportunities/${opportunityId}/jobs/`),
  /** action: request-confirmation | confirm | decline */
  confirmation: (opportunityId, jobId, action) => api.post(`/tenant/opportunities/${opportunityId}/jobs/${jobId}/${action}/`, {}),
};

/** The message the backend gave (its business rules explain refusals). */
export function errorText(error, fallback = 'The change was not saved.') {
  const data = error?.response?.data || {};
  if (typeof data.detail === 'string' && data.detail) return data.detail;
  const first = Object.values(data).flat().find((v) => typeof v === 'string');
  return first || fallback;
}

export const asList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);
