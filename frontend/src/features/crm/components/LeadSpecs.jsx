import React, { useMemo } from 'react';
import {
  Edit2,
  Check,
  Loader2,
  Info,
  TrendingUp,
  Truck,
  Box as BoxIcon,
  Calendar,
  Building2,
  User,
  Target,
} from "lucide-react";
import Card from '../../../shared/ui/Card';
import { useAuth } from '../../auth/context/AuthContext';

const titleCase = (txt) => String(txt || '').replaceAll('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase());
const getMoveTypeLabel = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized === 'intrastate' || normalized === 'long_distance') return 'Long Distance';
  if (normalized === 'local') return 'Local';
  if (normalized === 'interstate') return 'Interstate';
  return titleCase(value);
};

const getUserBranchIds = (user) => {
  if (!user) return [];
  const branchIds = new Set();
  
  const addId = (id) => {
    if (id !== null && id !== undefined && id !== '') {
      branchIds.add(String(id));
    }
  };

  if (Array.isArray(user.branches)) {
    user.branches.forEach(b => {
      if (typeof b === 'object' && b !== null && b.id) addId(b.id);
      else addId(b);
    });
  }
  if (Array.isArray(user.branch_details)) {
    user.branch_details.forEach(b => {
      if (b && b.id) addId(b.id);
    });
  }
  if (user.branch) {
    if (typeof user.branch === 'object' && user.branch.id) addId(user.branch.id);
    else addId(user.branch);
  }
  return Array.from(branchIds);
};

const getUserDisplayName = (user) => {
  if (!user) return '';
  return (
    user.full_name ||
    `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
    user.email ||
    (user.id ? `User #${user.id}` : '')
  ).trim();
};

const isActiveUser = (user) => user && user.is_active !== false && user.active !== false && user.status !== 'inactive';

const getOptionLabel = (option) => {
  if (option == null) return '';
  if (typeof option === 'string' || typeof option === 'number') return String(option);
  if (typeof option === 'object') {
    return (
      option.name ||
      option.label ||
      [option.first_name, option.last_name].filter(Boolean).join(' ').trim() ||
      option.full_name ||
      option.title ||
      option.email ||
      (option.id ? titleCase(option.id) : '') ||
      String(option.id || '')
    );
  }
  return String(option);
};

const getOptionValue = (option) => {
  if (option == null) return '';
  if (typeof option === 'string' || typeof option === 'number') return String(option);
  if (typeof option === 'object') {
    return String(option.id ?? option.value ?? option.code ?? option.name ?? option.label ?? '');
  }
  return String(option);
};

const resolveOptionLabel = (value, options = [], fallback = '') => {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) return fallback;
  const match = (Array.isArray(options) ? options : []).find((option) => getOptionValue(option) === normalizedValue);
  if (!match) return fallback || normalizedValue;
  return getOptionLabel(match) || fallback || normalizedValue;
};

const SERVICE_TYPE_OPTIONS = [
  { id: 'moving', name: 'Moving' },
  { id: 'packing', name: 'Packing' },
  { id: 'moving_and_packing', name: 'Moving & Packing' },
  { id: 'load_only', name: 'Load Only' },
  { id: 'unload_only', name: 'Unload Only' },
  { id: 'commercial', name: 'Commercial' },
  { id: 'storage_inbound', name: 'Storage Inbound' },
  { id: 'storage_outbound', name: 'Storage Outbound' },
  { id: 'inner_house', name: 'Inner House' },
  { id: 'junk_removal', name: 'Junk Removal' },
  { id: 'labor_only', name: 'Labor Only' },
];

const MOVE_TYPE_OPTIONS = [
  { id: 'local', name: 'Local' },
  { id: 'interstate', name: 'Interstate' },
  { id: 'long_distance', name: 'Long Distance' },
  { id: 'intrastate', name: 'Long Distance' },
  { id: 'commercial', name: 'Commercial' },
  { id: 'residential', name: 'Residential' },
];

const inputCls = 'w-full px-3 py-2 rounded-lg border border-[#9fcdf5] bg-[#eef6ff] text-sm font-bold text-[#1f7ae0] outline-none shadow-sm transition-all placeholder-[#5b7083] hover:border-[#7bb9eb] focus:border-[#1f7ae0] focus:ring-2 focus:ring-[#1f7ae0]/10';
const DEFAULT_MOVE_SIZE_OPTIONS = [
  'Studio',
  '1 Bedroom Apartment',
  '2 Bedroom Apartment',
  '3 Bedroom Apartment',
  '3 Bedroom House',
  '4 Bedroom House',
  '5+ Bedroom House',
  'Office',
  'Commercial',
];

const LeadSpecs = ({ 
  opportunity, 
  isEditing, 
  form, 
  setForm, 
  branches = [], 
  users = [], 
  moverSizes = [],  moveTypes = [], 
  serviceTypes = [],   referralSources = [],
  leadStatusCodes = [],
  opportunityStatusCodes = [],
  onEdit,
  onSave,
  isSaving = false,
  view,
  canEditLead = true,
}) => {
  const { user, hasPermission } = useAuth();
  const resolvedStatusOptions = useMemo(
    () => {
      const statusOptions = (view.isLead ? leadStatusCodes : opportunityStatusCodes) || [];
      return Array.isArray(statusOptions) ? statusOptions : [];
    },
    [view.isLead, leadStatusCodes, opportunityStatusCodes]
  );
  const canChangeMoveSize = Boolean(
    user?.is_system_admin ||
    user?.is_superuser ||
    hasPermission(['crm.estimates.override_price']) ||
    hasPermission(['crm.admin'])
  );
  
  const resolvedMoveSizes = (moverSizes || [])
    .filter((size) => size && size.is_active !== false)
    .map((size) => ({
      id: size.id,
      value: size.value ?? size.id,
      label: String(size.label || size.name || size.value || '').trim(),
      name: String(size.name || size.label || size.value || '').trim(),
    }))
    .filter((size) => Boolean(size?.name));
    
  const moveSizeOptions = resolvedMoveSizes.length ? resolvedMoveSizes : DEFAULT_MOVE_SIZE_OPTIONS;
  const currentMoveSize = String(form.move_size || '').trim();
  const hasCustomMoveSize = view.isLead && Boolean(currentMoveSize)
    ? !moveSizeOptions.some((opt) => {
        const val = typeof opt === 'object' ? getOptionValue(opt) : String(opt);
        return val === currentMoveSize;
      })
    : false;
  const resolvedMoveSizeName =
    view.move_size ||
    view.moveSize ||
    (form.move_size
      ? (resolvedMoveSizes.find((size) => getOptionValue(size) === String(form.move_size))?.name || '')
      : '') ||
    '-';
  const resolvedServiceTypes = Array.isArray(serviceTypes) && serviceTypes.length ? serviceTypes : SERVICE_TYPE_OPTIONS;
  const resolvedMoveTypes = Array.isArray(moveTypes) && moveTypes.length ? moveTypes : MOVE_TYPE_OPTIONS;

  const selectedCustomStatusCode = useMemo(
    () => (Array.isArray(resolvedStatusOptions) ? resolvedStatusOptions : []).find((option) => getOptionValue(option) === String(form.custom_status_code || '')),
    [form.custom_status_code, resolvedStatusOptions]
  );
  
  const selectedBranchId = form.branch ? String(form.branch) : null;
  const selectedBranch = useMemo(() => {
    if (!selectedBranchId) return null;
    return (branches || []).find((branch) => String(branch.id) === selectedBranchId) || null;
  }, [branches, selectedBranchId]);

  const assignableUsers = useMemo(() => {
    const allUsers = (users || []).filter(isActiveUser);
    if (!selectedBranchId) return allUsers;
    return allUsers.filter((user) => {
      const uBranchIds = getUserBranchIds(user);
      return uBranchIds.includes(selectedBranchId);
    });
  }, [selectedBranchId, users]);

  const selectedUser = useMemo(() => {
    const assignedId = form.assigned_to;
    if (!assignedId) return null;
    return (users || []).find((user) => String(user.id) === String(assignedId) && isActiveUser(user));
  }, [form.assigned_to, users]);

  const managerOptions = useMemo(() => {
    const options = [...assignableUsers];
    if (!selectedUser && form.assigned_to) {
      const fallbackSelected = (users || []).find((user) => String(user.id) === String(form.assigned_to) && isActiveUser(user));
      if (fallbackSelected) options.push(fallbackSelected);
    }
    if (selectedUser && !options.some(u => String(u.id) === String(selectedUser.id))) {
      options.push(selectedUser);
    }
    return options;
  }, [assignableUsers, selectedUser, form.assigned_to, users]);
  const branchScopedUserCount = assignableUsers.length;
  const totalUserCount = Array.isArray(users) ? users.length : 0;

  if (!opportunity) return null;

  return (
    <Card className="p-8 border-0 shadow-xl bg-card rounded-[2rem] overflow-visible">
      <div className="flex items-center justify-between text-black mb-8 pb-2 border-b border-page">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
            <Info size={20} />
          </div>
          <h3 className="font-heading font-bold text-lg">Project Specifications</h3>
        </div>
        {!isEditing ? (
          canEditLead ? (
          <button
            type="button"
            onClick={onEdit}
            className="p-2 text-black hover:text-primary transition-colors"
            title="Edit specifications"
          >
            <Edit2 size={16} />
          </button>
          ) : null
        ) : (
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="p-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50"
            title="Save specifications"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          </button>
        )}
      </div>

      <div className="space-y-3 divide-y divide-[#F2F0EB]">
        <div className="grid grid-cols-2 gap-4 py-3 group">
          <div className="flex items-center gap-3">
            <TrendingUp size={14} className="text-black" />
            <span className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Job Status</span>
          </div>
          {isEditing ? (
            <select
              className={inputCls}
              value={form.custom_status_code || ''}
              onChange={(e) =>
                setForm((p) => ({ ...p, custom_status_code: e.target.value }))
              }
            >
              <option value="">No Custom Status</option>
              {resolvedStatusOptions.map((status) => (
                <option key={String(status.id || status.code || status.label)} value={String(status.id || status.code || '')}>
                  {String(status.label || status.name || status.code || '-')}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm font-bold text-primary">
              {getOptionLabel(selectedCustomStatusCode) || String(opportunity?.custom_status_code_details?.label || '-')}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 py-3 group">
          <div className="flex items-center gap-3">
            <Truck size={14} className="text-black" />
            <span className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Job Service</span>
          </div>
          {isEditing ? (
            <select
              className={inputCls}
              value={form.service_type || ''}
              onChange={(e) =>
                setForm((p) => ({ ...p, service_type: e.target.value }))
              }
            >
              <option value="">Select Service</option>
              {resolvedServiceTypes.map((option) => (
                <option key={String(getOptionValue(option))} value={String(getOptionValue(option))}>
                  {String(getOptionLabel(option))}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm font-bold text-primary">
              {resolveOptionLabel(
                opportunity?.service_type_name || form.service_type || opportunity?.service_type,
                resolvedServiceTypes,
                opportunity?.service_type_name || titleCase(opportunity?.service_type || view.serviceType || form.service_type || '-')
              )}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 py-3 group">
          <div className="flex items-center gap-3">
            <BoxIcon size={14} className="text-black" />
            <span className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Job Size</span>
          </div>
          {isEditing ? (
            canChangeMoveSize ? (
              <select
                className={inputCls}
                value={form.move_size || ''}
                onChange={(e) =>
                  setForm((p) => ({ ...p, move_size: e.target.value }))
                }
              >
                <option value="">Select Job Size</option>
                {hasCustomMoveSize ? (
                  <option value={currentMoveSize}>{currentMoveSize}</option>
                ) : null}
                {(Array.isArray(moveSizeOptions) ? moveSizeOptions : []).map((size) => {
                  const id = typeof size === 'object' ? getOptionValue(size) : size;
                  const label = typeof size === 'object' ? getOptionLabel(size) : size;
                  return (
                    <option key={String(id)} value={String(id)}>
                      {String(label || '-')}
                    </option>
                  );
                })}
              </select>
            ) : (
              <div className="space-y-1">
                <div className="w-full px-3 py-2 rounded-lg border border-[#9fcdf5] bg-[#eef6ff] text-sm font-bold text-[#1f7ae0]">
                    {resolvedMoveSizeName}
                </div>
                <p className="text-[0.625rem] font-semibold uppercase tracking-wider text-black">
                  Move size changes require permission.
                </p>
              </div>
            )
          ) : (
            <p className="text-sm font-bold text-primary">
                {resolvedMoveSizeName}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 py-3 group">
          <div className="flex items-center gap-3">
            <Target size={14} className="text-black" />
            <span className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Job Type</span>
          </div>
          {isEditing ? (
            <select
              className={inputCls}
              value={form.move_type || ''}
              onChange={(e) =>
                setForm((p) => ({ ...p, move_type: e.target.value }))
              }
            >
              <option value="">Select Type</option>
              {resolvedMoveTypes.map((option) => (
                <option key={String(getOptionValue(option))} value={String(getOptionValue(option))}>
                  {String(getOptionLabel(option))}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm font-bold text-primary">
              {resolveOptionLabel(
                opportunity?.move_type_name || form.move_type || opportunity?.move_type,
                resolvedMoveTypes,
                opportunity?.move_type_name || getMoveTypeLabel(view.moveType || '-')
              )}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 py-3 group">
          <div className="flex items-center gap-3">
            <Calendar size={14} className="text-black" />
            <span className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Move Date</span>
          </div>
          {isEditing ? (
            <input
              type="date"
              className={inputCls}
              value={form.move_date || ''}
              onChange={(e) =>
                setForm((p) => ({ ...p, move_date: e.target.value }))
              }
            />
          ) : (
            <p className="text-sm font-bold text-primary">
              {opportunity.move_date || "-"}
            </p>
          )}
        </div>

        <div className="py-4 space-y-4">
          <div className="flex items-center gap-3 mb-2 px-1">
            <Building2 size={16} className="text-primary" />
            <span className="text-[0.6875rem] font-black uppercase tracking-[0.2em] text-black">Resource Allocation</span>
          </div>
          
          <div className="bg-page p-5 rounded-[1.5rem] border border-subtle space-y-4 overflow-visible">
            <div className="rounded-2xl border border-[#dbeafe] bg-[#eff6ff] px-4 py-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-[#1f3b66]">Selected Branch</p>
                  <p className="text-sm font-bold text-[#17324d]">
                    {selectedBranch?.name || view.branchName || 'No branch selected'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-[#1f3b66]">Users</p>
                  <p className="text-sm font-bold text-[#17324d]">
                    {branchScopedUserCount} branch / {totalUserCount} total
                  </p>
                </div>
              </div>
              {selectedBranch?.state ? (
                <p className="text-[0.625rem] font-semibold text-[#4a6b8a]">
                  {selectedBranch.state}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <span className="text-[0.625rem] font-bold text-black uppercase tracking-widest">Target Branch</span>
              {isEditing ? (
                <select
                  className={`${inputCls} !py-1 !text-xs !font-bold`}
                  value={form.branch || ''}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, branch: e.target.value }))
                  }
                >
                  <option value="">Select Branch</option>
                  {(branches || []).map((b) => (
                    <option key={b.id} value={String(b.id)}>
                      {b.name || `Branch #${b.id}`}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm font-bold text-primary">{view.branchName}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <span className="text-[0.625rem] font-bold text-black uppercase tracking-widest">Move Manager</span>
              {isEditing ? (
                <div className="space-y-2 relative z-300">
                  <select
                    className={`${inputCls} !py-1 !text-xs !font-bold`}
                    value={form.assigned_to || ''}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, assigned_to: e.target.value }))
                    }
                  >
                    <option value="">Unassigned</option>
                    {(managerOptions || []).map((u) => (
                      <option key={u.id} value={String(u.id)}>
                        {getUserDisplayName(u)}
                      </option>
                    ))}
                  </select>
                  <p className="text-[0.625rem] font-semibold text-black/70">
                    Showing {branchScopedUserCount} users for {selectedBranch?.name || view.branchName || 'the selected branch'}.
                  </p>
                </div>
              ) : (
                <p className="text-sm font-bold text-primary">{view.assignedName || 'Unassigned'}</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-3 group">
          <div className="flex items-center gap-3">
            <Target size={14} className="text-black" />
            <span className="text-[0.6875rem] font-bold text-black uppercase tracking-wider">Lead Source</span>
          </div>
          {isEditing ? (
            <select
              className={inputCls}
              value={form.referral_source || ''}
              onChange={(e) =>
                setForm((p) => ({ ...p, referral_source: e.target.value }))
              }
            >
              <option value="">Select Lead Source</option>
              {(referralSources || []).map((source) => (
                <option key={String(getOptionValue(source))} value={String(getOptionValue(source))}>
                  {String(getOptionLabel(source) || getOptionValue(source) || '-')}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm font-bold text-primary">
              {resolveOptionLabel(form.referral_source || opportunity?.referral_source, referralSources, opportunity?.referral_source_details?.name || view.leadSource || '-')}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default LeadSpecs;
