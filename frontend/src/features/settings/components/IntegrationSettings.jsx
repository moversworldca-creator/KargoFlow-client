import React, { useEffect, useRef, useState } from 'react';
import {
  Phone, Mail, MessageSquare, Save,
  RefreshCw, CheckCircle2, AlertCircle, Loader2,
  ExternalLink, Shield, RadioTower, CalendarClock, Bot, Database
} from 'lucide-react';
import Card from '../../../shared/ui/Card';
import {
  getSendGridConfig, createSendGridConfig, updateSendGridConfig, testSendGridEmail,
  getResendConfig, createResendConfig, updateResendConfig, testResendEmail,
  getSMTPConfig, createSMTPConfig, updateSMTPConfig, testSMTPEmail,
  getTelnyxSMSConfig, createTelnyxSMSConfig, updateTelnyxSMSConfig, testTelnyxSMS,
  getPaymentGateways, createPaymentGateway, updatePaymentGateway, verifyPaymentGateway,
  getPaymentRequests, getPayments, createPaymentRequest, createRefund,
  getBranches,
} from '../../../services/api';
import { useAuth } from '../../auth/context/AuthContext';
import useCan from '../../../shared/auth/useCan';
import { useToast } from '../../../shared/context/ToastContext';
import { PERMISSIONS } from '../../../shared/permissions/registry';
import { filterAccessibleBranches } from '../../../shared/utils/branchScope';

const EMPTY_SG = {
  api_key: '',
  sender_email: '',
  is_active: false
};

const EMPTY_RS = {
  api_key: '',
  sender_email: '',
  is_active: false
};

const EMPTY_TW = {
  api_key: '',
  from_phone_number: '',
  webhook_public_key: '',
  is_active: false
};

const EMPTY_SMTP = {
  host: '',
  port: 587,
  username: '',
  password: '',
  sender_email: '',
  use_tls: true,
  use_ssl: false,
  is_active: false
};

const PAYMENT_PROVIDERS = [
  { key: 'authorize_net', label: 'Authorize.net', fields: ['api_login_id', 'transaction_key', 'signature_key'] },
  { key: 'stripe', label: 'Stripe', fields: ['publishable_key', 'secret_key', 'webhook_signing_secret'] },
  { key: 'square', label: 'Square', fields: ['application_id', 'access_token', 'location_id', 'webhook_signature_key'] }
];

const EMPTY_PAYMENT_CONFIGS = {
  authorize_net: {
    id: null,
    provider: 'authorize_net',
    display_name: 'Authorize.net',
    environment: 'sandbox',
    is_active: false,
    status: 'draft',
    last_verified_at: null,
    last_verification_error: '',
    webhook_url_override: '',
    provider_config: { api_login_id: '', transaction_key: '', signature_key: '' }
  },
  stripe: {
    id: null,
    provider: 'stripe',
    display_name: 'Stripe',
    environment: 'sandbox',
    is_active: false,
    status: 'draft',
    last_verified_at: null,
    last_verification_error: '',
    webhook_url_override: '',
    provider_config: { publishable_key: '', secret_key: '', webhook_signing_secret: '' }
  },
  square: {
    id: null,
    provider: 'square',
    display_name: 'Square',
    environment: 'sandbox',
    is_active: false,
    status: 'draft',
    last_verified_at: null,
    last_verification_error: '',
    webhook_url_override: '',
    provider_config: { application_id: '', access_token: '', location_id: '', webhook_signature_key: '' }
  }
};

const normalizeListResponse = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
};

const pickPreferredConfig = (rows = []) => {
  if (!rows.length) return null;
  const active = rows.find((r) => Boolean(r?.is_active));
  if (active) return active;
  return rows[0];
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

const hydratePaymentConfigs = (rows = []) => {
  const next = JSON.parse(JSON.stringify(EMPTY_PAYMENT_CONFIGS));
  rows.forEach((row) => {
    if (!row?.provider || !next[row.provider]) return;
    next[row.provider] = {
      ...next[row.provider],
      ...row,
      provider_config: {
        ...next[row.provider].provider_config,
        ...(row.provider_config || {}),
      },
    };
  });
  return next;
};

const PAYMENT_FIELD_META = {
  api_login_id: { label: 'API Login ID' },
  transaction_key: { label: 'Transaction Key', secret: true },
  signature_key: { label: 'Signature Key', secret: true },
  publishable_key: { label: 'Publishable Key' },
  secret_key: { label: 'Secret Key', secret: true },
  webhook_signing_secret: { label: 'Webhook Signing Secret', secret: true },
  application_id: { label: 'Application ID' },
  access_token: { label: 'Access Token', secret: true },
  location_id: { label: 'Location ID' },
  webhook_signature_key: { label: 'Webhook Signature Key', secret: true },
};

const MASKED_SECRET_PREFIX = '****';

const sanitizePaymentProviderConfig = (providerKey, providerConfig = {}) => {
  const next = {};
  Object.entries(providerConfig || {}).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    const trimmed = typeof value === 'string' ? value.trim() : value;
    if (trimmed === '') return;
    // Keep masked secrets so frontend validation doesn't force re-entry on subsequent saves.
    // Backend serializer will ignore masked secrets and keep the existing stored value.
    next[key] = trimmed;
  });
  return next;
};

const validatePaymentGatewayPayload = (providerKey, payload) => {
  const cfg = payload.provider_config || {};

  if (providerKey === 'authorize_net') {
    if (!cfg.api_login_id) return 'API Login ID is required.';
    if (!cfg.transaction_key) return 'Transaction Key is required.';
    if (cfg.api_login_id && cfg.api_login_id.length < 5) return 'API Login ID looks too short.';
  }

  if (providerKey === 'stripe') {
    if (!cfg.publishable_key) return 'Publishable Key is required.';
    if (!cfg.secret_key) return 'Secret Key is required.';
    if (cfg.publishable_key && !/^pk_(test|live)_/.test(cfg.publishable_key)) {
      return 'Publishable Key must start with pk_test_ or pk_live_.';
    }
    if (cfg.secret_key && !/^sk_(test|live)_/.test(cfg.secret_key)) {
      return 'Secret Key must start with sk_test_ or sk_live_.';
    }
  }

  if (providerKey === 'square') {
    if (!cfg.application_id) return 'Application ID is required.';
    if (!cfg.access_token) return 'Access Token is required.';
    // Square credential formats vary (sandbox/production, token types). Presence is enough here.
  }

  return '';
};

const statusLabel = (status) => {
  if (status === 'verified') return 'Verified';
  if (status === 'failed') return 'Verification Failed';
  if (status === 'draft') return 'Configured';
  return 'Not Configured';
};

const formatTimestamp = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString();
};

const paymentGatewaySummary = (config) => {
  const baseState = config.is_active ? 'Active' : 'Inactive';
  if (config.status === 'verified') {
    const verifiedAt = formatTimestamp(config.last_verified_at);
    return verifiedAt ? `${baseState}. Verified ${verifiedAt}.` : `${baseState}. Verified and ready for later payment flows.`;
  }
  if (config.status === 'failed') {
    return config.last_verification_error
      ? `${baseState}. Last verify failed: ${config.last_verification_error}`
      : `${baseState}. Verification failed.`;
  }
  if (config.id) {
    return `${baseState}. Configuration saved. Run Verify to confirm provider access.`;
  }
  return `${baseState}. Save credentials to create this provider configuration.`;
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
          disabled={isTesting}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-primary bg-subtle hover:bg-[#d4e9f4] transition-colors disabled:opacity-50"
        >
          {isTesting ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {testLabel}
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
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
      <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-xs font-medium animate-in fade-in slide-in-from-top-2 ${
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
      className="w-full bg-card ring-1 ring-disabled/30 focus:ring-0 border-b-2 border-transparent focus:border-primary px-3 sm:px-4 py-2.5 rounded-lg outline-none text-sm font-medium transition-all shadow-sm"
    />
    {helperText ? (
      <p className="text-xs text-body/80 ml-1 leading-snug">{helperText}</p>
    ) : null}
  </div>
);

const ToggleField = ({ label, checked, onChange }) => (
  <div className="md:col-span-2 flex items-center justify-between rounded-xl border border-subtle bg-page px-4 py-3">
    <label className="text-sm font-medium text-heading">{label}</label>
    <input
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 accent-[#CC1F1F]"
    />
  </div>
);

const IntegrationStatusCard = ({ label, icon, isConnected, isConfigured, detail }) => {
  const IconComponent = icon;
  const statusLabel = isConnected ? 'Connected' : isConfigured ? 'Configured' : 'Not Connected';
  const statusClass = isConnected ? 'text-primary' : isConfigured ? 'text-[#8a6b00]' : 'text-[#791F1F]';
  const cardClass = isConnected
    ? 'border-primary-light bg-primary-light/10'
    : isConfigured
      ? 'border-[#f3df9b] bg-[#fff9e8]'
      : 'border-[#e3f0f8] bg-white';
  return (
  <div className={`rounded-2xl border ${cardClass} p-4`}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <IconComponent size={16} className="text-[#00513f]" />
        <p className="text-sm font-bold text-[#111d23]">{label}</p>
      </div>
      <span className={`text-[0.625rem] font-bold uppercase tracking-widest ${statusClass}`}>
        {statusLabel}
      </span>
    </div>
    <p className="text-xs text-body mt-2">{detail}</p>
  </div>
  );
};

const ComingSoonCard = ({ title, icon, detail }) => {
  const IconComponent = icon;
  return (
  <div className="rounded-2xl border border-dashed border-[#bec9c3] bg-white/70 p-4">
    <div className="flex items-center gap-2">
      <IconComponent size={16} className="text-[#506169]" />
      <p className="text-sm font-bold text-[#111d23]">{title}</p>
    </div>
    <p className="text-xs text-body mt-2">{detail}</p>
    <p className="text-[0.625rem] font-bold uppercase tracking-widest text-body mt-3">Coming Soon</p>
  </div>
  );
};

const safeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
};

const money = (value, currency = 'CAD') => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return String(value || '');
  return amount.toLocaleString('en-CA', { style: 'currency', currency, minimumFractionDigits: 2 });
};

const IntegrationSettings = ({ branchId = null }) => {
  const { hasPermission, isLoading: authLoading, user } = useAuth();
  const { canAll } = useCan();
  const { showToast } = useToast();
  const fetchSequenceRef = useRef(0);
  const [activeCategory, setActiveCategory] = useState('overview');
  const [sgConfig, setSgConfig] = useState(EMPTY_SG);
  const [rsConfig, setRsConfig] = useState(EMPTY_RS);
  const [smtpConfig, setSmtpConfig] = useState(EMPTY_SMTP);
  const [existingSmtpConfigId, setExistingSmtpConfigId] = useState(null);
  const [twConfig, setTwConfig] = useState(EMPTY_TW);
  const [paymentGateways, setPaymentGateways] = useState(EMPTY_PAYMENT_CONFIGS);
  const [sgTestEmail, setSgTestEmail] = useState('');
  const [rsTestEmail, setRsTestEmail] = useState('');
  const [smtpTestEmail, setSmtpTestEmail] = useState('');
  const [twTestPhone, setTwTestPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [paymentActivity, setPaymentActivity] = useState({ requests: [], payments: [], loading: false, error: '' });
  const [paymentDraft, setPaymentDraft] = useState({ estimate_id: '', payment_option: 'deposit', payment_gateway_id: '' });
  const [refundDraft, setRefundDraft] = useState({ payment_id: '', amount: '' });
  const [paymentActionBusy, setPaymentActionBusy] = useState(false);
  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState(branchId ? String(branchId) : '');

  useEffect(() => {
    if (branchId !== null) {
      setBranchFilter(String(branchId));
    }
  }, [branchId]);

  const [states, setStates] = useState({
    sg: { isSaving: false, isTesting: false, result: null },
    rs: { isSaving: false, isTesting: false, result: null },
    smtp: { isSaving: false, isTesting: false, result: null },
    tw: { isSaving: false, isTesting: false, result: null },
    authorize_net: { isSaving: false, isTesting: false, result: null },
    stripe: { isSaving: false, isTesting: false, result: null },
    square: { isSaving: false, isTesting: false, result: null }
  });

  useEffect(() => {
    if (authLoading) return;
    fetchConfigs();
  }, [authLoading, user, branchFilter]);

  useEffect(() => {
    (async () => {
      try {
        const branchRows = filterAccessibleBranches(user, normalizeListResponse(getResponseData(await getBranches())));
        setBranches(branchRows);
        if (!branchFilter && branchRows.length) setBranchFilter(String(branchRows[0].id));
      } catch {
        setBranches([]);
      }
    })();
  }, [branchFilter, user]);

  useEffect(() => {
    if (activeCategory !== 'payments') return;
    refreshPaymentActivity();
  }, [activeCategory]);

  const refreshPaymentActivity = async () => {
    setPaymentActivity((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const [requestsRes, paymentsRes] = await Promise.all([getPaymentRequests(), getPayments()]);
      const requests = normalizeListResponse(getResponseData(requestsRes));
      const payments = normalizeListResponse(getResponseData(paymentsRes));
      setPaymentActivity({ requests, payments, loading: false, error: '' });
    } catch (err) {
      setPaymentActivity({ requests: [], payments: [], loading: false, error: getErrorMessage(err, 'Unable to load payment activity.') });
    }
  };

  const setResult = (type, result, timeoutMs = 4000) => {
    setStates((prev) => ({ ...prev, [type]: { ...prev[type], result } }));
    if (result) {
      setTimeout(() => {
        setStates((prev) => ({ ...prev, [type]: { ...prev[type], result: null } }));
      }, timeoutMs);
    }
  };

  const fetchConfigs = async () => {
    const requestId = ++fetchSequenceRef.current;
    const selectedBranchId = branchFilter ? Number(branchFilter) : null;

    setLoading(true);
    setSgConfig({ ...EMPTY_SG, branch: selectedBranchId });
    setRsConfig({ ...EMPTY_RS, branch: selectedBranchId });
    setSmtpConfig({ ...EMPTY_SMTP, branch: selectedBranchId });
    setExistingSmtpConfigId(null);
    setTwConfig({ ...EMPTY_TW, branch: selectedBranchId });
    setPaymentGateways(JSON.parse(JSON.stringify(EMPTY_PAYMENT_CONFIGS)));

    const safeFetch = async (requestFn, emptyValue) => {
      try {
        return await requestFn();
      } catch (err) {
        if (err?.response?.status === 403) return emptyValue;
        throw err;
      }
    };

    try {
      const [sg, rs, smtp, tw, paymentGatewayRows] = await Promise.all([
        safeFetch(() => getSendGridConfig(branchFilter ? { branch: branchFilter } : undefined), []),
        safeFetch(() => getResendConfig(branchFilter ? { branch: branchFilter } : undefined), []),
        safeFetch(() => getSMTPConfig(branchFilter ? { branch: branchFilter } : undefined), []),
        safeFetch(() => getTelnyxSMSConfig(branchFilter ? { branch: branchFilter } : undefined), []),
        safeFetch(() => getPaymentGateways(branchFilter ? { branch: branchFilter } : undefined), []),
      ]);

      const sgRow = pickPreferredConfig(normalizeListResponse(getResponseData(sg)));
      const rsRow = pickPreferredConfig(normalizeListResponse(getResponseData(rs)));
      const smtpRow = pickPreferredConfig(normalizeListResponse(getResponseData(smtp)));
      const twRow = pickPreferredConfig(normalizeListResponse(getResponseData(tw)));

      if (requestId !== fetchSequenceRef.current) return;

      setSgConfig(sgRow ? { ...EMPTY_SG, ...sgRow } : { ...EMPTY_SG, branch: selectedBranchId });
      setRsConfig(rsRow ? { ...EMPTY_RS, ...rsRow } : { ...EMPTY_RS, branch: selectedBranchId });
      setSmtpConfig(smtpRow ? { ...EMPTY_SMTP, ...smtpRow } : { ...EMPTY_SMTP, branch: selectedBranchId });
      setExistingSmtpConfigId(smtpRow?.id || null);
      setTwConfig(twRow ? { ...EMPTY_TW, ...twRow } : { ...EMPTY_TW, branch: selectedBranchId });
      setPaymentGateways(hydratePaymentConfigs(normalizeListResponse(getResponseData(paymentGatewayRows))));
    } catch (err) {
      if (requestId !== fetchSequenceRef.current) return;
      if (err?.response?.status !== 403) {
        console.error('Failed to fetch configurations:', err);
      }
    } finally {
      if (requestId === fetchSequenceRef.current) {
        setLoading(false);
      }
    }
  };

  const buildPayload = (type, config) => {
    if (type === 'sg') {
      return {
        api_key: String(config.api_key || '').trim(),
        sender_email: String(config.sender_email || '').trim(),
        is_active: Boolean(config.is_active),
        branch: branchFilter ? Number(branchFilter) : null,
      };
    }
    if (type === 'rs') {
      return {
        api_key: String(config.api_key || '').trim(),
        sender_email: String(config.sender_email || '').trim(),
        is_active: Boolean(config.is_active),
        branch: branchFilter ? Number(branchFilter) : null,
      };
    }
    if (type === 'smtp') {
      return {
        host: String(config.host || '').trim(),
        port: Number(config.port || 587),
        username: String(config.username || '').trim(),
        password: String(config.password || ''),
        sender_email: String(config.sender_email || '').trim(),
        use_tls: Boolean(config.use_tls),
        use_ssl: Boolean(config.use_ssl),
        is_active: Boolean(config.is_active),
        branch: branchFilter ? Number(branchFilter) : null,
      };
    }
    return {
      api_key: String(config.api_key || '').trim(),
      from_phone_number: String(config.from_phone_number || '').trim(),
      webhook_public_key: String(config.webhook_public_key || '').trim(),
      is_active: Boolean(config.is_active),
      branch: branchFilter ? Number(branchFilter) : null,
    };
  };

  const validateBeforeSave = (type, payload) => {
    if (type === 'sg') {
      if (!payload.api_key) return 'API Key is required.';
      if (!payload.sender_email) return 'Sender Email is required.';
    } else if (type === 'rs') {
      if (!payload.api_key) return 'API Key is required.';
      if (!payload.sender_email) return 'Sender Email is required.';
    } else if (type === 'smtp') {
      if (!payload.host) return 'SMTP host is required.';
      if (!payload.port) return 'SMTP port is required.';
      if (!payload.sender_email) return 'Sender Email is required.';
      if (payload.use_tls && payload.use_ssl) return 'Use either TLS or SSL, not both.';
    } else if (type === 'tw') {
      if (!payload.api_key) return 'API Key is required.';
      if (!payload.from_phone_number) return 'Telnyx phone number is required.';
    }
    return '';
  };

  const handleSave = async (type, config, createFn, updateFn, successMessage = 'Configuration saved successfully.') => {
    const writePermsByType = {
      sg: [PERMISSIONS.INTEGRATIONS_CHANGE_SENDGRID, PERMISSIONS.INTEGRATIONS_ADD_SENDGRID],
      rs: [PERMISSIONS.INTEGRATIONS_CHANGE_RESEND, PERMISSIONS.INTEGRATIONS_ADD_RESEND],
      smtp: [PERMISSIONS.INTEGRATIONS_CHANGE_SMTP, PERMISSIONS.INTEGRATIONS_ADD_SMTP],
      tw: [PERMISSIONS.INTEGRATIONS_CHANGE_TELNYX, PERMISSIONS.INTEGRATIONS_ADD_TELNYX],
    };
    if (!canAll(writePermsByType[type] || [PERMISSIONS.INTEGRATIONS_VIEW_PAYMENT_GATEWAY])) {
      showToast('You do not have permission to save integration settings.', 'warning');
      return;
    }
    setStates((prev) => ({ ...prev, [type]: { ...prev[type], isSaving: true } }));

    try {
      const payload = buildPayload(type, config);
      const validationError = validateBeforeSave(type, payload);
      if (validationError) {
        setResult(type, { type: 'error', message: validationError }, 5000);
        return;
      }

      const saved = (type === 'smtp' && existingSmtpConfigId)
        ? await updateFn(existingSmtpConfigId, payload)
        : (config.id ? await updateFn(config.id, payload) : await createFn(payload));

      if (type === 'sg') setSgConfig((prev) => ({ ...prev, ...saved }));
      if (type === 'rs') setRsConfig((prev) => ({ ...prev, ...saved }));
      if (type === 'smtp') {
        setSmtpConfig((prev) => ({ ...prev, ...saved }));
        setExistingSmtpConfigId(saved?.id || config?.id || null);
      }
      if (type === 'tw') setTwConfig((prev) => ({ ...prev, ...saved }));

      setResult(type, { type: 'success', message: successMessage });
      await fetchConfigs();
    } catch (err) {
      setResult(type, { type: 'error', message: getErrorMessage(err, 'Save failed.') }, 6000);
    } finally {
      setStates((prev) => ({ ...prev, [type]: { ...prev[type], isSaving: false } }));
    }
  };

  const handleTest = async (type, config, testFn, extraParam = null) => {
    const viewPermsByType = {
      sg: [PERMISSIONS.INTEGRATIONS_VIEW_SENDGRID],
      rs: [PERMISSIONS.INTEGRATIONS_VIEW_RESEND],
      smtp: [PERMISSIONS.INTEGRATIONS_VIEW_SMTP],
      tw: [PERMISSIONS.INTEGRATIONS_VIEW_TELNYX],
    };
    if (!canAll(viewPermsByType[type] || [PERMISSIONS.INTEGRATIONS_VIEW_PAYMENT_GATEWAY])) {
      showToast('You do not have permission to test this integration.', 'warning');
      return;
    }
    if (!config.id) {
      setResult(type, { type: 'error', message: 'Save this configuration before running a test.' }, 5000);
      return;
    }

    setStates((prev) => ({ ...prev, [type]: { ...prev[type], isTesting: true, result: null } }));

    try {
      const res = extraParam ? await testFn(config.id, extraParam) : await testFn(config.id);
      setResult(type, { type: 'success', message: res?.message || 'Connection successful.' });
    } catch (err) {
      setResult(type, { type: 'error', message: getErrorMessage(err, 'Connection test failed.') }, 6000);
    } finally {
      setStates((prev) => ({ ...prev, [type]: { ...prev[type], isTesting: false } }));
    }
  };

  const setPaymentProviderConfig = (providerKey, updater) => {
    setPaymentGateways((prev) => ({
      ...prev,
      [providerKey]: typeof updater === 'function' ? updater(prev[providerKey]) : updater,
    }));
  };

  const handleSavePaymentGateway = async (providerKey) => {
    if (!canAll([PERMISSIONS.INTEGRATIONS_CHANGE_PAYMENT_GATEWAY, PERMISSIONS.INTEGRATIONS_ADD_PAYMENT_GATEWAY])) {
      showToast('You do not have permission to save payment gateway settings.', 'warning');
      return;
    }
    const config = paymentGateways[providerKey];
    const provider_config = sanitizePaymentProviderConfig(providerKey, config.provider_config);
    const payload = {
      provider: config.provider,
      display_name: String(config.display_name || '').trim() || PAYMENT_PROVIDERS.find((item) => item.key === providerKey)?.label,
      environment: config.environment,
      is_active: Boolean(config.is_active),
      webhook_url_override: String(config.webhook_url_override || '').trim(),
      provider_config,
      branch: branchFilter ? Number(branchFilter) : null,
    };

    setStates((prev) => ({ ...prev, [providerKey]: { ...prev[providerKey], isSaving: true } }));
    try {
      const validationError = validatePaymentGatewayPayload(providerKey, payload);
      if (validationError) {
        setResult(providerKey, { type: 'error', message: validationError }, 6000);
        return;
      }

      const response = config.id
        ? await updatePaymentGateway(config.id, payload)
        : await createPaymentGateway(payload);
      const saved = getResponseData(response);
      setPaymentProviderConfig(providerKey, (current) => ({
        ...current,
        ...saved,
        provider_config: {
          ...current.provider_config,
          ...(saved.provider_config || {}),
        },
      }));
      setResult(providerKey, { type: 'success', message: `${config.display_name || 'Gateway'} configuration saved.` });
    } catch (err) {
      setResult(providerKey, { type: 'error', message: getErrorMessage(err, 'Save failed.') }, 6000);
    } finally {
      setStates((prev) => ({ ...prev, [providerKey]: { ...prev[providerKey], isSaving: false } }));
    }
  };

  const handleVerifyPaymentGateway = async (providerKey) => {
    const config = paymentGateways[providerKey];
    if (!config.id) {
      setResult(providerKey, { type: 'error', message: 'Save this gateway before verifying it.' }, 5000);
      return;
    }

    setStates((prev) => ({ ...prev, [providerKey]: { ...prev[providerKey], isTesting: true, result: null } }));
    try {
      const response = await verifyPaymentGateway(config.id);
      const result = getResponseData(response);
      setPaymentProviderConfig(providerKey, (current) => ({
        ...current,
        status: result.success ? 'verified' : 'failed',
        last_verification_error: result.success ? '' : result.message,
        last_verified_at: new Date().toISOString(),
      }));
      setResult(providerKey, {
        type: result.success ? 'success' : 'error',
        message: result.message || (result.success ? 'Connection verified.' : 'Verification failed.'),
      });
    } catch (err) {
      setResult(providerKey, { type: 'error', message: getErrorMessage(err, 'Verification failed.') }, 6000);
    } finally {
      setStates((prev) => ({ ...prev, [providerKey]: { ...prev[providerKey], isTesting: false } }));
    }
  };

  const activeVerifiedGateways = () => {
    return PAYMENT_PROVIDERS.map((p) => paymentGateways[p.key])
      .filter((g) => Boolean(g?.id) && Boolean(g?.is_active) && String(g?.status) === 'verified');
  };

  const handleCreatePaymentRequest = async () => {
    if (!canAll([PERMISSIONS.INTEGRATIONS_CHANGE_PAYMENT_GATEWAY])) {
      showToast('You do not have permission to create payment requests.', 'warning');
      return;
    }
    const estimateId = Number(paymentDraft.estimate_id);
    const gatewayId = Number(paymentDraft.payment_gateway_id);
    if (!estimateId || estimateId <= 0) {
      setPaymentActivity((prev) => ({ ...prev, error: 'Estimate ID is required.' }));
      return;
    }
    if (!gatewayId || gatewayId <= 0) {
      setPaymentActivity((prev) => ({ ...prev, error: 'Select an active verified gateway.' }));
      return;
    }
    setPaymentActionBusy(true);
    setPaymentActivity((prev) => ({ ...prev, error: '' }));
    try {
      const response = await createPaymentRequest({
        estimate_id: estimateId,
        payment_option: paymentDraft.payment_option,
        payment_gateway_id: gatewayId,
      });
      const created = getResponseData(response);
      await refreshPaymentActivity();
      if (created?.checkout_url) {
        window.open(created.checkout_url, '_blank', 'noopener,noreferrer');
      }
      setPaymentDraft((prev) => ({ ...prev, estimate_id: '' }));
    } catch (err) {
      setPaymentActivity((prev) => ({ ...prev, error: getErrorMessage(err, 'Unable to create payment request.') }));
    } finally {
      setPaymentActionBusy(false);
    }
  };

  const handleCreateRefund = async () => {
    if (!canAll([PERMISSIONS.INTEGRATIONS_CHANGE_PAYMENT_GATEWAY])) {
      showToast('You do not have permission to create refunds.', 'warning');
      return;
    }
    const paymentId = Number(refundDraft.payment_id);
    if (!paymentId || paymentId <= 0) {
      setPaymentActivity((prev) => ({ ...prev, error: 'Payment ID is required for refund.' }));
      return;
    }
    const payload = { payment_id: paymentId };
    if (refundDraft.amount) payload.amount = refundDraft.amount;

    setPaymentActionBusy(true);
    setPaymentActivity((prev) => ({ ...prev, error: '' }));
    try {
      await createRefund(payload);
      await refreshPaymentActivity();
      setRefundDraft({ payment_id: '', amount: '' });
    } catch (err) {
      setPaymentActivity((prev) => ({ ...prev, error: getErrorMessage(err, 'Unable to create refund.') }));
    } finally {
      setPaymentActionBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

	  const CATEGORIES = [
	    { id: 'overview', label: 'Hub Overview', icon: RadioTower, detail: 'Integration health' },
	    { id: 'email', label: 'Email', icon: Mail, detail: 'SendGrid, Resend, SMTP' },
	    { id: 'sms', label: 'SMS Messaging', icon: MessageSquare, detail: 'Telnyx' },
	    { id: 'payments', label: 'Payments', icon: Shield, detail: 'Gateways' },
	    { id: 'upcoming', label: 'Upcoming', icon: CalendarClock, detail: 'Roadmap' },
	  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {!branchId && (
        <div className="flex justify-end">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="rounded-xl border border-subtle bg-white px-3 py-2 text-sm font-semibold text-heading outline-none"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {/* Horizontal Navigation Bar */}
      <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-4 no-scrollbar">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-[1.5rem] sm:rounded-[2rem] border transition-all ${
                isActive 
                  ? 'border-primary bg-primary/5 shadow-sm' 
                  : 'border-subtle bg-white hover:border-primary/20 hover:bg-page'
              }`}
            >
              <div className={`p-2 sm:p-2.5 rounded-xl ${isActive ? 'bg-primary text-white' : 'bg-subtle text-muted'}`}>
                <Icon size={18} className="sm:w-[18px] sm:h-[18px]" />
              </div>
              <div className="text-left">
                <p className={`text-xs sm:text-sm font-bold whitespace-nowrap ${isActive ? 'text-primary' : 'text-heading'}`}>
                  {cat.label}
                </p>
                <p className="text-[0.5625rem] sm:text-[0.625rem] text-body font-medium uppercase tracking-widest whitespace-nowrap">
                  {cat.detail}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="space-y-6 sm:space-y-8 min-w-0">
        {activeCategory === 'overview' && (
            <Card className="p-4 sm:p-6 md:p-8 space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-heading font-bold text-xl text-heading">Integration Hub</h3>
                  <p className="text-sm text-body mt-1">
                    Global view of your connected communication and payment services.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-page px-3 py-1 text-[0.625rem] font-bold uppercase tracking-widest text-primary">
                  <RadioTower size={12} /> Live Service Controls
                </div>
              </div>

	              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
		                <IntegrationStatusCard
		                  label="SendGrid Mail"
		                  icon={Mail}
		                  isConnected={Boolean(sgConfig.id && sgConfig.is_active)}
		                  isConfigured={Boolean(sgConfig.id)}
		                  detail="Transactional email delivery for notifications and customer communication."
		                />
		                <IntegrationStatusCard
		                  label="Resend Mail"
		                  icon={Mail}
		                  isConnected={Boolean(rsConfig.id && rsConfig.is_active)}
		                  isConfigured={Boolean(rsConfig.id)}
		                  detail="Transactional email delivery via Resend."
		                />
		                <IntegrationStatusCard
		                  label="SMTP Mail"
		                  icon={Mail}
		                  isConnected={Boolean(smtpConfig.id && smtpConfig.is_active)}
		                  isConfigured={Boolean(smtpConfig.id)}
	                  detail="Custom SMTP server delivery for transactional and operational email."
	                />
	                <IntegrationStatusCard
	                  label="Telnyx SMS"
	                  icon={MessageSquare}
	                  isConnected={Boolean(twConfig.id && twConfig.is_active)}
	                  isConfigured={Boolean(twConfig.id)}
	                  detail="SMS alerts, reminders, and automated texting workflows."
	                />
	              </div>
	            </Card>
	          )}

		          {activeCategory === 'email' && (
		            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
	              <ConfigSection
	                title="SendGrid"
	                icon={Mail}
                description="Transactional email delivery and tracking service."
                onSave={() => handleSave('sg', sgConfig, createSendGridConfig, updateSendGridConfig)}
                onTest={() => handleTest('sg', sgConfig, testSendGridEmail, sgTestEmail)}
                isSaving={states.sg.isSaving}
                isTesting={states.sg.isTesting}
                testResult={states.sg.result}
                testLabel="Send Test"
              >
                <InputField label="API Key" value={sgConfig.api_key} onChange={(v) => setSgConfig({ ...sgConfig, api_key: v })} secret />
                <InputField label="Sender Email" value={sgConfig.sender_email} onChange={(v) => setSgConfig({ ...sgConfig, sender_email: v })} placeholder="noreply@yourdomain.com" type="email" />
                <ToggleField label="Integration Active" checked={sgConfig.is_active} onChange={(value) => setSgConfig({ ...sgConfig, is_active: value })} />
	                <InputField label="Test Recipient" value={sgTestEmail} onChange={setSgTestEmail} placeholder="recipient@example.com" type="email" />
	              </ConfigSection>

	              <ConfigSection
	                title="Resend"
	                icon={Mail}
	                description="Transactional email delivery via Resend."
	                onSave={() => handleSave('rs', rsConfig, createResendConfig, updateResendConfig)}
	                onTest={() => handleTest('rs', rsConfig, testResendEmail, rsTestEmail)}
	                isSaving={states.rs.isSaving}
	                isTesting={states.rs.isTesting}
	                testResult={states.rs.result}
	                testLabel="Send Test"
	              >
	                <InputField label="API Key" value={rsConfig.api_key} onChange={(v) => setRsConfig({ ...rsConfig, api_key: v })} secret />
	                <InputField label="Sender Email" value={rsConfig.sender_email} onChange={(v) => setRsConfig({ ...rsConfig, sender_email: v })} placeholder="noreply@yourdomain.com" type="email" />
	                <ToggleField label="Integration Active" checked={rsConfig.is_active} onChange={(value) => setRsConfig({ ...rsConfig, is_active: value })} />
	                <InputField label="Test Recipient" value={rsTestEmail} onChange={setRsTestEmail} placeholder="recipient@example.com" type="email" />
	              </ConfigSection>

	              <ConfigSection
	                title="SMTP Mail"
	                icon={Mail}
	                description="Email delivery via your own SMTP server."
                onSave={() => handleSave('smtp', smtpConfig, createSMTPConfig, updateSMTPConfig)}
                onTest={() => handleTest('smtp', smtpConfig, testSMTPEmail, smtpTestEmail)}
                isSaving={states.smtp.isSaving}
                isTesting={states.smtp.isTesting}
                testResult={states.smtp.result}
                testLabel="Send Test"
              >
                <InputField label="SMTP Host" value={smtpConfig.host} onChange={(v) => setSmtpConfig({ ...smtpConfig, host: v })} placeholder="smtp.yourdomain.com" />
                <InputField label="SMTP Port" value={smtpConfig.port} onChange={(v) => setSmtpConfig({ ...smtpConfig, port: v })} placeholder="587" />
                <InputField label="Username" value={smtpConfig.username} onChange={(v) => setSmtpConfig({ ...smtpConfig, username: v })} />
                <InputField label="Password" value={smtpConfig.password} onChange={(v) => setSmtpConfig({ ...smtpConfig, password: v })} secret />
                <InputField label="Sender Email" value={smtpConfig.sender_email} onChange={(v) => setSmtpConfig({ ...smtpConfig, sender_email: v })} placeholder="noreply@yourdomain.com" type="email" />
                <ToggleField label="Use TLS" checked={smtpConfig.use_tls} onChange={(value) => setSmtpConfig({ ...smtpConfig, use_tls: value })} />
                <ToggleField label="Use SSL" checked={smtpConfig.use_ssl} onChange={(value) => setSmtpConfig({ ...smtpConfig, use_ssl: value })} />
                <ToggleField label="Integration Active" checked={smtpConfig.is_active} onChange={(value) => setSmtpConfig({ ...smtpConfig, is_active: value })} />
                <InputField label="Test Recipient" value={smtpTestEmail} onChange={setSmtpTestEmail} placeholder="recipient@example.com" type="email" />
              </ConfigSection>
            </div>
          )}

          {activeCategory === 'sms' && (
            <div className="animate-in slide-in-from-right-4 duration-500">
              <ConfigSection
                title="Telnyx SMS"
                icon={MessageSquare}
                description="Programmable SMS notifications and messaging."
                onSave={() => handleSave('tw', twConfig, createTelnyxSMSConfig, updateTelnyxSMSConfig)}
                onTest={() => handleTest('tw', twConfig, testTelnyxSMS, twTestPhone)}
                isSaving={states.tw.isSaving}
                isTesting={states.tw.isTesting}
                testResult={states.tw.result}
                testLabel="Send Test"
              >
                <InputField label="API Key" value={twConfig.api_key} onChange={(v) => setTwConfig({ ...twConfig, api_key: v })} secret />
                <InputField
                  label="Telnyx Phone Number"
                  value={twConfig.from_phone_number}
                  onChange={(v) => setTwConfig({ ...twConfig, from_phone_number: v })}
                  placeholder="+15551234567"
                  helperText="For US/Canada SMS, use a Telnyx phone number assigned to your messaging profile. Brand-name sender IDs require Telnyx Alpha Sender setup."
                />
                <InputField
                  label="Webhook Public Key"
                  value={twConfig.webhook_public_key}
                  onChange={(v) => setTwConfig({ ...twConfig, webhook_public_key: v })}
                  placeholder="Base64 public key from Telnyx Mission Control"
                  helperText="Used to verify inbound SMS webhooks for this tenant. Leave blank to use the server fallback."
                />
                <ToggleField label="Integration Active" checked={twConfig.is_active} onChange={(value) => setTwConfig({ ...twConfig, is_active: value })} />
                <InputField label="Test Phone Number" value={twTestPhone} onChange={setTwTestPhone} placeholder="+1234567890" />
              </ConfigSection>
            </div>
          )}

          {activeCategory === 'payments' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <Card className="p-4 sm:p-6 md:p-8 space-y-6 rounded-[2rem]">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="font-display font-bold text-xl text-[#111d23]">Payment Gateways</h3>
                    <p className="text-sm text-[#506169] mt-1">
                      Tenant-scoped payment providers with normalized settings.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#f4faff] px-3 py-1 text-[0.625rem] font-bold uppercase tracking-widest text-[#00513f]">
                    <Shield size={12} /> Config + Verify
                  </div>
                </div>

                {PAYMENT_PROVIDERS.map((provider) => {
                  const config = paymentGateways[provider.key];
                  const state = states[provider.key];

                  return (
                    <ConfigSection
                      key={provider.key}
                      title={provider.label}
                      icon={Shield}
                      description={`${paymentGatewaySummary(config)} Status: ${statusLabel(config.status)}.`}
                      onSave={() => handleSavePaymentGateway(provider.key)}
                      onTest={() => handleVerifyPaymentGateway(provider.key)}
                      isSaving={state.isSaving}
                      isTesting={state.isTesting}
                      testResult={state.result}
                      testLabel="Verify"
                    >
                      <InputField
                        label="Display Name"
                        value={config.display_name}
                        onChange={(value) => setPaymentProviderConfig(provider.key, { ...config, display_name: value })}
                      />
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
                      <InputField
                        label="Webhook Override"
                        value={config.webhook_url_override}
                        onChange={(value) => setPaymentProviderConfig(provider.key, { ...config, webhook_url_override: value })}
                        placeholder="Optional webhook URL override"
                      />
                      <ToggleField
                        label="Gateway Active"
                        checked={config.is_active}
                        onChange={(value) => setPaymentProviderConfig(provider.key, { ...config, is_active: value })}
                      />

                      <div className="md:col-span-2 rounded-xl border border-[#e3f0f8] bg-white px-4 py-3 flex flex-col xs:flex-row xs:items-center justify-between gap-3">
                        <div>
                          <p className="text-[0.625rem] font-bold uppercase tracking-widest text-[#506169]">Connection Status</p>
                          <p className="text-sm font-medium text-[#111d23] mt-1">{statusLabel(config.status)}</p>
                          {config.last_verified_at && (
                            <p className="text-xs text-[#506169] mt-1">Last checked: {formatTimestamp(config.last_verified_at)}</p>
                          )}
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
                          <p className="text-xs font-bold uppercase tracking-widest text-[#00513f]">Advanced Provider Fields</p>
                          <p className="text-sm text-[#506169] mt-1">
                            Fields specific to {provider.label}.
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
                                secret={Boolean(meta.secret)}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </ConfigSection>
                  );
                })}
              </Card>

              <Card className="p-4 sm:p-6 md:p-8 space-y-6 rounded-[2rem]">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="font-display font-bold text-xl text-[#111d23]">Payment Activity</h3>
                    <p className="text-sm text-[#506169] mt-1">Create payment requests and monitor payments/refunds.</p>
                  </div>
                  <button
                    type="button"
                    onClick={refreshPaymentActivity}
                    disabled={paymentActivity.loading}
                    className="inline-flex items-center gap-2 rounded-full bg-[#f4faff] px-3 py-2 text-[0.625rem] font-bold uppercase tracking-widest text-[#00513f] disabled:opacity-60"
                  >
                    <RefreshCw size={12} className={paymentActivity.loading ? 'animate-spin' : ''} /> Refresh
                  </button>
                </div>

                {paymentActivity.error ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-red-700">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{paymentActivity.error}</p>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="rounded-2xl border border-[#e3f0f8] bg-white p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-widest text-[#506169]">Create Payment Request</p>
                      <span className="text-[0.625rem] font-bold uppercase tracking-widest text-[#506169]">Opens checkout</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InputField
                        label="Estimate ID"
                        value={paymentDraft.estimate_id}
                        onChange={(value) => setPaymentDraft((prev) => ({ ...prev, estimate_id: value }))}
                        placeholder="e.g. 123"
                      />
                      <div className="space-y-1.5">
                        <label className="text-[0.625rem] font-bold uppercase tracking-widest text-[#506169] ml-1">Payment Option</label>
                        <select
                          value={paymentDraft.payment_option}
                          onChange={(e) => setPaymentDraft((prev) => ({ ...prev, payment_option: e.target.value }))}
                          className="w-full bg-white ring-1 ring-[#bec9c3]/30 border-b-2 border-transparent focus:border-[#00513f] px-3 sm:px-4 py-2.5 rounded-lg outline-none text-sm font-medium transition-all shadow-sm"
                        >
                          <option value="deposit">Deposit</option>
                          <option value="full">Full</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-[0.625rem] font-bold uppercase tracking-widest text-[#506169] ml-1">Gateway</label>
                        <select
                          value={paymentDraft.payment_gateway_id}
                          onChange={(e) => setPaymentDraft((prev) => ({ ...prev, payment_gateway_id: e.target.value }))}
                          className="w-full bg-white ring-1 ring-[#bec9c3]/30 border-b-2 border-transparent focus:border-[#00513f] px-3 sm:px-4 py-2.5 rounded-lg outline-none text-sm font-medium transition-all shadow-sm"
                        >
                          <option value="">Select gateway</option>
                          {activeVerifiedGateways().map((gw) => (
                            <option key={gw.id} value={gw.id}>
                              {gw.display_name} ({gw.provider})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCreatePaymentRequest}
                      disabled={paymentActionBusy}
                      className="inline-flex items-center justify-center gap-2 w-full rounded-2xl bg-[#00513f] text-white px-4 py-3 text-sm font-semibold disabled:opacity-60"
                    >
                      {paymentActionBusy ? <Loader2 size={18} className="animate-spin" /> : <ExternalLink size={18} />}
                      Create & Open Checkout
                    </button>
                  </div>

                  <div className="rounded-2xl border border-[#e3f0f8] bg-white p-4 space-y-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#506169]">Refund</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InputField
                        label="Payment ID"
                        value={refundDraft.payment_id}
                        onChange={(value) => setRefundDraft((prev) => ({ ...prev, payment_id: value }))}
                        placeholder="e.g. 45"
                      />
                      <InputField
                        label="Amount (optional)"
                        value={refundDraft.amount}
                        onChange={(value) => setRefundDraft((prev) => ({ ...prev, amount: value }))}
                        placeholder="Leave empty for full refund"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateRefund}
                      disabled={paymentActionBusy}
                      className="inline-flex items-center justify-center gap-2 w-full rounded-2xl border border-[#bec9c3] bg-white px-4 py-3 text-sm font-semibold text-[#111d23] hover:bg-[#f4faff] disabled:opacity-60"
                    >
                      {paymentActionBusy ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                      Create Refund
                    </button>
                    <p className="text-xs text-[#506169]">
                      Refund status finalizes via provider webhooks.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="rounded-2xl border border-[#e3f0f8] bg-white p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-[#506169]">Payment Requests</p>
                      <span className="text-[0.625rem] font-bold uppercase tracking-widest text-[#506169]">
                        {paymentActivity.requests.length} shown
                      </span>
                    </div>
                    <div className="overflow-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs uppercase tracking-widest text-[#506169]">
                            <th className="py-2 pr-4">ID</th>
                            <th className="py-2 pr-4">Estimate</th>
                            <th className="py-2 pr-4">Option</th>
                            <th className="py-2 pr-4">Amount</th>
                            <th className="py-2 pr-4">Status</th>
                            <th className="py-2 pr-4">Link</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eef2f4]">
                          {paymentActivity.requests.slice(0, 50).map((row) => (
                            <tr key={row.id}>
                              <td className="py-2 pr-4 font-semibold text-[#111d23]">{row.id}</td>
                              <td className="py-2 pr-4">{row.estimate_id}</td>
                              <td className="py-2 pr-4">{row.payment_option}</td>
                              <td className="py-2 pr-4">{money(row.amount, row.currency || 'CAD')}</td>
                              <td className="py-2 pr-4">
                                <span className="inline-flex items-center rounded-full bg-[#f4faff] px-2 py-1 text-[0.625rem] font-bold uppercase tracking-widest text-[#00513f]">
                                  {row.status}
                                </span>
                              </td>
                              <td className="py-2 pr-4">
                                {row.checkout_url ? (
                                  <a href={row.checkout_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#00513f] font-semibold">
                                    Open <ExternalLink size={14} />
                                  </a>
                                ) : (
                                  <span className="text-[#506169]">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#e3f0f8] bg-white p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-[#506169]">Payments</p>
                      <span className="text-[0.625rem] font-bold uppercase tracking-widest text-[#506169]">
                        {paymentActivity.payments.length} shown
                      </span>
                    </div>
                    <div className="overflow-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs uppercase tracking-widest text-[#506169]">
                            <th className="py-2 pr-4">ID</th>
                            <th className="py-2 pr-4">Amount</th>
                            <th className="py-2 pr-4">Status</th>
                            <th className="py-2 pr-4">Captured</th>
                            <th className="py-2 pr-4">Refunded</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#eef2f4]">
                          {paymentActivity.payments.slice(0, 50).map((row) => (
                            <tr key={row.id}>
                              <td className="py-2 pr-4 font-semibold text-[#111d23]">{row.id}</td>
                              <td className="py-2 pr-4">{money(row.amount, row.currency || 'CAD')}</td>
                              <td className="py-2 pr-4">
                                <span className="inline-flex items-center rounded-full bg-[#f4faff] px-2 py-1 text-[0.625rem] font-bold uppercase tracking-widest text-[#00513f]">
                                  {row.status}
                                </span>
                              </td>
                              <td className="py-2 pr-4">{row.captured_at ? formatTimestamp(row.captured_at) : '-'}</td>
                              <td className="py-2 pr-4">{row.refunded_amount ? money(row.refunded_amount, row.currency || 'CAD') : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeCategory === 'upcoming' && (
            <div className="animate-in slide-in-from-right-4 duration-500">
              <Card className="p-4 sm:p-6 md:p-8 space-y-4 rounded-[2rem]">
                <div>
                  <h4 className="font-heading font-bold text-lg text-heading">Other Integrations</h4>
                  <p className="text-sm text-body">Additional providers planned for future rollout.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ComingSoonCard
                    title="Calendar Sync"
                    icon={CalendarClock}
                    detail="Two-way sync for move schedules, callbacks, and internal task dates."
                  />
                  <ComingSoonCard
                    title="AI Assistant"
                    icon={Bot}
                    detail="Conversation summarization and follow-up drafting."
                  />
                  <ComingSoonCard
                    title="Accounting"
                    icon={Database}
                    detail="Invoice and payment export connectors (QuickBooks, Xero)."
                  />
                </div>
              </Card>
            </div>
	          )}
	        </div>
	    </div>
	  );
};

export default IntegrationSettings;
