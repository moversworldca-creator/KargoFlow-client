import React, { useState } from 'react';
import { AlertTriangle, KeyRound, X, Loader2 } from 'lucide-react';
import { useModal } from '../../hooks/useModal';
import { useToast } from '../../context/ToastContext';
import platformApi from '../../api/platformApi';
import { useInvalidatePlatformQueries } from '../../hooks/usePlatformData';
import { BTN, BTN_PRIMARY, INPUT } from './parts';
import { PROVIDER_LABEL, apiError } from './format';

const MIN_KEY_LENGTH = 16;

export default function RotateApiKeyModal({ isOpen, onClose, provider = 'resend', hasKey = true }) {
  useModal(isOpen, onClose);
  const { showToast } = useToast();
  const { invalidateCommunication } = useInvalidatePlatformQueries();
  const [newKey, setNewKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;
  const label = PROVIDER_LABEL[provider] || provider;

  const close = () => {
    setNewKey('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const key = newKey.trim();
    if (key.length < MIN_KEY_LENGTH || /\s/.test(key)) {
      showToast(`Enter the full ${label} API key (no spaces).`, 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await platformApi.rotateCommunicationKey(provider, key);
      showToast(res?.data?.message || `${label} key saved.`, 'success');
      invalidateCommunication();
      close();
    } catch (err) {
      showToast(apiError(err, `The ${label} key could not be saved.`), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-800/40">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{hasKey ? `Rotate ${label} API key` : `Set ${label} API key`}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Applies to every tenant &bull; Recorded in the audit trail</p>
            </div>
          </div>
          <button onClick={close} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {hasKey
              ? `The new key replaces the current one immediately: the next message is sent with it. There is no grace period, so create the new key in ${label} first and revoke the old one there after a successful connection test.`
              : `The key is encrypted before it is stored and is never displayed again. ${label} becomes active as soon as it is saved.`}
          </p>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">New {label} API key</label>
            <input
              type="password" autoComplete="off" spellCheck={false} autoFocus
              className={`${INPUT} font-mono`} value={newKey} onChange={(e) => setNewKey(e.target.value)}
              placeholder={provider === 'resend' ? 're_…' : 'KEY…'}
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" className={BTN} onClick={close} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className={BTN_PRIMARY} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
              {hasKey ? 'Replace key' : 'Save key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
