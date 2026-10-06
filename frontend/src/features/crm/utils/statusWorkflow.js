export const LEAD_STATUS_OPTIONS = [
  { code: 'new', label: 'New' },
  { code: 'contacted', label: 'Contacted' },
  { code: 'qualified', label: 'Qualified' },
  { code: 'converted', label: 'Converted' },
  { code: 'lost', label: 'Lost' },
];

export const OPPORTUNITY_STATUS_OPTIONS = [
  { code: 'new', label: 'New' },
  { code: 'active', label: 'Active' },
  { code: 'estimate_ready', label: 'Estimate Ready' },
  { code: 'booked', label: 'Booked' },
  { code: 'confirmed', label: 'Confirmed' },
  { code: 'completed', label: 'Completed' },
  { code: 'lost', label: 'Lost' },
  { code: 'canceled', label: 'Canceled' },
];

export const LEAD_STATUS_CODES = LEAD_STATUS_OPTIONS.map((item) => item.code);
export const OPPORTUNITY_STATUS_CODES = OPPORTUNITY_STATUS_OPTIONS.map((item) => item.code);

export const WORKFLOW_STAGE_LABELS = {
  new_lead: 'New Lead',
  lead_in_progress: 'Lead In Progress',
  opportunity: 'Opportunity',
  estimate_ready: 'Estimate Ready',
  estimate: 'Estimate',
  inventory: 'Inventory',
  booked: 'Booked',
  confirmed: 'Confirmed',
  job: 'Job',
  completed: 'Completed',
  lost: 'Lost',
  canceled: 'Canceled',
};

export const titleCaseStatus = (value) =>
  String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());

export const getLeadStatusLabel = (code) =>
  LEAD_STATUS_OPTIONS.find((item) => item.code === code)?.label || titleCaseStatus(code);

export const getOpportunityStatusLabel = (code) =>
  OPPORTUNITY_STATUS_OPTIONS.find((item) => item.code === code)?.label || titleCaseStatus(code);

export const getWorkflowStageLabel = (stage) =>
  WORKFLOW_STAGE_LABELS[String(stage || '').toLowerCase()] || titleCaseStatus(stage);

export const toneForStatus = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (['converted', 'completed', 'confirmed'].includes(normalized)) return 'good';
  if (['qualified', 'booked', 'estimate_ready'].includes(normalized)) return 'warn';
  if (['lost', 'canceled'].includes(normalized)) return 'bad';
  if (normalized === 'new') return 'dark';
  return 'neutral';
};
