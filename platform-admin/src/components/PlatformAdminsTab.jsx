import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Shield, Plus, CheckCircle2, XCircle, 
  Key, Lock, Mail, Loader2, Sparkles, Filter, 
  Eye, Edit3, UserX, UserCheck, AlertTriangle, 
  Building2, Calendar, Clock, RefreshCw, ShieldAlert, 
  Info, Check, ChevronRight, Search, SlidersHorizontal, 
  Fingerprint, ArrowRight, ShieldCheck 
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { usePlatformAuth } from '../auth/PlatformAuthContext';
import { useDebounce } from '../hooks/useDebounce';
import platformApi from '../api/platformApi';
import { 
  PLATFORM_PERMISSIONS, 
  PERMISSION_DEFINITIONS, 
  PLATFORM_ROLES, 
  PLATFORM_ROLE_OPTIONS,
  hasPlatformPermission 
} from '../rbac/platformRbac';

export default function PlatformAdminsTab({ 
  admins = [], 
  tenants = [], 
  onRefresh 
}) {
  const { showToast } = useToast();
  const { switchPersona, platformUser, hasPermission } = usePlatformAuth();
  const canManageUsers = hasPermission ? hasPermission(PLATFORM_PERMISSIONS.USERS_MANAGE) : true;

  // Navigation & Sub-views
  const [activeSubView, setActiveSubView] = useState('staff'); // 'staff' | 'matrix'

  // Modals & Drawers state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [detailUser, setDetailUser] = useState(null);
  const [suspensionTarget, setSuspensionTarget] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [reactivateTarget, setReactivateTarget] = useState(null);
  const [reactivateReason, setReactivateReason] = useState('');
  const [viewAssignedCompaniesUser, setViewAssignedCompaniesUser] = useState(null);

  // Active Simulation Persona
  const [activeStaffUser, setActiveStaffUser] = useState(null);
  const [isSwitchingPersona, setIsSwitchingPersona] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 200);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Data for Invite/Create
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'support_admin',
    company_scope_type: 'assigned',
    assigned_companies: [],
    expires_at: '',
    mfa_enforced: true,
    reason: '',
  });

  const roleAllowsScope = (roleKey, scope) => {
    const roleConfig = PLATFORM_ROLES[roleKey];
    return Boolean(roleConfig?.allowedScopes?.includes(scope));
  };

  const defaultScopeForRole = (roleKey, fallback = 'assigned') => {
    const roleConfig = PLATFORM_ROLES[roleKey];
    if (!roleConfig?.allowedScopes?.length) return fallback;
    if (roleConfig.allowedScopes.includes(fallback)) return fallback;
    return roleConfig.allowedScopes[0];
  };

  const getAssignedCompanies = (user) => {
    if (!user) return [];
    if (user.company_details && user.company_details.length > 0) {
      return user.company_details;
    }
    const ids = user.assigned_companies || [];
    return tenants.filter((t) => ids.includes(t.id));
  };

  // Load current platform staff auth context on mount
  const fetchCurrentAuth = async () => {
    try {
      const res = await platformApi.getPlatformAuthMe();
      if (res?.data?.user) {
        setActiveStaffUser(res.data.user);
      }
    } catch {
      // Ignore in offline/mock
    }
  };

  useEffect(() => {
    fetchCurrentAuth();
  }, [admins]);

  // Handle Switch Persona
  const handleSwitchPersona = async (userId) => {
    setIsSwitchingPersona(true);
    try {
      const data = await switchPersona(userId);
      showToast(data.message || `Switched persona to ${data.active_user?.name}`, 'success');
      setActiveStaffUser(data.active_user);
      onRefresh?.();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Failed to switch persona', 'error');
    } finally {
      setIsSwitchingPersona(false);
    }
  };

  // Filtered staff list
  const filteredUsers = useMemo(() => {
    return admins.filter((u) => {
      const q = debouncedSearch.toLowerCase().trim();
      const matchesSearch = !q || (
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.id?.toLowerCase().includes(q)
      );

      const matchesRole = roleFilter === 'all' || u.role === roleFilter;

      let matchesStatus = true;
      if (statusFilter === 'expired') {
        matchesStatus = Boolean(u.expires_at && new Date(u.expires_at).getTime() < Date.now());
      } else if (statusFilter !== 'all') {
        matchesStatus = u.status === statusFilter;
      }

      let matchesScope = true;
      if (scopeFilter === 'global') {
        matchesScope = u.company_scope_type === 'all';
      } else if (scopeFilter !== 'all') {
        matchesScope = u.company_scope_type === scopeFilter;
      }

      return matchesSearch && matchesRole && matchesStatus && matchesScope;
    });
  }, [admins, debouncedSearch, roleFilter, statusFilter, scopeFilter]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = admins.length;
    const active = admins.filter((u) => u.status === 'active' && (!u.expires_at || new Date(u.expires_at).getTime() > Date.now())).length;
    const suspended = admins.filter((u) => u.status === 'suspended').length;
    const expired = admins.filter((u) => u.expires_at && new Date(u.expires_at).getTime() <= Date.now()).length;
    const globalScope = admins.filter((u) => u.company_scope_type === 'all').length;
    const assignedScope = admins.filter((u) => u.company_scope_type === 'assigned').length;
    return { total, active, suspended, expired, globalScope, assignedScope };
  }, [admins]);

  // Invite / Create handler
  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      showToast('Name and email are required.', 'warning');
      return;
    }

    if (formData.company_scope_type === 'assigned' && (!formData.assigned_companies || formData.assigned_companies.length === 0)) {
      showToast('Please select at least one assigned company for scoped staff access.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await platformApi.inviteAdmin({
        ...formData,
        email: formData.email.trim().toLowerCase(),
        assigned_companies: formData.company_scope_type === 'assigned' ? formData.assigned_companies : [],
      });
      showToast(`Platform staff member "${formData.name}" invited successfully.`, 'success');
      setShowInviteModal(false);
      setFormData({
        name: '',
        email: '',
        role: 'support_admin',
        company_scope_type: 'assigned',
        assigned_companies: [],
        expires_at: '',
        mfa_enforced: true,
        reason: '',
      });
      onRefresh?.();
    } catch (err) {
      showToast(err?.response?.data?.error || err?.message || 'Failed to invite staff member', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Submit handler
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editUser) return;

    if (editUser.company_scope_type === 'assigned' && (!editUser.assigned_companies || editUser.assigned_companies.length === 0)) {
      showToast('Please select at least one assigned company for scoped staff access.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await platformApi.updateAdmin(editUser.id, {
        name: editUser.name,
        role: editUser.role,
        company_scope_type: editUser.company_scope_type,
        assigned_companies: editUser.company_scope_type === 'assigned' ? editUser.assigned_companies : [],
        expires_at: editUser.expires_at || null,
        mfa_enforced: editUser.mfa_enforced,
      });
      showToast(`Staff access for "${editUser.name}" updated successfully. Active sessions revoked.`, 'success');
      setEditUser(null);
      onRefresh?.();
    } catch (err) {
      showToast(err?.response?.data?.error || err?.message || 'Failed to update staff access', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Suspend handler
  const handleConfirmSuspend = async () => {
    if (!suspensionTarget) return;
    setIsSubmitting(true);
    try {
      await platformApi.suspendAdmin(suspensionTarget.id, suspensionReason || 'Suspended by platform staff');
      showToast(`Account "${suspensionTarget.name}" suspended. Active sessions revoked.`, 'success');
      setSuspensionTarget(null);
      setSuspensionReason('');
      onRefresh?.();
    } catch (err) {
      showToast(err?.response?.data?.error || err?.message || 'Failed to suspend account', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reactivate handler
  const handleConfirmReactivate = async () => {
    if (!reactivateTarget) return;
    setIsSubmitting(true);
    try {
      await platformApi.reactivateAdmin(reactivateTarget.id, reactivateReason || 'Reactivated by platform staff');
      showToast(`Account "${reactivateTarget.name}" reactivated.`, 'success');
      setReactivateTarget(null);
      setReactivateReason('');
      onRefresh?.();
    } catch (err) {
      showToast(err?.response?.data?.error || err?.message || 'Failed to reactivate account', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (roleKey) => {
    const roleConfig = PLATFORM_ROLES[roleKey] || {
      name: roleKey,
      badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${roleConfig.badgeClass}`}>
        <Shield size={11} />
        {roleConfig.name}
      </span>
    );
  };

  const getStatusBadge = (user) => {
    const isExpired = user.expires_at && new Date(user.expires_at).getTime() < Date.now();
    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50">
          <Clock size={11} />
          Expired
        </span>
      );
    }

    switch (user.status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50">
            <CheckCircle2 size={11} />
            Active
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/50">
            <ShieldAlert size={11} />
            Suspended
          </span>
        );
      case 'invited':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/50">
            <Mail size={11} />
            Invited
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            {user.status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Active Persona & Live Simulation Toolbar */}
      <div className="p-4 rounded-3xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-400/30">
            <Fingerprint size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Platform Actor Context</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono text-[10px] border border-blue-500/30">
                Session v{activeStaffUser?.session_version || 1}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <h3 className="text-base font-bold text-white">
                {activeStaffUser?.name || platformUser?.name || 'Staff User'}
              </h3>
              {(activeStaffUser?.email || platformUser?.email) && (
                <span className="text-xs text-slate-400 font-mono">({activeStaffUser?.email || platformUser?.email})</span>
              )}
              {getRoleBadge(activeStaffUser?.role || platformUser?.role || 'super_admin')}
            </div>
          </div>
        </div>

        {/* Persona Switcher Selector */}
        <div className="flex items-center gap-2 bg-slate-800/80 p-2 rounded-2xl border border-slate-700">
          <span className="text-xs font-medium text-slate-300 pl-1">Switch Test Actor:</span>
          <select
            value={activeStaffUser?.id || platformUser?.id || (admins[0]?.id || '')}
            onChange={(e) => handleSwitchPersona(e.target.value)}
            disabled={isSwitchingPersona || admins.length === 0}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            {admins.map((admin) => (
              <option key={admin.id} value={admin.id}>
                {admin.name} ({admin.role_name || admin.role}) - {admin.status}
              </option>
            ))}
          </select>
          {isSwitchingPersona && <Loader2 size={14} className="animate-spin text-blue-400" />}
        </div>
      </div>

      {/* Main Header & Sub-Navigation */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Platform Staff & Access Control (Section 1.1)</h2>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-mono font-bold">
              Isolated Platform RBAC
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-tenant support staff, scoped company boundaries, and strict privilege isolation from company-level <code className="text-xs font-mono text-blue-600">crm.*</code> permissions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {/* Sub-view switcher */}
          <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60">
            <button
              onClick={() => setActiveSubView('staff')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                activeSubView === 'staff'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Staff Accounts ({admins.length})
            </button>
            <button
              onClick={() => setActiveSubView('matrix')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                activeSubView === 'matrix'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Roles & Permission Matrix
            </button>
          </div>

          {canManageUsers && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Plus size={15} />
              <span>Invite Staff</span>
            </button>
          )}
        </div>
      </div>

      {activeSubView === 'staff' ? (
        <>
          {/* Metric Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Staff</span>
              <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">{stats.total}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">Active Access</span>
              <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1 block">{stats.active}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 block">Suspended</span>
              <span className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1 block">{stats.suspended}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 block">Expired Access</span>
              <span className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 block">{stats.expired}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-500 block">Global Scope</span>
              <span className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1 block">{stats.globalScope}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 block">Assigned Scope</span>
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">{stats.assignedScope}</span>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search staff name, email, or user ID..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-xs font-bold text-slate-700 dark:text-slate-300 outline-hidden"
              >
                <option value="all">All Roles</option>
                {PLATFORM_ROLE_OPTIONS.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-xs font-bold text-slate-700 dark:text-slate-300 outline-hidden"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="suspended">Suspended Only</option>
                <option value="invited">Invited Only</option>
                <option value="expired">Expired Only</option>
              </select>

              <select
                value={scopeFilter}
                onChange={(e) => setScopeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-xs font-bold text-slate-700 dark:text-slate-300 outline-hidden"
              >
                <option value="all">All Company Scopes</option>
                <option value="global">Global (All Companies)</option>
                <option value="assigned">Assigned Companies Only</option>
                <option value="none">No Company Access</option>
              </select>

              <button
                onClick={onRefresh}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 transition-colors"
                title="Refresh staff list"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Platform Staff Table */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Staff Member</th>
                    <th className="py-3.5 px-4">Platform Role</th>
                    <th className="py-3.5 px-4">Tenant Scope</th>
                    <th className="py-3.5 px-4">MFA State</th>
                    <th className="py-3.5 px-4">Access Expiry</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No platform staff accounts match the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const isExpired = user.expires_at && new Date(user.expires_at).getTime() < Date.now();
                      const assignedCount = (user.assigned_companies || []).length;
                      const isLastSuperAdmin = user.role === 'super_admin' && (user.is_last_super_admin || admins.filter((a) => a.role === 'super_admin' && a.status === 'active').length <= 1);

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300">
                                {user.name.charAt(0)}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block">{user.name}</span>
                                <span className="text-[11px] text-slate-400 font-mono">{user.email}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {getRoleBadge(user.role)}
                          </td>

                          <td className="py-3 px-4">
                            {user.company_scope_type === 'all' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/50">
                                <Building2 size={11} />
                                Global (All Companies)
                              </span>
                            ) : (
                              <button
                                onClick={() => setViewAssignedCompaniesUser(user)}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200/50 hover:bg-indigo-100 transition-colors"
                                title="Click to view assigned companies"
                              >
                                <Building2 size={11} />
                                <span>{assignedCount} Assigned {assignedCount === 1 ? 'Company' : 'Companies'}</span>
                                <ChevronRight size={11} />
                              </button>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50">
                              <ShieldCheck size={11} />
                              Enforced
                            </span>
                          </td>

                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                            {user.expires_at ? (
                              <span className={isExpired ? 'text-rose-600 font-bold' : ''}>
                                {new Date(user.expires_at).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">Permanent</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {getStatusBadge(user)}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Details */}
                              <button
                                onClick={() => setDetailUser(user)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="View effective permissions & activity"
                              >
                                <Eye size={15} />
                              </button>

                              {/* Edit Access */}
                              {canManageUsers && (
                                <button
                                  onClick={() => setEditUser({ ...user, assigned_companies: user.assigned_companies || [] })}
                                  className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                                  title="Edit Role & Company Scope"
                                >
                                  <Edit3 size={15} />
                                </button>
                              )}

                              {/* Suspend / Reactivate */}
                              {canManageUsers && (
                                user.status === 'active' ? (
                                  <button
                                    onClick={() => setSuspensionTarget(user)}
                                    disabled={isLastSuperAdmin}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                      isLastSuperAdmin
                                        ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                        : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                    }`}
                                    title={isLastSuperAdmin ? 'Cannot suspend last active Super Admin' : 'Suspend Account'}
                                  >
                                    <UserX size={15} />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setReactivateTarget(user)}
                                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                                    title="Reactivate Account"
                                  >
                                    <UserCheck size={15} />
                                  </button>
                                )
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
        </>
      ) : (
        /* Roles & Permissions Matrix Sub-View */
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-3">
            <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Specification Section 1.1: Platform vs. Tenant RBAC Isolation</p>
              <p className="mt-1 leading-relaxed">
                Platform staff permissions (<code>platform.*</code>) govern operations <em>across</em> customer accounts, multi-tenant billing, support impersonation sessions, and global audit trails. They are <strong>strictly separated</strong> from tenant-internal (<code>crm.*</code>) permissions, which are scoped only within an individual mover company's database and business rules.
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 w-1/3">Platform Permission Key</th>
                    {PLATFORM_ROLE_OPTIONS.map((role) => (
                      <th key={role.id} className="py-3.5 px-3 text-center">{role.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {PERMISSION_DEFINITIONS.map((perm) => (
                    <tr key={perm.code} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block">{perm.name}</span>
                        <code className="text-[11px] font-mono text-blue-600 dark:text-blue-400 block">{perm.code}</code>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">{perm.description}</span>
                      </td>

                      {PLATFORM_ROLE_OPTIONS.map((role) => (
                        <td key={role.id} className="py-3 px-3 text-center">
                          {role.id === 'super_admin' || role.permissions.includes(perm.code) ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400">
                              <Check size={14} />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                              ✕
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* Modal 1: Invite / Create Platform Staff Member                         */}
      {/* ---------------------------------------------------------------------- */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Invite Platform Staff Member</h3>
                <p className="text-xs text-slate-500">Create login identity and assign multi-tenant company scope</p>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleInviteSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Jordan Miller"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium outline-hidden"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Staff Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jordan@kargoflow.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium outline-hidden"
                  />
                </div>
              </div>

              {/* Role selection */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">System Role & Permissions</label>
                <select
                  value={formData.role}
                  onChange={(e) => {
                    const r = e.target.value;
                    setFormData({
                      ...formData,
                      role: r,
                      company_scope_type: defaultScopeForRole(r, formData.company_scope_type),
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-slate-200 outline-hidden"
                >
                  {PLATFORM_ROLE_OPTIONS.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  {PLATFORM_ROLES[formData.role]?.description}
                </p>
              </div>

              {/* Company Scope Selection */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Company Access Boundary</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 cursor-pointer">
                    <input
                      type="radio"
                      name="scope_type"
                      checked={formData.company_scope_type === 'all'}
                      disabled={!roleAllowsScope(formData.role, 'all')}
                      onChange={() => setFormData({ ...formData, company_scope_type: 'all' })}
                      className="text-blue-600"
                    />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Global Scope (All Companies)</span>
                      <span className="text-[10px] text-slate-400">Can view and manage all current and future tenant companies.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 cursor-pointer">
                    <input
                      type="radio"
                      name="scope_type"
                      checked={formData.company_scope_type === 'assigned'}
                      disabled={!roleAllowsScope(formData.role, 'assigned')}
                      onChange={() => setFormData({ ...formData, company_scope_type: 'assigned' })}
                      className="text-blue-600"
                    />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Specific Assigned Companies Only</span>
                      <span className="text-[10px] text-slate-400">Restricted strictly to explicitly assigned tenant companies.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 cursor-pointer">
                    <input
                      type="radio"
                      name="scope_type"
                      checked={formData.company_scope_type === 'none'}
                      disabled={!roleAllowsScope(formData.role, 'none')}
                      onChange={() => setFormData({ ...formData, company_scope_type: 'none', assigned_companies: [] })}
                      className="text-blue-600"
                    />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">No Tenant Company Access</span>
                      <span className="text-[10px] text-slate-400">Can work only with platform-level billing or catalog data.</span>
                    </div>
                  </label>
                </div>

                {/* Company multi-select checklist when assigned scope is selected */}
                {formData.company_scope_type === 'assigned' && (
                  <div className="mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="font-bold text-slate-700 dark:text-slate-300 block text-[11px]">Select Assigned Companies:</span>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {tenants.map((t) => {
                        const isChecked = formData.assigned_companies.includes(t.id);
                        return (
                          <label key={t.id} className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 cursor-pointer hover:bg-blue-50/40 transition-colors">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const nextAssigned = e.target.checked
                                    ? [...formData.assigned_companies, t.id]
                                    : formData.assigned_companies.filter((id) => id !== t.id);
                                  setFormData({ ...formData, assigned_companies: nextAssigned });
                                }}
                                className="rounded text-blue-600"
                              />
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-200 block">{t.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{t.subdomain} • ID: {t.id}</span>
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                              {t.functional_state || 'Active'}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Expiration preset */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Access Expiration</label>
                <div className="flex items-center gap-2 mb-2">
                  {[
                    { label: '30 Days', days: 30 },
                    { label: '90 Days', days: 90 },
                    { label: '1 Year', days: 365 },
                    { label: 'Permanent', days: null },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        if (p.days === null) {
                          setFormData({ ...formData, expires_at: '' });
                        } else {
                          const d = new Date();
                          d.setDate(d.getDate() + p.days);
                          setFormData({ ...formData, expires_at: d.toISOString().split('T')[0] });
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] font-bold hover:bg-blue-50 transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium outline-hidden"
                />
              </div>

              {/* Security safeguard notice */}
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-300 flex items-center gap-2">
                <ShieldCheck size={16} className="text-amber-600 shrink-0" />
                <span>MFA enrollment is automatically enforced for all platform staff accounts.</span>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  {isSubmitting && <Loader2 size={13} className="animate-spin" />}
                  <span>Issue Staff Invitation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* Modal 2: Edit Staff Scope & Role                                       */}
      {/* ---------------------------------------------------------------------- */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Platform Staff Access</h3>
                <p className="text-xs text-slate-500">{editUser.name} ({editUser.email})</p>
              </div>
              <button onClick={() => setEditUser(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editUser.name}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Platform Role</label>
                <select
                  value={editUser.role}
                  onChange={(e) => {
                    const r = e.target.value;
                    setEditUser({
                      ...editUser,
                      role: r,
                      company_scope_type: defaultScopeForRole(r, editUser.company_scope_type),
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-800 dark:text-slate-200 outline-hidden"
                >
                  {PLATFORM_ROLE_OPTIONS.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Company Scope</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 cursor-pointer">
                    <input
                      type="radio"
                      name="edit_scope"
                      checked={editUser.company_scope_type === 'all'}
                      disabled={!roleAllowsScope(editUser.role, 'all')}
                      onChange={() => setEditUser({ ...editUser, company_scope_type: 'all' })}
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200">Global (All Companies)</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 cursor-pointer">
                    <input
                      type="radio"
                      name="edit_scope"
                      checked={editUser.company_scope_type === 'assigned'}
                      disabled={!roleAllowsScope(editUser.role, 'assigned')}
                      onChange={() => setEditUser({ ...editUser, company_scope_type: 'assigned' })}
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200">Assigned Companies Only</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 cursor-pointer">
                    <input
                      type="radio"
                      name="edit_scope"
                      checked={editUser.company_scope_type === 'none'}
                      disabled={!roleAllowsScope(editUser.role, 'none')}
                      onChange={() => setEditUser({ ...editUser, company_scope_type: 'none', assigned_companies: [] })}
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200">No Tenant Company Access</span>
                  </label>
                </div>

                {editUser.company_scope_type === 'assigned' && (
                  <div className="mt-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="font-bold text-slate-700 dark:text-slate-300 block text-[11px]">Assigned Companies:</span>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {tenants.map((t) => {
                        const isChecked = (editUser.assigned_companies || []).includes(t.id);
                        return (
                          <label key={t.id} className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 cursor-pointer hover:bg-blue-50/40 transition-colors">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const current = editUser.assigned_companies || [];
                                  const nextAssigned = e.target.checked
                                    ? [...current, t.id]
                                    : current.filter((id) => id !== t.id);
                                  setEditUser({ ...editUser, assigned_companies: nextAssigned });
                                }}
                                className="rounded text-blue-600"
                              />
                              <span className="font-bold text-slate-800 dark:text-slate-200">{t.name}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {t.id}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Access Expiry Date</label>
                <input
                  type="date"
                  value={editUser.expires_at ? editUser.expires_at.slice(0, 10) : ''}
                  onChange={(e) => setEditUser({ ...editUser, expires_at: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium outline-hidden"
                />
              </div>

              {/* Operational Safeguard Notice */}
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-[11px] text-rose-900 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                <span>Operational safeguard: Modifying role or company scope automatically increments the user's session version and revokes existing active sessions.</span>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  {isSubmitting && <Loader2 size={13} className="animate-spin" />}
                  <span>Save Access Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* Modal 3: Suspend Staff Member                                          */}
      {/* ---------------------------------------------------------------------- */}
      {suspensionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Suspend Platform Staff Account</h3>
                <p className="text-slate-500">Immediate access revocation and session termination</p>
              </div>
            </div>

            <p className="text-slate-700 dark:text-slate-300">
              Are you sure you want to suspend <strong>{suspensionTarget.name}</strong> (<code>{suspensionTarget.email}</code>)? All active API tokens will be revoked immediately and login access will be blocked.
            </p>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Mandatory Audit Reason *</label>
              <textarea
                required
                rows={2}
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="e.g. Account suspended pending internal security investigation"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium outline-hidden"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSuspensionTarget(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || !suspensionReason.trim()}
                onClick={handleConfirmSuspend}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
              >
                {isSubmitting && <Loader2 size={13} className="animate-spin" />}
                <span>Confirm Suspension</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* Modal 4: Reactivate Staff Member                                       */}
      {/* ---------------------------------------------------------------------- */}
      {reactivateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600">
                <UserCheck size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Reactivate Staff Account</h3>
                <p className="text-slate-500">Restore platform operational privileges</p>
              </div>
            </div>

            <p className="text-slate-700 dark:text-slate-300">
              Reactivate platform staff privileges for <strong>{reactivateTarget.name}</strong> (<code>{reactivateTarget.email}</code>).
            </p>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Reason for Reactivation</label>
              <textarea
                rows={2}
                value={reactivateReason}
                onChange={(e) => setReactivateReason(e.target.value)}
                placeholder="e.g. Investigation completed and account clearance approved"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium outline-hidden"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReactivateTarget(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmReactivate}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
              >
                {isSubmitting && <Loader2 size={13} className="animate-spin" />}
                <span>Reactivate Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* Modal 5: Staff Member Detail View (Drawer)                             */}
      {/* ---------------------------------------------------------------------- */}
      {detailUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] text-xs">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base">
                  {detailUser.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{detailUser.name}</h3>
                  <p className="text-slate-500">{detailUser.email} • ID: {detailUser.id}</p>
                </div>
              </div>
              <button onClick={() => setDetailUser(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Profile summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Role</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">{PLATFORM_ROLES[detailUser.role]?.name || detailUser.role}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                  <span className="mt-0.5 block">{getStatusBadge(detailUser)}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">MFA State</span>
                  <span className="font-bold text-emerald-600 block mt-0.5">Enforced / Active</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Session Token</span>
                  <span className="font-mono text-slate-600 dark:text-slate-400 block mt-0.5">v{detailUser.session_version || 1}</span>
                </div>
              </div>

              {/* Effective Permissions */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                  <Key size={14} className="text-blue-600" />
                  <span>Effective Platform Permissions ({detailUser.permissions?.length || 0})</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {PERMISSION_DEFINITIONS.map((perm) => {
                    const isGranted = detailUser.role === 'super_admin' || (detailUser.permissions || []).includes(perm.code);
                    return (
                      <div
                        key={perm.code}
                        className={`p-2.5 rounded-xl border flex items-center justify-between ${
                          isGranted
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300'
                            : 'bg-slate-50/50 dark:bg-slate-950 border-slate-200/60 dark:border-slate-800/60 text-slate-400 opacity-60'
                        }`}
                      >
                        <div>
                          <span className="font-bold block text-[11px]">{perm.name}</span>
                          <span className="font-mono text-[9px] block opacity-75">{perm.code}</span>
                        </div>
                        {isGranted ? (
                          <span className="p-1 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400">
                            <Check size={12} />
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-[10px]">✕</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Company Scope & Assigned Companies */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                  <Building2 size={14} className="text-indigo-600" />
                  <span>Assigned Companies Scope</span>
                </h4>
                {detailUser.company_scope_type === 'all' ? (
                  <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 text-blue-900 dark:text-blue-300">
                    <strong>Global Administrative Scope:</strong> This user has unrestricted operational access across all {tenants.length} customer tenant companies.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {getAssignedCompanies(detailUser).length === 0 ? (
                      <p className="text-slate-400 py-2">No companies currently assigned.</p>
                    ) : (
                      getAssignedCompanies(detailUser).map((c) => (
                        <div key={c.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{c.name}</span>
                          <span className="text-slate-400 font-mono">{c.subdomain} • ID: {c.id}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailUser(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* Modal 6: Assigned Companies Quick Popover Modal                        */}
      {/* ---------------------------------------------------------------------- */}
      {viewAssignedCompaniesUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Assigned Companies Scope</h3>
                <p className="text-slate-500">{viewAssignedCompaniesUser.name} ({viewAssignedCompaniesUser.role_name || viewAssignedCompaniesUser.role})</p>
              </div>
              <button onClick={() => setViewAssignedCompaniesUser(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {getAssignedCompanies(viewAssignedCompaniesUser).length === 0 ? (
                <p className="text-slate-400 py-4 text-center">No assigned companies configured.</p>
              ) : (
                getAssignedCompanies(viewAssignedCompaniesUser).map((comp) => (
                  <div key={comp.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">{comp.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{comp.subdomain}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px]">
                      ID: {comp.id}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setViewAssignedCompaniesUser(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
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
