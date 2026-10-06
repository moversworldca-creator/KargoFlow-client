import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, Edit2, Phone, Mail, MessageSquare, 
  Plus, Send, FileText, Info, MapPin, 
  Calendar, User, Building2, Clock, 
  MoreHorizontal, ChevronDown, CheckCircle2,
  Loader2, Zap, TrendingUp, DollarSign,
  AlertCircle, ChevronRight, Share2, Printer,
  ArrowUpRight, Truck, Box as BoxIcon, Target,
  X, Bold, Italic, List, Check, Pin, Trash2,
  MoreVertical, Home, Building,
  ExternalLink, Layers, Locate, PenTool, FileWarning, ClipboardList as ClipboardListIcon, CheckSquare, Receipt, Users,
  Reply, Eye, Download
} from 'lucide-react';
import {
  Icon, Pill, StatusDot, IconButton, PrimaryBtn, GhostBtn, StickyHeader,
  RouteSection,
} from '../../../shared/ui/RedesignAtoms';
import {
  SidebarSpecs, InventorySnapshot,
  CustomerCard, PlannedMoveCard, RouteLogisticsCard
} from '../components/RedesignSalesComponents';
import { CommsHub, Timeline as RedesignTimeline } from '../components/RedesignSalesComponents';
import Card from '../../../shared/ui/Card';
import RichTextEditor from '../../../shared/ui/RichTextEditor';
import AddressAutocomplete from '../../../shared/ui/AddressAutocomplete';
import AsyncSelect from '../../../shared/ui/AsyncSelect';
import useCan from '../../../shared/auth/useCan';
import { PERMISSIONS } from '../../../shared/permissions/registry';
import { getLookupUsersPage, getBranchLookupsPage, getStatusCodeLookupsPage, getOpportunityLossReasonLookupsPage, getMoveTypeLookups, getServices } from '../../../services/api';
import { useMoverSizesLookup } from '../../../shared/queries/sharedQueries';

import EstimateView from '../components/EstimateView';
import PaymentsPanel from '../components/PaymentsPanel';
import StorageView from '../components/StorageView';
import LeadSpecs from '../components/LeadSpecs';
import RingCentralEmbeddablePanel from '../components/RingCentralEmbeddablePanel';
import MovablePanel from '../components/MovablePanel';
import CategorizedFilesPanel from '../../files/components/CategorizedFilesPanel';

const resolveSpecLookupLabel = (value, options = []) => {
  const normalizedValue = String(value ?? '').trim();
  if (!normalizedValue) return '';
  const match = (Array.isArray(options) ? options : []).find((option) => {
    if (option == null) return false;
    if (typeof option === 'string' || typeof option === 'number') {
      return String(option) === normalizedValue;
    }
    return String(option.id ?? option.value ?? option.code ?? option.name ?? option.label ?? '') === normalizedValue;
  });
  if (!match) return normalizedValue;
  if (typeof match === 'string' || typeof match === 'number') return String(match);
  return String(match.label || match.name || match.title || match.code || match.value || match.id || normalizedValue);
};

const normalizeLookupOptions = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => {
      if (row == null) return null;
      if (typeof row === 'string' || typeof row === 'number') {
        return { id: String(row), label: String(row) };
      }
      return {
        ...row,
        id: row.id ?? row.value ?? row.code ?? row.name ?? row.label ?? '',
        label: row.label ?? row.name ?? row.title ?? row.code ?? row.value ?? String(row.id ?? ''),
      };
    })
    .filter(Boolean);

const resolveFilesTargetId = ({ record, fallbackId }) =>
  String(record?.id || fallbackId || '');

const resolveFilesTargetSpec = ({ isLeadPath, estimateSummary, record, fallbackId }) => {
  if (isLeadPath) {
    return {
      targetType: 'leads.lead',
      targetId: String(record?.id || fallbackId || ''),
    };
  }
  if (estimateSummary?.id) {
    return {
      targetType: 'estimates.estimate',
      targetId: String(estimateSummary.id),
    };
  }
  return {
    targetType: 'sales.opportunity',
    targetId: String(record?.id || fallbackId || ''),
  };
};

const UNBOOK_REASON_OPTIONS = [
  { value: 'customer-requested-change', label: 'Customer requested change' },
  { value: 'scheduling-conflict', label: 'Scheduling conflict' },
  { value: 'deposit-not-received', label: 'Deposit not received' },
  { value: 'dispatch-issue', label: 'Crew or dispatch issue' },
  { value: 'duplicate-booking', label: 'Duplicate booking' },
  { value: 'other', label: 'Other' },
];

import { normalizePreviewHtml, replaceBranchPlaceholders } from '../utils/emailPreview';
import api, { 
  getOpportunity, 
  getOpportunityBySalesNumber,
  getOpportunityAvailability,
  updateOpportunity, 
  createOpportunity,
  getTimelineEvents,
  markOpportunityEstimateCreated,
  bookOpportunityJob,
  unbookOpportunityJob,
  confirmOpportunityJob,
  cancelOpportunityJob,
  completeOpportunityJob,
  markOpportunityLost,
  reopenOpportunity,
  createOpportunityStop,
  updateOpportunityStop,
  deleteOpportunityStop,
  createSalesActivity,
  updateSalesActivity,
  deleteSalesActivity,
  getCallLogs,
  getActivities as getSalesActivities,
  getTasks,
  createTask,
  updateTask,
  getCommunicationTemplate,
  getStatusCodeLookups,
  getOpportunityLossReasonLookups,
  getBranchLookups,
  getEstimates,
  createEstimate,
  getLookupUsers,
  getReferralSourceLookups,
  updateCustomer,
  createCustomer,
  createCustomerContact,
  updateCustomerContact,
  deleteCustomerContact,
	  getSendGridConfig,
	  getResendConfig,
	  getSMTPConfig,
	  getLead,
	  getLeadBySalesNumber,
	  updateLead,
	  createLead,
  convertLead,
  markLeadLost,
  reopenLead,
  getCommunicationTemplates,
  getCommunicationTemplateCategories,
  previewCommunicationTemplate,
  getDocumentTemplates,
  createContract,
  getContracts,
  getEstimatePortalInventory,
  previewDocumentTemplate,
  sendContractForSignature
} from '../../../services/api';
import { duplicateLead, duplicateOpportunity } from '../../../services/api';
import {
  getLegacyRecordDetailPath,
  getLegacyRecordEstimateTabPath,
  getLegacyRecordDetailTabPath,
  getEstimateTabFromSegment,
  getRecordDetailPath,
  getRecordEstimateTabPath,
  getRecordDetailTabPath,
  getRecordListPath,
  getRecordTabLabelFromSegment,
  isLeadRecordType,
} from '../utils/recordRoutes';
import { getWorkflowStageLabel } from '../utils/statusWorkflow';
import { getPortalBaseUrl } from '../../../shared/utils/portalBaseUrl';

const CANADIAN_PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'YT', name: 'Yukon' },
];

const asList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.results)) return res.results;
  return [];
};

const getNextPageNumber = (response) => {
  const nextValue = response?.next || response?.data?.next;
  if (!nextValue) return null;
  try {
    const parsed = new URL(nextValue, window.location.origin);
    const pageValue = Number(parsed.searchParams.get('page') || 0);
    return Number.isFinite(pageValue) && pageValue > 0 ? pageValue : null;
  } catch {
    return null;
  }
};

const sortCommunicationTemplates = (rows = []) =>
  [...rows].sort((a, b) => {
    const aChannel = String(a?.channel || '');
    const bChannel = String(b?.channel || '');
    if (aChannel !== bChannel) return aChannel.localeCompare(bChannel);

    const aOrder = Number(a?.sort_order ?? 0);
    const bOrder = Number(b?.sort_order ?? 0);
    if (aOrder !== bOrder) return aOrder - bOrder;

    const aName = String(a?.name || '');
    const bName = String(b?.name || '');
    if (aName !== bName) return aName.localeCompare(bName);

    return Number(a?.id || 0) - Number(b?.id || 0);
  });

const safeDateTime = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString();
};

const toneForWorkflowStage = (stage) => {
  const normalized = String(stage || '').toLowerCase();
  if (['completed', 'job'].includes(normalized)) return 'green';
  if (['confirmed'].includes(normalized)) return 'teal';
  if (['booked'].includes(normalized)) return 'amber';
  if (['estimate_ready', 'quoted', 'estimate'].includes(normalized)) return 'violet';
  if (['lead_in_progress', 'in_progress'].includes(normalized)) return 'indigo';
  if (['opportunity'].includes(normalized)) return 'blue';
  if (['new_lead', 'new'].includes(normalized)) return 'sky';
  if (['lost'].includes(normalized)) return 'rose';
  if (['canceled'].includes(normalized)) return 'red';
  if (['draft', 'pending'].includes(normalized)) return 'cyan';
  return 'amber';
};

const formatEmailStatusLabel = (value) =>
  String(value || '')
    .replace(/[_.-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());



const groupInvoiceLineItemsBySubJob = (lineItems = [], subJobs = []) => {
  const normalizedSubJobs = Array.isArray(subJobs) ? subJobs : [];
  const rows = Array.isArray(lineItems) ? lineItems : [];
  const sections = new Map();

  const ensureSection = (plannedSubJobId) => {
    const key = String(plannedSubJobId || 'ungrouped');
    if (!sections.has(key)) {
      const matchedSubJob = normalizedSubJobs.find((job) => String(job?.id || '') === String(plannedSubJobId || '')) || null;
      sections.set(key, {
        planned_sub_job_id: plannedSubJobId || null,
        job_number: matchedSubJob?.sub_job_number || matchedSubJob?.display_number || '',
        job_title: matchedSubJob?.title || '',
        service_type: matchedSubJob?.service_type || '',
        service_type_label: matchedSubJob?.service_type_label || '',
        line_items: [],
        subtotal: 0,
      });
    }
    return sections.get(key);
  };

  rows.forEach((item) => {
    const plannedSubJobId = item?.planned_sub_job_id || item?.planned_sub_job || null;
    const section = ensureSection(plannedSubJobId);
    section.line_items.push(item);
    section.subtotal += Number(
      item?.line_total ?? ((Number(item?.quantity || 0) * Number(item?.unit_price || 0)) || 0)
    );
  });

  return Array.from(sections.values());
};

const getEmailEventSummary = (emailLog) => {
  const deliveredAt = emailLog?.delivered_at;
  const openedAt = emailLog?.opened_at;
  const clickedAt = emailLog?.clicked_at;
  const bouncedAt = emailLog?.bounced_at;
  const complainedAt = emailLog?.complained_at;

  const items = [];
  if (deliveredAt) items.push(`Delivered ${safeDateTime(deliveredAt)}`);
  if (openedAt) items.push(`Opened ${safeDateTime(openedAt)}`);
  if (clickedAt) items.push(`Clicked ${safeDateTime(clickedAt)}`);
  if (bouncedAt) items.push(`Bounced ${safeDateTime(bouncedAt)}`);
  if (complainedAt) items.push(`Complained ${safeDateTime(complainedAt)}`);
  return items;
};
const getActorLabel = (event) => {
  const a = event?.actor_details || event?.actor || null;
  const first = String(a?.first_name || '').trim();
  const last = String(a?.last_name || '').trim();
  const name = `${first} ${last}`.trim();
  if (name) return name;
  const email = String(a?.email || '').trim();
  return email || 'System';
};
const getTimelineLine = (event) => {
  const title = String(event?.title || event?.email_log_details?.subject || '').trim();
  const summary = String(event?.summary || event?.email_log_details?.body_text || event?.email_log_details?.body_html || '').trim();
  const line = summary && title ? `${title} — ${summary}` : summary || title || String(event?.event_type || 'Activity');
  const activityType = String(event?.payload?.activity_type || '').toLowerCase();
  const toEmail = String(
    event?.payload?.email?.to_email ||
    event?.payload?.to_email ||
    event?.email_log_details?.to_email ||
    ''
  ).trim();
  if (activityType === 'email' && toEmail && !line.toLowerCase().includes(toEmail.toLowerCase())) {
    return `${line} — to ${toEmail}`;
  }
  return line;
};

const TIMELINE_FIELD_LABELS = {
  status: 'Status',
  workflow_stage: 'Pipeline',
  move_date: 'Move date',
  service_type: 'Service tier',
  legacy_move_size: 'Move size',
  move_type: 'Move type',
  lead_cost: 'Lead cost',
  referral_source_id: 'Referral source',
  assigned_user_id: 'Assigned',
  branch_id: 'Branch',
  origin_address_id: 'Origin',
  destination_address_id: 'Destination',
  created: 'Created',
};

const formatTimelineFieldLabel = (field) => {
  const key = String(field || '').trim();
  if (!key) return 'Field';
  if (TIMELINE_FIELD_LABELS[key]) return TIMELINE_FIELD_LABELS[key];
  return key
    .replace(/_id$/i, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
};

const formatTimelineFieldValue = (value) => {
  if (value === null || value === undefined || value === '') return 'Empty';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) return safeDateTime(value.toISOString());
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return 'Empty';
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return safeDateTime(text);
    return text
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }
  if (typeof value === 'number') return String(value);
  return String(value);
};

const getTimelineChangeRows = (event) => {
  const changes = Array.isArray(event?.payload?.changes) ? event.payload.changes : [];
  return changes
    .filter((change) => change && String(change.field || '').trim() && String(change.field || '').trim() !== 'created')
    .map((change) => ({
      field: String(change.field || '').trim(),
      label: formatTimelineFieldLabel(change.field),
      from: formatTimelineFieldValue(change.from),
      to: formatTimelineFieldValue(change.to),
    }));
};

const buildTimelineDedupKey = (event) => {
  const source = String(event?.source || '').toLowerCase();
  const eventType = String(event?.event_type || '').toLowerCase();
  const createdMinute = String(event?.created_at || '').slice(0, 16);
  const actor = String(event?.actor_details?.email || event?.actor?.email || '').toLowerCase();
  const title = normalizeActivityText(event?.title);
  const summary = normalizeActivityText(event?.summary);
  const changeSignature = getTimelineChangeRows(event)
    .map((change) => `${change.field}:${change.from}->${change.to}`)
    .join('|');
  return [source, eventType, createdMinute, actor, title, summary, changeSignature].join('|');
};

const dedupeTimelineEvents = (rows = []) => {
  const seen = new Set();
  return rows.filter((row) => {
    const dedupeKey = buildTimelineDedupKey(row);
    if (seen.has(dedupeKey)) return false;
    seen.add(dedupeKey);
    return true;
  });
};

const getTimelineLeadSource = (event) => {
  const leadSource = String(event?.payload?.lead_source || '').trim();
  if (!leadSource) return '';
  return `Lead source: ${leadSource}`;
};

const getTimelineSystemNoteText = (event) => {
  const payload = event?.payload || {};
  const summary = String(event?.summary || '').trim();
  if (payload?.note_type === 'inbound_lead_normalization') {
    return String(payload?.note_content || summary).trim();
  }
  return summary;
};

const formatTimelineDateTime = (iso) => {
  if (!iso) return { date: '-', time: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: String(iso), time: '' };
  
  const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return { date: dateStr, time: timeStr };
};

const formatPaymentDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' });
};

const getEventTheme = (eventType) => {
  const type = String(eventType || '').toLowerCase();
  
  if (type.startsWith('workflow.')) {
    return {
      bg: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
      icon: 'git-commit'
    };
  }
  if (type.startsWith('activity.created')) {
    return {
      bg: 'bg-blue-50 text-blue-700 ring-blue-100',
      icon: 'plus-circle'
    };
  }
  if (type.startsWith('activity.updated')) {
    return {
      bg: 'bg-sky-50 text-sky-700 ring-sky-100',
      icon: 'edit-3'
    };
  }
  if (type.startsWith('assignment.changed')) {
    return {
      bg: 'bg-violet-50 text-violet-700 ring-violet-100',
      icon: 'user-check'
    };
  }
  if (type.startsWith('fields.changed')) {
    return {
      bg: 'bg-amber-50 text-amber-700 ring-amber-100',
      icon: 'sliders'
    };
  }
  if (type.startsWith('system.note')) {
    return {
      bg: 'bg-rose-50 text-rose-700 ring-rose-100',
      icon: 'alert-circle'
    };
  }
  return {
    bg: 'bg-slate-50 text-slate-700 ring-slate-100',
    icon: 'clock'
  };
};
const normalizeDisplayText = (value) => {
  const text = String(value || '').trim();
  if (!text || text === '-' || text === '—' || text.toLowerCase() === 'tbd') return '';
  return text.trim().replace(/^[,\s|-]+|[,\s|-]+$/g, '');
};
const normalizeAddressCompareText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
const formatAddressDetails = (details) => {
  if (!details) return '';
  const parts = [];
  if (details.property_type) {
    const pt = String(details.property_type);
    parts.push(pt.charAt(0).toUpperCase() + pt.slice(1));
  }
  if (details.parking_type) parts.push(`Parking: ${details.parking_type}`);
  if (details.flights_of_stairs) parts.push(`${details.flights_of_stairs} Stairs`);
  if (details.has_elevator) parts.push('Elevator');
  return parts.join(' | ');
};


const parseAddressString = (addressStr) => {
  const parts = (addressStr || '').split(',').map(p => p.trim()).filter(Boolean);
  let city = '';
  let state = '';
  let postal_code = '';

  if (parts.length === 0) {
    return { city, state, postal_code };
  }

  const lastPart = parts[parts.length - 1];
  const isCountry = ['canada', 'usa', 'united states', 'ca', 'us'].includes(lastPart.toLowerCase());
  const addressParts = isCountry ? parts.slice(0, -1) : parts;

  if (addressParts.length >= 2) {
    const stateZipPart = addressParts[addressParts.length - 1];
    city = addressParts[addressParts.length - 2];

    const szParts = stateZipPart.split(' ').map(s => s.trim()).filter(Boolean);
    if (szParts.length > 0) {
      state = szParts[0];
      if (szParts.length > 1) {
        postal_code = szParts.slice(1).join(' ');
      }
    }
  } else if (addressParts.length === 1) {
    const singlePart = addressParts[0];
    const spParts = singlePart.split(' ').map(s => s.trim()).filter(Boolean);
    if (spParts.length > 1) {
      city = spParts[0];
      state = spParts[1];
    } else {
      city = singlePart;
    }
  }

  return { city, state, postal_code };
};

const formatRouteSummary = (addressLine, city, state, zip) => {
  const line1 = normalizeDisplayText(addressLine);
  const locality = [city, state].map((part) => normalizeDisplayText(part)).filter(Boolean).join(', ');
  const line2 = locality;
  return {
    line1: line1 || line2,
    line2: line1 ? line2 : '',
  };
};

const STATE_NAMES = {
  'bc': 'british columbia',
  'ab': 'alberta',
  'on': 'ontario',
  'qc': 'quebec',
  'ns': 'nova scotia',
  'nb': 'new brunswick',
  'mb': 'manitoba',
  'pe': 'prince edward island',
  'sk': 'saskatchewan',
  'nl': 'newfoundland and labrador',
  'yt': 'yukon',
  'nt': 'northwest territories',
  'nu': 'nunavut',
  'ca': 'california',
  'ny': 'new york',
  'tx': 'texas',
  'fl': 'florida',
  'wa': 'washington'
};

const isStateInAddress = (state, address) => {
  if (!state || !address) return false;
  const s = String(state).toLowerCase().trim();
  const addr = String(address).toLowerCase();
  if (addr.includes(s)) return true;
  const fullName = STATE_NAMES[s];
  if (fullName && addr.includes(fullName)) return true;
  for (const [abbr, name] of Object.entries(STATE_NAMES)) {
    if (s === name && addr.includes(abbr)) return true;
  }
  return false;
};

const isCityInAddress = (city, state, address) => {
  if (!city || !address) return false;
  const c = String(city).toLowerCase().trim();
  const addr = String(address).toLowerCase();
  if (addr.includes(c)) return true;
  if (state && c === String(state).toLowerCase().trim()) return true;
  return false;
};

const normalizeCountryToken = (value) => String(value || '').toLowerCase().trim();
const isDefaultUSCountry = (value) => ['us', 'usa', 'united states'].includes(normalizeCountryToken(value));

const stripTrailingUS = (str) => String(str || '').replace(/(?:,\s*(?:US|USA|United States))$/i, '').trim();

const formatAddressText = (parts, fallback) => {
  const line1 = stripTrailingUS(normalizeDisplayText(parts?.address_line1 || parts?.street));
  const city = normalizeDisplayText(parts?.city);
  const state = normalizeDisplayText(parts?.state);
  const postalCode = normalizeDisplayText(parts?.zip_code || parts?.postal_code || parts?.zip);
  const country = normalizeDisplayText(parts?.country);

  const cleanCity = city.toLowerCase() === state.toLowerCase() ? '' : city;
  const locality = [cleanCity, [state, postalCode].filter(Boolean).join(' ')].filter(Boolean).join(', ');

  if (!line1) {
    return [locality, country].filter(Boolean).join(', ') || fallback;
  }

  const normalizedLine1 = line1.toLowerCase();
  const normalizedLine1Compact = normalizeAddressCompareText(line1);
  const includesCity = isCityInAddress(city, state, line1);
  const includesState = isStateInAddress(state, line1);
  const includesPostal = postalCode ? normalizedLine1.includes(postalCode.toLowerCase()) : false;
  const includesCountry = country ? normalizedLine1.includes(country.toLowerCase()) : false;

  const extraParts = [];

  const normalizedLocality = normalizeAddressCompareText(locality);
  const localityRepresented =
    (includesCity && includesState && (!postalCode || includesPostal)) ||
    (normalizedLocality && normalizedLine1Compact.includes(normalizedLocality));
  if (locality && !localityRepresented) {
    const appendCity = includesCity ? '' : cleanCity;
    const appendState = includesState ? '' : state;
    const appendStateZip = [appendState, includesPostal ? '' : postalCode].filter(Boolean).join(' ');
    const appendLocality = [appendCity, appendStateZip].filter(Boolean).join(', ');
    if (appendLocality) {
      extraParts.push(appendLocality);
    }
  }

  const hasCanada = normalizedLine1.includes('canada');
  const hasUS = normalizedLine1.includes('usa') || normalizedLine1.includes('united states') || normalizedLine1.includes(', us');

  let appendCountry = country;
  if (includesCountry) {
    appendCountry = '';
  } else if (isDefaultUSCountry(country)) {
    appendCountry = '';
  } else if (country.toLowerCase() === 'us' || country.toLowerCase() === 'usa' || country.toLowerCase() === 'united states') {
    if (hasCanada) appendCountry = '';
  } else if (country.toLowerCase() === 'canada' || country.toLowerCase() === 'ca') {
    if (hasUS) appendCountry = '';
  }

  if (appendCountry) {
    extraParts.push(appendCountry);
  }

  return [line1, ...extraParts].filter(Boolean).join(', ') || fallback;
};

const createRouteDraftStopId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeRouteStopForSales = (stop) => ({
  id: stop?.id,
  type: stop?.stop_type || stop?.type || 'stop',
  address: formatAddressText(stop?.address_details, stop?.address_details?.address_line1 || ''),
  details: stop?.address_details || {},
  notes: stop?.notes || '',
  sort_order: stop?.sort_order ?? 0,
});

const buildSalesRouteStops = (record, isLead, view = {}) => {
  if (!record) return [];

  const getDetails = (type) => {
    const prefix = type === 'origin' ? 'origin' : 'destination';
    const details = record?.[`${prefix}_address_details`];
    if (details) return details;

    if (isLead) {
      return {
        address_line1: record?.[`${prefix}_street`],
        city: record?.[`${prefix}_city`],
        state: record?.[`${prefix}_state`],
        postal_code: record?.[`${prefix}_zip`],
        unit_number: record?.[`${prefix}_unit_number`],
        property_type: record?.[`${prefix}_property_type`],
        parking_type: record?.[`${prefix}_parking_type`],
        flights_of_stairs: record?.[`${prefix}_flights_of_stairs`],
        has_elevator: record?.[`${prefix}_has_elevator`],
        walk_distance_ft: record?.[`${prefix}_walk_distance_ft`],
      };
    }

    return {
      address_line1: record?.[`${prefix}_address_line1`] || record?.[`${prefix}_street`],
      city: record?.[`${prefix}_city`],
      state: record?.[`${prefix}_state`],
      postal_code: record?.[`${prefix}_postal_code`] || record?.[`${prefix}_zip`],
      unit_number: record?.[`${prefix}_unit_number`],
      property_type: record?.[`${prefix}_property_type`],
      parking_type: record?.[`${prefix}_parking_type`],
      flights_of_stairs: record?.[`${prefix}_flights_of_stairs`],
      has_elevator: record?.[`${prefix}_has_elevator`],
      walk_distance_ft: record?.[`${prefix}_walk_distance_ft`],
    };
  };

  const sortStops = (stops) =>
    stops.sort((a, b) => {
      const aOrder = Number.isFinite(Number(a.sort_order)) ? Number(a.sort_order) : 0;
      const bOrder = Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : 0;
      return aOrder - bOrder;
    });

  const originDetails = getDetails('origin');
  const destinationDetails = getDetails('destination');
  const routeStops = Array.isArray(record?.stops) ? record.stops.map(normalizeRouteStopForSales) : [];
  const preStops = sortStops(routeStops.filter((stop) => stop.type === 'pre_stop'));
  const middleStops = sortStops(routeStops.filter((stop) => stop.type !== 'pre_stop' && stop.type !== 'post_stop'));
  const postStops = sortStops(routeStops.filter((stop) => stop.type === 'post_stop'));

  return [
    ...preStops,
    {
      id: 'origin',
      type: 'origin',
      label: 'PICK-UP - ORIGIN',
      address: formatAddressText(originDetails, view.originText || view.originRoute?.line1 || ''),
      subAddress: view.originRoute?.line2 || '',
      details: originDetails,
    },
    ...middleStops,
    {
      id: 'destination',
      type: 'destination',
      label: 'DROP-OFF - DESTINATION',
      address: formatAddressText(destinationDetails, view.destinationText || view.destinationRoute?.line1 || ''),
      subAddress: view.destinationRoute?.line2 || '',
      details: destinationDetails,
    },
    ...postStops,
  ];
};

const buildRouteFieldsFromRecord = (record, isLead) => {
  if (!record) {
    return {
      origin_street: '',
      origin_city: '',
      origin_state: '',
      origin_zip: '',
      destination_street: '',
      destination_city: '',
      destination_state: '',
      destination_zip: '',
      origin_unit_number: '',
      origin_property_type: '',
      origin_parking_type: '',
      origin_flights_of_stairs: 0,
      origin_has_elevator: false,
      origin_walk_distance_ft: 50,
      destination_unit_number: '',
      destination_property_type: '',
      destination_parking_type: '',
      destination_flights_of_stairs: 0,
      destination_has_elevator: false,
      destination_walk_distance_ft: 50,
    };
  }

  if (isLead) {
    return {
      origin_street: formatAddressText({
        address_line1: record.origin_street,
        city: record.origin_city,
        state: record.origin_state,
        zip: record.origin_zip,
      }, ''),
      origin_city: normalizeDisplayText(record.origin_city),
      origin_state: normalizeDisplayText(record.origin_state),
      origin_zip: normalizeDisplayText(record.origin_zip),
      destination_street: formatAddressText({
        address_line1: record.destination_street,
        city: record.destination_city,
        state: record.destination_state,
        zip: record.destination_zip,
      }, ''),
      destination_city: normalizeDisplayText(record.destination_city),
      destination_state: normalizeDisplayText(record.destination_state),
      destination_zip: normalizeDisplayText(record.destination_zip),
      origin_unit_number: normalizeDisplayText(record.origin_unit_number),
      origin_property_type: normalizeDisplayText(record.origin_property_type),
      origin_parking_type: normalizeDisplayText(record.origin_parking_type),
      origin_flights_of_stairs: record.origin_flights_of_stairs || 0,
      origin_has_elevator: !!record.origin_has_elevator,
      origin_walk_distance_ft: record.origin_walk_distance_ft || 50,
      destination_unit_number: normalizeDisplayText(record.destination_unit_number),
      destination_property_type: normalizeDisplayText(record.destination_property_type),
      destination_parking_type: normalizeDisplayText(record.destination_parking_type),
      destination_flights_of_stairs: record.destination_flights_of_stairs || 0,
      destination_has_elevator: !!record.destination_has_elevator,
      destination_walk_distance_ft: record.destination_walk_distance_ft || 50,
    };
  }

  const originDetails = record.origin_address_details || {};
  const destinationDetails = record.destination_address_details || {};

  return {
    origin_street: formatAddressText(originDetails, ''),
    origin_city: normalizeDisplayText(originDetails.city),
    origin_state: normalizeDisplayText(originDetails.state),
    origin_zip: normalizeDisplayText(originDetails.zip_code),
    destination_street: formatAddressText(destinationDetails, ''),
    destination_city: normalizeDisplayText(destinationDetails.city),
    destination_state: normalizeDisplayText(destinationDetails.state),
    destination_zip: normalizeDisplayText(destinationDetails.zip_code),
    origin_unit_number: normalizeDisplayText(originDetails.unit_number || record.origin_unit_number),
    origin_property_type: normalizeDisplayText(originDetails.property_type || record.origin_property_type),
    origin_parking_type: normalizeDisplayText(originDetails.parking_type || record.origin_parking_type),
    origin_flights_of_stairs: originDetails.flights_of_stairs ?? record.origin_flights_of_stairs ?? 0,
    origin_has_elevator: originDetails.has_elevator ?? record.origin_has_elevator ?? false,
    origin_walk_distance_ft: originDetails.walk_distance_ft ?? record.origin_walk_distance_ft ?? 50,
    destination_unit_number: normalizeDisplayText(destinationDetails.unit_number || record.destination_unit_number),
    destination_property_type: normalizeDisplayText(destinationDetails.property_type || record.destination_property_type),
    destination_parking_type: normalizeDisplayText(destinationDetails.parking_type || record.destination_parking_type),
    destination_flights_of_stairs: destinationDetails.flights_of_stairs ?? record.destination_flights_of_stairs ?? 0,
    destination_has_elevator: destinationDetails.has_elevator ?? record.destination_has_elevator ?? false,
    destination_walk_distance_ft: destinationDetails.walk_distance_ft ?? record.destination_walk_distance_ft ?? 50,
  };
};
const mergeTimelineActivities = ({ opportunityActivities = [], leadActivities = [] }) => {
  const merged = [...opportunityActivities, ...leadActivities]
    .sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime());

  const normalizeThreadSubject = (value) => {
    let text = String(value || '').trim().toLowerCase();
    if (!text) return '';
    let next = text;
    do {
      text = next;
      next = next.replace(/^(re:|fw:|fwd:)\s*/i, '');
    } while (next !== text);
    return next.replace(/\s+/g, ' ').trim();
  };

  const normalizeThreadText = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const stripSmsThreadToken = (value) =>
    normalizeThreadText(String(value || '').replace(/\s*\[(?:crm_sms|crm-sms|sms_log):\d+\]\s*$/i, ''));
  const buildInboundThreadKey = (act) => {
    const kind = String(act?.activity_type || act?.type || '').toLowerCase();
    const createdMinute = String(act?.created_at || '').slice(0, 16);
    const messageId = String(
      act?.inbound_message_id ||
      act?.inbound_sms_id ||
      act?.payload?.inbound_message_id ||
      act?.payload?.inbound_sms_id ||
      ''
    );
    const providerMessageId = String(
      act?.provider_message_id ||
      act?.email_log_details?.provider_message_id ||
      act?.sms_log_details?.provider_message_id ||
      act?.payload?.provider_message_id ||
      ''
    );
    const subject = normalizeThreadSubject(
      act?.subject ||
      act?.email_log_details?.subject ||
      act?.payload?.subject ||
      ''
    );
    const body = normalizeThreadText(
      stripSmsThreadToken(
        act?.description ||
        act?.content ||
        act?.summary ||
        act?.email_log_details?.body_text ||
        act?.sms_log_details?.message ||
        ''
      )
    );
    const sender = normalizeThreadText(
      act?.payload?.from_email ||
      act?.email_log_details?.from_email ||
      act?.from_email ||
      act?.sms_log_details?.from_phone ||
      act?.from_phone ||
      ''
    );
    const recipient = normalizeThreadText(
      act?.email_log_details?.to_email ||
      act?.sms_log_details?.to_phone ||
      act?.to_email ||
      act?.to_phone ||
      ''
    );
    return [
      kind,
      messageId || providerMessageId || createdMinute,
      subject,
      body,
      sender,
      recipient,
    ].join('|');
  };

  const seen = new Set();
  const preferredThreadRows = new Map();
  for (const act of merged) {
    const kind = String(act?.activity_type || act?.type || '').toLowerCase();
    if (kind !== 'sms') continue;
    const key = buildInboundThreadKey(act);
    const isInbound = String(act?.direction || '').toLowerCase() === 'inbound' || Boolean(act?.inbound_message_id) || Boolean(act?.inbound_sms_id) || String(act?.timeline_source || '').toLowerCase().startsWith('inbound_') || String(act?.timeline_source || '').toLowerCase() === 'telnyx_inbound_sms';
    const prev = preferredThreadRows.get(key);
    if (!prev) {
      preferredThreadRows.set(key, act);
      continue;
    }
    const prevInbound = String(prev?.direction || '').toLowerCase() === 'inbound' || Boolean(prev?.inbound_message_id) || Boolean(prev?.inbound_sms_id) || String(prev?.timeline_source || '').toLowerCase().startsWith('inbound_') || String(prev?.timeline_source || '').toLowerCase() === 'telnyx_inbound_sms';
    if (isInbound && !prevInbound) {
      preferredThreadRows.set(key, act);
    }
  }
  return merged.filter(act => {
    const source = String(act?.timeline_source || 'opportunity');
    const id = String(act?.id || '');
    const kind = String(act?.activity_type || act?.type || '').toLowerCase();
    const isInbound = String(act?.direction || '').toLowerCase() === 'inbound' || Boolean(act?.inbound_message_id) || Boolean(act?.inbound_sms_id) || source.startsWith('inbound_') || source === 'telnyx_inbound_sms';
    if (kind === 'sms') {
      const preferred = preferredThreadRows.get(buildInboundThreadKey(act));
      if (preferred && String(preferred?.id || '') !== id) return false;
    }
    const key = isInbound
      ? buildInboundThreadKey(act)
      : [
          source,
          kind,
          id,
          String(act?.created_at || '').slice(0, 16),
          normalizeActivityText(act?.subject || act?.description || act?.content || ''),
        ].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const dedupeActivityRows = (rows = []) => {
  const seen = new Set();
  return (Array.isArray(rows) ? rows : []).filter((row) => {
    if (!row) return false;
    const inboundMessageId = String(
      row?.inbound_message_id ||
      row?.inbound_sms_id ||
      row?.payload?.inbound_message_id ||
      row?.payload?.inbound_sms_id ||
      ''
    ).trim();
    const providerMessageId = String(
      row?.provider_message_id ||
      row?.email_log_details?.provider_message_id ||
      row?.sms_log_details?.provider_message_id ||
      row?.payload?.provider_message_id ||
      ''
    ).trim();
    const text = normalizeActivityText(
      row?.description ||
      row?.content ||
      row?.summary ||
      row?.sms_log_details?.message ||
      row?.email_log_details?.body_text ||
      ''
    );
    const createdMinute = String(row?.created_at || row?.thread_created_at || row?.completed_at || '').slice(0, 16);
    const direction = String(row?.direction || '').toLowerCase();
    const source = String(row?.timeline_source || row?.source || '').toLowerCase();
    const key = [
      inboundMessageId ? `inbound:${inboundMessageId}` : '',
      providerMessageId ? `provider:${providerMessageId}` : '',
      text ? `text:${text}` : '',
      createdMinute ? `minute:${createdMinute}` : '',
      direction ? `direction:${direction}` : '',
      source ? `source:${source}` : '',
      String(row?.email_log_details?.email_log_id || ''),
      String(row?.id || ''),
    ].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
const normalizeActivityText = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
const isInboundEmailTimelineEvent = (row) => {
  const source = String(row?.source || '').toLowerCase();
  return (
    source.includes('inbound_email') ||
    source.includes('inbound-mail') ||
    source === 'sendgrid_inbound_parse' ||
    Boolean(row?.payload?.inbound_message_id) ||
    Boolean(row?.payload?.is_inbound) ||
    Boolean(row?.payload?.direction === 'inbound')
  );
};
const dedupeInboundTimelineEvents = (rows = []) => {
  const seen = new Set();
  return rows.filter((row) => {
    if (!isInboundEmailTimelineEvent(row)) return true;

    const source = normalizeActivityText(row?.source || '');
    const inboundMessageId = Number(row?.payload?.inbound_message_id || 0);
    const subject = normalizeActivityText(row?.payload?.subject || row?.title);
    const fromEmail = normalizeActivityText(row?.payload?.from_email);
    const createdMinute = String(row?.created_at || '').slice(0, 16);
    const dedupeKey = inboundMessageId
      ? `msg:${inboundMessageId}`
      : `${source}|${createdMinute}|${fromEmail}|${subject}`;

    if (seen.has(dedupeKey)) return false;
    seen.add(dedupeKey);
    return true;
  });
};
const getCustomerContacts = (customer) => (Array.isArray(customer?.contacts) ? customer.contacts : []);
const MAX_ADDITIONAL_CONTACTS = 4;
const createEmptyAdditionalContact = () => ({
  id: '',
  name: '',
  email: '',
  phone: '',
  phone_type: '',
  relationship: '',
});
const getAdditionalCustomerContacts = (customer) =>
  getCustomerContacts(customer)
    .filter((contact) => !contact?.is_primary)
    .slice(0, MAX_ADDITIONAL_CONTACTS);
const getContactLabel = (contact, index = 0) =>
  String(contact?.name || '').trim() || `Additional Contact ${index + 1}`;
const hasContactValues = (contact) =>
  Boolean(
    String(contact?.name || '').trim() ||
    String(contact?.email || '').trim() ||
    String(contact?.phone || '').trim() ||
    String(contact?.relationship || '').trim() ||
    String(contact?.phone_type || '').trim()
  );
const mapCustomerContactsToDrafts = (customer) =>
  getAdditionalCustomerContacts(customer).map((contact) => ({
    id: contact?.id ? String(contact.id) : '',
    name: contact?.name || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    phone_type: contact?.phone_type || '',
    relationship: contact?.relationship || '',
  }));
const getRecordCustomerDetails = (record) =>
  record?.customer_details || (record?.customer && typeof record.customer === 'object' ? record.customer : null) || null;
const buildCommunicationRecipients = ({ record, view }) => {
  const customer = getRecordCustomerDetails(record);
  const emails = [];
  const phones = [];
  const seenEmails = new Set();
  const seenPhones = new Set();

  const addEmail = (value, label) => {
    const email = String(value || '').trim();
    const key = email.toLowerCase();
    if (!email || seenEmails.has(key)) return;
    seenEmails.add(key);
    emails.push({ value: email, label });
  };
  const addPhone = (value, label) => {
    let phone = String(value || '').trim();
    if (!phone) return;
    if (!phone.startsWith('+')) {
      phone = `+1 ${phone}`;
    }
    if (seenPhones.has(phone)) return;
    seenPhones.add(phone);
    phones.push({ value: phone, label });
  };

  const primaryLabel = String(view?.customerName || customer?.full_name || 'Primary contact').trim() || 'Primary contact';
  addEmail(view?.email || customer?.email || record?.email, `${primaryLabel} (Primary)`);
  addPhone(view?.phone || customer?.primary_phone || customer?.phone || record?.phone, `${primaryLabel} (Primary)`);

  getAdditionalCustomerContacts(customer).forEach((contact, index) => {
    const name = getContactLabel(contact, index);
    const suffix = contact?.relationship ? ` (${contact.relationship})` : '';
    addEmail(contact?.email, `${name}${suffix}`);
    addPhone(contact?.phone, `${name}${suffix}`);
  });

  return { emails, phones };
};
const resolveCustomerId = (...values) => {
  for (const value of values) {
    const candidate = value && typeof value === 'object' ? value.id : value;
    const id = Number(candidate);
    if (id > 0) return id;
  }
  return null;
};

const mergeCustomerContactIntoRecord = (record, savedContact, fallbackCustomerId = null) => {
  if (!record) return record;

  const contactData = savedContact?.data ?? savedContact ?? null;
  const contactId = Number(contactData?.id || 0) || null;
  if (!contactId) return record;

  const currentCustomer = getRecordCustomerDetails(record) || (record?.customer && typeof record.customer === 'object' ? record.customer : null) || {};
  const currentContacts = Array.isArray(currentCustomer.contacts) ? [...currentCustomer.contacts] : [];
  const nextContact = {
    ...contactData,
    id: contactId,
    is_primary: Boolean(contactData?.is_primary),
  };
  const existingIndex = currentContacts.findIndex((contact) => Number(contact?.id || 0) === contactId);
  if (existingIndex >= 0) {
    currentContacts[existingIndex] = {
      ...currentContacts[existingIndex],
      ...nextContact,
    };
  } else {
    currentContacts.push(nextContact);
  }

  const customerId = resolveCustomerId(currentCustomer, fallbackCustomerId, record?.customer_id, record?.customer);
  const nextCustomerDetails = {
    ...currentCustomer,
    id: customerId || currentCustomer.id || null,
    contacts: currentContacts,
  };

  return {
    ...record,
    customer_id: customerId ?? record?.customer_id ?? null,
    customer_details: nextCustomerDetails,
    customer: record?.customer && typeof record.customer === 'object'
      ? {
          ...record.customer,
          id: customerId || record.customer.id || null,
          contacts: currentContacts,
        }
      : record?.customer,
  };
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

const toYyyyMmDd = (value = new Date()) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
};

const parseDateOnly = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = String(dateStr).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const resolveOpportunityCustomer = (opportunity, isLeadPath) => {
  if (!opportunity) return null;
  if (isLeadPath) {
    // lead path can have customer_id after conversion or nested customer
    const customerId = opportunity.customer_id || opportunity.customer?.id || null;
    return {
      id: customerId ? Number(customerId) : null,
      email: opportunity.email || opportunity.customer?.email || '',
      phone: opportunity.phone || opportunity.customer?.primary_phone || opportunity.customer?.phone || '',
    };
  }
  const customer = opportunity.customer_details || opportunity.customer || null;
  return {
    id: customer?.id ? Number(customer.id) : null,
    email: customer?.email || '',
    phone: customer?.primary_phone || customer?.phone || '',
  };
};

const getEmailDispatchState = (activity) => {
  const emailLog = activity?.email_log_details || {};
  const status = String(emailLog?.status || activity?.status || '').toLowerCase();
  const errorMessage = String(emailLog?.error_message || activity?.error_message || '');
  const isQueued = status === 'pending' && errorMessage.startsWith('queued:');
  if (isQueued) {
    return { label: 'Queued', tone: 'amber', showError: false, details: [] };
  }
  const details = getEmailEventSummary(emailLog);
  if (emailLog?.complained_at) return { label: 'Complained', tone: 'rose', showError: true, details };
  if (emailLog?.bounced_at) return { label: 'Bounced', tone: 'rose', showError: true, details };
  if (emailLog?.clicked_at) return { label: 'Clicked', tone: 'blue', showError: false, details };
  if (emailLog?.opened_at) return { label: 'Opened', tone: 'green', showError: false, details };
  if (emailLog?.delivered_at) return { label: 'Delivered', tone: 'green', showError: false, details };
  if (status === 'pending') return { label: 'Sending', tone: 'amber', showError: false, details };
  if (status === 'sent') return { label: 'Sent', tone: 'blue', showError: false, details };
  if (status === 'delivered') return { label: 'Delivered', tone: 'green', showError: false, details };
  if (status === 'opened') return { label: 'Opened', tone: 'green', showError: false, details };
  if (status === 'clicked') return { label: 'Clicked', tone: 'blue', showError: false, details };
  if (status === 'received') return { label: 'Received', tone: 'blue', showError: false, details };
  if (status === 'bounced') return { label: 'Bounced', tone: 'rose', showError: true, details };
  if (status === 'complained') return { label: 'Complained', tone: 'rose', showError: true, details };
  if (status === 'failed') return { label: 'Failed', tone: 'rose', showError: true, details };
  if (status) return { label: formatEmailStatusLabel(status), tone: 'amber', showError: false, details };
  return null;
};

const resolveMoveSizeName = (value, moverSizes = []) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const fromOption = (moverSizes || []).find((size) => {
    const optionValue = String(size?.id ?? size?.value ?? size?.code ?? size?.name ?? size?.label ?? '').trim();
    return optionValue === raw;
  });
  if (fromOption) {
    return String(fromOption.name || fromOption.label || fromOption.value || fromOption.code || '').trim();
  }

  const fromName = (moverSizes || []).find((size) => {
    const optionName = String(size?.name || size?.label || '').trim();
    return optionName === raw;
  });
  if (fromName) return String(fromName.name || fromName.label || '').trim();

  return raw;
};

const resolveMoveSizeValue = (value, moverSizes = []) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const fromOption = (moverSizes || []).find((size) => {
    const optionValue = String(size?.id ?? size?.value ?? size?.code ?? size?.name ?? size?.label ?? '').trim();
    return optionValue === raw;
  });
  if (fromOption) return String(fromOption.id ?? fromOption.value ?? fromOption.code ?? fromOption.name ?? fromOption.label ?? '');

  const fromName = (moverSizes || []).find((size) => String(size?.name || size?.label || '').trim() === raw);
  if (fromName) return String(fromName.id ?? fromName.value ?? fromName.code ?? fromName.name ?? fromName.label ?? '');

  return raw;
};

const getUserBranchIds = (user) => {
  if (!user) return [];
  const branchIds = new Set();

  const addId = (id) => {
    if (id !== null && id !== undefined && id !== '') {
      branchIds.add(String(id));
    }
  };

  if (Array.isArray(user.branches)) {
    user.branches.forEach((branch) => {
      if (branch && typeof branch === 'object' && branch.id) addId(branch.id);
      else addId(branch);
    });
  }

  if (Array.isArray(user.branch_details)) {
    user.branch_details.forEach((branch) => {
      if (branch && branch.id) addId(branch.id);
    });
  }

  if (user.branch) {
    if (typeof user.branch === 'object' && user.branch.id) addId(user.branch.id);
    else addId(user.branch);
  }

  return Array.from(branchIds);
};

const oppView = (opportunity, isLeadRecord = null) => {
  if (!opportunity) return {};
  
  // Lead and opportunity share this UI, but the route/API context is the reliable entity signal.
  const isLead = isLeadRecord ?? (opportunity.id === 'new' ? !opportunity.isOpportunity : !opportunity.customer_details);
  
  const customerName = isLead 
    ? `${opportunity.first_name || ''} ${opportunity.last_name || ''}`.trim() || (opportunity.id === 'new' ? 'New Lead' : `Lead #${String(opportunity.sales_number || opportunity.id).padStart(5, '0')}`)
    : (opportunity?.customer_details?.full_name ||
      (opportunity?.customer_details?.first_name || opportunity?.customer_details?.last_name
        ? `${opportunity.customer_details.first_name || ''} ${opportunity.customer_details.last_name || ''}`.trim()
        : (opportunity?.customer_details?.name || (opportunity?.customer ? `Customer #${opportunity.customer}` : (opportunity.id === 'new' ? 'New Opportunity' : 'Customer')))));

  const email = isLead ? opportunity.email : (opportunity?.customer_details?.email || '');
  const phone = isLead ? opportunity.phone : (opportunity?.customer_details?.primary_phone || opportunity?.customer_details?.phone || '');

  const assignedName = isLead
    ? (
        [
          opportunity?.assigned_to_details?.first_name,
          opportunity?.assigned_to_details?.last_name,
        ].filter(Boolean).join(' ').trim()
        || opportunity?.assigned_to_details?.email
        || 'Unassigned'
      )
    : (
        [
          opportunity?.assigned_user_details?.first_name,
          opportunity?.assigned_user_details?.last_name,
        ].filter(Boolean).join(' ').trim()
        || opportunity?.assigned_user_details?.email
        || 'Unassigned'
      );

  const branchName = opportunity?.branch_details?.name || '-';

  const originText = isLead
    ? formatAddressText(
        {
          street: opportunity?.origin_street,
          city: opportunity?.origin_city,
          state: opportunity?.origin_state,
          zip: opportunity?.origin_zip,
        },
        ''
      )
    : formatAddressText(
        opportunity?.origin_address_details,
        ''
      );

  const destText = isLead
    ? formatAddressText(
        {
          street: opportunity?.destination_street,
          city: opportunity?.destination_city,
          state: opportunity?.destination_state,
          zip: opportunity?.destination_zip,
        },
        ''
      )
    : formatAddressText(
        opportunity?.destination_address_details,
        ''
      );

  const moveSize = isLead
    ? (resolveMoveSizeName(opportunity.move_size, opportunity?.mover_size_details ? [opportunity.mover_size_details] : []) || opportunity.move_size || '-')
    : (
        resolveMoveSizeName(
          opportunity.mover_size_details?.id || opportunity.mover_size_details?.value || opportunity.mover_size_details?.name || opportunity.mover_size_details?.label || opportunity.move_size_details?.id || opportunity.move_size_details?.value || opportunity.move_size_details?.name || opportunity.move_size_details?.label || opportunity.legacy_move_size,
          [
            ...(opportunity.mover_size_details ? [opportunity.mover_size_details] : []),
            ...(opportunity.move_size_details ? [opportunity.move_size_details] : []),
          ]
        ) ||
        (typeof opportunity.mover_size === 'object' ? opportunity.mover_size?.name : '') ||
        opportunity.legacy_move_size ||
        '-'
      );
  const moveType = opportunity?.move_type_name || getMoveTypeLabel(opportunity.move_type || '-') || '-';
  const serviceType = opportunity?.service_type_name || getMoveTypeLabel(opportunity.service_type || '-') || '-';
  const leadSource = opportunity?.referral_source_details?.name || opportunity?.utm_source || '-';
  const originRoute = isLead
    ? formatRouteSummary(opportunity.origin_street, opportunity.origin_city, opportunity.origin_state, opportunity.origin_zip)
    : formatRouteSummary(
        opportunity?.origin_address_details?.address_line1,
        opportunity?.origin_address_details?.city,
        opportunity?.origin_address_details?.state,
        opportunity?.origin_address_details?.zip_code
      );
  const destinationRoute = isLead
    ? formatRouteSummary(opportunity.destination_street, opportunity.destination_city, opportunity.destination_state, opportunity.destination_zip)
    : formatRouteSummary(
        opportunity?.destination_address_details?.address_line1,
        opportunity?.destination_address_details?.city,
        opportunity?.destination_address_details?.state,
        opportunity?.destination_address_details?.zip_code
      );

  return { 
    customerName, email, phone, assignedName, branchName, 
    originText, destText, originRoute, destinationRoute, isLead, moveSize, moveType, serviceType, leadSource
  };
};

const buildWorkflowActions = ({
  isLead,
  isNewRecord,
  workflowStage,
  estimateSummary,
  canDuplicateOpportunity = false,
  canBookOpportunity = false,
  canMarkOpportunityLost = false,
  canCreateOpportunity = false,
  canEditOpportunity = false,
}) => {
  if (isNewRecord) return [];

  const stage = String(workflowStage || '').toLowerCase();

  if (isLead) {
    if (stage === 'converted') return [];
    if (stage === 'lost') return [{ key: 'reopen', label: 'Reopen Lead', tone: 'primary' }];
    return [
      ...(canBookOpportunity ? [{ key: 'book', label: 'Book Job', tone: 'primary' }] : []),
      ...(canMarkOpportunityLost ? [{ key: 'lost', label: 'Mark Lost', tone: 'secondary' }] : []),
    ];
  }

  const estimateStatus = String(estimateSummary?.status || '').toLowerCase();
  const isEstimateSigned = estimateStatus === 'signed';
  const canSendEstimate = Boolean(estimateSummary) && !isEstimateSigned;
  const actions = [];

  if (['lost', 'canceled', 'completed'].includes(stage)) {
    if (canEditOpportunity) actions.push({ key: 'reopen', label: 'Reopen Opportunity', tone: 'primary' });
    return actions;
  }

  if (['opportunity', 'estimate_ready'].includes(stage)) {
    if (canSendEstimate && canCreateOpportunity) {
      actions.push({ key: 'send_estimate', label: 'Send Estimate', tone: 'primary' });
    }
    if (canBookOpportunity) actions.push({ key: 'book', label: 'Book Job', tone: 'primary' });
    if (canMarkOpportunityLost) actions.push({ key: 'lost', label: 'Mark Lost', tone: 'secondary' });
  } else if (stage === 'booked') {
    if (canEditOpportunity) {
      actions.push({ key: 'confirm', label: 'Confirm Job', tone: 'primary' });
      actions.push({ key: 'cancel', label: 'Cancel Job', tone: 'secondary' });
    }
  } else if (stage === 'confirmed') {
    if (canEditOpportunity) {
      actions.push({ key: 'complete', label: 'Complete Job', tone: 'primary' });
      actions.push({ key: 'cancel', label: 'Cancel Job', tone: 'secondary' });
    }
  }

  return actions;
};

const omitBlankStrings = (payload) => {
  if (!payload || typeof payload !== 'object') return payload;
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => !(typeof value === 'string' && value.trim() === ''))
  );
};

const initials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return `${parts[0][0] || ''}${parts.length > 1 ? parts[parts.length - 1][0] || '' : ''}`.toUpperCase();
};

const stripHtml = (value) => {
  let html = String(value || '');
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ');
  html = html.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, ' ');
  html = html.replace(/<[^>]*>/g, ' ');
  return html.replace(/\s+/g, ' ').trim();
};

const trimInboundReplyText = (value) => {
  const text = String(value || '').replace(/\r\n/g, '\n').trim();
  if (!text) return '';
  const lines = text.split('\n');
  const trimmed = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const normalized = line.trim();
    if (
      /^on .+wrote:$/i.test(normalized) ||
      /^from:\s/i.test(normalized) ||
      /^sent:\s/i.test(normalized) ||
      /^subject:\s/i.test(normalized) ||
      /^to:\s/i.test(normalized) ||
      /^cc:\s/i.test(normalized)
    ) {
      break;
    }
    if (normalized.startsWith('>')) break;
    trimmed.push(line);
  }

  return trimmed.join('\n').trim() || text;
};

const trimInboundReplyHtml = (value) => {
  let html = String(value || '').trim();
  if (!html) return '';
  html = html.replace(/<blockquote[\s\S]*$/i, '');
  html = html.replace(/<div[^>]+class=(['"])[^'"]*(gmail_quote|gmail_attr|yahoo_quoted|protonmail_quote|moz-cite-prefix)[^'"]*\1[\s\S]*$/i, '');
  html = html.replace(/<hr[^>]*>[\s\S]*$/i, '');
  return html.trim();
};

const getActivityLogKind = (activity) => {
  const rawKind = String(activity?.activity_type || activity?.type || '').toLowerCase().trim();
  const source = String(activity?.source || '').toLowerCase();
  if (rawKind === 'warning' || source.includes('lead_normalization_warning')) return 'warning';
  if (source.includes('inbound_email') || activity?.inbound_message_id || ['email', 'mail'].includes(rawKind)) return 'email';
  if (
    activity?.sms_log_details?.message ||
    activity?.inbound_sms_id ||
    activity?.inbound_message_id ||
    source.includes('sms') ||
    source.includes('telnyx_inbound_sms') ||
    source.startsWith('inbound_sms')
  ) return 'sms';
  if (['call', 'phone_call', 'phone-call', 'call_log', 'call-log'].includes(rawKind)) return 'call';
  if (['sms', 'text', 'message', 'text_message'].includes(rawKind)) return 'sms';
  if (['email', 'mail'].includes(rawKind)) return 'email';
  if (['note', 'comment'].includes(rawKind)) return 'note';
  if (['task', 'todo', 'to-do'].includes(rawKind)) return 'task';
  return rawKind;
};

const stripSmsThreadToken = (value) => {
  const text = String(value || '');
  return text
    .replace(/\n?\s*\[(?:crm_sms|crm-sms|sms_log):\d+\]\s*$/i, '')
    .trim();
};

const getActivityLogRecipient = (activity) => {
  const kind = getActivityLogKind(activity);
  const summary = activity?.summary || '';
  if (kind === 'email') return activity?.email_log_details?.to_email || activity?.to_email || activity?.description || activity?.content || summary || '';
  if (kind === 'sms') return activity?.sms_log_details?.to_phone || stripSmsThreadToken(activity?.description || activity?.content || summary || '');
  if (kind === 'call') return activity?.call_log_details?.disposition || activity?.description || activity?.content || summary || '';
  return activity?.description || activity?.content || summary || '';
};

const getActivityLogBody = (activity) => {
  const kind = getActivityLogKind(activity);
  const summary = activity?.summary || '';
  if (kind === 'email') {
    if (activity?.inbound_message_id) {
      return trimInboundReplyText(
        activity?.description ||
        activity?.content ||
        summary ||
        activity?.email_log_details?.body_text ||
        activity?.email_log_details?.text_body ||
        stripHtml(activity?.email_log_details?.body_html || activity?.body_html || '')
      );
    }
    return activity?.email_log_details?.preview_html || activity?.email_log_details?.body_html || activity?.body_html || activity?.description || activity?.content || summary || '';
  }
  if (kind === 'sms') {
    return stripSmsThreadToken(activity?.sms_log_details?.message || activity?.description || activity?.subject || activity?.content || summary || '');
  }
  if (kind === 'call') {
    const disposition = String(activity?.call_log_details?.disposition || '').trim();
    const duration = Number(activity?.call_log_details?.duration_seconds || 0);
    const durationLabel = duration ? `Duration: ${(duration / 60).toFixed(duration % 60 === 0 ? 0 : 1)}m` : '';
    return [disposition, durationLabel, activity?.description, activity?.content, summary].filter(Boolean).join('\n\n');
  }
  return stripSmsThreadToken(activity?.description || activity?.content || summary || '');
};

const getActivityLogEmailHtml = (activity, branchContext = '') =>
  activity?.inbound_message_id
    ? ''
    : normalizePreviewHtml(
        activity?.email_log_details?.preview_html ||
        activity?.email_log_details?.body_html ||
        activity?.body_html ||
        '',
        branchContext
      );

const getInboundActivityAttachments = (activity) => {
  const payloadAttachments = Array.isArray(activity?.payload?.attachments) ? activity.payload.attachments : [];
  const emailLogAttachments = Array.isArray(activity?.email_log_details?.attachments) ? activity.email_log_details.attachments : [];
  const source = payloadAttachments.length ? payloadAttachments : emailLogAttachments;
  return source
    .map((file, index) => {
      const filename = String(file?.filename || file?.name || `attachment-${index + 1}`).trim();
      const contentType = String(file?.content_type || file?.mime_type || '').trim();
      return {
        id: file?.id || `${activity?.id || 'attachment'}-${index}`,
        filename,
        content_type: contentType,
        size: Number(file?.size_bytes || file?.size || 0) || 0,
        file_url: String(file?.file_url || file?.url || '').trim(),
      };
    })
    .filter((file) => file.filename);
};

const getActivityLogPreview = (activity, maxLength = 140) => {
  const raw = getActivityLogKind(activity) === 'email'
    ? stripHtml(getActivityLogBody(activity))
    : String(getActivityLogBody(activity) || '').trim();
  if (!raw) return '';
  return raw.length > maxLength ? `${raw.slice(0, maxLength).trim()}…` : raw;
};

const SalesRouteStopModal = ({ isOpen, onClose, stop, onSave, isSaving }) => {
  const [formData, setFormData] = useState({
    stop_type: 'stop',
    address_line1: '',
    city: '',
    state: '',
    postal_code: '',
    unit_number: '',
    property_type: 'other',
    parking_type: 'other',
    flights_of_stairs: 0,
    has_elevator: false,
    walk_distance_ft: 50,
    notes: '',
    sort_order: 0,
  });

  useEffect(() => {
    if (!isOpen || !stop) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData({
      stop_type: stop.type || stop.stop_type || 'stop',
      address_line1: formatAddressText(stop.details || {}, '') || stop.address || '',
      city: stop.details?.city || '',
      state: stop.details?.state || '',
      postal_code: stop.details?.postal_code || stop.details?.zip_code || '',
      unit_number: stop.details?.unit_number || '',
      property_type: stop.details?.property_type || 'other',
      parking_type: stop.details?.parking_type || 'other',
      flights_of_stairs: stop.details?.flights_of_stairs || 0,
      has_elevator: !!stop.details?.has_elevator,
      walk_distance_ft: stop.details?.walk_distance_ft || 50,
      notes: stop.notes || '',
      sort_order: stop.sort_order ?? 0,
    });
  }, [isOpen, stop]);

  if (!isOpen || !stop) return null;

  const updateField = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));
  const isDraftStop = String(stop?.id || '').startsWith('temp-stop-') || Boolean(stop?.isDraft);
  const isEndpoint = stop.type === 'origin' || stop.type === 'destination';
  const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-brand/10';
  const labelCls = 'text-[11px] font-black uppercase tracking-widest text-slate-500';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/20 p-4">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close route stop editor" onClick={onClose} />
      <Card className="relative flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-0 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-tint text-brand">
              <Icon name="map-pin" className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-xl font-black text-slate-900">{isDraftStop ? 'Add Route Stop' : 'Edit Route Stop'}</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Update pickup, dropoff, or extra stop details used by the estimate route.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {!isEndpoint ? (
            <div className="space-y-1.5">
              <label className={labelCls}>Stop Position</label>
              <select
                value={formData.stop_type}
                onChange={(event) => updateField('stop_type', event.target.value)}
                className={inputCls}
                aria-label="Stop position"
              >
                <option value="pre_stop">Before origin</option>
                <option value="stop">Between origin and destination</option>
                <option value="post_stop">After destination</option>
              </select>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label className={labelCls}>Address</label>
            <input
              value={formData.address_line1}
              onChange={(event) => updateField('address_line1', event.target.value)}
              className={inputCls}
              placeholder="Enter address"
              aria-label="Route stop address"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className={labelCls}>City</label>
              <input value={formData.city} onChange={(event) => updateField('city', event.target.value)} className={inputCls} aria-label="Route stop city" />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Province / State</label>
              <input value={formData.state} onChange={(event) => updateField('state', event.target.value)} className={inputCls} aria-label="Route stop province or state" />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Postal Code</label>
              <input value={formData.postal_code} onChange={(event) => updateField('postal_code', event.target.value)} className={inputCls} aria-label="Route stop postal code" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className={labelCls}>Unit / Apt</label>
              <input value={formData.unit_number} onChange={(event) => updateField('unit_number', event.target.value)} className={inputCls} aria-label="Route stop unit" />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Property Type</label>
              <select value={formData.property_type} onChange={(event) => updateField('property_type', event.target.value)} className={inputCls} aria-label="Route stop property type">
                <option value="">Select type</option>
                <option value="house">House</option>
                <option value="apartment">Apartment</option>
                <option value="condo">Condo</option>
                <option value="townhouse">Townhouse</option>
                <option value="office">Office</option>
                <option value="storage">Storage</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className={labelCls}>Parking</label>
              <select value={formData.parking_type} onChange={(event) => updateField('parking_type', event.target.value)} className={inputCls} aria-label="Route stop parking">
                <option value="">Select parking</option>
                <option value="driveway">Driveway</option>
                <option value="street">Street</option>
                <option value="loading_dock">Loading dock</option>
                <option value="parkade">Parkade</option>
                <option value="elevator">Elevator access</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Walk Distance</label>
              <select value={formData.walk_distance_ft} onChange={(event) => updateField('walk_distance_ft', Number(event.target.value))} className={inputCls} aria-label="Route stop walk distance">
                <option value={0}>At door</option>
                <option value={50}>Under 50 ft</option>
                <option value={100}>50-100 ft</option>
                <option value={200}>100-200 ft</option>
                <option value={300}>200+ ft</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className={labelCls}>Flights of Stairs</label>
              <select value={formData.flights_of_stairs} onChange={(event) => updateField('flights_of_stairs', Number(event.target.value))} className={inputCls} aria-label="Route stop stairs">
                {[0, 1, 2, 3, 4, 5].map((count) => (
                  <option key={count} value={count}>{count}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800">
              <input
                type="checkbox"
                checked={formData.has_elevator}
                onChange={(event) => updateField('has_elevator', event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
              />
              Elevator available
            </label>
          </div>

          {!isEndpoint ? (
            <div className="space-y-1.5">
              <label className={labelCls}>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(event) => updateField('notes', event.target.value)}
                className={`${inputCls} min-h-24 resize-y`}
                placeholder="Gate code, storage unit, parking notes..."
                aria-label="Route stop notes"
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <button
            type="button"
            onClick={() => onSave(stop.id, formData)}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-black text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {isDraftStop ? 'Create Stop' : 'Save Stop'}
          </button>
        </div>
      </Card>
    </div>
  );
};

const getActivityLogStatus = (activity) => {
  const kind = getActivityLogKind(activity);
  if (kind === 'email') return activity?.email_log_details?.status || activity?.status || '';
  if (kind === 'sms') return activity?.sms_log_details?.status || activity?.status || '';
  return activity?.status || '';
};

const ActivityPreviewModal = ({ activity, onClose, onReply, branchLogoUrl = '', branchName = '' }) => {
  const [previewAttachment, setPreviewAttachment] = useState(null);

  if (!activity) return null;

  const directAttachment = activity?.__attachmentPreview || null;
  const kind = getActivityLogKind(activity);
  const subject = activity.subject || 'No Subject';
  const sender = activity.user_details?.email || activity.user_details?.first_name || 'System';
  const recipient = getActivityLogRecipient(activity);
  const status = getActivityLogStatus(activity);
  const emailDispatchState = kind === 'email' ? getEmailDispatchState(activity) : null;
  const date = safeDateTime(activity.created_at);
  const bodyHtml = kind === 'email' && !directAttachment ? getActivityLogEmailHtml(activity, {
    branchLogoUrl,
    branchName,
  }) : null;
  const bodyText = getActivityLogBody(activity);
  const title = kind === 'sms' ? 'SMS Preview' : 'Email Preview';
  const label = kind === 'sms' ? 'Phone' : 'To';
  const attachmentTitle = directAttachment?.filename || 'Attachment preview';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-heading/20">
      <Card className="w-full max-w-4xl p-0 overflow-hidden animate-in zoom-in duration-200 rounded-[2rem] shadow-2xl border-0 flex flex-col max-h-[90vh] relative">
        <div className="flex items-center justify-between p-6 border-b border-subtle bg-white shrink-0">
          <div>
            <h3 className="text-xl font-black text-heading tracking-tight">{title}</h3>
            <p className="text-xs font-bold text-body uppercase tracking-widest mt-1">{date}</p>
          </div>
          <div className="flex items-center gap-2">
            {kind === 'email' && onReply && (
              <button 
                type="button" 
                onClick={() => onReply(activity)} 
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-black text-white transition hover:bg-brand-dark"
              >
                <Reply size={16} />
                Reply
              </button>
            )}
            <button 
              type="button" 
              onClick={onClose} 
              className="p-2.5 rounded-2xl hover:bg-page text-body transition-all border border-subtle"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="p-6 bg-page/30 border-b border-subtle shrink-0">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-[0.625rem] font-black uppercase tracking-widest text-body w-16 pt-1">Subject:</span>
              <span className="text-sm font-black text-heading">{subject}</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[0.625rem] font-black uppercase tracking-widest text-body w-16 pt-1">From:</span>
              <span className="text-sm font-bold text-heading">{sender}</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[0.625rem] font-black uppercase tracking-widest text-body w-16 pt-1">{label}:</span>
              <span className="text-sm font-bold text-heading">{recipient || '-'}</span>
            </div>
            {status && (
              <div className="flex items-start gap-3">
                <span className="text-[0.625rem] font-black uppercase tracking-widest text-body w-16 pt-1">Status:</span>
                {emailDispatchState ? (
                  <div className="flex flex-col gap-2">
                    <Pill tone={emailDispatchState.tone}>
                      {emailDispatchState.label}
                    </Pill>
                    {emailDispatchState.details?.length ? (
                      <div className="flex flex-col gap-1">
                        {emailDispatchState.details.map((item) => (
                          <span key={item} className="text-xs font-medium text-body">{item}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-sm font-bold text-heading capitalize">{status}</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-white p-8">
          {directAttachment ? (
            <div className="flex h-full flex-col">
              <div className="mb-3 text-sm font-black text-heading">{attachmentTitle}</div>
              <div className="min-h-[360px] flex-1 overflow-hidden rounded-2xl border border-subtle bg-page/20">
                {String(directAttachment.content_type || '').includes('image') ? (
                  <img
                    src={directAttachment.file_url}
                    alt={attachmentTitle}
                    className="h-full w-full object-contain bg-white"
                  />
                ) : (
                  <iframe
                    src={directAttachment.file_url}
                    title={attachmentTitle}
                    className="h-full w-full border-0 bg-white"
                  />
                )}
              </div>
            </div>
          ) : bodyHtml ? (
            <iframe
              title="Email preview content"
              className="block w-full h-[65vh] min-h-[360px] bg-white"
              sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
              srcDoc={bodyHtml}
            />
          ) : (
            <div className="whitespace-pre-wrap text-sm text-heading leading-relaxed font-medium">
              {bodyText}
            </div>
          )}
        </div>

        {activity.email_log_details?.attachments?.length > 0 && (
          <div className="p-6 bg-page border-t border-subtle shrink-0">
            <p className="text-[0.625rem] font-black uppercase tracking-widest text-body mb-3">Attachments ({activity.email_log_details.attachments.length})</p>
            <div className="flex flex-wrap gap-2">
              {activity.email_log_details.attachments.map((file) => {
                const isPreviewable = file.content_type?.includes('image') || file.content_type?.includes('pdf') || file.content_type?.includes('text');
                return (
                  <div key={file.id} className="inline-flex items-center gap-1 rounded-xl border border-subtle bg-white px-3 py-1.5 text-xs font-black text-primary shadow-sm">
                    <FileText size={14} />
                    <span className="max-w-[200px] truncate">{file.filename}</span>
                    <div className="flex items-center gap-1 ml-2 pl-2 border-l border-subtle">
                      {isPreviewable && (
                        <button
                          type="button"
                          onClick={() => setPreviewAttachment(file)}
                          className="p-1 rounded hover:bg-page transition-colors text-body hover:text-primary"
                          title="Preview Attachment"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded hover:bg-page transition-colors text-body hover:text-primary"
                        title="Download Attachment"
                        download
                      >
                        <Download size={14} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {previewAttachment && (
          <div className="absolute inset-0 z-50 flex flex-col bg-white rounded-[2rem] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-subtle bg-page shrink-0">
              <h4 className="text-sm font-black text-heading truncate">{previewAttachment.filename}</h4>
              <button 
                type="button" 
                onClick={() => setPreviewAttachment(null)} 
                className="p-1.5 rounded-xl hover:bg-white text-body transition-all border border-subtle"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-page/30 flex items-center justify-center">
              {previewAttachment.content_type?.includes('image') ? (
                <img src={previewAttachment.file_url} alt={previewAttachment.filename} className="max-w-full max-h-full object-contain rounded-xl shadow-sm" />
              ) : (
                <iframe src={previewAttachment.file_url} className="w-full h-full border-0 rounded-xl bg-white shadow-sm" title="Attachment Preview" />
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

const MOVE_TYPE_OPTIONS = [
  { id: "local", name: "Local" },
  { id: "long_distance", name: "Long Distance" },
  { id: "interstate", name: "Interstate" }
];

const getMoveTypeLabel = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized === 'intrastate' || normalized === 'long_distance') return 'Long Distance';
  return MOVE_TYPE_OPTIONS.find((option) => String(option.id) === normalized)?.name || value;
};

const normalizeLookupValue = (value) => {
  if (value == null || value === '') return '';
  if (typeof value === 'object') {
    return String(value.id ?? value.value ?? value.code ?? value.pk ?? '');
  }
  return String(value);
};

const SERVICE_TYPE_OPTIONS = [
  { id: "moving", name: "Moving" },
  { id: "packing", name: "Packing" },
  { id: "moving_and_packing", name: "Moving & Packing" },
  { id: "load_only", name: "Load Only" },
  { id: "unload_only", name: "Unload Only" },
  { id: "commercial", name: "Commercial" },
  { id: "storage_inbound", name: "Storage Inbound" },
  { id: "storage_outbound", name: "Storage Outbound" },
  { id: "inner_house", name: "Inner House" },
  { id: "junk_removal", name: "Junk Removal" },
  { id: "labor_only", name: "Labor Only" }
];

const INITIAL_FORM_STATE = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    status: 'new',
    custom_status_code: '',
    service_type: '',
    move_date: '',
    arrival_window_start: '',
    arrival_window_end: '',
    move_size: '',
    move_type: '',
    branch: '',
    assigned_to: '',
    referral_source: '',
    utm_source: '',
    notes: '',
    origin_street: '',
    origin_city: '',
    origin_state: '',
    origin_zip: '',
    destination_street: '',
    destination_city: '',
    destination_state: '',
    destination_zip: '',
    origin_unit_number: '',
    origin_property_type: '',
    origin_parking_type: '',
    origin_flights_of_stairs: 0,
    origin_has_elevator: false,
    origin_walk_distance_ft: 50,
    destination_unit_number: '',
    destination_property_type: '',
    destination_parking_type: '',
    destination_flights_of_stairs: 0,
    destination_has_elevator: false,
    destination_walk_distance_ft: 50,
};
const DETAIL_BOOTSTRAP_TTL_MS = 2500;
const detailBootstrapCache = new Map();
const ACTIVITY_PAGE_SIZE = 20;
const ACTIVITY_FETCH_LIMIT = 20;
const TIMELINE_FETCH_LIMIT = 20;
const DETAIL_TAB_IDS = ['Sales', 'Estimate', 'Files & Photos', 'Documents', 'Accounting', 'Payments'];
const DEFAULT_DETAIL_TAB = 'Sales';
const DEFAULT_ESTIMATE_TAB = 'charges';
const SUB_JOB_SERVICE_OPTIONS = [
  { value: 'move', label: 'Move' },
  { value: 'packing', label: 'Packing' },
  { value: 'loading', label: 'Loading' },
  { value: 'unloading', label: 'Unloading' },
  { value: 'storage', label: 'Storage' },
  { value: 'other', label: 'Other' },
];

const resolveDetailTab = ({ tabSegment, stateTab, search, fallback = DEFAULT_DETAIL_TAB }) => {
  const routeTab = getRecordTabLabelFromSegment(tabSegment);
  if (routeTab) return routeTab;

  const stateLabel = DETAIL_TAB_IDS.includes(stateTab) ? stateTab : null;
  if (stateLabel) return stateLabel;

  const searchParams = new URLSearchParams(search || '');
  const queryTab = getRecordTabLabelFromSegment(searchParams.get('tab')) || (DETAIL_TAB_IDS.includes(searchParams.get('tab')) ? searchParams.get('tab') : null);
  if (queryTab) return queryTab;

  return fallback;
};

const SalesDetail = () => {
  const { id, entityType, tabId, estimateTabId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { canAll, canAny } = useCan();
  const isCanonicalRecordRoute = Boolean(entityType);
  const isLeadPath = entityType
    ? isLeadRecordType(entityType)
    : location.pathname.includes('/leads/');
  const isCreation = id === 'new';
  
  const textareaRef = useRef(null);
  const [opportunity, setOpportunity] = useState(null);
  const [estimateOpportunity, setEstimateOpportunity] = useState(null);
  const [estimateSummary, setEstimateSummary] = useState(null);
  const [estimatePortalInventory, setEstimatePortalInventory] = useState([]);
  const [isLoadingPortalInventory, setIsLoadingPortalInventory] = useState(false);
  const [isLoadingEstimateOpportunity, setIsLoadingEstimateOpportunity] = useState(false);
  const [activities, setActivities] = useState([]);
  const [commTemplates, setCommTemplates] = useState([]);
  const [commCategories, setCommCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCustomerEditing, setIsCustomerEditing] = useState(isCreation);
  const [isRouteEditing, setIsRouteEditing] = useState(isCreation);
  const [isSpecsEditing, setIsSpecsEditing] = useState(isCreation);
  const [isMoveDateEditing, setIsMoveDateEditing] = useState(false);
  const [isCustomerSaving, setIsCustomerSaving] = useState(false);
  const [isRouteSaving, setIsRouteSaving] = useState(false);
  const [isSpecsSaving, setIsSpecsSaving] = useState(false);
  const [isMoveDateSaving, setIsMoveDateSaving] = useState(false);
  const [customerDraft, setCustomerDraft] = useState(null);
  const [routeDraft, setRouteDraft] = useState(null);
  const [editingRouteStop, setEditingRouteStop] = useState(null);
  const [isRouteStopModalOpen, setIsRouteStopModalOpen] = useState(false);
  const [isRouteStopSaving, setIsRouteStopSaving] = useState(false);
  const [specsDraft, setSpecsDraft] = useState(null);
  const [inboundHtmlModalOpen, setInboundHtmlModalOpen] = useState(false);
  const [inboundHtmlModalContent, setInboundHtmlModalContent] = useState('');
  const [inboundHtmlModalSubject, setInboundHtmlModalSubject] = useState('');

  const hasPermission = useCallback((permission) => canAll([permission]), [canAll]);
  const requiresAnyPermission = useCallback((permissions) => canAny(permissions), [canAny]);
  const denyAction = useCallback((message) => {
    setToast({ type: 'warning', text: message });
    return false;
  }, []);
  const canViewOpportunity = useCallback(() => hasPermission(PERMISSIONS.SALES_VIEW_OPPORTUNITY), [hasPermission]);
  const canCreateOpportunity = useCallback(() => hasPermission(PERMISSIONS.OPPORTUNITY_CREATE), [hasPermission]);
  const canDuplicateOpportunity = useCallback(() => hasPermission(PERMISSIONS.OPPORTUNITY_DUPLICATE), [hasPermission]);
  const canBookOpportunity = useCallback(() => hasPermission(PERMISSIONS.OPPORTUNITY_BOOK), [hasPermission]);
  const canMarkOpportunityLost = useCallback(() => hasPermission(PERMISSIONS.OPPORTUNITY_MARK_LOST), [hasPermission]);
  const canEditOpportunity = useCallback(() => hasPermission(PERMISSIONS.OPPORTUNITY_EDIT), [hasPermission]);
  const canManageActivityHistory = useCallback(
    () => hasPermission(PERMISSIONS.COMMUNICATIONS_HISTORY_VIEW),
    [hasPermission]
  );
  const canCreateTask = useCallback(
    () => hasPermission(PERMISSIONS.SALES_VIEW_TASK) || hasPermission(PERMISSIONS.SALES_CHANGE_TASK),
    [hasPermission]
  );
  const canSendEmail = useCallback(
    () => hasPermission(PERMISSIONS.COMMUNICATIONS_EMAIL_SEND),
    [hasPermission]
  );
  const canSendSms = useCallback(
    () => hasPermission(PERMISSIONS.COMMUNICATIONS_SMS_SEND),
    [hasPermission]
  );
  const canLogCall = useCallback(
    () => hasPermission(PERMISSIONS.COMMUNICATIONS_CALL_LOG),
    [hasPermission]
  );

  // Book Job Modal State
  const [isBookJobModalOpen, setIsBookJobModalOpen] = useState(false);
  const [bookJobSendEmail, setBookJobSendEmail] = useState(true);
  const [bookJobSendSms, setBookJobSendSms] = useState(false);
  const [bookJobEmail, setBookJobEmail] = useState('');
  const [bookJobPhone, setBookJobPhone] = useState('');
  const [isBookingJob, setIsBookingJob] = useState(false);

  const availableEmails = useMemo(() => {
    const list = [];
    const seen = new Set();
    const addEmail = (email, label) => {
      if (!email) return;
      const cleaned = email.trim();
      if (!cleaned || seen.has(cleaned.toLowerCase())) return;
      seen.add(cleaned.toLowerCase());
      list.push({ label, value: cleaned });
    };
    if (opportunity?.customer_details?.email) {
      addEmail(opportunity.customer_details.email, `Customer Primary: ${opportunity.customer_details.email}`);
    }
    if (opportunity?.email) {
      addEmail(opportunity.email, `Opportunity Email: ${opportunity.email}`);
    }
    if (opportunity?.customer_details?.contacts && Array.isArray(opportunity.customer_details.contacts)) {
      opportunity.customer_details.contacts.forEach((contact) => {
        if (contact.email) {
          addEmail(contact.email, contact.relationship ? `${contact.name} (${contact.relationship}): ${contact.email}` : `${contact.name}: ${contact.email}`);
        }
      });
    }
    if (opportunity?.additional_contacts && Array.isArray(opportunity.additional_contacts)) {
      opportunity.additional_contacts.forEach((contact) => {
        if (contact.email) {
          addEmail(contact.email, contact.relationship ? `${contact.name} (${contact.relationship}): ${contact.email}` : `${contact.name}: ${contact.email}`);
        }
      });
    }
    return list;
  }, [opportunity]);

  const availablePhones = useMemo(() => {
    const list = [];
    const seen = new Set();
    const addPhone = (phone, label) => {
      if (!phone) return;
      const cleaned = phone.trim();
      if (!cleaned || seen.has(cleaned)) return;
      seen.add(cleaned);
      list.push({ label, value: cleaned });
    };
    if (opportunity?.customer_details?.phone) {
      addPhone(opportunity.customer_details.phone, `Customer Primary: ${opportunity.customer_details.phone}`);
    }
    if (opportunity?.phone) {
      addPhone(opportunity.phone, `Opportunity Phone: ${opportunity.phone}`);
    }
    if (opportunity?.customer_details?.contacts && Array.isArray(opportunity.customer_details.contacts)) {
      opportunity.customer_details.contacts.forEach((contact) => {
        if (contact.phone) {
          addPhone(contact.phone, contact.relationship ? `${contact.name} (${contact.relationship}): ${contact.phone}` : `${contact.name}: ${contact.phone}`);
        }
      });
    }
    if (opportunity?.additional_contacts && Array.isArray(opportunity.additional_contacts)) {
      opportunity.additional_contacts.forEach((contact) => {
        if (contact.phone) {
          addPhone(contact.phone, contact.relationship ? `${contact.name} (${contact.relationship}): ${contact.phone}` : `${contact.name}: ${contact.phone}`);
        }
      });
    }
    return list;
  }, [opportunity]);

  useEffect(() => {
    if (isBookJobModalOpen) {
      if (availableEmails.length > 0 && !bookJobEmail) setBookJobEmail(availableEmails[0].value);
      if (availablePhones.length > 0 && !bookJobPhone) setBookJobPhone(availablePhones[0].value);
    }
  }, [isBookJobModalOpen, availableEmails, availablePhones]);

  const confirmBookJob = async (allowWithoutDeposit = false, overrideSendEmail = null, overrideSendSms = null) => {
    setIsBookingJob(true);
    try {
      const sendEmail = overrideSendEmail !== null ? overrideSendEmail : bookJobSendEmail;
      const sendSms = overrideSendSms !== null ? overrideSendSms : bookJobSendSms;
      const payload = {
        send_email: sendEmail,
        send_sms: sendSms,
        to_email: sendEmail ? (bookJobEmail || '') : '',
        to_phone: sendSms ? (bookJobPhone || '') : '',
      };
      if (allowWithoutDeposit) {
        payload.allow_without_deposit = true;
      }
      
      const updated = await bookOpportunityJob(opportunity.id, payload);
      setOpportunity((prev) => ({ ...prev, ...(updated?.data || updated || {}) }));
      setIsBookJobModalOpen(false);
      setToast({ type: 'success', text: 'Job successfully booked.' });
    } catch (err) {
      const code = err?.response?.data?.code;
      const canOverride = Boolean(err?.response?.data?.can_override);
      if (code === 'deposit_required' && canOverride) {
        const confirmOverride = window.confirm('Deposit payment is not recorded. Book this job anyway?');
        if (confirmOverride) {
          return confirmBookJob(true);
        }
      } else {
        const msg = err?.response?.data?.detail || 'Failed to book job.';
        setToast({ type: 'error', text: String(msg) });
      }
    } finally {
      setIsBookingJob(false);
    }
  };

  // Tracks display labels for async-selected spec fields so the panel shows
  // the chosen name immediately (before the API reload updates _details).
  const [specsDraftLabels, setSpecsDraftLabels] = useState({});
  // Labels that have been committed (saved) — used to display the correct name
  // when the API response does not include nested _details objects.
  const [committedSpecsLabels, setCommittedSpecsLabels] = useState({});
  const [moveDateDraft, setMoveDateDraft] = useState(null);
  const [availabilityData, setAvailabilityData] = useState(null);
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(() => resolveDetailTab({
    tabSegment: tabId,
    stateTab: location.state?.activeTab,
    search: location.search,
  }));
  const [estimateInitialSubTab, setEstimateInitialSubTab] = useState(
    () => getEstimateTabFromSegment(estimateTabId) || DEFAULT_ESTIMATE_TAB
  );
  const [sendEstimateNonce, setSendEstimateNonce] = useState(0);
  const [triggerViewEstimateNonce, setTriggerViewEstimateNonce] = useState(0);
  const [pendingEstimateHeaderAction, setPendingEstimateHeaderAction] = useState('');
  const [isEstimateMenuOpen, setIsEstimateMenuOpen] = useState(false);

  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [contractTemplates, setContractTemplates] = useState([]);
  const [contractTemplatesLoading, setContractTemplatesLoading] = useState(false);
  const [contractTemplatesError, setContractTemplatesError] = useState('');
  const [contractSending, setContractSending] = useState(false);
  const [contractSendResult, setContractSendResult] = useState({ link: '', errors: [] });
  const [contractSendError, setContractSendError] = useState('');
  const [contractPreviewLoading, setContractPreviewLoading] = useState(false);
  const [contractPreviewError, setContractPreviewError] = useState('');
  const [contractPreviewHtml, setContractPreviewHtml] = useState('');
  const [isContractPreviewOpen, setIsContractPreviewOpen] = useState(false);
  const [contractDraft, setContractDraft] = useState({
    template_id: '',
    title: '',
    contract_number: '',
    send_email: true,
    send_sms: true,
    to_email: '',
    to_phone: '',
  });

  const [isContractResendModalOpen, setIsContractResendModalOpen] = useState(false);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [contractsError, setContractsError] = useState('');
  const [contracts, setContracts] = useState([]);
  const [contractResendSending, setContractResendSending] = useState(false);
  const [contractResendResult, setContractResendResult] = useState({ link: '', errors: [] });
  const [contractResendError, setContractResendError] = useState('');
  const [contractResendDraft, setContractResendDraft] = useState({
    contract_id: '',
    send_email: true,
    send_sms: true,
    to_email: '',
    to_phone: '',
  });
  const [isDocumentsDrawerOpen, setIsDocumentsDrawerOpen] = useState(false);
  const [documentsContracts, setDocumentsContracts] = useState([]);
  const [documentsContractsLoading, setDocumentsContractsLoading] = useState(false);
  const [documentsContractsError, setDocumentsContractsError] = useState('');
  const [documentsStatusFilter, setDocumentsStatusFilter] = useState('all');

  const navigateToDetailTab = useCallback((nextTab, options = {}) => {
    const fallbackEntityType = isLeadPath ? 'lead' : 'opportunity';
    const targetEntityType = options.entityType || fallbackEntityType;
    const targetRecord = options.record || opportunity || estimateOpportunity || { id };
    const path = isCanonicalRecordRoute
      ? getRecordDetailTabPath(targetEntityType, targetRecord, nextTab)
      : getLegacyRecordDetailTabPath(targetEntityType, targetRecord?.id ?? id, nextTab);
    navigate(path, options.navigateOptions);
  }, [estimateOpportunity, id, isCanonicalRecordRoute, isLeadPath, navigate, opportunity]);

  const navigateToEstimateSubTab = useCallback((nextSubTab, options = {}) => {
    const normalizedSubTab = getEstimateTabFromSegment(nextSubTab) || DEFAULT_ESTIMATE_TAB;
    const fallbackEntityType = isLeadPath ? 'lead' : 'opportunity';
    const targetEntityType = options.entityType || fallbackEntityType;
    const targetRecord = options.record || opportunity || estimateOpportunity || { id };
    const path = isCanonicalRecordRoute
      ? getRecordEstimateTabPath(targetEntityType, targetRecord, normalizedSubTab)
      : getLegacyRecordEstimateTabPath(targetEntityType, targetRecord?.id ?? id, normalizedSubTab);
    setEstimateInitialSubTab(normalizedSubTab);
    navigate(path, options.navigateOptions);
  }, [estimateOpportunity, id, isCanonicalRecordRoute, isLeadPath, navigate, opportunity]);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(getRecordListPath(isLeadPath ? 'lead' : 'opportunity'));
  }, [isLeadPath, navigate]);
  const [activeContractMenuId, setActiveContractMenuId] = useState(null);
  const estimateMenuRef = useRef(null);
  const [opportunityJobs, setOpportunityJobs] = useState([]);
  const [selectedEstimateJobId, setSelectedEstimateJobId] = useState('');
  const [selectedAccountingJobId, setSelectedAccountingJobId] = useState(null);
  const [selectedAccountingEstimateId, setSelectedAccountingEstimateId] = useState(null);
  const [opportunityAccountingSummary, setOpportunityAccountingSummary] = useState(null);
  const [isSavingSubJob, setIsSavingSubJob] = useState(false);
  const [accountingJob, setAccountingJob] = useState(null);
  const [accountingSummary, setAccountingSummary] = useState(null);
  const [isLoadingAccounting, setIsLoadingAccounting] = useState(false);
  const [payrollDraft, setPayrollDraft] = useState([]);
  const [isSavingPayroll, setIsSavingPayroll] = useState(false);
  const [costDraft, setCostDraft] = useState({ category: 'misc', amount: '', description: '' });
  const [isSavingCost, setIsSavingCost] = useState(false);
  const [isFinalizingInvoice, setIsFinalizingInvoice] = useState(false);
  const [invoiceDetailsMap, setInvoiceDetailsMap] = useState({});
  const [refinalizingInvoiceJobId, setRefinalizingInvoiceJobId] = useState(null);
  const invoiceDetail = invoiceDetailsMap[selectedAccountingJobId];
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('');
  const paymentModes = ['Cash', 'Credit Card', 'Card', 'EFT', 'Other'];
  const [isSendingInvoice, setIsSendingInvoice] = useState(false);
  const [isInvoiceDraftOpen, setIsInvoiceDraftOpen] = useState(false);
  const [invoiceDraftsMap, setInvoiceDraftsMap] = useState({});
  const invoiceDraft = invoiceDraftsMap[selectedAccountingJobId];
  const [isLoadingInvoiceDraft, setIsLoadingInvoiceDraft] = useState(false);
  const [isSavingInvoiceDraft, setIsSavingInvoiceDraft] = useState(false);
  const [editingInvoiceLineItemId, setEditingInvoiceLineItemId] = useState(null);
  const [invoiceLineDraft, setInvoiceLineDraft] = useState(null);
  const [isSavingInvoiceLine, setIsSavingInvoiceLine] = useState(false);
  const [activeInvoiceDraftMenuKey, setActiveInvoiceDraftMenuKey] = useState(null);
  const [isInvoicePreviewOpen, setIsInvoicePreviewOpen] = useState(false);
  const [invoicePreviewData, setInvoicePreviewData] = useState(null);
  const [invoicePreviewAction, setInvoicePreviewAction] = useState(null);
  const [invoiceEmailRecipient, setInvoiceEmailRecipient] = useState('');
  const [crewDirectory, setCrewDirectory] = useState([]);
  const [gatewayPayments, setGatewayPayments] = useState([]);

  const loadOpportunityJobs = useCallback(async () => {
    if (!opportunity?.id || isCreation) {
      setOpportunityJobs([]);
      setSelectedEstimateJobId('');
      return [];
    }
    try {
      const jobs = await api.sales.getOpportunityPlannedSubJobs(opportunity.id);
      const rows = Array.isArray(jobs?.results) ? jobs.results : Array.isArray(jobs) ? jobs : [];
      setOpportunityJobs(rows);
      setSelectedEstimateJobId((prev) => {
        const prevId = String(prev || '');
        if (prevId && rows.some((job) => String(job.id) === prevId)) {
          return prev;
        }
        return rows[0]?.id ? String(rows[0].id) : '';
      });
      return rows;
    } catch (err) {
      console.warn('Failed to load opportunity jobs:', err);
      setOpportunityJobs([]);
      setSelectedEstimateJobId('');
      return [];
    }
  }, [isCreation, opportunity?.id]);


  const allPayments = useMemo(() => {
    const list = [];
    
    // 1. Add manual payments from the estimate summary when available
    const rawEstimateManual = Array.isArray(estimateSummary?.payment_summary?.manual_payments)
      ? estimateSummary.payment_summary.manual_payments
      : [];
    rawEstimateManual.forEach((p) => {
      list.push({
        id: p.id || Math.random(),
        amount: Number(p.amount || 0),
        paid_at: p.paid_at || p.created_at || p.paidAt || p.createdAt,
        created_at: p.created_at || p.createdAt,
        method: p.method || 'Payment',
        reference: p.reference || '',
        refunded_amount: Number(p.refunded_amount || 0),
        net_amount: Number(p.amount || 0) - Number(p.refunded_amount || 0),
        source_type: 'manual',
      });
    });

    // 2. Add gateway/online payments
    const rawGateway = Array.isArray(gatewayPayments) ? gatewayPayments : [];
    rawGateway.forEach((p) => {
      if (p.status === 'pending') return;
      list.push({
        id: p.id || Math.random(),
        amount: Number(p.amount || 0),
        paid_at: p.created_at || p.createdAt,
        created_at: p.created_at || p.createdAt,
        method: p.payment_method_details?.type || p.payment_method_type || 'card',
        reference: p.reference || p.provider_reference || '',
        refunded_amount: Number(p.refunded_amount || 0),
        net_amount: Number(p.amount || 0) - Number(p.refunded_amount || 0),
        status: p.status,
        source_type: 'gateway',
      });
    });

    // Sort by date descending
    return list.sort((a, b) => new Date(b.paid_at || b.created_at) - new Date(a.paid_at || a.created_at));
  }, [estimateSummary?.payment_summary?.manual_payments, gatewayPayments]);

  const pendingPayments = useMemo(
    () => (Array.isArray(gatewayPayments) ? gatewayPayments : [])
      .filter((payment) => payment.status === 'pending')
      .map((payment) => ({
        id: payment.id,
        amount: Number(payment.amount || 0),
        paid_at: payment.created_at || payment.createdAt,
        method: payment.payment_method_details?.type || payment.payment_method_type || 'payment',
        source_type: 'gateway',
        pending: true,
      })),
    [gatewayPayments]
  );

  const pendingPaymentAmount = useMemo(
    () => pendingPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [pendingPayments]
  );

  const ledgerPaidAmount = useMemo(
    () => allPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [allPayments]
  );

  const opportunityEstimateTotal = Number(
    opportunityAccountingSummary?.estimate?.grand_total
      ?? accountingSummary?.estimate?.grand_total
      ?? estimateSummary?.grand_total
      ?? 0
  );
  const paymentBalanceDue = Number(accountingSummary?.payments?.balance_due ?? invoiceDetail?.balance_due ?? 0);
  const selectedInvoice = useMemo(() => {
    return (opportunityAccountingSummary?.jobs || []).find(
      (row) => Number(row.id) === Number(selectedAccountingJobId)
    );
  }, [opportunityAccountingSummary?.jobs, selectedAccountingJobId]);
  const opportunityPaymentBalanceDue = Math.max(
    opportunityEstimateTotal - Number(ledgerPaidAmount || opportunityAccountingSummary?.payments?.total_paid || accountingSummary?.payments?.total_paid || 0),
    0
  );
  const opportunityInvoiceRollupBalanceDue = Math.max(
    Number(opportunityAccountingSummary?.invoice_rollup?.total ?? opportunityEstimateTotal) - Number(ledgerPaidAmount || opportunityAccountingSummary?.payments?.total_paid || accountingSummary?.payments?.total_paid || 0),
    0
  );
  const [commTab, setCommTab] = useState('note');
  const [emailComposeMode, setEmailComposeMode] = useState('manual');
  const [activityFilter, setActivityFilter] = useState('all');
  const [activityOffset, setActivityOffset] = useState(0);
  const [hasMoreActivities, setHasMoreActivities] = useState(true);
  const [isLoadingMoreActivities, setIsLoadingMoreActivities] = useState(false);
  const [timelineOffset, setTimelineOffset] = useState(0);
  const [hasMoreTimeline, setHasMoreTimeline] = useState(true);
  const [isLoadingMoreTimeline, setIsLoadingMoreTimeline] = useState(false);
  const [activitySubject, setActivitySubject] = useState('');
  const [activityEmailRecipients, setActivityEmailRecipients] = useState([]);
  const [activityEmailToText, setActivityEmailToText] = useState('');
  const [activityEmailCcText, setActivityEmailCcText] = useState('');
  const [activityEmailBccText, setActivityEmailBccText] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [activitySmsRecipients, setActivitySmsRecipients] = useState([]);
  const [activityCallRecipient, setActivityCallRecipient] = useState('');
  const [editingActivity, setEditingActivity] = useState(null);
  const [expandedActivityKeys, setExpandedActivityKeys] = useState(() => new Set());
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDuplicateConfirmOpen, setIsDuplicateConfirmOpen] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [activityBodies, setActivityBodies] = useState({
    note: '',
    email: '',
    call: '',
    text: '',
  });
  const [emailAttachments, setEmailAttachments] = useState([]);
  const [callDuration, setCallDuration] = useState('');
  const [callDirection, setCallDirection] = useState('outbound');
  const [callDisposition, setCallDisposition] = useState('connected');
  const [editingCallLog, setEditingCallLog] = useState(null);
  const [callLogModalOpen, setCallLogModalOpen] = useState(false);
  const [callLogDraft, setCallLogDraft] = useState({
    duration_minutes: '0',
    direction: 'outbound',
    disposition: 'connected',
  });
  const [isPosting, setIsPosting] = useState(false);
  const [toast, setToast] = useState({ type: '', text: '' });
  const [hasActiveEmailProvider, setHasActiveEmailProvider] = useState(false);
  const [isLoadingCommTemplates, setIsLoadingCommTemplates] = useState(false);
  const [followUps, setFollowUps] = useState([]);
  const [isLoadingFollowUps, setIsLoadingFollowUps] = useState(false);
  const [isSavingFollowUp, setIsSavingFollowUp] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [followUpType, setFollowUpType] = useState('general');
  const [followUpSubject, setFollowUpSubject] = useState('');
  const [followUpDueDate, setFollowUpDueDate] = useState('');
  const [followUpDueTime, setFollowUpDueTime] = useState('');
  const [followUpAssignedTo, setFollowUpAssignedTo] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [followUpMode, setFollowUpMode] = useState('create');
  const [editingFollowUpId, setEditingFollowUpId] = useState(null);
  const [additionalContactError, setAdditionalContactError] = useState('');
  const [additionalContactForms, setAdditionalContactForms] = useState([]);
  const [selectedAdditionalContactIndex, setSelectedAdditionalContactIndex] = useState(0);
  const [isAdditionalContactsModalOpen, setIsAdditionalContactsModalOpen] = useState(false);
  const [isAdditionalContactsSaving, setIsAdditionalContactsSaving] = useState(false);
  const commTemplatesLoadedRef = useRef('');
  const emailProviderLoadedRef = useRef(false);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [reasonAction, setReasonAction] = useState('');
  const [selectedLostReason, setSelectedLostReason] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [lostReasonOptions, setLostReasonOptions] = useState([]);
  const [lostReasonOverride, setLostReasonOverride] = useState('');
  const [isUnbookModalOpen, setIsUnbookModalOpen] = useState(false);
  const [unbookReason, setUnbookReason] = useState('');
  const [unbookNote, setUnbookNote] = useState('');
  const [isEstimateRequirementsModalOpen, setIsEstimateRequirementsModalOpen] = useState(false);
  const [estimateRequirementsDraft, setEstimateRequirementsDraft] = useState(null);
  const [estimateRequirementsError, setEstimateRequirementsError] = useState('');
  const [isSavingEstimateRequirements, setIsSavingEstimateRequirements] = useState(false);
  const [showRingCentral, setShowRingCentral] = useState(false);
  
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [moverSizes, setMoverSizes] = useState([]);
  const [moverTypes, setMoverTypes] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  
  const computedSubJobServiceOptions = useMemo(() => {
    if (serviceTypes && serviceTypes.length > 0) {
      return serviceTypes.map(st => ({
        value: String(st.id ?? st.value ?? st.code ?? st.label ?? ''),
        label: st.name ?? st.label ?? 'Unknown'
      }));
    }
    return SUB_JOB_SERVICE_OPTIONS;
  }, [serviceTypes]);

  const [referralSources, setReferralSources] = useState([]);
  // Single source for both Lead and Opportunity custom status dropdown
  const [customStatusCodes, setCustomStatusCodes] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [selectedActivityForPreview, setSelectedActivityForPreview] = useState(null);
  const [duplicateOptions, setDuplicateOptions] = useState({ clearMoveDate: false, openNewRecord: true });

  const inputCls = 'w-full px-3 py-2 rounded-lg border-2 border-[#9fcdf5] bg-[#eef6ff] text-sm font-bold text-[#1f7ae0] outline-none shadow-sm transition-all placeholder-[#5b7083] hover:border-[#7bb9eb] focus:border-[#1f7ae0] focus:ring-2 focus:ring-[#1f7ae0]/10';
  const workspaceInputCls = 'w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none shadow-sm transition-all placeholder:text-slate-400 hover:border-slate-350 focus:border-brand focus:ring-4 focus:ring-brand/10';
  const currentActivityBody = activityBodies[commTab] || '';
  const setCurrentActivityBody = (value) => {
    setActivityBodies((prev) => ({ ...prev, [commTab]: value }));
  };
  const buildCurrentOpportunityFormSnapshot = useCallback(
    () => ({
      ...form,
      ...(customerDraft || {}),
      ...(routeDraft || {}),
      ...(specsDraft || {}),
      ...(moveDateDraft || {}),
    }),
    [customerDraft, form, moveDateDraft, routeDraft, specsDraft]
  );

  const splitLocalDateTime = (isoString) => {
    if (!isoString) return { date: '', time: '' };
    const dt = new Date(isoString);
    if (Number.isNaN(dt.getTime())) return { date: '', time: '' };
    const pad = (value) => String(value).padStart(2, '0');
    return {
      date: `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`,
      time: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`,
    };
  };

  const loadEstimateContext = useCallback(async (record) => {
    if (isCreation || !record || record?.id === 'new') {
      setEstimateOpportunity(null);
      setEstimateSummary(null);
      setIsLoadingEstimateOpportunity(false);
      return;
    }

    if (isLeadPath) {
      if (!record?.opportunity_id) {
        setEstimateOpportunity(null);
        setEstimateSummary(null);
        setIsLoadingEstimateOpportunity(false);
        return;
      }
      setIsLoadingEstimateOpportunity(true);
      try {
        const linkedOpportunity = await api.get(`/sales/opportunities/${record.opportunity_id}/`, {
          params: { include_portal_inventory: 1 },
        });
        const linkedOpportunityData = linkedOpportunity?.data || linkedOpportunity || null;
        setEstimateOpportunity(linkedOpportunityData);
        const linkedEstimates = await getEstimates({ opportunity: linkedOpportunityData.id });
        const linkedRows = Array.isArray(linkedEstimates?.results) ? linkedEstimates.results : Array.isArray(linkedEstimates) ? linkedEstimates : [];
        const activeEstimate = linkedRows.find((row) => row?.method === 'manual') || linkedRows[0] || null;
        if (activeEstimate?.id) {
          const detail = await api.get(`/estimates/${activeEstimate.id}/`);
          setEstimateSummary(detail || activeEstimate);
        } else {
          setEstimateSummary(activeEstimate);
        }
      } catch (linkedErr) {
        console.warn('Failed to load linked opportunity/estimate context:', linkedErr);
        setEstimateOpportunity(null);
        setEstimateSummary(null);
      } finally {
        setIsLoadingEstimateOpportunity(false);
      }
      return;
    }

    setEstimateOpportunity(record);
    try {
      const estimates = await getEstimates({ opportunity: record.id });
      const rows = Array.isArray(estimates?.results) ? estimates.results : Array.isArray(estimates) ? estimates : [];
      const activeEstimate = rows.find((row) => row?.method === 'manual') || rows[0] || null;
      if (activeEstimate?.id) {
        const detail = await api.get(`/estimates/${activeEstimate.id}/`);
        setEstimateSummary(detail || activeEstimate);
      } else {
        setEstimateSummary(activeEstimate);
      }
    } catch (err) {
      console.warn('Failed to load estimate summary:', err);
      setEstimateSummary(null);
    }
  }, [isCreation, isLeadPath]);

  const loadEstimatePortalInventory = useCallback(async (estimateId, { silent = false } = {}) => {
    if (!estimateId) {
      setEstimatePortalInventory([]);
      return;
    }
    setIsLoadingPortalInventory(true);
    try {
      const res = await api.get(`/estimates/${estimateId}/`, {
        include_portal_inventory: 1,
      });
      const detail = res?.data || res || {};
      const rows = Array.isArray(detail?.portal_inventory_items) ? detail.portal_inventory_items : [];
      setEstimatePortalInventory(rows);
    } catch (err) {
      if (!silent) console.warn('Failed to load estimate portal inventory:', err);
      setEstimatePortalInventory([]);
    } finally {
      setIsLoadingPortalInventory(false);
    }
  }, []);

  const resolvedEstimateId = estimateSummary?.id
    || accountingSummary?.estimate?.id
    || estimateSummary?.payment_summary?.estimate_id
    || accountingSummary?.estimate_id
    || invoicePreviewData?.estimate_id
    || null;

  useEffect(() => {
    if (estimateInitialSubTab !== 'inventory' && activeTab !== 'Sales') {
      return undefined;
    }

    if (!resolvedEstimateId) {
      return undefined;
    }

    loadEstimatePortalInventory(resolvedEstimateId);
  }, [
    estimateInitialSubTab,
    activeTab,
    resolvedEstimateId,
    loadEstimatePortalInventory,
  ]);

  useEffect(() => {
    if (!estimateSummary?.id) return undefined;

    const shouldRefreshInventory = estimateInitialSubTab === 'inventory' || activeTab === 'Sales';

    const handleFocus = () => {
      if (shouldRefreshInventory) {
        loadEstimatePortalInventory(estimateSummary.id, { silent: true });
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    const intervalId = window.setInterval(() => {
      if (shouldRefreshInventory) {
        loadEstimatePortalInventory(estimateSummary.id, { silent: true });
      }
    }, 15000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      window.clearInterval(intervalId);
    };
  }, [estimateInitialSubTab, activeTab, estimateSummary?.id, loadEstimatePortalInventory]);

  const getFollowUpActivityId = (task) => task?.activity_details?.id || task?.activity?.id || task?.activity || null;
  const getFollowUpTargetPayload = (task) => {
    const opportunityId = task?.opportunity_id || task?.opportunity?.id || task?.opportunity || null;
    const leadId = task?.lead_id || task?.lead?.id || task?.lead || null;
    if (opportunityId) return { opportunity: opportunityId };
    if (leadId) return { lead: leadId };
    return isLeadPath
      ? (opportunity?.opportunity_id ? { opportunity: opportunity.opportunity_id } : { lead: opportunity?.id })
      : { opportunity: opportunity?.id };
  };
  const resetFollowUpForm = () => {
    setFollowUpMode('create');
    setEditingFollowUpId(null);
    setFollowUpType('general');
    setFollowUpSubject('');
    setFollowUpDueDate('');
    setFollowUpDueTime('');
    setFollowUpAssignedTo('');
    setFollowUpNotes('');
  };
  const openCreateFollowUpModal = () => {
    resetFollowUpForm();
    setIsFollowUpModalOpen(true);
  };
  const openEditFollowUpModal = (task) => {
    const activity = task?.activity_details || {};
    const parts = splitLocalDateTime(task?.due_date);
    setFollowUpMode('edit');
    setEditingFollowUpId(task?.id || null);
    setFollowUpType(String(task?.task_type || 'general'));
    setFollowUpSubject(activity.subject || '');
    setFollowUpDueDate(parts.date);
    setFollowUpDueTime(parts.time || '09:00');
    setFollowUpAssignedTo(String(task?.assigned_to || task?.assigned_to_details?.id || ''));
    setFollowUpNotes(task?.notes || activity.description || '');
    setIsFollowUpModalOpen(true);
  };
  const closeFollowUpModal = () => {
    setIsFollowUpModalOpen(false);
    resetFollowUpForm();
  };

  useEffect(() => {
    if (!toast?.text) return undefined;
    const timer = window.setTimeout(() => setToast({ type: '', text: '' }), 4500);
    return () => window.clearTimeout(timer);
  }, [toast?.text]);

  const fetchTimeline = async (entityType, entityId) => {
    try {
      const res = await getTimelineEvents({ entity_type: entityType, entity_id: entityId, limit: TIMELINE_FETCH_LIMIT });
      const rows = asList(res?.data || res);
      setTimelineEvents(rows);
      setTimelineOffset(0);
      setHasMoreTimeline(rows.length >= TIMELINE_FETCH_LIMIT);
    } catch (err) {
      console.warn('Failed to load timeline events:', err);
      setTimelineEvents([]);
      setHasMoreTimeline(false);
    }
  };

  const fetchUnifiedTimeline = async ({ leadId, opportunityId }) => {
    const requests = [];
    if (leadId) requests.push(getTimelineEvents({ entity_type: 'lead', entity_id: leadId, limit: TIMELINE_FETCH_LIMIT }));
    if (opportunityId) requests.push(getTimelineEvents({ entity_type: 'opportunity', entity_id: opportunityId, limit: TIMELINE_FETCH_LIMIT }));
    if (!requests.length) {
      setTimelineEvents([]);
      return;
    }
    try {
      const results = await Promise.allSettled(requests);
      const all = results.flatMap((r) => {
        if (r.status !== 'fulfilled') return [];
        return asList(r.value?.data || r.value);
      });
      const deduped = dedupeInboundTimelineEvents(all);
      deduped.sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime());
      setTimelineEvents(deduped);
      setTimelineOffset(0);
      setHasMoreTimeline(all.length > 0);
    } catch (err) {
      console.warn('Failed to load unified timeline:', err);
      setTimelineEvents([]);
      setHasMoreTimeline(false);
    }
  };

  useEffect(() => {
    if (!opportunity || opportunity.id === 'new' || activeTab !== 'Sales') return;
    const nextTimelineKey = [
      activeTab,
      isLeadPath ? 'lead' : 'opportunity',
      opportunity?.id || '',
      opportunity?.lead || '',
      opportunity?.opportunity_id || opportunity?.opportunity || '',
    ].join(':');
    if (timelineBootstrapKeyRef.current === nextTimelineKey) return;
    timelineBootstrapKeyRef.current = nextTimelineKey;
    let cancelled = false;
    try {
      const leadId = isLeadPath ? Number(opportunity?.id || 0) || null : Number(opportunity?.lead || 0) || null;
      const opportunityId = isLeadPath
        ? Number(opportunity?.opportunity_id || opportunity?.opportunity || 0) || null
        : Number(opportunity?.id || 0) || null;
      window.setTimeout(() => {
        if (!cancelled) {
          fetchUnifiedTimeline({ leadId, opportunityId });
        }
      }, 0);
    } catch {
      // Ignore timeline refresh errors.
    }
    return () => {
      cancelled = true;
    };
  }, [activeTab, isLeadPath, opportunity?.id, opportunity?.lead, opportunity?.opportunity_id, opportunity?.opportunity]);

  useEffect(() => {
    if (!opportunity || opportunity.id === 'new' || activeTab !== 'Sales') return undefined;

    const refreshTimeline = () => {
      const leadId = isLeadPath ? Number(opportunity?.id || 0) || null : Number(opportunity?.lead || 0) || null;
      const opportunityId = isLeadPath
        ? Number(opportunity?.opportunity_id || opportunity?.opportunity || 0) || null
        : Number(opportunity?.id || 0) || null;
      if (!leadId && !opportunityId) return;
      fetchUnifiedTimeline({ leadId, opportunityId });
    };

    const handleFocus = () => refreshTimeline();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    const intervalId = window.setInterval(refreshTimeline, 30000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      window.clearInterval(intervalId);
    };
  }, [activeTab, isLeadPath, opportunity?.id, opportunity?.lead, opportunity?.opportunity_id, opportunity?.opportunity]);

  const fetchOpportunity = async () => {
    setEstimateOpportunity(null);
    setEstimateSummary(null);
    setIsLoadingEstimateOpportunity(false);
    if (isCreation) {
      setOpportunity({ id: 'new', status: 'new', isOpportunity: !isLeadPath });
      setActivities([]);
      setFollowUps([]);
      return;
    }

    try {
      if (isLeadPath) {
        const leadData = isCanonicalRecordRoute
          ? await getLeadBySalesNumber(id)
          : await getLead(id);
        if (leadData?.opportunity_id) {
          navigate(`/crm/opportunity/${leadData.sales_number || leadData.opportunity_id}`, { replace: true });
          return;
        }

        setOpportunity(leadData);
        return;
      }

      const oppData = isCanonicalRecordRoute
        ? await getOpportunityBySalesNumber(id)
        : await getOpportunity(id);
      setOpportunity(oppData);
      setEstimateOpportunity(oppData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  const loadAccounting = async (preferredJobId = null) => {
    if (!opportunity?.id || isCreation) return;
    if (!opportunity?.is_booked) {
      await loadOpportunityJobs();
      setOpportunityAccountingSummary(null);
      setAccountingJob(null);
      setAccountingSummary(null);
      setInvoiceDetailsMap({});
      setGatewayPayments([]);
      setPayrollDraft([]);
      setCrewDirectory([]);
      setInvoiceDraftsMap({});
      setSelectedAccountingJobId(null);
      return null;
    }
    setIsLoadingAccounting(true);
    let summary = null;
    try {
      const [plannedRows, activeJobsRes, opportunitySummaryRes] = await Promise.all([
        loadOpportunityJobs(),
        api.jobs.getJobs({ opportunity: opportunity.id }).catch(() => null),
        api.sales.getOpportunityAccountingSummary(opportunity.id).catch(() => null),
      ]);
      const allJobRows = Array.isArray(activeJobsRes?.results) ? activeJobsRes.results : Array.isArray(activeJobsRes) ? activeJobsRes : [];
      const activeRows = allJobRows.filter((row) => String(row?.lifecycle_stage || '').toLowerCase() === 'active');
      const accountingJobRows = Array.isArray(opportunitySummaryRes?.jobs) && opportunitySummaryRes.jobs.length
        ? opportunitySummaryRes.jobs
        : activeRows;
      if (Array.isArray(plannedRows) && plannedRows.length) {
        setOpportunityJobs(plannedRows);
      }
      setOpportunityAccountingSummary(opportunitySummaryRes || null);
      const estimateRows = Array.isArray(opportunitySummaryRes?.estimates) ? opportunitySummaryRes.estimates : [];
      const selectedEstimate = estimateRows[0] || null;
      const selectedEstimateId = selectedEstimate?.id || null;
      setSelectedAccountingEstimateId(selectedEstimateId);
      const requestedJobId = Number(preferredJobId || selectedAccountingJobId || 0) || null;
      const job = accountingJobRows.find((row) => Number(row?.id || 0) === requestedJobId) || accountingJobRows[0] || null;
      setSelectedAccountingJobId(job?.id || null);
      setAccountingJob(job);
      const paymentsRes = await api.payments.getPayments({ opportunity_id: opportunity.id }).catch(() => null);
      const asList = (res) => Array.isArray(res?.results) ? res.results : Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setGatewayPayments(asList(paymentsRes).filter(p => p.status === 'pending' || p.status === 'succeeded' || p.status === 'partially_refunded' || p.status === 'refunded'));
      if (job?.id) {
        const [summaryRes, crewRes] = await Promise.all([
          api.jobs.getJobAccountingSummary(job.id),
          api.crew.getCrewMembers({ is_active: true }),
        ]);
        summary = summaryRes;
        setAccountingSummary(summaryRes);

        const crewRows = Array.isArray(crewRes?.results) ? crewRes.results : Array.isArray(crewRes) ? crewRes : [];
        setCrewDirectory(crewRows);
        const entries = Array.isArray(summaryRes?.payroll?.entries) ? summaryRes.payroll.entries : [];
        setPayrollDraft(
          entries.map((e) => ({
            crew_member_id: Number(e.crew_member_id),
            role: e.role || '',
            hours: String(e.hours ?? ''),
            rate: String(e.rate ?? ''),
          }))
        );

        await loadAccountingJobArtifacts(job.id);
        return summaryRes;
      }
      setAccountingSummary(null);
      setPayrollDraft([]);
      setCrewDirectory([]);
      setInvoiceDetailsMap({});
      setInvoiceDraftsMap({});
      setSelectedAccountingJobId(null);
      setOpportunityAccountingSummary(opportunitySummaryRes || null);
      return null;
    } catch {
      setOpportunityJobs([]);
      setOpportunityAccountingSummary(null);
      setOpportunityJobs([]);
      setOpportunityAccountingSummary(null);
      setAccountingJob(null);
      setAccountingSummary(null);
      setInvoiceDetailsMap({});
      setGatewayPayments([]);
      return null;
    } finally {
      setIsLoadingAccounting(false);
      console.debug('[SalesDetail][Accounting]', {
        total_paid: summary?.payments?.total_paid ?? 0,
        balance_due: summary?.payments?.balance_due ?? 0,
      });
    }
  };

  const loadAccountingJobArtifacts = async (jobId) => {
    const targetJobId = Number(jobId || 0) || null;
    if (!opportunity?.id || !targetJobId) return;
    setIsLoadingInvoice(true);
    setIsLoadingInvoiceDraft(true);
    try {
      const [draftRes, invoiceRes] = await Promise.all([
        api.sales.getOpportunityInvoiceDraft(opportunity.id, null, targetJobId).catch(() => null),
        api.sales.getOpportunityInvoice(opportunity.id, null, targetJobId).catch(() => null),
      ]);
      setInvoiceDetailsMap((prev) => ({
        ...prev,
        ...(invoiceRes ? { [targetJobId]: invoiceRes } : {}),
      }));
      setInvoiceDraftsMap((prev) => ({
        ...prev,
        [targetJobId]: draftRes || { tax_rate: '0.0000', discount_amount: '0.00', line_items: [] },
      }));
    } catch (err) {
      console.warn('Failed to load invoices/drafts', err);
    } finally {
      setIsLoadingInvoice(false);
      setIsLoadingInvoiceDraft(false);
    }
  };

  const fetchOpportunityRef = useRef(fetchOpportunity);
  const loadAccountingRef = useRef(loadAccounting);
  const activitiesBootstrapKeyRef = useRef('');
  const followUpsBootstrapKeyRef = useRef('');
  const timelineBootstrapKeyRef = useRef('');

  useEffect(() => {
    fetchOpportunityRef.current = fetchOpportunity;
  }, [fetchOpportunity]);

  useEffect(() => {
    loadAccountingRef.current = loadAccounting;
  }, [loadAccounting]);

  useEffect(() => {
    if (!opportunity?.id || isCreation) return;
    if (!['Estimate', 'Accounting', 'Documents', 'Payments'].includes(activeTab)) return;
    loadOpportunityJobs();
  }, [activeTab, isCreation, loadOpportunityJobs, opportunity?.id]);

  useEffect(() => {
    if (!selectedEstimateJobId) return;
    if (!opportunity?.is_booked) {
      setSelectedAccountingJobId(null);
      return;
    }
    const selectedPlannedJob = opportunityJobs.find((job) => String(job.id) === String(selectedEstimateJobId));
    const nextAccountingId = Number(selectedPlannedJob?.source_job || selectedPlannedJob?.source_job_id || 0) || null;
    setSelectedAccountingJobId(nextAccountingId);
  }, [opportunity?.is_booked, opportunityJobs, selectedEstimateJobId]);

  useEffect(() => {
    setInvoiceDraftsMap((prev) => {
      if (!prev || !Object.keys(prev).length) return prev;
      return Object.fromEntries(
        Object.entries(prev).map(([estimateId, draft]) => {
          if (!draft) return [estimateId, draft];
          const lineItems = Array.isArray(draft?.line_items) ? draft.line_items : [];
          return [
            estimateId,
            {
              ...draft,
              grouped_sections: groupInvoiceLineItemsBySubJob(lineItems, opportunityJobs),
            },
          ];
        })
      );
    });
  }, [opportunityJobs]);

  const savePayrollDraft = async () => {
    if (!accountingJob?.id) return;
    if (!requiresAnyPermission([PERMISSIONS.SALES_VIEW_OPPORTUNITY, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to update payroll.');
    }
    if (!requiresAnyPermission([PERMISSIONS.SALES_VIEW_OPPORTUNITY, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to update payroll.');
    }
    setIsSavingPayroll(true);
    try {
      const payload = (Array.isArray(payrollDraft) ? payrollDraft : [])
        .filter((r) => Number(r.crew_member_id))
        .map((r) => ({
          crew_member_id: Number(r.crew_member_id),
          role: String(r.role || ''),
          hours: String(r.hours || '0'),
          rate: String(r.rate || '0'),
        }));
      await api.jobs.upsertJobPayrollEntries(accountingJob.id, payload);
      await loadAccounting();
    } finally {
      setIsSavingPayroll(false);
    }
  };

  const addPayrollRow = () => {
    setPayrollDraft((prev) => [...(Array.isArray(prev) ? prev : []), { crew_member_id: '', role: '', hours: '', rate: '' }]);
  };

  const removePayrollRow = (idx) => {
    setPayrollDraft((prev) => (Array.isArray(prev) ? prev.filter((_, i) => i !== idx) : []));
  };

  const updatePayrollRow = (idx, field, value) => {
    setPayrollDraft((prev) => {
      const next = [...(Array.isArray(prev) ? prev : [])];
      if (next[idx]) {
        next[idx] = { ...next[idx], [field]: value };
      }
      return next;
    });
  };

  const addCost = async () => {
    if (!accountingJob?.id) return;
    if (!requiresAnyPermission([PERMISSIONS.SALES_VIEW_OPPORTUNITY, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to add job costs.');
    }
    if (!requiresAnyPermission([PERMISSIONS.SALES_VIEW_OPPORTUNITY, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to add job costs.');
    }
    const amount = String(costDraft.amount || '').trim();
    if (!amount) return;
    setIsSavingCost(true);
    try {
      await api.jobs.createJobCost(accountingJob.id, {
        category: costDraft.category,
        amount,
        description: costDraft.description || '',
      });
      setCostDraft({ category: 'misc', amount: '', description: '' });
      await loadAccounting();
    } finally {
      setIsSavingCost(false);
    }
  };

  const finalizeInvoice = async () => {
    if (!opportunity?.id) return null;
    if (!requiresAnyPermission([PERMISSIONS.SALES_VIEW_OPPORTUNITY, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      denyAction('You do not have permission to finalize invoices.');
      return null;
    }
    if (!opportunity?.id) return null;
    if (!requiresAnyPermission([PERMISSIONS.SALES_VIEW_OPPORTUNITY, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      denyAction('You do not have permission to finalize invoices.');
      return null;
    }
    setIsFinalizingInvoice(true);
    try {
      const normalizedPayroll = (Array.isArray(payrollDraft) ? payrollDraft : []).filter((r) => Number(r.crew_member_id));
      await api.sales.finalizeOpportunityInvoice(opportunity.id, {
        estimate_id: selectedAccountingEstimateId || resolvedEstimateId || undefined,
        job_id: selectedAccountingJobId,
        confirm_no_payroll: normalizedPayroll.length === 0,
        mark_costs_reviewed: true,
        force_re_finalize: !!invoicePreviewData?.is_refinalize,
      });
      const updatedSummary = await loadAccounting();
      setRefinalizingInvoiceJobId(null);
      return updatedSummary;
    } finally {
      setIsFinalizingInvoice(false);
    }
  };

  const saveFinalizeAndSendInvoice = async () => {
    if (!accountingJob?.id) return;
    if (!hasPermission(PERMISSIONS.COMMUNICATIONS_EMAIL_SEND)) {
      return denyAction('You do not have permission to send invoice emails.');
    }
    await saveInvoiceDraft(selectedAccountingJobId);
    const updatedSummary = await finalizeInvoice();
    const selectedInvoiceJob = (updatedSummary?.jobs || opportunityAccountingSummary?.jobs || []).find(
      (row) => Number(row.id) === Number(selectedAccountingJobId)
    );
    const invoiceId = Number(selectedInvoiceJob?.invoice_id || 0) || null;
    if (invoiceId) {
      await sendInvoiceToCustomer();
    }
  };

  const openInvoiceFinalizePreview = ({ jobId, draft, action = 'finalize_and_send', isRefinalize = false }) => {
    const lineItems = Array.isArray(draft?.line_items) ? draft.line_items : [];
    let subtotal = 0;
    let taxableSubtotal = 0;
    lineItems.forEach(item => {
      const lineTotal = (Number(item.quantity) * Number(item.unit_price) || 0);
      subtotal += lineTotal;
      if (item?.taxable !== false) {
        taxableSubtotal += lineTotal;
      }
    });
    const discount = Number(draft?.discount_amount) || 0;
    const taxRate = Number(draft?.tax_rate) || 0;
    const taxableDiscount = subtotal > 0 ? Math.min(taxableSubtotal, (discount * taxableSubtotal) / subtotal) : 0;
    const taxableBase = Math.max(0, taxableSubtotal - taxableDiscount);
    const taxAmount = taxableBase * taxRate;
    const total = Math.max(0, subtotal - discount) + taxAmount;
    
    const estimateRows = Array.isArray(opportunityAccountingSummary?.estimates) ? opportunityAccountingSummary.estimates : [];
    const targetEstimateId = Number(selectedAccountingEstimateId || estimateRows[0]?.id || 0) || null;
    const selectedEstimate = estimateRows.find((row) => Number(row.id) === Number(targetEstimateId)) || estimateRows[0] || null;
    
    const paid = Number(ledgerPaidAmount || opportunityAccountingSummary?.payments?.total_paid || accountingSummary?.payments?.total_paid || 0);
    const balanceDue = total - paid;
    setSelectedAccountingEstimateId(targetEstimateId);

    setInvoicePreviewData({
      invoice_number: 'Draft (Pending Finalization)',
      is_draft: true,
      is_refinalize: isRefinalize,
      line_items: lineItems.map(item => ({
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit_price: item.unit_price,
        description: item.description,
        taxable: item.taxable,
        line_total: (Number(item.quantity) * Number(item.unit_price) || 0).toFixed(2),
        planned_sub_job_id: item.planned_sub_job_id || item.planned_sub_job || null,
        job_number: item.job_number || '',
        job_title: item.job_title || '',
        service_type_label: item.service_type_label || '',
      })),
      grouped_sections: Array.isArray(draft?.grouped_sections) ? draft.grouped_sections : [],
      subtotal,
      discount_amount: discount,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      paid,
      balance_due: balanceDue,
      manual_payments: allPayments,
      payment_details: allPayments,
      pending_payment_amount: pendingPaymentAmount,
    });
    setInvoicePreviewAction(action);
    setIsInvoicePreviewOpen(true);
  };

  const handleOpenDraftPreview = (jobId) => {
    const draft = invoiceDraftsMap[jobId] || { tax_rate: '0.0000', discount_amount: '0.00', line_items: [] };
    openInvoiceFinalizePreview({
      jobId,
      draft,
      action: 'finalize_segment',
      isRefinalize: Number(refinalizingInvoiceJobId) === Number(jobId),
    });
  };

  const handleOpenFinalizedPreview = (jobId) => {
    const invoiceDetail = invoiceDetailsMap[jobId];
    if (!invoiceDetail) return;
    
    const estimateRows = Array.isArray(opportunityAccountingSummary?.estimates) ? opportunityAccountingSummary.estimates : [];
    const targetEstimateId = Number(invoiceDetail?.estimate_id || selectedAccountingEstimateId || estimateRows[0]?.id || 0) || null;
    const selectedEstimate = estimateRows.find((row) => Number(row.id) === Number(targetEstimateId)) || estimateRows[0] || null;
    
    const liveBalanceDue = Math.max(
      Number(invoiceDetail?.total ?? invoiceDetail?.subtotal ?? 0) - Number(ledgerPaidAmount || opportunityAccountingSummary?.payments?.total_paid || accountingSummary?.payments?.total_paid || 0),
      0
    );
    setInvoicePreviewData({
      invoice_number: invoiceDetail.invoice_number || 'Finalized Invoice',
      is_draft: false,
      is_refinalize: true,
      line_items: invoiceDetail.line_items || [],
      grouped_sections: Array.isArray(invoiceDetail.grouped_sections) ? invoiceDetail.grouped_sections : [],
      subtotal: Number(invoiceDetail.subtotal || 0),
      discount_amount: Number(invoiceDetail.discount_amount || 0),
      tax_rate: Number(invoiceDetail.tax_rate || 0),
      tax_amount: Number(invoiceDetail.tax_amount || 0),
      total: Number(invoiceDetail.total || 0),
      paid: Number(ledgerPaidAmount || opportunityAccountingSummary?.payments?.total_paid || accountingSummary?.payments?.total_paid || 0),
      balance_due: liveBalanceDue,
      manual_payments: allPayments,
      payment_details: invoiceDetail.payment_details || allPayments,
      pending_payment_amount: Number(invoiceDetail.pending_payment_amount || 0),
    });
    setInvoicePreviewAction('send_finalized');
    setIsInvoicePreviewOpen(true);
    setSelectedAccountingEstimateId(targetEstimateId);
  };

  const handleRefinalizeInvoice = (jobId) => {
    const invoiceDetail = invoiceDetailsMap[jobId];
    if (!invoiceDetail) return;
    const lineItems = Array.isArray(invoiceDetail.line_items) ? invoiceDetail.line_items : [];
    const draft = {
      tax_rate: String(invoiceDetail.tax_rate ?? '0'),
      discount_amount: String(invoiceDetail.discount_amount ?? '0'),
      line_items: lineItems.map((item) => ({
        name: item.name || '',
        category: item.category || '',
        description: item.description || '',
        quantity: String(item.quantity ?? '1'),
        unit_price: String(item.unit_price ?? '0'),
        line_total: String(
          (Number(item.quantity ?? 0) * Number(item.unit_price ?? 0)).toFixed(2)
        ),
        taxable: item.taxable !== false,
      })),
    };
    setInvoiceDraftsMap((prev) => ({
      ...(prev || {}),
      [jobId]: draft,
    }));
    setSelectedAccountingJobId(jobId);
    setRefinalizingInvoiceJobId(jobId);
    const estimateRows = Array.isArray(opportunityAccountingSummary?.estimates) ? opportunityAccountingSummary.estimates : [];
    const targetEstimateId = Number(invoiceDetail?.estimate_id || selectedAccountingEstimateId || estimateRows[0]?.id || 0) || null;
    setSelectedAccountingEstimateId(targetEstimateId);
  };

  const handleOpenOpportunityInvoicePreview = async () => {
    if (!opportunity?.id) return;
    try {
      const jobs = Array.isArray(opportunityAccountingSummary?.jobs) ? opportunityAccountingSummary.jobs : [];
      const sections = jobs.map((job) => {
        const invoiceDetail = invoiceDetailsMap?.[job.id];
        const invoiceDraft = invoiceDraftsMap?.[job.id] || { line_items: [] };
        const isFinalized = !!invoiceDetail;
        const sourceItems = isFinalized
          ? (Array.isArray(invoiceDetail.line_items) ? invoiceDetail.line_items : [])
          : (Array.isArray(invoiceDraft.line_items) ? invoiceDraft.line_items : []);

        const lineItems = sourceItems.map((item) => {
          const quantity = Number(item.quantity || 0);
          const unitPrice = Number(item.unit_price || 0);
          const lineTotal = quantity * unitPrice;
          return {
            ...item,
            rate_display: isFinalized && Number.isFinite(unitPrice) ? `$${unitPrice.toFixed(2)} x ${quantity}` : '--',
            subtotal_display: isFinalized ? `$${lineTotal.toFixed(2)}` : '--',
            discount_display: '--',
            total_cost_display: isFinalized ? `$${lineTotal.toFixed(2)}` : '--',
            line_total: isFinalized ? lineTotal.toFixed(2) : '',
            taxable: item.taxable !== false,
          };
        });

        return {
          planned_sub_job_id: job.id,
          job_id: job.id,
          job_number: `${opportunity.sales_number || opportunity.id}-${job.sequence}`,
          job_title: `${job.service_type_label || job.service_type || opportunity?.service_type_name || opportunity?.service_type || 'Job'}`.replace(/_/g, ' '),
          service_type: job.service_type || opportunity?.service_type || '',
          service_type_label: String(job.service_type_label || job.service_type || opportunity?.service_type_name || opportunity?.service_type || 'Job').replace(/_/g, ' '),
          line_items: lineItems,
          subtotal: isFinalized ? Number(invoiceDetail.subtotal || 0) : 0,
          finalized: isFinalized,
        };
      });
      const previewLineItems = sections.flatMap((section) => section.line_items);
      const finalizedSubtotal = sections.reduce((sum, section) => sum + Number(section.subtotal || 0), 0);
      const totalDiscount = sections.reduce((sum, section) => {
        if (!section.finalized) return sum;
        return sum + Number(section.discount_amount || 0);
      }, 0);
      const totalTax = sections.reduce((sum, section) => {
        if (!section.finalized) return sum;
        return sum + Number(section.tax_amount || 0);
      }, 0);
      const finalizedTotal = sections.reduce((sum, section) => {
        if (!section.finalized) return sum;
        return sum + Number(section.total || section.subtotal || 0);
      }, 0);
      const totalPaid = Number(ledgerPaidAmount || opportunityAccountingSummary?.payments?.total_paid || accountingSummary?.payments?.total_paid || 0);
      const balanceDue = Math.max(0, finalizedTotal - totalPaid);
      const preview = {
        invoice_number: `OPP-${opportunity.id}-PREVIEW`,
        line_items: previewLineItems,
        grouped_sections: sections,
        subtotal: finalizedSubtotal,
        discount_amount: totalDiscount,
        tax_rate: 0,
        tax_amount: totalTax,
        total: finalizedTotal,
        paid: totalPaid,
        balance_due: balanceDue,
        manual_payments: Array.isArray(accountingSummary?.payments?.manual_payments) ? accountingSummary.payments.manual_payments : allPayments,
      };
      setInvoicePreviewData({
        invoice_number: preview?.invoice_number || `OPP-${opportunity.id}-PREVIEW`,
        is_draft: true,
        is_refinalize: false,
        line_items: Array.isArray(preview?.line_items) ? preview.line_items : [],
        grouped_sections: Array.isArray(preview?.grouped_sections) ? preview.grouped_sections : [],
        subtotal: Number(preview?.subtotal || 0),
        discount_amount: Number(preview?.discount_amount || 0),
        tax_rate: Number(preview?.tax_rate || 0),
        tax_amount: Number(preview?.tax_amount || 0),
        total: Number(preview?.total || 0),
        paid: Number(preview?.paid || 0),
        balance_due: Number(preview?.balance_due || 0),
        manual_payments: Array.isArray(preview?.manual_payments) ? preview.manual_payments : allPayments,
        payment_details: Array.isArray(preview?.payment_details) ? preview.payment_details : allPayments,
        pending_payment_amount: Number(preview?.pending_payment_amount || pendingPaymentAmount),
        estimate_id: preview?.estimate_id || resolvedEstimateId || null,
      });
      setInvoicePreviewAction('opportunity_send');
      setIsInvoicePreviewOpen(true);
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Unable to generate opportunity invoice preview.';
      setToast({ type: 'error', text: String(detail) });
    }
  };

  const handleConfirmPreviewSend = async () => {
    setIsInvoicePreviewOpen(false);
    if (invoicePreviewAction === 'finalize_and_send' || invoicePreviewAction === 'finalize_segment') {
      if (invoicePreviewData?.is_refinalize) {
        await saveInvoiceDraft(selectedAccountingJobId);
        await finalizeInvoice();
      } else {
        await saveFinalizeAndSendInvoice();
      }
    } else if (invoicePreviewAction === 'send_finalized') {
      if (!hasPermission(PERMISSIONS.COMMUNICATIONS_EMAIL_SEND)) {
        return denyAction('You do not have permission to send invoice emails.');
      }
      if (!hasPermission(PERMISSIONS.COMMUNICATIONS_EMAIL_SEND)) {
        return denyAction('You do not have permission to send invoice emails.');
      }
      await sendInvoiceToCustomer();
    } else if (invoicePreviewAction === 'opportunity_send') {
      if (!hasPermission(PERMISSIONS.COMMUNICATIONS_EMAIL_SEND)) {
        return denyAction('You do not have permission to send invoice emails.');
      }
      await sendInvoiceToCustomer();
    } else if (invoicePreviewAction === 'opportunity_preview') {
      return;
    }
  };

  const loadInvoiceDraft = async () => {
    if (!opportunity?.id || !opportunityAccountingSummary?.jobs?.length) return;
    setIsLoadingInvoiceDraft(true);
    try {
      const draftMap = {};
      const selectedJob = opportunityAccountingSummary.jobs.find((job) =>
        Number(job?.id || 0) === Number(selectedAccountingJobId || opportunityAccountingSummary.jobs?.[0]?.id || 0)
      ) || opportunityAccountingSummary.jobs[0];
      const jobsToLoad = selectedJob ? [selectedJob] : [];
      await Promise.all(jobsToLoad.map(async (job) => {
        const res = await api.sales.getOpportunityInvoiceDraft(opportunity.id, null, job.id).catch(() => null);
        draftMap[job.id] = res || { tax_rate: '0.0000', discount_amount: '0.00', line_items: [] };
      }));
      setInvoiceDraftsMap(draftMap);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Unable to load invoice drafts.';
      setToast({ type: 'error', text: String(msg) });
    } finally {
      setIsLoadingInvoiceDraft(false);
    }
  };

  const saveInvoiceDraft = async (jobId = selectedAccountingJobId) => {
    const targetJobId = Number(jobId || accountingJob?.id || 0) || null;
    if (!targetJobId) return;
    if (!requiresAnyPermission([PERMISSIONS.SALES_VIEW_OPPORTUNITY, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to save invoice drafts.');
    }
    if (!opportunity?.id) return;
    if (!requiresAnyPermission([PERMISSIONS.SALES_VIEW_OPPORTUNITY, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to save invoice drafts.');
    }
    setIsSavingInvoiceDraft(true);
    try {
      const draft = invoiceDraftsMap[targetJobId];
      await api.sales.saveOpportunityInvoiceDraft(opportunity.id, {
        estimate_id: selectedAccountingEstimateId || resolvedEstimateId || undefined,
        job_id: targetJobId,
        tax_rate: draft?.tax_rate,
        discount_amount: draft?.discount_amount,
        line_items: Array.isArray(draft?.line_items) ? draft.line_items : [],
      });
      setToast({ type: 'success', text: 'Invoice draft saved.' });
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Unable to save invoice draft.';
      setToast({ type: 'error', text: String(msg) });
    } finally {
      setIsSavingInvoiceDraft(false);
    }
  };

  const saveAllInvoiceDrafts = async () => {
    if (!opportunity?.id || !opportunityAccountingSummary?.jobs?.length) return;
    if (!requiresAnyPermission([PERMISSIONS.SALES_VIEW_OPPORTUNITY, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to save invoice drafts.');
    }
    setIsSavingInvoiceDraft(true);
    try {
      await Promise.all(
        opportunityAccountingSummary.jobs.map(job => {
          const draft = invoiceDraftsMap[job.id];
          return api.sales.saveOpportunityInvoiceDraft(opportunity.id, {
            job_id: job.id,
            tax_rate: draft?.tax_rate,
            discount_amount: draft?.discount_amount,
            line_items: Array.isArray(draft?.line_items) ? draft.line_items : [],
          });
        })
      );
      setToast({ type: 'success', text: 'All invoice drafts saved.' });
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Unable to save invoice drafts.';
      setToast({ type: 'error', text: String(msg) });
    } finally {
      setIsSavingInvoiceDraft(false);
    }
  };

  const addDraftLineItem = (jobId) => {
    setInvoiceDraftsMap(prev => {
      const draft = prev[jobId] || { tax_rate: '0.0000', discount_amount: '0.00', line_items: [] };
      const items = Array.isArray(draft.line_items) ? [...draft.line_items] : [];
      items.push({
        name: '',
        category: 'misc',
        description: '',
        quantity: '1',
        unit_price: '0.00',
        taxable: true,
        line_total: '0.00',
        source_type: 'manual',
        source_id: '',
      });
      return { ...prev, [jobId]: { ...draft, line_items: items } };
    });
  };

  const removeDraftLineItem = (jobId, idx) => {
    setInvoiceDraftsMap(prev => {
      const draft = prev[jobId];
      if (!draft) return prev;
      const items = Array.isArray(draft.line_items) ? [...draft.line_items] : [];
      items.splice(idx, 1);
      return { ...prev, [jobId]: { ...draft, line_items: items } };
    });
  };

  const updateDraftLineItem = (jobId, idx, field, value) => {
    setInvoiceDraftsMap((prev) => {
      const prevDraft = prev[jobId] || { tax_rate: '0.0000', discount_amount: '0.00', line_items: [] };
      const lineItems = [...(Array.isArray(prevDraft?.line_items) ? prevDraft.line_items : [])];
      if (lineItems[idx]) {
        lineItems[idx] = { ...lineItems[idx], [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          const qty = Number(field === 'quantity' ? value : lineItems[idx].quantity) || 0;
          const price = Number(field === 'unit_price' ? value : lineItems[idx].unit_price) || 0;
          lineItems[idx].line_total = String((qty * price).toFixed(2));
        }
      }
      return { ...prev, [jobId]: { ...prevDraft, line_items: lineItems } };
    });
  };

  const updateDraftMeta = (jobId, field, value) => {
    setInvoiceDraftsMap(prev => {
      const draft = prev[jobId] || { tax_rate: '0.0000', discount_amount: '0.00', line_items: [] };
      return { ...prev, [jobId]: { ...draft, [field]: value } };
    });
  };

  const sendInvoiceToCustomer = async () => {
    const selectedInvoiceJob = (opportunityAccountingSummary?.jobs || []).find(
      (row) => Number(row.id) === Number(selectedAccountingJobId)
    );
    const invoiceId = Number(selectedInvoiceJob?.invoice_id || 0) || null;
    if (!invoiceId) return;
    if (!hasPermission(PERMISSIONS.COMMUNICATIONS_EMAIL_SEND)) {
      return denyAction('You do not have permission to send invoices.');
    }
    if (!hasPermission(PERMISSIONS.COMMUNICATIONS_EMAIL_SEND)) {
      return denyAction('You do not have permission to send invoices.');
    }
    setIsSendingInvoice(true);
    setIsInvoicePreviewOpen(false);
    try {
      await api.sales.sendOpportunityInvoice(opportunity.id, {
        estimate_id: invoicePreviewData?.estimate_id || selectedAccountingEstimateId || resolvedEstimateId || undefined,
        job_id: selectedAccountingJobId,
        to_email: selectedInvoiceEmail || opportunity?.customer_details?.email || opportunity?.customer?.email || '',
        dispatch_via_automation: true,
      });
      await loadAccounting();
      setToast({ type: 'success', text: 'Invoice sent to customer.' });
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.to_email || 'Unable to send invoice.';
      setToast({ type: 'error', text: String(msg) });
    } finally {
      setIsSendingInvoice(false);
    }
  };

  const startEditInvoiceLine = (li) => {
    setEditingInvoiceLineItemId(li?.id || null);
    setInvoiceLineDraft({
      name: li?.name || '',
      category: li?.category || '',
      description: li?.description || '',
      quantity: String(li?.quantity ?? '1'),
      unit_price: String(li?.unit_price ?? '0'),
      taxable: li?.taxable !== false,
    });
  };

  const startAddInvoiceLine = () => {
    setEditingInvoiceLineItemId('new');
    setInvoiceLineDraft({ name: '', category: 'other', description: '', quantity: '1', unit_price: '0.00', taxable: true });
  };

  const cancelEditInvoiceLine = () => {
    setEditingInvoiceLineItemId(null);
    setInvoiceLineDraft(null);
  };

  const saveInvoiceLine = async (invoiceId, lineItemId) => {
    if (!invoiceId || !lineItemId) return;
    if (!requiresAnyPermission([PERMISSIONS.SALES_VIEW_OPPORTUNITY, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to edit invoice line items.');
    }
    setIsSavingInvoiceLine(true);
    try {
      const payload = {
        name: invoiceLineDraft?.name,
        category: invoiceLineDraft?.category,
        description: invoiceLineDraft?.description,
        quantity: invoiceLineDraft?.quantity,
        unit_price: invoiceLineDraft?.unit_price,
        taxable: !!invoiceLineDraft?.taxable,
      };
      if (lineItemId === 'new') {
        await api.sales.createOpportunityInvoiceLineItem(opportunity.id, invoiceId, payload);
      } else {
        await api.sales.updateOpportunityInvoiceLineItem(opportunity.id, invoiceId, lineItemId, payload);
      }
      await loadAccounting();
      cancelEditInvoiceLine();
    } finally {
      setIsSavingInvoiceLine(false);
    }
  };

  const deleteInvoiceLine = async (invoiceId, lineItemId) => {
    if (!invoiceId || !lineItemId) return;
    if (!requiresAnyPermission([PERMISSIONS.SALES_VIEW_OPPORTUNITY, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to delete invoice line items.');
    }
    setIsSavingInvoiceLine(true);
    try {
      await api.sales.deleteOpportunityInvoiceLineItem(opportunity.id, invoiceId, lineItemId);
      await loadAccounting();
      if (editingInvoiceLineItemId === lineItemId) cancelEditInvoiceLine();
    } finally {
      setIsSavingInvoiceLine(false);
    }
  };

  const loadDependencies = async () => {
    const fetchSafe = async (fn, setter, label) => {
      try {
        const res = await fn();
        setter(asList(res));
      } catch (err) {
        console.warn(`Failed to load ${label}:`, err);
        setter([]);
      }
    };

    await Promise.allSettled([
      // Branches and users are now fetched on demand via AsyncSelect pagination
      fetchSafe(getReferralSourceLookups, setReferralSources, 'referral sources'),
    ]);
  };

  const loadCommunicationTemplates = async (branchId = null, channel = null) => {
    setIsLoadingCommTemplates(true);
    try {
      const numericBranchId = Number(String(branchId || '').match(/^\s*(\d+)\s*$/)?.[1] || branchId || 0);
      const safeBranchId = Number.isFinite(numericBranchId) && numericBranchId > 0 ? numericBranchId : null;
      const params = { compact: 1, limit: 500 };
      if (channel) params.channel = channel;
      if (safeBranchId) params.branch = safeBranchId;
      const normalizeRows = (rows, fallbackChannel) => asList(rows).map((row) => ({
        ...row,
        channel: String(row?.channel || fallbackChannel || '').toLowerCase(),
        is_active: row?.is_active ?? row?.status ?? true,
      }));
      const fetchAllTemplatePages = async (requestParams, fallbackChannel) => {
        const allRows = [];
        let page = 1;
        let safety = 0;
        while (page && safety < 50) {
          const response = await getCommunicationTemplates({ ...requestParams, page });
          allRows.push(...normalizeRows(response, fallbackChannel));
          const nextPage = getNextPageNumber(response);
          if (!nextPage || nextPage === page) break;
          page = nextPage;
          safety += 1;
        }
        return allRows;
      };
      const [branchResponse, globalResponse, categoriesRes] = await Promise.all([
        safeBranchId ? fetchAllTemplatePages({ ...params, branch: safeBranchId }, channel) : Promise.resolve([]),
        fetchAllTemplatePages(params, channel),
        getCommunicationTemplateCategories(safeBranchId ? { branch: safeBranchId } : params).catch(err => {
          console.warn('Failed to load categories:', err);
          return [];
        })
      ]);
      const templates = [
        ...normalizeRows(branchResponse, channel),
        ...normalizeRows(globalResponse, channel),
      ];
      const seen = new Set();
      const uniqueTemplates = templates.filter((template) => {
        const templateKey = String(template?.template_key || '').trim();
        if (template?.is_default || templateKey.startsWith('automation_notification__')) {
          return false;
        }
        if (channel && String(template?.channel || '').toLowerCase() !== String(channel).toLowerCase()) {
          return false;
        }
        const key = [
          String(template?.id || ''),
          templateKey || String(template?.name || ''),
          String(template?.channel || ''),
          String(template?.branch || template?.branch_id || ''),
        ].join('::');
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setCommCategories(asList(categoriesRes));
      setCommTemplates(uniqueTemplates);
    } catch (err) {
      console.error('Failed to load communication templates:', err);
      setCommTemplates([]);
      setCommCategories([]);
    } finally {
      setIsLoadingCommTemplates(false);
    }
  };

  const templateBranchId = useMemo(() => {
    const candidate =
      opportunity?.branch_id ??
      opportunity?.branch?.id ??
      opportunity?.branch_details?.id ??
      opportunity?.branch ??
      form.branch ??
      null;
    const match = String(candidate || '').match(/^\s*(\d+)\s*$/);
    const resolved = match ? Number(match[1]) : Number(candidate);
    return Number.isFinite(resolved) && resolved > 0 ? resolved : null;
  }, [form.branch, opportunity?.branch, opportunity?.branch_details?.id, opportunity?.branch_id]);

  const statusBranchId = useMemo(() => {
    const candidate =
      (isSpecsEditing && specsDraft ? specsDraft.branch : null) ??
      form.branch ??
      opportunity?.branch_id ??
      opportunity?.branch?.id ??
      opportunity?.branch_details?.id ??
      opportunity?.branch ??
      null;
    const match = String(candidate || '').match(/^\s*(\d+)\s*$/);
    const resolved = match ? Number(match[1]) : Number(candidate);
    return Number.isFinite(resolved) && resolved > 0 ? resolved : null;
  }, [form.branch, isSpecsEditing, opportunity?.branch, opportunity?.branch_details?.id, opportunity?.branch_id, specsDraft?.branch]);

  useEffect(() => {
    let cancelled = false;
    const loadBranchStatuses = async () => {
      const cacheKey = `status:${String(statusBranchId || 'global')}`;
      const now = Date.now();
      const lastRun = detailBootstrapCache.get(cacheKey) || 0;
      if (now - lastRun < DETAIL_BOOTSTRAP_TTL_MS) return;
      detailBootstrapCache.set(cacheKey, now);
      try {
        const res = await getStatusCodeLookupsPage('', 0, 100);
        if (cancelled) return;
        const rows = asList(res);
        setCustomStatusCodes(rows);
      } catch (err) {
        console.warn('Failed to load branch status codes:', err);
        if (!cancelled) setCustomStatusCodes([]);
      }
    };
    loadBranchStatuses();
    return () => {
      cancelled = true;
    };
  }, [statusBranchId]);

  useEffect(() => {
    let cancelled = false;
    const loadBranchTypes = async () => {
      const cacheKey = `types:${String(statusBranchId || 'global')}`;
      const now = Date.now();
      const lastRun = detailBootstrapCache.get(cacheKey) || 0;
      if (now - lastRun < DETAIL_BOOTSTRAP_TTL_MS) return;
      detailBootstrapCache.set(cacheKey, now);
      try {
        const params = statusBranchId ? { branch: statusBranchId } : {};
        const [moverTypesRes, servicesRes] = await Promise.allSettled([
          getMoveTypeLookups(params),
          getServices(params)
        ]);
        if (cancelled) return;
        
        if (moverTypesRes.status === 'fulfilled') {
          setMoverTypes(asList(moverTypesRes.value));
        } else {
          setMoverTypes([]);
        }
        
        if (servicesRes.status === 'fulfilled') {
          setServiceTypes(asList(servicesRes.value));
        } else {
          setServiceTypes([]);
        }
      } catch (err) {
        console.warn('Failed to load branch types:', err);
      }
    };
    loadBranchTypes();
    return () => {
      cancelled = true;
    };
  }, [statusBranchId]);

  useEffect(() => {
    let cancelled = false;
    const loadOpportunityLossReasons = async () => {
      const cacheKey = 'loss-reasons';
      const now = Date.now();
      const lastRun = detailBootstrapCache.get(cacheKey) || 0;
      if (now - lastRun < DETAIL_BOOTSTRAP_TTL_MS) return;
      detailBootstrapCache.set(cacheKey, now);
      try {
        const response = await getOpportunityLossReasonLookups({ limit: 100 });
        if (cancelled) return;
        const rows = asList(response);
        setLostReasonOptions(rows);
      } catch (err) {
        console.warn('Failed to load opportunity loss reasons:', err);
        try {
          const fallback = await getOpportunityLossReasonLookupsPage('', 0, 100);
          if (cancelled) return;
          setLostReasonOptions(asList(fallback));
        } catch (fallbackErr) {
          console.warn('Fallback opportunity loss reason lookup failed:', fallbackErr);
          if (!cancelled) setLostReasonOptions([]);
        }
      }
    };
    loadOpportunityLossReasons();
    return () => {
      cancelled = true;
    };
  }, []);


  const loadEmailProviderStatus = async () => {
    try {
      const [sendgridRows, resendRows, smtpRows] = await Promise.all([
        getSendGridConfig(),
        getResendConfig(),
	        getSMTPConfig(),
	      ]);
	      const hasProvider =
	        asList(sendgridRows).some((row) => Boolean(row?.is_active)) ||
	        asList(resendRows).some((row) => Boolean(row?.is_active)) ||
	        asList(smtpRows).some((row) => Boolean(row?.is_active));
	      setHasActiveEmailProvider(hasProvider);
	    } catch {
      setHasActiveEmailProvider(false);
    }
  };

  const loadFollowUps = async (targetEntity) => {
	    if (!targetEntity || targetEntity?.id === 'new') {
	      setFollowUps([]);
	      return;
	    }
	    setIsLoadingFollowUps(true);
	    try {
	      const params = { ordering: '-due_date' };
	      if (isLeadPath) {
	        if (targetEntity?.opportunity_id) params.opportunity = targetEntity.opportunity_id;
	        else params.lead = targetEntity.id;
	      } else {
	        params.opportunity = targetEntity.id;
	      }
	      const rows = asList(await getTasks(params));
	      setFollowUps(rows);
	    } catch {
	      setFollowUps([]);
	    } finally {
	      setIsLoadingFollowUps(false);
	    }
	  };

  const loadActivitiesPage = useCallback(async ({ leadId = null, opportunityId = null, offset = 0, replace = false }) => {
    const rows = await getSalesActivities({ ...(leadId ? { lead: leadId } : { opportunity: opportunityId }), ordering: '-created_at', limit: ACTIVITY_FETCH_LIMIT, offset }).catch(() => []);
    const activityRows = dedupeActivityRows(asList(rows).map((row) => ({ ...row, timeline_source: leadId ? 'lead' : 'opportunity' })));

    if (replace) {
      setActivities(dedupeActivityRows(activityRows));
    } else if (activityRows.length) {
      setActivities((prev) =>
        dedupeActivityRows(mergeTimelineActivities({ opportunityActivities: [...prev, ...activityRows], leadActivities: [] }))
      );
    } else {
      setHasMoreActivities(false);
    }
  }, []);

  const refreshActivityTimeline = useCallback(async () => {
    if (!opportunity || opportunity.id === 'new') return;

    const leadId = isLeadPath ? Number(opportunity?.id || 0) || null : null;
    const opportunityId = isLeadPath ? null : Number(opportunity?.id || 0) || null;

    await Promise.all([
      loadActivitiesPage({ leadId, opportunityId, offset: 0, replace: true }),
      fetchUnifiedTimeline({ leadId, opportunityId }),
    ]);
  }, [fetchUnifiedTimeline, isLeadPath, loadActivitiesPage, opportunity]);

  useEffect(() => {
    if (!isEstimateMenuOpen) return;

    const onDocClick = (event) => {
      if (!estimateMenuRef.current) return;
      if (estimateMenuRef.current.contains(event.target)) return;
      setIsEstimateMenuOpen(false);
    };

    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [isEstimateMenuOpen]);

  useEffect(() => {
    const run = async () => {
      const cacheKey = [
        id,
        isCanonicalRecordRoute ? 'canonical' : 'direct',
        isLeadPath ? 'lead' : 'opportunity',
      ].join(':');
      const now = Date.now();
      const lastRun = detailBootstrapCache.get(cacheKey) || 0;
      if (now - lastRun < DETAIL_BOOTSTRAP_TTL_MS) return;
      detailBootstrapCache.set(cacheKey, now);
      setIsLoading(true);
      try {
        setTimeout(() => {
          void loadDependencies();
        }, 0);
        await fetchOpportunity();
      } catch (err) {
        console.error('Failed to load sales detail page:', err);
        setOpportunity(null);
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [id, isCanonicalRecordRoute, isLeadPath]);

  useEffect(() => {
    if (activeTab !== "Sales") return;
    if (!["email", "text"].includes(String(commTab || "").toLowerCase())) return;

    const branchId = String(templateBranchId || '');
    const channel = String(commTab || '').toLowerCase() === 'text' ? 'sms' : 'email';
    const templateScopeKey = `${branchId || 'global'}:${channel}`;
    if (commTemplatesLoadedRef.current !== templateScopeKey) {
      commTemplatesLoadedRef.current = templateScopeKey;
      loadCommunicationTemplates(branchId || null, channel);
    }
    if (!emailProviderLoadedRef.current) {
      emailProviderLoadedRef.current = true;
      loadEmailProviderStatus();
    }
  }, [activeTab, commTab, templateBranchId]);

  // Removed 15s interval polling and focus/visibility refetches to fix duplicate API calls.

  useEffect(() => {
    if (activeTab !== 'Accounting') return;
    loadAccounting();
  }, [activeTab, opportunity?.id, isCreation]);

  const selectAccountingJob = async (jobId) => {
    setSelectedAccountingJobId(jobId || null);
    if (activeTab === 'Accounting') {
      await loadAccountingJobArtifacts(jobId || null);
    }
  };

  const createSubJobFromServiceType = async (serviceType) => {
    if (!opportunity?.id) return;
    if (!requiresAnyPermission([PERMISSIONS.SALES_VIEW_OPPORTUNITY, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to manage sub-jobs.');
    }
    const originalServiceType = String(serviceType || '').trim();
    const serviceOption = computedSubJobServiceOptions.find((option) => option.value === originalServiceType || option.value === originalServiceType.toLowerCase());
    const normalizedTitle = serviceOption?.label || (originalServiceType ? (originalServiceType.charAt(0).toUpperCase() + originalServiceType.slice(1)) : 'Other');
    
    // service_type must be a PK (integer) or null. If it's a string like 'other', send null.
    const numericServiceTypeId = /^\d+$/.test(originalServiceType) ? Number(originalServiceType) : null;
    
    setIsSavingSubJob(true);
    try {
      const created = await api.sales.createOpportunityPlannedSubJob(opportunity.id, {
        title: normalizedTitle,
        service_type: numericServiceTypeId,
        customer_visible: true,
      });
      const createdId = created?.id ? String(created.id) : '';
      await loadOpportunityJobs();
      setSelectedEstimateJobId(createdId);
      setToast({ type: 'success', text: `${normalizedTitle} planned service created.` });
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.response?.data?.title || err?.response?.data?.opportunity_id || 'Unable to create sub-job.';
      setToast({ type: 'error', text: String(detail) });
    } finally {
      setIsSavingSubJob(false);
    }
  };

  const updateSelectedEstimateJobPlanning = async (patch) => {
    const target = opportunityJobs.find((job) => String(job.id) === String(selectedEstimateJobId));
    if (!target?.id) return;
    if (!requiresAnyPermission([PERMISSIONS.SALES_VIEW_OPPORTUNITY, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to manage sub-jobs.');
    }
    const payload = {};
    if (Object.prototype.hasOwnProperty.call(patch, 'service_type')) payload.service_type = patch.service_type || 'other';
    if (Object.prototype.hasOwnProperty.call(patch, 'move_date')) payload.move_date = patch.move_date || null;
    if (Object.prototype.hasOwnProperty.call(patch, 'arrival_window_start')) payload.arrival_window_start = patch.arrival_window_start || null;
    if (Object.prototype.hasOwnProperty.call(patch, 'arrival_window_end')) payload.arrival_window_end = patch.arrival_window_end || null;
    try {
      const updated = await api.sales.updateOpportunityPlannedSubJob(opportunity.id, target.id, payload);
      setOpportunityJobs((prev) => prev.map((job) => (Number(job.id) === Number(target.id) ? { ...job, ...updated } : job)));
      if (activeTab === 'Accounting' && Number(selectedAccountingJobId || 0) === Number(target.id)) {
        setAccountingJob((prev) => (prev?.id === target.id ? { ...prev, ...updated } : prev));
      }
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Unable to update job planning.';
      setToast({ type: 'error', text: String(detail) });
    }
  };

  const removeSubJob = async (job) => {
    if (!job?.id) return;
    if (!requiresAnyPermission([PERMISSIONS.SALES_VIEW_OPPORTUNITY, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to delete sub-jobs.');
    }
    const confirmed = window.confirm(`Delete sub-job "${job.title || job.service_type || `#${job.id}`}"?`);
    if (!confirmed) return;
    try {
      await api.sales.deleteOpportunityPlannedSubJob(opportunity.id, job.id);
      if (String(selectedEstimateJobId || '') === String(job.id)) {
        setSelectedEstimateJobId('');
      }
      await loadOpportunityJobs();
      setToast({ type: 'success', text: 'Sub-job deleted.' });
    } catch (err) {
      const detail = err?.response?.data?.detail || 'Unable to delete sub-job.';
      setToast({ type: 'error', text: String(detail) });
    }
  };

  const deleteSelectedEstimateJob = async (jobId) => {
    const target = opportunityJobs.find((job) => String(job.id) === String(jobId));
    if (!target) return;
    await removeSubJob(target);
  };



  useEffect(() => {
    if (activeTab !== 'Sales' || !opportunity || opportunity.id === 'new') return;
    const nextActivitiesKey = [
      activeTab,
      isLeadPath ? 'lead' : 'opportunity',
      opportunity?.id || '',
      opportunity?.lead || '',
      opportunity?.opportunity_id || opportunity?.opportunity || '',
    ].join(':');
    if (activitiesBootstrapKeyRef.current === nextActivitiesKey) return;
    activitiesBootstrapKeyRef.current = nextActivitiesKey;
    setActivityOffset(0);
    setHasMoreActivities(true);
    setActivities([]);

    const leadId = isLeadPath ? Number(opportunity?.id || 0) || null : null;
    const opportunityId = isLeadPath ? null : Number(opportunity?.id || 0) || null;

    void loadActivitiesPage({ leadId, opportunityId, offset: 0, replace: true });
  }, [activeTab, isLeadPath, loadActivitiesPage, opportunity?.id, opportunity?.lead, opportunity?.opportunity_id, opportunity?.opportunity]);

  useEffect(() => {
    if (activeTab !== 'Sales' || !opportunity || opportunity.id === 'new') return;
    const nextFollowUpsKey = [
      activeTab,
      isLeadPath ? 'lead' : 'opportunity',
      opportunity?.id || '',
      opportunity?.lead || '',
      opportunity?.opportunity_id || opportunity?.opportunity || '',
    ].join(':');
    if (followUpsBootstrapKeyRef.current === nextFollowUpsKey) return;
    followUpsBootstrapKeyRef.current = nextFollowUpsKey;
    void loadFollowUps(opportunity);
  }, [activeTab, isLeadPath, opportunity, opportunity?.id, opportunity?.lead, opportunity?.opportunity_id, opportunity?.opportunity]);

  useEffect(() => {
    if (!['Sales', 'Estimate', 'Documents', 'Payments'].includes(activeTab)) return;
    if (!opportunity || opportunity?.id === 'new') return;
    loadEstimateContext(opportunity);
  }, [activeTab, opportunity, loadEstimateContext]);

  useEffect(() => {
    const nextTab = resolveDetailTab({
      tabSegment: tabId,
      stateTab: location.state?.activeTab,
      search: location.search,
      fallback: DEFAULT_DETAIL_TAB,
    });
    setActiveTab((current) => (current === nextTab ? current : nextTab));

    if (location.state?.activeTab) {
      window.history.replaceState({}, document.title, location.pathname + location.search);
    }
  }, [location.pathname, location.search, location.state, tabId]);

  useEffect(() => {
    if (!['Estimate', 'Documents', 'Payments'].includes(activeTab)) return;
    if (activeTab === 'Documents') {
      setEstimateInitialSubTab('documents');
    } else if (activeTab === 'Payments') {
      setEstimateInitialSubTab('payments');
    } else {
      setEstimateInitialSubTab(getEstimateTabFromSegment(estimateTabId) || DEFAULT_ESTIMATE_TAB);
    }
  }, [activeTab, estimateTabId]);

  useEffect(() => {
    if (isAdditionalContactsModalOpen) return;

    if (isLeadPath || (!opportunity?.customer_details?.id && !opportunity?.customer)) {
      setAdditionalContactError('');
      setAdditionalContactForms([]);
      setSelectedAdditionalContactIndex(0);
      return;
    }

    setAdditionalContactForms(mapCustomerContactsToDrafts(opportunity?.customer_details));
    setAdditionalContactError('');
    setSelectedAdditionalContactIndex(0);
  }, [opportunity, isLeadPath, isAdditionalContactsModalOpen]);

  useEffect(() => {
    if (isLeadPath || !opportunity || opportunity.id === 'new') return;
    const defaultAssigned = opportunity.assigned_user ? String(opportunity.assigned_user) : '';
    setFollowUpAssignedTo((prev) => prev || defaultAssigned);
  }, [isLeadPath, opportunity]);

  const filteredActivities = useMemo(() => {
    const normalizeThreadSubject = (value) => {
      let text = String(value || '').trim().toLowerCase();
      if (!text) return '';
      let next = text;
      do {
        text = next;
        next = next.replace(/^(re:|fw:|fwd:)\s*/i, '');
      } while (next !== text);
      return next.replace(/\s+/g, ' ').trim();
    };

    const buildEmailThreadKey = (activity) => {
      if (activity?.inbound_message_id) {
        return `inbound:${String(activity.inbound_message_id)}`;
      }
      const subject = normalizeThreadSubject(
        activity?.subject || activity?.email_log_details?.subject || activity?.payload?.subject || ''
      );
      const fromEmail = String(
        activity?.payload?.from_email ||
        activity?.email_log_details?.from_email ||
        activity?.from_email ||
        ''
      ).trim().toLowerCase();
      const toEmail = String(
        activity?.email_log_details?.to_email ||
        activity?.payload?.to_emails?.[0] ||
        activity?.to_email ||
        ''
      ).trim().toLowerCase();
      const direction = activity?.inbound_message_id ? 'inbound' : 'outbound';
      const anchor = direction === 'inbound' ? fromEmail : toEmail;
      return [subject || 'untitled', anchor || 'unknown', direction].join('|');
    };

    const warningActivities = (timelineEvents || [])
      .filter((evt) => String(evt?.event_type || '').toLowerCase() === 'system.note')
      .filter((evt) => String(evt?.payload?.note_type || '') === 'inbound_lead_normalization')
      .map((evt) => ({
        id: `warning-${evt.id}`,
        timeline_source: 'lead_normalization_warning',
        activity_type: 'warning',
        created_at: evt.created_at,
        subject: evt.title || 'Lead normalization warning',
        description: getTimelineSystemNoteText(evt) || '',
        content: getTimelineSystemNoteText(evt) || '',
        summary: getTimelineSystemNoteText(evt) || '',
        payload: evt.payload || {},
        user_details: evt.actor ? { first_name: evt.actor.first_name, last_name: evt.actor.last_name, email: evt.actor.email } : { email: 'System' },
        is_pinned: Boolean(evt.pinned),
        pinned_at: evt.pinned_at,
      }));

    const inboundSmsActivities = (timelineEvents || [])
      .filter((evt) => {
        const source = String(evt?.source || '').toLowerCase();
        const payload = evt?.payload || {};
        return (
          source === 'telnyx_inbound_sms' ||
          source.startsWith('inbound_sms') ||
          Boolean(payload?.inbound_sms_id) ||
          Boolean(payload?.inbound_message_id)
        );
      })
      .map((evt) => ({
        id: `inbound-sms-${evt.id}`,
        timeline_source: 'telnyx_inbound_sms',
        activity_type: 'sms',
        type: 'sms',
        created_at: evt.created_at,
        subject: evt.title || 'Inbound SMS received',
        description: evt.summary || evt.payload?.text || evt.payload?.message || '',
        content: evt.summary || evt.payload?.text || evt.payload?.message || '',
        summary: evt.summary || evt.payload?.text || evt.payload?.message || '',
        payload: evt.payload || {},
        source: evt.source || 'telnyx_inbound_sms',
        inbound_sms_id: evt.payload?.inbound_sms_id || null,
        provider_message_id: evt.payload?.provider_message_id || '',
        sms_log_details: {
          to_phone: evt.payload?.to_phone || '',
          message: evt.payload?.text || evt.payload?.message || evt.summary || '',
          status: 'received',
        },
        user_details: evt.actor ? { first_name: evt.actor.first_name, last_name: evt.actor.last_name, email: evt.actor.email } : { email: 'Inbound' },
        is_pinned: Boolean(evt.pinned),
        pinned_at: evt.pinned_at,
      }));

    const emailActivities = [...(activities || [])]
      .filter((item) => String(item?.activity_type || '').toLowerCase() === 'email')
      .map((item) => ({ ...item, email_thread_key: buildEmailThreadKey(item) }));
    const nonEmailActivities = [...(activities || []), ...warningActivities, ...inboundSmsActivities]
      .filter((item) => String(item?.activity_type || '').toLowerCase() !== 'email');

    const emailGroups = new Map();
    for (const item of emailActivities) {
      const key = item.email_thread_key || `thread-${item.id}`;
      if (!emailGroups.has(key)) {
        emailGroups.set(key, []);
      }
      emailGroups.get(key).push(item);
    }

    const collapsedEmailThreads = Array.from(emailGroups.entries()).map(([key, items]) => {
      const sortedItems = [...items].sort(
        (a, b) => new Date(a?.created_at || 0).getTime() - new Date(b?.created_at || 0).getTime()
      );
      const latest = sortedItems[sortedItems.length - 1];
      return {
        ...latest,
        id: `thread-${key}`,
        thread_key: key,
        thread_messages: sortedItems,
        thread_count: sortedItems.length,
        thread_created_at: latest?.created_at || sortedItems[0]?.created_at || null,
      };
    });

    const merged = [
      ...nonEmailActivities,
      ...collapsedEmailThreads,
    ].sort((a, b) => new Date(b?.created_at || b?.thread_created_at || 0).getTime() - new Date(a?.created_at || a?.thread_created_at || 0).getTime());

    if (activityFilter === 'all') return merged;
    return merged.filter((a) => getActivityLogKind(a) === activityFilter);
  }, [activities, activityFilter, timelineEvents]);

  const visibleActivities = useMemo(() => {
    return Array.isArray(filteredActivities) ? filteredActivities : [];
  }, [activities, filteredActivities]);

  const pinnedActivities = useMemo(() => {
    const pinned = visibleActivities.filter((a) => Boolean(a?.is_pinned));
    return pinned.sort((a, b) => {
      const ap = new Date(a?.pinned_at || 0).getTime();
      const bp = new Date(b?.pinned_at || 0).getTime();
      if (bp !== ap) return bp - ap;
      return new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime();
    });
  }, [visibleActivities]);

  const unpinnedActivities = useMemo(
    () => visibleActivities.filter((a) => !a?.is_pinned),
    [visibleActivities]
  );

  const orderedActivities = useMemo(
    () => [...pinnedActivities, ...unpinnedActivities],
    [pinnedActivities, unpinnedActivities]
  );
  const drawerTimelineEvents = useMemo(
    () => dedupeTimelineEvents(timelineEvents || []),
    [timelineEvents]
  );

  const handleLoadMore = useCallback(async () => {
    if (!hasMoreActivities && !hasMoreTimeline) return;
    if (isLoadingMoreActivities || isLoadingMoreTimeline) return;
    if (!opportunity) return;

    if (hasMoreActivities) {
      setIsLoadingMoreActivities(true);
      try {
        const nextOffset = activityOffset + ACTIVITY_FETCH_LIMIT;
        let fetchedAny = false;
        const params = isLeadPath ? { lead: opportunity?.id } : { opportunity: opportunity?.id };
        const rows = dedupeActivityRows(asList(await getSalesActivities({ ...params, ordering: '-created_at', limit: ACTIVITY_FETCH_LIMIT, offset: nextOffset }).catch(() => [])));
        if (rows.length) {
          fetchedAny = true;
          setActivities(prev => mergeTimelineActivities({
            opportunityActivities: dedupeActivityRows([...prev, ...rows.map((row) => ({ ...row, timeline_source: isLeadPath ? 'lead' : 'opportunity' }))]),
            leadActivities: []
          }));
        }
        if (!fetchedAny) setHasMoreActivities(false);
        else setActivityOffset(nextOffset);
      } catch(err) {
        console.warn(err);
      } finally {
        setIsLoadingMoreActivities(false);
      }
      return;
    }

    if (hasMoreTimeline) {
      setIsLoadingMoreTimeline(true);
      try {
        const leadId = isLeadPath ? Number(opportunity?.id || 0) || null : Number(opportunity?.lead || 0) || null;
        const opportunityId = isLeadPath
          ? Number(opportunity?.opportunity_id || opportunity?.opportunity || 0) || null
          : Number(opportunity?.id || 0) || null;

        const nextOffset = timelineOffset + TIMELINE_FETCH_LIMIT;
        const requests = [];
        if (leadId) requests.push(getTimelineEvents({ entity_type: 'lead', entity_id: leadId, limit: TIMELINE_FETCH_LIMIT, offset: nextOffset }));
        if (opportunityId) requests.push(getTimelineEvents({ entity_type: 'opportunity', entity_id: opportunityId, limit: TIMELINE_FETCH_LIMIT, offset: nextOffset }));

        if (requests.length) {
          const results = await Promise.allSettled(requests);
          const all = results.flatMap((r) => {
            if (r.status !== 'fulfilled') return [];
            return asList(r.value?.data || r.value);
          });
          if (all.length === 0) {
            setHasMoreTimeline(false);
          } else {
            setTimelineEvents(prev => dedupeInboundTimelineEvents([...prev, ...all]).sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime()));
            setTimelineOffset(nextOffset);
          }
        } else {
          setHasMoreTimeline(false);
        }
      } catch (err) {
        console.warn(err);
      } finally {
        setIsLoadingMoreTimeline(false);
      }
    }
  }, [
    isLoadingMoreActivities,
    isLoadingMoreTimeline,
    hasMoreActivities,
    hasMoreTimeline,
    activityOffset,
    timelineOffset,
    isLeadPath,
    opportunity
  ]);


  const toggleActivityPin = async (act) => {
    if (!act?.id) return;
    if (!canManageActivityHistory()) {
      return denyAction('You do not have permission to edit activities.');
    }
    const nextPinned = !act.is_pinned;
    const targetId = String(act.id).startsWith('thread-') ? (act.thread_messages?.[act.thread_messages.length - 1]?.id || act.id) : act.id;
    const matchesActivity = (row) => String(row?.id) === String(targetId);

    setActivities((prev) =>
      (prev || []).map((row) =>
        !matchesActivity(row)
          ? row
          : { ...row, is_pinned: nextPinned, pinned_at: nextPinned ? new Date().toISOString() : null }
      )
    );

    try {
      const applyPinToSalesActivity = async () => {
        const res = await updateSalesActivity(targetId, { is_pinned: nextPinned });
        return res?.data || res || null;
      };

      const updated = await applyPinToSalesActivity();
      if (updated) {
        setActivities((prev) =>
          (prev || []).map((row) =>
            !matchesActivity(row) ? row : { ...row, ...updated }
          )
        );
      }
    } catch (err) {
      setActivities((prev) =>
        (prev || []).map((row) =>
          !matchesActivity(row)
            ? row
            : { ...row, is_pinned: Boolean(act.is_pinned), pinned_at: act.pinned_at || null }
        )
      );
      setToast({ type: 'error', text: getErrorMessage(err, 'Failed to update pin.') });
    }
  };

  const startEditingNoteActivity = useCallback((activity) => {
    if (!activity) return;
    const type = String(activity?.activity_type || activity?.type || 'note').toLowerCase();
    if (type !== 'note') return;
    setCommTab('note');
    setActivitySubject(String(activity?.subject || ''));
    setActivityBodies((prev) => ({
      ...prev,
      note: String(activity?.description || activity?.content || ''),
    }));
    setEditingActivity(activity);
  }, []);

  const cancelEditingNoteActivity = useCallback(() => {
    setEditingActivity(null);
    setActivitySubject('');
    setActivityBodies((prev) => ({ ...prev, note: '' }));
  }, []);

  const CALL_DISPOSITION_OPTIONS = [
    { value: 'no_answer', label: 'No Answer' },
    { value: 'busy', label: 'Busy' },
    { value: 'wrong_number', label: 'Wrong Number' },
    { value: 'left_live_message', label: 'Left live message' },
    { value: 'left_voicemail', label: 'Left voicemail' },
    { value: 'connected', label: 'Connected' },
    { value: 'number_disconnected', label: 'Number disconnected' },
  ];

  const openEditCallLog = useCallback((activity) => {
    const callLog = activity?.call_log_details || null;
    if (!callLog) return;
    const durationSeconds = Number(callLog.duration_seconds || 0);
    const existingDescription = String(activity?.description || activity?.content || '').trim();
    const existingNoteBody = existingDescription.includes('\n\n')
      ? existingDescription.split(/\n\n+/).slice(1).join('\n\n').trim()
      : existingDescription;
    setEditingCallLog(activity);
    setCallLogDraft({
      duration_minutes: String(Math.max(0, durationSeconds / 60)),
      direction: String(activity?.direction || callDirection || 'outbound'),
      disposition: String(callLog.disposition || callDisposition || 'connected'),
      notes: existingNoteBody,
    });
    setCallLogModalOpen(true);
  }, [callDisposition, callDirection]);

  const closeCallLogModal = useCallback(() => {
    setCallLogModalOpen(false);
    setEditingCallLog(null);
    setCallLogDraft({
      duration_minutes: '0',
      direction: 'outbound',
      disposition: 'connected',
      notes: '',
    });
  }, []);

  const saveCallLogEdits = useCallback(async () => {
    if (!canManageActivityHistory()) {
      return denyAction('You do not have permission to edit call logs.');
    }
    const activity = editingCallLog;
    const callLog = activity?.call_log_details;
    const callLogId = Number(callLog?.id || 0);
    if (!callLogId) return;
    const durationMinutes = Math.max(0, Number(callLogDraft.duration_minutes || 0) || 0);
    const durationSeconds = Math.round(durationMinutes * 60);
    const structuredSummary = [
      `Disposition: ${callLogDraft.disposition}`,
      `Direction: ${callLogDraft.direction}`,
      durationSeconds ? `Duration: ${Math.round(durationSeconds / 60)}m` : '',
    ]
      .filter(Boolean)
      .join(' | ');
    const structuredDescription = callLogDraft.notes.trim()
      ? `${structuredSummary}\n\n${callLogDraft.notes.trim()}`
      : structuredSummary;
    setIsPosting(true);
    try {
      await api.patch(`/sales/call-logs/${callLogId}/`, {
        duration_seconds: durationSeconds,
        disposition: callLogDraft.disposition,
      });
      await updateSalesActivity(activity.id, {
        direction: callLogDraft.direction,
        description: structuredDescription,
      });
      await fetchOpportunity();
      setToast({ type: 'success', text: 'Call log updated.' });
      closeCallLogModal();
    } catch (err) {
      setToast({ type: 'error', text: getErrorMessage(err, 'Failed to update call log.') });
    } finally {
      setIsPosting(false);
    }
  }, [callLogDraft.disposition, callLogDraft.duration_minutes, callLogDraft.direction, callLogDraft.notes, closeCallLogModal, editingCallLog, fetchOpportunity, setToast]);

  const deleteCallLog = useCallback(async (activity) => {
    if (!canManageActivityHistory()) {
      return denyAction('You do not have permission to delete call logs.');
    }
    const callLogId = Number(activity?.call_log_details?.id || 0);
    if (!callLogId) return;
    const label = String(activity?.subject || activity?.description || 'this call').trim();
    if (!window.confirm(`Delete "${label}"? This will remove the call log.`)) return;
    setIsPosting(true);
    try {
      await api.delete(`/sales/call-logs/${callLogId}/`);
      await fetchOpportunity();
      setToast({ type: 'success', text: 'Call log deleted.' });
    } catch (err) {
      setToast({ type: 'error', text: getErrorMessage(err, 'Failed to delete call log.') });
    } finally {
      setIsPosting(false);
    }
  }, [fetchOpportunity, setToast]);

  const getActivityKey = (act) => `${String(act?.timeline_source || 'opportunity')}-${String(act?.id || '')}`;
  const isActivityExpanded = (act) => expandedActivityKeys.has(getActivityKey(act));
  const toggleActivityExpanded = (act) => {
    const key = getActivityKey(act);
    setExpandedActivityKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleRingCentralCall = async (phone) => {
    const value = String(phone || '').trim();
    if (!value) return;
    setCommTab('call');
    setShowRingCentral(true);

    const postCallMessage = () => {
      const frame = typeof document !== 'undefined' ? document.querySelector('#rc-widget-adapter-frame') : null;
      const targetWindow = frame?.contentWindow || null;
      if (targetWindow) {
        targetWindow.postMessage(
          {
            type: 'rc-adapter-new-call',
            phoneNumber: value,
            toCall: true,
          },
          '*'
        );
        return true;
      }
      return false;
    };

    // Try immediately
    if (postCallMessage()) return;

    // If not ready, try again after a short delay to allow the panel to mount
    setTimeout(() => {
      if (!postCallMessage()) {
        // Fallback: copy the number so user can paste it into the dialer.
        try {
          if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(value);
            setToast({ type: 'success', text: 'RingCentral panel not ready. Phone number copied.' });
            setTimeout(() => setToast({ type: '', text: '' }), 2500);
          }
        } catch {
          // Ignore clipboard permission errors.
        }
      }
    }, 1000);
  };

  const emailTemplates = useMemo(
    () => sortCommunicationTemplates(
      commTemplates.filter(
        (t) => Boolean(t?.is_active) && String(t?.channel || '').toLowerCase() === 'email'
      )
    ),
    [commTemplates]
  );
  const smsTemplates = useMemo(
    () => sortCommunicationTemplates(
      commTemplates.filter(
        (t) => Boolean(t?.is_active) && String(t?.channel || '').toLowerCase() === 'sms'
      )
    ),
    [commTemplates]
  );
  const selectedCustomStatusCode = useMemo(() => {
    const currentCode = isSpecsEditing && specsDraft ? specsDraft.custom_status_code : form.custom_status_code;
    if (!currentCode) return null;
    return customStatusCodes.find((code) =>
      String(code.id) === String(currentCode) ||
      String(code.code) === String(currentCode)
    ) || null;
  }, [form.custom_status_code, isSpecsEditing, customStatusCodes, specsDraft]);
  const selectedCustomStatusStage = String(selectedCustomStatusCode?.maps_to_workflow_stage || '').toLowerCase();
  const assignableUsers = useMemo(() => {
    const companyId = opportunity?.company;
    const activeUsers = (users || []).filter((u) => u && u.is_active !== false && u.active !== false && u.status !== 'inactive');
    if (!companyId) return activeUsers;
    return activeUsers.filter((u) => Number(u?.company) === Number(companyId));
  }, [users, opportunity?.company]);

  const resolveUserLabel = useCallback((user) => {
    if (!user) return '';
    return (
      user.label ||
      user.name ||
      user.full_name ||
      [
        user.first_name,
        user.last_name,
      ].filter(Boolean).join(' ').trim() ||
      user.email ||
      (user.id ? `User #${user.id}` : '')
    ).trim();
  }, []);

  const selectedSpecsBranchId = String((isSpecsEditing && specsDraft ? specsDraft.branch : form.branch) || '').trim();

  const branchScopedUsers = useMemo(() => {
    const branchId = Number(selectedSpecsBranchId || 0);
    if (!branchId) return assignableUsers;
    return (assignableUsers || []).filter((u) => getUserBranchIds(u).includes(String(branchId)));
  }, [assignableUsers, selectedSpecsBranchId]);

  const daysUntilMove = useMemo(() => {
    const primaryPlannedJob = asList(opportunityJobs).find((job) => String(job?.move_date || '').trim()) || null;
    const dateStr = primaryPlannedJob?.move_date || opportunity?.move_date;
    const d = parseDateOnly(dateStr);
    if (!d) return null;
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diff = d.getTime() - startOfToday.getTime();
    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  }, [opportunity?.move_date, opportunityJobs]);

  const view = useMemo(() => oppView(opportunity, isLeadPath), [opportunity, isLeadPath]);

  useEffect(() => {
    const tabName = activeTab === 'Sales' ? 'Sale' : activeTab;
    if (view?.customerName) {
      document.title = `${view.customerName} - ${tabName} - KargoFlow CRM`;
    } else {
      document.title = isLeadPath 
        ? `Lead Details - ${tabName} - KargoFlow CRM` 
        : `Sales Details - ${tabName} - KargoFlow CRM`;
    }
  }, [view?.customerName, activeTab, isLeadPath]);
  const communicationRecipients = useMemo(
    () => buildCommunicationRecipients({ record: opportunity, view }),
    [opportunity, view]
  );
  const selectedInvoiceEmail = String(invoiceEmailRecipient || communicationRecipients.emails[0]?.value || '').trim();
  const estimateAllowsManualPayment = Boolean(resolvedEstimateId);

  const prevCustomerEmailsRef = useRef([]);
  useEffect(() => {
    const values = communicationRecipients.emails.map((item) => item.value);
    const primaryEmail = values.length > 0 ? values[0] : '';
    const oldPrimaryEmail = prevCustomerEmailsRef.current.length > 0 ? prevCustomerEmailsRef.current[0] : '';
    
    if (primaryEmail && primaryEmail !== oldPrimaryEmail) {
      setActivityEmailToText(prev => (!prev || prev === oldPrimaryEmail) ? primaryEmail : prev);
      setInvoiceEmailRecipient(prev => (!prev || prev === oldPrimaryEmail) ? primaryEmail : prev);
      setActivityEmailRecipients(prev => {
        if (prev.length === 0 || (prev.length === 1 && prev[0] === oldPrimaryEmail)) return [primaryEmail];
        return prev;
      });
    } else if (!primaryEmail && oldPrimaryEmail) {
      setActivityEmailToText(prev => prev === oldPrimaryEmail ? '' : prev);
      setInvoiceEmailRecipient(prev => prev === oldPrimaryEmail ? '' : prev);
      setActivityEmailRecipients(prev => (prev.length === 1 && prev[0] === oldPrimaryEmail) ? [] : prev);
    }
    prevCustomerEmailsRef.current = values;
  }, [communicationRecipients.emails]);

  const prevCustomerPhonesRef = useRef([]);
  useEffect(() => {
    const values = communicationRecipients.phones.map((item) => item.value);
    const primaryPhone = values.length > 0 ? values[0] : '';
    const oldPrimaryPhone = prevCustomerPhonesRef.current.length > 0 ? prevCustomerPhonesRef.current[0] : '';
    
    if (primaryPhone && primaryPhone !== oldPrimaryPhone) {
      setActivityCallRecipient(prev => (!prev || prev === oldPrimaryPhone) ? primaryPhone : prev);
      setActivitySmsRecipients(prev => {
        if (prev.length === 0 || (prev.length === 1 && prev[0] === oldPrimaryPhone)) return [primaryPhone];
        return prev;
      });
    } else if (!primaryPhone && oldPrimaryPhone) {
      setActivityCallRecipient(prev => prev === oldPrimaryPhone ? '' : prev);
      setActivitySmsRecipients(prev => (prev.length === 1 && prev[0] === oldPrimaryPhone) ? [] : prev);
    }
    prevCustomerPhonesRef.current = values;
  }, [communicationRecipients.phones]);
  
  const routePoints = useMemo(() => {
    return buildSalesRouteStops(opportunity, isLeadPath, view);
  }, [opportunity, view, isLeadPath]);

  const isSalesRouteEditable = !isLeadPath && !isCreation && opportunity?.id && opportunity.id !== 'new';

  const isDatabaseRouteStopId = (stopId) => {
    if (stopId === 'origin' || stopId === 'destination') return false;
    if (typeof stopId === 'string' && stopId.startsWith('temp-')) return false;
    return stopId !== undefined && stopId !== null;
  };

  const getRouteStopAddressFields = (stop) => {
    const details = stop?.details || {};
    let city = String(details.city || '').trim();
    let state = String(details.state || '').trim();
    let postalCode = String(details.postal_code || details.zip_code || '').trim();

    if (!city || !state || !postalCode) {
      const parsed = parseAddressString(stop?.address || details.address_line1 || '');
      if (!city) city = parsed.city;
      if (!state) state = parsed.state;
      if (!postalCode) postalCode = parsed.postal_code;
    }

    const originDetails = opportunity?.origin_address_details || {};
    const destinationDetails = opportunity?.destination_address_details || {};
    if (!city) city = originDetails.city || destinationDetails.city || 'TBD';
    if (!state) state = originDetails.state || destinationDetails.state || 'TBD';
    if (!postalCode) postalCode = originDetails.zip_code || originDetails.postal_code || destinationDetails.zip_code || destinationDetails.postal_code || 'TBD';

    return {
      address_line1: String(details.address_line1 || details.street || stop?.address || '').trim(),
      city,
      state,
      postal_code: postalCode,
      unit_number: details.unit_number || '',
      property_type: details.property_type || '',
      parking_type: details.parking_type || '',
      flights_of_stairs: Number.isFinite(Number(details.flights_of_stairs)) ? Number(details.flights_of_stairs) : 0,
      has_elevator: !!details.has_elevator,
      walk_distance_ft: Number.isFinite(Number(details.walk_distance_ft)) ? Number(details.walk_distance_ft) : 0,
    };
  };

  const getRouteStopPayloadFromForm = (data) => {
    let city = String(data.city || '').trim();
    let state = String(data.state || '').trim();
    let postalCode = String(data.postal_code || '').trim();

    if (!city || !state || !postalCode) {
      const parsed = parseAddressString(data.address_line1);
      if (!city) city = parsed.city;
      if (!state) state = parsed.state;
      if (!postalCode) postalCode = parsed.postal_code;
    }

    const originDetails = opportunity?.origin_address_details || {};
    const destinationDetails = opportunity?.destination_address_details || {};
    if (!city) city = originDetails.city || destinationDetails.city || 'TBD';
    if (!state) state = originDetails.state || destinationDetails.state || 'TBD';
    if (!postalCode) postalCode = originDetails.zip_code || originDetails.postal_code || destinationDetails.zip_code || destinationDetails.postal_code || 'TBD';

    return {
      address_line1: String(data.address_line1 || '').trim(),
      city,
      state,
      postal_code: postalCode,
      unit_number: String(data.unit_number || '').trim(),
      property_type: String(data.property_type || '').trim(),
      parking_type: String(data.parking_type || '').trim(),
      flights_of_stairs: Number.isFinite(Number(data.flights_of_stairs)) ? Number(data.flights_of_stairs) : 0,
      has_elevator: Boolean(data.has_elevator),
      walk_distance_ft: Number.isFinite(Number(data.walk_distance_ft)) ? Number(data.walk_distance_ft) : 0,
    };
  };

  const openSalesRouteStopEditor = (stop) => {
    if (!isSalesRouteEditable) {
      setToast({ type: 'error', text: 'Route stops can be edited after this lead is converted to an opportunity.' });
      return;
    }
    setEditingRouteStop(stop);
    setIsRouteStopModalOpen(true);
  };

  const closeSalesRouteStopEditor = () => {
    setIsRouteStopModalOpen(false);
    setEditingRouteStop(null);
  };

  const addSalesRouteStop = (position = 'middle') => {
    if (!isSalesRouteEditable) {
      setToast({ type: 'error', text: 'Route stops can be added after this lead is converted to an opportunity.' });
      return;
    }
    const stopType = position === 'before_origin'
      ? 'pre_stop'
      : position === 'after_destination'
        ? 'post_stop'
        : 'stop';
    const draftStop = {
      id: `temp-stop-${createRouteDraftStopId()}`,
      type: stopType,
      label: 'New route stop',
      address: '',
      details: {},
      notes: '',
      sort_order: routePoints.filter((stop) => stop.type === stopType).length,
      isDraft: true,
    };
    setEditingRouteStop(draftStop);
    setIsRouteStopModalOpen(true);
  };

  const saveSalesRouteStop = async (stopId, data) => {
    if (!isSalesRouteEditable) return;
    if (!requiresAnyPermission([PERMISSIONS.LEAD_EDIT, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to edit route stops.');
    }
    if (!requiresAnyPermission([PERMISSIONS.LEAD_EDIT, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to edit route stops.');
    }
    const fields = getRouteStopPayloadFromForm(data);
    if (!fields.address_line1) {
      setToast({ type: 'error', text: 'Address is required for a route stop.' });
      return;
    }
    if (!String(fields.unit_number || '').trim()) {
      setToast({ type: 'error', text: 'Unit / Apt number is required for a route stop.' });
      return;
    }

    setIsRouteStopSaving(true);
    try {
      if (stopId === 'origin' || stopId === 'destination') {
        const prefix = stopId === 'origin' ? 'origin_' : 'destination_';
        await updateOpportunity(opportunity.id, {
          [`${prefix}address_line1`]: fields.address_line1,
          [`${prefix}city`]: fields.city,
          [`${prefix}state`]: fields.state,
          [`${prefix}postal_code`]: fields.postal_code,
          [`${prefix}unit_number`]: fields.unit_number,
          [`${prefix}property_type`]: fields.property_type,
          [`${prefix}parking_type`]: fields.parking_type,
          [`${prefix}flights_of_stairs`]: fields.flights_of_stairs,
          [`${prefix}has_elevator`]: fields.has_elevator,
          [`${prefix}walk_distance_ft`]: fields.walk_distance_ft,
        });
      } else {
        const payload = {
          opportunity: opportunity.id,
          ...fields,
          stop_type: data.stop_type || editingRouteStop?.type || 'stop',
          notes: data.notes || '',
          sort_order: Number.isFinite(Number(data.sort_order))
            ? Number(data.sort_order)
            : (Number.isFinite(Number(editingRouteStop?.sort_order)) ? Number(editingRouteStop.sort_order) : 0),
        };
        if (String(stopId || '').startsWith('temp-stop-') || editingRouteStop?.isDraft) {
          await createOpportunityStop(payload);
        } else {
          await updateOpportunityStop(stopId, payload);
        }
      }
      closeSalesRouteStopEditor();
      await fetchOpportunity();
      setToast({ type: 'success', text: 'Route stop saved successfully.' });
    } catch (err) {
      setToast({ type: 'error', text: getErrorMessage(err, 'Failed to save route stop.') });
    } finally {
      setIsRouteStopSaving(false);
    }
  };

  const saveSalesRouteStopOrder = async (newStops) => {
    if (!isSalesRouteEditable || !Array.isArray(newStops) || newStops.length < 2) return;
    if (!requiresAnyPermission([PERMISSIONS.LEAD_EDIT, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to reorder route stops.');
    }
    if (!requiresAnyPermission([PERMISSIONS.LEAD_EDIT, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to reorder route stops.');
    }
    setIsRouteStopSaving(true);
    try {
      const originIndex = newStops.findIndex((stop) => stop.id === 'origin' || stop.type === 'origin');
      const destinationIndex = newStops.findIndex((stop) => stop.id === 'destination' || stop.type === 'destination');
      if (originIndex === -1 || destinationIndex === -1) {
        throw new Error('Missing origin or destination stop.');
      }

      let finalOriginIndex = originIndex;
      let finalDestinationIndex = destinationIndex;
      const finalStops = [...newStops];

      if (originIndex > destinationIndex) {
        finalOriginIndex = destinationIndex;
        finalDestinationIndex = originIndex;
        const originalOrigin = finalStops[originIndex];
        const originalDestination = finalStops[destinationIndex];
        finalStops[originIndex] = { ...originalOrigin, id: 'destination', type: 'destination' };
        finalStops[destinationIndex] = { ...originalDestination, id: 'origin', type: 'origin' };
      }

      const originFields = getRouteStopAddressFields(finalStops[finalOriginIndex]);
      const destinationFields = getRouteStopAddressFields(finalStops[finalDestinationIndex]);
      const opportunityPayload = {};
      Object.entries(originFields).forEach(([key, value]) => {
        opportunityPayload[`origin_${key}`] = value;
      });
      Object.entries(destinationFields).forEach(([key, value]) => {
        opportunityPayload[`destination_${key}`] = value;
      });

      await updateOpportunity(opportunity.id, opportunityPayload);

      const stopIdsToDelete = [];
      if (isDatabaseRouteStopId(finalStops[finalOriginIndex]?.id)) stopIdsToDelete.push(finalStops[finalOriginIndex].id);
      if (isDatabaseRouteStopId(finalStops[finalDestinationIndex]?.id)) stopIdsToDelete.push(finalStops[finalDestinationIndex].id);
      for (const stopId of stopIdsToDelete) {
        await deleteOpportunityStop(stopId);
      }

      for (let index = 0; index < finalStops.length; index += 1) {
        if (index === finalOriginIndex || index === finalDestinationIndex) continue;
        const stop = finalStops[index];
        const stopType = index < finalOriginIndex ? 'pre_stop' : index > finalDestinationIndex ? 'post_stop' : 'stop';

        if (isDatabaseRouteStopId(stop.id)) {
          await updateOpportunityStop(stop.id, {
            stop_type: stopType,
            sort_order: index,
          });
        } else {
          const stopFields = getRouteStopAddressFields(stop);
          await createOpportunityStop({
            opportunity: opportunity.id,
            ...stopFields,
            stop_type: stopType,
            notes: stop.notes || '',
            sort_order: index,
          });
        }
      }

      await fetchOpportunity();
      setToast({ type: 'success', text: 'Route stops reordered successfully.' });
    } catch (err) {
      setToast({ type: 'error', text: getErrorMessage(err, 'Failed to reorder route stops.') });
    } finally {
      setIsRouteStopSaving(false);
    }
  };

  const reorderSalesRouteStops = async (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= routePoints.length || toIndex < 0 || toIndex >= routePoints.length) return;
    const next = [...routePoints];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    await saveSalesRouteStopOrder(next);
  };

  const moveSalesRouteStop = async (index, direction) => {
    await reorderSalesRouteStops(index, index + direction);
  };

  const deleteSalesRouteStop = async (index) => {
    const stop = routePoints[index];
    if (!isSalesRouteEditable || !stop || stop.type === 'origin' || stop.type === 'destination') return;
    if (!isDatabaseRouteStopId(stop.id)) return;
    if (!requiresAnyPermission([PERMISSIONS.LEAD_EDIT, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to delete route stops.');
    }
    if (!requiresAnyPermission([PERMISSIONS.LEAD_EDIT, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to delete route stops.');
    }
    setIsRouteStopSaving(true);
    try {
      await deleteOpportunityStop(stop.id);
      await fetchOpportunity();
      setToast({ type: 'success', text: 'Route stop deleted successfully.' });
    } catch (err) {
      setToast({ type: 'error', text: getErrorMessage(err, 'Failed to delete route stop.') });
    } finally {
      setIsRouteStopSaving(false);
    }
  };

  const workflowActions = useMemo(
    () => {
      const actions = buildWorkflowActions({
        isLead: view.isLead,
        isNewRecord: opportunity?.id === 'new',
        workflowStage: opportunity?.workflow_stage,
        estimateSummary,
        canDuplicateOpportunity: canDuplicateOpportunity(),
        canBookOpportunity: canBookOpportunity(),
        canMarkOpportunityLost: canMarkOpportunityLost(),
        canCreateOpportunity: canCreateOpportunity(),
        canEditOpportunity: canEditOpportunity(),
      });
      return actions;
    },
    [canBookOpportunity, canCreateOpportunity, canDuplicateOpportunity, canEditOpportunity, canMarkOpportunityLost, estimateSummary, opportunity?.id, opportunity?.workflow_stage, view.isLead]
  );

  const accountingEnabled = useMemo(() => {
    if (isCreation) return false;
    const stage = String(opportunity?.workflow_stage || '').toLowerCase();
    // Accounting is only relevant once the opportunity is booked into a job (and later stages).
    return ['booked', 'confirmed', 'completed', 'canceled'].includes(stage);
  }, [isCreation, opportunity?.workflow_stage]);

  useEffect(() => {
    if (activeTab !== 'Accounting') return;
    if (accountingEnabled) return;
    navigateToDetailTab('Sales', { navigateOptions: { replace: true } });
  }, [accountingEnabled, activeTab, navigateToDetailTab]);
  const pendingFollowUps = useMemo(
    () => followUps.filter((task) => String(task?.activity_details?.status || task?.activity?.status || '').toLowerCase() !== 'completed'),
    [followUps]
  );
  const completedFollowUps = useMemo(
    () => followUps.filter((task) => String(task?.activity_details?.status || task?.activity?.status || '').toLowerCase() === 'completed'),
    [followUps]
  );
  const recordCustomerDetails = getRecordCustomerDetails(opportunity);
  const customerAdditionalContacts = useMemo(
    () => getAdditionalCustomerContacts(recordCustomerDetails),
    [recordCustomerDetails]
  );
  const selectedAdditionalContactForm =
    additionalContactForms[selectedAdditionalContactIndex] || createEmptyAdditionalContact();

  useEffect(() => {
    if (!additionalContactForms.length) {
      if (selectedAdditionalContactIndex !== 0) {
        setSelectedAdditionalContactIndex(0);
      }
      return;
    }

    if (selectedAdditionalContactIndex >= additionalContactForms.length) {
      setSelectedAdditionalContactIndex(additionalContactForms.length - 1);
    }
  }, [additionalContactForms.length, selectedAdditionalContactIndex]);

  useEffect(() => {
    if (!isContractModalOpen) return;
    let isActive = true;

    const loadTemplates = async () => {
      setContractTemplatesLoading(true);
      setContractTemplatesError('');
      try {
        const res = await getDocumentTemplates({ template_type: 'contract', is_active: 'true' });
        const rows = asList(res?.data ?? res);
        if (!isActive) return;
        setContractTemplates(rows);

        const customerResolved = resolveOpportunityCustomer(opportunity, isLeadPath);
        const customerEmail = String(customerResolved?.email || '').trim();
        const customerPhone = String(customerResolved?.phone || '').trim();
        const oppNum = String(opportunity?.opportunity_number || opportunity?.id || '').trim();

        setContractDraft((prev) => {
          const nextTemplateId = String(prev.template_id || (rows[0]?.id ?? '') || '');
          const picked = rows.find((t) => String(t.id) === nextTemplateId) || rows[0] || null;
          const nextTitle = String(prev.title || picked?.name || 'Contract').trim();
          const nextContractNumber =
            String(prev.contract_number || '').trim() || `CTR-${oppNum || 'OPP'}-${toYyyyMmDd(new Date())}`;
          return {
            ...prev,
            template_id: nextTemplateId,
            title: nextTitle,
            contract_number: nextContractNumber,
            to_email: prev.to_email || customerEmail,
            to_phone: prev.to_phone || customerPhone,
          };
        });
      } catch (err) {
        if (!isActive) return;
        setContractTemplates([]);
        setContractTemplatesError(getErrorMessage(err, 'Unable to load contract templates.'));
      } finally {
        if (isActive) setContractTemplatesLoading(false);
      }
    };

    loadTemplates();
    return () => {
      isActive = false;
    };
  }, [isContractModalOpen, opportunity?.id]);

  useEffect(() => {
    if (!isContractResendModalOpen) return;
    let isActive = true;

    const loadContracts = async () => {
      if (!opportunity?.id || opportunity.id === 'new') return;
      setContractsLoading(true);
      setContractsError('');
      try {
        const res = await getContracts({
          opportunity: opportunity.id,
          status__in: 'draft,sent',
        });
        const rows = asList(res?.data ?? res);
        if (!isActive) return;
        setContracts(rows);

        const customerResolved = resolveOpportunityCustomer(opportunity, isLeadPath);
        const customerEmail = String(customerResolved?.email || '').trim();
        const customerPhone = String(customerResolved?.phone || '').trim();

        setContractResendDraft((prev) => ({
          ...prev,
          contract_id: String(prev.contract_id || (rows[0]?.id ?? '') || ''),
          to_email: prev.to_email || customerEmail,
          to_phone: prev.to_phone || customerPhone,
        }));
      } catch (err) {
        if (!isActive) return;
        setContracts([]);
        setContractsError(getErrorMessage(err, 'Unable to load contracts.'));
      } finally {
        if (isActive) setContractsLoading(false);
      }
    };

    loadContracts();
    return () => {
      isActive = false;
    };
  }, [isContractResendModalOpen, opportunity?.id]);

  const loadDocumentsContracts = async ({ filterStatus = documentsStatusFilter } = {}) => {
    if (!opportunity?.id || opportunity.id === 'new') return;
    setDocumentsContractsLoading(true);
    setDocumentsContractsError('');
    try {
      const params = { opportunity: opportunity.id };
      if (filterStatus && filterStatus !== 'all') {
        params.status = filterStatus;
      }
      const res = await getContracts(params);
      const rows = asList(res?.data ?? res);
      if ((filterStatus === 'all' || !filterStatus) && !rows.length) {
        const customerResolved = resolveOpportunityCustomer(opportunity, isLeadPath);
        const customerId = customerResolved?.id || opportunity?.customer_details?.id || opportunity?.customer?.id || null;
        if (!customerId) {
          setDocumentsContracts([]);
          setDocumentsContractsError('Customer is missing on this opportunity.');
          return;
        }

        const tplRes = await getDocumentTemplates({ template_type: 'contract', is_active: 'true' });
        const tplRows = asList(tplRes?.data ?? tplRes);
        const picked = tplRows[0] || null;
        if (!picked?.id) {
          setDocumentsContracts([]);
          setDocumentsContractsError('No active contract template found. Create one in Settings → Documents → Templates.');
          return;
        }

        const oppNum = String(opportunity?.opportunity_number || opportunity?.id || '').trim();
        const contractNumber = `CTR-${oppNum || 'OPP'}-${toYyyyMmDd(new Date())}`;
        const title = String(picked?.name || 'Services Contract').trim() || 'Services Contract';

        await createContract({
          opportunity: opportunity.id,
          customer: customerId,
          document_template: picked.id,
          title,
          contract_number: contractNumber,
        });

        const res2 = await getContracts(params);
        const rows2 = asList(res2?.data ?? res2);
        setDocumentsContracts(rows2);
      } else {
        setDocumentsContracts(rows);
      }
    } catch (err) {
      setDocumentsContracts([]);
      setDocumentsContractsError(getErrorMessage(err, 'Unable to load contracts.'));
    } finally {
      setDocumentsContractsLoading(false);
    }
  };

  useEffect(() => {
    if (!isDocumentsDrawerOpen) return;
    setActiveContractMenuId(null);
    loadDocumentsContracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDocumentsDrawerOpen, opportunity?.id]);

  const contractStatusTone = (statusValue) => {
    const status = String(statusValue || '').toLowerCase();
    if (status === 'signed') return 'success';
    if (status === 'sent') return 'warning';
    if (status === 'draft') return 'neutral';
    if (status === 'voided') return 'danger';
    return 'neutral';
  };

  const contractStatusLabel = (statusValue) => {
    const status = String(statusValue || '').toLowerCase();
    if (status === 'draft') return 'Not Started';
    if (status === 'sent') return 'Signature Requested';
    if (status === 'signed') return 'Completed';
    if (status === 'voided') return 'Voided';
    if (status === 'expired') return 'Expired';
    return String(statusValue || 'Unknown');
  };

  const statusPillCls = (tone) => {
    if (tone === 'success') return 'bg-[#ECFDF5] text-[#065F46] border-[#86EFAC]/60';
    if (tone === 'warning') return 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]';
    if (tone === 'danger') return 'bg-[#FEF2F2] text-[#7F1D1D] border-[#FCA5A5]/50';
    return 'bg-page text-body border-subtle';
  };

  const buildPortalLink = (contract) => {
    const token = String(contract?.signing_token || '').trim();
    if (!token) return '';
    const base = getPortalBaseUrl();
    return `${base}/portal/contracts/${token}`;
  };

  const copyToClipboard = async (text) => {
    const value = String(text || '');
    if (!value) return false;
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (err) {
      try {
        const el = document.createElement('textarea');
        el.value = value;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        return true;
      } catch {
        return false;
      }
    }
  };

  const updateAdditionalContactForm = (index, nextValue) => {
    setAdditionalContactForms((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              ...(typeof nextValue === 'function' ? nextValue(row) : nextValue),
            }
          : row
      )
    );
  };

  const addAdditionalContactForm = () => {
    setAdditionalContactError('');
    setAdditionalContactForms((prev) => {
      if (prev.length >= MAX_ADDITIONAL_CONTACTS) return prev;
      const nextIndex = prev.length;
      setSelectedAdditionalContactIndex(nextIndex);
      return [...prev, createEmptyAdditionalContact()];
    });
  };

  const removeAdditionalContactForm = async (indexToRemove) => {
    const formToRemove = additionalContactForms[indexToRemove];
    if (!formToRemove) return;

    if (formToRemove.id) {
      try {
        setIsAdditionalContactsSaving(true);
        await deleteCustomerContact(formToRemove.id);
        
        const customerId = resolveCustomerId(getRecordCustomerDetails(opportunity), opportunity?.customer_id, opportunity?.customer);
        const currentContacts = getRecordCustomerDetails(opportunity)?.contacts || [];
        const nextContacts = currentContacts.filter(c => c.id !== formToRemove.id);

        const updatedCustomer = { ...getRecordCustomerDetails(opportunity), contacts: nextContacts };
        
        setOpportunity(prev => prev ? { ...prev, customer_details: updatedCustomer } : prev);
        setEstimateOpportunity(prev => prev ? { ...prev, customer_details: updatedCustomer } : prev);

        setToast({ type: 'success', text: 'Contact deleted successfully.' });
      } catch (err) {
        console.error(err);
        setAdditionalContactError('Failed to delete contact.');
        setIsAdditionalContactsSaving(false);
        return;
      } finally {
        setIsAdditionalContactsSaving(false);
      }
    }

    setAdditionalContactForms((prev) => {
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      if (selectedAdditionalContactIndex >= next.length) {
        setSelectedAdditionalContactIndex(Math.max(0, next.length - 1));
      }
      return next;
    });
  };


  const openAdditionalContactsModal = () => {
    if (!isLeadPath && (!opportunity?.customer_details?.id && !opportunity?.customer)) {
      setToast({ 
        type: 'error', 
        text: 'Please save the customer details first to create a customer profile.'
      });
      return;
    }
    setAdditionalContactError('');
    const existingContacts = mapCustomerContactsToDrafts(getRecordCustomerDetails(opportunity));
    setAdditionalContactForms(existingContacts.length ? existingContacts : [createEmptyAdditionalContact()]);
    setSelectedAdditionalContactIndex(0);
    setIsAdditionalContactsModalOpen(true);
  };

  const closeAdditionalContactsModal = () => {
    setIsAdditionalContactsModalOpen(false);
    setAdditionalContactError('');
    setAdditionalContactForms(mapCustomerContactsToDrafts(getRecordCustomerDetails(opportunity)));
    setSelectedAdditionalContactIndex(0);
  };

  const saveAdditionalContacts = async () => {
    if (!isLeadPath && (!opportunity?.customer_details?.id && !opportunity?.customer)) {
      setAdditionalContactError('Customer contacts are only available after the customer is created.');
      return;
    }
    if (!requiresAnyPermission([PERMISSIONS.LEAD_EDIT, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to edit contacts.');
    }
    if (!requiresAnyPermission([PERMISSIONS.LEAD_EDIT, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to edit contacts.');
    }

    let customerId = resolveCustomerId(getRecordCustomerDetails(opportunity), opportunity?.customer_id, opportunity?.customer);
    if (!customerId) {
      if (!isLeadPath) {
        setAdditionalContactError('Customer record is missing.');
        return;
      }
    }

    setIsAdditionalContactsSaving(true);
    setAdditionalContactError('');
    try {
      const savedContacts = [];
      if (!customerId && isLeadPath) {
        const createdCustomer = await createCustomer({
          created_from_lead: opportunity.id,
          first_name: opportunity?.first_name || form.first_name || '',
          last_name: opportunity?.last_name || form.last_name || '',
          email: opportunity?.email || form.email || '',
          primary_phone: opportunity?.phone || form.phone || '',
          primary_phone_type: opportunity?.phone_type || '',
          sms_opt_in: Boolean(opportunity?.sms_opt_in),
          notes: opportunity?.notes_internal || opportunity?.notes || '',
        });
        customerId = resolveCustomerId(createdCustomer?.data || createdCustomer);
      }

      if (!customerId) {
        setAdditionalContactError('Customer record is missing.');
        return;
      }

      const currentContacts = getAdditionalCustomerContacts(getRecordCustomerDetails(opportunity));
      for (let index = 0; index < additionalContactForms.length; index += 1) {
        const row = additionalContactForms[index] || createEmptyAdditionalContact();
        const contactPayload = {
          name: String(row.name || '').trim(),
          email: String(row.email || '').trim(),
          phone: String(row.phone || '').trim(),
          phone_type: String(row.phone_type || '').trim(),
          relationship: String(row.relationship || '').trim(),
          is_primary: false,
        };

        if (!hasContactValues(contactPayload)) {
          continue;
        }

        if (!contactPayload.name) {
          throw new Error('Additional contact name is required to save contact details.');
        }

        const rowId = String(row.id || '').trim();
        const existingContact =
          currentContacts.find((contact) => String(contact?.id || '') === rowId) || currentContacts[index] || null;
        const contactId = Number(rowId || existingContact?.id || 0) || null;
        const contactChanged =
          String(contactPayload.name || '') !== String(existingContact?.name || '') ||
          String(contactPayload.email || '') !== String(existingContact?.email || '') ||
          String(contactPayload.phone || '') !== String(existingContact?.phone || '') ||
          String(contactPayload.phone_type || '') !== String(existingContact?.phone_type || '') ||
          String(contactPayload.relationship || '') !== String(existingContact?.relationship || '');

        if (contactId) {
          if (contactChanged) {
            const savedContact = await updateCustomerContact(contactId, contactPayload);
            savedContacts.push(savedContact);
            syncSavedCustomerContact(savedContact, customerId);
          }
        } else {
          const savedContact = await createCustomerContact({
            ...contactPayload,
            customer: customerId,
          });
          savedContacts.push(savedContact);
          syncSavedCustomerContact(savedContact, customerId);
        }
      }

      await fetchOpportunity();
      savedContacts.forEach((savedContact) => {
        syncSavedCustomerContact(savedContact, customerId);
      });
      closeAdditionalContactsModal();
      setToast({ type: 'success', text: 'Additional contact details saved successfully.' });
      setTimeout(() => setToast({ type: '', text: '' }), 2500);
    } catch (err) {
      setAdditionalContactError(getErrorMessage(err, 'Failed to save additional contact details.'));
    } finally {
      setIsAdditionalContactsSaving(false);
    }
  };

  function titleCase(value) {
    return String(value || '')
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }

  const hydrateFormFromOpportunity = useCallback((record) => {
    if (!record) return;

    const getId = (val) => {
      if (!val) return '';
      if (typeof val === 'object' && val.id) return String(val.id);
      return String(val);
    };

    if (isLeadPath) {
      setForm({
        first_name: record.first_name || '',
        last_name: record.last_name || '',
        email: record.email || '',
        phone: record.phone || '',
        status: record.status || 'new',
        custom_status_code: record.custom_status_code ? String(record.custom_status_code) : '',
        service_type: normalizeLookupValue(record.service_type),
        move_date: record.move_date || '',
        move_size: resolveMoveSizeValue(record.move_size, moverSizes) || '',
        move_type: normalizeLookupValue(record.move_type),
        branch: getId(record.branch),
        assigned_to: getId(record.assigned_to),
        referral_source: getId(record.referral_source),
        utm_source: record.utm_source || '',
        notes: record.notes || '',
        ...buildRouteFieldsFromRecord(record, true),
      });
      return;
    }

    const resolvedMoverSizeId =
      record?.mover_size_details?.id ??
      record?.move_size_details?.id ??
      record?.mover_size ??
      record?.move_size ??
      '';
    const initialMoveSizeId = resolvedMoverSizeId ? String(resolvedMoverSizeId) : '';
    setForm({
      first_name: record.customer_details?.first_name || '',
      last_name: record.customer_details?.last_name || '',
      email: record.customer_details?.email || '',
      phone: record.customer_details?.primary_phone || record.customer_details?.phone || '',
      status: record.status || 'new',
      custom_status_code: record.custom_status_code ? String(record.custom_status_code) : '',
      service_type: normalizeLookupValue(record.service_type),
      move_date: record.move_date || '',
      arrival_window_start: record.arrival_window_start || '',
      arrival_window_end: record.arrival_window_end || '',
      move_size: initialMoveSizeId,
      move_type: normalizeLookupValue(record.move_type),
      branch: getId(record.branch),
      assigned_to: getId(record.assigned_user),
      referral_source: getId(record.referral_source),
      utm_source: record.utm_source || '',
      notes: record.notes_internal || record.notes || '',
      ...buildRouteFieldsFromRecord(record, false),
    });
  }, [isLeadPath, moverSizes]);

  useEffect(() => {
    if (!opportunity) return;
    hydrateFormFromOpportunity(opportunity);
  }, [opportunity, hydrateFormFromOpportunity]);

  function closeAllEditSections() {
    setIsCustomerEditing(false);
    setIsRouteEditing(false);
    setIsSpecsEditing(false);
  }

  function validateCustomerSection(target = form) {
    if (!String(target.first_name || '').trim()) return 'First name is required.';
    if (!String(target.email || '').trim() && !String(target.phone || '').trim()) {
      return 'At least one contact method (Email or Phone) is required.';
    }
    if (String(target.email || '').trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target.email)) {
      return 'Please enter a valid email address.';
    }
    if (String(target.phone || '').trim()) {
      const digits = String(target.phone || '').replace(/\D/g, '');
      if (digits.length < 10) {
        return 'Please enter a valid 10-digit phone number.';
      }
    }
    return null;
  }

  function validateRouteSection(target = form) {
    const originFields = [target.origin_street, target.origin_city, target.origin_state, target.origin_zip];
    const destinationFields = [target.destination_street, target.destination_city, target.destination_state, target.destination_zip];
    const originHasAny = originFields.some((value) => String(value || '').trim());
    const destinationHasAny = destinationFields.some((value) => String(value || '').trim());

    if (originHasAny) {
      if (!String(target.origin_street || '').trim()) return 'Origin street address is required.';
    }

    if (destinationHasAny) {
      if (!String(target.destination_street || '').trim()) return 'Destination street address is required.';
    }

    return null;
  }

  function validateSpecsSection(target = form) {
    if (!String(target.branch || '').trim() && !isCreation) return null;
    if (String(target.branch || '').trim() && Number.isNaN(Number(target.branch))) {
      return 'Please select a valid branch.';
    }
    if (String(target.assigned_to || '').trim() && Number.isNaN(Number(target.assigned_to))) {
      return 'Please select a valid assignee.';
    }
    if (String(target.referral_source || '').trim() && Number.isNaN(Number(target.referral_source))) {
      return 'Please select a valid referral source.';
    }
    return null;
  }

  function validateOpportunityForm(targetCustomer = form, targetRoute = form, targetSpecs = form, targetMoveDate = form) {
    const customerError = validateCustomerSection(targetCustomer);
    if (customerError) return customerError;
    const routeError = validateRouteSection(targetRoute);
    if (routeError) return routeError;
    const specsError = validateSpecsSection(targetSpecs);
    if (specsError) return specsError;
    if (!targetMoveDate.move_date) return 'Move date is required.';
    if (!targetSpecs.branch) return 'Please select a branch.';
    return null;
  }

  function getEstimateRequirementGaps(target = form) {
    const gaps = [];
    if (!String(target.first_name || '').trim()) gaps.push('Customer first name');
    if (!String(target.email || '').trim() && !String(target.phone || '').trim()) gaps.push('Email or phone');
    if (!String(target.move_date || '').trim()) gaps.push('Move date');
    if (!String(target.branch || '').trim()) gaps.push('Branch');
    if (!String(target.service_type || '').trim()) gaps.push('Service type');
    if (!String(target.move_type || '').trim()) gaps.push('Move type');
    if (!String(target.origin_street || '').trim()) gaps.push('Origin address');
    if (!String(target.destination_street || '').trim()) gaps.push('Destination address');
    return gaps;
  }

  function validateEstimateRequirements(target = form) {
    const customerError = validateCustomerSection(target);
    if (customerError) return customerError;
    if (!String(target.move_date || '').trim()) return 'Move date is required.';
    if (!String(target.branch || '').trim()) return 'Please select a branch.';
    if (!String(target.service_type || '').trim()) return 'Please select a service type.';
    if (!String(target.move_type || '').trim()) return 'Please select a move type.';
    if (!String(target.origin_street || '').trim()) return 'Origin address is required.';
    if (!String(target.destination_street || '').trim()) return 'Destination address is required.';
    return null;
  }

  const openEstimateRequirementsModal = useCallback(
    (seed = null) => {
      const nextDraft = { ...buildCurrentOpportunityFormSnapshot(), ...(seed || {}) };
      setEstimateRequirementsDraft(nextDraft);
      setEstimateRequirementsError('');
      setIsEstimateRequirementsModalOpen(true);
    },
    [buildCurrentOpportunityFormSnapshot]
  );

  const closeEstimateRequirementsModal = useCallback(() => {
    if (isSavingEstimateRequirements) return;
    setIsEstimateRequirementsModalOpen(false);
    setEstimateRequirementsDraft(null);
    setEstimateRequirementsError('');
  }, [isSavingEstimateRequirements]);

  const syncSavedOpportunity = (updated) => {
    if (!updated) return;
    setOpportunity((prev) => {
      if (!prev) return updated;
      return {
        ...prev,
        ...updated,
        branch_details: updated?.branch_details ?? prev?.branch_details,
        assigned_to_details: updated?.assigned_to_details ?? prev?.assigned_to_details,
        assigned_user_details: updated?.assigned_user_details ?? prev?.assigned_user_details,
        referral_source_details: updated?.referral_source_details ?? prev?.referral_source_details,
        custom_status_code_details: updated?.custom_status_code_details ?? prev?.custom_status_code_details,
        customer_details: updated?.customer_details ?? prev?.customer_details,
      };
    });
    if (!isLeadPath) {
      setEstimateOpportunity((prev) => {
        if (!prev) return updated;
        return {
          ...prev,
          ...updated,
          branch_details: updated?.branch_details ?? prev?.branch_details,
          assigned_user_details: updated?.assigned_user_details ?? prev?.assigned_user_details,
          referral_source_details: updated?.referral_source_details ?? prev?.referral_source_details,
          custom_status_code_details: updated?.custom_status_code_details ?? prev?.custom_status_code_details,
          customer_details: updated?.customer_details ?? prev?.customer_details,
        };
      });
    }
  };

  const syncSavedCustomerContact = (savedContact, customerId = null) => {
    setOpportunity((prev) => mergeCustomerContactIntoRecord(prev, savedContact, customerId));
    setEstimateOpportunity((prev) => mergeCustomerContactIntoRecord(prev, savedContact, customerId));
  };

  const saveCustomerSection = async (inlinePayload = null) => {
    if (isCreation) {
      await handleSaveOpportunity();
      return true;
    }

    const draftToSave = inlinePayload || customerDraft;
    const validationError = validateCustomerSection(draftToSave);
    if (validationError) {
      setToast({ type: 'error', text: validationError });
      return false;
    }

    const payload = {
      first_name: String(draftToSave?.first_name || '').trim(),
      last_name: String(draftToSave?.last_name || '').trim(),
      email: String(draftToSave?.email || '').trim(),
      phone: String(draftToSave?.phone || '').trim(),
    };

    setIsCustomerSaving(true);
    setToast({ type: '', text: '' });
    try {
      if (isLeadPath) {
        const updated = await updateLead(opportunity.id, payload);
        syncSavedOpportunity(updated);
      } else {
        const customerId = resolveCustomerId(opportunity?.customer_details, opportunity?.customer);

        if (customerId) {
          const updatedCustomer = await updateCustomer(customerId, {
            first_name: payload.first_name,
            last_name: payload.last_name,
            email: payload.email,
            primary_phone: payload.phone,
          });
          const nextOpportunity = {
            ...opportunity,
            customer_details: {
              ...(opportunity?.customer_details || {}),
              ...updatedCustomer,
              primary_phone: updatedCustomer?.primary_phone || payload.phone,
            },
          };
          syncSavedOpportunity(nextOpportunity);
        } else {
          const createdCustomer = await createCustomer({
            first_name: payload.first_name,
            last_name: payload.last_name,
            email: payload.email,
            primary_phone: payload.phone,
          });
          const updatedOpportunity = await updateOpportunity(opportunity.id, {
            customer: createdCustomer.id,
          });
          syncSavedOpportunity(updatedOpportunity);
        }
      }
      setIsCustomerEditing(false);
      setCustomerDraft(null);
      setToast({ type: 'success', text: 'Customer details saved successfully.' });
      setTimeout(() => setToast({ type: '', text: '' }), 2500);
      return true;
    } catch (err) {
      setToast({ type: 'error', text: getErrorMessage(err, 'Failed to save customer details.') });
      return false;
    } finally {
      setIsCustomerSaving(false);
    }
  };

  const handleCustomerInlineSave = async (field, value) => {
    const previousDraft = customerDraft;
    const updatedDraft = {
      ...form,
      ...(customerDraft || {}),
      [field]: value,
    };

    setCustomerDraft(updatedDraft);
    const success = await saveCustomerSection(updatedDraft);
    if (!success) {
      setCustomerDraft(previousDraft);
    }
  };

  const saveRouteSection = async () => {
    if (isCreation) {
      await handleSaveOpportunity();
      return;
    }

    const validationError = validateRouteSection(routeDraft);
    if (validationError) {
      setToast({ type: 'error', text: validationError });
      return;
    }

    const optionalText = (value) => {
      const trimmed = String(value || '').trim();
      return trimmed ? trimmed : null;
    };

    let originCity = String(routeDraft?.origin_city || '').trim();
    let originState = String(routeDraft?.origin_state || '').trim();
    let originZip = String(routeDraft?.origin_zip || '').trim();
    if (!originCity || !originState || !originZip) {
      const parsed = parseAddressString(routeDraft?.origin_street);
      if (!originCity) originCity = parsed.city;
      if (!originState) originState = parsed.state;
      if (!originZip) originZip = parsed.postal_code;
    }

    let destCity = String(routeDraft?.destination_city || '').trim();
    let destState = String(routeDraft?.destination_state || '').trim();
    let destZip = String(routeDraft?.destination_zip || '').trim();
    if (!destCity || !destState || !destZip) {
      const parsed = parseAddressString(routeDraft?.destination_street);
      if (!destCity) destCity = parsed.city;
      if (!destState) destState = parsed.state;
      if (!destZip) destZip = parsed.postal_code;
    }

    const payload = isLeadPath
      ? {
          origin_address_line1: String(routeDraft?.origin_street || '').trim(),
          origin_city: originCity,
          origin_state: originState,
          origin_zip: originZip,
          origin_unit_number: String(routeDraft?.origin_unit_number || '').trim(),
          origin_property_type: String(routeDraft?.origin_property_type || '').trim(),
          origin_parking_type: String(routeDraft?.origin_parking_type || '').trim(),
          origin_flights_of_stairs: Number(routeDraft?.origin_flights_of_stairs || 0),
          origin_has_elevator: Boolean(routeDraft?.origin_has_elevator),
          origin_walk_distance_ft: Number(routeDraft?.origin_walk_distance_ft || 0),
          destination_address_line1: String(routeDraft?.destination_street || '').trim(),
          destination_city: destCity,
          destination_state: destState,
          destination_zip: destZip,
          destination_unit_number: String(routeDraft?.destination_unit_number || '').trim(),
          destination_property_type: String(routeDraft?.destination_property_type || '').trim(),
          destination_parking_type: String(routeDraft?.destination_parking_type || '').trim(),
          destination_flights_of_stairs: Number(routeDraft?.destination_flights_of_stairs || 0),
          destination_has_elevator: Boolean(routeDraft?.destination_has_elevator),
          destination_walk_distance_ft: Number(routeDraft?.destination_walk_distance_ft || 0),
        }
      : {
          origin_address_line1: String(routeDraft?.origin_street || '').trim(),
          origin_city: originCity,
          origin_state: originState,
          origin_postal_code: originZip,
          origin_unit_number: optionalText(routeDraft?.origin_unit_number),
          origin_property_type: optionalText(routeDraft?.origin_property_type),
          origin_parking_type: optionalText(routeDraft?.origin_parking_type),
          origin_flights_of_stairs: Number(routeDraft?.origin_flights_of_stairs || 0),
          origin_has_elevator: Boolean(routeDraft?.origin_has_elevator),
          origin_walk_distance_ft: Number(routeDraft?.origin_walk_distance_ft || 0),
          destination_address_line1: String(routeDraft?.destination_street || '').trim(),
          destination_city: destCity,
          destination_state: destState,
          destination_postal_code: destZip,
          destination_unit_number: optionalText(routeDraft?.destination_unit_number),
          destination_property_type: optionalText(routeDraft?.destination_property_type),
          destination_parking_type: optionalText(routeDraft?.destination_parking_type),
          destination_flights_of_stairs: Number(routeDraft?.destination_flights_of_stairs || 0),
          destination_has_elevator: Boolean(routeDraft?.destination_has_elevator),
          destination_walk_distance_ft: Number(routeDraft?.destination_walk_distance_ft || 0),
        };

    setIsRouteSaving(true);
    setToast({ type: '', text: '' });
    try {
      const updated = isLeadPath
        ? await updateLead(opportunity.id, payload)
        : await updateOpportunity(opportunity.id, payload);
      syncSavedOpportunity(updated);
      setIsRouteEditing(false);
      setRouteDraft(null);
      setToast({ type: 'success', text: 'Route details saved successfully.' });
      setTimeout(() => setToast({ type: '', text: '' }), 2500);
    } catch (err) {
      setToast({ type: 'error', text: getErrorMessage(err, 'Failed to save route details.') });
    } finally {
      setIsRouteSaving(false);
    }
  };

  const handleSpecsInlineSave = async (id, val, opt) => {
    const updatedDraft = { ...form, ...specsDraft, [id]: val };
    const updatedLabels = { ...specsDraftLabels };
    if (opt) {
      const label = opt.label || opt.name || opt.first_name || '';
      updatedLabels[id] = label;
    } else if (!val) {
      delete updatedLabels[id];
    }
    if (id === 'branch') {
      updatedDraft.custom_status_code = '';
      if (opt) {
        updatedLabels.branch = opt.name || opt.label || '';
      }
      delete updatedLabels.custom_status_code;
    }

    setSpecsDraft(updatedDraft);
    setSpecsDraftLabels(updatedLabels);
    await saveSpecsSection(updatedDraft);
  };

  const saveSpecsSection = async (inlinePayload = null) => {
    if (isCreation) {
      await handleSaveOpportunity();
      return;
    }

    const draftToSave = inlinePayload || specsDraft;

    const validationError = validateSpecsSection(draftToSave);
    if (validationError) {
      setToast({ type: 'error', text: validationError });
      return;
    }

    const changed = (key) => String(draftToSave?.[key] ?? '') !== String(form?.[key] ?? '');
    const customStatusCodeId = Number(draftToSave?.custom_status_code);
    const resolvedCustomStatusCode =
      Number.isInteger(customStatusCodeId) && customStatusCodeId > 0 ? customStatusCodeId : null;
    const branchId = String(draftToSave?.branch || form?.branch || '').trim();
    const selectedAssignedUserId = String(draftToSave?.assigned_to || '').trim();
    const resolvedMoveTypeId = normalizeLookupValue(draftToSave?.move_type || form?.move_type);
    const resolvedServiceTypeId = normalizeLookupValue(draftToSave?.service_type || form?.service_type);
    const payload = {};
    if (changed('custom_status_code')) payload.custom_status_code = resolvedCustomStatusCode;
    if (changed('service_type')) payload.service_type = resolvedServiceTypeId || null;
    if (changed('move_date')) payload.move_date = draftToSave?.move_date || null;
    if (changed('move_type')) {
      payload.move_type = resolvedMoveTypeId || null;
    }
    if (changed('move_size')) {
      if (isLeadPath) payload.move_size = resolveMoveSizeName(draftToSave?.move_size, moverSizes);
      else payload.mover_size = draftToSave?.move_size ? Number(draftToSave.move_size) : null;
    }
    if (changed('branch')) payload.branch = branchId ? Number(branchId) : null;
    if (changed('assigned_to')) {
      const assignedUserId = selectedAssignedUserId ? Number(selectedAssignedUserId) : null;
      if (isLeadPath) payload.assigned_to = assignedUserId;
      else payload.assigned_user = assignedUserId;
    }
    if (changed('referral_source')) payload.referral_source = draftToSave?.referral_source ? Number(draftToSave.referral_source) : null;
    if (changed('utm_source')) payload.utm_source = draftToSave?.utm_source || '';
    if (changed('notes')) {
      if (isLeadPath) payload.notes = draftToSave?.notes || '';
      else payload.notes_internal = draftToSave?.notes || '';
    }

    setIsSpecsSaving(true);
    setToast({ type: '', text: '' });
    try {
      const updated = isLeadPath
        ? await updateLead(opportunity.id, payload)
        : await updateOpportunity(opportunity.id, payload);
      syncSavedOpportunity(updated);
      // Persist the draft labels so the panel can display the correct name
      // even when the PATCH response omits nested _details fields.
      setCommittedSpecsLabels((prev) => ({ ...prev, ...specsDraftLabels }));
      setSpecsDraftLabels({});
      setIsSpecsEditing(false);
      setSpecsDraft(null);
      setToast({ type: 'success', text: 'Details saved successfully.' });
      setTimeout(() => setToast({ type: '', text: '' }), 2500);
    } catch (err) {
      setToast({ type: 'error', text: getErrorMessage(err, 'Failed to save lead/opportunity details.') });
    } finally {
      setIsSpecsSaving(false);
    }
  };

  const startCustomerEdit = () => {
    setCustomerDraft({
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      phone: form.phone,
    });
    setIsCustomerEditing(true);
  };

  const cancelCustomerEdit = () => {
    setCustomerDraft(null);
    setIsCustomerEditing(false);
  };

  const startRouteEdit = () => {
    setRouteDraft(buildRouteFieldsFromRecord(opportunity, isLeadPath));
    setIsRouteEditing(true);
  };

  const cancelRouteEdit = () => {
    setRouteDraft(null);
    setIsRouteEditing(false);
  };

  const startSpecsEdit = () => {
    const snapshot = buildCurrentOpportunityFormSnapshot();
    setSpecsDraft({
      status: snapshot.status || form.status,
      custom_status_code: snapshot.custom_status_code || form.custom_status_code,
      service_type: snapshot.service_type || form.service_type,
      move_size: snapshot.move_size || form.move_size,
      move_type: snapshot.move_type || form.move_type,
      branch: snapshot.branch || form.branch,
      assigned_to: snapshot.assigned_to || form.assigned_to,
      referral_source: snapshot.referral_source || form.referral_source,
      utm_source: snapshot.utm_source || form.utm_source,
      notes: snapshot.notes || form.notes,
      move_date: snapshot.move_date || form.move_date,
      arrival_window_start: snapshot.arrival_window_start || form.arrival_window_start,
      arrival_window_end: snapshot.arrival_window_end || form.arrival_window_end,
      origin_street: snapshot.origin_street || form.origin_street,
      origin_city: snapshot.origin_city || form.origin_city,
      origin_state: snapshot.origin_state || form.origin_state,
      origin_zip: snapshot.origin_zip || form.origin_zip,
      destination_street: snapshot.destination_street || form.destination_street,
      destination_city: snapshot.destination_city || form.destination_city,
      destination_state: snapshot.destination_state || form.destination_state,
      destination_zip: snapshot.destination_zip || form.destination_zip,
    });
    setSpecsDraftLabels({
      status: titleCase(snapshot.status || form.status || ''),
      custom_status_code: selectedCustomStatusCode?.label || opportunity?.custom_status_code_details?.label || '',
      service_type: titleCase(snapshot.service_type || form.service_type || ''),
      move_size: resolveMoveSizeName(snapshot.move_size || form.move_size, moverSizes),
      move_type: snapshot.move_type || form.move_type || '',
      branch: selectedBranchName || opportunity?.branch_details?.name || '',
      assigned_to:
        resolveUserLabel(selectedAssignedUser) ||
        resolveUserLabel(opportunity?.assigned_user_details) ||
        resolveUserLabel(opportunity?.assigned_to_details) ||
        '',
      referral_source: selectedReferralSource?.label || selectedReferralSource?.name || opportunity?.referral_source_details?.name || '',
    });
    setIsSpecsEditing(true);
  };

  const cancelSpecsEdit = () => {
    setSpecsDraft(null);
    setIsSpecsEditing(false);
  };

  const getOffsetDateStr = (dateStr, daysOffset) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + daysOffset);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const fetchAvailability = async (dateStr) => {
    if (isLeadPath || !opportunity?.id || !dateStr) return;
    setIsAvailabilityLoading(true);
    try {
      const startDate = getOffsetDateStr(dateStr, -2);
      const res = await getOpportunityAvailability(opportunity.id, startDate);
      setAvailabilityData(res);
    } catch (err) {
      console.error("Failed to fetch scheduling availability:", err);
    } finally {
      setIsAvailabilityLoading(false);
    }
  };

  const startMoveDateEdit = () => {
    const initialMoveDate = form.move_date || opportunity?.move_date;
    setMoveDateDraft({
      move_date: initialMoveDate,
      arrival_window_start: opportunity?.arrival_window_start || '',
      arrival_window_end: opportunity?.arrival_window_end || '',
    });
    setIsMoveDateEditing(true);
    if (initialMoveDate) {
      fetchAvailability(initialMoveDate);
    }
  };

  const cancelMoveDateEdit = () => {
    setMoveDateDraft(null);
    setAvailabilityData(null);
    setIsMoveDateEditing(false);
  };

  const saveMoveDateSection = async () => {
    if (isCreation) {
      await handleSaveOpportunity();
      return true;
    }
    if (!moveDateDraft) {
      setIsMoveDateEditing(false);
      setAvailabilityData(null);
      return true;
    }

    setIsMoveDateSaving(true);
    setToast({ type: '', text: '' });
    try {
      const payload = isLeadPath
        ? { move_date: moveDateDraft?.move_date || null }
        : {
            move_date: moveDateDraft?.move_date || null,
            arrival_window_start: moveDateDraft?.arrival_window_start || null,
            arrival_window_end: moveDateDraft?.arrival_window_end || null,
          };
      const updated = isLeadPath
        ? await updateLead(opportunity.id, payload)
        : await updateOpportunity(opportunity.id, payload);
      syncSavedOpportunity(updated);
      setForm((prev) => ({
        ...prev,
        move_date: updated?.move_date ?? payload.move_date ?? '',
        arrival_window_start: updated?.arrival_window_start ?? payload.arrival_window_start ?? '',
        arrival_window_end: updated?.arrival_window_end ?? payload.arrival_window_end ?? '',
      }));
      setIsMoveDateEditing(false);
      setMoveDateDraft(null);
      setAvailabilityData(null);
      setToast({ type: 'success', text: 'Move date updated successfully.' });
      setTimeout(() => setToast({ type: '', text: '' }), 2500);
      return true;
    } catch (err) {
      setToast({ type: 'error', text: getErrorMessage(err, 'Failed to save move date.') });
      return false;
    } finally {
      setIsMoveDateSaving(false);
    }
  };

  const clearMoveDateSection = async () => {
    if (isCreation || !opportunity?.id) return false;
    setIsMoveDateSaving(true);
    setToast({ type: '', text: '' });
    try {
      const payload = isLeadPath
        ? { move_date: null }
        : { move_date: null, arrival_window_start: null, arrival_window_end: null };
      const updated = isLeadPath
        ? await updateLead(opportunity.id, payload)
        : await updateOpportunity(opportunity.id, payload);
      syncSavedOpportunity(updated);
      setForm((prev) => ({
        ...prev,
        move_date: '',
        arrival_window_start: '',
        arrival_window_end: '',
      }));
      setMoveDateDraft(null);
      setAvailabilityData(null);
      setIsMoveDateEditing(false);
      setToast({ type: 'success', text: 'Schedule cleared successfully.' });
      setTimeout(() => setToast({ type: '', text: '' }), 2500);
      return true;
    } catch (err) {
      setToast({ type: 'error', text: getErrorMessage(err, 'Failed to clear schedule.') });
      return false;
    } finally {
      setIsMoveDateSaving(false);
    }
  };

  const primaryPlannedJob = useMemo(() => (
    (selectedEstimateJobId
      ? asList(opportunityJobs).find((job) => String(job?.id || '') === String(selectedEstimateJobId))
      : null) || asList(opportunityJobs).find((job) => String(job?.move_date || '').trim()) || null
  ), [opportunityJobs, selectedEstimateJobId]);

  useEffect(() => {
    if (!primaryPlannedJob?.id) return;
    setMoveDateDraft({
      move_date: primaryPlannedJob?.move_date || '',
      arrival_window_start: primaryPlannedJob?.arrival_window_start || '',
      arrival_window_end: primaryPlannedJob?.arrival_window_end || '',
    });
  }, [
    primaryPlannedJob?.id,
    primaryPlannedJob?.move_date,
    primaryPlannedJob?.arrival_window_start,
    primaryPlannedJob?.arrival_window_end,
  ]);

  const plannedMove = useMemo(() => ({
    moveDate: isMoveDateEditing && moveDateDraft
      ? moveDateDraft.move_date
      : primaryPlannedJob?.move_date || form.move_date,
    moveDateTime: opportunity?.move_date_time,
    truckCount: opportunity?.truck_count,
    daysUntilMove,
    crewSize: opportunity?.crew_size,
    estHours: opportunity?.estimated_hours,
    saving: isMoveDateSaving,
    onSave: async () => {
      if (primaryPlannedJob?.id) {
        await updateSelectedEstimateJobPlanning({
          move_date: moveDateDraft?.move_date || null,
          arrival_window_start: moveDateDraft?.arrival_window_start || null,
          arrival_window_end: moveDateDraft?.arrival_window_end || null,
        });
        await loadOpportunityJobs();
        return true;
      }
      return saveMoveDateSection();
    },
    onStartEdit: startMoveDateEdit,
    onCancelEdit: cancelMoveDateEdit,
    onClearSchedule: async () => {
      if (primaryPlannedJob?.id) {
        await updateSelectedEstimateJobPlanning({
          move_date: null,
          arrival_window_start: null,
          arrival_window_end: null,
        });
        await loadOpportunityJobs();
        return true;
      }
      return clearMoveDateSection();
    },
    onMoveDateChange: (val) => {
      setMoveDateDraft((p) => ({ ...(p || {}), move_date: val }));
      fetchAvailability(val);
    },
    isLeadPath,
    draftArrivalWindowStart: moveDateDraft?.arrival_window_start || opportunity?.arrival_window_start || '',
    draftArrivalWindowEnd: moveDateDraft?.arrival_window_end || opportunity?.arrival_window_end || '',
    onArrivalWindowChange: (start, end) => setMoveDateDraft((p) => ({ ...(p || {}), arrival_window_start: start, arrival_window_end: end })),
    availabilityData,
    isAvailabilityLoading,
    branchName: opportunity?.branch_details?.name,
    hasBranch: !!opportunity?.branch,
    fetchAvailability,
    moveSizeLabel: resolveMoveSizeName(form.move_size || opportunity?.move_size, moverSizes),
    selectedJobId: primaryPlannedJob?.id ? String(primaryPlannedJob.id) : '',
    selectedJob: primaryPlannedJob,
    subJobs: asList(opportunityJobs),
    onSelectedJobChange: (jobId) => setSelectedEstimateJobId(String(jobId || '')),
  }), [
    availabilityData,
    clearMoveDateSection,
    daysUntilMove,
    fetchAvailability,
    form.move_date,
    form.move_size,
    isAvailabilityLoading,
    isLeadPath,
    isMoveDateEditing,
    isMoveDateSaving,
    moveDateDraft,
    moverSizes,
    primaryPlannedJob?.move_date,
    opportunity?.branch,
    opportunity?.branch_details?.name,
    opportunity?.crew_size,
    opportunity?.estimated_hours,
    opportunity?.move_date_time,
    opportunity?.arrival_window_start,
    opportunity?.arrival_window_end,
    opportunity?.truck_count,
    opportunity?.move_size,
    resolveMoveSizeName,
    saveMoveDateSection,
    selectedEstimateJobId,
    startMoveDateEdit,
    cancelMoveDateEdit,
    updateSelectedEstimateJobPlanning,
    loadOpportunityJobs,
  ]);

  function activityTypeForTab(tab) {
    if (tab === 'email') return 'email';
    if (tab === 'call') return 'call';
    if (tab === 'text') return 'sms';
    return 'note';
  }

  const handleWorkflowAction = async (actionKey, reasonOverride = '') => {
    if (!opportunity?.id || opportunity.id === 'new') return;

    if (actionKey === 'send_estimate') {
      navigateToEstimateSubTab('charges');
      setSendEstimateNonce((v) => v + 1);
      return;
    }

    if ((actionKey === 'lost' || actionKey === 'cancel') && !String(reasonOverride || '').trim()) {
      setSelectedLostReason('');
      setReasonText('');
      setReasonAction(actionKey);
      setIsReasonModalOpen(true);
      return;
    }

    setIsSaving(true);
    setToast({ type: '', text: '' });

    try {
      let updated;
      const workflowReason = String(reasonOverride || reasonText || '').trim();
      if (view.isLead && actionKey === 'lost') {
        setLostReasonOverride(workflowReason || 'Marked lost from CRM detail page');
        updated = await markLeadLost(opportunity.id, {
          reason: workflowReason || 'Marked lost from CRM detail page',
        });
      } else if (view.isLead && actionKey === 'reopen') {
        setLostReasonOverride('');
        updated = await reopenLead(opportunity.id, { reason: 'Reopened from CRM detail page' });
      } else if (actionKey === 'book') {
        setIsBookJobModalOpen(true);
        setIsSaving(false);
        return;
      } else if (actionKey === 'confirm') {
        updated = await confirmOpportunityJob(opportunity.id);
        try {
          const jobs = await api.jobs.getJobs({ opportunity: opportunity.id });
          const rows = Array.isArray(jobs?.results) ? jobs.results : Array.isArray(jobs) ? jobs : [];
          const job = rows[0] || null;
          if (job?.id) {
            navigate(`/jobs/${job.id}`);
            return;
          }
          navigate('/jobs');
          return;
        } catch {
          // If dispatch lookup fails, fall back to current page and normal refresh.
        }
      } else if (actionKey === 'cancel') {
        updated = await cancelOpportunityJob(opportunity.id, {
          reason: workflowReason || 'Canceled from CRM detail page',
        });
      } else if (actionKey === 'unbook') {
        setUnbookReason(workflowReason || '');
        setUnbookNote('');
        setIsUnbookModalOpen(true);
        setIsSaving(false);
        return;
      } else if (actionKey === 'complete') {
        updated = await completeOpportunityJob(opportunity.id);
      } else if (actionKey === 'lost') {
        setLostReasonOverride(workflowReason || 'Marked lost from CRM detail page');
        updated = await markOpportunityLost(opportunity.id, {
          reason: workflowReason || 'Marked lost from CRM detail page',
        });
      } else if (actionKey === 'reopen') {
        setLostReasonOverride('');
        updated = await reopenOpportunity(opportunity.id, { reason: 'Reopened from CRM detail page' });
      } else {
        return;
      }

      if (actionKey === 'lost' || actionKey === 'cancel') {
        setIsReasonModalOpen(false);
        setReasonAction('');
        setSelectedLostReason('');
        setReasonText('');
      }

      setOpportunity(updated);
      await fetchOpportunity();
      setToast({ type: 'success', text: 'Workflow updated successfully.' });
      setTimeout(() => setToast({ type: '', text: '' }), 2500);
    } catch (err) {
      setToast({ type: 'error', text: getErrorMessage(err, 'Failed to update workflow.') });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateEstimate = useCallback(async () => {
    if (!opportunity?.id || opportunity.id === 'new') return;
    setIsSaving(true);
    setToast({ type: '', text: '' });
    try {
      const res = await convertLead(opportunity.id);
      const convertedOpportunity = res?.opportunity || res?.data?.opportunity || null;
      const oppId = convertedOpportunity?.id;
      setToast({ type: 'success', text: 'Lead converted! Opening estimate...' });
      if (convertedOpportunity) {
        navigate(getRecordEstimateTabPath('opportunity', convertedOpportunity, 'charges'));
      } else if (oppId) {
        navigate(getLegacyRecordEstimateTabPath('opportunity', oppId, 'charges'));
      } else {
        navigate(getRecordListPath('opportunity'));
      }
    } catch (err) {
      console.error('Lead conversion failed:', {
        leadId: opportunity?.id,
        responseStatus: err?.response?.status,
        responseData: err?.response?.data,
      });
      setToast({ type: 'error', text: getErrorMessage(err, 'Failed to convert lead.') });
      setIsSaving(false);
    }
  }, [navigate, opportunity?.id]);

  const saveEstimateRequirementsToOpportunity = useCallback(async (target) => {
    if (isLeadPath || !opportunity?.id || opportunity.id === 'new') {
      throw new Error('Estimate prerequisites can only be saved for existing opportunities.');
    }

    let finalCustomerId = resolveCustomerId(opportunity?.customer_details, opportunity?.customer);
    if (!finalCustomerId) {
      const createdCustomer = await createCustomer({
        first_name: String(target.first_name || '').trim(),
        last_name: String(target.last_name || '').trim(),
        email: String(target.email || '').trim(),
        primary_phone: String(target.phone || '').trim(),
      });
      finalCustomerId = createdCustomer?.id;
    } else {
      const currentCustomer = opportunity?.customer_details || {};
      const nextCustomerPayload = {
        first_name: String(target.first_name || '').trim(),
        last_name: String(target.last_name || '').trim(),
        email: String(target.email || '').trim(),
        primary_phone: String(target.phone || '').trim(),
      };
      const customerChanged =
        String(nextCustomerPayload.first_name || '') !== String(currentCustomer.first_name || '') ||
        String(nextCustomerPayload.last_name || '') !== String(currentCustomer.last_name || '') ||
        String(nextCustomerPayload.email || '') !== String(currentCustomer.email || '') ||
        String(nextCustomerPayload.primary_phone || '') !== String(currentCustomer.primary_phone || '');
      if (customerChanged) {
        await updateCustomer(finalCustomerId, nextCustomerPayload);
      }
    }

    let originCity = String(target.origin_city || '').trim();
    let originState = String(target.origin_state || '').trim();
    let originZip = String(target.origin_zip || '').trim();
    if (!originCity || !originState || !originZip) {
      const parsed = parseAddressString(target.origin_street);
      if (!originCity) originCity = parsed.city;
      if (!originState) originState = parsed.state;
      if (!originZip) originZip = parsed.postal_code;
    }

    let destCity = String(target.destination_city || '').trim();
    let destState = String(target.destination_state || '').trim();
    let destZip = String(target.destination_zip || '').trim();
    if (!destCity || !destState || !destZip) {
      const parsed = parseAddressString(target.destination_street);
      if (!destCity) destCity = parsed.city;
      if (!destState) destState = parsed.state;
      if (!destZip) destZip = parsed.postal_code;
    }

    const resolvedServiceTypeId = normalizeLookupValue(target.service_type);
    const resolvedMoveTypeId = normalizeLookupValue(target.move_type);

    await updateOpportunity(opportunity.id, omitBlankStrings({
      customer: finalCustomerId ? Number(finalCustomerId) : null,
      service_type: resolvedServiceTypeId || null,
      move_date: target.move_date || null,
      arrival_window_start: target.arrival_window_start || null,
      arrival_window_end: target.arrival_window_end || null,
      mover_size: target.move_size ? Number(target.move_size) : null,
      move_type: resolvedMoveTypeId || null,
      branch: target.branch ? Number(target.branch) : null,
      assigned_user: target.assigned_to ? Number(target.assigned_to) : null,
      referral_source: target.referral_source ? Number(target.referral_source) : null,
      utm_source: target.utm_source,
      notes_internal: target.notes,
      origin_address_line1: String(target.origin_street || '').trim(),
      origin_city: originCity,
      origin_state: originState,
      origin_postal_code: originZip,
      destination_address_line1: String(target.destination_street || '').trim(),
      destination_city: destCity,
      destination_state: destState,
      destination_postal_code: destZip,
      origin_unit_number: target.origin_unit_number,
      origin_property_type: target.origin_property_type,
      origin_parking_type: target.origin_parking_type,
      origin_flights_of_stairs: target.origin_flights_of_stairs,
      origin_has_elevator: target.origin_has_elevator,
      origin_walk_distance_ft: target.origin_walk_distance_ft,
      destination_unit_number: target.destination_unit_number,
      destination_property_type: target.destination_property_type,
      destination_parking_type: target.destination_parking_type,
      destination_flights_of_stairs: target.destination_flights_of_stairs,
      destination_has_elevator: target.destination_has_elevator,
      destination_walk_distance_ft: target.destination_walk_distance_ft,
    }));

    setForm((prev) => ({ ...prev, ...target }));
    await fetchOpportunity();
  }, [fetchOpportunity, isLeadPath, opportunity]);

  const createOpportunityEstimateRecord = useCallback(async () => {
    const res = await createEstimate({
      opportunity: opportunity.id,
      method: 'manual',
    });
    setEstimateSummary(res);
    setToast({ type: 'success', text: 'Estimate created successfully!' });
    navigateToEstimateSubTab('charges');
    return res;
  }, [navigateToEstimateSubTab, opportunity?.id]);

  const handleCreateOpportunityEstimate = useCallback(async () => {
    if (!opportunity?.id || opportunity.id === 'new') return;
    const snapshot = buildCurrentOpportunityFormSnapshot();
    const requirementError = validateEstimateRequirements(snapshot);
    if (requirementError) {
      openEstimateRequirementsModal(snapshot);
      return;
    }

    setIsSaving(true);
    setToast({ type: '', text: '' });
    try {
      await createOpportunityEstimateRecord();
    } catch (err) {
      setToast({ type: 'error', text: getErrorMessage(err, 'Failed to create estimate.') });
    } finally {
      setIsSaving(false);
    }
  }, [buildCurrentOpportunityFormSnapshot, createOpportunityEstimateRecord, openEstimateRequirementsModal, opportunity?.id]);

  const handleSaveEstimateRequirementsAndCreate = useCallback(async () => {
    if (!estimateRequirementsDraft) return;

    const validationError = validateEstimateRequirements(estimateRequirementsDraft);
    if (validationError) {
      setEstimateRequirementsError(validationError);
      return;
    }

    setIsSavingEstimateRequirements(true);
    setEstimateRequirementsError('');
    setToast({ type: '', text: '' });
    try {
      await saveEstimateRequirementsToOpportunity(estimateRequirementsDraft);
      setIsEstimateRequirementsModalOpen(false);
      setEstimateRequirementsDraft(null);
      await createOpportunityEstimateRecord();
    } catch (err) {
      setEstimateRequirementsError(getErrorMessage(err, 'Failed to save the required estimate data.'));
    } finally {
      setIsSavingEstimateRequirements(false);
    }
  }, [createOpportunityEstimateRecord, estimateRequirementsDraft, saveEstimateRequirementsToOpportunity]);

  const activeSpecs = specsDraft || form;
  const selectedAssignedUser = useMemo(() => {
    const assignedId = String(
      activeSpecs.assigned_to ||
      opportunity?.assigned_user_id ||
      opportunity?.assigned_user ||
      opportunity?.assigned_to_id ||
      opportunity?.assigned_to ||
      ''
    ).trim();
    if (!assignedId) return null;
    return branchScopedUsers.find((u) => String(u.id) === assignedId)
      || assignableUsers.find((u) => String(u.id) === assignedId)
      || null;
  }, [activeSpecs.assigned_to, assignableUsers, branchScopedUsers, opportunity?.assigned_to, opportunity?.assigned_to_id, opportunity?.assigned_user, opportunity?.assigned_user_id]);

  const isUserValidForBranch = useCallback((user, branchId) => {
    if (!user) return false;
    if (!branchId) return true;
    return getUserBranchIds(user).includes(String(branchId));
  }, []);

  const selectedBranch = useMemo(() => {
    const branchId = String(activeSpecs.branch || '').trim();
    if (!branchId) return null;
    return branches.find((b) => String(b.id) === branchId) || null;
  }, [activeSpecs.branch, branches]);

  const selectedBranchLogoUrl = useMemo(() => (
    String(
      selectedBranch?.effective_logo_url ||
      selectedBranch?.logo_url ||
      selectedBranch?.logo ||
      opportunity?.branch_details?.effective_logo_url ||
      opportunity?.branch_details?.logo_url ||
      opportunity?.branch_details?.logo ||
      ''
    ).trim()
  ), [opportunity?.branch_details?.effective_logo_url, opportunity?.branch_details?.logo, opportunity?.branch_details?.logo_url, selectedBranch]);
  const selectedBranchName = useMemo(() => (
    String(
      selectedBranch?.name ||
      opportunity?.branch_details?.name ||
      ''
    ).trim()
  ), [opportunity?.branch_details?.name, selectedBranch]);
  const selectedBranchId = useMemo(() => (
    String(
      estimateSummary?.branch_id ||
      estimateSummary?.branch?.id ||
      opportunity?.branch_details?.id ||
      opportunity?.branch_id ||
      opportunity?.branch?.id ||
      selectedBranch?.id ||
      ''
    ).trim()
  ), [estimateSummary?.branch?.id, estimateSummary?.branch_id, opportunity?.branch?.id, opportunity?.branch_details?.id, opportunity?.branch_id, selectedBranch]);

  const assignedUserOptions = useMemo(() => {
    const source = branchScopedUsers.length ? branchScopedUsers : assignableUsers;
    const seen = new Set();
    return source
      .map((user) => {
        const id = String(user?.id || '');
        if (!id || seen.has(id)) return null;
        seen.add(id);
        return {
          ...user,
          label: resolveUserLabel(user),
        };
      })
      .filter(Boolean);
  }, [assignableUsers, branchScopedUsers, resolveUserLabel]);

  const selectedReferralSource = useMemo(() => {
    const referralId = String(activeSpecs.referral_source || '').trim();
    if (!referralId) return null;
    return referralSources.find((r) => String(r.id) === referralId) || null;
  }, [activeSpecs.referral_source, referralSources]);

  const lostReason = useMemo(() => {
    const currentStage = String(opportunity?.workflow_stage || '').toLowerCase();
    if (currentStage !== 'lost') return '';
    if (String(lostReasonOverride || '').trim()) return String(lostReasonOverride).trim();

    const match = (timelineEvents || []).find((event) => {
      const eventType = String(event?.event_type || '').toLowerCase();
      const sourceAction = String(event?.payload?.source_action || '').toLowerCase();
      const toStage = String(event?.payload?.to_stage || '').toLowerCase();
      const toStatus = String(event?.payload?.to_status || '').toLowerCase();
      return (
        sourceAction === 'mark_lost' ||
        (eventType === 'workflow.changed' && toStage === 'lost') ||
        toStatus === 'lost'
      );
    });

    return String(
      match?.payload?.reason ||
      match?.summary ||
      ''
    ).trim();
  }, [lostReasonOverride, opportunity?.workflow_stage, timelineEvents]);

  const specsData = useMemo(() => [
    { 
      id: "move_size", 
      label: "Move size", 
      value: activeSpecs.move_size, 
      displayValue: resolveMoveSizeName(activeSpecs.move_size, [...(Array.isArray(moverSizes) ? moverSizes : []), opportunity?.mover_size_details, opportunity?.move_size_details].filter(Boolean)) || opportunity?.mover_size_details?.name || opportunity?.move_size_details?.name || activeSpecs.move_size, 
      icon: "home", 
      options: moverSizes 
    },
    { 
      id: "move_type", 
      label: "Move type", 
      value: activeSpecs.move_type, 
      displayValue: opportunity?.move_type_name || resolveSpecLookupLabel(activeSpecs.move_type, moverTypes) || resolveSpecLookupLabel(activeSpecs.move_type, MOVE_TYPE_OPTIONS), 
      icon: "map", 
      options: moverTypes.length ? moverTypes : MOVE_TYPE_OPTIONS 
    },
    { 
      id: "service_type", 
      label: "Service tier", 
      value: activeSpecs.service_type, 
      displayValue: opportunity?.service_type_name || resolveSpecLookupLabel(activeSpecs.service_type, serviceTypes) || resolveSpecLookupLabel(activeSpecs.service_type, SERVICE_TYPE_OPTIONS), 
      icon: "package", 
      options: serviceTypes.length ? serviceTypes : SERVICE_TYPE_OPTIONS 
    },
    { 
      id: "branch", 
      label: "Branch", 
      value: activeSpecs.branch, 
      // Use branch_details from the API response as primary source — always available on load
      displayValue: selectedBranchName || opportunity?.branch_details?.name || '',
      initialLabel: selectedBranchName || opportunity?.branch_details?.name || '',
      icon: "users", 
      fetchOptions: getBranchLookupsPage,
      labelField: "name",
      options: branches 
    },
    {
      id: "referral_source",
      label: "Referral source",
      value: activeSpecs.referral_source,
      displayValue:
        selectedReferralSource?.name ||
        selectedReferralSource?.label ||
        opportunity?.referral_source_details?.name ||
        opportunity?.referral_source_details?.label ||
        activeSpecs.utm_source ||
        activeSpecs.referral_source ||
        '',
      icon: "compass",
      options: referralSources
    },
    {
      id: "assigned_to",
      label: "Assigned",
      value: activeSpecs.assigned_to,
      // Use assigned_to_details from the API response as primary source — always available on load.
      // Fall back to committedSpecsLabels for when the user was selected via async lookup
      // and the PATCH response did not include nested assigned_to_details.
      initialLabel:
        resolveUserLabel(selectedAssignedUser) ||
        resolveUserLabel(opportunity?.assigned_user_details) ||
        resolveUserLabel(opportunity?.assigned_to_details) ||
        resolveUserLabel(opportunity?.assigned_user) ||
        resolveUserLabel(opportunity?.assigned_to) ||
        specsDraftLabels.assigned_to ||
        'Unassigned',
      displayValue:
        resolveUserLabel(selectedAssignedUser) ||
        resolveUserLabel(opportunity?.assigned_user_details) ||
        resolveUserLabel(opportunity?.assigned_to_details) ||
        resolveUserLabel(opportunity?.assigned_user) ||
        resolveUserLabel(opportunity?.assigned_to) ||
        committedSpecsLabels.assigned_to ||
        'Unassigned',
      icon: "user",
      fetchOptions: (search, offset, limit) => getLookupUsersPage(search, offset, limit, activeSpecs.branch || selectedBranch?.id || null),
      cacheKey: activeSpecs.branch || selectedBranch?.id || 'no-branch',
      labelField: "label",
      options: assignedUserOptions,
    },
    {
      id: "custom_status_code",
      label: "Custom Status",
      value: activeSpecs.custom_status_code || '',
      // Use custom_status_code_details from the API response as primary source — always available on load
      initialLabel: selectedCustomStatusCode?.label || opportunity?.custom_status_code_details?.label || '',
      displayValue: selectedCustomStatusCode?.label || opportunity?.custom_status_code_details?.label || '',
      icon: "activity",
      fetchOptions: (search, offset, limit) => getStatusCodeLookupsPage(search, offset, limit),
      // cacheKey keeps AsyncSelect stable on the company-wide list
      cacheKey: 'company-wide-status-codes',
      labelField: "label",
      options: customStatusCodes,
    },
  ], [activeSpecs, opportunity, moverSizes, branches, selectedBranch, selectedBranchName, selectedReferralSource, selectedAssignedUser, referralSources, branchScopedUsers, customStatusCodes, selectedCustomStatusCode, titleCase, specsDraftLabels, committedSpecsLabels, statusBranchId]);

	  const headerActions = useMemo(() => {
	    if (opportunity?.id === 'new') return [];
	    if (!canViewOpportunity()) return [];

	    if (view.isLead) {
	      if (String(opportunity?.workflow_stage || '').toLowerCase() === 'opportunity' || opportunity?.opportunity_id || opportunity?.opportunity) {
	        return [];
	      } else {
	        if (!canCreateOpportunity()) return [];
	        return [
	          {
	            type: 'primary',
	            label: 'Create Estimate',
	            icon: 'plus',
	            onClick: handleCreateEstimate,
	          },
	        ];
	      }
	    } else {
	      if (!estimateSummary) {
	        return [
	          {
	            type: 'primary',
	            label: 'Create Estimate',
	            icon: 'plus',
	            onClick: handleCreateOpportunityEstimate,
	          },
	        ];
	      }
	    }
	    return [];
	  }, [
	    handleCreateEstimate,
	    handleCreateOpportunityEstimate,
	    opportunity?.id,
	    opportunity?.workflow_stage,
	    opportunity?.opportunity_id,
	    opportunity?.opportunity,
	    view.isLead,
	    estimateSummary,
	    activeTab,
	    navigate,
	    navigateToDetailTab,
	    navigateToEstimateSubTab,
	    canViewOpportunity,
	    canCreateOpportunity,
	  ]);

  useEffect(() => {
    if (activeTab !== 'Estimate' || !pendingEstimateHeaderAction) return;
    if (pendingEstimateHeaderAction === 'send') {
      setSendEstimateNonce((prev) => prev + 1);
    } else {
      setTriggerViewEstimateNonce((prev) => prev + 1);
    }
    setPendingEstimateHeaderAction('');
  }, [activeTab, pendingEstimateHeaderAction]);

  const headerMenuActions = useMemo(() => {
    const items = [];

    const openEstimateAction = (action) => {
      setActiveTab('Estimate');
      navigateToDetailTab('Estimate');
      setPendingEstimateHeaderAction(action);
    };

    items.push({ type: 'label', label: 'Quick' });
    if (canCreateTask()) {
      items.push({ label: 'Add Follow-up', icon: 'calendar-plus', onClick: openCreateFollowUpModal });
    }
    if (!estimateSummary && canCreateOpportunity()) {
      items.push({ 
        label: "Create Estimate", 
        icon: "plus", 
        onClick: () => {
          if (view.isLead) {
            handleCreateEstimate();
          } else {
            handleCreateOpportunityEstimate();
          }
        }
      });
    }
    items.push({
      label: 'Send Estimate',
      icon: 'send',
      onClick: () => {
        if (activeTab !== 'Estimate') {
          navigateToEstimateSubTab('charges');
          setTimeout(() => setSendEstimateNonce((prev) => prev + 1), 300);
        } else {
          setSendEstimateNonce((prev) => prev + 1);
        }
      },
    });
    items.push({
      label: 'View Estimate',
      icon: 'external-link',
      onClick: () => {
        if (activeTab !== 'Estimate') {
          navigateToEstimateSubTab('charges');
          setTimeout(() => setTriggerViewEstimateNonce((prev) => prev + 1), 300);
        } else {
          setTriggerViewEstimateNonce((prev) => prev + 1);
        }
      },
    });

    if (canEditOpportunity() && String(opportunity?.workflow_stage || '').toLowerCase() === 'booked') {
      items.push({ type: 'separator' });
      items.push({ type: 'label', label: 'Booking' });
      items.push({
        label: 'Unbook Job',
        icon: 'calendar-x',
        onClick: () => {
          setUnbookReason('');
          setUnbookNote('');
          setIsUnbookModalOpen(true);
        },
      });
    }

    if (opportunity?.id && opportunity.id !== 'new' && canDuplicateOpportunity()) {
      items.push({ type: 'separator' });
      items.push({ type: 'label', label: 'Record' });
      items.push({
        label: isLeadPath ? 'Duplicate Lead' : 'Duplicate',
        icon: 'layers',
        onClick: () => {
          setDuplicateOptions({ clearMoveDate: false, openNewRecord: true });
          setIsDuplicateConfirmOpen(true);
        },
      });
    }

    if (workflowActions?.length) {
      items.push({ type: 'separator' });
      items.push({ type: 'label', label: 'Workflow' });
      workflowActions.forEach((action) => {
        const icon =
          action.key === 'lost'
            ? 'x-circle'
            : action.key === 'reopen'
              ? 'refresh-cw'
              : action.key === 'book'
                ? 'calendar-check-2'
                : action.key === 'confirm'
                  ? 'check-circle-2'
                  : action.key === 'cancel'
                    ? 'ban'
                    : action.key === 'complete'
                      ? 'check'
                      : undefined;
        items.push({
          label: action.label,
          icon,
          onClick: () => handleWorkflowAction(action.key),
        });
      });
    }

    if (canManageActivityHistory()) {
      items.push({ type: 'separator' });
      items.push({ type: 'label', label: 'Activity' });
      items.push({ label: 'Activities', icon: 'clipboard-list', onClick: () => setIsActivityDrawerOpen(true) });
    }

    if (activeTab === 'Accounting' && selectedAccountingJobId && invoiceDetailsMap?.[selectedAccountingJobId]) {
      items.push({ type: 'separator' });
      items.push({ type: 'label', label: 'Invoice' });
      items.push({
        label: 'Send Invoice',
        icon: 'send',
        onClick: handleOpenOpportunityInvoicePreview,
      });
      items.push({
        label: 'Re-finalize',
        icon: 'refresh-cw',
        onClick: () => handleRefinalizeInvoice(selectedAccountingJobId),
      });
    }

    return items.filter((item) => {
      if (!item || item.type) return true;
      if (item.label === 'Duplicate' || item.label === 'Duplicate Lead') {
        return canDuplicateOpportunity();
      }
      if (item.label === 'Book Job') {
        return canBookOpportunity();
      }
      if (item.label === 'Mark Lost') {
        return canMarkOpportunityLost();
      }
      if (item.label === 'Activities') {
        return canManageActivityHistory();
      }
      if (item.label === 'Add Follow-up') {
        return canCreateTask();
      }
      return true;
    });
  }, [
    activeTab,
    canBookOpportunity,
    canCreateOpportunity,
    canCreateTask,
    canDuplicateOpportunity,
    canEditOpportunity,
    canManageActivityHistory,
    canMarkOpportunityLost,
    canViewOpportunity,
    estimateSummary,
    handleCreateEstimate,
    handleCreateOpportunityEstimate,
    handleOpenOpportunityInvoicePreview,
    handleRefinalizeInvoice,
    handleWorkflowAction,
    invoiceDetailsMap,
    isLeadPath,
    navigateToEstimateSubTab,
    openCreateFollowUpModal,
    opportunity?.id,
    opportunity?.workflow_stage,
    selectedAccountingJobId,
    setDuplicateOptions,
    setIsActivityDrawerOpen,
    setIsDuplicateConfirmOpen,
    view.isLead,
    workflowActions,
  ]);
   
  const inventorySnapshotData = useMemo(() => {
   
    const estimateItems = Array.isArray(estimatePortalInventory)
      ? estimatePortalInventory
      : Array.isArray(estimateSummary?.portal_inventory_items)
        ? estimateSummary.portal_inventory_items
        : Array.isArray(opportunity?.portal_inventory_items)
          ? opportunity.portal_inventory_items
          : [];
    const leadItems = Array.isArray(opportunity?.lead_details?.portal_inventory_items)
      ? opportunity.lead_details.portal_inventory_items
      : Array.isArray(estimateOpportunity?.lead_details?.portal_inventory_items)
        ? estimateOpportunity.lead_details.portal_inventory_items
        : [];

    const sourceItems = [...leadItems, ...estimateItems];

    const grouped = new globalThis.Map();
    let totalQty = 0;
    let totalVol = 0;

    sourceItems.forEach((item) => {
      const roomName = String(item?.room_name || 'General').trim() || 'General';
      const qty = Number(item?.quantity || 0);
      const safeQty = Number.isFinite(qty) ? qty : 0;
      grouped.set(roomName, (grouped.get(roomName) || 0) + safeQty);
      totalQty += safeQty;
      totalVol += safeQty * Number(item?.volume_cuft_each || 0);
    });
    console.log('inventorySnapshotData', {
      sourceItems,
      grouped,
      totalQty,
      totalVol,
    });
    return {
      roomCount: grouped.size,
      totalQty,
      totalVol,
      items: [...grouped.entries()]
        .map(([name, qty]) => ({ name, qty }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [
    estimatePortalInventory,
    estimateSummary?.portal_inventory_items,
    opportunity?.portal_inventory_items,
    opportunity?.lead_details?.portal_inventory_items,
    estimateOpportunity?.lead_details?.portal_inventory_items,
  ]);

  if (isLoading) return <div className="flex items-center justify-center h-[80vh]"><Loader2 className="w-12 h-12 text-primary animate-spin" /></div>;
  if (!opportunity) return (
    <div className="max-w-[1400px] mx-auto">
      <Card className="p-6 rounded-2xl border border-subtle">
        <p className="text-sm font-bold text-[#791F1F]">{isLeadPath ? 'Lead' : 'Opportunity'} not found.</p>
      </Card>
    </div>
  );

  const handleSaveOpportunity = async () => {
    if (!requiresAnyPermission([PERMISSIONS.LEAD_EDIT, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to save this record.');
    }
    if (!requiresAnyPermission([PERMISSIONS.LEAD_EDIT, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to save this record.');
    }
    const targetCustomer = isCreation && customerDraft ? { ...form, ...customerDraft } : form;
    const targetRoute = isCreation && routeDraft ? { ...form, ...routeDraft } : form;
    const targetSpecs = isCreation && specsDraft ? { ...form, ...specsDraft } : form;
    const targetMoveDate = isCreation && moveDateDraft ? { ...form, ...moveDateDraft } : form;

    const validationError = validateOpportunityForm(targetCustomer, targetRoute, targetSpecs, targetMoveDate);
    if (validationError) {
      setToast({ type: 'error', text: validationError });
      return;
    }

    setIsSaving(true);
    setToast({ type: '', text: '' });
    try {
      const customStatusCodeId = Number(targetSpecs.custom_status_code || form.custom_status_code);
      const resolvedCustomStatusCode =
        Number.isInteger(customStatusCodeId) && customStatusCodeId > 0 ? customStatusCodeId : null;

      if (isLeadPath) {
        let originCity = String(targetRoute.origin_city || '').trim();
        let originState = String(targetRoute.origin_state || '').trim();
        let originZip = String(targetRoute.origin_zip || '').trim();
        if (!originCity || !originState || !originZip) {
          const parsed = parseAddressString(targetRoute.origin_street);
          if (!originCity) originCity = parsed.city;
          if (!originState) originState = parsed.state;
          if (!originZip) originZip = parsed.postal_code;
        }

        let destCity = String(targetRoute.destination_city || '').trim();
        let destState = String(targetRoute.destination_state || '').trim();
        let destZip = String(targetRoute.destination_zip || '').trim();
        if (!destCity || !destState || !destZip) {
          const parsed = parseAddressString(targetRoute.destination_street);
          if (!destCity) destCity = parsed.city;
          if (!destState) destState = parsed.state;
          if (!destZip) destZip = parsed.postal_code;
        }

        const payload = omitBlankStrings({
          first_name: targetCustomer.first_name,
          last_name: targetCustomer.last_name,
          email: targetCustomer.email,
          phone: targetCustomer.phone,
          custom_status_code: resolvedCustomStatusCode,
          service_type: targetSpecs.service_type,
          move_date: targetMoveDate.move_date || null,
          move_size: targetSpecs.move_size,
          move_type: targetSpecs.move_type,
          branch: targetSpecs.branch ? Number(targetSpecs.branch) : null,
          assigned_to: targetSpecs.assigned_to ? Number(targetSpecs.assigned_to) : null,
          referral_source: targetSpecs.referral_source ? Number(targetSpecs.referral_source) : null,
          utm_source: targetSpecs.utm_source,
          notes: targetSpecs.notes,
          origin_address_line1: String(targetRoute.origin_street || '').trim(),
          origin_city: originCity,
          origin_state: originState,
          origin_zip: originZip,
          destination_address_line1: String(targetRoute.destination_street || '').trim(),
          destination_city: destCity,
          destination_state: destState,
          destination_zip: destZip,
          origin_unit_number: targetRoute.origin_unit_number,
          origin_property_type: targetRoute.origin_property_type,
          origin_parking_type: targetRoute.origin_parking_type,
          origin_flights_of_stairs: targetRoute.origin_flights_of_stairs,
          origin_has_elevator: targetRoute.origin_has_elevator,
          origin_walk_distance_ft: targetRoute.origin_walk_distance_ft,
          destination_unit_number: targetRoute.destination_unit_number,
          destination_property_type: targetRoute.destination_property_type,
          destination_parking_type: targetRoute.destination_parking_type,
          destination_flights_of_stairs: targetRoute.destination_flights_of_stairs,
          destination_has_elevator: targetRoute.destination_has_elevator,
          destination_walk_distance_ft: targetRoute.destination_walk_distance_ft,
        });
        const updated = isCreation ? await createLead(payload) : await updateLead(opportunity.id, payload);
        const leadId = updated?.id || opportunity?.id;
        const existingOpportunityId = updated?.opportunity_id || opportunity?.opportunity_id || null;
        const syncOpportunityStatus = async (oppId) => {
          if (!oppId) return null;
          return updateOpportunity(oppId, {
            custom_status_code: resolvedCustomStatusCode,
          });
        };

        if (existingOpportunityId) {
          const syncedOpportunity = await syncOpportunityStatus(existingOpportunityId);
          if (syncedOpportunity) {
            setEstimateOpportunity(syncedOpportunity);
          }
        }

        if (selectedCustomStatusStage === 'opportunity') {
          if (existingOpportunityId) {
            setOpportunity(updated);
            closeAllEditSections();
            setToast({ type: 'success', text: 'Lead updated. Opening the linked opportunity...' });
	            navigate(getRecordEstimateTabPath('opportunity', syncedOpportunity || { id: existingOpportunityId }, 'charges'));
            return;
          }

          const conversion = await convertLead(leadId);
          const convertedOpportunity = conversion?.opportunity || conversion?.data?.opportunity || null;
          const oppId = convertedOpportunity?.id;
          const syncedOpportunity = await syncOpportunityStatus(oppId);
          if (syncedOpportunity) {
            setEstimateOpportunity(syncedOpportunity);
          }
          setToast({ type: 'success', text: 'Lead converted to opportunity.' });
          closeAllEditSections();
	          if (syncedOpportunity || convertedOpportunity) {
	            navigate(getRecordEstimateTabPath('opportunity', syncedOpportunity || convertedOpportunity, 'charges'));
	          } else if (oppId) {
	            navigate(getLegacyRecordEstimateTabPath('opportunity', oppId, 'charges'));
	          } else {
	            navigate(getRecordListPath('opportunity'));
	          }
          return;
        }

        setOpportunity(updated);
        if (isCreation) navigate(getRecordDetailPath('lead', updated));
        try {
          const leadIdForTimeline = Number(updated?.id || opportunity?.id || id);
          const oppIdForTimeline = Number(updated?.opportunity_id || opportunity?.opportunity_id || 0) || null;
          fetchUnifiedTimeline({ leadId: leadIdForTimeline, opportunityId: oppIdForTimeline });
        } catch {
          // Ignore timeline refresh errors.
        }
      } else {
        let finalCustomerId = resolveCustomerId(opportunity?.customer_details, opportunity?.customer);
        if (!finalCustomerId && isCreation) {
          const createdCustomer = await createCustomer({
            first_name: targetCustomer.first_name,
            last_name: targetCustomer.last_name,
            email: targetCustomer.email,
            primary_phone: targetCustomer.phone,
          });
          finalCustomerId = createdCustomer.id;
        } else if (finalCustomerId) {
          const currentCustomer = opportunity?.customer_details || {};
          const nextCustomerPayload = {
            first_name: targetCustomer.first_name,
            last_name: targetCustomer.last_name,
            email: targetCustomer.email,
            primary_phone: targetCustomer.phone,
          };
          const customerChanged =
            String(nextCustomerPayload.first_name || '') !== String(currentCustomer.first_name || '') ||
            String(nextCustomerPayload.last_name || '') !== String(currentCustomer.last_name || '') ||
            String(nextCustomerPayload.email || '') !== String(currentCustomer.email || '') ||
            String(nextCustomerPayload.primary_phone || '') !== String(currentCustomer.primary_phone || '');
          if (customerChanged) {
            await updateCustomer(finalCustomerId, nextCustomerPayload);
          }

          const contactPayload = {
            name: selectedAdditionalContactForm.name.trim(),
            email: selectedAdditionalContactForm.email.trim(),
            phone: selectedAdditionalContactForm.phone.trim(),
            phone_type: selectedAdditionalContactForm.phone_type.trim(),
            relationship: selectedAdditionalContactForm.relationship.trim(),
            is_primary: false,
          };
          if (hasContactValues(contactPayload)) {
            if (!contactPayload.name) {
              setAdditionalContactError('Additional contact name is required to save contact details.');
            } else {
              setAdditionalContactError('');
              let savedContact = null;
              const existingContact = customerAdditionalContacts[selectedAdditionalContactIndex] || null;
              const contactId = Number(selectedAdditionalContactForm.id || existingContact?.id || 0) || null;
              if (contactId) {
                const contactChanged =
                  String(contactPayload.name || '') !== String(existingContact?.name || '') ||
                  String(contactPayload.email || '') !== String(existingContact?.email || '') ||
                  String(contactPayload.phone || '') !== String(existingContact?.phone || '') ||
                  String(contactPayload.phone_type || '') !== String(existingContact?.phone_type || '') ||
                  String(contactPayload.relationship || '') !== String(existingContact?.relationship || '');
                if (contactChanged) {
                  savedContact = await updateCustomerContact(contactId, contactPayload);
                } else {
                  savedContact = existingContact?.id ? existingContact : null;
                }
              } else {
                savedContact = await createCustomerContact({
                  ...contactPayload,
                  customer: finalCustomerId,
                });
              }

              if (savedContact?.id) {
                syncSavedCustomerContact(savedContact, finalCustomerId);
                const savedId = String(savedContact.id);
                setAdditionalContactForms((prev) =>
                  prev.map((row, rowIndex) =>
                    rowIndex === selectedAdditionalContactIndex
                      ? {
                          ...row,
                          id: savedId,
                        }
                      : row
                  )
                );
              }
            }
          }
        }

        let originCity = String(targetRoute.origin_city || '').trim();
        let originState = String(targetRoute.origin_state || '').trim();
        let originZip = String(targetRoute.origin_zip || '').trim();
        if (!originCity || !originState || !originZip) {
          const parsed = parseAddressString(targetRoute.origin_street);
          if (!originCity) originCity = parsed.city;
          if (!originState) originState = parsed.state;
          if (!originZip) originZip = parsed.postal_code;
        }

        let destCity = String(targetRoute.destination_city || '').trim();
        let destState = String(targetRoute.destination_state || '').trim();
        let destZip = String(targetRoute.destination_zip || '').trim();
        if (!destCity || !destState || !destZip) {
          const parsed = parseAddressString(targetRoute.destination_street);
          if (!destCity) destCity = parsed.city;
          if (!destState) destState = parsed.state;
          if (!destZip) destZip = parsed.postal_code;
        }

        const payload = omitBlankStrings({
          customer: finalCustomerId ? Number(finalCustomerId) : null,
          custom_status_code: resolvedCustomStatusCode,
          service_type: targetSpecs.service_type,
          move_date: targetMoveDate.move_date || null,
          arrival_window_start: targetMoveDate.arrival_window_start || null,
          arrival_window_end: targetMoveDate.arrival_window_end || null,
          mover_size: targetSpecs.move_size ? Number(targetSpecs.move_size) : null,
          move_type: targetSpecs.move_type,
          branch: targetSpecs.branch ? Number(targetSpecs.branch) : null,
          assigned_user: targetSpecs.assigned_to ? Number(targetSpecs.assigned_to) : null,
          referral_source: targetSpecs.referral_source ? Number(targetSpecs.referral_source) : null,
          utm_source: targetSpecs.utm_source,
          notes_internal: targetSpecs.notes,
          origin_address_line1: String(targetRoute.origin_street || '').trim(),
          origin_city: originCity,
          origin_state: originState,
          origin_postal_code: originZip,
          destination_address_line1: String(targetRoute.destination_street || '').trim(),
          destination_city: destCity,
          destination_state: destState,
          destination_postal_code: destZip,
          origin_unit_number: targetRoute.origin_unit_number,
          origin_property_type: targetRoute.origin_property_type,
          origin_parking_type: targetRoute.origin_parking_type,
          origin_flights_of_stairs: targetRoute.origin_flights_of_stairs,
          origin_has_elevator: targetRoute.origin_has_elevator,
          origin_walk_distance_ft: targetRoute.origin_walk_distance_ft,
          destination_unit_number: targetRoute.destination_unit_number,
          destination_property_type: targetRoute.destination_property_type,
          destination_parking_type: targetRoute.destination_parking_type,
          destination_flights_of_stairs: targetRoute.destination_flights_of_stairs,
          destination_has_elevator: targetRoute.destination_has_elevator,
          destination_walk_distance_ft: targetRoute.destination_walk_distance_ft,
        });
        const updated = isCreation ? await createOpportunity(payload) : await updateOpportunity(opportunity.id, payload);
        setOpportunity(updated);
        if (isCreation) navigate(getRecordDetailPath('opportunity', updated));
        try {
          const oppIdForTimeline = Number(updated?.id || opportunity?.id || id);
          const leadIdForTimeline = Number(updated?.lead || opportunity?.lead || 0) || null;
          fetchUnifiedTimeline({ leadId: leadIdForTimeline, opportunityId: oppIdForTimeline });
        } catch {
          // Ignore timeline refresh errors.
        }
      }
      closeAllEditSections();
      setToast({ type: 'success', text: `${isLeadPath ? 'Lead' : 'Opportunity'} ${isCreation ? 'created' : 'updated'} successfully.` });
      setTimeout(() => setToast({ type: '', text: '' }), 2500);
    } catch (err) {
      const detail =
        err?.response?.data?.detail
        || err?.response?.data?.email?.[0]
        || err?.response?.data?.phone?.[0]
        || err?.response?.data?.non_field_errors?.[0];
      setToast({ type: 'error', text: detail || `Failed to ${isCreation ? 'create' : 'update'} ${isLeadPath ? 'lead' : 'opportunity'}.` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicate = async ({ clearMoveDate = false, openNewRecord = true } = {}) => {
    if (!opportunity?.id || opportunity.id === 'new') return;
    let didNavigate = false;
    setIsSaving(true);
    setToast({ type: '', text: '' });
    try {
      const res = isLeadPath ? await duplicateLead(opportunity.id) : await duplicateOpportunity(opportunity.id);
      const data = res?.data || res;
      const newId = data?.id;
      if (newId && clearMoveDate) {
        try {
          if (isLeadPath) {
            await updateLead(newId, { move_date: null });
          } else {
            await updateOpportunity(newId, { move_date: null });
          }
        } catch {
          // Ignore field reset errors; duplication itself succeeded.
        }
      }
      if (newId) {
        setToast({ type: 'success', text: `${isLeadPath ? 'Lead' : 'Opportunity'} duplicated.` });
        if (openNewRecord) {
          didNavigate = true;
          navigate(getRecordDetailTabPath(isLeadPath ? 'lead' : 'opportunity', data, 'Sales'));
        }
      } else {
        didNavigate = true;
        navigate(getRecordListPath(isLeadPath ? 'lead' : 'opportunity'));
      }
    } catch (err) {
      setToast({ type: 'error', text: getErrorMessage(err, 'Failed to duplicate record.') });
      setIsSaving(false);
      return;
    } finally {
      if (!didNavigate) setIsSaving(false);
    }
  };

  const submitWorkflowReason = async () => {
    const trimmedReason = String(reasonText || '').trim();
    const selectedReasonLabel = String(selectedLostReason || '').trim();
    const finalReason = reasonAction === 'cancel'
      ? trimmedReason
      : [selectedReasonLabel, trimmedReason].filter(Boolean).join(': ');

    if (!finalReason) {
      setToast({
        type: 'error',
        text: reasonAction === 'cancel'
          ? 'Please enter a reason before canceling this job.'
          : 'Please select or enter a reason before marking this as lost.',
      });
      return;
    }

    await handleWorkflowAction(reasonAction || 'lost', finalReason);
  };

  const submitUnbook = async () => {
    if (!opportunity?.id || opportunity.id === 'new') return;

    const reason = String(unbookReason || '').trim();
    const note = String(unbookNote || '').trim();
    if (!reason) {
      setToast({ type: 'error', text: 'Please choose an unbook reason.' });
      return;
    }

    setIsSaving(true);
    setToast({ type: '', text: '' });
    try {
      const updated = await unbookOpportunityJob(opportunity.id, {
        reason,
        note: note || undefined,
      });
      setOpportunity(updated);
      await fetchOpportunity();
      setIsUnbookModalOpen(false);
      setToast({ type: 'success', text: 'Opportunity unbooked successfully.' });
      setTimeout(() => setToast({ type: '', text: '' }), 2500);
    } catch (err) {
      setToast({ type: 'error', text: getErrorMessage(err, 'Failed to unbook opportunity.') });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveFollowUp = async () => {
    if (!opportunity?.id || opportunity.id === 'new') return;
    if (!followUpSubject.trim() || !followUpAssignedTo || !followUpDueDate) return;
    if (!requiresAnyPermission([PERMISSIONS.SALES_CHANGE_TASK, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to manage follow-ups.');
    }
    if (!requiresAnyPermission([PERMISSIONS.SALES_CHANGE_TASK, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to manage follow-ups.');
    }
    setIsSavingFollowUp(true);
    setToast({ type: '', text: '' });
    try {
      const time = followUpDueTime || '09:00';
      const dueAtIso = new Date(`${followUpDueDate}T${time}`).toISOString();
      const description = followUpNotes.trim() || followUpSubject.trim();
      const taskRecord = editingFollowUpId
        ? followUps.find((task) => String(task.id) === String(editingFollowUpId))
        : null;
      const targetPayload = followUpMode === 'edit' && taskRecord
        ? getFollowUpTargetPayload(taskRecord)
        : (isLeadPath
            ? (opportunity?.opportunity_id ? { opportunity: opportunity.opportunity_id } : { lead: opportunity.id })
            : { opportunity: opportunity.id });
      if (followUpMode === 'edit' && editingFollowUpId) {
        const activityId = getFollowUpActivityId(taskRecord);
        if (!activityId) throw new Error('Missing activity for follow-up.');

        await updateSalesActivity(activityId, {
          subject: followUpSubject.trim(),
          description,
          status: taskRecord?.activity_details?.status || taskRecord?.activity?.status || 'pending',
        });
        await updateTask(editingFollowUpId, {
          ...targetPayload,
          task_type: followUpType,
          assigned_to: Number(followUpAssignedTo),
          due_date: dueAtIso,
          notes: followUpNotes.trim(),
        });
        setToast({ type: 'success', text: 'Follow-up updated.' });
      } else {
        const createdActivity = await createSalesActivity({
          ...targetPayload,
          activity_type: 'task',
          subject: followUpSubject.trim(),
          description,
          status: 'pending',
        });
        await createTask({
          activity: createdActivity.id,
          ...targetPayload,
          task_type: followUpType,
          assigned_to: Number(followUpAssignedTo),
          due_date: dueAtIso,
          notes: followUpNotes.trim(),
        });
        setToast({ type: 'success', text: 'Follow-up created.' });
      }

      closeFollowUpModal();
    } catch (err) {
      setToast({ type: 'error', text: getErrorMessage(err, 'Failed to save follow-up.') });
    } finally {
      setIsSavingFollowUp(false);
    }
  };

  const handleToggleFollowUpStatus = async (task) => {
    const activityId = getFollowUpActivityId(task);
    if (!activityId) return;
    if (!requiresAnyPermission([PERMISSIONS.SALES_CHANGE_TASK, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to update follow-ups.');
    }
    if (!requiresAnyPermission([PERMISSIONS.SALES_CHANGE_TASK, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to update follow-ups.');
    }
    setIsSavingFollowUp(true);
    try {
      const currentStatus = String(task?.activity_details?.status || task?.activity?.status || 'pending').toLowerCase();
      const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      await updateSalesActivity(activityId, {
        status: nextStatus,
        completed_at: nextStatus === 'completed' ? new Date().toISOString() : null,
      });
      setFollowUps((prev) => prev.map((row) => (
        String(row.id) === String(task.id)
          ? {
              ...row,
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
      setToast({
        type: 'success',
        text: nextStatus === 'completed' ? 'Follow-up marked completed.' : 'Follow-up reopened.',
      });
    } catch (err) {
      setToast({ type: 'error', text: getErrorMessage(err, 'Failed to update follow-up status.') });
    } finally {
      setIsSavingFollowUp(false);
    }
  };

  const handleDeleteFollowUp = async (task) => {
    const activityId = getFollowUpActivityId(task);
    if (!activityId) return;
    if (!requiresAnyPermission([PERMISSIONS.SALES_CHANGE_TASK, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to delete follow-ups.');
    }
    if (!requiresAnyPermission([PERMISSIONS.SALES_CHANGE_TASK, PERMISSIONS.SALES_CHANGE_OPPORTUNITY])) {
      return denyAction('You do not have permission to delete follow-ups.');
    }
    const subject = String(task?.activity_details?.subject || task?.activity?.subject || 'this follow-up').trim();
    if (!window.confirm(`Delete "${subject}"? This will remove the follow-up.`)) return;
    setIsSavingFollowUp(true);
    try {
      await deleteSalesActivity(activityId);
      if (editingFollowUpId && String(editingFollowUpId) === String(task.id)) {
        closeFollowUpModal();
      }
      setFollowUps((prev) => prev.filter((row) => String(row.id) !== String(task.id)));
      setToast({ type: 'success', text: 'Follow-up deleted.' });
    } catch (err) {
      setToast({ type: 'error', text: getErrorMessage(err, 'Failed to delete follow-up.') });
    } finally {
      setIsSavingFollowUp(false);
    }
  };

  const renderFollowUpItem = (task) => {
    const activity = task?.activity_details || task?.activity || {};
    const subject = String(activity.subject || 'Follow-up').trim();
    const notes = String(task?.notes || activity.description || '').trim();
    const taskType = String(task?.task_type || 'general');
    const status = String(activity.status || 'pending').toLowerCase();
    const isCompleted = status === 'completed';
    const assignee =
      resolveUserLabel(task?.assigned_to_details) ||
      resolveUserLabel(task?.assigned_to) ||
      'Unassigned';

    return (
      <div key={task.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="truncate text-sm font-extrabold text-black">{subject}</h4>
              <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-widest ${statusPillCls(isCompleted ? 'success' : 'warning')}`}>
                {titleCase(taskType)}
              </span>
            </div>
            <div className="mt-1 text-xs font-semibold text-ink-400">
              {safeDateTime(task?.due_date)} · {assignee}
            </div>
            {notes ? <p className="mt-2 line-clamp-2 text-xs text-ink-500">{notes}</p> : null}
          </div>
          <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${statusPillCls(isCompleted ? 'success' : 'warning')}`}>
            {titleCase(status || 'pending')}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <IconButton name="pencil" label="Edit follow-up" onClick={() => openEditFollowUpModal(task)} tone="green" />
          <IconButton
            name={isCompleted ? 'rotate-ccw' : 'check'}
            label={isCompleted ? 'Reopen follow-up' : 'Mark follow-up complete'}
            onClick={() => handleToggleFollowUpStatus(task)}
          />
          <IconButton
            name="trash-2"
            label="Delete follow-up"
            onClick={() => handleDeleteFollowUp(task)}
            className="text-rose-500"
          />
        </div>
      </div>
    );
  };

  const handleApplyTemplate = async (template) => {
    if (!template) return;
    if (commTab === 'email' && emailComposeMode === 'inbound_reply') {
      return denyAction('Templates are disabled for inbound replies.');
    }
    if (!hasPermission(PERMISSIONS.COMMUNICATIONS_EMAIL_SEND) && !hasPermission(PERMISSIONS.COMMUNICATIONS_SMS_SEND)) {
      return denyAction('You do not have permission to use communication templates.');
    }
    if (!hasPermission(PERMISSIONS.COMMUNICATIONS_EMAIL_SEND) && !hasPermission(PERMISSIONS.COMMUNICATIONS_SMS_SEND)) {
      return denyAction('You do not have permission to use communication templates.');
    }
    let resolvedTemplate = template;
    const missingContent =
      !String(template?.body_html || '').trim() &&
      !String(template?.body || '').trim();
    if (missingContent) {
      try {
        const detail = await getCommunicationTemplate(template.id);
        resolvedTemplate = detail?.data || detail || template;
      } catch {
        resolvedTemplate = template;
      }
    }

    const fallbackCompanyName =
      opportunity?.company_details?.name ||
      estimateOpportunity?.company_details?.name ||
      'KargoFlow';
    const quoteNumber =
      opportunity?.opportunity_number ||
      estimateOpportunity?.opportunity_number ||
      opportunity?.sales_number ||
      opportunity?.id ||
      '';
    const quoteAmount = `$${opportunity?.lead_cost || estimateOpportunity?.lead_cost || '0.00'}`;
    const quoteLink =
      typeof window !== 'undefined' && opportunity?.id && !isLeadPath
        ? `${getPortalBaseUrl()}${getRecordDetailPath('opportunity', opportunity)}`
        : typeof window !== 'undefined' && estimateOpportunity?.id
          ? `${getPortalBaseUrl()}${getRecordDetailPath('opportunity', estimateOpportunity)}`
          : '';
    const inventoryToken =
      (isLeadPath ? opportunity?.inventory_portal_token : null) ||
      opportunity?.lead_details?.inventory_portal_token ||
      estimateOpportunity?.lead_details?.inventory_portal_token ||
      '';
    const inventoryLink =
      typeof window !== 'undefined' && inventoryToken
        ? `${getPortalBaseUrl()}/portal/inventory?token=${encodeURIComponent(inventoryToken)}`
        : undefined;
    const previewLeadId = isLeadPath
      ? Number(opportunity?.id || 0) || undefined
      : Number(opportunity?.lead || estimateOpportunity?.lead || 0) || undefined;
    const previewOpportunityId = !isLeadPath
      ? Number(opportunity?.id || 0) || undefined
      : Number(estimateOpportunity?.id || opportunity?.opportunity_id || 0) || undefined;

    const variables = {
      customer_name: view.customerName || '',
      name: isLeadPath ? (opportunity?.first_name || '') : (opportunity?.customer_details?.first_name || 'Customer'),
      company_name: fallbackCompanyName,
      agent_name: view.assignedName || '',
      agent_phone: '',
      move_date: opportunity?.move_date || 'TBD',
      quote_amount: quoteAmount,
      cost: quoteAmount,
      quote_number: String(quoteNumber || ''),
      quote_link: quoteLink,
      estimate_link: quoteLink,
      payment_link: quoteLink ? `${quoteLink}#payment` : '',
      deposit_amount: '$0.00',
      ...(inventoryLink ? { inventory_link: inventoryLink } : {}),
      due_date: opportunity?.move_date || '',
      booking_id: String(opportunity?.sales_number || estimateOpportunity?.sales_number || opportunity?.id || estimateOpportunity?.id || ''),
      booking_details_link: quoteLink ? `${quoteLink.replace(/\/portal\/estimate.*/, '')}/portal/booking/${opportunity?.id || ''}` : '',
      contract_link: (() => {
        const contractToken = String(
          opportunity?.contract?.signing_token ||
          estimateOpportunity?.contract?.signing_token ||
          ''
        ).trim();
        if (!contractToken) return '';
        const base = quoteLink ? quoteLink.replace(/\/portal\/estimate.*/, '') : getPortalBaseUrl();
        return base ? `${base}/portal/contracts/${contractToken}` : `http://localhost:5173/portal/contracts/${contractToken}`;
      })(),
      'Contract.portal_link': (() => {
        const contractToken = String(
          opportunity?.contract?.signing_token ||
          estimateOpportunity?.contract?.signing_token ||
          ''
        ).trim();
        if (!contractToken) return '';
        const base = quoteLink ? quoteLink.replace(/\/portal\/estimate.*/, '') : getPortalBaseUrl();
        return base ? `${base}/portal/contracts/${contractToken}` : `http://localhost:5173/portal/contracts/${contractToken}`;
      })(),
      origin: view.originText || '',
      destination: view.destText || '',
      service: view.serviceType || '',
    };

    try {
      const preview = await previewCommunicationTemplate({
        communication_template_id: resolvedTemplate.id,
        variables,
        lead_id: previewLeadId,
        opportunity_id: previewOpportunityId,
        branch_id: form?.branch ? Number(form.branch) : undefined,
      });
      if (resolvedTemplate.channel === 'email') {
        setActivityBodies((prev) => ({
          ...prev,
          [commTab]: normalizePreviewHtml(
            preview?.body_html || resolvedTemplate.body_html || preview?.body || resolvedTemplate.body || '',
            {
              branchLogoUrl: selectedBranchLogoUrl,
              branchName: selectedBranchName,
            }
          ),
        }));
      } else {
        setActivityBodies((prev) => ({
          ...prev,
          [commTab]: preview?.body || resolvedTemplate.body || '',
        }));
      }
      if (resolvedTemplate.channel === 'email' || preview?.subject) {
        setActivitySubject(preview?.subject || resolvedTemplate.subject || '');
      }
    } catch {
      if (resolvedTemplate.channel === 'email') {
        setActivityBodies((prev) => ({
          ...prev,
          [commTab]: normalizePreviewHtml(resolvedTemplate.body_html || resolvedTemplate.body || '', {
            branchLogoUrl: selectedBranchLogoUrl,
            branchName: selectedBranchName,
          }),
        }));
      } else {
        setActivityBodies((prev) => ({ ...prev, [commTab]: resolvedTemplate.body || '' }));
      }
      if (resolvedTemplate.channel === 'email' || resolvedTemplate.subject) {
        setActivitySubject(resolvedTemplate.subject || '');
      }
    }
  };

  const handlePostActivity = async () => {
    if (!opportunity?.id || opportunity.id === 'new') return;
    const activeBody = currentActivityBody;

    if (!activeBody.trim()) {
      setToast({ type: 'error', text: 'Message content is required.' });
      return;
    }

    if (commTab === 'email' && !activitySubject.trim()) {
      setToast({ type: 'error', text: 'Email subject is required.' });
      return;
    }
    if (commTab === 'email' && !activityEmailToText.trim()) {
      setToast({ type: 'error', text: 'Customer email is required before sending email.' });
      return;
    }
    if (commTab === 'email' && !hasActiveEmailProvider) {
      setToast({ type: 'error', text: 'No active email provider is configured for this company.' });
      return;
    }
    if (commTab === 'text' && activitySmsRecipients.length === 0) {
      setToast({ type: 'error', text: 'Customer phone number is required before sending SMS.' });
      return;
    }
    if (commTab === 'call' && callDuration && Number.isNaN(Number(callDuration))) {
      setToast({ type: 'error', text: 'Call duration must be a number.' });
      return;
    }

    setIsPosting(true);
    setToast({ type: '', text: '' });
    let postWarning = '';
    let description = commTab === 'email' ? stripHtml(activeBody.trim()) : activeBody.trim();

    if (commTab === 'call') {
      description = `Disposition: ${callDisposition} | Direction: ${callDirection}${callDuration ? ` | Duration: ${callDuration}` : ''}\n\n${description}`;
    }

    try {
      if (editingActivity && commTab === 'note') {
        if (!canManageActivityHistory()) {
          return denyAction('You do not have permission to edit activities.');
        }
        const source = String(editingActivity?.timeline_source || '').toLowerCase();
        let updated = null;
        if (source === 'lead') {
          updated = await updateLeadActivity(editingActivity.id, {
            content: description,
          });
        } else {
          updated = await updateSalesActivity(editingActivity.id, {
            subject: activitySubject || '',
            description,
          });
        }

        if (updated) {
          setActivities((prev) =>
            (prev || []).map((row) =>
              String(row?.id || '') !== String(editingActivity.id || '') ||
              String(row.timeline_source || '') !== String(editingActivity.timeline_source || '')
                ? row
                : { ...row, ...updated, timeline_source: editingActivity.timeline_source }
            )
          );
        }

        setActivityBodies((prev) => ({ ...prev, note: '' }));
        setActivitySubject('');
        setEditingActivity(null);
        await refreshActivityTimeline();
        setToast({ type: 'success', text: 'Note updated successfully.' });
        setTimeout(() => setToast({ type: '', text: '' }), 2500);
        return;
      }

      if (isLeadPath) {
        if (commTab === 'email') {
          if (!canManageActivityHistory() || !canSendEmail()) {
            return denyAction('You do not have permission to send emails.');
          }
          const emailsTo = activityEmailToText.split(',').map(e => e.trim()).filter(Boolean);
          const emailsCc = activityEmailCcText.split(',').map(e => e.trim()).filter(Boolean);
          const emailsBcc = activityEmailBccText.split(',').map(e => e.trim()).filter(Boolean);
          const providerPayload = JSON.stringify({
            cc_email: emailsCc.join(', '),
            bcc_email: emailsBcc.join(', '),
            plain_reply: emailComposeMode === 'inbound_reply',
          });

          await Promise.all(emailsTo.map(async (targetEmail) => {
            const formData = new FormData();
            formData.append('lead', opportunity.id);
            formData.append('to_email', targetEmail);
            formData.append('subject', activitySubject.trim());
            formData.append('description', description);
            formData.append(
              'body_html',
              emailComposeMode === 'inbound_reply'
                ? activeBody.trim()
                : replaceBranchPlaceholders(activeBody.trim(), {
                    branchLogoUrl: selectedBranchLogoUrl,
                    branchName: selectedBranchName,
                  })
            );
            formData.append('provider_payload', providerPayload);
            emailAttachments.forEach((file) => formData.append('attachments', file));
            await api.post('/sales/sales-activities/send-email/', formData);
          }));
        } else if (commTab === 'text') {
          if (!canManageActivityHistory() || !canSendSms()) {
            return denyAction('You do not have permission to send SMS messages.');
          }
          await Promise.all(activitySmsRecipients.map(async (targetPhone) => {
            if (!targetPhone) return;
            const created = await createSalesActivity({
              lead: opportunity.id,
              opportunity: null,
              activity_type: 'sms',
              subject: '',
              description,
              direction: 'outbound',
              status: 'completed',
            });

            if (created?.id) {
              try {
                await api.post('/sales/sms-logs/', {
                  activity: created.id,
                  to_phone: targetPhone,
                  message: activeBody.trim(),
                  status: 'sent',
                });
              } catch (err) {
                try {
                  await api.delete(`/sales/sales-activities/${created.id}/`);
                } catch {
                  // Preserve the SMS dispatch error as the primary failure.
                }
                throw err;
              }
            }
          }));
        } else {
          if (commTab === 'call' && (!canManageActivityHistory() || !canLogCall())) {
            return denyAction('You do not have permission to log calls.');
          }
          if (commTab === 'note' && !canManageActivityHistory()) {
            return denyAction('You do not have permission to post activities.');
          }
          if (commTab === 'call') {
            const created = await createSalesActivity({
              lead: opportunity.id,
              opportunity: null,
              activity_type: 'call',
              subject: activitySubject || '',
              description,
              direction: 'outbound',
              status: 'completed',
            });

            if (created?.id) {
              const parsedMinutes = callDuration ? Number(callDuration) : 0;
              try {
                const callLogResponse = await api.post('/sales/call-logs/', {
                  activity: created.id,
                  duration_seconds: Math.max(0, Math.round(parsedMinutes * 60)),
                  disposition: callDisposition,
                });
                const callLogId = Number(callLogResponse?.data?.id || callLogResponse?.id || 0);
                if (!callLogId) {
                  throw new Error('Call log was not created.');
                }
                await updateSalesActivity(created.id, {
                  status: 'completed',
                  completed_at: new Date().toISOString(),
                });
              } catch (err) {
                try {
                  await api.delete(`/sales/sales-activities/${created.id}/`);
                } catch {
                  // Keep the call-log error as the primary failure.
                }
                throw err;
              }
            }
          } else {
            await createSalesActivity({
              lead: opportunity.id,
              activity_type: activityTypeForTab(commTab),
              description,
              status: 'completed',
            });
          }
        }
      } else {
        let channelWarning = '';
        if (commTab === 'email') {
          if (!canManageActivityHistory() || !canSendEmail()) {
            return denyAction('You do not have permission to send emails.');
          }
          const emailsTo = activityEmailToText.split(',').map(e => e.trim()).filter(Boolean);
          const emailsCc = activityEmailCcText.split(',').map(e => e.trim()).filter(Boolean);
          const emailsBcc = activityEmailBccText.split(',').map(e => e.trim()).filter(Boolean);
          const providerPayload = JSON.stringify({
            cc_email: emailsCc.join(', '),
            bcc_email: emailsBcc.join(', '),
            plain_reply: emailComposeMode === 'inbound_reply',
          });

          await Promise.all(emailsTo.map(async (targetEmail) => {
            const created = await createSalesActivity({
              opportunity: opportunity.id,
              activity_type: activityTypeForTab(commTab),
              subject: activitySubject || '',
              description,
              direction: 'outbound',
              status: 'completed',
            });
            if (created?.id) {
              try {
                const formData = new FormData();
                formData.append('activity', created.id);
                formData.append('to_email', targetEmail);
                formData.append('subject', activitySubject.trim());
                formData.append(
                  'body_html',
                  emailComposeMode === 'inbound_reply'
                    ? activeBody.trim()
                    : replaceBranchPlaceholders(activeBody.trim(), {
                        branchLogoUrl: selectedBranchLogoUrl,
                        branchName: selectedBranchName,
                      })
                );
                formData.append('provider_payload', providerPayload);
                emailAttachments.forEach((file) => formData.append('attachments', file));
                const emailLog = await api.post('/sales/email-logs/', formData);
                if (emailLog?.status === 'failed') {
                  channelWarning = emailLog?.error_message || 'Email delivery failed.';
                }
              } catch (err) {
                try {
                  await api.delete(`/sales/sales-activities/${created.id}/`);
                } catch {
                  // Keep the original email validation failure as the primary error.
                }
                throw err;
              }
            }
          }));
        } else if (commTab === 'text') {
          if (!canManageActivityHistory() || !canSendSms()) {
            return denyAction('You do not have permission to send SMS messages.');
          }
          await Promise.all(activitySmsRecipients.map(async (targetPhone) => {
            if (!targetPhone) return;
            const created = await createSalesActivity({
              opportunity: opportunity.id,
              activity_type: activityTypeForTab(commTab),
              subject: '',
              description,
              direction: 'outbound',
              status: 'completed',
            });
            if (created?.id) {
              try {
                await api.post('/sales/sms-logs/', {
                  activity: created.id,
                  to_phone: targetPhone,
                  message: activeBody.trim(),
                  status: 'sent',
                });
              } catch (err) {
                channelWarning = `Activity saved, but SMS log failed: ${getErrorMessage(err, 'sms log error')}`;
              }
            }
          }));
        } else {
          if (commTab === 'call' && (!canManageActivityHistory() || !canLogCall())) {
            return denyAction('You do not have permission to log calls.');
          }
          if (commTab === 'note' && !canManageActivityHistory()) {
            return denyAction('You do not have permission to post activities.');
          }
          const created = await createSalesActivity({
            opportunity: opportunity.id,
            activity_type: activityTypeForTab(commTab),
            subject: activitySubject || '',
            description,
            direction: 'outbound',
            status: 'completed',
          });

            if (created?.id && commTab === 'call') {
              const parsedMinutes = callDuration ? Number(callDuration) : 0;
              try {
                await api.post('/sales/call-logs/', {
		                activity: created.id,
		                duration_seconds: Math.max(0, Math.round(parsedMinutes * 60)),
		                disposition: callDisposition,
		              });
                await updateSalesActivity(created.id, {
                  status: 'completed',
                  completed_at: new Date().toISOString(),
                });
              } catch (err) {
                channelWarning = `Activity saved, but call log failed: ${getErrorMessage(err, 'call log error')}`;
              }
            }
        }
        if (channelWarning) postWarning = channelWarning;
      }

      setActivityBodies((prev) => ({ ...prev, [commTab]: '' }));
      if (commTab === 'email') {
        setActivitySubject('');
        setActivityEmailToText('');
        setActivityEmailCcText('');
        setActivityEmailBccText('');
        setEmailAttachments([]);
      }
      if (commTab === 'call') {
        setCallDuration('');
        setCallDirection('outbound');
        setCallDisposition('connected');
      }

      await refreshActivityTimeline();
      setToast(
        postWarning
          ? { type: 'error', text: postWarning }
          : { type: 'success', text: 'Activity posted successfully.' }
      );
      setTimeout(() => setToast({ type: '', text: '' }), 2500);
    } catch (err) {
      setToast({ type: 'error', text: getErrorMessage(err, 'Failed to post activity.') });
    } finally {
      setIsPosting(false);
    }
  };

  const showSidebarCards = activeTab === 'Sales';
  const mainColumnClass = showSidebarCards
    ? 'col-span-12 lg:col-span-8 space-y-2'
    : 'col-span-12 space-y-2';
  const isOpportunityLost = String(opportunity?.workflow_stage || opportunity?.status || '').toLowerCase() === 'lost';
  const lockedOpportunityReason = 'This opportunity is lost, so estimate and related tabs are locked.';
  const filesTargetSpec = resolveFilesTargetSpec({
    isLeadPath,
    estimateSummary,
    record: opportunity,
    fallbackId: id,
  });

  return (
    <div className="min-h-screen bg-slate-50/50">
      {toast.text ? (
        <div className="pointer-events-none fixed bottom-5 right-5 z-[200] max-w-[92vw] sm:max-w-md">
          <div
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white px-4 py-3 text-sm font-semibold shadow-lg ${
              toast.type === 'error'
                ? 'border-rose-200 text-rose-700'
                : 'border-emerald-200 text-emerald-700'
            }`}
            role="alert"
            aria-live="polite"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1 break-words">{toast.text}</div>
            <button
              type="button"
              onClick={() => setToast({ type: '', text: '' })}
              className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-black hover:bg-slate-100"
              aria-label="Dismiss notification"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
	      <StickyHeader 
	        title={
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Estimate:</span>
              <span className={estimateSummary?.status ? "text-slate-800" : "text-slate-400 italic font-normal"}>
                {estimateSummary?.status 
                  ? String(estimateSummary.status).charAt(0).toUpperCase() + String(estimateSummary.status).slice(1).replace(/_/g, ' ') 
                  : 'Not Created'}
              </span>
            </div>
          }
	        subtitle=""
	        branchLogoUrl={selectedBranchLogoUrl}
	        status={getWorkflowStageLabel(opportunity?.workflow_stage || (isLeadPath ? 'new_lead' : 'opportunity'))}
	        statusTone={toneForWorkflowStage(opportunity?.workflow_stage)}
	        statusColor={undefined}
	        id=""
	        onBack={handleBack}
	        actions={headerActions}
	        moreActions={[
	          ...headerMenuActions,
	        ]}
	        moreLabel="Actions"
	        sticky={false}
	        transparent={true}
	      />

      <main className="w-full px-1 py-2 sm:px-2 lg:px-2">
        <div className="grid grid-cols-12 gap-2 lg:gap-3">
          <div className={mainColumnClass}>

            <div className={`grid grid-cols-1 gap-2 lg:gap-3 mb-3 ${['Estimate', 'Files & Photos', 'Accounting', 'Documents', 'Payments'].includes(activeTab) ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                {['Sales', 'Tasks', 'Estimate', 'Files & Photos', 'Accounting', 'Documents', 'Payments'].includes(activeTab) && (
                  <>

                <CustomerCard
                  customerName={view.customerName}
                  firstName={customerDraft?.first_name ?? form.first_name}
                  lastName={customerDraft?.last_name ?? form.last_name}
                  salesNumber={opportunity?.sales_number || opportunity?.display_number || opportunity?.id}
                  title={view.moveType}
                  email={customerDraft?.email ?? form.email}
                  phone={customerDraft?.phone ?? form.phone}
                  location={opportunity?.origin_address_details?.city || opportunity?.origin_city}
                  onAddFollowup={canCreateTask() ? openCreateFollowUpModal : undefined}
                  onInlineSave={handleCustomerInlineSave}
                  onCustomerChange={(id, val) => setCustomerDraft(p => ({ ...p, [id]: val }))}
                  onManageContacts={openAdditionalContactsModal}
                  additionalContacts={customerAdditionalContacts}
                />
                <PlannedMoveCard
                  plannedMove={plannedMove}
                />
                </>
              )}
              {['Estimate', 'Files & Photos', 'Accounting', 'Documents', 'Payments'].includes(activeTab) && (
              <RouteLogisticsCard
                stops={(isLeadPath ? estimateOpportunity : opportunity)?.stops || []}
                origin={(isLeadPath ? estimateOpportunity?.origin_address_details : opportunity?.origin_address_details) || {
                  address_line1: form.origin_street,
                }}
                destination={(isLeadPath ? estimateOpportunity?.destination_address_details : opportunity?.destination_address_details) || {
                  address_line1: form.destination_street,
                }}
                  routeStops={routePoints}
                  onEdit={!isCreation && canEditOpportunity() ? startRouteEdit : undefined}
                  onOpenMap={() => navigateToEstimateSubTab('route')}
                  onAddStop={() => navigateToEstimateSubTab('route')}
                  onEditStop={!isLeadPath && !isCreation && canEditOpportunity() ? openSalesRouteStopEditor : undefined}
                  onDeleteStop={!isLeadPath && !isCreation && canEditOpportunity() ? deleteSalesRouteStop : undefined}
              />
              )}
            </div>

            {lostReason ? (
              <div className="rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 via-white to-amber-50 px-4 py-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700 ring-1 ring-rose-200">
                    <Icon name="alert-circle" className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-black uppercase tracking-widest text-rose-600">Lost Reason</div>
                    <div className="mt-1 text-base font-bold leading-relaxed text-slate-900 break-words">{lostReason}</div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Workspace Navigation */}
            <div className="relative">
              <div className="glass rounded-xl ring-1 ring-ink-100 shadow-sm">
                <nav className="flex items-center justify-between gap-1 p-1 overflow-x-auto no-scrollbar">
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
	                  {[
	                    { id: "Sales", icon: "messages-square", label: "Sales" },
	                    { id: "Estimate", icon: "file-text", label: "Estimate", disabled: isLeadPath || isOpportunityLost, reason: isOpportunityLost ? lockedOpportunityReason : undefined },
	                    { id: "Files & Photos", icon: "image", label: "Files & Photos", disabled: isCreation || isOpportunityLost, reason: isOpportunityLost ? lockedOpportunityReason : undefined },
	                    { id: "Documents", icon: "file-text", label: "Documents", disabled: isCreation || isOpportunityLost, reason: isOpportunityLost ? lockedOpportunityReason : undefined },
	                    { id: "Accounting", icon: "wallet", label: "Accounting", disabled: !accountingEnabled || isOpportunityLost, reason: isOpportunityLost ? lockedOpportunityReason : undefined },
	                    { id: "Payments", icon: "wallet", label: "Payments", disabled: isLeadPath || isOpportunityLost, reason: isOpportunityLost ? lockedOpportunityReason : undefined },
	                  ].map((t) => {
                      const isActive = activeTab === t.id;
                      return (
                        <button
                          key={t.id}
	                          disabled={t.disabled}
	                          title={t.disabled ? (t.reason || 'This tab is locked.') : undefined}
	                          onClick={() => {
	                            if (t.disabled) return;
	                            if (t.id === 'Estimate') {
	                              setActiveTab('Estimate');
	                              navigateToEstimateSubTab('charges');
	                              return;
	                            }
	                            if (t.id === 'Documents') {
	                              setActiveTab('Documents');
	                              navigateToDetailTab('Documents');
	                              return;
	                            }
	                            if (t.id === 'Payments') {
	                              setActiveTab('Payments');
	                              navigateToDetailTab('Payments');
	                              return;
	                            }
	                            setActiveTab(t.id);
	                            navigateToDetailTab(t.id);
	                          }}
                          className={`relative inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                            isActive
                              ? "bg-slate-900 text-white shadow-sm ring-1 ring-slate-900/10"
                              : t.disabled ? "text-slate-300 cursor-not-allowed" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          }`}
                        >
                          <Icon name={t.icon} className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-slate-400"}`} />
                          <span>{t.label}</span>
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>
                  {showSidebarCards && (
                    <button
                      type="button"
                      onClick={() => setIsMobileSidebarOpen(true)}
                      className="inline-flex lg:hidden items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition whitespace-nowrap bg-brand-tint text-brand hover:bg-brand/15 active:scale-95 cursor-pointer ml-2 border border-brand/20 shadow-sm"
                      title="Open details sidebar"
                    >
                      <Icon name="info" className="w-4 h-4 text-brand" />
                      <span className="hidden sm:inline">Details</span>
                    </button>
                  )}
                </nav>
              </div>
            </div>

            {activeTab === "Sales" && (
              <div className="space-y-2">
                  {editingActivity && commTab === 'note' ? (
                    <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
                      <div className="text-sm font-semibold text-amber-900">Editing note activity</div>
                      <button
                        type="button"
                        onClick={cancelEditingNoteActivity}
                        className="text-xs font-bold text-amber-800 hover:text-amber-900 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : null}
	                <CommsHub 
	                  customerName={view.customerName}
	                  customerPhone={activityCallRecipient || form.phone}
	                  currentChannel={commTab}
	                  onChannelChange={setCommTab}
	                  body={currentActivityBody}
	                  onBodyChange={setCurrentActivityBody}
	                  subject={activitySubject}
	                  onSubjectChange={setActivitySubject}
	                  isPosting={isPosting}
	                  onPost={handlePostActivity}
                    activityEmailToText={activityEmailToText}
                    setActivityEmailToText={setActivityEmailToText}
                    activityEmailCcText={activityEmailCcText}
                    setActivityEmailCcText={setActivityEmailCcText}
                    activityEmailBccText={activityEmailBccText}
                    setActivityEmailBccText={setActivityEmailBccText}
                    showCcBcc={showCcBcc}
                    setShowCcBcc={setShowCcBcc}
	                  onDial={handleRingCentralCall}
                    canCreateTask={canCreateTask()}
                    canSendEmail={canSendEmail()}
                    canSendSms={canSendSms()}
                    canLogCall={canLogCall()}
	                  callDuration={callDuration}
	                  onCallDurationChange={setCallDuration}
	                  callDirection={callDirection}
	                  onCallDirectionChange={setCallDirection}
	                  callDisposition={callDisposition}
	                  onCallDispositionChange={setCallDisposition}
	                  emailTemplates={emailTemplates}
	                  smsTemplates={smsTemplates}
	                  onApplyTemplate={handleApplyTemplate}
	                  emailAttachments={emailAttachments}
	                  onEmailAttachmentsChange={setEmailAttachments}
	                  categories={commCategories}
	                  isLoadingTemplates={isLoadingCommTemplates}
                    postLabel={editingActivity && commTab === 'note' ? 'Save Note' : undefined}
                    communicationRecipients={communicationRecipients}
                    activityCallRecipient={activityCallRecipient}
                    setActivityCallRecipient={setActivityCallRecipient}
                    activitySmsRecipients={activitySmsRecipients}
                    setActivitySmsRecipients={setActivitySmsRecipients}
	                />
                {(() => {
                  const timelineProps = {
                    activities: orderedActivities,
                    filter: activityFilter,
                    onFilterChange: setActivityFilter,
                    onTogglePin: toggleActivityPin,
                    onReply: (act) => {
                      setSelectedActivityForPreview(null);
                      setCommTab('email');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      setTimeout(() => {
                        const subject = act.subject || act.email_log_details?.subject || '';
                        const fromEmail = act?.payload?.from_email || act?.email_log_details?.from_email || act?.from_email || '';

                        setActivitySubject(subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`);
                        if (fromEmail) {
                          setActivityEmailToText(fromEmail);
                        }
                        setCurrentActivityBody('');
                      }, 100);
                    },
                onEditNote: startEditingNoteActivity,
                onEditCall: openEditCallLog,
                onDeleteCall: deleteCallLog,
                canManageActivityHistory: canManageActivityHistory(),
                    onPreview: (act) => setSelectedActivityForPreview(act),
                    onLoadMore: handleLoadMore,
                    hasMore: hasMoreActivities || hasMoreTimeline,
                    isLoadingMore: isLoadingMoreActivities || isLoadingMoreTimeline,
                    totalUnpinnedCount: unpinnedActivities.length,
                    pinnedCount: pinnedActivities.length,
                  };
                  return <RedesignTimeline {...timelineProps} />;
                })()}
              </div>
            )}

            {activeTab === "Estimate" && (
                <EstimateView
                  onRefresh={fetchOpportunity}
                  opportunity={isLeadPath ? estimateOpportunity : opportunity}
                  sourceType={isLeadPath ? 'lead' : 'opportunity'}
                  isLoadingLinkedOpportunity={isLeadPath && isLoadingEstimateOpportunity}
                  opportunityJobs={opportunityJobs}
                  subJobServiceOptions={computedSubJobServiceOptions}
                  selectedSubJobId={selectedEstimateJobId}
                  onSelectedSubJobChange={setSelectedEstimateJobId}
                  onCreateSubJob={createSubJobFromServiceType}
                  onRefreshSubJobs={loadOpportunityJobs}
                  onDeleteSelectedSubJob={deleteSelectedEstimateJob}
                  onUpdateSelectedSubJob={updateSelectedEstimateJobPlanning}
                  triggerSendEstimate={sendEstimateNonce}
                  triggerViewEstimate={triggerViewEstimateNonce}
                  view={view}
                  initialSubTab={estimateInitialSubTab}
                  onSubTabChange={(subTab) => {
                    if (subTab === 'documents') {
                      setActiveTab('Documents');
                      navigateToDetailTab('Documents');
                    } else if (subTab === 'payments') {
                      setActiveTab('Payments');
                      navigateToDetailTab('Payments');
                    } else {
                      navigateToEstimateSubTab(subTab);
                    }
                  }}
                  isOpportunityLocked={isOpportunityLost}
                  canCreateOpportunity={canCreateOpportunity()}
                  canEditOpportunity={canEditOpportunity()}
                />
            )}

            {activeTab === "Documents" && (
                <EstimateView
                  onRefresh={fetchOpportunity}
                  opportunity={isLeadPath ? estimateOpportunity : opportunity}
                  sourceType={isLeadPath ? 'lead' : 'opportunity'}
                  isLoadingLinkedOpportunity={isLeadPath && isLoadingEstimateOpportunity}
                  opportunityJobs={opportunityJobs}
                  subJobServiceOptions={computedSubJobServiceOptions}
                  selectedSubJobId={selectedEstimateJobId}
                  onSelectedSubJobChange={setSelectedEstimateJobId}
                  onCreateSubJob={createSubJobFromServiceType}
                  onRefreshSubJobs={loadOpportunityJobs}
                  onDeleteSelectedSubJob={deleteSelectedEstimateJob}
                  onUpdateSelectedSubJob={updateSelectedEstimateJobPlanning}
                  triggerSendEstimate={sendEstimateNonce}
                  triggerViewEstimate={triggerViewEstimateNonce}
                  view={view}
                  initialSubTab="documents"
                  onSubTabChange={(subTab) => {
                    if (subTab === 'documents') {
                      setActiveTab('Documents');
                      navigateToDetailTab('Documents');
                    } else if (subTab === 'payments') {
                      setActiveTab('Payments');
                      navigateToDetailTab('Payments');
                    } else {
                      setActiveTab('Estimate');
                      navigateToEstimateSubTab(subTab);
                    }
                  }}
                  isOpportunityLocked={isOpportunityLost}
                  canCreateOpportunity={canCreateOpportunity()}
                  canEditOpportunity={canEditOpportunity()}
                />
            )}

            {activeTab === "Files & Photos" && (
              <div className="rounded-xl border border-ink-100 bg-white shadow-sm overflow-hidden">
                 <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
                    <div>
                      <span className="label-eyebrow text-ink-400">Files & Photos</span>
                      <h3 className="text-lg font-extrabold text-ink-900 mt-0.5">Project Documents</h3>
                    </div>
                    {canEditOpportunity() ? <PrimaryBtn icon="upload">Upload File</PrimaryBtn> : null}
                 </div>
                 <div className="p-3">
                    <CategorizedFilesPanel
                      targetType={filesTargetSpec.targetType}
                      targetId={filesTargetSpec.targetId}
                      extraTargets={[
                        ...(!isLeadPath && estimateSummary?.id
                          ? [{ targetType: 'estimates.estimate', targetId: String(estimateSummary.id) }]
                          : []),
                        ...(!isLeadPath && (opportunity?.lead_id || opportunity?.lead_details?.id || estimateOpportunity?.lead_details?.id)
                          ? [{
                              targetType: 'leads.lead',
                              targetId: String(opportunity?.lead_id || opportunity?.lead_details?.id || estimateOpportunity?.lead_details?.id),
                            }]
                          : []),
                        ...(isLeadPath && opportunity?.opportunity_id && estimateSummary?.id
                          ? [{ targetType: 'estimates.estimate', targetId: String(estimateSummary.id) }]
                          : []),
                      ]}
                    />
                  </div>
              </div>
            )}
            
            {activeTab === "Accounting" && (
              <div className="space-y-3 animate-in fade-in duration-300">
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-4">
                 

                  {(opportunityAccountingSummary?.estimate?.requires_reapproval || estimateSummary?.requires_reapproval) ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-amber-900">Estimate re-approval required</p>
                          <p className="mt-1 text-xs font-medium text-amber-800">
                            Customer-visible scope changed after approval. Return to the Estimate tab, resend the estimate, and complete re-approval before downstream billing.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}



                  {!accountingJob?.id ? (
                    <div className="space-y-4">
                      <div className="py-16 text-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                        <Icon name="wallet" className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                        <p className="text-sm font-bold text-slate-800">No Job Found</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Book the opportunity into an active job first to generate invoice and payroll records.</p>
                      </div>

                      {(allPayments.length > 0 || Number(estimateSummary?.grand_total || 0) > 0) && (
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                              <h4 className="text-lg font-bold text-slate-800">Payment Activity</h4>
                              <p className="text-xs text-slate-500 mt-1 font-medium">
                                Payments captured against this opportunity before or after booking.
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <div className="p-3 rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/40 to-white">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payments</div>
                              <div className="font-extrabold text-emerald-600 text-sm mt-0.5">{allPayments.length}</div>
                            </div>
                            <div className="p-3 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/40 to-white">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Captured</div>
                              <div className="font-extrabold text-blue-600 text-sm mt-0.5">${allPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0).toFixed(2)}</div>
                            </div>
                            <div className="p-3 rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/40 to-white">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimate Total</div>
                              <div className="font-extrabold text-amber-600 text-sm mt-0.5">${Number(estimateSummary?.grand_total || 0).toFixed(2)}</div>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            {allPayments.length > 0 ? (
                              <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                  <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                                    <th className="pb-3 px-1">Date</th>
                                    <th className="pb-3 px-1">Method</th>
                                    <th className="pb-3 px-1 text-right">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {allPayments.map((payment, idx) => {
                                    const methodName = String(payment.method || 'Payment').replaceAll('_', ' ');
                                    const paymentDate = payment.paid_at || payment.created_at;
                                    const formattedDate = paymentDate ? formatPaymentDate(paymentDate) : '—';
                                    return (
                                      <tr key={payment.id || idx} className="border-b border-slate-50 last:border-b-0">
                                        <td className="py-3 px-1 text-slate-600">{formattedDate}</td>
                                        <td className="py-3 px-1 font-semibold text-slate-700">{methodName}</td>
                                        <td className="py-3 px-1 text-right font-extrabold text-slate-800">${Number(payment.amount || 0).toFixed(2)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            ) : (
                              <p className="text-xs text-slate-500 italic">No payment records found.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Premium Financial Summary Cards */}
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        <div className="p-3 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/40 to-white flex items-center gap-3 hover:scale-[1.02] hover:shadow-sm transition-all duration-300 cursor-default">
                          <div className="w-10 h-10 rounded-xl bg-blue-100/50 flex items-center justify-center text-blue-600 shrink-0">
                            <Calendar size={18} />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Schedule</div>
                            <div className="font-extrabold text-slate-800 text-sm mt-0.5">{accountingJob.move_date || '—'}</div>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 to-white flex items-center gap-3 hover:scale-[1.02] hover:shadow-sm transition-all duration-300 cursor-default">
                          <div className="w-10 h-10 rounded-xl bg-indigo-100/50 flex items-center justify-center text-indigo-600 shrink-0">
                            <FileText size={18} />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimate</div>
                            <div className="font-extrabold text-slate-800 text-sm mt-0.5">${Number(opportunityAccountingSummary?.estimate?.grand_total ?? accountingSummary?.estimate?.grand_total ?? 0).toFixed(2)}</div>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/40 to-white flex items-center gap-3 hover:scale-[1.02] hover:shadow-sm transition-all duration-300 cursor-default">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100/50 flex items-center justify-center text-emerald-600 shrink-0">
                            <DollarSign size={18} />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paid</div>
                            <div className="font-extrabold text-emerald-600 text-sm mt-0.5">${Number(ledgerPaidAmount || opportunityAccountingSummary?.payments?.total_paid || accountingSummary?.payments?.total_paid || 0).toFixed(2)}</div>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/40 to-white flex items-center gap-3 hover:scale-[1.02] hover:shadow-sm transition-all duration-300 cursor-default">
                          <div className="w-10 h-10 rounded-xl bg-amber-100/50 flex items-center justify-center text-amber-600 shrink-0">
                            <Zap size={18} />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Balance</div>
                            <div className="font-extrabold text-amber-600 text-sm mt-0.5">${Number(opportunityPaymentBalanceDue).toFixed(2)}</div>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50/40 to-white flex items-center gap-3 col-span-2 sm:col-span-1 hover:scale-[1.02] hover:shadow-sm transition-all duration-300 cursor-default">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                            <Receipt size={18} />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invoice Status</div>
                            <div className="mt-1">
                              <Pill tone={
                                (opportunityAccountingSummary?.invoice_rollup?.latest_invoice_status || invoiceDetail?.status) === 'paid' ? 'green' :
                                (opportunityAccountingSummary?.invoice_rollup?.latest_invoice_status || invoiceDetail?.status) === 'sent' ? 'blue' :
                                (opportunityAccountingSummary?.invoice_rollup?.latest_invoice_status || invoiceDetail?.status) === 'pending' ? 'amber' :
                                (opportunityAccountingSummary?.invoice_rollup?.latest_invoice_status || invoiceDetail?.status) === 'voided' ? 'rose' : 'slate'
                              }>
                                {String(opportunityAccountingSummary?.invoice_rollup?.latest_invoice_status || invoiceDetail?.status || 'draft').toUpperCase()}
                              </Pill>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                          <div>
                            <h4 className="text-lg font-bold text-slate-800">Opportunity Invoice Rollup</h4>
                            <p className="text-xs text-slate-500 mt-1 font-medium">
                              Combined invoice status across all sub-jobs in this opportunity.
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <GhostBtn
                              icon="eye"
                              onClick={handleOpenOpportunityInvoicePreview}
                              className="h-8 py-0 px-3 text-xs"
                            >
                              Preview Opportunity Invoice
                            </GhostBtn>
                            <Pill tone="slate">
                              {Number(opportunityAccountingSummary?.invoice_rollup?.count ?? 0)} invoices
                            </Pill>
                            {opportunityAccountingSummary?.invoice_rollup?.latest_invoice_number ? (
                              <Pill tone="blue">
                                Latest {opportunityAccountingSummary.invoice_rollup.latest_invoice_number}
                              </Pill>
                            ) : null}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                          <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subtotal</div>
                            <div className="mt-1 text-sm font-extrabold text-slate-800">
                              ${Number(opportunityAccountingSummary?.invoice_rollup?.subtotal ?? 0).toFixed(2)}
                            </div>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tax</div>
                            <div className="mt-1 text-sm font-extrabold text-slate-800">
                              ${Number(opportunityAccountingSummary?.invoice_rollup?.tax_amount ?? 0).toFixed(2)}
                            </div>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Invoiced Total</div>
                            <div className="mt-1 text-sm font-extrabold text-slate-800">
                              ${Number(opportunityAccountingSummary?.invoice_rollup?.total ?? 0).toFixed(2)}
                            </div>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rollup Balance</div>
                            <div className="mt-1 text-sm font-extrabold text-amber-700">
                              ${Number(opportunityInvoiceRollupBalanceDue).toFixed(2)}
                            </div>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm border-collapse">
                            <thead>
                              <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                                <th className="pb-3 px-1">Estimate</th>
                                <th className="pb-3 px-1">Job</th>
                                <th className="pb-3 px-1">Status</th>
                                <th className="pb-3 px-1">Invoice</th>
                                <th className="pb-3 px-1 text-right">Invoiced</th>
                                <th className="pb-3 px-1 text-right">Balance</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.isArray(opportunityAccountingSummary?.invoice_rollup?.invoices) && opportunityAccountingSummary.invoice_rollup.invoices.length > 0 ? (
                                opportunityAccountingSummary.invoice_rollup.invoices.map((invoice) => (
                                  <tr key={invoice.id} className="border-b border-slate-50 last:border-b-0">
                                    <td className="py-3 px-1">
                                      <div className="font-bold text-slate-800">{invoice.estimate_number || `Estimate #${invoice.estimate_id || '—'}`}</div>
                                      <div className="text-xs text-slate-400">Estimate #{invoice.estimate_id || '—'}</div>
                                    </td>
                                    <td className="py-3 px-1 font-semibold text-slate-700">
                                      {invoice.job_number || invoice.job_title || 'Opportunity invoice'}
                                    </td>
                                    <td className="py-3 px-1">
                                      <div className="flex flex-wrap gap-1.5">
                                        <Pill tone={invoice.status === 'paid' ? 'green' : invoice.status === 'sent' ? 'blue' : invoice.status === 'pending' ? 'amber' : 'slate'}>
                                          {invoice.status || 'draft'}
                                        </Pill>
                                      </div>
                                    </td>
                                    <td className="py-3 px-1 font-semibold text-slate-700">
                                      {invoice.invoice_number || '—'}
                                    </td>
                                    <td className="py-3 px-1 text-right font-bold text-slate-800">
                                      {invoice.total != null ? `$${Number(invoice.total || 0).toFixed(2)}` : '—'}
                                    </td>
                                    <td className="py-3 px-1 text-right font-bold text-amber-700">
                                      {invoice.total != null
                                        ? `$${Math.max(
                                            Number(invoice.total || 0) - Number(ledgerPaidAmount || opportunityAccountingSummary?.payments?.total_paid || accountingSummary?.payments?.total_paid || 0),
                                            0
                                          ).toFixed(2)}`
                                        : '—'}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="6" className="py-6 px-1 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    No finalized invoices available.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Grid layout for left/right columns */}
                      <div className="grid grid-cols-12 gap-3">
                        {/* Left Column: Invoice Management */}
                        <div className="col-span-12 lg:col-span-7 space-y-6">
                          {Array.isArray(opportunityAccountingSummary?.estimates) && opportunityAccountingSummary.estimates.length > 0 ? (
                            <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-4 shadow-sm">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                                    <FileText size={18} />
                                  </span>
                                  <div>
                                    <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                      Job Invoices & Drafts
                                    </h4>
                                    <p className="text-xs text-slate-400 mt-0.5 font-semibold">
                                      Manage billing separately per estimate/job.
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <GhostBtn 
                                    icon="save" 
                                    onClick={saveAllInvoiceDrafts} 
                                    disabled={isSavingInvoiceDraft}
                                    className="h-9 py-0 px-3.5 text-xs font-bold"
                                  >
                                    {isSavingInvoiceDraft ? 'Saving...' : 'Save All Drafts'}
                                  </GhostBtn>
                                </div>
                              </div>
                              
                              {/* Job Tabs for Invoicing */}
                              <div className="flex overflow-x-auto border-b border-slate-200 no-scrollbar">
                                {(opportunityAccountingSummary?.jobs || []).map((job) => {
                                  const isActive = (selectedAccountingJobId || opportunityAccountingSummary?.jobs?.[0]?.id) === job.id;
                                  const svcType = String(job.service_type || opportunity?.service_type || 'Local Move').replace(/_/g, ' ');
                                  const inv = invoiceDetailsMap[job.id];
                                  const number = `${opportunity.sales_number || opportunity.id}-${job.sequence}`;
                                  
                                  return (
                                    <button
                                      key={job.id}
                                      onClick={() => selectAccountingJob(job.id)}
                                      className={`flex flex-col items-start px-6 py-4 border-b-2 whitespace-nowrap transition-colors ${
                                        isActive 
                                          ? 'border-brand text-brand bg-brand/5' 
                                          : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                      }`}
                                    >
                                      <div className="font-bold text-base flex items-center justify-between w-full">
                                        {svcType}
                                        {inv ? <Pill tone="blue" className="ml-3 !text-[9px] !px-1.5 !py-0">FINALIZED</Pill> : <Pill tone="slate" className="ml-3 !text-[9px] !px-1.5 !py-0">DRAFT</Pill>}
                                      </div>
                                      <div className="text-sm mt-1 flex items-center justify-between w-full gap-8">
                                        <span>{job.move_date ? new Date(job.move_date).toLocaleDateString() : 'Unscheduled'}</span>
                                        <span className="font-mono text-xs">{number}</span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="space-y-4 pt-2">
                                {(() => {
                                  const job = (opportunityAccountingSummary?.jobs || []).find(j => j.id === (selectedAccountingJobId || opportunityAccountingSummary?.jobs?.[0]?.id)) || opportunityAccountingSummary?.jobs?.[0];
                                  if (!job) return null;
                                  
                                  const invoiceDetail = Number(refinalizingInvoiceJobId) === Number(job.id)
                                    ? null
                                    : invoiceDetailsMap[job.id];
                                  const invoiceDraft = invoiceDraftsMap[job.id] || { tax_rate: '0.0000', discount_amount: '0.00', line_items: [] };
                                  const svcType = String(job.service_type || opportunity?.service_type || 'Local Move').replace(/_/g, ' ');

                                  const draftLineItems = Array.isArray(invoiceDraft?.line_items) ? invoiceDraft.line_items : [];
                                  let draftSubtotal = 0;
                                  let draftTaxableSubtotal = 0;
                                  draftLineItems.forEach(item => {
                                    const lineTotal = (Number(item.quantity) * Number(item.unit_price) || 0);
                                    draftSubtotal += lineTotal;
                                    if (item?.taxable !== false) {
                                      draftTaxableSubtotal += lineTotal;
                                    }
                                  });
                                  const draftDiscount = Number(invoiceDraft?.discount_amount) || 0;
                                  const draftTaxRate = Number(invoiceDraft?.tax_rate) || 0;
                                  const draftTaxableDiscount = draftSubtotal > 0 ? Math.min(draftTaxableSubtotal, (draftDiscount * draftTaxableSubtotal) / draftSubtotal) : 0;
                                  const draftTaxableBase = Math.max(0, draftTaxableSubtotal - draftTaxableDiscount);
                                  const draftTaxAmount = draftTaxableBase * draftTaxRate;
                                  const draftTotal = Math.max(0, draftSubtotal - draftDiscount) + draftTaxAmount;
                                  const draftPaid = Number(accountingSummary?.payments?.total_paid ?? 0);
                                  const draftBalance = draftTotal - draftPaid;

                                  return (
                                    <div key={job.id} className="animate-in fade-in duration-300">
                                      <div className="space-y-4">
                                        {invoiceDetail ? (
                                          /* Finalized Invoice View */
                                          <div className="space-y-4">
                                            <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                                              <div>
                                                <p className="text-xs text-slate-600 font-bold">
                                                  Invoice: {invoiceDetail.invoice_number} | Finalized: {invoiceDetail.finalized_at ? new Date(invoiceDetail.finalized_at).toLocaleDateString() : '—'}
                                                </p>
                                              </div>
                                              <PrimaryBtn
                                                icon="refresh-cw"
                                                onClick={() => handleRefinalizeInvoice(job.id)}
                                                className="h-8 py-0 px-3 text-xs"
                                              >
                                                Re-finalize
                                              </PrimaryBtn>
                                            </div>

                                            {/* Finalized Line Items */}
                                            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                              <table className="w-full text-left text-sm border-collapse">
                                                <thead className="bg-slate-50">
                                                  <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-extrabold tracking-wider">
                                                    <th className="py-3 px-3">Item Description</th>
                                                    <th className="py-3 px-2 w-12 text-center">Qty</th>
                                                    <th className="py-3 px-2 w-20 text-right">Price</th>
                                                    <th className="py-3 px-3 text-right w-20">Total</th>
                                                    <th className="py-3 px-2 text-center w-16">Actions</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {(Array.isArray(invoiceDetail.line_items) ? invoiceDetail.line_items : []).concat(
                                                    editingInvoiceLineItemId === 'new' ? [{ id: 'new' }] : []
                                                  ).map((item) => {
                                                    const isEditing = editingInvoiceLineItemId === item.id;
                                                    return (
                                                      <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors align-middle last:border-b-0">
                                                        <td className="py-3 px-3 max-w-[240px]">
                                                          {isEditing ? (
                                                            <div className="space-y-1">
                                                              <input 
                                                                type="text" 
                                                                value={invoiceLineDraft?.name || ''} 
                                                                onChange={(e) => setInvoiceLineDraft(p => ({ ...p, name: e.target.value }))}
                                                                className={workspaceInputCls} 
                                                                placeholder="Name"
                                                              />
                                                              <div className="flex gap-1">
                                                                <select
                                                                  value={invoiceLineDraft?.category || ''}
                                                                  onChange={(e) => setInvoiceLineDraft(p => ({ ...p, category: e.target.value }))}
                                                                  className={`${workspaceInputCls} cursor-pointer text-xs`}
                                                                >
                                                                  <option value="">Category...</option>
                                                                  <option value="moving_labor">Moving Labor</option>
                                                                  <option value="transportation">Transportation</option>
                                                                  <option value="packing">Packing</option>
                                                                  <option value="materials">Materials</option>
                                                                  <option value="trip_and_travel">Trip & Travel</option>
                                                                  <option value="discount">Discount</option>
                                                                  <option value="other">Other</option>
                                                                </select>
                                                                <input 
                                                                  type="text" 
                                                                  value={invoiceLineDraft?.description || ''} 
                                                                  onChange={(e) => setInvoiceLineDraft(p => ({ ...p, description: e.target.value }))}
                                                                  className={workspaceInputCls} 
                                                                  placeholder="Description"
                                                                />
                                                              </div>
                                                            </div>
                                                          ) : (
                                                            <div>
                                                              <div className="font-extrabold text-slate-800 flex items-center gap-1.5 flex-wrap text-sm">
                                                                {item.name}
                                                                {item.category && (
                                                                  <span className="inline-flex rounded text-[9px] font-bold uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5">
                                                                    {item.category.replace('_', ' ')}
                                                                  </span>
                                                                )}
                                                              </div>
                                                              {item.description && <div className="text-xs text-slate-500 mt-0.5">{item.description}</div>}
                                                            </div>
                                                          )}
                                                        </td>
                                                        <td className="py-3 px-2 font-semibold text-center text-sm">
                                                          {isEditing ? (
                                                            <input 
                                                              type="number" 
                                                              value={invoiceLineDraft?.quantity || ''} 
                                                              onChange={(e) => setInvoiceLineDraft(p => ({ ...p, quantity: e.target.value }))}
                                                              className={`${workspaceInputCls} no-spinner`}
                                                            />
                                                          ) : (
                                                            Number(item.quantity).toFixed(0)
                                                          )}
                                                        </td>
                                                        <td className="py-3 px-2 font-semibold font-mono text-xs text-right">
                                                          {isEditing ? (
                                                            <div className="relative">
                                                              <span className="absolute left-1.5 top-1.5 text-[10px] text-slate-400 font-bold">$</span>
                                                              <input 
                                                                type="number" 
                                                                value={invoiceLineDraft?.unit_price || ''} 
                                                                onChange={(e) => setInvoiceLineDraft(p => ({ ...p, unit_price: e.target.value }))}
                                                                className={`${workspaceInputCls} no-spinner pl-4`}
                                                              />
                                                            </div>
                                                          ) : (
                                                            `$${Number(item.unit_price).toFixed(2)}`
                                                          )}
                                                        </td>
                                                        <td className="py-3 px-3 text-right font-extrabold text-slate-800 font-mono text-sm">
                                                          {isEditing ? (
                                                            `$${(Number(invoiceLineDraft?.quantity || 0) * Number(invoiceLineDraft?.unit_price || 0)).toFixed(2)}`
                                                          ) : (
                                                            `$${Number(item.line_total).toFixed(2)}`
                                                          )}
                                                        </td>
                                                        <td className="py-3 px-2 text-center">
                                                          {isEditing ? (
                                                            <div className="flex items-center justify-center gap-1">
                                                              <button onClick={() => saveInvoiceLine(invoiceDetail.id, item.id)} disabled={isSavingInvoiceLine} className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors" title="Save">
                                                                {isSavingInvoiceLine ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check size={16} />}
                                                              </button>
                                                              <button onClick={cancelEditInvoiceLine} className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors" title="Cancel">
                                                                <X size={16} />
                                                              </button>
                                                            </div>
                                                          ) : (
                                                            <div className="relative flex justify-center">
                                                              <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                  e.stopPropagation();
                                                                  setActiveInvoiceDraftMenuKey((prev) => (prev === `final-${invoiceDetail.id}-${item.id}` ? null : `final-${invoiceDetail.id}-${item.id}`));
                                                                }}
                                                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                                                title="Actions"
                                                              >
                                                                <MoreVertical size={16} />
                                                              </button>

                                                              {activeInvoiceDraftMenuKey === `final-${invoiceDetail.id}-${item.id}` && (
                                                                <>
                                                                  <div
                                                                    className="fixed inset-0 z-10"
                                                                    onClick={(e) => {
                                                                      e.stopPropagation();
                                                                      setActiveInvoiceDraftMenuKey(null);
                                                                    }}
                                                                  />
                                                                  <div className="absolute right-0 top-full z-20 mt-1 min-w-[130px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-in fade-in zoom-in-95 duration-100">
                                                                    <button
                                                                      type="button"
                                                                      onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setActiveInvoiceDraftMenuKey(null);
                                                                        handleRefinalizeInvoice(job.id);
                                                                      }}
                                                                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                                                    >
                                                                      <Edit2 size={14} className="text-slate-500" />
                                                                      <span>Edit</span>
                                                                    </button>
                                                                    <button
                                                                      type="button"
                                                                      onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setActiveInvoiceDraftMenuKey(null);
                                                                        handleRefinalizeInvoice(job.id);
                                                                      }}
                                                                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                                                                    >
                                                                      <Trash2 size={14} className="text-rose-600" />
                                                                      <span>Re-finalize to Edit</span>
                                                                    </button>
                                                                  </div>
                                                                </>
                                                              )}
                                                            </div>
                                                          )}
                                                        </td>
                                                      </tr>
                                                    );
                                                  })}
                                                </tbody>
                                              </table>
                                            </div>
                                            <div className="flex justify-end">
                                              <PrimaryBtn icon="refresh-cw" onClick={() => handleRefinalizeInvoice(job.id)} className="h-8 py-0 px-3 text-xs">
                                                Re-finalize to Edit
                                              </PrimaryBtn>
                                            </div>
                                            
                                            <div className="flex justify-end">
                                              <div className="text-right text-sm bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 w-64 shadow-sm">
                                                <div className="flex justify-between text-slate-500 font-medium"><span>Subtotal:</span> <span className="font-mono">${Number(invoiceDetail.subtotal || 0).toFixed(2)}</span></div>
                                                <div className="flex justify-between text-rose-500 font-medium"><span>Discount:</span> <span className="font-mono">-${Number(invoiceDetail.discount_amount || 0).toFixed(2)}</span></div>
                                                <div className="flex justify-between text-slate-500 font-medium"><span>Tax ({Number(invoiceDetail.tax_rate || 0).toFixed(2)}%):</span> <span className="font-mono">${Number(invoiceDetail.tax_amount || 0).toFixed(2)}</span></div>
                                                <div className="flex justify-between font-black text-slate-800 border-t border-slate-200 pt-2 mt-2 text-lg"><span>Total:</span> <span className="font-mono">${Number(invoiceDetail.total || 0).toFixed(2)}</span></div>
                                              </div>
                                            </div>
                                            {Array.isArray(invoiceDetail.payment_details) && invoiceDetail.payment_details.length > 0 && (
                                              <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-4 space-y-3">
                                                <div>
                                                  <h5 className="text-sm font-extrabold uppercase tracking-wide text-blue-900">Paid Details</h5>
                                                  <p className="text-xs text-slate-500 mt-1">Payments assigned to this invoice.</p>
                                                </div>
                                                <div className="space-y-1.5 text-sm text-slate-700">
                                                  {invoiceDetail.payment_details.filter((payment) => !payment.pending && payment.status !== 'pending').map((payment) => (
                                                    <div key={payment.id}>
                                                      <strong>${Number(payment.net_amount ?? (Number(payment.amount || 0) - Number(payment.refunded_amount || 0))).toFixed(2)}</strong> was paid on {payment.paid_at ? formatPaymentDate(payment.paid_at) : '—'} by {String(payment.method || payment.source_type || 'payment').replaceAll('_', ' ').toLowerCase()}
                                                    </div>
                                                  ))}
                                                  {Number(invoiceDetail.pending_payment_amount || 0) > 0 && (
                                                    <div className="pt-1 font-extrabold text-amber-700">Pending Payment: ${Number(invoiceDetail.pending_payment_amount).toFixed(2)}</div>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          /* Invoice Draft Editor */
                                          <div className="space-y-4">
                                            {isLoadingInvoiceDraft ? (
                                              <div className="py-8 text-center text-slate-400">
                                                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-brand" />
                                                <p className="text-xs font-bold uppercase tracking-widest">Loading Draft...</p>
                                              </div>
                                            ) : (
                                              <>
                                                <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
                                                  <table className="w-full text-left text-sm border-collapse">
                                                    <thead className="bg-slate-50">
                                                      <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-extrabold tracking-wider">
                                                        <th className="py-3 px-3">Item Details</th>
                                                        <th className="py-3 px-2 w-20 text-center">Qty</th>
                                                        <th className="py-3 px-2 w-28 text-right">Price</th>
                                                        <th className="py-3 px-3 text-right w-24">Total</th>
                                                        <th className="py-3 px-2 text-center w-12"></th>
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                      {Array.isArray(invoiceDraft?.line_items) && invoiceDraft.line_items.map((item, idx) => (
                                                        <tr key={idx} className="border-b border-slate-100 align-top hover:bg-slate-50/50 transition-colors last:border-b-0">
                                                          <td className="py-3 px-3 space-y-1.5">
                                                            <input 
                                                              type="text" 
                                                              value={item.name || ''} 
                                                              onChange={(e) => updateDraftLineItem(job.id, idx, 'name', e.target.value)}
                                                              className={`${workspaceInputCls} text-sm font-bold py-1.5`}
                                                              placeholder="Item Name"
                                                            />
                                                            <div className="flex gap-1.5">
                                                              <select
                                                                value={item.category || ''}
                                                                onChange={(e) => updateDraftLineItem(job.id, idx, 'category', e.target.value)}
                                                                className={`${workspaceInputCls} cursor-pointer !w-32 text-xs py-1.5 px-2 bg-slate-50 text-slate-600`}
                                                              >
                                                                <option value="">Category...</option>
                                                                <option value="moving_labor">Moving Labor</option>
                                                                <option value="transportation">Transportation</option>
                                                                <option value="packing">Packing</option>
                                                                <option value="materials">Materials</option>
                                                                <option value="trip_and_travel">Trip & Travel</option>
                                                                <option value="discount">Discount</option>
                                                                <option value="other">Other</option>
                                                              </select>
                                                              <input 
                                                                type="text" 
                                                                value={item.description || ''} 
                                                                onChange={(e) => updateDraftLineItem(job.id, idx, 'description', e.target.value)}
                                                                className={`${workspaceInputCls} flex-1 text-xs py-1.5`} 
                                                                placeholder="Optional description"
                                                              />
                                                            </div>
                                                          </td>
                                                          <td className="py-3 px-2">
                                                            <input 
                                                              type="number" 
                                                              value={item.quantity || ''} 
                                                              onChange={(e) => updateDraftLineItem(job.id, idx, 'quantity', e.target.value)}
                                                              className={`${workspaceInputCls} no-spinner text-sm text-center py-1.5`}
                                                            />
                                                          </td>
                                                          <td className="py-3 px-2">
                                                            <div className="relative">
                                                              <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-bold">$</span>
                                                              <input 
                                                                type="number" 
                                                                value={item.unit_price || ''} 
                                                                onChange={(e) => updateDraftLineItem(job.id, idx, 'unit_price', e.target.value)}
                                                                className={`${workspaceInputCls} no-spinner pl-5 text-sm text-right py-1.5 font-mono`}
                                                              />
                                                            </div>
                                                          </td>
                                                          <td className="py-3 px-3 text-right font-black text-slate-800 font-mono text-sm leading-[38px]">
                                                            ${(Number(item.quantity) * Number(item.unit_price) || 0).toFixed(2)}
                                                          </td>
                                                          <td className="py-3 px-2 text-center h-[52px] flex items-center justify-center">
                                                            <div className="relative">
                                                              <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                  e.stopPropagation();
                                                                  setActiveInvoiceDraftMenuKey((prev) => (prev === `draft-${job.id}-${idx}` ? null : `draft-${job.id}-${idx}`));
                                                                }}
                                                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                                                title="Actions"
                                                              >
                                                                <MoreVertical size={16} />
                                                              </button>

                                                              {activeInvoiceDraftMenuKey === `draft-${job.id}-${idx}` && (
                                                                <>
                                                                  <div
                                                                    className="fixed inset-0 z-10"
                                                                    onClick={(e) => {
                                                                      e.stopPropagation();
                                                                      setActiveInvoiceDraftMenuKey(null);
                                                                    }}
                                                                  />
                                                                  <div className="absolute right-0 top-full z-20 mt-1 min-w-[130px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-in fade-in zoom-in-95 duration-100">
                                                                    <button
                                                                      type="button"
                                                                      onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setActiveInvoiceDraftMenuKey(null);
                                                                        removeDraftLineItem(job.id, idx);
                                                                      }}
                                                                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                                                                    >
                                                                      <Trash2 size={14} className="text-rose-600" />
                                                                      <span>Delete Row</span>
                                                                    </button>
                                                                  </div>
                                                                </>
                                                              )}
                                                            </div>
                                                          </td>
                                                        </tr>
                                                      ))}
                                                      {(!invoiceDraft?.line_items || invoiceDraft.line_items.length === 0) && (
                                                        <tr>
                                                          <td colSpan="6" className="py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                                                            No line items added to this draft yet.
                                                          </td>
                                                        </tr>
                                                      )}
                                                    </tbody>
                                                  </table>
                                                </div>

                                                <div className="flex items-center justify-between pt-1">
                                                  <div className="flex items-center gap-2">
                                                  {Number(refinalizingInvoiceJobId) === Number(job.id) && (
                                                    <GhostBtn
                                                      onClick={() => {
                                                        setRefinalizingInvoiceJobId(null);
                                                        loadAccountingJobArtifacts(job.id);
                                                      }}
                                                      className="h-9 py-0 px-4 text-xs font-bold"
                                                    >
                                                      Cancel Re-finalize
                                                    </GhostBtn>
                                                  )}
                                                  <GhostBtn 
                                                    icon="plus" 
                                                    onClick={() => addDraftLineItem(job.id)}
                                                    tone="primary"
                                                    className="h-9 py-0 px-4 text-xs font-bold"
                                                  >
                                                    Add Charge Row
                                                  </GhostBtn>
                                                  <PrimaryBtn 
                                                    icon="check" 
                                                    onClick={() => handleOpenDraftPreview(job.id)}
                                                    disabled={isFinalizingInvoice}
                                                    className="h-9 py-0 px-4 text-xs font-bold"
                                                  >
                                                    Finalize Segment
                                                  </PrimaryBtn>
                                                  </div>
                                                </div>

                                                {/* Summary & Inputs Container */}
                                                <div className="mt-8 flex flex-col md:flex-row gap-6 justify-between items-start pt-4 border-t border-slate-100">
                                                  {/* Discount & Tax inputs for draft */}
                                                  <div className="flex gap-4">
                                                    <div className="w-28">
                                                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Discount ($)</label>
                                                      <input 
                                                        type="number" 
                                                        value={invoiceDraft?.discount_amount || ''} 
                                                        onChange={(e) => setInvoiceDraftsMap(p => ({ ...p, [job.id]: { ...(p[job.id] || {}), discount_amount: e.target.value } }))}
                                                        className={`${workspaceInputCls} no-spinner text-sm py-1.5 text-right font-mono`}
                                                      />
                                                    </div>
                                                    <div className="w-24">
                                                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Tax (%)</label>
                                                      <input 
                                                        type="number" 
                                                        value={invoiceDraft?.tax_rate ? (Number(invoiceDraft.tax_rate) * 100).toFixed(2) : ''} 
                                                        onChange={(e) => {
                                                          const val = Number(e.target.value);
                                                          setInvoiceDraftsMap(p => ({ ...p, [job.id]: { ...(p[job.id] || {}), tax_rate: String(val / 100) } }));
                                                        }}
                                                        className={`${workspaceInputCls} no-spinner text-sm py-1.5 text-right font-mono`}
                                                      />
                                                    </div>
                                                  </div>

                                                  {/* Summary Box */}
                                                  <div className="w-full md:w-80 space-y-4">
                                                    <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm space-y-2 text-sm text-slate-600 font-semibold">
                                                      <div className="flex justify-between">
                                                        <span>Subtotal</span>
                                                        <span className="font-mono text-slate-900">${draftSubtotal.toFixed(2)}</span>
                                                      </div>
                                                      <div className="flex justify-between">
                                                        <span>Discount</span>
                                                        <span className="font-mono text-rose-500">-${draftDiscount.toFixed(2)}</span>
                                                      </div>
                                                      <div className="flex justify-between">
                                                        <span>Tax ({(draftTaxRate * 100).toFixed(2)}%)</span>
                                                        <span className="font-mono text-slate-900">${draftTaxAmount.toFixed(2)}</span>
                                                      </div>
                                                      <div className="border-t border-slate-200 pt-2 mt-2"></div>
                                                      <div className="flex justify-between font-black text-slate-900 text-[15px]">
                                                        <span>Draft Total</span>
                                                        <span className="font-mono">${draftTotal.toFixed(2)}</span>
                                                      </div>
                                                      <div className="flex justify-between text-emerald-600">
                                                        <span>Paid (Gateway + Manual)</span>
                                                        <span className="font-mono">${draftPaid.toFixed(2)}</span>
                                                      </div>
                                                      <div className={`mt-3 p-2.5 rounded-lg border flex justify-between font-black items-center ${draftBalance <= 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                                                        <span>{draftBalance <= 0 ? 'Paid in Full' : 'Balance Due'}</span>
                                                        <span className="font-mono text-base">${Math.abs(draftBalance).toFixed(2)}</span>
                                                      </div>
                                                    </div>
                                                    
                                                    <div>
                                                      <h5 className="font-extrabold text-slate-900 text-sm mb-1.5">Paid Details</h5>
                                                      {allPayments.length > 0 ? (
                                                        <div className="space-y-1.5">
                                                          {allPayments.map(p => (
                                                            <div key={p.id} className="flex justify-between text-xs text-slate-600">
                                                              <span>{String(p.method || 'Unknown').replace('_', ' ')} ({new Date(p.created_at).toLocaleDateString()})</span>
                                                              <span className="font-mono text-emerald-600 font-bold">${Number(p.amount).toFixed(2)}</span>
                                                            </div>
                                                          ))}
                                                        </div>
                                                      ) : (
                                                        <p className="text-xs text-slate-400 font-medium italic">No payments recorded.</p>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          ) : (
                            <div className="border border-slate-200 rounded-xl p-8 text-center bg-slate-50">
                              <p className="text-sm font-bold text-slate-500">No estimates found.</p>
                            </div>
                          )}
                        </div>
{/* Right Column: Crew Payroll & Costing */}
                        <div className="col-span-12 lg:col-span-5 space-y-3">
                          <PaymentsPanel
                            opportunityId={opportunity?.id}
                            opportunity={opportunity}
                            estimateId={resolvedEstimateId}
                            jobId={accountingJob?.id}
                            estimateTotal={estimateSummary?.grand_total || accountingSummary?.estimate?.grand_total}
                            canAddManualPayment={estimateAllowsManualPayment}
                            onPaymentChange={loadAccounting}
                            onToast={setToast}
                            hideSummary={false}
                            branchId={selectedBranchId}
                          />
                          {/* Crew Payroll Section */}
                          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-4 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
                              <div className="flex items-center gap-2.5">
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                                  <Users size={18} />
                                </span>
                                <div>
                                  <h4 className="text-lg font-bold text-slate-800">Crew Payroll</h4>
                                  <p className="text-xs text-slate-400 mt-0.5 font-semibold">
                                    Allocate hours and rates for crew members.
                                  </p>
                                </div>
                              </div>
                                {canEditOpportunity() ? (
                                  <GhostBtn 
                                    icon="save" 
                                    onClick={savePayrollDraft} 
                                    disabled={isSavingPayroll}
                                    className="shrink-0 h-9 py-0 px-3.5 text-xs font-bold"
                                  >
                                    {isSavingPayroll ? 'Saving...' : 'Save Payroll'}
                                  </GhostBtn>
                                ) : null}
                            </div>

                            <div className="space-y-3">
                              {Array.isArray(payrollDraft) && payrollDraft.map((row, idx) => (
                                <div key={idx} className="flex flex-col sm:flex-row gap-3 sm:items-end border-b border-slate-50 pb-3">
                                  <div className="flex-1 space-y-1.5 w-full">
                                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Crew Member</label>
                                    <select
                                      value={row.crew_member_id}
                                      onChange={(e) => updatePayrollRow(idx, 'crew_member_id', e.target.value)}
                                      className={`${workspaceInputCls} cursor-pointer`}
                                    >
                                      <option value="">Select crew...</option>
                                      {crewDirectory.map((c) => (
                                        <option key={c.id} value={c.id}>
                                          {c.display_name || `${c.first_name} ${c.last_name}`.trim() || c.email}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="w-full sm:w-24 space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Role</label>
                                    <input 
                                      type="text" 
                                      value={row.role || ''} 
                                      onChange={(e) => updatePayrollRow(idx, 'role', e.target.value)}
                                      className={workspaceInputCls}
                                      placeholder="e.g. Helper"
                                    />
                                  </div>
                                  <div className="w-full sm:w-16 space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Hours</label>
                                    <input 
                                      type="number" 
                                      value={row.hours || ''} 
                                      onChange={(e) => updatePayrollRow(idx, 'hours', e.target.value)}
                                      className={`${workspaceInputCls} no-spinner text-center`}
                                      placeholder="0"
                                    />
                                  </div>
                                  <div className="w-full sm:w-20 space-y-1.5">
                                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Rate ($)</label>
                                    <input 
                                      type="number" 
                                      value={row.rate || ''} 
                                      onChange={(e) => updatePayrollRow(idx, 'rate', e.target.value)}
                                      className={`${workspaceInputCls} no-spinner text-center`}
                                      placeholder="0.00"
                                    />
                                  </div>
                                  <button 
                                    onClick={() => removePayrollRow(idx)}
                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl mb-0.5 self-end sm:self-auto transition-all"
                                    title="Remove crew row"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ))}
                              {(!payrollDraft || payrollDraft.length === 0) && (
                                <div className="py-6 text-center text-slate-400 text-xs font-semibold border border-dashed border-slate-200 rounded-xl bg-slate-50/30">
                                  No crew members added to payroll. Click "Add Crew Member" below.
                                </div>
                              )}

                              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                              {canEditOpportunity() ? (
                                <GhostBtn 
                                  icon="plus" 
                                  onClick={addPayrollRow}
                                  tone="primary"
                                  className="h-8 py-0 px-3 text-xs"
                                >
                                  Add Crew Member
                                </GhostBtn>
                              ) : null}
                                <div className="text-right text-xs font-bold text-slate-500">
                                  Total Payroll: <span className="text-sm font-black text-slate-900 font-mono">${(() => {
                                    return payrollDraft.reduce((acc, row) => acc + (Number(row.hours) * Number(row.rate) || 0), 0).toFixed(2);
                                  })()}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Job Costing Section */}
                          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-4 shadow-sm">
                            <div className="border-b border-slate-100 pb-3">
                              <h4 className="text-lg font-bold text-slate-800">Job Costing & Expenses</h4>
                              <p className="text-xs text-slate-400 mt-1 font-semibold">
                                Record other manual job costs (fuel, materials, commission, etc.)
                              </p>
                            </div>

                            {/* Add Cost Form */}
                            <div className="flex flex-col sm:flex-row gap-3 items-end bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                              <div className="flex-1 space-y-1.5 w-full">
                                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Category</label>
                                <select
                                  value={costDraft.category}
                                  onChange={(e) => setCostDraft(p => ({ ...p, category: e.target.value }))}
                                  className={`${workspaceInputCls} cursor-pointer`}
                                >
                                  <option value="misc">Misc</option>
                                  <option value="crew_labor">Crew Labor</option>
                                  <option value="sales_commission">Sales Commission</option>
                                  <option value="truck">Truck</option>
                                  <option value="materials">Materials</option>
                                  <option value="fuel">Fuel</option>
                                </select>
                              </div>
                              <div className="w-full sm:w-24 space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Amount ($)</label>
                                <input 
                                  type="number" 
                                  value={costDraft.amount} 
                                  onChange={(e) => setCostDraft(p => ({ ...p, amount: e.target.value }))}
                                  className={`${workspaceInputCls} no-spinner`}
                                  placeholder="0.00"
                                />
                              </div>
                              <div className="flex-[2] w-full space-y-1.5">
                                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Notes</label>
                                <input 
                                  type="text" 
                                  value={costDraft.description} 
                                  onChange={(e) => setCostDraft(p => ({ ...p, description: e.target.value }))}
                                  className={workspaceInputCls}
                                  placeholder="Description"
                                />
                              </div>
                              {canEditOpportunity() ? (
                                <PrimaryBtn 
                                  onClick={addCost}
                                  disabled={isSavingCost || !costDraft.amount}
                                  loading={isSavingCost}
                                  className="h-9 py-0 px-4 text-xs shrink-0 w-full sm:w-auto"
                                >
                                  Add
                                </PrimaryBtn>
                              ) : null}
                            </div>

                            {/* Category Cost Summary & Profitability */}
                            <div className="space-y-3 pt-1">
                              <div>
                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">
                                  Cost breakdown by Category
                                </h5>
                                <div className="grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-2">
                                  {(() => {
                                    const catLabels = {
                                      crew_labor: "Crew Labor",
                                      sales_commission: "Sales Commission",
                                      truck: "Truck",
                                      materials: "Materials",
                                      fuel: "Fuel",
                                      misc: "Misc / Other"
                                    };
                                    const catColors = {
                                      crew_labor: { border: "border-emerald-100", bg: "bg-emerald-50/30", text: "text-emerald-700", dot: "bg-emerald-500" },
                                      sales_commission: { border: "border-blue-100", bg: "bg-blue-50/30", text: "text-blue-700", dot: "bg-blue-500" },
                                      truck: { border: "border-purple-100", bg: "bg-purple-50/30", text: "text-purple-700", dot: "bg-purple-500" },
                                      materials: { border: "border-amber-100", bg: "bg-amber-50/30", text: "text-amber-700", dot: "bg-amber-500" },
                                      fuel: { border: "border-rose-100", bg: "bg-rose-50/30", text: "text-rose-700", dot: "bg-rose-500" },
                                      misc: { border: "border-slate-200", bg: "bg-slate-50/30", text: "text-slate-700", dot: "bg-slate-400" }
                                    };
                                    const byCategory = accountingSummary?.costs?.by_category || {};
                                    const categories = Object.keys(catLabels);
                                    return categories.map((c) => {
                                      const amt = Number(byCategory[c] || 0);
                                      if (amt <= 0 && c !== 'misc') return null;
                                      const colors = catColors[c] || catColors.misc;
                                      return (
                                        <div key={c} className={`flex justify-between items-center p-2.5 rounded-xl border ${colors.border} ${colors.bg}`}>
                                          <div className="flex items-center gap-2">
                                            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                                            <span className={`font-semibold ${colors.text}`}>{catLabels[c]}</span>
                                          </div>
                                          <span className="font-extrabold text-slate-800 font-mono">${amt.toFixed(2)}</span>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              </div>

                              {/* Profitability widget */}
                              <div className="border-t border-slate-100 pt-4 space-y-3">
                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                                  Job Profitability Summary
                                </h5>
                                {(() => {
                                  const revenue = Number(accountingSummary?.invoice?.total ?? invoiceDetail?.total ?? accountingSummary?.estimate?.grand_total ?? 0);
                                  const payrollTotal = payrollDraft.reduce((acc, row) => acc + (Number(row.hours) * Number(row.rate) || 0), 0);
                                  const otherCostsTotal = Number(accountingSummary?.costs?.total ?? 0);
                                  const totalCosts = payrollTotal + otherCostsTotal;
                                  const netProfit = revenue - totalCosts;
                                  const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
                                  const isProfitable = netProfit >= 0;
                                  return (
                                    <div className={`p-4 rounded-xl border transition-all ${
                                      isProfitable 
                                        ? 'bg-emerald-50/20 border-emerald-100/80 shadow-[0_12px_40px_-20px_rgba(16,185,129,0.15)]' 
                                        : 'bg-rose-50/20 border-rose-100/80 shadow-[0_12px_40px_-20px_rgba(244,63,94,0.15)]'
                                    } space-y-4`}>
                                      <div className="flex justify-between text-xs font-semibold text-slate-500">
                                        <span>Gross Revenue</span>
                                        <span className="font-bold text-slate-800 font-mono">${revenue.toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between text-xs font-semibold text-slate-500">
                                        <span>Total Costs (Payroll + Expenses)</span>
                                        <span className="font-bold text-rose-600 font-mono">-${totalCosts.toFixed(2)}</span>
                                      </div>

                                      {revenue > 0 && (
                                        <div className="space-y-1.5 pt-1">
                                          <div className="w-full bg-slate-200/60 rounded-full h-2 overflow-hidden flex">
                                            <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${Math.min(100, (totalCosts / revenue) * 100)}%` }} title={`Costs: ${Math.min(100, (totalCosts / revenue) * 100).toFixed(0)}%`} />
                                            {isProfitable && (
                                              <div className="bg-emerald-500 h-full flex-1 transition-all duration-500" title={`Profit margin: ${profitMargin.toFixed(0)}%`} />
                                            )}
                                          </div>
                                          <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                            <span>Costs ({((totalCosts / revenue) * 105 ? ((totalCosts / revenue) * 100).toFixed(0) : 0)}%)</span>
                                            {isProfitable && <span>Profit ({profitMargin.toFixed(0)}%)</span>}
                                          </div>
                                        </div>
                                      )}

                                      <div className="border-t border-slate-150 pt-3 flex justify-between items-center">
                                        <div>
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Net Profit</span>
                                          <span className={`text-xl font-black font-mono ${isProfitable ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            ${netProfit.toFixed(2)}
                                          </span>
                                        </div>
                                        <div className="text-right">
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Profit Margin</span>
                                          <span className={`text-xl font-black font-mono ${isProfitable ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {profitMargin.toFixed(1)}%
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "Payments" && (
                <EstimateView
                  onRefresh={fetchOpportunity}
                  opportunity={isLeadPath ? estimateOpportunity : opportunity}
                  sourceType={isLeadPath ? 'lead' : 'opportunity'}
                  isLoadingLinkedOpportunity={isLeadPath && isLoadingEstimateOpportunity}
                  opportunityJobs={opportunityJobs}
                  subJobServiceOptions={computedSubJobServiceOptions}
                  selectedSubJobId={selectedEstimateJobId}
                  onSelectedSubJobChange={setSelectedEstimateJobId}
                  onCreateSubJob={createSubJobFromServiceType}
                  onRefreshSubJobs={loadOpportunityJobs}
                  onDeleteSelectedSubJob={deleteSelectedEstimateJob}
                  onUpdateSelectedSubJob={updateSelectedEstimateJobPlanning}
                  triggerSendEstimate={sendEstimateNonce}
                  triggerViewEstimate={triggerViewEstimateNonce}
                  view={view}
                  initialSubTab="payments"
                  onSubTabChange={(subTab) => {
                    if (subTab === 'documents') {
                      setActiveTab('Documents');
                      navigateToDetailTab('Documents');
                    } else if (subTab === 'payments') {
                      setActiveTab('Payments');
                      navigateToDetailTab('Payments');
                    } else {
                      setActiveTab('Estimate');
                      navigateToEstimateSubTab(subTab);
                    }
                  }}
                  isOpportunityLocked={isOpportunityLost}
                  canCreateOpportunity={canCreateOpportunity()}
                  canEditOpportunity={canEditOpportunity()}
                />
            )}
        </div>

          {showSidebarCards && isMobileSidebarOpen && (
            <div 
              className="fixed inset-0 z-[115] bg-heading/20 lg:hidden transition-opacity duration-300 animate-in fade-in"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}

          {showSidebarCards ? (
            /* Right sidebar column */
            <div className={`col-span-12 lg:col-span-4 space-y-2 
              /* Mobile/Tablet drawer styling: */
              fixed inset-y-0 right-0 z-[120] w-full max-w-full sm:w-96 bg-slate-50 p-3 sm:p-4 overflow-y-auto overflow-x-visible shadow-2xl border-l border-ink-100 transition-all duration-300
              lg:static lg:w-auto lg:p-0 lg:bg-transparent lg:shadow-none lg:border-none lg:z-auto lg:translate-x-0 lg:opacity-100 lg:visible
              ${isMobileSidebarOpen ? 'translate-x-0 opacity-100 visible' : 'translate-x-full opacity-0 invisible lg:translate-x-0 lg:opacity-100 lg:visible'}
            `}>
              {/* Close X icon visible on mobile view only */}
              <div className="flex items-center justify-between lg:hidden mb-4 pb-2 border-b border-ink-100">
                <span className="text-sm font-black uppercase tracking-wider text-ink-900">Details Workspace</span>
                <button 
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white ring-1 ring-ink-100 text-ink-600 shadow-sm hover:bg-ink-50 hover:text-ink-900 active:scale-95 transition cursor-pointer"
                  aria-label="Close sidebar"
                >
                  <Icon name="x" className="w-5 h-5" />
                </button>
              </div>

              <SidebarSpecs 
                specs={specsData}
                onInlineSave={canEditOpportunity() ? handleSpecsInlineSave : undefined}
              />
              <RouteLogisticsCard
                stops={(isLeadPath ? estimateOpportunity : opportunity)?.stops || []}
                origin={(isLeadPath ? estimateOpportunity?.origin_address_details : opportunity?.origin_address_details) || {
                  address_line1: form.origin_street,
                  // city: form.origin_city,
                  // state: form.origin_state,
                  // postal_code: form.origin_zip,
                }}
                destination={(isLeadPath ? estimateOpportunity?.destination_address_details : opportunity?.destination_address_details) || {
                  address_line1: form.destination_street,
                  // city: form.destination_city,
                  // state: form.destination_state,
                  // postal_code: form.destination_zip,
                  }}
                  routeStops={routePoints}
                  onEdit={!isCreation && canEditOpportunity() ? startRouteEdit : undefined}
                  onOpenMap={() => navigateToEstimateSubTab('route')}
                  onAddStop={() => navigateToEstimateSubTab('route')}
                  onEditStop={!isLeadPath && !isCreation && canEditOpportunity() ? openSalesRouteStopEditor : undefined}
                  onDeleteStop={!isLeadPath && !isCreation && canEditOpportunity() ? deleteSalesRouteStop : undefined}
              />
            
              <InventorySnapshot 
                roomCount={inventorySnapshotData.roomCount}
                totalQty={inventorySnapshotData.totalQty}
	                totalVol={inventorySnapshotData.totalVol}
	                items={inventorySnapshotData.items}
                  isLoading={isLoadingPortalInventory}
	                onOpenFullList={() => navigateToEstimateSubTab('inventory')}
              />
              <div className="max-h-[360px] overflow-hidden rounded-xl border border-ink-100 bg-white shadow-sm flex flex-col">
                <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-ink-100 bg-white px-4 py-3">
                  <div>
                    <div className="label-eyebrow text-ink-400">Follow-ups</div>
                    <h3 className="text-lg font-extrabold text-ink-900 mt-0.5">Task queue</h3>
                  </div>
                  {canCreateTask() ? (
                    <GhostBtn icon="calendar-plus" onClick={openCreateFollowUpModal}>Add Follow-up</GhostBtn>
                  ) : null}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-3">
                  {isLoadingFollowUps ? (
                    <div className="py-10 text-center text-ink-400">
                      <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
                      Loading follow-ups...
                    </div>
                  ) : followUps.length ? (
                    <>
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-widest text-ink-400">Pending</span>
                          <span className="text-xs font-semibold text-ink-400">{pendingFollowUps.length}</span>
                        </div>
                        <div className="space-y-2">
                          {pendingFollowUps.length ? pendingFollowUps.map(renderFollowUpItem) : (
                            <div className="rounded-xl border border-dashed border-ink-100 bg-ink-50/50 px-4 py-4 text-sm text-ink-400">
                              No pending follow-ups.
                            </div>
                          )}
                        </div>
                      </div>
                      {completedFollowUps.length ? (
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-widest text-ink-400">Completed</span>
                            <span className="text-xs font-semibold text-ink-400">{completedFollowUps.length}</span>
                          </div>
                          <div className="space-y-2">
                            {completedFollowUps.map(renderFollowUpItem)}
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="rounded-xl border border-dashed border-ink-100 bg-ink-50/50 px-4 py-6 text-center text-sm text-ink-400">
                      No follow-ups yet. Add one to keep the pipeline moving.
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : null}
        </div>
      </main>

      {selectedActivityForPreview && (
        <ActivityPreviewModal 
          activity={selectedActivityForPreview} 
          branchLogoUrl={selectedBranchLogoUrl}
          branchName={selectedBranchName}
          onClose={() => setSelectedActivityForPreview(null)} 
          onReply={(activity) => {
            setSelectedActivityForPreview(null);
            setCommTab('email');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            setTimeout(() => {
              const subject = activity.subject || activity.email_log_details?.subject || '';
              const fromEmail = activity?.payload?.from_email || activity?.email_log_details?.from_email || activity?.from_email || '';
              
              setActivitySubject(subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`);
              if (fromEmail) {
                setActivityEmailToText(fromEmail);
              }
              setCurrentActivityBody('');
            }, 100);
          }}
        />
      )}

      {isEstimateRequirementsModalOpen && estimateRequirementsDraft && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-heading/25">
          <Card className="w-full max-w-4xl p-0 overflow-hidden rounded-3xl border-0 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-950 px-6 py-4 text-white">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/60">Estimate Requirements</p>
                <h3 className="text-lg font-black tracking-tight">Complete Required Fields</h3>
              </div>
              <button
                type="button"
                onClick={closeEstimateRequirementsModal}
                disabled={isSavingEstimateRequirements}
                className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close estimate requirements modal"
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto p-6">
              <div className="space-y-6">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Before Estimate Creation</div>
                  <div className="mt-2 text-sm font-semibold text-amber-900">
                    Estimates require complete customer, move, and route data. Fill the missing fields below and the estimate will be created immediately after save.
                  </div>
                  {getEstimateRequirementGaps(estimateRequirementsDraft).length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {getEstimateRequirementGaps(estimateRequirementsDraft).map((label) => (
                        <span
                          key={label}
                          className="inline-flex rounded-full border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-amber-700"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="text-sm font-black uppercase tracking-widest text-slate-400">Customer</div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={estimateRequirementsDraft.first_name || ''}
                          onChange={(e) => setEstimateRequirementsDraft((prev) => ({ ...prev, first_name: e.target.value }))}
                          className={workspaceInputCls}
                          placeholder="First name"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={estimateRequirementsDraft.last_name || ''}
                          onChange={(e) => setEstimateRequirementsDraft((prev) => ({ ...prev, last_name: e.target.value }))}
                          className={workspaceInputCls}
                          placeholder="Last name"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">
                          Email
                        </label>
                        <input
                          type="email"
                          value={estimateRequirementsDraft.email || ''}
                          onChange={(e) => setEstimateRequirementsDraft((prev) => ({ ...prev, email: e.target.value }))}
                          className={workspaceInputCls}
                          placeholder="name@example.com"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">
                          Phone
                        </label>
                        <input
                          type="text"
                          value={estimateRequirementsDraft.phone || ''}
                          onChange={(e) => setEstimateRequirementsDraft((prev) => ({ ...prev, phone: e.target.value }))}
                          className={workspaceInputCls}
                          placeholder="(555) 555-5555"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-sm font-black uppercase tracking-widest text-slate-400">Move Details</div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">
                          Move Date
                        </label>
                        <input
                          type="date"
                          value={estimateRequirementsDraft.move_date || ''}
                          onChange={(e) => setEstimateRequirementsDraft((prev) => ({ ...prev, move_date: e.target.value }))}
                          className={workspaceInputCls}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">
                          Branch
                        </label>
                        <AsyncSelect
                          value={estimateRequirementsDraft.branch || ''}
                          onChange={(val) => setEstimateRequirementsDraft((prev) => ({ ...prev, branch: val }))}
                          fetchOptions={getBranchLookupsPage}
                          labelField="name"
                          valueField="id"
                          placeholder="Select branch..."
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">
                          Service Type
                        </label>
                        <select
                          value={estimateRequirementsDraft.service_type || ''}
                          onChange={(e) => setEstimateRequirementsDraft((prev) => ({ ...prev, service_type: e.target.value }))}
                          className={`${workspaceInputCls} cursor-pointer`}
                        >
                          <option value="">Select service type...</option>
                          {(serviceTypes.length ? serviceTypes : SERVICE_TYPE_OPTIONS).map((option) => (
                            <option key={String(option.id ?? option.value ?? option.code ?? option.label ?? option.name)} value={String(option.id ?? option.value ?? option.code ?? option.label ?? option.name)}>
                              {String(option.name || option.label || option.value || option.id)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">
                          Move Type
                        </label>
                        <select
                          value={estimateRequirementsDraft.move_type || ''}
                          onChange={(e) => setEstimateRequirementsDraft((prev) => ({ ...prev, move_type: e.target.value }))}
                          className={`${workspaceInputCls} cursor-pointer`}
                        >
                          <option value="">Select move type...</option>
                          {(moverTypes.length ? moverTypes : MOVE_TYPE_OPTIONS).map((option) => (
                            <option key={String(option.id ?? option.value ?? option.code ?? option.label ?? option.name)} value={String(option.id ?? option.value ?? option.code ?? option.label ?? option.name)}>
                              {String(option.name || option.label || option.value || option.id)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-sm font-black uppercase tracking-widest text-slate-400">Route</div>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">
                        Origin Address
                      </label>
                      <AddressAutocomplete
                        country="ca,us"
                        value={estimateRequirementsDraft.origin_street || ''}
                        onChange={(e) =>
                          setEstimateRequirementsDraft((prev) => ({ ...prev, origin_street: e.target.value }))
                        }
                        onPick={(parts) =>
                          setEstimateRequirementsDraft((prev) => ({
                            ...prev,
                            origin_street: parts.formattedAddress || parts.street || prev.origin_street,
                            origin_city: parts.city || prev.origin_city,
                            origin_state: parts.province || prev.origin_state,
                            origin_zip: parts.postalCode || prev.origin_zip,
                          }))
                        }
                        className={workspaceInputCls}
                        placeholder="123 Main St, City, State ZIP"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">
                        Destination Address
                      </label>
                      <AddressAutocomplete
                        country="ca,us"
                        value={estimateRequirementsDraft.destination_street || ''}
                        onChange={(e) =>
                          setEstimateRequirementsDraft((prev) => ({ ...prev, destination_street: e.target.value }))
                        }
                        onPick={(parts) =>
                          setEstimateRequirementsDraft((prev) => ({
                            ...prev,
                            destination_street: parts.formattedAddress || parts.street || prev.destination_street,
                            destination_city: parts.city || prev.destination_city,
                            destination_state: parts.province || prev.destination_state,
                            destination_zip: parts.postalCode || prev.destination_zip,
                          }))
                        }
                        className={workspaceInputCls}
                        placeholder="456 Destination Ave, City, State ZIP"
                      />
                    </div>
                  </div>
                </div>

                {estimateRequirementsError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                    {estimateRequirementsError}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <div className="text-xs font-semibold text-slate-500">
                Saving this form updates the opportunity first, then creates the estimate.
              </div>
              <div className="flex items-center gap-2">
                <GhostBtn onClick={closeEstimateRequirementsModal} disabled={isSavingEstimateRequirements}>
                  Cancel
                </GhostBtn>
                <PrimaryBtn onClick={handleSaveEstimateRequirementsAndCreate} loading={isSavingEstimateRequirements}>
                  Save And Create Estimate
                </PrimaryBtn>
              </div>
            </div>
          </Card>
        </div>
      )}

      {isFollowUpModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-heading/25">
          <Card className="w-full max-w-lg p-0 overflow-hidden rounded-3xl border-0 shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="bg-brand text-white px-6 py-4 flex items-center justify-between">
                <h3 className="font-black uppercase tracking-tight">
                  {followUpMode === 'edit' ? 'Edit Follow-up' : 'Add Follow-up'}
                </h3>
                <button onClick={closeFollowUpModal}><Icon name="x" className="w-5 h-5" /></button>
             </div>
             <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="label-eyebrow text-ink-400">Task Type</label>
                  <select value={followUpType} onChange={e => setFollowUpType(e.target.value)} className={inputCls}>
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="sms">Text/SMS</option>
                    <option value="meeting">Meeting</option>
                    <option value="general">General Task</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="label-eyebrow text-ink-400">Subject</label>
                  <input value={followUpSubject} onChange={e => setFollowUpSubject(e.target.value)} className={inputCls} placeholder="e.g. Check on inventory" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="label-eyebrow text-ink-400">Due Date</label>
                    <input type="date" value={followUpDueDate} onChange={e => setFollowUpDueDate(e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <label className="label-eyebrow text-ink-400">Due Time</label>
                    <input type="time" value={followUpDueTime} onChange={e => setFollowUpDueTime(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="label-eyebrow text-ink-400">Assign To</label>
                <AsyncSelect 
                  value={followUpAssignedTo} 
                  onChange={(val) => setFollowUpAssignedTo(val)} 
                  fetchOptions={(search, offset, limit) => getLookupUsersPage(search, offset, limit, selectedBranch?.id || form.branch || null)} 
                  labelField="label" 
                  valueField="id" 
                  placeholder="Select teammate..." 
                  className="w-full"
                />
                </div>
                <div className="space-y-1">
                  <label className="label-eyebrow text-ink-400">Notes</label>
                  <textarea
                    value={followUpNotes}
                    onChange={e => setFollowUpNotes(e.target.value)}
                    className={inputCls + ' h-28'}
                    placeholder="Optional notes for this follow-up"
                  />
                </div>
                <div className="pt-4 flex justify-end gap-2">
                  <GhostBtn onClick={closeFollowUpModal}>Cancel</GhostBtn>
                  <PrimaryBtn onClick={handleSaveFollowUp} loading={isSavingFollowUp}>
                    {followUpMode === 'edit' ? 'Save Changes' : 'Create Follow-up'}
                  </PrimaryBtn>
                </div>
             </div>
          </Card>
        </div>
      )}

      {callLogModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-heading/25">
          <Card className="w-full max-w-lg p-0 overflow-hidden rounded-3xl border-0 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-brand text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-black uppercase tracking-tight">Edit Call Log</h3>
              <button onClick={closeCallLogModal}><Icon name="x" className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="label-eyebrow text-ink-400">Direction</span>
                  <select
                    value={callLogDraft.direction}
                    onChange={(e) => setCallLogDraft((prev) => ({ ...prev, direction: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="outbound">Outbound</option>
                    <option value="inbound">Inbound</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="label-eyebrow text-ink-400">Outcome</span>
                  <select
                    value={callLogDraft.disposition}
                    onChange={(e) => setCallLogDraft((prev) => ({ ...prev, disposition: e.target.value }))}
                    className={inputCls}
                  >
                    {CALL_DISPOSITION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="space-y-1 block">
                <span className="label-eyebrow text-ink-400">Notes</span>
                <textarea
                  value={callLogDraft.notes}
                  onChange={(e) => setCallLogDraft((prev) => ({ ...prev, notes: e.target.value }))}
                  className={inputCls + ' h-28'}
                  placeholder="Call notes..."
                />
              </label>
              <label className="space-y-1">
                <span className="label-eyebrow text-ink-400">Duration (minutes)</span>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={callLogDraft.duration_minutes}
                  onChange={(e) => setCallLogDraft((prev) => ({ ...prev, duration_minutes: e.target.value }))}
                  className={inputCls}
                />
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <GhostBtn onClick={closeCallLogModal} disabled={isPosting}>Cancel</GhostBtn>
              <PrimaryBtn onClick={saveCallLogEdits} loading={isPosting}>Save Call Log</PrimaryBtn>
            </div>
          </Card>
        </div>
      )}

      {isReasonModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-heading/25">
          <Card className="w-full max-w-lg p-0 overflow-hidden rounded-3xl border-0 shadow-2xl">
             <div className={reasonAction === 'cancel' ? 'bg-amber-600 text-white px-6 py-4' : 'bg-rose-600 text-white px-6 py-4'}>
                <h3 className="font-black uppercase tracking-tight">
                  {reasonAction === 'cancel' ? 'Cancel Job' : 'Mark as Lost'}
                </h3>
             </div>
             <div className="p-6 space-y-4">
                <p className="text-sm text-ink-500">
                  {reasonAction === 'cancel'
                    ? 'Please provide a reason why this job is being canceled. This helps us keep records accurate.'
                    : 'Please provide a reason why this deal was lost. This helps us improve our sales process.'}
                </p>
                {reasonAction !== 'cancel' && (
                  <label className="block space-y-1">
                    <span className="label-eyebrow text-ink-400">Why was the opportunity lost?</span>
                    <select
                      value={selectedLostReason}
                      onChange={(e) => setSelectedLostReason(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Please select one...</option>
                      {lostReasonOptions.map((option) => (
                        <option key={String(option?.id || option?.label || '')} value={String(option?.label || '')}>
                          {String(option?.label || '')}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <textarea 
                  value={reasonText} 
                  onChange={e => setReasonText(e.target.value)} 
                  className={inputCls + " h-32"} 
                  placeholder={reasonAction === 'cancel' ? 'Enter cancellation reason...' : 'Add optional notes...'}
                />
                <div className="flex justify-end gap-2">
                  <GhostBtn onClick={() => {
                    setIsReasonModalOpen(false);
                    setReasonAction('');
                    setSelectedLostReason('');
                    setReasonText('');
                  }}>Cancel</GhostBtn>
                  <PrimaryBtn
                    className={reasonAction === 'cancel' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'}
                    onClick={submitWorkflowReason}
                    loading={isSaving}
                  >
                    {reasonAction === 'cancel' ? 'Confirm Cancel' : 'Confirm Loss'}
                  </PrimaryBtn>
                </div>
             </div>
          </Card>
        </div>
      )}

      {isInvoicePreviewOpen && invoicePreviewData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-heading/25">
          <Card className="w-full max-w-3xl p-0 overflow-hidden rounded-[28px] border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] bg-[#f8fafc]">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-black uppercase tracking-tight text-lg">
                  Invoice Preview
                </h3>
                <p className="text-xs text-slate-300">
                  Review and edit the segment invoice before finalizing it.
                </p>
              </div>
              <button 
                onClick={() => setIsInvoicePreviewOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable Document Content */}
            <div className="p-5 md:p-8 space-y-6 overflow-y-auto flex-1 bg-[#f8fafc] font-sans">
              {/* Paper Invoice Sheet */}
              <div className="bg-white border border-slate-200 rounded-[18px] p-6 md:p-8 shadow-sm space-y-6 text-slate-800 text-sm">
                
                {/* Invoice Top Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-100">
                  <div className="space-y-2">
                    {/* Branch Logo */}
                    {(opportunity?.branch_details?.logo || opportunity?.branch_details?.logo_url) ? (
                      <img 
                        src={opportunity?.branch_details?.logo || opportunity?.branch_details?.logo_url} 
                        alt="Branch Logo" 
                        className="max-h-12 w-auto object-contain"
                      />
                    ) : (
                      <div className="flex items-center gap-2 font-bold text-slate-900 text-lg">
                        <Building2 size={24} className="text-[#004e9a]" />
                        {opportunity?.branch_details?.name || 'Movers CRM'}
                      </div>
                    )}
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1 block">
                      {opportunity?.branch_details?.name || 'Branch Office'}
                    </p>
                  </div>
                  <div className="sm:text-right space-y-1">
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Invoice</h2>
                    <p className="font-mono text-slate-500 font-bold">
                      {invoicePreviewData.invoice_number}
                    </p>
                    <p className="text-xs text-slate-400 font-semibold">
                      Date: {new Date().toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Bill To & Job Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-slate-100 text-xs">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bill To</p>
                    <p className="font-bold text-slate-900 text-sm">{opportunity?.customer_details?.full_name || `${opportunity?.customer_details?.first_name || ''} ${opportunity?.customer_details?.last_name || ''}`.trim() || 'Client'}</p>
                    <p className="text-slate-500">{opportunity?.customer_details?.email || '—'}</p>
                    <p className="text-slate-500">{opportunity?.customer_details?.phone || '—'}</p>
                  </div>
                  <div className="space-y-1 col-span-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Job Details</p>
                    <p className="font-bold text-slate-900">Move Date: <span className="font-normal text-slate-600">{opportunity?.move_date || '—'}</span></p>
                    <p className="font-bold text-slate-900">Service: <span className="font-normal text-slate-600">{opportunity?.service_type_name || getMoveTypeLabel(opportunity?.service_type || '-') || opportunity?.service_type || '—'}</span></p>
                    <p className="font-bold text-slate-900">Origin: <span className="font-normal text-slate-600">{view.originText || '—'}</span></p>
                    <p className="font-bold text-slate-900">Destination: <span className="font-normal text-slate-600">{view.destText || '—'}</span></p>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="overflow-x-auto rounded-[16px] border border-[#c7d2fe]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#1976d2] text-white uppercase font-bold tracking-wider text-[10px]">
                        <th className="py-2.5 px-2 w-[32%]">Name</th>
                        <th className="py-2.5 px-2 w-[38%]">Rate</th>
                        <th className="py-2.5 px-2 text-right w-[10%]">Subtotal</th>
                        <th className="py-2.5 px-2 text-right w-[10%]">Discount</th>
                        <th className="py-2.5 px-2 text-right w-[10%]">Total Cost</th>
                        <th className="py-2.5 px-2 text-center w-[4%]">T</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoicePreviewAction === 'opportunity_preview' || invoicePreviewAction === 'opportunity_send' ? (
                        (Array.isArray(invoicePreviewData.grouped_sections) ? invoicePreviewData.grouped_sections : []).map((section, sectionIdx) => (
                          <React.Fragment key={`${section.job_id || sectionIdx}-${sectionIdx}`}>
                            <tr className="bg-slate-50">
                              <td colSpan={6} className="py-2.5 px-2 font-black text-slate-700 text-sm">
                                Job {section.job_number || `#${section.job_id || section.planned_sub_job_id || '—'}`} - {section.job_title || section.service_type_label || 'Job'}
                              </td>
                            </tr>
                            {(Array.isArray(section.line_items) ? section.line_items : []).map((item, idx) => (
                              <tr key={`${sectionIdx}-${idx}`} className="hover:bg-slate-50/50 align-middle">
                                <td className="py-3 px-2 align-top">
                                  <p className="font-bold text-slate-900 leading-tight">{item.name}</p>
                                  {item.description && <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">{item.description}</p>}
                                </td>
                                <td className="py-3 px-2 align-top text-slate-600">
                                  {item.rate_display || item.description || '--'}
                                </td>
                                <td className="py-3 px-2 align-top text-right font-semibold text-slate-500">
                                  {item.subtotal_display || '--'}
                                </td>
                                <td className="py-3 px-2 align-top text-right font-semibold text-slate-500">
                                  {item.discount_display || '--'}
                                </td>
                                <td className="py-3 px-2 align-top text-right font-extrabold text-slate-900">
                                  {item.total_cost_display || '--'}
                                </td>
                                <td className="py-3 px-2 align-top text-center font-bold text-slate-600">
                                  {item.taxable ? 'T' : '--'}
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))
                      ) : (
                        (Array.isArray(invoicePreviewData.line_items) ? invoicePreviewData.line_items : []).map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 align-middle">
                            <td className="py-3 px-2 align-top">
                              <p className="font-bold text-slate-900">{item.name}</p>
                              {item.description && <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">{item.description}</p>}
                            </td>
                            <td className="py-3 px-2 align-top text-slate-600">
                              {invoicePreviewAction === 'opportunity_preview'
                                ? '--'
                                : (item.rate_display || item.description || `${Number(item.unit_price || 0).toFixed(2)} x ${item.quantity || 0}`)}
                            </td>
                            <td className="py-3 px-2 align-top text-right font-semibold text-slate-500">
                              {invoicePreviewAction === 'opportunity_preview' ? '--' : (item.subtotal_display || '--')}
                            </td>
                            <td className="py-3 px-2 align-top text-right font-semibold text-slate-500">
                              {invoicePreviewAction === 'opportunity_preview' ? '--' : (item.discount_display || '--')}
                            </td>
                            <td className="py-3 px-2 align-top text-right font-extrabold text-slate-900">
                              {invoicePreviewAction === 'opportunity_preview'
                                ? '--'
                                : (item.total_cost_display || `$${Number(item.line_total || 0).toFixed(2)}`)}
                            </td>
                            <td className="py-3 px-2 align-top text-center font-bold text-slate-600">
                              {item.taxable ? 'T' : '--'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summary Calculations */}
                <div className="flex flex-col w-full border-t border-slate-200 pt-4 text-xs text-slate-600">
                  <div className="flex justify-end w-full">
                    <div className="flex flex-col items-end space-y-1.5 shrink-0 w-60">
                      <div className="flex justify-between w-full">
                        <span>Subtotal</span>
                        <span className="font-bold text-slate-900">
                          {invoicePreviewAction === 'opportunity_preview' ? `$${invoicePreviewData.subtotal.toFixed(2)}` : `$${invoicePreviewData.subtotal.toFixed(2)}`}
                        </span>
                      </div>
                      <div className="flex justify-between w-full">
                        <span>Discount</span>
                        <span className="font-bold text-rose-600">
                          {invoicePreviewAction === 'opportunity_preview' ? `-$${invoicePreviewData.discount_amount.toFixed(2)}` : `-$${invoicePreviewData.discount_amount.toFixed(2)}`}
                        </span>
                      </div>
                      <div className="flex justify-between w-full">
                        <span>Tax ({(invoicePreviewData.tax_rate * 100).toFixed(2)}%)</span>
                        <span className="font-bold text-slate-900">
                          {invoicePreviewAction === 'opportunity_preview' ? `$${invoicePreviewData.tax_amount.toFixed(2)}` : `$${invoicePreviewData.tax_amount.toFixed(2)}`}
                        </span>
                      </div>
                      <div className="flex justify-between w-full border-t border-slate-200 pt-2 text-sm font-black text-slate-800 uppercase tracking-tight">
                        <span>Grand Total</span>
                        <span>{invoicePreviewAction === 'opportunity_preview' ? `$${invoicePreviewData.total.toFixed(2)}` : `$${invoicePreviewData.total.toFixed(2)}`}</span>
                      </div>
                      <div className="flex justify-between w-full text-emerald-600 font-semibold">
                        <span>Payments</span>
                        <span>{invoicePreviewAction === 'opportunity_preview' ? `$${invoicePreviewData.paid.toFixed(2)}` : `$${invoicePreviewData.paid.toFixed(2)}`}</span>
                      </div>
                      {invoicePreviewData.balance_due <= 0 ? (
                        <div className="flex justify-between w-full text-emerald-700 font-black border-t border-slate-250 pt-2.5 mt-1 text-sm bg-emerald-50 border border-emerald-100 rounded-xl px-3.5 py-2 uppercase tracking-wide">
                          <span>Status</span>
                          <span>Paid in Full</span>
                        </div>
                      ) : (
                        <div className="flex justify-between w-full text-amber-700 font-black mt-1 text-sm bg-amber-50 border border-amber-100/60 rounded-xl px-3.5 py-2 uppercase tracking-wide">
                          <span>Balance Due</span>
                          <span>{invoicePreviewAction === 'opportunity_preview' ? `$${invoicePreviewData.balance_due.toFixed(2)}` : `$${invoicePreviewData.balance_due.toFixed(2)}`}</span>
                        </div>
                      )}

                      {Array.isArray(invoicePreviewData.payment_details) && (invoicePreviewData.payment_details.length > 0 || Number(invoicePreviewData.pending_payment_amount || 0) > 0) && (
                        <div className="mt-4 w-full rounded-xl border border-blue-100 bg-blue-50/30 p-3 text-left">
                          <div className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-blue-900">Paid Details</div>
                          <div className="space-y-1.5 text-[11px] text-slate-700">
                            {invoicePreviewData.payment_details.filter((payment) => !payment.pending && payment.status !== 'pending').map((payment, index) => (
                              <div key={payment.id || index}>
                                <strong>${Number(payment.net_amount ?? (Number(payment.amount || 0) - Number(payment.refunded_amount || 0))).toFixed(2)}</strong> was paid on {payment.paid_at || payment.date ? formatPaymentDate(payment.paid_at || payment.date) : '—'} by {String(payment.method || payment.source_type || 'payment').replaceAll('_', ' ').toLowerCase()}
                              </div>
                            ))}
                            {Number(invoicePreviewData.pending_payment_amount || 0) > 0 && (
                              <div className="pt-1 font-extrabold text-amber-700">Pending Payment: ${Number(invoicePreviewData.pending_payment_amount).toFixed(2)}</div>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>

                </div>

              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex flex-col gap-4 p-5 bg-[#f8fafc] border-t border-slate-200 shrink-0 sm:flex-row sm:items-end sm:justify-between">
              {invoicePreviewAction === 'opportunity_preview' || invoicePreviewAction === 'opportunity_send' ? (
                <div className="w-full max-w-sm">
                  <p className="text-xs font-semibold text-slate-500">
                    Review the invoice, then send it to the customer.
                  </p>
                </div>
              ) : (
                <div className="w-full max-w-sm">
                  <p className="text-xs font-semibold text-slate-500">
                    Review the segment invoice, edit the rates if needed, then finalize it.
                  </p>
                </div>
              )}
              <div className="flex items-center justify-end gap-3">
                <GhostBtn onClick={() => setIsInvoicePreviewOpen(false)}>
                  {invoicePreviewAction === 'opportunity_preview' || invoicePreviewAction === 'opportunity_send' ? 'Close' : 'Back'}
                </GhostBtn>
                {invoicePreviewAction === 'opportunity_send' ? (
                  <PrimaryBtn
                    icon="send"
                    onClick={handleConfirmPreviewSend}
                    loading={isSendingInvoice || isFinalizingInvoice}
                  >
                    Send Invoice
                  </PrimaryBtn>
                ) : invoicePreviewAction !== 'opportunity_preview' ? (
                  <PrimaryBtn
                    icon="check"
                    onClick={handleConfirmPreviewSend}
                    loading={isSendingInvoice || isFinalizingInvoice}
                  >
                    Finalize Segment
                  </PrimaryBtn>
                ) : null}
              </div>
            </div>
          </Card>
        </div>
      )}

      {isAdditionalContactsModalOpen && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-heading/25">
          <Card className="w-full max-w-5xl p-0 overflow-hidden rounded-3xl border-0 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-950 px-6 py-4 text-white">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/60">Customer Contacts</p>
                <h3 className="text-lg font-black tracking-tight">Additional Contact Details</h3>
              </div>
              <button
                type="button"
                onClick={closeAdditionalContactsModal}
                className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Close contacts modal"
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
              <div className="border-b border-slate-200 bg-slate-50 p-5 lg:border-b-0 lg:border-r lg:border-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black uppercase tracking-widest text-slate-500">Contacts</div>
                    <p className="mt-1 text-xs text-slate-500">
                      Manage up to {MAX_ADDITIONAL_CONTACTS} additional customer contacts.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addAdditionalContactForm}
                    disabled={additionalContactForms.length >= MAX_ADDITIONAL_CONTACTS}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {additionalContactForms.length ? (
                    additionalContactForms.map((contact, index) => {
                      const isActive = index === selectedAdditionalContactIndex;
                      const label = getContactLabel(contact, index);
                      const summary = [contact?.email, contact?.phone]
                        .map((value) => String(value || '').trim())
                        .filter(Boolean)
                        .join(' · ');
                      return (
                        <button
                          key={contact?.id ? `contact-${contact.id}` : `new-contact-${index}`}
                          type="button"
                          onClick={() => setSelectedAdditionalContactIndex(index)}
                          className={`w-full rounded-2xl border p-3 text-left transition ${
                            isActive
                              ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-black text-slate-900">{label}</div>
                              <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                                {contact?.relationship || 'Additional contact'}
                              </div>
                            </div>
                            {contact?.id ? (
                              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                Saved
                              </span>
                            ) : (
                              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                                Draft
                              </span>
                            )}
                          </div>
                          <div className="mt-2 space-y-1 text-xs text-slate-500">
                            <div className="truncate">{summary || 'No email or phone added yet.'}</div>
                            {contact?.phone_type ? (
                              <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                                {contact.phone_type}
                              </div>
                            ) : null}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                      No additional contacts yet. Add one to store an alternate email or phone number.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex min-h-[520px] flex-col">
                <div className="border-b border-slate-200 px-6 py-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-black uppercase tracking-widest text-slate-400">Contact Details</div>
                    <h4 className="mt-1 text-xl font-black tracking-tight text-slate-900">
                      {getContactLabel(selectedAdditionalContactForm, selectedAdditionalContactIndex)}
                    </h4>
                  </div>
                  {additionalContactForms.length > 0 && (
                    <button
                      type="button"
                      onClick={() => removeAdditionalContactForm(selectedAdditionalContactIndex)}
                      className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 transition"
                      title="Delete contact"
                      disabled={isAdditionalContactsSaving}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">
                        Contact Name
                      </label>
                      <input
                        type="text"
                        value={selectedAdditionalContactForm.name || ''}
                        onChange={(e) => updateAdditionalContactForm(selectedAdditionalContactIndex, { name: e.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        placeholder="Enter contact name"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={selectedAdditionalContactForm.email || ''}
                        onChange={(e) => updateAdditionalContactForm(selectedAdditionalContactIndex, { email: e.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        placeholder="contact@example.com"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        value={selectedAdditionalContactForm.phone || ''}
                        onChange={(e) => updateAdditionalContactForm(selectedAdditionalContactIndex, { phone: e.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        placeholder="(555) 555-5555"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">
                        Phone Type
                      </label>
                      <input
                        type="text"
                        value={selectedAdditionalContactForm.phone_type || ''}
                        onChange={(e) => updateAdditionalContactForm(selectedAdditionalContactIndex, { phone_type: e.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        placeholder="mobile / home / work"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">
                        Relationship
                      </label>
                      <input
                        type="text"
                        value={selectedAdditionalContactForm.relationship || ''}
                        onChange={(e) => updateAdditionalContactForm(selectedAdditionalContactIndex, { relationship: e.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        placeholder="Spouse / partner / assistant"
                      />
                    </div>
                  </div>

                  {additionalContactError ? (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                      {additionalContactError}
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                  <div className="text-xs font-semibold text-slate-500">
                    Save to keep this contact attached to the customer record.
                  </div>
                  <div className="flex items-center gap-2">
                    <GhostBtn onClick={closeAdditionalContactsModal} disabled={isAdditionalContactsSaving}>
                      Cancel
                    </GhostBtn>
                    <PrimaryBtn onClick={saveAdditionalContacts} loading={isAdditionalContactsSaving}>
                      Save Contacts
                    </PrimaryBtn>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {isDuplicateConfirmOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-heading/25">
          <Card className="w-full max-w-lg p-0 overflow-hidden rounded-3xl border-0 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-ink-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-black uppercase tracking-tight">
                {isLeadPath ? 'Duplicate Lead' : 'Duplicate Opportunity'}
              </h3>
              <button onClick={() => setIsDuplicateConfirmOpen(false)}>
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-ink-500">
                Creates a new {isLeadPath ? 'lead' : 'opportunity'} copy. {isLeadPath ? 'Email is cleared and status resets to New.' : 'Status resets to New.'}
              </p>

              <label className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-white p-4">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-ink-300"
                  checked={Boolean(duplicateOptions.openNewRecord)}
                  onChange={(e) => setDuplicateOptions((prev) => ({ ...prev, openNewRecord: e.target.checked }))}
                />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-ink-900">Open duplicated record</div>
                  <div className="text-xs text-ink-500">Navigate to the new record after duplicating.</div>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-ink-100 bg-white p-4">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-ink-300"
                  checked={Boolean(duplicateOptions.clearMoveDate)}
                  onChange={(e) => setDuplicateOptions((prev) => ({ ...prev, clearMoveDate: e.target.checked }))}
                />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-ink-900">Clear move date on duplicate</div>
                  <div className="text-xs text-ink-500">Keeps the copy clean when creating a new quote.</div>
                </div>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <GhostBtn onClick={() => setIsDuplicateConfirmOpen(false)}>Cancel</GhostBtn>
                <PrimaryBtn
                  onClick={async () => {
                    setIsDuplicateConfirmOpen(false);
                    await handleDuplicate(duplicateOptions);
                  }}
                  loading={isSaving}
                >
                  Duplicate
                </PrimaryBtn>
              </div>
            </div>
          </Card>
        </div>
      )}

      {isActivityDrawerOpen && (
        <div className="fixed inset-0 z-[110] flex justify-end">
          <div
            className="absolute inset-0 bg-heading/20 transition-opacity"
            onClick={() => setIsActivityDrawerOpen(false)}
          />
          <div className="relative h-full w-full max-w-[760px] bg-white shadow-2xl border-l border-ink-100 animate-in slide-in-from-right duration-200 flex flex-col z-10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 bg-white">
              <div>
                <div className="label-eyebrow text-brand font-bold uppercase tracking-wider text-xs">Quick Access</div>
                <h3 className="text-xl font-black text-ink-900 mt-0.5">Activities</h3>
              </div>
              <button 
                onClick={() => setIsActivityDrawerOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-ink-600 transition-colors"
                aria-label="Close"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/40">
              {!drawerTimelineEvents?.length ? (
                <div className="py-16 text-center text-ink-400">
                  <Icon name="clock" className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="font-semibold text-slate-500">No activity yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {drawerTimelineEvents.map((event, index) => {
                    const theme = getEventTheme(event?.event_type);
                    const { date, time } = formatTimelineDateTime(event?.created_at);
                    const changeRows = getTimelineChangeRows(event);
                    const isFieldChange = String(event?.event_type || '').toLowerCase().startsWith('fields.changed');
                    return (
                      <div key={event.id} className="grid grid-cols-[100px_minmax(0,1fr)] gap-4 sm:grid-cols-[130px_minmax(0,1fr)] sm:gap-6 relative group">
                        {/* Time & Actor Column */}
                        <div className="text-right pt-2.5 select-none">
                          <div className="text-xs font-extrabold text-ink-800 tracking-tight">{date}</div>
                          <div className="text-[10px] text-ink-400 font-semibold mt-0.5">{time}</div>
                          <div className="text-[10px] text-ink-500 mt-2 font-bold flex items-center justify-end gap-1">
                            <Icon name="user" className="w-3 h-3 text-ink-400" />
                            <span className="truncate max-w-[90px] sm:max-w-[120px]">{getActorLabel(event)}</span>
                          </div>
                        </div>

                        {/* Bullet & Connector Line & Card Column */}
                        <div className="relative pl-6 pb-6">
                          {/* Timeline vertical connector line */}
                          <div className={`absolute left-0 top-6 bottom-0 w-[2px] bg-slate-200/60 ${index === drawerTimelineEvents.length - 1 ? 'hidden' : ''}`} />

                          {/* Timeline node bullet */}
                          <div className={`absolute -left-3 top-3 h-6 w-6 rounded-full border-4 border-white ${theme.bg} ${theme.fg} shadow-sm ring-1 ring-slate-100 flex items-center justify-center transition-transform group-hover:scale-110 duration-200 z-10`}>
                            <Icon name={theme.icon} className="w-2.5 h-2.5" />
                          </div>

                          {/* Card Content */}
                          <div className="rounded-2xl border border-ink-100 bg-white px-4 py-3.5 shadow-card hover:shadow-md transition-all duration-200 group-hover:border-slate-300">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-ink-900 leading-snug">{getTimelineLine(event)}</div>
                                {isFieldChange && changeRows.length ? (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {changeRows.slice(0, 3).map((change) => (
                                      <span
                                        key={`${event.id}-${change.field}`}
                                        className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-100"
                                      >
                                        {change.label}
                                      </span>
                                    ))}
                                    {changeRows.length > 3 ? (
                                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500 ring-1 ring-inset ring-slate-200">
                                        +{changeRows.length - 3} more
                                      </span>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ${theme.bg} ${theme.fg}`}>
                                {time}
                              </span>
                            </div>
                            {getTimelineLeadSource(event) && (
                              <div className="mt-1.5 text-xs text-ink-500 font-medium flex items-center gap-1.5">
                                <Icon name="info" className="w-3.5 h-3.5 text-brand" />
                                <span>{getTimelineLeadSource(event)}</span>
                              </div>
                            )}
                            {isFieldChange && changeRows.length ? (
                              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80">
                                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-px rounded-xl bg-slate-200/80 overflow-hidden">
                                  <div className="bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Before</div>
                                  <div className="bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">After</div>
                                  {changeRows.map((change) => (
                                    <React.Fragment key={`${event.id}-${change.field}-diff`}>
                                      <div className="bg-white px-3 py-2.5">
                                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{change.label}</div>
                                        <div className="mt-1 text-xs font-semibold text-slate-600 break-words">{change.from}</div>
                                      </div>
                                      <div className="bg-white px-3 py-2.5">
                                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{change.label}</div>
                                        <div className="mt-1 text-xs font-semibold text-ink-800 break-words">{change.to}</div>
                                      </div>
                                    </React.Fragment>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                            {event?.event_type && (
                              <div className="mt-2">
                                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100/80 px-2 py-0.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider border border-slate-200/40">
                                  {String(event.event_type).replace('.', ' · ')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <SalesRouteStopModal
        isOpen={isRouteStopModalOpen}
        onClose={closeSalesRouteStopEditor}
        stop={editingRouteStop}
        onSave={saveSalesRouteStop}
        isSaving={isRouteStopSaving}
      />

      {isRouteEditing && !isCreation ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/20 p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close route editor"
            onClick={cancelRouteEdit}
          />
          <div className="relative w-full max-w-2xl">
            <RouteSection
              origin={{
                line1: routeDraft?.origin_street ?? form.origin_street,
                city: routeDraft?.origin_city || form.origin_city,
                state: routeDraft?.origin_state || form.origin_state,
                zip: routeDraft?.origin_zip || form.origin_zip,
                line2: view.originRoute.line2,
              }}
              destination={{
                line1: routeDraft?.destination_street ?? form.destination_street,
                city: routeDraft?.destination_city || form.destination_city,
                state: routeDraft?.destination_state || form.destination_state,
                zip: routeDraft?.destination_zip || form.destination_zip,
                line2: view.destinationRoute.line2,
              }}
              editing
              onStartEdit={startRouteEdit}
              onCancelEdit={cancelRouteEdit}
              onSave={saveRouteSection}
              saving={isRouteSaving}
              onChange={(field, value) => setRouteDraft((prev) => ({ ...(prev || {}), [field]: value }))}
              onAddressPick={(type, parts) =>
                setRouteDraft((prev) => {
                  const next = { ...(prev || buildRouteFieldsFromRecord(opportunity, isLeadPath)) };
                  if (type === 'origin') {
                    next.origin_street = parts?.formattedAddress ?? parts?.street ?? next.origin_street ?? '';
                    next.origin_city = parts?.city || next.origin_city || '';
                    next.origin_state = parts?.province || next.origin_state || '';
                    next.origin_zip = parts?.postalCode || next.origin_zip || '';
                  } else {
                    next.destination_street = parts?.formattedAddress ?? parts?.street ?? next.destination_street ?? '';
                    next.destination_city = parts?.city || next.destination_city || '';
                    next.destination_state = parts?.province || next.destination_state || '';
                    next.destination_zip = parts?.postalCode || next.destination_zip || '';
                  }
                  return next;
                })
              }
            />
          </div>
        </div>
      ) : null}

      {isBookJobModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 p-4">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                            <Send size={24} strokeWidth={2} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Book Move</h2>
                            <p className="text-xs text-slate-500 font-semibold mt-0.5">Send booking confirmation instantly</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsBookJobModalOpen(false)}
                        className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-2xl transition-colors"
                    >
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>
                
                <div className="p-6 space-y-6 overflow-y-auto">
                    <div className="space-y-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-black">Delivery Channels</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className={`flex items-center gap-3 rounded-2xl border p-4 text-sm font-bold cursor-pointer transition-all ${
                                bookJobSendEmail 
                                    ? 'border-blue-200 bg-blue-50/50 text-blue-800' 
                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                            }`}>
                                <input
                                    type="checkbox"
                                    checked={bookJobSendEmail}
                                    onChange={(e) => setBookJobSendEmail(e.target.checked)}
                                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                />
                                <span>Email</span>
                            </label>
                            <label className={`flex items-center gap-3 rounded-2xl border p-4 text-sm font-bold cursor-pointer transition-all ${
                                bookJobSendSms 
                                    ? 'border-blue-200 bg-blue-50/50 text-blue-800' 
                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                            }`}>
                                <input
                                    type="checkbox"
                                    checked={bookJobSendSms}
                                    onChange={(e) => setBookJobSendSms(e.target.checked)}
                                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                />
                                <span>SMS</span>
                            </label>
                        </div>
                    </div>

                    {bookJobSendEmail && (
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-black">Recipient Email</label>
                                {availableEmails.length > 0 && (
                                    <select
                                        value={bookJobEmail}
                                        onChange={(e) => setBookJobEmail(e.target.value)}
                                        className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm font-bold text-black focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all mb-2 bg-white"
                                    >
                                        {availableEmails.map((item) => (
                                            <option key={item.value} value={item.value}>
                                                {item.label}
                                            </option>
                                        ))}
                                        <option value="">Custom Email...</option>
                                    </select>
                                )}
                                {(!availableEmails.length || !availableEmails.some(e => e.value === bookJobEmail)) && (
                                    <input
                                        type="email"
                                        value={bookJobEmail}
                                        onChange={(e) => setBookJobEmail(e.target.value)}
                                        placeholder="Enter recipient email"
                                        className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm font-bold text-black placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {bookJobSendSms && (
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-black">Recipient Phone</label>
                                {availablePhones.length > 0 && (
                                    <select
                                        value={bookJobPhone}
                                        onChange={(e) => setBookJobPhone(e.target.value)}
                                        className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm font-bold text-black focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all mb-2 bg-white"
                                    >
                                        {availablePhones.map((item) => (
                                            <option key={item.value} value={item.value}>
                                                {item.label}
                                            </option>
                                        ))}
                                        <option value="">Custom Phone...</option>
                                    </select>
                                )}
                                {(!availablePhones.length || !availablePhones.some(p => p.value === bookJobPhone)) && (
                                    <input
                                        type="tel"
                                        value={bookJobPhone}
                                        onChange={(e) => setBookJobPhone(e.target.value)}
                                        placeholder="Enter recipient phone"
                                        className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3 text-sm font-bold text-black placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {(bookJobSendEmail || bookJobSendSms) && (
                        <p className="text-xs text-slate-500 font-semibold mt-1 px-1">
                            The booking confirmation template will be used.
                        </p>
                    )}
                </div>
                <div className="flex items-center justify-end gap-3 p-6 bg-slate-50 border-t border-slate-100">
                    <GhostBtn onClick={() => setIsBookJobModalOpen(false)}>Cancel</GhostBtn>
                    <GhostBtn 
                        onClick={() => confirmBookJob(false, false, false)}
                        disabled={isBookingJob}
                    >
                        Skip & Book
                    </GhostBtn>
                    <PrimaryBtn
                        onClick={() => confirmBookJob(false)}
                        disabled={isBookingJob || (!bookJobSendEmail && !bookJobSendSms)}
                        loading={isBookingJob}
                    >
                        Send & Book Job
                    </PrimaryBtn>
                </div>
          </div>
        </div>
      )}

      {isUnbookModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-rose-600 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/10 p-2.5 text-white">
                  <Truck size={24} strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">Unbook Job</h2>
                  <p className="mt-0.5 text-xs font-semibold text-rose-50">Choose why this booking is being removed and what should happen next.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUnbookModalOpen(false)}
                className="rounded-2xl p-2.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close unbook modal"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Reason</label>
                <select
                  value={unbookReason}
                  onChange={(e) => setUnbookReason(e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                >
                  <option value="">Select a reason...</option>
                  {UNBOOK_REASON_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Note</label>
                <input
                  type="text"
                  value={unbookNote}
                  onChange={(e) => setUnbookNote(e.target.value)}
                  placeholder="Optional internal note"
                  className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <GhostBtn onClick={() => setIsUnbookModalOpen(false)} disabled={isSaving}>Cancel</GhostBtn>
              <PrimaryBtn onClick={submitUnbook} loading={isSaving}>Unbook Job</PrimaryBtn>
            </div>
          </div>
        </div>
      )}

      <MovablePanel
        title="RingCentral Dialer"
        isOpen={showRingCentral}
        onClose={() => setShowRingCentral(false)}
      >
        <RingCentralEmbeddablePanel />
      </MovablePanel>
    </div>
  );
}
export default SalesDetail;
