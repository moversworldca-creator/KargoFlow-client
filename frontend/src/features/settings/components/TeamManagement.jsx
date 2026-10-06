import React, { useState, useEffect, useMemo } from 'react';
import Card from '../../../shared/ui/Card';
import { useAuth } from '../../auth/context/AuthContext';
import useCan from '../../../shared/auth/useCan';
import { useToast } from '../../../shared/context/ToastContext';
import { filterAccessibleBranches, getUserBranchIds, resolveBranchId, resolveRoleBranchId, resolveRoleName } from '../../../shared/utils/branchScope';
import { 
  User, Mail, Shield, MoreVertical, 
  UserPlus, Search, Filter, CheckCircle2,
  XCircle, Edit2, Smartphone, Loader2, Info, AlertCircle, Save
} from 'lucide-react';
import { getUsers, createUser, updateUser, getRoles, getBranches } from '../../../services/api';
import { PERMISSIONS } from '../../../shared/permissions/registry';

const InputField = ({ label, name, icon: Icon, type = "text", value, onChange, placeholder, disabled = false, required = false }) => (
  <div className="space-y-1.5">
    <label className="text-[0.625rem] font-bold uppercase tracking-widest text-body ml-1">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-disabled" size={18} />}
      <input
        name={name}
        type={type}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`w-full bg-[#ffffff] ring-1 ring-disabled/30 focus:ring-0 border-b-2 border-transparent focus:border-primary ${Icon ? 'pl-11' : 'px-4'} pr-4 py-3 rounded-lg outline-none text-sm font-medium transition-all shadow-sm disabled:bg-page disabled:text-disabled`}
      />
    </div>
  </div>
);

const ToggleField = ({ label, description, enabled, onToggle }) => (
  <div className="flex items-center justify-between p-4 rounded-xl bg-page group transition-colors hover:bg-subtle">
    <div className="space-y-0.5">
      <p className="text-sm font-bold text-heading">{label}</p>
      <p className="text-xs text-body">{description}</p>
    </div>
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${enabled ? 'bg-primary' : 'bg-disabled'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
);

export const normalizeUserPayload = (formData, { includePassword, companyId, allowedRoleIds = [] } = { includePassword: false, companyId: null, allowedRoleIds: [] }) => {
  const normalizedCompanyId = typeof companyId === 'object' && companyId !== null ? companyId.id : companyId;
  const getBranchCompanyId = (branch) => {
    if (!branch || typeof branch !== 'object') return null;
    return branch.company?.id ?? branch.company ?? null;
  };
  const companyBranchIds = new Set(
    Array.isArray(formData?._availableBranches)
      ? formData._availableBranches
          .filter((branch) => !normalizedCompanyId || String(getBranchCompanyId(branch)) === String(normalizedCompanyId))
          .map((branch) => String(branch.id))
      : []
  );
  const rawBranches = Array.isArray(formData?.branches) ? formData.branches : [];
  const branches = rawBranches.filter((branchId) => {
    if (!companyBranchIds.size) return true;
    return companyBranchIds.has(String(branchId));
  });
  const payload = {
    email: (formData?.email || '').trim(),
    first_name: formData?.first_name || '',
    last_name: formData?.last_name || '',
    phone: formData?.phone || '',
    employee_type: formData?.employee_type || '',
    is_active: !!formData?.is_active,
    roles: Array.isArray(formData?.roles)
      ? formData.roles.filter((roleId) => !allowedRoleIds.length || allowedRoleIds.includes(roleId))
      : [],
    branches,
  };
  if (normalizedCompanyId) payload.company = normalizedCompanyId;
  if (includePassword && formData?.password) payload.password = formData.password;
  return payload;
};

const getErrorMessage = (err, fallback) => {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (typeof data.detail === 'string') return data.detail;
  const firstKey = Object.keys(data)[0];
  if (!firstKey) return fallback;
  const value = data[firstKey];
  if (Array.isArray(value) && value.length) return String(value[0]);
  if (typeof value === 'string') return value;
  return fallback;
};

const formatJoinedDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString();
};

const UserFormModal = ({ title, initialData, roles, branches, onSave, onCancel, isSaving, includePassword, companyId }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState(() => ({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    employee_type: '',
    is_active: true,
    ...initialData,
    roles: (initialData?.roles || initialData?.role_details?.map(r => r.id) || []),
    branches: (initialData?.branches || initialData?.branch_details?.map(b => b.id) || []),
    _availableBranches: branches || [],
  }));

  useEffect(() => {
    setFormData({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      phone: '',
      employee_type: '',
      is_active: true,
      ...initialData,
      roles: (initialData?.roles || initialData?.role_details?.map(r => r.id) || []),
      branches: (initialData?.branches || initialData?.branch_details?.map(b => b.id) || []),
      _availableBranches: branches || [],
    });
  }, [initialData, branches]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const toggleInList = (key, id) => {
    setFormData(prev => {
      const list = Array.isArray(prev[key]) ? prev[key] : [];
      return list.includes(id)
        ? { ...prev, [key]: list.filter(x => x !== id) }
        : { ...prev, [key]: [...list, id] };
    });
  };

  const companyBranches = useMemo(() => {
    const companyKey = String(companyId || '');
    const list = Array.isArray(branches) ? branches : [];
    const scoped = list.filter((branch) => {
      const branchCompanyId = branch?.company?.id ?? branch?.company ?? '';
      return !companyKey || String(branchCompanyId) === companyKey;
    });
    return scoped.length ? scoped : list;
  }, [branches, companyId]);
  const accessibleBranches = useMemo(() => filterAccessibleBranches(user, companyBranches), [companyBranches, user]);
  const visibleBranches = useMemo(
    () => (accessibleBranches.length ? accessibleBranches : companyBranches),
    [accessibleBranches, companyBranches],
  );
  const branchIdSet = new Set((formData.branches || []).map((id) => String(resolveBranchId(id))));
  const branchNameById = new Map(visibleBranches.map((b) => [String(b.id), b.name]));
  const visibleRoles = (roles || []).filter((role) => {
    const roleBranchId = resolveRoleBranchId(role);
    if (roleBranchId === null) return resolveRoleName(role) === 'Company Owner';
    return branchIdSet.has(String(roleBranchId));
  });
  const visibleRoleIdSet = useMemo(() => new Set(visibleRoles.map((role) => role.id)), [visibleRoles]);

  useEffect(() => {
    const current = Array.isArray(formData.roles) ? formData.roles : [];
    const next = current.filter((id) => visibleRoleIdSet.has(id));
    if (next.length !== current.length) {
      setFormData((prev) => ({ ...prev, roles: next }));
    }
  }, [formData.branches, formData.roles, visibleRoleIdSet]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(normalizeUserPayload(formData, { includePassword, companyId, allowedRoleIds: Array.from(visibleRoleIdSet) }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <Card className="max-w-3xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-heading font-bold text-xl text-heading">{title}</h3>
          <button onClick={onCancel} className="p-2 rounded-lg hover:bg-page text-body hover:text-heading transition-colors">
            <XCircle size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className={`grid grid-cols-1 ${includePassword ? 'md:grid-cols-2' : ''} gap-4`}>
            <InputField label="Email" name="email" type="email" value={formData.email} onChange={handleChange} icon={Mail} placeholder="user@company.com" />
            {includePassword ? (
              <InputField label="Password" name="password" type="password" value={formData.password} onChange={handleChange} icon={Shield} placeholder="Temporary password" required />
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} icon={User} placeholder="First name" />
            <InputField label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} icon={User} placeholder="Last name" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Phone" name="phone" value={formData.phone} onChange={handleChange} icon={Smartphone} placeholder="+1 555 123 4567" />
            <InputField label="Employee Type" name="employee_type" value={formData.employee_type} onChange={handleChange} placeholder="e.g., mover, dispatcher" />
          </div>

          <ToggleField
            label="Active"
            description="Disable to prevent login and access."
            enabled={formData.is_active}
            onToggle={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <p className="text-[0.625rem] font-bold uppercase tracking-widest text-disabled">Roles</p>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {visibleRoles.map(role => (
                  <label key={role.id} className="flex items-center justify-between p-3 rounded-lg border border-subtle hover:bg-page transition-colors cursor-pointer">
                    <span className="text-sm font-medium text-heading">
                      {role.name}
                      <span className="ml-2 text-xs text-body/70">
                        {role.branch
                          ? `(${branchNameById.get(String(role.branch)) || `Branch #${role.branch}`})`
                          : '(Company-wide superuser)'}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={(formData.roles || []).includes(role.id)}
                      onChange={() => toggleInList('roles', role.id)}
                      className="w-5 h-5 rounded border-disabled text-primary focus:ring-primary focus:ring-offset-0"
                    />
                  </label>
                ))}
                {visibleRoles.length === 0 && <p className="text-sm text-body">No roles available for selected branches.</p>}
                <p className="text-xs text-body/70">
                  Company Owner is always available. Other roles appear after selecting their branch.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[0.625rem] font-bold uppercase tracking-widest text-disabled">Branches</p>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {visibleBranches.map(branch => (
                  <label key={branch.id} className="flex items-center justify-between p-3 rounded-lg border border-subtle hover:bg-page transition-colors cursor-pointer">
                    <span className="text-sm font-medium text-heading">{branch.name}</span>
                    <input
                      type="checkbox"
                      checked={(formData.branches || []).map(String).includes(String(branch.id))}
                      onChange={() => toggleInList('branches', branch.id)}
                      className="w-5 h-5 rounded border-disabled text-primary focus:ring-primary focus:ring-offset-0"
                    />
                  </label>
                ))}
                {visibleBranches.length === 0 && <p className="text-sm text-body">No branches available for your access.</p>}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-body bg-card hover:bg-page transition-colors font-medium">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-bold hover:bg-primary-dark transition-all disabled:opacity-70">
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

const ConfirmStatusChange = ({ title, description, confirmLabel, confirmIcon: ConfirmIcon, confirmClassName, onConfirm, onCancel, isLoading }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
    <Card className="max-w-sm w-full p-6 space-y-4 text-center">
      <AlertCircle size={48} className="text-[#791F1F] mx-auto" />
      <h3 className="font-heading font-bold text-xl text-heading">{title}</h3>
      <p className="text-sm text-body">{description}</p>
      <div className="flex justify-center gap-3 mt-6">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-body bg-card hover:bg-page transition-colors font-medium">
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white font-bold transition-all disabled:opacity-70 ${confirmClassName}`}
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ConfirmIcon size={18} />}
          {isLoading ? 'Saving...' : confirmLabel}
        </button>
      </div>
    </Card>
  </div>
);

const TeamManagement = ({ branchId }) => {
  const { user } = useAuth();
  const { canAll } = useCan();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [userToToggleStatus, setUserToToggleStatus] = useState(null);

  useEffect(() => {
    const fetchBootstrap = async () => {
      try {
        setIsLoading(true);
        const params = {};
        if (branchId) {
          params.branch = branchId;
        }
        const [usersRes, rolesRes, branchesRes] = await Promise.all([
          getUsers(params),
          getRoles(params),
          getBranches(),
        ]);
        setUsers(usersRes?.results || usersRes || []);
        setRoles(rolesRes?.results || rolesRes || []);
        setBranches(branchesRes?.results || branchesRes || []);
      } catch (err) {
        console.error('Failed to fetch team members:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBootstrap();
  }, [branchId]);

  const refreshUsers = async () => {
    const params = {};
    if (branchId) {
      params.branch = branchId;
    }
    const usersRes = await getUsers(params);
    setUsers(usersRes?.results || usersRes || []);
  };

  const safeUsers = Array.isArray(users) ? users : [];
  const filteredUsers = safeUsers.filter(user => 
    `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const canCreate = canAll([PERMISSIONS.USER_CREATE]);
  const canEdit = canAll([PERMISSIONS.USER_EDIT]);
  const branchNameById = useMemo(
    () => new Map((branches || []).map((b) => [Number(b.id), b.name])),
    [branches]
  );
  const userBranchIds = useMemo(() => new Set(getUserBranchIds(user)), [user]);
  const canCreateBranchAware = useMemo(() => {
    if (!branchId) return canCreate;
    return canCreate || userBranchIds.has(String(branchId));
  }, [branchId, canCreate, userBranchIds]);
  const canEditBranchAware = useMemo(() => {
    if (!branchId) return canEdit;
    return canEdit || userBranchIds.has(String(branchId));
  }, [branchId, canEdit, userBranchIds]);
  const roleById = useMemo(
    () => new Map((roles || []).map((role) => [Number(role.id), role])),
    [roles]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-disabled" size={18} />
          <input 
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#ffffff] ring-1 ring-disabled/30 focus:ring-0 border-b-2 border-transparent focus:border-primary outline-none rounded-t-lg text-sm transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-card border border-subtle text-body rounded-xl text-sm font-bold hover:bg-page transition-colors">
            <Filter size={18} /> Filter
          </button>
          {canCreateBranchAware && (
            <button
              onClick={() => { setShowAddModal(true); setMessage({ type: '', text: '' }); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-md hover:bg-primary-dark transition-all"
            >
              <UserPlus size={18} /> Add Member
            </button>
          )}
        </div>
      </div>

      {message.text && (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
          message.type === 'success' ? 'bg-primary-tint/30 text-primary' : 'bg-[#FDE8E8]/30 text-[#791F1F]'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      <Card className="overflow-hidden border-0 p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-page">
                <th className="px-6 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-body">Member</th>
                <th className="px-6 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-body">Role</th>
                <th className="px-6 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-body">Status</th>
                <th className="px-6 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-body">Type</th>
                <th className="px-6 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-body">Joined</th>
                <th className="px-6 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-body"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F0EB]">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="group hover:bg-page/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-subtle flex items-center justify-center text-primary font-heading font-bold text-sm">
                        {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                        {user.last_name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-heading">{user.first_name} {user.last_name}</p>
                        <p className="text-xs text-body">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-2">
                      <Shield size={14} className="text-primary" />
                      <div className="text-sm text-heading font-medium">
                        {(() => {
                          const resolvedRoles = Array.isArray(user.role_details) && user.role_details.length > 0
                            ? user.role_details
                            : Array.isArray(user.roles) && user.roles.length > 0
                              ? user.roles.map((roleId) => roleById.get(Number(roleId))).filter(Boolean)
                              : [];
                          return resolvedRoles.length > 0 ? resolvedRoles.map((role) => {
                            const roleBranchId = resolveRoleBranchId(role);
                            const scope = roleBranchId
                              ? (branchNameById.get(Number(roleBranchId)) || `Branch #${roleBranchId}`)
                              : 'Company-wide superuser';
                            return (
                              <div key={role.id} className="leading-5">
                                {resolveRoleName(role)}
                                <span className="ml-2 text-xs text-body/70">({scope})</span>
                              </div>
                            );
                          }) : <span>No Role</span>;
                        })()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.625rem] font-bold uppercase tracking-wider ${
                      user.is_active 
                        ? 'bg-primary-tint/30 text-primary' 
                        : 'bg-[#FDE8E8]/30 text-[#791F1F]'
                    }`}>
                      {user.is_active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {user.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-body">{user.employee_type || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-body">
                    {formatJoinedDate(user.date_joined)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canEditBranchAware && (
                        <button
                          onClick={() => { setUserToEdit(user); setShowEditModal(true); setMessage({ type: '', text: '' }); }}
                          className="p-2 hover:bg-subtle rounded-lg text-body hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      {canEditBranchAware && (
                        <button
                          onClick={() => { setUserToToggleStatus(user); setShowStatusConfirm(true); setMessage({ type: '', text: '' }); }}
                          className={`p-2 rounded-lg transition-colors ${
                            user.is_active
                              ? 'text-body hover:bg-[#FDE8E8]/30 hover:text-[#791F1F]'
                              : 'text-body hover:bg-primary-tint/30 hover:text-primary'
                          }`}
                          title={user.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {user.is_active ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showAddModal && (
        <UserFormModal
          title="Add Team Member"
          initialData={branchId ? { branches: [Number(branchId)] } : {}}
          roles={roles}
          branches={branches}
          includePassword
          companyId={user?.company || ''}
          isSaving={isSaving}
          onCancel={() => setShowAddModal(false)}
          onSave={async (payload) => {
            if (!canCreate) {
              showToast('You do not have permission to create users.', 'warning');
              return;
            }
            setIsSaving(true);
            setMessage({ type: '', text: '' });
            try {
              await createUser(payload);
              setMessage({ type: 'success', text: 'User created successfully!' });
              setShowAddModal(false);
              await refreshUsers();
            } catch (err) {
              console.error('Failed to create user:', err);
              setMessage({ type: 'error', text: getErrorMessage(err, 'Failed to create user.') });
            } finally {
              setIsSaving(false);
            }
          }}
        />
      )}

      {showEditModal && (
        <UserFormModal
          title="Edit Team Member"
          initialData={userToEdit}
          roles={roles}
          branches={branches}
          companyId={user?.company || ''}
          isSaving={isSaving}
          onCancel={() => { setShowEditModal(false); setUserToEdit(null); }}
          onSave={async (payload) => {
            if (!canEdit) {
              showToast('You do not have permission to edit users.', 'warning');
              return;
            }
            setIsSaving(true);
            setMessage({ type: '', text: '' });
            try {
              await updateUser(userToEdit.id, payload);
              setMessage({ type: 'success', text: 'User updated successfully!' });
              setShowEditModal(false);
              setUserToEdit(null);
              await refreshUsers();
            } catch (err) {
              console.error('Failed to update user:', err);
              setMessage({ type: 'error', text: getErrorMessage(err, 'Failed to update user.') });
            } finally {
              setIsSaving(false);
            }
          }}
        />
      )}

      {showStatusConfirm && (
        <ConfirmStatusChange
          title={userToToggleStatus?.is_active ? 'Deactivate Member' : 'Activate Member'}
          description={
            userToToggleStatus?.is_active
              ? `Deactivate ${userToToggleStatus?.email}? They will no longer be able to log in, but their history and email stay attached to the account.`
              : `Activate ${userToToggleStatus?.email}? They will be able to log in again if their credentials are valid.`
          }
          confirmLabel={userToToggleStatus?.is_active ? 'Deactivate' : 'Activate'}
          confirmIcon={userToToggleStatus?.is_active ? XCircle : CheckCircle2}
          confirmClassName={
            userToToggleStatus?.is_active
              ? 'bg-[#791F1F] hover:bg-[#b0000a]'
              : 'bg-primary hover:bg-primary-dark'
          }
          isLoading={isSaving}
          onCancel={() => { setShowStatusConfirm(false); setUserToToggleStatus(null); }}
          onConfirm={async () => {
            if (!canEdit) {
              showToast('You do not have permission to update users.', 'warning');
              return;
            }
            setIsSaving(true);
            setMessage({ type: '', text: '' });
            try {
              const nextActive = !userToToggleStatus.is_active;
              const updated = await updateUser(userToToggleStatus.id, { is_active: nextActive });
              setUsers((prev) => prev.map((row) => (
                row.id === userToToggleStatus.id ? { ...row, ...updated } : row
              )));
              setMessage({
                type: 'success',
                text: nextActive ? 'User activated successfully!' : 'User deactivated successfully!',
              });
              setShowStatusConfirm(false);
              setUserToToggleStatus(null);
              await refreshUsers();
            } catch (err) {
              console.error('Failed to update user status:', err);
              setMessage({ type: 'error', text: getErrorMessage(err, 'Failed to update user status.') });
            } finally {
              setIsSaving(false);
            }
          }}
        />
      )}
    </div>
  );
};

export default TeamManagement;
