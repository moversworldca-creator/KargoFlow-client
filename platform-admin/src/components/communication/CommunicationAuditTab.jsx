import React from 'react';
import { Lock } from 'lucide-react';
import { CARD, EmptyRow, TH_ROW, TR } from './parts';
import { DASH, PROVIDER_LABEL, dateTime } from './format';

const ACTIONS = {
  'communication.provider.configure': 'Settings changed',
  'communication.provider.rotate_key': 'API key replaced',
  'communication.provider.suspend': 'Provider suspended',
  'communication.provider.resume': 'Provider resumed',
  'communication.provider.test': 'Connection tested',
  'communication.domain.verify': 'Domain DNS re-checked',
};

export default function CommunicationAuditTab({ auditData, canAudit, isError, onInspect }) {
  if (!canAudit) {
    return (
      <div className={`${CARD} p-10 text-center animate-in fade-in duration-150`}>
        <Lock size={22} className="mx-auto text-slate-400 mb-3" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Audit trail restricted</h3>
        <p className="text-xs text-slate-400 mt-1">Your platform role may use the console but not read the platform audit log.</p>
      </div>
    );
  }
  const logs = auditData?.results || [];
  return (
    <div className={`${CARD} overflow-hidden animate-in fade-in duration-150`}>
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Console audit trail</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Every key change, settings change, suspension, connection test and DNS re-check made from this console, recorded by the database.
          </p>
        </div>
        <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
          {logs.length} of {auditData?.count ?? logs.length} entries
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className={TH_ROW}>
              <th className="py-3 px-4">Entry</th>
              <th className="py-3 px-4">Time</th>
              <th className="py-3 px-4">Operator</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Target</th>
              <th className="py-3 px-4">Reason</th>
              <th className="py-3 px-4">IP address</th>
              <th className="py-3 px-4 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs.length === 0 && (
              <EmptyRow colSpan={8}>{isError ? 'The audit trail could not be loaded.' : 'Nothing has been changed from this console yet.'}</EmptyRow>
            )}
            {logs.map((log) => (
              <tr key={log.id} className={TR}>
                <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">#{log.id}</td>
                <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{dateTime(log.timestamp)}</td>
                <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{log.operator}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                    {ACTIONS[log.action] || log.action}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                  {PROVIDER_LABEL[log.provider] || log.provider}{log.tenant ? ` · ${log.tenant}` : ''}
                </td>
                <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{log.reason || DASH}</td>
                <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{log.ip || DASH}</td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => onInspect({ type: 'audit_item', identifier: `Audit entry #${log.id}`, details: log })}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
