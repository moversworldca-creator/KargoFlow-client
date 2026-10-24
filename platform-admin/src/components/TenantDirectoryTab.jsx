import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Building2, Search, Filter, Plus, Shield, 
  ExternalLink, Key, Users, MapPin, MoreHorizontal, MoreVertical,
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
  const [lifecycleInitialTarget, setLifecycleInitialTarget] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const actionMenuPortalRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        actionMenuPortalRef.current &&
        !actionMenuPortalRef.current.contains(event.target) &&
        !event.target.closest('[data-action-menu-trigger]')
      ) {
        setMenuAnchor(null);
      }
    };

    const handleScrollOrResize = () => {
      setMenuAnchor(null);
    };

    if (menuAnchor) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [menuAnchor]);

  const handleToggleMenu = (e, tenant) => {
    e.stopPropagation();
    if (menuAnchor?.tenant?.id === tenant.id) {
      setMenuAnchor(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < 280 && rect.top > 280;
    setMenuAnchor({
      tenant,
      openUpwards,
      rect: {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
      },
    });
  };

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
    if (statusFilter === 'suspended') return t.subscription_status === 'suspended' || ['Deactivated', 'Suspended', 'Closed'].includes(t.functional_state);
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

  // What the tenant can actually do. The company's own lifecycle state comes
  // first: a company that is not Active cannot sign in, whatever its
  // subscription says. Only then does the subscription decide.
  const deriveAccess = (tenant) => {
    const state = tenant.functional_state || (tenant.is_active ? 'Active' : 'Provisioning');
    if (state !== 'Active' || tenant.is_active === false) return 'Blocked';
    if (tenant.access_behavior?.access) return tenant.access_behavior.access;
    if (['active', 'trialing'].includes(tenant.subscription_status)) return 'Full';
    if (tenant.subscription_status === 'past_due') return 'Grace / operational write';
    return 'Blocked';
  };

  const getStateBadge = (tenant) => {
    const isActive = tenant.functional_state === 'Active' && tenant.is_active !== false;
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold inline-block ${
          isActive
            ? 'bg-[#EAF8F1] text-[#16A34A] dark:bg-emerald-950/40 dark:text-emerald-400'
            : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
        }`}
      >
        {isActive ? 'Active' : 'Deactive'}
      </span>
    );
  };

  const getAccessBadge = (tenant) => {
    const access = deriveAccess(tenant);
    if (access === 'Full') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EAF8F1] text-[#16A34A] dark:bg-emerald-950/40 dark:text-emerald-400 inline-block">
          Full Access
        </span>
      );
    }
    if (access === 'Grace / operational write') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 inline-block">
          Grace Active
        </span>
      );
    }
    if (access === 'Read-only') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 inline-block">
          Read-only
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 inline-block">
        Blocked
      </span>
    );
  };

  const getSubStatusBadge = (subStatus) => {
    const s = subStatus?.toLowerCase();
    switch (s) {
      case 'active':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EAF8F1] text-[#16A34A] dark:bg-emerald-950/40 dark:text-emerald-400 inline-block">Active</span>;
      case 'trialing':
      case 'trial':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 inline-block">Trial</span>;
      case 'past_due':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 inline-block">Past Due</span>;
      case 'suspended':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 inline-block">Suspended</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 inline-block">{subStatus ? (subStatus.charAt(0).toUpperCase() + subStatus.slice(1)) : 'None'}</span>;
    }
  };

  return (
    <div className="space-y-2.5 animate-in fade-in duration-150">
      {/* Controls Bar */}
      <div className="py-2.5 px-3.5 sm:px-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        {/* Search */}
        <div className="relative flex-1 max-w-lg">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenant name, subdomain, admin email..."
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 placeholder:text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'trialing', label: 'Trial' },
            { id: 'past_due', label: 'Past Due' },
            { id: 'suspended', label: 'Suspended' },
            { id: 'provisioning', label: 'Onboarding' },
          ].map((f) => {
            const isActive = statusFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#EBF3FE] dark:bg-blue-950/60 text-[#1E60F0] dark:text-blue-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tenants Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-900/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2 px-3 min-w-[180px]">Organization / Tenant</th>
                <th className="py-2 px-3 w-24 whitespace-nowrap">Company ID</th>
                <th className="py-2 px-3 min-w-[130px] whitespace-nowrap">Current Plan</th>
                <th className="py-2 px-3 w-24 whitespace-nowrap">Tenant State</th>
                <th className="py-2 px-3 w-24 whitespace-nowrap">Subscription</th>
                <th className="py-2 px-3 w-28 whitespace-nowrap">Derived Access</th>
                <th className="py-2 px-3 w-28 whitespace-nowrap">Capacity</th>
                <th className="py-2 px-3 w-14 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400 text-xs">
                    No matching tenants found.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => {
                  const planObj = plans.find((p) => p.id === tenant.plan_id) || { name: tenant.subscription_plan || 'Custom' };
                  const planDisplayName = planObj.name?.toLowerCase() === 'trial' ? 'Trial Plan' : planObj.name;
                  const isMenuOpen = menuAnchor?.tenant?.id === tenant.id;
                  return (
                    <tr key={tenant.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">
                          {tenant.name}
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {tenant.email}{tenant.phone ? ` • ${tenant.phone}` : ''}
                        </div>
                      </td>

                      <td className="py-2 px-3 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {tenant.company_id ?? tenant.id}
                      </td>

                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          {planDisplayName}
                        </span>
                      </td>

                      <td className="py-2 px-3 whitespace-nowrap">
                        {getStateBadge(tenant)}
                      </td>

                      <td className="py-2 px-3 whitespace-nowrap">
                        {getSubStatusBadge(tenant.subscription_status)}
                      </td>

                      <td className="py-2 px-3 whitespace-nowrap">
                        {getAccessBadge(tenant)}
                      </td>

                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                          <div>Users: <span className="font-bold text-slate-900 dark:text-white">{tenant.active_users_count ?? tenant.users_count ?? 1}</span></div>
                          <div>Branches: <span className="font-bold text-slate-900 dark:text-white">{tenant.active_branches_count ?? tenant.branches_count ?? 1}</span></div>
                        </div>
                      </td>

                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            data-action-menu-trigger
                            onClick={(e) => handleToggleMenu(e, tenant)}
                            className={`p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center justify-center ${
                              isMenuOpen ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : ''
                            }`}
                            title="Actions"
                          >
                            <MoreHorizontal size={16} />
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

      {/* Action Menu Portal - Mounted directly to document.body so parent overflow-hidden or overflow-x-auto never clips the dropdown */}
      {menuAnchor && createPortal(
        <div
          ref={actionMenuPortalRef}
          style={{
            position: 'fixed',
            right: `${Math.max(8, window.innerWidth - menuAnchor.rect.right)}px`,
            ...(menuAnchor.openUpwards 
              ? { bottom: `${window.innerHeight - menuAnchor.rect.top + 6}px` } 
              : { top: `${menuAnchor.rect.bottom + 6}px` }),
            zIndex: 9999,
            maxHeight: 'calc(100vh - 24px)',
          }}
          className="w-60 max-w-[calc(100vw-16px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-1 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/5 overflow-y-auto"
        >
          {(() => {
            const tenant = menuAnchor.tenant;
            const isTenantActive = tenant.functional_state === 'Active' && tenant.is_active !== false;
            return (
              <>
                {/* Activate / Deactivate Tenant depending on current active state */}
                {!isTenantActive ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuAnchor(null);
                        setLifecycleInitialTarget('Active');
                        setLifecycleModalTenant(tenant);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer border border-emerald-200/60 dark:border-emerald-800/40"
                    >
                      <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Activate Tenant…</span>
                    </button>
                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuAnchor(null);
                        setLifecycleInitialTarget('Deactivated');
                        setLifecycleModalTenant(tenant);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer border border-rose-200/60 dark:border-rose-800/40"
                    >
                      <XCircle size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
                      <span>Deactivate Tenant…</span>
                    </button>
                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMenuAnchor(null);
                    onSelectTenantForEntitlements?.(tenant);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Sliders size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>Inspect Entitlements & Overrides</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuAnchor(null);
                    onInitiateSupportSession?.(tenant);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Key size={14} className="text-amber-500 dark:text-amber-400 shrink-0" />
                  <span>Controlled Support Session</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuAnchor(null);
                    setLifecycleInitialTarget(null);
                    setLifecycleModalTenant(tenant);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Shield size={14} className="text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>Manage Lifecycle (Section 2.1)</span>
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                <button
                  type="button"
                  onClick={() => {
                    setMenuAnchor(null);
                    setSelectedTenantDetails(tenant);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Eye size={14} className="text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>View Full Tenant Spec</span>
                </button>
              </>
            );
          })()}
        </div>,
        document.body
      )}

      {/* Tenant Lifecycle Modal (Section 2.1) */}
      <TenantLifecycleModal
        isOpen={Boolean(lifecycleModalTenant)}
        onClose={() => {
          setLifecycleModalTenant(null);
          setLifecycleInitialTarget(null);
        }}
        tenant={lifecycleModalTenant}
        initialTargetState={lifecycleInitialTarget}
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
