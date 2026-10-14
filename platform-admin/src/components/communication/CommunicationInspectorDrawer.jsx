import React from 'react';
import { X, RefreshCw, Copy } from 'lucide-react';
import { useModal } from '../../hooks/useModal';
import { useToast } from '../../context/ToastContext';
import StatusBadge from './StatusBadge';
import { BTN, BTN_PRIMARY, Field } from './parts';
import { DASH, PROVIDER_LABEL, dateTime, money, stateTone, titleCase } from './format';

const TITLES = {
  domain: 'Sending domain',
  number: 'Phone number',
  email_log: 'Email delivery record',
  sms_log: 'SMS delivery record',
  event: 'Provider event',
  audit_item: 'Audit entry',
};

function Rows({ rows }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {rows.filter(Boolean).map(([label, value, mono]) => (
        <Field key={label} label={label} mono={mono}>{value === null || value === undefined || value === '' ? DASH : value}</Field>
      ))}
    </div>
  );
}

/**
 * Read-only detail of one row of the console. It shows only what the API
 * returned for that row: no message content and no unmasked recipient exists
 * on this path.
 */
export default function CommunicationInspectorDrawer({ isOpen, onClose, inspectData, canManage, verifyingDomain, onVerifyDns }) {
  useModal(isOpen, onClose);
  const { showToast } = useToast();
  if (!isOpen || !inspectData) return null;
  const { type, identifier, details = {} } = inspectData;

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`Copied ${label}.`, 'success');
    } catch {
      showToast('Could not copy to the clipboard.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-150" onClick={onClose}>
      <div
        className="w-full max-w-xl h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 border-b border-slate-100 dark:border-slate-800 gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{TITLES[type] || 'Details'}</div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-mono break-all mt-0.5">{identifier}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {type === 'domain' && (
            <>
              <Rows rows={[
                ['Tenant', `${details.tenant_name}${details.tenant_code ? ` (${details.tenant_code})` : ''}`],
                ['Status', <StatusBadge key="s" label={titleCase(details.status)} tone={stateTone(details.status)} />],
                ['Sending', titleCase(details.sending_status)],
                ['Inbound replies', details.inbound_enabled ? 'Enabled' : 'Disabled'],
                ['Verified', dateTime(details.verified_at)],
                ['Last DNS check', dateTime(details.last_check)],
                details.failure_reason && ['Provider message', details.failure_reason],
              ]} />
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">DNS records the tenant must publish</div>
                {(details.dns_records || []).length === 0 ? (
                  <p className="text-xs text-slate-400">
                    {details.registered
                      ? 'No DNS records have been recorded yet. Run a DNS re-check to fetch them from Resend.'
                      : 'This domain was imported and has no provider record.'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {details.dns_records.map((record, index) => (
                      <div key={index} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{record.purpose || record.type} · {record.type}</span>
                          {record.status && <StatusBadge label={titleCase(record.status)} tone={stateTone(record.status)} dot={false} />}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 break-all">{record.name}</div>
                        <div className="flex items-start gap-2">
                          <code className="flex-1 text-[11px] font-mono text-slate-700 dark:text-slate-300 break-all">{record.value}</code>
                          <button onClick={() => copy(record.value, 'record value')} className="text-slate-400 hover:text-blue-600 cursor-pointer shrink-0" title="Copy value">
                            <Copy size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {type === 'number' && (
            <Rows rows={[
              ['Tenant', `${details.tenant_name}${details.tenant_code ? ` (${details.tenant_code})` : ''}`],
              ['Number type', titleCase(details.type)],
              ['Operational state', <StatusBadge key="o" label={titleCase(details.operational_state)} tone={stateTone(details.operational_state)} />],
              ['Provisioning', titleCase(details.provisioning_status)],
              ['Messaging registration', titleCase(details.sms_eligibility)],
              ['Assigned to', details.assignment_type === 'branch' ? `Branch${details.branch_hub ? ` · ${details.branch_hub}` : ''}` : titleCase(details.assignment_type)],
              ['Telnyx number ID', details.provider_number_id, true],
              ['Monthly rental', money(details.monthly_cost, details.currency)],
              ['Purchased', dateTime(details.purchased_at)],
            ]} />
          )}

          {(type === 'email_log' || type === 'sms_log') && (
            <>
              <Rows rows={[
                ['Tenant', details.tenant],
                ['Channel', type === 'email_log' ? 'Resend · Branch email' : 'Telnyx · SMS'],
                ['Origin', titleCase(details.event)],
                ['Status', <StatusBadge key="s" label={titleCase(details.status)} tone={stateTone(details.status)} />],
                ['From', details.sender || details.sending_did, true],
                ['To (masked)', details.recipient || details.destination, true],
                ['Created', dateTime(details.timestamp)],
                ['Accepted by provider in', details.latency_ms === null || details.latency_ms === undefined ? null : `${details.latency_ms} ms`],
                type === 'sms_log' && ['Segments', details.segments],
                details.failure_reason && ['Failure reason', details.failure_reason],
              ]} />
              <p className="text-[11px] text-slate-400">Message content and the full recipient are available only to the tenant that owns the conversation.</p>
            </>
          )}

          {type === 'event' && (
            <Rows rows={[
              ['Provider', details.provider],
              ['Event', details.event_type, true],
              ['Severity', details.severity],
              ['Received', dateTime(details.timestamp)],
              ['Tenant', details.tenant],
              ['Recipient (masked)', details.target, true],
              ['Message', details.message_id ? `#${details.message_id}` : null, true],
              details.details && ['Details', details.details],
            ]} />
          )}

          {type === 'audit_item' && (
            <>
              <Rows rows={[
                ['Operator', details.operator],
                ['Action', details.action, true],
                ['Target', `${PROVIDER_LABEL[details.provider] || details.provider}${details.tenant ? ` · ${details.tenant}` : ''}`],
                ['Time', dateTime(details.timestamp)],
                ['IP address', details.ip, true],
                ['Reason', details.reason],
              ]} />
              <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Recorded details</div>
                <pre className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto">
                  {JSON.stringify(details.details || {}, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          {type === 'domain' && canManage && details.registered && (
            <button className={BTN_PRIMARY} disabled={verifyingDomain === details.domain} onClick={() => onVerifyDns(details.domain)}>
              <RefreshCw size={14} className={verifyingDomain === details.domain ? 'animate-spin' : ''} /> Re-check DNS
            </button>
          )}
          <button className={BTN} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
