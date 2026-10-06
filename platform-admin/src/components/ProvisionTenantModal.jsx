import React, { useState } from 'react';
import { 
  X, Building2, MapPin, User, Shield, CreditCard, 
  Check, ArrowRight, Loader2, Sparkles, AlertCircle 
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useModal } from '../hooks/useModal';
import platformApi from '../api/platformApi';

const CURRENCIES = [
  { value: 'USD', label: 'USD ($) - US Dollar' },
  { value: 'CAD', label: 'CAD ($) - Canadian Dollar' },
  { value: 'EUR', label: 'EUR (€) - Euro' },
  { value: 'GBP', label: 'GBP (£) - British Pound' },
  { value: 'AUD', label: 'AUD ($) - Australian Dollar' },
];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
];

export default function ProvisionTenantModal({ isOpen, onClose, onTenantProvisioned, plans = [] }) {
  useModal(isOpen, onClose);
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    // Company
    name: '',
    legal_name: '',
    company_id: '',
    subdomain: '',
    email: '',
    phone: '',
    currency: 'USD',
    timezone: 'America/Chicago',
    address_line1: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'US',
    
    // Subscription & Plan
    plan_id: 'plan-professional',
    billing_interval: 'month',

    // Primary Branch
    branch_name: 'Main Headquarters',
    branch_code: 'HQ-01',
    branch_phone: '',
    branch_address: '',

    // Tenant Admin User
    admin_name: '',
    admin_email: '',
    admin_password: '',
    admin_phone: '',
  });

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'name' && !prev.company_id) {
        updated.company_id = value
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        updated.subdomain = updated.company_id.toLowerCase();
      }
      if (field === 'company_id') {
        updated.subdomain = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
      }
      if (field === 'email' && !prev.admin_email) {
        updated.admin_email = value;
      }
      if (field === 'phone' && !prev.branch_phone) {
        updated.branch_phone = value;
      }
      return updated;
    });
  };

  const handleNext = (e) => {
    e?.preventDefault();
    setErrorMsg('');

    if (step === 1) {
      if (!formData.name.trim() || !formData.company_id.trim() || !formData.email.trim() || !formData.phone.trim()) {
        setErrorMsg('Please fill in all required company fields (Name, Company ID, Email, Phone).');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.plan_id) {
        setErrorMsg('Please select an initial subscription plan.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!formData.branch_name.trim() || !formData.branch_code.trim()) {
        setErrorMsg('Please provide branch name and unique branch code.');
        return;
      }
      setStep(4);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setErrorMsg('');

    if (!formData.admin_name.trim() || !formData.admin_email.trim() || !formData.admin_password.trim()) {
      setErrorMsg('Please provide Admin Name, Admin Email, and Admin Password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await platformApi.provisionTenant({
        company: {
          name: formData.name.trim(),
          legal_name: formData.legal_name.trim() || formData.name.trim(),
          company_id: formData.company_id.trim(),
          subdomain: (formData.subdomain || formData.company_id).trim().toLowerCase(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          currency: formData.currency,
          timezone: formData.timezone,
          address_line1: formData.address_line1.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          zip_code: formData.zip_code.trim(),
          country: formData.country,
        },
        plan_id: formData.plan_id,
        billing_interval: formData.billing_interval,
        branch: {
          name: formData.branch_name.trim(),
          code: formData.branch_code.trim(),
          phone: formData.branch_phone.trim() || formData.phone.trim(),
          address: formData.branch_address.trim() || formData.address_line1.trim(),
        },
        admin: {
          name: formData.admin_name.trim(),
          email: formData.admin_email.trim(),
          password: formData.admin_password.trim(),
          phone: formData.admin_phone.trim() || formData.phone.trim(),
        },
      });

      showToast(`Tenant "${formData.name}" successfully provisioned with initial branch and subscription!`, 'success');
      onTenantProvisioned?.(res.data);
      onClose();
    } catch (err) {
      const errDetail = err?.response?.data?.error || err?.message || 'Failed to provision tenant';
      setErrorMsg(errDetail);
      showToast(errDetail, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Provision New Tenant</h2>
              <p className="text-xs text-slate-500">Atomic onboarding with subscription, primary branch, and admin account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress Stepper */}
        <div className="px-6 py-3 bg-slate-100/60 dark:bg-slate-800/50 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
          {[
            { num: 1, label: 'Organization' },
            { num: 2, label: 'Plan & Tier' },
            { num: 3, label: 'Primary Branch' },
            { num: 4, label: 'Root Admin' },
          ].map((item) => (
            <button
              key={item.num}
              type="button"
              disabled={item.num > step}
              onClick={() => setStep(item.num)}
              className={`flex items-center gap-2 py-1 px-2.5 rounded-lg transition-colors ${
                step === item.num
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : step > item.num
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-400 cursor-not-allowed'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                step === item.num ? 'bg-white text-blue-600' : step > item.num ? 'bg-emerald-500 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-600'
              }`}>
                {step > item.num ? '✓' : item.num}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p>{errorMsg}</p>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="e.g. Apex Express Moving"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Company ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.company_id}
                    onChange={(e) => handleChange('company_id', e.target.value)}
                    placeholder="e.g. CMP-1001"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Legal Business Entity
                  </label>
                  <input
                    type="text"
                    value={formData.legal_name}
                    onChange={(e) => handleChange('legal_name', e.target.value)}
                    placeholder="e.g. Apex Logistics LLC"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Contact Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="admin@apexmoves.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="(555) 000-0000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => handleChange('currency', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Timezone
                  </label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => handleChange('timezone', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Operating Address
                </label>
                <input
                  type="text"
                  value={formData.address_line1}
                  onChange={(e) => handleChange('address_line1', e.target.value)}
                  placeholder="Street Address"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none mb-2"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="City"
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
                  />
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    placeholder="State"
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
                  />
                  <input
                    type="text"
                    value={formData.zip_code}
                    onChange={(e) => handleChange('zip_code', e.target.value)}
                    placeholder="Zip / Postal"
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Select SaaS Subscription Plan
                </p>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => handleChange('billing_interval', 'month')}
                    className={`px-3 py-1 rounded-lg transition-colors ${formData.billing_interval === 'month' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs' : 'text-slate-500'}`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('billing_interval', 'year')}
                    className={`px-3 py-1 rounded-lg transition-colors ${formData.billing_interval === 'year' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs' : 'text-slate-500'}`}
                  >
                    Annual (20% off)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {plans.map((p) => {
                  const isSelected = formData.plan_id === p.id;
                  const price = (p.base_price_cents / 100).toFixed(0);
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleChange('plan_id', p.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-600/30'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {p.code}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">{p.name}</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-slate-900 dark:text-white">${price}</span>
                          <span className="text-[10px] text-slate-400">/{p.billing_interval}</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                        <div>Users: <span className="font-bold text-slate-900 dark:text-slate-200">{p.limits?.active_users}</span></div>
                        <div>Branches: <span className="font-bold text-slate-900 dark:text-slate-200">{p.limits?.active_branches}</span></div>
                        <div>SMS/mo: <span className="font-bold text-slate-900 dark:text-slate-200">{p.limits?.monthly_sms?.toLocaleString()}</span></div>
                        <div>Storage: <span className="font-bold text-slate-900 dark:text-slate-200">{Math.round(p.limits?.storage_bytes / 1073741824)} GB</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
                <MapPin size={16} className="shrink-0" />
                <p>Every provisioned tenant requires at least one primary operating branch for dispatches and billing.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Primary Branch Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.branch_name}
                    onChange={(e) => handleChange('branch_name', e.target.value)}
                    placeholder="e.g. Austin Downtown Hub"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Branch Code / Identifier <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.branch_code}
                    onChange={(e) => handleChange('branch_code', e.target.value)}
                    placeholder="e.g. ATX-01"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Branch Dispatch Phone
                  </label>
                  <input
                    type="text"
                    value={formData.branch_phone}
                    onChange={(e) => handleChange('branch_phone', e.target.value)}
                    placeholder="(555) 000-0000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Facility Address
                  </label>
                  <input
                    type="text"
                    value={formData.branch_address}
                    onChange={(e) => handleChange('branch_address', e.target.value)}
                    placeholder="Physical branch street address"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 text-xs text-purple-800 dark:text-purple-300 flex items-center gap-2">
                <Shield size={16} className="shrink-0" />
                <p>Root tenant administrator who will hold ownership and manage their tenant staff & billing.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Admin Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.admin_name}
                    onChange={(e) => handleChange('admin_name', e.target.value)}
                    placeholder="e.g. Marcus Vance"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Admin Login Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.admin_email}
                    onChange={(e) => handleChange('admin_email', e.target.value)}
                    placeholder="admin@tenantdomain.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Temporary / Initial Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.admin_password}
                    onChange={(e) => handleChange('admin_password', e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Admin Phone
                  </label>
                  <input
                    type="text"
                    value={formData.admin_phone}
                    onChange={(e) => handleChange('admin_phone', e.target.value)}
                    placeholder="(555) 000-0000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors"
            >
              Cancel
            </button>
            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span>Continue</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Provisioning...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Complete Provisioning</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
