// ============================================================================
// SaaS Platform RBAC Specifications (Section 1.1)
// Platform Staff Roles, Granular Permissions, and Scopes
// STRICTLY ISOLATED from tenant-level `crm.*` company permissions
// ============================================================================

export const PLATFORM_PERMISSIONS = {
  USERS_VIEW: 'platform.users.view',
  USERS_MANAGE: 'platform.users.manage',
  ROLES_VIEW: 'platform.roles.view',
  ROLES_MANAGE: 'platform.roles.manage',
  TENANTS_VIEW: 'platform.tenants.view',
  TENANTS_MANAGE: 'platform.tenants.manage',
  SUBSCRIPTIONS_VIEW: 'platform.subscriptions.view',
  SUBSCRIPTIONS_MANAGE: 'platform.subscriptions.manage',
  PLANS_VIEW: 'platform.plans.view',
  PLANS_MANAGE: 'platform.plans.manage',
  OVERRIDES_MANAGE: 'platform.overrides.manage',
  SUPPORT_SESSIONS_VIEW: 'platform.support_sessions.view',
  SUPPORT_SESSIONS_CREATE: 'platform.support_sessions.create',
  AUDIT_VIEW: 'platform.audit.view',
};

export const PERMISSION_DEFINITIONS = [
  {
    code: 'platform.users.view',
    name: 'View Platform Staff',
    category: 'Platform Security',
    description: 'View platform staff list, roles, company assignments, and profile metadata.',
  },
  {
    code: 'platform.users.manage',
    name: 'Manage Platform Staff',
    category: 'Platform Security',
    description: 'Invite new staff, assign roles, modify company scopes, suspend, or reactivate accounts.',
  },
  {
    code: 'platform.roles.view',
    name: 'View Platform Roles',
    category: 'Platform Security',
    description: 'Inspect the platform role hierarchy and permission matrix.',
  },
  {
    code: 'platform.roles.manage',
    name: 'Manage Platform Roles',
    category: 'Platform Security',
    description: 'Configure and update custom platform roles and permission mappings.',
  },
  {
    code: 'platform.tenants.view',
    name: 'View Tenants & Companies',
    category: 'Tenant Operations',
    description: 'View tenant list, subscription tiers, health metrics, and tenant company profiles.',
  },
  {
    code: 'platform.tenants.manage',
    name: 'Manage Tenants',
    category: 'Tenant Operations',
    description: 'Provision new tenant companies, modify tenant settings, and update tenant lifecycle states.',
  },
  {
    code: 'platform.subscriptions.view',
    name: 'View Subscriptions',
    category: 'Billing & Subscriptions',
    description: 'Inspect subscription statuses, renewal dates, billing intervals, and payment gateway references.',
  },
  {
    code: 'platform.subscriptions.manage',
    name: 'Manage Subscriptions',
    category: 'Billing & Subscriptions',
    description: 'Perform subscription status transitions, plan upgrades/downgrades, trial and grace extensions.',
  },
  {
    code: 'platform.plans.view',
    name: 'View Pricing Plans',
    category: 'Catalog & Plans',
    description: 'View tiered platform plans, feature allocations, and quota definitions.',
  },
  {
    code: 'platform.plans.manage',
    name: 'Manage Pricing Plans',
    category: 'Catalog & Plans',
    description: 'Create and edit platform pricing plans, feature matrix, and quota limits.',
  },
  {
    code: 'platform.overrides.manage',
    name: 'Manage Entitlement Overrides',
    category: 'Entitlements',
    description: 'Grant custom tenant-specific quota adjustments or feature flags outside default plan tier.',
  },
  {
    code: 'platform.support_sessions.view',
    name: 'View Support Sessions',
    category: 'Support & Access',
    description: 'View active and historical controlled support sessions and audit footprints.',
  },
  {
    code: 'platform.support_sessions.create',
    name: 'Initiate Support Sessions',
    category: 'Support & Access',
    description: 'Initiate time-boxed, audited support access or impersonation into tenant workspace.',
  },
  {
    code: 'platform.audit.view',
    name: 'View Platform Audit Trail',
    category: 'Governance & Audit',
    description: 'Access the immutable global audit log recording cross-tenant and staff actions.',
  },
];

export const PLATFORM_ROLES = {
  super_admin: {
    id: 'super_admin',
    name: 'Super Admin',
    badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/50',
    description: 'Full global administrative authority across all tenants, subscriptions, platform users, and security settings.',
    rank: 100,
    allowedScopes: ['all'],
    canImpersonate: true,
    mfaRequired: true,
    permissions: [
      'platform.users.view',
      'platform.users.manage',
      'platform.roles.view',
      'platform.roles.manage',
      'platform.tenants.view',
      'platform.tenants.manage',
      'platform.subscriptions.view',
      'platform.subscriptions.manage',
      'platform.plans.view',
      'platform.plans.manage',
      'platform.overrides.manage',
      'platform.support_sessions.view',
      'platform.support_sessions.create',
      'platform.audit.view',
    ],
  },
  support_admin: {
    id: 'support_admin',
    name: 'Support Admin',
    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/50',
    description: 'Elevated technical support lead; manages tenant health, subscriptions, overrides, and initiates support sessions for assigned tenants.',
    rank: 60,
    allowedScopes: ['all', 'assigned'],
    canImpersonate: true,
    mfaRequired: true,
    permissions: [
      'platform.users.view',
      'platform.roles.view',
      'platform.tenants.view',
      'platform.tenants.manage',
      'platform.subscriptions.view',
      'platform.subscriptions.manage',
      'platform.plans.view',
      'platform.overrides.manage',
      'platform.support_sessions.view',
      'platform.support_sessions.create',
      'platform.audit.view',
    ],
  },
  support_agent: {
    id: 'support_agent',
    name: 'Support Agent',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50',
    description: 'Frontline operational support staff; can inspect tenant configuration and initiate controlled support sessions for explicitly assigned tenants.',
    rank: 40,
    allowedScopes: ['assigned'],
    canImpersonate: true,
    mfaRequired: true,
    permissions: [
      'platform.tenants.view',
      'platform.subscriptions.view',
      'platform.plans.view',
      'platform.support_sessions.view',
      'platform.support_sessions.create',
    ],
  },
  auditor: {
    id: 'auditor',
    name: 'Read Only Auditor',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50',
    description: 'Compliance, security, and financial auditor; read-only visibility into tenants, plans, audit logs, and user lists. Cannot mutate state or impersonate tenants.',
    rank: 20,
    allowedScopes: ['all', 'assigned'],
    canImpersonate: false,
    mfaRequired: true,
    permissions: [
      'platform.users.view',
      'platform.roles.view',
      'platform.tenants.view',
      'platform.subscriptions.view',
      'platform.plans.view',
      'platform.audit.view',
    ],
  },
};

/**
 * Check if a platform user has a specific permission
 */
export function hasPlatformPermission(user, permissionCode) {
  if (!user) return false;
  if (user.status !== 'active') return false;
  if (user.expires_at && new Date(user.expires_at).getTime() < Date.now()) return false;
  if (user.role === 'super_admin') return true;

  const roleConfig = PLATFORM_ROLES[user.role];
  if (!roleConfig) return false;
  return roleConfig.permissions.includes(permissionCode);
}

/**
 * Check if a tenant ID is within user's company scope
 */
export function isTenantInScope(user, tenantId) {
  if (!user) return false;
  if (user.status !== 'active') return false;
  if (user.expires_at && new Date(user.expires_at).getTime() < Date.now()) return false;
  if (user.company_scope_type === 'all' || user.role === 'super_admin') return true;

  const tIdNum = Number(tenantId);
  const assigned = Array.isArray(user.assigned_companies)
    ? user.assigned_companies.map(Number)
    : [];
  return assigned.includes(tIdNum);
}
