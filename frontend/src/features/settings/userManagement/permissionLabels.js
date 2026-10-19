// Plain-language names for backend permission keys.
//
// The key ("leads.view") stays the identity sent to the backend; these labels
// only make it readable. A key not listed here still works and is shown as a
// tidied version of itself.

// Page part of the key (everything before the last ".") -> [area, page name]
const PAGES = {
  leads: ['Sales', 'Leads'],
  lead_activities: ['Sales', 'Lead activities & tasks'],
  lead_duplicates: ['Sales', 'Duplicate leads'],
  lead_imports: ['Sales', 'Lead imports'],
  lead_providers: ['Sales', 'Lead providers'],
  lead_reports: ['Reports', 'Lead reports'],
  lead_settings: ['Settings', 'Lead settings & routing'],
  opportunities: ['Sales', 'Opportunities'],
  opportunity_reports: ['Reports', 'Opportunity reports'],
  opportunity_settings: ['Settings', 'Opportunity settings'],
  customers: ['Sales', 'Customers'],
  'communications.conversations': ['Communications', 'Conversations (email & SMS)'],
  'communications.automations': ['Communications', 'Automations'],
  'communications.branch_settings': ['Communications', 'Branch email & SMS setup'],
  'communications.general_templates': ['Communications', 'Message templates'],
  'communications.notification_templates': ['Communications', 'Notification templates'],
  'communications.sms_numbers': ['Communications', 'SMS numbers'],
  'communications.user_mailbox': ['Communications', 'Personal mailbox'],
  employees: ['Team & security', 'Employees'],
  users: ['Team & security', 'User logins'],
  rbac_roles: ['Team & security', 'Roles'],
  rbac_overrides: ['Team & security', 'User overrides'],
  rbac_permissions: ['Team & security', 'Permission catalog & explain'],
  audit_logs: ['Team & security', 'Audit logs'],
  compensation: ['Team & security', 'Compensation'],
  companies: ['Company', 'Company profile'],
  branches: ['Company', 'Branches'],
  settings: ['Company', 'Company & branch settings'],
  catalog: ['Company', 'Move & service types'],
  entitlements: ['Company', 'Plan & subscription'],
  template_library: ['Documents', 'Template library'],
  'builder.templates': ['Documents', 'Builder templates'],
  'builder.estimate_portal': ['Documents', 'Estimate portal templates'],
  'builder.document': ['Documents', 'Document templates'],
  'builder.invoice': ['Documents', 'Invoice templates'],
  'builder.blocks': ['Documents', 'Reusable blocks'],
  'builder.variables': ['Documents', 'Merge fields'],
  'builder.assignments': ['Documents', 'Template assignments'],
  crew_jobs: ['Crew app', 'Jobs'],
  crew_inventory: ['Crew app', 'Inventory'],
  crew_photos: ['Crew app', 'Photos'],
  crew_time: ['Crew app', 'Time tracking'],
  crew_signatures: ['Crew app', 'Signatures'],
  crew_dispatch: ['Crew app', 'Dispatch'],
  crew_job_completion: ['Crew app', 'Job completion'],
  crew_payments: ['Crew app', 'Payments'],
  crew_issues: ['Crew app', 'Issues'],
  crew_identity: ['Crew app', 'Crew access & devices'],
};

const ACTIONS = {
  view: 'View', create: 'Create', update: 'Edit', delete: 'Delete', manage: 'Manage', assign: 'Assign',
  assign_role: 'Assign roles', qualify: 'Qualify', close: 'Close (lost / disqualify)', restore: 'Restore',
  convert: 'Convert to opportunity', book: 'Book', book_without_deposit: 'Book without deposit',
  book_without_signature: 'Book without signature', book_without_acceptance: 'Book without acceptance',
  cancel: 'Cancel', complete: 'Complete', reopen: 'Reopen / unbook', mark_lost: 'Mark lost',
  change_branch: 'Move to another branch', change_branch_booked: 'Move a booked job to another branch',
  set_binding_type: 'Change binding type', merge: 'Merge duplicates', block: 'Block / unblock',
  send: 'Send', connect: 'Connect', purchase: 'Buy & release', publish: 'Publish', approve: 'Approve',
  clock: 'Clock in / out', collect: 'Collect payments', report: 'Report', export: 'Export',
};

// Order areas appear in.
export const AREA_ORDER = ['Sales', 'Communications', 'Reports', 'Team & security', 'Company', 'Settings', 'Documents', 'Crew app', 'Other'];

const tidy = (text) => String(text || '').replace(/[._]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\w/, (c) => c.toUpperCase());

/** { key, area, page, action, label } for a permission key. */
export const describePermission = (key) => {
  const cut = String(key || '').lastIndexOf('.');
  const pageKey = cut > 0 ? key.slice(0, cut) : key;
  const actionKey = cut > 0 ? key.slice(cut + 1) : '';
  const [area, page] = PAGES[pageKey] || ['Other', tidy(pageKey)];
  const action = ACTIONS[actionKey] || tidy(actionKey);
  return { key, area, page, action, label: `${page} → ${action}` };
};

/** Catalog rows grouped as [{ area, pages: [{ page, perms: [row] }] }], areas in AREA_ORDER. */
export const groupCatalog = (catalog = [], query = '') => {
  const q = query.trim().toLowerCase();
  const areas = new Map();
  for (const row of catalog) {
    const meta = describePermission(row.permission_key);
    const haystack = `${meta.label} ${row.permission_key} ${row.description || ''}`.toLowerCase();
    if (q && !haystack.includes(q)) continue;
    if (!areas.has(meta.area)) areas.set(meta.area, new Map());
    const pages = areas.get(meta.area);
    if (!pages.has(meta.page)) pages.set(meta.page, []);
    pages.get(meta.page).push({ ...row, meta });
  }
  return Array.from(areas.entries())
    .sort(([a], [b]) => AREA_ORDER.indexOf(a) - AREA_ORDER.indexOf(b))
    .map(([area, pages]) => ({ area, pages: Array.from(pages.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([page, perms]) => ({ page, perms })) }));
};

/** What a scope means, in a sentence. */
export const SCOPE_HELP = {
  own: 'Only records assigned to this person.',
  assigned: 'Only jobs this person is crewed on.',
  branch: 'Records in the branches this person belongs to.',
  company: 'Everything in the company.',
};

/** "Ada will not be able to view Leads in Toronto until 24 Oct, 10:00." */
export const overrideSummary = ({ person, effect, permissionKey, scope, branchName, expiresAt }) => {
  if (!permissionKey || !scope) return '';
  const meta = describePermission(permissionKey);
  const where = {
    own: 'on records assigned to them', assigned: 'on jobs they are crewed on',
    branch: branchName ? `in the ${branchName} branch` : 'in the chosen branch', company: 'anywhere in the company',
  }[scope] || '';
  const until = expiresAt ? ` until ${new Date(expiresAt).toLocaleString()}` : '';
  const verb = effect === 'deny' ? 'will NOT be able to' : 'will be able to';
  const tail = effect === 'deny' ? ', even if one of their roles allows it' : ', even without a role that grants it';
  return `${person || 'This person'} ${verb} ${meta.action.toLowerCase()} — ${meta.page} ${where}${until}${tail}.`;
};
