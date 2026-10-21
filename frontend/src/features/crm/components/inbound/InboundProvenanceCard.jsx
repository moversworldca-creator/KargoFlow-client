import React from 'react';
import { Webhook, Route, Globe, Shield, Terminal, ArrowUpRight } from 'lucide-react';
import Card from '../../../../shared/ui/Card';
import { Pill, StatusDot } from '../../../../shared/ui/RedesignAtoms';

const ROUTING_SOURCE_LABELS = {
  explicit_branch: { label: 'Explicit Routing Rule / Payload', tone: 'emerald', dot: 'emerald' },
  provider_default: { label: 'Provider Default Route', tone: 'sky', dot: 'sky' },
  main_branch_fallback: { label: 'Main Branch Fallback', tone: 'amber', dot: 'amber' },
  manual: { label: 'Manual Assignment', tone: 'slate', dot: 'slate' },
};

export default function InboundProvenanceCard({ lead, onInspectIntakeEvent }) {
  // Hidden per user request
  return null;

  const routingSource = lead.branch_routing_source || 'manual';
  const sourceConfig = ROUTING_SOURCE_LABELS[routingSource] || ROUTING_SOURCE_LABELS.manual;

  const hasUtm = Boolean(
    lead.utm_source || lead.utm_medium || lead.utm_campaign || lead.utm_content || lead.utm_keyword
  );

  return (
    <Card className="!p-4 !rounded-2xl space-y-3 border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
            <Webhook size={14} />
          </div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-white">Inbound Routing & Provenance</h4>
        </div>
        <Pill tone={sourceConfig.tone}>
          <StatusDot tone={sourceConfig.dot} />
          <span>{sourceConfig.label}</span>
        </Pill>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <span className="block text-[10px] uppercase font-bold text-slate-400">Routing Key</span>
          <span className="font-mono text-slate-700 dark:text-slate-300 truncate block font-medium">
            {lead.branch_routing_key || 'direct'}
          </span>
        </div>

        <div>
          <span className="block text-[10px] uppercase font-bold text-slate-400">Lead Provider ID</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">
            {lead.lead_provider_id ? `Provider #${lead.lead_provider_id}` : 'Direct / Organic'}
          </span>
        </div>

        <div>
          <span className="block text-[10px] uppercase font-bold text-slate-400">Intake Event</span>
          {lead.intake_event_id ? (
            <button
              type="button"
              onClick={() => onInspectIntakeEvent?.(lead.intake_event_id)}
              className="inline-flex items-center gap-1 font-mono text-primary font-bold hover:underline"
            >
              Event #{lead.intake_event_id}
              <ArrowUpRight size={11} />
            </button>
          ) : (
            <span className="text-slate-400">None</span>
          )}
        </div>
      </div>

      {hasUtm && (
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-800/40 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500">
            <Globe size={11} />
            Marketing UTM Attribution
          </div>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {lead.utm_source && (
              <span className="rounded bg-white dark:bg-slate-900 px-2 py-0.5 border border-slate-200 dark:border-slate-700 font-mono text-slate-700 dark:text-slate-300">
                src: <strong>{lead.utm_source}</strong>
              </span>
            )}
            {lead.utm_medium && (
              <span className="rounded bg-white dark:bg-slate-900 px-2 py-0.5 border border-slate-200 dark:border-slate-700 font-mono text-slate-700 dark:text-slate-300">
                med: <strong>{lead.utm_medium}</strong>
              </span>
            )}
            {lead.utm_campaign && (
              <span className="rounded bg-white dark:bg-slate-900 px-2 py-0.5 border border-slate-200 dark:border-slate-700 font-mono text-slate-700 dark:text-slate-300">
                camp: <strong>{lead.utm_campaign}</strong>
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
