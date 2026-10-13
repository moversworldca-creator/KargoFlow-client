import React, { useState } from 'react';
import { Search } from 'lucide-react';
import StatusBadge from './StatusBadge';
import ProviderCredentialsCard from './ProviderCredentialsCard';
import { CARD, EmptyRow, Field, INPUT, Stat, SubTabs, TH_ROW, TR } from './parts';
import { DASH, ago, count, dateTime, money, percent, stateTone, titleCase } from './format';

export default function TelnyxSubSuiteTab({
  telnyxData, health, canManage, busy, onTestPing, onOpenRotateKey, onOpenSettings, onOpenDisableProvider, onResume, onInspect,
}) {
  const [subTab, setSubTab] = useState('inventory');
  const [search, setSearch] = useState('');
  const config = telnyxData?.config || { provider: 'telnyx', state: 'unconfigured' };
  const numbers = telnyxData?.numbers || [];
  const logs = telnyxData?.sms_logs || [];
  const queue = telnyxData?.pipeline_queue || {};
  const costs = telnyxData?.costs || {};
  const term = search.trim().toLowerCase();
  const filtered = numbers.filter((n) => !term || n.phone_number.includes(term) || (n.tenant_name || '').toLowerCase().includes(term)
    || (n.provider_number_id || '').toLowerCase().includes(term));

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <SubTabs
        active={subTab} onChange={setSubTab}
        tabs={[
          { id: 'inventory', label: `Number inventory (${numbers.length})` },
          { id: 'logs', label: `SMS log (${logs.length})` },
          { id: 'api', label: 'API & credentials' },
          { id: 'costs', label: 'Provisioning & costs' },
        ]}
      />

      {subTab === 'inventory' && (
        <div className={`${CARD} overflow-hidden`}>
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Tenant phone numbers</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {count(config.active_did_numbers)} active · {count(config.provisioning_pending)} provisioning · {count(config.suspended_numbers)} suspended or failed
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className={`${INPUT} pl-9`} placeholder="Search number, tenant or provider ID" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={TH_ROW}>
                  <th className="py-3 px-4">Number</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Tenant</th>
                  <th className="py-3 px-4">Assigned to</th>
                  <th className="py-3 px-4">Provider ID</th>
                  <th className="py-3 px-4">State</th>
                  <th className="py-3 px-4">Registration</th>
                  <th className="py-3 px-4">Monthly rental</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 && (
                  <EmptyRow colSpan={9}>{numbers.length ? 'No number matches the search.' : 'No tenant owns a phone number yet.'}</EmptyRow>
                )}
                {filtered.map((num) => (
                  <tr key={`${num.company_id}-${num.id}`} className={TR}>
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">{num.phone_number}</td>
                    <td className="py-3 px-4 text-slate-500">{titleCase(num.type)}</td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800 dark:text-slate-200 block">{num.tenant_name}</span>
                      {num.tenant_code && <span className="text-[10px] text-slate-400 font-mono">{num.tenant_code}</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {num.assignment_type === 'branch' ? `Branch${num.branch_hub ? ` · ${num.branch_hub}` : ''}` : titleCase(num.assignment_type)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{num.provider_number_id || DASH}</td>
                    <td className="py-3 px-4"><StatusBadge label={titleCase(num.operational_state)} tone={stateTone(num.operational_state)} /></td>
                    <td className="py-3 px-4">
                      <StatusBadge label={titleCase(num.sms_eligibility)} tone={stateTone(num.sms_eligibility)} dot={false} />
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">{money(num.monthly_cost, num.currency)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onInspect({ type: 'number', identifier: num.phone_number, details: num })}
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

      {subTab === 'logs' && (
        <div className={`${CARD} overflow-hidden`}>
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">SMS delivery log</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              The latest texts sent through Telnyx for any tenant. Destinations are masked and message content is never shown here.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={TH_ROW}>
                  <th className="py-3 px-4">Message</th>
                  <th className="py-3 px-4">Tenant</th>
                  <th className="py-3 px-4">Origin</th>
                  <th className="py-3 px-4">From</th>
                  <th className="py-3 px-4">To</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Segments</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.length === 0 && <EmptyRow colSpan={9}>No SMS has been sent yet.</EmptyRow>}
                {logs.map((log) => (
                  <tr key={log.id} className={TR}>
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">#{log.id}</td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{log.tenant}</td>
                    <td className="py-3 px-4 text-slate-500">{titleCase(log.event)}</td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">{log.sending_did}</td>
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{log.destination}</td>
                    <td className="py-3 px-4"><StatusBadge label={titleCase(log.status)} tone={stateTone(log.status)} /></td>
                    <td className="py-3 px-4 font-mono text-slate-500">{count(log.segments)}</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{dateTime(log.timestamp)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onInspect({ type: 'sms_log', identifier: `SMS #${log.id}`, details: log })}
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

      {subTab === 'api' && (
        <>
          <ProviderCredentialsCard
            config={config} health={health} canManage={canManage} busy={busy} onTestPing={onTestPing} onOpenRotateKey={onOpenRotateKey}
            onOpenSettings={onOpenSettings} onOpenSuspend={onOpenDisableProvider} onResume={onResume}
            extraFields={<Field label="Messaging profile ID" mono>{config.messaging_profile || DASH}</Field>}
          />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Sent today" value={count(config.dispatched_today)} hint={`${count(config.delivered_today)} delivered`} />
            <Stat
              label="Failure rate" value={percent(config.carrier_rejection_pct)} hint={`${count(config.failed_today)} failed today`}
              tone={config.carrier_rejection_pct > 5 ? 'bad' : undefined}
            />
            <Stat label="Sent this month" value={count(config.dispatched_month)} hint={`${count(config.segments_month)} segments`} />
            <Stat
              label="Queue" value={count(config.queued)}
              hint={config.oldest_queued_at ? `Oldest queued ${ago(config.oldest_queued_at)}` : 'Nothing waiting'}
              tone={config.queued > 0 ? 'warn' : undefined}
            />
          </div>
        </>
      )}

      {subTab === 'costs' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={`${CARD} p-6 space-y-4`}>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Number orders in progress</h3>
              <p className="text-xs text-slate-400 mt-0.5">Orders tenants have confirmed that Telnyx has not finished provisioning.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Stat
                label="Awaiting provisioning" value={count(queue.awaiting_count)}
                hint={queue.oldest_awaiting_at ? `Oldest placed ${ago(queue.oldest_awaiting_at)}` : 'None waiting'}
                tone={queue.awaiting_count > 0 ? 'warn' : undefined}
              />
              <Stat label="Failed, last 7 days" value={count(queue.failed_last_7_days)} tone={queue.failed_last_7_days > 0 ? 'bad' : undefined} />
            </div>
          </div>
          <div className={`${CARD} p-6 space-y-4`}>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Recurring number rentals</h3>
              <p className="text-xs text-slate-400 mt-0.5">Monthly rental as quoted by Telnyx when each number was bought.</p>
            </div>
            <Stat
              label="Monthly rentals" value={money(costs.base_rentals_monthly, costs.currency)}
              hint={`${count((config.active_did_numbers || 0) + (config.provisioning_pending || 0) + (config.suspended_numbers || 0))} numbers held`}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Per-message carrier charges, what tenants are billed and the resulting margin are not shown: the platform does not
              record usage charges, and the billing policy for numbers has not been decided.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
