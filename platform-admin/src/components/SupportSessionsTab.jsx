import React, { useState, useEffect, useMemo } from 'react';
import { 
  Key, Shield, Clock, AlertTriangle, Plus, 
  ExternalLink, CheckCircle2, XCircle, Loader2, 
  Sparkles, RefreshCw, StopCircle, ArrowRight, UserCheck
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import platformApi from '../api/platformApi';
import { usePlatformAuth } from '../auth/PlatformAuthContext';
import { PLATFORM_PERMISSIONS } from '../rbac/platformRbac';

function formatRemainingTime(expiresAt, nowMs) {
  if (!expiresAt) return null;
  const target = new Date(expiresAt).getTime();
  const diff = target - nowMs;
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export default function SupportSessionsTab({ 
  sessions = [], 
  tenants = [], 
  onRefresh,
  onInvalidateSessions,
  initialTargetTenant = null 
}) {
  const { showToast } = useToast();
  const { platformUser, hasPermission } = usePlatformAuth();

  const canCreate = hasPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSIONS_CREATE);

  // Live timer tick to keep session expiry and status accurate in real-time
  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 10000); // every 10 seconds
    return () => clearInterval(timer);
  }, []);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [targetTenantId, setTargetTenantId] = useState(
    initialTargetTenant?.id || tenants[0]?.id || ''
  );
  const [mode, setMode] = useState('support_write');
  const [reason, setReason] = useState('');
  const [ticketRef, setTicketRef] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(240);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [endingSessionId, setEndingSessionId] = useState(null);
  const [enteringSessionId, setEnteringSessionId] = useState(null);

  // Sync targetTenantId when tenants or initialTargetTenant change
  useEffect(() => {
    if (initialTargetTenant?.id) {
      setTargetTenantId(initialTargetTenant.id);
    } else if (tenants.length > 0 && !tenants.some(t => String(t.id) === String(targetTenantId))) {
      setTargetTenantId(tenants[0].id);
    }
  }, [initialTargetTenant, tenants]);

  // Normalize sessions to ensure uniform representation regardless of list vs mutation response shape
  const normalizedSessions = useMemo(() => {
    return (sessions || []).map((sess) => {
      const tenantId = sess.tenant_id ?? sess.tenant_company_id ?? sess.company_id;
      const rawMode = sess.access_mode || sess.mode || 'read';
      const isSupportWrite = rawMode === 'support_write' || rawMode === 'write';
      const isFullAdmin = rawMode === 'full_admin' || rawMode === 'admin';
      
      const operatorEmail = sess.staff_email || sess.actor_email || '';
      const operatorName = sess.staff_name || sess.actor_name || operatorEmail || `Staff #${sess.platform_user_id || '?'}`;
      const operatorRole = sess.staff_role || sess.actor_role || 'Staff Operator';
      const ticket = sess.support_ticket_ref || sess.ticket_ref || '';
      const sessionReason = sess.reason || '';

      const expiresAtMs = sess.expires_at ? new Date(sess.expires_at).getTime() : null;
      const isTimeExpired = expiresAtMs ? expiresAtMs <= nowMs : false;
      const isExplicitEnded = Boolean(sess.ended_at) || sess.status === 'ended';
      const isCurrentlyActive = !isExplicitEnded && !isTimeExpired && (sess.status === 'active' || !sess.status);

      return {
        ...sess,
        normalizedId: String(sess.id),
        tenantId,
        tenantName: sess.tenant_name || `Tenant #${tenantId}`,
        operatorEmail,
        operatorName,
        operatorRole,
        accessMode: rawMode,
        isSupportWrite,
        isFullAdmin,
        ticket,
        reason: sessionReason,
        expiresAt: sess.expires_at,
        isCurrentlyActive,
        isTimeExpired,
        remainingTime: isCurrentlyActive ? formatRemainingTime(sess.expires_at, nowMs) : null,
      };
    });
  }, [sessions, nowMs]);

  const activeCount = useMemo(() => {
    return normalizedSessions.filter((s) => s.isCurrentlyActive).length;
  }, [normalizedSessions]);

  const handleStartSession = async (e) => {
    e.preventDefault();

    if (!canCreate) {
      showToast('You do not have authorization to create support sessions.', 'error');
      return;
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      showToast('Mandatory business reason is required to initiate a support session.', 'warning');
      return;
    }

    const trimmedTicketRef = ticketRef.trim();
    if (!trimmedTicketRef) {
      showToast('Mandatory ticket reference # is required (e.g. SUP-1042).', 'warning');
      return;
    }

    const parsedDuration = Number(durationMinutes);
    if (isNaN(parsedDuration) || parsedDuration < 15 || parsedDuration > 480) {
      showToast('Session duration must be between 15 minutes and 8 hours (480 minutes).', 'warning');
      return;
    }

    if (!targetTenantId) {
      showToast('Please select a valid target tenant within your scope.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await platformApi.createSupportSession({
        tenant_company_id: Number(targetTenantId),
        tenant_id: Number(targetTenantId),
        access_mode: mode,
        reason: trimmedReason,
        support_ticket_ref: trimmedTicketRef,
        duration_minutes: parsedDuration,
      });

      showToast('Controlled support session authorized and initiated.', 'success');
      setShowCreateModal(false);
      setReason('');
      setTicketRef('');
      setDurationMinutes(240);
      onInvalidateSessions?.();
      onRefresh?.();
    } catch (err) {
      const errDetail = err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'Failed to start support session';
      showToast(errDetail, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndSession = async (sessionId) => {
    setEndingSessionId(sessionId);
    try {
      await platformApi.endSupportSession(sessionId);
      showToast('Support session terminated. Audit trail logged.', 'success');
      onInvalidateSessions?.();
      onRefresh?.();
    } catch (err) {
      const errDetail = err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'Failed to end session';
      showToast(errDetail, 'error');
    } finally {
      setEndingSessionId(null);
    }
  };

  const handleEnterTenantConsole = async (session) => {
    setEnteringSessionId(session.normalizedId);
    try {
      const targetTenant = tenants.find((t) => String(t.id) === String(session.tenantId));
      const tenantName = targetTenant?.name || session.tenantName || `Tenant #${session.tenantId}`;
      const tenantIdNum = Number(session.tenantId);

      // Verify access grant with backend API
      try {
        await platformApi.checkTenantAccess(tenantIdNum, session.accessMode || 'read');
      } catch (checkErr) {
        const errorMsg = checkErr?.response?.data?.detail || checkErr?.response?.data?.error;
        if (errorMsg) {
          showToast(`Access check failed: ${errorMsg}`, 'error');
          return;
        }
      }

      // Establish session binding state for tenant console
      localStorage.setItem('active_support_session', JSON.stringify({
        sessionId: session.normalizedId,
        tenantId: tenantIdNum,
        tenantName,
        mode: session.accessMode,
        expiresAt: session.expiresAt,
        operator: session.operatorEmail,
      }));
      localStorage.setItem('active_company_id', String(tenantIdNum));
      if (targetTenant) {
        localStorage.setItem('active_company', JSON.stringify(targetTenant));
      }

      showToast(`Launching ${tenantName} workspace (${session.isSupportWrite ? 'Write' : 'Read-only'})...`, 'info');

      // Tenant APIs are isolated and fail-closed for direct platform tokens; inform user if in hybrid environment
      const crmUrl = window.location.port === '5174'
        ? 'http://localhost:3000/dashboard'
        : `${window.location.origin}/dashboard`;
      window.open(crmUrl, '_blank');
    } catch (err) {
      showToast(err?.message || 'Failed to launch tenant console', 'error');
    } finally {
      setEnteringSessionId(null);
    }
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-150">
      {/* Top Banner Notice */}
      <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-300">
        <div className="flex items-center gap-2.5">
          <Shield size={18} className="text-amber-600 shrink-0" />
          <span>
            <strong>Controlled Platform Support Governance (Section 1.9):</strong> Just-in-time impersonation sessions require explicit justification reasons, ticket references, and duration limits (15m - 8h).
          </span>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors shrink-0 cursor-pointer"
          >
            <Plus size={15} />
            <span>New Support Session</span>
          </button>
        )}
      </div>

      {/* Active Sessions List */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active & Recent Support Sessions</h3>
          <span className="text-xs font-bold text-slate-500">
            {activeCount} active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3.5">Session ID</th>
                <th className="py-2.5 px-3.5">Target Tenant</th>
                <th className="py-2.5 px-3.5">Operator & Role</th>
                <th className="py-2.5 px-3.5">Access Mode</th>
                <th className="py-2.5 px-3.5">Ticket & Reason</th>
                <th className="py-2.5 px-3.5">Status / Time Left</th>
                <th className="py-2.5 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {normalizedSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No support sessions recorded.
                  </td>
                </tr>
              ) : (
                normalizedSessions.map((sess) => {
                  return (
                    <tr key={sess.normalizedId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3.5 font-mono font-bold text-[11px] text-slate-600 dark:text-slate-400">
                        <span title={sess.normalizedId} className="cursor-help">
                          {sess.normalizedId.length > 8 ? `${sess.normalizedId.substring(0, 8)}…` : sess.normalizedId}
                        </span>
                      </td>

                      <td className="py-2 px-3.5">
                        <span className="font-bold text-slate-900 dark:text-white block">{sess.tenantName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Tenant #{sess.tenantId}</span>
                      </td>

                      <td className="py-2 px-3.5">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">{sess.operatorName}</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          {sess.operatorEmail && sess.operatorEmail !== sess.operatorName && (
                            <span className="font-mono">{sess.operatorEmail} •</span>
                          )}
                          <span className="capitalize">{sess.operatorRole}</span>
                        </div>
                      </td>

                      <td className="py-2 px-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                          sess.isFullAdmin
                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400'
                            : sess.isSupportWrite 
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' 
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                        }`}>
                          {sess.isFullAdmin ? 'Full Admin' : sess.isSupportWrite ? 'Support Write' : 'Read-only'}
                        </span>
                      </td>

                      <td className="py-2 px-3.5 max-w-xs">
                        {sess.ticket && (
                          <span className="font-mono font-bold text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded mr-1">
                            {sess.ticket}
                          </span>
                        )}
                        <span className="text-slate-600 dark:text-slate-300 break-words">{sess.reason}</span>
                      </td>

                      <td className="py-2 px-3.5 text-[11px]">
                        {sess.isCurrentlyActive ? (
                          <div className="space-y-0.5">
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                              <span>Active ({sess.remainingTime})</span>
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              Until {new Date(sess.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium inline-flex items-center gap-1">
                            <XCircle size={12} />
                            <span>{sess.isTimeExpired ? 'Expired' : 'Terminated'}</span>
                          </span>
                        )}
                      </td>

                      <td className="py-2 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {sess.isCurrentlyActive && (
                            <>
                              <button
                                onClick={() => handleEnterTenantConsole(sess)}
                                disabled={enteringSessionId === sess.normalizedId}
                                className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                {enteringSessionId === sess.normalizedId ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <ExternalLink size={12} />
                                )}
                                <span>Enter Tenant</span>
                              </button>

                              <button
                                onClick={() => handleEndSession(sess.normalizedId)}
                                disabled={endingSessionId === sess.normalizedId}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
                                title="End session now"
                              >
                                {endingSessionId === sess.normalizedId ? (
                                  <Loader2 size={15} className="animate-spin" />
                                ) : (
                                  <StopCircle size={15} />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Start Support Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Initiate Controlled Support Session</h3>
                <p className="text-[11px] text-slate-500">Audited just-in-time access for platform staff</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStartSession} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                  Target Tenant *
                </label>
                {tenants.length === 0 ? (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 rounded-xl">
                    No authorized tenants in your assigned scope.
                  </div>
                ) : (
                  <select
                    value={targetTenantId}
                    onChange={(e) => setTargetTenantId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.subdomain || `ID: ${t.id}`})</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                  Access Mode *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('support_write')}
                    className={`py-2 rounded-xl font-bold transition-colors cursor-pointer ${mode === 'support_write' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                  >
                    Support Write (Modify)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('read')}
                    className={`py-2 rounded-xl font-bold transition-colors cursor-pointer ${mode === 'read' || mode === 'support_read' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                  >
                    Support Read-Only
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                    Ticket Reference # *
                  </label>
                  <input
                    type="text"
                    required
                    value={ticketRef}
                    onChange={(e) => setTicketRef(e.target.value)}
                    placeholder="e.g. SUP-4921"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                    Duration (15m - 8h) *
                  </label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={60}>1 Hour</option>
                    <option value={120}>2 Hours</option>
                    <option value={240}>4 Hours</option>
                    <option value={480}>8 Hours (Max)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                  Business Justification (Required) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Customer requested troubleshooting for Stripe payout failure in ticket #4921..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || tenants.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                  <span>Authorize & Launch Session</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
