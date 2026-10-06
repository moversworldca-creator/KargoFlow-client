// Feature-first permission registry.
// We keep backend codenames as values for compatibility.
export const FEATURE_PERMISSION_CATALOG = {
  'crm.dashboard.view': {
    label: 'View CRM Dashboard',
    module: 'CRM',
    allowedScopes: ['own', 'branch', 'company'],
    legacyAliases: [],
  },
  'crm.leads.view': {
    label: 'View Leads',
    module: 'Leads',
    allowedScopes: ['own', 'branch', 'company'],
    legacyAliases: [],
  },
  'crm.leads.create': {
    label: 'Create Leads',
    module: 'Leads',
    allowedScopes: ['branch', 'company'],
    legacyAliases: [],
  },
  'crm.leads.edit': {
    label: 'Edit Leads',
    module: 'Leads',
    allowedScopes: ['own', 'branch', 'company'],
    legacyAliases: [],
  },
  'crm.leads.assign': {
    label: 'Assign Leads',
    module: 'Leads',
    allowedScopes: ['branch', 'company'],
    legacyAliases: [],
  },
  'crm.leads.change_branch': {
    label: 'Change Lead Branch',
    module: 'Leads',
    allowedScopes: ['branch', 'company'],
    legacyAliases: [],
  },
  'crm.leads.convert': {
    label: 'Convert Leads',
    module: 'Leads',
    allowedScopes: ['branch', 'company'],
    legacyAliases: [],
  },
  'crm.pipeline.view': {
    label: 'View Pipeline',
    module: 'Pipeline',
    allowedScopes: ['own', 'branch', 'company'],
    legacyAliases: [],
  },
  'crm.reports.view': {
    label: 'View CRM Reports',
    module: 'Reports',
    allowedScopes: ['own', 'branch', 'company'],
    legacyAliases: [],
  },
  'crm.opportunities.view': {
    label: 'View Opportunities',
    module: 'Opportunities',
    allowedScopes: ['own', 'branch', 'company'],
    legacyAliases: [],
  },
  'crm.opportunities.edit': {
    label: 'Edit Opportunities',
    module: 'Opportunities',
    allowedScopes: ['branch', 'company'],
    legacyAliases: [],
  },
  'crm.opportunities.create': {
    label: 'Create Opportunities',
    module: 'Opportunities',
    allowedScopes: ['branch', 'company'],
    legacyAliases: [],
  },
  'crm.opportunities.duplicate': {
    label: 'Duplicate Opportunities',
    module: 'Opportunities',
    allowedScopes: ['branch', 'company'],
    legacyAliases: [],
  },
  'crm.opportunities.book': {
    label: 'Book Opportunities',
    module: 'Opportunities',
    allowedScopes: ['branch', 'company'],
    legacyAliases: [],
  },
  'crm.opportunities.mark_lost': {
    label: 'Mark Opportunities Lost',
    module: 'Opportunities',
    allowedScopes: ['branch', 'company'],
    legacyAliases: [],
  },
  'crm.tasks.view': {
    label: 'View CRM Tasks',
    module: 'Tasks',
    allowedScopes: ['own', 'branch', 'company'],
    legacyAliases: [],
  },
  'crm.estimates.view': {
    label: 'View Estimates',
    module: 'Estimates',
    allowedScopes: ['own', 'branch', 'company'],
    legacyAliases: [],
  },
  'crm.payments.view': {
    label: 'View Payments',
    module: 'Payments',
    allowedScopes: ['own', 'branch', 'company'],
    legacyAliases: [],
  },
};

export const FEATURE_PERMISSIONS = {
  WORKSPACE: {
    ADMIN: 'crm.admin',
    AUDIT_VIEW: 'crm.audit.view',
    TEAM_VIEW: 'crm.settings.users.view',
    TEAM_CREATE: 'crm.settings.users.manage',
    TEAM_EDIT: 'crm.settings.users.manage',
    TEAM_DELETE: 'crm.settings.users.manage',
    ROLE_VIEW: 'crm.settings.roles.view',
    ROLE_CREATE: 'crm.settings.roles.manage',
    ROLE_EDIT: 'crm.settings.roles.manage',
    ROLE_DELETE: 'crm.settings.roles.manage',
  },
  CRM: {
    DASHBOARD_VIEW: 'crm.dashboard.view',
    LEAD_VIEW: 'crm.leads.view',
    LEAD_CREATE: 'crm.leads.create',
    LEAD_EDIT: 'crm.leads.edit',
    LEAD_ASSIGN: 'crm.leads.assign',
    LEAD_CHANGE_BRANCH: 'crm.leads.change_branch',
    LEAD_CONVERT: 'crm.leads.convert',
    OPPORTUNITY_VIEW: 'crm.opportunities.view',
    OPPORTUNITY_EDIT: 'crm.opportunities.edit',
    OPPORTUNITY_CREATE: 'crm.opportunities.create',
    OPPORTUNITY_DUPLICATE: 'crm.opportunities.duplicate',
    OPPORTUNITY_BOOK: 'crm.opportunities.book',
    OPPORTUNITY_MARK_LOST: 'crm.opportunities.mark_lost',
    REPORTS_VIEW: 'crm.reports.view',
    TASK_VIEW: 'crm.tasks.view',
    TASK_EDIT: 'crm.tasks.edit',
    STATUS_VIEW: 'crm.settings.status_codes.view',
    STATUS_CREATE: 'crm.settings.status_codes.manage',
    STATUS_EDIT: 'crm.settings.status_codes.manage',
    STATUS_DELETE: 'crm.settings.status_codes.manage',
  },
  INTEGRATIONS: {
    PAYMENT_GATEWAY_VIEW: 'crm.settings.integrations.view',
    PAYMENT_GATEWAY_ADD: 'crm.settings.integrations.manage',
    PAYMENT_GATEWAY_EDIT: 'crm.settings.integrations.manage',
    SENDGRID_VIEW: 'crm.settings.integrations.view',
    SENDGRID_ADD: 'crm.settings.integrations.manage',
    SENDGRID_EDIT: 'crm.settings.integrations.manage',
    RESEND_VIEW: 'crm.settings.integrations.view',
    RESEND_ADD: 'crm.settings.integrations.manage',
    RESEND_EDIT: 'crm.settings.integrations.manage',
    SMTP_VIEW: 'crm.settings.integrations.view',
    SMTP_ADD: 'crm.settings.integrations.manage',
    SMTP_EDIT: 'crm.settings.integrations.manage',
    TELNYX_VIEW: 'crm.settings.integrations.view',
    TELNYX_ADD: 'crm.settings.integrations.manage',
    TELNYX_EDIT: 'crm.settings.integrations.manage',
  },
};

// Backward-compatible flat export used by existing components.
export const PERMISSIONS = {
  COMPANY_ADMIN: FEATURE_PERMISSIONS.WORKSPACE.ADMIN,

  LEAD_VIEW: FEATURE_PERMISSIONS.CRM.LEAD_VIEW,
  LEAD_CREATE: FEATURE_PERMISSIONS.CRM.LEAD_CREATE,
  LEAD_EDIT: FEATURE_PERMISSIONS.CRM.LEAD_EDIT,

  SALES_VIEW_OPPORTUNITY: FEATURE_PERMISSIONS.CRM.OPPORTUNITY_VIEW,
  SALES_CHANGE_OPPORTUNITY: FEATURE_PERMISSIONS.CRM.OPPORTUNITY_EDIT,
  SALES_VIEW_REPORTS: FEATURE_PERMISSIONS.CRM.REPORTS_VIEW,
  SALES_VIEW_TASK: FEATURE_PERMISSIONS.CRM.TASK_VIEW,
  SALES_CHANGE_TASK: FEATURE_PERMISSIONS.CRM.TASK_EDIT,

  USER_VIEW: FEATURE_PERMISSIONS.WORKSPACE.TEAM_VIEW,
  USER_CREATE: FEATURE_PERMISSIONS.WORKSPACE.TEAM_CREATE,
  USER_EDIT: FEATURE_PERMISSIONS.WORKSPACE.TEAM_EDIT,
  USER_DELETE: FEATURE_PERMISSIONS.WORKSPACE.TEAM_DELETE,

  ROLE_VIEW: FEATURE_PERMISSIONS.WORKSPACE.ROLE_VIEW,
  ROLE_CREATE: FEATURE_PERMISSIONS.WORKSPACE.ROLE_CREATE,
  ROLE_EDIT: FEATURE_PERMISSIONS.WORKSPACE.ROLE_EDIT,
  ROLE_DELETE: FEATURE_PERMISSIONS.WORKSPACE.ROLE_DELETE,

  FLEET_VIEW: 'crm.settings.fleet.view',
  FLEET_MANAGE: 'crm.settings.fleet.manage',
  CATALOG_VIEW: 'crm.settings.catalog.view',
  CATALOG_MANAGE: 'crm.settings.catalog.manage',
  PORTAL_TEMPLATES_VIEW: 'crm.settings.portal_templates.view',
  PORTAL_TEMPLATES_MANAGE: 'crm.settings.portal_templates.manage',
  CUSTOMER_PORTALS_VIEW: 'crm.settings.customer_portals.view',
  CUSTOMER_PORTALS_MANAGE: 'crm.settings.customer_portals.manage',
  COMMUNICATION_TEMPLATES_VIEW: 'crm.settings.communication_templates.view',
  COMMUNICATION_TEMPLATES_MANAGE: 'crm.settings.communication_templates.manage',
  DISCOUNTS_VIEW: 'crm.settings.discounts.view',
  DISCOUNTS_MANAGE: 'crm.settings.discounts.manage',

  INTEGRATIONS_VIEW_PAYMENT_GATEWAY: FEATURE_PERMISSIONS.INTEGRATIONS.PAYMENT_GATEWAY_VIEW,
  INTEGRATIONS_CHANGE_PAYMENT_GATEWAY: FEATURE_PERMISSIONS.INTEGRATIONS.PAYMENT_GATEWAY_EDIT,
  INTEGRATIONS_ADD_PAYMENT_GATEWAY: FEATURE_PERMISSIONS.INTEGRATIONS.PAYMENT_GATEWAY_ADD,
  INTEGRATIONS_VIEW_SENDGRID: FEATURE_PERMISSIONS.INTEGRATIONS.SENDGRID_VIEW,
  INTEGRATIONS_CHANGE_SENDGRID: FEATURE_PERMISSIONS.INTEGRATIONS.SENDGRID_EDIT,
  INTEGRATIONS_ADD_SENDGRID: FEATURE_PERMISSIONS.INTEGRATIONS.SENDGRID_ADD,
  INTEGRATIONS_VIEW_RESEND: FEATURE_PERMISSIONS.INTEGRATIONS.RESEND_VIEW,
  INTEGRATIONS_CHANGE_RESEND: FEATURE_PERMISSIONS.INTEGRATIONS.RESEND_EDIT,
  INTEGRATIONS_ADD_RESEND: FEATURE_PERMISSIONS.INTEGRATIONS.RESEND_ADD,
  INTEGRATIONS_VIEW_SMTP: FEATURE_PERMISSIONS.INTEGRATIONS.SMTP_VIEW,
  INTEGRATIONS_CHANGE_SMTP: FEATURE_PERMISSIONS.INTEGRATIONS.SMTP_EDIT,
  INTEGRATIONS_ADD_SMTP: FEATURE_PERMISSIONS.INTEGRATIONS.SMTP_ADD,
  INTEGRATIONS_VIEW_TELNYX: FEATURE_PERMISSIONS.INTEGRATIONS.TELNYX_VIEW,
  INTEGRATIONS_CHANGE_TELNYX: FEATURE_PERMISSIONS.INTEGRATIONS.TELNYX_EDIT,
  INTEGRATIONS_ADD_TELNYX: FEATURE_PERMISSIONS.INTEGRATIONS.TELNYX_ADD,

  AUTOMATIONS_VIEW: 'crm.settings.automations.view',
  AUTOMATIONS_MANAGE: 'crm.settings.automations.manage',
  COMMUNICATIONS_EMAIL_SEND: 'crm.communications.email.send',
  COMMUNICATIONS_SMS_SEND: 'crm.communications.sms.send',
  COMMUNICATIONS_CALL_LOG: 'crm.communications.call.log',
  COMMUNICATIONS_HISTORY_VIEW: 'crm.communications.history.view',
  REPORTS_VIEW: 'crm.reports.view',

  SALES_VIEW_STATUS_CODE: FEATURE_PERMISSIONS.CRM.STATUS_VIEW,
  SALES_ADD_STATUS_CODE: FEATURE_PERMISSIONS.CRM.STATUS_CREATE,
  SALES_CHANGE_STATUS_CODE: FEATURE_PERMISSIONS.CRM.STATUS_EDIT,
  SALES_DELETE_STATUS_CODE: FEATURE_PERMISSIONS.CRM.STATUS_DELETE,

  AUDIT_VIEW: FEATURE_PERMISSIONS.WORKSPACE.AUDIT_VIEW,
};

export const ROUTE_PERMISSIONS = {
  '/dashboard': [PERMISSIONS.DASHBOARD_VIEW],
  '/leads': [PERMISSIONS.LEAD_VIEW],
  '/leads/new': [PERMISSIONS.LEAD_CREATE],
  '/leads/:id': [PERMISSIONS.LEAD_VIEW],
  '/automation': [PERMISSIONS.AUTOMATIONS_VIEW],
  '/automation/templates': [PERMISSIONS.COMMUNICATION_TEMPLATES_VIEW],
  '/automation/templates/:tabId': [PERMISSIONS.COMMUNICATION_TEMPLATES_VIEW],
  '/automation/templates/:itemId/:subView': [PERMISSIONS.COMMUNICATION_TEMPLATES_VIEW],
  '/communication': [PERMISSIONS.COMMUNICATIONS_HISTORY_VIEW],
  '/marketing': [PERMISSIONS.COMMUNICATIONS_EMAIL_SEND],
  '/analytics': [PERMISSIONS.REPORTS_VIEW],
  '/fleet': [PERMISSIONS.FLEET_VIEW],
  '/crm/activities': {
    permissions: [PERMISSIONS.LEAD_VIEW, PERMISSIONS.SALES_VIEW_OPPORTUNITY, PERMISSIONS.COMMUNICATIONS_HISTORY_VIEW],
    match: 'any',
  },
  '/sales': {
    permissions: [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.LEAD_VIEW, PERMISSIONS.SALES_VIEW_OPPORTUNITY],
    match: 'any',
  },
  '/sales/:id': {
    permissions: [PERMISSIONS.LEAD_VIEW, PERMISSIONS.SALES_VIEW_OPPORTUNITY],
    match: 'any',
  },
  '/jobs': [PERMISSIONS.SALES_VIEW_OPPORTUNITY],
  '/jobs/:id': [PERMISSIONS.SALES_VIEW_OPPORTUNITY],
  '/payments': [PERMISSIONS.INTEGRATIONS_VIEW_PAYMENT_GATEWAY],
  '/analytics': [PERMISSIONS.SALES_VIEW_REPORTS],
};

export const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard' },
  {
    path: '/leads',
    label: 'Leads',
    required: [PERMISSIONS.LEAD_VIEW],
  },
  { path: '/jobs', label: 'Jobs', required: [PERMISSIONS.SALES_VIEW_OPPORTUNITY] },
  { path: '/payments', label: 'Payments', required: [PERMISSIONS.INTEGRATIONS_VIEW_PAYMENT_GATEWAY] },
  // { path: '/fleet', label: 'Fleet', required: [PERMISSIONS.FLEET_VIEW] },
  { path: '/marketing', label: 'Marketing' },
  { path: '/automation', label: 'Automation' },
  { path: '/analytics', label: 'Analytics', required: [PERMISSIONS.SALES_VIEW_REPORTS] },
];

export const SETTINGS_TAB_PERMISSIONS = {
  business: [PERMISSIONS.COMPANY_ADMIN],
  compensation: [PERMISSIONS.USER_EDIT],
  company: [PERMISSIONS.COMPANY_ADMIN],
  branches: [PERMISSIONS.COMPANY_ADMIN],
  branding: [PERMISSIONS.COMPANY_ADMIN],
  team: [PERMISSIONS.USER_VIEW],
  crew: [PERMISSIONS.USER_VIEW],
  trucks: [PERMISSIONS.FLEET_VIEW],
  roles: [PERMISSIONS.ROLE_VIEW],
  'mover-types': [PERMISSIONS.SALES_VIEW_OPPORTUNITY],
  'service-types': [PERMISSIONS.SALES_VIEW_OPPORTUNITY],
  'mover-sizes': [PERMISSIONS.FLEET_VIEW],
  'estimate-catalog': [PERMISSIONS.CATALOG_VIEW],
  'catalog-packages': [PERMISSIONS.CATALOG_VIEW],
  inventory: [PERMISSIONS.CATALOG_VIEW],
  'estimate-discount-presets': [PERMISSIONS.DISCOUNTS_VIEW],
  'estimate-portal-templates': [PERMISSIONS.PORTAL_TEMPLATES_VIEW],
  'customer-portals': [PERMISSIONS.CUSTOMER_PORTALS_VIEW],
  templates: [PERMISSIONS.COMMUNICATION_TEMPLATES_VIEW],
  'document-templates': [PERMISSIONS.COMPANY_ADMIN],
  leads: [PERMISSIONS.LEAD_VIEW],
  referrals: [PERMISSIONS.LEAD_VIEW],
  'status-codes': [PERMISSIONS.SALES_VIEW_STATUS_CODE],
  'opportunity-loss-reasons': [PERMISSIONS.SALES_VIEW_STATUS_CODE],
  integrations: [PERMISSIONS.INTEGRATIONS_VIEW_PAYMENT_GATEWAY],
  audit: [PERMISSIONS.AUDIT_VIEW],
};

export const SETTINGS_ENTRY_PERMISSIONS = Array.from(
  new Set(Object.values(SETTINGS_TAB_PERMISSIONS).flat().filter(Boolean))
);

ROUTE_PERMISSIONS['/settings'] = SETTINGS_ENTRY_PERMISSIONS;
NAV_ITEMS.push({ path: '/settings', label: 'Settings', required: SETTINGS_ENTRY_PERMISSIONS, match: 'any' });

const toSet = (permissions) => {
  if (permissions instanceof Set) return permissions;
  if (Array.isArray(permissions)) return new Set(permissions);
  return new Set();
};

const normalizeRequired = (required) => {
  if (!required) return [];
  return Array.isArray(required) ? required.filter(Boolean) : [required];
};

const PERMISSION_ALIASES = {};

const buildSiblingCandidates = (perm) => {
  if (!perm || typeof perm !== 'string') return [];
  const parts = perm.split('.');
  if (parts.length < 2) return [];
  const action = parts[parts.length - 1];
  const base = parts.slice(0, -1).join('.');
  const siblings = [];
  if (action === 'create' || action === 'edit' || action === 'delete') siblings.push(`${base}.manage`);
  return siblings;
};

const normalizePermission = (perm) => {
  if (!perm || typeof perm !== 'string') return perm;
  const parts = perm.split('.');
  if (parts.length > 2) {
    return `${parts.slice(0, -1).join('_')}.${parts[parts.length - 1]}`;
  }
  return perm;
};

const getPermissionCandidates = (perm) => {
  const candidates = new Set([perm, normalizePermission(perm)]);
  for (const alias of PERMISSION_ALIASES[perm] || []) {
    candidates.add(alias);
    candidates.add(normalizePermission(alias));
  }
  for (const sibling of buildSiblingCandidates(perm)) {
    candidates.add(sibling);
    candidates.add(normalizePermission(sibling));
  }
  return Array.from(candidates).filter(Boolean);
};

export const canAll = (required, ctx = {}) => {
  const needed = normalizeRequired(required);
  if (!needed.length) return true;

  if (ctx.isSuperuser || ctx.isSystemAdmin || ctx.isCompanyAdmin) return true;

  const permissionSet = toSet(ctx.permissions);
  return needed.every((perm) => getPermissionCandidates(perm).some((candidate) => permissionSet.has(candidate)));
};

export const canAny = (required, ctx = {}) => {
  const needed = normalizeRequired(required);
  if (!needed.length) return true;

  if (ctx.isSuperuser || ctx.isSystemAdmin || ctx.isCompanyAdmin) return true;

  const permissionSet = toSet(ctx.permissions);
  return needed.some((perm) => getPermissionCandidates(perm).some((candidate) => permissionSet.has(candidate)));
};

export const can = (required, ctx = {}) => canAll(required, ctx);

export const getAllowedNavItems = (items, ctx = {}) => {
  const rows = Array.isArray(items) ? items : [];
  return rows.filter((item) => (item.match === 'any' ? canAny(item.required, ctx) : can(item.required, ctx)));
};
