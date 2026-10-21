// User Management / RBAC permission keys, exactly as the backend names them.
//
// These only decide what the UI offers. Every request is authorized again by
// the backend (scope, branch, entitlement, DENY overrides), and a 403 from the
// backend always wins over anything shown here.
import { useMemo } from 'react';
import useCan from '../../../shared/auth/useCan';

export const USER_ADMIN_PERMISSIONS = Object.freeze({
  EMPLOYEES_VIEW: 'employees.view',        // GET  /tenant/employees/, /tenant/employees/{id}/
  EMPLOYEES_MANAGE: 'employees.manage',    // POST/PATCH employees, terminate, rehire
  USERS_VIEW: 'users.view',                // GET  /tenant/users/, access, branches
  USERS_MANAGE: 'users.manage',            // invite, invitations, temporary password, (de)activate login, branch membership
  USERS_ASSIGN_ROLE: 'users.assign_role',  // POST /tenant/users/assign-role/
  ROLES_VIEW: 'rbac_roles.view',           // GET  roles, role permissions
  ROLES_CREATE: 'rbac_roles.create',       // POST /tenant/rbac/roles/
  ROLES_MANAGE: 'rbac_roles.manage',       // PATCH role, grant/revoke role permission
  OVERRIDES_VIEW: 'rbac_overrides.view',   // GET  /tenant/rbac/user-overrides/
  OVERRIDES_MANAGE: 'rbac_overrides.manage', // create / revoke user overrides
  PERMISSIONS_VIEW: 'rbac_permissions.view', // permission catalog, explain
  ENTITLEMENTS_VIEW: 'entitlements.view',  // plan features / access mode (custom roles, read-only)
  BRANCHES_VIEW: 'branches.view',          // branch catalog for pickers
  AUDIT_VIEW: 'audit_logs.view',
});

const P = USER_ADMIN_PERMISSIONS;

/**
 * What the signed-in user may be offered in User Management. Each flag maps to
 * exactly one backend permission; a view permission never implies a change.
 * The session's permission list says the user holds the key at some scope; the
 * backend still decides for each record.
 */
export function useUserAdminAccess() {
  const { canAll } = useCan();
  return useMemo(() => {
    const has = (key) => canAll([key]);
    return {
      viewEmployees: has(P.EMPLOYEES_VIEW),
      manageEmployees: has(P.EMPLOYEES_MANAGE),
      viewUsers: has(P.USERS_VIEW),
      manageLogins: has(P.USERS_MANAGE),
      assignRoles: has(P.USERS_ASSIGN_ROLE),
      viewRoles: has(P.ROLES_VIEW),
      createRoles: has(P.ROLES_CREATE),
      manageRoles: has(P.ROLES_MANAGE),
      viewOverrides: has(P.OVERRIDES_VIEW),
      manageOverrides: has(P.OVERRIDES_MANAGE),
      viewPermissions: has(P.PERMISSIONS_VIEW),
      viewEntitlements: has(P.ENTITLEMENTS_VIEW),
      viewBranches: has(P.BRANCHES_VIEW),
    };
  }, [canAll]);
}

// Employment states the backend stores (accounts_employee.employment_status).
export const EMPLOYMENT_STATUSES = Object.freeze({
  active: { label: 'Active', tone: 'green' },
  on_leave: { label: 'On leave', tone: 'amber' },
  inactive: { label: 'Inactive', tone: 'slate' },
  terminated: { label: 'Terminated', tone: 'red' },
});

// States an edit (PATCH) may move between. Termination and rehire are separate
// commands; the backend refuses a PATCH into or out of "terminated".
export const EDITABLE_EMPLOYMENT_STATUSES = ['active', 'on_leave', 'inactive'];

export const SCOPE_LABELS = Object.freeze({
  own: 'Own records',
  assigned: 'Assigned jobs',
  branch: 'Branch',
  company: 'Company',
});

// Narrowest first, as the backend evaluates them.
export const SCOPE_ORDER = ['own', 'assigned', 'branch', 'company'];

export const sortScopes = (scopes = []) =>
  [...scopes].sort((a, b) => SCOPE_ORDER.indexOf(a) - SCOPE_ORDER.indexOf(b));
