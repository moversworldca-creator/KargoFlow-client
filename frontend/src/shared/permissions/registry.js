// Canonical list of all 97 permissions supported in the Settings page.
export const SETTINGS_PERMISSIONS_LIST = [
  'template_library.create',
  'crew_photos.view',
  'rbac_roles.view',
  'leads.update',
  'opportunities.mark_lost',
  'lead_reports.view',
  'users.manage',
  'crm.leads.edit',
  'lead_activities.view',
  'leads.view',
  'opportunities.update',
  'crew_identity.manage',
  'crm.tasks.view',
  'opportunities.book_without_acceptance',
  'opportunities.complete',
  'opportunities.reopen',
  'crew_signatures.create',
  'opportunities.create',
  'customers.view',
  'crm.pipeline.view',
  'lead_activities.create',
  'users.assign_role',
  'opportunity_reports.view',
  'catalog.manage',
  'lead_providers.manage',
  'branches.view',
  'crm.payments.view',
  'rbac_roles.create',
  'leads.assign',
  'compensation.view',
  'leads.restore',
  'crm.reports.view',
  'opportunities.set_binding_type',
  'rbac_overrides.manage',
  'opportunities.cancel',
  'opportunities.book',
  'leads.qualify',
  'lead_duplicates.manage',
  'settings.view',
  'crew_issues.report',
  'opportunities.book_without_deposit',
  'crew_time.update',
  'crew_dispatch.view',
  'lead_imports.view',
  'lead_providers.view',
  'crm.settings.users.view',
  'crew_inventory.view',
  'rbac_roles.manage',
  'catalog.view',
  'customers.create',
  'employees.manage',
  'employees.view',
  'customers.update',
  'compensation.manage',
  '*',
  'opportunities.change_branch',
  'crm.admin',
  'crm.estimates.view',
  'template_library.view',
  'opportunities.assign',
  'customers.merge',
  'opportunities.change_branch_booked',
  'crew_time.view',
  'lead_imports.create',
  'settings.manage',
  'branches.manage',
  'lead_settings.manage',
  'opportunities.book_without_signature',
  'opportunities.view',
  'crew_jobs.update',
  'crm.leads.view',
  'leads.close',
  'lead_settings.view',
  'crew_job_completion.complete',
  'audit_logs.view',
  'entitlements.view',
  'rbac_permissions.view',
  'crm.dashboard.view',
  'crew_signatures.view',
  'leads.create',
  'customers.block',
  'template_library.update',
  'branches.delete',
  'crew_photos.create',
  'crm.leads.create',
  'opportunity_settings.manage',
  'crew_inventory.update',
  'audit_logs.manage',
  'crm.opportunities.view',
  'crew_jobs.view',
  'leads.convert',
  'companies.view',
  'crm.settings.roles.view',
  'branches.create',
  'users.view',
  'rbac_overrides.view',
  'lead_duplicates.view',
];

// Feature-first permission registry.
// We keep backend codenames as keys for complete compatibility.
export const FEATURE_PERMISSION_CATALOG = {
  // System / Superuser
  '*': {
    label: 'All Permissions (Wildcard)',
    module: 'System & Admin',
    action: 'other',
    allowedScopes: ['company', 'branch', 'own', 'assigned'],
    description: 'Full administrative access across all endpoints and features',
  },
  'crm.admin': {
    label: 'CRM Administrator',
    module: 'System & Admin',
    action: 'other',
    allowedScopes: ['company'],
    description: 'Full CRM administration privileges',
  },

  // Template Library
  'template_library.create': {
    label: 'Create / Install Templates',
    module: 'Template Library',
    action: 'create',
    allowedScopes: ['company', 'branch'],
    description: 'Install Kargo templates and starter packs',
  },
  'template_library.view': {
    label: 'View Template Library',
    module: 'Template Library',
    action: 'view',
    allowedScopes: ['company', 'branch'],
    description: 'Browse and preview the Kargo template library',
  },
  'template_library.update': {
    label: 'Update Templates',
    module: 'Template Library',
    action: 'edit',
    allowedScopes: ['company', 'branch'],
    description: 'Prepare and apply upstream template updates',
  },

  // Crew Management
  'crew_photos.view': {
    label: 'View Crew Photos',
    module: 'Crew',
    action: 'view',
    allowedScopes: ['company', 'branch', 'assigned'],
    description: 'View photos for assigned jobs',
  },
  'crew_photos.create': {
    label: 'Upload Crew Photos',
    module: 'Crew',
    action: 'create',
    allowedScopes: ['company', 'branch', 'assigned'],
    description: 'Upload photos for assigned jobs',
  },
  'crew_identity.manage': {
    label: 'Manage Crew Identity',
    module: 'Crew',
    action: 'edit',
    allowedScopes: ['company'],
    description: 'Link users to crew identities and manage crew access',
  },
  'crew_signatures.create': {
    label: 'Capture Crew Signatures',
    module: 'Crew',
    action: 'create',
    allowedScopes: ['company', 'branch', 'assigned'],
    description: 'Capture signatures for assigned jobs',
  },
  'crew_signatures.view': {
    label: 'View Crew Signatures',
    module: 'Crew',
    action: 'view',
    allowedScopes: ['company', 'branch', 'assigned'],
    description: 'View signatures for assigned jobs',
  },
  'crew_issues.report': {
    label: 'Report Crew Issues',
    module: 'Crew',
    action: 'create',
    allowedScopes: ['company', 'branch', 'assigned'],
    description: 'Report an issue on an assigned job',
  },
  'crew_time.view': {
    label: 'View Crew Time',
    module: 'Crew',
    action: 'view',
    allowedScopes: ['company', 'branch', 'assigned'],
    description: 'View crew time for assigned jobs',
  },
  'crew_time.update': {
    label: 'Update Crew Time',
    module: 'Crew',
    action: 'edit',
    allowedScopes: ['company', 'branch', 'assigned'],
    description: 'Adjust crew time within authorized scope',
  },
  'crew_dispatch.view': {
    label: 'View Crew Dispatch',
    module: 'Crew',
    action: 'view',
    allowedScopes: ['company', 'branch', 'assigned'],
    description: 'View assigned dispatch details',
  },
  'crew_inventory.view': {
    label: 'View Crew Inventory',
    module: 'Crew',
    action: 'view',
    allowedScopes: ['company', 'branch', 'assigned'],
    description: 'View inventory for assigned jobs',
  },
  'crew_inventory.update': {
    label: 'Update Crew Inventory',
    module: 'Crew',
    action: 'edit',
    allowedScopes: ['company', 'branch', 'assigned'],
    description: 'Update inventory for assigned jobs',
  },
  'crew_jobs.view': {
    label: 'View Crew Jobs',
    module: 'Crew',
    action: 'view',
    allowedScopes: ['company', 'branch', 'assigned'],
    description: 'View crew-visible assigned jobs',
  },
  'crew_jobs.update': {
    label: 'Update Crew Jobs',
    module: 'Crew',
    action: 'edit',
    allowedScopes: ['company', 'branch', 'assigned'],
    description: 'Update crew-visible assigned jobs',
  },
  'crew_job_completion.complete': {
    label: 'Complete Assigned Job',
    module: 'Crew',
    action: 'other',
    allowedScopes: ['company', 'branch', 'assigned'],
    description: 'Complete an assigned job',
  },

  // Leads
  'leads.view': {
    label: 'View Leads',
    module: 'Leads',
    action: 'view',
    allowedScopes: ['company', 'branch', 'own'],
    description: 'View leads',
  },
  'leads.create': {
    label: 'Create Leads',
    module: 'Leads',
    action: 'create',
    allowedScopes: ['company', 'branch'],
    description: 'Create leads',
  },
  'leads.update': {
    label: 'Update Leads',
    module: 'Leads',
    action: 'edit',
    allowedScopes: ['company', 'branch', 'own'],
    description: 'Update leads and work them',
  },
  'leads.assign': {
    label: 'Assign Leads',
    module: 'Leads',
    action: 'edit',
    allowedScopes: ['company', 'branch'],
    description: 'Assign and unassign leads',
  },
  'leads.qualify': {
    label: 'Qualify Leads',
    module: 'Leads',
    action: 'edit',
    allowedScopes: ['company', 'branch', 'own'],
    description: 'Qualify leads',
  },
  'leads.close': {
    label: 'Close Leads',
    module: 'Leads',
    action: 'other',
    allowedScopes: ['company', 'branch', 'own'],
    description: 'Mark leads lost or disqualified',
  },
  'leads.restore': {
    label: 'Restore Leads',
    module: 'Leads',
    action: 'other',
    allowedScopes: ['company', 'branch'],
    description: 'Restore archived or disqualified leads',
  },
  'leads.convert': {
    label: 'Convert Leads',
    module: 'Leads',
    action: 'other',
    allowedScopes: ['company', 'branch', 'own'],
    description: 'Convert leads to opportunities',
  },
  'crm.leads.view': {
    label: 'View Leads (CRM)',
    module: 'Leads',
    action: 'view',
    allowedScopes: ['own', 'branch', 'company'],
    description: 'View leads in CRM',
  },
  'crm.leads.create': {
    label: 'Create Leads (CRM)',
    module: 'Leads',
    action: 'create',
    allowedScopes: ['branch', 'company'],
    description: 'Create leads in CRM',
  },
  'crm.leads.edit': {
    label: 'Edit Leads (CRM)',
    module: 'Leads',
    action: 'edit',
    allowedScopes: ['own', 'branch', 'company'],
    description: 'Edit leads in CRM',
  },
  'crm.leads.assign': {
    label: 'Assign Leads (CRM)',
    module: 'Leads',
    action: 'edit',
    allowedScopes: ['branch', 'company'],
  },
  'crm.leads.change_branch': {
    label: 'Change Lead Branch',
    module: 'Leads',
    action: 'edit',
    allowedScopes: ['branch', 'company'],
  },
  'crm.leads.convert': {
    label: 'Convert Leads (CRM)',
    module: 'Leads',
    action: 'other',
    allowedScopes: ['branch', 'company'],
  },
  'lead_activities.view': {
    label: 'View Lead Activities',
    module: 'Leads',
    action: 'view',
    allowedScopes: ['company', 'branch', 'own'],
    description: 'View lead activities and tasks',
  },
  'lead_activities.create': {
    label: 'Create Lead Activities',
    module: 'Leads',
    action: 'create',
    allowedScopes: ['company', 'branch', 'own'],
    description: 'Log and edit lead activities and tasks',
  },
  'lead_reports.view': {
    label: 'View Lead Reports',
    module: 'Leads',
    action: 'view',
    allowedScopes: ['company', 'branch'],
    description: 'View lead reports',
  },
  'lead_providers.view': {
    label: 'View Lead Providers',
    module: 'Leads',
    action: 'view',
    allowedScopes: ['company'],
    description: 'View lead providers and intake events',
  },
  'lead_providers.manage': {
    label: 'Manage Lead Providers',
    module: 'Leads',
    action: 'edit',
    allowedScopes: ['company'],
    description: 'Manage lead providers',
  },
  'lead_duplicates.view': {
    label: 'View Duplicate Leads',
    module: 'Leads',
    action: 'view',
    allowedScopes: ['company', 'branch'],
    description: 'View duplicate reviews',
  },
  'lead_duplicates.manage': {
    label: 'Manage Duplicate Leads',
    module: 'Leads',
    action: 'edit',
    allowedScopes: ['company', 'branch'],
    description: 'Resolve duplicate reviews',
  },
  'lead_imports.view': {
    label: 'View Lead Imports',
    module: 'Leads',
    action: 'view',
    allowedScopes: ['company'],
    description: 'View lead imports',
  },
  'lead_imports.create': {
    label: 'Create Lead Imports',
    module: 'Leads',
    action: 'create',
    allowedScopes: ['company'],
    description: 'Import leads',
  },
  'lead_settings.view': {
    label: 'View Lead Settings',
    module: 'Leads',
    action: 'view',
    allowedScopes: ['company'],
    description: 'View lead routing and settings',
  },
  'lead_settings.manage': {
    label: 'Manage Lead Settings',
    module: 'Leads',
    action: 'edit',
    allowedScopes: ['company'],
    description: 'Manage lead catalogs, routing and settings',
  },

  // Opportunities
  'opportunities.view': {
    label: 'View Opportunities',
    module: 'Opportunities',
    action: 'view',
    allowedScopes: ['company', 'branch', 'own'],
    description: 'View opportunities',
  },
  'opportunities.create': {
    label: 'Create Opportunities',
    module: 'Opportunities',
    action: 'create',
    allowedScopes: ['company', 'branch'],
    description: 'Create opportunities',
  },
  'opportunities.update': {
    label: 'Update Opportunities',
    module: 'Opportunities',
    action: 'edit',
    allowedScopes: ['company', 'branch', 'own'],
    description: 'Update opportunities, jobs, stops, contacts, tags, custom fields',
  },
  'opportunities.assign': {
    label: 'Assign Opportunities',
    module: 'Opportunities',
    action: 'edit',
    allowedScopes: ['company', 'branch'],
    description: 'Assign and unassign the opportunity owner',
  },
  'opportunities.mark_lost': {
    label: 'Mark Opportunities Lost',
    module: 'Opportunities',
    action: 'other',
    allowedScopes: ['company', 'branch', 'own'],
    description: 'Mark open opportunities lost',
  },
  'opportunities.book': {
    label: 'Book Opportunities',
    module: 'Opportunities',
    action: 'other',
    allowedScopes: ['company', 'branch', 'own'],
    description: 'Book an Opportunity when prerequisites are met',
  },
  'opportunities.book_without_acceptance': {
    label: 'Book Without Acceptance',
    module: 'Opportunities',
    action: 'other',
    allowedScopes: ['company', 'branch'],
    description: 'Book an Opportunity despite missing required estimate acceptance',
  },
  'opportunities.book_without_deposit': {
    label: 'Book Without Deposit',
    module: 'Opportunities',
    action: 'other',
    allowedScopes: ['company', 'branch'],
    description: 'Book an Opportunity despite unpaid/underpaid deposit',
  },
  'opportunities.book_without_signature': {
    label: 'Book Without Signature',
    module: 'Opportunities',
    action: 'other',
    allowedScopes: ['company', 'branch'],
    description: 'Book an Opportunity despite required unsigned contract',
  },
  'opportunities.set_binding_type': {
    label: 'Set Binding Type',
    module: 'Opportunities',
    action: 'edit',
    allowedScopes: ['company', 'branch'],
    description: 'Override the opportunity binding type',
  },
  'opportunities.change_branch': {
    label: 'Change Opportunity Branch',
    module: 'Opportunities',
    action: 'edit',
    allowedScopes: ['company', 'branch'],
    description: 'Move an open opportunity to another branch',
  },
  'opportunities.change_branch_booked': {
    label: 'Change Booked Opportunity Branch',
    module: 'Opportunities',
    action: 'edit',
    allowedScopes: ['company'],
    description: 'Move a booked opportunity to another branch before execution',
  },
  'opportunities.complete': {
    label: 'Complete Opportunities',
    module: 'Opportunities',
    action: 'other',
    allowedScopes: ['company', 'branch'],
    description: 'Complete booked opportunities',
  },
  'opportunities.cancel': {
    label: 'Cancel Opportunities',
    module: 'Opportunities',
    action: 'other',
    allowedScopes: ['company', 'branch'],
    description: 'Cancel booked opportunities',
  },
  'opportunities.reopen': {
    label: 'Reopen Opportunities',
    module: 'Opportunities',
    action: 'other',
    allowedScopes: ['company', 'branch'],
    description: 'Reopen lost or cancelled opportunities and unbook booked ones',
  },
  'opportunity_reports.view': {
    label: 'View Opportunity Reports',
    module: 'Opportunities',
    action: 'view',
    allowedScopes: ['company', 'branch'],
    description: 'View opportunity reports',
  },
  'opportunity_settings.manage': {
    label: 'Manage Opportunity Settings',
    module: 'Opportunities',
    action: 'edit',
    allowedScopes: ['company'],
    description: 'Manage opportunity catalogs, tags, custom fields and booking policy',
  },
  'crm.opportunities.view': {
    label: 'View Opportunities (CRM)',
    module: 'Opportunities',
    action: 'view',
    allowedScopes: ['own', 'branch', 'company'],
    description: 'View opportunities in CRM',
  },
  'crm.opportunities.edit': {
    label: 'Edit Opportunities (CRM)',
    module: 'Opportunities',
    action: 'edit',
    allowedScopes: ['branch', 'company'],
  },
  'crm.opportunities.create': {
    label: 'Create Opportunities (CRM)',
    module: 'Opportunities',
    action: 'create',
    allowedScopes: ['branch', 'company'],
  },
  'crm.opportunities.duplicate': {
    label: 'Duplicate Opportunities (CRM)',
    module: 'Opportunities',
    action: 'create',
    allowedScopes: ['branch', 'company'],
  },
  'crm.opportunities.book': {
    label: 'Book Opportunities (CRM)',
    module: 'Opportunities',
    action: 'other',
    allowedScopes: ['branch', 'company'],
  },
  'crm.opportunities.mark_lost': {
    label: 'Mark Opportunities Lost (CRM)',
    module: 'Opportunities',
    action: 'other',
    allowedScopes: ['branch', 'company'],
  },

  // Customers
  'customers.view': {
    label: 'View Customers',
    module: 'Customers',
    action: 'view',
    allowedScopes: ['company'],
    description: 'View customer profiles, contacts, addresses and history',
  },
  'customers.create': {
    label: 'Create Customers',
    module: 'Customers',
    action: 'create',
    allowedScopes: ['company'],
    description: 'Create customer profiles',
  },
  'customers.update': {
    label: 'Update Customers',
    module: 'Customers',
    action: 'edit',
    allowedScopes: ['company'],
    description: 'Update customer profiles, contacts, addresses and the warning flag',
  },
  'customers.merge': {
    label: 'Merge Customers',
    module: 'Customers',
    action: 'edit',
    allowedScopes: ['company'],
    description: 'Merge duplicate customer profiles',
  },
  'customers.block': {
    label: 'Block Customers',
    module: 'Customers',
    action: 'other',
    allowedScopes: ['company'],
    description: 'Set and clear the customer service block',
  },

  // Catalog
  'catalog.view': {
    label: 'View Catalog',
    module: 'Catalog',
    action: 'view',
    allowedScopes: ['company', 'branch'],
    description: 'View tenant catalog records',
  },
  'catalog.manage': {
    label: 'Manage Catalog',
    module: 'Catalog',
    action: 'edit',
    allowedScopes: ['company', 'branch'],
    description: 'Manage tenant catalog records',
  },

  // Branches
  'branches.view': {
    label: 'View Branches',
    module: 'Branches',
    action: 'view',
    allowedScopes: ['company', 'branch'],
    description: 'View branches',
  },
  'branches.create': {
    label: 'Create Branches',
    module: 'Branches',
    action: 'create',
    allowedScopes: ['company', 'branch'],
    description: 'Create branches',
  },
  'branches.manage': {
    label: 'Manage Branches',
    module: 'Branches',
    action: 'edit',
    allowedScopes: ['company', 'branch'],
    description: 'Manage branch lifecycle',
  },
  'branches.delete': {
    label: 'Delete Branches',
    module: 'Branches',
    action: 'delete',
    allowedScopes: ['company', 'branch'],
    description: 'Delete inactive branches',
  },

  // Companies
  'companies.view': {
    label: 'View Companies',
    module: 'Companies',
    action: 'view',
    allowedScopes: ['company', 'branch'],
    description: 'View company records',
  },

  // Compensation
  'compensation.view': {
    label: 'View Compensation',
    module: 'Compensation',
    action: 'view',
    allowedScopes: ['company', 'branch'],
    description: 'View compensation',
  },
  'compensation.manage': {
    label: 'Manage Compensation',
    module: 'Compensation',
    action: 'edit',
    allowedScopes: ['company', 'branch'],
    description: 'Manage compensation',
  },

  // Employees
  'employees.view': {
    label: 'View Employees',
    module: 'Employees',
    action: 'view',
    allowedScopes: ['company', 'branch'],
    description: 'View employees',
  },
  'employees.manage': {
    label: 'Manage Employees',
    module: 'Employees',
    action: 'edit',
    allowedScopes: ['company', 'branch'],
    description: 'Create, update, terminate and rehire employees',
  },

  // Settings
  'settings.view': {
    label: 'View Settings',
    module: 'Settings',
    action: 'view',
    allowedScopes: ['company', 'branch'],
    description: 'View company and branch settings',
  },
  'settings.manage': {
    label: 'Manage Settings',
    module: 'Settings',
    action: 'edit',
    allowedScopes: ['company', 'branch'],
    description: 'Manage company and branch settings, branding, social links and tax',
  },

  // Audit Logs
  'audit_logs.view': {
    label: 'View Audit Logs',
    module: 'Audit Logs',
    action: 'view',
    allowedScopes: ['company', 'branch'],
    description: 'View audit logs',
  },
  'audit_logs.manage': {
    label: 'Manage Audit Logs',
    module: 'Audit Logs',
    action: 'edit',
    allowedScopes: ['company', 'branch'],
    description: 'Manage audit events',
  },

  // Entitlements
  'entitlements.view': {
    label: 'View Entitlements',
    module: 'Entitlements',
    action: 'view',
    allowedScopes: ['company', 'branch'],
    description: 'View tenant entitlements',
  },

  // Users & RBAC
  'users.view': {
    label: 'View Users',
    module: 'Team & Users',
    action: 'view',
    allowedScopes: ['company', 'branch'],
    description: 'View tenant users',
  },
  'users.manage': {
    label: 'Manage Users',
    module: 'Team & Users',
    action: 'edit',
    allowedScopes: ['company'],
    description: 'Invite, deactivate and reactivate logins; manage branch membership',
  },
  'users.assign_role': {
    label: 'Assign Roles',
    module: 'Team & Users',
    action: 'edit',
    allowedScopes: ['company', 'branch'],
    description: 'Assign tenant user roles',
  },
  'crm.settings.users.view': {
    label: 'View Settings Users',
    module: 'Team & Users',
    action: 'view',
    allowedScopes: ['own', 'branch', 'company'],
    description: 'View Team Members in settings',
  },
  'rbac_roles.view': {
    label: 'View RBAC Roles',
    module: 'Roles & Permissions',
    action: 'view',
    allowedScopes: ['company', 'branch'],
    description: 'View RBAC roles',
  },
  'rbac_roles.create': {
    label: 'Create RBAC Roles',
    module: 'Roles & Permissions',
    action: 'create',
    allowedScopes: ['company'],
    description: 'Create tenant RBAC roles',
  },
  'rbac_roles.manage': {
    label: 'Manage RBAC Roles',
    module: 'Roles & Permissions',
    action: 'edit',
    allowedScopes: ['company'],
    description: 'Change custom roles and their permissions',
  },
  'crm.settings.roles.view': {
    label: 'View Settings Roles',
    module: 'Roles & Permissions',
    action: 'view',
    allowedScopes: ['own', 'branch', 'company'],
    description: 'View settings roles',
  },
  'rbac_permissions.view': {
    label: 'View RBAC Permissions',
    module: 'Roles & Permissions',
    action: 'view',
    allowedScopes: ['company', 'branch'],
    description: 'View RBAC permissions and explain decisions',
  },
  'rbac_overrides.view': {
    label: 'View RBAC Overrides',
    module: 'Roles & Permissions',
    action: 'view',
    allowedScopes: ['company'],
    description: 'View direct user permission overrides',
  },
  'rbac_overrides.manage': {
    label: 'Manage RBAC Overrides',
    module: 'Roles & Permissions',
    action: 'edit',
    allowedScopes: ['company'],
    description: 'Grant and revoke direct user permission overrides',
  },

  // CRM Legacy / Shared
  'crm.dashboard.view': {
    label: 'View CRM Dashboard',
    module: 'CRM',
    action: 'view',
    allowedScopes: ['own', 'branch', 'company'],
    description: 'View CRM dashboard',
  },
  'crm.pipeline.view': {
    label: 'View Pipeline',
    module: 'Pipeline',
    action: 'view',
    allowedScopes: ['own', 'branch', 'company'],
    description: 'View Pipeline',
  },
  'crm.reports.view': {
    label: 'View CRM Reports',
    module: 'Reports',
    action: 'view',
    allowedScopes: ['own', 'branch', 'company'],
    description: 'View CRM reports',
  },
  'crm.tasks.view': {
    label: 'View CRM Tasks',
    module: 'Tasks',
    action: 'view',
    allowedScopes: ['own', 'branch', 'company'],
    description: 'View CRM tasks',
  },
  'crm.estimates.view': {
    label: 'View Estimates',
    module: 'Estimates',
    action: 'view',
    allowedScopes: ['own', 'branch', 'company'],
    description: 'View estimates',
  },
  'crm.payments.view': {
    label: 'View Payments',
    module: 'Payments',
    action: 'view',
    allowedScopes: ['own', 'branch', 'company'],
    description: 'View payments',
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

export const SETTINGS_TAB_PERMISSIONS = {
  business: [PERMISSIONS.COMPANY_ADMIN, 'settings.view', 'settings.manage'],
  compensation: [PERMISSIONS.USER_EDIT, 'compensation.view', 'compensation.manage'],
  company: [PERMISSIONS.COMPANY_ADMIN, 'companies.view', 'settings.view', 'settings.manage'],
  branches: [PERMISSIONS.COMPANY_ADMIN, 'branches.view', 'branches.manage', 'branches.create', 'branches.delete'],
  branding: [PERMISSIONS.COMPANY_ADMIN, 'settings.view', 'settings.manage'],
  team: [PERMISSIONS.USER_VIEW, 'users.view', 'users.manage', 'users.assign_role'],
  crew: [PERMISSIONS.USER_VIEW, 'crew_jobs.view', 'crew_dispatch.view', 'crew_identity.manage', 'crew_time.view', 'crew_photos.view', 'crew_signatures.view', 'crew_inventory.view', 'employees.view', 'employees.manage'],
  trucks: [PERMISSIONS.FLEET_VIEW, 'crew_dispatch.view', 'settings.view', 'settings.manage'],
  roles: [PERMISSIONS.ROLE_VIEW, 'rbac_roles.view', 'rbac_roles.create', 'rbac_roles.manage', 'rbac_permissions.view', 'rbac_overrides.view', 'rbac_overrides.manage'],
  'mover-types': [PERMISSIONS.SALES_VIEW_OPPORTUNITY, 'catalog.view', 'catalog.manage', 'opportunities.view'],
  'service-types': [PERMISSIONS.SALES_VIEW_OPPORTUNITY, 'catalog.view', 'catalog.manage', 'opportunities.view'],
  'mover-sizes': [PERMISSIONS.FLEET_VIEW, 'catalog.view', 'catalog.manage', 'settings.view', 'settings.manage'],
  'estimate-catalog': [PERMISSIONS.CATALOG_VIEW, 'catalog.view', 'catalog.manage'],
  'catalog-packages': [PERMISSIONS.CATALOG_VIEW, 'catalog.view', 'catalog.manage'],
  inventory: [PERMISSIONS.CATALOG_VIEW, 'catalog.view', 'catalog.manage', 'crew_inventory.view', 'crew_inventory.update'],
  'estimate-discount-presets': [PERMISSIONS.DISCOUNTS_VIEW, 'catalog.view', 'catalog.manage', 'opportunities.view'],
  'estimate-portal-templates': [PERMISSIONS.PORTAL_TEMPLATES_VIEW, 'template_library.view', 'template_library.create', 'template_library.update'],
  'customer-portals': [PERMISSIONS.CUSTOMER_PORTALS_VIEW, 'customers.view', 'template_library.view'],
  templates: [PERMISSIONS.COMMUNICATION_TEMPLATES_VIEW, 'template_library.view', 'template_library.create', 'template_library.update'],
  'document-templates': [PERMISSIONS.COMPANY_ADMIN, 'template_library.view', 'template_library.create', 'template_library.update'],
  leads: [PERMISSIONS.LEAD_VIEW, 'leads.view', 'lead_settings.view', 'lead_settings.manage', 'lead_providers.view', 'lead_providers.manage'],
  referrals: [PERMISSIONS.LEAD_VIEW, 'leads.view', 'lead_settings.view', 'lead_settings.manage'],
  'status-codes': [PERMISSIONS.SALES_VIEW_STATUS_CODE, 'opportunity_settings.manage', 'lead_settings.view', 'lead_settings.manage'],
  'opportunity-loss-reasons': [PERMISSIONS.SALES_VIEW_STATUS_CODE, 'opportunity_settings.manage', 'opportunities.view'],
  scheduling: ['crew_dispatch.view', 'branches.view', 'settings.view', 'settings.manage'],
  integrations: [PERMISSIONS.INTEGRATIONS_VIEW_PAYMENT_GATEWAY, 'settings.view', 'settings.manage'],
  audit: [PERMISSIONS.AUDIT_VIEW, 'audit_logs.view', 'audit_logs.manage'],
};

export const SETTINGS_ENTRY_PERMISSIONS = Array.from(
  new Set([
    'settings.view',
    'settings.manage',
    'crm.admin',
    '*',
    'rbac_roles.view',
    'rbac_roles.manage',
    'users.view',
    'users.manage',
    'branches.view',
    'catalog.view',
    'audit_logs.view',
    ...Object.values(SETTINGS_TAB_PERMISSIONS).flat(),
  ].filter(Boolean))
);

ROUTE_PERMISSIONS['/settings'] = SETTINGS_ENTRY_PERMISSIONS;

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
  { path: '/settings', label: 'Settings', required: SETTINGS_ENTRY_PERMISSIONS, match: 'any' },
];

const toSet = (permissions) => {
  if (permissions instanceof Set) return permissions;
  if (Array.isArray(permissions)) return new Set(permissions);
  return new Set();
};

const normalizeRequired = (required) => {
  if (!required) return [];
  return Array.isArray(required) ? required.filter(Boolean) : [required];
};

const PERMISSION_ALIASES = {
  'leads.view': ['crm.leads.view'],
  'crm.leads.view': ['leads.view'],
  'leads.create': ['crm.leads.create'],
  'crm.leads.create': ['leads.create'],
  'leads.update': ['crm.leads.edit'],
  'crm.leads.edit': ['leads.update'],
  'leads.assign': ['crm.leads.assign'],
  'crm.leads.assign': ['leads.assign'],
  'leads.convert': ['crm.leads.convert'],
  'crm.leads.convert': ['leads.convert'],
  'opportunities.view': ['crm.opportunities.view'],
  'crm.opportunities.view': ['opportunities.view'],
  'opportunities.create': ['crm.opportunities.create'],
  'crm.opportunities.create': ['opportunities.create'],
  'opportunities.update': ['crm.opportunities.edit'],
  'crm.opportunities.edit': ['opportunities.update'],
  'opportunities.book': ['crm.opportunities.book'],
  'crm.opportunities.book': ['opportunities.book'],
  'opportunities.mark_lost': ['crm.opportunities.mark_lost'],
  'crm.opportunities.mark_lost': ['opportunities.mark_lost'],
  'rbac_roles.view': ['crm.settings.roles.view'],
  'crm.settings.roles.view': ['rbac_roles.view'],
  'rbac_roles.manage': ['crm.settings.roles.manage'],
  'crm.settings.roles.manage': ['rbac_roles.manage', 'rbac_roles.create'],
  'rbac_roles.create': ['crm.settings.roles.manage'],
  'users.view': ['crm.settings.users.view'],
  'crm.settings.users.view': ['users.view'],
  'users.manage': ['crm.settings.users.manage'],
  'crm.settings.users.manage': ['users.manage', 'users.assign_role'],
  'catalog.view': ['crm.settings.catalog.view'],
  'crm.settings.catalog.view': ['catalog.view'],
  'catalog.manage': ['crm.settings.catalog.manage'],
  'crm.settings.catalog.manage': ['catalog.manage'],
  'audit_logs.view': ['crm.audit.view'],
  'crm.audit.view': ['audit_logs.view'],
  'settings.manage': ['crm.admin'],
  'crm.admin': ['settings.manage'],
};

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
  if (permissionSet.has('*')) return true;

  return needed.every((perm) => getPermissionCandidates(perm).some((candidate) => permissionSet.has(candidate)));
};

export const canAny = (required, ctx = {}) => {
  const needed = normalizeRequired(required);
  if (!needed.length) return true;

  if (ctx.isSuperuser || ctx.isSystemAdmin || ctx.isCompanyAdmin) return true;

  const permissionSet = toSet(ctx.permissions);
  if (permissionSet.has('*')) return true;

  return needed.some((perm) => getPermissionCandidates(perm).some((candidate) => permissionSet.has(candidate)));
};

export const can = (required, ctx = {}) => canAll(required, ctx);

export const getAllowedNavItems = (items, ctx = {}) => {
  const rows = Array.isArray(items) ? items : [];
  return rows.filter((item) => (item.match === 'any' ? canAny(item.required, ctx) : can(item.required, ctx)));
};
