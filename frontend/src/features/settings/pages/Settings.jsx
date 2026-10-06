import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Users, Key, Building2, 
  MapPin, Megaphone, History, ChevronRight,
  Cpu, Tag, ArrowLeft, Search, Sliders, ArrowUpRight,
  Settings as SettingsIcon, LayoutGrid, Activity, ChevronDown,
  MessageSquare, Truck, Globe, ClipboardList, Package, FileText, AlertCircle,
  Pin, PinOff, Calendar, X
} from 'lucide-react';
import Card from '../../../shared/ui/Card';
import API from '../../../services/api';
import { updateUser } from '../../../services/api';
import { useAuth } from '../../auth/context/AuthContext';
import useCan from '../../../shared/auth/useCan';
import { filterAccessibleBranches, getUserBranchIds } from '../../../shared/utils/branchScope';
import { SETTINGS_TAB_PERMISSIONS } from '../../../shared/permissions/registry';

const LeadSourceSettings = lazy(() => import('../components/LeadSourceSettings'));
const TeamManagement = lazy(() => import('../components/TeamManagement'));
const CrewDirectory = lazy(() => import('../components/CrewDirectory'));
const TruckDirectory = lazy(() => import('../components/TruckDirectory'));
const RolesPermissions = lazy(() => import('../components/RolesPermissions'));
const CompanySettings = lazy(() => import('../components/CompanySettings'));
const BranchSettings = lazy(() => import('../components/BranchSettings'));
const SchedulingSettings = lazy(() => import('../components/SchedulingSettings'));
const ReferralSourceSettings = lazy(() => import('../components/ReferralSourceSettings'));
const AuditLogs = lazy(() => import('../components/AuditLogs'));
const IntegrationSettings = lazy(() => import('../components/IntegrationSettings'));
const StatusCodeSettings = lazy(() => import('../components/StatusCodeSettings'));
const OpportunityLossReasonSettings = lazy(() => import('../components/OpportunityLossReasonSettings'));
const CommunicationTemplates = lazy(() => import('../components/CommunicationTemplates'));
const DocumentTemplates = lazy(() => import('../components/DocumentTemplates'));
const BrandingSettings = lazy(() => import('../components/BrandingSettings'));
const CatalogPackageBuilder = lazy(() => import('../components/CatalogPackageBuilder'));
const EstimateCatalogManager = lazy(() => import('../components/EstimateCatalogManager'));
const CustomerPortalSettings = lazy(() => import('../components/CustomerPortalSettings'));
const EstimateDiscountPresetSettings = lazy(() => import('../components/EstimateDiscountPresetSettings'));
const EstimatePortalTemplates = lazy(() => import('../components/EstimatePortalTemplates'));
const MoverTypeSettings = lazy(() => import('../components/MoverTypeSettings'));
const ServiceTypeSettings = lazy(() => import('../components/ServiceTypeSettings'));
const MoverSizeSettings = lazy(() => import('../components/MoverSizeSettings'));
const InventoryWorkflowSettings = lazy(() => import('../components/InventoryWorkflowSettings'));

const SettingsLoading = ({ children = 'Loading settings...' }) => (
  <div role="status" className="flex h-64 items-center justify-center gap-2 text-slate-500">
    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
    {children}
  </div>
);

const ToggleField = ({ label, description, enabled, onToggle }) => (
  <div className="flex items-center justify-between p-5 rounded-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-indigo-300/50 dark:hover:border-indigo-500/50 hover:-translate-y-1 transition-all duration-300 group cursor-pointer" onClick={onToggle}>
    <div className="space-y-1.5 pr-4">
      <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all">{label}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm font-medium">{description}</p>
    </div>
    <div 
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-500 focus:outline-none ${enabled ? 'bg-indigo-600 shadow-sm' : 'bg-slate-200 dark:bg-slate-700'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-500 ease-spring ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </div>
  </div>
);

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { tabId, subView, itemId } = useParams();

  const { canAll } = useCan();
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [isBranchReady, setIsBranchReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarPinned, setIsSidebarPinned] = useState(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  
  const [openSections, setOpenSections] = useState({
    Workspace: true,
    Mover: true,
    Estimates: true,
    Documents: true,
    System: true,
  });

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await API.general.getBranches();
        const list = Array.isArray(res?.results) ? res.results : Array.isArray(res) ? res : [];
        const scopedBranches = filterAccessibleBranches(user, list);
        setBranches(scopedBranches.length ? scopedBranches : list);
        const userBranchIds = getUserBranchIds(user);
        const defaultBranch = (scopedBranches.length ? scopedBranches : list).find((branch) => userBranchIds.includes(String(branch.id)))
          || list.find(b => b.id === user?.branch_id)
          || (scopedBranches.length ? scopedBranches[0] : list[0]);
        if (defaultBranch) {
          setSelectedBranchId(String(defaultBranch.id));
        }
      } catch (err) {
        console.error('Failed to load branches in Settings:', err);
      } finally {
        setIsBranchReady(true);
      }
    };
    fetchBranches();
  }, [user]);

  const branchIsolatedTabs = ['team', 'crew', 'trucks', 'roles', 'catalog-packages', 'estimate-catalog', 'estimate-portal-templates', 'branding', 'templates', 'document-templates', 'integrations', 'status-codes', 'scheduling', 'mover-types', 'service-types'];

  const toggleSection = (sectionName) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

  const tabs = useMemo(() => [
    { id: 'company', label: 'Company Profile', icon: Building2, section: 'Workspace', description: 'Manage your company details, tax registration, and primary contact information.' },
    { id: 'branches', label: 'Branch Offices', icon: MapPin, section: 'Workspace', description: 'Configure physical branch office locations, contact information, and branch-specific managers.' },
    { id: 'scheduling', label: 'Arrival Windows', icon: Calendar, section: 'Workspace', description: 'Configure arrival window slots for dispatch and scheduling.' },
    { id: 'branding', label: 'Branding', icon: Globe, section: 'Workspace', description: 'Customize your system logos, color themes, and public-facing visual branding settings.' },
    { id: 'team', label: 'Team Members', icon: Users, section: 'Workspace', description: 'Invite office staff, dispatchers, sales representatives, and manage active system users.' },
    { id: 'crew', label: 'Crew Directory', icon: Users, section: 'Workspace', description: 'Manage field staff records, crew profiles, driver licenses, and specialized skills.' },
    { id: 'trucks', label: 'Trucks', icon: Truck, section: 'Workspace', description: 'Keep track of moving vehicles, license plates, dimensions, and operational status.' },
    { id: 'roles', label: 'Roles & Perms', icon: Key, section: 'Workspace', description: 'Define permission levels, access controls, and assign security roles to your team.' },
    { id: 'leads', label: 'Inbound Leads', icon: Megaphone, section: 'Workspace', description: 'Configure inbound lead routing and API credentials.' },
    { id: 'referrals', label: 'Referral Sources', icon: Megaphone, section: 'Workspace', description: 'Manage referral partners and attribution sources separately from inbound lead intake.' },
    { id: 'status-codes', label: 'Internal Statuses', icon: Tag, section: 'Workspace', description: 'Manage the internal communication statuses that sit alongside your workflow stages.' },
    { id: 'opportunity-loss-reasons', label: 'Opportunity Loss Reasons', icon: AlertCircle, section: 'Workspace', description: 'Configure the dropdown reasons reps can select when marking an opportunity as lost.' },
    { id: 'mover-types', label: 'Mover Types', icon: Truck, section: 'Mover', description: 'Configure pricing rules and labor dynamics for residential, commercial, or interstate moves.' },
    { id: 'service-types', label: 'Service Types', icon: Building2, section: 'Mover', description: 'Manage service type configurations (e.g., Moving, Packing, Storage) and active statuses.' },
    { id: 'mover-sizes', label: 'Mover Sizes', icon: LayoutGrid, section: 'Mover', description: 'Manage home size classifications (e.g. 1 Bedroom, 4 Bedroom House) and volume multipliers.' },
    { id: 'estimate-catalog', label: 'Catalog Items', icon: ClipboardList, section: 'Estimates', description: 'Build your inventory list of furniture, volumetric factors, and assembly weights.' },
    { id: 'catalog-packages', label: 'Catalog Packages', icon: Package, section: 'Estimates', description: 'Define pre-built packages of items and services to quickly apply to estimates.' },
    { id: 'inventory', label: 'Inventory (CRUD)', icon: Package, section: 'Estimates', description: 'Configure inventory tracking, calculation models, and automatic volume rules.' },
    { id: 'estimate-discount-presets', label: 'Estimate Discounts', icon: Tag, section: 'Estimates', description: 'Manage preset fixed and percentage discounts that estimators can apply from the estimate totals card.' },
    { id: 'estimate-portal-templates', label: 'Estimate Portal Templates', icon: Globe, section: 'Estimates', description: 'Customize estimate portal layouts, custom HTML templates, agreement clauses, and payment setup.' },
    { id: 'customer-portals', label: 'Customer Portal Settings', icon: Globe, section: 'Estimates', description: 'Set up domain bindings, general behaviors, and security checks for your client portals.' },
    { id: 'templates', label: 'Comms Templates', icon: MessageSquare, section: 'Estimates', description: 'Manage transactional emails, text messages, automated follow-ups, and trigger alerts.' },
    { id: 'document-templates', label: 'Documents Templates', icon: FileText, section: 'Documents', description: 'Design PDF templates for moving contracts, invoices, bills of lading, and receipts.' },
    { id: 'integrations', label: 'Integrations', icon: Cpu, section: 'System', description: 'Connect external applications, email servers, stripe payment gates, and manage API integrations.' },
    { id: 'audit', label: 'Audit Logs', icon: History, section: 'System', description: 'Review security logs, user session activities, settings modifications, and records edits history.' },
  ], []);

  const allowedTabs = useMemo(
    () => tabs.filter((tab) => canAll(SETTINGS_TAB_PERMISSIONS[tab.id] || [])),
    [tabs, canAll],
  );
  const activeTab = tabId || 'overview';
  const goToTab = (nextTabId) => {
    setSearchQuery('');
    navigate(nextTabId === 'overview' ? '/settings' : `/settings/${nextTabId}`);
  };

  const normalizedSearch = useMemo(
    () => searchQuery.trim().toLocaleLowerCase().replace(/\s+/g, ' '),
    [searchQuery],
  );
  const filteredTabs = useMemo(() => {
    if (!normalizedSearch) return allowedTabs;
    const terms = normalizedSearch.split(' ');
    return allowedTabs.filter((tab) => {
      const searchableText = `${tab.label} ${tab.description} ${tab.section}`.toLocaleLowerCase();
      return terms.every((term) => searchableText.includes(term));
    });
  }, [allowedTabs, normalizedSearch]);
  const tabsBySection = useMemo(() => {
    return filteredTabs.reduce((grouped, tab) => {
      (grouped[tab.section] ||= []).push(tab);
      return grouped;
    }, {});
  }, [filteredTabs]);

  // Keep matched groups visible in the compact sidebar.
  useEffect(() => {
    if (!normalizedSearch) return;
    const matchedSections = Object.fromEntries(filteredTabs.map((tab) => [tab.section, true]));
    setOpenSections((previous) => ({ ...previous, ...matchedSections }));
  }, [filteredTabs, normalizedSearch]);

  const sectionsInfo = {
    Workspace: {
      title: 'Workspace & Organization',
      desc: 'Set up your company profiles, branch locations, branding identity, team permissions, and lead channels.',
      badgeColor: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20',
    },
    Mover: {
      title: 'Move Classifications',
      desc: 'Configure core moving variables, volume coefficients, and home size configurations.',
      badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
    },
    Estimates: {
      title: 'Estimates & Client Portals',
      desc: 'Customize pricing catalogs, pre-packaged services, estimate agreements, portal branding, and notifications.',
      badgeColor: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400 border-violet-200 dark:border-violet-500/20',
    },
    Documents: {
      title: 'Documents & Layouts',
      desc: 'Manage print-ready PDF formats, bills of lading, receipt configurations, and terms documentation.',
      badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
    },
    System: {
      title: 'System & Security',
      desc: 'Connect Stripe payments, email providers, third-party integrations, and track audit logs.',
      badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400 border-slate-200 dark:border-slate-500/20',
    },
  };

  useEffect(() => {
    if (activeTab !== 'overview' && allowedTabs.length && !allowedTabs.some((tab) => tab.id === activeTab)) {
      navigate('/settings', { replace: true });
    }
  }, [activeTab, allowedTabs, navigate]);

  const isOverview = activeTab === 'overview';
  const activeTabObj = allowedTabs.find((t) => t.id === activeTab);
  const isSidebarExpanded = isSidebarPinned || isSidebarHovered;
  const matchCount = filteredTabs.length;

  // Added logic for document title updating
  useEffect(() => {
    if (isOverview) {
      document.title = 'Settings - Kargoflow';
    } else if (activeTabObj) {
      // Strictly output "Setting - Company" if on the company tab, 
      // otherwise fallback to "Setting - [Tab Label]"
      document.title = activeTab === 'company' ? 'Setting - Company' : ` ${activeTabObj.label} - settings`;
    }
  }, [isOverview, activeTabObj, activeTab]);

  const renderContent = () => {
    const branchIdProp = selectedBranchId ? Number(selectedBranchId) : null;

    switch (activeTab) {
      case 'company': return <CompanySettings />;
      case 'branches': return <BranchSettings />;
      case 'scheduling': return <SchedulingSettings branchId={branchIdProp} />;
      case 'branding': return <BrandingSettings branchId={branchIdProp} />;
      case 'team': return <TeamManagement branchId={branchIdProp} />;
      case 'crew': return <CrewDirectory branchId={branchIdProp} />;
      case 'trucks': return <TruckDirectory branchId={branchIdProp} />;
      case 'roles': return <RolesPermissions branchId={branchIdProp} />;
      case 'mover-types': return <MoverTypeSettings branchId={branchIdProp} />;
      case 'service-types': return <ServiceTypeSettings branchId={branchIdProp} />;
      case 'mover-sizes': return <MoverSizeSettings />;
      case 'estimate-catalog': return <EstimateCatalogManager branchId={branchIdProp} />;
      case 'catalog-packages': return <CatalogPackageBuilder branchId={branchIdProp} />;
      case 'inventory': return <InventoryWorkflowSettings />;
      case 'estimate-discount-presets': return <EstimateDiscountPresetSettings />;
      case 'estimate-portal-templates': return (
        <EstimatePortalTemplates
          branchId={branchIdProp}
          builderRouteView={subView || itemId || ''}
          builderRouteItemId={subView ? itemId : null}
        />
      );
      case 'customer-portals': return <CustomerPortalSettings />;
      case 'leads': return <LeadSourceSettings />;
      case 'referrals': return <ReferralSourceSettings />;
      case 'status-codes': return <StatusCodeSettings />;
      case 'opportunity-loss-reasons': return <OpportunityLossReasonSettings />;
      case 'integrations': return <IntegrationSettings branchId={branchIdProp} />;
      case 'templates': return (
        <CommunicationTemplates
          branchId={branchIdProp}
          onBranchChange={(nextBranchId) => setSelectedBranchId(String(nextBranchId || ''))}
          builderRouteView={subView || itemId || ''}
          builderRouteItemId={subView ? itemId : null}
        />
      );
      case 'document-templates': return (
        <DocumentTemplates
          branchId={branchIdProp}
          builderRouteView={subView || itemId || ''}
          builderRouteItemId={subView ? itemId : null}
        />
      );
      case 'audit': return <AuditLogs />;
      default: return null;
    }
  };


  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700 px-4 md:px-8 py-6 min-h-screen bg-[#FAFAFA] dark:bg-slate-950">
      
      {/* Header */}
      {isOverview ? (
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm mb-6 px-4 py-4 md:px-6 md:py-5 isolate flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="max-w-xl space-y-1 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-full text-indigo-700 dark:text-indigo-400 text-[9px] font-black uppercase tracking-widest">
              <SettingsIcon size={12} className="animate-spin-slow text-indigo-600 dark:text-indigo-400" />
              System Configuration
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Settings Hub
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium max-w-lg leading-relaxed">
              Configure team members, directories, estimate templates, integrations, and core system parameters.
            </p>
          </div>
          
          <div className="relative w-full md:w-80 shrink-0 z-10">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="search"
              aria-label="Search settings"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSearchQuery('');
              }}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl pl-9 pr-9 py-2 text-sm font-medium text-slate-800 dark:text-slate-100 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 [&::-webkit-search-cancel-button]:hidden"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear settings search"
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <X size={14} />
              </button>
            )}
            {normalizedSearch && (
              <p className="absolute right-0 top-full mt-1.5 text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 text-right w-full" aria-live="polite">
                {matchCount} {matchCount === 1 ? 'setting' : 'settings'} found
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm w-fit">
          <button 
            onClick={() => {
              goToTab('overview');
            }} 
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5"
          >
            <Sliders size={14} /> Settings
          </button>
          <ChevronRight size={12} className="text-slate-300 dark:text-slate-600" />
          <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px] font-bold">{activeTabObj?.section}</span>
          <ChevronRight size={12} className="text-slate-300 dark:text-slate-600" />
          <span className="text-slate-900 dark:text-white font-black tracking-wide">{activeTabObj?.label}</span>
        </div>
      )}

      {isOverview ? (
        /* Full-Width Overview Dashboard */
        <div className="space-y-6">

          {matchCount === 0 ? (
            /* Empty State */
            <div className="py-20 text-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-lg border border-slate-200/50 dark:border-slate-800 rounded-[2.5rem] space-y-5 shadow-sm max-w-2xl mx-auto">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 dark:bg-slate-800 border border-white dark:border-slate-700 shadow-inner text-slate-400">
                <Search size={32} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">No settings found</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">We couldn't find any settings matching "{searchQuery}". Try a different keyword or browse categories below.</p>
              </div>
              <button 
                onClick={() => setSearchQuery('')}
                className="px-6 py-2.5 text-sm font-bold text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 rounded-xl shadow-sm transition-all"
              >
                Clear search
              </button>
            </div>
          ) : (
            /* Bento Grid of Categories */
            <div className="columns-1 md:columns-2 lg:columns-3 gap-2 lg:gap-3">
              {['Workspace', 'Mover', 'Documents', 'System', 'Estimates'].map(section => {
                const sectionTabs = tabsBySection[section] || [];
                if (sectionTabs.length === 0) return null;
                const info = sectionsInfo[section];

                return (
                  <div 
                    key={section} 
                    className="break-inside-avoid mb-2 lg:mb-3 group relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md rounded-[1.5rem] p-5 transition-all duration-500 flex flex-col justify-between overflow-hidden"
                  >
                    <div className="space-y-4 relative z-10">
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${info.badgeColor} shadow-sm`}>
                          {section}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all duration-300 w-fit">{info.title}</h3>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">{info.desc}</p>
                      </div>

                      <div className="border-t border-slate-200/60 dark:border-slate-700/60 pt-4 mt-3 space-y-1.5">
                        {sectionTabs.map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => {
                              goToTab(tab.id);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-100 dark:hover:border-indigo-500/30 text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-300 cursor-pointer group/item"
                          >
                            <span className="p-1.5 rounded-lg bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-700 group-hover/item:border-indigo-100 dark:group-hover/item:border-indigo-500/30 transition-colors">
                              <tab.icon size={14} className="text-slate-400 dark:text-slate-500 group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors shrink-0" />
                            </span>
                            <span className="truncate tracking-wide">{tab.label}</span>
                            <ArrowUpRight size={12} className="ml-auto opacity-0 group-hover/item:opacity-100 text-indigo-400 transition-all translate-x-2 group-hover/item:translate-x-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Workspace (Split View) with Collapsible Sidebar on Left, Content Canvas on Right */
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar */}
          <aside 
            onMouseEnter={() => !isSidebarPinned && setIsSidebarHovered(true)}
            onMouseLeave={() => !isSidebarPinned && setIsSidebarHovered(false)}
            className={`shrink-0 transition-all duration-300 ease-in-out ${
              isSidebarExpanded ? 'w-64' : 'w-[72px]'
            } space-y-5`}
          >
            <div className="space-y-4">
              {/* Sidebar Header & Pin Toggle */}
              <div className={`flex items-center ${isSidebarExpanded ? 'justify-between' : 'justify-center'} pb-2 border-b border-slate-100 dark:border-slate-800`}>
                {isSidebarExpanded && <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 animate-in fade-in duration-200">Navigation</span>}
                <button
                  type="button"
                  onClick={() => {
                    setIsSidebarPinned(p => !p);
                    if (!isSidebarPinned) {
                      setIsSidebarHovered(false);
                    }
                  }}
                  title={isSidebarPinned ? "Switch to Auto-hide on hover" : "Pin Sidebar"}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-all cursor-pointer"
                >
                  {isSidebarPinned ? <Pin size={13} className="text-indigo-500" /> : <PinOff size={13} />}
                </button>
              </div>

              {/* Sidebar Search */}
              <div className="relative flex items-center">
                <Search className={`absolute ${isSidebarExpanded ? 'left-3' : 'left-1/2 -translate-y-1/2 -translate-x-1/2'} top-1/2 -translate-y-1/2 text-slate-400`} size={13} />
                {isSidebarExpanded ? (
                  <>
                    <input
                      type="search"
                      aria-label="Filter settings navigation"
                      placeholder="Filter settings..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setSearchQuery('');
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 rounded-xl pl-8.5 pr-8 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 animate-in fade-in duration-200 [&::-webkit-search-cancel-button]:hidden"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        aria-label="Clear navigation search"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </>
                ) : (
                  <button 
                    type="button"
                    onClick={() => setIsSidebarHovered(true)}
                    className="w-full h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 cursor-pointer"
                  >
                    <Search size={13} />
                  </button>
                )}
              </div>

              {/* Sidebar Navigation */}
              <div className="space-y-3">
                {['Workspace', 'Mover', 'Estimates', 'Documents', 'System'].map(section => {
                  const sectionTabs = tabsBySection[section] || [];
                  if (sectionTabs.length === 0) return null;

                  return (
                    <div 
                      key={section} 
                      className={isSidebarExpanded ? "space-y-1 bg-slate-50/60 dark:bg-slate-800/60 border border-slate-200/40 dark:border-slate-700/40 rounded-2xl p-1.5 transition-all" : "space-y-1"}
                    >
                      {isSidebarExpanded ? (
                        <button
                          onClick={() => toggleSection(section)}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all cursor-pointer"
                        >
                          <span>{section}</span>
                          {openSections[section] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>
                      ) : (
                        <div className="border-t border-slate-200/60 dark:border-slate-700/60 my-2" />
                      )}
                      
                      {(openSections[section] || !isSidebarExpanded) && (
                        <div className="space-y-1 mt-1 animate-in fade-in duration-300">
                          {sectionTabs.map(tab => {
                            const isSelected = activeTab === tab.id;
                            return (
                              <button
                                key={tab.id}
                                onClick={() => goToTab(tab.id)}
                                title={!isSidebarExpanded ? tab.label : undefined}
                                className={`w-full flex items-center ${
                                  isSidebarExpanded ? 'justify-start gap-3 px-3 py-2.5' : 'justify-center p-2.5'
                                } rounded-xl text-[11px] uppercase tracking-wide font-black transition-all group duration-300 cursor-pointer border ${
                                  isSelected 
                                    ? 'bg-indigo-600 border-transparent text-white shadow-sm active-tab'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 border-transparent'
                                }`}
                              >
                                <tab.icon size={16} className={`shrink-0 transition-colors duration-300 ${isSelected ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400'}`} />
                                {isSidebarExpanded && <span className="truncate animate-in fade-in duration-300">{tab.label}</span>}
                                {isSidebarExpanded && isSelected && <ChevronRight size={12} className="ml-auto text-white/70" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Back to Overview button in Sidebar */}
            <button
              onClick={() => {
                goToTab('overview');
              }}
              title={!isSidebarExpanded ? "Settings Hub Overview" : undefined}
              className={`w-full flex items-center ${
                isSidebarExpanded ? 'justify-center gap-2 px-3 py-2.5' : 'justify-center p-2.5'
              } rounded-xl border border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:bg-indigo-50/10 dark:hover:bg-indigo-500/10 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer`}
            >
              <Sliders size={14} className="shrink-0" />
              {isSidebarExpanded && <span className="animate-in fade-in duration-200">Settings Hub Overview</span>}
            </button>
          </aside>

          {/* Right Canvas Surface */}
          <div className="flex-1 min-w-0">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm p-6 md:p-10 min-h-[700px] flex flex-col">
              <div className="mb-8 pb-6 border-b border-slate-200/50 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm">
                      {activeTabObj ? <activeTabObj.icon size={18} /> : null}
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white capitalize tracking-tight">
                      {activeTabObj?.label}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium pl-12">{activeTabObj?.description}</p>
                </div>
                
                {/* Contextual indicator or Branch Selector inside canvas header */}
                {branchIsolatedTabs.includes(activeTab) ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Branch:</span>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none transition-all cursor-pointer"
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Active
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <Suspense key={activeTab} fallback={<SettingsLoading />}>
                  {branchIsolatedTabs.includes(activeTab) && !isBranchReady
                    ? <SettingsLoading>Loading branch scope...</SettingsLoading>
                    : renderContent()}
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
