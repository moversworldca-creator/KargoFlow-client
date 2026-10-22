// The sales-to-operations status model: which record holds each status and
// what its states are called. Mirrors KargoFlow_Domain/tenant/operations/states.py;
// the backend owns the allowed transitions and enforces them.
export const STATUS_FIELDS = {
  'lead.system': {
    record: 'Lead', meaning: 'Inquiry qualification',
    states: { new: 'New', in_progress: 'In Progress', qualified: 'Qualified', converted: 'Converted', lost: 'Lost', disqualified: 'Disqualified', archived: 'Archived' },
  },
  'opportunity.system': {
    record: 'Opportunity', meaning: 'Overall sale lifecycle',
    states: { open: 'Opportunity', booked: 'Booked', completed: 'Completed', closed: 'Closed', lost: 'Lost', cancelled: 'Cancelled' },
  },
  'estimate.lifecycle': {
    record: 'Estimate', meaning: 'Quote lifecycle',
    states: { draft: 'Draft', ready: 'Ready', sent: 'Sent', viewed: 'Viewed', accepted: 'Accepted', reapproval_required: 'Reapproval Required', superseded: 'Superseded', expired: 'Expired', cancelled: 'Cancelled' },
  },
  'planned_job.confirmation': {
    record: 'Planned job', meaning: 'Confirmation recorded during sales planning',
    states: { not_requested: 'Not Requested', requested: 'Requested', confirmed: 'Confirmed', declined: 'Declined' },
  },
  'job.booking': {
    record: 'Operational job', meaning: 'Office booking confirmation',
    states: { booked: 'Booked', confirmed: 'Confirmed', cancelled: 'Cancelled' },
  },
  'job.customer_confirmation': {
    record: 'Operational job', meaning: 'Customer confirmation',
    states: { not_required: 'Not Required', pending: 'Pending', reminder_sent: 'Reminder Sent', confirmed: 'Confirmed', declined: 'Declined' },
  },
  'job.dispatch': {
    record: 'Operational job', meaning: 'Dispatch planning and publication',
    states: { unscheduled: 'Unscheduled', held: 'Held', scheduled: 'Scheduled', published: 'Published', cancelled: 'Cancelled' },
  },
  'job.execution': {
    record: 'Operational job', meaning: 'Physical work',
    states: { not_started: 'Not Started', en_route: 'En Route', arrived: 'Arrived', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' },
  },
  'job.accounting': {
    record: 'Operational job', meaning: 'Financial completion',
    states: { not_ready: 'Not Ready', pending_finalization: 'Pending Finalization', pending_close: 'Pending Close', closed: 'Closed' },
  },
};

// The operational-job lifecycles, in the order work happens.
export const JOB_LIFECYCLES = [
  ['booking', 'job.booking', 'booking_state', 'Booking'],
  ['customer_confirmation', 'job.customer_confirmation', 'customer_confirmation_state', 'Customer confirmation'],
  ['dispatch', 'job.dispatch', 'dispatch_state', 'Dispatch'],
  ['execution', 'job.execution', 'execution_state', 'Execution'],
  ['accounting', 'job.accounting', 'accounting_state', 'Accounting'],
];

const humanize = (code) => String(code || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function statusLabel(field, state) {
  if (!state) return '—';
  return STATUS_FIELDS[field]?.states?.[state] || humanize(state);
}

const GOOD = new Set(['confirmed', 'accepted', 'completed', 'closed', 'published', 'converted', 'qualified', 'not_required']);
const BAD = new Set(['cancelled', 'declined', 'lost', 'expired', 'disqualified', 'superseded']);
const ACTIVE = new Set(['booked', 'sent', 'viewed', 'scheduled', 'held', 'en_route', 'arrived', 'in_progress', 'pending',
  'reminder_sent', 'requested', 'pending_finalization', 'pending_close', 'ready', 'reapproval_required']);

/** green / red / amber / slate — never the only signal: badges always carry the label. */
export function statusTone(state) {
  if (GOOD.has(state)) return 'green';
  if (BAD.has(state)) return 'red';
  if (ACTIVE.has(state)) return 'amber';
  return 'slate';
}
