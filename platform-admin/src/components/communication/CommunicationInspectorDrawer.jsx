import React from 'react';
import { 
  X, Shield, CheckCircle2, Copy, RefreshCw, 
  ExternalLink, FileCode, Radio, Globe, Phone,
  Layers, Lock, Server, Terminal, Check
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function CommunicationInspectorDrawer({ isOpen, onClose, inspectData, onRefreshCarrier }) {
  const { showToast } = useToast();
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !inspectData) return null;

  const { type, identifier, details } = inspectData;

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast(`Copied ${label} to clipboard.`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {type === 'domain' && 'Resend Domain DNS Inspector'}
                {type === 'number' && 'Telnyx Number Details & Regulatory Status'}
                {(type === 'email_log' || type === 'sms_log' || type === 'event' || type === 'audit_item') && 'Raw Security & Routing Metadata'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300">
                Super Admin Scope
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1.5">
              <h2 className="text-lg font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {identifier}
              </h2>
              {type === 'number' && (
                <span className="text-xs text-slate-500 font-medium">({details?.type || 'US Local 10DLC'})</span>
              )}
            </div>

            {type === 'number' && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-1.5 font-mono">
                <span>Provider ID: <code className="text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">{details?.provider_number_id || 'num_telnyx_v3_98a71b40e'}</code></span>
                <span>&bull;</span>
                <span>Tenant: <strong className="text-slate-800 dark:text-slate-200">{details?.tenant_name || 'Apex Relocation Group'}</strong></span>
              </div>
            )}

            {type === 'number' && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> ACTIVE / PROVISIONED
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400">
                  <CheckCircle2 size={12} /> 10DLC REGISTERED (TCR)
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <Shield size={12} /> A2P BRAND VERIFIED
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* TYPE A: DOMAIN INSPECTION */}
          {type === 'domain' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Domain Details</span>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">{identifier}</div>
                <div className="text-xs text-slate-500 mt-0.5">Registered through Cloudflare &bull; DNSSEC Enabled</div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                  DKIM Records (2048-bit RSA)
                </h4>
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs space-y-1.5">
                  <div className="text-slate-500 dark:text-slate-400">Host: <strong className="text-slate-800 dark:text-slate-200">resend._domainkey.{identifier}</strong></div>
                  <div className="text-slate-500 dark:text-slate-400">Type: <strong className="text-slate-800 dark:text-slate-200">CNAME</strong></div>
                  <div className="text-emerald-600 dark:text-emerald-400 break-all font-semibold">Value: dkim.resend.com &bull; Verified</div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                  SPF Record
                </h4>
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs space-y-1.5">
                  <div className="text-slate-500 dark:text-slate-400">Type: <strong className="text-slate-800 dark:text-slate-200">TXT</strong></div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-semibold">Value: &quot;v=spf1 include:resend.com ~all&quot; &bull; Aligned</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                <strong>Zero-Knowledge Note:</strong> Domain verification records are publicly verifiable DNS entries. No private tenant emails can be intercepted through this console.
              </div>
            </div>
          )}

          {/* TYPE B: TELNYX NUMBER TELEMETRY */}
          {type === 'number' && (
            <div className="space-y-4">
              {/* Provider Specs */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Radio size={14} className="text-blue-600" /> a. Provider Identity &amp; Specifications
                  </h4>
                  <span className="font-mono text-[11px] text-slate-400">Tier 1 CLEC Routing</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Carrier / Provider:</span>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5">Telnyx LLC (US-WEST Tier-1 CLEC)</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Number Type:</span>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5">Local Geographic (San Francisco, CA)</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Emergency Calling (E911):</span>
                    <div className="text-slate-500 mt-0.5">Disabled / CRM SMS only</div>
                  </div>
                  <div>
                    <span className="text-slate-400">CNAM / Caller ID:</span>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                      <CheckCircle2 size={13} /> {details?.cnam || '"APEX RELOCATIONS"'} (Verified)
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">Inbound SIP Trunk / Routing:</span>
                    <div className="font-mono text-xs text-slate-900 dark:text-white mt-1 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span>Platform Default Hosted SMS Trunk</span>
                      <code className="text-blue-600 font-bold">trunk_kargo_sms_prod_01</code>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tenant Ownership */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Layers size={14} className="text-purple-600" /> b. Tenant Ownership &amp; CRM Assignment
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300">
                    Single Tenant Dedicated
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Tenant Company:</span>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5">{details?.tenant_name || 'Apex Relocation Logistics Corp'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Tenant ID:</span>
                    <div className="font-mono text-blue-600 font-bold mt-0.5">{details?.tenant_org_id || 'tenant_apex_8891'}</div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">Assigned CRM Purpose:</span>
                    <div className="font-medium text-slate-900 dark:text-white mt-0.5">Automated Move Notifications &amp; Lead SMS Reminders ({details?.assignment_type || 'Branch Automation'})</div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">Primary Branch:</span>
                    <div className="font-medium text-slate-900 dark:text-white mt-0.5">{details?.branch_hub || 'San Francisco Bay Area Hub (Branch ID: br_sf_001)'}</div>
                  </div>
                </div>
              </div>

              {/* Regulatory 10DLC */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Shield size={14} className="text-emerald-600" /> c. Regulatory &amp; Carrier Compliance (10DLC / TCR)
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                    TCR Compliant
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Campaign Type:</span>
                    <div className="font-medium text-slate-900 dark:text-white mt-0.5">Customer Care &amp; Operational Logistics Updates</div>
                  </div>
                  <div>
                    <span className="text-slate-400">TCR Campaign ID:</span>
                    <div className="font-mono text-blue-600 font-bold mt-0.5">{details?.tcr_campaign_id || 'CAMP_TCR_98317A_MIGR'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">A2P Brand Status:</span>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                      <CheckCircle2 size={13} /> Verified (Trust Score: 88/100)
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Throughput / Rate Limit:</span>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5">{details?.mps_limit || 30} MPS <span className="text-slate-400 font-normal text-[11px]">(Msg/sec)</span></div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">Carrier Vetting Status:</span>
                    <div className="flex items-center gap-2 mt-1.5">
                      {['AT&T Approved', 'T-Mobile Approved', 'Verizon Approved'].map((carrier) => (
                        <span key={carrier} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {carrier}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Billing Rates */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Server size={14} className="text-amber-600" /> d. Provider Billing &amp; Wholesale Rates
                  </h4>
                  <span className="font-mono text-[11px] text-slate-400">Direct Carrier Passthrough</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Wholesale Recurring Rate:</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">{details?.monthly_cost || '$1.15 / month'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Outbound SMS Rate:</span>
                    <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">$0.0079 / segment</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TYPE C: RAW JSON PAYLOAD VIEWER */}
          {(type === 'email_log' || type === 'sms_log' || type === 'event' || type === 'audit_item') && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Audit Reference</span>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">{identifier}</div>
                <div className="text-xs text-slate-500 mt-0.5">Timestamp: {new Date().toISOString()} &bull; Cluster Edge #02</div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Redacted JSON Payload (Zero PII Governance)
                </span>
                <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
{JSON.stringify({
  event_id: identifier,
  provider_channel: type === 'email_log' ? 'Resend (Email)' : 'Telnyx (SMS)',
  carrier_status: details?.status || 'PROCESSED',
  tls_version: 'TLSv1.3',
  cipher: 'TLS_AES_256_GCM_SHA384',
  recipient_mask: details?.recipient || details?.destination || '•••••••@domain.corp',
  audit_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  staff_actor: 'automated_system',
  governance: 'Section 2.4 - Zero Knowledge Enforced',
}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {type === 'number' && (
                <button
                  onClick={() => {
                    if (onRefreshCarrier) onRefreshCarrier();
                    showToast('Carrier status query dispatched to Telnyx CLEC edge (68ms).', 'info');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw size={14} />
                  <span>Refresh Carrier Status</span>
                </button>
              )}
              <button
                onClick={() => handleCopy(identifier, 'Identifier')}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>Copy Diagnostic Ref</span>
              </button>
            </div>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
            <Lock size={12} />
            <span>All status queries and audit logs are recorded under Platform Security Audit (Section 2.4).</span>
          </div>
        </div>
      </div>
    </div>
  );
}
