// Permission matrix model (no React): catalog rows -> areas -> pages -> actions.
import { AREA_ORDER, describePermission } from './permissionLabels';
import { sortScopes } from './permissions';

export const STANDARD_ACTIONS = [
  ['view', 'View'], ['create', 'Create'], ['update', 'Edit'], ['delete', 'Delete'], ['manage', 'Manage'],
];
const STANDARD = new Set(STANDARD_ACTIONS.map(([a]) => a));

const actionOf = (key) => key.slice(key.lastIndexOf('.') + 1);
export const defaultScope = (scopes) => (scopes.includes('company') ? 'company' : scopes[0] || 'company');

/** Catalog -> [{ area, pages: [{ page, byAction: Map(action -> row), other: [row] }] }]. */
export const buildMatrix = (catalog = [], query = '') => {
  const q = query.trim().toLowerCase();
  const areas = new Map();
  for (const row of catalog) {
    const meta = describePermission(row.permission_key);
    const scopes = sortScopes(row.allowed_scopes?.length ? row.allowed_scopes : ['company']);
    const item = { ...row, meta, scopes, action: actionOf(row.permission_key) };
    if (!areas.has(meta.area)) areas.set(meta.area, new Map());
    const pages = areas.get(meta.area);
    if (!pages.has(meta.page)) pages.set(meta.page, { page: meta.page, byAction: new Map(), other: [], all: [] });
    const entry = pages.get(meta.page);
    entry.all.push(item);
    if (STANDARD.has(item.action)) entry.byAction.set(item.action, item);
    else entry.other.push(item);
  }
  return Array.from(areas.entries())
    .sort(([a], [b]) => AREA_ORDER.indexOf(a) - AREA_ORDER.indexOf(b))
    .map(([area, pages]) => ({
      area,
      pages: Array.from(pages.values())
        .filter((p) => !q || `${area} ${p.page} ${p.all.map((i) => `${i.meta.action} ${i.permission_key} ${i.description || ''}`).join(' ')}`.toLowerCase().includes(q))
        .sort((a, b) => a.page.localeCompare(b.page)),
    }))
    .filter((a) => a.pages.length);
};


/** key -> { roles: [{ role, scope }], override: active override | undefined } */
export const buildUserCells = (roleGrants, overrides, now = new Date()) => {
  const cells = new Map();
  const cell = (key) => { if (!cells.has(key)) cells.set(key, { roles: [] }); return cells.get(key); };
  for (const { role, grants } of roleGrants) {
    if (role.is_active === false) continue; // an inactive role grants nothing
    // A role held in a branch acts only there: a company-scope grant is capped
    // to that branch, as on the server.
    const branchName = role.branch_id != null ? (role.branch_name || `Branch ${role.branch_id}`) : null;
    for (const g of grants) {
      cell(g.permission_key).roles.push({
        role: role.name, scope: branchName && g.scope === 'company' ? 'branch' : g.scope, branchName,
      });
    }
  }
  for (const o of overrides || []) {
    if (!o.is_active || (o.expires_at && new Date(o.expires_at) <= now)) continue;
    const c = cell(o.permission_key);
    // A DENY wins over an ALLOW for display, as on the server.
    if (!c.override || o.effect === 'deny') c.override = o;
  }
  return cells;
};
