import api from '../../../services/axios';

const BASE = '/tenant/leads/';
const EDITABLE = new Set([
  'first_name', 'last_name', 'full_name', 'email', 'phone', 'phone_type', 'phone_extension',
  'notes', 'move_date', 'bedrooms', 'lead_cost', 'origin_street', 'origin_unit_number',
  'origin_city', 'origin_state', 'origin_zip', 'origin_property_type', 'origin_flights_of_stairs',
  'origin_has_elevator', 'origin_parking_type', 'origin_walk_distance_ft',
  'destination_street', 'destination_unit_number', 'destination_city', 'destination_state',
  'destination_zip', 'destination_property_type', 'destination_flights_of_stairs',
  'destination_has_elevator', 'destination_parking_type', 'destination_walk_distance_ft',
  'referral_source_id', 'move_type_id', 'service_type_id', 'opportunity_type_id',
  'move_size_id', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content',
  'utm_keyword', 'utm_ad_group', 'utm_custom',
]);
const ALIASES = {
  branch: 'branch_id', assigned_to: 'assigned_user_id', custom_status_code: 'custom_status_code_id',
  referral_source: 'referral_source_id', move_type: 'move_type_id', service_type: 'service_type_id',
  move_size: 'move_size_id', origin_address_line1: 'origin_street',
  destination_address_line1: 'destination_street',
};
const REFS = new Set(['branch_id', 'assigned_employee_id', 'assigned_user_id', 'custom_status_code_id',
  'referral_source_id', 'move_type_id', 'service_type_id', 'opportunity_type_id', 'move_size_id']);

export function leadPayload(input, { create = false } = {}) {
  const result = {};
  for (const [name, value] of Object.entries(input || {})) {
    const field = ALIASES[name] || name;
    if (name === 'assigned_to' && input.assigned_employee_id != null) continue;
    if (name !== field && Object.prototype.hasOwnProperty.call(input, field)) continue;
    if (!EDITABLE.has(field) && field !== 'branch_id' && !(create && ['assigned_employee_id', 'assigned_user_id', 'custom_status_code_id'].includes(field))) continue;
    if (value === undefined || (REFS.has(field) && value === '')) continue;
    if (REFS.has(field) && value != null) {
      const id = Number(value);
      if (!Number.isInteger(id) || id < 1) throw new Error(`${field} must be a valid catalog ID.`);
      result[field] = id;
    } else {
      result[field] = value;
    }
  }
  if (create && !result.branch_id) throw new Error('Select a branch before creating a lead.');
  return result;
}

export function leadRecord(row) {
  if (!row) return row;
  const fullName = String(
    row.full_name || row.customer_name || row.lead_name || row.name || row.contact_name || ''
  ).trim();
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const firstName = String(row.first_name || '').trim() || nameParts[0] || '';
  const lastName = String(row.last_name || '').trim() || nameParts.slice(1).join(' ');
  return {
    ...row,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName || `${firstName} ${lastName}`.trim(),
    move_date: row.move_date ? String(row.move_date).slice(0, 10) : null,
    status: row.system_state,
    branch: row.branch_id,
    assigned_to: row.assigned_employee_id,
    custom_status_code: row.custom_status_code_id,
    referral_source: row.referral_source_id,
    move_type: row.move_type_id,
    service_type: row.service_type_id,
    move_size: row.move_size_id,
  };
}

export const leadApi = {
  async list(params = {}) {
    const page = await api.get(BASE, { params: { limit: 200, ...params } });
    return { ...page, results: (page.results || []).map(leadRecord) };
  },
  async listAll(params = {}) {
    const first = await this.list({ ...params, limit: 200, offset: 0 });
    const results = [...first.results];
    for (let offset = 200; offset < first.count; offset += 200) {
      const page = await this.list({ ...params, limit: 200, offset });
      results.push(...page.results);
      if (!page.results.length) break;
    }
    return { ...first, results };
  },
  async get(id) { return leadRecord(await api.get(`${BASE}${id}/`)); },
  async create(data) { return leadRecord(await api.post(BASE, leadPayload(data, { create: true }))); },
  async update(id, data) { return leadRecord(await api.patch(`${BASE}${id}/`, leadPayload(data))); },
  async assign(id, assignee) {
    return leadRecord(assignee
      ? await api.post(`${BASE}${id}/assign/`, assignee)
      : await api.delete(`${BASE}${id}/assignment/`));
  },
  async transition(id, action, body = {}) {
    return leadRecord(await api.post(`${BASE}${id}/${action}/`, body));
  },
  async setCustomStatus(id, statusCodeId) {
    return leadRecord(await api.put(`${BASE}${id}/custom-status/`, { status_code_id: statusCodeId == null ? null : Number(statusCodeId) }));
  },
  convert: (id, body = {}) => api.post(`${BASE}${id}/convert/`, body),
  activities: (id) => api.get(`${BASE}${id}/activities/`),
  createActivity: (id, body) => api.post(`${BASE}${id}/activities/`, body),
  updateActivity: (id, activityId, body) => api.patch(`${BASE}${id}/activities/${activityId}/`, body),
  inventory: (id) => api.get(`${BASE}${id}/inventory/`),
  consent: (id) => api.get(`${BASE}${id}/consent/`),
  stateHistory: (id) => api.get(`${BASE}${id}/state-history/`),
  dispositions: (id) => api.get(`${BASE}${id}/dispositions/`),
};
