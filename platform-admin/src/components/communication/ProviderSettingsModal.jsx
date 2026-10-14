import React, { useEffect, useState } from 'react';
import { Settings2, X, Loader2 } from 'lucide-react';
import { useModal } from '../../hooks/useModal';
import { useToast } from '../../context/ToastContext';
import platformApi from '../../api/platformApi';
import { useInvalidatePlatformQueries } from '../../hooks/usePlatformData';
import { BTN, BTN_PRIMARY, INPUT } from './parts';
import { PROVIDER_LABEL, apiError } from './format';

const FIELDS = {
  resend: [
    ['region', 'Region', 'us-east-1'],
    ['default_sender', 'Default system sender', 'notifications@example.com'],
  ],
  telnyx: [['messaging_profile_id', 'Messaging profile ID', 'Telnyx messaging profile used for sends and number orders']],
};

/** Non-secret provider settings plus the (write-only) webhook signing secret. */
export default function ProviderSettingsModal({ isOpen, onClose, provider = 'resend', config }) {
  useModal(isOpen, onClose);
  const { showToast } = useToast();
  const { invalidateCommunication } = useInvalidatePlatformQueries();
  const [accountId, setAccountId] = useState('');
  const [values, setValues] = useState({});
  const [webhookSecret, setWebhookSecret] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setAccountId(config?.organization_id || '');
    setValues({
      region: config?.region || '',
      default_sender: config?.default_sender || '',
      messaging_profile_id: config?.messaging_profile || '',
    });
    setWebhookSecret('');
  }, [isOpen, provider, config]);

  if (!isOpen) return null;
  const label = PROVIDER_LABEL[provider] || provider;
  const fields = FIELDS[provider] || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const secret = webhookSecret.trim();
    if (secret && (secret.length < 16 || /\s/.test(secret))) {
      showToast('Enter the full webhook signing secret (no spaces).', 'error');
      return;
    }
    const payload = {
      provider,
      provider_account_id: accountId.trim(),
      settings: Object.fromEntries(fields.map(([name]) => [name, (values[name] || '').trim()])),
    };
    if (secret) payload.webhook_secret = secret;
    setIsSubmitting(true);
    try {
      await platformApi.configureCommunicationProvider(payload);
      showToast(`${label} settings saved.`, 'success');
      invalidateCommunication();
      onClose();
    } catch (err) {
      showToast(apiError(err, `${label} settings could not be saved.`), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800/40">
              <Settings2 size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{label} settings</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Recorded in the audit trail</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">{label} account ID</label>
            <input className={`${INPUT} font-mono`} value={accountId} onChange={(e) => setAccountId(e.target.value)} maxLength={255} />
          </div>
          {fields.map(([name, title, placeholder]) => (
            <div key={name}>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">{title}</label>
              <input
                className={`${INPUT} font-mono`} value={values[name] || ''} placeholder={placeholder} maxLength={300}
                onChange={(e) => setValues((current) => ({ ...current, [name]: e.target.value }))}
              />
            </div>
          ))}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">
              Webhook signing secret {config?.webhook_secret_set ? '(set — leave empty to keep it)' : '(not set)'}
            </label>
            <input
              type="password" autoComplete="off" spellCheck={false} className={`${INPUT} font-mono`}
              value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder={provider === 'resend' ? 'whsec_…' : 'Telnyx public key'}
            />
            <p className="text-[11px] text-slate-400 mt-1">Stored encrypted and never displayed again.</p>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" className={BTN} onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className={BTN_PRIMARY} disabled={isSubmitting}>
              {isSubmitting && <Loader2 size={14} className="animate-spin" />} Save settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
