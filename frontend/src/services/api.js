import api from "./axios";

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
export const login = (credentials) => api.post("/login/", credentials);
export const switchCompany = (data) => api.post("/switch-company/", data);
export const refreshToken = (token) => api.post("/token/refresh/", { refresh: token });
export const me = () => api.get("/users/me/");
export const updateMe = (data) => api.patch("/users/me/", data);
export const changePassword = (data) => api.post("/users/change-password/", data);

// User APIs
export const getUsers = (params) => api.get("/users/", { params });
export const getLookupUsers = (params = { limit: 50 }) => api.get("/lookups/users/", { params });
export const getUser = (id) => api.get(`/users/${id}/`);
export const createUser = (data) => api.post("/users/", data);
export const updateUser = (id, data) => api.patch(`/users/${id}/`, data);
export const deleteUser = (id) => api.delete(`/users/${id}/`);

// Role APIs
export const getRoles = (params) => api.get("/roles/", { params });
export const getRole = (id) => api.get(`/roles/${id}/`);
export const createRole = (data) => api.post("/roles/", data);
export const updateRole = (id, data) => api.patch(`/roles/${id}/`, data);
export const deleteRole = (id) => api.delete(`/roles/${id}/`);

// Permission APIs
export const getPermissions = () => api.get("/permissions/");

// Core APIs
export const getAuditLogs = () => api.get("/audit-logs/");
export const universalSearch = (params) => api.get("/search/", { params });
export const getBranches = () => api.get("/branches/");
export const getBranchLookups = (params = {limit: 50}) => api.get("/lookups/branches/", { params });
export const createBranch = (data) => api.post("/branches/", data);
export const updateBranch = (id, data) => api.patch(`/branches/${id}/`, data);
export const deleteBranch = (id) => api.delete(`/branches/${id}/`);
export const getCompany = (id) => api.get(`/companies/${id}/`);
export const getCompanies = (params) => api.get("/companies/", { params });
export const createCompany = (data) => api.post("/companies/", data);
export const onboardCompany = (data) => api.post("/companies/onboard/", data);
export const getCompanyLookups = (params) => api.get("/lookups/companies/", { params });
export const updateCompany = (id, data) => api.patch(`/companies/${id}/`, data);
export const deleteCompany = (id) => api.delete(`/companies/${id}/`);
export const uploadBranchLogo = (id, file) => {
  const formData = new FormData();
  formData.append("logo", file);
  return api.post(`/branches/${id}/upload-logo/`, formData);
};
export const removeBranchLogo = (id) => api.post(`/branches/${id}/remove-logo/`);

// Notifications APIs
export const getNotifications = (params) => api.get("/notifications/", { params });
export const getUnreadNotificationsCount = () => api.get("/notifications/unread-count/");
export const markNotificationRead = (id) => api.post(`/notifications/${id}/mark-read/`);
export const markNotificationUnread = (id) => api.post(`/notifications/${id}/mark-unread/`);
export const markAllNotificationsRead = () => api.post("/notifications/mark-all-read/");

// Lead APIs
export const getLeads = (params) => api.get("/leads/leads/", { params });
export const getLead = (id) => api.get(`/leads/leads/${id}/`);
export const getLeadBySalesNumber = (salesNumber) => api.get(`/leads/leads/by-sales-number/${salesNumber}/`);
export const createLead = (data) => api.post("/leads/leads/", data);
export const updateLead = (id, data) => api.patch(`/leads/leads/${id}/`, data);
export const deleteLead = (id) => api.delete(`/leads/leads/${id}/`);
export const duplicateLead = (id) => api.post(`/leads/leads/${id}/duplicate/`);
export const convertLead = (id) => api.post(`/leads/leads/${id}/convert/`);
export const assignLead = (id, data) => api.post(`/leads/leads/${id}/assign/`, data);
export const bulkUpdateLeadStatus = (data) => api.post("/leads/leads/bulk-status/", data);
export const bulkEmailLeads = (data) => api.post("/leads/leads/bulk-email/", data);
export const bulkSmsLeads = (data) => api.post("/leads/leads/bulk-sms/", data);
export const markLeadLost = (id, data) => api.post(`/leads/leads/${id}/mark-lost/`, data);
export const reopenLead = (id, data = {}) => api.post(`/leads/leads/${id}/reopen/`, data);
export const getReferralSources = () => api.get("/leads/referral-sources/");
export const getReferralSourceLookups = (params) => api.get("/lookups/lead-sources/", { params });
export const getLeadStatusCodes = () => api.get("/leads/lead-status-codes/");
export const getLeadStatusCodeLookups = (params) => api.get("/lookups/lead-statuses/", { params });
export const createLeadStatusCode = (data) => api.post("/leads/lead-status-codes/", data);
export const updateLeadStatusCode = (id, data) => api.patch(`/leads/lead-status-codes/${id}/`, data);
export const deleteLeadStatusCode = (id) => api.delete(`/leads/lead-status-codes/${id}/`);
export const getInboundLeadConfig = () => api.get("/leads/inbound-config/current/");
export const rotateInboundLeadSecret = () => api.post("/leads/inbound-config/rotate-secret/");
export const createReferralSource = (data) => api.post("/leads/referral-sources/", data);
export const updateReferralSource = (id, data) => api.patch(`/leads/referral-sources/${id}/`, data);
export const deleteReferralSource = (id) => api.delete(`/leads/referral-sources/${id}/`);
export const getLeadActivities = (params) => api.get("/leads/lead-activities/", { params });
export const createLeadActivity = (data) => api.post("/leads/lead-activities/", data);
export const updateLeadActivity = (id, data) => api.patch(`/leads/lead-activities/${id}/`, data);
export const deleteLeadActivity = (id) => api.delete(`/leads/lead-activities/${id}/`);



// Customer APIs
export const getCustomers = (params) => api.get("/leads/customers/", { params });
export const getCustomer = (id) => api.get(`/leads/customers/${id}/`);
export const createCustomer = (data) => api.post("/leads/customers/", data);
export const updateCustomer = (id, data) => api.patch(`/leads/customers/${id}/`, data);
export const deleteCustomer = (id) => api.delete(`/leads/customers/${id}/`);
export const createCustomerContact = (data) => api.post("/leads/customer-contacts/", data);
export const updateCustomerContact = (id, data) => api.patch(`/leads/customer-contacts/${id}/`, data);
export const deleteCustomerContact = (id) => api.delete(`/leads/customer-contacts/${id}/`);

// ================= SALES APIs =================
export const getMyLeadsQueue = (params) => api.get("/sales/my-leads-queue/", { params });
export const getDashboardSummary = (params) => api.get("/sales/dashboard-summary/", { params });
export const getSalesDashboardSummary = (params) => api.get("/sales/dashboard-summary-lite/", { params });
export const getOpportunities = (params) => api.get("/sales/opportunities/", { params });
export const getTimelineEvents = (params) => api.get("/sales/timeline-events/", { params });
export const getOpportunity = (id) => api.get(`/sales/opportunities/${id}/`);
export const getOpportunityBySalesNumber = (salesNumber) => api.get(`/sales/opportunities/by-sales-number/${salesNumber}/`);
export const duplicateOpportunity = (id) => api.post(`/sales/opportunities/${id}/duplicate/`);
export const createOpportunity = (data) =>
  api.post("/sales/opportunities/", data);
export const updateOpportunity = (id, data) =>
  api.patch(`/sales/opportunities/${id}/`, data);
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
export const getOpportunityPlannedSubJobs = (id) => api.get(`/sales/opportunities/${id}/planned-sub-jobs/`);
export const createOpportunityPlannedSubJob = (id, data) => api.post(`/sales/opportunities/${id}/planned-sub-jobs/`, data);
export const updateOpportunityPlannedSubJob = (opportunityId, subJobId, data) => api.patch(`/sales/opportunities/${opportunityId}/planned-sub-jobs/${subJobId}/`, data);
export const deleteOpportunityPlannedSubJob = (opportunityId, subJobId) => api.delete(`/sales/opportunities/${opportunityId}/planned-sub-jobs/${subJobId}/`);
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
export const getActivities = (params) =>
  api.get("/sales/sales-activities/", { params });
export const createSalesActivity = (data) =>
  api.post("/sales/sales-activities/", data);
export const updateSalesActivity = (id, data) =>
  api.patch(`/sales/sales-activities/${id}/`, data);
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
export const getTasks = (params) => api.get("/sales/tasks/", { params });
export const createTask = (data) => api.post("/sales/tasks/", data);
export const updateTask = (id, data) => api.patch(`/sales/tasks/${id}/`, data);
export const getCallLogs = (params) => api.get("/sales/call-logs/", { params });
export const liststatuscode = (params) => api.get("/sales/status-codes/list-status-codes", { params });  
export const getStatusCodes = (params) => api.get("/sales/status-codes/", { params });
export const getStatusCodeLookups = (params = {limit: 50}) => api.get("/lookups/statuses/", { params });
export const getStatusCodeLookupsPage = (search, offset, limit) =>
  api.get('/lookups/statuses/', {
    params: { search, offset, limit },
  });
export const createStatusCode = (data) => api.post("/sales/status-codes/", data);
export const updateStatusCode = (id, data) => api.patch(`/sales/status-codes/${id}/`, data);
export const deleteStatusCode = (id) => api.delete(`/sales/status-codes/${id}/`);
export const getOpportunityLossReasons = (params) => api.get("/sales/opportunity-loss-reasons/", { params });
export const getOpportunityLossReasonLookups = (params = { limit: 50 }) => api.get("/lookups/opportunity-loss-reasons/", { params });
export const createOpportunityLossReason = (data) => api.post("/sales/opportunity-loss-reasons/", data);
export const updateOpportunityLossReason = (id, data) => api.patch(`/sales/opportunity-loss-reasons/${id}/`, data);
export const deleteOpportunityLossReason = (id) => api.delete(`/sales/opportunity-loss-reasons/${id}/`);
export const seedOpportunityLossReasons = (data = {}) => api.post("/sales/opportunity-loss-reasons/seed-defaults/", data);
export const bulkSalesAction = (data) => api.post("/sales/bulk-actions/", data);
export const bulkSalesEmail = (data) => bulkSalesAction({ ...data, action: "email" });
export const bulkSalesSms = (data) => bulkSalesAction({ ...data, action: "sms" });
export const bulkSalesStatus = (data) => bulkSalesAction({ ...data, action: "status" });
export const bulkSalesMarkLost = (data) => bulkSalesAction({ ...data, action: "lost" });
export const bulkSalesAssign = (data) => bulkSalesAction({ ...data, action: "assign" });
export const bulkSalesDelete = (data) => bulkSalesAction({ ...data, action: "delete" });

// ================= PAYMENTS APIs (v1) =================
export const getPaymentRequests = (params = {}) => api.get("/payments/payment-requests/", { params });
export const createPaymentRequest = (data) => api.post("/payments/payment-requests/create/", data);
export const createPaymentRequestAndSend = (data) => api.post("/payments/payment-requests/create-and-send/", data);
export const getPaymentRequestCheckoutConfig = (id) => api.get(`/payments/payment-requests/${id}/checkout-config/`);
export const getPayments = (params = {}) => api.get("/payments/payments/", { params });
export const getPaymentInOutReport = (params = {}) => api.get("/payments/reports/payment-in-out/", { params });
export const getOutstandingBalancesReport = (params = {}) => api.get("/payments/reports/outstanding-balances/", { params });
export const createPayment = (data) => api.post("/payments/payments/create/", data);
export const createEstimateManualPayment = (data) => api.post("/payments/estimate-manual-payments/", data);
export const sendEstimateManualPaymentReceipt = (paymentId, payload) => api.post(`/payments/estimate-manual-payments/${paymentId}/send/`, payload);
export const updateEstimateManualPayment = (paymentId, data) => api.patch(`/payments/estimate-manual-payments/${paymentId}/`, data);
export const deleteEstimateManualPayment = (paymentId) => api.delete(`/payments/estimate-manual-payments/${paymentId}/`);
export const createRefund = (data) => api.post("/payments/refunds/create/", data);
export const getRefunds = (params = {}) => api.get("/payments/refunds/", { params });
export const getPaymentsHealth = () => api.get("/payments/health/");

// ================= JOBS APIs (v1) =================
export const getJobs = (params = {}) => api.get("/jobs/", { params });
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
export const getJobAccountingSummary = (jobId) => api.get(`/jobs/${jobId}/accounting/summary/`);
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
export const getEstimates = (params) => api.get("/estimates/", { params });
export const createEstimate = (data) => api.post("/estimates/", data);
export const updateEstimate = (id, data) => api.patch(`/estimates/${id}/`, data);
export const recalculateEstimate = (id) => api.post(`/estimates/${id}/recalculate/`);
export const updateEstimateManualDetails = (id, data) => api.patch(`/estimates/${id}/manual-details/`, data);
export const addEstimateCharge = (id, data) => api.post(`/estimates/${id}/charges/`, data);
export const addEstimateChargeFromCatalog = (id, data) => api.post(`/estimates/${id}/charges/from-catalog/`, data);
export const updateEstimateCharge = (id, data) => api.patch(`/estimate-charges/${id}/`, data);
export const deleteEstimateCharge = (id) => api.delete(`/estimate-charges/${id}/`);
export const getEstimatePortalInventory = (id) => api.get(`/estimates/${id}/portal-inventory/`);
export const updateEstimatePortalInventory = (id, data) => api.post(`/estimates/${id}/portal-inventory/`, data);

// ================= FILES APIs =================
export const listFiles = (params = {}) => {
  const nextParams = { ...params };
  if (nextParams.target_type) nextParams.target_type = normalizeFileTargetType(nextParams.target_type);
  return api.get("/files/", { params: nextParams });
};
export const uploadFile = ({ target_type, target_id, branch_id = null, notes = "", category = "", file }) => {
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
export const requestEstimatePortal = (id, data = {}) => api.post(`/estimates/${id}/request-portal/`, data);
export const markEstimateInventoryReviewed = (id) => api.post(`/estimates/${id}/mark-inventory-reviewed/`);
export const sendEstimate = (id, data = {}) => api.post(`/estimates/${id}/send/`, data);
export const getCustomerPortalSettings = (params) => api.get("/customer-portal-settings/", { params });
export const createCustomerPortalSettings = (data) => api.post("/customer-portal-settings/", data);
export const updateCustomerPortalSettings = (id, data) => api.patch(`/customer-portal-settings/${id}/`, data);
export const getEstimateDiscountPresets = (params) => api.get("/estimate-discount-presets/", { params });
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
export const getEstimateCatalogItems = (params) => api.get("/catalog-items/", { params });
export const getEstimatePortalTemplates = (params) => api.get("/portal-templates/", { params });
export const createEstimatePortalTemplate = (data) => api.post("/portal-templates/", data);
export const updateEstimatePortalTemplate = (id, data) => api.patch(`/portal-templates/${id}/`, data);
export const deactivateEstimatePortalTemplate = (id) => api.delete(`/portal-templates/${id}/`);
export const duplicateEstimatePortalTemplate = (id) => api.post(`/portal-templates/${id}/duplicate/`, {});
export const createEstimateCatalogItem = (data) => api.post("/catalog-items/", data);
export const updateEstimateCatalogItem = (id, data) => api.patch(`/catalog-items/${id}/`, data);
export const deactivateEstimateCatalogItem = (id) => api.delete(`/catalog-items/${id}/`);
// Catalog packages (branch required)
export const getEstimatePackages = (params) => api.get("/packages/", { params });
export const createEstimatePackage = (data) => api.post("/packages/", data);
export const updateEstimatePackage = (id, data) => api.patch(`/packages/${id}/`, data);
export const deleteEstimatePackage = (id) => api.delete(`/packages/${id}/`);
export const getEstimatePackageItems = (params) => api.get("/package-items/", { params });
export const createEstimatePackageItem = (data) => api.post("/package-items/", data);
export const updateEstimatePackageItem = (id, data) => api.patch(`/package-items/${id}/`, data);
export const deleteEstimatePackageItem = (id) => api.delete(`/package-items/${id}/`);
export const applyEstimatePackage = (estimateId, data) => api.post(`/estimates/${estimateId}/apply-package/`, data);
export const resendEstimate = (estimateId, data) => api.post(`/estimates/${estimateId}/resend/`, data);
export const clearEstimateSignatures = (estimateId) => api.post(`/estimates/${estimateId}/clear-signatures/`, {});
export const getPublicEstimateInventoryPortal = (token) => api.get("/public/estimates/inventory/", { params: { token } });
export const submitPublicEstimateInventoryPortal = (data) => api.post("/public/estimates/inventory/", data);
export const uploadPublicEstimateInventoryPortalPhoto = ({ token, file, notes = "" }) => {
  const formData = new FormData();
  formData.append("token", token);
  formData.append("file", file);
  if (notes) formData.append("notes", notes);
  return api.post("/public/estimates/inventory/photos/", formData);
};
export const getPublicEstimatePortal = (token) => api.get("/public/estimates/portal/", { params: { token } });
export const approvePublicEstimatePortal = (data) => api.post("/public/estimates/portal/approve/", data);
export const createPublicEstimatePaymentSession = (data) => api.post("/payments/public/estimates/portal/payment-request/", data);
export const createPublicEstimateSquarePayment = (data) => api.post("/payments/public/estimates/portal/payments/create/", data);
export const getPublicSquareOrder = (token, orderId) =>
  api.get(`/payments/public/estimates/portal/square/orders/${orderId}/`, { params: { token } });

export const getPublicContractPortal = (token) => api.get("/public/contracts/portal/", { params: { token } });
export const signPublicContractPortal = (data) => api.post("/public/contracts/portal/sign/", data);

export const getDocumentTemplates = (params) => api.get("/documents/templates/", { params });
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
export const getContracts = (params) => api.get("/documents/contracts/", { params });
export const clearContractSignature = (id) => api.post(`/documents/contracts/${id}/clear-signature/`, {});
export const sendContractForSignature = (id, data = {}) =>
  api.post(`/documents/contracts/${id}/send_for_signature/`, data);

// Legacy pricing-source APIs removed.
// Integration APIs
export const getSendGridConfig = (params) => api.get("/integrations/sendgrid-configs/", { params });
export const createSendGridConfig = (data) => api.post("/integrations/sendgrid-configs/", data);
export const updateSendGridConfig = (id, data) => api.patch(`/integrations/sendgrid-configs/${id}/`, data);
export const testSendGridEmail = (id, email) => api.post(`/integrations/sendgrid-configs/${id}/test-send-email/`, { test_email: email });

export const getResendConfig = (params) => api.get("/integrations/resend-configs/", { params });
export const createResendConfig = (data) => api.post("/integrations/resend-configs/", data);
export const updateResendConfig = (id, data) => api.patch(`/integrations/resend-configs/${id}/`, data);
export const testResendEmail = (id, email) => api.post(`/integrations/resend-configs/${id}/test-send-email/`, { test_email: email });

export const getSMTPConfig = (params) => api.get("/integrations/smtp-configs/", { params });
export const createSMTPConfig = (data) => api.post("/integrations/smtp-configs/", data);
export const updateSMTPConfig = (id, data) => api.patch(`/integrations/smtp-configs/${id}/`, data);
export const testSMTPEmail = (id, email) => api.post(`/integrations/smtp-configs/${id}/test-send-email/`, { test_email: email });

export const getTelnyxSMSConfig = (params) => api.get("/integrations/telnyx-sms-configs/", { params });
export const createTelnyxSMSConfig = (data) => api.post("/integrations/telnyx-sms-configs/", data);
export const updateTelnyxSMSConfig = (id, data) => api.patch(`/integrations/telnyx-sms-configs/${id}/`, data);
export const testTelnyxSMS = (id, phone) => api.post(`/integrations/telnyx-sms-configs/${id}/test-send-sms/`, { test_phone_number: phone });

export const getPaymentGateways = (params) => api.get("/integrations/payment-gateways/", { params });
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

// Mover Type & Size APIs
export const getServices = (params) => api.get("/lookups/services/", { params });
export const getServiceTypes = (params) => api.get("/sales/service-types/", { params });
export const createServiceType = (data) => api.post("/sales/service-types/", data);
export const updateServiceType = (id, data) => api.patch(`/sales/service-types/${id}/`, data);
export const deleteServiceType = (id) => api.delete(`/sales/service-types/${id}/`);

export const getMoverTypes = (params) => api.get("/move-types/", { params });
export const getMoveTypeLookups = (params) => api.get("/lookups/move-types/", { params });
export const createMoverType = (data) => api.post("/move-types/", data);
export const updateMoverType = (id, data) => api.patch(`/move-types/${id}/`, data);
export const deleteMoverType = (id) => api.delete(`/move-types/${id}/`);

export const getMoverSizes = (params) => api.get("/sales/mover-sizes/", { params });
export const getMoverSizeLookups = (params) => api.get("/lookups/mover-sizes/", { params });
export const createMoverSize = (data) => api.post("/sales/mover-sizes/", data);
export const updateMoverSize = (id, data) => api.patch(`/sales/mover-sizes/${id}/`, data);
export const deleteMoverSize = (id) => api.delete(`/sales/mover-sizes/${id}/`);
export const seedStatusCodes = (data = {}) => api.post("/sales/status-codes/seed-defaults/", data);

// Legacy support for API object
const API = {
  get: (url, params) => api.get(url, { params }),
  post: (url, data) => api.post(url, data),
  put: (url, data) => api.put(url, data),
  patch: (url, data) => api.patch(url, data),
  delete: (url) => api.delete(url),
  

  auth: {
    login,
    switchCompany,
    refreshToken,
    me,
    getUsers,
    getLookupUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    getRoles,
    getRole,
    createRole,
    getPermissions,
    updateRole,
    deleteRole,
  },

  general: {
    getAuditLogs,
    universalSearch,
    getBranches,
    getBranchLookups,
    createBranch,
    updateBranch,
    deleteBranch,
    uploadBranchLogo,
    removeBranchLogo,
    getCompany,
    getCompanies,
    createCompany,
    onboardCompany,
    getCompanyLookups,
    updateCompany,
    deleteCompany,
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
    getCompanies: getCompanyLookups,
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

export const getLookupUsersPage = (search, offset, limit, branch = null) =>
  api.get('/lookups/users/', { params: { search, offset, limit, ...(branch ? { branch } : {}) } });

export const getBranchLookupsPage = (search, offset, limit) =>
  api.get('/lookups/branches/', { params: { search, offset, limit } });

export const getOpportunityLossReasonLookupsPage = (search, offset, limit) =>
  api.get('/lookups/opportunity-loss-reasons/', { params: { search, offset, limit } });
