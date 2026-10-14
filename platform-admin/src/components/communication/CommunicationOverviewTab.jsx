import React from 'react';
import { ArrowRight, Cable, CheckCircle2, Radio, AlertTriangle, Clock } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { CARD, EmptyRow, TH_ROW, TR } from './parts';
import { DASH, ago, count, dateTime, healthBadge, percent } from './format';

function Change({ value }) {
  if (value === null || value === undefined) return <span className="text-[11px] text-slate-400">no traffic yesterday</span>;
  const up = value >= 0;
  return (
    <span className={`text-[11px] font-bold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
      {up ? '↑' : '↓'} {Math.abs(value)}% vs yesterday
    </span>
  );
}

function Metric({ label, value, extra, hint }) {
  return (
    <div>
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</div>
      <div className="flex items-baseline gap-2 mt-1 flex-wrap">
        <span className="text-2xl font-black text-slate-900 dark:text-white">{value}</span>
        {extra}
      </div>
      {hint && <div className="text-[11px] text-slate-400 mt-0.5">{hint}</div>}
    </div>
  );
}

function ProviderCard({ mark, markClass, title, subtitle, health, config, metrics, tab, canManage, onNavigateTab, onTestPing }) {
  const badge = healthBadge(health?.status || config.state);
  const tested = config.last_validated_at;
  return (
    <div className={`${CARD} p-6 hover:border-slate-300 dark:hover:border-slate-700 transition-all`}>
      <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800 gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg shadow-sm shrink-0 ${markClass}`}>{mark}</div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
              <StatusBadge label={badge.label} tone={badge.tone} />
            </div>
            <span className="text-xs text-slate-400 font-mono break-all">{subtitle}</span>
          </div>
        </div>
        <button
          onClick={() => onNavigateTab(tab)}
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
        >
          Manage <ArrowRight size={14} />
        </button>
      </div>

      {health?.detail && health.status !== 'operational' && (
        <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
          <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" /> {health.detail}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 py-5">{metrics}</div>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs gap-3 flex-wrap">
        <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 flex-wrap">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className={config.last_validation_ok ? 'text-emerald-500' : tested ? 'text-rose-500' : 'text-slate-400'} />
            {tested ? `Connection ${config.last_validation_ok ? 'passed' : 'failed'} ${ago(tested)}` : 'Connection never tested'}
          </span>
          <span className="flex items-center gap-1.5">
            <Radio size={14} className={config.webhook_events_24h ? 'text-emerald-500' : 'text-slate-400'} />
            {config.webhook_events_24h ? `Webhooks processed: ${percent(config.webhook_health_pct)}` : 'No webhook events in 24h'}
          </span>
          {config.queued > 0 && (
            <span className="flex items-center gap-1.5"><Clock size={14} className="text-amber-500" /> {count(config.queued)} queued</span>
          )}
        </div>
        {canManage && (
          <button
            onClick={() => onTestPing(config.provider)}
            className="text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
          >
            <Cable size={14} /> Test connection
          </button>
        )}
      </div>
    </div>
  );
}

export default function CommunicationOverviewTab({ overviewData, canManage, onNavigateTab, onTestPing, onInspect }) {
  const resend = overviewData?.resend || {};
  const telnyx = overviewData?.telnyx || {};
  const events = overviewData?.telemetry_events || [];
  const health = Object.fromEntries((overviewData?.health_matrix || []).map((row) => [row.key, row]));

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProviderCard
          mark="R" markClass="bg-black text-white" title="Resend · Branch email" tab="resend"
          subtitle={[resend.organization_id && `Account ${resend.organization_id}`, resend.region].filter(Boolean).join(' • ') || 'Account details not set'}
          health={health.resend} config={resend} canManage={canManage} onNavigateTab={onNavigateTab} onTestPing={onTestPing}
          metrics={(
            <>
              <Metric
                label="Sending domains" value={count(resend.verified_domains)}
                extra={resend.pending_domains > 0 && <span className="text-[11px] font-bold text-amber-500">+{resend.pending_domains} pending</span>}
                hint={`Across ${count(resend.tenant_count)} tenants`}
              />
              <Metric label="Sent today" value={count(resend.sent_today)} hint={<Change value={resend.sent_change_pct} />} />
              <Metric
                label="Bounce rate" value={percent(resend.bounce_rate_pct)}
                hint={`${count(resend.bounced_today)} bounced · ${count(resend.failed_today)} failed`}
              />
            </>
          )}
        />
        <ProviderCard
          mark="T" markClass="bg-emerald-500 text-slate-950" title="Telnyx · SMS & numbers" tab="telnyx"
          subtitle={telnyx.messaging_profile ? `Messaging profile ${telnyx.messaging_profile}` : 'Messaging profile not set'}
          health={health.telnyx} config={telnyx} canManage={canManage} onNavigateTab={onNavigateTab} onTestPing={onTestPing}
          metrics={(
            <>
              <Metric
                label="Active numbers" value={count(telnyx.active_did_numbers)}
                extra={telnyx.provisioning_pending > 0 && <span className="text-[11px] font-bold text-amber-500">+{telnyx.provisioning_pending} provisioning</span>}
                hint={`Across ${count(telnyx.tenant_count)} tenants`}
              />
              <Metric label="Sent today" value={count(telnyx.dispatched_today)} hint={<Change value={telnyx.dispatched_change_pct} />} />
              <Metric label="Failure rate" value={percent(telnyx.carrier_rejection_pct)} hint={`${count(telnyx.failed_today)} failed today`} />
            </>
          )}
        />
      </div>

      <div className={`${CARD} p-6`}>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Platform volume</h3>
        <p className="text-xs text-slate-400 mt-0.5">Counted from the messages the platform has recorded for all tenants. Days are UTC.</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
          {[
            ['Email this month', count(resend.sent_month), `${count(resend.delivered_today)} delivered today`],
            ['Email peak today', resend.peak_rate_per_min ? `${count(resend.peak_rate_per_min)}/min` : DASH, `${count(resend.queued)} waiting in queue`],
            ['SMS this month', count(telnyx.dispatched_month), `${count(telnyx.segments_month)} segments`],
            ['SMS delivered today', count(telnyx.delivered_today), `${count(telnyx.queued)} waiting in queue`],
          ].map(([label, value, hint]) => (
            <div key={label} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{value}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{hint}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={`${CARD} overflow-hidden`}>
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent provider events</h3>
            <p className="text-xs text-slate-400 mt-0.5">Delivery events received from Resend and Telnyx webhooks. Recipients are masked.</p>
          </div>
          <span className="text-xs text-slate-400 font-mono whitespace-nowrap">{events.length} events</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={TH_ROW}>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Provider</th>
                <th className="py-3 px-4">Event</th>
                <th className="py-3 px-4">Tenant</th>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {events.length === 0 && <EmptyRow colSpan={8}>No provider events have been received yet.</EmptyRow>}
              {events.map((evt) => (
                <tr key={evt.id} className={TR}>
                  <td className="py-3 px-4">
                    <StatusBadge label={evt.severity} tone={evt.severity === 'Critical' ? 'bad' : evt.severity === 'Warning' ? 'warn' : 'idle'} />
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{dateTime(evt.timestamp)}</td>
                  <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{evt.provider}</td>
                  <td className="py-3 px-4 font-mono text-blue-600 dark:text-blue-400">{evt.event_type}</td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{evt.tenant}</td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">{evt.target || DASH}</td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">{evt.details || DASH}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onInspect({ type: 'event', identifier: `Event ${evt.id}`, details: evt })}
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
    </div>
  );
}
