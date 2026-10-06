import React, { useState, useEffect, useMemo } from 'react';
import Card from '../../../shared/ui/Card';
import { 
  ChevronRight, Lock, Layout, 
  Search, Plus, Edit2, Loader2, CheckCircle2, 
  AlertCircle, Trash2, XCircle, Save, Users
} from 'lucide-react';
import { getRoles, getPermissions, updateRole, createRole, deleteRole , getBranches } from '../../../services/api';
import useCan from '../../../shared/auth/useCan';
import { useToast } from '../../../shared/context/ToastContext';
import { filterAccessibleBranches, resolveRoleBranchId } from '../../../shared/utils/branchScope';
import { useAuth } from '../../auth/context/AuthContext';
import { FEATURE_PERMISSION_CATALOG, PERMISSIONS } from '../../../shared/permissions/registry';

// --- LOGIC HELPER FUNCTIONS ---
const ACTION_KEYS = ['view', 'create', 'edit', 'delete', 'other'];
const ACTION_LABEL = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  other: 'Other',
};

const LEAD_ACTION_CODENAMES = new Set([
  PERMISSIONS.LEAD_VIEW,
  PERMISSIONS.LEAD_CREATE,
  PERMISSIONS.LEAD_EDIT,
  PERMISSIONS.LEAD_ASSIGN,
  PERMISSIONS.LEAD_CONVERT,
]);

const actionFromCodename = (codename) => {
  if (!codename) return 'other';
  const tail = codename.includes('.') ? codename.split('.').pop() : codename;
  const head = tail.includes('_') ? tail.split('_')[0] : tail;
  const normalized = String(head).toLowerCase();
  if (normalized === 'view' || normalized === 'read' || normalized === 'list') return 'view';
  if (normalized === 'add' || normalized === 'create') return 'create';
  if (normalized === 'change' || normalized === 'edit' || normalized === 'update') return 'edit';
  if (normalized === 'delete' || normalized === 'remove') return 'delete';
  return 'other';
};

const groupPermissionsByModule = (permissions, query) => {
  const q = (query || '').trim().toLowerCase();
  const filtered = q
    ? permissions.filter(p =>
        String(p.module || '').toLowerCase().includes(q) ||
        String(p.name || '').toLowerCase().includes(q) ||
        String(p.codename || '').toLowerCase().includes(q)
      )
    : permissions;

  const modules = new Map();
  for (const perm of filtered) {
    const canonical = FEATURE_PERMISSION_CATALOG[perm.codename] || {};
    const moduleName = canonical.module || perm.module || 'Other';
    const label = canonical.label || perm.name || perm.label || perm.codename;
    if (!modules.has(moduleName)) {
      modules.set(moduleName, {
        module: moduleName,
        actions: { view: [], create: [], edit: [], delete: [], other: [] },
        all: [],
      });
    }
    const group = modules.get(moduleName);
    const normalizedPerm = {
      ...perm,
      module: moduleName,
      name: label,
      label,
    };
    group.all.push(normalizedPerm);
    group.actions[actionFromCodename(normalizedPerm.codename)].push(normalizedPerm);
  }

  return Array.from(modules.values())
    .map(m => ({
      ...m,
      all: m.all.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))),
      actions: Object.fromEntries(
        ACTION_KEYS.map(k => [k, m.actions[k].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))])
      ),
    }))
    .sort((a, b) => String(a.module).localeCompare(String(b.module)));
};

const normalizeListResponse = (value) => {
  if (Array.isArray(value)) return value;
  return value?.results || [];
};

const resolveRoleBranchLabel = (role, branchNameById) => {
  const branchId = resolveRoleBranchId(role);
  if (branchId !== null && !Number.isNaN(Number(branchId))) {
    return branchNameById.get(Number(branchId)) || `Branch #${branchId}`;
  }

  const inlineName =
    role?.branch_name ||
    role?.branch_label ||
    role?.branch_details?.name ||
    (Array.isArray(role?.branch_details) ? role.branch_details[0]?.name : null);

  return inlineName || 'Unassigned Branch';
};

const normalizeRoleDisplayName = (role) => {
  const rawName = String(role?.name || '').trim();
  if (!rawName) return 'Untitled Role';

  const lower = rawName.toLowerCase();
  if (lower === 'lead') return 'Leads';

  const perms = Array.isArray(role?.permissions_details) ? role.permissions_details : [];
  const hasLeadView = perms.some((perm) => perm?.codename === PERMISSIONS.LEAD_VIEW);
  const hasLeadActions = perms.some((perm) =>
    [
      PERMISSIONS.LEAD_CREATE,
      PERMISSIONS.LEAD_EDIT,
      PERMISSIONS.LEAD_ASSIGN,
      PERMISSIONS.LEAD_CONVERT,
    ].includes(perm?.codename)
  );

  if (lower === 'lead' || (hasLeadView && hasLeadActions)) {
    return 'Leads';
  }

  return rawName;
};

// --- UI COMPONENTS ---

const PermissionPill = ({ label, isGranted, onToggle, disabled }) => (
  <button
    type="button"
    onClick={onToggle}
    disabled={disabled}
    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer active:scale-95'
    } ${
      isGranted 
        ? 'bg-primary/10 text-primary ring-1 ring-primary/30 shadow-sm' 
        : 'bg-card text-muted ring-1 ring-border hover:ring-disabled hover:bg-subtle hover:text-body'
    }`}
  >
    {isGranted && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
    {label}
  </button>
);

const RoleFormModal = ({ title, initialData, branches, onSave, onCancel, isSaving }) => {
  const initialType = initialData?.name === 'Company Owner' && !initialData?.branch ? 'company_owner' : 'branch_role';
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    branch: initialData?.branch || null,
    roleType: initialType,
  });

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleRoleTypeChange = (value) => {
    if (value === 'company_owner') {
      setFormData((prev) => ({
        ...prev,
        roleType: value,
        name: 'Company Owner',
        description: prev.description || 'Full superuser access for this company.',
        branch: null,
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      roleType: value,
      name: prev.name === 'Company Owner' ? '' : prev.name,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name: formData.roleType === 'company_owner' ? 'Company Owner' : formData.name,
      description: formData.description,
      branch: formData.roleType === 'company_owner' ? null : formData.branch,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[60] p-4 backdrop-blur-sm">
      <Card className="max-w-md w-full p-6 space-y-6 rounded-3xl shadow-2xl">
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-bold text-heading">{title}</h3>
          <button type="button" onClick={onCancel} className="text-muted hover:text-body transition-colors">
            <XCircle size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[0.625rem] font-bold uppercase tracking-widest text-muted">Role Type</label>
            <select
              value={formData.roleType}
              onChange={(e) => handleRoleTypeChange(e.target.value)}
              className="w-full px-4 py-3 bg-subtle border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              <option value="branch_role">Branch Role</option>
              <option value="company_owner">Company Owner</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[0.625rem] font-bold uppercase tracking-widest text-muted">Role Name</label>
            <input 
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={formData.roleType === 'company_owner'}
              className="w-full px-4 py-3 bg-subtle border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[0.625rem] font-bold uppercase tracking-widest text-muted">Description</label>
            <input 
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-subtle border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
              
            />
          </div>
          {formData.roleType === 'company_owner' ? (
            <div className="rounded-xl border border-border bg-subtle px-4 py-3 text-sm text-body">
              Company Owner is the superuser role for this company and is not tied to a branch.
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-[0.625rem] font-bold uppercase tracking-widest text-muted">Branch Scope</label>
              <select
                name="branch"
                value={formData.branch ?? ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, branch: e.target.value ? Number(e.target.value) : null }))}
                className="w-full px-4 py-3 bg-subtle border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="">Select branch</option>
                {(branches || []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl font-bold bg-border text-body hover:bg-border transition-all">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl font-bold hover:bg-[#003d2f] transition-all disabled:opacity-70">
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : null}
              Save Role
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

const ConfirmDelete = ({ name, onConfirm, onCancel, isLoading }) => (
  <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[60] p-4 backdrop-blur-sm">
    <Card className="max-w-sm w-full p-6 space-y-4 text-center rounded-3xl shadow-2xl">
      <AlertCircle size={48} className="text-[#791F1F] mx-auto" />
      <h3 className="text-xl font-bold text-heading">Confirm Deletion</h3>
      <p className="text-sm text-muted">
        Are you sure you want to delete the role: <span className="font-bold text-body">{name}</span>? This action cannot be undone.
      </p>
      <div className="flex justify-center gap-3 mt-6">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-body bg-border hover:bg-border transition-colors font-bold">Cancel</button>
        <button type="button" onClick={onConfirm} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#791F1F] text-white font-bold hover:bg-[#b0000a] transition-all disabled:opacity-70">
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
          {isLoading ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </Card>
  </div>
);

// --- MAIN COMPONENT ---

const RolesPermissions = ({ branchId }) => {
  const { user } = useAuth();
  const { canAll } = useCan();
  const { showToast } = useToast();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRoleId, setSelectedRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsLoadingSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [rolePerms, setRolePerms] = useState([]);
  const [permSearch, setPermSearch] = useState('');
  const [isRolesOpen, setIsRolesOpen] = useState(false);
  
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleDraft, setRoleDraft] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState('');

  useEffect(() => {
    if (branchId) {
      setBranchFilter(String(branchId));
    }
  }, [branchId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rolesRes, permsRes, branchesRes] = await Promise.all([
          getRoles(branchFilter ? { branch: branchFilter } : undefined),
          getPermissions(),
          getBranches(),
        ]);
        const roleRows = normalizeListResponse(rolesRes);
        const permissionRows = normalizeListResponse(permsRes);
        const branchRows = filterAccessibleBranches(user, normalizeListResponse(branchesRes));
        setRoles(roleRows);
        setPermissions(permissionRows);
        setBranches(branchRows);

        if (!branchFilter && branchRows.length) {
          const defaultBranchId = branchId ? String(branchId) : String(branchRows[0].id);
          setBranchFilter(defaultBranchId);
        }

        if (roleRows.length > 0) {
          const nextRole = roleRows[0];
          setSelectedRole(nextRole.id);
          setRolePerms(nextRole.permissions_details?.map((p) => p.codename) || []);
        } else {
          setSelectedRole(null);
          setRolePerms([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchFilter, user, branchId]);

  const handleTogglePerm = (codename) => {
    setRolePerms(prev => prev.includes(codename) ? prev.filter(p => p !== codename) : [...prev, codename]);
  };

  const setManyRolePerms = (codenames, enabled) => {
    setRolePerms(prev => {
      const next = new Set(prev || []);
      for (const c of codenames) {
        if (enabled) next.add(c);
        else next.delete(c);
      }
      return Array.from(next);
    });
  };

  const handleUpdatePermissions = async () => {
    if (!canAll([PERMISSIONS.ROLE_EDIT])) {
      showToast('You do not have permission to edit roles.', 'warning');
      return;
    }
    setIsLoadingSaving(true);
    try {
      const permIds = permissions.filter(p => rolePerms.includes(p.codename)).map(p => p.id);
      const response = await updateRole(selectedRoleId, { permissions: permIds });
      setRoles((prev) => prev.map(r => r.id === selectedRoleId ? response : r));
      setMessage({ type: 'success', text: 'Changes updated!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) { setMessage({ type: 'error', text: 'Error syncing.' }); }
    finally { setIsLoadingSaving(false); }
  };

  const moduleGroups = useMemo(() => groupPermissionsByModule(permissions, permSearch), [permissions, permSearch]);
  const currentRole = roles.find(r => r.id === selectedRoleId);
  const currentRoleLeadPerms = useMemo(
    () => (Array.isArray(currentRole?.permissions_details) ? currentRole.permissions_details : [])
      .map((perm) => perm?.codename)
      .filter((codename) => LEAD_ACTION_CODENAMES.has(codename)),
    [currentRole]
  );
  const hasLeadView = useMemo(
    () => currentRoleLeadPerms.includes(PERMISSIONS.LEAD_VIEW),
    [currentRoleLeadPerms]
  );
  const hasLeadActionsWithoutView = useMemo(
    () => currentRoleLeadPerms.some((codename) => codename !== PERMISSIONS.LEAD_VIEW) && !hasLeadView,
    [currentRoleLeadPerms, hasLeadView]
  );
  const branchNameById = useMemo(
    () => new Map((branches || []).map((b) => [Number(b.id), b.name])),
    [branches]
  );
  const selectedBranchRoles = useMemo(() => {
    if (!branchFilter) return roles;
    return roles.filter((role) => {
      const roleBranchId = resolveRoleBranchId(role);
      return roleBranchId !== null && String(roleBranchId) === String(branchFilter);
    });
  }, [roles, branchFilter]);

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="relative flex flex-col gap-6 p-2 bg-[#f8fafc] min-h-screen animate-in fade-in duration-300 overflow-hidden">

      {/* MAIN CONTENT Area */}
      <div className="flex-1 min-w-0 z-0">
        <Card className="border-none shadow-xl shadow-border/50 overflow-hidden bg-card rounded-2xl h-full flex flex-col">
          
          {/* Header */}
          <div className="p-6 border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-bold text-heading tracking-tight">{currentRole?.name}</h3>
                  <span className="px-2.5 py-0.5 bg-border text-muted text-[0.625rem] font-bold rounded-full uppercase tracking-wider">
                    Permissions
                  </span>
                  {hasLeadActionsWithoutView && (
                    <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[0.625rem] font-bold rounded-full uppercase tracking-wider">
                      Missing View Leads
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted">Manage feature-level access control.</p>
                {hasLeadActionsWithoutView && (
                  <p className="mt-1 text-xs text-amber-700">
                    This role can modify leads but cannot open the Leads page until `View Leads` is granted.
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input
                  value={permSearch}
                  onChange={(e) => setPermSearch(e.target.value)}
                  placeholder="Search features or permissions..."
                  className="w-full pl-9 pr-3 py-2 bg-subtle border border-border focus:bg-card focus:ring-2 focus:ring-primary/10 outline-none rounded-xl text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!branchId && (
                  <select
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="px-3 py-2 bg-card border border-border text-body rounded-xl text-sm font-semibold"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}
                <button 
                  onClick={() => setIsRolesOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-card border border-border text-body rounded-xl text-sm font-bold shadow-sm hover:bg-subtle transition-all active:scale-95"
                >
                  <Users size={18} />
                  Available Roles
                </button>

                {!currentRole?.is_system_role && canAll([PERMISSIONS.ROLE_EDIT]) && (
                  <button 
                    onClick={handleUpdatePermissions} disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#003d2f] transition-all disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Update Changes
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Feature Grid Area */}
          <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-200px)] bg-subtle/50">
            {moduleGroups.map((group) => {
              const allCodenames = group.all.map(p => p.codename);
              const selectedCount = group.all.filter(p => rolePerms.includes(p.codename)).length;
              const isAllSelected = selectedCount === group.all.length && group.all.length > 0;

              return (
                <div key={group.module} className="flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-5 rounded-2xl border border-border bg-card hover:border-disabled hover:shadow-sm transition-all gap-3 md:gap-4 min-w-0">
                  <div className="flex items-center gap-3 sm:gap-4 w-full md:w-1/3 min-w-0 shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-subtle flex items-center justify-center text-muted shrink-0">
                      <Layout size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block font-bold text-body text-sm sm:text-base break-words [overflow-wrap:anywhere] leading-snug">{group.module}</span>
                      <span className="text-[0.625rem] font-bold text-muted uppercase tracking-widest block mt-0.5 whitespace-nowrap">
                        {selectedCount}/{group.all.length} active
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                    {ACTION_KEYS.map((action) => {
                      const perms = group.actions[action] || [];
                      if (!perms.length) return null;
                      return perms.map((perm) => (
                        <PermissionPill
                          key={perm.codename}
                          label={perm.name || `${ACTION_LABEL[action]}: ${perm.codename}`}
                          isGranted={rolePerms.includes(perm.codename)}
                          onToggle={() => handleTogglePerm(perm.codename)}
                          disabled={currentRole?.is_system_role}
                        />
                      ));
                    })}
                  </div>

                  <div className="w-full md:w-auto mt-2 md:mt-0 flex justify-end md:pl-4 md:border-l border-border shrink-0">
                    <button
                      type="button" disabled={currentRole?.is_system_role}
                      onClick={() => setManyRolePerms(allCodenames, !isAllSelected)}
                      className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${
                        isAllSelected ? 'bg-border text-muted' : 'bg-card border border-border text-body hover:border-disabled'
                      }`}
                    >
                      {isAllSelected ? 'Clear All' : 'Select All'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ROLES DRAWER */}
      <div className={`fixed inset-y-0 right-0 w-full max-w-80 bg-card shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isRolesOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        <div className="p-6 border-b border-border flex items-center justify-between bg-subtle/50">
          <div className="flex items-center gap-2">
            <Users className="text-primary" size={20} />
            <h3 className="text-sm font-bold text-heading uppercase tracking-wider">Available Roles</h3>
          </div>
          <button 
            onClick={() => setIsRolesOpen(false)}
            className="p-2 hover:bg-border rounded-full transition-colors"
          >
            <XCircle size={20} className="text-muted" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {canAll([PERMISSIONS.ROLE_CREATE]) && (
            <button 
              onClick={() => { setRoleDraft(null); setShowRoleModal(true); }}
              className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-border rounded-xl text-primary font-bold hover:bg-subtle transition-all"
            >
              <Plus size={18} /> Create New Role
            </button>
          )}

          {selectedBranchRoles.map((role) => {
            const isSelected = selectedRoleId === role.id;
            return (
              <div
                key={role.id}
                role="button"
                tabIndex={0}
                onClick={() => { 
                  setSelectedRole(role.id); 
                  setRolePerms(role.permissions_details?.map(p => p.codename) || []);
                  setIsRolesOpen(false);
                }}
                className={`w-full text-left p-4 rounded-xl transition-all border relative overflow-hidden group cursor-pointer min-h-[88px] ${
                  isSelected ? 'bg-card border-primary shadow-md ring-1 ring-primary/10' : 'bg-transparent border-transparent hover:bg-border'
                }`}
              >
                {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-bold truncate ${isSelected ? 'text-primary' : 'text-body'}`}>
                    {normalizeRoleDisplayName(role)}
                  </span>
                  {role.is_system_role && <Lock size={12} className="text-disabled" />}
                </div>
                <p className="text-[0.625rem] text-muted line-clamp-2">
                  {role.description || 'No description provided.'}
                </p>
                <p className="mt-1 text-[0.625rem] font-bold uppercase tracking-widest text-body/70">
                  {resolveRoleBranchLabel(role, branchNameById)}
                </p>
                {String(role.name || '').toLowerCase().includes('lead') && (
                  <p className="mt-2 text-[0.625rem] font-semibold text-amber-700">
                    Leads access requires `View Leads` for sidebar and route access.
                  </p>
                )}
                
                {!role.is_system_role && (
                  <div className="flex items-center gap-1.5 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canAll([PERMISSIONS.ROLE_EDIT]) && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setRoleDraft(role); setShowRoleModal(true); }}
                        className="p-1.5 rounded-lg bg-subtle text-primary hover:bg-[#d4e9f4]"
                      >
                        <Edit2 size={12} />
                      </button>
                    )}
                    {canAll([PERMISSIONS.ROLE_DELETE]) && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setRoleToDelete(role); setShowDeleteConfirm(true); }}
                        className="p-1.5 rounded-lg bg-[#FDE8E8]/30 text-[#791F1F] hover:bg-[#FDE8E8]/50"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {!selectedBranchRoles.length && (
            <div className="rounded-xl border border-dashed border-border bg-subtle px-4 py-6 text-center text-sm text-muted">
              No roles found for the selected branch.
            </div>
          )}
        </div>
      </div>

      {/* Backdrop for Drawer */}
      {isRolesOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm transition-all animate-in fade-in"
          onClick={() => setIsRolesOpen(false)}
        />
      )}

      {/* Modals */}
      {showRoleModal && (
        <RoleFormModal
          title={roleDraft?.id ? 'Edit Role' : 'Create Role'}
          initialData={roleDraft || { branch: branchFilter ? Number(branchFilter) : null }}
          branches={branches}
          isSaving={isSaving}
          onCancel={() => { setShowRoleModal(false); setRoleDraft(null); }}
          onSave={async (payload) => {
            if (roleDraft?.id && !canAll([PERMISSIONS.ROLE_EDIT])) {
              showToast('You do not have permission to edit roles.', 'warning');
              return;
            }
            if (!roleDraft?.id && !canAll([PERMISSIONS.ROLE_CREATE])) {
              showToast('You do not have permission to create roles.', 'warning');
              return;
            }
            setIsLoadingSaving(true);
            try {
              let res;
              if (roleDraft?.id) {
                res = await updateRole(roleDraft.id, payload);
              } else {
                res = await createRole(payload);
              }
              const rolesRes = await getRoles(branchFilter ? { branch: branchFilter } : undefined);
              setRoles(Array.isArray(rolesRes) ? rolesRes : rolesRes?.results || []);
              if (res?.id) {
                setSelectedRole(res.id);
                setRolePerms(res.permissions_details?.map(p => p.codename) || []);
              }
              setShowRoleModal(false);
              setRoleDraft(null);
            } catch (err) { 
              console.error(err); 
            } finally { 
              setIsLoadingSaving(false); 
            }
          }}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDelete
          name={roleToDelete?.name}
          isLoading={isSaving}
          onCancel={() => { setShowDeleteConfirm(false); setRoleToDelete(null); }}
          onConfirm={async () => {
            if (!canAll([PERMISSIONS.ROLE_DELETE])) {
              showToast('You do not have permission to delete roles.', 'warning');
              return;
            }
            setIsLoadingSaving(true);
            try {
              await deleteRole(roleToDelete.id);
              const rolesRes = await getRoles(branchFilter ? { branch: branchFilter } : undefined);
              const rolesArray = Array.isArray(rolesRes) ? rolesRes : rolesRes?.results || [];
              setRoles(rolesArray);
              const nextRole = rolesArray[0];
              setSelectedRole(nextRole?.id || null);
              setRolePerms(nextRole?.permissions_details?.map(p => p.codename) || []);
              setShowDeleteConfirm(false);
              setRoleToDelete(null);
              setIsRolesOpen(false); 
            } catch (err) {
              console.error(err);
            } finally {
              setIsLoadingSaving(false);
            }
          }}
        />
      )}
    </div>
  );
};

export default RolesPermissions;
