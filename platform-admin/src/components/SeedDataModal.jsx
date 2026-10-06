import React, { useState } from 'react';
import { 
  Sparkles, Database, CheckCircle2, Shield, 
  Building2, CreditCard, Layers, Sliders, Key, 
  Users, History, Loader2, X, AlertCircle
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useModal } from '../hooks/useModal';
import platformApi from '../api/platformApi';

export default function SeedDataModal({ isOpen, onClose, onDataSeeded }) {
  useModal(isOpen, onClose);
  const { showToast } = useToast();
  const [selectedPreset, setSelectedPreset] = useState('standard');
  const [isSeeding, setIsSeeding] = useState(false);

  if (!isOpen) return null;

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const res = await platformApi.seedDemoData({ template: selectedPreset });
      showToast(
        res.data?.message || 'SaaS Platform Control Center seeded with test and presentation template data!',
        'success'
      );
      onDataSeeded?.();
      onClose();
    } catch (err) {
      console.error('Failed to seed platform data:', err);
      showToast(
        err?.response?.data?.error || err?.message || 'Failed to seed presentation template data',
        'error'
      );
    } finally {
      setIsSeeding(false);
    }
  };

  const DATASET_MODULES = [
    {
      icon: Building2,
      title: '10 Multi-Tenant Companies',
      desc: 'Active, Trialing, Past Due (Grace), Suspended, and Provisioning organizations with branches and contacts.',
      badge: 'All States Covered',
      badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    },
    {
      icon: CreditCard,
      title: '10 Subscriptions & Stripe Refs',
      desc: 'Monthly & yearly billing, renewal dates, past due card declined triggers, and timeline histories.',
      badge: '$3,626 MRR',
      badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
    },
    {
      icon: Layers,
      title: '4 Tiered SaaS Plans',
      desc: 'Essential ($199), Professional ($499), Enterprise Scale ($999), and Custom Corporate ($14,990/yr).',
      badge: 'Full Matrix',
      badgeColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
    },
    {
      icon: Sliders,
      title: '19 Features & 7 Add-ons',
      desc: 'Granular permissions across CRM, Operations, Finance, Automations, API, and White-Label branding.',
      badge: 'Configured',
      badgeColor: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400',
    },
    {
      icon: Shield,
      title: 'Entitlements & Overrides',
      desc: 'Tenant quota overrides (+5 users, 30k SMS waiver), feature overrides, and active assigned add-on packs.',
      badge: 'Live Overrides',
      badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    },
    {
      icon: Key,
      title: 'Controlled Support Sessions',
      desc: '2 active impersonation sessions with ticket references and live countdowns, plus historical sessions.',
      badge: '2 Live Sessions',
      badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    },
    {
      icon: Users,
      title: '7 Platform Admin Accounts',
      desc: 'Super Admin, support leads, support agent, auditor, expired, and suspended personas with MFA and scopes.',
      badge: 'RBAC Governed',
      badgeColor: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400',
    },
    {
      icon: History,
      title: '14+ Immutable Audit Logs',
      desc: 'Real audit trail logging provisioning, status shifts, overrides, support sessions, and plan changes.',
      badge: 'Audited',
      badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-linear-to-r from-purple-50/50 via-blue-50/30 to-transparent dark:from-purple-950/20 dark:via-blue-950/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20 shrink-0">
              <Sparkles size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                  Demo & Testing Suite
                </span>
                <span className="text-xs text-slate-400 font-mono">Template v2.4</span>
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Seed Presentation & Test Dataset
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSeeding}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Preset Selection */}
          <div className="space-y-2">
            <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
              Select Showcase Preset
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setSelectedPreset('standard')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  selectedPreset === 'standard'
                    ? 'border-purple-600 bg-purple-50/40 dark:bg-purple-950/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Standard Presentation Template
                  </span>
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/60 px-1.5 py-0.5 rounded-md">
                    Recommended
                  </span>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Balanced multi-tenant distribution for executive presentations, sales walk-throughs, and full QA evaluation.
                </p>
              </div>

              <div
                onClick={() => setSelectedPreset('enterprise')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  selectedPreset === 'enterprise'
                    ? 'border-purple-600 bg-purple-50/40 dark:bg-purple-950/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Enterprise Carrier Scale
                  </span>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/60 px-1.5 py-0.5 rounded-md">
                    High Volume
                  </span>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Focus on high-volume logistics carriers, extensive multi-branch networks, and custom SLA corporate tiers.
                </p>
              </div>
            </div>
          </div>

          {/* Dataset Breakdown Cards */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                Included Showcase Dataset Components
              </span>
              <span className="text-slate-400 text-[11px]">8 Integrated Modules</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DATASET_MODULES.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 flex items-start gap-2.5"
                  >
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-2xs shrink-0">
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                          {item.title}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black shrink-0 ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notice Box */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex items-start gap-2.5 text-amber-900 dark:text-amber-300">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-[11px]">
              <span className="font-bold block">Safe Ephemeral In-Memory Store:</span>
              <p className="text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
                Loading this template resets and seeds the platform control plane with complete baseline records. You can re-seed or test modifications anytime during your demonstration.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSeeding}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSeed}
            disabled={isSeeding}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-md shadow-purple-600/20"
          >
            {isSeeding ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Seeding Presentation Data...</span>
              </>
            ) : (
              <>
                <Sparkles size={15} />
                <span>Seed Presentation Template</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
