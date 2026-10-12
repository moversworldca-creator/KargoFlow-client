import React, { useState } from 'react';
import { 
  ArrowRight, CheckCircle2, Shield, Radio, Mail, 
  Phone, Activity, RefreshCw, Key, Cable, Check, AlertTriangle, Info, Terminal
} from 'lucide-react';

export default function CommunicationOverviewTab({ 
  overviewData, 
  onNavigateTab, 
  onTestPing, 
  onInspect 
}) {
  const [period, setPeriod] = useState('24h');

  const resend = overviewData?.resend || {
    organization_id: 'org_kg_01HX9882A',
    region: 'US-East-1',
    verified_domains: 142,
    pending_domains: 3,
    sent_today: 284910,
    sent_change_pct: 4.2,
    bounce_rate_pct: 0.04,
    reputation_pct: 99.8,
  };

  const telnyx = overviewData?.telnyx || {
    messaging_profile: 'kg_mp_910032',
    carrier_tier: 'Tier 1 Carrier',
    active_did_numbers: 1280,
    provisioning_pending: 14,
    tenant_count: 89,
    dispatched_today: 189420,
    dispatched_change_pct: 11.8,
    carrier_rejection_pct: 0.12,
  };

  const telemetryEvents = overviewData?.telemetry_events || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Dual Provider Status Bento Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RESEND (EMAIL) MASTER CARD */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-black text-white flex items-center justify-center font-black text-lg shadow-sm">
                R
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Resend Email Platform</h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Connected &amp; Healthy
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Organization ID: {resend.organization_id} &bull; {resend.region}
                </span>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('resend')}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <span>Manage Resend</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-3 gap-4 py-5 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Verified Domains</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{resend.verified_domains}</span>
                <span className="text-[11px] font-bold text-amber-500">+{resend.pending_domains} pending</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">DKIM / SPF strict policy</div>
            </div>

            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Sent Today</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {resend.sent_today.toLocaleString()}
                </span>
                <span className="text-[11px] font-bold text-emerald-600">&uarr; {resend.sent_change_pct}%</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Peak: 1,840/min</div>
            </div>

            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Bounce / Fail Rate</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{resend.bounce_rate_pct}%</span>
                <span className="text-[11px] text-slate-400">Target &lt; 1%</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Reputation: {resend.reputation_pct}%</div>
            </div>
          </div>

          {/* Bottom Status Strip */}
          <div className="pt-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                API Key: Validated (14m ago)
              </span>
              <span className="flex items-center gap-1.5">
                <Radio size={14} className="text-emerald-500" />
                Webhook Health: 99.98%
              </span>
            </div>
            <button
              onClick={() => onTestPing('Resend')}
              className="text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <Cable size={14} />
              <span>Test Ping</span>
            </button>
          </div>
        </div>

        {/* TELNYX (SMS) MASTER CARD */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-lg shadow-sm">
                T
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Telnyx SMS &amp; Numbers</h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Connected &amp; Healthy
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Messaging Profile: {telnyx.messaging_profile} &bull; {telnyx.carrier_tier}
                </span>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('telnyx')}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <span>Manage Telnyx</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-3 gap-4 py-5 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active DID Numbers</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {telnyx.active_did_numbers.toLocaleString()}
                </span>
                <span className="text-[11px] font-bold text-amber-500">+{telnyx.provisioning_pending} prov.</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Across {telnyx.tenant_count} tenant orgs</div>
            </div>

            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">SMS Dispatched Today</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {telnyx.dispatched_today.toLocaleString()}
                </span>
                <span className="text-[11px] font-bold text-emerald-600">&uarr; {telnyx.dispatched_change_pct}%</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">A2P 10DLC Campaign Reg.</div>
            </div>

            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Carrier Rejections</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{telnyx.carrier_rejection_pct}%</span>
                <span className="text-[11px] text-slate-400">Target &lt; 0.5%</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">10DLC Campaign: Verified</div>
            </div>
          </div>

          {/* Bottom Status Strip */}
          <div className="pt-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Key size={14} className="text-emerald-500" />
                API Key: Validated (6m ago)
              </span>
              <span className="flex items-center gap-1.5">
                <RefreshCw size={14} className="text-emerald-500" />
                DLSR Webhook: 100% Health
              </span>
            </div>
            <button
              onClick={() => onTestPing('Telnyx')}
              className="text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <Cable size={14} />
              <span>Test Ping</span>
            </button>
          </div>
        </div>
      </div>

      {/* TELEMETRY & VOLUME TRENDS (Interactive SVG Chart) */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800 gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Multi-Tenant Traffic Throughput &amp; Pipeline Load</h3>
            <p className="text-xs text-slate-400 mt-0.5">Aggregated delivery curves across all tenant automated triggers and system alerts.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 p-1 bg-slate-50 dark:bg-slate-950 text-xs font-bold">
              {['24h', '7d', '30d'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    period === p
                      ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {p === '24h' ? '24 Hours' : p === '7d' ? '7 Days' : '30 Days'}
                </button>
              ))}
            </div>
            <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-600" /> Resend Email</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Telnyx SMS</span>
            </div>
          </div>
        </div>

        {/* SVG Dual Series Chart */}
        <div className="pt-4">
          <div className="h-60 w-full relative">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 900 220">
              <defs>
                <linearGradient id="emailGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="smsGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" x1="0" x2="900" y1="40" y2="40" />
              <line stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" x1="0" x2="900" y1="90" y2="90" />
              <line stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" x1="0" x2="900" y1="140" y2="140" />
              <line stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" x1="0" x2="900" y1="190" y2="190" />
              {/* Email Filled Area */}
              <polygon fill="url(#emailGrad)" points="0,170 80,150 160,110 240,125 320,80 400,95 480,50 560,65 640,45 720,70 800,55 900,40 900,190 0,190" />
              {/* Email Line */}
              <polyline fill="none" points="0,170 80,150 160,110 240,125 320,80 400,95 480,50 560,65 640,45 720,70 800,55 900,40" stroke="#2563eb" strokeWidth="2.5" />
              {/* SMS Filled Area */}
              <polygon fill="url(#smsGrad)" points="0,185 80,175 160,140 240,155 320,120 400,135 480,95 560,110 640,90 720,105 800,85 900,75 900,190 0,190" />
              {/* SMS Line */}
              <polyline fill="none" points="0,185 80,175 160,140 240,155 320,120 400,135 480,95 560,110 640,90 720,105 800,85 900,75" stroke="#10b981" strokeWidth="2" />
            </svg>
            {/* Timeline labels */}
            <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-3">
              <span>00:00 UTC</span>
              <span>04:00 UTC</span>
              <span>08:00 UTC</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">12:00 UTC (Peak)</span>
              <span>16:00 UTC</span>
              <span>20:00 UTC</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">Now</span>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT PLATFORM INFRASTRUCTURE EVENTS & ALERTS TABLE */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Infrastructure Telemetry &amp; Gateway Alerts</h3>
            <p className="text-xs text-slate-400 mt-0.5">Real-time gateway events captured from Resend and Telnyx webhooks.</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Showing {telemetryEvents.length} events
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Provider / Channel</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Target Identifier</th>
                <th className="py-3 px-4">Details / Payload</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {telemetryEvents.map((evt) => {
                const isWarning = evt.severity === 'Warning';
                const isNotice = evt.severity === 'Notice';
                return (
                  <tr key={evt.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        isWarning
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                          : isNotice
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isWarning ? 'bg-rose-500' : isNotice ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                        {evt.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{evt.timestamp}</td>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{evt.provider}</td>
                    <td className="py-3 px-4 font-mono text-blue-600 dark:text-blue-400">{evt.event_type}</td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">{evt.target}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">{evt.details}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onInspect({
                          type: evt.target.includes('.') ? 'domain' : evt.target.startsWith('+') ? 'number' : 'event',
                          identifier: evt.id || evt.target,
                          details: evt,
                        })}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
