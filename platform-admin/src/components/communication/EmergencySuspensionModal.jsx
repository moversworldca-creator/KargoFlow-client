import React, { useState } from 'react';
import { ShieldAlert, X, Loader2, AlertOctagon } from 'lucide-react';
import { useModal } from '../../hooks/useModal';
import { useToast } from '../../context/ToastContext';
import platformApi from '../../api/platformApi';
import { useInvalidatePlatformQueries } from '../../hooks/usePlatformData';

export default function EmergencySuspensionModal({ isOpen, onClose, provider = 'Resend' }) {
  useModal(isOpen, onClose);
  const { showToast } = useToast();
  const { invalidateCommunication } = useInvalidatePlatformQueries();
  const [confirmInput, setConfirmInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (confirmInput.trim() !== 'CONFIRM SUSPENSION') {
      showToast('Please type "CONFIRM SUSPENSION" exactly to authorize this high-impact action.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await platformApi.suspendCommunicationProvider(provider, confirmInput.trim());
      showToast(`PROVIDER SUSPENDED: ${provider} outbound queue held safely.`, 'error');
      invalidateCommunication();
      setConfirmInput('');
      onClose();
    } catch (err) {
      showToast(err?.response?.data?.error || `Failed to suspend ${provider}.`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-rose-100 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20">
          <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
            <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/50 border border-rose-200 dark:border-rose-800/40">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Emergency Provider Suspension
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                High-Impact Destructive Control
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            You are about to immediately suspend <strong className="text-rose-600 dark:text-rose-400">all outbound email and SMS activity</strong> across Kargo Flow for <strong className="text-slate-900 dark:text-white">{provider}</strong>.
          </p>

          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
            <AlertOctagon size={18} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <div>
              <strong>Consequence:</strong> Hundreds of tenant shipments, driver dispatches, and billing notices will be held in platform buffer queues until restored.
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Type &ldquo;CONFIRM SUSPENSION&rdquo; to execute:
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="CONFIRM SUSPENSION"
              className="w-full px-3.5 py-2.5 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50/30 dark:bg-slate-950 font-mono text-xs text-rose-700 dark:text-rose-400 placeholder-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
              required
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || confirmInput.trim() !== 'CONFIRM SUSPENSION'}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Suspending...</span>
                </>
              ) : (
                <>
                  <ShieldAlert size={14} />
                  <span>Suspend Provider Immediately</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
