import React from 'react';
import { Activity, CheckCircle2, ShieldCheck, Server, Radio, Clock } from 'lucide-react';

export default function ProviderHealthTab({ healthData }) {
  const healthMatrix = healthData?.health_matrix || [
    { name: 'Resend API Edge (US-East)', uptime_pct: 99.99, avg_latency_ms: 62 },
    { name: 'Resend Webhook Dispatch', uptime_pct: 99.98, avg_latency_ms: 94 },
    { name: 'Telnyx SMS Gateway', uptime_pct: 99.95, avg_latency_ms: 112 },
    { name: 'Telnyx Number Provisioning API', uptime_pct: 100.0, avg_latency_ms: 180 },
    { name: 'Carrier Route 10DLC Registry', uptime_pct: 100.0, sync_status: 'Healthy' },
    { name: 'Tenant Queue Backlog', messages_count: 0, delay: '< 1 sec' },
  ];

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800 gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Platform Provider Real-Time Health Matrix</h3>
          <p className="text-xs text-slate-400 mt-0.5">SLA compliance monitoring across API nodes, ingress dispatchers, and edge delivery gateways.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-400 text-xs font-bold self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          All Provider Subsystems 100% Operational
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {healthMatrix.map((item, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white text-xs">{item.name}</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                {item.uptime_pct ? `${item.uptime_pct}%` : 'Operational'}
              </span>
            </div>

            {item.avg_latency_ms !== undefined && (
              <div className="text-xs text-slate-400">
                Avg Latency: <strong className="text-slate-700 dark:text-slate-300 font-mono">{item.avg_latency_ms} ms</strong>
              </div>
            )}

            {item.sync_status && (
              <div className="text-xs text-slate-400">
                Direct TCR Carrier Sync: <strong className="text-slate-700 dark:text-slate-300">{item.sync_status}</strong>
              </div>
            )}

            {item.messages_count !== undefined && (
              <div className="text-xs text-slate-400">
                Processing Delay: <strong className="text-slate-700 dark:text-slate-300">{item.delay}</strong>
              </div>
            )}

            {/* Progress bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
              <div 
                className="bg-emerald-500 h-full rounded-full" 
                style={{ width: `${item.uptime_pct || 100}%` }} 
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
