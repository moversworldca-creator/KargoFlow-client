// Pricing & Tariff Engine API (/api/tenant/pricing/). Every call goes through
// the shared axios client (auth, tenant headers, 403 notification); responses
// are the backend's JSON. No price is ever computed here.
import api from '../../services/axios';

const BASE = '/tenant/pricing';

const newKey = () => (typeof crypto !== 'undefined' && crypto.randomUUID
  ? crypto.randomUUID()
  : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

// Calculations take an Idempotency-Key so a double click or a retry returns the
// same Calculation Run instead of creating a second one.
const calcConfig = (idempotencyKey) => ({ headers: { 'Idempotency-Key': idempotencyKey || newKey() } });

export const pricingApi = {
  // Tariffs
  listTariffs: (params) => api.get(`${BASE}/tariffs/`, { params }),
  getTariff: (id) => api.get(`${BASE}/tariffs/${id}/`),
  createTariff: (data) => api.post(`${BASE}/tariffs/`, data),
  updateTariff: (id, data) => api.patch(`${BASE}/tariffs/${id}/`, data),
  setTariffState: (id, action) => api.post(`${BASE}/tariffs/${id}/${action}/`),
  createRevision: (tariffId, data) => api.post(`${BASE}/tariffs/${tariffId}/revisions/`, data),
  importRevision: (tariffId, document) => api.post(`${BASE}/tariffs/${tariffId}/import/`, document),

  // Revisions
  getRevision: (id) => api.get(`${BASE}/revisions/${id}/`),
  updateRevision: (id, data) => api.patch(`${BASE}/revisions/${id}/`, data),
  deleteRevision: (id) => api.delete(`${BASE}/revisions/${id}/`),
  createItem: (revisionId, kind, data) => api.post(`${BASE}/revisions/${revisionId}/items/${kind}/`, data),
  updateItem: (revisionId, kind, itemId, data) => api.patch(`${BASE}/revisions/${revisionId}/items/${kind}/${itemId}/`, data),
  deleteItem: (revisionId, kind, itemId, lockVersion) => api.delete(`${BASE}/revisions/${revisionId}/items/${kind}/${itemId}/`,
    { data: lockVersion != null ? { lock_version: lockVersion } : undefined }),
  bulkRates: (revisionId, data) => api.post(`${BASE}/revisions/${revisionId}/bulk-rates/`, data),
  replaceCells: (revisionId, tableId, data) => api.put(`${BASE}/revisions/${revisionId}/rate-tables/${tableId}/cells/`, data),
  exportRevision: (id) => api.get(`${BASE}/revisions/${id}/export/`),
  revisionAction: (id, action, data = {}) => api.post(`${BASE}/revisions/${id}/${action}/`, data),
  runScenarios: (id) => api.post(`${BASE}/revisions/${id}/scenarios/run/`),
  backtest: (id, data) => api.post(`${BASE}/revisions/${id}/backtest/`, data),
  activateDue: () => api.post(`${BASE}/revisions/activate-due/`),

  // Setup
  listSkills: () => api.get(`${BASE}/skills/`),
  createSkill: (data) => api.post(`${BASE}/skills/`, data),
  updateSkill: (id, data) => api.patch(`${BASE}/skills/${id}/`, data),
  employeeSkills: (employeeId) => api.get(`${BASE}/employee-skills/${employeeId}/`),
  assignEmployeeSkills: (employeeId, data) => api.post(`${BASE}/employee-skills/${employeeId}/assign/`, data),
  listOverlays: (params) => api.get(`${BASE}/overlays/`, { params }),
  createOverlay: (data) => api.post(`${BASE}/overlays/`, data),
  updateOverlay: (id, data) => api.patch(`${BASE}/overlays/${id}/`, data),
  overlayAction: (id, action) => api.post(`${BASE}/overlays/${id}/${action}/`),
  getPolicy: () => api.get(`${BASE}/policy/`),
  savePolicy: (data) => api.put(`${BASE}/policy/current/`, data),
  taxComponents: (profileId) => api.get(`${BASE}/tax-profiles/${profileId}/`),
  createTaxComponent: (profileId, data) => api.post(`${BASE}/tax-profiles/${profileId}/components/`, data),
  updateTaxComponent: (profileId, id, data) => api.patch(`${BASE}/tax-profiles/${profileId}/components/${id}/`, data),
  listExemptions: (params) => api.get(`${BASE}/tax-exemptions/`, { params }),
  createExemption: (data) => api.post(`${BASE}/tax-exemptions/`, data),
  decideExemption: (id, decision) => api.post(`${BASE}/tax-exemptions/${id}/decide/`, { decision }),

  // Calculation
  calculateEstimate: (estimateId, body, idempotencyKey) => api.post(`${BASE}/estimates/${estimateId}/calculate/`, body, calcConfig(idempotencyKey)),
  staleCheck: (estimateId, body) => api.post(`${BASE}/estimates/${estimateId}/stale-check/`, body),
  estimateRuns: (estimateId) => api.get(`${BASE}/estimates/${estimateId}/runs/`),
  customerPricing: (estimateId) => api.get(`${BASE}/estimates/${estimateId}/customer-pricing/`),
  listOverrides: (estimateId) => api.get(`${BASE}/estimates/${estimateId}/overrides/`),
  createOverride: (estimateId, data) => api.post(`${BASE}/estimates/${estimateId}/overrides/`, data),
  revokeOverride: (estimateId, overrideId, reason) => api.post(`${BASE}/estimates/${estimateId}/overrides/${overrideId}/revoke/`, { reason }),
  adoptForResend: (estimateId, runId) => api.post(`${BASE}/estimates/${estimateId}/adopt-for-resend/`, { run_id: runId }),
  commitments: (estimateId) => api.get(`${BASE}/estimates/${estimateId}/commitments/`),
  commitConstraints: (estimateId) => api.post(`${BASE}/estimates/${estimateId}/commitments/`),
  calculateChangeOrder: (changeOrderId, body, idempotencyKey) => api.post(`${BASE}/change-orders/${changeOrderId}/calculate/`, body, calcConfig(idempotencyKey)),
  finalRating: (opportunityId, body, idempotencyKey) => api.post(`${BASE}/opportunities/${opportunityId}/final-rating/`, body, calcConfig(idempotencyKey)),
  simulate: (body) => api.post(`${BASE}/simulations/`, body),
  listRuns: (params) => api.get(`${BASE}/runs/`, { params }),
  getRun: (id, view) => api.get(`${BASE}/runs/${id}/`, { params: view ? { view } : undefined }),
  explainRun: (id) => api.get(`${BASE}/runs/${id}/explain/`),
  listApprovals: (params) => api.get(`${BASE}/approvals/`, { params }),
  decideApproval: (id, approve, comment) => api.post(`${BASE}/approvals/${id}/${approve ? 'approve' : 'reject'}/`, { comment }),
};

export { newKey as newIdempotencyKey };
