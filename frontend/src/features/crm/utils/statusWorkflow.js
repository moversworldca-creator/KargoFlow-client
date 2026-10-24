export const LEAD_STATUS_OPTIONS = [
  ['new', 'New'], ['in_progress', 'In Progress'], ['qualified', 'Qualified'],
  ['converted', 'Converted'], ['lost', 'Lost'], ['disqualified', 'Disqualified'], ['archived', 'Archived'],
].map(([code, label]) => ({ code, label }));

export const OPPORTUNITY_STATUS_OPTIONS = [
  ['open', 'Opportunity'], ['booked', 'Booked'], ['lost', 'Lost'], ['cancelled', 'Cancelled'],
  ['completed', 'Completed'], ['closed', 'Closed'],
].map(([code, label]) => ({ code, label }));

// Mirror the domain's permitted state changes; permissions and backend guards
// still decide whether an action can be executed for a particular record.
export const LEAD_TRANSITIONS = {
  new: ['in_progress', 'qualified', 'lost', 'disqualified', 'archived'],
  in_progress: ['qualified', 'lost', 'disqualified', 'archived'],
  qualified: ['converted', 'lost', 'disqualified'], lost: ['in_progress'],
  archived: ['in_progress'], disqualified: ['in_progress'], converted: [],
};
export const OPPORTUNITY_TRANSITIONS = {
  open: ['booked', 'lost'], booked: ['open', 'cancelled', 'completed'],
  lost: ['open'], cancelled: ['open'], completed: ['closed'], closed: ['completed'],
};
export const getRecordSystemState = (record, isLead = false) => {
  if (record?.system_state) return record.system_state;
  const state = record?.status || record?.workflow_stage || '';
  const aliases = isLead
    ? { contacted: 'in_progress', new_lead: 'new', lead_in_progress: 'in_progress' }
    : { new: 'open', active: 'open', opportunity: 'open', estimate_ready: 'open', confirmed: 'booked', canceled: 'cancelled' };
  return aliases[state] || state;
};
export const canTransition = (isLead, from, to) =>
  Boolean((isLead ? LEAD_TRANSITIONS : OPPORTUNITY_TRANSITIONS)[from]?.includes(to));

export const getRecordWorkflowActions = (record, { isLead = false, hasPermission = () => false } = {}) => {
  const state = getRecordSystemState(record, isLead);
  if (!record?.id || record.id === 'new') return [];
  const actions = isLead ? {
    new: [['start', 'Start lead', 'leads.update'], ['qualify', 'Qualify lead', 'leads.qualify'], ['lost', 'Mark Lost', 'leads.close'], ['disqualify', 'Disqualify Lead', 'leads.close'], ['archive', 'Archive Lead', 'leads.update']],
    in_progress: [['qualify', 'Qualify lead', 'leads.qualify'], ['lost', 'Mark Lost', 'leads.close'], ['disqualify', 'Disqualify Lead', 'leads.close'], ['archive', 'Archive Lead', 'leads.update']],
    qualified: [['lost', 'Mark Lost', 'leads.close'], ['disqualify', 'Disqualify Lead', 'leads.close']],
    lost: [['reopen', 'Reopen Lead', 'leads.update']],
    archived: [['restore', 'Restore Lead', 'leads.restore']],
    disqualified: [['restore', 'Restore Lead', 'leads.restore']],
  } : {
    open: [['book', 'Book Job', 'opportunities.book'], ['lost', 'Mark Lost', 'opportunities.mark_lost']],
    booked: [['unbook', 'Unbook Job', 'opportunities.reopen'], ['cancel', 'Cancel Job', 'opportunities.cancel'], ['complete', 'Complete Opportunity', 'opportunities.complete']],
    lost: [['reopen', 'Reopen Opportunity', 'opportunities.reopen']],
    cancelled: [['reopen', 'Reopen Opportunity', 'opportunities.reopen']],
  };
  // Closing and accounting correction require accounting commands, which the
  // current tenant Opportunity API does not expose. Never substitute reopen.
  return (actions[state] || []).filter(([, , permission]) => hasPermission(permission))
    .map(([key, label]) => ({ key, label, tone: ['lost', 'cancel', 'disqualify', 'archive'].includes(key) ? 'secondary' : 'primary' }));
};

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
  canceled: 'Cancelled',
  cancelled: 'Cancelled',
  open: 'Opportunity',
  closed: 'Closed',
  new: 'New',
  in_progress: 'In Progress',
  qualified: 'Qualified',
  converted: 'Converted',
  archived: 'Archived',
  disqualified: 'Disqualified',
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
  if (['converted', 'completed', 'confirmed', 'closed'].includes(normalized)) return 'good';
  if (['qualified', 'booked', 'estimate_ready'].includes(normalized)) return 'warn';
  if (['lost', 'canceled', 'cancelled', 'disqualified'].includes(normalized)) return 'bad';
  if (normalized === 'new') return 'dark';
  return 'neutral';
};
