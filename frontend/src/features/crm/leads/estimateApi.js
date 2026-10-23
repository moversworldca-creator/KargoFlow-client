/**
 * Tenant Estimates API.
 * Totals are authoritative and calculated exclusively by the backend.
 * Every mutating call carries `edit_version` for optimistic concurrency.
 */
import api from '../../../services/axios';

const BASE = '/tenant/estimates';
const SETTINGS_BASE = '/tenant/estimate-settings';

export const estimateApi = {
  /**
   * List estimates for an opportunity.
   * @param {number|string|{opportunity_id?: number|string, opportunity?: number|string}} params
   */
  async list(params) {
    const oppId = typeof params === 'object' && params !== null
      ? (params.opportunity_id ?? params.opportunity)
      : params;
    if (!oppId) {
      throw new Error('opportunity_id is required to list estimates.');
    }
    const query = typeof params === 'object' && params !== null
      ? { ...params, opportunity_id: oppId }
      : { opportunity_id: oppId };
    delete query.opportunity;
    return api.get(`${BASE}/`, { params: query });
  },

  /**
   * Retrieve full estimate detail by ID.
   * @param {number|string} id
   */
  async get(id) {
    return api.get(`${BASE}/${id}/`);
  },

  /**
   * Create a new estimate from an open opportunity.
   * @param {{opportunity_id: number|string, binding_type?: string}} data
   * @param {string} [idempotencyKey]
   */
  async create(data, idempotencyKey) {
    const oppId = data?.opportunity_id ?? data?.opportunity;
    if (!oppId) {
      throw new Error('opportunity_id is required to create an estimate.');
    }
    const payload = {
      ...data,
      opportunity_id: Number(oppId),
    };
    delete payload.opportunity;
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
    return api.post(`${BASE}/`, payload, headers ? { headers } : undefined);
  },

  /**
   * Update estimate inputs (per planned job), deposit, binding, NTE, tax exemption, notes.
   * Reprices automatically.
   * @param {number|string} id
   * @param {{edit_version: number, inputs?: object, deposit?: object, binding_type?: string, not_to_exceed_amount?: string|number|null, tax_exempt?: boolean, tax_exemption_reason?: string, tax_exemption_certificate_number?: string, access_notes?: string, packing_notes?: string, special_items_notes?: string, expires_at?: string}} data
   */
  async update(id, data) {
    return api.patch(`${BASE}/${id}/`, data);
  },

  /**
   * Recalculate estimate against current tariff rates and inputs.
   * @param {number|string} id
   * @param {number|{edit_version: number}} editVersion
   */
  async recalculate(id, editVersion) {
    const payload = typeof editVersion === 'object' && editVersion !== null
      ? editVersion
      : { edit_version: editVersion };
    return api.post(`${BASE}/${id}/recalculate/`, payload);
  },

  /**
   * Replace inventory items and reprice.
   * @param {number|string} id
   * @param {{edit_version: number, rooms: Array}} data
   */
  async replaceInventory(id, data) {
    return api.put(`${BASE}/${id}/inventory/`, data);
  },

  /**
   * Add a manual or discount charge to the estimate.
   * @param {number|string} id
   * @param {{source: 'manual'|'discount', edit_version: number, [key: string]: any}} data
   */
  async addCharge(id, data) {
    return api.post(`${BASE}/${id}/charges/`, data);
  },

  /**
   * Update an existing charge line (manual charge or tariff override).
   * @param {number|string} id
   * @param {number|string} chargeId
   * @param {{edit_version: number, [key: string]: any}} data
   */
  async updateCharge(id, chargeId, data) {
    return api.patch(`${BASE}/${id}/charges/${chargeId}/`, data);
  },

  /**
   * Delete a charge line (manual charges and discounts only; tariff lines disallow deletion).
   * @param {number|string} id
   * @param {number|string} chargeId
   * @param {number|{edit_version: number}} editVersion
   */
  async deleteCharge(id, chargeId, editVersion) {
    const payload = typeof editVersion === 'object' && editVersion !== null
      ? editVersion
      : { edit_version: editVersion };
    return api.delete(`${BASE}/${id}/charges/${chargeId}/`, { data: payload });
  },

  /**
   * Restore a tariff line override to its calculated tariff rate.
   * @param {number|string} id
   * @param {number|string} chargeId
   * @param {number} editVersion
   */
  async clearOverride(id, chargeId, editVersion) {
    return this.updateCharge(id, chargeId, {
      clear_override: true,
      edit_version: editVersion,
    });
  },

  /**
   * Revise an accepted estimate (marks reapproval required).
   * @param {number|string} id
   * @param {number|{edit_version: number}} editVersion
   */
  async revise(id, editVersion) {
    const payload = typeof editVersion === 'object' && editVersion !== null
      ? editVersion
      : { edit_version: editVersion };
    return api.post(`${BASE}/${id}/revise/`, payload);
  },

  /**
   * Supersede a sent or accepted estimate with a new draft replacement.
   * @param {number|string} id
   * @param {{edit_version: number, reason?: string}} data
   */
  async supersede(id, data) {
    return api.post(`${BASE}/${id}/supersede/`, data);
  },

  /**
   * Send the estimate to customer (snapshots the version and marks sent).
   * @param {number|string} id
   * @param {{edit_version: number, [key: string]: any}} data
   * @param {string} [idempotencyKey]
   */
  async send(id, data, idempotencyKey) {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;
    return api.post(`${BASE}/${id}/send/`, data, headers ? { headers } : undefined);
  },

  /**
   * Get an immutable snapshot version of a sent estimate.
   * @param {number|string} id
   * @param {number} versionNumber
   */
  async getVersion(id, versionNumber) {
    return api.get(`${BASE}/${id}/versions/${versionNumber}/`);
  },

  /**
   * Request internal approval when estimate requires review.
   * @param {number|string} id
   * @param {{reason?: string}} data
   */
  async requestApproval(id, data = {}) {
    return api.post(`${BASE}/${id}/request-approval/`, data);
  },

  /**
   * Approve or reject an estimate approval rule.
   * @param {number|string} id
   * @param {number|string} approvalId
   * @param {'approve'|'reject'} decision
   * @param {{comment?: string}} [data]
   */
  async decideApproval(id, approvalId, decision, data = {}) {
    return api.post(`${BASE}/${id}/approvals/${approvalId}/${decision}/`, data);
  },

  // ── Settings ──────────────────────────────────────────────────────────
  settings: {
    async list(kind) {
      return api.get(`${SETTINGS_BASE}/${kind}/`);
    },
    async create(kind, data) {
      return api.post(`${SETTINGS_BASE}/${kind}/`, data);
    },
    async update(kind, recordId, data) {
      return api.patch(`${SETTINGS_BASE}/${kind}/${recordId}/`, data);
    },
    async getDiscountPresets() {
      return this.list('discount_presets');
    },
    async createDiscountPreset(data) {
      return this.create('discount_presets', data);
    },
    async updateDiscountPreset(id, data) {
      return this.update('discount_presets', id, data);
    },
    async getApprovalRules() {
      return this.list('approval_rules');
    },
    async createApprovalRule(data) {
      return this.create('approval_rules', data);
    },
    async updateApprovalRule(id, data) {
      return this.update('approval_rules', id, data);
    },
  },
};

export default estimateApi;
