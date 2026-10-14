import React, { useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import StatusBadge from './StatusBadge';
import ProviderCredentialsCard from './ProviderCredentialsCard';
import { CARD, EmptyRow, Field, INPUT, Stat, SubTabs, TH_ROW, TR } from './parts';
import { DASH, ago, count, dateTime, percent, stateTone, titleCase } from './format';

export default function ResendSubSuiteTab({
  resendData, health, canManage, busy, verifyingDomain, onTestPing, onOpenRotateKey, onOpenSettings, onOpenDisableProvider, onResume,
  onVerifyDns, onInspect,
}) {
  const [subTab, setSubTab] = useState('api');
  const [search, setSearch] = useState('');
  const config = resendData?.config || { provider: 'resend', state: 'unconfigured' };
  const domains = resendData?.domains || [];
  const logs = resendData?.delivery_logs || [];
  const term = search.trim().toLowerCase();
  const filtered = domains.filter((d) => !term || d.domain.toLowerCase().includes(term) || (d.tenant_name || '').toLowerCase().includes(term));

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <SubTabs
        active={subTab} onChange={setSubTab}
        tabs={[
          { id: 'api', label: 'API & credentials' },
          { id: 'domains', label: `Domain verification (${domains.length})` },
          { id: 'logs', label: `Delivery log (${logs.length})` },
        ]}
      />

      {subTab === 'api' && (
        <>
          <ProviderCredentialsCard
            config={config} health={health} canManage={canManage} busy={busy} onTestPing={onTestPing} onOpenRotateKey={onOpenRotateKey}
            onOpenSettings={onOpenSettings} onOpenSuspend={onOpenDisableProvider} onResume={onResume}
            extraFields={(
              <>
                <Field label="Region" mono>{config.region || DASH}</Field>
                <Field label="Default system sender" mono>{config.default_sender || DASH}</Field>
              </>
            )}
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Sent today" value={count(config.sent_today)} hint={`${count(config.delivered_today)} delivered`} />
            <Stat
              label="Bounce rate" value={percent(config.bounce_rate_pct)} hint={`${count(config.complained_today)} complaints today`}
              tone={config.bounce_rate_pct > 2 ? 'bad' : undefined}
            />
            <Stat label="Sent this month" value={count(config.sent_month)} hint="Plan quota is held by Resend, not shown here" />
            <Stat
              label="Queue" value={count(config.queued)}
              hint={config.oldest_queued_at ? `Oldest queued ${ago(config.oldest_queued_at)}` : 'Nothing waiting'}
              tone={config.queued > 0 ? 'warn' : undefined}
            />
          </div>
        </>
      )}

      {subTab === 'domains' && (
        <div className={`${CARD} overflow-hidden`}>
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Tenant sending domains</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {count(config.verified_domains)} verified · {count(config.pending_domains)} pending · {count(config.failed_domains)} failed
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className={`${INPUT} pl-9`} placeholder="Search domain or tenant" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={TH_ROW}>
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4">Tenant</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">DKIM</th>
                  <th className="py-3 px-4">SPF</th>
                  <th className="py-3 px-4">Sending</th>
                  <th className="py-3 px-4">Last check</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 && (
                  <EmptyRow colSpan={8}>{domains.length ? 'No domain matches the search.' : 'No tenant has registered a sending domain yet.'}</EmptyRow>
                )}
                {filtered.map((dom) => (
                  <tr key={`${dom.company_id}-${dom.id}`} className={TR}>
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">{dom.domain}</td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {dom.tenant_name} {dom.tenant_code && <span className="text-slate-400 font-mono text-[11px]">({dom.tenant_code})</span>}
                    </td>
                    <td className="py-3 px-4"><StatusBadge label={titleCase(dom.status)} tone={stateTone(dom.status)} /></td>
                    <td className="py-3 px-4">
                      {dom.dkim_status ? <StatusBadge label={titleCase(dom.dkim_status)} tone={stateTone(dom.dkim_status)} dot={false} /> : DASH}
                    </td>
                    <td className="py-3 px-4">
                      {dom.spf_status ? <StatusBadge label={titleCase(dom.spf_status)} tone={stateTone(dom.spf_status)} dot={false} /> : DASH}
                    </td>
                    <td className="py-3 px-4"><StatusBadge label={titleCase(dom.sending_status)} tone={stateTone(dom.sending_status)} /></td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{ago(dom.last_check) || 'Never'}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {canManage && dom.registered && (
                        <button
                          onClick={() => onVerifyDns(dom.domain)} disabled={verifyingDomain === dom.domain}
                          className="text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer disabled:opacity-50 inline-flex items-center gap-1 mr-3"
                        >
                          <RefreshCw size={12} className={verifyingDomain === dom.domain ? 'animate-spin' : ''} /> Re-check DNS
                        </button>
                      )}
                      <button
                        onClick={() => onInspect({ type: 'domain', identifier: dom.domain, details: dom })}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
                      >
                        Records
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'logs' && (
        <div className={`${CARD} overflow-hidden`}>
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Branch email delivery log</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              The latest messages sent through Resend for any tenant. Recipients are masked and message content is never shown here.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={TH_ROW}>
                  <th className="py-3 px-4">Message</th>
                  <th className="py-3 px-4">Tenant</th>
                  <th className="py-3 px-4">Origin</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Accepted in</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.length === 0 && <EmptyRow colSpan={8}>No Branch email has been sent yet.</EmptyRow>}
                {logs.map((log) => (
                  <tr key={log.id} className={TR}>
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">#{log.id}</td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{log.tenant}</td>
                    <td className="py-3 px-4 text-slate-500">{titleCase(log.event)}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{log.recipient}</td>
                    <td className="py-3 px-4"><StatusBadge label={titleCase(log.status)} tone={stateTone(log.status)} /></td>
                    <td className="py-3 px-4 text-slate-500 font-mono">{log.latency_ms === null || log.latency_ms === undefined ? DASH : `${log.latency_ms} ms`}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{dateTime(log.timestamp)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onInspect({ type: 'email_log', identifier: `Email #${log.id}`, details: log })}
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
      )}
    </div>
  );
}
