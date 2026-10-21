// Pure User Management helpers (no React), shared by the screens and tests.

// accounts_employee.worker_type (database CHECK constraint).
export const WORKER_TYPES = ['office', 'crew', 'hybrid', 'owner', 'contractor', 'seasonal', 'service'];

/** The request body for POST/PATCH /tenant/employees/: backend field names only. */
export const employeePayload = (form, { isCreate }) => {
  const payload = {
    first_name: String(form.first_name || '').trim(),
    last_name: String(form.last_name || '').trim(),
    email: String(form.email || '').trim().toLowerCase(),
    phone: String(form.phone || '').trim(),
    worker_type: form.worker_type || 'office',
    primary_branch_id: form.primary_branch_id ? Number(form.primary_branch_id) : null,
    hire_date: form.hire_date || null,
    employee_number: String(form.employee_number || '').trim(),
  };
  if (!payload.employee_number && isCreate) delete payload.employee_number;
  if (!isCreate && form.employment_status) payload.employment_status = form.employment_status;
  return payload;
};

export const validateEmployee = (form) => {
  const errors = {};
  if (!String(form.first_name || '').trim() && !String(form.last_name || '').trim()) {
    errors.first_name = 'Enter a first or last name.';
  }
  const email = String(form.email || '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
  if (form.wantsInvite && !email) errors.email = 'An email address is needed to send a login invitation.';
  return errors;
};

/** Login state of an employee, from the employee row, the logins list and pending invitations. */
export const loginState = (employee, loginsById, pendingByEmployee) => {
  if (employee.user_id == null) {
    return pendingByEmployee.has(String(employee.id))
      ? { key: 'invited', label: 'Invitation pending', tone: 'blue' }
      : { key: 'none', label: 'No login', tone: 'slate' };
  }
  const login = loginsById.get(String(employee.user_id));
  if (!login) return { key: 'login', label: 'Has login', tone: 'green' };
  return login.is_active ? { key: 'active', label: 'Login active', tone: 'green' } : { key: 'disabled', label: 'Login disabled', tone: 'slate' };
};

/** Which row actions are offered, given permissions, state and read-only mode. */
export const rowActions = (employee, { can, isSelf, readOnly }) => {
  const terminated = employee.employment_status === 'terminated';
  const active = employee.employment_status === 'active';
  const write = !readOnly;
  return {
    details: true,
    edit: can.manageEmployees && write && !terminated,
    terminate: can.manageEmployees && write && !terminated && !isSelf,
    rehire: can.manageEmployees && write && terminated && employee.rehire_eligible !== false,
    // One entry point for both ways to get a login: email invitation or temporary password.
    giveLogin: can.manageLogins && write && employee.user_id == null && active,
    // Roles belong to the login: assignable once the employee can sign in (not to yourself).
    assignRoles: can.assignRoles && write && employee.user_id != null && !terminated && !isSelf,
    access: employee.user_id != null && (can.viewUsers || can.manageLogins || can.assignRoles || can.viewOverrides),
  };
};

export const validateOverride = (form, now = new Date()) => {
  const errors = {};
  if (!form.user_id) errors.user_id = 'Choose a user.';
  if (!form.permission_key) errors.permission_key = 'Choose a permission.';
  if (!form.scope) errors.scope = 'Choose a scope.';
  if (form.scope === 'branch' && !form.branch_id) errors.branch_id = 'Choose the branch this override applies to.';
  if (!String(form.reason || '').trim()) errors.reason = 'A reason is required.';
  if (form.expires_at && new Date(form.expires_at) <= now) errors.expires_at = 'The expiry must be in the future.';
  return errors;
};

// Mirrors the backend's password validators (AUTH_PASSWORD_VALIDATORS):
// at least 12 characters, not only digits, not like the person's details,
// not a common password. The backend still checks and has the final word.
const COMMON = ['password', '123456', 'qwerty', 'letmein', 'welcome', 'admin', 'kargoflow'];
export const passwordChecks = (password, confirm, person = {}) => {
  const value = String(password || '');
  const lower = value.toLowerCase();
  const personal = [person.first_name, person.last_name, String(person.email || '').split('@')[0]]
    .map((part) => String(part || '').toLowerCase()).filter((part) => part.length >= 3);
  return [
    { label: 'At least 12 characters', ok: value.length >= 12 },
    { label: 'Not only numbers', ok: value.length > 0 && !/^\d+$/.test(value) },
    { label: "Doesn't contain their name or email", ok: value.length > 0 && !personal.some((part) => lower.includes(part)) },
    { label: 'Not a common password', ok: value.length > 0 && !COMMON.some((word) => lower.includes(word)) },
    { label: 'Both entries match', ok: value.length > 0 && value === confirm },
  ];
};

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*?';
/** 16 random characters from an unambiguous alphabet (crypto.getRandomValues). */
export const generatePassword = (length = 16) => {
  const bytes = new Uint32Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let out = Array.from(bytes, (n) => ALPHABET[n % ALPHABET.length]).join('');
  // Guarantee a letter and a digit so "not only numbers" always holds.
  if (!/[A-Za-z]/.test(out)) out = `a${out.slice(1)}`;
  if (!/\d/.test(out)) out = `${out.slice(0, -1)}7`;
  return out;
};

/** pending | expired | accepted | revoked, with expiry derived from expires_at. */
export const invitationStatus = (invitation, now = new Date()) => {
  if (invitation.status === 'pending' && invitation.expires_at && new Date(invitation.expires_at) <= now) return 'expired';
  return invitation.status;
};

// ---- Roles are held per branch ----------------------------------------------
// Mirrors rbac_role_company_wide_allowed on the server: only these system roles
// may be held company-wide (no branch). Every other role is given in a branch,
// one per branch, and acts only there. The server enforces it.
const COMPANY_WIDE_ROLE_NAMES = ['company admin', 'crew app user', 'crew lead', 'crew payment collector'];
export const canBeCompanyWide = (role) => Boolean(role?.is_system_role)
  && role?.branch_id == null
  && COMPANY_WIDE_ROLE_NAMES.includes(`${role?.name || ''}`.trim().toLowerCase());

/** Roles that can be given in a branch: active, and not made for another branch. */
export const rolesForBranch = (roles, branchId) => (roles || []).filter((r) => r.is_active !== false
  && (r.branch_id == null || String(r.branch_id) === String(branchId)));

/** "Salesperson · Toronto" / "Company Admin · Company-wide". */
export const assignmentLabel = (a, branchName) => `${a.name} · ${a.branch_id == null ? 'Company-wide' : (a.branch_name || branchName?.(a.branch_id) || `Branch ${a.branch_id}`)}`;

/**
 * Changes to apply, from current assignments to the edited plan.
 * plan: { branches: { [branchId]: roleId | '' }, companyWide: Set<roleId> }.
 */
export const roleChanges = (assignments, plan) => {
  const changes = [];
  const held = new Map((assignments || []).filter((a) => a.branch_id != null).map((a) => [String(a.branch_id), String(a.id)]));
  for (const [branchId, roleId] of Object.entries(plan.branches || {})) {
    const current = held.get(String(branchId)) || '';
    if (String(roleId || '') === current) continue;
    changes.push(roleId
      ? { kind: 'assign', role_id: Number(roleId), branch_id: Number(branchId), replaces: current ? Number(current) : null }
      : { kind: 'unassign', role_id: Number(current), branch_id: Number(branchId) });
  }
  const wide = new Set((assignments || []).filter((a) => a.branch_id == null).map((a) => String(a.id)));
  const wanted = new Set([...(plan.companyWide || [])].map(String));
  for (const id of wanted) if (!wide.has(id)) changes.push({ kind: 'assign', role_id: Number(id), branch_id: null, replaces: null });
  for (const id of wide) if (!wanted.has(id)) changes.push({ kind: 'unassign', role_id: Number(id), branch_id: null });
  return changes;
};
