const normalizeRecordEntityType = (entityType) => {
  const value = String(entityType || '').trim().toLowerCase();
  if (value === 'lead' || value === 'leads') return 'lead';
  if (value === 'opportunity' || value === 'opportunities' || value === 'sales') return 'opportunity';
  return 'opportunity';
};

const DETAIL_TAB_SEGMENTS = {
  Sales: 'sales',
  Estimate: 'estimate',
  'Files & Photos': 'files',
  Documents: 'documents',
  Accounting: 'accounting',
  Payments: 'payments',
};

const DETAIL_TAB_SEGMENT_ALIASES = {
  sales: 'Sales',
  estimate: 'Estimate',
  estimates: 'Estimate',
  'estimate-charges': 'Estimate',
  files: 'Files & Photos',
  photos: 'Files & Photos',
  'files-photos': 'Files & Photos',
  'files-and-photos': 'Files & Photos',
  documents: 'Documents',
  document: 'Documents',
  docs: 'Documents',
  accounting: 'Accounting',
  payments: 'Payments',
  payment: 'Payments',
};

const SALES_LIST_TAB_SEGMENTS = {
  dashboard: 'dashboard',
  'all-leads': 'all-leads',
  'new-leads': 'new-leads',
  leads: 'pipeline',
  booked: 'booked',
  confirmed: 'confirmed',
  completed: 'completed',
  'follow-up': 'follow-up',
  'lost-leads': 'lost-leads',
};

const SALES_LIST_TAB_ALIASES = {
  dashboard: 'dashboard',
  'all-leads': 'all-leads',
  all: 'all-leads',
  'new-leads': 'new-leads',
  new: 'new-leads',
  leads: 'leads',
  pipeline: 'leads',
  opportunities: 'leads',
  booked: 'booked',
  confirmed: 'confirmed',
  completed: 'completed',
  'follow-up': 'follow-up',
  followup: 'follow-up',
  tasks: 'follow-up',
  'lost-leads': 'lost-leads',
  lost: 'lost-leads',
};

const ESTIMATE_TAB_SEGMENTS = {
  charges: 'charges',
  route: 'route',
  inventory: 'inventory',
  documents: 'documents',
  payments: 'payments',
};

const ESTIMATE_TAB_ALIASES = {
  charges: 'charges',
  pricing: 'charges',
  quote: 'charges',
  route: 'route',
  logistics: 'route',
  'route-logistics': 'route',
  inventory: 'inventory',
  items: 'inventory',
  documents: 'documents',
  docs: 'documents',
  files: 'documents',
  payments: 'payments',
  payment: 'payments',
};

const resolveRecordIdentifier = (entityType, value) => {
  let identifier = value;
  if (value && typeof value === 'object') {
    const normalizedType = normalizeRecordEntityType(entityType);
    identifier = (
      value.sales_number ??
      value.salesNumber ??
      (normalizedType === 'lead' ? value.lead_sales_number : value.opportunity_sales_number) ??
      value.id ??
      value.display_number ??
      ''
    );
  }
  
  // If the identifier is a purely numeric string with leading zeros, strip them
  if (typeof identifier === 'string' && /^0+\d+$/.test(identifier)) {
    return identifier.replace(/^0+/, '');
  }
  
  return identifier;
};

export const getRecordDetailPath = (entityType, id) => {
  const normalizedType = normalizeRecordEntityType(entityType);
  const identifier = resolveRecordIdentifier(normalizedType, id);
  return `/crm/${normalizedType}/${identifier}`;
};

export const getRecordDetailTabPath = (entityType, id, tabId) => {
  const basePath = getRecordDetailPath(entityType, id);
  const segment = DETAIL_TAB_SEGMENTS[tabId];
  return segment ? `${basePath}/${segment}` : basePath;
};

export const getRecordEstimateTabPath = (entityType, id, estimateTabId = 'charges') => {
  const basePath = getRecordDetailTabPath(entityType, id, 'Estimate');
  const segment = ESTIMATE_TAB_SEGMENTS[estimateTabId] || ESTIMATE_TAB_SEGMENTS.charges;
  return `${basePath}/${segment}`;
};

export const getSalesListTabPath = (tabId = 'leads') => {
  const segment = SALES_LIST_TAB_SEGMENTS[tabId] || SALES_LIST_TAB_SEGMENTS.leads;
  return `/leads/table/${segment}`;
};

export const getRecordListPath = (entityType) => {
  const normalizedType = normalizeRecordEntityType(entityType);
  return normalizedType === 'lead' ? '/leads' : '/sales';
};

export const getLegacyRecordDetailPath = (entityType, id) => {
  const normalizedType = normalizeRecordEntityType(entityType);
  return normalizedType === 'lead' ? `/leads/${id}` : `/sales/${id}`;
};

export const isLeadRecordType = (entityType) => normalizeRecordEntityType(entityType) === 'lead';

export const getLegacyRecordDetailTabPath = (entityType, id, tabId) => {
  const basePath = getLegacyRecordDetailPath(entityType, id);
  const segment = DETAIL_TAB_SEGMENTS[tabId];
  return segment ? `${basePath}/${segment}` : basePath;
};

export const getLegacyRecordEstimateTabPath = (entityType, id, estimateTabId = 'charges') => {
  const basePath = getLegacyRecordDetailTabPath(entityType, id, 'Estimate');
  const segment = ESTIMATE_TAB_SEGMENTS[estimateTabId] || ESTIMATE_TAB_SEGMENTS.charges;
  return `${basePath}/${segment}`;
};

export const getRecordTabLabelFromSegment = (segment) =>
  DETAIL_TAB_SEGMENT_ALIASES[String(segment || '').trim().toLowerCase()] || null;

export const getSalesListTabFromSegment = (segment) =>
  SALES_LIST_TAB_ALIASES[String(segment || '').trim().toLowerCase()] || null;

export const getEstimateTabFromSegment = (segment) =>
  ESTIMATE_TAB_ALIASES[String(segment || '').trim().toLowerCase()] || null;
