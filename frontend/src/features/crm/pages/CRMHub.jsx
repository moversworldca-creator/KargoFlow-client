import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { getUserBranchIds } from '../../../shared/utils/branchScope';
import useCan from '../../../shared/auth/useCan';
import { PERMISSIONS } from '../../../shared/permissions/registry';
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCcw,
  Search,
  Target,
  User,
  Zap,
} from 'lucide-react';
import Card from '../../../shared/ui/Card';
import { getRecordDetailPath } from '../utils/recordRoutes';
import {
  convertLead,
  assignLead,
  createLead,
  createLeadActivity,
  getLeadActivities,
  createOpportunity,
  createCustomer,
  deleteLead,
  deleteOpportunity,
  getActivities,
  getCustomers,
  getLeads,
  getOpportunities,
  getBranchLookups,
  getLookupUsers,
  getStatusCodes,
  updateLead,
  updateOpportunity,
  createSalesActivity,
} from '../../../services/api';
import {
  LEAD_STATUS_OPTIONS,
  OPPORTUNITY_STATUS_OPTIONS,
  getLeadStatusLabel,
  getOpportunityStatusLabel,
  getWorkflowStageLabel,
  toneForStatus,
} from '../utils/statusWorkflow';

const asList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.results)) return res.results;
  return [];
};

const parseDateOnly = (value) => {
  if (!value) return null;
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const safeDate = (isoOrDate) => {
  if (!isoOrDate) return '-';
  const d = parseDateOnly(isoOrDate);
  if (!d) return String(isoOrDate);
  return d.toLocaleDateString();
};

const safeDateTime = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString();
};

const normalizeColorValue = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const shortHexMatch = raw.match(/^#([0-9a-f]{3})$/i);
  if (shortHexMatch) {
    return `#${shortHexMatch[1].split('').map((char) => char + char).join('')}`.toUpperCase();
  }
  const longHexMatch = raw.match(/^#([0-9a-f]{6})$/i);
  if (longHexMatch) {
    return `#${longHexMatch[1].toUpperCase()}`;
  }
  return raw;
};

const normalizeLookupValue = (value) => {
  if (value == null || value === '') return '';
  if (typeof value === 'object') {
    return String(value.id ?? value.value ?? value.code ?? value.pk ?? '');
  }
  return String(value);
};

const getStatusPillStyle = (colorHex) => {
  const normalized = normalizeColorValue(colorHex);
  if (!normalized) return null;
  return {
    color: normalized,
    backgroundColor: `color-mix(in srgb, ${normalized} 14%, white)`,
    borderColor: `color-mix(in srgb, ${normalized} 24%, white)`,
  };
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const d = parseDateOnly(iso);
  if (!d) return '';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.max(0, Math.floor(diffMs / (60 * 1000)));
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr`;
  const days = Math.floor(hrs / 24);
  return `${days} d`;
};

const formatMoney = (val) => {
  if (val === null || val === undefined || val === '') return '-';
  const n = Number(String(val).replaceAll(',', ''));
  if (Number.isNaN(n)) return String(val);
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
};

const initials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const a = parts[0]?.[0] || '';
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
  return (a + b).toUpperCase();
};

const StatusPill = ({ tone = 'neutral', colorHex, children }) => {
  const map = {
    neutral: 'bg-page text-body border-subtle',
    good: 'bg-primary-tint/30 text-primary border-primary-tint/50',
    warn: 'bg-yellow-50 text-yellow-700 border-yellow-100',
    bad: 'bg-[#FDE8E8]/30 text-[#791F1F] border-[#FDE8E8]',
    hot: 'bg-status-lost-bg text-status-lost-text border-status-lost-border',
    dark: 'bg-heading text-white border-[#2E2E2E]',
  };
  const customStyle = getStatusPillStyle(colorHex);
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[0.625rem] font-bold uppercase tracking-widest border ${customStyle ? '' : (map[tone] || map.neutral)}`}
      style={customStyle || undefined}
    >
      {children}
    </span>
  );
};

const SegmentedTabs = ({ value, onChange, items }) => (
  <div className="inline-flex p-1 bg-card border border-subtle rounded-2xl shadow-sm">
    {items.map((it) => (
      <button
        key={it.value}
        type="button"
        onClick={() => onChange(it.value)}
        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
          value === it.value ? 'bg-heading text-white shadow-sm' : 'text-body hover:bg-page'
        }`}
      >
        <span className="inline-flex items-center gap-2">
          {it.icon && <it.icon size={14} />}
          {it.label}
          {typeof it.count === 'number' && (
            <span className={`ml-1 inline-flex items-center justify-center min-w-[24px] h-5 px-1 rounded-full text-[0.625rem] font-bold ${
              value === it.value ? 'bg-card/15 text-white' : 'bg-page text-body'
            }`}>
              {it.count}
            </span>
          )}
        </span>
      </button>
    ))}
  </div>
);

const ErrorBanner = ({ text }) => (
  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#FDE8E8]/30 text-[#791F1F] border border-[#FDE8E8]">
    <AlertCircle size={18} />
    <span className="text-sm font-bold">{text}</span>
  </div>
);

const EmptyState = ({ title, subtitle }) => (
  <Card className="p-10 border border-subtle bg-card rounded-[2rem]">
    <div className="text-center">
      <p className="text-lg font-heading font-bold text-heading">{title}</p>
      <p className="text-sm text-body mt-1">{subtitle}</p>
    </div>
  </Card>
);

const ModalShell = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-heading/40 backdrop-blur-sm">
    <Card className="w-full max-w-2xl p-6 animate-in zoom-in duration-200">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-xl font-bold text-heading font-heading">{title}</h3>
        <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-page text-body">
          <ChevronRight className="rotate-180" size={20} />
        </button>
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  </div>
);

const Field = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="text-[0.625rem] font-bold uppercase tracking-widest text-body ml-1">{label}</label>
    {children}
  </div>
);

const leadDisplay = (lead) => {
  const fullName = `${lead?.first_name || ''} ${lead?.last_name || ''}`.trim() || lead?.full_name || `Lead #${lead?.sales_number || lead?.id || ''}`;
  const source = lead?.referral_source_details?.name || lead?.utm_source || '';
  const status = String(lead?.status || '').toLowerCase() || 'new';
  const priority = String(lead?.priority || '').toLowerCase();
  return { fullName, source, status, priority };
};

const oppDisplay = (opp) => {
  const customerName =
    opp?.customer_details?.full_name ||
    opp?.customer_details?.name ||
    (opp?.customer ? `Customer #${opp.customer}` : `Opportunity #${opp?.sales_number || opp?.id || ''}`);

  const assignedName =
    opp?.assigned_user_details?.first_name ||
    opp?.assigned_user_details?.email ||
    opp?.assigned_to_details?.first_name ||
    opp?.assigned_to_details?.email ||
    'Unassigned';

  const originLine = opp?.origin_address_details?.address_line1 || '';
  const destLine = opp?.destination_address_details?.address_line1 || '';
  const originCity = opp?.origin_address_details?.city || '';
  const destCity = opp?.destination_address_details?.city || '';
  const routeText = (originCity && destCity) ? `${originCity} → ${destCity}` : (originLine || destLine ? 'Route set' : 'Route not set');

  const status = String(opp?.status || '').toLowerCase() || 'new';
  const serviceText = opp?.service_type ? String(opp.service_type).replaceAll('_', ' ') : '';

  return { customerName, assignedName, routeText, status, serviceText };
};

const OPP_STATUSES = OPPORTUNITY_STATUS_OPTIONS.map((item) => item.code);

const stageForRow = ({ lead, opp }) => {
  if (opp) return String(opp?.workflow_stage || 'opportunity').toLowerCase();
  return String(lead?.workflow_stage || 'new_lead').toLowerCase();
};

const CRMHub = ({ defaultTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasPermission } = useAuth();
  const { canAny } = useCan();
  const canManageHubRecords = useMemo(
    () => canAny([PERMISSIONS.LEAD_EDIT, PERMISSIONS.SALES_CHANGE_OPPORTUNITY]),
    [canAny]
  );
  const canCreateHubRecords = useMemo(
    () => canAny([PERMISSIONS.LEAD_CREATE, PERMISSIONS.SALES_CHANGE_OPPORTUNITY]),
    [canAny]
  );
  const canDeleteHubRecords = useMemo(
    () => canAny([PERMISSIONS.LEAD_EDIT, PERMISSIONS.SALES_CHANGE_OPPORTUNITY]),
    [canAny]
  );
  const canAssignHubRecords = useMemo(
    () => canAny([PERMISSIONS.LEAD_EDIT, PERMISSIONS.SALES_CHANGE_OPPORTUNITY]),
    [canAny]
  );
  const denyHubAction = useCallback((message) => {
    alert(message);
    return false;
  }, []);
  const canChangeMoveSize = Boolean(
    user?.is_system_admin ||
    user?.is_superuser ||
    hasPermission(['crm.estimates.override_price']) ||
    hasPermission(['crm.admin'])
  );

  const desiredTab = useMemo(() => {
    if (defaultTab) return defaultTab;
    if (location.pathname.startsWith('/sales')) return 'my_leads';
    if (location.pathname.startsWith('/crm/activities')) return 'activities';
    return 'new_leads';
  }, [defaultTab, location.pathname]);

  const [tab, setTab] = useState(desiredTab);
  const [search, setSearch] = useState('');
  const searchInputRef = useRef(null);

  const [leads, setLeads] = useState([]);
  const [opps, setOpps] = useState([]);
  const [activities, setActivities] = useState([]);

  const [loading, setLoading] = useState({ leads: true, opps: true, activities: false });
  const [error, setError] = useState({ leads: '', opps: '', activities: '' });

  const [leadStatus, setLeadStatus] = useState('all');
  const [oppView] = useState('pipeline'); // pipeline | list

  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [leadBucket, setLeadBucket] = useState('new'); // new | all (derived from tab)
  const [leadTempBucket, setLeadTempBucket] = useState('all'); // all | hot
  const [leadSourceFilter, setLeadSourceFilter] = useState('');
  const [leadBranchFilter, setLeadBranchFilter] = useState('');
  const [oppStatusFilter, setOppStatusFilter] = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState(() => new Set());
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignForm, setBulkAssignForm] = useState({ branch: '', assigned_to: '' });
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('new');

  const [leadModal, setLeadModal] = useState({ open: false, mode: 'create', initial: null });
  const [leadForm, setLeadForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    status: 'new',
    move_size: '',
    move_date: '',
    service_type: '',
    lead_cost: '',
    notes: '',
  });

  const [oppModal, setOppModal] = useState({ open: false, mode: 'create', initial: null });
  const [oppForm, setOppForm] = useState({
    customer: '',
    status: 'new',
    service_type: '',
    move_type: '',
    move_date: '',
    move_size: '',
    lead_cost: '',
    notes_internal: '',
  });

  const [customers, setCustomers] = useState([]);
  const [leadStatusCodes, setLeadStatusCodes] = useState([]);
  const [opportunityStatusCodes, setOpportunityStatusCodes] = useState([]);
  const [customerQuery, setCustomerQuery] = useState('');
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    primary_phone: '',
  });
  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'lead'|'opp', item }
  const [isSaving, setIsSaving] = useState(false);

  const [activityModal, setActivityModal] = useState({ open: false, targetType: 'lead', targetId: null });
  const [activityForm, setActivityForm] = useState({
    type: 'note', // note|call|email|sms
    subject: '',
    body: '',
    direction: 'outbound',
  });

  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const accessibleBranchIds = useMemo(() => new Set(getUserBranchIds(user)), [user]);
  const restrictToAccessibleBranches = accessibleBranchIds.size > 0 && !user?.is_superuser && !user?.is_system_admin;
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignForm, setAssignForm] = useState({ branch: '', assigned_to: '' });

  useEffect(() => {
    setTab(desiredTab);
  }, [desiredTab]);

  useEffect(() => {
    if (tab === 'new_leads') setLeadBucket('new');
    if (tab === 'my_leads') setLeadBucket('all');
  }, [tab]);

  const q = search.trim().toLowerCase();

  const filteredLeads = useMemo(() => {
    const base = leads
      // SmartMoving "New Leads": show only NEW + UNASSIGNED leads.
      .filter(l => {
        if (leadBucket !== 'new') return true;
        const isNew = String(l?.status || '').toLowerCase() === 'new';
        const isUnassigned = !l?.assigned_to;
        return isNew && isUnassigned;
      })
      .filter(l => leadStatus === 'all' || String(l?.status || '').toLowerCase() === leadStatus)
      .filter(l => {
        if (leadTempBucket !== 'hot') return true;
        const p = String(l?.priority || '').toLowerCase();
        return p === 'hot' || p === 'high';
      })
      .filter(l => {
        if (!leadSourceFilter) return true;
        const s = (l?.referral_source_details?.name || l?.utm_source || '').toLowerCase();
        return s === leadSourceFilter.toLowerCase();
      })
      .filter(l => {
        if (!leadBranchFilter) return true;
        return String(l?.branch || '') === String(leadBranchFilter);
      })
      .filter(l => {
        if (!q) return true;
        const d = leadDisplay(l);
        const hay = [l?.id, d.fullName, l?.email, l?.phone, d.source, l?.move_size].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      });
    return base;
  }, [leads, leadBucket, leadStatus, leadTempBucket, leadSourceFilter, leadBranchFilter, q]);

  const selectedLead = useMemo(() => filteredLeads.find(l => l?.id === selectedLeadId) || leads.find(l => l?.id === selectedLeadId) || null, [filteredLeads, leads, selectedLeadId]);

  useEffect(() => {
    if (!selectedLead) return;
    setAssignForm({
      branch: selectedLead.branch ? String(selectedLead.branch) : '',
      assigned_to: selectedLead.assigned_to ? String(selectedLead.assigned_to) : '',
    });
  }, [selectedLead?.id]);

  const filteredOpps = useMemo(() => {
    return opps
      .filter((o) => {
        if (!oppStatusFilter) return true;
        return String(o?.status || '').toLowerCase() === String(oppStatusFilter).toLowerCase();
      })
      .filter((o) => {
        if (!leadBranchFilter) return true;
        const branchId = o?.branch?.id || o?.branch_id || o?.branch;
        return String(branchId || '') === String(leadBranchFilter);
      })
      .filter((o) => {
        if (!leadSourceFilter) return true;
        const sourceText = String(
          o?.lead_details?.referral_source_details?.name ||
          o?.lead_details?.utm_source ||
          o?.referral_source_details?.name ||
          o?.utm_source ||
          ''
        ).toLowerCase();
        return sourceText === String(leadSourceFilter).toLowerCase();
      })
      .filter((o) => {
        if (!q) return true;
        const d = oppDisplay(o);
        const hay = [
          o?.id,
          o?.opportunity_number,
          d.customerName,
          d.assignedName,
          d.routeText,
          d.serviceText,
          o?.status,
        ].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      });
  }, [opps, oppStatusFilter, leadBranchFilter, leadSourceFilter, q]);

  const oppByLeadId = useMemo(() => {
    const map = new Map();
    for (const o of opps) {
      const lid = o?.lead;
      if (!lid) continue;
      // Keep the most recent one if multiples exist.
      const prev = map.get(lid);
      if (!prev) map.set(lid, o);
      else {
        const a = new Date(prev.created_at || 0).getTime();
        const b = new Date(o.created_at || 0).getTime();
        if (b >= a) map.set(lid, o);
      }
    }
    return map;
  }, [opps]);

  const combinedRows = useMemo(() => {
    const rows = leads.map(lead => {
      const opp = oppByLeadId.get(lead.id) || null;
      const stage = stageForRow({ lead, opp });
      const ownerId = (opp?.assigned_user || null) ?? (lead?.assigned_to || null);
      const branchId = lead?.branch || opp?.branch || null;
      const sourceText = lead?.referral_source_details?.name || lead?.utm_source || '';
      const routeText = (lead?.origin_city && lead?.destination_city) ? `${lead.origin_city} → ${lead.destination_city}` : (lead?.origin_city || lead?.destination_city || '');
      return { lead, opp, stage, ownerId, branchId, sourceText, routeText };
    });

    // Tab scoping
    if (tab === 'new_leads') {
      return rows.filter(r => r.stage === 'new_lead' && !r.lead?.assigned_to);
    }
    if (tab === 'my_leads') {
      return rows.filter(r => !(r.stage === 'new_lead' && !r.lead?.assigned_to));
    }
    return rows;
  }, [leads, oppByLeadId, tab]);

  const visibleRows = useMemo(() => {
    const qq = search.trim().toLowerCase();
    return combinedRows
      .filter(r => {
        if (tab !== 'new_leads') return true;
        if (leadTempBucket !== 'hot') return true;
        const p = String(r.lead?.priority || '').toLowerCase();
        return p === 'hot' || p === 'high';
      })
      .filter(r => {
        if (!leadSourceFilter) return true;
        return String(r.sourceText || '').toLowerCase() === String(leadSourceFilter).toLowerCase();
      })
      .filter(r => {
        if (!leadBranchFilter) return true;
        return String(r.branchId || '') === String(leadBranchFilter);
      })
      .filter(r => {
        if (!oppStatusFilter) return true;
        const s = String(r.opp?.status || '').toLowerCase();
        return s === String(oppStatusFilter).toLowerCase();
      })
      .filter(r => {
        if (!leadStatus || leadStatus === 'all') return true;
        const s = String(r.lead?.status || '').toLowerCase();
        return s === String(leadStatus).toLowerCase();
      })
      .filter(r => {
        if (!qq) return true;
        const ld = leadDisplay(r.lead);
        const od = r.opp ? oppDisplay(r.opp) : null;
        const hay = [
          r.lead?.id,
          ld.fullName,
          r.lead?.email,
          r.lead?.phone,
          r.routeText,
          r.sourceText,
          r.stage,
          r.opp?.id,
          r.opp?.opportunity_number,
          od?.customerName,
          od?.routeText,
          od?.serviceText,
        ].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(qq);
      });
  }, [combinedRows, leadBranchFilter, leadSourceFilter, leadStatus, leadTempBucket, oppStatusFilter, search, tab]);

  const leadCountNew = useMemo(() => {
    return leads.filter(l => String(l?.status || '').toLowerCase() === 'new' && !l?.assigned_to).length;
  }, [leads]);

  const leadCountMine = useMemo(() => {
    let count = 0;
    for (const lead of leads) {
      const opp = oppByLeadId.get(lead.id) || null;
      const stage = stageForRow({ lead, opp });
      if (!(stage === 'new_lead' && !lead?.assigned_to)) count += 1;
    }
    return count;
  }, [leads, oppByLeadId]);

  const leadStatusOptions = useMemo(
    () => (leadStatusCodes.length ? leadStatusCodes : LEAD_STATUS_OPTIONS).map((item) => item.code),
    [leadStatusCodes]
  );
  const opportunityStatusOptions = useMemo(
    () => (opportunityStatusCodes.length ? opportunityStatusCodes : OPPORTUNITY_STATUS_OPTIONS).map((item) => item.code),
    [opportunityStatusCodes]
  );

  const oppByStatus = useMemo(() => {
    const map = {};
    for (const s of opportunityStatusOptions) map[s] = [];
    for (const o of filteredOpps) {
      const s = String(o?.status || 'new').toLowerCase();
      (map[s] || (map[s] = [])).push(o);
    }
    return map;
  }, [filteredOpps, opportunityStatusOptions]);

  const leadCounts = useMemo(() => {
    const counts = { all: leads.length, new: 0, contacted: 0, qualified: 0, converted: 0 };
    for (const l of leads) {
      const s = String(l?.status || '').toLowerCase();
      if (s in counts) counts[s] += 1;
    }
    return counts;
  }, [leads]);

  const leadSources = useMemo(() => {
    const set = new Set();
    for (const l of leads) {
      const s = (l?.referral_source_details?.name || l?.utm_source || '').trim();
      if (s) set.add(s);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [leads]);

  const oppCounts = useMemo(() => {
    const counts = { all: opps.length };
    for (const s of opportunityStatusOptions) counts[s] = 0;
    for (const o of opps) {
      const s = String(o?.status || '').toLowerCase();
      if (s in counts) counts[s] += 1;
    }
    return counts;
  }, [opps, opportunityStatusOptions]);

  const fetchLeads = async () => {
    setLoading(prev => ({ ...prev, leads: true }));
    setError(prev => ({ ...prev, leads: '' }));
    try {
      const res = await getLeads();
      const list = asList(res);
      setLeads(list);
      if (!selectedLeadId && list.length > 0) setSelectedLeadId(list[0].id);
      // Clear selection when list changes to avoid acting on stale IDs.
      setSelectedLeadIds(new Set());
    } catch (err) {
      const status = err?.response?.status;
      setError(prev => ({
        ...prev,
        leads: status === 403 ? 'Access blocked (403) while loading leads. If this is unexpected, re-login or verify your role permissions.' : 'Failed to load leads.',
      }));
      setLeads([]);
    } finally {
      setLoading(prev => ({ ...prev, leads: false }));
    }
  };

  const fetchOpps = async () => {
    setLoading(prev => ({ ...prev, opps: true }));
    setError(prev => ({ ...prev, opps: '' }));
    try {
      const res = await getOpportunities();
      setOpps(asList(res));
    } catch (err) {
      const status = err?.response?.status;
      setError(prev => ({
        ...prev,
        opps: status === 403 ? 'Access blocked (403) while loading opportunities. If this is unexpected, re-login or verify your role permissions.' : 'Failed to load opportunities.',
      }));
      setOpps([]);
    } finally {
      setLoading(prev => ({ ...prev, opps: false }));
    }
  };

  const fetchStatusConfigs = async (branchId = null) => {
    try {
      const response = await getStatusCodes();
      const rows = asList(response);
      const mapped = rows
        .map((row) => ({
          code: String(row.code || '').trim(),
          label: String(row.label || '').trim() || getLeadStatusLabel(row.code),
          color_hex: row.color_hex || '',
        }))
        .filter((row) => row.code);

      const fallbackLeadOptions = LEAD_STATUS_OPTIONS.map((item) => ({ code: item.code, label: item.label }));
      const fallbackOpportunityOptions = OPPORTUNITY_STATUS_OPTIONS.map((item) => ({ code: item.code, label: item.label }));

      setLeadStatusCodes(mapped.length ? mapped : fallbackLeadOptions);
      setOpportunityStatusCodes(
        mapped.length
          ? mapped.map((row) => ({ code: row.code, label: row.label }))
          : fallbackOpportunityOptions
      );
    } catch (err) {
      console.error('Failed to fetch status config:', err);
      setLeadStatusCodes(LEAD_STATUS_OPTIONS.map((row) => ({ code: row.code, label: row.label })));
      setOpportunityStatusCodes(OPPORTUNITY_STATUS_OPTIONS.map((row) => ({ code: row.code, label: row.label })));
    }
  };

  const fetchActivities = async () => {
    setLoading(prev => ({ ...prev, activities: true }));
    setError(prev => ({ ...prev, activities: '' }));
    try {
      const [salesRes, leadRes] = await Promise.allSettled([
        getActivities({ ordering: '-created_at', limit: 100 }),
        getLeadActivities({ ordering: '-created_at', limit: 100 }),
      ]);
      const sales = salesRes.status === 'fulfilled' ? asList(salesRes.value.data ?? salesRes.value) : [];
      const leads = leadRes.status === 'fulfilled' ? asList(leadRes.value.data ?? leadRes.value) : [];
      const merged = [...sales, ...leads]
        .map((item) => ({
          ...item,
          timeline_source: item.opportunity ? 'opportunity' : 'lead',
        }))
        .sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime());
      setActivities(merged);
    } catch (err) {
      const status = err?.response?.status;
      setError(prev => ({
        ...prev,
        activities: status === 403 ? 'Access blocked (403) while loading sales activities. If this is unexpected, re-login or verify your role permissions.' : 'Failed to load sales activities.',
      }));
      setActivities([]);
    } finally {
      setLoading(prev => ({ ...prev, activities: false }));
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchOpps();
    fetchStatusConfigs(leadBranchFilter || null);
  }, []);

  useEffect(() => {
    fetchStatusConfigs(leadBranchFilter || null);
  }, [leadBranchFilter]);

  const ensureAssigneesLoaded = async () => {
    if (branches.length > 0 && users.length > 0) return;
    try {
      const [b, u] = await Promise.all([getBranchLookups(), getLookupUsers({ limit: 100 })]);
      const nextBranches = asList(b);
      const nextUsers = asList(u);
      setBranches(
        restrictToAccessibleBranches
          ? nextBranches.filter((branch) => accessibleBranchIds.has(String(branch.id)))
          : nextBranches,
      );
      setUsers(
        restrictToAccessibleBranches
          ? nextUsers.filter((item) => getUserBranchIds(item).some((branchId) => accessibleBranchIds.has(String(branchId))))
          : nextUsers,
      );
    } catch (err) {
      console.error('Failed to load branches/users:', err);
      setBranches([]);
      setUsers([]);
    }
  };

  useEffect(() => {
    if (tab === 'new_leads' || tab === 'my_leads') ensureAssigneesLoaded();
  }, [tab]);

  const toggleLeadSelected = (id) => {
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllVisibleLeads = () => {
    setSelectedLeadIds(prev => {
      const visibleIds = visibleRows.map(r => r?.lead?.id).filter(Boolean);
      const allSelected = visibleIds.length > 0 && visibleIds.every(id => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        visibleIds.forEach(id => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      visibleIds.forEach(id => next.add(id));
      return next;
    });
  };

  const bulkGrab = async () => {
    const ids = Array.from(selectedLeadIds);
    if (ids.length === 0) return;
    if (!canAssignHubRecords) return denyHubAction('You do not have permission to assign leads.');
    if (!user?.id) {
      alert('Current user not available.');
      return;
    }
    setAssignLoading(true);
    try {
      await Promise.all(ids.map(id => assignLead(id, { assigned_to: user.id })));
      await fetchLeads();
    } catch (err) {
      console.error('Bulk grab failed:', err);
      alert('Failed to grab leads.');
    } finally {
      setAssignLoading(false);
    }
  };

  const bulkAssign = async () => {
    const ids = Array.from(selectedLeadIds);
    if (ids.length === 0) return;
    if (!canAssignHubRecords) return denyHubAction('You do not have permission to assign leads.');
    setAssignLoading(true);
    try {
      const payload = {
        branch: bulkAssignForm.branch ? Number(bulkAssignForm.branch) : null,
        assigned_to: bulkAssignForm.assigned_to ? Number(bulkAssignForm.assigned_to) : null,
      };
      await Promise.all(ids.map(id => assignLead(id, payload)));
      setBulkAssignOpen(false);
      await fetchLeads();
    } catch (err) {
      console.error('Bulk assign failed:', err);
      alert('Failed to assign leads.');
    } finally {
      setAssignLoading(false);
    }
  };

  const bulkChangeStatus = async () => {
    const ids = Array.from(selectedLeadIds);
    if (ids.length === 0) return;
    if (!canManageHubRecords) return denyHubAction('You do not have permission to change lead status.');
    setIsSaving(true);
    try {
      await Promise.all(ids.map(id => updateLead(id, { status: bulkStatus })));
      setBulkStatusOpen(false);
      await fetchLeads();
    } catch (err) {
      console.error('Bulk status change failed:', err);
      alert('Failed to change lead status.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (tab === 'activities' && !loading.activities && activities.length === 0 && !error.activities) {
      fetchActivities();
    }
  }, [tab]);

  const goTab = (next) => {
    if (next === 'new_leads') navigate('/leads');
    else if (next === 'my_leads') navigate('/sales');
    else navigate('/crm/activities');
  };

  const handleSearchChange = useCallback((value) => {
    setSearch(value);
    // Keep focus stable if parent re-renders while typing.
    window.requestAnimationFrame(() => {
      const el = searchInputRef.current;
      if (!el) return;
      if (document.activeElement !== el) {
        el.focus({ preventScroll: true });
      }
    });
  }, []);

  const refreshCurrent = () => {
    if (tab === 'activities') fetchActivities();
    else {
      fetchLeads();
      fetchOpps();
    }
  };

  const priorityTone = (priority) => {
    if (priority === 'hot' || priority === 'high') return 'hot';
    if (priority === 'medium') return 'warn';
    return 'neutral';
  };

  const handleConvert = async (lead) => {
    if (!lead?.id) return;
    if (!canManageHubRecords) return denyHubAction('You do not have permission to convert leads.');
    if (!window.confirm('Convert this lead to a customer and create an opportunity?')) return;
    try {
      const res = await convertLead(lead.id);
      const oppRecord = res?.opportunity || res?.data?.opportunity || null;
      const oppId = oppRecord?.id;
      if (oppRecord) navigate(getRecordDetailPath('opportunity', oppRecord));
      else navigate('/sales');
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      const detail = data?.detail || data?.non_field_errors?.[0] || data?.assigned_to?.[0] || data?.branch?.[0] || data?.referral_source?.[0] || data?.custom_status_code?.[0];
      console.error('Lead conversion failed:', {
        leadId: lead.id,
        status,
        response: data,
      });
      const msg = status === 403
        ? 'Access blocked (403) while converting lead. If this is unexpected, re-login or verify your role permissions.'
        : (detail || 'Conversion failed.');
      alert(msg);
    }
  };

  const saveAssignment = async () => {
    if (!selectedLead?.id) return;
    if (!canAssignHubRecords) return denyHubAction('You do not have permission to assign leads.');
    setAssignLoading(true);
    try {
      const payload = {
        branch: assignForm.branch ? Number(assignForm.branch) : null,
        assigned_to: assignForm.assigned_to ? Number(assignForm.assigned_to) : null,
      };
      const updated = await assignLead(selectedLead.id, payload);
      setLeads(prev => prev.map(l => (l.id === updated.id ? updated : l)));
    } catch (err) {
      console.error('Assign failed:', err);
      const status = err?.response?.status;
      alert(status === 403 ? 'Access blocked (403) while assigning.' : 'Failed to assign lead.');
    } finally {
      setAssignLoading(false);
    }
  };

  const openActivity = (targetType, targetId, presetType) => {
    if (!targetId) return;
    setActivityModal({ open: true, targetType, targetId });
    setActivityForm({
      type: presetType || 'note',
      subject: '',
      body: '',
      direction: 'outbound',
    });
  };

  const submitActivity = async (e) => {
    e.preventDefault();
    if (!activityModal.targetId) return;
    if (!canManageHubRecords) return denyHubAction('You do not have permission to create activities.');
    setIsSaving(true);
    try {
      if (activityModal.targetType === 'lead') {
        const payload = {
          lead: activityModal.targetId,
          activity_type: activityForm.type,
          content: activityForm.body || activityForm.subject || '',
        };
        await createLeadActivity(payload);
      } else {
        const payload = {
          opportunity: activityModal.targetId,
          activity_type: activityForm.type,
          direction: activityForm.direction || 'outbound',
          subject: activityForm.subject || '',
          description: activityForm.body || '',
          status: 'pending',
        };
        const created = await createSalesActivity(payload);
        // Opportunistically attach the new activity to the in-memory opportunity.
        setOpps(prev => prev.map(o => {
          if (o.id !== activityModal.targetId) return o;
          const activities = Array.isArray(o.activities) ? o.activities : [];
          return { ...o, activities: [created, ...activities] };
        }));
      }
      await fetchActivities();
      setActivityModal({ open: false, targetType: 'lead', targetId: null });
    } catch (err) {
      console.error('Activity create failed:', err);
      const status = err?.response?.status;
      alert(status === 403 ? 'Access blocked (403) while creating activity.' : 'Failed to create activity.');
    } finally {
      setIsSaving(false);
    }
  };

  const openLeadCreate = () => {
    navigate('/leads/new');
  };

  const openLeadEdit = (lead) => {
    if (!lead) return;
    setLeadModal({ open: true, mode: 'edit', initial: lead });
    setLeadForm({
      first_name: lead.first_name || '',
      last_name: lead.last_name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      status: lead.status || 'new',
      move_size: lead.move_size || '',
      move_date: lead.move_date || '',
      service_type: lead.service_type || '',
      lead_cost: lead.lead_cost ?? '',
      notes: lead.notes || '',
    });
  };

  const submitLead = async (e) => {
    e.preventDefault();
    if (!canCreateHubRecords && leadModal.mode !== 'edit') return denyHubAction('You do not have permission to create leads.');
    if (!canManageHubRecords && leadModal.mode === 'edit') return denyHubAction('You do not have permission to edit leads.');
    setIsSaving(true);
    try {
      const payload = {
        first_name: (leadForm.first_name || '').trim(),
        last_name: (leadForm.last_name || '').trim(),
        email: (leadForm.email || '').trim(),
        phone: (leadForm.phone || '').trim(),
        status: leadForm.status || 'new',
        move_size: leadForm.move_size || '',
        move_date: leadForm.move_date || null,
        service_type: leadForm.service_type || '',
        lead_cost: leadForm.lead_cost === '' ? 0 : leadForm.lead_cost,
        notes: leadForm.notes || '',
      };
      if (!payload.first_name || !payload.last_name) {
        alert('First name and last name are required.');
        return;
      }
      if (leadModal.mode === 'edit' && leadModal.initial?.id) {
        const updated = await updateLead(leadModal.initial.id, payload);
        setLeads(prev => prev.map(l => (l.id === updated.id ? updated : l)));
        setSelectedLeadId(updated.id);
      } else {
        const created = await createLead(payload);
        setLeads(prev => [created, ...prev]);
        setSelectedLeadId(created.id);
      }
      setLeadModal({ open: false, mode: 'create', initial: null });
    } catch (err) {
      console.error('Lead save failed:', err);
      const status = err?.response?.status;
      alert(status === 403 ? 'Access blocked (403) while saving lead.' : 'Failed to save lead.');
    } finally {
      setIsSaving(false);
    }
  };

  const ensureCustomersLoaded = async () => {
    if (customers.length > 0) return;
    try {
      const res = await getCustomers();
      setCustomers(asList(res));
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      setCustomers([]);
    }
  };

  const openOppCreate = async () => {
    await ensureCustomersLoaded();
    setCustomerQuery('');
    setNewCustomerOpen(false);
    setNewCustomerForm({ first_name: '', last_name: '', email: '', primary_phone: '' });
    setOppModal({ open: true, mode: 'create', initial: null });
    setOppForm({
      customer: '',
      status: 'new',
      service_type: '',
      move_type: '',
      move_date: '',
      move_size: '',
      lead_cost: '',
      notes_internal: '',
    });
  };

  const openOppEdit = async (opp) => {
    if (!opp) return;
    await ensureCustomersLoaded();
    setCustomerQuery('');
    setNewCustomerOpen(false);
    setOppModal({ open: true, mode: 'edit', initial: opp });
    setOppForm({
      customer: opp.customer || '',
      status: opp.status || 'new',
      service_type: normalizeLookupValue(opp.service_type),
      move_type: normalizeLookupValue(opp.move_type),
      move_date: opp.move_date || '',
      move_size: opp.move_size || '',
      lead_cost: opp.lead_cost ?? '',
      notes_internal: opp.notes_internal || '',
    });
  };

  const submitOpp = async (e) => {
    e.preventDefault();
    if (!canCreateHubRecords && oppModal.mode !== 'edit') return denyHubAction('You do not have permission to create opportunities.');
    if (!canManageHubRecords && oppModal.mode === 'edit') return denyHubAction('You do not have permission to edit opportunities.');
    setIsSaving(true);
    try {
      // Optional inline customer creation (useful when starting from scratch).
      let customerId = oppForm.customer ? Number(oppForm.customer) : null;
      if (!customerId && newCustomerOpen) {
        const payload = {
          first_name: (newCustomerForm.first_name || '').trim(),
          last_name: (newCustomerForm.last_name || '').trim(),
          email: (newCustomerForm.email || '').trim(),
          primary_phone: (newCustomerForm.primary_phone || '').trim(),
        };
        if (!payload.first_name || !payload.last_name) {
          alert('Customer first name and last name are required.');
          return;
        }
        const createdCustomer = await createCustomer(payload);
        customerId = createdCustomer?.id || null;
        if (customerId) {
          setCustomers(prev => [createdCustomer, ...prev]);
          setOppForm(prev => ({ ...prev, customer: String(customerId) }));
        }
      }

      const payload = {
        customer: customerId,
        status: oppForm.status || 'new',
        service_type: normalizeLookupValue(oppForm.service_type) || null,
        move_type: normalizeLookupValue(oppForm.move_type) || null,
        move_date: oppForm.move_date || null,
        move_size: oppForm.move_size || '',
        lead_cost: oppForm.lead_cost === '' ? 0 : oppForm.lead_cost,
        notes_internal: oppForm.notes_internal || '',
      };
      if (!payload.customer) {
        alert('Customer is required to create an opportunity (convert a lead or create/select a customer).');
        return;
      }
      if (oppModal.mode === 'edit' && oppModal.initial?.id) {
        const updated = await updateOpportunity(oppModal.initial.id, payload);
        setOpps(prev => prev.map(o => (o.id === updated.id ? updated : o)));
      } else {
        const created = await createOpportunity(payload);
        setOpps(prev => [created, ...prev]);
      }
      setOppModal({ open: false, mode: 'create', initial: null });
    } catch (err) {
      console.error('Opportunity save failed:', err);
      const status = err?.response?.status;
      alert(status === 403 ? 'Access blocked (403) while saving opportunity.' : 'Failed to save opportunity.');
    } finally {
      setIsSaving(false);
    }
  };

  const doDelete = async () => {
    if (!confirmDelete?.item?.id) return;
    if (!canDeleteHubRecords) return denyHubAction('You do not have permission to delete records.');
    setIsSaving(true);
    try {
      if (confirmDelete.type === 'lead') {
        await deleteLead(confirmDelete.item.id);
        setLeads(prev => prev.filter(l => l.id !== confirmDelete.item.id));
        if (selectedLeadId === confirmDelete.item.id) setSelectedLeadId(null);
      } else {
        await deleteOpportunity(confirmDelete.item.id);
        setOpps(prev => prev.filter(o => o.id !== confirmDelete.item.id));
      }
      setConfirmDelete(null);
    } catch (err) {
      console.error('Delete failed:', err);
      const status = err?.response?.status;
      alert(status === 403 ? 'Access blocked (403) while deleting.' : 'Failed to delete.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-[1700px] mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-heading tracking-tight">
            {tab === 'new_leads' ? 'New Leads' : tab === 'my_leads' ? 'My Leads' : tab === 'activities' ? 'Activity' : 'CRM'}
          </h1>
          <p className="text-sm text-body">SmartMoving-style leads + opportunities table.</p>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative w-full md:w-[520px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-disabled" size={18} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by name, phone, email, route, ID..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-card border border-subtle rounded-2xl text-heading placeholder-[#B4B2A9] outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
            />
          </div>
          <button
            type="button"
            onClick={refreshCurrent}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-card border border-subtle rounded-2xl text-sm font-bold text-body hover:text-primary hover:border-primary/20 transition-all shadow-sm"
          >
            <RefreshCcw size={16} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-subtle">
        <SegmentedTabs
          value={tab}
          onChange={goTab}
          items={[
            { value: 'new_leads', label: 'New Leads', icon: Zap, count: leadCountNew },
            { value: 'my_leads', label: 'My Leads', icon: Target, count: leadCountMine },
            { value: 'activities', label: 'Activity', icon: Calendar, count: activities.length || undefined },
          ]}
        />

        {(tab === 'new_leads' || tab === 'my_leads') && (
          <button
            type="button"
            onClick={openLeadCreate}
            className="px-4 py-2 rounded-xl text-[0.6875rem] font-bold uppercase tracking-widest transition-all border bg-primary text-white border-primary hover:bg-primary-dark"
          >
            New Lead
          </button>
        )}
      </div>

      {(tab === 'new_leads' || tab === 'my_leads') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-0 overflow-hidden border border-subtle bg-card rounded-[1.5rem] shadow-sm">
              <div className="px-4 py-4 border-b border-page">
                <p className="text-[0.625rem] font-bold uppercase tracking-widest text-disabled">View</p>
                <p className="text-sm font-bold text-heading mt-1">{tab === 'new_leads' ? 'New Leads' : 'My Leads'}</p>
              </div>
              <div className="p-2">
                <button
                  type="button"
                  onClick={() => setLeadTempBucket('all')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                    leadTempBucket === 'all' ? 'bg-heading text-white' : 'text-body hover:bg-page'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setLeadTempBucket('hot')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                    leadTempBucket === 'hot' ? 'bg-heading text-white' : 'text-body hover:bg-page'
                  }`}
                >
                  Hot
                </button>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-10 space-y-4">
            {(error.leads || error.opps) && (
              <div className="space-y-2">
                {error.leads && <ErrorBanner text={error.leads} />}
                {error.opps && <ErrorBanner text={error.opps} />}
              </div>
            )}

            <Card className="p-0 overflow-hidden border border-subtle bg-card rounded-[2rem] shadow-sm">
              <div className="px-6 py-5 border-b border-page flex flex-col gap-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <StatusPill tone="neutral">{visibleRows.length} visible</StatusPill>
                    {selectedLeadIds.size > 0 && <StatusPill tone="dark">{selectedLeadIds.size} selected</StatusPill>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {tab === 'new_leads' && (
                      <button
                        type="button"
                        disabled={assignLoading || selectedLeadIds.size === 0}
                        onClick={bulkGrab}
                        className="px-4 py-2 rounded-xl text-[0.6875rem] font-bold uppercase tracking-widest transition-all border bg-heading text-white border-[#2E2E2E] hover:opacity-95 disabled:opacity-60"
                      >
                        Grab Lead(s)
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={selectedLeadIds.size === 0}
                      onClick={async () => { await ensureAssigneesLoaded(); setBulkAssignOpen(true); }}
                      className="px-4 py-2 rounded-xl text-[0.6875rem] font-bold uppercase tracking-widest transition-all border bg-card text-body border-subtle hover:text-primary hover:border-primary/20 disabled:opacity-60"
                    >
                      Assign To User
                    </button>
                    <button
                      type="button"
                      disabled={selectedLeadIds.size === 0}
                      onClick={() => setBulkStatusOpen(true)}
                      className="px-4 py-2 rounded-xl text-[0.6875rem] font-bold uppercase tracking-widest transition-all border bg-card text-body border-subtle hover:text-primary hover:border-primary/20 disabled:opacity-60"
                    >
                      Change Status
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <Field label="Any Source">
                    <select
                      value={leadSourceFilter}
                      onChange={(e) => setLeadSourceFilter(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-card border border-subtle outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
                    >
                      <option value="">Any</option>
                      {leadSources.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Any Branch">
                    <select
                      value={leadBranchFilter}
                      onChange={(e) => setLeadBranchFilter(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-card border border-subtle outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
                    >
                      <option value="">Any</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name || `Branch #${b.id}`}</option>)}
                    </select>
                  </Field>
                  <Field label="Any Opp Status">
                    <select
                      value={oppStatusFilter}
                      onChange={(e) => setOppStatusFilter(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-card border border-subtle outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
                    >
                      <option value="">Any</option>
                      {opportunityStatusOptions.map(s => <option key={s} value={s}>{getOpportunityStatusLabel(s)}</option>)}
                    </select>
                  </Field>
                  <Field label="Any Lead Status">
                    <select
                      value={leadStatus}
                      onChange={(e) => setLeadStatus(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-card border border-subtle outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
                    >
                      <option value="all">all</option>
                      {leadStatusOptions.map(s => <option key={s} value={s}>{getLeadStatusLabel(s)}</option>)}
                    </select>
                  </Field>
                </div>
              </div>

              {(loading.leads || loading.opps) ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
              ) : visibleRows.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    title="No leads found"
                    subtitle={search.trim() ? 'Try a different search term.' : (tab === 'new_leads' ? 'Once new unassigned leads come in, they will appear here.' : 'Once you have assigned leads, they will appear here.')}
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-page border-b border-subtle">
                      <tr className="text-left">
                        <th className="px-4 py-4 w-10">
                          <input
                            type="checkbox"
                            checked={visibleRows.length > 0 && visibleRows.every(r => selectedLeadIds.has(r.lead?.id))}
                            onChange={toggleAllVisibleLeads}
                          />
                        </th>
                        <th className="px-4 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-body">#</th>
                        <th className="px-4 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-body">Opp Status</th>
                        <th className="px-4 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-body">Lead Status</th>
                        <th className="px-4 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-body">Name</th>
                        <th className="px-4 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-body">Type</th>
                        <th className="px-4 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-body">Move Size</th>
                        <th className="px-4 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-body">Service Date</th>
                        <th className="px-4 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-body text-right">Est. Revenue</th>
                        <th className="px-4 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-body">Address</th>
                        <th className="px-4 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-body">Source</th>
                        <th className="px-4 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-body">Age</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2F0EB]">
                      {visibleRows.map((r) => {
                        const lead = r.lead;
                        const opp = r.opp;
                        const ld = leadDisplay(lead);
                        const serviceType = (opp?.service_type || lead?.service_type || '').toString().replaceAll('_', ' ');
                        const moveSize = opp?.move_size || lead?.move_size || '-';
                        const moveDate = opp?.move_date || lead?.move_date || null;
                        const revenue = opp?.lead_cost ?? lead?.lead_cost;
                        const clickTo = opp?.id ? getRecordDetailPath('opportunity', opp) : getRecordDetailPath('lead', lead);
                        return (
                          <tr
                            key={lead.id}
                            className="hover:bg-page/60 cursor-pointer"
                            onClick={() => navigate(clickTo)}
                          >
                            <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedLeadIds.has(lead.id)}
                                onChange={() => toggleLeadSelected(lead.id)}
                              />
                            </td>
                            <td className="px-4 py-4 text-sm font-mono text-body">{lead.id}</td>
                            <td className="px-4 py-4">
                              <StatusPill tone={r.stage === 'opportunity' ? 'good' : r.stage === 'lead_in_progress' ? 'warn' : 'neutral'}>
                                {getWorkflowStageLabel(r.stage)}
                              </StatusPill>
                            </td>
                            <td className="px-4 py-4">
                              <StatusPill tone={toneForStatus(String(lead.status || 'new').toLowerCase())} colorHex={lead?.custom_status_code_details?.color_hex}>{lead?.custom_status_code_details?.label || getLeadStatusLabel(String(lead.status || 'new').toLowerCase())}</StatusPill>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3 min-w-[220px]">
                                <div className="w-9 h-9 rounded-2xl bg-heading text-white flex items-center justify-center text-xs font-bold">
                                  {initials(ld.fullName)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-heading truncate">{ld.fullName}</p>
                                  <p className="text-xs text-body truncate">{lead.phone || lead.email || ''}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-body">{serviceType || '-'}</td>
                            <td className="px-4 py-4 text-sm text-body">{moveSize}</td>
                            <td className="px-4 py-4 text-sm text-body">{moveDate ? safeDate(moveDate) : '-'}</td>
                            <td className="px-4 py-4 text-sm font-bold text-heading text-right">{formatMoney(revenue)}</td>
                            <td className="px-4 py-4 text-sm text-body min-w-[260px]">
                              <span className="inline-flex items-center gap-2">
                                <MapPin size={14} className="text-disabled" />
                                <span className="truncate max-w-[360px]">{r.routeText || '-'}</span>
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-body min-w-[200px] truncate">{r.sourceText || '-'}</td>
                            <td className="px-4 py-4 text-sm text-body">{timeAgo(lead.created_at)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === 'leads' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            {error.leads && <ErrorBanner text={error.leads} />}
            <Card className="p-0 overflow-hidden border border-subtle bg-card rounded-[2rem] shadow-sm">
              <div className="px-6 py-5 border-b border-page flex items-center justify-between">
                <div>
                  <p className="text-[0.625rem] font-bold uppercase tracking-widest text-disabled">Lead Inbox</p>
                  <h2 className="text-xl font-heading font-bold text-heading">Inbound</h2>
                </div>
                <StatusPill tone="neutral">{filteredLeads.length} visible</StatusPill>
              </div>

              {loading.leads ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="p-6">
                  <EmptyState title="No leads found" subtitle={q ? 'Try a different search term.' : 'Once leads come in, they will appear here.'} />
                </div>
              ) : (
                <div className="divide-y divide-[#F2F0EB]">
                  {filteredLeads.map((lead) => {
                    const d = leadDisplay(lead);
                    const active = lead.id === selectedLeadId;
                    return (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => setSelectedLeadId(lead.id)}
                        className={`w-full text-left px-6 py-5 transition-all ${
                          active ? 'bg-heading text-white' : 'bg-card hover:bg-page/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-heading font-bold text-sm ${
                                active ? 'bg-card/10 text-white' : 'bg-page text-primary'
                              }`}>
                                {initials(d.fullName)}
                              </div>
                              <div className="min-w-0">
                                <p className={`text-sm font-bold truncate ${active ? 'text-white' : 'text-heading'}`}>{d.fullName}</p>
                                <div className={`text-xs mt-0.5 flex flex-wrap items-center gap-2 ${active ? 'text-white/70' : 'text-body'}`}>
                                  <span className="inline-flex items-center gap-1"><Calendar size={12} /> {safeDate(lead.created_at)}</span>
                                  {d.source && <span className="truncate max-w-[240px]">{d.source}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[0.625rem] font-bold uppercase tracking-widest border ${
                                  active ? 'border-white/15 text-white/90 bg-card/5' : 'border-subtle text-body bg-page'
                                }`}
                                style={!active ? (getStatusPillStyle(lead?.custom_status_code_details?.color_hex) || undefined) : undefined}
                              >
                                {lead?.custom_status_code_details?.label || getLeadStatusLabel(d.status || 'new')}
                              </span>
                              {d.priority && (
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[0.625rem] font-bold uppercase tracking-widest border ${
                                  active ? 'border-white/15 text-white/90 bg-card/5' : 'border-subtle text-body bg-page'
                                }`}>
                                  {d.priority}
                                </span>
                              )}
                              {lead.move_size && (
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[0.625rem] font-bold uppercase tracking-widest border ${
                                  active ? 'border-white/15 text-white/90 bg-card/5' : 'border-subtle text-body bg-page'
                                }`}>
                                  {lead.move_size}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight size={18} className={active ? 'text-white/70' : 'text-disabled'} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <Card className="p-0 overflow-hidden border border-subtle bg-card rounded-[2rem] shadow-sm">
              <div className="px-6 py-5 border-b border-page flex items-center justify-between">
                <div>
                  <p className="text-[0.625rem] font-bold uppercase tracking-widest text-disabled">Preview</p>
                  <h2 className="text-xl font-heading font-bold text-heading">Lead Details</h2>
                </div>
                {selectedLead?.status && <StatusPill tone={toneForStatus(String(selectedLead.status).toLowerCase())} colorHex={selectedLead?.custom_status_code_details?.color_hex}>{selectedLead?.custom_status_code_details?.label || getLeadStatusLabel(String(selectedLead.status).toLowerCase())}</StatusPill>}
              </div>

              {!selectedLead ? (
                <div className="p-6">
                  <EmptyState title="Select a lead" subtitle="Pick a lead on the left to view details and take action." />
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {(() => {
                    const d = leadDisplay(selectedLead);
                    return (
                      <div className="space-y-3">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-heading text-white flex items-center justify-center font-heading font-bold">
                            {initials(d.fullName)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-lg font-heading font-bold text-heading">{d.fullName}</p>
                            <p className="text-xs text-body mt-1">{d.source || 'No source'}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {d.priority && <StatusPill tone={priorityTone(d.priority)}>{d.priority}</StatusPill>}
                              {selectedLead.move_size && <StatusPill tone="neutral">{selectedLead.move_size}</StatusPill>}
                              {selectedLead.preferred_move_date && <StatusPill tone="neutral">Move: {safeDate(selectedLead.preferred_move_date)}</StatusPill>}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="p-4 rounded-2xl bg-page border border-subtle">
                            <p className="text-[0.625rem] font-bold uppercase tracking-widest text-disabled">Email</p>
                            <p className="text-sm font-bold text-heading mt-1 break-all">{selectedLead.email || '-'}</p>
                          </div>
                          <div className="p-4 rounded-2xl bg-page border border-subtle">
                            <p className="text-[0.625rem] font-bold uppercase tracking-widest text-disabled">Phone</p>
                            <p className="text-sm font-bold text-heading mt-1">{selectedLead.phone || '-'}</p>
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-card border border-subtle">
                          <p className="text-[0.625rem] font-bold uppercase tracking-widest text-disabled">Received</p>
                          <p className="text-sm font-bold text-heading mt-1">{safeDateTime(selectedLead.created_at)}</p>
                        </div>

                        <div className="p-4 rounded-2xl bg-card border border-subtle space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-[0.625rem] font-bold uppercase tracking-widest text-disabled">Assignment</p>
                            <button
                              type="button"
                              onClick={async () => { await ensureAssigneesLoaded(); }}
                              className="text-[0.625rem] font-bold uppercase tracking-widest text-primary hover:underline"
                            >
                              Load options
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[0.625rem] font-bold uppercase tracking-widest text-body ml-1">Branch</label>
                              <select
                                value={assignForm.branch}
                                onChange={(e) => setAssignForm(prev => ({ ...prev, branch: e.target.value }))}
                                className="w-full bg-page border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium"
                              >
                                <option value="">Unassigned</option>
                                {branches.map(b => (
                                  <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[0.625rem] font-bold uppercase tracking-widest text-body ml-1">Assigned To</label>
                              <select
                                value={assignForm.assigned_to}
                                onChange={(e) => setAssignForm(prev => ({ ...prev, assigned_to: e.target.value }))}
                                className="w-full bg-page border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium"
                              >
                                <option value="">Unassigned</option>
                                {users
                                  .filter(u => {
                                    const bid = assignForm.branch ? Number(assignForm.branch) : null;
                                    if (!bid) return true;
                                    const branchIds = Array.isArray(u.branches)
                                      ? u.branches
                                      : (Array.isArray(u.branch_details) ? u.branch_details.map(b => b.id) : []);
                                    return branchIds.includes(bid);
                                  })
                                  .map(u => (
                                    <option key={u.id} value={u.id}>
                                      {(u.first_name || u.email || `User #${u.id}`)} {(u.last_name || '')}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={assignLoading}
                            onClick={saveAssignment}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-heading text-white text-sm font-bold hover:opacity-95 transition-all disabled:opacity-70"
                          >
                            {assignLoading ? 'Saving...' : 'Save Assignment'}
                          </button>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => navigate(getRecordDetailPath('lead', selectedLead))}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-heading text-white font-bold shadow-sm hover:opacity-95 transition-all"
                          >
                            <User size={18} /> Open Lead
                          </button>
                          <button
                            type="button"
                            onClick={() => openLeadEdit(selectedLead)}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-card border border-subtle text-sm font-bold text-body hover:text-primary hover:border-primary/20 transition-all"
                          >
                            Edit
                          </button>
                          {String(selectedLead.status || '').toLowerCase() !== 'converted' && (
                            <button
                              type="button"
                              onClick={() => handleConvert(selectedLead)}
                              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-primary text-white font-bold shadow-sm hover:bg-primary-dark transition-all"
                            >
                              <Zap size={18} className="fill-current" /> Convert
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete({ type: 'lead', item: selectedLead })}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#FDE8E8]/30 border border-[#FDE8E8] text-sm font-bold text-[#791F1F] hover:bg-[#FDE8E8]/50 transition-all"
                        >
                          Delete Lead
                        </button>

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => openActivity('lead', selectedLead.id, 'call')}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-card border border-subtle text-sm font-bold text-body hover:text-primary hover:border-primary/20 transition-all"
                          >
                            <Phone size={16} /> Log Call
                          </button>
                          <button
                            type="button"
                            onClick={() => openActivity('lead', selectedLead.id, 'email')}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-card border border-subtle text-sm font-bold text-body hover:text-primary hover:border-primary/20 transition-all"
                          >
                            <Mail size={16} /> Log Email
                          </button>
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => openActivity('lead', selectedLead.id, 'sms')}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-card border border-subtle text-sm font-bold text-body hover:text-primary hover:border-primary/20 transition-all"
                          >
                            Log SMS
                          </button>
                          <button
                            type="button"
                            onClick={() => openActivity('lead', selectedLead.id, 'note')}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-card border border-subtle text-sm font-bold text-body hover:text-primary hover:border-primary/20 transition-all"
                          >
                            Log Note
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === 'opportunities' && (
        <div className="space-y-4">
          {error.opps && <ErrorBanner text={error.opps} />}

          {loading.opps ? (
            <div className="flex items-center justify-center h-[50vh]"><Loader2 className="w-12 h-12 text-primary animate-spin" /></div>
          ) : filteredOpps.length === 0 ? (
            <EmptyState
              title="No opportunities found"
              subtitle={q
                ? 'Try a different search term.'
                : 'You currently have 0 opportunities. Convert a lead (creates a customer + opportunity) or create a customer and then a new opportunity.'}
            />
          ) : oppView === 'list' ? (
            <Card className="p-0 overflow-hidden border border-subtle bg-card rounded-[2rem] shadow-sm">
              <div className="px-6 py-5 border-b border-page flex items-center justify-between">
                <div>
                  <p className="text-[0.625rem] font-bold uppercase tracking-widest text-disabled">Opportunity List</p>
                  <h2 className="text-xl font-heading font-bold text-heading">Pipeline</h2>
                </div>
                <StatusPill tone="neutral">{filteredOpps.length} visible</StatusPill>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-page border-b border-subtle">
                    <tr className="text-left">
                      <th className="px-6 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-body">Customer</th>
                      <th className="px-6 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-body">Route</th>
                      <th className="px-6 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-body">Move Date</th>
                      <th className="px-6 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-body">Status</th>
                      <th className="px-6 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-body">Assigned</th>
                      <th className="px-6 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-body text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F0EB]">
                    {filteredOpps.map((opp) => {
                      const d = oppDisplay(opp);
                      return (
                        <tr
                          key={opp.id}
                          className="hover:bg-page/60 cursor-pointer"
                          onClick={() => navigate(getRecordDetailPath('opportunity', opp))}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-2xl bg-heading text-white flex items-center justify-center text-xs font-bold">
                                {initials(d.customerName)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-heading truncate">{d.customerName}</p>
                                <p className="text-[0.625rem] font-mono text-disabled">{opp.opportunity_number ? `#${opp.opportunity_number}` : `#${opp.id}`}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-body">
                            <span className="inline-flex items-center gap-2"><MapPin size={14} className="text-disabled" /> {d.routeText}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-body">{opp.move_date ? safeDate(opp.move_date) : '-'}</td>
                          <td className="px-6 py-4">
                            <StatusPill
                              tone={toneForStatus(d.status)}
                              colorHex={opp?.custom_status_code_details?.color_hex}
                            >
                              {opp?.custom_status_code_details?.label || getOpportunityStatusLabel(d.status)}
                            </StatusPill>
                          </td>
                          <td className="px-6 py-4 text-sm text-body">{d.assignedName}</td>
                          <td className="px-6 py-4 text-sm font-bold text-heading text-right">{formatMoney(opp.lead_cost)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <div className="flex gap-6 overflow-x-auto pb-2">
              {opportunityStatusOptions.map((status) => {
                const list = oppByStatus[status] || [];
                const total = list.reduce((acc, o) => {
                  const n = Number(String(o?.lead_cost || 0).replaceAll(',', ''));
                  return acc + (Number.isNaN(n) ? 0 : n);
                }, 0);
                return (
                  <div key={status} className="w-[320px] flex-shrink-0">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2">
                        <StatusPill tone={toneForStatus(status)}>{getOpportunityStatusLabel(status)}</StatusPill>
                        <span className="text-xs font-bold text-body">{list.length}</span>
                      </div>
                      <span className="text-xs font-bold text-heading">{total ? formatMoney(total) : ''}</span>
                    </div>

                    <div className="mt-3 space-y-3">
                      {list.length === 0 ? (
                        <div className="p-4 rounded-2xl bg-card border border-dashed border-subtle text-xs text-disabled font-bold uppercase tracking-widest">
                          No items
                        </div>
                      ) : (
                        list.map((opp) => {
                          const d = oppDisplay(opp);
                          return (
                            <button
                              key={opp.id}
                              type="button"
                              onClick={() => navigate(getRecordDetailPath('opportunity', opp))}
                              className="w-full text-left p-4 rounded-2xl bg-card border border-subtle hover:border-primary/20 hover:shadow-md transition-all"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-heading truncate">{d.customerName}</p>
                                  <p className="text-xs text-body mt-0.5 truncate">{d.serviceText}</p>
                                </div>
                                <span className="text-[0.625rem] font-mono text-disabled">{opp.opportunity_number ? `#${opp.opportunity_number}` : `#${opp.id}`}</span>
                              </div>
                              <div className="mt-3 flex items-center justify-between gap-3">
                                <span className="text-xs text-body inline-flex items-center gap-2 truncate">
                                  <MapPin size={14} className="text-disabled" /> {d.routeText}
                                </span>
                              </div>
                              <div className="mt-3 flex items-center justify-between">
                                <span className="text-xs text-body inline-flex items-center gap-2">
                                  <Calendar size={14} className="text-disabled" /> {opp.move_date ? safeDate(opp.move_date) : '-'}
                                </span>
                                <span className="text-xs font-bold text-heading">{formatMoney(opp.lead_cost)}</span>
                              </div>
                              <div className="mt-3 flex items-center justify-between">
                                <span className="inline-flex items-center gap-2 text-xs text-body">
                                  <span className="w-7 h-7 rounded-full bg-page border border-subtle text-primary flex items-center justify-center text-[0.625rem] font-bold">
                                    {initials(d.assignedName)}
                                  </span>
                                  <span className="truncate max-w-[180px]">{d.assignedName}</span>
                                </span>
                                <ChevronRight size={16} className="text-disabled" />
                              </div>
                              <div className="mt-3 flex gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); openOppEdit(opp); }}
                                  className="flex-1 px-3 py-2 rounded-xl bg-page border border-subtle text-[0.6875rem] font-bold uppercase tracking-widest text-body hover:text-primary transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); openActivity('opp', opp.id, 'note'); }}
                                  className="flex-1 px-3 py-2 rounded-xl bg-card border border-subtle text-[0.6875rem] font-bold uppercase tracking-widest text-body hover:text-primary transition-colors"
                                >
                                  Log
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: 'opp', item: opp }); }}
                                  className="flex-1 px-3 py-2 rounded-xl bg-[#FDE8E8]/30 border border-[#FDE8E8] text-[0.6875rem] font-bold uppercase tracking-widest text-[#791F1F] hover:bg-[#FDE8E8]/50 transition-colors"
                                >
                                  Delete
                                </button>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'activities' && (
        <div className="space-y-4">
          {error.activities && <ErrorBanner text={error.activities} />}
          {loading.activities ? (
            <div className="flex items-center justify-center h-[40vh]"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
          ) : activities.length === 0 ? (
            <EmptyState title="No activities" subtitle="Sales activities created on opportunities will appear here." />
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 50).map((a) => (
                <Card key={a.id} className="p-5 border border-subtle bg-card rounded-[1.5rem]">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill tone="neutral">{a.activity_type || 'activity'}</StatusPill>
                        {a.timeline_source && <StatusPill tone="neutral">{a.timeline_source}</StatusPill>}
                        {a.direction && <StatusPill tone="neutral">{a.direction}</StatusPill>}
                        {a.status && <StatusPill tone="neutral">{a.status}</StatusPill>}
                      </div>
                      <p className="text-sm font-bold text-heading mt-2 break-words">{a.subject || a.content || '(no subject)'}</p>
                      {(a.description || a.content) && (
                        <p className="text-sm text-body mt-1 break-words">{a.description || a.content}</p>
                      )}
                    </div>
                    <div className="text-xs text-disabled font-bold whitespace-nowrap">{safeDateTime(a.created_at)}</div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {bulkAssignOpen && (
        <ModalShell title={`Assign ${selectedLeadIds.size} lead(s)`} onClose={() => setBulkAssignOpen(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Branch">
                <select
                  value={bulkAssignForm.branch}
                  onChange={(e) => setBulkAssignForm(prev => ({ ...prev, branch: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl bg-card border border-subtle outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
                >
                  <option value="">Unassigned</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name || `Branch #${b.id}`}</option>)}
                </select>
              </Field>
              <Field label="User">
                <select
                  value={bulkAssignForm.assigned_to}
                  onChange={(e) => setBulkAssignForm(prev => ({ ...prev, assigned_to: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl bg-card border border-subtle outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
                >
                  <option value="">Unassigned</option>
                  {users
                    .filter(u => {
                      const bid = bulkAssignForm.branch ? Number(bulkAssignForm.branch) : null;
                      if (!bid) return true;
                      const branchIds = Array.isArray(u.branches)
                        ? u.branches
                        : (Array.isArray(u.branch_details) ? u.branch_details.map(b => b.id) : []);
                      return branchIds.includes(bid);
                    })
                    .map(u => (
                      <option key={u.id} value={u.id}>
                        {(u.first_name || u.email || `User #${u.id}`)} {(u.last_name || '')}
                      </option>
                    ))}
                </select>
              </Field>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setBulkAssignOpen(false)}
                className="px-4 py-2 rounded-xl bg-card border border-subtle text-sm font-bold text-body hover:text-primary hover:border-primary/20 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={assignLoading}
                onClick={bulkAssign}
                className="px-4 py-2 rounded-xl bg-heading text-white text-sm font-bold hover:opacity-95 transition-all disabled:opacity-60"
              >
                {assignLoading ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {bulkStatusOpen && (
        <ModalShell title={`Change Status (${selectedLeadIds.size} lead(s))`} onClose={() => setBulkStatusOpen(false)}>
          <div className="space-y-4">
            <Field label="Status">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-card border border-subtle outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
              >
                {leadStatusOptions.map(s => <option key={s} value={s}>{getLeadStatusLabel(s)}</option>)}
              </select>
            </Field>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setBulkStatusOpen(false)}
                className="px-4 py-2 rounded-xl bg-card border border-subtle text-sm font-bold text-body hover:text-primary hover:border-primary/20 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={bulkChangeStatus}
                className="px-4 py-2 rounded-xl bg-heading text-white text-sm font-bold hover:opacity-95 transition-all disabled:opacity-60"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {leadModal.open && (
        <ModalShell
          title={leadModal.mode === 'edit' ? 'Edit Lead' : 'New Lead'}
          onClose={() => setLeadModal({ open: false, mode: 'create', initial: null })}
        >
          <form onSubmit={submitLead} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="First Name">
                <input
                  value={leadForm.first_name}
                  onChange={(e) => setLeadForm(prev => ({ ...prev, first_name: e.target.value }))}
                  className="w-full bg-page border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium"
                  required
                />
              </Field>
              <Field label="Last Name">
                <input
                  value={leadForm.last_name}
                  onChange={(e) => setLeadForm(prev => ({ ...prev, last_name: e.target.value }))}
                  className="w-full bg-page border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium"
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Email">
                <input
                  type="email"
                  value={leadForm.email}
                  onChange={(e) => setLeadForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-page border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium"
                />
              </Field>
              <Field label="Phone">
                <input
                  value={leadForm.phone}
                  onChange={(e) => setLeadForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-page border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Status">
                <select
                  value={leadForm.status}
                  onChange={(e) => setLeadForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full bg-page border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium"
                >
                  {leadStatusOptions.map(s => (
                    <option key={s} value={s}>{getLeadStatusLabel(s)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Move Date">
                <input
                  type="date"
                  value={leadForm.move_date || ''}
                  onChange={(e) => setLeadForm(prev => ({ ...prev, move_date: e.target.value }))}
                  className="w-full bg-page border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Service Type">
                <input
                  value={leadForm.service_type}
                  onChange={(e) => setLeadForm(prev => ({ ...prev, service_type: e.target.value }))}
                  className="w-full bg-page border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium"
                  placeholder="moving, packing..."
                />
              </Field>
              <Field label="Move Size">
                <input
                  value={leadForm.move_size}
                  onChange={(e) => setLeadForm(prev => ({ ...prev, move_size: e.target.value }))}
                  disabled={leadModal.mode === 'edit' && !canChangeMoveSize}
                  className={`w-full bg-page border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium ${leadModal.mode === 'edit' && !canChangeMoveSize ? 'opacity-60 cursor-not-allowed' : ''}`}
                  placeholder="2 Bedroom, Studio..."
                />
                {leadModal.mode === 'edit' && !canChangeMoveSize ? (
                  <p className="mt-1 text-[0.625rem] font-semibold uppercase tracking-wider text-[#64748b]">
                    Move size changes require permission.
                  </p>
                ) : null}
              </Field>
            </div>

            <Field label="Notes">
              <textarea
                value={leadForm.notes}
                onChange={(e) => setLeadForm(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full bg-page border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium resize-none h-24"
              />
            </Field>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setLeadModal({ open: false, mode: 'create', initial: null })}
                className="flex-1 px-4 py-3 rounded-2xl bg-card border border-subtle text-sm font-bold text-body hover:bg-page transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 px-4 py-3 rounded-2xl bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-all disabled:opacity-70"
              >
                {isSaving ? 'Saving...' : (leadModal.mode === 'edit' ? 'Save Lead' : 'Create Lead')}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {oppModal.open && (
        <ModalShell
          title={oppModal.mode === 'edit' ? 'Edit Opportunity' : 'New Opportunity'}
          onClose={() => setOppModal({ open: false, mode: 'create', initial: null })}
        >
          <form onSubmit={submitOpp} className="space-y-4">
            <Field label="Customer">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  placeholder="Type to filter customers..."
                  className="w-full bg-[#ffffff] border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium"
                />
                <select
                  value={oppForm.customer}
                  onChange={(e) => setOppForm(prev => ({ ...prev, customer: e.target.value }))}
                  className="w-full bg-page border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium"
                >
                  <option value="">Select customer...</option>
                  {customers
                    .filter(c => {
                      const qq = customerQuery.trim().toLowerCase();
                      if (!qq) return true;
                      const hay = [c?.id, c?.first_name, c?.last_name, c?.email, c?.company_name].filter(Boolean).join(' ').toLowerCase();
                      return hay.includes(qq);
                    })
                    .slice(0, 200)
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        #{c.id} {(c.first_name || '')} {(c.last_name || '')} {c.email ? `(${c.email})` : ''}
                      </option>
                    ))}
                </select>
              </div>
              <p className="text-[0.6875rem] text-body mt-2">
                Opportunities require a Customer in the backend. Create one by converting a lead if you do not have customers yet.
              </p>
              <button
                type="button"
                onClick={() => setNewCustomerOpen(v => !v)}
                className="mt-2 text-[0.6875rem] font-bold uppercase tracking-widest text-primary hover:underline"
              >
                {newCustomerOpen ? 'Use existing customer' : 'Create new customer'}
              </button>
            </Field>

            {newCustomerOpen && (
              <div className="p-4 rounded-2xl bg-page border border-subtle space-y-4">
                <p className="text-[0.625rem] font-bold uppercase tracking-widest text-body">New Customer</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="First Name">
                    <input
                      value={newCustomerForm.first_name}
                      onChange={(e) => setNewCustomerForm(prev => ({ ...prev, first_name: e.target.value }))}
                      className="w-full bg-card border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium"
                      placeholder="First name"
                    />
                  </Field>
                  <Field label="Last Name">
                    <input
                      value={newCustomerForm.last_name}
                      onChange={(e) => setNewCustomerForm(prev => ({ ...prev, last_name: e.target.value }))}
                      className="w-full bg-card border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium"
                      placeholder="Last name"
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Email (optional)">
                    <input
                      type="email"
                      value={newCustomerForm.email}
                      onChange={(e) => setNewCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-card border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium"
                      placeholder="email@example.com"
                    />
                  </Field>
                  <Field label="Phone (optional)">
                    <input
                      value={newCustomerForm.primary_phone}
                      onChange={(e) => setNewCustomerForm(prev => ({ ...prev, primary_phone: e.target.value }))}
                      className="w-full bg-card border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium"
                      placeholder="+1..."
                    />
                  </Field>
                </div>
                <p className="text-[0.6875rem] text-body">
                  We will create the customer first, then create the opportunity.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Status">
                <select
                  value={oppForm.status}
                  onChange={(e) => setOppForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full bg-page border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium"
                >
                  {opportunityStatusOptions.map(s => <option key={s} value={s}>{getOpportunityStatusLabel(s)}</option>)}
                </select>
              </Field>
              <Field label="Move Date">
                <input
                  type="date"
                  value={oppForm.move_date || ''}
                  onChange={(e) => setOppForm(prev => ({ ...prev, move_date: e.target.value }))}
                  className="w-full bg-page border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium"
                />
              </Field>
              <Field label="Lead Cost">
                <input
                  type="number"
                  step="0.01"
                  value={oppForm.lead_cost}
                  onChange={(e) => setOppForm(prev => ({ ...prev, lead_cost: e.target.value }))}
                  className="w-full bg-page border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Service Type">
                <input
                  value={oppForm.service_type}
                  onChange={(e) => setOppForm(prev => ({ ...prev, service_type: e.target.value }))}
                  className="w-full bg-page border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium"
                  placeholder="moving, packing..."
                />
              </Field>
              <Field label="Move Type">
                <input
                  value={oppForm.move_type}
                  onChange={(e) => setOppForm(prev => ({ ...prev, move_type: e.target.value }))}
                  className="w-full bg-page border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium"
                  placeholder="local, long_distance..."
                />
              </Field>
            </div>

            <Field label="Move Size">
              <input
                value={oppForm.move_size}
                onChange={(e) => setOppForm(prev => ({ ...prev, move_size: e.target.value }))}
                disabled={oppModal.mode === 'edit' && !canChangeMoveSize}
                className={`w-full bg-page border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium ${oppModal.mode === 'edit' && !canChangeMoveSize ? 'opacity-60 cursor-not-allowed' : ''}`}
                placeholder="2 Bedroom, Studio..."
              />
              {oppModal.mode === 'edit' && !canChangeMoveSize ? (
                <p className="mt-1 text-[0.625rem] font-semibold uppercase tracking-wider text-[#64748b]">
                  Move size changes require permission.
                </p>
              ) : null}
            </Field>

            <Field label="Internal Notes">
              <textarea
                value={oppForm.notes_internal}
                onChange={(e) => setOppForm(prev => ({ ...prev, notes_internal: e.target.value }))}
                className="w-full bg-page border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium resize-none h-24"
              />
            </Field>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOppModal({ open: false, mode: 'create', initial: null })}
                className="flex-1 px-4 py-3 rounded-2xl bg-card border border-subtle text-sm font-bold text-body hover:bg-page transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 px-4 py-3 rounded-2xl bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-all disabled:opacity-70"
              >
                {isSaving ? 'Saving...' : (oppModal.mode === 'edit' ? 'Save Opportunity' : 'Create Opportunity')}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-heading/40 backdrop-blur-sm">
          <Card className="w-full max-w-sm p-6 animate-in zoom-in duration-200 text-center">
            <AlertCircle size={42} className="text-[#791F1F] mx-auto" />
            <h3 className="text-lg font-bold text-heading font-heading mt-3">Delete {confirmDelete.type === 'lead' ? 'Lead' : 'Opportunity'}?</h3>
            <p className="text-sm text-body mt-1">This action cannot be undone.</p>
            <div className="flex gap-3 pt-5">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-3 rounded-2xl bg-card border border-subtle text-sm font-bold text-body hover:bg-page transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={doDelete}
                className="flex-1 px-4 py-3 rounded-2xl bg-[#791F1F] text-white text-sm font-bold hover:bg-[#b0000a] transition-all disabled:opacity-70"
              >
                {isSaving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </Card>
        </div>
      )}

      {activityModal.open && (
        <ModalShell
          title={activityModal.targetType === 'lead' ? 'Log Lead Activity' : 'Log Opportunity Activity'}
          onClose={() => setActivityModal({ open: false, targetType: 'lead', targetId: null })}
        >
          <form onSubmit={submitActivity} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Type">
                <select
                  value={activityForm.type}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full bg-page border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium"
                >
                  <option value="note">Note</option>
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
              </Field>
              {activityModal.targetType === 'opp' && (
                <Field label="Direction">
                  <select
                    value={activityForm.direction}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, direction: e.target.value }))}
                    className="w-full bg-page border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium"
                  >
                    <option value="outbound">Outbound</option>
                    <option value="inbound">Inbound</option>
                  </select>
                </Field>
              )}
            </div>

            {activityModal.targetType === 'opp' && (
              <Field label="Subject (optional)">
                <input
                  value={activityForm.subject}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full bg-[#ffffff] border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium"
                  placeholder="Short subject..."
                />
              </Field>
            )}

            <Field label={activityModal.targetType === 'lead' ? 'Content' : 'Description'}>
              <textarea
                value={activityForm.body}
                onChange={(e) => setActivityForm(prev => ({ ...prev, body: e.target.value }))}
                className="w-full bg-page border border-subtle px-4 py-3 rounded-xl outline-none text-sm font-medium resize-none h-28"
                placeholder="Write what happened..."
              />
            </Field>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActivityModal({ open: false, targetType: 'lead', targetId: null })}
                className="flex-1 px-4 py-3 rounded-2xl bg-card border border-subtle text-sm font-bold text-body hover:bg-page transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 px-4 py-3 rounded-2xl bg-primary text-white text-sm font-bold hover:bg-primary-dark transition-all disabled:opacity-70"
              >
                {isSaving ? 'Saving...' : 'Post Activity'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
};

export default CRMHub;
