import React, { useState } from 'react';
import { 
  Building2, Search, Filter, Plus, Shield, 
  ExternalLink, Key, Users, MapPin, MoreHorizontal, 
  CheckCircle2, AlertTriangle, XCircle, Clock, Eye, 
  Sliders, Loader2, ArrowRight
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import platformApi from '../api/platformApi';
import TenantLifecycleModal from './TenantLifecycleModal';

export default function TenantDirectoryTab({ 
  tenants = [], 
  plans = [], 
  onRefresh, 
  onOpenProvisionModal, 
  onSelectTenantForEntitlements,
  onInitiateSupportSession 
}) {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 200);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTenantDetails, setSelectedTenantDetails] = useState(null);
  const [lifecycleModalTenant, setLifecycleModalTenant] = useState(null);

  const filteredTenants = tenants.filter((t) => {
    const q = debouncedSearch.toLowerCase().trim();
    const matchesSearch = !q ||
      t.name?.toLowerCase().includes(q) ||
      t.subdomain?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return t.functional_state === 'Active' && t.subscription_status === 'active';
    if (statusFilter === 'trialing') return t.subscription_status === 'trialing';
    if (statusFilter === 'past_due') return t.subscription_status === 'past_due';
    if (statusFilter === 'suspended') return t.subscription_status === 'suspended' || t.functional_state === 'Suspended';
    if (statusFilter === 'provisioning') return t.functional_state === 'Provisioning' || !t.is_active;
    return true;
  });

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!statusReason.trim()) {
      showToast('Mandatory audit reason is required for tenant lifecycle changes (Section 2.1).', 'warning');
      return;
    }

    setIsUpdatingStatus(true);
    try {
      await platformApi.updateTenantStatus(statusChangeTenant.id, {
        functional_state: targetStatus,
        reason: statusReason.trim(),
      });
      showToast(`Tenant "${statusChangeTenant.name}" status updated to ${targetStatus}.`, 'success');
      setStatusChangeTenant(null);
      setStatusReason('');
      onRefresh?.();
    } catch (err) {
      showToast(err?.response?.data?.error || err?.message || 'Failed to update tenant status', 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getAccessBadge = (accessBehavior) => {
    const access = accessBehavior?.access || 'Full';
    if (access === 'Full') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50">
          <CheckCircle2 size={11} />
          <span>Full Access</span>
        </span>
      );
    }
    if (access === 'Grace / operational write') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50">
          <Clock size={11} />
          <span>Grace Active</span>
        </span>
      );
    }
    if (access === 'Read-only') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200">
          <AlertTriangle size={11} />
          <span>Read-only</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/50">
        <XCircle size={11} />
        <span>Blocked</span>
      </span>
    );
  };

  const getSubStatusBadge = (subStatus) => {
    switch (subStatus) {
      case 'active':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">Active</span>;
      case 'trialing':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">Trialing</span>;
      case 'past_due':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">Past Due</span>;
      case 'suspended':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">Suspended</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{subStatus || 'None'}</span>;
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Controls Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenant name, subdomain, admin email..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            {[
              { id: 'all', label: 'All' },
              { id: 'active', label: 'Active' },
              { id: 'trialing', label: 'Trial' },
              { id: 'past_due', label: 'Past Due' },
              { id: 'suspended', label: 'Suspended' },
              { id: 'provisioning', label: 'Onboarding' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  statusFilter === f.id
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            onClick={onOpenProvisionModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus size={15} />
            <span>Provision Tenant</span>
          </button>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Organization / Tenant</th>
                <th className="py-3.5 px-4">Company ID</th>
                <th className="py-3.5 px-4">Current Plan</th>
                <th className="py-3.5 px-4">Subscription</th>
                <th className="py-3.5 px-4">Derived Access</th>
                <th className="py-3.5 px-4">Capacity</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No matching tenants found.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => {
                  const planObj = plans.find((p) => p.id === tenant.plan_id) || { name: tenant.subscription_plan || 'Custom' };
                  return (
                    <tr key={tenant.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Building2 size={16} className="text-blue-600 shrink-0" />
                          <span>{tenant.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">{tenant.email} • {tenant.phone}</div>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {tenant.company_id || tenant.subdomain || `ID #${tenant.id}`}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {planObj.name}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {getSubStatusBadge(tenant.subscription_status)}
                      </td>

                      <td className="py-3 px-4">
                        {getAccessBadge(tenant.access_behavior)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-[11px] text-slate-600 dark:text-slate-400">
                          <div>Users: <span className="font-bold text-slate-800 dark:text-slate-200">{tenant.active_users_count || 1}</span></div>
                          <div>Branches: <span className="font-bold text-slate-800 dark:text-slate-200">{tenant.active_branches_count || 1}</span></div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectTenantForEntitlements?.(tenant)}
                            title="Inspect Entitlements & Overrides"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                          >
                            <Sliders size={15} />
                          </button>

                          <button
                            onClick={() => onInitiateSupportSession?.(tenant)}
                            title="Start Controlled Support Session"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                          >
                            <Key size={15} />
                          </button>

                          <button
                            onClick={() => setLifecycleModalTenant(tenant)}
                            title="Manage Company Lifecycle (Section 2.1)"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                          >
                            <Shield size={15} />
                          </button>

                          <button
                            onClick={() => setSelectedTenantDetails(tenant)}
                            title="View Full Tenant Spec"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Eye size={15} />
                          </button>
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

      {/* Tenant Lifecycle Modal (Section 2.1) */}
      <TenantLifecycleModal
        isOpen={Boolean(lifecycleModalTenant)}
        onClose={() => setLifecycleModalTenant(null)}
        tenant={lifecycleModalTenant}
        onTenantUpdated={() => onRefresh?.()}
      />

      {/* Tenant Details Drawer Modal */}
      {selectedTenantDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{selectedTenantDetails.name}</h3>
                <p className="text-xs text-slate-500">Tenant ID #{selectedTenantDetails.id} • {selectedTenantDetails.subdomain}.kargoflow.com</p>
              </div>
              <button onClick={() => setSelectedTenantDetails(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Functional State</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedTenantDetails.functional_state}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Subscription Plan</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{selectedTenantDetails.plan_id || selectedTenantDetails.subscription_plan}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Currency & Timezone</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedTenantDetails.currency} • {selectedTenantDetails.timezone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Created On</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{new Date(selectedTenantDetails.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Legal Entity & Location</span>
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  {selectedTenantDetails.legal_name || selectedTenantDetails.name}<br />
                  {selectedTenantDetails.address_line1}, {selectedTenantDetails.city}, {selectedTenantDetails.state} {selectedTenantDetails.zip_code}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const t = selectedTenantDetails;
                  setSelectedTenantDetails(null);
                  onSelectTenantForEntitlements?.(t);
                }}
                className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 rounded-xl text-xs font-bold transition-colors"
              >
                Inspect Entitlements
              </button>
              <button
                type="button"
                onClick={() => setSelectedTenantDetails(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
