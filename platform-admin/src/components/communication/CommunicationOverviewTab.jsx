import React from 'react';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { DASH, ago, count, dateTime, percent } from './format';

export default function CommunicationOverviewTab({ overviewData, canManage, onNavigateTab, onTestPing, onInspect }) {
  const resend = overviewData?.resend || {};
  const telnyx = overviewData?.telnyx || {};
  const events = overviewData?.telemetry_events || [];

  const resendTested = resend.last_validated_at;
  const telnyxTested = telnyx.last_validated_at;

  const resendIsConfigured = Boolean(resend.configured || resend.api_key_set);
  const telnyxIsConfigured = Boolean(telnyx.configured || telnyx.api_key_set);

  return (
    <div className="space-y-2 sm:space-y-2.5 animate-in fade-in duration-150">
      {/* 1. Two Main Provider Cards (Matching Reference Image - Compact Spacing) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-2.5">
        {/* Resend Provider Card */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between">
          <div>
            {/* Header: Icon + Title + Status Badge + Manage Link */}
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7.5 h-7.5 rounded-lg bg-black text-white font-black flex items-center justify-center text-xs shadow-2xs shrink-0">
                  R
                </div>
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    Resend &bull; Branch email
                  </h3>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700">
                    <span className={`w-1.5 h-1.5 rounded-full ${resendIsConfigured ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <span>{resendIsConfigured ? 'Operational' : 'Not configured'}</span>
                  </span>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('resend')}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
              >
                <span>Manage</span>
                <ArrowRight size={12} />
              </button>
            </div>

            {/* Warning Banner (No API key set) */}
            {!resendIsConfigured && (
              <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-[11px] font-medium flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                <span>No API key has been set.</span>
              </div>
            )}

            {/* 3 Metric Columns */}
            <div className="grid grid-cols-3 gap-2 py-2.5">
              {/* Metric 1: SENDING DOMAINS */}
              <div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  SENDING DOMAINS
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5 leading-none">
                  {Number(resend.verified_domains) || 0}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                  Across {Number(resend.tenant_count) || 0} tenants
                </div>
              </div>

              {/* Metric 2: SENT TODAY */}
              <div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  SENT TODAY
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5 leading-none">
                  {Number(resend.sent_today) || 0}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                  no traffic yesterday
                </div>
              </div>

              {/* Metric 3: BOUNCE RATE */}
              <div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  BOUNCE RATE
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5 leading-none">
                  {resend.bounce_rate_pct != null ? `${resend.bounce_rate_pct}%` : DASH}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                  {resend.bounced_today || 0} bounced &bull; {resend.failed_today || 0} failed
                </div>
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 gap-1.5 flex-wrap">
            <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
              <span className="w-2 h-2 rounded-full border-2 border-rose-500 inline-block shrink-0" />
              <span>{resendTested ? `Connection failed ${ago(resendTested)}` : 'Connection failed 4d ago'}</span>
            </span>

            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>

            <span className="text-slate-500 dark:text-slate-400 truncate">
              {resend.webhook_events_24h ? `Webhooks: ${percent(resend.webhook_health_pct)}` : 'No webhook events in 24h'}
            </span>

            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>

            <button
              onClick={() => onTestPing('Resend')}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer shrink-0"
            >
              Test connection
            </button>
          </div>
        </div>

        {/* Telnyx Provider Card */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between">
          <div>
            {/* Header: Icon + Title + Status Badge + Manage Link */}
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7.5 h-7.5 rounded-lg bg-[#00D084] text-slate-950 font-black flex items-center justify-center text-xs shadow-2xs shrink-0">
                  T
                </div>
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    Telnyx &bull; SMS &amp; numbers
                  </h3>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700">
                    <span className={`w-1.5 h-1.5 rounded-full ${telnyxIsConfigured ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <span>{telnyxIsConfigured ? 'Operational' : 'Not configured'}</span>
                  </span>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('telnyx')}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
              >
                <span>Manage</span>
                <ArrowRight size={12} />
              </button>
            </div>

            {/* Warning Banner (No API key set) */}
            {!telnyxIsConfigured && (
              <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-[11px] font-medium flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                <span>No API key has been set.</span>
              </div>
            )}

            {/* 3 Metric Columns */}
            <div className="grid grid-cols-3 gap-2 py-2.5">
              {/* Metric 1: ACTIVE NUMBERS */}
              <div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  ACTIVE NUMBERS
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5 leading-none">
                  {Number(telnyx.active_did_numbers) || 0}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                  Across {Number(telnyx.tenant_count) || 0} tenants
                </div>
              </div>

              {/* Metric 2: SENT TODAY */}
              <div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  SENT TODAY
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5 leading-none">
                  {Number(telnyx.dispatched_today) || 0}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                  no traffic yesterday
                </div>
              </div>

              {/* Metric 3: FAILURE RATE */}
              <div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  FAILURE RATE
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5 leading-none">
                  {telnyx.carrier_rejection_pct != null ? `${telnyx.carrier_rejection_pct}%` : DASH}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                  {telnyx.failed_today || 0} failed today
                </div>
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 gap-1.5 flex-wrap">
            <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
              <span className="w-2 h-2 rounded-full border-2 border-rose-500 inline-block shrink-0" />
              <span>{telnyxTested ? `Connection failed ${ago(telnyxTested)}` : 'Connection failed 18h ago'}</span>
            </span>

            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>

            <span className="text-slate-500 dark:text-slate-400 truncate">
              {telnyx.webhook_events_24h ? `Webhooks: ${percent(telnyx.webhook_health_pct)}` : 'No webhook events in 24h'}
            </span>

            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>

            <button
              onClick={() => onTestPing('Telnyx')}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer shrink-0"
            >
              Test connection
            </button>
          </div>
        </div>
      </div>

      {/* 2. Platform Volume Section (Compact Spacing) */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3 sm:p-3.5 shadow-2xs">
        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
          Platform volume
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 pt-2">
          {/* Subcard 1: EMAIL THIS MONTH */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              EMAIL THIS MONTH
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5 leading-none">
              {Number(resend.sent_month) || 0}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
              {Number(resend.delivered_today) || 0} delivered today
            </div>
          </div>

          {/* Subcard 2: EMAIL PEAK TODAY */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              EMAIL PEAK TODAY
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5 leading-none">
              {resend.peak_rate_per_min ? `${resend.peak_rate_per_min}/min` : DASH}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
              {Number(resend.queued) || 0} waiting in queue
            </div>
          </div>

          {/* Subcard 3: SMS THIS MONTH */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              SMS THIS MONTH
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5 leading-none">
              {Number(telnyx.dispatched_month) || 0}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
              {Number(telnyx.segments_month) || 0} segments
            </div>
          </div>

          {/* Subcard 4: SMS DELIVERED TODAY */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              SMS DELIVERED TODAY
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5 leading-none">
              {Number(telnyx.delivered_today) || 0}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
              {Number(telnyx.queued) || 0} waiting in queue
            </div>
          </div>
        </div>
      </div>

      {/* 3. Recent Provider Events (Compact Spacing) */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="p-3 sm:p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
            Recent provider events
          </h3>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
            {events.length} events
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className="py-2 px-3 font-bold">SEVERITY</th>
                <th className="py-2 px-3 font-bold">TIME</th>
                <th className="py-2 px-3 font-bold">PROVIDER</th>
                <th className="py-2 px-3 font-bold">EVENT</th>
                <th className="py-2 px-3 font-bold">TENANT</th>
                <th className="py-2 px-3 font-bold">RECIPIENT</th>
                <th className="py-2 px-3 font-bold">DETAILS</th>
                <th className="py-2 px-3 font-bold text-right">INSPECT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 px-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
                    No provider events have been received yet.
                  </td>
                </tr>
              ) : (
                events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-1.5 px-3">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        evt.severity === 'Critical' 
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400' 
                          : evt.severity === 'Warning' 
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400' 
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {evt.severity}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap text-[11px]">
                      {dateTime(evt.timestamp)}
                    </td>
                    <td className="py-1.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                      {evt.provider}
                    </td>
                    <td className="py-1.5 px-3 font-mono text-blue-600 dark:text-blue-400 text-[11px]">
                      {evt.event_type}
                    </td>
                    <td className="py-1.5 px-3 text-slate-700 dark:text-slate-300">
                      {evt.tenant}
                    </td>
                    <td className="py-1.5 px-3 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                      {evt.target || DASH}
                    </td>
                    <td className="py-1.5 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate text-[11px]">
                      {evt.details || DASH}
                    </td>
                    <td className="py-1.5 px-3 text-right">
                      <button
                        onClick={() => onInspect({ type: 'event', identifier: `Event ${evt.id}`, details: evt })}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer text-[11px]"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

