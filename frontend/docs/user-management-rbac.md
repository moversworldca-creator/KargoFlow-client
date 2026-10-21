# User Management and RBAC (frontend)

Code: `src/features/settings/userManagement/`, `src/features/settings/components/RolesPermissions.jsx`,
`src/shared/permissions/registry.js`. The backend is authoritative for every rule below; the UI hides
what the session cannot do and always shows the server's answer when it refuses (a 403 wins).

## Employee vs User

- **Employee** (`/tenant/employees/`): the workforce record. Exists with or without a login. Can be
  scheduled and assigned work. Permissions: `employees.view`, `employees.manage`.
- **User** (`/tenant/users/`): the optional login linked to an employee (`employee.user_id`). Roles,
  branch membership and personal exceptions belong to the login. Permissions: `users.view`,
  `users.manage`, `users.assign_role`.
- Creating an employee never creates a login. "Give login access" does that, by invitation or
  temporary password.

## Invitation and temporary password (`users.manage`)

- Invite: `POST /tenant/employees/{id}/invite/`; list: `GET /tenant/employees/invitations/`;
  revoke: `POST /tenant/employees/invitations/{id}/revoke/`. Accepting creates the login.
- Temporary password: `POST /tenant/employees/{id}/set-temporary-password/`. Shown once, never stored.
- Token hashes and password hashes are never sent to or shown by the frontend.

## Lifecycle (`employees.manage`)

- Statuses editable directly: active, on leave, inactive. Termination and rehire are separate
  commands (`/terminate/` needs a date and a reason; `/rehire/`). You cannot terminate yourself.
- Disabling a login (`/tenant/users/{id}/deactivate/`, `users.manage`) does not change employment.

## Branch membership (`users.manage`)

- `POST /tenant/users/{id}/branches/` adds, `DELETE /tenant/users/{id}/branches/{branch}/` removes.
  The primary branch is changed on the employee, not removed here.
- Membership alone grants nothing. Leaving a branch also removes the role held there.

## Role assignment: one role per branch (`users.assign_role`, company scope)

- A role is given to a person **in a branch**: `POST /tenant/users/assign-role/`
  `{ user_id, role_id, branch_id }`. A person holds at most one role per branch; giving another role
  in that branch replaces it. The person must be a member of the branch.
- A role held in a branch acts **only in that branch**. Its company-scope grants are capped to the
  branch; it never reaches company-wide resources.
- Company-wide (`branch_id: null`) is allowed only for the system roles Company Admin and the crew
  roles (Crew App User, Crew Lead, Crew Payment Collector; their grants are "assigned" scope only).
- Remove: `POST /tenant/users/unassign-role/` `{ user_id, role_id, branch_id }`. The company always
  keeps one company-wide administrator.
- You cannot change your own roles, and you can only hand out permissions you hold yourself.
- UI: `BranchRolesEditor` (Assign roles dialog, Roles & access tab) and the role's People tab.

## Roles and permission scopes

- Roles: list `rbac_roles.view`; create `rbac_roles.create` (and the `crm.custom_roles` plan
  feature); edit, grant and revoke `rbac_roles.manage`. System roles cannot be changed.
- Each grant has a scope from the permission's allowed scopes: own, assigned, branch, company.
  Inside a branch assignment, company and branch both mean "this branch".
- `view` never implies create/update/delete. Only exact backend keys are checked.

## Personal exceptions (direct overrides) (`rbac_overrides.view` / `rbac_overrides.manage`)

- `DENY` wins over everything (roles and ALLOWs). `ALLOW` grants without a role.
- Each needs a reason; can be limited to a branch and given an expiry. You cannot add exceptions
  to yourself, and you can only grant what you hold yourself.

## Explain access (`rbac_permissions.view`)

- `POST /tenant/rbac/explain/` returns the server's decision (allowed, source, scope, role or
  override). The UI shows it as returned and computes nothing itself. "What they can do" is a view
  of configuration only; Explain is the definitive answer.

## Session permissions

- `GET /tenant/users/me/` lists the keys the session holds in any branch (navigation hints).
- After any role/override/login change, or any 403 on a mutation, the session is re-read
  (`refreshSession`, throttled).
