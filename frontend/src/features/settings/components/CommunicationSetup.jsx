import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Globe,
  Inbox,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import Card from '../../../shared/ui/Card';
import {
  assignSmsNumber,
  testBranchEmailIdentity,
  createBranchEmailIdentity,
  createCommunicationEmailDomain,
  getBranchCommunicationSettings,
  getCommunicationEmailDomains,
  getCommunicationMailboxes,
  getEmployees,
  getOwnedAvailableSmsNumbers,
  getSmsNumberOrders,
  getSmsNumbers,
  importSmsNumber,
  purchaseSmsNumberOrder,
  quoteSmsNumberOrder,
  refreshCommunicationEmailDomain,
  refreshSmsNumberOrder,
  searchSmsNumbers,
  startMailboxOAuth,
  syncCommunicationMailbox,
  unassignSmsNumber,
  updateBranchEmailIdentity,
  updateCommunicationEmailDomain,
  updateCommunicationMailbox,
} from '../../../services/api';
import { useToast } from '../../../shared/context/ToastContext';

const getData = (payload) => payload?.data ?? payload;
const asList = (payload) => {
  const data = getData(payload);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const errorMessage = (err, fallback) => {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (typeof data.detail === 'string') return data.detail;
  if (typeof data.message === 'string') return data.message;
  const key = Object.keys(data)[0];
  const value = key ? data[key] : null;
  if (Array.isArray(value) && value.length) return value[0];
  if (typeof value === 'string') return value;
  return fallback;
};

const isVerified = (domain) => ['verified', 'active'].includes(String(domain?.verification_state || '').toLowerCase());
const isReadyNumber = (number) => ['active', 'ready', 'provisioned'].includes(String(number?.operational_state || number?.provisioning_state || '').toLowerCase());

const StatusPill = ({ state, goodWhen = ['active', 'verified', 'ready', 'connected', 'provisioned'], children }) => {
  const normalized = String(state || '').toLowerCase();
  const good = goodWhen.includes(normalized);
  const pending = ['pending', 'provisioning', 'submitted', 'syncing', 'draft'].includes(normalized);
  const classes = good
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900'
    : pending
      ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900'
      : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${classes}`}>
      {children || state || 'Not set'}
    </span>
  );
};

const TextInput = ({ label, value, onChange, placeholder, type = 'text', className = '' }) => (
  <label className={`block space-y-1 ${className}`}>
    <span className="ml-0.5 text-[10px] font-bold uppercase tracking-widest text-body">{label}</span>
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-heading outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
    />
  </label>
);

const SelectField = ({ label, value, onChange, children, className = '' }) => (
  <label className={`block space-y-1 ${className}`}>
    <span className="ml-0.5 text-[10px] font-bold uppercase tracking-widest text-body">{label}</span>
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-heading outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
    >
      {children}
    </select>
  </label>
);

const ActionButton = ({ children, onClick, disabled, icon: Icon, type = 'button', variant = 'primary', size = 'md', className = '' }) => {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs';
  const classes = variant === 'ghost'
    ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
    : variant === 'danger'
      ? 'bg-rose-600 text-white hover:bg-rose-700'
      : 'bg-primary text-white hover:bg-primary/90';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${sizeClasses} ${classes} ${className}`}
    >
      {Icon && <Icon size={size === 'sm' ? 13 : 14} />}
      {children}
    </button>
  );
};

const EmptyState = ({ title, message }) => (
  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-center dark:border-slate-700 dark:bg-slate-900/60">
    <p className="text-xs font-bold text-heading">{title}</p>
    <p className="mt-0.5 text-[11px] text-body">{message}</p>
  </div>
);

const pickBranchSender = (identities, selectedId, defaultId) =>
  identities.find((identity) => String(identity.id) === String(selectedId))
  || identities.find((identity) => defaultId != null && String(identity.id) === String(defaultId))
  || identities.find((identity) => identity.is_default_automation_sender && identity.state === 'active')
  || identities.find((identity) => identity.state === 'active')
  || identities[0];

const checklistItem = (label, ready, detail) => ({ label, ready, detail });

export default function CommunicationSetup({ branchId = null }) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [domains, setDomains] = useState([]);
  const [numbers, setNumbers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [mailboxes, setMailboxes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [branchSettings, setBranchSettings] = useState(null);
  const refreshSequence = useRef(0);

  const [testRecipient, setTestRecipient] = useState('');
  const [testSenderId, setTestSenderId] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);
  useEffect(() => {
    setTestSenderId('');
    setTestResult(null);
  }, [branchId]);

  const [domainName, setDomainName] = useState('');
  const [identityForm, setIdentityForm] = useState({
    id: null,
    sender_name: '',
    sender_email: '',
    reply_to_mode: 'kargo_inbound',
    reply_to_email: '',
    is_default_automation_sender: true,
  });
  const [numberSearch, setNumberSearch] = useState({ country_code: 'US', area_code: '', number_type: 'local', limit: 10 });
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [quotedOrder, setQuotedOrder] = useState(null);
  const [existingNumber, setExistingNumber] = useState('');
  const [manualNumber, setManualNumber] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);
  const [ownedAvailableNumbers, setOwnedAvailableNumbers] = useState([]);
  const [assignmentForm, setAssignmentForm] = useState({ phone_number_id: '', branch_id: branchId || '', employee_id: '' });
  // Must match the backend's mailbox providers (enums.OAUTH_MAILBOX_PROVIDERS): gmail | microsoft365.
  const [mailboxProvider, setMailboxProvider] = useState('gmail');
  const [mailboxHint, setMailboxHint] = useState('');

  const refreshAll = async () => {
    const requestId = ++refreshSequence.current;
    setLoading(true);
    setBranchSettings(null);
    try {
      const [domainRes, numberRes, orderRes, mailboxRes, employeeRes, branchRes, ownedAvailableRes] = await Promise.all([
        getCommunicationEmailDomains().catch(() => []),
        getSmsNumbers().catch(() => []),
        getSmsNumberOrders().catch(() => []),
        getCommunicationMailboxes().catch(() => []),
        getEmployees({ active: true, limit: 200 }).catch(() => []),
        branchId ? getBranchCommunicationSettings(branchId).catch(() => null) : Promise.resolve(null),
        getOwnedAvailableSmsNumbers().catch(() => []),
      ]);
      if (requestId !== refreshSequence.current) return;
      setDomains(asList(domainRes));
      setNumbers(asList(numberRes));
      setOrders(asList(orderRes));
      setMailboxes(asList(mailboxRes));
      setEmployees(asList(employeeRes));
      setBranchSettings(getData(branchRes));
      const availableList = asList(ownedAvailableRes);
      setOwnedAvailableNumbers(availableList);
      if (availableList.length > 0) {
        setExistingNumber((prev) => prev || availableList[0].phone_e164);
      }
    } catch (err) {
      if (requestId === refreshSequence.current) showToast(errorMessage(err, 'Failed to load communication setup.'), 'error');
    } finally {
      if (requestId === refreshSequence.current) setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, [branchId]);

  useEffect(() => {
    const identity = pickBranchSender(branchSettings?.email_identities || [], testSenderId, branchSettings?.default_email_identity_id)
      || branchSettings?.default_email_identity || {};

    setIdentityForm({
      id: identity.id || null,
      sender_name: identity.sender_name || '',
      sender_email: identity.sender_email || '',
      reply_to_mode: identity.reply_to_mode || 'kargo_inbound',
      reply_to_email: identity.reply_to_email || '',
      is_default_automation_sender: identity.is_default_automation_sender !== false,
    });
  }, [branchSettings, testSenderId]);

  const defaultDomain = useMemo(() => domains.find((domain) => domain.is_default) || domains.find(isVerified) || domains[0], [domains]);
  const branchIdentities = branchSettings?.email_identities || [];
  const selectedTestSender = pickBranchSender(branchIdentities, testSenderId, branchSettings?.default_email_identity_id);

  const sendTestEmail = async (event) => {
    event.preventDefault();
    const recipient = testRecipient.trim();
    if (!branchId || !selectedTestSender) {
      setTestResult({ error: true, message: 'Select a branch and save a sender before sending a test email.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      setTestResult({ error: true, message: 'Enter a valid test recipient email address.' });
      return;
    }
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const result = getData(await testBranchEmailIdentity(branchId, selectedTestSender.id, recipient));
      setTestResult({ error: false, message: result?.message || 'Test email accepted for sending. Check the inbox and spam folder.' });
    } catch (err) {
      setTestResult({ error: true, message: errorMessage(err, 'Test email could not be sent. Check the sender and domain settings.') });
    } finally {
      setIsSendingTest(false);
    }
  };

  const assignedNumbers = useMemo(() => numbers.filter((number) => number.assignment || number.assignment_id || number.branch_id), [numbers]);
  const readyNumbers = useMemo(() => numbers.filter(isReadyNumber), [numbers]);

  const checklist = [
    checklistItem('Email domain added', domains.length > 0, domains[0]?.domain_name || 'Add a company sending domain'),
    checklistItem('Email domain verified', domains.some(isVerified), 'DNS records verified by Resend'),
    checklistItem('Branch sender configured', branchIdentities.length > 0, branchId ? 'Default branch sender identity' : 'Select a branch to configure senders'),
    checklistItem('SMS number ready', readyNumbers.length > 0, `${readyNumbers.length} active number${readyNumbers.length === 1 ? '' : 's'}`),
    checklistItem('SMS number assigned', assignedNumbers.length > 0, 'Assign numbers to branches or employees'),
    checklistItem('Mailbox connected', mailboxes.some((mailbox) => mailbox.connection_state === 'connected'), 'Optional reply mailbox'),
  ];
  const readyCount = checklist.filter((item) => item.ready).length;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: CheckCircle2 },
    { id: 'domains', label: 'Email Domain', icon: Globe },
    { id: 'senders', label: 'Branch Senders', icon: Mail },
    { id: 'numbers', label: 'SMS Numbers', icon: Phone },
    { id: 'mailboxes', label: 'Mailboxes', icon: Inbox },
  ];

  const withSaving = async (key, task, successMessage) => {
    setSavingKey(key);
    try {
      await task();
      if (successMessage) showToast(successMessage, 'success');
      await refreshAll();
    } catch (err) {
      showToast(errorMessage(err, 'Request failed.'), 'error');
    } finally {
      setSavingKey('');
    }
  };

  const addDomain = (e) => {
    e.preventDefault();
    if (!domainName.trim()) return showToast('Enter a domain first.', 'warning');
    return withSaving('domain', async () => {
      await createCommunicationEmailDomain({ domain_name: domainName.trim() });
      setDomainName('');
    }, 'Email domain added.');
  };

  const refreshDomain = (id) => withSaving(`domain-${id}`, () => refreshCommunicationEmailDomain(id), 'Domain verification refreshed.');

  const setDefaultDomain = (domain) => withSaving(`domain-default-${domain.id}`, () => updateCommunicationEmailDomain(domain.id, { is_default: true }), 'Default domain updated.');

  const saveIdentity = (e) => {
    e.preventDefault();
    if (!branchId) return showToast('Select a branch before saving sender settings.', 'warning');
    if (!identityForm.sender_name.trim() || !identityForm.sender_email.trim()) {
      return showToast('Sender name and sender email are required.', 'warning');
    }
    const payload = {
      sender_name: identityForm.sender_name.trim(),
      sender_email: identityForm.sender_email.trim(),
      reply_to_mode: identityForm.reply_to_mode,
      reply_to_email: identityForm.reply_to_email.trim(),
      is_default_automation_sender: Boolean(identityForm.is_default_automation_sender),
    };
    return withSaving('identity', async () => {
      if (identityForm.id) {
        const saved = getData(await updateBranchEmailIdentity(branchId, identityForm.id, payload));
        setTestSenderId(String(saved?.id || identityForm.id));
      } else {
        const saved = getData(await createBranchEmailIdentity(branchId, payload));
        if (saved?.id) setTestSenderId(String(saved.id));
      }
    }, 'Branch sender saved.');
  };

  const runNumberSearch = (e) => {
    e.preventDefault();
    if (!/^[A-Z]{2}$/.test(numberSearch.country_code.trim().toUpperCase())) {
      return showToast('Enter a two-letter country code, such as CA for Canada or US for United States. +1 is a calling code.', 'warning');
    }
    return withSaving('number-search', async () => {
      const res = await searchSmsNumbers({
        country_code: numberSearch.country_code.trim().toUpperCase(),
        area_code: numberSearch.area_code || undefined,
        number_type: numberSearch.number_type,
        limit: numberSearch.limit,
      });
      setAvailableNumbers(asList(res));
      setQuotedOrder(null);
      setSelectedNumbers([]);
    });
  };

  const quoteNumbers = () => {
    if (!selectedNumbers.length) return showToast('Select at least one number to quote.', 'warning');
    return withSaving('quote', async () => {
      const res = await quoteSmsNumberOrder({
        country_code: numberSearch.country_code.trim().toUpperCase(),
        area_code: numberSearch.area_code || '',
        number_type: numberSearch.number_type,
        requested_quantity: selectedNumbers.length,
        phone_numbers: selectedNumbers,
      });
      setQuotedOrder(getData(res));
    }, 'Number order quoted.');
  };

  const purchaseQuotedOrder = () => {
    if (!quotedOrder?.id) return showToast('Create a quote before purchasing.', 'warning');
    return withSaving('purchase', async () => {
      await purchaseSmsNumberOrder(quotedOrder.id, { confirm_cost: true });
      setQuotedOrder(null);
      setSelectedNumbers([]);
      setAvailableNumbers([]);
    }, 'Number purchase submitted.');
  };

  const importExistingNumber = (e, explicitNumber = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const rawNumber = explicitNumber || (isManualMode ? manualNumber : existingNumber);
    let cleanNumber = (rawNumber || '').trim();
    if (!cleanNumber) return showToast('Enter or select an existing Telnyx number to import.', 'warning');
    const digitsOnly = cleanNumber.replace(/\D/g, '');
    if (!cleanNumber.startsWith('+')) {
      if (digitsOnly.length === 10) cleanNumber = `+1${digitsOnly}`;
      else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) cleanNumber = `+${digitsOnly}`;
      else if (digitsOnly.length > 0) cleanNumber = `+${digitsOnly}`;
    }
    return withSaving('import-number', async () => {
      await importSmsNumber({
        phone_number: cleanNumber,
        branch_id: branchId ? Number(branchId) : undefined,
      });
      setExistingNumber('');
      setManualNumber('');
      setIsManualMode(false);
      await refreshAll();
    }, `Existing Telnyx number ${cleanNumber} imported successfully.`);
  };

  const refreshOrder = (orderId) => withSaving(`order-${orderId}`, () => refreshSmsNumberOrder(orderId), 'Order status refreshed.');

  const assignNumber = (e) => {
    e.preventDefault();
    if (!assignmentForm.phone_number_id) return showToast('Select a phone number to assign.', 'warning');
    if (!!assignmentForm.branch_id === !!assignmentForm.employee_id) {
      return showToast('Choose exactly one branch or employee for this number.', 'warning');
    }
    return withSaving('assign-number', () => assignSmsNumber(assignmentForm.phone_number_id, {
      branch_id: assignmentForm.branch_id ? Number(assignmentForm.branch_id) : null,
      employee_id: assignmentForm.employee_id ? Number(assignmentForm.employee_id) : null,
    }), 'Number assignment saved.');
  };

  const startOAuth = () => withSaving('mailbox-oauth', async () => {
    const res = await startMailboxOAuth({ provider: mailboxProvider, login_hint: mailboxHint.trim() });
    const data = getData(res);
    if (data?.authorization_url) {
      sessionStorage.setItem('mailbox_oauth_pending', JSON.stringify({ provider: mailboxProvider, state: data.state }));
      window.location.assign(data.authorization_url);
    }
  });

  const copyValue = async (value) => {
    if (!value) return;
    await navigator.clipboard?.writeText(String(value));
    showToast('Copied.', 'success', 1800);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2 text-body">
        <Loader2 className="animate-spin text-primary" size={18} />
        Loading communication setup...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 border-r border-slate-200 pr-3 dark:border-slate-700">
            <MessageSquare size={15} className="text-primary" />
            <span className="text-xs font-bold text-heading dark:text-white">Email & SMS Setup</span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-bold transition ${active ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                >
                  <Icon size={13} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        <ActionButton onClick={refreshAll} icon={RefreshCw} variant="ghost" size="sm">Refresh</ActionButton>
      </div>

      {activeTab === 'senders' && (
        <Card className="!p-4 !rounded-xl space-y-3">
          <div>
            <h3 className="text-sm font-bold text-heading">Send a test email</h3>
            <p className="mt-0.5 text-[11px] text-body">Test Resend delivery using a saved branch sender and verified domain. Save any sender changes first.</p>
          </div>
          <form onSubmit={sendTestEmail} noValidate className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <SelectField label="Test sender" value={selectedTestSender?.id || ''} onChange={(value) => { setTestSenderId(value); setTestResult(null); }}>
              {!selectedTestSender && <option value="">Select a branch and configure a sender</option>}
              {branchIdentities.map((identity) => <option key={identity.id} value={identity.id}>{identity.sender_name} — {identity.sender_email}</option>)}
            </SelectField>
            <TextInput label="Test recipient" type="email" value={testRecipient} onChange={(value) => { setTestRecipient(value); setTestResult(null); }} placeholder="recipient@example.com" />
            <ActionButton type="submit" icon={isSendingTest ? Loader2 : Send} disabled={isSendingTest || !branchId || !selectedTestSender}>
              {isSendingTest ? 'Sending…' : 'Send Test Email'}
            </ActionButton>
          </form>
          {!branchId && <p className="text-xs text-body">Select a branch from Settings to test email delivery.</p>}
          {testResult && <p role="status" aria-live="polite" className={`text-xs ${testResult.error ? 'text-rose-700' : 'text-emerald-700'}`}>{testResult.message}</p>}
        </Card>
      )}

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.1fr_1.2fr]">
          <Card className="!p-4 !rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-heading">Setup readiness</h3>
                <p className="text-[11px] text-body">{readyCount} of {checklist.length} onboarding steps complete.</p>
              </div>
              <span className="text-xs font-bold text-primary">{Math.round((readyCount / checklist.length) * 100)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round((readyCount / checklist.length) * 100)}%` }} />
            </div>
            <div className="space-y-1.5">
              {checklist.map((item) => (
                <div key={item.label} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 dark:border-slate-800 dark:bg-slate-950">
                  {item.ready ? <CheckCircle2 className="text-emerald-600 shrink-0" size={14} /> : <AlertCircle className="text-amber-500 shrink-0" size={14} />}
                  <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-heading dark:text-white truncate">{item.label}</p>
                    <p className="text-[11px] text-body truncate text-right">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Card className="!p-3.5 !rounded-xl">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-body">Default domain</p>
                  <p className="mt-1 text-sm font-black text-heading dark:text-white truncate">{defaultDomain?.domain_name || 'Not configured'}</p>
                  <div className="mt-1.5">
                    <StatusPill state={defaultDomain?.verification_state}>{defaultDomain?.verification_state || 'Missing'}</StatusPill>
                  </div>
                </div>
                <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                  <Mail size={16} />
                </div>
              </div>
            </Card>
            <Card className="!p-3.5 !rounded-xl">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-body">Branch senders</p>
                  <p className="mt-1 text-sm font-black text-heading dark:text-white truncate">{branchIdentities.length}</p>
                  <p className="mt-1 text-[11px] text-body truncate">{branchId ? `Branch #${branchId}` : 'No branch selected'}</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                  <Send size={16} />
                </div>
              </div>
            </Card>
            <Card className="!p-3.5 !rounded-xl">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-body">SMS numbers</p>
                  <p className="mt-1 text-sm font-black text-heading dark:text-white truncate">{numbers.length}</p>
                  <p className="mt-1 text-[11px] text-body truncate">{readyNumbers.length} ready for messaging</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                  <Phone size={16} />
                </div>
              </div>
            </Card>
            <Card className="!p-3.5 !rounded-xl">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-body">Connected mailboxes</p>
                  <p className="mt-1 text-sm font-black text-heading dark:text-white truncate">{mailboxes.length}</p>
                  <p className="mt-1 text-[11px] text-body truncate">Inbound & reply handling</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                  <Inbox size={16} />
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'domains' && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[300px_1fr]">
          <Card className="!p-4 !rounded-xl">
            <form onSubmit={addDomain} className="space-y-3">
              <div>
                <h3 className="text-sm font-bold text-heading">Add Resend sending domain</h3>
                <p className="mt-0.5 text-[11px] text-body">Tenant domains are verified under the platform Resend account.</p>
              </div>
              <TextInput label="Domain" value={domainName} onChange={setDomainName} placeholder="example.com" />
              <ActionButton type="submit" icon={Plus} size="sm" disabled={savingKey === 'domain'}>{savingKey === 'domain' ? 'Adding...' : 'Add Domain'}</ActionButton>
            </form>
          </Card>
          <Card className="!p-4 !rounded-xl space-y-2.5">
            <h3 className="text-sm font-bold text-heading">Domain inventory</h3>
            {domains.length === 0 ? (
              <EmptyState title="No domains yet" message="Add a domain to generate provider verification requirements." />
            ) : domains.map((domain) => (
              <div key={domain.id || domain.domain_name} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-black text-heading dark:text-white">{domain.domain_name}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <StatusPill state={domain.verification_state} />
                      {domain.is_default && <StatusPill state="verified">Default</StatusPill>}
                      {domain.sending_enabled && <StatusPill state="active">Sending enabled</StatusPill>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <ActionButton onClick={() => refreshDomain(domain.id)} icon={RefreshCw} variant="ghost" size="sm" disabled={savingKey === `domain-${domain.id}`}>Refresh</ActionButton>
                    {!domain.is_default && <ActionButton onClick={() => setDefaultDomain(domain)} icon={CheckCircle2} variant="ghost" size="sm">Set Default</ActionButton>}
                  </div>
                </div>
                {Array.isArray(domain.dns_records) && domain.dns_records.length > 0 && (
                  <div className="mt-2.5 overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-body dark:bg-slate-950">
                        <tr><th className="px-2.5 py-1.5">Type</th><th className="px-2.5 py-1.5">Name</th><th className="px-2.5 py-1.5">Value</th><th className="px-2 py-1.5" /></tr>
                      </thead>
                      <tbody>
                        {domain.dns_records.map((record, idx) => (
                          <tr key={`${record.name}-${idx}`} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="px-2.5 py-1 font-bold">{record.type}</td>
                            <td className="px-2.5 py-1 font-mono text-[10px]">{record.name}</td>
                            <td className="max-w-[260px] truncate px-2.5 py-1 font-mono text-[10px]">{record.value}</td>
                            <td className="px-2 py-1 text-right"><button type="button" onClick={() => copyValue(record.value)} className="text-primary hover:text-primary/80"><Copy size={12} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </Card>
        </div>
      )}

      {activeTab === 'senders' && (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr]">
          <Card className="!p-4 !rounded-xl">
            <form onSubmit={saveIdentity} className="space-y-3">
              <div>
                <h3 className="text-sm font-bold text-heading">Branch sender identity</h3>
                <p className="mt-0.5 text-[11px] text-body">Sender emails must use a verified domain.</p>
              </div>
              {!branchId && <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800">Select a branch from Settings to save sender identities.</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <TextInput label="Sender name" value={identityForm.sender_name} onChange={(v) => setIdentityForm({ ...identityForm, sender_name: v })} placeholder="Apex Moving" />
                <TextInput label="Sender email" value={identityForm.sender_email} onChange={(v) => setIdentityForm({ ...identityForm, sender_email: v })} placeholder="sales@example.com" type="email" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <SelectField label="Reply-to mode" value={identityForm.reply_to_mode} onChange={(v) => setIdentityForm({ ...identityForm, reply_to_mode: v })}>
                  <option value="kargo_inbound">Kargo inbound</option>
                  <option value="external_mailbox">External mailbox</option>
                  <option value="explicit">Explicit reply-to</option>
                  <option value="none">None</option>
                </SelectField>
                <TextInput label="Reply-to email" value={identityForm.reply_to_email} onChange={(v) => setIdentityForm({ ...identityForm, reply_to_email: v })} placeholder="replies@example.com" type="email" />
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-heading">
                <input type="checkbox" checked={identityForm.is_default_automation_sender} onChange={(e) => setIdentityForm({ ...identityForm, is_default_automation_sender: e.target.checked })} />
                Default automation sender for this branch
              </label>
              <ActionButton type="submit" icon={Save} size="sm" disabled={savingKey === 'identity'}>{identityForm.id ? 'Update Sender' : 'Create Sender'}</ActionButton>
            </form>
          </Card>
          <Card className="!p-4 !rounded-xl space-y-2.5">
            <h3 className="text-sm font-bold text-heading">Configured senders</h3>
            {branchIdentities.length === 0 ? (
              <EmptyState title="No branch sender configured" message="Create a sender identity after verifying the email domain." />
            ) : branchIdentities.map((identity) => (
              <button
                type="button"
                key={identity.id}
                onClick={() => { setTestSenderId(String(identity.id)); setTestResult(null); }}
                aria-pressed={String(selectedTestSender?.id) === String(identity.id)}
                className="w-full rounded-lg border border-slate-200 p-2.5 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-950"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-heading dark:text-white">{identity.sender_name}</p>
                    <p className="text-[11px] text-body">{identity.sender_email}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <StatusPill state={identity.state || identity.domain_state} />
                    {identity.is_default_automation_sender && <StatusPill state="active">Default automation sender</StatusPill>}
                  </div>
                </div>
              </button>
            ))}
          </Card>
        </div>
      )}

      {activeTab === 'numbers' && (
        <div className="space-y-3">
          <Card className="!p-3.5 !rounded-xl">
            <form onSubmit={runNumberSearch} className="grid grid-cols-1 gap-2.5 md:grid-cols-[0.5fr_0.5fr_0.7fr_0.5fr_auto] md:items-end">
              <TextInput label="Country code (CA / US)" value={numberSearch.country_code} onChange={(v) => setNumberSearch({ ...numberSearch, country_code: v.toUpperCase() })} placeholder="CA or US, not +1" />
              <TextInput label="Area code" value={numberSearch.area_code} onChange={(v) => setNumberSearch({ ...numberSearch, area_code: v })} placeholder="415" />
              <SelectField label="Number type" value={numberSearch.number_type} onChange={(v) => setNumberSearch({ ...numberSearch, number_type: v })}>
                <option value="local">Local</option>
                <option value="toll_free">Toll free</option>
              </SelectField>
              <TextInput label="Limit" value={numberSearch.limit} onChange={(v) => setNumberSearch({ ...numberSearch, limit: Number(v) || 10 })} type="number" />
              <ActionButton type="submit" icon={Search} size="sm" disabled={savingKey === 'number-search'}>Search</ActionButton>
            </form>
          </Card>

          <Card className="!p-3.5 !rounded-xl space-y-3">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-heading">Import Existing Telnyx Number</span>
                {ownedAvailableNumbers.length > 0 && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    {ownedAvailableNumbers.length} Telnyx number{ownedAvailableNumbers.length === 1 ? '' : 's'} ready in account
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-body">
                The number must already belong to the configured Telnyx account. You can select one detected from your account or enter it manually.
              </p>
            </div>

            {ownedAvailableNumbers.length > 0 && (
              <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold text-heading">Detected Telnyx numbers ready to import:</p>
                  <span className="text-[10px] text-muted font-medium">Click to select or click &quot;+ Import&quot;</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ownedAvailableNumbers.map((num) => {
                    const phone = num.phone_e164;
                    const isSelected = !isManualMode && existingNumber === phone;
                    return (
                      <div
                        key={phone}
                        className={`group flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/20'
                            : 'border-slate-200 bg-white hover:border-primary/50 text-heading dark:border-slate-800 dark:bg-slate-800/80'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setIsManualMode(false);
                            setExistingNumber(phone);
                          }}
                          className="flex items-center gap-1.5 text-left font-mono"
                          title="Click to select this number"
                        >
                          <Phone className="h-3 w-3 text-primary" />
                          <span>{phone}</span>
                          <span className="text-[10px] font-normal text-muted capitalize">({num.number_type || 'local'})</span>
                        </button>
                        <button
                          type="button"
                          disabled={savingKey === 'import-number'}
                          onClick={(e) => importExistingNumber(e, phone)}
                          className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary hover:bg-primary hover:text-white transition-colors"
                          title={`Import ${phone} now`}
                        >
                          + Import
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <form onSubmit={importExistingNumber} className="space-y-2">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_auto] items-end">
                {ownedAvailableNumbers.length > 0 && !isManualMode ? (
                  <div className="space-y-1">
                    <SelectField
                      label="Select Telnyx number to import"
                      value={existingNumber}
                      onChange={(val) => {
                        if (val === '__manual__') {
                          setIsManualMode(true);
                          setManualNumber('');
                        } else {
                          setExistingNumber(val);
                        }
                      }}
                    >
                      {ownedAvailableNumbers.map((num) => (
                        <option key={num.phone_e164} value={num.phone_e164}>
                          {num.phone_e164} ({num.number_type || 'local'}) — Telnyx Account
                        </option>
                      ))}
                      <option value="__manual__">+ Enter manual phone number...</option>
                    </SelectField>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {ownedAvailableNumbers.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-body">Manual phone number</span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsManualMode(false);
                            if (ownedAvailableNumbers.length > 0) setExistingNumber(ownedAvailableNumbers[0].phone_e164);
                          }}
                          className="text-[10px] font-bold text-primary hover:underline"
                        >
                          ← Pick from detected numbers
                        </button>
                      </div>
                    )}
                    <TextInput
                      label={ownedAvailableNumbers.length === 0 ? "Import existing Telnyx number" : undefined}
                      value={isManualMode ? manualNumber : existingNumber}
                      onChange={isManualMode ? setManualNumber : setExistingNumber}
                      placeholder={ownedAvailableNumbers.length > 0 ? `e.g. ${ownedAvailableNumbers[0].phone_e164}` : 'e.g. +14375247672'}
                    />
                  </div>
                )}
                <ActionButton
                  type="submit"
                  icon={Plus}
                  size="sm"
                  disabled={savingKey === 'import-number'}
                  className="whitespace-nowrap"
                >
                  {savingKey === 'import-number' ? 'Importing...' : 'Import number'}
                </ActionButton>
              </div>
            </form>
          </Card>

          {availableNumbers.length > 0 && (
            <Card className="!p-3.5 !rounded-xl space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-heading">Available Telnyx numbers</h3>
                <div className="flex gap-1.5">
                  <ActionButton onClick={quoteNumbers} icon={Save} variant="ghost" size="sm" disabled={savingKey === 'quote'}>Quote Selected</ActionButton>
                  {quotedOrder?.id && <ActionButton onClick={purchaseQuotedOrder} icon={CheckCircle2} size="sm" disabled={savingKey === 'purchase'}>Confirm Purchase</ActionButton>}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {availableNumbers.map((number) => {
                  const value = number.phone_number || number.phone_e164 || number.number;
                  const checked = selectedNumbers.includes(value);
                  return (
                    <label key={value} className={`flex items-center justify-between rounded-lg border p-2 text-xs font-bold ${checked ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-800'}`}>
                      <span>{value}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => setSelectedNumbers((prev) => e.target.checked ? [...prev, value] : prev.filter((item) => item !== value))}
                      />
                    </label>
                  );
                })}
              </div>
              {quotedOrder && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs font-semibold text-heading">
                  Quote #{quotedOrder.id} ready. Estimated cost: {quotedOrder.estimated_monthly_cost || quotedOrder.total_cost || 'provider quote recorded'}.
                </div>
              )}
            </Card>
          )}

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_0.8fr]">
            <Card className="!p-4 !rounded-xl space-y-2.5">
              <h3 className="text-sm font-bold text-heading">Number inventory</h3>
              {numbers.length === 0 ? (
                <EmptyState title="No SMS numbers" message="Search and purchase a Telnyx number to enable SMS." />
              ) : numbers.map((number) => (
                <div key={number.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-2.5 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-black text-heading dark:text-white">{number.phone_e164}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <StatusPill state={number.provisioning_state} />
                      <StatusPill state={number.messaging_registration_state} />
                      {number.assignment?.branch_id || number.branch_id ? <StatusPill state="active">Assigned</StatusPill> : <StatusPill state="draft">Unassigned</StatusPill>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <ActionButton variant="ghost" icon={Save} size="sm" onClick={() => setAssignmentForm({ ...assignmentForm, phone_number_id: number.id, branch_id: branchId || number.assignment?.branch_id || '' })}>Assign</ActionButton>
                    {(number.assignment || number.assignment_id) && <ActionButton variant="ghost" icon={Trash2} size="sm" onClick={() => withSaving(`unassign-${number.id}`, () => unassignSmsNumber(number.id), 'Number unassigned.')}>Unassign</ActionButton>}
                  </div>
                </div>
              ))}
            </Card>
            <div className="space-y-3">
              <Card className="!p-4 !rounded-xl">
                <form onSubmit={assignNumber} className="space-y-2.5">
                  <h3 className="text-sm font-bold text-heading">Assign number</h3>
                  <SelectField label="Phone number" value={assignmentForm.phone_number_id} onChange={(v) => setAssignmentForm({ ...assignmentForm, phone_number_id: v })}>
                    <option value="">Select number</option>
                    {numbers.map((number) => <option key={number.id} value={number.id}>{number.phone_e164}</option>)}
                  </SelectField>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <TextInput label="Branch ID" value={assignmentForm.branch_id} onChange={(v) => setAssignmentForm({ ...assignmentForm, branch_id: v, employee_id: '' })} placeholder={branchId ? String(branchId) : 'Optional'} />
                    <SelectField label="Employee" value={assignmentForm.employee_id} onChange={(v) => setAssignmentForm({ ...assignmentForm, employee_id: v, branch_id: '' })}>
                      <option value="">Select employee</option>
                      {employees.map((employee) => {
                        const name = employee.name || [employee.first_name, employee.last_name].filter(Boolean).join(' ') || employee.email || `Employee ${employee.id}`;
                        return <option key={employee.id} value={employee.id}>{name}</option>;
                      })}
                    </SelectField>
                  </div>
                  <ActionButton type="submit" icon={Save} size="sm" disabled={savingKey === 'assign-number'}>Save Assignment</ActionButton>
                </form>
              </Card>
              <Card className="!p-4 !rounded-xl space-y-2.5">
                <h3 className="text-sm font-bold text-heading">Recent orders</h3>
                {orders.length === 0 ? <EmptyState title="No orders" message="Purchased number orders will appear here." /> : orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-2 dark:border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-heading">Order #{order.id}</p>
                      <StatusPill state={order.order_state} />
                    </div>
                    <ActionButton variant="ghost" icon={RefreshCw} size="sm" onClick={() => refreshOrder(order.id)}>Refresh</ActionButton>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'mailboxes' && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[300px_1fr]">
          <Card className="!p-4 !rounded-xl">
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-bold text-heading">Connect mailbox</h3>
                <p className="mt-0.5 text-[11px] text-body">Connect your personal mailbox to send lead emails and sync replies.</p>
              </div>
              <SelectField label="Provider" value={mailboxProvider} onChange={setMailboxProvider}>
                <option value="gmail">Google (Gmail / Workspace)</option>
                <option value="microsoft365">Microsoft 365 / Outlook</option>
              </SelectField>
              <TextInput label="Login hint" value={mailboxHint} onChange={setMailboxHint} placeholder="person@example.com" type="email" />
              <ActionButton onClick={startOAuth} icon={Inbox} size="sm" disabled={savingKey === 'mailbox-oauth'}>Start OAuth</ActionButton>
            </div>
          </Card>
          <Card className="!p-4 !rounded-xl space-y-2.5">
            <h3 className="text-sm font-bold text-heading">Connected mailboxes</h3>
            {mailboxes.length === 0 ? (
              <EmptyState title="No mailboxes connected" message="Connect your personal mailbox to send lead emails and sync replies." />
            ) : mailboxes.map((mailbox) => (
              <div key={mailbox.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-2.5 dark:border-slate-800">
                <div>
                  <p className="text-xs font-black text-heading dark:text-white">{mailbox.mailbox_email}</p>
                  <p className="text-[11px] text-body">{mailbox.display_name || mailbox.provider}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <StatusPill state={mailbox.connection_state} />
                    <StatusPill state={mailbox.sync_state} />
                    {mailbox.is_default_sender && <StatusPill state="active">Default sender</StatusPill>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <ActionButton variant="ghost" icon={RefreshCw} size="sm" onClick={() => withSaving(`mailbox-sync-${mailbox.id}`, () => syncCommunicationMailbox(mailbox.id), 'Mailbox sync queued.')}>Sync</ActionButton>
                  <ActionButton variant="ghost" icon={CheckCircle2} size="sm" onClick={() => withSaving(`mailbox-default-${mailbox.id}`, () => updateCommunicationMailbox(mailbox.id, { is_default_sender: true }), 'Default mailbox updated.')}>Default</ActionButton>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
