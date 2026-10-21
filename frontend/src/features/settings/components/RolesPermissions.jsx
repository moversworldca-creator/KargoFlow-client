import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Card from '../../../shared/ui/Card';
import {
  Search,
  Plus,
  Edit2,
  Loader2,
  AlertCircle,
  XCircle,
  Save,
  Users,
  Lock,
  Power,
  RotateCcw,
  ShieldAlert,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  getRoles,
  getPermissions,
  getRolePermissions,
  grantRolePermission,
  revokeRolePermission,
  createRole,
  updateRole,
  deactivateRole,
  reactivateRole,
} from '../../../services/api';
import { useToast } from '../../../shared/context/ToastContext';
import { useUserAdminAccess } from '../userManagement/permissions';
import PermissionMatrix from '../userManagement/PermissionMatrix';
import { defaultScope } from '../userManagement/matrixModel';
import RolePeople from '../userManagement/RolePeople';
import { describeError } from '../userManagement/errors';
import { featureMode, isReadOnlyMode, useEntitlements, useRefreshAfterChange } from '../userManagement/queries';
import {
  SCOPE_LABELS,
  normalizeListResponse,
  computePermissionDiffs,
  areGrantsEqual,
  SCOPE_HELP,
} from './rolesPermissionsUtils';

// Modal: Create or Edit Role Name & Description
const RoleFormModal = ({ title, initialData, onSave, onCancel, isSaving }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim() });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-form-modal-title"
      className="fixed inset-0 bg-black/50 flex justify-center items-center z-[60] p-4 backdrop-blur-sm"
    >
      <Card className="max-w-md w-full p-6 space-y-5 rounded-2xl shadow-2xl bg-card">
        <div className="flex items-start justify-between">
          <h3 id="role-form-modal-title" className="text-xl font-bold text-heading">
            {title}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            className="text-muted hover:text-body transition-colors"
          >
            <XCircle size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="role-name-input" className="text-xs font-bold uppercase tracking-wider text-muted">
              Role Name <span className="text-red-500">*</span>
            </label>
            <input
              id="role-name-input"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sales Representative"
              required
              autoFocus
              className="w-full px-4 py-2.5 bg-subtle border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-body"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="role-description-input" className="text-xs font-bold uppercase tracking-wider text-muted">
              Description
            </label>
            <textarea
              id="role-description-input"
              name="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this role's purpose..."
              className="w-full px-4 py-2.5 bg-subtle border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-body resize-none"
            />
          </div>

          <div className="rounded-xl border border-border bg-subtle p-3 text-xs text-muted flex items-start gap-2">
            <Info size={16} className="text-primary mt-0.5 shrink-0" />
            <span>
              Roles are tenant-wide. Individual permissions granted to this role specify their scope (own, assigned, branch, or company).
            </span>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl font-bold bg-subtle text-body border border-border hover:bg-border transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
              {initialData?.id ? 'Save Changes' : 'Create Role'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

// Modal: Confirm Deactivate or Reactivate
const ConfirmDeactivateModal = ({ role, onConfirm, onCancel, isLoading }) => {
  const isDeactivating = role?.is_active;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-deactivate-title"
      className="fixed inset-0 bg-black/50 flex justify-center items-center z-[60] p-4 backdrop-blur-sm"
    >
      <Card className="max-w-md w-full p-6 space-y-4 text-center rounded-2xl shadow-2xl bg-card">
        {isDeactivating ? (
          <ShieldAlert size={44} className="text-amber-600 mx-auto" />
        ) : (
          <Power size={44} className="text-primary mx-auto" />
        )}
        <h3 id="confirm-deactivate-title" className="text-lg font-bold text-heading">
          {isDeactivating ? 'Deactivate Role' : 'Reactivate Role'}
        </h3>
        <p className="text-sm text-muted">
          {isDeactivating ? (
            <>
              Are you sure you want to deactivate <span className="font-bold text-body">{role?.name}</span>? Users assigned to this role will no longer receive its permissions until it is reactivated.
            </>
          ) : (
            <>
              Are you sure you want to reactivate <span className="font-bold text-body">{role?.name}</span>? Users assigned to this role will resume having its granted permissions.
            </>
          )}
        </p>
        <div className="flex justify-center gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-body bg-subtle border border-border hover:bg-border transition-colors font-bold text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-70 ${
              isDeactivating ? 'bg-amber-600 hover:bg-amber-700' : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
            {isDeactivating ? 'Deactivate' : 'Reactivate'}
          </button>
        </div>
      </Card>
    </div>
  );
};

// Modal: Confirm Discard Unsaved Changes
const ConfirmDiscardModal = ({ roleName, onConfirm, onCancel }) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="confirm-discard-title"
    className="fixed inset-0 bg-black/50 flex justify-center items-center z-[60] p-4 backdrop-blur-sm"
  >
    <Card className="max-w-sm w-full p-6 space-y-4 text-center rounded-2xl shadow-2xl bg-card">
      <AlertCircle size={44} className="text-amber-500 mx-auto" />
      <h3 id="confirm-discard-title" className="text-lg font-bold text-heading">
        Unsaved Changes
      </h3>
      <p className="text-sm text-muted">
        You have unsaved permission changes for <span className="font-bold text-body">{roleName}</span>. Switching roles will discard these changes.
      </p>
      <div className="flex justify-center gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl text-body bg-subtle border border-border hover:bg-border transition-colors font-bold text-sm"
        >
          Keep Editing
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-4 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-sm hover:bg-amber-700 transition-all"
        >
          Discard & Switch
        </button>
      </div>
    </Card>
  </div>
);

// Main Component
const RolesPermissions = () => {
  const { showToast } = useToast();
  const access = useUserAdminAccess();
  const refreshAfterChange = useRefreshAfterChange();
  const entitlements = useEntitlements(access.viewEntitlements).data;
  const readOnly = isReadOnlyMode(entitlements);
  // null when the plan cannot be read (no entitlements.view): the server's answer decides.
  const customRolesMode = featureMode(entitlements, 'crm.custom_roles');
  const customRolesEntitled = customRolesMode === null ? null : customRolesMode === 'write';

  // Editing a role (name, active state, permission grants) is rbac_roles.manage;
  // creating one is rbac_roles.create. Neither implies the other.
  const canManageRoles = access.manageRoles && !readOnly;
  const canCreateRoles = access.createRoles && !readOnly && customRolesEntitled !== false;

  // Data state
  const [roles, setRoles] = useState([]);
  const [permissionsCatalog, setPermissionsCatalog] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);

  // Grants state: Map<permission_key, scope>
  const [currentGrants, setCurrentGrants] = useState(new Map());
  const [draftGrants, setDraftGrants] = useState(new Map());

  // Loading & status states
  const [isLoadingInit, setIsLoadingInit] = useState(true);
  const [initError, setInitError] = useState(null);
  const [isLoadingGrants, setIsLoadingGrants] = useState(false);
  const [grantsError, setGrantsError] = useState(null);
  const [isSavingGrants, setIsSavingGrants] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Search & filter states
  const [roleSearch, setRoleSearch] = useState('');
  const [roleTab, setRoleTab] = useState('permissions');

  // Modals state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleDraft, setRoleDraft] = useState(null);
  const [isSavingRole, setIsSavingRole] = useState(false);

  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [roleToToggleActive, setRoleToToggleActive] = useState(null);
  const [isTogglingActive, setIsTogglingActive] = useState(false);

  const [pendingSwitchRoleId, setPendingSwitchRoleId] = useState(null);

  // Request race guard for role grants loading
  const grantRequestRef = useRef(0);
  // Scopes held besides the one shown, per permission key (see loadRoleGrants).
  const extraScopesRef = useRef(new Map());

  // Initial load
  const loadInitialData = useCallback(async () => {
    try {
      const [rolesRes, permsRes] = await Promise.all([getRoles(), getPermissions()]);
      const roleRows = normalizeListResponse(rolesRes);
      const permRows = normalizeListResponse(permsRes);

      setRoles(roleRows);
      setPermissionsCatalog(permRows);
      setInitError(null);

      setSelectedRoleId((prevSelected) => {
        if (prevSelected && roleRows.some((r) => r.id === prevSelected)) {
          return prevSelected;
        }
        return roleRows.length > 0 ? roleRows[0].id : null;
      });
    } catch (err) {
      setInitError(describeError(err, 'Failed to load roles or permissions catalog. Please try again.').message);
    } finally {
      setIsLoadingInit(false);
    }
  }, []);

  const handleRetryInitial = () => {
    setIsLoadingInit(true);
    setInitError(null);
    loadInitialData();
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInitialData();
  }, [loadInitialData]);

  // Load grants for selected role with stale-response protection
  const loadRoleGrants = useCallback(async (roleId) => {
    if (!roleId) {
      setCurrentGrants(new Map());
      setDraftGrants(new Map());
      setIsLoadingGrants(false);
      return;
    }

    const reqId = ++grantRequestRef.current;

    try {
      const res = await getRolePermissions(roleId);
      if (reqId !== grantRequestRef.current) return;

      const items = normalizeListResponse(res);
      // A role may hold one permission at several scopes (one row each). The
      // editor shows the broadest; the others are remembered so that changing
      // or removing the permission revokes every row, not just one.
      const rank = { own: 0, assigned: 1, branch: 2, company: 3 };
      const scopesByKey = new Map();
      for (const item of items) {
        const key = item.permission_key || item.codename || item;
        if (!key) continue;
        if (!scopesByKey.has(key)) scopesByKey.set(key, []);
        scopesByKey.get(key).push(item.scope || 'company');
      }
      const grantsMap = new Map();
      const extra = new Map();
      for (const [key, scopes] of scopesByKey) {
        const sorted = [...scopes].sort((a, b) => (rank[b] ?? 0) - (rank[a] ?? 0));
        grantsMap.set(key, sorted[0]);
        if (sorted.length > 1) extra.set(key, sorted.slice(1));
      }
      extraScopesRef.current = extra;
      setCurrentGrants(grantsMap);
      setDraftGrants(new Map(grantsMap));
      setGrantsError(null);
    } catch (err) {
      if (reqId !== grantRequestRef.current) return;
      setGrantsError(describeError(err, 'Could not load permissions for this role.').message);
    } finally {
      if (reqId === grantRequestRef.current) {
        setIsLoadingGrants(false);
      }
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRoleGrants(selectedRoleId);
  }, [selectedRoleId, loadRoleGrants]);

  const handleRetryGrants = () => {
    setIsLoadingGrants(true);
    setGrantsError(null);
    loadRoleGrants(selectedRoleId);
  };

  const selectedRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) || null;
  }, [roles, selectedRoleId]);

  const isDirty = useMemo(() => {
    return !areGrantsEqual(currentGrants, draftGrants);
  }, [currentGrants, draftGrants]);

  // Handle Role selection with dirty check
  const handleSelectRole = (newRoleId) => {
    if (newRoleId === selectedRoleId) return;
    if (isDirty) {
      setPendingSwitchRoleId(newRoleId);
    } else {
      setSaveError(null);
      setSelectedRoleId(newRoleId);
    }
  };

  const handleConfirmDiscardSwitch = () => {
    if (pendingSwitchRoleId !== null) {
      setSaveError(null);
      setSelectedRoleId(pendingSwitchRoleId);
      setPendingSwitchRoleId(null);
    }
  };

  // Permission matrix toggle & scope change
  const handleTogglePermission = (meta, currentGranted) => {
    if (!canManageRoles || selectedRole?.is_system_role) return;

    setDraftGrants((prev) => {
      const next = new Map(prev);
      if (currentGranted) {
        next.delete(meta.key);
      } else {
        // Default scope: prefer 'company' if allowed, otherwise first allowed scope
        const defaultScope = meta.allowedScopes.includes('company')
          ? 'company'
          : meta.allowedScopes[0] || 'company';
        next.set(meta.key, defaultScope);
      }
      return next;
    });
  };

  const handleChangeScope = (permKey, newScope) => {
    if (!canManageRoles || selectedRole?.is_system_role) return;

    setDraftGrants((prev) => {
      const next = new Map(prev);
      if (next.has(permKey)) {
        next.set(permKey, newScope);
      }
      return next;
    });
  };

  // Page presets from the matrix: none / view only / everything on that page.
  const handleSetPage = (items, level) => {
    if (!canManageRoles || selectedRole?.is_system_role) return;
    setDraftGrants((prev) => {
      const next = new Map(prev);
      for (const item of items) {
        const wanted = level === 'all' || (level === 'view' && item.action === 'view');
        if (!wanted) next.delete(item.permission_key);
        else if (!next.has(item.permission_key)) next.set(item.permission_key, defaultScope(item.scopes));
      }
      return next;
    });
  };

  // Discard changes
  const handleDiscardChanges = () => {
    setDraftGrants(new Map(currentGrants));
    setSaveError(null);
  };

  // Save changes via diff engine
  const handleSaveGrants = async () => {
    if (!canManageRoles || selectedRole?.is_system_role || !selectedRoleId) return;

    const { toGrant, toRevoke } = computePermissionDiffs(currentGrants, draftGrants);
    if (toGrant.length === 0 && toRevoke.length === 0) return;
    // A changed or removed permission loses all of its rows on this role.
    for (const key of new Set(toRevoke.map((item) => item.permission_key))) {
      for (const scope of extraScopesRef.current.get(key) || []) {
        if (!(draftGrants.get(key) === scope)) toRevoke.push({ permission_key: key, scope });
      }
    }

    setIsSavingGrants(true);
    setSaveError(null);

    const ops = [
      ...toRevoke.map((item) => ({ type: 'revoke', item, promise: revokeRolePermission(selectedRoleId, item) })),
      ...toGrant.map((item) => ({ type: 'grant', item, promise: grantRolePermission(selectedRoleId, item) })),
    ];

    const settled = await Promise.allSettled(ops.map((o) => o.promise));
    const failures = [];

    settled.forEach((res, idx) => {
      if (res.status === 'rejected') {
        const op = ops[idx];
        failures.push({
          type: op.type,
          item: op.item,
          error: describeError(res.reason, 'Server error').message,
        });
      }
    });

    if (failures.length === 0) {
      showToast('Permissions updated successfully.', 'success');
      await loadRoleGrants(selectedRoleId);
      await refreshAfterChange();
    } else {
      console.error('Some permission operations failed:', failures);
      const detail = failures.map((f) => `${f.type} ${f.item.permission_key}: ${f.error}`).join('; ');
      setSaveError(`Failed to save ${failures.length} permission change(s). ${detail}`);
      showToast('Partial failure saving permissions. Reloaded latest grants.', 'error');
      // Reload grants to reflect actual server state
      await loadRoleGrants(selectedRoleId);
      await refreshAfterChange();
    }

    setIsSavingGrants(false);
  };

  // Create or Update Role Metadata
  const handleSaveRoleMetadata = async (data) => {
    setIsSavingRole(true);
    try {
      let savedRole;
      if (roleDraft?.id) {
        savedRole = await updateRole(roleDraft.id, data);
        showToast(`Role "${data.name}" updated.`, 'success');
      } else {
        savedRole = await createRole(data);
        showToast(`Role "${data.name}" created.`, 'success');
      }

      const rolesRes = await getRoles();
      const updatedRoles = normalizeListResponse(rolesRes);
      setRoles(updatedRoles);

      if (savedRole?.id) {
        setSelectedRoleId(savedRole.id);
      }
      setShowRoleModal(false);
      setRoleDraft(null);
      await refreshAfterChange();
    } catch (err) {
      const described = describeError(err, 'Failed to save role.');
      const creatingDenied = !roleDraft?.id && described.kind === 'denied';
      // The server reports a missing custom-roles plan feature and a missing
      // permission the same way; say so instead of guessing.
      showToast(creatingDenied
        ? `${described.message} Creating roles needs the rbac_roles.create permission and a plan that includes custom roles.`
        : described.message, 'error');
    } finally {
      setIsSavingRole(false);
    }
  };

  // Deactivate or Reactivate Role
  const handleToggleRoleActive = async () => {
    if (!roleToToggleActive) return;
    setIsTogglingActive(true);
    try {
      const willBeActive = !roleToToggleActive.is_active;
      if (willBeActive) {
        await reactivateRole(roleToToggleActive.id);
        showToast(`Role "${roleToToggleActive.name}" reactivated.`, 'success');
      } else {
        await deactivateRole(roleToToggleActive.id);
        showToast(`Role "${roleToToggleActive.name}" deactivated.`, 'success');
      }

      const rolesRes = await getRoles();
      const updatedRoles = normalizeListResponse(rolesRes);
      setRoles(updatedRoles);

      setShowDeactivateModal(false);
      setRoleToToggleActive(null);
      await refreshAfterChange();
    } catch (err) {
      showToast(describeError(err, 'Action failed.').message, 'error');
    } finally {
      setIsTogglingActive(false);
    }
  };

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (r) =>
        String(r.name || '').toLowerCase().includes(q) ||
        String(r.description || '').toLowerCase().includes(q)
    );
  }, [roles, roleSearch]);


  if (isLoadingInit) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (initError) {
    return (
      <Card className="p-8 text-center space-y-4 max-w-md mx-auto my-12 bg-card rounded-2xl">
        <AlertCircle size={44} className="text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-heading">Failed to Load Roles</h3>
        <p className="text-sm text-muted">{initError}</p>
        <button
          type="button"
          onClick={handleRetryInitial}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-all"
        >
          <RotateCcw size={16} />
          Retry
        </button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5 min-h-[calc(100vh-140px)]">
      {/* Top Banner: Tenant-wide notice */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-card rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-subtle flex items-center justify-center text-primary shrink-0">
            <Users size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-heading">Roles &amp; Permissions</h2>
            <p className="text-xs text-muted">
              People get one role per branch, and a role acts only inside that branch. Scopes on each grant (Own, Assigned, Branch) narrow it further; Company scope only reaches past one branch for the system Company Admin.
            </p>
          </div>
        </div>

        {!canManageRoles && (
          <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0">
            <Lock size={14} />
            <span>Read-only access</span>
          </div>
        )}
      </div>

      {/* Two-Pane Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start">
        {/* LEFT PANE: Role List (cols 1..4 on lg, 1..3 on xl) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3">
          <Card className="p-4 bg-card rounded-2xl border border-border shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-heading uppercase tracking-wider">Roles</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-subtle text-muted border border-border">
                  {roles.length}
                </span>
              </div>

              {canCreateRoles && (
                <button
                  type="button"
                  onClick={() => {
                    setRoleDraft(null);
                    setShowRoleModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
                >
                  <Plus size={14} />
                  <span>New Role</span>
                </button>
              )}
            </div>

            {access.createRoles && customRolesEntitled === false && (
              <p role="note" className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-900">
                <Lock size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
                Your plan does not include custom roles. System roles can still be assigned to people.
              </p>
            )}
            {readOnly && (
              <p role="note" className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-900">
                <Lock size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
                The subscription is read-only: roles and grants cannot be changed.
              </p>
            )}

            {/* Role Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
              <input
                aria-label="Search roles"
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                placeholder="Search roles..."
                className="w-full pl-9 pr-3 py-2 bg-subtle border border-border rounded-xl text-xs text-body focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            {/* Role Cards List */}
            <div
              role="listbox"
              aria-label="Available Roles"
              className="space-y-2 max-h-[calc(100vh-290px)] overflow-y-auto pr-1"
            >
              {filteredRoles.map((role) => {
                const isSelected = selectedRoleId === role.id;
                return (
                  <div
                    key={role.id}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={0}
                    onClick={() => handleSelectRole(role.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectRole(role.id);
                      }
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative select-none ${
                      isSelected
                        ? 'bg-subtle border-primary shadow-sm ring-1 ring-primary/20'
                        : 'bg-card border-border hover:border-disabled hover:bg-subtle/50'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r" />
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-sm font-bold truncate ${
                              isSelected ? 'text-primary' : 'text-heading'
                            }`}
                          >
                            {role.name}
                          </span>
                          {role.is_system_role && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.625rem] font-bold bg-subtle border border-border text-muted">
                              <Lock size={10} />
                              System
                            </span>
                          )}
                          {!role.is_active && (
                            <span className="px-1.5 py-0.5 rounded text-[0.625rem] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted mt-1 line-clamp-2">
                          {role.description || 'No description.'}
                        </p>
                      </div>

                      <ChevronRight
                        size={16}
                        className={`shrink-0 transition-transform ${
                          isSelected ? 'text-primary translate-x-0.5' : 'text-muted'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}

              {filteredRoles.length === 0 && (
                <div className="p-6 text-center text-xs text-muted border border-dashed border-border rounded-xl">
                  No roles match your search.
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT PANE: Grouped Permission Matrix (cols 5..12 on lg, 4..12 on xl) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          {!selectedRole ? (
            <Card className="p-12 text-center text-muted bg-card rounded-2xl border border-border">
              Select a role to inspect and configure its permission matrix.
            </Card>
          ) : (
            <Card className="p-5 bg-card rounded-2xl border border-border shadow-sm flex flex-col gap-4">
              {/* Selected Role Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-lg font-bold text-heading truncate">{selectedRole.name}</h3>
                    {selectedRole.is_system_role ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-subtle border border-border text-muted">
                        <Lock size={12} />
                        System Role (Read-Only)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                        Custom Role
                      </span>
                    )}

                    {!selectedRole.is_active ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20">
                        Deactivated
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-1">{selectedRole.description || 'No description provided.'}</p>
                </div>

                {/* Role Lifecycle Actions */}
                {!selectedRole.is_system_role && canManageRoles && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setRoleDraft(selectedRole);
                        setShowRoleModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-subtle border border-border text-body hover:bg-border transition-all"
                    >
                      <Edit2 size={13} />
                      <span>Edit Details</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRoleToToggleActive(selectedRole);
                        setShowDeactivateModal(true);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                        selectedRole.is_active
                          ? 'bg-amber-500/10 text-amber-700 border-amber-500/20 hover:bg-amber-500/20'
                          : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                      }`}
                    >
                      <Power size={13} />
                      <span>{selectedRole.is_active ? 'Deactivate Role' : 'Reactivate Role'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Dirty-State Bar */}
              {isDirty && !selectedRole.is_system_role && canManageRoles && (
                <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs font-bold text-heading">
                      You have unsaved changes to this role&apos;s permissions.
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleDiscardChanges}
                      disabled={isSavingGrants}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl bg-card border border-border text-body hover:bg-subtle transition-all"
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveGrants}
                      disabled={isSavingGrants}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
                    >
                      {isSavingGrants ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Partial Save Error Banner */}
              {saveError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start justify-between gap-3 text-red-700 text-xs">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold">Error Saving Permissions</p>
                      <p className="mt-0.5">{saveError}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSaveError(null)}
                    aria-label="Dismiss error banner"
                    className="text-red-600 hover:text-red-800"
                  >
                    <XCircle size={16} />
                  </button>
                </div>
              )}

              {/* Grants Load Error */}
              {grantsError && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between gap-3 text-amber-800 text-xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>{grantsError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRetryGrants}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition-all"
                  >
                    <RotateCcw size={12} />
                    <span>Retry</span>
                  </button>
                </div>
              )}

              {/* Permissions | People */}
              <div role="tablist" aria-label="Role sections" className="flex gap-1 border-b border-border">
                {[['permissions', `Permissions (${draftGrants.size})`], ['people', 'People']].map(([id, label]) => (
                  <button key={id} type="button" role="tab" aria-selected={roleTab === id} onClick={() => setRoleTab(id)}
                    className={`-mb-px border-b-2 px-3 py-2 text-xs font-semibold ${roleTab === id ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-heading'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {roleTab === 'people' ? (
                <RolePeople role={selectedRole} readOnly={readOnly} />
              ) : isLoadingGrants ? (
                <div className="flex h-56 items-center justify-center">
                  <Loader2 className="animate-spin text-primary" size={28} />
                </div>
              ) : (
                <div className="max-h-[calc(100vh-370px)] overflow-y-auto pr-1">
                  {(selectedRole.is_system_role || !canManageRoles) && (
                    <p className="mb-2 text-[11px] text-muted">
                      {selectedRole.is_system_role ? 'System roles are managed by Kargo and cannot be changed. ' : 'You can view this role but not change it. '}
                      Tick boxes show what the role grants; the small label under a tick is where it applies.
                    </p>
                  )}
                  <PermissionMatrix
                    mode="role"
                    catalog={permissionsCatalog}
                    grants={draftGrants}
                    editable={!selectedRole.is_system_role && canManageRoles}
                    onToggle={(item, granted) => handleTogglePermission({ key: item.permission_key, allowedScopes: item.scopes }, granted)}
                    onScope={handleChangeScope}
                    onSetPage={handleSetPage}
                  />
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Role Form Modal (Create or Edit Name/Desc) */}
      {showRoleModal && (
        <RoleFormModal
          title={roleDraft?.id ? 'Edit Role Details' : 'Create Role'}
          initialData={roleDraft}
          isSaving={isSavingRole}
          onCancel={() => {
            setShowRoleModal(false);
            setRoleDraft(null);
          }}
          onSave={handleSaveRoleMetadata}
        />
      )}

      {/* Confirm Deactivate / Reactivate Modal */}
      {showDeactivateModal && roleToToggleActive && (
        <ConfirmDeactivateModal
          role={roleToToggleActive}
          isLoading={isTogglingActive}
          onCancel={() => {
            setShowDeactivateModal(false);
            setRoleToToggleActive(null);
          }}
          onConfirm={handleToggleRoleActive}
        />
      )}

      {/* Confirm Discard Modal when switching roles with unsaved changes */}
      {pendingSwitchRoleId !== null && (
        <ConfirmDiscardModal
          roleName={selectedRole?.name || 'this role'}
          onCancel={() => setPendingSwitchRoleId(null)}
          onConfirm={handleConfirmDiscardSwitch}
        />
      )}
    </div>
  );
};

export default RolesPermissions;
