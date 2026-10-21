import { AREA_ORDER, SCOPE_HELP, describePermission } from '../userManagement/permissionLabels';

export { SCOPE_HELP };

export const SCOPE_LABELS = {
  company: 'Whole company',
  branch: 'Their branches',
  assigned: 'Jobs they are crewed on',
  own: 'Their own records',
};

export const normalizeListResponse = (value) => {
  if (Array.isArray(value)) return value;
  return value?.results || [];
};

// Kept for older callers.
export const deriveModuleFromKey = (key) => {
  if (!key) return 'Other';
  const parts = key.split('.');
  if (parts.length >= 2) {
    const raw = parts[parts.length - 2] || parts[0];
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  return 'Other';
};

/**
 * Display data for a backend permission row. The key stays the identity; the
 * label, page and area are plain-language names (permissionLabels.js), and the
 * allowed scopes come from the backend catalog (rbac_permission_scope).
 */
export const resolvePermissionMeta = (perm) => {
  const key = perm.permission_key || perm.codename || '';
  const readable = describePermission(key);
  const rawScopes = perm.allowed_scopes || perm.allowedScopes || ['company'];
  const order = ['own', 'assigned', 'branch', 'company'];
  const allowedScopes = (Array.isArray(rawScopes) && rawScopes.length > 0 ? [...rawScopes] : ['company'])
    .sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return {
    key,
    label: readable.action,
    fullLabel: readable.label,
    description: perm.description || readable.label,
    module: `${readable.area} · ${readable.page}`,
    area: readable.area,
    allowedScopes,
  };
};

/** Sort order for permission groups: by area (Sales first), then page name. */
export const compareModules = (a, b) => {
  const [areaA] = a.split(' · ');
  const [areaB] = b.split(' · ');
  const byArea = AREA_ORDER.indexOf(areaA) - AREA_ORDER.indexOf(areaB);
  return byArea !== 0 ? byArea : a.localeCompare(b);
};

export const computePermissionDiffs = (currentGrants, draftGrants) => {
  const toGrant = [];
  const toRevoke = [];

  for (const [key, draftScope] of draftGrants.entries()) {
    if (!currentGrants.has(key)) {
      toGrant.push({ permission_key: key, scope: draftScope });
    } else {
      const currentScope = currentGrants.get(key);
      if (currentScope !== draftScope) {
        toRevoke.push({ permission_key: key, scope: currentScope });
        toGrant.push({ permission_key: key, scope: draftScope });
      }
    }
  }

  for (const [key, currentScope] of currentGrants.entries()) {
    if (!draftGrants.has(key)) {
      toRevoke.push({ permission_key: key, scope: currentScope });
    }
  }

  return { toGrant, toRevoke };
};

export const areGrantsEqual = (a, b) => {
  if (!a || !b) return a === b;
  if (a.size !== b.size) return false;
  for (const [key, val] of a.entries()) {
    if (b.get(key) !== val) return false;
  }
  return true;
};
