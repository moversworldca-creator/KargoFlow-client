import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Edit2,
  Info,
  Loader2,
  MapPin,
  Plus,
  Save,
  Trash2,
  Truck,
  XCircle,
} from 'lucide-react';
import Card from '../../../shared/ui/Card';
import API from '../../../services/api';
import { useAuth } from '../../auth/context/AuthContext';
import { useBranchesLookup } from '../../../shared/queries/sharedQueries';
import { filterAccessibleBranches } from '../../../shared/utils/branchScope';

const TAXABLE_FIELDS = [];
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

const WEEKDAYS = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
];

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
}) => (
  <div className="space-y-1.5">
    <label className="ml-1 text-[0.625rem] font-bold uppercase tracking-widest text-body">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-disabled" size={18} />}
      <input
        name={name}
        type={type}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        step={step}
        min={min}
        className={`w-full rounded-lg bg-[#ffffff] py-3 text-sm font-medium outline-none ring-1 ring-disabled/30 transition-all shadow-sm focus:border-primary focus:ring-0 disabled:bg-page disabled:text-disabled ${Icon ? 'pl-11' : 'px-4'} pr-4 border-b-2 border-transparent ${className}`}
      />
    </div>
  </div>
);

const ToggleField = ({ label, description, enabled, onToggle, disabled = false }) => (
  <div className={`flex items-center justify-between rounded-xl bg-page p-4 transition-colors ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-subtle'}`}>
    <div className="space-y-0.5">
      <p className="text-sm font-bold text-heading">{label}</p>
      <p className="text-xs text-body">{description}</p>
    </div>
    <button
      type="button"
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${enabled ? 'bg-primary' : 'bg-slate-200'} ${disabled ? 'cursor-not-allowed' : ''}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  </div>
);

const InheritanceToggle = ({ label, enabled, onChange }) => (
  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-body select-none">
    <input
      type="checkbox"
      checked={enabled}
      onChange={onChange}
      className="h-4 w-4 rounded border-disabled text-primary focus:ring-primary focus:ring-offset-0"
    />
    <span>{label}</span>
  </label>
);

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

const extractRows = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.results)) return response.data.results;
  return [];
};

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
    is_active: !!formData?.is_active,
    scheduling_config: normalizeSchedulingConfig(formData?.scheduling_config),
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

const normalizeSchedulingConfig = (value = {}) => {
  const config = value && typeof value === 'object' ? value : {};
  const horizon = Number(config.scheduling_horizon_days);
  const weeklyWindows = Array.isArray(config.weekly_windows) ? config.weekly_windows : [];
  const defaultWindow = config.default_arrival_window && typeof config.default_arrival_window === 'object'
    ? config.default_arrival_window
    : emptyBranchForm.scheduling_config.default_arrival_window;
  return {
    scheduling_horizon_days: Number.isFinite(horizon) ? Math.max(0, Math.round(horizon)) : 90,
    default_arrival_window: {
      start: String(defaultWindow.start || '').slice(0, 5),
      end: String(defaultWindow.end || '').slice(0, 5),
    },
    weekly_windows: weeklyWindows
      .map((window) => ({
        weekday: Number(window.weekday),
        start: String(window.start || '').slice(0, 5),
        end: String(window.end || '').slice(0, 5),
        capacity: Math.max(1, Math.round(Number(window.capacity) || 1)),
      }))
      .filter((window) => Number.isInteger(window.weekday) && window.weekday >= 0 && window.weekday <= 6 && window.start && window.end),
  };
};

const normalizeFormState = (initialData = {}) => {
  const is_main = !!initialData?.is_main;
  const inherit_tax_rate = !is_main && (initialData?.sales_tax_rate === null || initialData?.sales_tax_rate === undefined);
  const inherit_deposit = !is_main && (initialData?.deposit_enabled === null || initialData?.deposit_enabled === undefined);
  const inherit_branding = !is_main && !initialData?.logo_url;

  return {
    ...emptyBranchForm,
    ...initialData,
    scheduling_config: normalizeSchedulingConfig(initialData?.scheduling_config || emptyBranchForm.scheduling_config),
    sales_tax_rate: inherit_tax_rate ? '' : toPercent(initialData?.sales_tax_rate),
    default_deposit_pct: inherit_deposit ? '' : toPercent(initialData?.default_deposit_pct),
    inherit_tax_rate,
    inherit_deposit,
    inherit_branding,
  };
};

const BranchViewModal = ({ branch, onClose }) => {
  if (!branch) return null;

  const enabledTaxRules = TAXABLE_FIELDS.filter(({ key }) => branch[key]);

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
            <h4 className="text-[0.625rem] font-bold uppercase tracking-widest text-disabled">Location</h4>
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
                <p>Logo URL: {branch.logo_url ? <a className="underline" href={branch.logo_url} target="_blank" rel="noreferrer">{branch.logo_url}</a> : 'Not set'}</p>
                {branch.logo_url && (
                  <img
                    src={branch.logo_url}
                    alt={`${branch.name} logo`}
                    className="mt-1 max-h-10 rounded bg-white p-1 ring-1 ring-disabled/30"
                  />
                )}
              </div>
              <div className="ml-6 space-y-1">
                <p>Email: {branch.email || 'Not set'}</p>
                <p>Phone: {branch.phone || 'Not set'}</p>
                <p>Website: {branch.website ? <a className="underline" href={branch.website} target="_blank" rel="noreferrer">{branch.website}</a> : 'Not set'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[0.625rem] font-bold uppercase tracking-widest text-disabled">Behavior</h4>
            <div className="space-y-2 text-sm text-body">
                <p>
                  <span className="font-bold text-heading">Status:</span> {isBranchActive(branch) ? 'Active' : 'Inactive'}
                </p>
              <p>
                <span className="font-bold text-heading">Restricted To Branch Users:</span>{' '}
                {branch.restrict_leads_opportunities_to_branch_users ? 'Yes' : 'No'}
              </p>
              <p>
                <span className="font-bold text-heading">Main Branch:</span>{' '}
                {branch.is_main ? 'Yes' : 'No'}
              </p>
              <p>
                <span className="font-bold text-heading">Enable Lead Posting:</span>{' '}
                {branch.enable_lead_posting ? 'Yes' : 'No'}
              </p>
              <p>
                <span className="font-bold text-heading">Tax Rate:</span> {formatPercent(branch.sales_tax_rate)}
              </p>
              <p>
                <span className="font-bold text-heading">Deposits Enabled:</span> {branch.deposit_enabled ? 'Yes' : 'No'}
              </p>
              <p>
                <span className="font-bold text-heading">Allow Booking Without Deposit:</span>{' '}
                {branch.allow_booking_without_deposit ? 'Yes' : 'No'}
              </p>
              <p>
                <span className="font-bold text-heading">Default Deposit:</span>{' '}
                {branch.deposit_enabled ? formatPercent(branch.default_deposit_pct) : 'Disabled'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-subtle bg-page p-4">
          <p className="mb-3 text-[0.625rem] font-bold uppercase tracking-widest text-disabled">Taxable Charge Categories</p>
          <div className="flex flex-wrap gap-2">
            {enabledTaxRules.length ? (
              enabledTaxRules.map(({ key, label }) => (
                <span key={key} className="rounded-full bg-primary-tint/30 px-3 py-1 text-xs font-bold text-primary">
                  {label}
                </span>
              ))
            ) : (
              <p className="text-sm text-body">No taxable charge categories enabled.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-subtle bg-card p-4">
          <p className="mb-3 text-[0.625rem] font-bold uppercase tracking-widest text-disabled">Metadata</p>
          <div className="space-y-1 text-sm text-body">
            <p>
              <span className="font-bold text-heading">Created:</span> {branch.created_at || '-'}
            </p>
            <p>
              <span className="font-bold text-heading">Updated:</span> {branch.updated_at || '-'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

const BranchForm = ({ initialData = {}, onSave, onCancel, isLoading, mainBranch, companyId }) => {
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
            {initialData.id ? 'Edit Branch' : 'Add New Branch'}
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
            label="Branch Logo URL (Email)"
            name="logo_url"
            value={formData.inherit_branding ? '' : formData.logo_url}
            onChange={handleChange}
            placeholder={formData.inherit_branding ? (mainBranch?.effective_logo_url || "Inherited logo URL") : "https://.../logo.png"}
            disabled={formData.inherit_branding}
          />
          <InputField
            label="Sales Number Prefix"
            name="sales_number_prefix"
            value={formData.sales_number_prefix}
            onChange={handleChange}
            placeholder="SM"
          />
          <p className="text-xs text-body">
            Preview: <span className="font-mono font-semibold text-heading">{(String(formData.sales_number_prefix || '').trim() ? `${String(formData.sales_number_prefix).trim()}-00001` : '00001')}</span>
          </p>

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
            <InputField label="City" name="city" value={formData.city} onChange={handleChange} placeholder="City" />
            <InputField label="Province/State" name="state" value={formData.state} onChange={handleChange} placeholder="Province" />
            <InputField label="Postal/Zip Code" name="zip_code" value={formData.zip_code} onChange={handleChange} placeholder="Postal code" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              {!formData.is_main && (
                <InheritanceToggle
                  label="Inherit tax rate from Main Branch"
                  enabled={formData.inherit_tax_rate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, inherit_tax_rate: e.target.checked }))}
                />
              )}
              <InputField
                label="Sales Tax Rate (%)"
                name="sales_tax_rate"
                type="number"
                value={formData.inherit_tax_rate ? '' : formData.sales_tax_rate}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder={formData.inherit_tax_rate ? `${toPercent(mainBranch?.effective_sales_tax_rate)}` : "0.00"}
                disabled={formData.inherit_tax_rate}
              />
            </div>
            <div className="rounded-xl border border-subtle bg-page p-4 flex items-center">
              <div>
                <p className="text-sm font-bold text-heading">Tax rate settings</p>
                <p className="mt-1 text-xs text-body">
                  {formData.inherit_tax_rate ? "Inheriting from Main Branch." : "Branch-specific tax rate override."}
                </p>
              </div>
            </div>
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
              description="When enabled, new estimates will calculate a deposit amount and customers can pay Deposit in the portal."
              enabled={formData.inherit_deposit ? !!mainBranch?.effective_deposit_enabled : formData.deposit_enabled}
              onToggle={() => {
                if (!formData.inherit_deposit) {
                  setFormData((prev) => ({ ...prev, deposit_enabled: !prev.deposit_enabled }));
                }
              }}
              disabled={formData.inherit_deposit}
            />
            <ToggleField
              label="Allow Booking Without Deposit"
              description="When enabled, users with the right permission can book a job even if no deposit payment is recorded."
              enabled={formData.inherit_deposit ? !!mainBranch?.effective_allow_booking_without_deposit : formData.allow_booking_without_deposit}
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
              disabled={formData.inherit_deposit || !(formData.inherit_deposit ? !!mainBranch?.effective_deposit_enabled : formData.deposit_enabled)}
              placeholder={formData.inherit_deposit ? `${toPercent(mainBranch?.effective_default_deposit_pct)}` : "10"}
            />
          </div>

          <div className="space-y-3">
            <p className="text-[0.625rem] font-bold uppercase tracking-widest text-disabled">Branch Rules</p>
            <ToggleField
              label="Restrict Leads And Opportunities To Branch Users"
              description="Only users assigned to this branch can access its leads and opportunities."
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
              description="Inactive branches remain stored but should not be used for active operations."
              enabled={formData.is_active}
              onToggle={() => setFormData((prev) => ({ ...prev, is_active: !prev.is_active }))}
            />
          </div>

          <div className="space-y-3">
            <p className="text-[0.625rem] font-bold uppercase tracking-widest text-disabled">Taxable Charge Categories</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {TAXABLE_FIELDS.map(({ key, label, description }) => (
                <ToggleField
                  key={key}
                  label={label}
                  description={description}
                  enabled={!!formData[key]}
                  onToggle={() => setFormData((prev) => ({ ...prev, [key]: !prev[key] }))}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
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
        Are you sure you want to delete the branch: <span className="font-bold">{name}</span>? This action cannot be undone.
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

const normalizeBranches = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const BranchSettings = () => {
  const { user } = useAuth();
  const { data: branchRows = [], refetch: refetchBranches } = useBranchesLookup();
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [branchToEdit, setBranchToEdit] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [branchToView, setBranchToView] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState(null);

  const visibleBranches = useMemo(() => {
    const scoped = filterAccessibleBranches(user, normalizeBranches(branchRows));
    return scoped.length ? scoped : normalizeBranches(branchRows);
  }, [branchRows, user]);
  const mainBranch = Array.isArray(branches) ? branches.find((b) => b.is_main) : null;

  const handleRefreshBranches = async () => {
    setIsLoading(true);
    try {
      setBranches(visibleBranches);
    } catch (err) {
      console.error('Failed to fetch branches:', err);
      setMessage({ type: 'error', text: 'Failed to load branches.' });
      setBranches([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleRefreshBranches();
  }, [refetchBranches, visibleBranches]);

  const handleAddBranch = async (formData) => {
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await API.general.createBranch(formData);
      setMessage({ type: 'success', text: 'Branch added successfully!' });
      setShowAddModal(false);
      await handleRefreshBranches();
    } catch (err) {
      console.error('Failed to add branch:', err);
      setMessage({ type: 'error', text: 'Failed to add branch.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateBranch = async (formData) => {
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await API.general.updateBranch(branchToEdit.id, formData);
      setMessage({ type: 'success', text: 'Branch updated successfully!' });
      setShowEditModal(false);
      setBranchToEdit(null);
      await handleRefreshBranches();
    } catch (err) {
      console.error('Failed to update branch:', err);
      setMessage({ type: 'error', text: 'Failed to update branch.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBranch = async () => {
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await API.general.deleteBranch(branchToDelete.id);
      setMessage({ type: 'success', text: 'Branch deleted successfully!' });
      setShowDeleteConfirm(false);
      setBranchToDelete(null);
      await handleRefreshBranches();
    } catch (err) {
      console.error('Failed to delete branch:', err);
      setMessage({ type: 'error', text: 'Failed to delete branch.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-in space-y-6 fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-lg font-bold text-heading">Branch Locations</h3>
          <p className="text-sm text-body">Branch tax settings control how estimate tax is calculated.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-bold text-white shadow-md transition-all hover:bg-primary-dark"
        >
          <Plus size={18} /> Add Branch
        </button>
      </div>

      {message.text && (
        <div
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
            message.type === 'success' ? 'bg-primary-tint/30 text-primary' : 'bg-[#FDE8E8]/30 text-[#791F1F]'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {branches.map((branch) => {
          const enabledTaxRuleCount = TAXABLE_FIELDS.filter(({ key }) => branch[key]).length;
          return (
            <Card
              key={branch.id}
              className="group relative cursor-pointer transition-shadow hover:shadow-md"
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
              <div className="absolute right-4 top-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setBranchToView(branch);
                    setShowViewModal(true);
                  }}
                  className="rounded-lg p-2 text-body transition-colors hover:bg-subtle hover:text-primary"
                  title="View"
                >
                  <Info size={16} />
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setBranchToEdit(branch);
                    setShowEditModal(true);
                  }}
                  className="rounded-lg p-2 text-body transition-colors hover:bg-subtle hover:text-primary"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setBranchToDelete(branch);
                    setShowDeleteConfirm(true);
                  }}
                  className="rounded-lg p-2 text-body transition-colors hover:bg-[#FDE8E8]/30 hover:text-[#791F1F]"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-page text-primary">
                  <Truck size={24} />
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
                    <p>Branch restriction: {branch.restrict_leads_opportunities_to_branch_users ? 'On' : 'Off'}</p>
                    <p>Main Branch: {branch.is_main ? 'Yes' : 'No'}</p>
                    <p>Lead Posting: {branch.enable_lead_posting ? 'Enabled' : 'Disabled'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-page pt-6">
                <div>
                  <p className="text-[0.625rem] font-bold uppercase tracking-widest text-disabled">Tax Rate</p>
                  <p className="text-sm font-bold text-heading">{formatPercent(branch.sales_tax_rate)}</p>
                </div>
                <div>
                  <p className="text-[0.625rem] font-bold uppercase tracking-widest text-disabled">Taxable Categories</p>
                  <p className="text-sm font-bold text-heading">{enabledTaxRuleCount}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {showAddModal && (
        <BranchForm
          onSave={handleAddBranch}
          onCancel={() => setShowAddModal(false)}
          isLoading={isSaving}
          mainBranch={mainBranch}
          companyId={user?.company}
        />
      )}
      {showEditModal && (
        <BranchForm
          initialData={branchToEdit}
          onSave={handleUpdateBranch}
          onCancel={() => setShowEditModal(false)}
          isLoading={isSaving}
          mainBranch={mainBranch}
          companyId={user?.company}
        />
      )}
      {showDeleteConfirm && (
        <ConfirmDelete
          name={branchToDelete?.name}
          onConfirm={handleDeleteBranch}
          onCancel={() => setShowDeleteConfirm(false)}
          isLoading={isSaving}
        />
      )}
      {showViewModal && <BranchViewModal branch={branchToView} onClose={() => { setShowViewModal(false); setBranchToView(null); }} />}
    </div>
  );
};

export default BranchSettings;
