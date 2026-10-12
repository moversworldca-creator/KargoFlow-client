import React from 'react';
import { ShieldCheck, History, Terminal } from 'lucide-react';

export default function CommunicationAuditTab({ auditLogs = [], onInspect }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden animate-in fade-in duration-150">
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Immutable Infrastructure Control Plane Audit Trail
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Every API inspection, secret rotation, and provider configuration modification is permanently logged.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold self-start sm:self-auto">
          <ShieldCheck size={14} className="text-emerald-500" />
          HMAC CHAIN: VERIFIED
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/70 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Audit ID</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Staff Operator</th>
              <th className="py-3 px-4">Action Taken</th>
              <th className="py-3 px-4">Target Provider</th>
              <th className="py-3 px-4">IP &amp; Session</th>
              <th className="py-3 px-4 text-right">Inspect Entry</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {auditLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">{log.id}</td>
                <td className="py-3 px-4 font-mono text-slate-500">{log.timestamp}</td>
                <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{log.operator}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-mono">
                    {log.action}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{log.provider}</td>
                <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{log.ip}</td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => onInspect({
                      type: 'audit_item',
                      identifier: log.id,
                      details: log,
                    })}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
                  >
                    View Record
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
