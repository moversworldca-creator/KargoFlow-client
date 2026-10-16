import { FEATURE_PERMISSION_CATALOG } from '../../../shared/permissions/registry';

export const SCOPE_LABELS = {
  company: 'Company (All)',
  branch: 'Branch',
  assigned: 'Assigned',
  own: 'Own',
};

export const normalizeListResponse = (value) => {
  if (Array.isArray(value)) return value;
  return value?.results || [];
};

export const deriveModuleFromKey = (key) => {
  if (!key) return 'Other';
  const parts = key.split('.');
  if (parts.length >= 2) {
    const raw = parts[parts.length - 2] || parts[0];
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  return 'Other';
};

export const resolvePermissionMeta = (perm) => {
  const key = perm.permission_key || perm.codename || '';
  const catalogEntry = FEATURE_PERMISSION_CATALOG[key] || {};
  const label = catalogEntry.label || perm.name || perm.label || perm.description || key;
  const description = perm.description || catalogEntry.label || key;
  const moduleName = catalogEntry.module || perm.module || deriveModuleFromKey(key);

  const rawScopes = perm.allowed_scopes || perm.allowedScopes || catalogEntry.allowedScopes || ['company'];
  const allowedScopes = Array.isArray(rawScopes) && rawScopes.length > 0 ? rawScopes : ['company'];

  return {
    key,
    label,
    description,
    module: moduleName,
    allowedScopes,
  };
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
