import React, { useState } from 'react';
import { AlertTriangle, KeyRound, X, Loader2 } from 'lucide-react';
import { useModal } from '../../hooks/useModal';
import { useToast } from '../../context/ToastContext';
import platformApi from '../../api/platformApi';
import { useInvalidatePlatformQueries } from '../../hooks/usePlatformData';

export default function RotateApiKeyModal({ isOpen, onClose, provider = 'Resend' }) {
  useModal(isOpen, onClose);
  const { showToast } = useToast();
  const { invalidateCommunication } = useInvalidatePlatformQueries();
  const [newKey, setNewKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newKey.trim()) {
      showToast('Please enter the new provider API key.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await platformApi.rotateCommunicationKey(provider, newKey.trim());
      showToast(`${provider} API key rotated with 30m rolling grace period.`, 'success');
      invalidateCommunication();
      setNewKey('');
      onClose();
    } catch (err) {
      showToast(err?.response?.data?.error || `Failed to rotate ${provider} key.`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-800/40">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Rotate {provider} API Key
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Safeguard Dialog &bull; Super Admin Scope
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
            Rotating this live secret will invalidate current outbound communication credentials across all tenant microservices.
            A zero-downtime rolling grace period of <strong className="text-slate-900 dark:text-white">30 minutes</strong> will be initialized.
          </p>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              New Secret Key from {provider} Console
            </label>
            <input
              type="password"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder={`Paste newly generated ${provider} key...`}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              The system will validate this key with a test probe ping before committing changes.
            </p>
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
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Verifying &amp; Applying...</span>
                </>
              ) : (
                <>
                  <KeyRound size={14} />
                  <span>Verify &amp; Apply New Secret</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
