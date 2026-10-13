import React from 'react';
import StatusBadge from './StatusBadge';
import { CARD } from './parts';
import { DASH, ago, count, healthBadge, percent } from './format';

function Line({ label, children }) {
  return (
    <div className="flex items-center justify-between text-xs gap-3">
      <span className="text-slate-400">{label}</span>
      <strong className="text-slate-700 dark:text-slate-300 font-mono text-right">{children}</strong>
    </div>
  );
}

export default function ProviderHealthTab({ healthData }) {
  const matrix = healthData?.health_matrix || [];
  const allOperational = Boolean(healthData?.all_operational);
  const attention = matrix.filter((row) => row.status !== 'operational').length;

  return (
    <div className={`${CARD} p-6 space-y-6 animate-in fade-in duration-150`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800 gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Provider health</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Derived from the last connection test, the dispatch queue and webhook processing.
            {healthData?.last_check ? ` Last connection test ${ago(healthData.last_check)}.` : ' No connection test has been run yet.'}
          </p>
        </div>
        <StatusBadge
          className="self-start sm:self-auto px-3 py-1 text-xs"
          tone={allOperational ? 'good' : 'warn'}
          label={allOperational ? 'All providers operational' : `${attention} of ${matrix.length} need attention`}
        />
      </div>

      {healthData?.simulated && (
        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-300">
          This server runs with fake providers: nothing is sent to Resend or Telnyx and connection tests make no network call.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {matrix.map((item) => {
          const badge = healthBadge(item.status);
          return (
            <div key={item.key} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-slate-900 dark:text-white text-sm">{item.name}</span>
                <StatusBadge label={badge.label} tone={badge.tone} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                <Line label="Last connection test">
                  {item.last_check_at
                    ? `${ago(item.last_check_at)}${item.avg_latency_ms !== null && item.avg_latency_ms !== undefined ? ` · ${item.avg_latency_ms} ms` : ''}`
                    : 'Never'}
                </Line>
                <Line label="Sent / failed today">{count(item.messages_count)} / {count(item.failed_count)}</Line>
                <Line label="Queued">
                  {count(item.queued)}{item.queued > 0 ? ` · oldest ${item.oldest_queued_minutes} min` : ''}
                </Line>
                <Line label="Webhook events processed (24h)">{percent(item.webhook_health_pct)}</Line>
                <Line label="Last webhook event">{ago(item.last_event_at) || DASH}</Line>
                <Line label="Last message sent">{ago(item.last_sent_at) || DASH}</Line>
              </div>
            </div>
          );
        })}
        {matrix.length === 0 && <p className="text-xs text-slate-400">No health data is available.</p>}
      </div>

      <p className="text-[11px] text-slate-400">
        Uptime percentages are not shown: the platform keeps no availability history for the providers.
      </p>
    </div>
  );
}
