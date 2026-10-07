import React, { useState } from 'react';
import { 
  Key, Shield, Clock, AlertTriangle, Plus, 
  ExternalLink, CheckCircle2, XCircle, Loader2, 
  Sparkles, RefreshCw, StopCircle, ArrowRight 
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { useAuth } from '../auth/PlatformAuthContext';
import { useNavigate } from 'react-router-dom';

export default function SupportSessionsTab({ 
  sessions = [], 
  tenants = [], 
  onRefresh,
  initialTargetTenant = null 
}) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [targetTenantId, setTargetTenantId] = useState(initialTargetTenant?.id || tenants[0]?.id || '');
  const [mode, setMode] = useState('support_write');
  const [reason, setReason] = useState('');
  const [ticketRef, setTicketRef] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(240);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const handleStartSession = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast('Mandatory business reason is required to initiate a support session (Section 1.9).', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.tenantSessions.create({
        tenant_company_id: Number(targetTenantId),
        access_mode: mode === 'support_write' ? 'support_write' : 'read',
        reason: reason.trim(),
        support_ticket_ref: ticketRef.trim(),
        duration_minutes: Number(durationMinutes) || 60,
      });

      showToast('Controlled support session authorized and initiated.', 'success');
      setShowCreateModal(false);
      setReason('');
      setTicketRef('');
      onRefresh?.();
    } catch (err) {
      showToast(err?.response?.data?.error || err?.message || 'Failed to start support session', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndSession = async (sessionId) => {
    setIsEnding(true);
    try {
      await api.tenantSessions.end(sessionId);
      showToast('Support session terminated. Audit trail logged.', 'success');
      onRefresh?.();
    } catch (err) {
      showToast(err?.response?.data?.error || err?.message || 'Failed to end session', 'error');
    } finally {
      setIsEnding(false);
    }
  };

  const handleEnterTenantConsole = (session) => {
    const targetTenant = tenants.find((t) => String(t.id) === String(session.tenant_id));
    if (targetTenant) {
      // Store active session in localStorage for top banner indicator
      localStorage.setItem('active_support_session', JSON.stringify({
        sessionId: session.id,
        tenantId: targetTenant.id,
        tenantName: targetTenant.name,
        mode: session.mode,
        expiresAt: session.expires_at,
      }));
      localStorage.setItem('active_company_id', String(targetTenant.id));
      localStorage.setItem('active_company', JSON.stringify(targetTenant));
      showToast(`Launching ${targetTenant.name} workspace (${session.mode === 'support_write' ? 'Write' : 'Read-only'})...`, 'info');
      
      const crmUrl = window.location.port === '5174'
        ? 'http://localhost:3000/dashboard'
        : `${window.location.origin}/dashboard`;
      window.open(crmUrl, '_blank');
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Banner Notice */}
      <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-300">
        <div className="flex items-center gap-2.5">
          <Shield size={18} className="text-amber-600 shrink-0" />
          <span>
            <strong>Controlled Platform Support Governance (Section 1.9):</strong> Just-in-time impersonation sessions require explicit justification reasons, ticket references, and duration limits.
          </span>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
        >
          <Plus size={15} />
          <span>New Support Session</span>
        </button>
      </div>

      {/* Active Sessions List */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Active & Recent Support Sessions</h3>
          <span className="text-xs font-bold text-slate-500">
            {sessions.filter((s) => s.status === 'active').length} active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Session ID</th>
                <th className="py-3.5 px-4">Target Tenant</th>
                <th className="py-3.5 px-4">Operator / Role</th>
                <th className="py-3.5 px-4">Mode</th>
                <th className="py-3.5 px-4">Ticket & Reason</th>
                <th className="py-3.5 px-4">Status / Expires</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No support sessions recorded.
                  </td>
                </tr>
              ) : (
                sessions.map((sess) => {
                  const isActive = sess.status === 'active';
                  const isExpired = new Date(sess.expires_at) < new Date();
                  return (
                    <tr key={sess.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[11px] text-slate-600 dark:text-slate-400">
                        {sess.id}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {sess.tenant_name}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">{sess.actor_email}</span>
                        <span className="text-[10px] text-slate-400">{sess.actor_role}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sess.mode === 'support_write' 
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' 
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                        }`}>
                          {sess.mode === 'support_write' ? 'Write Access' : 'Read-only'}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        {sess.ticket_ref && (
                          <span className="font-mono font-bold text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded mr-1">
                            {sess.ticket_ref}
                          </span>
                        )}
                        <span className="text-slate-600 dark:text-slate-300">{sess.reason}</span>
                      </td>

                      <td className="py-3 px-4 text-[11px]">
                        {isActive && !isExpired ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            <span>Expires {new Date(sess.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">Terminated / Expired</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isActive && !isExpired && (
                            <>
                              <button
                                onClick={() => handleEnterTenantConsole(sess)}
                                className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                              >
                                <span>Enter Tenant</span>
                                <ExternalLink size={12} />
                              </button>

                              <button
                                onClick={() => handleEndSession(sess.id)}
                                disabled={isEnding}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                title="End session now"
                              >
                                <StopCircle size={15} />
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
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Initiate Controlled Support Session</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleStartSession} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                  Target Tenant
                </label>
                <select
                  value={targetTenantId}
                  onChange={(e) => setTargetTenantId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.subdomain})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                  Access Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('support_write')}
                    className={`py-2 rounded-xl font-bold transition-colors ${mode === 'support_write' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                  >
                    Support Write (Modify)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('support_read')}
                    className={`py-2 rounded-xl font-bold transition-colors ${mode === 'support_read' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}
                  >
                    Support Read-Only
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                    Ticket Reference #
                  </label>
                  <input
                    type="text"
                    value={ticketRef}
                    onChange={(e) => setTicketRef(e.target.value)}
                    placeholder="e.g. SUP-4921"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                    Duration
                  </label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold"
                  >
                    <option value={15}>15 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={60}>1 Hour</option>
                    <option value={240}>4 Hours</option>
                    <option value={480}>8 Hours (Max)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider mb-1.5">
                  Business Justification (Section 1.9 Required) *
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
                  className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
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
