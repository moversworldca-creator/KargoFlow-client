import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CreditCard,
  Edit2,
  FileText,
  Globe,
  Image as ImageIcon,
  Info,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  Trash2,
  Truck,
  XCircle,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import Card from '../../../shared/ui/Card';
import API from '../../../services/api';
import { useAuth } from '../../auth/context/AuthContext';
import { useToast } from '../../../shared/context/ToastContext';
import { filterAccessibleBranches } from '../../../shared/utils/branchScope';

const isBranchActive = (branch) => branch?.is_active !== false;

const emptyBranchForm = {
  name: '',
  dispatch_location: '',
  logo_url: '',
  sales_number_prefix: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  zip_code: '',
  email: '',
  phone: '',
  website: '',
  sales_tax_rate: 0,
  deposit_enabled: true,
  allow_booking_without_deposit: false,
  default_deposit_pct: 10,
  restrict_leads_opportunities_to_branch_users: false,
  is_main: false,
  enable_lead_posting: false,
  is_active: true,
  scheduling_config: {
    scheduling_horizon_days: 90,
    weekly_windows: [],
    default_arrival_window: { start: '', end: '' },
  },
};

const toPercent = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return num <= 1 ? num * 100 : num;
};

const toDecimalRate = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return num > 1 ? num / 100 : num;
};

const formatPercent = (value) => `${toPercent(value).toFixed(2)}%`;

const InputField = ({
  label,
  name,
  icon: Icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled = false,
  className = '',
  step,
  min,
  max,
}) => (
  <label className={`block space-y-1 ${className}`}>
    <span className="ml-0.5 text-[10px] font-bold uppercase tracking-widest text-body">{label}</span>
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-disabled" size={14} />}
      <input
        name={name}
        type={type}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        step={step}
        min={min}
        max={max}
        className={`w-full rounded-lg border border-slate-200 bg-white ${Icon ? 'pl-9' : 'px-2.5'} pr-2.5 py-1.5 text-xs font-medium text-heading outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-slate-50 disabled:text-disabled dark:border-slate-700 dark:bg-slate-900 dark:text-white`}
      />
    </div>
  </label>
);

const ToggleField = ({ label, description, enabled, onToggle, disabled = false }) => (
  <div className={`flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 transition dark:border-slate-800 dark:bg-slate-900/60 ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
    <div className="space-y-0.5 pr-3">
      <p className="text-xs font-bold text-heading dark:text-white">{label}</p>
      {description && <p className="text-[11px] text-body">{description}</p>}
    </div>
    <button
      type="button"
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none ${enabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'} ${disabled ? 'cursor-not-allowed' : ''}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`}
      />
    </button>
  </div>
);

const InheritanceToggle = ({ label, enabled, onChange }) => (
  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-body select-none">
    <input
      type="checkbox"
      checked={enabled}
      onChange={onChange}
      className="h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary focus:ring-offset-0"
    />
    <span>{label}</span>
  </label>
);

const normalizeBranchPayload = (formData) => {
  const payload = {
    name: formData?.name || '',
    dispatch_location: formData?.dispatch_location || '',
    address_line1: formData?.address_line1 || '',
    address_line2: formData?.address_line2 || '',
    city: formData?.city || '',
    state: formData?.state || '',
    zip_code: formData?.zip_code || '',
    email: formData?.email || '',
    phone: formData?.phone || '',
    website: formData?.website || '',
    sales_number_prefix: formData?.sales_number_prefix || '',
    restrict_leads_opportunities_to_branch_users: !!formData?.restrict_leads_opportunities_to_branch_users,
    is_main: !!formData?.is_main,
    enable_lead_posting: !!formData?.enable_lead_posting,
    is_active: formData?.is_active !== false,
  };

  if (formData.is_main) {
    payload.logo_url = formData?.logo_url || '';
    payload.sales_tax_rate = toDecimalRate(formData?.sales_tax_rate);
    payload.deposit_enabled = !!formData?.deposit_enabled;
    payload.allow_booking_without_deposit = !!formData?.allow_booking_without_deposit;
    payload.default_deposit_pct = toDecimalRate(formData?.default_deposit_pct);
  } else {
    payload.logo_url = formData.inherit_branding ? '' : (formData?.logo_url || '');
    payload.sales_tax_rate = formData.inherit_tax_rate ? null : toDecimalRate(formData?.sales_tax_rate);
    payload.deposit_enabled = formData.inherit_deposit ? null : !!formData?.deposit_enabled;
    payload.allow_booking_without_deposit = formData.inherit_deposit ? null : !!formData?.allow_booking_without_deposit;
    payload.default_deposit_pct = formData.inherit_deposit ? null : toDecimalRate(formData?.default_deposit_pct);
  }

  return payload;
};

const normalizeFormState = (initialData = {}) => {
  const is_main = !!initialData?.is_main;
  const inherit_tax_rate = !is_main && (initialData?.sales_tax_rate === null || initialData?.sales_tax_rate === undefined);
  const inherit_deposit = !is_main && (initialData?.deposit_enabled === null || initialData?.deposit_enabled === undefined);
  const inherit_branding = !is_main && !initialData?.logo_url;

  return {
    ...emptyBranchForm,
    ...initialData,
    sales_tax_rate: inherit_tax_rate ? '' : toPercent(initialData?.sales_tax_rate),
    default_deposit_pct: inherit_deposit ? '' : toPercent(initialData?.default_deposit_pct),
    inherit_tax_rate,
    inherit_deposit,
    inherit_branding,
  };
};

const BranchViewModal = ({ branch, onClose }) => {
  if (!branch) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card className="max-h-[90vh] w-full max-w-3xl space-y-6 overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 font-heading text-xl font-bold text-heading">
              <Truck size={20} className="text-primary" />
              {branch.name}
            </h3>
            <p className="text-xs text-body">
              Branch ID: <span className="font-bold">{branch.id}</span>
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-body transition-colors hover:bg-page hover:text-heading">
            <XCircle size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <h4 className="text-[0.625rem] font-bold uppercase tracking-widest text-disabled">Location & Contact</h4>
            <div className="space-y-2 text-sm text-body">
              <p className="flex items-center gap-2">
                <MapPin size={14} /> {branch.address_line1 || 'No street address'}
              </p>
              {branch.address_line2 ? <p className="ml-6">{branch.address_line2}</p> : null}
              <p className="ml-6">
                {branch.city || '-'}, {branch.state || '-'} {branch.zip_code || '-'}
              </p>
              <p className="ml-6">Dispatch: {branch.dispatch_location || 'Not set'}</p>
              <div className="ml-6 space-y-1">
                <p>Email: {branch.email || 'Not set'}</p>
                <p>Phone: {branch.phone || 'Not set'}</p>
                <p>Website: {branch.website ? <a className="underline" href={branch.website} target="_blank" rel="noreferrer">{branch.website}</a> : 'Not set'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[0.625rem] font-bold uppercase tracking-widest text-disabled">Behavior & Rules</h4>
            <div className="space-y-2 text-sm text-body">
              <p>
                <span className="font-bold text-heading">Status:</span> {isBranchActive(branch) ? 'Active' : 'Inactive'}
              </p>
              <p>
                <span className="font-bold text-heading">Main Branch:</span> {branch.is_main ? 'Yes' : 'No'}
              </p>
              <p>
                <span className="font-bold text-heading">Prefix:</span> {branch.sales_number_prefix || 'None'}
              </p>
              <p>
                <span className="font-bold text-heading">Restricted To Branch Users:</span>{' '}
                {branch.restrict_leads_opportunities_to_branch_users ? 'Yes' : 'No'}
              </p>
              <p>
                <span className="font-bold text-heading">Lead Posting:</span> {branch.enable_lead_posting ? 'Enabled' : 'Disabled'}
              </p>
              <p>
                <span className="font-bold text-heading">Tax Rate:</span> {formatPercent(branch.sales_tax_rate)}
              </p>
              <p>
                <span className="font-bold text-heading">Deposits:</span> {branch.deposit_enabled ? `${formatPercent(branch.default_deposit_pct)} (Required)` : 'Disabled'}
              </p>
              <p>
                <span className="font-bold text-heading">Booking Without Deposit:</span> {branch.allow_booking_without_deposit ? 'Allowed' : 'Disallowed'}
              </p>
            </div>
          </div>
        </div>

        {branch.logo_url && (
          <div className="rounded-2xl border border-subtle bg-page p-4 space-y-2">
            <p className="text-[0.625rem] font-bold uppercase tracking-widest text-disabled">Branch Logo</p>
            <img
              src={branch.logo_url}
              alt={`${branch.name} logo`}
              className="max-h-16 rounded bg-white p-2 ring-1 ring-disabled/30"
            />
          </div>
        )}
      </Card>
    </div>
  );
};

const BranchModalForm = ({ initialData = {}, onSave, onCancel, isLoading, mainBranch, companyId }) => {
  const [formData, setFormData] = useState(() => normalizeFormState(initialData));

  useEffect(() => {
    setFormData(normalizeFormState(initialData));
  }, [initialData]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave(normalizeBranchPayload(formData));
  };

  const handleCopyCompanyInfo = async () => {
    const targetCompanyId = companyId || initialData.company;
    if (!targetCompanyId) return;
    try {
      const company = await API.general.getCompany(targetCompanyId);
      if (company) {
        setFormData((prev) => ({
          ...prev,
          email: company.email || prev.email,
          phone: company.phone || prev.phone,
          website: company.website || prev.website,
          logo_url: company.logo_url || prev.logo_url,
          address_line1: company.address_line1 || prev.address_line1,
          address_line2: company.address_line2 || prev.address_line2,
          city: company.city || prev.city,
          state: company.state || prev.state,
          zip_code: company.zip_code || prev.zip_code,
        }));
      }
    } catch (err) {
      console.error('Failed to copy company details:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card className="max-h-[90vh] w-full max-w-3xl space-y-6 overflow-y-auto p-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-heading text-xl font-bold text-heading">
            {initialData?.id ? 'Edit Branch' : 'Add New Branch'}
          </h3>
          {formData.is_main && (
            <button
              type="button"
              onClick={handleCopyCompanyInfo}
              className="flex items-center gap-1.5 rounded-lg bg-page px-3 py-1.5 text-xs font-bold text-primary ring-1 ring-primary/20 transition-all hover:bg-subtle"
            >
              Sync with Company Profile
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InputField
              label="Branch Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              icon={Truck}
              placeholder="e.g., Toronto Branch"
            />
            <InputField
              label="Dispatch Location"
              name="dispatch_location"
              value={formData.dispatch_location}
              onChange={handleChange}
              icon={MapPin}
              placeholder="e.g., Yard A"
            />
          </div>

          {!formData.is_main && (
            <div className="flex justify-between items-center mb-1">
              <InheritanceToggle
                label="Inherit branding from Main Branch"
                enabled={formData.inherit_branding}
                onChange={(e) => setFormData((prev) => ({ ...prev, inherit_branding: e.target.checked }))}
              />
            </div>
          )}
          <InputField
            label="Branch Logo URL"
            name="logo_url"
            value={formData.inherit_branding ? '' : formData.logo_url}
            onChange={handleChange}
            placeholder={formData.inherit_branding ? (mainBranch?.logo_url || "Inherited logo URL") : "https://.../logo.png"}
            disabled={formData.inherit_branding}
          />
          <InputField
            label="Sales Number Prefix"
            name="sales_number_prefix"
            value={formData.sales_number_prefix}
            onChange={handleChange}
            placeholder="SM"
          />

          <InputField
            label="Address Line 1"
            name="address_line1"
            value={formData.address_line1}
            onChange={handleChange}
            icon={MapPin}
            placeholder="Street address"
          />
          <InputField
            label="Address Line 2"
            name="address_line2"
            value={formData.address_line2}
            onChange={handleChange}
            icon={MapPin}
            placeholder="Unit / Suite / Building"
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <InputField label="Branch Email" name="email" value={formData.email} onChange={handleChange} placeholder="sales@company.ca" />
            <InputField label="Branch Phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="+1 403 555 0123" />
            <InputField label="Branch Website" name="website" value={formData.website} onChange={handleChange} placeholder="https://www.company.ca" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <InputField label="City" name="city" value={formData.city} onChange={handleChange} placeholder="Toronto" />
            <InputField label="State / Province" name="state" value={formData.state} onChange={handleChange} placeholder="ON" />
            <InputField label="Zip / Postal Code" name="zip_code" value={formData.zip_code} onChange={handleChange} placeholder="M5V 2T6" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[0.625rem] font-bold uppercase tracking-widest text-disabled">Tax Settings</p>
              {!formData.is_main && (
                <InheritanceToggle
                  label="Inherit tax rate from Main Branch"
                  enabled={formData.inherit_tax_rate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, inherit_tax_rate: e.target.checked }))}
                />
              )}
            </div>
            <InputField
              label="Sales Tax Rate (%)"
              name="sales_tax_rate"
              type="number"
              value={formData.inherit_tax_rate ? '' : formData.sales_tax_rate}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder={formData.inherit_tax_rate ? `${toPercent(mainBranch?.sales_tax_rate)}` : "0.00"}
              disabled={formData.inherit_tax_rate}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[0.625rem] font-bold uppercase tracking-widest text-disabled">Deposit Settings</p>
              {!formData.is_main && (
                <InheritanceToggle
                  label="Inherit deposit settings from Main Branch"
                  enabled={formData.inherit_deposit}
                  onChange={(e) => setFormData((prev) => ({ ...prev, inherit_deposit: e.target.checked }))}
                />
              )}
            </div>
            <ToggleField
              label="Enable Deposit Payments"
              description="Calculate deposit and allow payment portal checkout."
              enabled={formData.inherit_deposit ? !!mainBranch?.deposit_enabled : formData.deposit_enabled}
              onToggle={() => {
                if (!formData.inherit_deposit) {
                  setFormData((prev) => ({ ...prev, deposit_enabled: !prev.deposit_enabled }));
                }
              }}
              disabled={formData.inherit_deposit}
            />
            <ToggleField
              label="Allow Booking Without Deposit"
              description="Users with permission can book jobs even without deposit."
              enabled={formData.inherit_deposit ? !!mainBranch?.allow_booking_without_deposit : formData.allow_booking_without_deposit}
              onToggle={() => {
                if (!formData.inherit_deposit) {
                  setFormData((prev) => ({
                    ...prev,
                    allow_booking_without_deposit: !prev.allow_booking_without_deposit,
                  }));
                }
              }}
              disabled={formData.inherit_deposit}
            />
            <InputField
              label="Default Deposit Percent (%)"
              name="default_deposit_pct"
              type="number"
              value={formData.inherit_deposit ? '' : formData.default_deposit_pct}
              onChange={handleChange}
              step="0.01"
              min="0"
              disabled={formData.inherit_deposit || !(formData.inherit_deposit ? !!mainBranch?.deposit_enabled : formData.deposit_enabled)}
              placeholder={formData.inherit_deposit ? `${toPercent(mainBranch?.default_deposit_pct)}` : "10"}
            />
          </div>

          <div className="space-y-3">
            <p className="text-[0.625rem] font-bold uppercase tracking-widest text-disabled">Branch Rules</p>
            <ToggleField
              label="Restrict Leads And Opportunities To Branch Users"
              description="Only users assigned to this branch can access its records."
              enabled={formData.restrict_leads_opportunities_to_branch_users}
              onToggle={() =>
                setFormData((prev) => ({
                  ...prev,
                  restrict_leads_opportunities_to_branch_users: !prev.restrict_leads_opportunities_to_branch_users,
                }))
              }
            />
            <ToggleField
              label="Is Main Branch"
              description="Designate this branch as the primary/main branch for the company."
              enabled={formData.is_main}
              onToggle={() =>
                setFormData((prev) => ({
                  ...prev,
                  is_main: !prev.is_main,
                }))
              }
            />
            <ToggleField
              label="Enable Lead Posting"
              description="Receive copies of inbound leads distributed to this branch."
              enabled={formData.enable_lead_posting}
              onToggle={() =>
                setFormData((prev) => ({
                  ...prev,
                  enable_lead_posting: !prev.enable_lead_posting,
                }))
              }
            />
            <ToggleField
              label="Branch Active"
              description="Inactive branches remain archived and cannot be used for active jobs."
              enabled={formData.is_active}
              onToggle={() => setFormData((prev) => ({ ...prev, is_active: !prev.is_active }))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg bg-card px-4 py-2 font-medium text-body transition-colors hover:bg-page"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-bold text-white transition-all hover:bg-primary-dark disabled:opacity-70"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {isLoading ? 'Saving...' : 'Save Branch'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

const ConfirmDelete = ({ name, onConfirm, onCancel, isLoading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
    <Card className="max-w-sm space-y-4 p-6 text-center">
      <AlertCircle size={48} className="mx-auto text-[#791F1F]" />
      <h3 className="font-heading text-xl font-bold text-heading">Confirm Deletion</h3>
      <p className="text-sm text-body">
        Are you sure you want to delete branch: <span className="font-bold">{name}</span>? This action cannot be undone.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <button type="button" onClick={onCancel} className="rounded-lg bg-card px-4 py-2 font-medium text-body transition-colors hover:bg-page">
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg bg-[#791F1F] px-4 py-2 font-bold text-white transition-all hover:bg-[#b0000a] disabled:opacity-70"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
          {isLoading ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </Card>
  </div>
);

const BranchSettings = ({ activeBranchId = null, view = null }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Directory view state
  const [searchFilter, setSearchFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [branchToEdit, setBranchToEdit] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [branchToView, setBranchToView] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState(null);

  // Active branch inline form state (used for general, booking, taxes, branding views)
  const [currentBranchForm, setCurrentBranchForm] = useState(null);

  const fetchBranches = async () => {
    setIsLoading(true);
    try {
      const response = await API.general.getBranches();
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.results)
        ? response.results
        : Array.isArray(response?.data)
        ? response.data
        : [];
      const accessible = filterAccessibleBranches(user, list);
      setBranches(accessible.length ? accessible : list);
    } catch (err) {
      console.error('Failed to load branches:', err);
      setMessage({ type: 'error', text: 'Failed to load branches.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const mainBranch = useMemo(() => {
    return branches.find((b) => b.is_main) || null;
  }, [branches]);

  const selectedBranch = useMemo(() => {
    if (!branches.length) return null;
    if (activeBranchId) {
      const found = branches.find((b) => String(b.id) === String(activeBranchId));
      if (found) return found;
    }
    return mainBranch || branches[0];
  }, [branches, activeBranchId, mainBranch]);

  useEffect(() => {
    if (selectedBranch) {
      setCurrentBranchForm(normalizeFormState(selectedBranch));
    }
  }, [selectedBranch]);

  const refreshAndInvalidate = async () => {
    await fetchBranches();
    queryClient.invalidateQueries({ queryKey: ['branches'] });
  };

  const handleCreateBranch = async (payload) => {
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await API.general.createBranch(payload);
      showToast?.('Branch created successfully!', 'success');
      setMessage({ type: 'success', text: 'Branch created successfully!' });
      setShowAddModal(false);
      await refreshAndInvalidate();
    } catch (err) {
      console.error('Failed to create branch:', err);
      const errText = err.response?.data?.detail || err.message || 'Failed to create branch.';
      showToast?.(typeof errText === 'string' ? errText : 'Failed to create branch.', 'error');
      setMessage({ type: 'error', text: typeof errText === 'string' ? errText : 'Failed to create branch.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateModalBranch = async (payload) => {
    if (!branchToEdit?.id) return;
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await API.general.updateBranch(branchToEdit.id, payload);
      showToast?.('Branch updated successfully!', 'success');
      setMessage({ type: 'success', text: 'Branch updated successfully!' });
      setShowEditModal(false);
      setBranchToEdit(null);
      await refreshAndInvalidate();
    } catch (err) {
      console.error('Failed to update branch:', err);
      const errText = err.response?.data?.detail || err.message || 'Failed to update branch.';
      showToast?.(typeof errText === 'string' ? errText : 'Failed to update branch.', 'error');
      setMessage({ type: 'error', text: typeof errText === 'string' ? errText : 'Failed to update branch.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBranch = async () => {
    if (!branchToDelete?.id) return;
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await API.general.deleteBranch(branchToDelete.id);
      showToast?.('Branch deleted successfully!', 'success');
      setMessage({ type: 'success', text: 'Branch deleted successfully!' });
      setShowDeleteConfirm(false);
      setBranchToDelete(null);
      await refreshAndInvalidate();
    } catch (err) {
      console.error('Failed to delete branch:', err);
      const errText = err.response?.data?.detail || err.message || 'Failed to delete branch.';
      showToast?.(typeof errText === 'string' ? errText : 'Failed to delete branch.', 'error');
      setMessage({ type: 'error', text: typeof errText === 'string' ? errText : 'Failed to delete branch.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveActiveBranch = async () => {
    if (!selectedBranch?.id || !currentBranchForm) return;
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = normalizeBranchPayload(currentBranchForm);
      await API.general.updateBranch(selectedBranch.id, payload);
      showToast?.(`${selectedBranch.name} settings saved successfully!`, 'success');
      setMessage({ type: 'success', text: `${selectedBranch.name} settings saved successfully!` });
      await refreshAndInvalidate();
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      console.error('Failed to update active branch settings:', err);
      const errText = err.response?.data?.detail || err.message || 'Failed to save branch settings.';
      showToast?.(typeof errText === 'string' ? errText : 'Failed to save branch settings.', 'error');
      setMessage({ type: 'error', text: typeof errText === 'string' ? errText : 'Failed to save branch settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !branches.length) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  const effectiveView = view || 'directory';

  // 1. DIRECTORY VIEW
  if (effectiveView === 'directory') {
    const filteredBranches = branches.filter((b) => {
      if (!searchFilter.trim()) return true;
      const term = searchFilter.toLowerCase();
      return (
        b.name?.toLowerCase().includes(term) ||
        b.city?.toLowerCase().includes(term) ||
        b.dispatch_location?.toLowerCase().includes(term) ||
        b.email?.toLowerCase().includes(term)
      );
    });

    return (
      <div className="animate-in space-y-3 fade-in duration-300">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h3 className="text-xs font-bold text-heading dark:text-white">Branch Directory</h3>
            <p className="text-[10px] text-slate-400">Manage operating branches, facilities, and regional hubs.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search branches..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-primary/90"
            >
              <Plus size={14} /> Add Branch
            </button>
          </div>
        </div>

        {message.text && (
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium ${
              message.type === 'success' ? 'bg-primary-tint/30 text-primary' : 'bg-[#FDE8E8]/30 text-[#791F1F]'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filteredBranches.map((branch) => (
            <Card
              key={branch.id}
              className="!p-3.5 !rounded-xl group relative cursor-pointer transition-shadow hover:shadow-md"
              role="button"
              tabIndex={0}
              onClick={() => {
                setBranchToView(branch);
                setShowViewModal(true);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setBranchToView(branch);
                  setShowViewModal(true);
                }
              }}
            >
              <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setBranchToView(branch);
                    setShowViewModal(true);
                  }}
                  className="rounded-lg p-1.5 text-body transition-colors hover:bg-subtle hover:text-primary"
                  title="View"
                >
                  <Info size={14} />
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setBranchToEdit(branch);
                    setShowEditModal(true);
                  }}
                  className="rounded-lg p-1.5 text-body transition-colors hover:bg-subtle hover:text-primary"
                  title="Edit"
                >
                  <Edit2 size={14} />
                </button>
                {!branch.is_main && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setBranchToDelete(branch);
                      setShowDeleteConfirm(true);
                    }}
                    className="rounded-lg p-1.5 text-body transition-colors hover:bg-[#FDE8E8]/30 hover:text-[#791F1F]"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-page text-primary">
                  {branch.logo_url ? (
                    <img src={branch.logo_url} alt="" className="h-8 w-8 rounded object-contain" />
                  ) : (
                    <Truck size={24} />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-heading">{branch.name}</h4>
                    {branch.is_main && (
                      <span className="rounded bg-primary-tint/40 px-2 py-0.5 text-[0.625rem] font-bold uppercase text-primary">
                        Main
                      </span>
                    )}
                    <span
                      className={`rounded px-2 py-0.5 text-[0.625rem] font-bold uppercase ${
                        isBranchActive(branch) ? 'bg-primary-tint/30 text-primary' : 'bg-[#FDE8E8]/30 text-[#791F1F]'
                      }`}
                    >
                      {isBranchActive(branch) ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-body">
                    <p className="flex items-center gap-2">
                      <MapPin size={14} /> {branch.city || '-'}, {branch.state || '-'} {branch.zip_code || '-'}
                    </p>
                    <p>Dispatch: {branch.dispatch_location || 'Not set'}</p>
                    <p>Prefix: <span className="font-mono font-semibold">{branch.sales_number_prefix || 'None'}</span></p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-page pt-4 text-xs">
                <div>
                  <p className="text-[0.625rem] font-bold uppercase tracking-widest text-disabled">Tax Rate</p>
                  <p className="font-bold text-heading">{formatPercent(branch.sales_tax_rate)}</p>
                </div>
                <div>
                  <p className="text-[0.625rem] font-bold uppercase tracking-widest text-disabled">Deposit Required</p>
                  <p className="font-bold text-heading">
                    {branch.deposit_enabled ? formatPercent(branch.default_deposit_pct) : 'No'}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {showAddModal && (
          <BranchModalForm
            onSave={handleCreateBranch}
            onCancel={() => setShowAddModal(false)}
            isLoading={isSaving}
            mainBranch={mainBranch}
            companyId={user?.company}
          />
        )}
        {showEditModal && (
          <BranchModalForm
            initialData={branchToEdit}
            onSave={handleUpdateModalBranch}
            onCancel={() => {
              setShowEditModal(false);
              setBranchToEdit(null);
            }}
            isLoading={isSaving}
            mainBranch={mainBranch}
            companyId={user?.company}
          />
        )}
        {showDeleteConfirm && (
          <ConfirmDelete
            name={branchToDelete?.name}
            onConfirm={handleDeleteBranch}
            onCancel={() => {
              setShowDeleteConfirm(false);
              setBranchToDelete(null);
            }}
            isLoading={isSaving}
          />
        )}
        {showViewModal && (
          <BranchViewModal
            branch={branchToView}
            onClose={() => {
              setShowViewModal(false);
              setBranchToView(null);
            }}
          />
        )}
      </div>
    );
  }

  // Active branch is required for views: general, booking, taxes, branding
  if (!selectedBranch || !currentBranchForm) {
    return (
      <div className="p-8 text-center text-body">
        <Building2 size={36} className="mx-auto mb-2 text-disabled" />
        <p className="font-semibold">No active branch selected.</p>
        <p className="text-xs text-disabled mt-1">Please select a branch from the header selector.</p>
      </div>
    );
  }

  const handleActiveBranchFieldChange = (event) => {
    const { name, value, type, checked } = event.target;
    setCurrentBranchForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const isMainBranch = !!currentBranchForm.is_main;

  return (
    <div className="animate-in space-y-3 fade-in duration-300">
      {/* Subtab Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-heading dark:text-white">
              {effectiveView === 'general' && 'General & Location Settings'}
              {effectiveView === 'booking' && 'Booking & Deposit Rules'}
              {effectiveView === 'taxes' && 'Taxes & Surcharge Configurations'}
              {effectiveView === 'branding' && 'Branch Branding & Identity'}
            </h3>
            {isMainBranch && (
              <span className="rounded bg-primary-tint/40 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                Main Branch
              </span>
            )}
          </div>
          <p className="text-[11px] text-body">
            Configuring branch: <span className="font-bold text-heading dark:text-white">{selectedBranch.name}</span>
          </p>
        </div>
        <button
          onClick={handleSaveActiveBranch}
          disabled={isSaving}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-70"
        >
          {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {message.text && (
        <div
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium ${
            message.type === 'success' ? 'bg-primary-tint/30 text-primary' : 'bg-[#FDE8E8]/30 text-[#791F1F]'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {message.text}
        </div>
      )}

      {/* 2. GENERAL & LOCATION VIEW */}
      {effectiveView === 'general' && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Card className="!p-3.5 !rounded-xl space-y-2.5">
            <h4 className="text-xs font-bold text-heading">Branch Identity</h4>
            <InputField
              label="Branch Name"
              name="name"
              value={currentBranchForm.name}
              onChange={handleActiveBranchFieldChange}
              icon={Truck}
              placeholder="e.g., Downtown Facility"
            />
            <InputField
              label="Sales Number Prefix"
              name="sales_number_prefix"
              value={currentBranchForm.sales_number_prefix}
              onChange={handleActiveBranchFieldChange}
              placeholder="e.g., DWT"
            />
            <p className="text-[11px] text-body">
              Opportunity code preview: <span className="font-mono font-bold text-heading">{(String(currentBranchForm.sales_number_prefix || '').trim() ? `${String(currentBranchForm.sales_number_prefix).trim()}-00001` : '00001')}</span>
            </p>
            <InputField
              label="Dispatch Location"
              name="dispatch_location"
              value={currentBranchForm.dispatch_location}
              onChange={handleActiveBranchFieldChange}
              icon={MapPin}
              placeholder="e.g., Bay 4 / Yard South"
            />
          </Card>

          <Card className="!p-3.5 !rounded-xl space-y-2.5">
            <h4 className="text-xs font-bold text-heading">Contact Channels</h4>
            <InputField
              label="Branch Email"
              name="email"
              type="email"
              value={currentBranchForm.email}
              onChange={handleActiveBranchFieldChange}
              icon={Mail}
              placeholder="branch@company.com"
            />
            <InputField
              label="Branch Phone"
              name="phone"
              value={currentBranchForm.phone}
              onChange={handleActiveBranchFieldChange}
              icon={Phone}
              placeholder="+1 555 0192"
            />
            <InputField
              label="Branch Website"
              name="website"
              value={currentBranchForm.website}
              onChange={handleActiveBranchFieldChange}
              icon={Globe}
              placeholder="https://company.com/locations/downtown"
            />
          </Card>

          <Card className="!p-3.5 !rounded-xl space-y-2.5">
            <h4 className="text-xs font-bold text-heading">Physical Address</h4>
            <InputField
              label="Address Line 1"
              name="address_line1"
              value={currentBranchForm.address_line1}
              onChange={handleActiveBranchFieldChange}
              icon={MapPin}
              placeholder="123 Industrial Parkway"
            />
            <InputField
              label="Address Line 2"
              name="address_line2"
              value={currentBranchForm.address_line2}
              onChange={handleActiveBranchFieldChange}
              placeholder="Building B, Suite 100"
            />
            <div className="grid grid-cols-3 gap-2">
              <InputField
                label="City"
                name="city"
                value={currentBranchForm.city}
                onChange={handleActiveBranchFieldChange}
                placeholder="Toronto"
              />
              <InputField
                label="State"
                name="state"
                value={currentBranchForm.state}
                onChange={handleActiveBranchFieldChange}
                placeholder="ON"
              />
              <InputField
                label="Zip Code"
                name="zip_code"
                value={currentBranchForm.zip_code}
                onChange={handleActiveBranchFieldChange}
                placeholder="M4B 1B3"
              />
            </div>
          </Card>

          <Card className="!p-3.5 !rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-heading">Operational Controls</h4>
            <ToggleField
              label="Branch Active"
              description="Allow this branch to be used for active operations."
              enabled={currentBranchForm.is_active}
              onToggle={() => setCurrentBranchForm((prev) => ({ ...prev, is_active: !prev.is_active }))}
            />
            <ToggleField
              label="Restrict Leads & Opportunities"
              description="Only assigned branch staff can access this branch's records."
              enabled={currentBranchForm.restrict_leads_opportunities_to_branch_users}
              onToggle={() =>
                setCurrentBranchForm((prev) => ({
                  ...prev,
                  restrict_leads_opportunities_to_branch_users: !prev.restrict_leads_opportunities_to_branch_users,
                }))
              }
            />
            <ToggleField
              label="Inbound Lead Posting"
              description="Permit webhook routing to target this branch."
              enabled={currentBranchForm.enable_lead_posting}
              onToggle={() =>
                setCurrentBranchForm((prev) => ({
                  ...prev,
                  enable_lead_posting: !prev.enable_lead_posting,
                }))
              }
            />
            <ToggleField
              label="Designate as Main Branch"
              description="Mark this branch as the primary operating entity."
              enabled={currentBranchForm.is_main}
              onToggle={() =>
                setCurrentBranchForm((prev) => ({
                  ...prev,
                  is_main: !prev.is_main,
                }))
              }
            />
          </Card>
        </div>
      )}

      {/* 3. BOOKING & DEPOSITS VIEW */}
      {effectiveView === 'booking' && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Card className="!p-3.5 !rounded-xl space-y-2.5">
            <h4 className="text-xs font-bold text-heading">Deposit Requirements</h4>
            {!isMainBranch && (
              <div className="flex justify-between items-center rounded-lg bg-slate-50 px-3 py-1.5 dark:bg-slate-900/60">
                <span className="text-[11px] font-bold text-heading dark:text-white">Inheritance</span>
                <InheritanceToggle
                  label="Inherit deposit rules from Main Branch"
                  enabled={currentBranchForm.inherit_deposit}
                  onChange={(e) =>
                    setCurrentBranchForm((prev) => ({
                      ...prev,
                      inherit_deposit: e.target.checked,
                    }))
                  }
                />
              </div>
            )}

            <ToggleField
              label="Enable Deposit Payments"
              description="Estimates calculate deposit amount for payment checkout."
              enabled={
                currentBranchForm.inherit_deposit
                  ? !!mainBranch?.deposit_enabled
                  : currentBranchForm.deposit_enabled
              }
              onToggle={() => {
                if (!currentBranchForm.inherit_deposit) {
                  setCurrentBranchForm((prev) => ({
                    ...prev,
                    deposit_enabled: !prev.deposit_enabled,
                  }));
                }
              }}
              disabled={currentBranchForm.inherit_deposit}
            />

            <ToggleField
              label="Allow Booking Without Deposit"
              description="Permit authorized staff to confirm jobs without deposit."
              enabled={
                currentBranchForm.inherit_deposit
                  ? !!mainBranch?.allow_booking_without_deposit
                  : currentBranchForm.allow_booking_without_deposit
              }
              onToggle={() => {
                if (!currentBranchForm.inherit_deposit) {
                  setCurrentBranchForm((prev) => ({
                    ...prev,
                    allow_booking_without_deposit: !prev.allow_booking_without_deposit,
                  }));
                }
              }}
              disabled={currentBranchForm.inherit_deposit}
            />

            <InputField
              label="Default Deposit Percent (%)"
              name="default_deposit_pct"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={currentBranchForm.inherit_deposit ? '' : currentBranchForm.default_deposit_pct}
              onChange={handleActiveBranchFieldChange}
              placeholder={
                currentBranchForm.inherit_deposit
                  ? `${toPercent(mainBranch?.default_deposit_pct)}% (Inherited)`
                  : '10'
              }
              disabled={
                currentBranchForm.inherit_deposit ||
                !(currentBranchForm.inherit_deposit
                  ? !!mainBranch?.deposit_enabled
                  : currentBranchForm.deposit_enabled)
              }
            />
          </Card>

          <Card className="!p-3.5 !rounded-xl space-y-2.5">
            <h4 className="text-xs font-bold text-heading">Booking Logic & Lead Flow</h4>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs text-body dark:border-slate-800 dark:bg-slate-900/60">
              <p className="font-bold text-heading dark:text-white">Active Deposit Policy</p>
              <p className="mt-1 text-[11px]">
                {currentBranchForm.inherit_deposit ? (
                  <>
                    Inheriting rules from <span className="font-bold text-primary">{mainBranch?.name || 'Main Branch'}</span>: Deposit {mainBranch?.deposit_enabled ? `Required (${toPercent(mainBranch?.default_deposit_pct)}%)` : 'Disabled'}.
                  </>
                ) : (
                  <>
                    Branch-specific override: Deposit {currentBranchForm.deposit_enabled ? `Required (${toPercent(currentBranchForm.default_deposit_pct)}%)` : 'Disabled'}.
                  </>
                )}
              </p>
            </div>

            <ToggleField
              label="Inbound Lead Posting"
              description="Enable lead distribution to assign bookings directly to this branch."
              enabled={currentBranchForm.enable_lead_posting}
              onToggle={() =>
                setCurrentBranchForm((prev) => ({
                  ...prev,
                  enable_lead_posting: !prev.enable_lead_posting,
                }))
              }
            />
          </Card>
        </div>
      )}

      {/* 4. TAXES & SURCHARGES VIEW */}
      {effectiveView === 'taxes' && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Card className="!p-3.5 !rounded-xl space-y-2.5">
            <h4 className="text-xs font-bold text-heading">Sales Tax Rate</h4>
            {!isMainBranch && (
              <div className="flex justify-between items-center rounded-lg bg-slate-50 px-3 py-1.5 dark:bg-slate-900/60">
                <span className="text-[11px] font-bold text-heading dark:text-white">Tax Inheritance</span>
                <InheritanceToggle
                  label="Inherit tax rate from Main Branch"
                  enabled={currentBranchForm.inherit_tax_rate}
                  onChange={(e) =>
                    setCurrentBranchForm((prev) => ({
                      ...prev,
                      inherit_tax_rate: e.target.checked,
                    }))
                  }
                />
              </div>
            )}

            <InputField
              label="Branch Sales Tax Rate (%)"
              name="sales_tax_rate"
              type="number"
              step="0.01"
              min="0"
              value={currentBranchForm.inherit_tax_rate ? '' : currentBranchForm.sales_tax_rate}
              onChange={handleActiveBranchFieldChange}
              placeholder={
                currentBranchForm.inherit_tax_rate
                  ? `${toPercent(mainBranch?.sales_tax_rate)}% (Inherited)`
                  : '0.00'
              }
              disabled={currentBranchForm.inherit_tax_rate}
              icon={CreditCard}
            />

            <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs text-body dark:border-slate-800 dark:bg-slate-900/60">
              <p className="font-bold text-heading dark:text-white">Effective Tax Calculation</p>
              <p className="mt-1 text-[11px]">
                {currentBranchForm.inherit_tax_rate
                  ? `Currently inheriting ${formatPercent(mainBranch?.sales_tax_rate)} from ${mainBranch?.name || 'Main Branch'}.`
                  : `Custom branch tax override of ${formatPercent(currentBranchForm.sales_tax_rate)} is active.`}
              </p>
            </div>
          </Card>

          <Card className="!p-3.5 !rounded-xl space-y-2.5">
            <h4 className="text-xs font-bold text-heading">Regional Tax Guidelines</h4>
            <p className="text-[11px] text-body leading-relaxed">
              Sales tax rates configured on this branch are applied automatically to local moving estimates, hourly billing charges, and materials invoices.
            </p>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-[11px] space-y-1 dark:border-slate-800 dark:bg-slate-900/60">
              <p className="font-bold text-heading dark:text-white">Main Branch Standard</p>
              <p className="text-body">{mainBranch?.name}: <span className="font-bold text-heading dark:text-white">{formatPercent(mainBranch?.sales_tax_rate)}</span></p>
            </div>
          </Card>
        </div>
      )}

      {/* 5. BRANDING VIEW */}
      {effectiveView === 'branding' && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Card className="!p-3.5 !rounded-xl space-y-2.5">
            <h4 className="text-xs font-bold text-heading">Branch Logo & Visuals</h4>
            {!isMainBranch && (
              <div className="flex justify-between items-center rounded-lg bg-slate-50 px-3 py-1.5 dark:bg-slate-900/60">
                <span className="text-[11px] font-bold text-heading dark:text-white">Branding Inheritance</span>
                <InheritanceToggle
                  label="Inherit branding from Main Branch"
                  enabled={currentBranchForm.inherit_branding}
                  onChange={(e) =>
                    setCurrentBranchForm((prev) => ({
                      ...prev,
                      inherit_branding: e.target.checked,
                    }))
                  }
                />
              </div>
            )}

            <InputField
              label="Branch Logo URL"
              name="logo_url"
              value={currentBranchForm.inherit_branding ? '' : currentBranchForm.logo_url}
              onChange={handleActiveBranchFieldChange}
              placeholder={
                currentBranchForm.inherit_branding
                  ? (mainBranch?.logo_url || 'Inheriting company logo')
                  : 'https://cdn.example.com/branch-logo.png'
              }
              disabled={currentBranchForm.inherit_branding}
              icon={ImageIcon}
            />

            <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-[10px] font-bold uppercase tracking-widest text-disabled mb-1.5">Logo Preview</p>
              {(() => {
                const effectiveLogo = currentBranchForm.inherit_branding
                  ? mainBranch?.logo_url
                  : currentBranchForm.logo_url;
                return effectiveLogo ? (
                  <img
                    src={effectiveLogo}
                    alt={`${selectedBranch.name} logo`}
                    className="max-h-14 max-w-full rounded bg-white p-1.5 ring-1 ring-slate-200 object-contain dark:bg-slate-800 dark:ring-slate-700"
                  />
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-body">
                    <ImageIcon size={16} className="text-disabled" />
                    <span>No logo specified. Default icon will be used.</span>
                  </div>
                );
              })()}
            </div>
          </Card>

          <Card className="!p-3.5 !rounded-xl space-y-2.5">
            <h4 className="text-xs font-bold text-heading">Communications & Documents</h4>
            <p className="text-[11px] text-body leading-relaxed">
              Branch branding elements are used in customer quote previews, digital contract headers, and notification signatures.
            </p>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-[11px] space-y-1 dark:border-slate-800 dark:bg-slate-900/60">
              <p className="font-bold text-heading dark:text-white">Display Summary</p>
              <p className="text-body">Branch: <span className="font-bold text-heading dark:text-white">{selectedBranch.name}</span></p>
              <p className="text-body">Location: <span className="font-bold text-heading dark:text-white">{selectedBranch.city || '-'}, {selectedBranch.state || '-'}</span></p>
              <p className="text-body">Dispatch: <span className="font-bold text-heading dark:text-white">{selectedBranch.dispatch_location || 'Standard Yard'}</span></p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BranchSettings;
