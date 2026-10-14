import React, { useState } from 'react';
import { ShieldAlert, X, Loader2 } from 'lucide-react';
import { useModal } from '../../hooks/useModal';
import { useToast } from '../../context/ToastContext';
import platformApi from '../../api/platformApi';
import { useInvalidatePlatformQueries } from '../../hooks/usePlatformData';
import { BTN, BTN_DANGER, INPUT } from './parts';
import { PROVIDER_LABEL, apiError } from './format';

const PHRASE = 'CONFIRM SUSPENSION';

export default function EmergencySuspensionModal({ isOpen, onClose, provider = 'resend' }) {
  useModal(isOpen, onClose);
  const { showToast } = useToast();
  const { invalidateCommunication } = useInvalidatePlatformQueries();
  const [confirmInput, setConfirmInput] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;
  const label = PROVIDER_LABEL[provider] || provider;
  const channel = provider === 'resend' ? 'Branch email (notifications and automations)' : 'SMS';

  const close = () => {
    setConfirmInput('');
    setReason('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (confirmInput !== PHRASE) {
      showToast(`Type "${PHRASE}" exactly to continue.`, 'error');
      return;
    }
    if (!reason.trim()) {
      showToast('Give a reason: it is recorded in the audit trail.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await platformApi.suspendCommunicationProvider(provider, confirmInput, reason.trim());
      showToast(res?.data?.message || `${label} is suspended.`, 'success');
      invalidateCommunication();
      close();
    } catch (err) {
      showToast(apiError(err, `${label} could not be suspended.`), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-rose-100 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20">
          <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
            <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/50 border border-rose-200 dark:border-rose-800/40">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Suspend {label}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Affects every tenant &bull; Recorded in the audit trail</p>
            </div>
          </div>
          <button onClick={close} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            While {label} is suspended, no {channel} leaves the platform for any tenant. Messages already queued are not lost:
            they stay queued or are retried, and go out after the provider is resumed. Employee mailboxes are not affected.
          </p>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Reason</label>
            <input className={INPUT} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="What is happening?" autoFocus />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">
              Type <span className="font-mono text-rose-600 dark:text-rose-400">{PHRASE}</span> to authorize
            </label>
            <input className={`${INPUT} font-mono`} value={confirmInput} onChange={(e) => setConfirmInput(e.target.value)} autoComplete="off" spellCheck={false} />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" className={BTN} onClick={close} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className={BTN_DANGER} disabled={isSubmitting || confirmInput !== PHRASE}>
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
              Suspend {label}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
