// Login invitations (users.manage): who was invited, when, and what happened.
import React, { useMemo, useState } from 'react';
import { Mail, RotateCw, X } from 'lucide-react';
import { inviteEmployee, revokeEmployeeInvitation } from '../../../services/api';
import { describeError } from './errors';
import { invitationStatus } from './logic';
import { Badge, Button, ConfirmDialog, EmptyState, ErrorBanner, LoadingState, inputClass } from './ui';

const fmt = (value) => (value ? new Date(value).toLocaleString() : '—');


const STATUS = {
  pending: ['Pending', 'blue'], expired: ['Expired', 'amber'], accepted: ['Accepted', 'green'], revoked: ['Revoked', 'slate'],
};

export default function InvitationsList({ query, employeeNames, readOnly, onChanged }) {
  const [filter, setFilter] = useState('open');
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [toRevoke, setToRevoke] = useState(null);

  const rows = useMemo(() => {
    const all = (query.data || []).map((inv) => ({ ...inv, state: invitationStatus(inv) }));
    const filtered = filter === 'all' ? all : filter === 'open' ? all.filter((i) => ['pending', 'expired'].includes(i.state)) : all.filter((i) => i.state === filter);
    return filtered.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }, [query.data, filter]);

  const resend = async (inv) => {
    setBusy(inv.id);
    setError('');
    try {
      await inviteEmployee(inv.employee_id, { email: inv.email });
      setNotice(`A new invitation was sent to ${inv.email}.`);
      await onChanged?.();
    } catch (err) {
      setError(describeError(err, 'The invitation could not be sent.').message);
    } finally {
      setBusy(null);
    }
  };

  const revoke = async () => {
    setBusy(toRevoke.id);
    setError('');
    try {
      await revokeEmployeeInvitation(toRevoke.id);
      setNotice('Invitation revoked.');
      setToRevoke(null);
      await onChanged?.();
    } catch (err) {
      setError(describeError(err, 'The invitation could not be revoked.').message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-600 dark:text-slate-300">Invitations let an employee choose their own password. Sending a new one cancels the previous link.</p>
        <select aria-label="Filter invitations" className={`${inputClass} w-44`} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="open">Waiting (pending / expired)</option>
          <option value="accepted">Accepted</option>
          <option value="revoked">Revoked</option>
          <option value="all">All</option>
        </select>
      </div>
      {notice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{notice}</p>}
      <ErrorBanner message={error} />
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {query.isLoading ? <LoadingState label="Loading invitations…" />
          : query.isError ? <ErrorBanner message={describeError(query.error).message} onRetry={() => query.refetch()} />
            : rows.length === 0 ? <EmptyState>{filter === 'open' ? 'No invitations are waiting.' : 'No invitations.'}</EmptyState> : (
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                  <tr>
                    <th scope="col" className="px-3 py-2">Employee</th>
                    <th scope="col" className="px-3 py-2">Status</th>
                    <th scope="col" className="px-3 py-2">Sent</th>
                    <th scope="col" className="px-3 py-2">Expires / answered</th>
                    <th scope="col" className="px-3 py-2"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map((inv) => {
                    const [label, tone] = STATUS[inv.state] || [inv.state, 'slate'];
                    return (
                      <tr key={inv.id}>
                        <td className="px-3 py-2">
                          <p className="font-semibold text-slate-900 dark:text-white">{employeeNames.get(String(inv.employee_id)) || `Employee #${inv.employee_id}`}</p>
                          <p className="flex items-center gap-1 text-[11px] text-slate-500"><Mail size={11} aria-hidden="true" />{inv.email}</p>
                        </td>
                        <td className="px-3 py-2"><Badge tone={tone}>{label}</Badge></td>
                        <td className="px-3 py-2">{fmt(inv.created_at)}</td>
                        <td className="px-3 py-2">{inv.state === 'accepted' ? `Accepted ${fmt(inv.accepted_at)}` : inv.state === 'revoked' ? `Revoked ${fmt(inv.revoked_at)}` : fmt(inv.expires_at)}</td>
                        <td className="px-3 py-2">
                          {!readOnly && (
                            <div className="flex justify-end gap-1.5">
                              {['pending', 'expired', 'revoked'].includes(inv.state) && (
                                <Button variant="ghost" busy={busy === inv.id && !toRevoke} disabled={busy !== null} onClick={() => resend(inv)}>
                                  <RotateCw size={13} aria-hidden="true" />{inv.state === 'pending' ? 'Resend' : 'Send again'}
                                </Button>
                              )}
                              {inv.state === 'pending' && (
                                <Button variant="ghost" disabled={busy !== null} onClick={() => setToRevoke(inv)}><X size={13} aria-hidden="true" />Revoke</Button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
      </div>
      {toRevoke && (
        <ConfirmDialog title="Revoke invitation" confirmLabel="Revoke invitation" busy={busy === toRevoke.id} error={error}
          onConfirm={revoke} onCancel={() => setToRevoke(null)}>
          <p>Revoke the invitation sent to <strong>{toRevoke.email}</strong>? The link in the email stops working.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
