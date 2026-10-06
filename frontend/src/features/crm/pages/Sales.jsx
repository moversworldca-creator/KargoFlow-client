import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { format, formatDistanceToNowStrict, parseISO, isValid } from 'date-fns';
import {
  Plus, Search, SlidersHorizontal, 
  MapPin, Phone, Mail, ChevronRight,
  Loader2, DollarSign, Target, 
  Zap, Calendar, ArrowUpRight, X, User,
  ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ArrowRight, MoreHorizontal, SearchX,
  Globe, Clock, Square, CheckSquare,
  BarChart3, MessageSquare, CheckCircle2, TrendingUp, TrendingDown,
  Users, Lightbulb, Activity, PhoneCall, UploadCloud, Download, ChevronDown,
  LayoutList, LayoutGrid, ExternalLink
} from 'lucide-react';
import Card from '../../../shared/ui/Card';
import { normalizePreviewHtml, replaceBranchPlaceholders } from '../utils/emailPreview';
import {
  assignLead,
  bulkSalesAssign,
  bulkSalesEmail,
  bulkSalesSms,
  bulkSalesMarkLost,
  bulkSalesStatus,
  getMyLeadsQueue,
  getBranchLookups,
  getCommunicationTemplate,
  getCommunicationTemplates,
  getLookupUsers,
  getLeadStatusCodeLookups,
  getServices,
  getMoveTypeLookups,
  getMoverSizeLookups,
  getStatusCodeLookupsPage,
  getPayments,
  getTasks,
  seedCommunicationTemplates,
  getActivities,
  getLeadActivities,
  updateTask,
  updateSalesActivity,
  deleteSalesActivity,
} from '../../../services/api';
import { getSalesDashboardSummary } from '../../../services/api';
import { getRecordDetailPath, getSalesListTabFromSegment, getSalesListTabPath } from '../utils/recordRoutes';
import useCan from '../../../shared/auth/useCan';
import { useToast } from '../../../shared/context/ToastContext';
import { PERMISSIONS } from '../../../shared/permissions/registry';

const STATUS = {
  new:               { label: "New",               tone: "bg-sky-50 text-sky-700 border-sky-200" },
  new_lead:          { label: "New Lead",          tone: "bg-sky-50 text-sky-700 border-sky-200" },
  lead_in_progress:  { label: "Lead In Progress",  tone: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  in_progress:       { label: "In progress",       tone: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  opportunity:       { label: "Opportunity",       tone: "bg-blue-50 text-blue-700 border-blue-200" },
  qualifying:        { label: "Qualifying",        tone: "bg-purple-50 text-purple-700 border-purple-200" },
  estimate_ready:    { label: "Estimate Ready",    tone: "bg-violet-50 text-violet-700 border-violet-200" },
  quoted:            { label: "Quoted",            tone: "bg-violet-50 text-violet-700 border-violet-200" },
  estimate:          { label: "Estimate",          tone: "bg-violet-50 text-violet-700 border-violet-200" },
  negotiating:       { label: "Negotiating",       tone: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200" },
  booked:            { label: "Booked",            tone: "bg-amber-50 text-amber-800 border-amber-200" },
  confirmed:         { label: "Confirmed",         tone: "bg-teal-50 text-teal-800 border-teal-200" },
  job:               { label: "Job",               tone: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  completed:         { label: "Completed",         tone: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  follow_up:         { label: "Follow-up",         tone: "bg-orange-50 text-orange-800 border-orange-200" },
  lost:              { label: "Lost",              tone: "bg-rose-50 text-rose-700 border-rose-200" },
  canceled:          { label: "Canceled",          tone: "bg-red-50 text-red-700 border-red-200" },
  draft:             { label: "Draft",             tone: "bg-cyan-50 text-cyan-800 border-cyan-200" },
  pending:           { label: "Pending",           tone: "bg-cyan-50 text-cyan-800 border-cyan-200" },
};

const TABS = [
  { id: "dashboard",       label: "Dashboard"     },
  { id: "new-leads",       label: "New Leads"     },
  { id: "leads",           label: "Leads & Opportunities" },
  { id: "booked",          label: "Booked"        },
  { id: "confirmed",       label: "Confirmed"     },
  { id: "completed",       label: "Completed"     },
  { id: "follow-up",       label: "Follow-up"     },
  { id: "lost-leads",      label: "Lost Leads"    },
  { id: "all-leads",       label: "All Leads"     },
];

const TASK_TYPE_OPTIONS = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'Text/SMS' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'general', label: 'General' },
];

const CALL_OUTCOME_OPTIONS = [
  'Busy',
  'No Answer',
  'Wrong Number',
  'Left live message',
  'Left voicemail',
  'Connected',
  'Number disconnected',
];

const LEAD_TAB_IDS = new Set(['all-leads', 'leads', 'new-leads']);

const SELECTABLE_ROW_TYPES = new Set(['lead', 'opportunity', 'task']);
const EMPTY_EMAIL_TEMPLATE = { id: '', name: 'Custom message', subject: '', body_html: '' };
const SALES_TABLE_STATE_STORAGE_KEY = 'crm.sales.table.state.v1';
const SALES_TABLE_STATE_STORAGE_PREFIX = 'crm.sales.table.state.v1.company:';

const DASH_DATE_RANGE_LABELS = {
  today: 'Today',
  yesterday: 'Yesterday',
  seven_days: '7 Days',
  thirty_days: '30 Days',
};

function asList(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.results)) return res.results;
  if (Array.isArray(res?.data?.results)) return res.data.results;
  return [];
}

function normalizeLookupItems(res) {
  return asList(res)
    .map((item) => ({
      ...item,
      value: String(item?.id ?? item?.code ?? item?.value ?? item?.label ?? item?.name ?? '').trim(),
      label: String(item?.label ?? item?.name ?? item?.code ?? item?.value ?? '').trim(),
    }))
    .filter((item) => item.value || item.label);
}

function normalizeMetadataUsers(rawUsers = []) {
  return asList(rawUsers).map((user) => ({
    ...user,
    full_name:
      user?.full_name ||
      `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
  }));
}

function formatDashboardScope(branchName, userName, dashDateRange) {
  const periodLabel = DASH_DATE_RANGE_LABELS[dashDateRange] || 'Selected period';
  return `${branchName || 'All Branches'} · ${userName || 'All users'} · ${periodLabel}`;
}

function buildDashboardScopeParams(branchId, assignedUserId, startDate, endDate) {
  const params = {
    branch: branchId || undefined,
    assigned_user: assignedUserId || '',
  };
  if (assignedUserId) {
    params.assigned_to = assignedUserId;
  }
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  return params;
}

const getActiveCompanyStorageKeySuffix = () => {
  if (typeof window === 'undefined') return 'global';
  return String(window.localStorage.getItem('active_company_id') || 'global');
};

const getSalesTableStateStorageKey = () => `${SALES_TABLE_STATE_STORAGE_PREFIX}${getActiveCompanyStorageKeySuffix()}`;

function readSalesTableState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(getSalesTableStateStorageKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function writeSalesTableState(payload) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(getSalesTableStateStorageKey(), JSON.stringify(payload));
  } catch {
    // ignore storage failures
  }
}

function getNextPageNumber(response) {
  const nextValue = response?.next;
  if (!nextValue) return null;
  try {
    const parsed = new URL(nextValue, window.location.origin);
    const pageValue = Number(parsed.searchParams.get('page') || 0);
    return Number.isFinite(pageValue) && pageValue > 0 ? pageValue : null;
  } catch {
    return null;
  }
}

const normalizeStatusValue = (value) => String(value ?? '').trim().toLowerCase();
const normalizeFilterText = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
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

const dedupeLeadOpportunityRows = (rows = []) => {
  const linkedLeadIds = new Set(
    rows
      .filter((row) => String(row?.row_type || '').toLowerCase() === 'opportunity')
      .map((row) => Number(row?.lead_id || 0))
      .filter(Boolean)
  );

  return rows.filter((row) => {
    const isLeadRow = String(row?.row_type || '').toLowerCase() === 'lead';
    if (!isLeadRow) return true;
    return !linkedLeadIds.has(Number(row?.lead_id || row?.id || 0));
  });
};

const getStatusPillColorStyle = (colorHex) => {
  const normalized = normalizeColorValue(colorHex);
  if (!normalized) return null;
  return {
    backgroundColor: `color-mix(in srgb, ${normalized} 14%, white)`,
    borderColor: `color-mix(in srgb, ${normalized} 28%, white)`,
    color: normalized,
  };
};

const buildStatusFilterGroups = (activeTab, metadata) => {
  const internalStatuses = normalizeLookupItems(metadata?.statusLookups)
    .filter((status) => status && status.is_active !== false)
    .map((status) => ({
      value: status.value,
      label: status.label || 'Status',
    }))
    .filter((status) => status.value);

  if (activeTab === 'follow-up') {
    return [
      {
        label: 'Task Status',
        options: [
          { value: 'pending', label: 'Pending' },
          { value: 'completed', label: 'Completed' },
        ],
      },
    ];
  }

  if (activeTab === 'lost-leads') {
    return [
      {
        label: 'Status',
        options: [
          { value: 'lost', label: 'Lost' },
        ],
      },
    ];
  }

  if (activeTab === 'all-leads' || activeTab === 'new-leads') {
    return [
      ...(internalStatuses.length ? [{ label: 'Internal Statuses', options: internalStatuses }] : []),
    ];
  }

  if (activeTab === 'leads') {
    return [
      ...(internalStatuses.length ? [{ label: 'Internal Statuses', options: internalStatuses }] : []),
    ];
  }

  return [
    ...(internalStatuses.length ? [{ label: 'Internal Statuses', options: internalStatuses }] : []),
  ];
};

const flattenStatusFilterValues = (groups) =>
  new Set(
    groups
      .flatMap((group) => group.options || [])
      .map((option) => normalizeStatusValue(option.value))
      .filter(Boolean)
  );

const PAGE_SIZE = 50;
const SALES_FILTER_STORAGE_KEY = 'crm:sales-filter-state:v1';
const SALES_FILTER_STORAGE_PREFIX = 'crm:sales-filter-state:v1.company:';

const getSalesFilterStorageKey = () => `${SALES_FILTER_STORAGE_PREFIX}${getActiveCompanyStorageKeySuffix()}`;

const readSavedSalesFilterState = () => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(getSalesFilterStorageKey());
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      branch: String(parsed?.branch || ''),
      assigned_to: String(parsed?.assigned_to || ''),
    };
  } catch {
    return {};
  }
};

const writeSavedSalesFilterState = (state) => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      getSalesFilterStorageKey(),
      JSON.stringify({
        branch: String(state?.branch || ''),
        assigned_to: String(state?.assigned_to || ''),
      }),
    );
  } catch {
    // Ignore storage failures.
  }
};

const LEAD_ORDER_STORAGE_KEY = 'crm:sales-branch-lead-order:v1';
const LEAD_ORDER_STORAGE_PREFIX = 'crm:sales-branch-lead-order:v1.company:';

const getLeadOrderStorageKey = () => `${LEAD_ORDER_STORAGE_PREFIX}${getActiveCompanyStorageKeySuffix()}`;

const readSavedBranchLeadOrders = () => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(getLeadOrderStorageKey());
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeSavedBranchLeadOrders = (orders) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getLeadOrderStorageKey(), JSON.stringify(orders || {}));
  } catch {
    // Ignore storage failures.
  }
};

const clearSalesCompanyStorage = () => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(SALES_TABLE_STATE_STORAGE_KEY);
  window.sessionStorage.removeItem(getSalesTableStateStorageKey());
  window.sessionStorage.removeItem(SALES_FILTER_STORAGE_KEY);
  window.sessionStorage.removeItem(getSalesFilterStorageKey());
  window.localStorage.removeItem(LEAD_ORDER_STORAGE_KEY);
  window.localStorage.removeItem(getLeadOrderStorageKey());
};

const getLeadRowIds = (items = []) =>
  items
    .filter((item) => String(item?.row_type || '').toLowerCase() === 'lead')
    .map((item) => String(item?.id || ''))
    .filter(Boolean);

const resolveOrderedLeadRows = (items = [], savedOrders = {}, branchId = '') => {
  if (!branchId) return items;
  const branchOrder = Array.isArray(savedOrders?.[branchId]) ? savedOrders[branchId] : [];
  const leadItems = items.filter((item) => String(item?.row_type || '').toLowerCase() === 'lead');
  if (!leadItems.length) return items;

  const currentLeadIds = getLeadRowIds(items);
  const orderedLeadIds = [];
  const seen = new Set();
  for (const id of [...branchOrder.map(String), ...currentLeadIds]) {
    const normalized = String(id);
    if (!currentLeadIds.includes(normalized) || seen.has(normalized)) continue;
    orderedLeadIds.push(normalized);
    seen.add(normalized);
  }

  const leadItemMap = new Map(leadItems.map((item) => [String(item.id), item]));
  const orderedLeadItems = orderedLeadIds.map((id) => leadItemMap.get(id)).filter(Boolean);
  const remainingLeadItems = leadItems.filter((item) => !orderedLeadIds.includes(String(item.id)));
  const resolvedLeadItems = [...orderedLeadItems, ...remainingLeadItems];

  const reorderedItems = [];
  const leadQueue = resolvedLeadItems.slice();
  for (const item of items) {
    if (String(item?.row_type || '').toLowerCase() === 'lead') {
      const replacement = leadQueue.shift();
      reorderedItems.push(replacement || item);
    } else {
      reorderedItems.push(item);
    }
  }

  return reorderedItems;
};

const normalizeDisplayText = (value) => {
  const text = String(value || '').trim();
  if (!text || text === '-' || text === '—') return '';
  return text;
};

const parseDateOnly = (value) => {
  if (!value) return null;
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const daysUntil = (moveDate) => {
  if (!moveDate) return null;
  const d = parseDateOnly(moveDate);
  if (!d) return null;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.ceil((target - start) / (1000 * 60 * 60 * 24));
  return diff;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = parseDateOnly(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const formatShortDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = parseDateOnly(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString("en-CA", {
    year: "2-digit",
    month: "numeric",
    day: "numeric",
  });
};

const formatRelativeAge = (dateStr) => {
  if (!dateStr) return '-';
  const d = parseDateTime(dateStr) || parseDateOnly(dateStr);
  if (!d) return dateStr;
  const diffMs = Date.now() - d.getTime();
  const absMs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (absMs < hour) {
    const minutes = Math.max(1, Math.round(absMs / minute));
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  if (absMs < day) {
    const hours = Math.max(1, Math.round(absMs / hour));
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  const days = Math.max(1, Math.round(absMs / day));
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

const formatContactLabel = (dateStr) => {
  if (!dateStr) return '-';
  const parsed = (() => {
    const value = parseDateTime(dateStr) || parseDateOnly(dateStr);
    if (value && isValid(value)) return value;
    const isoValue = parseISO(String(dateStr));
    return isValid(isoValue) ? isoValue : null;
  })();
  if (!parsed) return dateStr;
  return formatDistanceToNowStrict(parsed, { addSuffix: true });
};

const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
  }).format(val || 0);
};

const getErrorMessage = (err, fallback = 'Request failed.') => {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (typeof data.detail === 'string') return data.detail;
  if (typeof data.message === 'string') return data.message;
  const firstKey = Object.keys(data)[0];
  if (!firstKey) return fallback;
  const firstVal = data[firstKey];
  if (Array.isArray(firstVal) && firstVal.length) return String(firstVal[0]);
  if (typeof firstVal === 'string') return firstVal;
  return fallback;
};

const formatDateTimeLocalInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const splitFollowUpNotes = (item) => {
  const rawNotes = String(item?.notes || '').trim();
  const fallbackSubject = String(item?.subject || 'Follow-up task').trim();
  if (!rawNotes) return { subject: fallbackSubject, notes: '' };
  const [firstLine, ...rest] = rawNotes.split('\n');
  return {
    subject: String(firstLine || fallbackSubject).trim(),
    notes: rest.join('\n').trim(),
  };
};

const buildFollowUpNotes = ({ subject, notes }) => {
  const cleanSubject = String(subject || '').trim();
  const cleanNotes = String(notes || '').trim();
  return [cleanSubject, cleanNotes].filter(Boolean).join('\n');
};

const getUserBranchIds = (user) => {
  if (!user) return [];
  const ids = new Set();
  const addId = (value) => {
    if (value === null || value === undefined || value === '') return;
    ids.add(String(value));
  };

  if (Array.isArray(user.branches)) {
    user.branches.forEach((branch) => {
      if (branch && typeof branch === 'object') addId(branch.id ?? branch.branch_id ?? branch.value);
      else addId(branch);
    });
  }

  if (Array.isArray(user.branch_details)) {
    user.branch_details.forEach((branch) => {
      if (branch && typeof branch === 'object') addId(branch.id ?? branch.branch_id ?? branch.value);
      else addId(branch);
    });
  }

  if (user.branch) {
    if (typeof user.branch === 'object') addId(user.branch.id ?? user.branch.branch_id ?? user.branch.value);
    else addId(user.branch);
  }

  return Array.from(ids);
};

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const getInitialSalesTab = (location, routeTabSegment) => {
  const requestedTab = location?.state?.activeTab;
  if (requestedTab) {
    return requestedTab === 'opportunities' ? 'leads' : requestedTab;
  }

  const routeTab = getSalesListTabFromSegment(routeTabSegment);
  if (routeTab) return routeTab;

  const pathname = String(location?.pathname || '');
  if (pathname.includes('all-leads')) return 'all-leads';
  if (pathname.includes('new-leads')) return 'new-leads';
  if (pathname.includes('follow-up')) return 'follow-up';
  if (pathname.includes('lost-leads')) return 'lost-leads';
  if (pathname.includes('/leads/table')) return 'leads';
  if (pathname.includes('leads')) return 'leads';
  return 'leads';
};

const compactName = (...parts) => parts
  .map((part) => String(part || '').trim())
  .filter(Boolean)
  .join(' ');

const resolvePersonName = (...sources) => {
  for (const source of sources) {
    if (!source) continue;
    const name = String(
      source.name
      || source.full_name
      || source.display_name
      || compactName(source.first_name, source.last_name)
      || '',
    ).trim();
    if (name) return name;
  }
  return '—';
};

const resolveContactValue = (field, ...sources) => {
  for (const source of sources) {
    const value = String(source?.[field] || '').trim();
    if (value) return value;
  }
  return '—';
};

const resolveStatusLabel = (...sources) => {
  for (const source of sources) {
    if (!source) continue;
    const label = String(
      source.label
      || source.name
      || source.title
      || source.display_name
      || source.code
      || source.status
      || '',
    ).trim();
    if (label) return label;
  }
  return '—';
};

const normalizeTaskRow = (task, cache = {}) => {
  const relatedType = task.opportunity ? 'opportunity' : 'lead';
  const relatedId = task.opportunity || task.lead;
  const entity = task.related_record_details || cache[`${relatedType}-${relatedId}`] || {};

  const customerName = resolvePersonName(entity?.customer_details, entity?.customer, entity);
  const customerEmail = resolveContactValue('email', entity?.customer_details, entity?.customer, entity);
  const customerPhone = resolveContactValue('phone', entity?.customer_details, entity?.customer, entity);

  const taskStatus = String(task.activity_details?.status || task.activity?.status || 'pending').toLowerCase();
  
  let origin = '—';
  let destination = '—';
  if (relatedType === 'opportunity') {
    origin = normalizeDisplayText(entity?.origin) || normalizeDisplayText(entity?.stops && entity.stops.find(s => s.type === 'origin')?.city) || '—';
    destination = normalizeDisplayText(entity?.destination) || normalizeDisplayText(entity?.stops && entity.stops.find(s => s.type === 'destination')?.city) || '—';
  } else {
    origin = normalizeDisplayText(entity?.origin) || '—';
    destination = normalizeDisplayText(entity?.destination) || '—';
  }

  return {
    id: task.id,
    row_type: 'task',
    task_id: task.id,
    activity_id: task.activity_details?.id || task.activity?.id || task.activity,
    task_type: task.task_type || 'general',
    due_date: task.due_date || '',
    subject: task.activity_details?.subject || task.activity?.subject || String(task.notes || '').split('\n')[0] || 'Follow-up task',
    notes: task.notes || task.activity_details?.description || '',
    status: taskStatus,
    status_label: taskStatus === 'completed' ? 'Completed' : 'Pending',
    assigned_user_id: task.assigned_to_details?.id || task.assigned_to || '',
    assigned_user_name: task.assigned_to_details ? `${task.assigned_to_details.first_name} ${task.assigned_to_details.last_name}`.trim() : '—',
    
    related_type: relatedType,
    related_id: relatedId,
    sales_number: entity?.sales_number || null,
    display_number: entity?.display_number || entity?.sales_number || (relatedType === 'opportunity' ? `OPP-${relatedId}` : `LEAD-${relatedId}`),
    name: customerName,
    email: customerEmail,
    phone: customerPhone,
    origin,
    destination,
    move_size: entity?.move_size || '—',
    service_type: entity?.service_type || '—',
    move_date: entity?.move_date || '',
    created_at: entity?.created_at || task.due_date || '',
    activity_created_at: task.activity_details?.created_at || task.activity?.created_at || task.due_date || '',
    value: Number(entity?.value || entity?.estimate_value || entity?.lead_cost || 0),
    branch_id: entity?.branch_id || entity?.branch || '',
    source: entity?.source || '',
    branch_state: entity?.branch_state || '',
    status_values: [taskStatus].filter(Boolean),
    lead_status: entity?.status || 'new',
    lead_status_label: entity?.status_label || entity?.status || 'New',
    lead_status_color: entity?.status_color || null,
    lead_custom_status: resolveStatusLabel(
      entity?.custom_status_code_details,
      entity?.custom_status_details,
      {
        label: entity?.custom_status_label
          || entity?.custom_status
          || entity?.workflow_stage_label
          || entity?.opp_status_label,
      },
    ),
    last_contacted_at: entity?.last_contacted_at || null,
  };
};

const isLostRecord = (item) => {
  if (!item || item.row_type === 'task') return false;
  const status = String(item.status || '').toLowerCase();
  const rawStatus = String(item.raw_status || '').toLowerCase();
  const leadStatus = String(item.lead_status || '').toLowerCase();
  const oppStatus = String(item.opp_status || '').toLowerCase();
  const customStatus = String(item.custom_status_code || '').toLowerCase();
  const customLabel = String(item.custom_status_label || '').toLowerCase();
  const statusLabel = String(item.status_label || '').toLowerCase();
  const workflowStage = String(item.workflow_stage || '').toLowerCase();

  return (
    status === 'lost' ||
    rawStatus === 'lost' ||
    leadStatus === 'lost' ||
    oppStatus === 'lost' ||
    customStatus === 'lost' ||
    workflowStage === 'lost' ||
    statusLabel === 'lost' ||
    customLabel === 'lost'
  );
};

const TaskActionMenu = ({ item, onToggleStatus, onEdit, onDelete }) => {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={menuRef} data-no-row-nav="true">
      <button
        type="button"
        aria-label={`Task actions for ${item.subject || item.display_number || 'follow-up'}`}
        title="Task actions"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-955 transition"
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-36 origin-top-right rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10 overflow-hidden">
          <div className="py-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onEdit?.(item);
              }}
              className="block w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                if (onToggleStatus) onToggleStatus(item);
              }}
              className="block w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {item.status === 'completed' ? 'Mark Pending' : 'Mark Complete'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onDelete?.(item);
              }}
              className="block w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const FollowUpTaskEditModal = ({ item, form, setForm, users, isSaving, onClose, onSave }) => {
  if (!item) return null;

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
  const labelCls = "text-[11px] font-bold uppercase tracking-wider text-slate-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4" data-no-row-nav="true">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-base font-black text-slate-900">Edit follow-up</h3>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{item.display_number} · {item.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close edit follow-up"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-4 px-5 py-5">
          <label className="grid gap-1.5">
            <span className={labelCls}>Subject</span>
            <input
              className={inputCls}
              value={form.subject}
              onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className={labelCls}>Task Type</span>
              <select
                className={inputCls}
                value={form.task_type}
                onChange={(e) => setForm((prev) => ({ ...prev, task_type: e.target.value }))}
              >
                {TASK_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5">
              <span className={labelCls}>Status</span>
              <select
                className={inputCls}
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className={labelCls}>Due Date</span>
              <input
                type="datetime-local"
                className={inputCls}
                value={form.due_date}
                onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
              />
            </label>

            <label className="grid gap-1.5">
              <span className={labelCls}>Assigned To</span>
              <select
                className={inputCls}
                value={form.assigned_to}
                onChange={(e) => setForm((prev) => ({ ...prev, assigned_to: e.target.value }))}
              >
                <option value="">Unassigned</option>
                {asList(users).map((user) => (
                  <option key={user.id} value={user.id}>
                    {[user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.email || `User #${user.id}`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="grid gap-1.5">
            <span className={labelCls}>Notes</span>
            <textarea
              className={`${inputCls} min-h-28 resize-y`}
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
            Save
          </button>
        </div>
      </div>
    </div>
  );
};


function StatusPill({ status, label, colorHex }) {
  const key = String(status || '').toLowerCase().replace(' ', '_');
  const s = STATUS[key] || { label: label || status || "New", tone: "bg-slate-100 text-slate-700 border-slate-200" };
  const colorStyle = getStatusPillColorStyle(colorHex);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${colorStyle ? '' : s.tone}`}
      style={colorStyle || undefined}
    >
      <span className="inline-block h-1 w-1 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

const ModalShell = ({
  title,
  subtitle,
  onClose,
  children,
  icon = null,
  accentClass = 'from-blue-600 via-cyan-500 to-sky-500',
  maxWidthClass = 'max-w-2xl',
}) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-md">
    <Card className={`w-full ${maxWidthClass} p-0 overflow-visible animate-in zoom-in duration-200 rounded-[28px] shadow-[0_30px_120px_rgba(15,23,42,0.28)] border border-white/20 bg-white/95`}>
      <div className={`h-1.5 bg-gradient-to-r ${accentClass}`} />
      <div className="border-b border-slate-100/90 bg-gradient-to-br from-white to-slate-50/70 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              {icon && (
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${accentClass} text-white shadow-lg shadow-slate-900/10`}>
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-xl font-black tracking-tight text-slate-950">{title}</h3>
                {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-slate-300 hover:text-slate-700 hover:shadow-md"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="bg-white px-6 py-6">{children}</div>
    </Card>
  </div>
);

const Field = ({ label, children }) => (
  <div className="space-y-1">
    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</label>
    {children}
  </div>
);



const PipelineRecordsPane = React.memo(function PipelineRecordsPane({
  activeTab,
  isLeadTab,
  showSelectionColumn,
  displayItems,
  filteredItemsLength,
  currentPage,
  totalPages,
  onGoToPage,
  onToggleTaskStatus,
  onEditTask,
  onDeleteTask,
  onRowClick,
  onRequestSort,
  getSortIcon,
  onAssignLead,
  selectedRecordKeys,
  onToggleRecordSelected,
  onToggleAllVisibleSelected,
  isLeadSortingEnabled,
  onReorderLeadRows,
  viewMode = 'table',
}) {
  const canNavigateRecord = useCallback((item) => {
    if (!item || item.row_type === 'task') return true;
    return true;
  }, [activeTab]);

  const visibleSelectableKeys = useMemo(
    () => displayItems
      .filter((item) => SELECTABLE_ROW_TYPES.has(String(item.row_type || '').toLowerCase()))
      .map((item) => `${item.row_type}:${item.id}`),
    [displayItems],
  );
  const allVisibleSelected = visibleSelectableKeys.length > 0 && visibleSelectableKeys.every((key) => selectedRecordKeys?.has(key));
  const dragLeadIdRef = useRef(null);

  const handleDragStart = useCallback((item) => {
    if (!isLeadSortingEnabled || String(item?.row_type || '').toLowerCase() !== 'lead') return;
    dragLeadIdRef.current = String(item.id);
  }, [isLeadSortingEnabled]);

  const handleDrop = useCallback((item) => {
    if (!isLeadSortingEnabled || String(item?.row_type || '').toLowerCase() !== 'lead') return;
    const sourceLeadId = dragLeadIdRef.current;
    if (!sourceLeadId || String(sourceLeadId) === String(item.id)) return;
    onReorderLeadRows?.(sourceLeadId, item.id);
    dragLeadIdRef.current = null;
  }, [isLeadSortingEnabled, onReorderLeadRows]);

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className={viewMode === 'cards' ? 'hidden' : 'block overflow-x-auto'}>
          <table className="w-full min-w-[1200px] divide-y divide-slate-200">
            <thead>
              {activeTab === 'follow-up' ? (
                <tr className="border-b border-slate-200 bg-slate-50/60">
                  {showSelectionColumn && (
                    <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 w-10">
                      <button
                        type="button"
                        data-no-row-nav="true"
                        onClick={onToggleAllVisibleSelected}
                        className="inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-700"
                        aria-label={allVisibleSelected ? 'Clear visible selection' : 'Select all visible records'}
                        title={allVisibleSelected ? 'Clear visible selection' : 'Select all visible records'}
                      >
                        {allVisibleSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Lead Number
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Lead Status
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Custom Status
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Customer Name
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Subject
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Due Date
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Assigned To
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Move Date
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Last Contacted
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              ) : (
                <tr className="border-b border-slate-200 bg-slate-50/60">
                  {showSelectionColumn && (
                    <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 w-10">
                      <button
                        type="button"
                        data-no-row-nav="true"
                        onClick={onToggleAllVisibleSelected}
                        className="inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-700"
                        aria-label={allVisibleSelected ? 'Clear visible selection' : 'Select all visible records'}
                        title={allVisibleSelected ? 'Clear visible selection' : 'Select all visible records'}
                      >
                        {allVisibleSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </th>
                  )}
                  <th
                    className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-700"
                    onClick={() => onRequestSort('sales_number')}
                  >
                    <div className="flex items-center gap-1">
                      ID {getSortIcon('sales_number')}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-700"
                    onClick={() => onRequestSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      Status {getSortIcon('status')}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-700"
                    onClick={() => onRequestSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Customer {getSortIcon('name')}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Route
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Details
                  </th>
                  <th
                    className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-700"
                    onClick={() => onRequestSort('move_date')}
                  >
                    <div className="flex items-center gap-1">
                      Move Dates {getSortIcon('move_date')}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-700"
                    onClick={() => onRequestSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                      Received {getSortIcon('created_at')}
                    </div>
                  </th>
                  {!isLeadTab && (
                    <th
                      className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-700"
                      onClick={() => onRequestSort('value')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Value {getSortIcon('value')}
                      </div>
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Last Contacted
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Assigned User
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeTab === 'follow-up' ? (
                displayItems.map((item) => {
                  const isOverdue = item.status !== 'completed' && item.due_date && new Date(item.due_date) < new Date();
                  return (
                    <tr
                      key={`task-${item.id}`}
                      onClick={(e) => onRowClick(item, e)}
                      className={`cursor-pointer transition-colors hover:bg-slate-50/80 ${isOverdue ? "bg-red-50/10" : ""}`}
                    >
                      {showSelectionColumn && (
                        <td className="px-3 py-3.5" data-no-row-nav="true">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleRecordSelected(item);
                            }}
                            className="inline-flex items-center justify-center text-slate-500 hover:text-slate-700"
                            aria-label={selectedRecordKeys?.has(`task:${item.id}`) ? `Deselect follow-up` : `Select follow-up`}
                            title={selectedRecordKeys?.has(`task:${item.id}`) ? `Deselect follow-up` : `Select follow-up`}
                          >
                            {selectedRecordKeys?.has(`task:${item.id}`) ? <CheckSquare size={16} /> : <Square size={16} />}
                          </button>
                        </td>
                      )}
                      <td className="px-4 py-3.5">
                        <div className="font-mono text-xs font-bold text-blue-600 hover:underline">
                          {item.display_number}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusPill status={item.lead_status} label={item.lead_status_label} colorHex={item.lead_status_color} />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-xs font-medium text-slate-700">
                          {item.lead_custom_status || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-sm font-bold text-slate-900">{item.name}</div>
                      </td>
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="text-sm font-bold text-slate-900 truncate">
                          {item.notes ? item.notes.split('\n')[0] : 'Follow-up task'}
                        </div>
                        {item.notes && item.notes.includes('\n') && (
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {item.notes.split('\n').slice(1).join(' ')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className={`text-xs font-semibold flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-slate-900'}`}>
                          <Calendar size={12} className="text-slate-400" />
                          {formatDate(item.due_date)} {item.due_date ? new Date(item.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                        {isOverdue && <div className="text-[10px] text-red-500 font-bold mt-0.5">Overdue</div>}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-xs font-medium text-slate-700">
                          {item.assigned_user_name}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-xs font-semibold text-slate-900 flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400" />
                          {formatDate(item.move_date)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {item.last_contacted_at ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium text-slate-800">
                            <Clock size={12} className="text-slate-400 shrink-0" />
                            <span>{formatContactLabel(item.last_contacted_at)}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <TaskActionMenu
                          item={item}
                          onToggleStatus={onToggleTaskStatus}
                          onEdit={onEditTask}
                          onDelete={onDeleteTask}
                        />
                      </td>
                    </tr>
                  );
                })
              ) : (
                displayItems.map((item) => {
                  const isUrgent = String(item.priority).toLowerCase() === "hot" || (daysUntil(item.move_date) !== null && daysUntil(item.move_date) <= 3);
                  const canNavigate = canNavigateRecord(item);
                  return (
                    <tr
                      key={`${item.row_type}-${item.id}`}
                      draggable={isLeadSortingEnabled && String(item.row_type || '').toLowerCase() === 'lead'}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        handleDragStart(item);
                      }}
                      onDragOver={(e) => {
                        if (isLeadSortingEnabled && String(item.row_type || '').toLowerCase() === 'lead') {
                          e.preventDefault();
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDrop(item);
                      }}
                      onDragEnd={() => {
                        dragLeadIdRef.current = null;
                      }}
                      onClick={(e) => onRowClick(item, e)}
                      className={`transition-colors hover:bg-slate-50/80 ${canNavigate ? 'cursor-pointer' : 'cursor-default'} ${isUrgent ? "bg-red-50/20" : ""} ${isLeadSortingEnabled && String(item.row_type || '').toLowerCase() === 'lead' ? 'cursor-grab' : ''}`}
                    >
                      {showSelectionColumn && (
                        <td className="px-3 py-3.5" data-no-row-nav="true">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleRecordSelected(item);
                            }}
                            className="inline-flex items-center justify-center text-slate-500 hover:text-slate-700"
                            aria-label={selectedRecordKeys?.has(`${item.row_type}:${item.id}`) ? `Deselect ${item.name}` : `Select ${item.name}`}
                            title={selectedRecordKeys?.has(`${item.row_type}:${item.id}`) ? `Deselect ${item.name}` : `Select ${item.name}`}
                          >
                            {selectedRecordKeys?.has(`${item.row_type}:${item.id}`) ? <CheckSquare size={16} /> : <Square size={16} />}
                          </button>
                        </td>
                      )}
                      <td className="px-4 py-3.5">
                        <div className="font-mono text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          {item.display_number}
                          {isUrgent && <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" title="Urgent Lead" />}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusPill status={item.status} label={item.status_label} colorHex={item.status_color} />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-slate-900">{item.name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-slate-900">{item.origin || "TBD"}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-900">{item.destination || "TBD"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-xs font-semibold text-slate-900">{item.move_size || "Size TBD"}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-xs font-semibold text-slate-900 flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400" />
                          {formatDate(item.move_date)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-xs font-semibold text-slate-900 flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400" />
                          {formatDate(item.created_at)}
                        </div>
                      </td>
                      {!isLeadTab && (
                        <td className="px-4 py-3.5 text-right font-mono text-sm font-bold text-slate-900 tabular-nums">
                          {formatCurrency(item.value || item.lead_cost)}
                        </td>
                      )}
                      <td className="px-4 py-3.5">
                        {item.source ? (
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-800">
                            <Globe size={12} className="text-slate-500 shrink-0" />
                            {item.source}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {item.last_contacted_at ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium text-slate-800">
                            <Clock size={12} className="text-slate-400 shrink-0" />
                            <span>{formatContactLabel(item.last_contacted_at)}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end" data-no-row-nav="true">
                          {item.assigned_user_name ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAssignLead(item);
                              }}
                              className="inline-flex items-center gap-2 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 pl-1.5 pr-3 py-1 text-xs font-bold text-slate-700 transition"
                              title="Reassign lead"
                            >
                              <div className="w-5 h-5 rounded-full bg-slate-955 text-white flex items-center justify-center text-[9px] font-black shrink-0">
                                {getInitials(item.assigned_user_name)}
                              </div>
                              <span className="truncate max-w-[120px]">{item.assigned_user_name}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAssignLead(item);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition"
                              title="Assign lead"
                            >
                              <User size={12} />
                              Assign
                              <ArrowRight className="w-3 h-3 ml-0.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
              {filteredItemsLength === 0 && (
                <tr>
                  <td colSpan={activeTab === 'follow-up' ? 8 : (isLeadTab ? 12 : 13)} className="px-4 py-16 text-center">
                    <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400 border border-slate-100">
                      <SearchX className="w-6 h-6" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-700">No matching records found</p>
                    <p className="mt-1 text-xs text-slate-500">Try clearing filters or adjusting your search phrase.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={viewMode === 'cards' ? 'block bg-slate-50/45' : 'hidden'}>
          <ul className="space-y-3 p-3">
            {activeTab === 'follow-up' ? (
              displayItems.map((item) => {
                const isOverdue = item.status !== 'completed' && item.due_date && new Date(item.due_date) < new Date();
                return (
                  <li
                    key={`task-${item.id}`}
                    onClick={(e) => onRowClick(item, e)}
                    className={`bg-white rounded-xl border p-4 transition-all hover:shadow-md cursor-pointer relative overflow-hidden flex flex-col gap-3 ${
                      isOverdue 
                        ? "border-rose-200 hover:border-rose-350 shadow-sm shadow-rose-50/40" 
                        : "border-slate-200/90 shadow-sm"
                    }`}
                  >
                    {isOverdue && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-rose-600" />
                    )}
                    
                    {/* Header: ID, Lead Status, TaskActionMenu */}
                    <div className="flex items-center justify-between gap-2 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-black tracking-wider text-blue-600 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100/70">
                          {item.display_number}
                        </span>
                        <StatusPill status={item.lead_status} label={item.lead_status_label} colorHex={item.lead_status_color} />
                      </div>
                      <TaskActionMenu
                        item={item}
                        onToggleStatus={onToggleTaskStatus}
                        onEdit={onEditTask}
                        onDelete={onDeleteTask}
                      />
                    </div>

                    {/* Customer Info Box */}
                    <div className="flex flex-col gap-2 bg-slate-50/60 rounded-xl p-2.5 border border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-black shrink-0">
                            {getInitials(item.name)}
                          </div>
                          <div className="text-xs font-bold text-slate-800 truncate max-w-[150px]">{item.name}</div>
                        </div>
                        <div className="text-[10px] font-medium text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-150 shadow-sm">
                          {item.lead_custom_status || '—'}
                        </div>
                      </div>
                      <div className="text-xs text-slate-700 font-semibold leading-snug">
                        {item.notes ? item.notes.split('\n')[0] : 'Follow-up task'}
                      </div>
                      {item.notes && item.notes.includes('\n') && (
                        <div className="text-[10px] text-slate-500 leading-normal max-h-16 overflow-y-auto whitespace-pre-line">
                          {item.notes.split('\n').slice(1).join('\n')}
                        </div>
                      )}
                    </div>

                    {/* Dates & Agent */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-medium">
                      <div className="flex items-center gap-1">
                        <Calendar size={11} className="text-slate-400" />
                        <span>Move: <strong className="text-slate-700">{formatDate(item.move_date)}</strong></span>
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        <Clock size={11} className="text-slate-400" />
                        <span>
                          Contact: <strong className="text-slate-700">{item.last_contacted_at ? formatContactLabel(item.last_contacted_at) : '—'}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Footer: Due date & Assigned To */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 mt-0.5">
                      <div className="flex flex-col">
                        <div className={`text-[11px] font-bold flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-slate-800'}`}>
                          <Calendar size={11} className={isOverdue ? 'text-red-500' : 'text-slate-400'} />
                          <span>Due: {formatDate(item.due_date)} {item.due_date ? new Date(item.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                        {isOverdue && <span className="text-[9px] text-red-500 font-bold uppercase tracking-wider mt-0.5 ml-4">Overdue</span>}
                      </div>
                      <div className="flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-full text-[9px] border border-slate-200/40">
                        <User size={10} className="text-slate-400" />
                        {item.assigned_user_name}
                      </div>
                    </div>
                  </li>
                );
              })
            ) : (
              displayItems.map((item) => {
                const isUrgent = String(item.priority).toLowerCase() === "hot" || (daysUntil(item.move_date) !== null && daysUntil(item.move_date) <= 3);
                const canNavigate = canNavigateRecord(item);
                return (
                  <li
                    key={`${item.row_type}-${item.id}`}
                    onClick={(e) => onRowClick(item, e)}
                    className={`bg-white rounded-xl border p-4 transition-all hover:shadow-md relative overflow-hidden flex flex-col gap-3 ${
                      canNavigate ? 'cursor-pointer' : 'cursor-default'
                    } ${
                      isUrgent 
                        ? "border-rose-200 hover:border-rose-350 shadow-sm shadow-rose-50/40" 
                        : "border-slate-200/90 shadow-sm"
                    }`}
                  >
                    {isUrgent && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-rose-600" />
                    )}
                    {showSelectionColumn && (
                      <div className="absolute top-3 right-3 z-10" data-no-row-nav="true">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleRecordSelected(item);
                          }}
                          className="inline-flex items-center justify-center rounded-md bg-white/90 p-1.5 text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-slate-700"
                          aria-label={selectedRecordKeys?.has(`${item.row_type}:${item.id}`) ? `Deselect ${item.name}` : `Select ${item.name}`}
                          title={selectedRecordKeys?.has(`${item.row_type}:${item.id}`) ? `Deselect ${item.name}` : `Select ${item.name}`}
                        >
                          {selectedRecordKeys?.has(`${item.row_type}:${item.id}`) ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                      </div>
                    )}

                    {/* Header: ID, Status Badge & Value */}
                    <div className="flex items-center justify-between gap-2 pr-10">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-black tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
                          {item.display_number}
                        </span>
                        {isUrgent && (
                          <span className="inline-flex items-center gap-1 rounded bg-red-50 border border-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-600 uppercase tracking-wider">
                            Urgent
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!isLeadTab && (
                          <span className="font-mono text-xs font-black text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                            {formatCurrency(item.value || item.lead_cost)}
                          </span>
                        )}
                        <StatusPill status={item.status} label={item.status_label} colorHex={item.status_color} />
                      </div>
                    </div>

                    {/* Customer Details */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                        {getInitials(item.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-slate-900 truncate tracking-tight">{item.name}</h4>
                      </div>
                    </div>

                    {/* Route Details */}
                    <div className="bg-slate-50/80 rounded-xl p-2.5 flex items-center justify-between text-[11px] border border-slate-100 gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span className="font-bold text-slate-800 truncate">{item.origin || "TBD"}</span>
                        <ArrowRight size={11} className="text-slate-355 shrink-0 mx-0.5" />
                        <span className="font-bold text-slate-800 truncate">{item.destination || "TBD"}</span>
                      </div>
                      <div className="text-[10px] text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-150 shrink-0 font-semibold shadow-2xs">
                        {item.move_size || "Size TBD"}
                      </div>
                    </div>

                    {/* Move size/details, dates */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-400 shrink-0" />
                        <span>Move: <strong className="text-slate-800 font-bold">{formatDate(item.move_date)}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        <Clock size={12} className="text-slate-400 shrink-0" />
                        <span>Recv: <strong className="text-slate-700 font-normal">{formatDate(item.created_at)}</strong></span>
                      </div>
                    </div>

                    {/* Footer: Source / Last Contacted and Quick Actions */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 mt-0.5">
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[9px] font-bold text-slate-500">
                        {item.source ? (
                          <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/70 rounded px-1.5 py-0.5 text-slate-600">
                            <Globe size={10} className="text-slate-400" />
                            {item.source}
                          </span>
                        ) : (
                          <span className="text-slate-400">No source</span>
                        )}
                        {item.last_contacted_at && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600">
                            <Clock size={10} className="text-slate-400" />
                            {formatContactLabel(item.last_contacted_at)}
                          </span>
                        )}
                      </div>

                      <div data-no-row-nav="true" className="flex items-center gap-2">
                        {item.assigned_user_name ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAssignLead(item);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-200 pl-1 py-0.5 pr-2.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition-all shadow-2xs"
                            title="Reassign lead"
                          >
                            <div className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[8px] font-black shrink-0">
                              {getInitials(item.assigned_user_name)}
                            </div>
                            <span className="truncate max-w-[80px]">{item.assigned_user_name}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAssignLead(item);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-755 transition-all shadow-sm"
                            title="Assign lead"
                          >
                            <User size={12} className="text-slate-500" />
                            Assign
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
          <div className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-900">{displayItems.length}</span> of <span className="font-semibold text-slate-900">{filteredItemsLength}</span> records
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => onGoToPage(currentPage - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <span className="text-xs font-medium text-slate-500">
              Page <span className="font-bold text-slate-950">{currentPage}</span> of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => onGoToPage(currentPage + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

const AssignModal = ({ lead, onClose, onAssign, branches, users, isAssigning, readOnly }) => {
  const [branchId, setBranchId] = useState(lead?.branch_id || '');
  const [userId, setUserId] = useState(lead?.assigned_user_id || '');
  const [branchUsers, setBranchUsers] = useState([]);
  const [branchUsersLoading, setBranchUsersLoading] = useState(false);

  const filteredUsers = useMemo(() => {
    const sourceUsers = branchId && branchUsers.length ? branchUsers : users;
    if (!branchId) return sourceUsers;
    const selectedBranchId = String(branchId).trim();
    return sourceUsers.filter((u) => getUserBranchIds(u).includes(selectedBranchId));
  }, [branchId, branchUsers, users]);

  useEffect(() => {
    let active = true;
    const loadBranchUsers = async () => {
      const selectedBranchId = String(branchId || '').trim();
      if (!selectedBranchId) {
        setBranchUsers([]);
        return;
      }
      setBranchUsersLoading(true);
      try {
        const res = await getLookupUsers({ branch: selectedBranchId, limit: 100 });
        if (!active) return;
        setBranchUsers(normalizeMetadataUsers(res));
      } catch {
        if (active) setBranchUsers([]);
      } finally {
        if (active) setBranchUsersLoading(false);
      }
    };

    loadBranchUsers();
    return () => {
      active = false;
    };
  }, [branchId]);

  return (
    <ModalShell
      title={readOnly ? "Assignment Details" : "Assign Lead"}
      subtitle={readOnly ? "Current branch and assignee details." : "Move this record to another branch or owner."}
      icon={<User size={18} />}
      accentClass="from-slate-900 via-blue-600 to-cyan-500"
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white font-black text-lg shadow-lg shadow-blue-500/20">
              {getInitials(lead?.name)}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Selected Record</div>
              <h4 className="mt-1 truncate text-base font-black text-slate-950">{lead?.name}</h4>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex rounded-full bg-white px-2.5 py-1 font-mono font-bold text-blue-700 ring-1 ring-blue-100">
                  {lead?.display_number}
                </span>
                {lead?.email && <span className="text-slate-500">{lead.email}</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Target Branch">
            <select
              disabled={readOnly}
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                setUserId('');
              }}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              <option value="">Select Branch...</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>

          <Field label="Sales Agent">
            <select
              disabled={readOnly}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              title={branchId ? 'Users in the selected branch' : 'Select a branch first to filter users'}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              <option value="">{branchUsersLoading ? 'Loading staff...' : 'Select Staff...'}</option>
              {filteredUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.first_name} {u.last_name} ({u.email})
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex gap-3 pt-1">
          {readOnly ? (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-white transition hover:bg-slate-900"
            >
              Close
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onAssign(branchId, userId)}
                disabled={isAssigning || !branchId}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAssigning ? <Loader2 size={14} className="animate-spin" /> : <User size={14} />}
                Confirm
              </button>
            </>
          )}
        </div>
      </div>
    </ModalShell>
  );
};

const BulkAssignModal = ({ selectedCount, branches, users, form, setForm, onClose, onConfirm, isLoading }) => {
  const filteredUsers = useMemo(() => {
    if (!form.branch) return users;
    const selectedBranchId = String(form.branch).trim();
    return users.filter((user) => getUserBranchIds(user).includes(selectedBranchId));
  }, [form.branch, users]);

  return (
    <ModalShell
      title={`Assign ${selectedCount} record${selectedCount === 1 ? '' : 's'}`}
      icon={<Users size={18} />}
      accentClass="from-slate-900 via-slate-700 to-slate-500"
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Target Branch">
            <select
              value={form.branch}
              onChange={(e) => setForm((prev) => ({ ...prev, branch: e.target.value, assigned_to: '' }))}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/10 cursor-pointer"
            >
              <option value="">Keep current branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Sales Agent">
            <select
              value={form.assigned_to}
              onChange={(e) => setForm((prev) => ({ ...prev, assigned_to: e.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/10 cursor-pointer"
            >
              <option value="">Keep current assignee</option>
              {filteredUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.first_name} {user.last_name} ({user.email})
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <Loader2 size={14} className="mx-auto animate-spin" /> : <Users size={14} />}
            Confirm
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

const BulkStatusModal = ({ selectedCount, options, value, setValue, onClose, onConfirm, isLoading }) => {
  const selectedOption = options.find((option) => option.value === value) || options[0] || null;
  return (
    <ModalShell
      title={`Custom Status (${selectedCount} record${selectedCount === 1 ? '' : 's'})`}
      icon={<CheckCircle2 size={18} />}
      accentClass="from-slate-900 via-slate-700 to-slate-500"
      onClose={onClose}
    >
      <div className="space-y-5">
        <Field label="Custom Status">
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/10 cursor-pointer"
          >
            <option value="">Select status...</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        {selectedOption && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Selected Status</div>
            <div className="mt-1 flex items-center gap-3">
              <span className="inline-flex h-3 w-3 rounded-full bg-slate-500 ring-4 ring-white shadow-sm" />
              <span className="text-sm font-black text-slate-950">{selectedOption.label}</span>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <Loader2 size={14} className="mx-auto animate-spin" /> : <CheckCircle2 size={14} />}
            Confirm
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

const BulkEmailModal = ({
  selectedCount,
  templates,
  selectedTemplateId,
  onTemplateChange,
  form,
  branchLogoUrl,
  branchName,
  onClose,
  onConfirm,
  isLoading,
}) => {
  const previewHtml = normalizePreviewHtml(form?.body_html || '', {
    branchLogoUrl,
    branchName,
  });

  return (
    <ModalShell
      title={`Bulk Email (${selectedCount} record${selectedCount === 1 ? '' : 's'})`}
      icon={<Mail size={18} />}
      accentClass="from-slate-900 via-slate-700 to-slate-500"
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="grid gap-4">
          <Field label="Email Template">
            <select
              value={selectedTemplateId}
              onChange={(e) => onTemplateChange(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/10 cursor-pointer"
            >
              <option value="">Custom message</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name || template.template_key || `Template #${template.id}`}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Preview</div>
          </div>
          <div className="h-[32rem] bg-white">
            {previewHtml ? (
              <iframe
                title="Bulk email preview"
                className="h-full w-full"
                sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                srcDoc={previewHtml}
              />
            ) : (
              <div className="flex h-full items-center justify-center px-4 text-sm text-slate-500">
                No preview content
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <Loader2 size={14} className="mx-auto animate-spin" /> : <Mail size={14} />}
            Send Email
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

const BulkSmsModal = ({
  selectedCount,
  form,
  setForm,
  templates,
  selectedTemplateId,
  onTemplateChange,
  isLoading,
  templatesLoading,
  onClose,
  onConfirm,
}) => {
  return (
    <ModalShell
      title={`Bulk SMS (${selectedCount} record${selectedCount === 1 ? '' : 's'})`}
      icon={<MessageSquare size={18} />}
      accentClass="from-slate-900 via-slate-700 to-slate-500"
      onClose={onClose}
    >
      <div className="space-y-5">
        <Field label="SMS Template">
          <select
            value={selectedTemplateId}
            onChange={(e) => onTemplateChange(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/10 cursor-pointer"
            disabled={templatesLoading}
          >
            <option value="">Custom message</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name || template.template_key || `Template #${template.id}`}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-4">
          <Field label="Message">
            <textarea
              value={form.message}
              onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              rows={10}
              className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-900 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-900/10"
              placeholder="Hi {customer_name}, ..."
            />
          </Field>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-[0.22em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <Loader2 size={14} className="mx-auto animate-spin" /> : <MessageSquare size={14} />}
            Send SMS
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

/* ─── Dashboard helpers ──────────────────────────────────────── */

const DASH_DATE_RANGES = [
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'today',     label: 'Today' },
  { id: '7d',        label: '7 Days' },
  { id: '30d',       label: '30 Days' },
];

const getDateRange = (rangeId) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const fmt = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  switch (rangeId) {
    case 'yesterday': {
      const yStart = new Date(todayStart);
      yStart.setDate(yStart.getDate() - 1);
      return { startDate: fmt(yStart), endDate: fmt(todayStart) };
    }
    case 'today':
      return { startDate: fmt(todayStart), endDate: fmt(todayEnd) };
    case '7d': {
      const s = new Date(todayStart);
      s.setDate(s.getDate() - 6);
      return { startDate: fmt(s), endDate: fmt(todayEnd) };
    }
    case '30d': {
      const s = new Date(todayStart);
      s.setDate(s.getDate() - 29);
      return { startDate: fmt(s), endDate: fmt(todayEnd) };
    }
    default:
      return { startDate: fmt(todayStart), endDate: fmt(todayEnd) };
  }
};

/* ─── DashStatCard ─────────────────────────────────────────── */

const DashStatCard = ({ icon: IconComp, label, value, trend, prefix = '', suffix = '', onClick, color = 'slate', scopeLabel = '' }) => {
  const trendColor = trend > 0
    ? 'text-emerald-600 bg-emerald-50/80 border border-emerald-100'
    : trend < 0
      ? 'text-rose-600 bg-rose-50/80 border border-rose-100'
      : 'text-slate-500 bg-slate-50/80 border border-slate-100';
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Activity;

  const colorStyles = {
    blue: "bg-white border-slate-200 text-blue-700 hover:border-blue-300",
    indigo: "bg-white border-slate-200 text-indigo-700 hover:border-indigo-300",
    violet: "bg-white border-slate-200 text-violet-700 hover:border-violet-300",
    pink: "bg-white border-slate-200 text-pink-700 hover:border-pink-300",
    rose: "bg-white border-slate-200 text-rose-700 hover:border-rose-300",
    orange: "bg-white border-slate-200 text-orange-700 hover:border-orange-300",
    amber: "bg-white border-slate-200 text-amber-700 hover:border-amber-300",
    emerald: "bg-white border-slate-200 text-emerald-700 hover:border-emerald-300",
    teal: "bg-white border-slate-200 text-teal-700 hover:border-teal-300",
    cyan: "bg-white border-slate-200 text-cyan-700 hover:border-cyan-300",
    sky: "bg-white border-slate-200 text-sky-700 hover:border-sky-300",
    slate: "bg-white border-slate-200 text-slate-700 hover:border-blue-300"
  };

  const iconBgStyles = {
    blue: "bg-slate-50 text-blue-700 border-transparent",
    indigo: "bg-slate-50 text-indigo-700 border-transparent",
    violet: "bg-slate-50 text-violet-700 border-transparent",
    pink: "bg-slate-50 text-pink-700 border-transparent",
    rose: "bg-slate-50 text-rose-700 border-transparent",
    orange: "bg-slate-50 text-orange-700 border-transparent",
    amber: "bg-slate-50 text-amber-700 border-transparent",
    emerald: "bg-slate-50 text-emerald-700 border-transparent",
    teal: "bg-slate-50 text-teal-700 border-transparent",
    cyan: "bg-slate-50 text-cyan-700 border-transparent",
    sky: "bg-slate-50 text-sky-700 border-transparent",
    slate: "bg-slate-50 text-slate-700 border-transparent"
  };

  const wrapperClass = colorStyles[color] || colorStyles.slate;
  const iconClass = iconBgStyles[color] || iconBgStyles.slate;

  return (
    <div 
      onClick={onClick}
      className={`rounded-xl border p-4 shadow-sm transition-all duration-200 ${wrapperClass} ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${iconClass}`}>
          <IconComp size={18} strokeWidth={1.8} />
        </span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${trendColor}`}>
          <TrendIcon size={11} />
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      </div>
      <div className="text-[11px] font-bold uppercase tracking-wider mb-1">{label}</div>
      <div className="font-mono text-2xl font-black tracking-tight leading-none">
        {prefix}{typeof value === 'number' ? value.toLocaleString('en-CA') : value}{suffix}
      </div>
      {scopeLabel ? (
        <div className="mt-1 text-[10px] opacity-80 font-medium">{scopeLabel}</div>
      ) : null}
    </div>
  );
};

/* ─── Simple Bar Chart ─────────────────────────────────────── */

const SimpleBarChart = ({ data, title }) => {
  const maxVal = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Daily activity breakdown</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
          <BarChart3 size={12} />
          {data.reduce((s, d) => s + d.count, 0)} total
        </span>
      </div>
      <div className="flex items-end gap-1.5 h-44">
        {data.map((d, i) => {
          const heightPct = maxVal > 0 ? (d.count / maxVal) * 100 : 0;
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 group min-w-0">
              <span className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                {d.count}
              </span>
              <div className="w-full flex items-end justify-center" style={{ height: '120px' }}>
                <div
                  className="w-full max-w-[40px] rounded-t-md bg-blue-500 hover:bg-blue-600 transition-colors duration-150 cursor-default"
                  style={{
                    height: `${Math.max(heightPct, 3)}%`,
                    minHeight: '3px',
                    opacity: d.count === 0 ? 0.2 : 1,
                  }}
                  title={`${d.label}: ${d.count}`}
                />
              </div>
              <span className="text-[9px] font-semibold text-slate-400 truncate w-full text-center">
                {data.length <= 8 ? d.shortLabel : (i % 2 === 0 ? d.shortLabel : '')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Insights Panel ───────────────────────────────────────── */

const InsightsPanel = ({ dashData, userName, isAllUsers }) => {
  const items = useMemo(() => {
    if (!dashData) return [];
    const insights = [];
    const totalActivities = (dashData.emailCount || 0) + (dashData.smsCount || 0) + (dashData.phoneCallCount || 0);
    const winRate = dashData.leadsCount > 0 ? Math.round((dashData.wonCount / Math.max(dashData.leadsCount, 1)) * 100) : 0;

    if (dashData.leadsCount > 0) {
      insights.push({
        icon: Target,
        color: 'text-blue-600 bg-blue-50',
        text: `${dashData.leadsCount} lead${dashData.leadsCount === 1 ? '' : 's'} received this period`,
      });
    }
    if (totalActivities > 0) {
      insights.push({
        icon: Activity,
        color: 'text-violet-600 bg-violet-50',
        text: `${totalActivities} total outreach activities (${dashData.emailCount} emails, ${dashData.smsCount} SMS, ${dashData.phoneCallCount} calls)`,
      });
    }
    if (dashData.wonCount > 0 || dashData.lostCount > 0) {
      insights.push({
        icon: TrendingUp,
        color: 'text-emerald-600 bg-emerald-50',
        text: `${winRate}% win rate — ${dashData.wonCount} won, ${dashData.lostCount} lost`,
      });
    }
    if (dashData.taskCount > 0) {
      insights.push({
        icon: CheckCircle2,
        color: 'text-amber-600 bg-amber-50',
        text: `${dashData.taskCount} task${dashData.taskCount === 1 ? '' : 's'} in queue`,
      });
    }
    if (dashData.paymentTotal > 0) {
      insights.push({
        icon: DollarSign,
        color: 'text-emerald-600 bg-emerald-50',
        text: `${new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 }).format(dashData.paymentTotal)} in payments collected`,
      });
    }
    if (insights.length === 0) {
      insights.push({
        icon: Lightbulb,
        color: 'text-slate-500 bg-slate-50',
        text: 'No activity recorded for this period. Try expanding the date range.',
      });
    }
    return insights;
  }, [dashData]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm h-full">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
          <Lightbulb size={16} strokeWidth={2} />
        </span>
        <div>
          <h3 className="text-sm font-bold text-slate-900">{isAllUsers ? 'Branch Insights' : 'User Insights'}</h3>
          <p className="text-[10px] text-slate-500">{isAllUsers ? 'All users in branch' : userName}</p>
        </div>
      </div>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${item.color} mt-0.5`}>
              <item.icon size={14} strokeWidth={2} />
            </span>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">{item.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

/* ─── Stat Detail Modal ──────────────────────────────────────────── */

const METRIC_HEADER_TITLES = {
  calls: { singular: 'Call', plural: 'Calls' },
  emails: { singular: 'Email Logged', plural: 'Emails Logged' },
  sms: { singular: 'SMS Logged', plural: 'SMS Logged' },
  leads: { singular: 'Lead Created', plural: 'Leads Created' },
  payments: { singular: 'Payment Captured', plural: 'Payments Captured' },
  tasks: { singular: 'Follow-up', plural: 'Follow-up' },
  won: { singular: 'Won Deal', plural: 'Booked Leads' },
  lost: { singular: 'Lost Deal', plural: 'Lost Deals' },
};

const StatDetailModal = ({ isOpen, metricType = 'calls', onClose, dateRange, branch, assignedUser, branches, users }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filterPeriod, setFilterPeriod] = useState('today');
  const [localBranch, setLocalBranch] = useState(branch || '');
  const [localUser, setLocalUser] = useState(assignedUser || '');
  const [localOutcome, setLocalOutcome] = useState('');
  const [outcomeMenuOpen, setOutcomeMenuOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const outcomeMenuRef = useRef(null);
  const outcomeToggleRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setFilterPeriod('today');
    setPage(1);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setLocalBranch(branch || '');
  }, [isOpen, branch]);

  useEffect(() => {
    if (!isOpen) return;
    setLocalUser(assignedUser || '');
  }, [isOpen, assignedUser]);

  useEffect(() => {
    if (!isOpen) return;
    setPage(1);
    setSortConfig({ key: 'created_at', direction: 'desc' });
    setLocalOutcome('');
    setOutcomeMenuOpen(false);
  }, [isOpen, metricType]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setPage(1);
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={12} className="text-slate-300 transition-colors" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-blue-600 transition-colors" /> : <ArrowDown size={12} className="text-blue-600 transition-colors" />;
  };

  const getSortableValue = useCallback((item, key) => {
    const related = item?.related_record_details || {};
    switch (key) {
      case 'sales_number':
        return item?.display_number || related?.display_number || item?.sales_number || '';
      case 'customer_name':
        return item?.name || related?.name || '';
      case 'pipeline_status':
        return item?.status_label || related?.status_label || related?.custom_status_label || item?.custom_status_label || '';
      case 'move_date':
        return item?.move_date || related?.move_date || '';
      case 'disposition':
        return item?.disposition || item?.notes || item?.subject || '';
      case 'activity__created_at':
      case 'created_at':
        return item?.activity_created_at || item?.created_at || '';
      default:
        return item?.[key] ?? related?.[key] ?? '';
    }
  }, []);

  const compareValues = useCallback((left, right, key) => {
    const leftValue = getSortableValue(left, key);
    const rightValue = getSortableValue(right, key);

    const leftDate = new Date(leftValue);
    const rightDate = new Date(rightValue);
    if (!Number.isNaN(leftDate.getTime()) && !Number.isNaN(rightDate.getTime())) {
      return leftDate.getTime() - rightDate.getTime();
    }

    const leftNumber = Number(leftValue);
    const rightNumber = Number(rightValue);
    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && String(leftValue).trim() !== '' && String(rightValue).trim() !== '') {
      return leftNumber - rightNumber;
    }

    return String(leftValue || '').localeCompare(String(rightValue || ''), undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  }, [getSortableValue]);

  const getModalDateRange = (period) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const fmt = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    
    if (period === 'today') {
      return { startDate: fmt(todayStart), endDate: fmt(todayEnd) };
    } else if (period === 'this_week') {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - start.getDay());
      return { startDate: fmt(start), endDate: fmt(todayEnd) };
    } else if (period === 'this_month') {
      const start = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
      return { startDate: fmt(start), endDate: fmt(todayEnd) };
    }
    return {};
  };

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    const fetchMetricData = async () => {
      setLoading(true);
      try {
        const { startDate, endDate } = getModalDateRange(filterPeriod);
        let rawItems = [];

        if (metricType === 'calls' || metricType === 'emails' || metricType === 'sms') {
          const actType = metricType === 'calls' ? 'call' : metricType === 'emails' ? 'email' : 'sms';
          const [salesRes, leadRes] = await Promise.all([
            getActivities({
              limit: 500,
              branch: localBranch || undefined,
              assigned_user: localUser || undefined,
              startDate,
              endDate,
              ordering: sortConfig.direction === 'desc' ? '-created_at' : 'created_at',
            }),
            getLeadActivities({
              limit: 500,
              branch: localBranch || undefined,
              assigned_user: localUser || undefined,
              startDate,
              endDate,
              activity_type: actType,
              ordering: sortConfig.direction === 'desc' ? '-created_at' : 'created_at',
            }).catch(() => null),
          ]);
          const salesItems = asList(salesRes)
            .filter((row) => String(row?.activity_type || '').toLowerCase() === actType)
            .map((row) => ({
              ...row,
              row_type: 'sales',
              related_row_type: row?.related_row_type || (row?.opportunity_id ? 'opportunity' : row?.lead_id ? 'lead' : null),
              related_record_id: row?.opportunity_id || row?.lead_id || null,
              display_number: row?.display_number || '',
              name: row?.name || '',
              service_type: row?.service_type || '—',
              move_date: row?.move_date || null,
              status_label: row?.status_label || row?.custom_status_label || 'Completed',
              custom_status_label: row?.custom_status_label || '',
              activity_created_at: row?.created_at || null,
              disposition: row?.call_log_details?.disposition || row?.subject || row?.notes || '—',
              value: Number(row?.value || 0),
            }));
          const leadItems = asList(leadRes)
            .filter((row) => String(row?.activity_type || '').toLowerCase() === actType)
            .map((row) => ({
              ...row,
              row_type: 'lead',
              related_row_type: 'lead',
              related_record_id: row?.lead || row?.lead_id || row?.lead_details?.id || null,
              display_number: row?.lead_details?.display_number || row?.lead_details?.sales_number || '',
              name: [row?.lead_details?.first_name, row?.lead_details?.last_name].filter(Boolean).join(' ').trim() || '',
              service_type: row?.lead_details?.service_type || '—',
              move_date: row?.lead_details?.move_date || null,
              status_label:
                row?.lead_details?.workflow_stage_label ||
                row?.lead_details?.custom_status_code_details?.label ||
                row?.lead_details?.status_label ||
                row?.lead_details?.status ||
                'Logged',
              custom_status_label: row?.lead_details?.custom_status_code_details?.label || '',
              activity_created_at: row?.created_at || null,
              disposition: String(row?.content || row?.subject || '').trim() || '—',
              value: 0,
            }));
          rawItems = [...salesItems, ...leadItems];
        } else if (metricType === 'tasks') {
          const tasksRes = await getTasks({
            limit: 500,
            branch: localBranch || undefined,
            assigned_user: localUser || undefined,
            status: 'pending',
            startDate,
            endDate,
          }).catch(() => null);
          rawItems = asList(tasksRes).map((task) => ({
            ...task,
            row_type: 'task',
            related_row_type: task.opportunity ? 'opportunity' : task.lead ? 'lead' : null,
            related_record_id: task.opportunity || task.lead || null,
            display_number: task.opportunity_details?.display_number || task.lead_details?.display_number || `TASK-${task.id}`,
            name: [task.assigned_to_details?.first_name, task.assigned_to_details?.last_name].filter(Boolean).join(' ').trim() || task.assigned_to_details?.email || '—',
            service_type: task.notes || task.activity_details?.subject || 'Task',
            move_date: task.due_date || null,
            status_label: 'Pending',
            custom_status_label: 'Pending',
            activity_created_at: task.created_at || task.due_date || null,
            disposition: task.notes || '—',
            value: 0,
          }));
        } else if (metricType === 'leads') {
          const queueRes = await getMyLeadsQueue({
            limit: 500,
            branch: localBranch || undefined,
            assigned_user: localUser || undefined,
            startDate,
            endDate,
            date_field: 'created_at',
            include_converted: true,
          }).catch(() => null);
          const raw = Array.isArray(queueRes) ? queueRes : (queueRes?.results || []);
          rawItems = raw.map(row => ({
            ...row,
            related_row_type: row.opportunity_id ? 'opportunity' : 'lead',
            related_record_id: row.opportunity_id || row.id,
            display_number: row.display_number || (row.sales_number ? String(row.sales_number) : `LEAD-${row.id}`),
            name: row.name || `#${row.id}`,
            service_type: row.service_type || '—',
            move_date: row.move_date || null,
            status_label: row.custom_status_label || row.workflow_stage_label || row.status_label || row.status || 'New',
            activity_created_at: row.created_at || null,
            disposition: row.source || 'Lead Intake',
            value: Number(row.value || row.lead_cost || 0),
          }));
        } else if (metricType === 'won') {
          const queueRes = await getMyLeadsQueue({
            limit: 500,
            opp_status: 'booked',
            branch: localBranch || undefined,
            assigned_user: localUser || undefined,
            startDate,
            endDate,
            include_converted: true,
          }).catch(() => null);
          const raw = Array.isArray(queueRes) ? queueRes : (queueRes?.results || []);
          rawItems = raw.map(row => ({
            ...row,
            related_row_type: row.opportunity_id ? 'opportunity' : 'lead',
            related_record_id: row.opportunity_id || row.id,
            display_number: row.display_number || (row.sales_number ? String(row.sales_number) : `OPP-${row.id}`),
            name: row.name || `#${row.id}`,
            service_type: row.service_type || '—',
            move_date: row.move_date || null,
            status_label: 'Booked / Won',
            activity_created_at: row.booked_at || row.created_at || null,
            disposition: 'Won Opportunity',
            value: Number(row.value || row.estimate_value || 0),
          }));
        } else if (metricType === 'lost') {
          const queueRes = await getMyLeadsQueue({
            limit: 500,
            lead_status: 'lost',
            opp_status: 'lost',
            branch: localBranch || undefined,
            assigned_user: localUser || undefined,
            startDate,
            endDate,
            include_converted: true,
          }).catch(() => null);
          const raw = Array.isArray(queueRes) ? queueRes : (queueRes?.results || []);
          rawItems = raw.map(row => ({
            ...row,
            related_row_type: row.opportunity_id ? 'opportunity' : 'lead',
            related_record_id: row.opportunity_id || row.id,
            display_number: row.display_number || (row.sales_number ? String(row.sales_number) : `RECORD-${row.id}`),
            name: row.name || `#${row.id}`,
            service_type: row.service_type || '—',
            move_date: row.move_date || null,
            status_label: 'Lost',
            activity_created_at: row.updated_at || row.created_at || null,
            disposition: 'Lost Record',
            value: Number(row.value || 0),
          }));
        } else if (metricType === 'payments') {
          const queueRes = await getPayments({
            limit: 500,
            branch: localBranch || undefined,
            assigned_user: localUser || undefined,
            startDate,
            endDate,
          }).catch(() => null);
          const raw = Array.isArray(queueRes) ? queueRes : (queueRes?.results || []);
          rawItems = raw.map((row) => ({
              ...row,
              row_type: 'payment',
              related_row_type:
                row.payment_request?.estimate?.opportunity_id ||
                row.payment_request?.estimate?.opportunity?.id ||
                row.estimate?.opportunity_id ||
                row.estimate?.opportunity?.id
                  ? 'opportunity'
                  : (row.payment_request?.estimate?.lead_id || row.estimate?.lead_id ? 'lead' : 'opportunity'),
              related_record_id:
                row.payment_request?.estimate?.opportunity_id ||
                row.payment_request?.estimate?.opportunity?.id ||
                row.estimate?.opportunity_id ||
                row.estimate?.opportunity?.id ||
                row.payment_request?.estimate?.lead_id ||
                row.estimate?.lead_id ||
                row.id,
              display_number:
                row.payment_request?.estimate?.opportunity?.opportunity_number ||
                row.payment_request?.estimate?.opportunity?.sales_number ||
                row.estimate?.opportunity?.opportunity_number ||
                row.estimate?.opportunity?.sales_number ||
                row.payment_request?.estimate?.lead?.sales_number ||
                row.estimate?.lead?.sales_number ||
                `PAY-${row.id}`,
              name:
                row.payment_request?.estimate?.opportunity?.customer
                  ? `${row.payment_request.estimate.opportunity.customer.first_name || ''} ${row.payment_request.estimate.opportunity.customer.last_name || ''}`.trim()
                  : row.estimate?.opportunity?.customer
                    ? `${row.estimate.opportunity.customer.first_name || ''} ${row.estimate.opportunity.customer.last_name || ''}`.trim()
                    : row.payment_request?.estimate?.lead
                      ? `${row.payment_request.estimate.lead.first_name || ''} ${row.payment_request.estimate.lead.last_name || ''}`.trim()
                      : row.estimate?.lead
                        ? `${row.estimate.lead.first_name || ''} ${row.estimate.lead.last_name || ''}`.trim()
                    : `#${row.id}`,
              service_type:
                row.payment_request?.estimate?.opportunity?.service_type?.name ||
                row.estimate?.opportunity?.service_type?.name ||
                row.payment_request?.estimate?.lead?.service_type?.name ||
                row.estimate?.lead?.service_type?.name ||
                '—',
              move_date:
                row.payment_request?.estimate?.opportunity?.move_date ||
                row.estimate?.opportunity?.move_date ||
                row.payment_request?.estimate?.lead?.move_date ||
                row.estimate?.lead?.move_date ||
                null,
              status_label: 'Payment Captured',
              custom_status_label: 'Payment Captured',
              activity_created_at: row.captured_at || row.created_at || null,
              disposition: row.method || row.source_type || 'Captured Payment',
              value: Number(row.amount || 0),
            }));
        }

        if (isMounted) {

          const normalize = (value) => String(value || '').trim().toLowerCase();
          const filterValue = normalize(localOutcome);
          const filteredItems = rawItems.filter((item) => {
            if (!filterValue) return true;
            const outcome = normalize(item.disposition || item?.call_log_details?.disposition || '');
            return outcome.includes(filterValue);
          });
          const sortedItems = [...filteredItems].sort((a, b) => {
            const result = compareValues(a, b, sortConfig.key || 'activity__created_at');
            return sortConfig.direction === 'desc' ? -result : result;
          });
          const total = sortedItems.length;
          const start = (page - 1) * 50;
          setItems(sortedItems.slice(start, start + 50));
          setTotalCount(total);
        }
      } catch (err) {
        console.error("Failed to load metric details", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchMetricData();
    return () => { isMounted = false; };
  }, [isOpen, metricType, page, filterPeriod, localBranch, localUser, localOutcome, sortConfig, compareValues]);

  useEffect(() => {
    if (!isOpen) {
      setFilterPeriod('today');
      setPage(1);
      setLocalOutcome('');
      setOutcomeMenuOpen(false);
    } else {
      setLocalBranch(branch || '');
      setLocalUser(assignedUser || '');
    }
  }, [isOpen, branch, assignedUser]);

  useEffect(() => {
    if (!outcomeMenuOpen) return undefined;
    const onClickOutside = (event) => {
      if (
        outcomeMenuRef.current &&
        !outcomeMenuRef.current.contains(event.target) &&
        outcomeToggleRef.current &&
        !outcomeToggleRef.current.contains(event.target)
      ) {
        setOutcomeMenuOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOutcomeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [outcomeMenuOpen]);

  if (!isOpen) return null;

  const totalPages = Math.ceil(totalCount / 50) || 1;

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) + ' ' + 
           d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleDownloadCSV = () => {
    if (!items.length) return;
    const headers = ['Quote Number', 'Customer Name', 'Status', 'Service Type', 'Service Date', 'Details / Value', 'Date'];
    const csvRows = [headers.join(',')];
    items.forEach(row => {
      const related = row.related_record_details || row;
      const quote = `"${(related.display_number || row.display_number || '').replace(/"/g, '""')}"`;
      const name = `"${(related.name || row.name || '').replace(/"/g, '""')}"`;
      const status = `"${(related.status_label || row.status_label || '').replace(/"/g, '""')}"`;
      const serviceType = `"${(related.service_type || row.service_type || '').replace(/"/g, '""')}"`;
      const serviceDate = `"${(related.move_date || row.move_date || '').replace(/"/g, '""')}"`;
      const details = `"${(row.disposition || (row.value ? `$${row.value}` : row.subject) || '').toString().replace(/"/g, '""')}"`;
      const date = `"${(row.activity_created_at || row.created_at || '').replace(/"/g, '""')}"`;
      csvRows.push([quote, name, status, serviceType, serviceDate, details, date].join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${metricType || 'metric'}_export_${filterPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const titleMeta = METRIC_HEADER_TITLES[metricType] || { singular: 'Record', plural: 'Records' };
  const headerPeriodLabel = filterPeriod === 'today' ? 'Today' : filterPeriod === 'this_week' ? 'This Week' : 'This Month';
  const detailColHeader = (metricType === 'payments' || metricType === 'won' || metricType === 'lost' || metricType === 'leads') ? 'VALUE' : metricType === 'tasks' ? 'SUBJECT' : 'OUTCOME / DETAILS';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-7xl h-[85vh] flex flex-col rounded-xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-bold text-slate-900">
              {titleMeta.plural} {headerPeriodLabel}
            </h2>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {[
                { id: 'today', label: 'Today' },
                { id: 'this_week', label: 'This Week' },
                { id: 'this_month', label: 'This Month' }
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setFilterPeriod(r.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all duration-150 ${
                    filterPeriod === r.id
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            
            {(branches?.length > 0 || users?.length > 0) && (
              <div className="flex items-center gap-2 ml-2">
                {branches?.length > 0 && (
                  <select
                    value={localBranch}
                    onChange={(e) => { setLocalBranch(e.target.value); setPage(1); }}
                    className="h-8 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
                  >
                    <option value="">All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                )}
                {users?.length > 0 && (
                  <>
                    <select
                      value={localUser}
                      onChange={(e) => { setLocalUser(e.target.value); setPage(1); }}
                      className="h-8 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 max-w-[140px]"
                    >
                      <option value="">All Users</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {[u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email}
                        </option>
                      ))}
                    </select>
                    {metricType === 'calls' && (
                      <div className="relative">
                        <button
                          ref={outcomeToggleRef}
                          type="button"
                          onClick={() => setOutcomeMenuOpen((prev) => !prev)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 outline-none transition hover:border-slate-300 hover:bg-slate-100"
                        >
                          <span>{localOutcome || 'All Outcomes'}</span>
                          <ChevronDown size={14} className="text-slate-500" />
                        </button>
                        {outcomeMenuOpen && (
                          <div
                            ref={outcomeMenuRef}
                            className="absolute right-0 z-20 mt-2 w-52 rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5"
                          >
                            <div className="absolute right-4 top-0 -translate-y-1 rotate-45 h-3 w-3 bg-white border-t border-l border-slate-200" />
                            <div className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                              OUTCOME
                            </div>
                            <div className="py-1">
                              {CALL_OUTCOME_OPTIONS.map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => {
                                    setLocalOutcome(option);
                                    setPage(1);
                                    setOutcomeMenuOpen(false);
                                  }}
                                  className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition"
              title="Download CSV"
            >
              <Download size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-950 hover:bg-slate-100 transition"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full min-w-[1000px] text-left text-sm text-slate-600">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4" onClick={() => handleSort('sales_number')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-slate-700">QUOTE # {renderSortIcon('sales_number')}</div>
                </th>
                <th className="px-6 py-4" onClick={() => handleSort('customer_name')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-slate-700">CUSTOMER NAME {renderSortIcon('customer_name')}</div>
                </th>
                <th className="px-6 py-4" onClick={() => handleSort('pipeline_status')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-slate-700">STATUS {renderSortIcon('pipeline_status')}</div>
                </th>
                <th className="px-6 py-4">SERVICE TYPE</th>
                <th className="px-6 py-4" onClick={() => handleSort('move_date')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-slate-700">SERVICE DATE {renderSortIcon('move_date')}</div>
                </th>
                <th className="px-6 py-4" onClick={() => handleSort('disposition')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-slate-700">{detailColHeader} {renderSortIcon('disposition')}</div>
                </th>
                <th className="px-6 py-4" onClick={() => handleSort('activity__created_at')}>
                  <div className="flex items-center gap-1 cursor-pointer select-none hover:text-slate-700">DATE {renderSortIcon('activity__created_at')}</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading details...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No items found for this period.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const related = item?.related_record_details || {
                    row_type: item?.related_row_type || (item?.opportunity_id ? 'opportunity' : 'lead'),
                    id: item?.related_record_id || item?.id || null,
                    display_number: item?.display_number || '',
                    name: item?.name || '',
                    service_type: item?.service_type || '',
                    move_date: item?.move_date || null,
                    status_label: item?.status_label || '',
                    custom_status_label: item?.custom_status_label || '',
                  };
                  const activityCreatedAt = item?.activity_created_at || item?.activity_details?.created_at || item?.created_at || null;
                  const detailVal = (metricType === 'payments' || metricType === 'won' || metricType === 'lost' || metricType === 'leads')
                    ? (item.value ? formatCurrency(item.value) : '—')
                    : String(item.disposition || item.notes || item.subject || '—').trim() || '—';

                  return (
                    <tr key={`${item.row_type || 'item'}-${item.id}`} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-blue-600">
                        {related.id ? (
                          <a href={getRecordDetailPath(related.row_type, related.id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:underline">
                            {related.display_number || `RECORD-${related.id}`} <ArrowUpRight size={14} className="text-blue-500" />
                          </a>
                        ) : (
                          <span>{related.display_number || '—'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-blue-600">
                        {related.id ? (
                          <a href={getRecordDetailPath(related.row_type, related.id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:underline">
                            {related.name || '—'} <ArrowUpRight size={14} className="text-blue-500" />
                          </a>
                        ) : (
                          <span className="text-slate-900">{related.name || '—'}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-900">{related.status_label || related.custom_status_label || item.status_label || '—'}</td>
                      <td className="px-6 py-4 text-slate-900">{related.service_type || item.service_type || '—'}</td>
                      <td className="px-6 py-4 text-slate-900">{formatDate(related.move_date || item.move_date)}</td>
                      <td className="px-6 py-4 text-slate-900">{detailVal}</td>
                      <td className="px-6 py-4 text-slate-900">{formatDateTime(activityCreatedAt)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-white shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm font-medium text-slate-500 border border-slate-200 rounded-l-md hover:bg-slate-50 disabled:opacity-50"
            >
              « Previous
            </button>
            <div className="flex -space-x-px">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let startPage = Math.max(1, page - 2);
                if (startPage + 4 > totalPages) {
                  startPage = Math.max(1, totalPages - 4);
                }
                const p = startPage + i;
                if (p > totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1.5 text-sm font-medium border border-slate-200 ${page === p ? 'bg-blue-600 text-white relative z-10' : 'text-slate-500 hover:bg-slate-50 relative'}`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm font-medium text-slate-500 border border-slate-200 rounded-r-md hover:bg-slate-50 disabled:opacity-50"
            >
              Next »
            </button>
          </div>
          <div className="text-sm text-slate-600 font-medium">
            {totalCount > 0 ? (
              <>{(page - 1) * 50 + 1} - {Math.min(page * 50, totalCount)} of {totalCount} Total Results</>
            ) : (
              "0 Total Results"
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const CallsModal = (props) => <StatDetailModal metricType="calls" {...props} />;

/* ─── DashboardPane ────────────────────────────────────────── */

const DashboardPane = React.memo(function DashboardPane({
  dashData,
  dashLoading,
  dashError,
  dashDateRange,
  setDashDateRange,
  selectedUser,
  selectedBranch,
  branches,
  users,
}) {
  const [statModalType, setStatModalType] = useState(null);
  const isCallsModalOpen = statModalType === 'calls';

  const branchName = useMemo(() => {
    const b = branches.find((br) => String(br.id) === String(selectedBranch));
    return b?.name || 'All Branches';
  }, [branches, selectedBranch]);

  const userName = useMemo(() => {
    if (!selectedUser) return 'All Users';
    const u = users.find((usr) => String(usr.id) === String(selectedUser));
    if (!u) return 'All Users';
    return [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email || `User #${u.id}`;
  }, [users, selectedUser]);

  const isAllUsers = !selectedUser;
  const scopeLabel = useMemo(() => formatDashboardScope(branchName, userName, dashDateRange), [branchName, userName, dashDateRange]);

  const d = useMemo(() => {
    const raw = dashData || {};
    return {
      emailCount: raw.emailCount ?? raw.email_count ?? 0,
      smsCount: raw.smsCount ?? raw.sms_count ?? 0,
      phoneCallCount: raw.phoneCallCount ?? raw.phone_call_count ?? raw.callCount ?? raw.call_count ?? 0,
      leadsCount: raw.leadsCount ?? raw.leads_count ?? raw.leadCount ?? raw.lead_count ?? 0,
      paymentTotal: raw.paymentTotal ?? raw.payment_total ?? raw.payments_total ?? 0,
      paymentCount: raw.paymentCount ?? raw.payment_count ?? raw.payments_count ?? 0,
      taskCount: raw.taskCount ?? raw.task_count ?? raw.tasks_count ?? raw.followupCount ?? raw.followup_count ?? 0,
      wonCount: raw.wonCount ?? raw.won_count ?? raw.bookedCount ?? raw.booked_count ?? 0,
      lostCount: raw.lostCount ?? raw.lost_count ?? 0,
      emailTrend: raw.emailTrend ?? raw.email_trend ?? 0,
      smsTrend: raw.smsTrend ?? raw.sms_trend ?? 0,
      phoneCallTrend: raw.phoneCallTrend ?? raw.phone_call_trend ?? 0,
      leadsTrend: raw.leadsTrend ?? raw.leads_trend ?? 0,
      paymentTrend: raw.paymentTrend ?? raw.payment_trend ?? 0,
      taskTrend: raw.taskTrend ?? raw.task_trend ?? 0,
      wonTrend: raw.wonTrend ?? raw.won_trend ?? 0,
      lostTrend: raw.lostTrend ?? raw.lost_trend ?? 0,
      dailyBreakdown: raw.dailyBreakdown ?? raw.daily_breakdown ?? [],
    };
  }, [dashData]);

  if (dashLoading && !dashData) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-600">Loading dashboard…</p>
        <p className="text-xs text-slate-400 mt-1">Aggregating performance data</p>
      </div>
    );
  }

  if (dashError) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500 border border-rose-100 mb-4">
          <Activity size={24} />
        </div>
        <p className="text-sm font-bold text-slate-800">Unable to load dashboard</p>
        <p className="text-xs text-slate-500 mt-1 max-w-xs text-center">{dashError}</p>
      </div>
    );
  }

  const fmtPay = (val) => {
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
    return `$${(val || 0).toLocaleString('en-CA')}`;
  };

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Performance Overview</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {formatDashboardScope(branchName, userName, dashDateRange)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date range segmented control */}
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100/90 p-1 gap-1">
            {DASH_DATE_RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setDashDateRange(r.id)}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all duration-150 cursor-pointer ${
                  dashDateRange === r.id
                    ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-900/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {/* User indicator */}
          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
            <User size={14} className="text-slate-400" />
            <span className="truncate max-w-[140px]">{userName}</span>
          </div>
        </div>
      </div>

      {/* ── Loading overlay for refresh ── */}
      {dashLoading && dashData && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 size={14} className="animate-spin" />
          <span>Refreshing...</span>
        </div>
      )}

      {/* ── Stats Row 1 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DashStatCard icon={Mail}        label="Emails Logged"   value={d.emailCount ?? 0}     trend={d.emailTrend ?? 0} onClick={() => setStatModalType('emails')} color="blue" />
        <DashStatCard icon={MessageSquare} label="SMS Logged"    value={d.smsCount ?? 0}       trend={d.smsTrend ?? 0} onClick={() => setStatModalType('sms')} color="violet" />
        <DashStatCard icon={Target}      label="Leads Created"   value={d.leadsCount ?? 0}     trend={d.leadsTrend ?? 0} onClick={() => setStatModalType('leads')} color="amber" />
        <DashStatCard icon={DollarSign}  label="Payments Captured" value={fmtPay(d.paymentTotal ?? 0)} trend={d.paymentTrend ?? 0} onClick={() => setStatModalType('payments')} color="emerald" />
      </div>

      {/* ── Stats Row 2 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DashStatCard icon={PhoneCall}      label="Phone Calls Logged"  value={d.phoneCallCount ?? 0}  trend={d.phoneCallTrend ?? 0} onClick={() => setStatModalType('calls')} color="teal" />
        <DashStatCard icon={CheckCircle2}   label="Follow-up"        value={d.taskCount ?? 0}       trend={d.taskTrend ?? 0} onClick={() => setStatModalType('tasks')} color="orange" />
        <DashStatCard icon={TrendingUp}     label="Booked Leads"    value={d.wonCount ?? 0}        trend={d.wonTrend ?? 0} onClick={() => setStatModalType('won')} color="indigo" />
        <DashStatCard icon={TrendingDown}   label="Lost This Period"   value={d.lostCount ?? 0}       trend={d.lostTrend ?? 0} onClick={() => setStatModalType('lost')} color="rose" />
      </div>

      {/* ── Chart + Insights ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Lead creation only
          </div>
          <SimpleBarChart
            data={d.dailyBreakdown.length > 0 ? d.dailyBreakdown : [{ date: new Date().toISOString().split('T')[0], count: 0, label: 'Today', shortLabel: 'Today' }]}
            title="Lead Timeline"
          />
        </div>
        <div className="lg:col-span-1">
          <InsightsPanel dashData={d} userName={userName} isAllUsers={isAllUsers} />
        </div>
      </div>

      <StatDetailModal 
        isOpen={Boolean(statModalType)} 
        metricType={statModalType || 'calls'}
        onClose={() => setStatModalType(null)} 
        dateRange={dashDateRange} 
        branch={selectedBranch} 
        assignedUser={selectedUser} 
        branches={branches}
        users={users}
      />
    </div>
  );
});



const Sales = () => {
  const { user } = useAuth();
  const { canAll, canAny } = useCan();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { tableTab } = useParams();
  const initialSalesTab = getInitialSalesTab(location, tableTab);
  const cachedTableState = useMemo(() => readSalesTableState(), []);

  // Tab handling
  const [activeTab, setActiveTab] = useState(() => cachedTableState?.activeTab || initialSalesTab);
  const [data, setData] = useState(() => Array.isArray(cachedTableState?.data) ? cachedTableState.data : []);
  const [isLoading, setIsLoading] = useState(() => !cachedTableState);
  const [searchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [currentPage, setCurrentPage] = useState(() => Number(cachedTableState?.currentPage || 1));
  const [sortConfig, setSortConfig] = useState({ 
    key: cachedTableState?.sortConfig?.key === 'last_contacted_at'
      ? (initialSalesTab === 'new-leads' ? 'created_at' : initialSalesTab === 'follow-up' ? 'created_at' : 'assigned_at')
      : (cachedTableState?.sortConfig?.key || (initialSalesTab === 'new-leads' ? 'created_at' : initialSalesTab === 'follow-up' ? 'created_at' : 'assigned_at')),
    direction: cachedTableState?.sortConfig?.direction || 'desc' 
  });
  const renderLegacyPipelineTable = import.meta.env.VITE_RENDER_LEGACY_PIPELINE_TABLE === 'true';

  // Dashboard state
  const [dashDateRange, setDashDateRange] = useState('today');
  const [dashData, setDashData] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashError, setDashError] = useState(null);
  const [isTabSwitching, setIsTabSwitching] = useState(false);
  const isDashboard = activeTab === 'dashboard';
  const tabSwitchStartRef = useRef(0);
  const tabSwitchTimerRef = useRef(null);
  const tabSwitchFrameRef = useRef(null);
  const dashboardFetchInFlightRef = useRef(false);
  const dashboardRequestSeqRef = useRef(0);
  const hasCachedTableState = Boolean(cachedTableState);

  // Sync activeTab with URL/state (e.g. direct /leads/table/follow-up or header redirects)
  useEffect(() => {
    const nextTab = getInitialSalesTab(location, tableTab);
    if (nextTab) {
      setActiveTab((current) => (current === nextTab ? current : nextTab));
    }
  }, [location, tableTab]);

  useEffect(() => {
    if (!hasLoadedOnceRef.current) return;
    tabSwitchStartRef.current = Date.now();
    setIsTabSwitching(true);
  }, [activeTab]);

  // Update default sort column based on active tab
  useEffect(() => {
    if (activeTab === 'new-leads') {
      setSortConfig(prev => prev.key === 'created_at' ? prev : { key: 'created_at', direction: 'desc' });
      return;
    }
    if (activeTab === 'follow-up') {
      setSortConfig(prev => prev.key === 'created_at' ? prev : { key: 'created_at', direction: 'desc' });
      return;
    }
    if (activeTab === 'leads') {
      setSortConfig(prev => prev.key === 'assigned_at' ? prev : { key: 'assigned_at', direction: 'desc' });
      return;
    }
    setSortConfig(prev => prev.key === 'assigned_at' ? prev : { key: 'assigned_at', direction: 'desc' });
  }, [activeTab]);


  const isLeadTab = LEAD_TAB_IDS.has(activeTab);

  const [pagination, setPagination] = useState({
    count: 0,
    page: 1,
    pageSize: PAGE_SIZE,
    totalPages: 1,
  });
  const [queueSummary, setQueueSummary] = useState({
    ...(cachedTableState?.queueSummary || {
      total: 0,
      lead_count: 0,
      opportunity_count: 0,
      hot_count: 0,
      new_count: 0,
      value_total: 0,
      conversion_rate: 0,
    }),
  });

  // Filter States
  const [filters, setFilters] = useState(() => {
    const cachedFilters = cachedTableState?.filters || {};
    const saved = readSavedSalesFilterState();
    return {
      status: cachedFilters.status || 'all',
      branch: cachedFilters.branch || saved.branch || '',
      assigned_to: cachedFilters.assigned_to || saved.assigned_to || '',
      service_type: cachedFilters.service_type || '',
      source: cachedFilters.source || '',
      move_size: cachedFilters.move_size || '',
      province: cachedFilters.province || '',
      move_type: cachedFilters.move_type || 'all',
      origin: cachedFilters.origin || '',
      destination: cachedFilters.destination || '',
      receivedDate: cachedFilters.receivedDate || '',
      dateType: cachedFilters.dateType || 'move_date',
      startDate: cachedFilters.startDate || '',
      endDate: cachedFilters.endDate || ''
    };
  });
  const [originInput, setOriginInput] = useState('');
  const [destinationInput, setDestinationInput] = useState('');

  const [metadata, setMetadata] = useState({
    ...(cachedTableState?.metadata || {}),
    branches: cachedTableState?.metadata?.branches || [],
    users: cachedTableState?.metadata?.users || [],
    sources: cachedTableState?.metadata?.sources || [],
    serviceTypes: cachedTableState?.metadata?.serviceTypes || [],
    moveTypes: cachedTableState?.metadata?.moveTypes || [],
    moveSizes: cachedTableState?.metadata?.moveSizes || [],
    statusLookups: cachedTableState?.metadata?.statusLookups || [],
  });
  const [assigningLeadId, setAssigningLeadId] = useState(null);
  const [assignModal, setAssignModal] = useState({ open: false, lead: null });
  const [selectedRecordKeys, setSelectedRecordKeys] = useState(() => new Set());
  const [branchLeadOrders, setBranchLeadOrders] = useState(() => readSavedBranchLeadOrders());
  const dragSourceLeadIdRef = useRef(null);
  const accessibleBranchIds = useMemo(() => new Set(getUserBranchIds(user)), [user]);
  const restrictToAccessibleBranches = accessibleBranchIds.size > 0 && !user?.is_superuser && !user?.is_system_admin;
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignForm, setBulkAssignForm] = useState({ branch: '', assigned_to: '' });
  const [bulkEmailOpen, setBulkEmailOpen] = useState(false);
  const [bulkEmailForm, setBulkEmailForm] = useState({ subject: '', body_html: '' });
  const [bulkEmailTemplates, setBulkEmailTemplates] = useState([]);
  const [bulkEmailTemplateId, setBulkEmailTemplateId] = useState('');
  const [bulkEmailTemplatesLoading, setBulkEmailTemplatesLoading] = useState(false);
  const [bulkSmsOpen, setBulkSmsOpen] = useState(false);
  const [bulkSmsForm, setBulkSmsForm] = useState({ message: '' });
  const [bulkSmsTemplates, setBulkSmsTemplates] = useState([]);
  const [bulkSmsTemplateId, setBulkSmsTemplateId] = useState('');
  const [bulkSmsTemplatesLoading, setBulkSmsTemplatesLoading] = useState(false);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [taskActionLoadingId, setTaskActionLoadingId] = useState(null);
  const [taskEditModal, setTaskEditModal] = useState({ open: false, item: null });
  const [taskEditForm, setTaskEditForm] = useState({
    subject: '',
    task_type: 'general',
    status: 'pending',
    due_date: '',
    assigned_to: '',
    notes: '',
  });
  const hasLoadedOnceRef = useRef(false);
  const metadataPromiseRef = useRef(null);
  const metadataCacheRef = useRef(new Map());
  const requestSequenceRef = useRef(0);
  const statusCodesRef = useRef([]);
  const queueCacheRef = useRef(new Map());

  const statusFilterGroups = useMemo(
    () => buildStatusFilterGroups(activeTab, metadata),
    [activeTab, metadata],
  );
  const statusFilterValues = useMemo(
    () => flattenStatusFilterValues(statusFilterGroups),
    [statusFilterGroups],
  );
  const bulkStatusOptions = useMemo(() => {
    return normalizeLookupItems(metadata.statusLookups)
      .filter((status) => status && status.is_active !== false)
      .map((status) => ({
        value: status.value,
        label: status.label || 'Status',
        color_hex: status.color_hex || '',
      }))
      .filter((status) => status.value)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [metadata.statusLookups]);

  const selectedBranchLogoUrl = useMemo(() => {
    const branchId = String(filters.branch || '').trim();
    if (!branchId) return '';
    const branch = metadata.branches.find((row) => String(row.id) === branchId);
    return String(branch?.effective_logo_url || branch?.logo_url || branch?.logo || '').trim();
  }, [filters.branch, metadata.branches]);
  const selectedBranchName = useMemo(() => {
    const branchId = String(filters.branch || '').trim();
    if (!branchId) return '';
    const branch = metadata.branches.find((row) => String(row.id) === branchId);
    return String(branch?.name || branch?.branch_name || '').trim();
  }, [filters.branch, metadata.branches]);

  // Filter users to only those belonging to the currently selected branch
  const filteredUsersByBranch = useMemo(() => {
    if (!filters.branch) return metadata.users;
    return metadata.users.filter((u) => {
      const userBranchIds = getUserBranchIds(u);
      return userBranchIds.includes(String(filters.branch));
    });
  }, [filters.branch, metadata.users]);

  const updateFilterValue = (key, value) => {
    setCurrentPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // When branch changes in the filter, reset the assigned_to selection
  const updateBranchFilter = (branchValue) => {
    setCurrentPage(1);
    setFilters((prev) => ({ ...prev, branch: branchValue, assigned_to: '' }));
  };

  useEffect(() => {
    writeSavedSalesFilterState({
      branch: filters.branch,
      assigned_to: filters.assigned_to,
    });
  }, [filters.branch, filters.assigned_to]);

  useEffect(() => {
    if (!metadata.branches.length && !metadata.users.length) return;

    const branchId = String(filters.branch || '').trim();
    const branchExists = !branchId || metadata.branches.some((branch) => String(branch.id) === branchId);
    if (!branchExists) {
      const fallbackBranchId = metadata.branches[0]?.id ? String(metadata.branches[0].id) : '';
      setFilters((prev) => {
        const nextBranch = String(fallbackBranchId || '');
        const prevBranch = String(prev.branch || '');
        if (prevBranch === nextBranch && String(prev.assigned_to || '') === '') return prev;
        return { ...prev, branch: nextBranch, assigned_to: '' };
      });
      return;
    }

    const userId = String(filters.assigned_to || '').trim();
    if (!userId) return;
    const eligibleUsers = branchId
      ? metadata.users.filter((user) => getUserBranchIds(user).includes(branchId))
      : metadata.users;
    const userExists = eligibleUsers.some((user) => String(user.id) === userId);
    if (!userExists) {
      setFilters((prev) => (String(prev.assigned_to || '') === '' ? prev : { ...prev, assigned_to: '' }));
    }
  }, [filters.assigned_to, filters.branch, metadata.branches, metadata.users]);

  const selectedBranchId = useMemo(() => String(filters.branch || '').trim(), [filters.branch]);
  const isLeadSelectionScoped = useMemo(() => {
    if (activeTab === 'follow-up') return true;
    return ['all-leads', 'new-leads', 'leads'].includes(activeTab) && Boolean(selectedBranchId);
  }, [activeTab, selectedBranchId]);
  const shouldEnableManualLeadSorting = isLeadSelectionScoped;

  const requestSort = useCallback((key) => {
    if (activeTab === 'dashboard') return;
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  }, [activeTab, sortConfig]);

  const mapOrderingKey = useCallback((key, tab = activeTab) => {
      if (tab === 'follow-up') {
        if (key === 'created_at') return 'activity__created_at';
        if (key === 'name') return 'activity__subject';
        if (key === 'assigned_at') return 'assigned_to_id';
        if (key === 'sales_number') return 'sales_number';
      }
    return key;
  }, [activeTab]);

  const getSortIcon = useCallback((key) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={12} className="opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-blue-600" /> : <ArrowDown size={12} className="text-blue-600" />;
  }, [sortConfig]);

  const getTabCount = (tabId) => {
    if (tabId === 'dashboard') return null;
    if (tabId === activeTab) {
      return pagination.count || data.length || queueSummary?.tab_counts?.[tabId] || 0;
    }
    return queueSummary?.tab_counts?.[tabId] ?? null;
  };

  useEffect(() => {
    setCurrentPage(1);
    setSelectedRecordKeys(new Set());
    if (activeTab === 'dashboard') {
      setIsTabSwitching(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (filters.status === 'all') return;
    if (!statusFilterValues.size) return;
    if (statusFilterValues.has(normalizeStatusValue(filters.status))) return;
    setFilters((prev) => (String(prev.status || '') === 'all' ? prev : { ...prev, status: 'all' }));
  }, [activeTab, filters.status, statusFilterValues]);

  useEffect(() => {
    setOriginInput(filters.origin || '');
  }, [filters.origin]);

  useEffect(() => {
    setDestinationInput(filters.destination || '');
  }, [filters.destination]);

  useEffect(() => {
    const nextOrigin = String(originInput || '').trim();
    const currentOrigin = String(filters.origin || '').trim();
    if (nextOrigin === currentOrigin) return;

    const timer = setTimeout(() => {
      setCurrentPage(1);
      setFilters((prev) => ({ ...prev, origin: originInput }));
    }, 300);

    return () => clearTimeout(timer);
  }, [originInput, filters.origin]);

  useEffect(() => {
    const nextDestination = String(destinationInput || '').trim();
    const currentDestination = String(filters.destination || '').trim();
    if (nextDestination === currentDestination) return;

    const timer = setTimeout(() => {
      setCurrentPage(1);
      setFilters((prev) => ({ ...prev, destination: destinationInput }));
    }, 300);

    return () => clearTimeout(timer);
  }, [destinationInput, filters.destination]);

  const resolveStatusCodeColor = useCallback((row) => {
    const statusCodes = statusCodesRef.current;
    if (!statusCodes.length) return null;

    const customStatusId = row.custom_status_code;

    const customStatusMatch = statusCodes.find((statusCode) => String(statusCode?.id || '') === String(customStatusId || ''));
    if (customStatusMatch?.color_hex) return customStatusMatch.color_hex;
    return null;
  }, []);

  const normalizeQueueRow = useCallback((row) => {
    const isLeadRow = String(row.row_type || '').toLowerCase() === 'lead' || Boolean(row.lead_id && !row.opportunity_id);
    const pipelineStatusValue = row.workflow_stage || (isLeadRow ? 'new_lead' : 'opportunity');
    const internalStatusValue = row.custom_status_code || '';
    const normalizedStatus = String(pipelineStatusValue).toLowerCase();
    const normalizedLabel = row.custom_status_label || row.workflow_stage_label || row.opp_status_label || row.lead_status_label || pipelineStatusValue;

    const isLost =
      activeTab === 'lost-leads' ||
      String(row.status || '').toLowerCase() === 'lost' ||
      String(row.lead_status || '').toLowerCase() === 'lost' ||
      String(row.opp_status || '').toLowerCase() === 'lost' ||
      String(row.workflow_stage || '').toLowerCase() === 'lost' ||
      String(row.custom_status_code || '').toLowerCase() === 'lost';

    const statusValues = Array.from(
      new Set(
        [
          row.custom_status_code,
          row.workflow_stage,
          row.status,
          row.lead_status,
          row.opp_status,
        ]
          .map((value) => normalizeStatusValue(value))
          .filter(Boolean)
      )
    );

    return {
      id: row.id,
      row_type: row.row_type || (row.opportunity_id ? 'opportunity' : 'lead'),
      // Preserve these so dedupeLeadOpportunityRows can correlate leads <-> opportunities
      lead_id: row.lead_id ?? null,
      opportunity_id: row.opportunity_id ?? null,
      sales_number: row.sales_number || null,
      display_number:
        row.sales_number
          ? String(row.sales_number)
          : (row.display_number || `${row.row_type === 'opportunity' ? 'OPP' : 'LEAD'}-${String(row.id).padStart(5, '0')}`),
      name: row.name || `#${row.id}`,
      email: row.email || '',
      phone: row.phone || '',
      status: isLost ? 'lost' : normalizedStatus,
      status_label: isLost ? 'Lost' : normalizedLabel,
      raw_status: String(row.status || '').toLowerCase(),
      lead_status: String(row.lead_status || row.status || '').toLowerCase(),
      opp_status: String(row.opp_status || row.status || '').toLowerCase(),
      status_color: isLost ? null : resolveStatusCodeColor(row),
      status_values: statusValues,
      custom_status_code: internalStatusValue || '',
      custom_status_label: row.custom_status_label || '',
      workflow_stage: row.workflow_stage || '',
      workflow_stage_label: row.workflow_stage_label || '',
      branch_id: row.branch_id || '',
      assigned_user_id: row.assigned_user_id || '',
      assigned_user_name: row.assigned_user_name || '',
      service_type: row.service_type || '',
      move_type: row.move_type || row.legacy_move_type || row.mover_type_name || '',
      move_size: row.move_size || '',
      source: row.source || '',
      last_contacted_at: row.last_contacted_at || null,
      move_date: row.move_date || '',
      created_at: row.created_at || '',
      branch_state: row.branch_state || '',
      value: Number(row.value || row.lead_cost || 0),
      lead_cost: Number(row.lead_cost || 0),
      priority: row.priority || '',
      origin: normalizeDisplayText(row.origin) || null,
      destination: normalizeDisplayText(row.destination) || null,
    };
  }, [activeTab, resolveStatusCodeColor]);

  const loadMetadata = useCallback(async ({ dashboardOnly = false } = {}) => {
    const branchKey = String(filters.branch || '').trim() || 'all';
    const cacheKey = dashboardOnly ? `${branchKey}:dashboard` : branchKey;
    const cachedEntry = metadataCacheRef.current.get(cacheKey);
    if (cachedEntry && (Date.now() - cachedEntry.timestamp) < 5 * 60 * 1000) {
      return cachedEntry.payload;
    }

    if (!metadataPromiseRef.current) {
      const baseRequests = dashboardOnly
        ? [
            getBranchLookups(),
            getLookupUsers({ limit: 100 }),
          ]
        : [
            getBranchLookups(),
            getLookupUsers({ limit: 100 }),
            getStatusCodeLookupsPage('', 0, 100),
            getLeadStatusCodeLookups({ limit: 100, ...(filters.branch ? { branch: filters.branch } : {}) }).catch(() => null),
            getServices(filters.branch ? { branch: filters.branch } : {}).catch(() => null),
            getMoveTypeLookups(filters.branch ? { branch: filters.branch } : {}).catch(() => null),
            getMoverSizeLookups(filters.branch ? { branch: filters.branch } : {}).catch(() => null),
          ];
      metadataPromiseRef.current = Promise.all(baseRequests)
        .then((responses) => {
          const [
            branchesRes,
            lookupUsersRes,
            oppStatusRes,
            leadStatusRes,
            serviceTypesRes,
            moveTypesRes,
            moveSizesRes,
          ] = responses;
          const branchRows = asList(branchesRes);
          const users = normalizeMetadataUsers(lookupUsersRes);
          const statusLookups = [
            ...normalizeLookupItems(oppStatusRes),
            ...normalizeLookupItems(leadStatusRes?.data || leadStatusRes),
          ];
          const scopedBranches = restrictToAccessibleBranches
            ? branchRows.filter((branch) => accessibleBranchIds.has(String(branch.id)))
            : branchRows;
          const scopedUsers = restrictToAccessibleBranches
            ? users.filter((item) => getUserBranchIds(item).some((branchId) => accessibleBranchIds.has(String(branchId))))
            : users;
          const payload = {
            branches: scopedBranches,
            users: scopedUsers,
            statusLookups,
            serviceTypes: asList(serviceTypesRes),
            moveTypes: asList(moveTypesRes),
            moveSizes: asList(moveSizesRes),
          };
          metadataCacheRef.current.set(cacheKey, { timestamp: Date.now(), payload });
          return payload;
        })
        .catch((error) => {
          throw error;
        })
        .finally(() => {
          metadataPromiseRef.current = null;
        });
    }

    return metadataPromiseRef.current;
  }, [accessibleBranchIds, filters.branch, restrictToAccessibleBranches]);

  const fetchInitialData = useCallback(async (options = {}) => {
    const forceRefresh = Boolean(options?.forceRefresh);
    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;

    try {
      if (!hasLoadedOnceRef.current && !hasCachedTableState) setIsLoading(true);
      const metadataPayload = await loadMetadata({ dashboardOnly: activeTab === 'dashboard' });
      statusCodesRef.current = asList(metadataPayload?.statusLookups);

      // Dashboard has its own data loader; avoid pulling the pipeline queue when it is visible.
      if (activeTab === 'dashboard') {
        if (requestSequenceRef.current === requestId) {
          setMetadata((prev) => ({
            ...prev,
            branches: metadataPayload.branches,
            users: metadataPayload.users,
            serviceTypes: metadataPayload.serviceTypes,
            moveTypes: metadataPayload.moveTypes,
            moveSizes: metadataPayload.moveSizes,
            statusLookups: metadataPayload.statusLookups,
          }));
          hasLoadedOnceRef.current = true;
          if (!hasCachedTableState) setIsLoading(false);
          setIsTabSwitching(false);
        }
        return;
      }

      let rows = [];
      let cachedResponse = null;
      let queueCacheKey = null;

      if (activeTab === 'follow-up') {
        const followUpOrdering = sortConfig.key
          ? `${sortConfig.direction === 'desc' ? '-' : ''}${mapOrderingKey(sortConfig.key)}`
          : '-activity__created_at,-sales_number';
        const params = { ordering: followUpOrdering, page: currentPage, page_size: PAGE_SIZE };
        if (filters.branch) params.branch = filters.branch;
        if (filters.assigned_to) params.assigned_to = filters.assigned_to;
        const tasksRes = await getTasks(params);
        const rawTasks = asList(tasksRes?.data || tasksRes);
        rows = rawTasks.map(task => normalizeTaskRow(task));

        const totalCount = Number(tasksRes?.data?.count ?? tasksRes?.count ?? rawTasks.length ?? rows.length ?? 0);
        
        setPagination({
          count: totalCount,
          page: currentPage,
          pageSize: PAGE_SIZE,
          totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
        });
        
        const pendingTasks = rows.filter(r => r.status !== 'completed');
        const overdueTasks = pendingTasks.filter(r => r.due_date && new Date(r.due_date) < new Date());
        const totalValue = pendingTasks.reduce((sum, r) => sum + (r.value || 0), 0);
        
        setQueueSummary(prev => ({
          ...prev,
          total: totalCount,
          lead_count: rows.filter(r => r.related_type === 'lead').length,
          opportunity_count: rows.filter(r => r.related_type === 'opportunity').length,
          hot_count: overdueTasks.length,
          new_count: pendingTasks.length,
          value_total: totalValue,
          conversion_rate: 0,
        }));
      } else {
        const queueParams = {
          page: currentPage,
          page_size: PAGE_SIZE,
        };
        if (sortConfig.key) {
          queueParams.ordering = `${sortConfig.direction === 'desc' ? '-' : ''}${sortConfig.key === 'value' ? 'lead_cost' : mapOrderingKey(sortConfig.key)}`;
        }
        if (activeTab === 'new-leads') {
          queueParams.row_type = 'lead';
        } else if (activeTab === 'booked' || activeTab === 'confirmed' || activeTab === 'completed') {
          queueParams.row_type = 'opportunity';
        }
        const normalizedStatus = normalizeStatusValue(filters.status);
        const trimmedSearch = String(searchTerm || '').trim();
        const tabStatus = activeTab === 'booked'
          ? 'booked'
          : activeTab === 'confirmed'
            ? 'confirmed'
            : activeTab === 'completed'
              ? 'completed'
              : '';

        if (trimmedSearch) queueParams.search = trimmedSearch;
        if (filters.branch) queueParams.branch = filters.branch;
        if (filters.assigned_to) queueParams.assigned_user = filters.assigned_to;
        if (filters.province) queueParams.province = filters.province;
        if (filters.service_type) queueParams.service_type = filters.service_type;
        if (filters.move_type && filters.move_type !== 'all') {
          queueParams.move_type = filters.move_type;
          queueParams.moveType = filters.move_type;
        }
        if (filters.source) queueParams.source = filters.source;
        if (filters.move_size) queueParams.move_size = filters.move_size;
        if (filters.origin) queueParams.origin = filters.origin;
        if (filters.destination) queueParams.destination = filters.destination;
        if (filters.receivedDate) queueParams.receivedDate = filters.receivedDate;
        if (filters.dateType) queueParams.date_field = filters.dateType;
        if (filters.startDate) queueParams.startDate = filters.startDate;
        if (filters.endDate) queueParams.endDate = filters.endDate;
        if (activeTab === 'lost-leads') {
          queueParams.lead_status = 'lost';
          queueParams.opp_status = 'lost';
          queueParams.include_converted = true;
        } else if (normalizedStatus && normalizedStatus !== 'all') {
          if (activeTab === 'all-leads' || activeTab === 'new-leads') {
            queueParams.lead_status = normalizedStatus;
          } else if (activeTab === 'leads') {
            queueParams.lead_status = normalizedStatus;
            queueParams.opp_status = normalizedStatus;
          } else {
            queueParams.opp_status = normalizedStatus;
          }
        } else if (tabStatus && (activeTab === 'booked' || activeTab === 'confirmed' || activeTab === 'completed')) {
          queueParams.opp_status = tabStatus;
        }
        if (activeTab === 'leads') {
          queueParams.exclude_unassigned_leads = true;
          queueParams.opp_exclude_status = 'booked,confirmed,completed,lost';
        }
        if (activeTab === 'new-leads') {
          queueParams.unassigned_leads_only = true;
        }
        if (activeTab === 'all-leads' || activeTab === 'lost-leads') {
          queueParams.include_converted = true;
        }
        if (activeTab === 'all-leads') {
          queueParams.lead_exclude_status = 'lost';
          queueParams.opp_exclude_status = 'lost';
        }

        queueCacheKey = JSON.stringify({
          activeTab,
          queueParams,
        });
        const cachedEntry = forceRefresh ? null : queueCacheRef.current.get(queueCacheKey);
        if (cachedEntry && (Date.now() - cachedEntry.timestamp) < 30000) {
          cachedResponse = cachedEntry.payload;
        }

        if (activeTab === 'lost-leads') {
          const queueRes = cachedResponse || await getMyLeadsQueue(queueParams);
          const queueRaw = Array.isArray(queueRes) ? queueRes : (queueRes?.results || []);
          const normalizedRows = queueRaw.map(normalizeQueueRow);
          const lostOnlyRows = normalizedRows.filter(isLostRecord);
          rows = dedupeLeadOpportunityRows(lostOnlyRows);
          const totalCount = Number(queueRes?.count ?? queueRaw.length ?? rows.length ?? 0);
          setPagination({
            count: totalCount,
            page: currentPage,
            pageSize: PAGE_SIZE,
            totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
          });
          setQueueSummary(prev => ({ ...prev, ...(queueRes?.summary || {}) }));
          if (!cachedResponse) {
            queueCacheRef.current.set(queueCacheKey, { timestamp: Date.now(), payload: queueRes });
          }
        } else if (activeTab === 'all-leads') {
          const queueRes = cachedResponse || await getMyLeadsQueue(queueParams);
          const queueRaw = Array.isArray(queueRes) ? queueRes : (queueRes?.results || []);
          rows = dedupeLeadOpportunityRows(queueRaw.map(normalizeQueueRow).filter((row) => !isLostRecord(row)));
          const totalCount = Number(queueRes?.count ?? queueRaw.length ?? rows.length ?? 0);
          setPagination({
            count: totalCount,
            page: currentPage,
            pageSize: PAGE_SIZE,
            totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
          });
          setQueueSummary(prev => ({ ...prev, ...(queueRes?.summary || {}) }));
          if (!cachedResponse) {
            queueCacheRef.current.set(queueCacheKey, { timestamp: Date.now(), payload: queueRes });
          }
        } else if (activeTab === 'leads') {
          const queueRes = cachedResponse || await getMyLeadsQueue(queueParams);
          const queueRaw = Array.isArray(queueRes) ? queueRes : (queueRes?.results || []);
          rows = dedupeLeadOpportunityRows(queueRaw.map(normalizeQueueRow));
          const totalCount = Number(queueRes?.count ?? queueRaw.length ?? rows.length ?? 0);
          setPagination({
            count: totalCount,
            page: currentPage,
            pageSize: PAGE_SIZE,
            totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
          });
          setQueueSummary(prev => ({ ...prev, ...(queueRes?.summary || {}) }));
          if (!cachedResponse) {
            queueCacheRef.current.set(queueCacheKey, { timestamp: Date.now(), payload: queueRes });
          }
        } else if (activeTab === 'new-leads') {
          const queueRes = cachedResponse || await getMyLeadsQueue(queueParams);
          const queueRaw = Array.isArray(queueRes) ? queueRes : (queueRes?.results || []);
          rows = queueRaw.map(normalizeQueueRow);
          const totalCount = Number(queueRes?.count ?? queueRaw.length ?? rows.length ?? 0);
          setPagination({
            count: totalCount,
            page: currentPage,
            pageSize: PAGE_SIZE,
            totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
          });
          setQueueSummary(prev => ({ ...prev, ...(queueRes?.summary || {}) }));
          if (!cachedResponse) {
            queueCacheRef.current.set(queueCacheKey, { timestamp: Date.now(), payload: queueRes });
          }
        } else {
          if (activeTab === 'booked') queueParams.opp_status = 'booked';
          if (activeTab === 'confirmed') queueParams.opp_status = 'confirmed';
          if (activeTab === 'completed') queueParams.opp_status = 'completed';
          const queueRes = cachedResponse || await getMyLeadsQueue(queueParams);
          const queueRaw = Array.isArray(queueRes) ? queueRes : (queueRes?.results || []);
          rows = queueRaw.map(normalizeQueueRow);
          const totalCount = Number(queueRes?.count ?? queueRaw.length ?? rows.length ?? 0);
          setPagination({
            count: totalCount,
            page: currentPage,
            pageSize: PAGE_SIZE,
            totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
          });
          setQueueSummary(prev => ({ ...prev, ...(queueRes?.summary || {}) }));
          if (!cachedResponse) {
            queueCacheRef.current.set(queueCacheKey, { timestamp: Date.now(), payload: queueRes });
          }
        }
      }
      if (requestSequenceRef.current !== requestId) return;

      // Final safety dedup: guarantee unique row_type+id so React keys are never duplicated
      const seenKeys = new Set();
      const uniqueRows = rows.filter((row) => {
        const k = `${row.row_type}-${row.id}`;
        if (seenKeys.has(k)) return false;
        seenKeys.add(k);
        return true;
      });
      setData(uniqueRows);
      setSelectedRecordKeys((prev) => {
        if (!prev.size) return prev;
        const next = new Set();
        rows.forEach((row) => {
          const key = `${row.row_type}:${row.id}`;
          if (prev.has(key)) next.add(key);
        });
        return next;
      });

      const sources = Array.from(new Set(rows.map(i => i.source).filter(Boolean)));

      setMetadata(prev => ({
        ...prev,
        branches: metadataPayload.branches,
        users: metadataPayload.users,
        sources: sources,
        serviceTypes: metadataPayload.serviceTypes,
        moveTypes: metadataPayload.moveTypes,
        moveSizes: metadataPayload.moveSizes,
        statusLookups: metadataPayload.statusLookups,
      }));
    } catch (err) {
      if (requestSequenceRef.current !== requestId) return;
      console.error('Failed to fetch pipeline data:', err);
      if (!hasCachedTableState) {
        setData([]);
        setQueueSummary(prev => ({
          ...prev,
          total: 0,
          lead_count: 0,
          opportunity_count: 0,
          hot_count: 0,
          new_count: 0,
          value_total: 0,
          conversion_rate: 0,
        }));
        setPagination({
          count: 0,
          page: currentPage,
          pageSize: PAGE_SIZE,
          totalPages: 1,
        });
      }
    } finally {
      if (requestSequenceRef.current === requestId) {
        hasLoadedOnceRef.current = true;
        if (!hasCachedTableState) setIsLoading(false);
        const elapsed = Date.now() - tabSwitchStartRef.current;
        const minimumVisibleMs = 250;
        if (tabSwitchTimerRef.current) {
          window.clearTimeout(tabSwitchTimerRef.current);
          tabSwitchTimerRef.current = null;
        }
        const remaining = Math.max(0, minimumVisibleMs - elapsed);
        tabSwitchTimerRef.current = window.setTimeout(() => {
          setIsTabSwitching(false);
          tabSwitchTimerRef.current = null;
        }, remaining);
      }
    }
  }, [
    activeTab,
    currentPage,
    filters.assigned_to,
    filters.branch,
    filters.dateType,
    filters.destination,
    filters.endDate,
    filters.move_size,
    filters.move_type,
    filters.origin,
    filters.province,
    filters.receivedDate,
    filters.service_type,
    filters.source,
    filters.startDate,
    filters.status,
    loadMetadata,
    normalizeQueueRow,
    searchTerm,
    mapOrderingKey,
    sortConfig.direction,
    sortConfig.key,
  ]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const refreshSalesDataAfterMutation = useCallback(async () => {
    queueCacheRef.current.clear();
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(SALES_TABLE_STATE_STORAGE_KEY);
      window.sessionStorage.removeItem(getSalesTableStateStorageKey());
    }
    await fetchInitialData({ forceRefresh: true });
  }, [fetchInitialData]);

  useEffect(() => {
    return () => {
      if (tabSwitchTimerRef.current) {
        window.clearTimeout(tabSwitchTimerRef.current);
      }
      if (tabSwitchFrameRef.current) {
        window.cancelAnimationFrame(tabSwitchFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    writeSalesTableState({
      activeTab,
      data,
      currentPage,
      sortConfig,
      filters,
      pagination,
      queueSummary,
      metadata: {
        branches: metadata.branches,
        users: metadata.users,
        sources: metadata.sources,
        moveSizes: metadata.moveSizes,
        statusLookups: metadata.statusLookups,
      },
    });
  }, [activeTab, currentPage, data, filters, metadata.branches, metadata.moveSizes, metadata.sources, metadata.statusLookups, metadata.users, pagination, queueSummary, sortConfig]);

  useEffect(() => {
    if (isDashboard) return;

    const handleLeadCreated = () => {
      queueCacheRef.current.clear();
      clearSalesCompanyStorage();
      fetchInitialData();
    };

    const handleSalesDataChanged = () => {
      queueCacheRef.current.clear();
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(SALES_TABLE_STATE_STORAGE_KEY);
      }
      fetchInitialData();
    };

    const handleTenantChanged = () => {
      queueCacheRef.current.clear();
      metadataCacheRef.current.clear();
      metadataPromiseRef.current = null;
      clearSalesCompanyStorage();
      setData([]);
      setMetadata({
        branches: [],
        users: [],
        sources: [],
        serviceTypes: [],
        moveTypes: [],
        moveSizes: [],
        statusLookups: [],
      });
      setQueueSummary({});
      setPagination({
        count: 0,
        page: 1,
        pageSize: PAGE_SIZE,
        totalPages: 1,
      });
      setCurrentPage(1);
      setFilters({
        branch: '',
        assigned_to: '',
        status: '',
        service_type: '',
        move_type: '',
        move_size: '',
        province: '',
        source: '',
        origin: '',
        destination: '',
        receivedDate: '',
        dateType: '',
        startDate: '',
        endDate: '',
      });
      setSortConfig({
        key: initialSalesTab === 'new-leads' || initialSalesTab === 'follow-up' ? 'created_at' : 'assigned_at',
        direction: 'desc',
      });
      setSelectedRecordKeys(new Set());
      setDashData({});
      setDashError(null);
      hasLoadedOnceRef.current = false;
      fetchInitialData({ forceRefresh: true });
    };

    window.addEventListener('crm:lead-created', handleLeadCreated);
    window.addEventListener('sales-data-changed', handleSalesDataChanged);
    window.addEventListener('app:tenant-changed', handleTenantChanged);
    return () => {
      window.removeEventListener('crm:lead-created', handleLeadCreated);
      window.removeEventListener('sales-data-changed', handleSalesDataChanged);
      window.removeEventListener('app:tenant-changed', handleTenantChanged);
    };
  }, [fetchInitialData, isDashboard]);

  useEffect(() => {
    if (isDashboard) return;

    let disposed = false;
    let refreshInFlight = false;

    const refresh = async () => {
      if (disposed || refreshInFlight || document.visibilityState === 'hidden') return;
      refreshInFlight = true;
      try {
        await fetchInitialData();
      } finally {
        refreshInFlight = false;
      }
    };

    const interval = window.setInterval(refresh, 45000);
    const onFocus = () => {
      refresh();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [fetchInitialData, isDashboard]);

  /* ── Dashboard data fetching ────────────────────────── */
  useEffect(() => {
    if (!isDashboard) return;
    const requestId = ++dashboardRequestSeqRef.current;

    const fetchDashboard = async () => {
      setDashLoading(true);
      setDashError(null);

      try {
        const { startDate, endDate } = getDateRange(dashDateRange);
        const scopeParams = buildDashboardScopeParams(filters.branch, filters.assigned_to, startDate, endDate);
        const [
          dashboardRes,
          tasksRes,
          activitiesRes,
          leadActivitiesRes,
          leadsRes,
          wonRes,
          lostRes,
          paymentsRes,
        ] = await Promise.all([
          getSalesDashboardSummary({
            ...scopeParams,
            branch: filters.branch || '',
            noCache: 1,
          }),
          getTasks({
            limit: 500,
            ...scopeParams,
            status: 'pending',
          }).catch(() => null),
          getActivities({
            limit: 500,
            ...scopeParams,
            noCache: undefined,
          }).catch(() => null),
          getLeadActivities({
            limit: 500,
            ...scopeParams,
          }).catch(() => null),
          getMyLeadsQueue({
            limit: 500,
            ...scopeParams,
            date_field: 'created_at',
            include_converted: true,
          }).catch(() => null),
          getMyLeadsQueue({
            limit: 500,
            opp_status: 'booked',
            ...scopeParams,
            include_converted: true,
          }).catch(() => null),
          getMyLeadsQueue({
            limit: 500,
            lead_status: 'lost',
            opp_status: 'lost',
            ...scopeParams,
            include_converted: true,
          }).catch(() => null),
          getPayments({
            limit: 500,
            ...scopeParams,
          }).catch(() => null),
        ]);

        if (dashboardRequestSeqRef.current !== requestId) return;
        const summaryData = dashboardRes?.data ?? dashboardRes ?? null;
        const taskCount = Number(tasksRes?.data?.count ?? tasksRes?.count ?? 0);
        const combinedActivityRows = [
          ...asList(activitiesRes).filter((row) => String(row?.activity_type || '').toLowerCase() === 'email'),
          ...asList(leadActivitiesRes).filter((row) => String(row?.activity_type || '').toLowerCase() === 'email'),
        ];
        const combinedSmsRows = [
          ...asList(activitiesRes).filter((row) => String(row?.activity_type || '').toLowerCase() === 'sms'),
          ...asList(leadActivitiesRes).filter((row) => String(row?.activity_type || '').toLowerCase() === 'sms'),
        ];
        const combinedCallRows = [
          ...asList(activitiesRes).filter((row) => String(row?.activity_type || '').toLowerCase() === 'call'),
          ...asList(leadActivitiesRes).filter((row) => String(row?.activity_type || '').toLowerCase() === 'call'),
        ];
        const leadsCount = asList(leadsRes).length;
        const wonCount = asList(wonRes).length;
        const lostCount = asList(lostRes).length;
        const paymentRows = asList(paymentsRes).filter((row) => Number(row.amount || row.value || row.estimate_value || 0) > 0);
        setDashData({
          taskTrend: summaryData?.taskTrend ?? 0,
          emailCount: combinedActivityRows.length,
          smsCount: combinedSmsRows.length,
          phoneCallCount: combinedCallRows.length,
          leadsCount,
          paymentTotal: paymentRows.reduce((sum, row) => sum + Number(row.amount || row.value || row.estimate_value || 0), 0),
          paymentCount: paymentRows.length,
          taskCount,
          wonCount,
          lostCount,
          ...(summaryData || {}),
        });
      } catch (err) {
        if (dashboardRequestSeqRef.current !== requestId) return;
        console.error('Dashboard fetch failed:', err);
        setDashError('Failed to load dashboard data. Please try again.');
      } finally {
        if (dashboardRequestSeqRef.current === requestId) {
          setDashLoading(false);
        }
      }
    };

    fetchDashboard();

    const handleSalesDataChanged = () => {
      dashboardRequestSeqRef.current += 1;
      fetchDashboard();
    };

    window.addEventListener('sales-data-changed', handleSalesDataChanged);
    return () => {
      window.removeEventListener('sales-data-changed', handleSalesDataChanged);
    };
  }, [dashDateRange, filters.assigned_to, filters.branch, isDashboard]);

  const handleToggleTaskStatus = useCallback(async (item) => {
    if (!item.activity_id) return;
    if (!canAll([PERMISSIONS.SALES_CHANGE_TASK])) {
      showToast('You do not have permission to update task status.', 'warning');
      return;
    }
    setTaskActionLoadingId(item.id);
    try {
      const nextStatus = item.status === 'completed' ? 'pending' : 'completed';
      await updateSalesActivity(item.activity_id, {
        status: nextStatus,
        completed_at: nextStatus === 'completed' ? new Date().toISOString() : null,
      });
      setData((prev) => prev.map((row) => (
        row.row_type === 'task' && String(row.id) === String(item.id)
          ? {
              ...row,
              status: nextStatus,
              activity_details: {
                ...(row.activity_details || {}),
                status: nextStatus,
                completed_at: nextStatus === 'completed' ? new Date().toISOString() : null,
              },
              activity: {
                ...(row.activity || {}),
                status: nextStatus,
                completed_at: nextStatus === 'completed' ? new Date().toISOString() : null,
              },
            }
          : row
      )));
      showToast(nextStatus === 'completed' ? 'Follow-up marked complete.' : 'Follow-up reopened.', 'success');
    } catch (err) {
      console.error('Failed to update follow-up task status:', err);
      showToast(getErrorMessage(err, 'Failed to update task status.'), 'error');
    } finally {
      setTaskActionLoadingId(null);
    }
  }, [canAll, fetchInitialData, showToast]);

  const openEditTaskModal = useCallback((item) => {
    if (!canAll([PERMISSIONS.SALES_CHANGE_TASK])) {
      showToast('You do not have permission to edit follow-up tasks.', 'warning');
      return;
    }
    const parsedNotes = splitFollowUpNotes(item);
    setTaskEditForm({
      subject: parsedNotes.subject,
      task_type: item.task_type || 'general',
      status: item.status === 'completed' ? 'completed' : 'pending',
      due_date: formatDateTimeLocalInput(item.due_date),
      assigned_to: item.assigned_user_id ? String(item.assigned_user_id) : '',
      notes: parsedNotes.notes,
    });
    setTaskEditModal({ open: true, item });
  }, [canAll, showToast]);

  const closeEditTaskModal = useCallback(() => {
    setTaskEditModal({ open: false, item: null });
  }, []);

  const handleSaveTaskEdit = useCallback(async () => {
    const item = taskEditModal.item;
    if (!item?.task_id || !item?.activity_id) {
      showToast('This follow-up is missing task details and cannot be edited.', 'error');
      return;
    }
    if (!canAll([PERMISSIONS.SALES_CHANGE_TASK])) {
      showToast('You do not have permission to edit follow-up tasks.', 'warning');
      return;
    }
    const subject = String(taskEditForm.subject || '').trim();
    const dueDate = String(taskEditForm.due_date || '').trim();
    if (!subject || !dueDate) {
      showToast('Subject and due date are required.', 'warning');
      return;
    }

    const dueAt = new Date(dueDate);
    if (Number.isNaN(dueAt.getTime())) {
      showToast('Enter a valid due date.', 'warning');
      return;
    }

    const notes = buildFollowUpNotes(taskEditForm);
    setTaskActionLoadingId(item.id);
    try {
      await updateSalesActivity(item.activity_id, {
        subject,
        description: notes || subject,
        status: taskEditForm.status,
        completed_at: taskEditForm.status === 'completed' ? new Date().toISOString() : null,
      });
      await updateTask(item.task_id, {
        task_type: taskEditForm.task_type || 'general',
        assigned_to: taskEditForm.assigned_to ? Number(taskEditForm.assigned_to) : null,
        due_date: dueAt.toISOString(),
        notes,
      });
      setData((prev) => prev.map((row) => (
        row.row_type === 'task' && String(row.id) === String(item.id)
          ? {
              ...row,
              task_type: taskEditForm.task_type || 'general',
              due_date: dueAt.toISOString(),
              notes,
              activity_details: {
                ...(row.activity_details || {}),
                subject,
                description: notes || subject,
                status: taskEditForm.status,
                completed_at: taskEditForm.status === 'completed' ? new Date().toISOString() : null,
              },
            }
          : row
      )));
      closeEditTaskModal();
      showToast('Follow-up updated.', 'success');
    } catch (err) {
      console.error('Failed to edit follow-up task:', err);
      showToast(getErrorMessage(err, 'Failed to edit follow-up.'), 'error');
    } finally {
      setTaskActionLoadingId(null);
    }
  }, [canAll, closeEditTaskModal, fetchInitialData, showToast, taskEditForm, taskEditModal.item]);

  const handleDeleteTask = useCallback(async (item) => {
    if (!item?.activity_id) {
      showToast('This follow-up is missing activity details and cannot be deleted.', 'error');
      return;
    }
    if (!canAll([PERMISSIONS.SALES_CHANGE_TASK])) {
      showToast('You do not have permission to delete follow-up tasks.', 'warning');
      return;
    }
    const subject = splitFollowUpNotes(item).subject || item.subject || 'this follow-up';
    if (!window.confirm(`Delete "${subject}"? This will remove the follow-up.`)) return;

    setTaskActionLoadingId(item.id);
    try {
      await deleteSalesActivity(item.activity_id);
      setData((prev) => prev.filter((row) => row.row_type !== 'task' || row.id !== item.id));
      if (String(taskEditModal.item?.id || '') === String(item.id)) closeEditTaskModal();
      showToast('Follow-up deleted.', 'success');
    } catch (err) {
      console.error('Failed to delete follow-up task:', err);
      showToast(getErrorMessage(err, 'Failed to delete follow-up.'), 'error');
    } finally {
      setTaskActionLoadingId(null);
    }
  }, [canAll, closeEditTaskModal, fetchInitialData, showToast, taskEditModal.item]);

  useEffect(() => {
    if (!selectedBranchId) {
      setSelectedRecordKeys(new Set());
    }
  }, [selectedBranchId]);

  const filteredItems = useMemo(() => {
    return data;
  }, [data]);

  const totalPages = useMemo(() => {
    if (activeTab === 'follow-up') {
      return pagination.totalPages || 1;
    }
    return pagination.totalPages || 1;
  }, [activeTab, pagination.totalPages]);

  const totalCount = useMemo(() => {
    if (activeTab === 'follow-up') {
      return pagination.count || data.length;
    }
    return pagination.count || data.length;
  }, [activeTab, pagination.count, data.length]);

  const displayItems = useMemo(() => {
    if (activeTab === 'follow-up') {
      return filteredItems.filter(item => item.row_type === 'task');
    }
    if (activeTab === 'lost-leads') {
      return filteredItems.filter(isLostRecord);
    }
    if (activeTab === 'leads') {
      return filteredItems.filter((item) => item.row_type !== 'task' && !isLostRecord(item));
    }
    return filteredItems.filter(item => item.row_type !== 'task');
  }, [filteredItems, activeTab]);

  const orderedDisplayItems = useMemo(() => {
    if (!shouldEnableManualLeadSorting || !selectedBranchId) return displayItems;
    return resolveOrderedLeadRows(displayItems, branchLeadOrders, selectedBranchId);
  }, [branchLeadOrders, displayItems, selectedBranchId, shouldEnableManualLeadSorting]);

  const selectedRecordItems = useMemo(
    () => filteredItems.filter((item) => SELECTABLE_ROW_TYPES.has(String(item.row_type || '').toLowerCase()) && selectedRecordKeys.has(`${item.row_type}:${item.id}`)),
    [filteredItems, selectedRecordKeys],
  );
  const visibleSelectableRows = useMemo(
    () => orderedDisplayItems.filter((item) => SELECTABLE_ROW_TYPES.has(String(item.row_type || '').toLowerCase())),
    [orderedDisplayItems],
  );
  const originCityOptions = useMemo(() => {
    const seen = new Set();
    return data
      .map((item) => String(item.origin || '').trim())
      .filter(Boolean)
      .filter((city) => {
        const key = city.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.localeCompare(b));
  }, [data]);

  const destinationCityOptions = useMemo(() => {
    const seen = new Set();
    return data
      .map((item) => String(item.destination || '').trim())
      .filter(Boolean)
      .filter((city) => {
        const key = city.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.localeCompare(b));
  }, [data]);

  const moveSizeOptions = useMemo(() => {
    const seen = new Set();
    return [...normalizeLookupItems(metadata.moveSizes), ...data.map((item) => item.move_size || '')]
      .map((entry) => String(entry?.label || entry?.name || entry?.value || entry || '').trim())
      .filter(Boolean)
      .filter((value) => {
        const key = normalizeFilterText(value);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.localeCompare(b));
  }, [data, metadata.moveSizes]);

  const serviceTypeOptions = useMemo(() => {
    const seen = new Set();
    return [...normalizeLookupItems(metadata.serviceTypes), ...data.map((item) => item.service_type || '')]
      .map((entry) => String(entry?.label || entry?.name || entry?.value || entry || '').trim())
      .filter(Boolean)
      .filter((value) => {
        const key = normalizeFilterText(value);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.localeCompare(b));
  }, [data, metadata.serviceTypes]);

  const moveTypeOptions = useMemo(() => {
    const seen = new Set();
    return [...normalizeLookupItems(metadata.moveTypes), ...data.map((item) => item.move_type || item.legacy_move_type || item.mover_type_name || '')]
      .map((entry) => String(entry?.label || entry?.name || entry?.value || entry || '').trim())
      .filter(Boolean)
      .filter((value) => {
        const key = normalizeFilterText(value);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.localeCompare(b));
  }, [data, metadata.moveTypes]);

  const stats = useMemo(() => ({
    total: queueSummary.total || totalCount,
    hot: queueSummary.hot_count || 0,
    new: queueSummary.new_count || 0,
    value: queueSummary.value_total || 0,
    conversion: queueSummary.conversion_rate || 0,
  }), [queueSummary, totalCount]);

  const performAssignment = async (branchId, userId) => {
    if (!assignModal.lead) return;
    if (!canAll([PERMISSIONS.LEAD_EDIT])) {
      showToast('You do not have permission to assign leads.', 'warning');
      return;
    }
    try {
      setAssigningLeadId(assignModal.lead.id);
      await assignLead(assignModal.lead.id, { 
        branch: branchId ? Number(branchId) : null, 
        assigned_to: userId ? Number(userId) : null 
      });
      setAssignModal({ open: false, lead: null });
      await fetchInitialData();
    } catch (err) {
      console.error('Failed to assign lead:', err);
      alert(getErrorMessage(err, 'Failed to assign lead.'));
    } finally {
      setAssigningLeadId(null);
    }
  };

  const resetFilters = () => {
    setCurrentPage(1);
    setOriginInput('');
    setDestinationInput('');
    writeSavedSalesFilterState({
      branch: '',
      assigned_to: '',
    });
    setFilters({
      status: 'all',
      branch: '',
      assigned_to: '',
      service_type: '',
      source: '',
      move_size: '',
      province: '',
      move_type: 'all',
      origin: '',
      destination: '',
      receivedDate: '',
      dateType: 'move_date',
      startDate: '',
      endDate: ''
    });
  };

  const goToPage = useCallback((nextPage) => {
    const safePage = Math.min(Math.max(1, nextPage), totalPages);
    setCurrentPage(safePage);
  }, [totalPages]);

  const openAssignLeadModal = useCallback((lead) => {
    if (!canAll([PERMISSIONS.LEAD_EDIT])) {
      showToast('You do not have permission to assign leads.', 'warning');
      return;
    }
    setAssignModal({ open: true, lead });
  }, [canAll, showToast]);

  const toggleRecordSelected = useCallback((item) => {
    if (!SELECTABLE_ROW_TYPES.has(String(item?.row_type || '').toLowerCase())) return;
    const key = `${item.row_type}:${item.id}`;
    setSelectedRecordKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleAllVisibleSelected = useCallback(() => {
    setSelectedRecordKeys((prev) => {
      const visibleKeys = visibleSelectableRows.map((item) => `${item.row_type}:${item.id}`);
      if (!visibleKeys.length) return prev;
      const allSelected = visibleKeys.every((key) => prev.has(key));
      const next = new Set(prev);
      if (allSelected) {
        visibleKeys.forEach((key) => next.delete(key));
      } else {
        visibleKeys.forEach((key) => next.add(key));
      }
      return next;
    });
  }, [visibleSelectableRows]);

  const reorderLeadRows = useCallback((sourceLeadId, targetLeadId) => {
    if (!shouldEnableManualLeadSorting || !selectedBranchId || !sourceLeadId || !targetLeadId) return;
    if (String(sourceLeadId) === String(targetLeadId)) return;

    const nextOrders = { ...branchLeadOrders };
    const currentLeadIds = getLeadRowIds(displayItems).map(String);
    const mergedIds = [];
    const seen = new Set();
    for (const id of [...(Array.isArray(nextOrders[selectedBranchId]) ? nextOrders[selectedBranchId] : []).map(String), ...currentLeadIds]) {
      const normalized = String(id);
      if (!currentLeadIds.includes(normalized) || seen.has(normalized)) continue;
      mergedIds.push(normalized);
      seen.add(normalized);
    }

    const sourceIndex = mergedIds.indexOf(String(sourceLeadId));
    const targetIndex = mergedIds.indexOf(String(targetLeadId));
    if (sourceIndex < 0 || targetIndex < 0) return;

    const updatedIds = [...mergedIds];
    const [movedId] = updatedIds.splice(sourceIndex, 1);
    updatedIds.splice(targetIndex, 0, movedId);

    nextOrders[selectedBranchId] = updatedIds;
    setBranchLeadOrders(nextOrders);
    writeSavedBranchLeadOrders(nextOrders);
  }, [branchLeadOrders, displayItems, selectedBranchId, shouldEnableManualLeadSorting]);

  const loadBulkCommunicationTemplates = useCallback(async (channel) => {
    const isEmail = channel === 'email';
    const setLoading = isEmail ? setBulkEmailTemplatesLoading : setBulkSmsTemplatesLoading;
    const setTemplates = isEmail ? setBulkEmailTemplates : setBulkSmsTemplates;
    setLoading(true);
    try {
      const params = { channel };
      const normalizeRows = (rows) => asList(rows).map((row) => ({
        ...row,
        channel: String(row?.channel || channel || '').toLowerCase(),
        is_active: row?.is_active ?? row?.status ?? true,
      }));
      const fetchAllTemplatePages = async (requestParams) => {
        const allRows = [];
        let page = 1;
        let safety = 0;
        while (page && safety < 50) {
          const response = await getCommunicationTemplates({ ...requestParams, page });
          allRows.push(...normalizeRows(response));
          const nextPage = getNextPageNumber(response);
          if (!nextPage || nextPage === page) break;
          page = nextPage;
          safety += 1;
        }
        return allRows;
      };
      const [branchResponse, globalResponse] = await Promise.all([
        filters.branch ? fetchAllTemplatePages({ ...params, branch: filters.branch }) : Promise.resolve([]),
        fetchAllTemplatePages(params),
      ]);
      let templates = [...branchResponse, ...globalResponse];
      const seen = new Set();
      templates = templates.filter((template) => {
        if (!template?.template_key) return true;
        if (seen.has(template.template_key)) return false;
        seen.add(template.template_key);
        return true;
      });
      if (!templates.length) {
        setTemplates([]);
        return [];
      }
      setTemplates(templates);
      return templates;
    } catch (err) {
      console.error(`Failed to load ${channel} templates:`, err);
      setTemplates([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [filters.branch]);

  const loadBulkCommunicationTemplateDetail = useCallback(async (templateId) => {
    if (!templateId) return null;
    try {
      return await getCommunicationTemplate(templateId);
    } catch (err) {
      console.error(`Failed to load communication template ${templateId}:`, err);
      return null;
    }
  }, []);

  const openBulkEmailModal = useCallback(() => {
    if (!selectedRecordItems.length) return;
    if (!canAll(['crm.communications.email.send'])) {
      showToast('You do not have permission to send email.', 'warning');
      return;
    }
    (async () => {
      const templates = await loadBulkCommunicationTemplates('email');
      const firstTemplate = templates[0] || EMPTY_EMAIL_TEMPLATE;
      const firstTemplateId = String(firstTemplate.id || '');
      const fullTemplate = firstTemplateId ? await loadBulkCommunicationTemplateDetail(firstTemplateId) : null;
      const hydratedTemplate = fullTemplate || firstTemplate;
      setBulkEmailTemplateId(firstTemplateId);
      setBulkEmailForm({
        subject: String(hydratedTemplate.subject || 'Follow-up on your move request'),
        body_html: String(hydratedTemplate.body_html || hydratedTemplate.body || ''),
      });
      setBulkEmailOpen(true);
    })();
  }, [canAll, loadBulkCommunicationTemplateDetail, loadBulkCommunicationTemplates, selectedRecordItems.length, showToast]);

  const openBulkSmsModal = useCallback(() => {
    if (!selectedRecordItems.length) return;
    if (!canAll(['crm.communications.sms.send'])) {
      showToast('You do not have permission to send SMS.', 'warning');
      return;
    }
    (async () => {
      const templates = await loadBulkCommunicationTemplates('sms');
      const firstTemplate = templates[0] || null;
      setBulkSmsTemplateId(String(firstTemplate?.id || ''));
      setBulkSmsForm({
        message: String(firstTemplate?.body || firstTemplate?.body_html || ''),
      });
      setBulkSmsOpen(true);
    })();
  }, [canAll, loadBulkCommunicationTemplates, selectedRecordItems.length, showToast]);

  const handleBulkEmailTemplateChange = useCallback(async (templateId) => {
    setBulkEmailTemplateId(templateId);
    const selectedTemplate = bulkEmailTemplates.find((template) => String(template.id) === String(templateId));
    if (!selectedTemplate) {
      setBulkEmailForm({
        subject: 'Follow-up on your move request',
        body_html: '',
      });
      return;
    }
    const fullTemplate = await loadBulkCommunicationTemplateDetail(templateId);
    const hydratedTemplate = fullTemplate || selectedTemplate;
    setBulkEmailForm({
      subject: String(hydratedTemplate.subject || ''),
      body_html: String(hydratedTemplate.body_html || hydratedTemplate.body || ''),
    });
  }, [bulkEmailTemplates, loadBulkCommunicationTemplateDetail]);

  const handleBulkSmsTemplateChange = useCallback((templateId) => {
    setBulkSmsTemplateId(templateId);
    const selectedTemplate = bulkSmsTemplates.find((template) => String(template.id) === String(templateId));
    setBulkSmsForm({
      message: String(selectedTemplate?.body || selectedTemplate?.body_html || ''),
    });
  }, [bulkSmsTemplates]);

  const openBulkAssignModal = useCallback(async () => {
    if (!selectedRecordItems.length) return;
    if (!canAny([PERMISSIONS.LEAD_EDIT, 'crm.pipeline.change_stage'])) {
      showToast('You do not have permission to assign selected records.', 'warning');
      return;
    }
    await loadMetadata();
    setBulkAssignForm({
      branch: filters.branch || '',
      assigned_to: '',
    });
    setBulkAssignOpen(true);
  }, [canAny, filters.branch, loadMetadata, selectedRecordItems.length, showToast]);

  const bulkAssignSelected = useCallback(async () => {
    const items = selectedRecordItems.map((item) => {
      if (item.row_type === 'task') return { row_type: item.related_type, id: item.related_id };
      return { row_type: item.row_type, id: item.id };
    });
    if (!items.length) return;
    if (!canAny([PERMISSIONS.LEAD_EDIT, 'crm.pipeline.change_stage'])) {
      showToast('You do not have permission to assign selected records.', 'warning');
      return;
    }
    setBulkActionLoading(true);
    try {
      const payload = {
        items,
        branch: bulkAssignForm.branch ? Number(bulkAssignForm.branch) : null,
        assigned_user: bulkAssignForm.assigned_to ? Number(bulkAssignForm.assigned_to) : null,
      };
      const result = await bulkSalesAssign(payload);
      const data = result?.data || {};
      setBulkAssignOpen(false);
      setSelectedRecordKeys(new Set());
      setData((prev) => prev.map((row) => {
        const matches = items.some((item) => String(item.id) === String(row.id) && item.row_type === row.row_type);
        if (!matches) return row;
        return {
          ...row,
          branch_id: bulkAssignForm.branch ? Number(bulkAssignForm.branch) : row.branch_id,
          assigned_user_id: bulkAssignForm.assigned_to ? Number(bulkAssignForm.assigned_to) : row.assigned_user_id,
        };
      }));
      showToast(
        `Assignment updated for ${data.updated || 0} record${(data.updated || 0) === 1 ? '' : 's'}${data.failed ? `, ${data.failed} failed` : ''}.`,
        data.failed ? 'warning' : 'success'
      );
    } catch (err) {
      console.error('Bulk assign failed:', err);
      alert(getErrorMessage(err, 'Failed to assign selected records.'));
    } finally {
      setBulkActionLoading(false);
    }
  }, [bulkAssignForm.assigned_to, bulkAssignForm.branch, canAny, refreshSalesDataAfterMutation, selectedRecordItems, showToast]);

  const openBulkStatusModal = useCallback(() => {
    if (!selectedRecordItems.length) return;
    if (!canAny([PERMISSIONS.LEAD_EDIT, 'crm.settings.status_codes.manage'])) {
      showToast('You do not have permission to change status.', 'warning');
      return;
    }
    setBulkStatus(
      String(selectedRecordItems[0]?.custom_status_code || bulkStatusOptions[0]?.value || '')
    );
    setBulkStatusOpen(true);
  }, [bulkStatusOptions, canAny, selectedRecordItems, showToast]);

  const bulkChangeStatus = useCallback(async () => {
    const items = selectedRecordItems.map((item) => {
      if (item.row_type === 'task') return { row_type: item.related_type, id: item.related_id };
      return { row_type: item.row_type, id: item.id };
    });
    if (!items.length) return;
    if (!canAny([PERMISSIONS.LEAD_EDIT, 'crm.settings.status_codes.manage'])) {
      showToast('You do not have permission to change status.', 'warning');
      return;
    }
    setBulkActionLoading(true);
    try {
      const result = await bulkSalesStatus({
        items,
        status_code: bulkStatus,
      });
      const data = result?.data || {};
      setBulkStatusOpen(false);
      setSelectedRecordKeys(new Set());
      setData((prev) => prev.map((row) => {
        const matches = items.some((item) => String(item.id) === String(row.id) && item.row_type === row.row_type);
        if (!matches) return row;
        return {
          ...row,
          custom_status_code: bulkStatus,
          custom_status_label: row.custom_status_label,
          status_values: Array.from(new Set([...(row.status_values || []), String(bulkStatus || '').toLowerCase()].filter(Boolean))),
        };
      }));
      showToast(
        `Status updated for ${data.updated || 0} record${(data.updated || 0) === 1 ? '' : 's'}${data.failed ? `, ${data.failed} failed` : ''}.`,
        data.failed ? 'warning' : 'success'
      );
    } catch (err) {
      console.error('Bulk status change failed:', err);
      alert(getErrorMessage(err, 'Failed to change status.'));
    } finally {
      setBulkActionLoading(false);
    }
  }, [bulkStatus, canAny, refreshSalesDataAfterMutation, selectedRecordItems, showToast]);

  const bulkMarkLost = useCallback(async () => {
    const items = selectedRecordItems.map((item) => {
      if (item.row_type === 'task') return { row_type: item.related_type, id: item.related_id };
      return { row_type: item.row_type, id: item.id };
    });
    if (!items.length) return;
    if (!canAny([PERMISSIONS.LEAD_EDIT, 'crm.pipeline.change_stage'])) {
      showToast('You do not have permission to mark records as lost.', 'warning');
      return;
    }
    const reason = window.prompt('Reason for marking selected records as lost:', 'Marked lost from sales page') || '';
    if (!String(reason).trim()) return;
    setBulkActionLoading(true);
    try {
      const result = await bulkSalesMarkLost({
        items,
        reason: String(reason).trim(),
      });
      const data = result?.data || {};
      setSelectedRecordKeys(new Set());
      setData((prev) => prev.filter((row) => !items.some((item) => String(item.id) === String(row.id) && item.row_type === row.row_type)));
      showToast(
        `Marked lost for ${data.updated || 0} record${(data.updated || 0) === 1 ? '' : 's'}${data.failed ? `, ${data.failed} failed` : ''}.`,
        data.failed ? 'warning' : 'success'
      );
    } catch (err) {
      console.error('Bulk mark lost failed:', err);
      alert(getErrorMessage(err, 'Failed to mark selected records as lost.'));
    } finally {
      setBulkActionLoading(false);
    }
  }, [canAny, refreshSalesDataAfterMutation, selectedRecordItems, showToast]);

  const bulkSendEmail = useCallback(async () => {
    const items = selectedRecordItems.map((item) => {
      if (item.row_type === 'task') return { row_type: item.related_type, id: item.related_id };
      return { row_type: item.row_type, id: item.id };
    });
    if (!items.length) return;
    if (!canAll(['crm.communications.email.send'])) {
      showToast('You do not have permission to send email.', 'warning');
      return;
    }
    if (!bulkEmailForm.subject.trim() || !bulkEmailForm.body_html.trim()) {
      showToast('Email subject and body are required.', 'warning');
      return;
    }
    setBulkActionLoading(true);
    try {
      const selectedTemplate = bulkEmailTemplates.find((t) => String(t.id) === String(bulkEmailTemplateId));
      
      const result = await bulkSalesEmail({
        items,
        subject: bulkEmailForm.subject,
        body_html: replaceBranchPlaceholders(bulkEmailForm.body_html, {
          branchLogoUrl: selectedBranchLogoUrl,
          branchName: selectedBranchName,
        }),
        template_key: selectedTemplate?.template_key || '',
      });
      const data = result?.data || {};
      const sentCount = Number(data.sent ?? data.results?.length ?? items.length ?? 0);
      const failedCount = Number(data.failed ?? data.errors?.length ?? 0);
      setBulkEmailOpen(false);
      setSelectedRecordKeys(new Set());
      showToast(
        `Email sent to ${sentCount} record${sentCount === 1 ? '' : 's'}${failedCount ? `, ${failedCount} failed` : ''}.`,
        failedCount ? 'warning' : 'success'
      );
    } catch (err) {
      console.error('Bulk email failed:', err);
      alert(getErrorMessage(err, 'Failed to send bulk email.'));
    } finally {
      setBulkActionLoading(false);
    }
  }, [
    bulkEmailForm.body_html,
    bulkEmailForm.subject,
    bulkEmailTemplateId,
    bulkEmailTemplates,
    canAll,
    refreshSalesDataAfterMutation,
    selectedBranchLogoUrl,
    selectedBranchName,
    selectedRecordItems,
    showToast,
  ]);

  const bulkSendSms = useCallback(async () => {
    const items = selectedRecordItems.map((item) => {
      if (item.row_type === 'task') return { row_type: item.related_type, id: item.related_id };
      return { row_type: item.row_type, id: item.id };
    });
    if (!items.length) return;
    if (!canAll(['crm.communications.sms.send'])) {
      showToast('You do not have permission to send SMS.', 'warning');
      return;
    }
    if (!bulkSmsForm.message.trim()) {
      showToast('SMS message is required.', 'warning');
      return;
    }
    setBulkActionLoading(true);
    try {
      const selectedTemplate = bulkSmsTemplates.find((t) => String(t.id) === String(bulkSmsTemplateId));
      
      const result = await bulkSalesSms({
        items,
        message: bulkSmsForm.message,
        template_key: selectedTemplate?.template_key || '',
      });
      const data = result?.data || {};
      const sentCount = Number(data.sent ?? data.results?.length ?? items.length ?? 0);
      const failedCount = Number(data.failed ?? data.errors?.length ?? 0);
      setBulkSmsOpen(false);
      setSelectedRecordKeys(new Set());
      showToast(
        `SMS sent to ${sentCount} record${sentCount === 1 ? '' : 's'}${failedCount ? `, ${failedCount} failed` : ''}.`,
        failedCount ? 'warning' : 'success'
      );
    } catch (err) {
      console.error('Bulk SMS failed:', err);
      alert(getErrorMessage(err, 'Failed to send bulk SMS.'));
    } finally {
      setBulkActionLoading(false);
    }
  }, [
    bulkSmsForm.message,
    bulkSmsTemplateId,
    bulkSmsTemplates,
    canAll,
    refreshSalesDataAfterMutation,
    selectedRecordItems,
    showToast,
  ]);

  const handleRowClick = useCallback((item, e) => {
    const target = e.target;
    if (
      target instanceof Element &&
      target.closest(
        'select, button, input, textarea, a, [data-no-row-nav="true"]',
      )
    ) {
      return;
    }
    const openInNewTab = (path) => {
      if (!path || typeof window === 'undefined') return;
      window.open(path, '_blank', 'noopener,noreferrer');
    };
    if (item.row_type === "task") {
      if (item.related_type === "lead") {
        openInNewTab(getRecordDetailPath('lead', { sales_number: item.sales_number, id: item.related_id }));
      } else {
        openInNewTab(getRecordDetailPath('opportunity', { sales_number: item.sales_number, id: item.related_id }));
      }
    } else {
      if (item.row_type === "lead") {
        openInNewTab(getRecordDetailPath('lead', item));
      } else {
        openInNewTab(getRecordDetailPath('opportunity', item));
      }
    }
  }, [activeTab]);

  const skeletonColumns = isLeadTab ? 12 : 13;
  const skeletonRows = Array.from({ length: 6 }, (_, index) => index);
  const TabSwitchLoader = () => (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-white/90 backdrop-blur-[1px]">
      <div className="flex items-end gap-2 rounded-full border border-blue-100 bg-white px-8 py-6 shadow-xl shadow-blue-100/40">
        <span className="h-3.5 w-2.5 animate-pulse rounded-full bg-blue-300" />
        <span className="h-6 w-2.5 animate-pulse rounded-full bg-sky-400 [animation-delay:120ms]" />
        <span className="h-9 w-2.5 animate-pulse rounded-full bg-blue-500 [animation-delay:240ms]" />
        <span className="h-5 w-2.5 animate-pulse rounded-full bg-indigo-400 [animation-delay:360ms]" />
        <span className="h-4 w-2.5 animate-pulse rounded-full bg-cyan-300 [animation-delay:480ms]" />
      </div>
    </div>
  );

  if (isLoading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/30">
      
      {/* 1. Page Header */}
      <div className="border-b border-slate-200 bg-transparent">
        <div className="mx-auto max-w-[1600px] px-6 pt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Pipeline</h1>
              <p className="mt-1 text-sm text-slate-500">Leads, opportunities and booked jobs.</p>
            </div>
            
            <div className="flex items-center gap-2 mb-1">
              <div className="flex gap-2">
                <select
                  value={filters.branch}
                  onChange={(e) => updateBranchFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
                >
                  <option value="">All Branches</option>
                  {metadata.branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <select
                  value={filters.assigned_to}
                  onChange={(e) => updateFilterValue('assigned_to', e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
                >
                  <option value="">All Staff</option>
                  {filteredUsersByBranch.map((u) => (
                    <option key={u.id} value={u.id}>
                      {[u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email || `User #${u.id}`}
                    </option>
                  ))}
                </select>
              </div>
              {!isDashboard && (
                <>

                  <button
                    onClick={() => setIsFilterOpen((v) => !v)}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      isFilterOpen
                        ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100/50"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    Filter
                  </button>

                  <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                        viewMode === 'table'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                      title="Table View"
                      aria-label="Table View"
                    >
                      <LayoutList size={14} />
                      <span className="hidden sm:inline">Table</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('cards')}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
                        viewMode === 'cards'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                      title="Cards View"
                      aria-label="Cards View"
                    >
                      <LayoutGrid size={14} />
                      <span className="hidden sm:inline">Cards</span>
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>

          
          
          {/* Sub-nav tabs */}
        <div className="flex inter-col gap-6 justify-between mt-4">
          <nav className="mt-4 mb-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {TABS.map((t) => {
              const active = t.id === activeTab;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    if (t.id === activeTab) return;
                    setIsTabSwitching(true);
                    if (tabSwitchFrameRef.current) {
                      window.cancelAnimationFrame(tabSwitchFrameRef.current);
                    }
                    tabSwitchFrameRef.current = window.requestAnimationFrame(() => {
                      setActiveTab(t.id);
                      navigate(getSalesListTabPath(t.id), { state: { activeTab: t.id } });
                      tabSwitchFrameRef.current = null;
                    });
                  }}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold whitespace-nowrap rounded-lg transition-all cursor-pointer ${
                    active
                      ? "bg-slate-900 text-white shadow-sm ring-1 ring-slate-900/10"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  } ${isTabSwitching && active ? 'animate-pulse' : ''} ${isTabSwitching ? 'pointer-events-none' : ''}`}
                >
                  {t.label}
                  {getTabCount(t.id) !== null && (
                    <span className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                      active ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-600"
                    }`}>
                      {getTabCount(t.id)}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1600px] px-6 py-6 space-y-2">
        {isDashboard ? (
          <div className="relative rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {isTabSwitching ? (
              <TabSwitchLoader />
            ) : null}
            <div className={isTabSwitching ? 'opacity-0' : 'opacity-100'}>
              <DashboardPane
                dashData={dashData}
                dashLoading={dashLoading}
                dashError={dashError}
                dashDateRange={dashDateRange}
                setDashDateRange={setDashDateRange}
                selectedUser={filters.assigned_to}
                selectedBranch={filters.branch}
                branches={metadata.branches}
                users={metadata.users}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* 2. Bento KPI Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {/* Card 1: Blue Theme */}
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 sm:px-3.5 sm:py-2.5 shadow-sm flex items-center gap-3 transition-all hover:shadow-md">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-50 text-blue-700">
                  <Target className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0 text-blue-700">
                  <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate">
                    Total {activeTab === 'leads' ? 'Leads' : activeTab === 'new-leads' ? 'New Leads' : activeTab === 'all-leads' ? 'All Leads' : activeTab === 'follow-up' ? 'Tasks' : activeTab === 'lost-leads' ? 'Lost Leads' : activeTab.replace('-', ' ')}
                  </div>
                  <div className="mt-0.5 font-mono text-base sm:text-xl font-black tracking-tight leading-none">
                    {stats.total}
                  </div>
                  <div className="hidden sm:block mt-0.5 text-[11px] opacity-80 font-medium truncate">Global records count</div>
                </div>
              </div>
              
              {/* Card 2: Violet / Purple Theme */}
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 sm:px-3.5 sm:py-2.5 shadow-sm flex items-center gap-3 transition-all hover:shadow-md">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-50 text-violet-700">
                  <Zap className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0 text-violet-700">
                  <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate">
                    {activeTab === 'follow-up' ? 'Pending' : activeTab === 'lost-leads' ? 'Lost Count' : 'New Intake'}
                  </div>
                  <div className="mt-0.5 font-mono text-base sm:text-xl font-black tracking-tight leading-none">
                    {activeTab === 'lost-leads' ? stats.total : stats.new}
                  </div>
                  <div className="hidden sm:block mt-0.5 text-[11px] opacity-80 font-medium truncate">
                    {activeTab === 'follow-up' ? 'Tasks to complete' : activeTab === 'lost-leads' ? 'Total lost deals' : 'Awaiting qualification'}
                  </div>
                </div>
              </div>

              {/* Card 3: Amber Theme */}
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 sm:px-3.5 sm:py-2.5 shadow-sm flex items-center gap-3 transition-all hover:shadow-md">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-50 text-amber-700">
                  <DollarSign className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0 text-amber-700">
                  <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate">
                    {activeTab === 'follow-up' ? 'Revenue' : activeTab === 'lost-leads' ? 'Lost Value' : 'Pipeline'}
                  </div>
                  <div className="mt-0.5 font-mono text-base sm:text-xl font-black tracking-tight leading-none">
                    {formatCurrency(stats.value)}
                  </div>
                  <div className="hidden sm:block mt-0.5 text-[11px] opacity-80 font-medium truncate">
                    {activeTab === 'follow-up' ? 'Value of pending tasks' : activeTab === 'lost-leads' ? 'Value of lost deals' : 'Est. revenue amount'}
                  </div>
                </div>
              </div>

              {/* Card 4: Emerald Theme */}
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 sm:px-3.5 sm:py-2.5 shadow-sm flex items-center gap-3 transition-all hover:shadow-md">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-50 text-emerald-700">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0 text-emerald-700">
                  <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate">
                    {activeTab === 'follow-up' ? 'Overdue' : activeTab === 'lost-leads' ? 'Loss Ratio' : 'Conversion'}
                  </div>
                  <div className="mt-0.5 font-mono text-base sm:text-xl font-black tracking-tight leading-none">
                    {activeTab === 'follow-up' ? stats.hot : `${Number(stats.conversion || 0).toFixed(1)}%`}
                  </div>
                  <div className="hidden sm:block mt-0.5 text-[11px] opacity-80 font-medium truncate">
                    {activeTab === 'follow-up' ? 'Pending past due date' : activeTab === 'lost-leads' ? 'Lost opportunities ratio' : 'Target performance: 22%'}
                  </div>
                </div>
              </div>
        </div>

        {/* 3. Collapsible Advanced Filters Panel */}
        {isFilterOpen && (
          <div className="border border-slate-200 bg-slate-50 rounded-xl p-4 shadow-sm animate-in slide-in-from-top duration-300">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</span>
                <select
                  value={filters.status}
                  onChange={(e) => updateFilterValue('status', e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  {statusFilterGroups.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map((option) => (
                        <option key={`${group.label}-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Branch</span>
                <select
                  value={filters.branch}
                  onChange={(e) => updateBranchFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
                >
                  <option value="">All Branches</option>
                  {metadata.branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Assigned Agent</span>
                <select
                  value={filters.assigned_to}
                  onChange={(e) => updateFilterValue('assigned_to', e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
                >
                  <option value="">All Staff</option>
                  {filteredUsersByBranch.map((u) => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Service</span>
                <select
                  value={filters.service_type}
                  onChange={(e) => updateFilterValue('service_type', e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
                >
                  <option value="">All Services</option>
                  {serviceTypeOptions.map((serviceType) => (
                    <option key={serviceType} value={serviceType}>{serviceType}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Source</span>
                <select
                  value={filters.source}
                  onChange={(e) => updateFilterValue('source', e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
                >
                  <option value="">All Sources</option>
                  {metadata.sources.map((source) => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Move Size</span>
                <select
                  value={filters.move_size}
                  onChange={(e) => updateFilterValue('move_size', e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
                >
                  <option value="">Any Size</option>
                  {moveSizeOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Origin City</span>
                <input
                  type="text"
                  placeholder="e.g. Toronto"
                  value={originInput}
                  onChange={(e) => setOriginInput(e.target.value)}
                  list="origin-city-options"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-850 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                />
                <datalist id="origin-city-options">
                  {originCityOptions.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Destination</span>
                <input
                  type="text"
                  placeholder="e.g. Mississauga"
                  value={destinationInput}
                  onChange={(e) => setDestinationInput(e.target.value)}
                  list="destination-city-options"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-850 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                />
                <datalist id="destination-city-options">
                  {destinationCityOptions.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Move Type</span>
                <select
                  value={filters.move_type}
                  onChange={(e) => updateFilterValue('move_type', e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
                >
                  <option value="all">All Move Types</option>
                  {moveTypeOptions.map((moveType) => (
                    <option key={moveType} value={moveType}>{moveType}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex flex-col gap-1 justify-end">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Date Filter Type</span>
                <div className="flex items-center gap-3 py-1.5 px-1">
                  <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="separateDateTypeFilter"
                      value="move_date"
                      checked={String(filters.dateType || 'move_date') === 'move_date'}
                      onChange={(e) => updateFilterValue('dateType', e.target.value)}
                      className="h-3.5 w-3.5 text-blue-600 accent-blue-600 cursor-pointer focus:ring-blue-500"
                    />
                    Move Date
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="separateDateTypeFilter"
                      value="received"
                      checked={String(filters.dateType || '') === 'received'}
                      onChange={(e) => updateFilterValue('dateType', e.target.value)}
                      className="h-3.5 w-3.5 text-blue-600 accent-blue-600 cursor-pointer focus:ring-blue-500"
                    />
                    Received Date
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">FROM </span>

                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => updateFilterValue('startDate', e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-850 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">To </span>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => updateFilterValue('endDate', e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-850 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-slate-200 pt-3 gap-2">
              <span className="text-xs text-slate-500">Filters apply dynamically to records search.</span>
              <div className="flex items-center gap-2 justify-end w-full sm:w-auto">
                <button onClick={resetFilters} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/50 transition">
                  Reset Filters
                </button>
                <button onClick={() => setIsFilterOpen(false)} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800">
                  Close Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {!isDashboard && isLeadSelectionScoped && selectedRecordItems.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                {selectedRecordItems.length} selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedRecordKeys(new Set())}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Clear
              </button>
            </div>
            <div className="text-xs font-semibold text-slate-500">
              Bulk operations for {selectedRecordItems.length} record{selectedRecordItems.length === 1 ? '' : 's'}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={openBulkEmailModal}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Mail size={14} />
                Email
              </button>
              <button
                type="button"
                onClick={openBulkSmsModal}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <MessageSquare size={14} />
                SMS
              </button>
              {activeTab !== 'follow-up' && (
                <>
                  <button
                    type="button"
                    disabled={bulkActionLoading}
                    onClick={openBulkStatusModal}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowUpRight size={14} />
                    Status
                  </button>
                  <button
                    type="button"
                    disabled={bulkActionLoading}
                    onClick={bulkMarkLost}
                    className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <X size={14} />
                    Mark Lost
                  </button>
                  <button
                    type="button"
                    disabled={bulkActionLoading}
                    onClick={openBulkAssignModal}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <User size={14} />
                    Assign
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {renderLegacyPipelineTable ? (
        <div className="space-y-2">
          {/* 4. Redesigned Pipeline Table Surface */}
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {isTabSwitching ? (
              <TabSwitchLoader />
            ) : null}
            
            {/* Desktop Table View */}
            <div className={`relative block overflow-x-auto transition-opacity duration-150 ${isTabSwitching ? 'opacity-0' : 'opacity-100'}`}>
              <table className="w-full min-w-[1200px] divide-y divide-slate-200">
                <thead>
                  {activeTab === 'follow-up' ? (
                    <tr className="border-b border-slate-200 bg-slate-50/60">
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Task Status
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Task Type
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Subject & Notes
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Related Lead/Opp
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Customer
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Due Date
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Assigned Agent
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Actions
                      </th>
                    </tr>
                  ) : (
                    <tr className="border-b border-slate-200 bg-slate-50/60">
                      <th
                        className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-700"
                        onClick={() => requestSort('sales_number')}
                      >
                        <div className="flex items-center gap-1">
                          ID {getSortIcon('sales_number')}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-700"
                        onClick={() => requestSort('status')}
                      >
                        <div className="flex items-center gap-1">
                          Status {getSortIcon('status')}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-700"
                        onClick={() => requestSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          Customer {getSortIcon('name')}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Route
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Details
                      </th>
                      <th
                        className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-700"
                        onClick={() => requestSort('move_date')}
                      >
                        <div className="flex items-center gap-1">
                          Move Dates {getSortIcon('move_date')}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-700"
                        onClick={() => requestSort('created_at')}
                      >
                        <div className="flex items-center gap-1">
                          Received {getSortIcon('created_at')}
                        </div>
                      </th>
                      {!isLeadTab && (
                        <th
                          className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-700"
                          onClick={() => requestSort('value')}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Value {getSortIcon('value')}
                          </div>
                        </th>
                      )}
                      <th
                        className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-700"
                        onClick={() => requestSort('source')}
                      >
                        <div className="flex items-center gap-1">
                          Source {getSortIcon('source')}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-700"
                        onClick={() => requestSort('assigned_at')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Assigned To {getSortIcon('assigned_at')}
                        </div>
                      </th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isTabSwitching ? (
                    skeletonRows.map((index) => (
                      <tr key={`skeleton-${index}`} className="animate-pulse">
                        {Array.from({ length: skeletonColumns }, (_, colIndex) => (
                          <td key={`skeleton-${index}-${colIndex}`} className="px-4 py-3.5">
                            <div className="h-4 rounded bg-slate-200/80" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : activeTab === 'follow-up' ? (
                    displayItems.map((item) => {
                      const isOverdue = item.status !== 'completed' && item.due_date && new Date(item.due_date) < new Date();
                      return (
                        <tr
                          key={`task-${item.id}`}
                          onClick={(e) => handleRowClick(item, e)}
                          className={`cursor-pointer transition-colors hover:bg-slate-50/80 ${isOverdue ? "bg-red-50/10" : ""}`}
                        >
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                              item.status === 'completed' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              <span className="inline-block h-1 w-1 rounded-full bg-current" />
                              {item.status === 'completed' ? 'Completed' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-800 capitalize">
                              {item.task_type}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 max-w-xs">
                            <div className="text-sm font-bold text-slate-900 truncate">
                              {item.notes ? item.notes.split('\n')[0] : 'Follow-up task'}
                            </div>
                            {item.notes && item.notes.includes('\n') && (
                              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                {item.notes.split('\n').slice(1).join(' ')}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-mono text-xs font-bold text-blue-600 hover:underline">
                              {item.display_number}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 capitalize">
                              {item.related_type}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-sm font-bold text-slate-900">{item.name}</div>
                            {item.phone && <div className="text-[11px] text-slate-500 font-mono mt-0.5">{item.phone}</div>}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className={`text-xs font-semibold flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-slate-900'}`}>
                              <Calendar size={12} className="text-slate-400" />
                              {formatDate(item.due_date)} {item.due_date ? new Date(item.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </div>
                            {isOverdue && <div className="text-[10px] text-red-500 font-bold mt-0.5">Overdue</div>}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-xs font-medium text-slate-700">
                              {item.assigned_user_name}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right" data-no-row-nav="true">
                            <TaskActionMenu
                              item={item}
                              onToggleStatus={handleToggleTaskStatus}
                              onEdit={openEditTaskModal}
                              onDelete={handleDeleteTask}
                            />
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    displayItems.map((item) => {
                      const isUrgent = String(item.priority).toLowerCase() === "hot" || (daysUntil(item.move_date) !== null && daysUntil(item.move_date) <= 3);
                      return (
                        <tr
                          key={`${item.row_type}-${item.id}`}
                          onClick={(e) => handleRowClick(item, e)}
                          className={`cursor-pointer transition-colors hover:bg-slate-50/80 ${isUrgent ? "bg-red-50/20" : ""}`}
                        >
                          <td className="px-4 py-3.5">
                            <div className="font-mono text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              {item.display_number}
                              {isUrgent && <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" title="Urgent Lead" />}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <StatusPill status={item.status} label={item.status_label} colorHex={item.status_color} />
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-slate-900">{item.name}</div>
                              <div className="mt-0.5 truncate text-[11px] text-slate-500 flex items-center gap-1">
                                <Mail size={12} className="text-slate-400 shrink-0" />
                                {item.email || "—"}
                              </div>
                              <div className="mt-0.5 truncate text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                                <Phone size={12} className="text-slate-400 shrink-0" />
                                {item.phone || "—"}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-semibold text-slate-900">{item.origin || "TBD"}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-900">{item.destination || "TBD"}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="text-xs font-semibold text-slate-900">{item.move_size || "Size TBD"}</div>
                            <div className="mt-0.5 text-[11px] text-slate-500 capitalize">{item.service_type || "Service TBD"}</div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="text-xs font-semibold text-slate-900 flex items-center gap-1">
                              <Calendar size={12} className="text-slate-400" />
                              {formatDate(item.move_date)}
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="text-xs font-semibold text-slate-900 flex items-center gap-1">
                              <Calendar size={12} className="text-slate-400" />
                              {formatDate(item.created_at)}
                            </div>
                          </td>

                          {!isLeadTab && (
                            <td className="px-4 py-3.5 text-right font-mono text-sm font-bold text-slate-900 tabular-nums">
                              {formatCurrency(item.value || item.lead_cost)}
                            </td>
                          )}

                          <td className="px-4 py-3.5">
                            {item.source ? (
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-800">
                                <Globe size={12} className="text-slate-500 shrink-0" />
                                {item.source}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            {item.last_contacted_at ? (
                              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium text-slate-800">
                                <Clock size={12} className="text-slate-400 shrink-0" />
                                <span>{formatContactLabel(item.last_contacted_at)}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            {item.row_type === "lead" ? (
                              item.assigned_user_id ? (
                                <button
                                  data-no-row-nav="true"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAssignModal({ open: true, lead: item });
                                  }}
                                  className="inline-flex items-center gap-2 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 pl-1.5 pr-3 py-1 text-xs font-bold text-slate-700 transition"
                                >
                                  <div className="w-5 h-5 rounded-full bg-slate-955 text-white flex items-center justify-center text-[9px] font-black shrink-0">
                                    {getInitials(item.assigned_user_name)}
                                  </div>
                                  <span className="truncate max-w-[120px]">{item.assigned_user_name}</span>
                                </button>
                              ) : (
                                <button
                                  data-no-row-nav="true"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAssignModal({ open: true, lead: item });
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition"
                                >
                                  <User size={12} />
                                  Assign
                                  <ArrowRight className="w-3 h-3 ml-0.5" />
                                </button>
                              )
                            ) : (
                              <div className="flex items-center justify-end gap-1" data-no-row-nav="true">
                                {item.phone && (
                                  <a
                                    href={`tel:${item.phone}`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-955 transition"
                                  >
                                    <Phone size={14} />
                                  </a>
                                )}
                                {item.email && (
                                  <a
                                    href={`mailto:${item.email}`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-955 transition"
                                  >
                                    <Mail size={14} />
                                  </a>
                                )}
                                <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-955 transition">
                                  <MoreHorizontal size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={activeTab === 'follow-up' ? 8 : (isLeadTab ? 12 : 13)} className="px-4 py-16 text-center">
                        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400 border border-slate-100">
                          <SearchX className="w-6 h-6" />
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-700">No matching records found</p>
                        <p className="mt-1 text-xs text-slate-500">Try clearing filters or adjusting your search phrase.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards View */}
            <div className="relative hidden bg-slate-50/45">
              {isTabSwitching ? <TabSwitchLoader /> : null}
              <ul className={`space-y-3 p-3 transition-opacity duration-150 ${isTabSwitching ? 'opacity-0' : 'opacity-100'}`}>
                {isTabSwitching ? (
                  skeletonRows.map((index) => (
                    <li key={`mobile-skeleton-${index}`} className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 h-4 w-24 rounded bg-slate-200" />
                      <div className="mb-2 h-4 w-3/4 rounded bg-slate-200" />
                      <div className="h-4 w-1/2 rounded bg-slate-200" />
                    </li>
                  ))
                ) : activeTab === 'follow-up' ? (
                  displayItems.map((item) => {
                    const isOverdue = item.status !== 'completed' && item.due_date && new Date(item.due_date) < new Date();
                    return (
                      <li
                        key={`task-${item.id}`}
                        onClick={(e) => handleRowClick(item, e)}
                        className={`bg-white rounded-xl border p-4 transition-all hover:shadow-md cursor-pointer relative overflow-hidden flex flex-col gap-3 ${
                          isOverdue 
                            ? "border-rose-200 hover:border-rose-350 shadow-sm shadow-rose-50/40" 
                            : "border-slate-200/90 shadow-sm"
                        }`}
                      >
                        {isOverdue && (
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-rose-600" />
                        )}
                        
                        {/* Header: ID, Task Type, Status */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-black tracking-wider text-blue-600 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100/70">
                              {item.display_number}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                              {item.task_type}
                            </span>
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                            item.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            <span className="inline-block h-1 w-1 rounded-full bg-current" />
                            {item.status === 'completed' ? 'Completed' : 'Pending'}
                          </span>
                        </div>

                        {/* Title & Notes */}
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-slate-900 tracking-tight leading-snug">
                            {item.notes ? item.notes.split('\n')[0] : 'Follow-up task'}
                          </h4>
                          {item.notes && item.notes.includes('\n') && (
                            <p className="text-[11px] text-slate-505 leading-normal bg-slate-50/60 p-2 rounded-lg border border-slate-100/80 max-h-20 overflow-y-auto whitespace-pre-line">
                              {item.notes.split('\n').slice(1).join('\n')}
                            </p>
                          )}
                        </div>

                        {/* Customer Info Box */}
                        <div className="flex items-center gap-2.5 bg-slate-50/60 rounded-xl p-2.5 border border-slate-100">
                          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-black shrink-0 border border-blue-100">
                            {getInitials(item.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-800 truncate">{item.name}</div>
                            <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-500 font-medium mt-0.5">
                              {item.phone && (
                                <span className="font-mono flex items-center gap-0.5">
                                  <Phone size={10} className="text-slate-400" /> {item.phone}
                                </span>
                              )}
                              {item.phone && item.email && <span className="text-slate-300">•</span>}
                              {item.email && (
                                <span className="truncate flex items-center gap-0.5">
                                  <Mail size={10} className="text-slate-400" /> {item.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Route Details & Agent */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-505 font-medium">
                          {(item.origin !== '—' || item.destination !== '—') ? (
                            <div className="flex items-center gap-1">
                              <MapPin size={11} className="text-slate-400" />
                              <span className="text-slate-700">{item.origin || "TBD"}</span>
                              <ArrowRight size={10} className="text-slate-355" />
                              <span className="text-slate-700">{item.destination || "TBD"}</span>
                            </div>
                          ) : (
                            <div />
                          )}
                          <div className="flex items-center gap-1 font-semibold text-slate-750 bg-slate-100 px-2 py-0.5 rounded-full text-[9px] border border-slate-200/40">
                            <span className="text-slate-450 font-normal">Agent:</span> {item.assigned_user_name}
                          </div>
                        </div>

                        {/* Footer: Due date & Completion Action */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 mt-0.5">
                          <div className="flex flex-col">
                            <div className={`text-xs font-bold flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-slate-800'}`}>
                              <Calendar size={12} className={isOverdue ? 'text-red-500' : 'text-slate-400'} />
                              <span>Due: {formatDate(item.due_date)} {item.due_date ? new Date(item.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                            </div>
                            {isOverdue && <span className="text-[9px] text-red-500 font-bold uppercase tracking-wider mt-0.5 ml-4">Overdue</span>}
                          </div>
                          <div data-no-row-nav="true">
                            <TaskActionMenu
                              item={item}
                              onToggleStatus={handleToggleTaskStatus}
                              onEdit={openEditTaskModal}
                              onDelete={handleDeleteTask}
                            />
                          </div>
                        </div>
                      </li>
                    );
                  })
                ) : (
                  displayItems.map((item) => {
                    const isUrgent = String(item.priority).toLowerCase() === "hot" || (daysUntil(item.move_date) !== null && daysUntil(item.move_date) <= 3);
                    return (
                      <li
                        key={`${item.row_type}-${item.id}`}
                        onClick={(e) => handleRowClick(item, e)}
                        className={`bg-white rounded-xl border p-4 transition-all hover:shadow-md cursor-pointer relative overflow-hidden flex flex-col gap-3 ${
                          isUrgent 
                            ? "border-rose-200 hover:border-rose-350 shadow-sm shadow-rose-50/40" 
                            : "border-slate-200/90 shadow-sm"
                        }`}
                      >
                        {isUrgent && (
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-rose-600" />
                        )}

                        {/* Header: ID, Status Badge & Value */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-black tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
                              {item.display_number}
                            </span>
                            {isUrgent && (
                              <span className="inline-flex items-center gap-1 rounded bg-red-50 border border-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-600 uppercase tracking-wider">
                                Urgent
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {!isLeadTab && (
                              <span className="font-mono text-xs font-black text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                {formatCurrency(item.value || item.lead_cost)}
                              </span>
                            )}
                            <StatusPill status={item.status} label={item.status_label} colorHex={item.status_color} />
                          </div>
                        </div>

                        {/* Customer Details */}
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                            {getInitials(item.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-slate-900 truncate tracking-tight">{item.name}</h4>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 font-medium mt-0.5">
                              {item.phone && (
                                <span className="font-mono flex items-center gap-0.5">
                                  <Phone size={10} className="text-slate-400" /> {item.phone}
                                </span>
                              )}
                              {item.phone && item.email && <span className="text-slate-300">•</span>}
                              {item.email && (
                                <span className="truncate flex items-center gap-0.5">
                                  <Mail size={10} className="text-slate-400" /> {item.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Route Details */}
                        <div className="bg-slate-50/80 rounded-xl p-2.5 flex items-center justify-between text-[11px] border border-slate-100 gap-2">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <MapPin size={12} className="text-slate-400 shrink-0" />
                            <span className="font-bold text-slate-800 truncate">{item.origin || "TBD"}</span>
                            <ArrowRight size={11} className="text-slate-355 shrink-0 mx-0.5" />
                            <span className="font-bold text-slate-800 truncate">{item.destination || "TBD"}</span>
                          </div>
                          <div className="text-[10px] text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-150 shrink-0 font-semibold shadow-2xs">
                            {item.move_size || "Size TBD"}
                          </div>
                        </div>

                        {/* Move size/details, dates */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-505 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-slate-400 shrink-0" />
                            <span>Move: <strong className="text-slate-800 font-bold">{formatDate(item.move_date)}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5 justify-end">
                            <Clock size={12} className="text-slate-400 shrink-0" />
                            <span>Recv: <strong className="text-slate-700 font-normal">{formatDate(item.created_at)}</strong></span>
                          </div>
                        </div>

                        {/* Footer: Source / Last Contacted and Quick Actions */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 mt-0.5">
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[9px] font-bold text-slate-500">
                            {item.source ? (
                              <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/70 rounded px-1.5 py-0.5 text-slate-600">
                                <Globe size={10} className="text-slate-400" />
                                {item.source}
                              </span>
                            ) : (
                          <span className="text-slate-400">No source</span>
                        )}
                        {item.last_contacted_at && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600">
                            <Clock size={10} className="text-slate-400" />
                            {formatContactLabel(item.last_contacted_at)}
                          </span>
                        )}
                          </div>

                          <div data-no-row-nav="true" className="flex items-center gap-2">
                            {item.row_type === "lead" ? (
                              item.assigned_user_id ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAssignModal({ open: true, lead: item });
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-200 pl-1 py-0.5 pr-2.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all shadow-2xs"
                                >
                                  <div className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center text-[8px] font-black shrink-0">
                                    {getInitials(item.assigned_user_name)}
                                  </div>
                                  <span className="truncate max-w-[80px]">{item.assigned_user_name}</span>
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAssignModal({ open: true, lead: item });
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-755 transition-all shadow-sm"
                                >
                                  <User size={12} className="text-slate-500" />
                                  Assign
                                </button>
                              )
                            ) : (
                              <div className="flex items-center gap-1.5">
                                {item.phone && (
                                  <a
                                    href={`tel:${item.phone}`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all"
                                  >
                                    <Phone size={12} />
                                  </a>
                                )}
                                {item.email && (
                                  <a
                                    href={`mailto:${item.email}`}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all"
                                  >
                                    <Mail size={12} />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })
                )}
                
                {filteredItems.length === 0 && (
                  <li className="bg-white rounded-xl border border-slate-205 p-8 text-center">
                    <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400 border border-slate-100">
                      <SearchX className="w-6 h-6" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-700">No matching records found</p>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* 5. Redesigned Pagination Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-700">{filteredItems.length}</span> of{" "}
              <span className="font-semibold text-slate-700">{totalCount}</span> dynamic records
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => goToPage(currentPage - 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <span className="font-mono text-xs text-slate-500">
                Page <span className="font-bold text-slate-950">{currentPage}</span> of {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => goToPage(currentPage + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
        ) : null}
        {!isDashboard && !renderLegacyPipelineTable && (
          <div className="relative rounded-xl border border-slate-200 bg-white shadow-sm">
            {isTabSwitching ? (
              <TabSwitchLoader />
            ) : null}
            <div className={`transition-opacity duration-150 ${isTabSwitching ? 'opacity-0' : 'opacity-100'}`}>
            <PipelineRecordsPane
              activeTab={activeTab}
              isLeadTab={isLeadTab}
              showSelectionColumn={!isDashboard && isLeadSelectionScoped}
              displayItems={orderedDisplayItems}
              filteredItemsLength={filteredItems.length}
              currentPage={currentPage}
              totalPages={totalPages}
              onGoToPage={goToPage}
              onToggleTaskStatus={handleToggleTaskStatus}
              onEditTask={openEditTaskModal}
              onDeleteTask={handleDeleteTask}
              onRowClick={handleRowClick}
              onRequestSort={requestSort}
              getSortIcon={getSortIcon}
              onAssignLead={openAssignLeadModal}
              selectedRecordKeys={selectedRecordKeys}
              onToggleRecordSelected={toggleRecordSelected}
              onToggleAllVisibleSelected={toggleAllVisibleSelected}
              isLeadSortingEnabled={shouldEnableManualLeadSorting}
              onReorderLeadRows={reorderLeadRows}
              viewMode={viewMode}
            />
            </div>
          </div>
        )}

          </div>
        )}
      </main>

      {/* 6. Lead Assignment Dialog */}
      {assignModal.open && (
        <AssignModal
          lead={assignModal.lead}
          readOnly={!!assignModal.lead?.assigned_user_id}
          onClose={() => setAssignModal({ open: false, lead: null })}
          onAssign={performAssignment}
          branches={metadata.branches}
          users={metadata.users}
          isAssigning={assigningLeadId === assignModal.lead?.id}
        />
      )}

      {bulkAssignOpen && (
        <BulkAssignModal
          selectedCount={selectedRecordItems.length}
          branches={metadata.branches}
          users={metadata.users}
          form={bulkAssignForm}
          setForm={setBulkAssignForm}
          onClose={() => setBulkAssignOpen(false)}
          onConfirm={bulkAssignSelected}
          isLoading={bulkActionLoading}
        />
      )}

      {bulkEmailOpen && (
        <BulkEmailModal
          selectedCount={selectedRecordItems.length}
          templates={bulkEmailTemplates}
          selectedTemplateId={bulkEmailTemplateId}
          onTemplateChange={handleBulkEmailTemplateChange}
          branchLogoUrl={selectedBranchLogoUrl}
          branchName={selectedBranchName}
          form={bulkEmailForm}
          setForm={setBulkEmailForm}
          onClose={() => setBulkEmailOpen(false)}
          onConfirm={bulkSendEmail}
          isLoading={bulkActionLoading || bulkEmailTemplatesLoading}
        />
      )}

      {bulkSmsOpen && (
        <BulkSmsModal
          selectedCount={selectedRecordItems.length}
          form={bulkSmsForm}
          setForm={setBulkSmsForm}
          templates={bulkSmsTemplates}
          selectedTemplateId={bulkSmsTemplateId}
          onTemplateChange={handleBulkSmsTemplateChange}
          templatesLoading={bulkSmsTemplatesLoading}
          onClose={() => setBulkSmsOpen(false)}
          onConfirm={bulkSendSms}
          isLoading={bulkActionLoading}
        />
      )}

      {bulkStatusOpen && (
        <BulkStatusModal
          selectedCount={selectedRecordItems.length}
          options={bulkStatusOptions}
          value={bulkStatus}
          setValue={setBulkStatus}
          onClose={() => setBulkStatusOpen(false)}
          onConfirm={bulkChangeStatus}
          isLoading={bulkActionLoading}
        />
      )}

      {taskEditModal.open && (
        <FollowUpTaskEditModal
          item={taskEditModal.item}
          form={taskEditForm}
          setForm={setTaskEditForm}
          users={metadata.users}
          isSaving={taskActionLoadingId === taskEditModal.item?.id}
          onClose={closeEditTaskModal}
          onSave={handleSaveTaskEdit}
        />
      )}


      
    </div>
  );
};

export default Sales;
