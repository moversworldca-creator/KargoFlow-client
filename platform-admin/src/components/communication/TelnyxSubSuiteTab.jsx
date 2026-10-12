import React, { useState } from 'react';
import { 
  Phone, Search, RefreshCw, Key, Shield, Cable, 
  DollarSign, TrendingUp, CheckCircle2, AlertTriangle, 
  Layers, Check, Copy, Eye, EyeOff, Radio, ArrowRight
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function TelnyxSubSuiteTab({ 
  telnyxData, 
  onTestPing, 
  onOpenRotateKey, 
  onInspect 
}) {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState('inventory');
  const [searchNumber, setSearchNumber] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const config = telnyxData?.config || {};
  const numbers = telnyxData?.numbers || [];
  const smsLogs = telnyxData?.sms_logs || [];
  const costs = telnyxData?.costs || {
    wholesale_expense_monthly: 1894.20,
    base_rentals_expense: 1280.00,
    saas_metered_billing_monthly: 4720.00,
    margin_pct: 59.8,
  };

  const filteredNumbers = numbers.filter((n) =>
    n.phone_number.includes(searchNumber) ||
    n.tenant_name.toLowerCase().includes(searchNumber.toLowerCase()) ||
    n.provider_number_id.toLowerCase().includes(searchNumber.toLowerCase())
  );

  const copyText = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    showToast(`Copied ${label} to clipboard.`, 'success');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Telnyx Secondary Sub Tab Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 text-xs font-bold">
        {[
          { id: 'inventory', label: `Number Inventory (${numbers.length > 0 ? '1,280' : 0})` },
          { id: 'pipeline', label: 'Provisioning Pipeline (14 Active)' },
          { id: 'messaging', label: 'Messaging Logs (Redacted)' },
          { id: 'api', label: 'API & Messaging Profile' },
          { id: 'costs', label: 'Carrier Costs vs SaaS Metering' },
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

      {/* 3.A: NUMBER INVENTORY VIEW */}
      {subTab === 'inventory' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Global Provisioned Phone Numbers</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300">
                  1,280 Total DIDs
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Carrier-assigned DIDs mapped to tenant organizations, dispatch centers, and CRM pipelines.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search number, tenant..."
                  value={searchNumber}
                  onChange={(e) => setSearchNumber(e.target.value)}
                  className="pl-8.5 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Country</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Owning Tenant</th>
                  <th className="py-3 px-4">Assignment Type</th>
                  <th className="py-3 px-4">Provider Number ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">SMS Eligibility</th>
                  <th className="py-3 px-4">Monthly Cost</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredNumbers.map((num) => {
                  const isHold = num.sms_eligibility === 'Hold';
                  return (
                    <tr key={num.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {num.phone_number}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">{num.country}</td>
                      <td className="py-3 px-4 text-slate-500">{num.type}</td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800 dark:text-slate-200 block">{num.tenant_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{num.tenant_org_id}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                          {num.assignment_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{num.provider_number_id}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          num.provisioning_status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${num.provisioning_status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          {num.provisioning_status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          isHold
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                        }`}>
                          {num.sms_eligibility}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300 font-bold whitespace-nowrap">
                        {num.monthly_cost}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => onInspect({
                            type: 'number',
                            identifier: num.phone_number,
                            details: num,
                          })}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
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
      )}

      {/* 3.B: NUMBER PROVISIONING PIPELINE MONITOR */}
      {subTab === 'pipeline' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Real-Time Telnyx Provisioning Pipeline</h3>
            <p className="text-xs text-slate-400 mt-0.5">Step-by-step carrier fulfillment flow from tenant order request to active cellular routing.</p>
          </div>

          {/* Provisioning Flow Diagram */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center">
            {[
              { step: 1, title: 'Order Created', sub: 'Tenant Initiated', status: 'completed' },
              { step: 2, title: 'Provider Accept', sub: 'Telnyx API ACK', status: 'completed' },
              { step: 3, title: 'Regulatory Check', sub: '10DLC / Identity', status: 'current' },
              { step: 4, title: 'Number Assigned', sub: 'DID Mapped', status: 'pending' },
              { step: 5, title: 'Profile Bind', sub: 'Webhook & Route', status: 'pending' },
              { step: 6, title: 'Active Service', sub: 'Ready for Traffic', status: 'pending' },
            ].map((s) => (
              <div 
                key={s.step} 
                className={`p-4 rounded-xl border transition-all ${
                  s.status === 'completed'
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
                    : s.status === 'current'
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto text-xs font-bold ${
                  s.status === 'completed'
                    ? 'bg-emerald-600 text-white'
                    : s.status === 'current'
                    ? 'bg-amber-500 text-white animate-pulse'
                    : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {s.step}
                </span>
                <div className="text-xs font-bold text-slate-900 dark:text-white mt-2.5">{s.title}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="font-bold text-slate-900 dark:text-white">Current Pipeline Queue:</span>
            <span className="text-slate-500 dark:text-slate-400 ml-2">
              14 numbers awaiting regulatory brand validation (Avg cycle: 8 minutes).
            </span>
          </div>
        </div>
      )}

      {/* 3.C: TELNYX MESSAGING LOGS */}
      {subTab === 'messaging' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Redacted Carrier SMS Delivery Pipeline</h3>
              <p className="text-xs text-slate-400 mt-0.5">Carrier status codes (DLSR) received from Telnyx webhooks.</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
              Carrier Handshake: TLS 1.3
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Telnyx Message ID</th>
                  <th className="py-3 px-4">Tenant Name</th>
                  <th className="py-3 px-4">Sending DID</th>
                  <th className="py-3 px-4">Redacted Destination</th>
                  <th className="py-3 px-4">Carrier Status</th>
                  <th className="py-3 px-4">DLSR Code</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {smsLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">{log.id}</td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{log.tenant}</td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">{log.sending_did}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{log.destination}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{log.dlsr_code}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onInspect({
                          type: 'sms_log',
                          identifier: log.id,
                          details: log,
                        })}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
                      >
                        Inspect Meta
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3.D: TELNYX API CONFIG */}
      {subTab === 'api' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800 gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Telnyx Master API &amp; Profile Binding</h3>
              <p className="text-xs text-slate-400 mt-0.5">Root carrier integration token controlling wholesale DID provisioning.</p>
            </div>
            <button
              onClick={() => onOpenRotateKey('Telnyx')}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw size={14} />
              <span>Rotate Carrier API Key</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                Telnyx API V2 Key
              </label>
              <div className="flex items-center gap-2">
                <input
                  type={showKey ? 'text' : 'password'}
                  readOnly
                  value="KEY018492040182_9400281_kgMaster"
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
                  onClick={() => copyText('KEY01849••••••••••••kgMaster', 'Telnyx Key Descriptor')}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                  title="Copy descriptor"
                >
                  {copiedKey ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                Messaging Profile ID
              </label>
              <input
                type="text"
                readOnly
                value="40018892-0044-42ea-9941-kargoflowMasterProfile"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3.E: CARRIER COSTS VS SAAS METERING */}
      {subTab === 'costs' && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Carrier Wholesale Costs vs Tenant SaaS Metering</h3>
            <p className="text-xs text-slate-400 mt-0.5">Comparison between wholesale Telnyx usage expenses and billed customer platform usage.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Wholesale Provider Expense (Telnyx)
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                ${costs.wholesale_expense_monthly.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                <span className="text-xs font-normal text-slate-400 ml-1.5">this month</span>
              </div>
              <div className="text-xs text-slate-400">
                Includes 1,280 DID base rentals (${costs.base_rentals_expense.toFixed(2)}) + Carrier message surcharges.
              </div>
            </div>

            <div className="p-5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                SaaS Metered Tenant Billing
              </span>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                ${costs.saas_metered_billing_monthly.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                <span className="text-xs font-normal text-slate-400 ml-1.5">billed across tenants</span>
              </div>
              <div className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                Margin: +{costs.margin_pct}% infrastructure gross operational yield.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
