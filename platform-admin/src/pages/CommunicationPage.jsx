import React, { useState } from 'react';
import { Radio, Mail, Phone, Activity, Shield, RefreshCw, ShieldCheck, Loader2, AlertTriangle, FlaskConical } from 'lucide-react';
import { usePlatformAuth } from '../auth/PlatformAuthContext';
import { PLATFORM_PERMISSIONS } from '../rbac/platformRbac';
import AccessDenied from '../components/AccessDenied';
import { useToast } from '../context/ToastContext';
import platformApi from '../api/platformApi';
import {
  useCommunicationOverview,
  useCommunicationResend,
  useCommunicationTelnyx,
  useCommunicationHealth,
  useCommunicationAuditLogs,
  useInvalidatePlatformQueries,
} from '../hooks/usePlatformData';

import CommunicationOverviewTab from '../components/communication/CommunicationOverviewTab';
import ResendSubSuiteTab from '../components/communication/ResendSubSuiteTab';
import TelnyxSubSuiteTab from '../components/communication/TelnyxSubSuiteTab';
import ProviderHealthTab from '../components/communication/ProviderHealthTab';
import CommunicationAuditTab from '../components/communication/CommunicationAuditTab';
import RotateApiKeyModal from '../components/communication/RotateApiKeyModal';
import EmergencySuspensionModal from '../components/communication/EmergencySuspensionModal';
import ProviderSettingsModal from '../components/communication/ProviderSettingsModal';
import CommunicationInspectorDrawer from '../components/communication/CommunicationInspectorDrawer';
import StatusBadge from '../components/communication/StatusBadge';
import { BTN, BTN_PRIMARY, CARD } from '../components/communication/parts';
import { PROVIDER_LABEL, apiError, healthBadge } from '../components/communication/format';

const TAB_TITLES = {
  overview: 'Overview', resend: 'Resend (Email)', telnyx: 'Telnyx (SMS)', health: 'Health', audit: 'Audit trail',
};

export default function CommunicationPage() {
  const { hasPermission } = usePlatformAuth();
  const { showToast } = useToast();
  const { invalidateCommunication } = useInvalidatePlatformQueries();

  const canView = hasPermission(PLATFORM_PERMISSIONS.COMMUNICATION_VIEW);
  const canManage = hasPermission(PLATFORM_PERMISSIONS.COMMUNICATION_MANAGE);
  const canAudit = hasPermission(PLATFORM_PERMISSIONS.AUDIT_VIEW);

  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState(null);
  const [dialog, setDialog] = useState(null); // { kind: 'rotate' | 'suspend' | 'settings', provider }
  const [inspectData, setInspectData] = useState(null);

  const overview = useCommunicationOverview({ enabled: canView });
  const resend = useCommunicationResend({ enabled: canView });
  const telnyx = useCommunicationTelnyx({ enabled: canView });
  const health = useCommunicationHealth({ enabled: canView });
  const audit = useCommunicationAuditLogs({ limit: 100 }, { enabled: canView && canAudit });

  if (!canView) {
    return (
      <AccessDenied
        requiredPermission={PLATFORM_PERMISSIONS.COMMUNICATION_VIEW}
        title="Communication Console Restricted"
        message="Your platform role does not have authorization to view multi-tenant communication infrastructure."
      />
    );
  }

  const overviewData = overview.data || {};
  const configs = { resend: resend.data?.config || overviewData.resend, telnyx: telnyx.data?.config || overviewData.telnyx };
  const healthRows = Object.fromEntries(((health.data || overviewData).health_matrix || []).map((row) => [row.key, row]));

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const results = await Promise.all([
        overview.refetch(), resend.refetch(), telnyx.refetch(), health.refetch(), ...(canAudit ? [audit.refetch()] : []),
      ]);
      const failed = results.find((result) => result.isError);
      if (failed) showToast(apiError(failed.error, 'Some communication data could not be refreshed.'), 'error');
      else showToast('Communication status refreshed.', 'success');
    } finally {
      setIsRefreshing(false);
    }
  };

  const requireManage = (what) => {
    if (canManage) return true;
    showToast(`You do not have permission to ${what}.`, 'error');
    return false;
  };

  const handleTestPing = async (provider) => {
    if (!requireManage('test provider connections')) return;
    const label = PROVIDER_LABEL[provider] || provider;
    setBusy(true);
    try {
      const { data } = await platformApi.testCommunicationConnection(provider);
      showToast(`${label}: ${data.message}${data.success && !data.simulated ? ` (${data.roundtrip_ms} ms)` : ''}`, data.success ? 'success' : 'error');
      invalidateCommunication();
    } catch (err) {
      showToast(apiError(err, `The ${label} connection test could not be run.`), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleResume = async (provider) => {
    if (!requireManage('resume providers')) return;
    const label = PROVIDER_LABEL[provider] || provider;
    setBusy(true);
    try {
      const { data } = await platformApi.resumeCommunicationProvider(provider);
      showToast(data.message || `${label} is active again.`, 'success');
      invalidateCommunication();
    } catch (err) {
      showToast(apiError(err, `${label} could not be resumed.`), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyDns = async (domain) => {
    if (!requireManage('re-check domains')) return;
    setVerifyingDomain(domain);
    try {
      const { data } = await platformApi.verifyCommunicationDomainDns(domain);
      showToast(data.message, data.success ? 'success' : 'info');
      const refreshed = await resend.refetch();
      const row = (refreshed.data?.domains || []).find((item) => item.domain === domain);
      setInspectData((current) => (current?.type === 'domain' && current.identifier === domain && row ? { ...current, details: row } : current));
      invalidateCommunication();
    } catch (err) {
      showToast(apiError(err, `${domain} could not be re-checked.`), 'error');
    } finally {
      setVerifyingDomain(null);
    }
  };

  const openDialog = (kind, what) => (provider) => {
    if (requireManage(what)) setDialog({ kind, provider });
  };
  const providerHandlers = {
    canManage, busy, onTestPing: handleTestPing, onResume: handleResume, onInspect: setInspectData,
    onOpenRotateKey: openDialog('rotate', 'change provider keys'),
    onOpenSettings: openDialog('settings', 'change provider settings'),
    onOpenDisableProvider: openDialog('suspend', 'suspend providers'),
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Radio },
    { id: 'resend', label: 'Resend (Email)', icon: Mail, status: healthRows.resend?.status },
    { id: 'telnyx', label: 'Telnyx (SMS & numbers)', icon: Phone, status: healthRows.telnyx?.status },
    { id: 'health', label: 'Health', icon: Activity },
    { id: 'audit', label: 'Audit trail', icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5 font-mono">
            <span>Platform Admin</span>
            <span>/</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold">Communication Infrastructure</span>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-300 font-bold">{TAB_TITLES[activeTab]}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            Communication Infrastructure Console
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            The platform-wide Email (Resend) and SMS (Telnyx) accounts that serve every tenant.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button onClick={handleRefresh} disabled={isRefreshing} className={BTN}>
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-blue-600' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
        <Shield size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
          <strong>Controlled access.</strong> This console shows delivery metadata across tenants: recipients are masked and message
          content is never available here. Every key change, settings change, suspension, connection test and DNS re-check is written
          to the platform audit trail{canManage ? '.' : '. Your role can view this console but cannot change anything.'}
        </p>
      </div>

      {overviewData.simulated && (
        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex items-start gap-3">
          <FlaskConical size={20} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-900 dark:text-blue-300 leading-relaxed">
            <strong>Fake provider mode.</strong> This server does not call Resend or Telnyx: messages are recorded but not delivered,
            and connection tests and DNS re-checks return simulated answers.
          </p>
        </div>
      )}

      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 sm:gap-6 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const badge = tab.status ? healthBadge(tab.status) : null;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3.5 pt-1 px-1 border-b-2 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {badge && <StatusBadge label={badge.label} tone={badge.tone} dot={false} className="text-[9px] uppercase tracking-wider" />}
            </button>
          );
        })}
      </div>

      {overview.isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 size={24} className="animate-spin text-blue-600" />
          <span className="text-xs font-semibold">Loading communication status…</span>
        </div>
      ) : overview.isError ? (
        <div className={`${CARD} p-10 text-center`}>
          <AlertTriangle size={24} className="mx-auto text-rose-500 mb-3" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">The communication console could not be loaded</h3>
          <p className="text-xs text-slate-400 mt-1">{apiError(overview.error, 'The server did not answer.')}</p>
          <button className={`${BTN_PRIMARY} mx-auto mt-4`} onClick={handleRefresh}><RefreshCw size={14} /> Try again</button>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <CommunicationOverviewTab
              overviewData={overviewData} canManage={canManage} onNavigateTab={setActiveTab}
              onTestPing={handleTestPing} onInspect={setInspectData}
            />
          )}
          {activeTab === 'resend' && (
            <ResendSubSuiteTab
              resendData={resend.data || { config: overviewData.resend }} health={healthRows.resend} {...providerHandlers}
              verifyingDomain={verifyingDomain} onVerifyDns={handleVerifyDns}
            />
          )}
          {activeTab === 'telnyx' && (
            <TelnyxSubSuiteTab telnyxData={telnyx.data || { config: overviewData.telnyx }} health={healthRows.telnyx} {...providerHandlers} />
          )}
          {activeTab === 'health' && <ProviderHealthTab healthData={health.data || overviewData} />}
          {activeTab === 'audit' && (
            <CommunicationAuditTab auditData={audit.data} canAudit={canAudit} isError={audit.isError} onInspect={setInspectData} />
          )}
        </>
      )}

      <RotateApiKeyModal
        isOpen={dialog?.kind === 'rotate'} onClose={() => setDialog(null)} provider={dialog?.provider}
        hasKey={Boolean(configs[dialog?.provider]?.configured)}
      />
      <EmergencySuspensionModal isOpen={dialog?.kind === 'suspend'} onClose={() => setDialog(null)} provider={dialog?.provider} />
      <ProviderSettingsModal
        isOpen={dialog?.kind === 'settings'} onClose={() => setDialog(null)} provider={dialog?.provider}
        config={configs[dialog?.provider]}
      />
      <CommunicationInspectorDrawer
        isOpen={Boolean(inspectData)} onClose={() => setInspectData(null)} inspectData={inspectData}
        canManage={canManage} verifyingDomain={verifyingDomain} onVerifyDns={handleVerifyDns}
      />
    </div>
  );
}
