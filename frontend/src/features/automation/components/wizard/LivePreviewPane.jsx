import React, { useMemo } from 'react';

const chip = 'rounded-xl border border-border bg-card px-3 py-2 text-sm';

const tokenLabel = (token) => {
  const labels = {
    contact1: 'Lead contact',
    contact2: 'Lead contact 2',
    contact3: 'Lead contact 3',
    customer: 'Customer',
    sales_person_email: 'Sales person email',
    branch_email: 'Branch email',
  };
  return labels[token] || token.replaceAll('_', ' ');
};

const recurringSummary = (params) => {
  const parts = String(params?.cron || '0 9 * * *').split(/\s+/);
  if (parts[1] === '*') return 'At the start of every hour';
  const hour = Number(parts[1]);
  const safeHour = Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 9;
  const suffix = safeHour >= 12 ? 'PM' : 'AM';
  const displayHour = safeHour % 12 || 12;
  const time = `${displayHour}:00 ${suffix}`;
  if (!parts[4] || parts[4] === '*') return `Every day at ${time}`;
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const days = parts[4].split(',').map((day) => names[Number(day)]).filter(Boolean).join(', ');
  return `Every ${days} at ${time}`;
};

const summarizeTrigger = (draft) => {
  const t = draft.trigger?.type;
  const params = draft.trigger?.params || {};
  if (t === 'time_based') {
    const anchor = params.anchor || 'created_at';
    const dir = params.direction || 'after';
    const off = params.offset || {};
    const dur = off.duration ?? 0;
    const unit = off.unit || 'days';
    return `Time-based: ${dur} ${unit} ${dir} ${anchor}`;
  }
  if (t === 'recurring') return `Recurring: ${recurringSummary(params)}`;
  return `When ${draft.meta?.target_type || 'record'} ${params.event || 'changes'}`;
};

const summarizeAction = (draft) => {
  const type = draft.step_type || 'action';
  if (type === 'send_email') return 'Send email';
  if (type === 'send_sms') return 'Send SMS';
  if (type === 'update_status') return 'Update status';
  if (type === 'create_task') return 'Create task';
  if (type === 'wait') return 'Wait';
  return type;
};

export default function LivePreviewPane({ draft }) {
  const filtersCount = (draft.filters?.rules || []).length;
  const recipients = useMemo(() => {
    const tokens = draft.recipients?.tokens || [];
    const emails = draft.recipients?.custom_emails || [];
    const phones = draft.recipients?.custom_phones || [];
    const parts = [];
    if (tokens.length) parts.push(tokens.map((t) => tokenLabel(t)).join(' '));
    if (emails.length) parts.push(emails.join(', '));
    if (phones.length) parts.push(phones.join(', '));
    return parts.join(' • ') || 'No recipients';
  }, [draft]);

  const attachments = useMemo(() => {
    const keys = (draft.steps || [])
      .flatMap((s) => (s.step_type === 'send_email' ? (s.config?.attachments || []) : []))
      .filter(Boolean);
    if (!keys.length) return '';
    const labels = {
      estimate_pdf: 'Estimate PDF',
      invoice_pdf: 'Invoice PDF',
      custom_pdf: 'Selected PDF file',
    };
    return Array.from(new Set(keys)).map((k) => labels[k] || (String(k).startsWith('file_asset:') ? 'Selected PDF file' : k)).join(', ');
  }, [draft]);

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-bold text-heading">Live Preview</div>
        <div className="text-xs text-muted">See your automation as you build it</div>
      </div>

      <div className="space-y-2">
        <div className={chip}>{summarizeTrigger(draft)}</div>
        {(draft.steps || []).map((s, idx) => (
          <div key={`${s.step_type || 'step'}-${idx}`} className={chip}>{`${idx + 1}. ${summarizeAction(s)}`}</div>
        ))}
        <div className={chip}>{`To: ${recipients}`}</div>
        {attachments ? <div className={chip}>{`Attachments: ${attachments}`}</div> : null}
      </div>

      <div className="text-xs text-muted">
        {filtersCount ? `${filtersCount} filter applied` : 'No filters'}
      </div>
    </div>
  );
}
