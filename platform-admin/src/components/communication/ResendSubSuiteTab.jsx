import React, { useState } from 'react';
import { 
  Key, Shield, Cable, RefreshCw, Eye, EyeOff, Copy, 
  Check, CheckCircle2, AlertTriangle, ShieldAlert, 
  Search, ExternalLink, Globe, Lock, Activity, FileText
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function ResendSubSuiteTab({ 
  resendData, 
  onTestPing, 
  onOpenRotateKey, 
  onOpenDisableProvider, 
  onInspect 
}) {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState('api');
  const [showKey, setShowKey] = useState(false);
  const [searchDomain, setSearchDomain] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const config = resendData?.config || {};
  const domains = resendData?.domains || [];
  const deliveryLogs = resendData?.delivery_logs || [];

  const filteredDomains = domains.filter((d) => 
    d.domain.toLowerCase().includes(searchDomain.toLowerCase()) ||
    d.tenant_name.toLowerCase().includes(searchDomain.toLowerCase())
  );

  const copyText = (text, label, setFn) => {
    navigator.clipboard.writeText(text);
    setFn(true);
    showToast(`Copied ${label} to clipboard.`, 'success');
    setTimeout(() => setFn(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Resend Secondary Sub Tab Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 text-xs font-bold">
        {[
          { id: 'api', label: 'API Configuration' },
          { id: 'domains', label: `Domain Verification (${domains.length})` },
          { id: 'delivery', label: 'Delivery Logs (Redacted)' },
          { id: 'webhooks', label: 'Webhooks & Signing' },
          { id: 'diagnostics', label: 'Diagnostics & Limits' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              subTab === tab.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 2.A: API CONFIGURATION VIEW */}
      {subTab === 'api' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800 gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Resend Production API Credentials</h3>
              <p className="text-xs text-slate-400 mt-0.5">High-privilege platform master key for cross-tenant email routing.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onTestPing('Resend')}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Cable size={14} />
                <span>Test API Connection</span>
              </button>
              <button
                onClick={() => onOpenRotateKey('Resend')}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>Rotate API Key</span>
              </button>
            </div>
          </div>

          {/* Credentials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                Live API Secret Token
              </label>
              <div className="flex items-center gap-2">
                <input
                  type={showKey ? 'text' : 'password'}
                  readOnly
                  value="re_live_99kLp882nQxOp77aLz119aF4"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-900 dark:text-white focus:outline-none"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                  title={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  onClick={() => copyText('re_live_••••••••••••••••9aF4', 'API Key Masked Ref', setCopiedKey)}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                  title="Copy descriptor"
                >
                  {copiedKey ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                <span>Last Validated: <strong className="text-slate-700 dark:text-slate-300">14 mins ago</strong></span>
                <span>Last Rotated: <strong className="text-slate-700 dark:text-slate-300">18 days ago (by Admin #04)</strong></span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                Default Sending Envelope
              </label>
              <input
                type="text"
                readOnly
                value="system@kargoflow.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-900 dark:text-white focus:outline-none"
              />
              <div className="text-xs text-slate-400 pt-1">
                Fallback sender for tenants without verified custom domain DNS records.
              </div>
            </div>
          </div>

          {/* Safeguard Termination Zone */}
          <div className="pt-6 border-t border-rose-100 dark:border-rose-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400">Emergency Provider Suspension</h4>
              <p className="text-xs text-slate-400 mt-0.5">Immediately halt all outbound Resend mail dispatch across all tenant organizations.</p>
            </div>
            <button
              onClick={() => onOpenDisableProvider('Resend')}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
            >
              Disable Resend Outbound
            </button>
          </div>
        </div>
      )}

      {/* 2.B: DOMAIN VERIFICATION VIEW */}
      {subTab === 'domains' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Cross-Tenant Resend Custom Domains</h3>
              <p className="text-xs text-slate-400 mt-0.5">DKIM, SPF, and DMARC alignment status registered by platform tenants.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search domain or tenant..."
                  value={searchDomain}
                  onChange={(e) => setSearchDomain(e.target.value)}
                  className="pl-8.5 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Domain Name</th>
                  <th className="py-3 px-4">Owning Tenant</th>
                  <th className="py-3 px-4">DKIM Status</th>
                  <th className="py-3 px-4">SPF Record</th>
                  <th className="py-3 px-4">Sending Status</th>
                  <th className="py-3 px-4">Last Health Check</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDomains.map((dom) => (
                  <tr key={dom.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">{dom.domain}</td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                      {dom.tenant_name} <span className="text-slate-400 font-mono text-[11px]">({dom.tenant_code})</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        dom.dkim_status.includes('Verified')
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                      }`}>
                        {dom.dkim_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                        {dom.spf_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {dom.sending_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{dom.last_check}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onInspect({
                          type: 'domain',
                          identifier: dom.domain,
                          details: dom,
                        })}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        Inspect DNS
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2.C: DELIVERY LOGS (REDACTED) */}
      {subTab === 'delivery' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Redacted Super Admin Message Delivery Log</h3>
              <p className="text-xs text-slate-400 mt-0.5">Zero-Knowledge Governance: Subject and body content are omitted; only carrier routing &amp; error metadata is stored.</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
              PII Redaction Engine: ACTIVE
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Resend Msg ID</th>
                  <th className="py-3 px-4">Tenant</th>
                  <th className="py-3 px-4">Origin Event</th>
                  <th className="py-3 px-4">Masked Recipient</th>
                  <th className="py-3 px-4">Delivery Status</th>
                  <th className="py-3 px-4">Delivery Latency</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {deliveryLogs.map((log) => {
                  const isBounce = log.status.includes('Bounce');
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">{log.id}</td>
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{log.tenant}</td>
                      <td className="py-3 px-4 text-slate-500">{log.event}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{log.recipient}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          isBounce
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono">{log.latency}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onInspect({
                            type: 'email_log',
                            identifier: log.id,
                            details: log,
                          })}
                          className="text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
                        >
                          Inspect Meta
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2.D: WEBHOOKS & SIGNING */}
      {subTab === 'webhooks' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Resend Webhook Ingestion Pipeline</h3>
            <p className="text-xs text-slate-400 mt-0.5">TLS 1.3 incoming event listener validating HMAC-SHA256 signature tokens.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                Platform Endpoint URL
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value="https://api.kargoflow.com/v1/internal/webhooks/resend"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-xs text-slate-800 dark:text-slate-200"
                />
                <button
                  onClick={() => copyText('https://api.kargoflow.com/v1/internal/webhooks/resend', 'Endpoint URL', setCopiedWebhook)}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {copiedWebhook ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                HMAC Signature Secret
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  readOnly
                  value="whsec_884920914aKllq0091"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono text-xs text-slate-800 dark:text-slate-200"
                />
                <span className="px-2 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-400 text-[11px] font-bold rounded-lg shrink-0">
                  Enforced
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2.E: DIAGNOSTICS & LIMITS */}
      {subTab === 'diagnostics' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Live Provider Diagnostics &amp; Quotas</h3>
          <div className="p-5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-blue-900 dark:text-blue-300">
                Resend Monthly Enterprise Quota
              </span>
              <div className="text-xs text-slate-600 dark:text-slate-300">
                8,410,210 of 15,000,000 emails dispatched this billing cycle (56% utilized).
              </div>
              <div className="w-full sm:w-80 bg-blue-200 dark:bg-blue-900 h-2 rounded-full overflow-hidden mt-2">
                <div className="bg-blue-600 h-full w-[56%]" />
              </div>
            </div>
            <button
              onClick={() => showToast('Full diagnostic report copied to clipboard.', 'success')}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer self-start sm:self-auto"
            >
              Export Diagnostic Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
