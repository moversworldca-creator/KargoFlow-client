import api from "./axios";
import { readOpportunity } from '../features/crm/leads/opportunityReadApi';
import { getTenantStaff } from '../features/crm/leads/salesOverviewApi';
import { recordActivities, recordTasks, createRecordActivity, updateRecordActivity, createRecordTask, updateRecordTask } from '../features/crm/leads/recordWorkApi';
import { leadApi, leadPayload } from '../features/crm/leads/leadApi';
import { getPipelineQueue } from '../features/crm/leads/pipelineApi';

const FILE_TARGET_TYPE_MAP = {
  lead: "leads.lead",
  customer: "leads.customer",
  opportunity: "sales.opportunity",
  job: "jobs.job",
  estimate: "estimates.estimate",
  automationworkflow: "automations.automationworkflow",
};

const normalizeFileTargetType = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.includes(".")) return raw;
  return FILE_TARGET_TYPE_MAP[raw] || raw;
};

// Auth APIs
export const login = (credentials) => api.post("/auth/login/", { ...credentials, identity_type: 'tenant' }, { skipAuth: true });
export const me = () => api.get("/tenant/users/me/");
export const updateMe = (data) => api.patch("/tenant/users/me/", data);
export const changePassword = (data) => api.post("/auth/password-change/", data);

// User APIs
export const getUsers = (params) => api.get("/tenant/users/", { params });
export const getLookupUsers = (params = { limit: 50 }) => api.get("/tenant/users/", { params });
export const getUser = (id) => api.get(`/tenant/users/${id}/`);
export const updateUser = (id, data) => api.patch(`/tenant/users/${id}/`, data);
// One role per user per branch: { user_id, role_id, branch_id }. A new role in a
// branch replaces the one held there. branch_id null only for the system roles
// held company-wide (Company Admin, crew roles).
export const assignUserRole = (data) => api.post("/tenant/users/assign-role/", data);
export const unassignUserRole = (data) => api.post("/tenant/users/unassign-role/", data);
export const deactivateUser = (id) => api.post(`/tenant/users/${id}/deactivate/`);
export const reactivateUser = (id) => api.post(`/tenant/users/${id}/reactivate/`);
export const getUserBranches = (id) => api.get(`/tenant/users/${id}/branches/`);
export const addUserBranch = (userId, branchId) => api.post(`/tenant/users/${userId}/branches/`, { branch_id: Number(branchId) });
export const removeUserBranch = (userId, branchId) => api.delete(`/tenant/users/${userId}/branches/${branchId}/`);
// Roles, branch memberships and direct overrides of one login (users.view).
export const getUserAccess = (userId) => api.get(`/tenant/users/${userId}/access/`);

export const acceptEmployeeInvitation = (data) => api.post('/tenant/invitations/accept/', data, { skipAuth: true });

// Employee APIs
export const getEmployees = (params) => api.get("/tenant/employees/", { params });
export const getEmployee = (id) => api.get(`/tenant/employees/${id}/`);
export const createEmployee = (data) => api.post("/tenant/employees/", data);
export const updateEmployee = (id, data) => api.patch(`/tenant/employees/${id}/`, data);
export const setEmployeeTemporaryPassword = (id, password) => api.post(`/tenant/employees/${id}/set-temporary-password/`, { password });
export const inviteEmployee = (id, data = {}) => api.post(`/tenant/employees/${id}/invite/`, data);
export const terminateEmployee = (id, data = {}) => api.post(`/tenant/employees/${id}/terminate/`, data);
export const rehireEmployee = (id, data = {}) => api.post(`/tenant/employees/${id}/rehire/`, data);
export const getEmployeeInvitations = () => api.get("/tenant/employees/invitations/");
export const revokeEmployeeInvitation = (id) => api.post(`/tenant/employees/invitations/${id}/revoke/`);

// Role APIs
export const getRoles = (params) => api.get("/tenant/rbac/roles/", { params });
export const createRole = (data) => api.post("/tenant/rbac/roles/", data);
export const updateRole = (id, data) => api.patch(`/tenant/rbac/roles/${id}/`, data);
export const deactivateRole = (id) => api.patch(`/tenant/rbac/roles/${id}/`, { is_active: false });
export const reactivateRole = (id) => api.patch(`/tenant/rbac/roles/${id}/`, { is_active: true });
export const deleteRole = deactivateRole;
export const getRolePermissions = (roleId) => api.get(`/tenant/rbac/roles/${roleId}/permissions/`);
export const grantRolePermission = (roleId, data) => api.post(`/tenant/rbac/roles/${roleId}/permissions/`, data);
export const revokeRolePermission = (roleId, data) => api.delete(`/tenant/rbac/roles/${roleId}/permissions/`, { data });

// Permission APIs
export const getPermissions = () => api.get("/tenant/rbac/permissions/");

// Direct user overrides (ALLOW / DENY). Listing needs rbac_overrides.view,
// creating and revoking rbac_overrides.manage.
export const getUserOverrides = (params = {}) => api.get("/tenant/rbac/user-overrides/", { params });
export const createUserOverride = (data) => api.post("/tenant/rbac/user-overrides/", data);
export const revokeUserOverride = (id) => api.post(`/tenant/rbac/user-overrides/${id}/revoke/`);
// The backend's explanation of one authorization decision (rbac_permissions.view).
export const explainAccess = (data) => api.post("/tenant/rbac/explain/", data);

// Plan features and subscription access mode (entitlements.view).
export const getEntitlementSnapshot = () => api.get("/tenant/entitlements/snapshot/");

// Core APIs
export const getAuditLogs = (params = {}) => api.get("/tenant/audit-logs/", { params });
export const getSecurityAuditLogs = (params = {}) => api.get("/tenant/security-audit-logs/", { params });
export const getRbacDecisionLogs = (params = {}) => api.get("/tenant/rbac-decision-logs/", { params });
export const universalSearch = (params) => api.get("/search/", { params });

// Branch APIs
export const getBranches = () => api.get("/tenant/branches/");
export const getBranchLookups = (params = {limit: 50}) => api.get("/tenant/branches/", { params });
export const createBranch = (data) => api.post("/tenant/branches/", data);
export const updateBranch = (id, data) => api.patch(`/tenant/branches/${id}/`, data);
export const deleteBranch = (id) => api.delete(`/tenant/branches/${id}/`);
export const makeMainBranch = (id) => api.post(`/tenant/branches/${id}/make-main/`);
export const getBranchSettings = (id) => api.get(`/tenant/branch-settings/${id}/`);
export const updateBranchSettings = (id, data) => api.patch(`/tenant/branch-settings/${id}/`, data);
export const resetBranchSetting = (id, key) => api.delete(`/tenant/branch-settings/${id}/${key}/`);
export const getBranchTaxProfiles = (params) => api.get("/tenant/branch-tax-profiles/", { params });
export const getBranchWeeklyWindows = (params) => api.get("/tenant/branch-weekly-windows/", { params });
export const saveBranchWeeklyWindows = (data) => api.post("/tenant/branch-weekly-windows/", data);
export const getBranchBranding = (id) => api.get(`/tenant/branch-branding/${id}/`);
export const updateBranchBranding = (id, data) => api.patch(`/tenant/branch-branding/${id}/`, data);

// Company APIs
export const getCompany = (id) => api.get(`/tenant/companies/${id}/`);
export const getCompanies = (params) => api.get("/tenant/companies/", { params });
export const createCompany = (data) => api.post("/tenant/onboarding/", data);
export const onboardCompany = (data) => api.post("/tenant/onboarding/", data);
export const updateCompany = (id, data) => api.patch(`/tenant/companies/${id}/`, data);
export const deleteCompany = (id) => api.delete(`/tenant/companies/${id}/`);
export const getCompanySettings = () => api.get("/tenant/company-settings/");
export const updateCompanySettings = (id, data) => api.patch(`/tenant/company-settings/${id}/`, data);
export const getCompanyBranding = () => api.get("/tenant/company-branding/current/");
export const updateCompanyBranding = (data) => api.patch("/tenant/company-branding/current/", data);
export const uploadBranchLogo = (id, file) => {
  const formData = new FormData();
  formData.append("logo", file);
  return api.patch(`/tenant/branch-branding/${id}/`, formData);
};
export const removeBranchLogo = (id) => api.patch(`/tenant/branch-branding/${id}/`, { logo_url: null });

// Notifications APIs
const notificationPayload = (record) => record?.data ?? record;
export const getNotifications = async (params) => {
  const records = await api.get("/tenant/notifications/", { params });
  return records.map(notificationPayload);
};
export const getUnreadNotificationsCount = () => api.get("/tenant/notifications/unread-count/");
export const markNotificationRead = async (id) => notificationPayload(await api.post(`/tenant/notifications/${id}/mark-read/`));
export const markNotificationUnread = async (id) => notificationPayload(await api.post(`/tenant/notifications/${id}/mark-unread/`));
export const markAllNotificationsRead = () => api.post("/tenant/notifications/mark-all-read/");

// Lead APIs
export const getLeads = (params) => params ? leadApi.list(params) : leadApi.listAll();
export const getLead = (id) => leadApi.get(id);
export const getLeadBySalesNumber = async (salesNumber) => {
  const detail = await api.get(`/tenant/pipeline/${salesNumber}/`);
  if (detail?.item?.kind !== 'lead') throw new Error(`Sales number ${salesNumber} is not a lead.`);
  return leadApi.get(detail.item.id);
};
export const createLead = (data) => leadApi.create(data);
export const updateLead = async (id, data = {}) => {
  const payload = leadPayload(data);
  const requestedState = data.status === 'contacted' ? 'in_progress' : data.status;
  let current = null;
  let action = null;
  if (requestedState) {
    current = await leadApi.get(id);
    if (requestedState !== current.system_state) {
      action = { in_progress: current.system_state === 'lost' ? 'reopen' : 'start', qualified: 'qualify', archived: 'archive' }[requestedState];
      if (!action) throw new Error(`Use the lead workflow to change status to ${requestedState}.`);
    }
  }
  let updated = Object.keys(payload).length ? await leadApi.update(id, payload) : current;
  if (data.custom_status_code !== undefined || data.custom_status_code_id !== undefined) {
    const statusId = data.custom_status_code_id ?? data.custom_status_code;
    updated = await leadApi.setCustomStatus(id, statusId === '' ? null : statusId);
  }
  if (data.assigned_employee_id !== undefined || data.assigned_to !== undefined || data.assigned_user_id !== undefined) {
    const employeeId = data.assigned_employee_id;
    const userId = data.assigned_user_id ?? data.assigned_to;
    updated = await leadApi.assign(id, employeeId ? { employee_id: Number(employeeId) } : userId ? { user_id: Number(userId) } : null);
  }
  if (action) updated = await leadApi.transition(id, action, { reason: data.reason || '' });
  return updated || leadApi.get(id);
};
export const archiveLead = (id, reason = '') => leadApi.transition(id, 'archive', { reason });
export const deleteLead = (id) => archiveLead(id, 'Archived from CRM hub');
export const duplicateLead = async (id) => {
  const source = await leadApi.get(id);
  return leadApi.create(leadPayload(source, { create: true }));
};
export const convertLead = async (id, data = {}) => {
  const result = await leadApi.convert(id, data);
  return {
    ...result,
    opportunity: result.opportunity_id
      ? { id: result.opportunity_id, opportunity_number: result.opportunity_number }
      : null,
  };
};
export const assignLead = async (id, data) => {
  if (data?.branch && Number(data.branch) !== Number((await leadApi.get(id)).branch_id)) {
    await leadApi.update(id, { branch_id: data.branch });
  }
  const employeeId = data?.employee_id ?? data?.assigned_employee_id;
  const userId = data?.user_id ?? data?.assigned_to;
  return leadApi.assign(id, employeeId ? { employee_id: Number(employeeId) } : userId ? { user_id: Number(userId) } : null);
};
export const setLeadCustomStatus = (id, statusCodeId) => leadApi.setCustomStatus(id, statusCodeId);
export const startLead = (id, reason = '') => leadApi.transition(id, 'start', { reason });
export const qualifyLead = (id, reason = '') => leadApi.transition(id, 'qualify', { reason });
export const bulkUpdateLeadStatus = async ({ ids = [], status_code_id }) => Promise.all(ids.map((id) => setLeadCustomStatus(id, status_code_id)));
export const bulkEmailLeads = () => { throw new Error('Bulk email requires the communications API.'); };
export const bulkSmsLeads = () => { throw new Error('Bulk SMS requires the communications API.'); };
export const markLeadLost = (id, data) => leadApi.transition(id, 'lost', data);
export const reopenLead = (id, data = {}) => leadApi.transition(id, 'reopen', data);
export const getReferralSources = (params) => api.get("/tenant/referral-sources/", { params });
export const getReferralSourceLookups = (params) => api.get("/tenant/referral-sources/", { params });
export const createReferralSource = (data) => api.post("/tenant/referral-sources/", data);
export const updateReferralSource = (id, data) => api.patch(`/tenant/referral-sources/${id}/`, data);
export const deleteReferralSource = (id) => api.delete(`/tenant/referral-sources/${id}/`);
export const getLeadStatusCodes = (params) => api.get("/tenant/lead-statuses/", { params });
export const getLeadStatusCodeLookups = (params) => api.get("/tenant/lead-statuses/", { params });
export const createLeadStatusCode = (data) => api.post("/tenant/lead-statuses/", data);
export const updateLeadStatusCode = (id, data) => api.patch(`/tenant/lead-statuses/${id}/`, data);
export const deleteLeadStatusCode = (id) => api.delete(`/tenant/lead-statuses/${id}/`);
export const getInboundLeadConfig = () => api.get("/tenant/lead-settings/");
export const updateInboundLeadConfig = (data) => api.patch("/tenant/lead-settings/current/", data);
export const rotateInboundLeadSecret = (providerId = 1) => api.post(`/tenant/lead-providers/${providerId}/rotate-secret/`);
export const getLeadActivities = ({ lead_id, lead, branch, ...params } = {}) => {
  const id = lead_id ?? lead;
  return id ? leadApi.activities(id) : api.get('/tenant/leads/activity-feed/', {
    params: { ...params, ...(branch ? { branch_id: branch } : {}) },
  });
};
export const createLeadActivity = ({ lead_id, lead, content, ...data }) =>
  leadApi.createActivity(lead_id ?? lead, { ...data, description: data.description ?? content ?? '' });
export const updateLeadActivity = (id, data) => {
  const leadId = data.lead_id ?? data.lead;
  if (!leadId) throw new Error('A lead ID is required to update an activity.');
  return leadApi.updateActivity(leadId, id, {
    subject: data.subject, description: data.description ?? data.content,
    status: data.status, is_pinned: data.is_pinned,
  });
};
export const deleteLeadActivity = () => { throw new Error('Deleting lead activities is not supported.'); };



// Customer profiles and contacts are separate resources in the tenant API.
const customerPath = (id) => `/tenant/customers/${id}/`;
const customerName = (data) => [data.first_name, data.last_name].filter(Boolean).join(' ').trim();
const legacyCustomer = (customer, contacts = []) => {
  const primary = contacts.find((contact) => contact.is_primary && contact.is_active !== false) || null;
  const parts = String(customer.profile_name || '').trim().split(/\s+/);
  return {
    ...customer,
    full_name: customer.profile_name,
    first_name: parts[0] || '',
    last_name: parts.slice(1).join(' '),
    email: primary?.email || customer.primary_email || '',
    primary_phone: primary?.phone || customer.primary_phone || '',
    contacts: contacts.filter((contact) => contact.is_active !== false),
  };
};
const customerProfile = async (id) => {
  const profile = await api.get(`${customerPath(id)}profile/`);
  return legacyCustomer(profile.customer, profile.contacts || []);
};
export const getCustomers = async (params) => {
  const result = await api.get('/tenant/customers/', { params });
  return { ...result, results: (result.results || []).map((row) => legacyCustomer(row)) };
};
export const getCustomer = customerProfile;
export const createCustomer = async (data) => {
  const name = data.profile_name || customerName(data);
  const email = String(data.email || '').trim();
  const phone = String(data.primary_phone || data.phone || '').trim();
  const payload = {
    profile_name: name,
    customer_type: data.customer_type || 'individual',
    notes: data.notes || '',
    ...(email || phone ? { primary_contact: { name, email, phone, phone_type: data.primary_phone_type || '' } } : {}),
  };
  const created = await api.post('/tenant/customers/', payload);
  return customerProfile(created.id);
};
export const updateCustomer = async (id, data) => {
  const current = await customerProfile(id);
  const name = data.profile_name || customerName(data);
  if (name && name !== current.profile_name) {
    await api.patch(customerPath(id), { profile_name: name });
  }
  const primary = current.contacts.find((contact) => contact.is_primary);
  const contact = {
    name: name || current.profile_name,
    email: data.email ?? current.email,
    phone: data.primary_phone ?? data.phone ?? current.primary_phone,
  };
  if (primary) {
    if (contact.name !== primary.name || contact.email !== primary.email || contact.phone !== primary.phone) {
      await api.patch(`${customerPath(id)}contacts/${primary.id}/`, contact);
    }
  } else if (contact.email || contact.phone) {
    await api.post(`${customerPath(id)}contacts/`, { ...contact, is_primary: true });
  }
  return customerProfile(id);
};
export const deleteCustomer = () => { throw new Error('Customer profiles cannot be deleted.'); };
export const createCustomerContact = ({ customer, ...data }) => api.post(`${customerPath(customer)}contacts/`, data);
export const updateCustomerContact = (id, data, customerId) => api.patch(`${customerPath(customerId)}contacts/${id}/`, data);
export const deleteCustomerContact = (id, customerId) => api.delete(`${customerPath(customerId)}contacts/${id}/`);

// ================= SALES APIs =================
export const getMyLeadsQueue = (params) => getPipelineQueue(params);
export const getDashboardSummary = (params) => api.get("/sales/dashboard-summary/", { params });
export const getSalesDashboardSummary = (params) => api.get("/sales/dashboard-summary-lite/", { params });
export const getOpportunities = (params) => api.get("/sales/opportunities/", { params });
export const getTimelineEvents = ({ entity_type, entity_id, limit = 20, before_id } = {}) => {
  const kind = entity_type === 'opportunity' ? 'opportunities' : 'leads';
  return api.get(`/tenant/${kind}/${entity_id}/communications/`, {
    params: { limit, ...(before_id ? { before_id } : {}) },
  });
};
export const sendRecordEmail = (entityType, entityId, data) => {
  const kind = entityType === 'opportunity' ? 'opportunities' : 'leads';
  if (data.attachments?.length) {
    const form = new FormData();
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) value.forEach(item => form.append(key, item));
      else form.append(key, value);
    }
    return api.post(`/tenant/${kind}/${entityId}/communications/email/`, form);
  }
  return api.post(`/tenant/${kind}/${entityId}/communications/email/`, data);
};
export const sendRecordSms = (entityType, entityId, data) => api.post(`/tenant/${entityType === 'opportunity' ? 'opportunities' : 'leads'}/${entityId}/communications/sms/`, data);
export const recordLeadSmsConsent = (leadId, destination) => api.post(`/tenant/leads/${leadId}/consent/`, {
  channel: 'sms', destination, consent_state: 'opted_in', source: 'crm', policy_version: 'v1',
});
export const recordRecordSmsConsent = (entityType, entityId, destination) => api.post(`/tenant/${entityType === 'opportunity' ? 'opportunities' : 'leads'}/${entityId}/communications/sms-consent/`, { destination });
export const getOpportunity = (id) => readOpportunity(id);
export const getOpportunityBySalesNumber = async (salesNumber) => {
  const detail = await api.get(`/tenant/pipeline/${salesNumber}/`);
  if (detail.item?.kind !== 'opportunity') throw new Error('This sales number is not an opportunity.');
  return readOpportunity(detail.item.id);
};
export const duplicateOpportunity = (id) => api.post(`/sales/opportunities/${id}/duplicate/`);
const opportunityFieldAliases = {
  branch: 'branch_id', customer: 'customer_id', assigned_user: 'assigned_employee_id',
  custom_status_code: 'custom_status_code_id', service_type: 'service_type_id',
  move_type: 'move_type_id', mover_size: 'move_size_id', move_size: 'move_size_id',
  referral_source: 'referral_source_id',
};
const opportunityEditableFields = new Set([
  'move_date', 'preferred_start_time', 'arrival_window_start', 'arrival_window_end', 'bedrooms',
  'notes_internal', 'opportunity_type_id', 'move_type_id', 'move_size_id', 'service_type_id',
  'referral_source_id', 'volume_weight_method', 'estimated_volume_cuft', 'estimated_weight_lbs',
  'lead_cost', 'utm_source', 'utm_medium', 'utm_campaign',
]);
const opportunityPayload = (data, { create = false } = {}) => {
  const result = {};
  for (const [key, value] of Object.entries(data || {})) {
    const field = opportunityFieldAliases[key] || key;
    if (opportunityEditableFields.has(field) || (create && ['branch_id', 'customer_id', 'assigned_employee_id', 'custom_status_code_id'].includes(field))) {
      result[field] = value === '' && field.endsWith('_id') ? null : value;
    }
  }
  return result;
};
const normalizeOpportunityUpdate = (row) => ({
  ...row,
  status: row?.system_state,
  branch: row?.branch_id,
  customer: row?.customer_id,
  assigned_user: row?.assigned_employee_id,
  custom_status_code: row?.custom_status_code_id,
  service_type: row?.service_type_id,
  move_type: row?.move_type_id,
  mover_size: row?.move_size_id,
  referral_source: row?.referral_source_id,
});
export const createOpportunity = async (data) => normalizeOpportunityUpdate(
  await api.post('/tenant/opportunities/', opportunityPayload(data, { create: true }))
);
export const updateOpportunity = async (id, data = {}) => {
  const path = `/tenant/opportunities/${id}/`;
  const generic = opportunityPayload(data);
  let updated = Object.keys(generic).length ? await api.patch(path, generic) : null;

  const statusValue = data.custom_status_code_id ?? data.custom_status_code;
  if (statusValue !== undefined) {
    updated = await api.put(`${path}custom-status/`, { status_code_id: statusValue ? Number(statusValue) : null });
  }
  const assigneeValue = data.assigned_employee_id ?? data.assigned_user;
  if (assigneeValue !== undefined) {
    updated = assigneeValue
      ? await api.post(`${path}assign/`, { employee_id: Number(assigneeValue) })
      : await api.delete(`${path}assignment/`);
  }
  const branchValue = data.branch_id ?? data.branch;
  if (branchValue !== undefined && branchValue !== null && branchValue !== '') {
    updated = await api.post(`${path}change-branch/`, { branch_id: Number(branchValue), reason: 'Updated from sales details' });
  }
  return normalizeOpportunityUpdate(updated || await api.get(path));
};
export const getOpportunityAvailability = (id, date = "") =>
  api.get(`/sales/opportunities/${id}/availability/`, { params: { date } });
export const getOpportunityAccountingSummary = (id) => api.get(`/sales/opportunities/${id}/accounting-summary/`);
export const getOpportunityAccountingInvoicePreview = (id, estimateId, jobId) => api.get(`/sales/opportunities/${id}/accounting-invoice-preview/`, { params: { ...(estimateId ? { estimate_id: estimateId } : {}), ...(jobId ? { job_id: jobId } : {}) } });
export const getOpportunityInvoiceDraft = (id, estimateId, jobId) => api.get(`/sales/opportunities/${id}/accounting-invoice-draft/`, { params: { ...(estimateId ? { estimate_id: estimateId } : {}), ...(jobId ? { job_id: jobId } : {}) } });
export const saveOpportunityInvoiceDraft = (id, data) => api.post(`/sales/opportunities/${id}/accounting-invoice-draft/`, data);
export const finalizeOpportunityInvoice = (id, data = {}) => api.post(`/sales/opportunities/${id}/accounting-invoice-finalize/`, data);
export const getOpportunityInvoice = (id, estimateId, jobId) => api.get(`/sales/opportunities/${id}/accounting-invoice/`, { params: { ...(estimateId ? { estimate_id: estimateId } : {}), ...(jobId ? { job_id: jobId } : {}) } });
export const updateOpportunityInvoiceLineItem = (opportunityId, invoiceId, lineItemId, data) => api.patch(`/sales/opportunities/${opportunityId}/accounting-invoice/${invoiceId}/line-items/${lineItemId}/`, data);
export const deleteOpportunityInvoiceLineItem = (opportunityId, invoiceId, lineItemId) => api.delete(`/sales/opportunities/${opportunityId}/accounting-invoice/${invoiceId}/line-items/${lineItemId}/`);
export const createOpportunityInvoiceLineItem = (opportunityId, invoiceId, data) => api.post(`/sales/opportunities/${opportunityId}/accounting-invoice/${invoiceId}/line-items/`, data);
export const sendOpportunityInvoice = (id, data = {}) => api.post(`/sales/opportunities/${id}/accounting-invoice-send/`, data);
export const getOpportunityPlannedSubJobs = (id) => api.get(`/tenant/opportunities/${id}/jobs/`);
export const createOpportunityPlannedSubJob = (id, data) => api.post(`/tenant/opportunities/${id}/jobs/`, data);
export const updateOpportunityPlannedSubJob = (opportunityId, subJobId, data) => api.patch(`/tenant/opportunities/${opportunityId}/jobs/${subJobId}/`, data);
export const deleteOpportunityPlannedSubJob = (opportunityId, subJobId) => api.delete(`/tenant/opportunities/${opportunityId}/jobs/${subJobId}/`);
export const createOpportunityJobStop = (opportunityId, jobId, data) =>
  api.post(`/tenant/opportunities/${opportunityId}/jobs/${jobId}/stops/`, data);
export const updateOpportunityJobStop = (opportunityId, jobId, stopId, data) =>
  api.patch(`/tenant/opportunities/${opportunityId}/jobs/${jobId}/stops/${stopId}/`, data);
export const deleteOpportunity = (id) => api.delete(`/sales/opportunities/${id}/`);
export const startOpportunityWorking = (id) => api.post(`/sales/opportunities/${id}/start-working/`);
export const markOpportunityEstimateCreated = (id) => api.post(`/sales/opportunities/${id}/mark-estimate-created/`);
export const bookOpportunityJob = (id, data = {}) => api.post(`/sales/opportunities/${id}/book-job/`, data);
export const unbookOpportunityJob = (id, data = {}) => api.post(`/sales/opportunities/${id}/unbook-job/`, data);
export const confirmOpportunityJob = (id) => api.post(`/sales/opportunities/${id}/confirm-job/`);
export const cancelOpportunityJob = (id, data) => api.post(`/sales/opportunities/${id}/cancel-job/`, data);
export const completeOpportunityJob = (id) => api.post(`/sales/opportunities/${id}/complete-job/`);
export const markOpportunityLost = (id, data) => api.post(`/sales/opportunities/${id}/mark-lost/`, data);
export const reopenOpportunity = (id, data = {}) => api.post(`/sales/opportunities/${id}/reopen/`, data);
export const createOpportunityStop = (data) => api.post("/sales/opportunity-stops/", data);
export const updateOpportunityStop = (id, data) => api.patch(`/sales/opportunity-stops/${id}/`, data);
export const deleteOpportunityStop = (id) => api.delete(`/sales/opportunity-stops/${id}/`);
export const getActivities = (params = {}) => params.lead || params.opportunity ? recordActivities(params) : api.get("/sales/sales-activities/", { params });
export const createSalesActivity = (data) => createRecordActivity(data);
export const updateSalesActivity = (id, data, target) => target ? updateRecordActivity(id, data, target) : api.patch(`/sales/sales-activities/${id}/`, data);
export const deleteSalesActivity = (id) =>
  api.delete(`/sales/sales-activities/${id}/`);
export const getSalesPersonPerformanceSummary = (params) =>
  api.get("/sales/reports/sales-person-performance/summary/", { params });
export const getSalesPersonPerformanceRecords = (params) =>
  api.get("/sales/reports/sales-person-performance/records/", { params });
export const sendReportEmail = (data) =>
  api.post("/sales/reports/sales-person-performance/email/", data);
export const getSalesPersonActivitySummary = (params) =>
  api.get("/sales/reports/sales-person-activity/summary/", { params });
export const getSalesPersonActivityDetails = (params) =>
  api.get("/sales/reports/sales-person-activity/details/", { params });
export const getNewLeadsReport = (params) =>
  api.get("/sales/reports/leads/new/", { params });
export const getCancellationDetailsReport = (params) =>
  api.get("/sales/reports/cancellations/details/", { params });
export const getLoginHistoryReport = (params) =>
  api.get("/reports/login-history/", { params });
export const getOpportunityBookedByDateReport = (params) =>
  api.get("/sales/reports/opportunities/booked-by-date/", { params });
export const getTasks = (params = {}) => params.lead || params.opportunity ? recordTasks(params) : api.get("/sales/tasks/", { params });
export const createTask = (data) => createRecordTask(data);
export const updateTask = (id, data, target = data) => target.lead || target.opportunity ? updateRecordTask(id, data, target) : api.patch(`/sales/tasks/${id}/`, data);
export const getCallLogs = (params) => api.get("/sales/call-logs/", { params });
export const liststatuscode = (params) => api.get("/sales/status-codes/list-status-codes", { params });  
export const getStatusCodes = (params) => api.get("/tenant/opportunity-statuses/", { params });
export const getStatusCodeLookups = (params = {limit: 50}) => api.get("/tenant/opportunity-statuses/", { params });
export const getStatusCodeLookupsPage = (search, offset, limit) =>
  api.get('/tenant/opportunity-statuses/', {
    params: { search, offset, limit },
  });
export const createStatusCode = (data) => api.post("/tenant/opportunity-statuses/", data);
export const updateStatusCode = (id, data) => api.patch(`/tenant/opportunity-statuses/${id}/`, data);
export const deleteStatusCode = (id) => api.delete(`/tenant/opportunity-statuses/${id}/`);
export const getOpportunityLossReasons = (params) => api.get("/tenant/lost-reasons/", { params });
export const getOpportunityLossReasonLookups = (params = { limit: 50 }) => api.get("/tenant/lost-reasons/", { params });
export const createOpportunityLossReason = (data) => api.post("/tenant/lost-reasons/", data);
export const updateOpportunityLossReason = (id, data) => api.patch(`/tenant/lost-reasons/${id}/`, data);
export const deleteOpportunityLossReason = (id) => api.delete(`/tenant/lost-reasons/${id}/`);
export const seedOpportunityLossReasons = (data = {}) => api.post("/tenant/lost-reasons/", data);
export const bulkSalesAction = (data) => api.post("/sales/bulk-actions/", data);
export const bulkSalesEmail = (data) => bulkSalesAction({ ...data, action: "email" });
export const bulkSalesSms = (data) => bulkSalesAction({ ...data, action: "sms" });
export const bulkSalesStatus = (data) => bulkSalesAction({ ...data, action: "status" });
export const bulkSalesMarkLost = (data) => bulkSalesAction({ ...data, action: "lost" });
export const bulkSalesAssign = (data) => bulkSalesAction({ ...data, action: "assign" });
export const bulkSalesDelete = (data) => bulkSalesAction({ ...data, action: "delete" });

// The current tenant backend has not exposed the legacy estimate, payment, or
// file modules yet. Keep their requests disabled by default so opening an
// opportunity does not generate a wall of expected 404 responses. Older
// deployments that still mount those modules can opt in explicitly.
export const legacyOperationsApiEnabled = import.meta.env.VITE_ENABLE_LEGACY_OPERATIONS_API === "true";
const unavailableLegacyOperation = (name) => {
  const error = new Error(`${name} is not available in the current backend.`);
  error.code = "MODULE_NOT_AVAILABLE";
  return Promise.reject(error);
};

// ================= PAYMENTS APIs (v1) =================
export const getPaymentRequests = (params = {}) => legacyOperationsApiEnabled ? api.get("/payments/payment-requests/", { params }) : Promise.resolve([]);
export const createPaymentRequest = (data) => api.post("/payments/payment-requests/create/", data);
export const createPaymentRequestAndSend = (data) => api.post("/payments/payment-requests/create-and-send/", data);
export const getPaymentRequestCheckoutConfig = (id) => api.get(`/payments/payment-requests/${id}/checkout-config/`);
export const getPayments = (params = {}) => legacyOperationsApiEnabled ? api.get("/payments/payments/", { params }) : Promise.resolve([]);
export const getPaymentInOutReport = (params = {}) => api.get("/payments/reports/payment-in-out/", { params });
export const getOutstandingBalancesReport = (params = {}) => api.get("/payments/reports/outstanding-balances/", { params });
export const createPayment = (data) => api.post("/payments/payments/create/", data);
export const createEstimateManualPayment = (data) => api.post("/payments/estimate-manual-payments/", data);
export const sendEstimateManualPaymentReceipt = (paymentId, payload) => api.post(`/payments/estimate-manual-payments/${paymentId}/send/`, payload);
export const updateEstimateManualPayment = (paymentId, data) => api.patch(`/payments/estimate-manual-payments/${paymentId}/`, data);
export const deleteEstimateManualPayment = (paymentId) => api.delete(`/payments/estimate-manual-payments/${paymentId}/`);
export const createRefund = (data) => api.post("/payments/refunds/create/", data);
export const getRefunds = (params = {}) => legacyOperationsApiEnabled ? api.get("/payments/refunds/", { params }) : Promise.resolve([]);
export const getPaymentsHealth = () => api.get("/payments/health/");

// ================= JOBS APIs (v1) =================
export const getJobs = (params = {}) => {
  if (params?.opportunity) {
    return api.get(`/tenant/opportunities/${params.opportunity}/jobs/`);
  }
  return legacyOperationsApiEnabled ? api.get("/jobs/", { params }) : Promise.resolve([]);
};
export const getJobsByServiceDateReport = (params = {}) => api.get("/jobs/reports/service-date/", { params });
export const createJob = (data) => api.post("/jobs/", data);
export const getJob = (id) => api.get(`/jobs/${id}/`);
export const updateJob = (id, data) => api.patch(`/jobs/${id}/`, data);
export const deleteJob = (id) => api.delete(`/jobs/${id}/`);
export const getTrucks = (params = {}) => api.get("/jobs/trucks/", { params });
export const createTruck = (data) => api.post("/jobs/trucks/", data);
export const updateTruck = (id, data) => api.patch(`/jobs/trucks/${id}/`, data);
export const deleteTruck = (id) => api.delete(`/jobs/trucks/${id}/`);
export const assignJobCrew = (jobId, data) => api.post(`/jobs/${jobId}/assign-crew/`, data);
export const unassignJobCrew = (jobId, data) => api.delete(`/jobs/${jobId}/assign-crew/`, { data });
export const assignJobTruck = (jobId, data) => api.post(`/jobs/${jobId}/assign-truck/`, data);
export const unassignJobTruck = (jobId, data) => api.delete(`/jobs/${jobId}/assign-truck/`, { data });

// ================= JOB ACCOUNTING APIs (v1) =================
export const getJobAccountingSummary = (jobId) => legacyOperationsApiEnabled
  ? api.get(`/jobs/${jobId}/accounting/summary/`).catch(() => null)
  : Promise.resolve(null);
export const upsertJobPayrollEntries = (jobId, rows) => api.post(`/jobs/${jobId}/accounting/payroll-entries/`, rows);
export const createJobCost = (jobId, data) => api.post(`/jobs/${jobId}/accounting/costs/`, data);
export const dispatchAutomationNotification = (data) => api.post("/automations/workflows/dispatch-notification/", data);
export const createManualJobPayment = (jobId, data) => api.post(`/jobs/${jobId}/accounting/payments/manual/`, data);
export const updateManualJobPayment = (jobId, paymentId, data) =>
  api.patch(`/jobs/${jobId}/accounting/payments/manual/${paymentId}/`, data);
export const deleteManualJobPayment = (jobId, paymentId) =>
  api.delete(`/jobs/${jobId}/accounting/payments/manual/${paymentId}/`);
export const sendManualJobPaymentReceipt = (jobId, paymentId, payload) => api.post(`/jobs/${jobId}/accounting/payments/manual/${paymentId}/send/`, payload);

// ================= CREW DIRECTORY APIs (v1) =================
export const getCrewMembers = (params = {}) => api.get("/crew/", { params });
export const createCrewMember = (data) => api.post("/crew/", data);
export const updateCrewMember = (id, data) => api.patch(`/crew/${id}/`, data);
export const deleteCrewMember = (id) => api.delete(`/crew/${id}/`);

// ================= ESTIMATE APIs =================
export const syncInternalInventory = (id, data) => api.post(`/estimates/${id}/sync-internal-inventory/`, data);
export const getEstimates = (params) => legacyOperationsApiEnabled ? api.get("/estimates/", { params }) : Promise.resolve([]);
export const createEstimate = (data) => legacyOperationsApiEnabled ? api.post("/estimates/", data) : unavailableLegacyOperation("Estimate creation");
export const updateEstimate = (id, data) => api.patch(`/estimates/${id}/`, data);
export const recalculateEstimate = (id) => api.post(`/estimates/${id}/recalculate/`);
export const updateEstimateManualDetails = (id, data) => api.patch(`/estimates/${id}/manual-details/`, data);
export const addEstimateCharge = (id, data) => api.post(`/estimates/${id}/charges/`, data);
export const addEstimateChargeFromCatalog = (id, data) => api.post(`/estimates/${id}/charges/from-catalog/`, data);
export const updateEstimateCharge = (id, data) => api.patch(`/estimate-charges/${id}/`, data);
export const deleteEstimateCharge = (id) => api.delete(`/estimate-charges/${id}/`);
export const getEstimatePortalInventory = (id) => legacyOperationsApiEnabled
  ? api.get(`/estimates/${id}/portal-inventory/`)
  : Promise.resolve([]);
export const updateEstimatePortalInventory = (id, data) => legacyOperationsApiEnabled
  ? api.post(`/estimates/${id}/portal-inventory/`, data)
  : unavailableLegacyOperation("Estimate portal inventory");

// ================= FILES APIs =================
export const listFiles = (params = {}) => {
  if (!legacyOperationsApiEnabled) return Promise.resolve([]);
  const nextParams = { ...params };
  if (nextParams.target_type) nextParams.target_type = normalizeFileTargetType(nextParams.target_type);
  return api.get("/files/", { params: nextParams });
};
export const uploadFile = ({ target_type, target_id, branch_id = null, notes = "", category = "", file }) => {
  if (!legacyOperationsApiEnabled) return unavailableLegacyOperation("File uploads");
  const form = new FormData();
  form.append("target_type", normalizeFileTargetType(target_type));
  form.append("target_id", String(target_id));
  if (branch_id !== null && branch_id !== undefined && branch_id !== "") form.append("branch_id", String(branch_id));
  if (notes) form.append("notes", notes);
  if (category) form.append("category", category);
  form.append("file", file);
  return api.post("/files/", form);
};
export const deleteFile = (id) => api.delete(`/files/${id}/`);
export const downloadFile = (id) => api.get(`/files/${id}/download/`, { responseType: "blob" });
export const listFileShareLinks = (id) => api.get(`/files/${id}/share-links/`);
export const createFileShareLink = (id, payload) => api.post(`/files/${id}/share-links/`, payload);
export const revokeFileShareLink = (linkId) => api.delete(`/files/share-links/${linkId}/`);
export const requestEstimateInventory = (id, data = {}) => api.post(`/estimates/${id}/request-inventory/`, data);
export const requestEstimatePortal = (id, data = {}) => legacyOperationsApiEnabled
  ? api.post(`/estimates/${id}/request-portal/`, data)
  : unavailableLegacyOperation("Estimate portal");
export const markEstimateInventoryReviewed = (id) => api.post(`/estimates/${id}/mark-inventory-reviewed/`);
export const sendEstimate = (id, data = {}) => api.post(`/estimates/${id}/send/`, data);
export const getCustomerPortalSettings = (params) => api.get("/customer-portal-settings/", { params });
export const createCustomerPortalSettings = (data) => api.post("/customer-portal-settings/", data);
export const updateCustomerPortalSettings = (id, data) => api.patch(`/customer-portal-settings/${id}/`, data);
export const getEstimateDiscountPresets = (params) => legacyOperationsApiEnabled ? api.get("/estimate-discount-presets/", { params }) : Promise.resolve([]);
export const createEstimateDiscountPreset = (data) => api.post("/estimate-discount-presets/", data);
export const updateEstimateDiscountPreset = (id, data) => api.patch(`/estimate-discount-presets/${id}/`, data);
export const deleteEstimateDiscountPreset = (id) => api.delete(`/estimate-discount-presets/${id}/`);
export const seedEstimateDiscountPresets = (data = {}) => api.post("/estimate-discount-presets/seed-defaults/", data);
export const getInventoryRoomTemplates = (params) => api.get("/inventory-room-templates/", { params });
export const createInventoryRoomTemplate = (data) => api.post("/inventory-room-templates/", data);
export const updateInventoryRoomTemplate = (id, data) => api.patch(`/inventory-room-templates/${id}/`, data);
export const deleteInventoryRoomTemplate = (id) => api.delete(`/inventory-room-templates/${id}/`);
export const getInventoryItemTemplates = (params) => api.get("/inventory-item-templates/", { params });
export const createInventoryItemTemplate = (data) => api.post("/inventory-item-templates/", data);
export const updateInventoryItemTemplate = (id, data) => api.patch(`/inventory-item-templates/${id}/`, data);
export const deleteInventoryItemTemplate = (id) => api.delete(`/inventory-item-templates/${id}/`);
export const getEstimateCatalogItems = (params) => legacyOperationsApiEnabled ? api.get("/catalog-items/", { params }) : Promise.resolve([]);
export const getEstimatePortalTemplates = (params) => legacyOperationsApiEnabled ? api.get("/portal-templates/", { params }) : Promise.resolve([]);
export const createEstimatePortalTemplate = (data) => api.post("/portal-templates/", data);
export const updateEstimatePortalTemplate = (id, data) => api.patch(`/portal-templates/${id}/`, data);
export const deactivateEstimatePortalTemplate = (id) => api.delete(`/portal-templates/${id}/`);
export const duplicateEstimatePortalTemplate = (id) => api.post(`/portal-templates/${id}/duplicate/`, {});
export const createEstimateCatalogItem = (data) => api.post("/catalog-items/", data);
export const updateEstimateCatalogItem = (id, data) => api.patch(`/catalog-items/${id}/`, data);
export const deactivateEstimateCatalogItem = (id) => api.delete(`/catalog-items/${id}/`);
// Catalog packages (branch required)
export const getEstimatePackages = (params) => legacyOperationsApiEnabled ? api.get("/packages/", { params }) : Promise.resolve([]);
export const createEstimatePackage = (data) => api.post("/packages/", data);
export const updateEstimatePackage = (id, data) => api.patch(`/packages/${id}/`, data);
export const deleteEstimatePackage = (id) => api.delete(`/packages/${id}/`);
export const getEstimatePackageItems = (params) => legacyOperationsApiEnabled ? api.get("/package-items/", { params }) : Promise.resolve([]);
export const createEstimatePackageItem = (data) => api.post("/package-items/", data);
export const updateEstimatePackageItem = (id, data) => api.patch(`/package-items/${id}/`, data);
export const deleteEstimatePackageItem = (id) => api.delete(`/package-items/${id}/`);
export const applyEstimatePackage = (estimateId, data) => api.post(`/estimates/${estimateId}/apply-package/`, data);
export const resendEstimate = (estimateId, data) => api.post(`/estimates/${estimateId}/resend/`, data);
export const clearEstimateSignatures = (estimateId) => api.post(`/estimates/${estimateId}/clear-signatures/`, {});
export const getPublicEstimateInventoryPortal = (token) => api.get("/public/estimates/inventory/", { params: { token }, skipAuth: true });
export const submitPublicEstimateInventoryPortal = (data) => api.post("/public/estimates/inventory/", data, { skipAuth: true });
export const uploadPublicEstimateInventoryPortalPhoto = ({ token, file, notes = "" }) => {
  const formData = new FormData();
  formData.append("token", token);
  formData.append("file", file);
  if (notes) formData.append("notes", notes);
  return api.post("/public/estimates/inventory/photos/", formData, { skipAuth: true });
};
export const getPublicEstimatePortal = (token) => api.get("/public/estimates/portal/", { params: { token }, skipAuth: true });
export const approvePublicEstimatePortal = (data) => api.post("/public/estimates/portal/approve/", data, { skipAuth: true });
export const createPublicEstimatePaymentSession = (data) => api.post("/payments/public/estimates/portal/payment-request/", data);
export const createPublicEstimateSquarePayment = (data) => api.post("/payments/public/estimates/portal/payments/create/", data);
export const getPublicSquareOrder = (token, orderId) =>
  api.get(`/payments/public/estimates/portal/square/orders/${orderId}/`, { params: { token } });

export const getPublicContractPortal = (token) => api.get("/public/contracts/portal/", { params: { token }, skipAuth: true });
export const signPublicContractPortal = (data) => api.post("/public/contracts/portal/sign/", data, { skipAuth: true });

export const getDocumentTemplates = (params) => legacyOperationsApiEnabled ? api.get("/documents/templates/", { params }) : Promise.resolve([]);
export const createDocumentTemplate = (data) => api.post("/documents/templates/", data);
export const updateDocumentTemplate = (id, data) => api.patch(`/documents/templates/${id}/`, data);
export const deleteDocumentTemplate = (id) => api.delete(`/documents/templates/${id}/`);
export const getDocumentVariableRegistry = () => api.get("/documents/variables/");
export const previewDocumentTemplate = (id, data) => api.post(`/documents/templates/${id}/preview/`, data);
export const regenerateOpportunityDocuments = (opportunityId) => api.post(`/documents/opportunities/${opportunityId}/regenerate/`, {});

export const getTemplateVariables = (params) => api.get("/documents/template-variables/", { params });
export const createTemplateVariable = (data) => api.post("/documents/template-variables/", data);
export const updateTemplateVariable = (id, data) => api.patch(`/documents/template-variables/${id}/`, data);
export const deleteTemplateVariable = (id) => api.delete(`/documents/template-variables/${id}/`);

export const createContract = (data) => api.post("/documents/contracts/", data);
export const getContracts = (params) => legacyOperationsApiEnabled ? api.get("/documents/contracts/", { params }) : Promise.resolve([]);
export const clearContractSignature = (id) => api.post(`/documents/contracts/${id}/clear-signature/`, {});
export const sendContractForSignature = (id, data = {}) =>
  api.post(`/documents/contracts/${id}/send_for_signature/`, data);

// Legacy pricing-source APIs removed.
// Integration APIs
export const getSendGridConfig = (params) => api.get("/tenant/integrations/sendgrid-configs/", { params });
export const createSendGridConfig = (data) => api.post("/tenant/integrations/sendgrid-configs/", data);
export const updateSendGridConfig = (id, data) => api.patch(`/tenant/integrations/sendgrid-configs/${id}/`, data);
export const testSendGridEmail = (id, email) => api.post(`/tenant/integrations/sendgrid-configs/${id}/test-send-email/`, { test_email: email });

export const getResendConfig = (params) => api.get("/tenant/integrations/resend-configs/", { params });
export const createResendConfig = (data) => api.post("/tenant/integrations/resend-configs/", data);
export const updateResendConfig = (id, data) => api.patch(`/tenant/integrations/resend-configs/${id}/`, data);
export const testResendEmail = (id, email) => api.post(`/tenant/integrations/resend-configs/${id}/test-send-email/`, { test_email: email });

export const getSMTPConfig = (params) => api.get("/tenant/integrations/smtp-configs/", { params });
export const createSMTPConfig = (data) => api.post("/tenant/integrations/smtp-configs/", data);
export const updateSMTPConfig = (id, data) => api.patch(`/tenant/integrations/smtp-configs/${id}/`, data);
export const testSMTPEmail = (id, email) => api.post(`/tenant/integrations/smtp-configs/${id}/test-send-email/`, { test_email: email });

export const getTelnyxSMSConfig = (params) => api.get("/integrations/telnyx-sms-configs/", { params });
export const createTelnyxSMSConfig = (data) => api.post("/integrations/telnyx-sms-configs/", data);
export const updateTelnyxSMSConfig = (id, data) => api.patch(`/integrations/telnyx-sms-configs/${id}/`, data);
export const testTelnyxSMS = (id, phone) => api.post(`/integrations/telnyx-sms-configs/${id}/test-send-sms/`, { test_phone_number: phone });

// Tenant Communications onboarding APIs
export const getCommunicationEmailDomains = () => api.get("/tenant/communications/email-domains/");
export const createCommunicationEmailDomain = (data) => api.post("/tenant/communications/email-domains/", data);
export const updateCommunicationEmailDomain = (id, data) => api.patch(`/tenant/communications/email-domains/${id}/`, data);
export const refreshCommunicationEmailDomain = (id) => api.post(`/tenant/communications/email-domains/${id}/refresh/`);
export const getBranchCommunicationSettings = (branchId) => api.get(`/tenant/communications/branch-settings/${branchId}/`);
export const testBranchEmailIdentity = (branchId, identityId, email) =>
  api.post(`/tenant/communications/branch-settings/${branchId}/email-identities/${identityId}/test-send-email/`, { test_email: email });
export const createBranchEmailIdentity = (branchId, data) =>
  api.post(`/tenant/communications/branch-settings/${branchId}/email-identities/`, data);
export const updateBranchEmailIdentity = (branchId, identityId, data) =>
  api.patch(`/tenant/communications/branch-settings/${branchId}/email-identities/${identityId}/`, data);
export const getCommunicationMailboxes = () => api.get("/tenant/communications/mailboxes/");
export const completeMailboxOAuth = (data) => api.post("/tenant/communications/mailboxes/oauth/complete/", data);
export const startMailboxOAuth = (data) => api.post("/tenant/communications/mailboxes/oauth/start/", data);
export const syncCommunicationMailbox = (id) => api.post(`/tenant/communications/mailboxes/${id}/sync/`);
export const updateCommunicationMailbox = (id, data) => api.patch(`/tenant/communications/mailboxes/${id}/`, data);
export const deleteCommunicationMailbox = (id) => api.delete(`/tenant/communications/mailboxes/${id}/`);
export const getSmsNumbers = (params) => api.get("/tenant/communications/sms-numbers/", { params });
export const getSmsNumberOrders = () => api.get("/tenant/communications/sms-numbers/orders/");
export const searchSmsNumbers = (params) => api.get("/tenant/communications/sms-numbers/search/", { params });
export const importSmsNumber = (data) => api.post("/tenant/communications/sms-numbers/import/", data);
export const quoteSmsNumberOrder = (data) => api.post("/tenant/communications/sms-numbers/orders/", data);
export const purchaseSmsNumberOrder = (orderId, data) =>
  api.post(`/tenant/communications/sms-numbers/orders/${orderId}/purchase/`, data);
export const refreshSmsNumberOrder = (orderId) => api.get(`/tenant/communications/sms-numbers/orders/${orderId}/`);
export const assignSmsNumber = (id, data) => api.post(`/tenant/communications/sms-numbers/${id}/assign/`, data);
export const unassignSmsNumber = (id) => api.post(`/tenant/communications/sms-numbers/${id}/unassign/`);
export const releaseSmsNumber = (id) => api.post(`/tenant/communications/sms-numbers/${id}/release/`);

export const getPaymentGateways = (params) => legacyOperationsApiEnabled ? api.get("/integrations/payment-gateways/", { params }) : Promise.resolve([]);
export const createPaymentGateway = (data) => api.post("/integrations/payment-gateways/", data);
export const updatePaymentGateway = (id, data) => api.patch(`/integrations/payment-gateways/${id}/`, data);
export const verifyPaymentGateway = (id) => api.post(`/integrations/payment-gateways/${id}/verify/`);

export const getCommunicationTemplates = (params) => api.get("/integrations/communication-templates/", { params });
export const getCommunicationTemplate = (id) => api.get(`/integrations/communication-templates/${id}/`);
export const getCommunicationTemplateVariables = (params) =>
  api.get("/integrations/communication-templates/variables/", { params });
export const getCommunicationTemplateKeys = (params) =>
  api.get("/integrations/communication-templates/template-keys/", { params });
export const createCommunicationTemplate = (data) => api.post("/integrations/communication-templates/", data);
export const updateCommunicationTemplate = (id, data) => api.patch(`/integrations/communication-templates/${id}/`, data);
export const deleteCommunicationTemplate = (id) => api.delete(`/integrations/communication-templates/${id}/`);
export const seedCommunicationTemplates = (data = {}) =>
  api.post("/integrations/communication-templates/seed-defaults/", data);
export const previewCommunicationTemplate = (data) => api.post("/integrations/communication-templates/preview/", data);

export const getCommunicationTemplateCategories = (params) => api.get("/integrations/communication-template-categories/", { params });
export const createCommunicationTemplateCategory = (data) => api.post("/integrations/communication-template-categories/", data);
export const updateCommunicationTemplateCategory = (id, data) => api.patch(`/integrations/communication-template-categories/${id}/`, data);
export const deleteCommunicationTemplateCategory = (id) => api.delete(`/integrations/communication-template-categories/${id}/`);

// Automations APIs
export const getAutomationWorkflows = (params) => api.get("/automations/workflows/", { params });
export const createAutomationWorkflow = (data) => api.post("/automations/workflows/", data);
export const updateAutomationWorkflow = (id, data) => api.patch(`/automations/workflows/${id}/`, data);
export const deleteAutomationWorkflow = (id) => api.delete(`/automations/workflows/${id}/`);
export const activateAutomationWorkflow = (id) => api.post(`/automations/workflows/${id}/activate/`, {});
export const deactivateAutomationWorkflow = (id) => api.post(`/automations/workflows/${id}/deactivate/`, {});
export const testRunAutomationWorkflow = (id, target_id) => api.post(`/automations/workflows/${id}/test-run/`, { target_id });
export const getAutomationFields = (target_type, extraParams = {}) =>
  api.get("/automations/workflows/fields/", { params: { target_type, ...extraParams } });
export const getAutomationStepTypes = () => api.get("/automations/workflows/step-types/");
export const getAutomationVariables = (target_type) => api.get("/automations/workflows/variables/", { params: { target_type } });

export const getAutomationSteps = (params) => api.get("/automations/steps/", { params });
export const createAutomationStep = (data) => api.post("/automations/steps/", data);
export const updateAutomationStep = (id, data) => api.patch(`/automations/steps/${id}/`, data);
export const deleteAutomationStep = (id) => api.delete(`/automations/steps/${id}/`);
export const getAutomationRuns = (params) => api.get("/automations/runs/", { params });

// Tenant catalogs wrap record fields in `data`; UI consumers use flat records.
const catalogRecord = (record) => record?.data && typeof record.data === 'object'
  ? { ...record.data, id: record.id ?? record.data.id }
  : record;
const catalogResponse = (response) => {
  if (Array.isArray(response)) return response.map(catalogRecord);
  if (Array.isArray(response?.results)) return { ...response, results: response.results.map(catalogRecord) };
  return catalogRecord(response);
};

// Mover Type & Size APIs
export const getServices = async (params) => catalogResponse(await api.get("/tenant/service-types/", { params }));
export const getServiceTypes = async (params) => catalogResponse(await api.get("/tenant/service-types/", { params }));
export const createServiceType = async (data) => catalogResponse(await api.post("/tenant/service-types/", data));
export const updateServiceType = async (id, data) => catalogResponse(await api.patch(`/tenant/service-types/${id}/`, data));
export const deleteServiceType = (id) => api.delete(`/tenant/service-types/${id}/`);

export const getMoverTypes = async (params) => catalogResponse(await api.get("/tenant/move-types/", { params }));
export const getMoveTypeLookups = async (params) => catalogResponse(await api.get("/tenant/move-types/", { params }));
export const createMoverType = async (data) => catalogResponse(await api.post("/tenant/move-types/", data));
export const updateMoverType = async (id, data) => catalogResponse(await api.patch(`/tenant/move-types/${id}/`, data));
export const deleteMoverType = (id) => api.delete(`/tenant/move-types/${id}/`);

export const getMoverSizes = async (params) => catalogResponse(await api.get("/tenant/move-sizes/", { params }));
export const getMoverSizeLookups = async (params) => catalogResponse(await api.get("/tenant/move-sizes/", { params }));
export const createMoverSize = async (data) => catalogResponse(await api.post("/tenant/move-sizes/", data));
export const updateMoverSize = async (id, data) => catalogResponse(await api.patch(`/tenant/move-sizes/${id}/`, data));
export const deleteMoverSize = (id) => api.delete(`/tenant/move-sizes/${id}/`);
export const seedStatusCodes = (data = {}) => api.post("/tenant/opportunity-statuses/", data);

// Legacy support for API object
const API = {
  get: (url, params) => api.get(url, { params }),
  post: (url, data) => api.post(url, data),
  put: (url, data) => api.put(url, data),
  patch: (url, data) => api.patch(url, data),
  delete: (url) => api.delete(url),
  

  auth: {
    login,
    me,
    getUsers,
    getLookupUsers,
    getUser,
    updateUser,
    assignUserRole,
    deactivateUser,
    reactivateUser,
    getRoles,
    createRole,
    getPermissions,
    updateRole,
    deleteRole,
    deactivateRole,
    reactivateRole,
    getRolePermissions,
    grantRolePermission,
    revokeRolePermission,
    getEmployees,
    inviteEmployee,
    terminateEmployee,
    rehireEmployee,
  },

  general: {
    getAuditLogs,
    getSecurityAuditLogs,
    getRbacDecisionLogs,
    universalSearch,
    getBranches,
    getBranchLookups,
    createBranch,
    updateBranch,
    deleteBranch,
    makeMainBranch,
    getBranchSettings,
    updateBranchSettings,
    resetBranchSetting,
    getBranchTaxProfiles,
    getBranchWeeklyWindows,
    saveBranchWeeklyWindows,
    getBranchBranding,
    updateBranchBranding,
    uploadBranchLogo,
    removeBranchLogo,
    getCompany,
    getCompanies,
    createCompany,
    onboardCompany,
    updateCompany,
    deleteCompany,
    getCompanySettings,
    updateCompanySettings,
    getCompanyBranding,
    updateCompanyBranding,
  },

  leads: {
    getLeads,
    getReferralSources,
    getReferralSourceLookups,
    getLeadStatusCodes,
    getLeadStatusCodeLookups,
    getInboundLeadConfig,
    rotateInboundLeadSecret,
    createReferralSource,
    updateReferralSource,
    deleteReferralSource,
    getMoverTypes,
    createMoverType,
    updateMoverType,
    deleteMoverType,
    getMoverSizes,
    createMoverSize,
    updateMoverSize,
    deleteMoverSize,
    getServiceTypes,
    createServiceType,
    updateServiceType,
    deleteServiceType,
    createCustomerContact,
    updateCustomerContact,
    deleteCustomerContact,
  },

  sales: {
    getDashboardSummary,
    getOpportunities,
    getOpportunity,
    getOpportunityAvailability,
    getOpportunityAccountingSummary,
    getOpportunityAccountingInvoicePreview,
    getOpportunityInvoiceDraft,
    saveOpportunityInvoiceDraft,
    finalizeOpportunityInvoice,
    getOpportunityInvoice,
    updateOpportunityInvoiceLineItem,
    deleteOpportunityInvoiceLineItem,
    createOpportunityInvoiceLineItem,
    sendOpportunityInvoice,
    getOpportunityPlannedSubJobs,
    createOpportunityPlannedSubJob,
    updateOpportunityPlannedSubJob,
    deleteOpportunityPlannedSubJob,
    createOpportunity,
    updateOpportunity,
    updateOpportunityStop,
    getActivities,
    createSalesActivity,
    updateSalesActivity,
    deleteSalesActivity,
    getTasks,
    createTask,
    updateTask,
    getStatusCodes,
    getStatusCodeLookups,
    getOpportunityLossReasons,
    createOpportunityLossReason,
    updateOpportunityLossReason,
    deleteOpportunityLossReason,
    seedOpportunityLossReasons,
    liststatuscode,
  },
  payments: {
    getPaymentRequests,
    createPaymentRequest,
    createPaymentRequestAndSend,
    getPayments,
    createRefund,
    getRefunds,
    getPaymentsHealth,
    createPublicEstimatePaymentSession,
  },
  estimates: {
    getEstimates,
    createEstimate,
    recalculateEstimate,
    updateEstimateManualDetails,
    addEstimateCharge,
    addEstimateChargeFromCatalog,
    requestEstimateInventory,
    markEstimateInventoryReviewed,
    sendEstimate,
    getEstimateDiscountPresets,
    createEstimateDiscountPreset,
    updateEstimateDiscountPreset,
    deleteEstimateDiscountPreset,
    seedEstimateDiscountPresets,
    getPublicEstimateInventoryPortal,
    submitPublicEstimateInventoryPortal,
    applyEstimatePackage,
    getEstimatePortalInventory,
    updateEstimatePortalInventory,
  },
  jobs: {
    getJobs,
    createJob,
    getJob,
    updateJob,
    deleteJob,
    getTrucks,
    createTruck,
    updateTruck,
    deleteTruck,
    assignJobCrew,
    unassignJobCrew,
    assignJobTruck,
    unassignJobTruck,
    getJobAccountingSummary,
    upsertJobPayrollEntries,
    createJobCost,
    createManualJobPayment,
    updateManualJobPayment,
    deleteManualJobPayment,
  },
  crew: {
    getCrewMembers,
    createCrewMember,
    updateCrewMember,
    deleteCrewMember,
  },
  lookups: {
    getBranches: getBranchLookups,
    getCompanies,
    getUsers: (params) => api.get("/lookups/users/", { params }),
    getStatusCodes: getStatusCodeLookups,
    getOpportunityLossReasons: getOpportunityLossReasonLookups,
    getReferralSources: getReferralSourceLookups,
    getLeadStatusCodes: getLeadStatusCodeLookups,
    getMoveTypes: getMoveTypeLookups,
    getMoverSizes: getMoverSizeLookups,
    getServices: (params) => api.get("/lookups/services/", { params }),
    getStatuses: getStatusCodeLookups,
  },
  packages: {
    getEstimatePackages,
    createEstimatePackage,
    updateEstimatePackage,
    deleteEstimatePackage,
    getEstimatePackageItems,
    createEstimatePackageItem,
    updateEstimatePackageItem,
    deleteEstimatePackageItem,
  },
  files: {
    list: listFiles,
    upload: uploadFile,
    remove: deleteFile,
    download: downloadFile,
    listShareLinks: listFileShareLinks,
    createShareLink: createFileShareLink,
    revokeShareLink: revokeFileShareLink,
  },
  // tariffs removed
};

export default API;

export const getLookupUsersPage = async (search = '', offset = 0, limit = 20, branch = null) => {
  const users = (await getTenantStaff()).filter((user) => (!branch || user.branches.some((id) => String(id) === String(branch)))
    && `${user.first_name} ${user.last_name} ${user.email}`.toLowerCase().includes(search.toLowerCase()));
  return { results: users.slice(offset, offset + limit).map((user) => ({ ...user, label: `${user.first_name} ${user.last_name}`.trim() || user.email })), hasMore: offset + limit < users.length };
};
export const getLookupEmployeesPage = async (search, offset, limit, branch = null) => {
  const page = await api.get('/tenant/employees/', { params: { search, offset, limit, ...(branch ? { branch_id: branch } : {}) } });
  return { ...page, results: page.results.map((employee) => ({ ...employee, label: `${employee.first_name} ${employee.last_name}`.trim() || employee.email })), hasMore: offset + page.results.length < page.count };
};

export const getBranchLookupsPage = async (search, offset, limit) => {
  const response = catalogResponse(await api.get('/tenant/branches/', { params: { search, offset, limit } }));
  // The branch endpoint returns the entire tenant list and ignores pagination.
  if (!Array.isArray(response)) return response;
  const query = String(search || '').trim().toLowerCase();
  const rows = response.filter((branch) => branch.is_active !== false && String(branch.name || '').toLowerCase().includes(query));
  return { count: rows.length, results: rows.slice(offset, offset + limit), hasMore: offset + limit < rows.length };
};

export const getOpportunityLossReasonLookupsPage = (search, offset, limit) =>
  api.get('/lookups/opportunity-loss-reasons/', { params: { search, offset, limit } });

// Company-wide gateway configuration; authentication testing never creates a charge.
export const getAuthorizeNetSettings = () => api.get('/tenant/integrations/authorize-net/');
export const saveAuthorizeNetSettings = (data) => api.post('/tenant/integrations/authorize-net/', data);
export const verifyAuthorizeNetSettings = () => api.post('/tenant/integrations/authorize-net/verify/');

const publicPortalPath = (kind) => kind === 'estimate' ? '/public/estimates/portal/' : '/public/contracts/portal/';
export const downloadPublicPortal = (kind, token) => api.get(`${publicPortalPath(kind)}pdf/`, { params: { token }, responseType: 'blob', skipAuth: true });
export const publicPortalImageUrl = (kind, token, assetId) => api.getUri({ url: `${publicPortalPath(kind)}image/`, params: { token, asset_id: assetId } });
export const issueBuilderDocuments = (stage, data, idempotencyKey) => api.post(`/tenant/builder/workflow/${stage}/`, data, { headers: { 'Idempotency-Key': idempotencyKey } });
export const getIssuedPortals = (opportunityId) => api.get('/tenant/builder/portals/', { params: { opportunity_id: opportunityId } });
export const revokeIssuedPortal = (id, opportunityId) => api.post(`/tenant/builder/portals/${id}/revoke/`, { opportunity_id: opportunityId });

export const getPortalEstimates = (opportunityId) => api.get('/tenant/builder/portals/estimates/', { params: { opportunity_id: opportunityId } });
export const emailIssuedPortal = (id, opportunityId, key) => api.post(`/tenant/builder/portals/${id}/email-link/`, { opportunity_id: opportunityId }, { headers: { 'Idempotency-Key': key } });

export const downloadIssuedPortal = (id, opportunityId) => api.get(`/tenant/builder/portals/${id}/pdf/`, { params: { opportunity_id: opportunityId }, responseType: 'blob' });

export const getInventoryPortal = (kind, recordId) => api.get('/tenant/builder/inventory-portals/', { params: { kind, record_id: recordId } });
export const manageInventoryPortal = (kind, recordId, operation, key) => api.post('/tenant/builder/inventory-portals/manage/', { kind, record_id: recordId, operation }, { headers: key ? { 'Idempotency-Key': key } : {} });
