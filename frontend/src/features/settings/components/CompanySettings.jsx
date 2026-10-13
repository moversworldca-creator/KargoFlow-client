import React, { useState, useEffect } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import Card from '../../../shared/ui/Card';
import { getTenantCompany } from '../../../services/api';

const InputField = ({ label, icon: Icon, value }) => (
  <div className="space-y-1.5">
    <label className="text-[0.625rem] font-bold uppercase tracking-widest text-body ml-1">{label}</label>
    <div className="relative">
      {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-disabled" size={18} />}
      <input
        value={value || ''}
        readOnly
        className={`w-full bg-[#ffffff] ring-1 ring-disabled/30 ${Icon ? 'pl-11' : 'px-4'} pr-4 py-3 rounded-lg outline-none text-sm font-medium shadow-sm text-heading`}
      />
    </div>
  </div>
);

const CompanySettings = () => {
  const [company, setCompany] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await getTenantCompany();
        setCompany(Array.isArray(response) ? response[0] || null : response);
      } catch (err) {
        console.error('Failed to fetch company:', err);
        setError(err?.response?.data?.detail || err?.response?.data?.error || 'Company details could not be loaded.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompany();
  }, []);

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;
  if (!company) return <div role="alert" className="text-sm text-rose-700">{error || 'No company found.'}</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-heading font-heading">Company Profile</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card title="General Information" className="space-y-6">
          <InputField label="Company Name" icon={Building2} value={company.name} disabled />
          <InputField label="Legal Company Name" value={company.legal_name} />
          <InputField label="Registration #" value={company.registration_number} />
          <InputField label="Tax ID / EIN" value={company.tax_number} />
          <InputField label="State License #" value={company.state_license_number} />
          <InputField label="Currency" value={company.currency} />
        </Card>
        <Card title="Contact Details" className="space-y-6">
          <InputField label="Public Email" value={company.email} />
          <InputField label="Phone Number" value={company.phone} />
          <InputField label="Website" value={company.website} />
        </Card>
        <Card title="Primary Address" className="md:col-span-2 space-y-6">
          <InputField label="Address Line 1" icon={Building2} value={company.address_line1} />
          <InputField label="Address Line 2" value={company.address_line2} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField label="City" value={company.city} />
            <InputField label="State" value={company.state} />
            <InputField label="Zip Code" value={company.zip_code} />
          </div>
          <InputField label="Country" value={company.country} />
        </Card>
      </div>
    </div>
  );
};

export default CompanySettings;
