import React, { useEffect, useState } from 'react';
import { Save, RefreshCw, CheckCircle2, AlertCircle, Loader2, Shield } from 'lucide-react';
import Card from '../../../shared/ui/Card';
import { getAuthorizeNetSettings, saveAuthorizeNetSettings, verifyAuthorizeNetSettings } from '../../../services/api';
import { useAuth } from '../../auth/context/AuthContext';
import useCan from '../../../shared/auth/useCan';
import { useToast } from '../../../shared/context/ToastContext';

const PAYMENT_PROVIDERS = [
  { key: 'authorize_net', label: 'Authorize.net', fields: ['api_login_id', 'transaction_key', 'signature_key'] },
];

const EMPTY_PAYMENT_CONFIGS = {
  authorize_net: {
    id: null,
    provider: 'authorize_net',
    display_name: 'Authorize.net',
    environment: 'sandbox',
    is_active: false,
    status: 'draft',
    provider_config: { api_login_id: '', transaction_key: '', signature_key: '' }
  },
};

const getErrorMessage = (err, fallback) => {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (typeof data.message === 'string') return data.message;
  if (typeof data.detail === 'string') return data.detail;

  const firstField = Object.keys(data)[0];
  if (!firstField) return fallback;
  const value = data[firstField];
  if (Array.isArray(value) && value.length) return value[0];
  if (typeof value === 'string') return value;
  return fallback;
};

const getResponseData = (payload) => payload?.data ?? payload;

const hydratePaymentConfigs = (config = {}) => ({
  authorize_net: {
    ...EMPTY_PAYMENT_CONFIGS.authorize_net,
    ...config,
    id: config.api_login_id ? 'authorize_net' : null,
    provider_config: { api_login_id: config.api_login_id || '', transaction_key: '', signature_key: '' },
  },
});

const PAYMENT_FIELD_META = {
  api_login_id: { label: 'API Login ID' },
  transaction_key: { label: 'Transaction Key', secret: true },
  signature_key: { label: 'Signature Key', secret: true },
};

const statusLabel = (status) => {
  if (status === 'verified') return 'Verified';
  if (status === 'failed') return 'Verification Failed';
  if (status === 'draft') return 'Configured';
  return 'Not Configured';
};

const ConfigSection = ({ title, icon, description, children, onSave, onTest, isSaving, isTesting, testResult, testLabel = 'Test' }) => {
  const IconComponent = icon;
  return (
  <Card className="p-4 sm:p-6 md:p-8 space-y-6 overflow-hidden relative">
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#f4faff] flex items-center justify-center text-[#00513f] flex-shrink-0">
          <IconComponent size={20} />
        </div>
        <div>
          <h3 className="font-heading font-bold text-lg text-heading">{title}</h3>
          <p className="text-sm text-body">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <button
          onClick={onTest}
          disabled={isTesting || isSaving}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-primary bg-subtle hover:bg-[#d4e9f4] transition-colors disabled:opacity-50"
        >
          {isTesting ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {testLabel}
        </button>
        <button
          onClick={onSave}
          disabled={isSaving || isTesting}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save
        </button>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
      {children}
    </div>

    {testResult && (
      <div role="status" aria-live="polite" className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-xs font-medium animate-in fade-in slide-in-from-top-2 ${
        testResult.type === 'success' ? 'bg-primary-tint/30 text-primary' : 'bg-[#FDE8E8]/30 text-[#791F1F]'
      }`}>
        {testResult.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
        {testResult.message}
      </div>
    )}
  </Card>
  );
};

const InputField = ({ label, value, onChange, placeholder, type = 'text', secret = false, helperText = '' }) => (
  <div className="space-y-1.5">
    <label className="text-[0.625rem] font-bold uppercase tracking-widest text-body ml-1">{label}</label>
    <input
      type={type === 'password' ? 'password' : (secret ? 'password' : type)}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={label}
      className="w-full bg-card ring-1 ring-disabled/30 focus:ring-0 border-b-2 border-transparent focus:border-primary px-3 sm:px-4 py-2.5 rounded-lg outline-none text-sm font-medium transition-all shadow-sm"
    />
    {helperText ? (
      <p className="text-xs text-body/80 ml-1 leading-snug">{helperText}</p>
    ) : null}
  </div>
);

const ToggleField = ({ label, checked, onChange }) => (
  <div className="md:col-span-2 flex items-center justify-between rounded-xl border border-subtle bg-page px-4 py-3">
    <label className="flex w-full items-center justify-between gap-4 text-sm font-medium text-heading">{label}<input
      aria-label={label}
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 accent-[#CC1F1F]"
    /></label>
  </div>
);

const IntegrationSettings = () => {
  const { isLoading: authLoading, user } = useAuth();
  const { canAll } = useCan();
  const { showToast } = useToast();
  const [paymentGateways, setPaymentGateways] = useState(EMPTY_PAYMENT_CONFIGS);
  const [gatewayLoaded, setGatewayLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [states, setStates] = useState({ authorize_net: { isSaving: false, isTesting: false, result: null } });

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    getAuthorizeNetSettings().then((response) => {
      if (!active) return;
      setPaymentGateways(hydratePaymentConfigs(getResponseData(response)));
      setGatewayLoaded(true);
      setLoading(false);
    }).catch((error) => {
      if (!active) return;
      setGatewayLoaded(false);
      setLoading(false);
      setStates((current) => ({ ...current, authorize_net: { ...current.authorize_net,
        result: { type: 'error', message: getErrorMessage(error, 'Authorize.Net settings could not be loaded. Refresh before saving.') },
      } }));
    });
    return () => { active = false; };
  }, [authLoading, user?.id]);

  const setResult = (providerKey, result) => {
    setStates((current) => ({ ...current, [providerKey]: { ...current[providerKey], result } }));
  };

  const setPaymentProviderConfig = (providerKey, updater) => {
    setPaymentGateways((prev) => ({
      ...prev,
      [providerKey]: typeof updater === 'function' ? updater(prev[providerKey]) : updater,
    }));
  };

  const handleSavePaymentGateway = async (providerKey) => {
    if (!gatewayLoaded) {
      setResult(providerKey, { type: 'error', message: 'Refresh to load saved settings before saving.' });
      return;
    }
    if (!canAll(['settings.manage'])) {
      showToast('You do not have permission to save payment gateway settings.', 'warning');
      return;
    }
    const config = paymentGateways[providerKey];
    const payload = {
      environment: config.environment,
      is_active: Boolean(config.is_active),
      api_login_id: config.provider_config.api_login_id.trim(),
      transaction_key: config.provider_config.transaction_key.trim(),
      signature_key: config.provider_config.signature_key.trim(),
    };

    setStates((prev) => ({ ...prev, [providerKey]: { ...prev[providerKey], isSaving: true } }));
    try {
      if (!payload.api_login_id || (!payload.transaction_key && !config.has_transaction_key)) {
        setResult(providerKey, { type: 'error', message: 'API Login ID and Transaction Key are required.' });
        return;
      }
      const saved = getResponseData(await saveAuthorizeNetSettings(payload));
      setPaymentGateways(hydratePaymentConfigs(saved));
      setResult(providerKey, { type: 'success', message: `${config.display_name || 'Gateway'} configuration saved.` });
    } catch (err) {
      setResult(providerKey, { type: 'error', message: getErrorMessage(err, 'Save failed.') });
    } finally {
      setStates((prev) => ({ ...prev, [providerKey]: { ...prev[providerKey], isSaving: false } }));
    }
  };

  const handleVerifyPaymentGateway = async (providerKey) => {
    if (!canAll(['settings.manage'])) {
      showToast('You do not have permission to verify this gateway.', 'warning');
      return;
    }
    const config = paymentGateways[providerKey];
    if (!config.id) {
      setResult(providerKey, { type: 'error', message: 'Save this gateway before verifying it.' });
      return;
    }

    setStates((prev) => ({ ...prev, [providerKey]: { ...prev[providerKey], isTesting: true, result: null } }));
    try {
      const response = await verifyAuthorizeNetSettings();
      const result = getResponseData(response);
      setPaymentProviderConfig(providerKey, (current) => ({
        ...current,
        status: result.success ? 'verified' : 'failed',

      }));
      setResult(providerKey, {
        type: result.success ? 'success' : 'error',
        message: result.message || (result.success ? 'Connection verified.' : 'Verification failed.'),
      });
    } catch (err) {
      setResult(providerKey, { type: 'error', message: getErrorMessage(err, 'Verification failed.') });
    } finally {
      setStates((prev) => ({ ...prev, [providerKey]: { ...prev[providerKey], isTesting: false } }));
    }
  };

  if (loading) {
    return <div role="status" className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" />Loading gateway settings...</div>;
  }

  return (
    <div className="space-y-6">
                {PAYMENT_PROVIDERS.map((provider) => {
                  const config = paymentGateways[provider.key];
                  const state = states[provider.key];

                  return (
                    <ConfigSection
                      key={provider.key}
                      title={provider.label}
                      icon={Shield}
                      description={'Company-wide credentials. Save changes before verifying the connection.'}
                      onSave={() => handleSavePaymentGateway(provider.key)}
                      onTest={() => handleVerifyPaymentGateway(provider.key)}
                      isSaving={state.isSaving}
                      isTesting={state.isTesting}
                      testResult={state.result}
                      testLabel="Verify"
                    >
                      <div className="space-y-1.5">
                        <label className="text-[0.625rem] font-bold uppercase tracking-widest text-[#506169] ml-1">Environment</label>
                        <select
                          value={config.environment}
                          onChange={(e) => setPaymentProviderConfig(provider.key, { ...config, environment: e.target.value })}
                          className="w-full bg-white ring-1 ring-[#bec9c3]/30 border-b-2 border-transparent focus:border-[#00513f] px-3 sm:px-4 py-2.5 rounded-lg outline-none text-sm font-medium transition-all shadow-sm"
                        >
                          <option value="sandbox">Sandbox</option>
                          <option value="production">Production</option>
                        </select>
                      </div>
                      <ToggleField
                        label="Gateway Active"
                        checked={config.is_active}
                        onChange={(value) => setPaymentProviderConfig(provider.key, { ...config, is_active: value })}
                      />

                      <div className="md:col-span-2 rounded-xl border border-[#e3f0f8] bg-white px-4 py-3 flex flex-col xs:flex-row xs:items-center justify-between gap-3">
                        <div>
                          <p className="text-[0.625rem] font-bold uppercase tracking-widest text-[#506169]">Connection Status</p>
                          <p className="text-sm font-medium text-[#111d23] mt-1">{config.id ? statusLabel(config.status) : 'Not Configured'}</p>

                        </div>
                        <span className={`text-[0.625rem] font-bold uppercase tracking-widest self-start xs:self-center ${
                          config.status === 'verified'
                            ? 'text-[#00513f]'
                            : config.status === 'failed'
                              ? 'text-[#93000a]'
                              : 'text-[#506169]'
                        }`}>
                          {config.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="md:col-span-2 rounded-xl border border-[#e3f0f8] bg-[#f4faff] p-3 sm:p-4 space-y-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest text-[#00513f]">Credentials</p>
                          <p className="text-sm text-[#506169] mt-1">
                            Leave saved secret fields blank to keep their current values. Signature Key is optional.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {provider.fields.map((field) => {
                            const meta = PAYMENT_FIELD_META[field];
                            return (
                              <InputField
                                key={field}
                                label={meta.label}
                                value={config.provider_config[field] || ''}
                                onChange={(value) =>
                                  setPaymentProviderConfig(provider.key, {
                                    ...config,
                                    provider_config: {
                                      ...config.provider_config,
                                      [field]: value,
                                    },
                                  })
                                }
                                placeholder={field === 'transaction_key' && config.has_transaction_key || field === 'signature_key' && config.has_signature_key ? 'Saved securely' : ''}
                                secret={Boolean(meta.secret)}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </ConfigSection>
                  );
                })}
    </div>
  );
};

export default IntegrationSettings;
