import React, { useState, useEffect } from 'react';
import { 
  Building2, Mail, Phone, Globe, MapPin, Hash, ShieldCheck, 
  Save, Loader2, ShieldAlert, Sparkles, CheckCircle2, 
  PlusCircle, RefreshCw, Layers, Users, Map, CreditCard, 
  Check, ArrowRight, Search, Server, AlertCircle, Key, Lock, Eye, EyeOff, Copy, LogIn, LayoutGrid, Trash2, Sliders, ChevronRight, Zap
} from 'lucide-react';
import { onboardCompany, createCompany, getCompanies, updateCompany, deleteCompany } from '../../../services/api';
import { useAuth } from '../../auth/context/AuthContext';
import { useToast } from '../../../shared/context/ToastContext';
import { useNavigate } from 'react-router-dom';

const InputField = ({ label, icon: Icon, type = "text", value, onChange, placeholder, required = false, disabled = false, helpText, rightElement }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center ml-0.5">
      <label className="text-[0.6875rem] font-bold tracking-wider text-slate-700 dark:text-slate-300 uppercase">
        {label} {required && <span className="text-rose-500 font-bold">*</span>}
      </label>
      {helpText && <span className="text-[0.65rem] text-slate-400 font-medium">{helpText}</span>}
    </div>
    <div className="relative group">
      {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors" size={16} />}
      <input
        type={type}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-400 ${Icon ? 'pl-10' : 'px-3.5'} ${rightElement ? 'pr-12' : 'pr-3.5'} py-2.5 rounded-xl outline-none text-xs sm:text-sm font-medium transition-all shadow-2xs disabled:bg-slate-100 dark:disabled:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400`}
      />
      {rightElement && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
          {rightElement}
        </div>
      )}
    </div>
  </div>
);

const SelectField = ({ label, icon: Icon, value, onChange, disabled = false, children, helpText }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center ml-0.5">
      <label className="text-[0.6875rem] font-bold tracking-wider text-slate-700 dark:text-slate-300 uppercase">
        {label}
      </label>
      {helpText && <span className="text-[0.65rem] text-slate-400 font-medium">{helpText}</span>}
    </div>
    <div className="relative group">
      {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors" size={16} />}
      <select
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        className={`w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 focus:border-blue-600 dark:focus:border-blue-400 ${Icon ? 'pl-10' : 'px-3.5'} pr-8 py-2.5 rounded-xl outline-none text-xs sm:text-sm font-medium transition-all shadow-2xs disabled:bg-slate-100 dark:disabled:bg-slate-800 text-slate-900 dark:text-slate-100`}
      >
        {children}
      </select>
    </div>
  </div>
);

const ToggleField = ({ label, description, enabled, onToggle }) => (
  <div 
    onClick={onToggle}
    className="flex items-center justify-between p-3.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/50 transition-all cursor-pointer group"
  >
    <div className="space-y-0.5 pr-4">
      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{label}</p>
      <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400 leading-snug">{description}</p>
    </div>
    <div className={`relative inline-flex h-5 w-10 shrink-0 items-center rounded-full transition-colors duration-300 ${enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-300 ${enabled ? 'translate-x-5' : 'translate-x-1'}`} />
    </div>
  </div>
);

const ColorCard = ({ icon: Icon, badge, title, subtitle, bgGradient, borderStyle, iconBg, children }) => (
  <div className={`rounded-3xl p-6 sm:p-7 border ${borderStyle} ${bgGradient} shadow-md hover:shadow-lg transition-all space-y-5 relative overflow-hidden group`}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-2xl ${iconBg} flex items-center justify-center font-bold shadow-xs`}>
          <Icon size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">{title}</h3>
            {badge && (
              <span className="px-2.5 py-0.5 rounded-full text-[0.625rem] font-black uppercase tracking-wider bg-white/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>

    {children}
  </div>
);

const CURRENCY_OPTIONS = [
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
];

const PLAN_OPTIONS = [
  { value: 'essential', label: 'Essential Plan' },
  { value: 'professional', label: 'Professional Plan' },
  { value: 'enterprise', label: 'Enterprise Plan' },
  { value: 'custom', label: 'Custom Corporate Plan' },
];

const INITIAL_FORM = {
  name: '',
  legal_name: '',
  owner_email: '',
  owner_password: '',
  registration_number: '',
  tax_number: '',
  state_license_number: '',
  email: '',
  phone: '',
  website: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  zip_code: '',
  country: 'US',
  timezone: 'America/Chicago',
  currency: 'USD',
  logo_url: '',
  subdomain: '',
  subscription_plan: 'essential',
  subscription_status: 'active',
  max_users: 10,
  max_branches: 1,
  multi_location_enabled: false,
  is_active: true,
};

const SuperuserCreateCompanyPage = () => {
  const { user, login, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('all'); // 'all', 'create', 'list'
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState(null);

  const [createdCompanyDetails, setCreatedCompanyDetails] = useState(null);

  const [companies, setCompanies] = useState([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Delete modal state
  const [companyToDelete, setCompanyToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isSuperuser = Boolean(user?.is_superuser || user?.is_system_admin);

  const fetchCompaniesList = async () => {
    if (!isSuperuser) return;
    setIsLoadingCompanies(true);
    try {
      const res = await getCompanies();
      const rawData = res?.data !== undefined ? res.data : res;
      const list = Array.isArray(rawData)
        ? rawData
        : Array.isArray(rawData?.results)
        ? rawData.results
        : Array.isArray(res?.results)
        ? res.results
        : [];
      setCompanies(list);
    } catch (err) {
      console.error('Failed to fetch companies list:', err);
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  useEffect(() => {
    if (isSuperuser && !authLoading) {
      fetchCompaniesList();
    }
  }, [isSuperuser, authLoading]);

  const handleInputChange = (field, val) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: val };
      if (field === 'name' && !editingCompanyId && !prev.subdomain) {
        updated.subdomain = val
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
      }
      if (field === 'email' && !editingCompanyId && !prev.owner_email) {
        updated.owner_email = val;
      }
      return updated;
    });
  };

  const handleResetForm = () => {
    setFormData(INITIAL_FORM);
    setEditingCompanyId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      showToast?.('Please fill in required fields: Company Name, Email, and Phone.', 'warning');
      return;
    }

    if (!editingCompanyId && (!formData.owner_email || !formData.owner_password)) {
      showToast?.('Please provide Owner Login Email and Password to create the company account.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      if (editingCompanyId) {
        const updated = await updateCompany(editingCompanyId, formData);
        showToast?.(`Company "${formData.name}" updated successfully!`, 'success');
        setCreatedCompanyDetails({
          company: updated,
          owner_email: formData.email,
          owner_password: '[Unchanged]',
          isEdit: true
        });
      } else {
        const payload = {
          name: formData.name,
          owner_email: formData.owner_email,
          owner_password: formData.owner_password,
          legal_name: formData.legal_name,
          registration_number: formData.registration_number,
          tax_number: formData.tax_number,
          state_license_number: formData.state_license_number,
          email: formData.email,
          phone: formData.phone,
          website: formData.website,
          address_line1: formData.address_line1,
          address_line2: formData.address_line2,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zip_code,
          country: formData.country,
          timezone: formData.timezone,
          currency: formData.currency,
          logo_url: formData.logo_url,
          subscription_plan: formData.subscription_plan,
          subscription_status: formData.subscription_status,
          max_users: formData.max_users,
          max_branches: formData.max_branches,
          multi_location_enabled: formData.multi_location_enabled,
          is_active: formData.is_active,
        };

        if (formData.subdomain && formData.subdomain.trim()) {
          payload.subdomain = formData.subdomain.trim().toLowerCase();
        }

        const res = await onboardCompany(payload);
        const newCompany = res.company || res;
        showToast?.(`New Company Profile "${formData.name}" created successfully!`, 'success');
        
        setCreatedCompanyDetails({
          company: newCompany,
          owner_email: formData.owner_email,
          owner_password: formData.owner_password,
          isEdit: false
        });

        // Prepend to companies list instantly
        setCompanies((prev) => [newCompany, ...prev.filter(c => c.id !== newCompany.id)]);
      }
      fetchCompaniesList();
      handleResetForm();
    } catch (err) {
      console.error('Failed to save company profile:', err);
      let msg = 'Failed to save company profile.';
      const resData = err.response?.data;
      if (resData) {
        const errorVal = resData.error || resData.detail || resData;
        if (typeof errorVal === 'string') {
          msg = errorVal;
        } else if (typeof errorVal === 'object' && errorVal !== null) {
          const entries = Object.entries(errorVal);
          if (entries.length > 0) {
            const [k, v] = entries[0];
            const text = Array.isArray(v) ? v[0] : typeof v === 'string' ? v : JSON.stringify(v);
            msg = `${k}: ${text}`;
          }
        }
      }
      showToast?.(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!companyToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCompany(companyToDelete.id);
      showToast?.(`Company profile "${companyToDelete.name}" deleted successfully.`, 'success');
      setCompanies((prev) => prev.filter((c) => c.id !== companyToDelete.id));
      if (editingCompanyId === companyToDelete.id) {
        handleResetForm();
      }
      setCompanyToDelete(null);
    } catch (err) {
      console.error('Failed to delete company profile:', err);
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Failed to delete company profile.';
      showToast?.(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLoginAsOwner = async () => {
    if (!createdCompanyDetails?.owner_email || !createdCompanyDetails?.owner_password || createdCompanyDetails.owner_password === '[Unchanged]') {
      showToast?.('Login credentials not available for auto-login.', 'warning');
      return;
    }

    setIsLoggingIn(true);
    try {
      await login(createdCompanyDetails.owner_email, createdCompanyDetails.owner_password);
      showToast?.(`Logged in successfully to ${createdCompanyDetails.company?.name || 'Company'}!`, 'success');
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed:', err);
      showToast?.('Failed to log in automatically with newly created credentials.', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCompanyDetails) return;
    const text = `Company: ${createdCompanyDetails.company?.name}\nEmail: ${createdCompanyDetails.owner_email}\nPassword: ${createdCompanyDetails.owner_password}`;
    navigator.clipboard.writeText(text);
    showToast?.('Company login credentials copied to clipboard!', 'info');
  };

  const handleSelectForEdit = (company) => {
    setEditingCompanyId(company.id);
    setFormData({
      name: company.name || '',
      legal_name: company.legal_name || '',
      owner_email: company.email || '',
      owner_password: '',
      registration_number: company.registration_number || '',
      tax_number: company.tax_number || '',
      state_license_number: company.state_license_number || '',
      email: company.email || '',
      phone: company.phone || '',
      website: company.website || '',
      address_line1: company.address_line1 || '',
      address_line2: company.address_line2 || '',
      city: company.city || '',
      state: company.state || '',
      zip_code: company.zip_code || '',
      country: company.country || 'US',
      timezone: company.timezone || 'America/Chicago',
      currency: company.currency || 'USD',
      logo_url: company.logo_url || '',
      subdomain: company.subdomain || '',
      subscription_plan: company.subscription_plan || 'essential',
      subscription_status: company.subscription_status || 'active',
      max_users: company.max_users || 10,
      max_branches: company.max_branches || 1,
      multi_location_enabled: Boolean(company.multi_location_enabled),
      is_active: company.is_active !== undefined ? company.is_active : true,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredCompanies = companies.filter((c) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(query)) ||
      (c.legal_name && c.legal_name.toLowerCase().includes(query)) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      (c.subdomain && c.subdomain.toLowerCase().includes(query))
    );
  });

  const activeCount = companies.filter(c => c.is_active !== false).length;
  const multiLocationCount = companies.filter(c => c.multi_location_enabled).length;

  if (authLoading) {
    return (
      <div className="h-[75vh] w-full flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-blue-600" size={28} />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verifying Superuser Permissions...</p>
      </div>
    );
  }

  if (!isSuperuser) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900 shadow-xl text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert size={28} />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Superuser Access Required</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            The route <code className="bg-slate-100 dark:bg-slate-800 text-rose-600 px-2 py-0.5 rounded font-mono text-[0.75rem]">/superuser/settings/company</code> is restricted to superusers.
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const renderCompanyDirectorySection = () => (
    <div className="space-y-5 pt-6">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/20">
            <Building2 size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Tenant Directory ({companies.length})
            </h3>
            <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400">
              Active CRM moving tenant organizations (Newest registered listed first)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search companies by name, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs outline-none focus:border-blue-600 text-slate-900 dark:text-slate-100 font-medium shadow-2xs"
            />
          </div>

          <button
            onClick={fetchCompaniesList}
            disabled={isLoadingCompanies}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs"
          >
            <RefreshCw size={14} className={isLoadingCompanies ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {isLoadingCompanies ? (
        <div className="p-16 text-center space-y-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="animate-spin text-blue-600 mx-auto" size={28} />
          <p className="text-xs font-bold text-slate-500">Loading tenant company directory...</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="p-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <Building2 className="mx-auto text-slate-400" size={32} />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No company profiles match search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCompanies.map((c, idx) => {
            const isMain = Number(c.id) === 1 || Number(c.id) === Number(user?.company) || c.is_main;
            const isNewlyCreated = createdCompanyDetails?.company?.id === c.id;

            return (
              <div
                key={c.id}
                className={`rounded-3xl p-5 space-y-4 border transition-all ${
                  isNewlyCreated
                    ? 'bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-800 shadow-md ring-2 ring-blue-400/40'
                    : isMain
                    ? 'bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-800 shadow-md'
                    : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:shadow-lg hover:border-blue-300'
                }`}
              >
                {/* Header info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl ${isMain ? 'bg-blue-600 text-white shadow-blue-600/30' : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'} flex items-center justify-center font-black text-sm shrink-0 shadow-md`}>
                      {c.name ? c.name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                        {c.name}
                      </h4>
                      <span className="inline-block text-[0.6875rem] font-mono text-blue-600 dark:text-blue-400 font-semibold truncate">
                        {c.subdomain ? `${c.subdomain}.kargoflow.ca` : `Tenant ID #${c.id}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {idx === 0 && !isMain && (
                      <span className="px-2.5 py-0.5 rounded-full text-[0.625rem] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Newest
                      </span>
                    )}
                    {isMain && (
                      <span className="px-2.5 py-0.5 rounded-full text-[0.625rem] font-black uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        Main Root
                      </span>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 bg-white/70 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-slate-400 shrink-0" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {(c.city || c.state) && (
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{[c.city, c.state, c.country].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                </div>

                {/* Footer buttons */}
                <div className="pt-2 flex items-center justify-between text-xs">
                  <span className={`px-2.5 py-0.5 rounded-full text-[0.625rem] font-extrabold uppercase ${
                    c.is_active !== false ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}>
                    {c.is_active !== false ? 'Active' : 'Disabled'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSelectForEdit(c)}
                      className="px-3 py-1 bg-white dark:bg-slate-800 hover:bg-blue-600 hover:text-white border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                    >
                      Edit <ChevronRight size={13} />
                    </button>
                    {!isMain && (
                      <button
                        type="button"
                        onClick={() => setCompanyToDelete(c)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors"
                        title="Delete Company Profile"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 animate-in fade-in duration-200">
      {/* Delete Modal */}
      {companyToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <Trash2 size={26} />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">Delete Company Profile?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Are you sure you want to delete <strong className="text-slate-900 dark:text-white font-bold">{companyToDelete.name}</strong>?
                This will deactivate company access.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <p className="flex justify-between"><span className="text-slate-400">ID:</span> <span className="font-mono text-slate-700 dark:text-slate-300">#{companyToDelete.id}</span></p>
              {companyToDelete.subdomain && <p className="flex justify-between"><span className="text-slate-400">Subdomain:</span> <span className="font-mono text-blue-600 dark:text-blue-400">{companyToDelete.subdomain}.kargoflow.ca</span></p>}
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setCompanyToDelete(null)}
                className="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60 shadow-md shadow-rose-600/20"
              >
                {isDeleting ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Container Card with Solid Dark Navy/Slate Background */}
      <div className="p-6 sm:p-9 bg-slate-900 text-white rounded-3xl shadow-xl space-y-6 border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-[0.6875rem] font-black uppercase tracking-wider">
              <Sparkles size={13} /> Superuser Admin Control Panel
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Company Profile Provisioning
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Superuser center to provision tenant company profiles, set platform quotas, and initialize owner login accounts.
            </p>
          </div>

          {/* Segmented Tab Controls */}
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/15 shrink-0 self-start lg:self-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400 active-tab'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <LayoutGrid size={14} /> All-in-One View
            </button>

            <button
              onClick={() => {
                handleResetForm();
                setActiveTab('create');
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'create' && !editingCompanyId && !createdCompanyDetails
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400 active-tab'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <PlusCircle size={14} /> Create Form
            </button>

            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'list'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400 active-tab'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Building2 size={14} /> Directory ({companies.length})
            </button>
          </div>
        </div>

        {/* Dynamic Metric Bar inside Header Container */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10 text-xs relative z-10">
          <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
            <span className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider block">Total Tenants</span>
            <span className="text-xl font-black text-white">{companies.length}</span>
          </div>
          <div className="bg-teal-900/30 p-3.5 rounded-2xl border border-teal-800/50 hover:bg-teal-900/40 transition-all">
            <span className="text-[0.65rem] font-bold text-teal-300 uppercase tracking-wider block">Active Licenses</span>
            <span className="text-xl font-black text-teal-400">{activeCount}</span>
          </div>
          <div className="bg-blue-900/30 p-3.5 rounded-2xl border border-blue-800/50 hover:bg-blue-900/40 transition-all">
            <span className="text-[0.65rem] font-bold text-blue-300 uppercase tracking-wider block">Subdomains</span>
            <span className="text-xl font-black text-blue-400">{companies.filter(c => c.subdomain).length}</span>
          </div>
          <div className="bg-purple-900/30 p-3.5 rounded-2xl border border-purple-800/50 hover:bg-purple-900/40 transition-all">
            <span className="text-[0.65rem] font-bold text-purple-300 uppercase tracking-wider block">Multi-Location</span>
            <span className="text-xl font-black text-purple-400">{multiLocationCount}</span>
          </div>
        </div>
      </div>

      {/* Success Notification Card */}
      {createdCompanyDetails && (
        <div className="p-6 bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <span className="text-[0.65rem] font-black uppercase tracking-widest text-emerald-400">
                  {createdCompanyDetails.isEdit ? 'Company Profile Updated' : 'New Company Provisioned Successfully'}
                </span>
                <h3 className="text-lg font-black text-white">
                  {createdCompanyDetails.company?.name || 'Company Profile'}
                </h3>
              </div>
            </div>
            <button
              onClick={() => setCreatedCompanyDetails(null)}
              className="text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 bg-white/10 rounded-xl"
            >
              Dismiss
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-white/5 p-4 rounded-2xl border border-white/10">
            <div className="space-y-1 text-slate-300 font-medium">
              <p><span className="text-slate-400">Tenant ID:</span> #{createdCompanyDetails.company?.id}</p>
              <p><span className="text-slate-400">Subdomain:</span> <code className="font-mono bg-slate-950 px-2 py-0.5 rounded text-blue-300">{createdCompanyDetails.company?.subdomain || 'default'}.kargoflow.ca</code></p>
              <p><span className="text-slate-400">Subscription Plan:</span> {createdCompanyDetails.company?.subscription_plan || 'Essential'}</p>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Owner Credentials:</span>
                <button onClick={handleCopyCredentials} className="text-blue-300 hover:text-white underline text-[0.6875rem] font-bold flex items-center gap-1">
                  <Copy size={12} /> Copy Credentials
                </button>
              </div>
              <p className="font-bold text-emerald-300 font-mono text-xs">{createdCompanyDetails.owner_email}</p>
              <p className="text-[0.6875rem] text-slate-300">Password: <span className="font-mono font-bold text-emerald-300">{showPassword ? createdCompanyDetails.owner_password : '••••••••••••'}</span></p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              onClick={handleResetForm}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold"
            >
              Create Another Company
            </button>
            {!createdCompanyDetails.isEdit && (
              <button
                onClick={handleLoginAsOwner}
                disabled={isLoggingIn}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
              >
                {isLoggingIn ? <Loader2 className="animate-spin" size={15} /> : <LogIn size={15} />}
                {isLoggingIn ? 'Logging in...' : `Login to ${createdCompanyDetails.company?.name || 'Company'}`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Provisioning Form with Color Cards */}
      {(activeTab === 'all' || activeTab === 'create') && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  {editingCompanyId ? `Editing: ${formData.name}` : 'Provision New Company Tenant'}
                </h3>
                <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400">
                  {editingCompanyId ? 'Update company details' : 'Configure company parameters and initial owner login credentials'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {editingCompanyId && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-extrabold shadow-md shadow-blue-600/20 transition-all disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
                {isSaving ? 'Saving Profile...' : editingCompanyId ? 'Save Changes' : 'Create & Provision Company'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 0: Security Credentials */}
            {!editingCompanyId && (
              <div className="md:col-span-2">
                <ColorCard
                  icon={Key}
                  badge="Security Account"
                  title="Company Admin Owner Credentials"
                  subtitle="Initial owner credentials created automatically to log into this new tenant account"
                  bgGradient="bg-white dark:bg-slate-900"
                  borderStyle="border-slate-200 dark:border-slate-800"
                  iconBg="bg-blue-600 text-white shadow-blue-500/20"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <InputField
                      label="Owner Email / Username"
                      icon={Mail}
                      type="email"
                      value={formData.owner_email}
                      onChange={(e) => handleInputChange('owner_email', e.target.value)}
                      placeholder="admin@newcompany.com"
                      required={!editingCompanyId}
                      helpText="Used to log into this company account"
                    />

                    <InputField
                      label="Owner Account Password"
                      icon={Lock}
                      type={showPassword ? 'text' : 'password'}
                      value={formData.owner_password}
                      onChange={(e) => handleInputChange('owner_password', e.target.value)}
                      placeholder="Create secure password"
                      required={!editingCompanyId}
                      helpText="Minimum 8 characters"
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-slate-400 hover:text-slate-600 p-1"
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      }
                    />
                  </div>
                </ColorCard>
              </div>
            )}

            {/* Card 1: Core Brand Identity */}
            <ColorCard
              icon={Building2}
              badge="Identity"
              title="Brand Identity & Company ID"
              subtitle="Public company display name, legal business entity, tax registrations, and unique company ID"
              bgGradient="bg-white dark:bg-slate-900"
              borderStyle="border-slate-200 dark:border-slate-800"
              iconBg="bg-blue-600 text-white shadow-blue-500/20"
            >
              <InputField
                label="Company Name"
                icon={Building2}
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g. Apex Moving & Storage"
                required
                helpText="Public display name"
              />

              <InputField
                label="Legal Business Name"
                icon={Building2}
                value={formData.legal_name}
                onChange={(e) => handleInputChange('legal_name', e.target.value)}
                placeholder="e.g. Apex Logistics Canada Inc."
              />

              <InputField
                label="Company ID"
                icon={Hash}
                value={formData.subdomain}
                onChange={(e) => handleInputChange('subdomain', e.target.value)}
                placeholder="e.g. CMP-1001"
                helpText="Unique identifier for tenant company"
              />

              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Registration #"
                  icon={Hash}
                  value={formData.registration_number}
                  onChange={(e) => handleInputChange('registration_number', e.target.value)}
                  placeholder="e.g. BC1234567"
                />
                <InputField
                  label="Tax ID / EIN"
                  icon={ShieldCheck}
                  value={formData.tax_number}
                  onChange={(e) => handleInputChange('tax_number', e.target.value)}
                  placeholder="e.g. 12-3456789"
                />
              </div>

              <InputField
                label="State / DOT / MC License #"
                icon={ShieldCheck}
                value={formData.state_license_number}
                onChange={(e) => handleInputChange('state_license_number', e.target.value)}
                placeholder="e.g. USDOT 3829104 / MC-994821"
              />

              <InputField
                label="Logo Image URL"
                icon={Globe}
                value={formData.logo_url}
                onChange={(e) => handleInputChange('logo_url', e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </ColorCard>

            {/* Card 2: Contact & Regional Preferences */}
            <ColorCard
              icon={Globe}
              badge="Regional"
              title="Contact & Regional Settings"
              subtitle="Dispatch channels, primary operational currency, and local timezone"
              bgGradient="bg-white dark:bg-slate-900"
              borderStyle="border-slate-200 dark:border-slate-800"
              iconBg="bg-blue-600 text-white shadow-blue-500/20"
            >
              <InputField
                label="Primary Business Email"
                icon={Mail}
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="sales@apexmoving.com"
                required
              />

              <InputField
                label="Dispatch Phone Number"
                icon={Phone}
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+1 (800) 555-0199"
                required
              />

              <InputField
                label="Official Website URL"
                icon={Globe}
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://www.apexmoving.com"
              />

              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label="Currency"
                  icon={Globe}
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                >
                  {CURRENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </SelectField>

                <InputField
                  label="Timezone"
                  icon={MapPin}
                  value={formData.timezone}
                  onChange={(e) => handleInputChange('timezone', e.target.value)}
                  placeholder="America/Chicago"
                />
              </div>
            </ColorCard>

            {/* Card 3: Headquarters Address */}
            <ColorCard
              icon={MapPin}
              badge="HQ Location"
              title="Headquarters Location"
              subtitle="Physical address of main operating headquarters"
              bgGradient="bg-white dark:bg-slate-900"
              borderStyle="border-slate-200 dark:border-slate-800"
              iconBg="bg-blue-600 text-white shadow-blue-500/20"
            >
              <InputField
                label="Address Line 1"
                icon={MapPin}
                value={formData.address_line1}
                onChange={(e) => handleInputChange('address_line1', e.target.value)}
                placeholder="100 Logistics Way, Suite 400"
              />

              <InputField
                label="Address Line 2"
                icon={MapPin}
                value={formData.address_line2}
                onChange={(e) => handleInputChange('address_line2', e.target.value)}
                placeholder="Building B"
              />

              <div className="grid grid-cols-3 gap-3">
                <InputField
                  label="City"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="Toronto / Austin"
                />
                <InputField
                  label="State / Prov"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder="ON / TX"
                />
                <InputField
                  label="Zip / Postal"
                  value={formData.zip_code}
                  onChange={(e) => handleInputChange('zip_code', e.target.value)}
                  placeholder="M5V 2T6"
                />
              </div>
            </ColorCard>

            {/* Card 4: Superuser Quotas */}
            <ColorCard
              icon={Sliders}
              badge="Superuser Quotas"
              title="Subscription Tier & System Quotas"
              subtitle="Superuser controls for subscription plan, limits, and status"
              bgGradient="bg-white dark:bg-slate-900"
              borderStyle="border-slate-200 dark:border-slate-800"
              iconBg="bg-blue-600 text-white shadow-blue-500/20"
            >
              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label="Subscription Plan"
                  icon={Layers}
                  value={formData.subscription_plan}
                  onChange={(e) => handleInputChange('subscription_plan', e.target.value)}
                >
                  {PLAN_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  label="Account Status"
                  icon={ShieldCheck}
                  value={formData.subscription_status}
                  onChange={(e) => handleInputChange('subscription_status', e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="trialing">Trialing</option>
                  <option value="past_due">Past Due</option>
                  <option value="canceled">Canceled</option>
                </SelectField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Max User Limit"
                  icon={Users}
                  type="number"
                  value={formData.max_users}
                  onChange={(e) => handleInputChange('max_users', parseInt(e.target.value, 10) || 1)}
                  placeholder="10"
                />

                <InputField
                  label="Max Branch Limit"
                  icon={Map}
                  type="number"
                  value={formData.max_branches}
                  onChange={(e) => handleInputChange('max_branches', parseInt(e.target.value, 10) || 1)}
                  placeholder="1"
                />
              </div>

              <div className="space-y-3 pt-1">
                <ToggleField
                  label="Multi-Location Branching"
                  description="Allows company to create and manage multiple operational branches"
                  enabled={formData.multi_location_enabled}
                  onToggle={() => handleInputChange('multi_location_enabled', !formData.multi_location_enabled)}
                />

                <ToggleField
                  label="Active Company Status"
                  description="Enable or disable entire company tenant access across the CRM"
                  enabled={formData.is_active}
                  onToggle={() => handleInputChange('is_active', !formData.is_active)}
                />
              </div>
            </ColorCard>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleResetForm}
              className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
            >
              Reset Form
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl text-xs font-extrabold shadow-md shadow-blue-600/20 transition-all disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
              {isSaving ? 'Saving Profile...' : editingCompanyId ? 'Save Changes' : 'Create & Provision Company'}
            </button>
          </div>
        </form>
      )}

      {/* Directory Section */}
      {(activeTab === 'all' || activeTab === 'list') && renderCompanyDirectorySection()}
    </div>
  );
};

export default SuperuserCreateCompanyPage;
