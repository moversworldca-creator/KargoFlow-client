import React, { useState } from 'react';
import { 
  Building2, Shield, AlertTriangle, CheckCircle2, 
  XCircle, Clock, Archive, RefreshCw, Loader2, 
  Lock, ArrowRight, X, Info 
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useModal } from '../hooks/useModal';
import api from '../services/api';

// Section 2.1 Approved Table
const FUNCTIONAL_STATES = [
  {
    state: 'Active',
    isActive: true,
    isDeleted: false,
    badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200',
    title: 'Active Operational Mode',
    meaning: 'Tenant may operate normally, subject to subscription entitlement and tenant RBAC.',
    accessLevel: 'Full Access (subject to subscription)',
  },
  {
    state: 'Provisioning',
    isActive: false,
    isDeleted: false,
    badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200',
    title: 'Provisioning / Setup Incomplete',
    meaning: 'Tenant exists while initial setup is incomplete; normal tenant operation is not yet enabled.',
    accessLevel: 'Access Blocked',
  },
  {
    state: 'Deactivated',
    isActive: false,
    isDeleted: false,
    badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200',
    title: 'Administrative Shutdown',
    meaning: 'Administrative shutdown with tenant data retained. Access blocked; data preserved for future reactivation.',
    accessLevel: 'Access Blocked',
  },
  {
    state: 'Closed / Deleted',
    isActive: false,
    isDeleted: true,
    badgeColor: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200',
    title: 'Closed / Soft-Deleted',
    meaning: 'Tenant is closed and removed from normal operation; access is blocked; audit history is retained.',
    accessLevel: 'Access Blocked',
  },
];

export default function TenantLifecycleModal({ 
  isOpen, 
  onClose, 
  tenant, 
  onTenantUpdated 
}) {
  useModal(isOpen, onClose);
  const { showToast } = useToast();
  if (!isOpen || !tenant) return null;

  const [selectedState, setSelectedState] = useState(tenant.functional_state || 'Active');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStateInfo = FUNCTIONAL_STATES.find((s) => s.state === tenant.functional_state) || FUNCTIONAL_STATES[0];
  const targetStateInfo = FUNCTIONAL_STATES.find((s) => s.state === selectedState) || FUNCTIONAL_STATES[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast('Mandatory audit reason is required for tenant lifecycle changes (Section 2.1).', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.updateTenantStatus(tenant.id, {
        functional_state: selectedState,
        reason: reason.trim(),
      });
      showToast(`Tenant "${tenant.name}" state updated to ${selectedState}.`, 'success');
      onTenantUpdated?.(res.data);
      onClose();
    } catch (err) {
      showToast(err?.response?.data?.error || err?.message || 'Failed to update tenant lifecycle', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Tenant / Company Lifecycle</h2>
              <p className="text-xs text-slate-500">Section 2.1 Company state governance & precedence rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {/* Precedence Rule Notice */}
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300 space-y-1">
            <div className="flex items-center gap-2 font-bold">
              <Shield size={16} className="text-amber-600" />
              <span>Section 2 Precedence Rule:</span>
            </div>
            <p className="leading-relaxed text-[11px]">
              Company lifecycle and subscription lifecycle are separate controls. If a company is <strong>Inactive, Deactivated, or Closed/Deleted</strong>, the tenant is <strong>blocked</strong> from operating even if its SaaS subscription is active.
            </p>
          </div>

          {/* Current Tenant Overview */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Tenant Name</span>
              <span className="font-bold text-slate-900 dark:text-white">{tenant.name}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Company State</span>
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${currentStateInfo.badgeColor}`}>
                {tenant.functional_state || 'Active'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Commercial Sub Status</span>
              <span className="font-bold text-blue-600 capitalize">{tenant.subscription_status || 'active'}</span>
            </div>
          </div>

          {/* Target State Selection */}
          <div className="space-y-2">
            <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
              Select Target Lifecycle State (Section 2.1)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {FUNCTIONAL_STATES.map((stateObj) => {
                const isSelected = selectedState === stateObj.state;
                return (
                  <div
                    key={stateObj.state}
                    onClick={() => setSelectedState(stateObj.state)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all space-y-1 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-600/30'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${stateObj.badgeColor}`}>
                        {stateObj.state}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        active: {stateObj.isActive ? 'true' : 'false'}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white pt-1">{stateObj.title}</h4>
                    <p className="text-[11px] text-slate-500 leading-snug">{stateObj.meaning}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Audit Reason */}
          <form onSubmit={handleSubmit} id="tenant-lifecycle-form" className="space-y-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                Audit Reason & Business Explanation (Required) <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Administrative deactivation due to non-payment grace expiry, or reactivating account after customer contract renewal..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="tenant-lifecycle-form"
            disabled={isSubmitting || selectedState === tenant.functional_state}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
            <span>Execute Lifecycle Transition</span>
          </button>
        </div>
      </div>
    </div>
  );
}
