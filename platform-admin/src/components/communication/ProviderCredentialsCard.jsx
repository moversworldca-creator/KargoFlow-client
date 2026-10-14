import React from 'react';
import { Cable, KeyRound, Settings2, ShieldAlert, PlayCircle, Copy } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import StatusBadge from './StatusBadge';
import { BTN, BTN_DANGER, BTN_PRIMARY, CARD, Field } from './parts';
import { DASH, PROVIDER_LABEL, ago, dateTime, healthBadge, percent } from './format';

const KEY_SOURCE = {
  db: 'Encrypted in the platform database',
  env: 'Server environment variable',
  vault: 'Server secret store',
  fakefile: 'Simulated (fake provider mode)',
  memory: 'Simulated (fake provider mode)',
};

/**
 * Credentials and connection state of one Kargo-managed provider. The key
 * itself never reaches the browser: only a hint of it is shown.
 */
export default function ProviderCredentialsCard({
  config, health, canManage, busy, extraFields, onTestPing, onOpenRotateKey, onOpenSettings, onOpenSuspend, onResume,
}) {
  const { showToast } = useToast();
  const label = PROVIDER_LABEL[config.provider] || config.provider;
  const suspended = config.state === 'suspended';
  // Same status as the tab strip and the health view: one source, the server.
  const badge = healthBadge(health?.status || config.state);

  const copyEndpoint = async () => {
    try {
      await navigator.clipboard.writeText(config.webhook_endpoint);
      showToast('Webhook address copied.', 'success');
    } catch {
      showToast('Could not copy to the clipboard.', 'error');
    }
  };

  return (
    <div className={`${CARD} p-6 space-y-6`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{label} API credentials</h3>
            <StatusBadge label={badge.label} tone={badge.tone} />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            One platform-wide account serves every tenant. The key is stored encrypted and is never shown again after it is saved.
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <button className={BTN} disabled={busy} onClick={() => onTestPing(config.provider)}>
              <Cable size={14} /> Test connection
            </button>
            <button className={BTN} disabled={busy} onClick={() => onOpenSettings(config.provider)}>
              <Settings2 size={14} /> Settings
            </button>
            <button className={BTN_PRIMARY} disabled={busy} onClick={() => onOpenRotateKey(config.provider)}>
              <KeyRound size={14} /> {config.configured ? 'Rotate key' : 'Set API key'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <Field label="API key" mono>{config.api_key_masked || (config.configured ? 'Set (no hint recorded)' : 'Not set')}</Field>
        <Field label="Key storage">{KEY_SOURCE[config.key_source] || DASH}</Field>
        <Field label="Account ID" mono>{config.organization_id || DASH}</Field>
        <Field label="Last rotated">
          {config.last_rotated_at ? `${dateTime(config.last_rotated_at)}${config.last_rotated_by ? ` by ${config.last_rotated_by}` : ''}` : DASH}
        </Field>
        <Field label="Last connection test">
          {config.last_validated_at
            ? `${config.last_validation_ok ? 'Passed' : 'Failed'} ${ago(config.last_validated_at)}${
                config.last_validation_latency_ms !== null && config.last_validation_latency_ms !== undefined
                  ? ` (${config.last_validation_latency_ms} ms)` : ''}`
            : 'Never tested'}
        </Field>
        {extraFields}
      </div>

      {config.last_validation_ok === false && config.last_validation_detail && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300">
          Last test failed: {config.last_validation_detail}
        </div>
      )}

      <div className="pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Webhook address to register with {label}</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 break-all">
              {config.webhook_endpoint}
            </code>
            <button className={BTN} onClick={copyEndpoint}><Copy size={14} /> Copy</button>
          </div>
          {!config.webhook_endpoint?.startsWith('http') && (
            <p className="text-[11px] text-slate-400 mt-1">Path on the API host (the public API address is not configured on the server).</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-5">
          <Field label="Signing secret">{config.webhook_secret_set ? 'Set' : 'Not set'}</Field>
          <Field label="Webhook events (24h)">
            {config.webhook_events_24h
              ? `${config.webhook_events_24h.toLocaleString()} · ${percent(config.webhook_health_pct)} processed`
              : 'None received'}
          </Field>
        </div>
      </div>

      {canManage && (config.configured || suspended) && (
        <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {suspended ? (
            <>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                Suspended {ago(config.suspended_at) || ''}{config.suspended_by ? ` by ${config.suspended_by}` : ''}. Nothing is sent through {label}; queued messages wait.
              </p>
              <button className={BTN_PRIMARY} disabled={busy} onClick={() => onResume(config.provider)}>
                <PlayCircle size={14} /> Resume {label}
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Emergency stop: holds all outbound {config.provider === 'resend' ? 'Branch email' : 'SMS'} for every tenant until resumed.
              </p>
              <button className={BTN_DANGER} disabled={busy || config.state !== 'active'} onClick={() => onOpenSuspend(config.provider)}>
                <ShieldAlert size={14} /> Suspend {label}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
