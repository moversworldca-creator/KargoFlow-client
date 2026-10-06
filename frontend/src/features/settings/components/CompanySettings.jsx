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

const CompanySettings = () => {
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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-heading font-heading">Company Profile</h3>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-bold shadow-md hover:bg-primary-dark transition-all disabled:opacity-70"
        >
          <Save size={18} /> {isSaving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card title="General Information" className="space-y-6">
          <InputField label="Legal Company Name" icon={Building2} value={company.legal_name} onChange={(e) => setCompany({ ...company, legal_name: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Registration #" icon={Hash} value={company.registration_number} onChange={(e) => setCompany({ ...company, registration_number: e.target.value })} />
            <InputField label="Tax ID / EIN" icon={ShieldCheck} value={company.tax_number} onChange={(e) => setCompany({ ...company, tax_number: e.target.value })} />
          </div>
          <InputField label="State License #" icon={ShieldCheck} value={company.state_license_number} onChange={(e) => setCompany({ ...company, state_license_number: e.target.value })} />
          <SelectField label="Currency" icon={Globe} value={company.currency} onChange={(e) => setCompany({ ...company, currency: e.target.value })}>
            {CURRENCY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </SelectField>
        </Card>

        <Card title="Contact Details" className="space-y-6">
          <InputField label="Public Email" icon={Mail} value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} />
          <InputField label="Phone Number" icon={Phone} value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} />
          <InputField label="Website" icon={Globe} value={company.website} onChange={(e) => setCompany({ ...company, website: e.target.value })} />
        </Card>

        <Card title="Primary Address" className="md:col-span-2 space-y-6">
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
      </div>
    </div>
  );
};

export default CompanySettings;
