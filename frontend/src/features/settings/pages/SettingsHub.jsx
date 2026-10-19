import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  BadgeDollarSign,
  Boxes,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock3,
  CreditCard,
  FileSignature,
  FileSpreadsheet,
  FileText,
  Globe2,
  Image,
  LayoutTemplate,
  ListChecks,
  Mail,
  MapPin,
  MessageSquare,
  PackageOpen,
  Plug,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  Truck,
  UserRoundCog,
  Users,
  Webhook,
  X,
} from "lucide-react";
import API from "../../../services/api";
import { useAuth } from "../../auth/context/AuthContext";
import useCan from "../../../shared/auth/useCan";
import { filterAccessibleBranches, getUserBranchIds } from "../../../shared/utils/branchScope";
import { SETTINGS_TAB_PERMISSIONS } from "../../../shared/permissions/registry";

import BranchSettings from "../components/BranchSettings";
import AuditLogs from "../components/AuditLogs";
import CommunicationTemplates from "../components/CommunicationTemplates";
import CommunicationSetup from "../components/CommunicationSetup";
import CompanySettings from "../components/CompanySettings";
import LeadSourceSettings from "../components/LeadSourceSettings";
import MoverSizeSettings from "../components/MoverSizeSettings";
import MoverTypeSettings from "../components/MoverTypeSettings";
import OpportunityLossReasonSettings from "../components/OpportunityLossReasonSettings";
import ReferralSourceSettings from "../components/ReferralSourceSettings";
import RolesPermissions from "../components/RolesPermissions";
import SchedulingSettings from "../components/SchedulingSettings";
import ServiceTypeSettings from "../components/ServiceTypeSettings";
import StatusCodeSettings from "../components/StatusCodeSettings";
import TeamManagement from "../components/TeamManagement";
import DocumentTemplates from "../components/DocumentTemplates";
import EstimatePortalTemplates from "../components/EstimatePortalTemplates";
import ChooseTemplateTypeModal from "../components/modals/ChooseTemplateTypeModal";
import CreateDocumentModal from "../components/modals/CreateDocumentModal";
import CreateEstimatePortalModal from "../components/modals/CreateEstimatePortalModal";
import CreateCommunicationModal from "../components/modals/CreateCommunicationModal";
import { PlusCircle } from "lucide-react";

const FALLBACK_BRANCHES = [
  { id: "1", name: "Main HQ", is_main: true },
  { id: "2", name: "Regional North" },
  { id: "3", name: "Metro Center" },
];
const BRANCH_CACHE_KEY = "kargoflow:settings:branches";
const ACTIVE_BRANCH_KEY = "kargoflow:settings:branchId";

function loadCachedBranches() {
  try {
    const cached = JSON.parse(localStorage.getItem(BRANCH_CACHE_KEY) || "null");
    if (Array.isArray(cached) && cached.length) {
      return cached.map((branch) => ({ ...branch, id: String(branch.id) }));
    }
  } catch {
    // Ignore stale cache
  }
  return FALLBACK_BRANCHES;
}

function loadInitialBranchId(branches) {
  const cachedId = localStorage.getItem(ACTIVE_BRANCH_KEY);
  if (cachedId && branches.some((branch) => branch.id === cachedId)) return cachedId;
  return branches.find((branch) => branch.is_main)?.id || branches[0]?.id || "1";
}

const SETTINGS_GROUPS = [
  {
    id: "company",
    label: "Company Settings",
    shortLabel: "Company",
    icon: Building2,
    tabs: [
      { id: "profile", label: "Profile & Legal", description: "Legal identity and registration.", icon: Building2, render: (branchId) => <CompanySettings branchId={branchId} view="profile" /> },
      { id: "address", label: "Headquarters & Address", description: "Corporate headquarters and mailing address.", icon: MapPin, render: (branchId) => <CompanySettings branchId={branchId} view="address" /> },
      { id: "contact", label: "Contact Channels", description: "Public email, phone, and website.", icon: Mail, render: (branchId) => <CompanySettings branchId={branchId} view="contact" /> },
      { id: "currency", label: "Currency", description: "Currency and regional formatting.", icon: BadgeDollarSign, render: (branchId) => <CompanySettings branchId={branchId} view="currency" /> },
    ],
  },
  {
    id: "branches",
    label: "Branch Settings",
    shortLabel: "Branches",
    icon: MapPin,
    tabs: [
      { id: "directory", label: "Branch Directory", description: "All operating locations.", icon: Building2, render: (branchId) => <BranchSettings activeBranchId={branchId} view="directory" /> },
      { id: "general", label: "General & Location", description: "Branch identity and contact details.", icon: MapPin, render: (branchId) => <BranchSettings activeBranchId={branchId} view="general" /> },
      { id: "booking", label: "Booking & Deposits", description: "Booking requirements and deposits.", icon: ClipboardList, render: (branchId) => <BranchSettings activeBranchId={branchId} view="booking" /> },
      { id: "taxes", label: "Taxes & Surcharges", description: "Local tax inheritance and rates.", icon: CreditCard, render: (branchId) => <BranchSettings activeBranchId={branchId} view="taxes" /> },
      { id: "branding", label: "Branch Branding", description: "Location-specific logo and email footer.", icon: Image, render: (branchId) => <BranchSettings activeBranchId={branchId} view="branding" /> },
    ],
  },
  {
    id: "operations",
    label: "Operations & Fleet",
    shortLabel: "Operations",
    icon: Truck,
    tabs: [
      { id: "arrival-windows", label: "Arrival Windows", description: "Company dispatch scheduling.", icon: Clock3, render: (branchId) => <SchedulingSettings branchId={branchId} /> },
    ],
  },
  {
    id: "team",
    label: "Team & Security",
    shortLabel: "Team",
    icon: Users,
    tabs: [
      { id: "members", label: "Team Members", description: "Accounts and branch access.", icon: Users, render: (branchId) => <TeamManagement branchId={branchId} /> },
      { id: "roles", label: "Roles & Permissions", description: "Granular access scopes.", icon: ShieldCheck, render: (branchId) => <RolesPermissions branchId={branchId} /> },
      { id: "audit-logs", label: "Audit Logs", description: "Changes and login history.", icon: Activity, render: (branchId) => <AuditLogs branchId={branchId} /> },
    ],
  },
  {
    id: "sales",
    label: "Sales & CRM",
    shortLabel: "Sales",
    icon: Webhook,
    tabs: [
      { id: "inbound-leads", label: "Inbound Leads", description: "Secure API intake and routing.", icon: Webhook, render: (branchId) => <LeadSourceSettings branchId={branchId} /> },
      { id: "referrals", label: "Referral Sources", description: "Partners and UTM attribution.", icon: Globe2, render: (branchId) => <ReferralSourceSettings branchId={branchId} /> },
      { id: "statuses", label: "Internal Statuses", description: "Pipeline badges and stages.", icon: Tags, render: (branchId) => <StatusCodeSettings branchId={branchId} /> },
      { id: "loss-reasons", label: "Loss Reasons", description: "Opportunity loss classifications.", icon: ListChecks, render: (branchId) => <OpportunityLossReasonSettings branchId={branchId} /> },
    ],
  },
  {
    id: "moves",
    label: "Move Classifications",
    shortLabel: "Moves",
    icon: Boxes,
    tabs: [
      { id: "mover-types", label: "Mover Types", description: "Residential and commercial rules.", icon: Truck, render: (branchId) => <MoverTypeSettings branchId={branchId} /> },
      { id: "service-types", label: "Service Types", description: "Moving and packing services.", icon: Boxes, render: (branchId) => <ServiceTypeSettings branchId={branchId} /> },
      { id: "mover-sizes", label: "Mover Sizes", description: "Home volume classifications.", icon: SlidersHorizontal, render: (branchId) => <MoverSizeSettings branchId={branchId} /> },
    ],
  },
  {
    id: "communications",
    label: "Communications",
    shortLabel: "Comms",
    icon: MessageSquare,
    tabs: [
      { id: "setup", label: "Email & SMS Setup", description: "Sending domains, branch senders, Telnyx numbers, and reply mailboxes.", icon: MessageSquare, render: (branchId) => <CommunicationSetup branchId={Number(branchId) || null} /> },
    ],
  },
  {
    id: "documents",
    label: "Documents & Portals",
    shortLabel: "Documents",
    icon: FileSignature,
    tabs: [
      { id: "document-templates", label: "Document Templates", description: "Legal contracts, bills of lading, payment invoices, and authorizations.", icon: FileSignature, render: (branchId, subView, itemId, onOpenChooser, isDocs) => <DocumentTemplates branchId={Number(branchId) || null} basePath={isDocs ? "/documents/document-templates" : "/settings/documents/document-templates"} builderRouteView={subView || itemId || ''} builderRouteItemId={subView ? itemId : null} onOpenChooser={onOpenChooser} /> },
      { id: "estimate-portal-templates", label: "Estimate Templates", description: "Customer estimate portal templates, rate calculations, and charges layouts.", icon: FileText, render: (branchId, subView, itemId, onOpenChooser, isDocs) => <EstimatePortalTemplates branchId={Number(branchId) || null} basePath={isDocs ? "/documents/estimate-portal-templates" : "/settings/documents/estimate-portal-templates"} builderRouteView={subView || itemId || ''} builderRouteItemId={subView ? itemId : null} onOpenChooser={onOpenChooser} /> },
      { id: "communication-templates", label: "Email & SMS Templates", description: "Transactional email designs, SMS notification templates, and merge tags.", icon: Mail, render: (branchId, subView, itemId, onOpenChooser, isDocs) => <CommunicationTemplates branchId={branchId} basePath={isDocs ? "/documents/communication-templates" : "/settings/documents/communication-templates"} closePath={isDocs ? "/documents/communication-templates" : "/settings/documents/communication-templates"} builderRouteView={subView || itemId || ''} builderRouteItemId={subView ? itemId : null} onOpenChooser={onOpenChooser} /> },
    ],
  },
];

const LEGACY_ROUTES = {
  company: ["company", "profile"],
  branches: ["branches", "directory"],
  branding: ["branches", "branding"],
  scheduling: ["operations", "arrival-windows"],
  team: ["team", "members"],
  roles: ["team", "roles"],
  audit: ["team", "audit-logs"],
  leads: ["sales", "inbound-leads"],
  referrals: ["sales", "referrals"],
  "status-codes": ["sales", "statuses"],
  "opportunity-loss-reasons": ["sales", "loss-reasons"],
  "mover-types": ["moves", "mover-types"],
  "service-types": ["moves", "service-types"],
  "mover-sizes": ["moves", "mover-sizes"],
  communications: ["communications", "setup"],
  "communication-templates": ["documents", "communication-templates"],
  templates: ["documents", "communication-templates"],
  "document-templates": ["documents", "document-templates"],
  "estimate-portal-templates": ["documents", "estimate-portal-templates"],
};

function fuzzyMatch(query, value) {
  const needle = query.trim().toLowerCase();
  const haystack = value.toLowerCase();
  if (!needle || haystack.includes(needle)) return true;
  let index = 0;
  for (const character of haystack) {
    if (character === needle[index]) index += 1;
    if (index === needle.length) return true;
  }
  return false;
}

export default function SettingsHub({ initialGroup }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPathname = location.pathname || (typeof window !== "undefined" ? window.location.pathname : "");
  const params = useParams() || {};
  const splat = params["*"] || "";
  const mainGroup = params.mainGroup;
  const tabId = params.tabId;
  const subView = params.subView;
  const itemId = params.itemId;

  const isDocumentsRoute = currentPathname.startsWith("/documents") || initialGroup === "documents";
  const legacyMap = LEGACY_ROUTES[mainGroup || tabId];
  const isDocumentsGroup = isDocumentsRoute || mainGroup === "documents" || legacyMap?.[0] === "documents";
  const isDocumentsSection = isDocumentsGroup;

  const subTab =
    params.subTab ||
    (currentPathname.includes("estimate-portal-templates") || splat.includes("estimate-portal-templates")
      ? "estimate-portal-templates"
      : currentPathname.includes("communication-templates") || splat.includes("communication-templates")
      ? "communication-templates"
      : currentPathname.includes("document-templates") || splat.includes("document-templates")
      ? "document-templates"
      : null);
  const { user } = useAuth();
  const useCanResult = useCan();
  const canAny = useCanResult?.canAny || (() => true);

  const initialBranches = useMemo(loadCachedBranches, []);
  const [branches, setBranches] = useState(initialBranches);
  const [branchId, setBranchId] = useState(() => loadInitialBranchId(initialBranches));
  const [branchStatus, setBranchStatus] = useState("loading");
  const [searchQuery, setSearchQuery] = useState("");

  const [isChooseTypeModalOpen, setIsChooseTypeModalOpen] = useState(false);
  const [chosenTemplateType, setChosenTemplateType] = useState("document");
  const [isCreateDocModalOpen, setIsCreateDocModalOpen] = useState(false);
  const [isCreateEstimateModalOpen, setIsCreateEstimateModalOpen] = useState(false);
  const [isCreateCommModalOpen, setIsCreateCommModalOpen] = useState(false);

  const handleOpenTemplateChooser = (defaultType = null) => {
    let resolvedType = defaultType;
    if (!resolvedType) {
      if (activeTab?.id === "estimate-portal-templates") resolvedType = "estimate";
      else if (activeTab?.id === "communication-templates" || activeTab?.id === "templates") resolvedType = "communication";
      else resolvedType = "document";
    }
    setChosenTemplateType(resolvedType);
    setIsChooseTypeModalOpen(true);
  };

  const handleTemplateTypeSelected = (selectedType) => {
    setIsChooseTypeModalOpen(false);
    if (selectedType === "document") {
      setIsCreateDocModalOpen(true);
    } else if (selectedType === "estimate") {
      setIsCreateEstimateModalOpen(true);
    } else if (selectedType === "communication") {
      setIsCreateCommModalOpen(true);
    }
  };

  // Filter groups and tabs by RBAC permissions
  const visibleGroups = useMemo(() => {
    return SETTINGS_GROUPS.map((group) => {
      const allowedTabs = group.tabs.filter((tab) => {
        // Document, Estimate, and Communication templates are accessible to all settings users
        if (
          tab.id === "document-templates" ||
          tab.id === "estimate-portal-templates" ||
          tab.id === "communication-templates" ||
          tab.id === "templates"
        ) {
          return true;
        }
        const required = SETTINGS_TAB_PERMISSIONS[tab.id];
        if (!required || !required.length) return true;
        return canAny(required);
      });
      return { ...group, tabs: allowedTabs };
    }).filter((group) => group.tabs.length > 0);
  }, [canAny]);

  const isLegacy = Boolean(legacyMap);

  // Handle URL normalization and legacy route mapping
  const targetGroupId = isLegacy
    ? legacyMap[0]
    : isDocumentsGroup
    ? "documents"
    : (mainGroup || tabId);

  const targetSubTabId = isLegacy
    ? legacyMap[1]
    : isDocumentsGroup
    ? (subTab && subTab !== 'builder' ? subTab : "document-templates")
    : (subTab || (subView === 'builder' ? null : subView));
  
  // Distinguish between /settings/:mainGroup/:subTab/:itemId/:subView and /settings/:mainGroup/:subTab/:subView
  let effectiveSubView = null;
  let effectiveItemId = null;
  if (isLegacy) {
    if (subView === 'builder') {
      effectiveSubView = 'builder';
      effectiveItemId = params.subTab || itemId || null;
    } else if (subTab === 'builder' || itemId === 'builder') {
      effectiveSubView = 'builder';
      effectiveItemId = null;
    }
  } else {
    if (subView === 'builder') {
      effectiveSubView = 'builder';
      effectiveItemId = itemId || null;
    } else if (itemId === 'builder') {
      effectiveSubView = 'builder';
      effectiveItemId = null;
    } else if (subTab === 'builder') {
      effectiveSubView = 'builder';
      effectiveItemId = null;
    } else if (!subTab && subView === 'builder') {
      effectiveSubView = 'builder';
      effectiveItemId = itemId || null;
    }
  }

  const activeGroup = useMemo(() => {
    return visibleGroups.find((group) => group.id === targetGroupId) || visibleGroups[0] || SETTINGS_GROUPS[0];
  }, [targetGroupId, visibleGroups]);

  const activeTab = useMemo(() => {
    return activeGroup.tabs.find((tab) => tab.id === targetSubTabId) || activeGroup.tabs[0];
  }, [activeGroup, targetSubTabId]);

  // Handle URL normalization and legacy route redirection
  useEffect(() => {
    // If standalone /documents section
    if (isDocumentsRoute) {
      if (currentPathname === "/documents" || currentPathname === "/documents/") {
        navigate("/documents/document-templates", { replace: true });
        return;
      }
      return;
    }

    // If user accesses /settings/documents or /settings/documents/
    if (currentPathname === "/settings/documents" || currentPathname === "/settings/documents/") {
      navigate("/settings/documents/document-templates", { replace: true });
      return;
    }

    if (!mainGroup && !tabId) {
      navigate("/settings/company/profile", { replace: true });
      return;
    }

    // Clean redirect for legacy routes (e.g., /settings/document-templates, /settings/document-templates/:id/builder)
    if (legacyMap) {
      if (effectiveSubView === 'builder' && effectiveItemId) {
        navigate(`/settings/${legacyMap[0]}/${legacyMap[1]}/${effectiveItemId}/builder`, { replace: true });
        return;
      }
      if (effectiveSubView === 'builder' && !effectiveItemId) {
        navigate(`/settings/${legacyMap[0]}/${legacyMap[1]}/builder`, { replace: true });
        return;
      }
      if (!effectiveSubView && !effectiveItemId) {
        navigate(`/settings/${legacyMap[0]}/${legacyMap[1]}`, { replace: true });
        return;
      }
    }

    const group = visibleGroups.find((item) => item.id === targetGroupId);
    if (!group) {
      if (visibleGroups[0]) {
        navigate(`/settings/${visibleGroups[0].id}/${visibleGroups[0].tabs[0].id}`, { replace: true });
      }
      return;
    }

    if (!effectiveSubView && (!targetSubTabId || !group.tabs.some((tab) => tab.id === targetSubTabId))) {
      navigate(`/settings/${group.id}/${group.tabs[0].id}`, { replace: true });
    }
  }, [isDocumentsRoute, currentPathname, mainGroup, tabId, legacyMap, targetGroupId, targetSubTabId, effectiveSubView, effectiveItemId, navigate, visibleGroups, subTab]);

  // Load live branches
  useEffect(() => {
    let active = true;
    API.general
      .getBranches()
      .then((payload) => {
        if (!active) return;
        const list = Array.isArray(payload?.results) ? payload.results : Array.isArray(payload) ? payload : [];
        const scopedBranches = filterAccessibleBranches(user, list);
        const fetched = (scopedBranches.length ? scopedBranches : list).map((branch) => ({
          ...branch,
          id: String(branch.id),
        }));
        if (!fetched.length) return;
        setBranches(fetched);
        localStorage.setItem(BRANCH_CACHE_KEY, JSON.stringify(fetched));
        const userBranchIds = getUserBranchIds(user);
        const defaultBranch =
          fetched.find((branch) => userBranchIds.includes(String(branch.id))) ||
          fetched.find((b) => b.id === String(user?.branch_id)) ||
          fetched.find((branch) => branch.is_main) ||
          fetched[0];
        if (defaultBranch) {
          setBranchId(String(defaultBranch.id));
          localStorage.setItem(ACTIVE_BRANCH_KEY, String(defaultBranch.id));
        }
        setBranchStatus("live");
      })
      .catch(() => active && setBranchStatus("offline"));

    return () => {
      active = false;
    };
  }, [user]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return visibleGroups.flatMap((group) =>
      group.tabs
        .filter((tab) => fuzzyMatch(searchQuery, `${group.label} ${tab.label} ${tab.description}`))
        .map((tab) => ({ group, tab })),
    );
  }, [searchQuery, visibleGroups]);

  const selectBranch = (id) => {
    setBranchId(id);
    localStorage.setItem(ACTIVE_BRANCH_KEY, id);
  };

  return (
    <div className="flex h-[calc(100vh-theme(spacing.20))] min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      {/* Left Tier 1 Rail */}
      <aside className="flex w-16 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:w-56">
        <div className="flex h-14 shrink-0 items-center justify-center border-b border-slate-100 px-2 dark:border-slate-800 lg:justify-start lg:px-4">
          <div className="hidden lg:block">
            <h2 className="font-heading text-sm font-bold text-heading dark:text-white">
              {isDocumentsRoute ? "Documents Hub" : "Settings Hub"}
            </h2>
            <p className="text-[10px] text-slate-400">Two-tier workspace</p>
          </div>
        </div>
        <nav aria-label="Settings groups" className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          {visibleGroups.map((group, index) => {
            const Icon = group.icon;
            const selected = group.id === activeGroup.id;
            return (
              <button
                aria-current={selected ? "page" : undefined}
                className={`flex w-full items-center justify-center rounded-xl px-2 py-2.5 text-left text-xs font-bold transition-all lg:justify-start lg:gap-2.5 lg:px-3 ${
                  selected
                    ? "bg-brand-navy text-white shadow-sm dark:bg-blue-600"
                    : "text-slate-500 hover:bg-slate-100 hover:text-heading dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                }`}
                key={group.id}
                onClick={() => {
                  if (group.id === "documents") {
                    if (isDocumentsRoute) {
                      navigate(`/documents/${group.tabs[0].id}`);
                    } else {
                      navigate(`/settings/documents/${group.tabs[0].id}`);
                    }
                  } else {
                    navigate(`/settings/${group.id}/${group.tabs[0].id}`);
                  }
                }}
                title={group.label}
                type="button"
              >
                <Icon className="shrink-0" size={15} />
                <span className="hidden min-w-0 flex-1 truncate lg:block">{group.shortLabel}</span>
                <span className={`hidden lg:block ${selected ? "text-white/50" : "text-slate-300"}`}>
                  {index + 1}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Container */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Sticky Global Top Header */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="hidden min-w-0 items-center gap-1.5 text-[11px] font-semibold text-slate-400 lg:flex">
            <span>{isDocumentsRoute ? "Documents" : "Settings"}</span>
            <ChevronRight size={12} />
            <span className="truncate text-heading dark:text-white">{activeGroup.label}</span>
          </div>

          <div className="relative min-w-0 max-w-md flex-1 lg:ml-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              aria-label="Quick search settings"
              className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-xs text-heading outline-none focus:border-brand-blue dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Quick search settings..."
              type="search"
              value={searchQuery}
            />
            {searchQuery && (
              <>
                <button
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                  onClick={() => setSearchQuery("")}
                  type="button"
                >
                  <X size={14} />
                </button>
                <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                  {searchResults.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">No matching settings found.</div>
                  ) : (
                    searchResults.map(({ group, tab }) => {
                      const TabIcon = tab.icon;
                      return (
                        <button
                          className="flex w-full items-start gap-3 rounded-xl p-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          key={`${group.id}-${tab.id}`}
                          onClick={() => {
                            if (group.id === "documents") {
                              if (isDocumentsRoute) {
                                navigate(`/documents/${tab.id}`);
                              } else {
                                navigate(`/settings/documents/${tab.id}`);
                              }
                            } else {
                              navigate(`/settings/${group.id}/${tab.id}`);
                            }
                            setSearchQuery("");
                          }}
                          type="button"
                        >
                          <TabIcon className="mt-0.5 shrink-0 text-brand-blue" size={14} />
                          <span className="min-w-0">
                            <span className="block text-xs font-bold text-heading dark:text-white">{tab.label}</span>
                            <span className="block truncate text-[10px] text-slate-400">
                              {group.label} · {tab.description}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>

          {/* Global Branch Selector */}
          <label className="flex shrink-0 items-center gap-2 rounded-xl bg-slate-100 px-2.5 py-2 dark:bg-slate-800">
            <MapPin className="text-brand-blue" size={14} />
            <select
              aria-label="Global branch"
              className="w-24 bg-transparent text-[11px] font-bold text-slate-700 outline-none dark:text-slate-200 sm:w-auto"
              onChange={(event) => selectBranch(event.target.value)}
              value={branchId}
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <span
              className={`hidden h-1.5 w-1.5 rounded-full sm:block ${
                branchStatus === "live"
                  ? "bg-emerald-500"
                  : branchStatus === "loading"
                  ? "animate-pulse bg-amber-400"
                  : "bg-slate-400"
              }`}
            />
          </label>
        </header>

        {/* Tier 2 Sub-Nav Sticky Pills */}
        <div className="sticky top-14 z-10 flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 overflow-x-auto min-w-0">
            {activeGroup.tabs.map((tab) => {
              const selected = tab.id === activeTab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  aria-selected={selected}
                  className={`flex h-8 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[11px] font-bold transition-all ${
                    selected
                      ? "bg-brand-navy text-white shadow-sm dark:bg-blue-600"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                  }`}
                  key={tab.id}
                  onClick={() => {
                    if (isDocumentsRoute) {
                      navigate(`/documents/${tab.id}`);
                    } else {
                      navigate(`/settings/${activeGroup.id}/${tab.id}`);
                    }
                  }}
                  role="tab"
                  type="button"
                >
                  <TabIcon size={13} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Shared Global Action Button (hidden on Document & Estimate Templates pages) */}
          {(activeGroup.id === "documents" || isDocumentsRoute) &&
            activeTab?.id !== "document-templates" &&
            activeTab?.id !== "estimate-portal-templates" && (
            <div className="shrink-0 pl-2">
            </div>
          )}
        </div>

        {/* Main Content Area (Compact viewport, efficient space usage) */}
        <main className="min-h-0 flex-1 overflow-auto p-2 sm:p-2.5">
          <div className="mx-auto h-full max-w-7xl">
            {activeTab && activeTab.render(branchId, effectiveSubView, effectiveItemId, handleOpenTemplateChooser, isDocumentsRoute)}
          </div>
        </main>

        {/* Step 1: Choose Template Category Modal */}
        <ChooseTemplateTypeModal
          isOpen={isChooseTypeModalOpen}
          initialType={chosenTemplateType}
          onClose={() => setIsChooseTypeModalOpen(false)}
          onSelectType={handleTemplateTypeSelected}
        />

        {/* Step 2: Document Templates Creation Modal */}
        <CreateDocumentModal
          isOpen={isCreateDocModalOpen}
          onClose={() => setIsCreateDocModalOpen(false)}
          branches={branches}
          defaultBranchId={branchId}
          onCreated={(created) => {
            setIsCreateDocModalOpen(false);
            if (created?.id) {
              navigate(isDocumentsRoute ? `/documents/document-templates/${created.id}/builder` : `/settings/documents/document-templates/${created.id}/builder`);
            }
          }}
        />

        {/* Step 2: Estimate Portal Templates Creation Modal */}
        <CreateEstimatePortalModal
          isOpen={isCreateEstimateModalOpen}
          onClose={() => setIsCreateEstimateModalOpen(false)}
          onBack={() => {
            setIsCreateEstimateModalOpen(false);
            handleOpenTemplateChooser("estimate");
          }}
          branches={branches}
          defaultBranchId={branchId}
          onCreated={(created) => {
            setIsCreateEstimateModalOpen(false);
            if (created?.id) {
              navigate(isDocumentsRoute ? `/documents/estimate-portal-templates/${created.id}/builder` : `/settings/documents/estimate-portal-templates/${created.id}/builder`);
            }
          }}
        />

        {/* Step 2: Email & SMS Templates Creation Modal */}
        <CreateCommunicationModal
          isOpen={isCreateCommModalOpen}
          onClose={() => setIsCreateCommModalOpen(false)}
          onBack={() => {
            setIsCreateCommModalOpen(false);
            handleOpenTemplateChooser("communication");
          }}
          branches={branches}
          defaultBranchId={branchId}
          onCreated={(created) => {
            setIsCreateCommModalOpen(false);
            if (created?.id) {
              navigate(isDocumentsRoute ? `/documents/communication-templates/${created.id}/builder` : `/settings/documents/communication-templates/${created.id}/builder`);
            }
          }}
        />
      </div>
    </div>
  );
}
