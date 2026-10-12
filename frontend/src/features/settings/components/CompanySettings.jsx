import React, { useState, useEffect } from 'react';
import { Building2, Mail, Phone, Globe, MapPin, Hash, ShieldCheck, Save, Loader2 } from 'lucide-react';
import Card from '../../../shared/ui/Card';
import { getCompany, updateCompany } from '../../../services/api';
import { useAuth } from '../../auth/context/AuthContext';

const InputField = ({ label, icon: Icon, type = "text", value, onChange, placeholder, disabled = false }) => (
  <div className="space-y-1.5">
    <label className="text-[0.625rem] font-bold uppercase tracking-widest text-body ml-1">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-disabled" size={18} />}
      <input
        type={type}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full bg-[#ffffff] ring-1 ring-disabled/30 focus:ring-0 border-b-2 border-transparent focus:border-primary ${Icon ? 'pl-11' : 'px-4'} pr-4 py-3 rounded-lg outline-none text-sm font-medium transition-all shadow-sm disabled:bg-page disabled:text-disabled`}
      />
    </div>
  </div>
);

const SelectField = ({ label, icon: Icon, value, onChange, disabled = false, children }) => (
  <div className="space-y-1.5">
    <label className="text-[0.625rem] font-bold uppercase tracking-widest text-body ml-1">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-disabled" size={18} />}
      <select
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        className={`w-full bg-[#ffffff] ring-1 ring-disabled/30 focus:ring-0 border-b-2 border-transparent focus:border-primary ${Icon ? 'pl-11' : 'px-4'} pr-4 py-3 rounded-lg outline-none text-sm font-medium transition-all shadow-sm disabled:bg-page disabled:text-disabled`}
      >
        {children}
      </select>
    </div>
  </div>
);

const CURRENCY_OPTIONS = [
  { value: 'CAD', label: 'CAD (Canadian Dollar)' },
  { value: 'USD', label: 'USD (US Dollar)' },
];

const CompanySettings = ({ branchId = null, view = null }) => {
  const { user, isLoading: authLoading } = useAuth();
  const [company, setCompany] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const companyId = user?.company?.id ?? user?.company ?? null;

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        if (!companyId) return;
        const response = await getCompany(companyId);
        setCompany(response);
      } catch (err) {
        console.error('Failed to fetch company:', err);
      } finally {
        setIsLoading(false);
      }
    };
    if (!authLoading) fetchCompany();
  }, [authLoading, companyId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await updateCompany(company.id, company);
      setCompany(response);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;
  if (!company) return <div>No company found.</div>;

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
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h3 className="text-base font-bold text-heading dark:text-white font-heading">
            {view ? viewTitles[view] || 'Company Profile' : 'Company Profile'}
          </h3>
          <p className="text-xs text-slate-400">Manage organizational records and legal identity.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-brand-navy hover:bg-brand-dark text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-70 dark:bg-blue-600"
        >
          <Save size={16} /> {isSaving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {showProfile && (
          <Card title="General & Legal Information" className="space-y-6">
            <InputField label="Legal Company Name" icon={Building2} value={company.legal_name} onChange={(e) => setCompany({ ...company, legal_name: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Registration #" icon={Hash} value={company.registration_number} onChange={(e) => setCompany({ ...company, registration_number: e.target.value })} />
              <InputField label="Tax ID / EIN" icon={ShieldCheck} value={company.tax_number} onChange={(e) => setCompany({ ...company, tax_number: e.target.value })} />
            </div>
            <InputField label="State License #" icon={ShieldCheck} value={company.state_license_number} onChange={(e) => setCompany({ ...company, state_license_number: e.target.value })} />
          </Card>
        )}

        {showCurrency && (
          <Card title="Currency & Regional Settings" className="space-y-6">
            <SelectField label="Currency" icon={Globe} value={company.currency} onChange={(e) => setCompany({ ...company, currency: e.target.value })}>
              {CURRENCY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </SelectField>
            <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500 dark:bg-slate-800/60 dark:text-slate-300">
              Preview: {company.currency === 'CAD' ? 'CA$1,250.00' : '$1,250.00'} · Taxes, quotes, and invoice calculations inherit this currency format.
            </div>
          </Card>
        )}

        {showContact && (
          <Card title="Contact Channels" className="space-y-6">
            <InputField label="Public Email" icon={Mail} value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} />
            <InputField label="Phone Number" icon={Phone} value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} />
            <InputField label="Website" icon={Globe} value={company.website} onChange={(e) => setCompany({ ...company, website: e.target.value })} />
          </Card>
        )}

        {showAddress && (
          <Card title="Headquarters Address" className={view === 'address' ? 'md:col-span-2 space-y-6' : 'md:col-span-2 space-y-6'}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField label="Address Line 1" icon={MapPin} value={company.address_line1} onChange={(e) => setCompany({ ...company, address_line1: e.target.value })} />
              <InputField label="Address Line 2" icon={MapPin} value={company.address_line2} onChange={(e) => setCompany({ ...company, address_line2: e.target.value })} />
              <div className="grid grid-cols-3 gap-4 md:col-span-2">
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
