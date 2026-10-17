import React, { useState } from 'react';
import { KeyRound, Copy, Check, AlertTriangle, X } from 'lucide-react';
import { GhostBtn, PrimaryBtn } from '../../../../shared/ui/RedesignAtoms';
import { useToast } from '../../../../shared/context/ToastContext';

export default function ProviderSecretModal({ isOpen, onClose, provider, apiSecret }) {
  const toast = useToast();
  const [copiedKey, setCopiedKey] = useState('');

  if (!isOpen || !provider) return null;

  const endpointUrl = `${window.location.origin}/api/inbound/leads/${provider.provider_key}/`;

  const copyToClipboard = async (label, value) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(label);
      toast?.showSuccess?.(`Copied ${label} to clipboard`);
      setTimeout(() => setCopiedKey(''), 1800);
    } catch {
      toast?.showError?.('Failed to copy to clipboard');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Inbound Provider Credentials
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {provider.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <span className="font-bold">Save your API Secret now!</span> This secret is hashed in the database and will <strong>never</strong> be displayed again.
            </div>
          </div>

          {/* Webhook Endpoint */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Webhook Post URL
            </span>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white">
              <span className="truncate">{endpointUrl}</span>
              <button
                type="button"
                onClick={() => copyToClipboard('Endpoint URL', endpointUrl)}
                className="text-slate-400 hover:text-primary shrink-0"
              >
                {copiedKey === 'Endpoint URL' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Provider Key */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Provider Key
            </span>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white">
              <span className="truncate">{provider.provider_key}</span>
              <button
                type="button"
                onClick={() => copyToClipboard('Provider Key', provider.provider_key)}
                className="text-slate-400 hover:text-primary shrink-0"
              >
                {copiedKey === 'Provider Key' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* API Secret */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              API Secret (Header: X-Provider-Secret)
            </span>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 font-mono text-xs font-bold text-emerald-900 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300">
              <span className="truncate select-all">{apiSecret || '••••••••••••••••••••••••••••••••'}</span>
              {apiSecret && (
                <button
                  type="button"
                  onClick={() => copyToClipboard('API Secret', apiSecret)}
                  className="text-emerald-700 hover:text-emerald-900 shrink-0"
                >
                  {copiedKey === 'API Secret' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/60">
          <PrimaryBtn onClick={onClose}>
            Done & Stored
          </PrimaryBtn>
        </div>
      </div>
    </div>
  );
}
