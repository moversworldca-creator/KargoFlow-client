import React, { useState, useEffect } from 'react';
import { Building2, Mail, Phone, Globe, MapPin, Hash, ShieldCheck, Save, Loader2 } from 'lucide-react';
import Card from '../../../shared/ui/Card';
import { getCompany, updateCompany } from '../../../services/api';
import { useAuth } from '../../auth/context/AuthContext';
import { useToast } from '../../../shared/context/ToastContext';

const InputField = ({ label, icon: Icon, type = "text", value, onChange, placeholder, disabled = false }) => (
  <label className="block space-y-1">
    <span className="ml-0.5 text-[10px] font-bold uppercase tracking-widest text-body">{label}</span>
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-disabled" size={14} />}
      <input
        type={type}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full rounded-lg border border-slate-200 bg-white ${Icon ? 'pl-9' : 'px-2.5'} pr-2.5 py-1.5 text-xs font-medium text-heading outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-slate-50 disabled:text-disabled dark:border-slate-700 dark:bg-slate-900 dark:text-white`}
      />
    </div>
  </label>
);

const SelectField = ({ label, icon: Icon, value, onChange, disabled = false, children }) => (
  <label className="block space-y-1">
    <span className="ml-0.5 text-[10px] font-bold uppercase tracking-widest text-body">{label}</span>
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-disabled" size={14} />}
      <select
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        className={`w-full rounded-lg border border-slate-200 bg-white ${Icon ? 'pl-9' : 'px-2.5'} pr-2.5 py-1.5 text-xs font-medium text-heading outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:bg-slate-50 disabled:text-disabled dark:border-slate-700 dark:bg-slate-900 dark:text-white`}
      >
        {children}
      </select>
    </div>
  </label>
);

const CURRENCY_OPTIONS = [
  { value: 'CAD', label: 'CAD (Canadian Dollar)' },
  { value: 'USD', label: 'USD (US Dollar)' },
];

const CompanySettings = ({ branchId = null, view = null }) => {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [company, setCompany] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const companyId = user?.company?.id ?? user?.company ?? null;

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        if (!companyId) return;
        const response = await getCompany(companyId);
        setCompany(response);
      } catch (err) {
        console.error('Failed to fetch company:', err);
        setMessage({ type: 'error', text: 'Failed to load company profile.' });
      } finally {
        setIsLoading(false);
      }
    };
    if (!authLoading) fetchCompany();
  }, [authLoading, companyId]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await updateCompany(company.id, company);
      setCompany(response);
      setMessage({ type: 'success', text: 'Company profile saved successfully.' });
      showToast?.('Company profile saved successfully.', 'success');
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      console.error('Failed to save company profile:', err);
      const detail = err.response?.data?.detail || err.message || 'Failed to save company profile.';
      setMessage({ type: 'error', text: typeof detail === 'string' ? detail : JSON.stringify(detail) });
      showToast?.(typeof detail === 'string' ? detail : 'Failed to save company profile.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="flex h-48 items-center justify-center"><Loader2 className="animate-spin text-primary" size={20} /></div>;
  if (!company) return <div className="p-6 text-center text-xs text-slate-500">No company record found.</div>;

  const showProfile = !view || view === 'profile';
  const showContact = !view || view === 'contact';
  const showAddress = !view || view === 'address';
  const showCurrency = !view || view === 'currency';

  const viewTitles = {
    profile: 'Profile & Legal Identity',
    address: 'Headquarters & Address',
    contact: 'Contact Channels',
    currency: 'Currency & Localization',
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h3 className="text-xs font-bold text-heading dark:text-white">
            {view ? viewTitles[view] || 'Company Profile' : 'Company Profile'}
          </h3>
          <p className="text-[10px] text-slate-400">Manage organizational records and legal identity.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-70"
        >
          {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {isSaving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      {message.text && (
        <div className={`p-2.5 rounded-lg text-xs font-semibold ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {showProfile && (
          <Card className="!p-3.5 !rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-heading">General & Legal Information</h4>
            <InputField label="Legal Company Name" icon={Building2} value={company.legal_name} onChange={(e) => setCompany({ ...company, legal_name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2.5">
              <InputField label="Registration #" icon={Hash} value={company.registration_number} onChange={(e) => setCompany({ ...company, registration_number: e.target.value })} />
              <InputField label="Tax ID / EIN" icon={ShieldCheck} value={company.tax_number} onChange={(e) => setCompany({ ...company, tax_number: e.target.value })} />
            </div>
            <InputField label="State License #" icon={ShieldCheck} value={company.state_license_number} onChange={(e) => setCompany({ ...company, state_license_number: e.target.value })} />
          </Card>
        )}

        {showCurrency && (
          <Card className="!p-3.5 !rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-heading">Currency & Regional Settings</h4>
            <SelectField label="Currency" icon={Globe} value={company.currency} onChange={(e) => setCompany({ ...company, currency: e.target.value })}>
              {CURRENCY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </SelectField>
            <div className="rounded-lg bg-slate-50 p-2.5 text-[11px] leading-relaxed text-slate-500 dark:bg-slate-800/60 dark:text-slate-300">
              Preview: <span className="font-bold text-heading dark:text-white">{company.currency === 'CAD' ? 'CA$1,250.00' : '$1,250.00'}</span> · Taxes, quotes, and invoices calculate using this currency format.
            </div>
          </Card>
        )}

        {showContact && (
          <Card className="!p-3.5 !rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-heading">Contact Channels</h4>
            <InputField label="Public Email" icon={Mail} value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} />
            <InputField label="Phone Number" icon={Phone} value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} />
            <InputField label="Website" icon={Globe} value={company.website} onChange={(e) => setCompany({ ...company, website: e.target.value })} />
          </Card>
        )}

        {showAddress && (
          <Card className={`!p-3.5 !rounded-xl space-y-3 ${view === 'address' ? 'md:col-span-2' : 'md:col-span-2'}`}>
            <h4 className="text-xs font-bold text-heading">Headquarters Address</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InputField label="Address Line 1" icon={MapPin} value={company.address_line1} onChange={(e) => setCompany({ ...company, address_line1: e.target.value })} />
              <InputField label="Address Line 2" icon={MapPin} value={company.address_line2} onChange={(e) => setCompany({ ...company, address_line2: e.target.value })} />
              <div className="grid grid-cols-3 gap-2.5 md:col-span-2">
                <InputField label="City" value={company.city} onChange={(e) => setCompany({ ...company, city: e.target.value })} />
                <InputField label="State" value={company.state} onChange={(e) => setCompany({ ...company, state: e.target.value })} />
                <InputField label="Zip Code" value={company.zip_code} onChange={(e) => setCompany({ ...company, zip_code: e.target.value })} />
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CompanySettings;
