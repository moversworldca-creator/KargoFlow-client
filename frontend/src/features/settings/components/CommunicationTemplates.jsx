import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, MessageSquare, Loader2, Edit2, PlusCircle, Trash2, Sparkles, AlertCircle, CheckCircle2, Settings2, X, Search, ChevronDown, Building2, Lock, GripVertical, FileText, ClipboardList } from 'lucide-react';
import Card from '../../../shared/ui/Card';
import RichTextEditor from '../../../shared/ui/RichTextEditor';
import EmailVisualBuilder from './EmailVisualBuilder';
import API from '../../../services/api';
import { normalizePreviewHtml, replaceBranchPlaceholders, resolveRenderableUrl } from '../../crm/utils/emailPreview';
import {
  getCommunicationTemplates,
  getCommunicationTemplate,
  getCommunicationTemplateKeys,
  getCommunicationTemplateVariables,
  createCommunicationTemplate,
  updateCommunicationTemplate,
  updateAutomationStep,
  deleteCommunicationTemplate,
  seedCommunicationTemplates,
  previewCommunicationTemplate,
  getCommunicationTemplateCategories,
  createCommunicationTemplateCategory,
  deleteCommunicationTemplateCategory,
} from '../../../services/api';


const EMPTY_TEMPLATE = {
  id: null,
  branch: null,
  category: null,
  template_key: '',
  name: '',
  description: '',
  channel: 'email',
  subject: '',
  body: '',
  body_html: '',
  body_css: '',
  variables: [],
  is_active: true,
};

const THEME_COLORS = [
  { id: 'corporate', name: 'Corporate Blue', bg: 'bg-slate-900', text: 'text-slate-900', value: '#0f172a', accent: '#3b82f6' },
  { id: 'purple', name: 'Vibrant Purple', bg: 'bg-violet-900', text: 'text-violet-900', value: '#1e1b4b', accent: '#7c3aed' },
  { id: 'green', name: 'Emerald Green', bg: 'bg-emerald-900', text: 'text-emerald-900', value: '#064e3b', accent: '#059669' },
  { id: 'red', name: 'Ruby Red', bg: 'bg-rose-900', text: 'text-rose-900', value: '#4c0519', accent: '#e11d48' }
];

const LAYOUT_STYLES = [
  { id: 'modern', name: 'Modern', description: 'Rounded corners, subtle backgrounds' },
  { id: 'minimal', name: 'Minimal', description: 'Clean whitespace, minimal borders' },
  { id: 'classic', name: 'Classic', description: 'Traditional layout, solid borders' }
];

const generateTemplateHtml = (templateId, colorId, styleId) => {
  const color = THEME_COLORS.find(c => c.id === colorId) || THEME_COLORS[0];
  const style = LAYOUT_STYLES.find(s => s.id === styleId) || LAYOUT_STYLES[0];
  
  const containerStyle = style.id === 'modern' ? 'background-color:#f8fafc;padding:40px 20px;font-family:sans-serif;' : 'padding:40px 20px;font-family:sans-serif;';
  const cardStyle = style.id === 'modern' ? 'background-color:#ffffff;border-radius:16px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);max-width:600px;margin:0 auto;overflow:hidden;' : 
                   style.id === 'minimal' ? 'background-color:#ffffff;max-width:600px;margin:0 auto;border-top: 4px solid ' + color.accent + ';' :
                   'background-color:#ffffff;border:1px solid #e2e8f0;max-width:600px;margin:0 auto;';
                   
  const headingStyle = style.id === 'classic' ? 'color:' + color.value + ';font-size:26px;font-weight:bold;margin-bottom:24px;font-family:serif;border-bottom:1px solid #e2e8f0;padding-bottom:16px;' : 'color:' + color.value + ';font-size:24px;font-weight:bold;margin-bottom:24px;';
  const buttonStyle = style.id === 'modern' ? 'background-color:' + color.accent + ';color:#ffffff;padding:14px 28px;border-radius:12px;text-decoration:none;display:inline-block;font-weight:bold;margin-top:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);' : 
                     style.id === 'minimal' ? 'background-color:' + color.accent + ';color:#ffffff;padding:12px 24px;border-radius:4px;text-decoration:none;display:inline-block;font-weight:bold;margin-top:16px;' :
                     'background-color:' + color.accent + ';color:#ffffff;padding:12px 24px;text-decoration:none;display:inline-block;font-weight:bold;margin-top:16px;border:1px solid ' + color.value + ';';
  const textStyle = 'margin:0;padding-bottom:16px;color:#334155;font-size:16px;line-height:1.6;';

  const headerHtml = '<div style="padding: 24px 28px; background-color: #ffffff; border-bottom: 1px solid #e5e7eb; text-align: right;"><span style="float: left; font-weight: bold; font-size: 18px; color: #64748b;">[Logo]</span><span style="font-size: 22px; font-weight: 700; color: #111827;">{{branch_name}}</span><div style="clear: both;"></div></div>';
  const footerHtml = '<div style="padding: 24px 28px; background-color: #f8fafc; border-top: 1px solid #e5e7eb; text-align: center; font-size: 13px; color: #64748b;">{{branch_address}}<br/><br/>{{branch_phone}} | {{branch_email}}</div>';

  const getBodyContent = () => {
    switch(templateId) {
      case 'quote': return '<h2 style="' + headingStyle + '">Your Quote from {{branch_name}}</h2>' +
          '<p style="' + textStyle + '">Hi {{customer_name}},</p>' +
          '<p style="' + textStyle + '">Thank you for requesting a quote from {{branch_name}}. Please click the link below to view your quote:</p>' +
          '<div style="text-align: ' + (style.id === 'minimal' ? 'left' : 'center') + '; margin-bottom: 24px;">' +
            '<a href="{{quote_link}}" style="' + buttonStyle + '">View Quote</a>' +
          '</div>' +
          '<p style="margin:0;color:#64748b;font-size:14px;line-height:1.5;">If you have any questions, feel free to reply directly to this email.</p>';
      case 'invoice': return '<h2 style="' + headingStyle + '">Invoice from {{branch_name}}</h2>' +
          '<p style="' + textStyle + '">Hi {{customer_name}},</p>' +
          '<p style="' + textStyle + '">Thank you for choosing {{branch_name}}. Please click the link below to view and pay your invoice:</p>' +
          '<div style="text-align: ' + (style.id === 'minimal' ? 'left' : 'center') + '; margin-bottom: 24px;">' +
            '<a href="{{invoice_pdf_link}}" style="' + buttonStyle + '">View Invoice</a>' +
          '</div>' +
          '<p style="margin:0;color:#64748b;font-size:14px;line-height:1.5;">We appreciate your business!</p>';
      case 'welcome': return '<h2 style="' + headingStyle + '">Welcome to {{branch_name}}!</h2>' +
          '<p style="' + textStyle + '">Hi {{customer_name}},</p>' +
          '<p style="' + textStyle + '">We are excited to help you with your upcoming move. Our team is committed to providing you with the best experience possible.</p>' +
          '<p style="margin:0;color:#64748b;font-size:14px;line-height:1.5;">Let us know if you have any questions.</p>';
      case 'job_confirmation': return '<h2 style="' + headingStyle + '">Your Move is Confirmed!</h2>' +
          '<p style="' + textStyle + '">Hi {{customer_name}},</p>' +
          '<p style="' + textStyle + '">Your move on <strong>{{move_date}}</strong> is officially confirmed. We are looking forward to helping you!</p>' +
          '<p style="margin:0;color:#64748b;font-size:14px;line-height:1.5;">We will see you then!</p>';
      default: return '';
    }
  };

  const bodyContent = getBodyContent();
  if (!bodyContent) return '';

  const visualHtml = '<div style="' + containerStyle + '"><div style="' + cardStyle + '">' + headerHtml + '<div style="padding: 40px;">' + bodyContent + '</div>' + footerHtml + '</div></div>';

  const genId = () => Math.random().toString(36).substring(2, 9);
  
  const blocks = [
    {
      id: genId(),
      type: 'brandHeader',
      logoUrl: '',
      companyName: '{{branch_name}}',
      style: {
        padding: '24px 28px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        logoWidth: '120px',
        logoHeight: '56px',
        logoCropMode: 'contain',
        logoCropPosition: 'center center',
        logoPosition: 'left',
        textAlign: 'right',
        fontSize: '22px',
        fontWeight: '700',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#111827',
      }
    },
    {
      id: genId(),
      type: 'typography',
      content: bodyContent,
      style: { textAlign: 'left', fontSize: '16px', color: '#333333', padding: '40px', backgroundColor: '#ffffff' }
    },
    {
      id: genId(),
      type: 'brandFooter',
      address: '{{branch_address}}',
      contact: '{{branch_phone}} | {{branch_email}}',
      style: {
        padding: '24px 28px',
        backgroundColor: '#f8fafc',
        borderTop: '1px solid #e5e7eb',
        textAlign: 'center',
        fontSize: '13px',
        fontWeight: '400',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#64748b',
      }
    }
  ];

  const builderData = {
    blocks,
    settings: {
      title: "Template",
      language: "en",
      backgroundColor: style.id === 'modern' ? '#f8fafc' : '#ffffff',
      contentAreaBgColor: '#ffffff',
      contentAreaWidth: '600',
      contentAreaAlignment: 'center',
      fontFamily: style.id === 'classic' ? 'Georgia, serif' : 'Inter, sans-serif',
      linkColor: color.accent
    }
  };

  return visualHtml + '\\n<!-- BUILDER_DATA:' + JSON.stringify(builderData) + ' -->';
};

const DEFAULT_EMAIL_TEMPLATES = [
  {
    id: 'blank',
    name: 'Blank Template',
    description: 'Start from scratch with a blank canvas',
    icon: Mail,
    draftData: { name: '', template_key: '', subject: '', channel: 'email' }
  },
  {
    id: 'quote',
    name: 'Quote / Estimate',
    description: 'Send a moving quote to a customer',
    icon: FileText,
    draftData: { name: 'Quote Sent', template_key: 'quote_sent', subject: 'Your Quote from {{branch_name}}', channel: 'email' }
  },
  {
    id: 'invoice',
    name: 'Invoice',
    description: 'Send an invoice for a completed move',
    icon: ClipboardList,
    draftData: { name: 'Invoice Sent', template_key: 'invoice_sent', subject: 'Invoice from {{branch_name}}', channel: 'email' }
  },
  {
    id: 'welcome',
    name: 'Welcome / Intro',
    description: 'Introduce your company to a new lead',
    icon: Sparkles,
    draftData: { name: 'Welcome Intro', template_key: 'greeting_welcome', subject: 'Welcome to {{branch_name}}!' }
  },
  {
    id: 'job_confirmation',
    name: 'Job Confirmation',
    description: 'Confirm a booked job with the customer',
    icon: CheckCircle2,
    draftData: { name: 'Job Confirmed', template_key: 'job_confirmed', subject: 'Your move is confirmed!' }
  }
];


const QUICK_KEYS = [
  '{{customer_name}}',
  '{{full_name}}',
  '{{branch_name}}',
  '{{branch_address}}',
  '{{branch_email}}',
  '{{branch_phone}}',
  '{{company_phone}}',
  '{{warehouse_phone_number}}',
  '{{warehouse_email}}',
  '{{agent_name}}',
  '{{agent_phone}}',
  '{{user_phone}}',
  '{{user_email}}',
  '{{move_date}}',
  '{{job_start_time}}',
  '{{arrival_window}}',
  '{{job_status}}',
  '{{opportunity_status}}',
  '{{opportunity_preferred_start_time}}',
  '{{quote_link}}',
  '{{estimate_link}}',
  '{{estimate_pdf_link}}',
  '{{payment_link}}',
  '{{contract_link}}',
  '{{booking_details_link}}',
  '{{invoice_pdf_link}}',
  '{{document_pdf_link}}',
  '{{invoice_number}}',
  '{{invoice_amount}}',
  '{{invoice_total}}',
  '{{quote_amount}}',
  '{{deposit_amount}}',
  '{{payment_amount}}',
  '{{payment_method}}',
  '{{referral_source}}',
  '{{claim_number}}',
  '{{claim_date}}',
  '{{closure_date}}',
  '{{completed_date}}',
  '{{document_type}}',
  '{{document_id}}',
  '{{failure_reason}}',
  '{{recall_reson}}',
  '{{recall_date}}',
];

const PROTECTED_DEFAULT_TEMPLATE_KEYS = new Set([
  'estimate_sent|email',
  'quote_sent|email',
  'quote_sent|sms',
  'payment_request|email',
  'deposit_request|email',
  'deposit_request|sms',
  'invoice_sent|email',
  'contract_portal_link|email',
  'contract_portal_link|sms',
  'estimate_signed_internal_notice|email',
  'payment_received_internal_notice|email',
  'inventory_submitted_internal_notice|email',
  'opportunity_booked_notice|email',
  'job_scheduled_notice|email',
  'opportunity_canceled_notice|email',
  'greeting_welcome|email',
  'lead_assigned_intro|email',
  'lead_followup_sms|sms',
  'estimate_signature_request|email',
  'estimate_sent_sms|sms',
  'estimate_followup_email|email',
  'estimate_signed_thank_you|email',
  'job_confirmed|email',
  'job_confirmed|sms',
  'job_prep_email|email',
  'job_day_before_sms|sms',
  'job_completed_thank_you|email',
  'job_review_request|email',
  'job_canceled_email|email',
  'booking_confirmation|email',
  'inventory_request|email',
  'move_reminder|sms',
  'thank_you|sms',
  'diagnostic_all_placeholders|email',
  'lead_not_attend_discount|email',
]);

const decodeHtmlEntities = (raw) => {
  const html = String(raw || '');
  if (!html) return '';
  if (typeof document === 'undefined') return html;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = html;
  return textarea.value;
};

const isFullHtmlDocument = (value) => /<!doctype\s+html|<html[\s>]|<body[\s>]/i.test(String(value || ''));

const hasBuilderData = (value) => /<!--\s*BUILDER_DATA:/i.test(String(value || ''));

const recoverLegacyWrappedFullHtml = (html) => {
  const match = String(html || '').match(/<!--\s*BUILDER_DATA:\s*\{"blocks":\[\{"id":"[^"]*","type":"typography","content":"([\s\S]*?)","style":\{/i);
  if (!match?.[1]) return '';
  try {
    const content = JSON.parse(`"${match[1]}"`);
    return isFullHtmlDocument(content) ? content : '';
  } catch (e) {
    return '';
  }
};

const preparePreviewHtml = (raw) => {
  let html = String(raw || '');
  const recovered = recoverLegacyWrappedFullHtml(html);
  if (recovered) return recovered;

  const trimmed = html.trim();
  if (/^&lt;|&lt;(?:!doctype|html|head|body|table|div)\b/i.test(trimmed)) {
    html = decodeHtmlEntities(html);
  }
  return html.replace(/<!--\s*BUILDER_DATA:\s*[\s\S]*?-->/gi, '');
};

const normalize = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
};

const fetchAllCommunicationTemplates = async (params = {}) => {
  const merged = [];
  let page = 1;
  while (true) {
    const response = await getCommunicationTemplates({ ...params, page });
    const rows = normalize(response);
    merged.push(...rows);
    if (!response?.next || rows.length === 0) break;
    page += 1;
  }
  return merged;
};

const parseVariablesFromBody = (text = '') => {
  const matches = text.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g) || [];
  const vars = new Set(matches.map((m) => m.replace(/[{}\s]/g, '')));
  return Array.from(vars);
};

const formatVariableName = (token) => {
  const clean = String(token || '').replace(/[{}]/g, '');
  return clean.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const toastCls = (type) =>
  type === 'success'
    ? 'bg-primary-tint/30 text-primary'
    : 'bg-[#FDE8E8]/30 text-[#791F1F]';

const TEMPLATE_KEY_RE = /^[a-z0-9][a-z0-9_.:-]*$/i;
const VALID_CHANNELS = new Set(['email', 'sms', 'email_sms']);

const getApiErrorMessage = (err, fallback) => {
  const data = err?.response?.data;
  const detail = data?.detail || data?.message || err?.message;
  if (detail) return String(detail);
  if (data && typeof data === 'object') {
    const fieldMessage = Object.entries(data)
      .map(([field, value]) => {
        const text = Array.isArray(value) ? value.join(' ') : String(value || '');
        return text ? `${field}: ${text}` : '';
      })
      .find(Boolean);
    if (fieldMessage) return fieldMessage;
  }
  return fallback;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeChannelList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim().toLowerCase())
      .filter((item) => item === 'email' || item === 'sms');
  }
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'email_sms') return ['email', 'sms'];
  if (normalized === 'email' || normalized === 'sms') return [normalized];
  return [];
};

const getDefaultInsertTarget = (channel) => (String(channel || '').trim().toLowerCase() === 'sms' ? 'sms_body' : 'email_body');

const getChannelLabel = (channel) => {
  const normalized = String(channel || '').trim().toLowerCase();
  if (normalized === 'email') return 'Email';
  if (normalized === 'sms') return 'SMS';
  if (normalized === 'email_sms') return 'Email & SMS';
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Unknown';
};

const findExistingTemplateRecord = (items, { branchId, channel, templateKey }) => {
  const normalizedBranchId = branchId == null || branchId === '' ? null : String(branchId);
  const normalizedChannel = String(channel || '').trim().toLowerCase();
  const normalizedTemplateKey = String(templateKey || '').trim();
  if (!normalizedBranchId || !normalizedChannel || !normalizedTemplateKey) return null;
  return (items || []).find((item) => (
    String(item?.branch ?? '') === normalizedBranchId
    && String(item?.channel || '').trim().toLowerCase() === normalizedChannel
    && String(item?.template_key || '').trim() === normalizedTemplateKey
  )) || null;
};

const isProtectedDefaultTemplate = (item) => {
  if (!item) return false;
  if (item.is_default) return true;
  const key = String(item.template_key || '').trim();
  const channel = String(item.channel || '').trim();
  return PROTECTED_DEFAULT_TEMPLATE_KEYS.has(`${key}|${channel}`);
};

const appendToken = (value, token) => {
  const base = String(value || '').trim();
  return base ? `${base} ${token}` : token;
};

const escapeHtmlForBuilder = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const buildBuilderHtmlFromPlainText = (text = '') => {
  const trimmed = String(text || '').trim();
  if (!trimmed) return '';

  const paragraphs = trimmed
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => `<p style="margin:0 0 16px 0;">${escapeHtmlForBuilder(chunk).replace(/\n/g, '<br/>')}</p>`)
    .join('');

  const builderData = {
    blocks: [
      {
        id: 'seeded-body',
        type: 'typography',
        content: paragraphs,
        style: {
          textAlign: 'left',
          fontSize: '16px',
          color: '#333333',
          padding: '20px',
          backgroundColor: '#ffffff',
        },
      },
    ],
    settings: {
      title: 'Template',
      language: 'en',
      backgroundColor: '#ffffff',
      contentAreaBgColor: '#ffffff',
      contentAreaWidth: '600',
      contentAreaAlignment: 'center',
      fontFamily: 'Inter, sans-serif',
      linkColor: '#2563eb',
    },
  };

  return `<div style="padding:20px;background:#ffffff;">${paragraphs}</div><!-- BUILDER_DATA:${JSON.stringify(builderData)} -->`;
};

const sortTemplatesByOrder = (rows = []) =>
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

const buildPreviewVarsFromDefinitions = (definitions = [], template = EMPTY_TEMPLATE) => {
  const discoveredKeys = parseVariablesFromBody(
    `${template.subject || ''}\n${template.body || ''}\n${template.body_html || ''}\n${template.body_css || ''}`
  );
  const explicitKeys = Array.isArray(template.variables)
    ? template.variables.map((key) => String(key || '').trim()).filter(Boolean)
    : [];
  const allKeys = Array.from(new Set([...definitions.map((row) => row.key).filter(Boolean), ...discoveredKeys, ...explicitKeys]));

  const vars = {};
  allKeys.forEach((key) => {
    const row = definitions.find((item) => item.key === key);
    vars[key] = String(row?.sample || '');
  });
  if (!vars.customer_name) vars.customer_name = 'Customer';
  if (!vars.branch_name) vars.branch_name = 'Branch';
  return vars;
};

const CommunicationTemplates = ({
  branchId = null,
  onBranchChange = null,
  builderRouteView = '',
  builderRouteItemId = null,
  builderRouteState = null,
  basePath = '/settings/templates',
  closePath = null,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const builderRouteContext = builderRouteState || location.state || {};
  const isAutomationBuilder = String(basePath || '').startsWith('/automation');
  const isAutomationNotificationEditor = isAutomationBuilder && Boolean(builderRouteContext?.automationStepId);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_TEMPLATE);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState(branchId ? String(branchId) : '');
  
  const { data: rawCategories = [] } = useQuery({
    queryKey: ['communicationTemplateCategories', branchFilter || 'all'],
    queryFn: async () => normalize(await getCommunicationTemplateCategories(branchFilter ? { branch: branchFilter } : {})),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const categories = rawCategories;

  const { data: rawItems = [], isLoading } = useQuery({
    queryKey: ['communicationTemplates', isAutomationBuilder ? 'automation' : branchFilter],
    queryFn: async () => fetchAllCommunicationTemplates(
      isAutomationBuilder
        ? { include_seeded_notifications: true }
        : (branchFilter ? { branch: branchFilter } : {})
    ),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const items = sortTemplatesByOrder(rawItems);

  const { data: rawVariables = [] } = useQuery({
    queryKey: ['communicationTemplateVariables', isAutomationBuilder ? 'automation' : branchFilter],
    queryFn: async () => {
      const response = await getCommunicationTemplateVariables(
        isAutomationBuilder
          ? { include_seeded_notifications: true }
          : (branchFilter ? { branch: branchFilter } : undefined)
      );
      return Array.isArray(response?.results) ? response.results : [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const variableDefinitions = rawVariables;
  
  const availableVariables = useMemo(() => {
    const fetched = rawVariables
      .map((row) => String(row?.key || '').trim())
      .map((key) => String(key || '').trim())
      .filter(Boolean)
      .map((key) => `{{${key}}}`);
    return Array.from(new Set([...QUICK_KEYS, ...fetched]));
  }, [rawVariables]);

  const { data: rawTemplateKeys = [] } = useQuery({
    queryKey: ['communicationTemplateKeys', isAutomationBuilder ? 'automation' : branchFilter],
    queryFn: async () => {
      const response = await getCommunicationTemplateKeys(
        isAutomationBuilder
          ? { include_seeded_notifications: true }
          : (branchFilter ? { branch: branchFilter } : undefined)
      );
      return Array.isArray(response?.results) ? response.results : [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const availableTemplateKeys = rawTemplateKeys;
  
  useEffect(() => {
    if (branchId !== null) {
      setBranchFilter(String(branchId));
    }
  }, [branchId]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showModal, setShowModal] = useState(false);
  const [unsavedDraft, setUnsavedDraft] = useState(null);
  const [restoreKey, setRestoreKey] = useState(0);
  const [editorMode, setEditorMode] = useState('visual');
  const [automationMessageMode, setAutomationMessageMode] = useState('email_only');
  const [automationEditorTab, setAutomationEditorTab] = useState('email');
  const [branches, setBranches] = useState([]);
  const [previewBranchId, setPreviewBranchId] = useState('');
  const [previewVars, setPreviewVars] = useState({ customer_name: 'Customer', branch_name: 'Branch' });

  const getDraftStorageKey = (template = null, draftValue = null) => {
    const routeState = builderRouteState || location.state || {};
    const automationStepId = routeState?.automationStepId || draftValue?.automation_step_id || null;
    if (isAutomationBuilder && automationStepId) {
      return `movers_crm_automation_draft_${automationStepId}`;
    }
    const templateId = template?.id || draftValue?.id || 'new';
    return `movers_crm_draft_${templateId}`;
  };
  const [previewHtml, setPreviewHtml] = useState('');
  const [testToEmail, setTestToEmail] = useState('');
  const [testAttachments, setTestAttachments] = useState([]);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [insertTarget, setInsertTarget] = useState(getDefaultInsertTarget(EMPTY_TEMPLATE.channel));
  const [showVariableTools, setShowVariableTools] = useState(true);
  const [showVariableDropdown, setShowVariableDropdown] = useState(false);
  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const [variableSearch, setVariableSearch] = useState('');
  const [showTypeSelectionModal, setShowTypeSelectionModal] = useState(false);
  const [showDefaultTemplateModal, setShowDefaultTemplateModal] = useState(false);
  const [selectedDefaultTemplate, setSelectedDefaultTemplate] = useState(null);
  const [selectedThemeColor, setSelectedThemeColor] = useState('corporate');
  const [selectedLayoutStyle, setSelectedLayoutStyle] = useState('modern');
  const [visualInsertRequest, setVisualInsertRequest] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [draggedTemplateId, setDraggedTemplateId] = useState(null);
  const [dragOverTemplateId, setDragOverTemplateId] = useState(null);
  const [isReordering, setIsReordering] = useState(false);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const lastBuilderRouteRef = useRef('');
  const [activeCategoryTab, setActiveCategoryTab] = useState('uncategorized');
  const { data: branchQueryRows = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await API.general.getBranches();
      return Array.isArray(res) ? res : res?.results || [];
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const clearFieldError = (field) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const patchDraftField = (field, value) => {
    clearFieldError(field);
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    if (!branchFilter) {
      flashMessage('error', 'Please select a branch before creating a category.');
      return;
    }
    setIsSavingCategory(true);
    try {
      await createCommunicationTemplateCategory({
        name: newCategoryName.trim(),
        description: newCategoryDesc.trim(),
        branch: Number(branchFilter),
      });
      setNewCategoryName('');
      setNewCategoryDesc('');
      await invalidateCommunicationTemplateQueries();
      flashMessage('success', 'Category created successfully.');
    } catch (err) {
      flashMessage('error', 'Failed to create category.');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm('Are you sure you want to delete this category? Templates in this category will become uncategorized.')) {
      return;
    }
    try {
      await deleteCommunicationTemplateCategory(catId);
      await invalidateCommunicationTemplateQueries();
      flashMessage('success', 'Category deleted successfully.');
    } catch (err) {
      flashMessage('error', 'Failed to delete category.');
    }
  };

  const mergedQuickVariables = useMemo(() => {
    const draftDiscovered = parseVariablesFromBody(
      `${draft.subject || ''}\n${draft.body || ''}\n${draft.body_html || ''}\n${draft.body_css || ''}`
    ).map((key) => `{{${key}}}`);
    const fromDraftList = (Array.isArray(draft.variables) ? draft.variables : [])
      .map((key) => String(key || '').trim())
      .filter(Boolean)
      .map((key) => (key.startsWith('{{') ? key : `{{${key}}}`));
    return Array.from(new Set([...availableVariables, ...fromDraftList, ...draftDiscovered]));
  }, [availableVariables, draft.subject, draft.body, draft.body_html, draft.body_css, draft.variables]);



  useEffect(() => {
    const rows = Array.isArray(branchQueryRows) ? branchQueryRows : [];
    setBranches(rows);
    if (rows.length) {
      const firstBranchId = String(rows[0].id);
      const branchIdExists = branchId !== null && rows.some((branch) => String(branch.id) === String(branchId));
      const branchFilterExists = branchFilter && rows.some((branch) => String(branch.id) === String(branchFilter));
      const preferredBranchId = branchFilterExists
        ? String(branchFilter)
        : branchIdExists
            ? String(branchId)
            : firstBranchId;
      setDraft((prev) => (
        showModal && !prev.branch
          ? { ...prev, branch: Number(preferredBranchId) }
          : prev
      ));
      setPreviewBranchId((prev) => prev || preferredBranchId);
      setBranchFilter((current) => {
        if (current && rows.some((branch) => String(branch.id) === String(current))) {
          return current;
        }
        return preferredBranchId;
      });
    } else {
      setBranches([]);
      setBranchFilter('');
    }
  }, [branchQueryRows, showModal, branchId, branchFilter]);

  useEffect(() => {
    if (!showModal || isAutomationBuilder) return;
    const selectedBranchId = String(branchFilter || branchId || branches[0]?.id || '');
    if (!selectedBranchId) return;
    setDraft((prev) => {
      if (prev.id || String(prev.branch || '') === selectedBranchId) return prev;
      return { ...prev, branch: Number(selectedBranchId) };
    });
    setPreviewBranchId(selectedBranchId);
  }, [showModal, isAutomationBuilder, branchFilter, branchId, branches]);

  const flashMessage = (type, text, duration = 3000) => {
    setMessage({ type, text });
    if (duration) {
      setTimeout(() => setMessage({ type: '', text: '' }), duration);
    }
  };

  const activeBranchQuerySuffix = branchFilter || 'all';
  const invalidateCommunicationTemplateQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['communicationTemplates', activeBranchQuerySuffix] }),
      queryClient.invalidateQueries({ queryKey: ['communicationTemplateVariables', activeBranchQuerySuffix] }),
      queryClient.invalidateQueries({ queryKey: ['communicationTemplateKeys', activeBranchQuerySuffix] }),
      queryClient.invalidateQueries({ queryKey: ['communicationTemplateCategories', activeBranchQuerySuffix] }),
      queryClient.invalidateQueries({ queryKey: ['communicationTemplates'] }),
      queryClient.invalidateQueries({ queryKey: ['communicationTemplateVariables'] }),
      queryClient.invalidateQueries({ queryKey: ['communicationTemplateKeys'] }),
      queryClient.invalidateQueries({ queryKey: ['communicationTemplateCategories'] }),
      queryClient.invalidateQueries({ queryKey: ['branches'] }),
    ]);
  };

  const handleSeedDefaults = async () => {
    const selectedBranchId = branchFilter || branchId;
    if (!selectedBranchId) {
      flashMessage('error', 'Please select a branch before loading starter templates.');
      return;
    }

    const branchLabel = branches.find((branch) => String(branch.id) === String(selectedBranchId))?.name || `Branch ${selectedBranchId}`;
    const confirmed = window.confirm(
      `If you continue, this will restore all default templates for ${branchLabel}. This may overwrite existing templates for that branch. Do you want to continue?`
    );
    if (!confirmed) return;

    setIsSeeding(true);
    try {
      const payload = { branch_id: Number(selectedBranchId) };
      const res = await seedCommunicationTemplates(payload);
      await invalidateCommunicationTemplateQueries();
      await queryClient.refetchQueries({ queryKey: ['communicationTemplates', activeBranchQuerySuffix], exact: true });
      flashMessage('success', res?.message || 'Default templates loaded.');
    } catch (err) {
      flashMessage('error', 'Failed to load default templates.');
    } finally {
      setIsSeeding(false);
    }
  };

  const filteredItems = useMemo(() => {
    return sortTemplatesByOrder(items).filter(item => {
      const name = String(item?.name || '').toLowerCase();
      const templateKey = String(item?.template_key || '').toLowerCase();
      const matchesSearch = 
        name.includes(searchTerm.toLowerCase()) ||
        templateKey.includes(searchTerm.toLowerCase());
      const matchesChannel = channelFilter === 'all' || String(item?.channel || '') === channelFilter;
      return matchesSearch && matchesChannel;
    });
  }, [items, searchTerm, channelFilter]);

  const filteredTemplateKeyOptions = useMemo(() => {
    if (!draft.channel) return availableTemplateKeys;
    const selectedChannels = normalizeChannelList(draft.channel);
    return availableTemplateKeys.filter((row) => {
      const channels = normalizeChannelList(row?.channels);
      return channels.length === 0 || selectedChannels.some((channel) => channels.includes(channel));
    });
  }, [availableTemplateKeys, draft.channel]);

  const activeAutomationTemplateKey = useMemo(() => {
    if (!isAutomationBuilder) return String(draft.template_key || '').trim();
    if (automationMessageMode === 'sms_only') return String(draft.sms_template_key || '').trim();
    if (automationMessageMode === 'email_sms') {
      if (automationEditorTab === 'sms') return String(draft.sms_template_key || '').trim();
      return String(draft.email_template_key || '').trim();
    }
    return String(draft.template_key || draft.email_template_key || '').trim();
  }, [automationEditorTab, automationMessageMode, draft.email_template_key, draft.sms_template_key, draft.template_key, isAutomationBuilder]);

  const getTemplateResponseData = (response) => response?.data || response || null;

  const automationModeOptions = [
    { key: 'email_only', label: 'Email Only' },
    { key: 'sms_only', label: 'SMS Only' },
    { key: 'email_sms', label: 'Email & SMS' },
  ];

  const selectedTemplateKeyMeta = useMemo(
    () => filteredTemplateKeyOptions.find((row) => row.key === activeAutomationTemplateKey) || null,
    [filteredTemplateKeyOptions, activeAutomationTemplateKey]
  );

  const automationSmsBody = String(draft.sms_body || '').trim() ? draft.sms_body : draft.body || '';
  const resolveBranchLogoUrl = (branch) => {
    const candidate = String(
      branch?.effective_logo_url ||
      branch?.logo_url ||
      branch?.logo ||
      branch?.branding_logo_url ||
      ''
    ).trim();
    if (!candidate) return '';
    return resolveRenderableUrl(candidate);
  };
  const canSortTemplates = !searchTerm.trim();
  const groupedTemplates = useMemo(() => {
    const groups = {};
    groups['uncategorized'] = {
      category: { name: 'Uncategorized', id: null },
      templates: []
    };
    categories.forEach(cat => {
      groups[cat.id] = {
        category: cat,
        templates: []
      };
    });

    filteredItems.forEach(item => {
      const catId = item.category || 'uncategorized';
      if (groups[catId]) {
        groups[catId].templates.push(item);
      } else {
        groups['uncategorized'].templates.push(item);
      }
    });

    return Object.values(groups).filter(g => g.templates.length > 0 || (g.category.id && !searchTerm));
  }, [filteredItems, categories, searchTerm]);

  useEffect(() => {
    if (groupedTemplates.length > 0) {
      const tabExists = groupedTemplates.some(g => String(g.category.id || 'uncategorized') === activeCategoryTab);
      if (!tabExists) {
        setActiveCategoryTab(String(groupedTemplates[0].category.id || 'uncategorized'));
      }
    }
  }, [groupedTemplates, activeCategoryTab]);

  const resetTemplateDragState = () => {
    setDraggedTemplateId(null);
    setDragOverTemplateId(null);
  };

  const persistTemplateSortOrder = async (nextItems) => {
    const updates = nextItems.filter((item) => Number(item.sort_order ?? 0) !== Number(items.find((current) => current.id === item.id)?.sort_order ?? 0));
    if (!updates.length) return;

    setIsReordering(true);
    const previousItems = items;
    queryClient.setQueryData(['communicationTemplates', activeBranchQuerySuffix], nextItems);
    try {
      await Promise.all(updates.map((item) => updateCommunicationTemplate(item.id, { sort_order: item.sort_order })));
      await queryClient.invalidateQueries({ queryKey: ['communicationTemplates', activeBranchQuerySuffix] });
      flashMessage('success', 'Template order updated.');
    } catch (err) {
      queryClient.setQueryData(['communicationTemplates', activeBranchQuerySuffix], previousItems);
      flashMessage('error', getApiErrorMessage(err, 'Failed to update template order.'));
      await queryClient.invalidateQueries({ queryKey: ['communicationTemplates', activeBranchQuerySuffix] });
    } finally {
      setIsReordering(false);
      resetTemplateDragState();
    }
  };

  const handleTemplateDragStart = (e, item) => {
    if (!canSortTemplates) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(item.id));
    setDraggedTemplateId(item.id);
  };

  const handleTemplateDragOver = (e, item) => {
    if (!canSortTemplates) return;
    if (!draggedTemplateId || String(draggedTemplateId) === String(item.id)) return;
    const draggedItem = items.find((row) => String(row.id) === String(draggedTemplateId));
    if (!draggedItem) return;
    const targetCategory = String(item.category || 'uncategorized');
    const draggedCategory = String(draggedItem.category || 'uncategorized');
    if (draggedCategory !== targetCategory || draggedItem.channel !== item.channel) return;
    e.preventDefault();
    setDragOverTemplateId(item.id);
  };

  const handleTemplateDrop = async (e, targetItem) => {
    if (!canSortTemplates) return;
    e.preventDefault();
    const sourceId = String(e.dataTransfer.getData('text/plain') || draggedTemplateId || '');
    if (!sourceId || String(sourceId) === String(targetItem.id)) {
      resetTemplateDragState();
      return;
    }

    const sourceItem = items.find((row) => String(row.id) === String(sourceId));
    if (!sourceItem) {
      resetTemplateDragState();
      return;
    }

    const sourceCategory = String(sourceItem.category || 'uncategorized');
    const targetCategory = String(targetItem.category || 'uncategorized');
    if (sourceCategory !== targetCategory || sourceItem.channel !== targetItem.channel) {
      resetTemplateDragState();
      return;
    }

    const sameCategoryTemplates = items.filter(
      (row) => String(row.category || 'uncategorized') === sourceCategory && row.channel === sourceItem.channel
    );
    const sameChannelTemplates = [...sameCategoryTemplates];
    const sourceIndex = sameChannelTemplates.findIndex((row) => String(row.id) === sourceId);
    const targetIndex = sameChannelTemplates.findIndex((row) => String(row.id) === String(targetItem.id));

    if (sourceIndex < 0 || targetIndex < 0) {
      resetTemplateDragState();
      return;
    }

    const reorderedGroup = [...sameChannelTemplates];
    const [moved] = reorderedGroup.splice(sourceIndex, 1);
    reorderedGroup.splice(targetIndex, 0, moved);

    const reassignedOrder = new Map(
      reorderedGroup.map((row, index) => [String(row.id), index])
    );
    const updatedItems = items.map((row) => {
      if (row.channel !== sourceItem.channel || String(row.category || 'uncategorized') !== sourceCategory) return row;
      return {
        ...row,
        sort_order: reassignedOrder.get(String(row.id)),
      };
    });

    await persistTemplateSortOrder(updatedItems);
  };

  const handleTemplateDragEnd = () => {
    resetTemplateDragState();
  };

  const selectedTemplateBranchId = String(draft.branch || branchFilter || branches[0]?.id || '');
  const selectedTemplateBranch = branches.find((branch) => String(branch.id) === selectedTemplateBranchId);
  const selectedTemplateBranchLogoUrl = String(
    resolveBranchLogoUrl(selectedTemplateBranch)
  ).trim();
  const selectedTemplateBranchName = String(
    selectedTemplateBranch?.name ||
    selectedTemplateBranch?.branch_name ||
    ''
  ).trim();

  const handleChangeTemplateBranch = (nextBranchId) => {
    const cleanBranchId = String(nextBranchId || '');
    clearFieldError('branch');
    setDraft((prev) => ({
      ...prev,
      branch: cleanBranchId ? Number(cleanBranchId) : null,
    }));
    setPreviewBranchId(cleanBranchId);
    if (cleanBranchId) {
      setBranchFilter(cleanBranchId);
      onBranchChange?.(cleanBranchId);
    }
    setShowBranchPicker(false);
  };

  const handleChangeListBranch = (nextBranchId) => {
    const cleanBranchId = String(nextBranchId || '');
    setBranchFilter(cleanBranchId);
    if (cleanBranchId) {
      onBranchChange?.(cleanBranchId);
    }
  };

  const handleOpenModal = async (template = null, type = 'email') => {
    const defaultBranch = branchFilter || branches[0]?.id || null;
    let fullTemplate = template;

    if (template && template.id) {
      try {
        const detail = await queryClient.fetchQuery({
          queryKey: ['communicationTemplate', template.id],
          queryFn: () => getCommunicationTemplate(template.id),
          staleTime: 5 * 60 * 1000,
          gcTime: 10 * 60 * 1000,
        });
        if (detail) {
          fullTemplate = detail.data || detail;
        }
      } catch (err) {
        console.error('Failed to load full template details', err);
      }
    }

    const nextDraft = fullTemplate
      ? {
          ...fullTemplate,
          variables: fullTemplate.variables || [],
          body_html: fullTemplate.body_html || (String(fullTemplate.channel || '').toLowerCase() === 'email' ? buildBuilderHtmlFromPlainText(fullTemplate.body || '') : ''),
        }
      : { ...EMPTY_TEMPLATE, channel: type, branch: defaultBranch ? Number(defaultBranch) : null };

    setUnsavedDraft(null);
    const storageKey = getDraftStorageKey(template, nextDraft);
    const savedStr = localStorage.getItem(storageKey);
    if (savedStr) {
      try {
        const parsed = JSON.parse(savedStr);
        if (JSON.stringify(parsed) !== JSON.stringify(nextDraft)) {
          setUnsavedDraft(parsed);
        }
      } catch (e) {
        console.warn('Failed to restore saved communication template draft', e);
      }
    }

    if (template) {
    setSelectedId(template.id);
    } else {
      setSelectedId(null);
    }
    setDraft(nextDraft);
    if (isAutomationBuilder) {
      const hasEmailKey = Boolean(String(nextDraft.email_template_key || '').trim());
      const hasSmsKey = Boolean(String(nextDraft.sms_template_key || '').trim());
      const modeFromKeys = hasEmailKey && hasSmsKey ? 'email_sms' : null;
      setAutomationMessageMode(
        type === 'sms'
          ? 'sms_only'
          : modeFromKeys || (template?.channel === 'email' && template?.sms_body ? 'email_sms' : 'email_only')
      );
      setAutomationEditorTab(type === 'sms' ? 'sms' : 'email');
    }
    setPreviewBranchId(String(nextDraft.branch || defaultBranch || ''));
    setInsertTarget(getDefaultInsertTarget(template?.channel || EMPTY_TEMPLATE.channel));
    setPreviewVars(buildPreviewVarsFromDefinitions(variableDefinitions, nextDraft));
    setPreviewHtml('');
    setTestToEmail('');
    setTestAttachments([]);
    setFormErrors({});
    setShowVariableTools(true);
    setShowBranchPicker(false);
    setEditorMode(
      nextDraft.channel === 'email' &&
      isFullHtmlDocument(nextDraft.body_html) &&
      !hasBuilderData(nextDraft.body_html)
        ? 'code'
        : 'visual'
    );
    setShowModal(true);
  };

  useEffect(() => {
    if (builderRouteView !== 'builder') {
      lastBuilderRouteRef.current = '';
      return;
    }
    if (isLoading) return;

    const routeKey = `${builderRouteItemId || 'new'}:builder`;
    if (lastBuilderRouteRef.current === routeKey) return;

    if (builderRouteItemId && builderRouteItemId !== 'new') {
      const target = items.find((item) => String(item.id) === String(builderRouteItemId));
      if (!target) {
        flashMessage('error', 'Template not found.');
        navigate(basePath, { replace: true });
        return;
      }
      handleOpenModal(target, target.channel || 'email');
    } else {
      const routeState = builderRouteState || location.state || {};
      const routeDraft = routeState?.draftData || routeState?.automationTemplate || null;
      if (routeDraft) {
        const normalizedChannel = String(routeDraft.channel || '').trim().toLowerCase();
        const emailKey = String(routeDraft.email_template_key || routeDraft.template_key || '').trim();
        const smsKey = String(routeDraft.sms_template_key || '').trim();
        const templateKey = String(routeDraft.template_key || '').trim();
        const emailTemplate = items.find((item) => {
          const key = String(item.template_key || '').trim();
          const itemId = String(item.id || '').trim();
          return String(item.channel || '').toLowerCase() === 'email' && (
            (emailKey && key === emailKey) ||
            (templateKey && key === templateKey) ||
            (routeDraft.email_template_id && itemId === String(routeDraft.email_template_id))
          );
        }) || null;
        const shouldHydrateSms = normalizedChannel === 'sms' || normalizedChannel === 'email_sms' || Boolean(smsKey || routeDraft.sms_template_id);
        const smsTemplate = shouldHydrateSms ? (items.find((item) => {
          const key = String(item.template_key || '').trim();
          const itemId = String(item.id || '').trim();
          return String(item.channel || '').toLowerCase() === 'sms' && (
            (smsKey && key === smsKey) ||
            (templateKey && normalizedChannel === 'email_sms' && key === templateKey) ||
            (routeDraft.sms_template_id && itemId === String(routeDraft.sms_template_id))
          );
        }) || null) : null;
        const hydratedDraft = {
          ...routeDraft,
          name: routeDraft.name || emailTemplate?.name || smsTemplate?.name || 'Notification',
          subject: routeDraft.email_subject || routeDraft.subject || emailTemplate?.subject || '',
          email_subject: routeDraft.email_subject || routeDraft.subject || emailTemplate?.subject || '',
          body: routeDraft.body || emailTemplate?.body || smsTemplate?.body || '',
          sms_body: normalizedChannel === 'sms' || normalizedChannel === 'email_sms'
            ? (routeDraft.sms_body || smsTemplate?.body || '')
            : '',
          body_html:
            routeDraft.body_html ||
            emailTemplate?.body_html ||
            buildBuilderHtmlFromPlainText(routeDraft.body || emailTemplate?.body || ''),
          body_css: routeDraft.body_css || emailTemplate?.body_css || '',
          channel:
            normalizedChannel ||
            (emailTemplate && smsTemplate ? 'email_sms' : emailTemplate?.channel || smsTemplate?.channel || 'email'),
          template_key: routeDraft.template_key || emailTemplate?.template_key || smsTemplate?.template_key || '',
          email_template_key: routeDraft.email_template_key || emailTemplate?.template_key || '',
          sms_template_key: routeDraft.sms_template_key || smsTemplate?.template_key || '',
          email_template_id: routeDraft.email_template_id || emailTemplate?.id || null,
          sms_template_id: routeDraft.sms_template_id || smsTemplate?.id || null,
          channels: routeDraft.channels || (normalizedChannel === 'email_sms' || (emailTemplate && smsTemplate) ? ['email', 'sms'] : normalizedChannel ? [normalizedChannel] : undefined),
        };
        handleOpenModal(hydratedDraft, hydratedDraft.channel || 'email');
        // Clear state so a reload doesn't keep the draftData if we don't want it, 
        // though react-router usually keeps state on reload. We can leave it for now.
      } else {
        handleOpenModal(null, 'email');
      }
    }

    lastBuilderRouteRef.current = routeKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builderRouteView, builderRouteItemId, isLoading, items, navigate, showModal]);

  const closeEditor = () => {
    setShowModal(false);
    if (builderRouteView === 'builder') {
      navigate(closePath || basePath);
    }
  };

  useEffect(() => {
    if (showModal && draft) {
      const timer = setTimeout(() => {
        const storageKey = getDraftStorageKey(null, draft);
        localStorage.setItem(storageKey, JSON.stringify(draft));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [draft, showModal]);

  useEffect(() => {
    if (!showModal) return;
    setInsertTarget((prev) => {
      const nextDefault = getDefaultInsertTarget(draft.channel);
      if (draft.channel === 'email') {
        return prev === 'sms_body' ? 'email_body' : prev || nextDefault;
      }
      if (draft.channel === 'sms') {
        return 'sms_body';
      }
      return nextDefault;
    });
  }, [draft.channel, showModal]);

  useEffect(() => {
    if (!showModal || !isAutomationBuilder) return;
    if (automationMessageMode === 'sms_only') {
      setDraft((prev) => ({ ...prev, channel: 'sms' }));
      setAutomationEditorTab('sms');
      return;
    }
    setDraft((prev) => ({ ...prev, channel: 'email' }));
    if (automationMessageMode === 'email_only') {
      setAutomationEditorTab('email');
    }
  }, [automationMessageMode, isAutomationBuilder, showModal]);

  useEffect(() => {
    if (!showModal) return;
    setPreviewVars((prev) => {
      const defaults = buildPreviewVarsFromDefinitions(variableDefinitions, draft);
      return { ...defaults, ...prev };
    });
  }, [variableDefinitions, draft.subject, draft.body, draft.body_html, draft.body_css, draft.variables, showModal]);

  const insertVariableToken = (token) => {
    const cleanToken = String(token || '').trim();
    if (!cleanToken) return;

    if (draft.channel === 'email' && insertTarget === 'email_body') {
      if (editorMode === 'visual') {
        setVisualInsertRequest({ id: Date.now(), token: cleanToken });
        return;
      }

      const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
      const canInsertAtCursor =
        activeEl && activeEl.isContentEditable && typeof document.execCommand === 'function';
      if (canInsertAtCursor) {
        const inserted = document.execCommand('insertText', false, `${cleanToken} `);
        if (inserted) return;
      }
    }

    setDraft((prev) => {
      if (draft.channel === 'email') {
        if (insertTarget === 'email_subject') {
          return { ...prev, subject: appendToken(prev.subject, cleanToken) };
        }
        if (insertTarget === 'email_body') {
          return { ...prev, body_html: appendToken(prev.body_html, cleanToken) };
        }
      }
      if (draft.channel === 'sms' || (isAutomationBuilder && automationEditorTab === 'sms')) {
        return { ...prev, sms_body: appendToken(prev.sms_body || prev.body || '', cleanToken) };
      }
      return { ...prev, body: appendToken(prev.body, cleanToken) };
    });
  };

  const validateTemplateForm = () => {
    const templateKey = String(draft.template_key || '').trim();
    const automationEmailKey = String(draft.email_template_key || '').trim();
    const automationSmsKey = String(draft.sms_template_key || '').trim();
    const templateName = String(draft.name || '').trim();
    const channel = String(draft.channel || '').trim().toLowerCase();
    const subject = String(draft.subject || '').trim();
    const bodyText = String(draft.body || '').trim();
    const smsText = String(draft.sms_body || draft.body || '').trim();
    const bodyHtml = String(draft.body_html || '').trim();
    const selectedBranch = draft.branch || branchFilter || branches[0]?.id || null;
    const errors = {};

    if (!selectedBranch) errors.branch = 'Select a branch for this template.';
    if (!isAutomationBuilder || channel !== 'email_sms') {
      if (!templateKey) {
        errors.template_key = 'Template key is required.';
      } else if (!TEMPLATE_KEY_RE.test(templateKey)) {
        errors.template_key = 'Use letters, numbers, underscore, dash, dot, or colon only.';
      }
    } else {
      if (automationEmailKey && !TEMPLATE_KEY_RE.test(automationEmailKey)) {
        errors.email_template_key = 'Use letters, numbers, underscore, dash, dot, or colon only.';
      }
      if (automationSmsKey && !TEMPLATE_KEY_RE.test(automationSmsKey)) {
        errors.sms_template_key = 'Use letters, numbers, underscore, dash, dot, or colon only.';
      }
    }

    if (!templateName) errors.name = 'Template name is required.';
    if (!VALID_CHANNELS.has(channel)) errors.channel = 'Choose a valid template channel.';
    if (channel === 'sms' && !smsText) errors.body = 'SMS templates require a body.';
    if (channel === 'email' && !subject) errors.subject = 'Email subject is required.';
    if (channel === 'email' && !bodyText && !bodyHtml) errors.body_html = 'Email body or HTML body is required.';

    return {
      errors,
      values: { templateKey, templateName, channel, subject, bodyText, smsText, bodyHtml, selectedBranch },
    };
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    const { errors, values } = validateTemplateForm();
    setFormErrors(errors);
    const firstError = Object.values(errors)[0];
    if (firstError) {
      flashMessage('error', firstError);
      return;
    }

    setIsSaving(true);
    try {
      const wasExisting = Boolean(draft.id);
      const automationEmailKey = String(draft.email_template_key || '').trim();
      const automationSmsKey = String(draft.sms_template_key || '').trim();
      const automationPrimaryKey = String(
        draft.template_key ||
        automationEmailKey ||
        automationSmsKey ||
        values.templateKey
      ).trim();
      const payload = {
        ...draft,
        branch: values.selectedBranch ? Number(values.selectedBranch) : null,
        channel: values.channel,
        template_key: isAutomationBuilder ? automationPrimaryKey : values.templateKey,
        name: values.templateName,
        subject: values.subject,
        body: values.channel === 'sms' && isAutomationBuilder ? values.smsText : values.bodyText,
        body_html: values.bodyHtml,
        sms_body: isAutomationBuilder ? String(draft.sms_body || '').trim() : draft.sms_body,
        variables: parseVariablesFromBody(`${draft.subject || ''}\n${draft.body || ''}\n${draft.body_html || ''}\n${draft.body_css || ''}`),
      };
      if (isAutomationBuilder) {
        payload.notification_scope = String(draft.notification_scope || 'company').trim() || 'company';
        payload.email_template_key = automationEmailKey;
        payload.sms_template_key = automationSmsKey;
        payload.channels = Array.isArray(draft.channels) ? draft.channels : undefined;
      }

      const resolveTemplateId = (explicitId, channel, templateKey) => (
        explicitId
        || findExistingTemplateRecord(items, {
          branchId: payload.branch,
          channel,
          templateKey,
        })?.id
        || null
      );

      let saved;
      if (isAutomationBuilder && automationMessageMode === 'email_sms') {
        const emailPayload = {
          ...payload,
          channel: 'email',
          template_key: automationEmailKey || automationPrimaryKey,
          body: values.bodyText,
          body_html: values.bodyHtml,
          sms_body: '',
        };
        const smsPayload = {
          ...payload,
          channel: 'sms',
          template_key: automationSmsKey || automationPrimaryKey,
          subject: '',
          body: values.smsText,
          body_html: '',
          sms_body: values.smsText,
        };
        const resolvedEmailTemplateId = resolveTemplateId(draft.email_template_id, 'email', emailPayload.template_key);
        const resolvedSmsTemplateId = resolveTemplateId(draft.sms_template_id, 'sms', smsPayload.template_key);
        const emailResult = resolvedEmailTemplateId
          ? await updateCommunicationTemplate(resolvedEmailTemplateId, emailPayload)
          : await createCommunicationTemplate(emailPayload);
        const smsResult = resolvedSmsTemplateId
          ? await updateCommunicationTemplate(resolvedSmsTemplateId, smsPayload)
          : await createCommunicationTemplate(smsPayload);
        const emailSaved = getTemplateResponseData(emailResult);
        const smsSaved = getTemplateResponseData(smsResult);
        saved = emailSaved || smsSaved;
        if (builderRouteContext?.automationStepId) {
          const emailId = emailSaved?.id || resolvedEmailTemplateId || null;
          const smsId = smsSaved?.id || resolvedSmsTemplateId || null;
          await updateAutomationStep(builderRouteContext.automationStepId, {
            config: {
              ...(builderRouteContext.automationStepConfig || {}),
              notification_scope: 'company',
              channels: ['email', 'sms'],
              template_key: automationPrimaryKey,
              email_template_key: automationEmailKey || automationPrimaryKey,
              sms_template_key: automationSmsKey || automationPrimaryKey,
              email_template_id: emailId,
              sms_template_id: smsId,
              subject: values.subject,
              email_subject: values.subject,
              body: values.bodyText,
              body_html: values.bodyHtml,
              sms_body: values.smsText,
            },
          });
        }
      } else {
        const resolvedTemplateId = resolveTemplateId(draft.id, payload.channel, payload.template_key);
        saved = resolvedTemplateId
          ? await updateCommunicationTemplate(resolvedTemplateId, payload)
          : await createCommunicationTemplate(payload);
        if (isAutomationBuilder && builderRouteContext?.automationStepId) {
          const nextStepType = values.channel === 'sms' ? 'send_sms' : 'send_email';
          const nextStepConfig = {
            ...(builderRouteContext.automationStepConfig || {}),
            notification_scope: 'company',
            channels: [values.channel],
            template_key: automationPrimaryKey,
            subject: values.channel === 'email' ? values.subject : '',
            email_subject: values.channel === 'email' ? values.subject : '',
            body: values.channel === 'sms' ? values.smsText : values.bodyText,
            body_html: values.channel === 'email' ? values.bodyHtml : '',
            sms_body: values.channel === 'sms' ? values.smsText : '',
          };

          if (values.channel === 'email') {
            nextStepConfig.email_template_key = automationEmailKey || automationPrimaryKey;
            nextStepConfig.email_template_id = saved?.id || resolvedTemplateId || draft.email_template_id || null;
            nextStepConfig.sms_template_key = '';
            nextStepConfig.sms_template_id = null;
            nextStepConfig.sms_body = '';
            nextStepConfig.channels = ['email'];
          } else {
            nextStepConfig.email_template_key = '';
            nextStepConfig.email_template_id = null;
            nextStepConfig.sms_template_key = automationSmsKey || automationPrimaryKey;
            nextStepConfig.sms_template_id = saved?.id || resolvedTemplateId || draft.sms_template_id || null;
            nextStepConfig.channels = ['sms'];
          }

          await updateAutomationStep(builderRouteContext.automationStepId, {
            step_type: nextStepType,
            config: nextStepConfig,
          });
        }
      }

      await invalidateCommunicationTemplateQueries();
      await queryClient.invalidateQueries({ queryKey: ['communicationTemplate', saved.id] });
      closeEditor();
      localStorage.removeItem(getDraftStorageKey(null, draft));
      flashMessage('success', (wasExisting || isAutomationNotificationEditor) ? 'Template updated successfully.' : 'Template created successfully.');
    } catch (err) {
      flashMessage('error', getApiErrorMessage(err, 'Failed to save template.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = async () => {
    try {
      const res = await previewCommunicationTemplate({
        channel: draft.channel,
        communication_template_id: draft.id || undefined,
        subject: draft.subject,
        body: draft.body,
        body_html: draft.body_html,
        body_css: draft.body_css,
        variables: previewVars,
        branch_id: previewBranchId || undefined,
      });
      setPreviewHtml(normalizePreviewHtml(res?.preview_html || '', {
        branchLogoUrl: selectedTemplateBranchLogoUrl,
        branchName: selectedTemplateBranchName,
      }));
    } catch (e) {
      setPreviewHtml('<pre>Failed to preview.</pre>');
    }
  };

  const handleAddTestAttachments = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setTestAttachments((prev) => [...prev, ...files]);
    event.target.value = '';
  };

  const handleRemoveTestAttachment = (indexToRemove) => {
    setTestAttachments((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSendTest = async () => {
    if (draft.channel !== 'email') return;
    const toEmail = String(testToEmail || '').trim();
    const { errors } = validateTemplateForm();
    const nextErrors = { ...errors };
    if (!toEmail) {
      nextErrors.testToEmail = 'Test recipient email is required.';
    } else if (!EMAIL_RE.test(toEmail)) {
      nextErrors.testToEmail = 'Enter a valid test email address.';
    }
    setFormErrors(nextErrors);
    const firstError = Object.values(nextErrors)[0];
    if (firstError) {
      flashMessage('error', firstError);
      return;
    }
    setIsSendingTest(true);
    try {
      const formData = new FormData();
      formData.append('channel', 'email');
      formData.append('to_email', toEmail);
      formData.append('communication_template_id', draft.id || '');
      formData.append('subject', draft.subject || '');
      formData.append('body', draft.body || '');
      formData.append('body_html', replaceBranchPlaceholders(draft.body_html || '', {
        branchLogoUrl: selectedTemplateBranchLogoUrl,
        branchName: selectedTemplateBranchName,
      }));
      formData.append('body_css', draft.body_css || '');
      formData.append('variables', JSON.stringify(previewVars || {}));
      if (previewBranchId) formData.append('branch_id', String(previewBranchId));
      testAttachments.forEach((file) => formData.append('attachments', file));
      await API.post('/integrations/communication-templates/send/', formData);
      flashMessage('success', 'Test email sent.');
    } catch (err) {
      flashMessage('error', 'Failed to send test email.');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleDelete = async (id) => {
    setIsDeleting(true);
    try {
      await deleteCommunicationTemplate(id);
      await queryClient.invalidateQueries({ queryKey: ['communicationTemplates'] });
      flashMessage('success', 'Template deleted.');
    } catch (err) {
      flashMessage('error', getApiErrorMessage(err, 'Failed to delete template.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (template) => {
    setIsSaving(true);
    try {
      const payload = { ...template, is_active: !template.is_active };
      const updated = await updateCommunicationTemplate(template.id, payload);
      await invalidateCommunicationTemplateQueries();
      flashMessage('success', `Template ${updated.is_active ? 'activated' : 'deactivated'}.`);
    } catch (err) {
      flashMessage('error', 'Failed to update status.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-heading tracking-tight">Communication Templates</h3>
          <p className="text-sm text-muted">Manage Email and SMS templates for automation.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={handleSeedDefaults}
            disabled={isSeeding}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-border text-body rounded-xl text-xs sm:text-sm font-bold hover:bg-border transition-all whitespace-nowrap"
          >
            {isSeeding ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />} Load Starter
          </button>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-border text-body rounded-xl text-xs sm:text-sm font-bold hover:bg-border/80 transition-all border border-subtle whitespace-nowrap"
          >
            Manage Categories
          </button>
          <div className="relative">
            <button
              onClick={() => setShowTypeSelectionModal(!showTypeSelectionModal)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:bg-[#003d2f] transition-all whitespace-nowrap"
            >
              <PlusCircle size={18} /> Add Template
            </button>
            {showTypeSelectionModal && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowTypeSelectionModal(false)}
                />
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-border z-50 overflow-hidden flex flex-col">
                  <button
                    onClick={() => {
                      setShowTypeSelectionModal(false);
                      setShowDefaultTemplateModal(true);
                    }}
                    className="flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-border"
                  >
                    <Mail size={16} className="text-primary" />
                    <span className="text-sm font-bold text-heading">Email</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowTypeSelectionModal(false);
                      handleOpenModal(null, 'sms');
                    }}
                    className="flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                  >
                    <MessageSquare size={16} className="text-[#166534]" />
                    <span className="text-sm font-bold text-heading">SMS</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 bg-card p-3 sm:p-4 rounded-2xl shadow-sm border border-border">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-10 pr-4 py-2 bg-subtle border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-2">
            {['all', 'email', 'sms'].map((ch) => (
              <button
                key={ch}
                onClick={() => setChannelFilter(ch)}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  channelFilter === ch ? 'bg-primary text-white' : 'bg-subtle text-muted hover:bg-border'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
          {!branchId && (
            <select
              value={branchFilter}
              onChange={(e) => handleChangeListBranch(e.target.value)}
              className="px-3 py-2 bg-subtle border-none rounded-xl text-xs font-bold uppercase tracking-wider text-body outline-none"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {message.text && (
        <div className={`fixed right-4 top-4 z-[200] flex max-w-[min(420px,calc(100vw-2rem))] items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold shadow-2xl animate-in slide-in-from-top-2 ${
          message.type === 'success' ? 'bg-primary-tint/30 text-primary' : 'bg-[#FDE8E8]/30 text-[#791F1F]'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {filteredItems.length === 0 ? (
        <Card className="overflow-hidden border-none shadow-xl bg-card rounded-2xl p-12 text-center text-muted">
          No templates found. Create a new one or click "Load Starter".
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-border pb-4">
            {groupedTemplates.map((group) => {
              const tabId = String(group.category.id || 'uncategorized');
              const isActive = activeCategoryTab === tabId;
              return (
                <button
                  key={tabId}
                  onClick={() => setActiveCategoryTab(tabId)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    isActive ? 'bg-primary text-white shadow-md' : 'bg-subtle text-muted hover:bg-border'
                  }`}
                >
                  {group.category.name} ({group.templates.length})
                </button>
              );
            })}
          </div>

          <div className="space-y-8">
            {groupedTemplates
              .filter(group => String(group.category.id || 'uncategorized') === activeCategoryTab)
              .map((group) => (
              <div key={group.category.id || 'uncategorized'} className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black text-heading uppercase tracking-wider">
                      {group.category.name}
                    </h4>
                    {group.category.description && (
                    <span className="text-[10px] text-muted font-bold">
                      · {group.category.description}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted font-black uppercase tracking-wider">
                  {group.templates.length} {group.templates.length === 1 ? 'template' : 'templates'}
                </span>
              </div>

              <Card className="overflow-hidden border-none shadow-xl shadow-border/50 bg-card rounded-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-subtle/50 border-b border-border">
                        <th className="px-6 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-muted">Template</th>
                        <th className="px-6 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-muted">Channel</th>
                        <th className="px-6 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-muted">Order</th>
                        <th className="px-6 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-muted">Status</th>
                        <th className="px-6 py-4 text-[0.625rem] font-bold uppercase tracking-widest text-muted text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-subtle">
                      {group.templates.map((item) => (
                        <tr
                          key={item.id}
                          onDragOver={(e) => handleTemplateDragOver(e, item)}
                          onDrop={(e) => handleTemplateDrop(e, item)}
                          className={`group transition-colors ${
                            draggedTemplateId === item.id ? 'bg-primary-tint/10 opacity-70' : 'hover:bg-subtle/50'
                          } ${dragOverTemplateId === item.id ? 'ring-2 ring-primary/20 bg-primary/5' : ''}`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-start gap-3">
                              <button
                                type="button"
                                draggable={canSortTemplates && !isReordering}
                                onDragStart={(e) => handleTemplateDragStart(e, item)}
                                onDragEnd={handleTemplateDragEnd}
                                className={`mt-0.5 inline-flex items-center justify-center rounded-md p-1 text-muted transition-colors ${
                                  canSortTemplates && !isReordering ? 'cursor-grab active:cursor-grabbing hover:bg-card' : 'cursor-not-allowed opacity-50'
                                }`}
                                title={canSortTemplates ? 'Drag to reorder' : 'Clear search to reorder templates'}
                                aria-label={`Drag ${item.name} to reorder`}
                                aria-disabled={!canSortTemplates || isReordering}
                              >
                                <GripVertical size={14} />
                              </button>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-body">{item.name}</span>
                                <span className="text-[0.625rem] font-mono text-muted uppercase">{item.template_key}</span>
                              </div>
                            </div>
                          </td>
	                          <td className="px-6 py-4">
                            {(() => {
                              const channelLabel = getChannelLabel(item.channel);
                              const normalizedChannel = String(item.channel || '').toLowerCase();
                              const isEmail = normalizedChannel === 'email';
                              const isMultiChannel = normalizedChannel === 'email_sms';
                              return (
	                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.625rem] font-bold uppercase tracking-wider ${
	                              isMultiChannel
                                    ? 'bg-violet-100 text-violet-700'
                                    : isEmail
                                        ? 'bg-primary-tint text-primary'
                                        : 'bg-status-booked-bg text-status-booked-text'
	                            }`}>
	                              {isMultiChannel ? (
                                    <>
                                      <Mail size={12} />
                                      <MessageSquare size={12} />
                                    </>
                                  ) : isEmail ? (
                                    <Mail size={12} />
                                  ) : (
                                    <MessageSquare size={12} />
                                  )}
	                              {channelLabel}
	                            </span>
                              );
                            })()}
	                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center rounded-full bg-subtle px-2.5 py-1 text-[0.625rem] font-bold uppercase tracking-wider text-body">
                              #{Number(item.sort_order ?? 0)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(item)}
                              disabled={isSaving}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${item.is_active ? 'bg-primary' : 'bg-disabled'}`}
                            >
                              <span className={`inline-block h-3 w-3 transform rounded-full bg-card transition-transform ${item.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right relative">
                          <button
                              type="button"
                              onClick={() => {
                                if (item.channel === 'email') {
                        navigate(`${basePath}/${item.id}/builder`);
                                  return;
                                }
                                handleOpenModal(item);
                              }}
                              className="inline-flex items-center justify-center rounded-lg p-2 text-primary transition-all hover:bg-primary/5"
                              title="Edit template"
                              aria-label="Edit template"
                              >
                                <Edit2 size={18} />
                              </button>
                            {isProtectedDefaultTemplate(item) ? (
                              <span
                              className="ml-2 inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[0.625rem] font-black uppercase tracking-wider text-amber-700"
                              title="Default template"
                              aria-label="Default template locked"
                            >
                                <Lock size={16} />
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDelete(item.id)}
                                disabled={isDeleting}
                                className="ml-2 inline-flex items-center justify-center rounded-lg p-2 text-rose-600 transition-all hover:bg-rose-50 disabled:opacity-50"
                                title="Delete template"
                                aria-label="Delete template"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ))}
        </div>
        </div>
      )}

      {/* FULL PAGE EDITOR */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-white z-[100] flex flex-col overflow-hidden animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-5 md:px-8 border-b border-border bg-white shrink-0 z-20">
              <div>
                <h3 className="text-2xl font-black text-heading tracking-tight">{(draft.id || isAutomationNotificationEditor) ? 'Edit Template' : 'New Template'}</h3>
                <p className="text-sm font-medium text-muted">Configure your communication message and variables.</p>
              </div>
              <div className="flex items-center gap-3">
                {isProtectedDefaultTemplate(draft) && (
                  <span className="hidden md:inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[0.625rem] font-black uppercase tracking-wider text-amber-700">
                    Default template
                  </span>
                )}
                {unsavedDraft && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(unsavedDraft);
                      setFormErrors({});
                      setUnsavedDraft(null);
                      setRestoreKey(k => k + 1);
                      flashMessage('success', 'Restored unsaved changes.');
                    }}
                    className="px-4 py-2.5 bg-amber-100 text-amber-800 rounded-xl text-sm font-bold shadow-sm hover:bg-amber-200 transition-colors"
                  >
                    Restore Unsaved Edits
                  </button>
                )}
                <button type="button" onClick={closeEditor} className="px-5 py-2.5 bg-subtle text-body rounded-xl text-sm font-bold hover:bg-border transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={handleSave} disabled={isSaving} className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-md hover:bg-[#003d2f] disabled:opacity-50 transition-all flex items-center gap-2">
                  {isSaving ? <Loader2 className="animate-spin" size={18} /> : null}
                  {(draft.id || isAutomationNotificationEditor) ? 'Save Changes' : 'Create Template'}
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left Sidebar (Settings) */}
              <div className="w-80 border-r border-border bg-slate-50/50 overflow-y-auto shrink-0 flex flex-col z-10 custom-scrollbar">
                <div className="p-6 space-y-8">
                  {/* Settings Group */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-heading flex items-center gap-2 pb-2 border-b border-border">
                      <Settings2 size={16} className="text-primary"/> Template Settings
                    </h4>
                    
                    <Field label="Name" error={formErrors.name}>
                      <input
                        required
                        value={draft.name}
                        onChange={(e) => patchDraftField('name', e.target.value)}
                        placeholder="Quote Sent"
                        className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm font-medium outline-none focus:ring-2 ${formErrors.name ? 'border-rose-300 focus:ring-rose-100' : 'border-border focus:ring-primary/20'}`}
                        aria-invalid={Boolean(formErrors.name)}
                      />
                    </Field>
                    {!isAutomationBuilder && (
                      <Field label="Branch" error={formErrors.branch}>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              if (!branches.length) return;
                              setShowBranchPicker((open) => !open);
                            }}
                            disabled={!branches.length}
                            className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 py-2.5 text-left text-sm font-bold outline-none transition-all ${
                              formErrors.branch ? 'border-rose-300 ring-2 ring-rose-100' : 'border-border hover:border-primary/30 focus:ring-2 focus:ring-primary/20'
                            } ${!branches.length ? 'cursor-not-allowed opacity-70' : ''}`}
                            aria-invalid={Boolean(formErrors.branch)}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <Building2 size={16} className="shrink-0 text-primary" />
                              <span className="truncate text-heading">
                                {selectedTemplateBranch?.name || 'Select branch'}
                              </span>
                            </span>
                            <span className="flex shrink-0 items-center gap-1 text-[0.65rem] font-black uppercase tracking-wider text-primary">
                              Change <ChevronDown size={14} className={showBranchPicker ? 'rotate-180 transition-transform' : 'transition-transform'} />
                            </span>
                          </button>
                          {showBranchPicker && branches.length > 0 && (
                            <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-56 overflow-y-auto rounded-xl border border-border bg-white p-1.5 shadow-xl">
                              {branches.map((branch) => {
                                const isSelected = String(branch.id) === selectedTemplateBranchId;
                                return (
                                  <button
                                    key={branch.id}
                                    type="button"
                                    onClick={() => handleChangeTemplateBranch(branch.id)}
                                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-bold transition-colors ${
                                      isSelected ? 'bg-primary/10 text-primary' : 'text-body hover:bg-slate-50'
                                    }`}
                                  >
                                    <span className="truncate">{branch.name}</span>
                                    {isSelected ? <CheckCircle2 size={14} /> : null}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </Field>
                    )}
                    {!isAutomationBuilder && (
                      <Field label="Template Key" error={formErrors.template_key}>
                        <input
                          list="communication-template-key-options"
                          required
                          value={draft.template_key}
                          onChange={(e) => patchDraftField('template_key', e.target.value)}
                          placeholder="quote_sent"
                          className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm font-medium outline-none focus:ring-2 ${formErrors.template_key ? 'border-rose-300 focus:ring-rose-100' : 'border-border focus:ring-primary/20'}`}
                          aria-invalid={Boolean(formErrors.template_key)}
                        />
                        <datalist id="communication-template-key-options">
                          {filteredTemplateKeyOptions.map((item) => (
                            <option key={`${item.key}-${(item.channels || []).join('-')}`} value={item.key}>
                              {item.label}
                            </option>
                          ))}
                        </datalist>
                      </Field>
                    )}
                    <div className={isAutomationBuilder ? 'space-y-3' : 'grid grid-cols-2 gap-3'}>
                      {isAutomationBuilder ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 rounded-xl border border-border bg-slate-50 p-2">
                            <select
                              value={automationMessageMode}
                              onChange={(e) => setAutomationMessageMode(e.target.value)}
                              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-bold text-heading outline-none focus:ring-2 focus:ring-primary/20"
                            >
                              {automationModeOptions.map((option) => (
                                <option key={option.key} value={option.key}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          {automationMessageMode === 'email_sms' && (
                            <div className="flex items-center gap-2 border-b border-border pb-2">
                              <button
                                type="button"
                                onClick={() => setAutomationEditorTab('email')}
                                className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
                                  automationEditorTab === 'email' ? 'border-primary text-primary' : 'border-transparent text-muted'
                                }`}
                              >
                                Email Editor
                              </button>
                              <button
                                type="button"
                                onClick={() => setAutomationEditorTab('sms')}
                                className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${
                                  automationEditorTab === 'sms' ? 'border-primary text-primary' : 'border-transparent text-muted'
                                }`}
                              >
                                SMS Editor
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <Field label="Channel" error={formErrors.channel}>
                          <select
                            value={draft.channel}
                            onChange={(e) => patchDraftField('channel', e.target.value)}
                            className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm font-medium outline-none focus:ring-2 appearance-none ${formErrors.channel ? 'border-rose-300 focus:ring-rose-100' : 'border-border focus:ring-primary/20'}`}
                            aria-invalid={Boolean(formErrors.channel)}
                          >
                            <option value="email">Email</option>
                            <option value="sms">SMS</option>
                          </select>
                        </Field>
                      )}
                      {!isAutomationBuilder && (
                        <Field label="Category">
                          <select
                            value={draft.category || ''}
                            onChange={(e) => setDraft((prev) => ({ ...prev, category: e.target.value ? Number(e.target.value) : null }))}
                            className="w-full px-4 py-2.5 bg-white border border-border rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                          >
                            <option value="">None</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                        </Field>
                      )}
                    </div>
                    {(isAutomationBuilder ? automationEditorTab === 'email' : draft.channel === 'email') && (
                      <Field label="Email Subject" error={formErrors.subject}>
                        <input
                          value={draft.subject}
                          onChange={(e) => patchDraftField('subject', e.target.value)}
                          placeholder="Your Quote from {{branch_name}}"
                          className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm font-medium outline-none focus:ring-2 ${formErrors.subject ? 'border-rose-300 focus:ring-rose-100' : 'border-border focus:ring-primary/20'}`}
                          aria-invalid={Boolean(formErrors.subject)}
                        />
                      </Field>
                    )}
                    {!isAutomationBuilder && (
                      <Field label="Description">
                        <input
                          value={draft.description}
                          onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                          placeholder="What this template is used for"
                          className="w-full px-4 py-2.5 bg-white border border-border rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </Field>
                    )}
                  </div>



                  {/* Testing Group */}
                    {(isAutomationBuilder ? automationEditorTab === 'email' : draft.channel === 'email') && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-heading flex items-center gap-2 pb-2 border-b border-border">
                        <Mail size={16} className="text-primary"/> Testing
                      </h4>
                      <Field label="To Email" error={formErrors.testToEmail}>
                        <input
                          value={testToEmail}
                          onChange={(e) => {
                            clearFieldError('testToEmail');
                            setTestToEmail(e.target.value);
                          }}
                          placeholder="customer@example.com"
                          className={`w-full px-4 py-2.5 bg-white border rounded-xl text-sm font-medium outline-none focus:ring-2 ${formErrors.testToEmail ? 'border-rose-300 focus:ring-rose-100' : 'border-border focus:ring-primary/20'}`}
                          aria-invalid={Boolean(formErrors.testToEmail)}
                        />
                      </Field>
                      <button
                        type="button"
                        onClick={handleSendTest}
                        disabled={isSendingTest}
                        className="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-subtle px-4 py-2.5 text-sm font-bold text-body hover:bg-border transition-colors disabled:opacity-60"
                      >
                        {isSendingTest ? <Loader2 size={16} className="animate-spin" /> : null} Send Test Email
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Main Area (Editor) */}
              <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden relative">
                {/* Editor Header Toggle */}
                <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-border shrink-0 z-50 shadow-sm relative">
                  <div className="flex items-center gap-4">
                    {(isAutomationBuilder ? automationEditorTab === 'email' : draft.channel === 'email') && (
                      <div className="flex bg-slate-100 p-1 rounded-xl border border-border">
                        <button
                          type="button"
                          onClick={() => setEditorMode('visual')}
                          className={`px-5 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${editorMode === 'visual' ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-body'}`}
                        >
                          Visual Builder
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditorMode('code')}
                          className={`px-5 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${editorMode === 'code' ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-body'}`}
                        >
                          HTML Code
                        </button>
                      </div>
                    )}

                        <div className="relative">
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              if (editorMode === 'visual') e.preventDefault();
                            }}
                            onClick={() => setShowVariableDropdown(!showVariableDropdown)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-xl text-xs font-bold text-heading hover:bg-slate-50 transition-colors shadow-sm"
                          >
                            <Sparkles size={14} className="text-primary" /> Insert Variable <ChevronDown size={14} className="text-muted" />
                          </button>

                          {showVariableDropdown && (
                            <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                              <div className="p-2 border-b border-border">
                                <div className="relative">
                                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                                  <input
                                    type="text"
                                    placeholder="Search variables..."
                                    value={variableSearch}
                                    onChange={(e) => setVariableSearch(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-transparent rounded-lg text-xs font-medium outline-none focus:border-primary/30 focus:bg-white transition-colors"
                                  />
                                </div>
                              </div>
                              <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5">
                                {mergedQuickVariables
                                  .filter(token => formatVariableName(token).toLowerCase().includes(variableSearch.toLowerCase()) || token.toLowerCase().includes(variableSearch.toLowerCase()))
                                  .map((token) => (
                                    <button
                                      key={token}
                                      type="button"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => {
                                        insertVariableToken(token);
                                        setShowVariableDropdown(false);
                                        setVariableSearch('');
                                      }}
                                      className="w-full text-left px-3 py-2 text-[0.75rem] font-medium text-body hover:bg-primary/5 hover:text-primary rounded-lg transition-colors flex items-center justify-between group"
                                      title={`Insert ${token}`}
                                    >
                                      <span>{formatVariableName(token)}</span>
                                      <span className="text-[0.6rem] font-mono text-muted opacity-0 group-hover:opacity-100 transition-opacity">{token}</span>
                                    </button>
                                  ))}
                                {mergedQuickVariables.filter(token => formatVariableName(token).toLowerCase().includes(variableSearch.toLowerCase()) || token.toLowerCase().includes(variableSearch.toLowerCase())).length === 0 && (
                                  <div className="px-3 py-4 text-center text-xs text-muted">No variables found.</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    {(isAutomationBuilder ? automationMessageMode !== 'sms_only' : draft.channel === 'email') && (
                      <button
                          type="button"
                          onClick={handlePreview}
                          className="rounded-xl bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                        >
                          Preview Output
                        </button>
                      )}
                    </div>

                {/* Editor Container */}
                <div className="flex-1 overflow-hidden relative flex flex-col">
                  {(formErrors.body_html || formErrors.body) && (
                    <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700">
                      <AlertCircle size={14} />
                      {formErrors.body_html || formErrors.body}
                    </div>
                  )}
                  {(isAutomationBuilder ? automationEditorTab === 'email' : draft.channel === 'email') ? (
                    <>
                      {editorMode === 'visual' ? (
                        <div className="flex-1 overflow-hidden relative">
                          <EmailVisualBuilder
                            key={`builder-${restoreKey}`}
                            value={draft.body_html || ''}
                            branchLogoUrl={selectedTemplateBranchLogoUrl}
                            branchName={selectedTemplateBranchName}
                            forceDynamicBranchTokens={isAutomationBuilder}
                            onChange={(html) => {
                              clearFieldError('body_html');
                              setDraft((prev) => ({ ...prev, body_html: html }));
                            }}
                            insertTokenRequest={visualInsertRequest}
                          />
                        </div>
                      ) : (
                        <div className="flex-1 overflow-hidden relative flex flex-col bg-[#1e1e1e]">
                          <div className="px-6 py-2 bg-[#2d2d2d] border-b border-[#3d3d3d] flex items-center">
                            <span className="text-[10px] font-mono text-[#858585] uppercase tracking-wider">Raw HTML Mode</span>
                          </div>
                          <textarea
                            className="w-full flex-1 p-6 font-mono text-[13px] bg-transparent text-[#d4d4d4] outline-none resize-none leading-relaxed"
                            value={draft.body_html || ''}
                            onChange={(e) => {
                              clearFieldError('body_html');
                              setDraft((prev) => ({ ...prev, body_html: e.target.value }));
                            }}
                            placeholder="<!-- Write your custom HTML here... -->"
                            spellCheck={false}
                          />
                        </div>
                      )}

                      {/* Floating Preview Overlay */}
                      {previewHtml && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-8 animate-in fade-in">
                          <div className="bg-white w-full max-w-4xl h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-slate-50">
                              <h4 className="font-bold text-heading flex items-center gap-2"><Mail size={18}/> Preview Output</h4>
                              <button onClick={() => setPreviewHtml('')} className="p-2 hover:bg-border rounded-full transition-colors"><X size={20}/></button>
                            </div>
                            <div className="flex-1 overflow-hidden bg-white">
                              <iframe
                                title="Email preview"
                                className="w-full h-full"
                                sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                                srcDoc={preparePreviewHtml(previewHtml)}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                  <div className="flex-1 p-8 flex flex-col overflow-hidden bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-bold text-heading">SMS Message Body</label>
                    </div>
                    <div className="flex-1 min-h-[300px] flex flex-col">
                      <RichTextEditor
                        value={isAutomationBuilder ? automationSmsBody : (draft.body || '')}
                        onChange={(html) => {
                          clearFieldError('body');
                          setDraft((prev) => (
                            isAutomationBuilder
                              ? { ...prev, sms_body: html }
                              : { ...prev, body: html }
                          ));
                        }}
                        placeholder="Type your SMS template text here..."
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>,
        document.body
      )}

      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-heading/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-lg p-0 overflow-hidden rounded-3xl border-0 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-primary text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-black uppercase tracking-tight text-sm">Manage Categories</h3>
              <button onClick={() => setShowCategoryModal(false)} className="text-white hover:opacity-85 text-lg font-bold">
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Add New Category Form */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-border">
                <h4 className="text-xs font-black uppercase tracking-wider text-heading">Create New Category</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Category Name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-border rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10"
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newCategoryDesc}
                    onChange={(e) => setNewCategoryDesc(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-border rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={isSavingCategory || !newCategoryName.trim()}
                    className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-[#003d2f] disabled:opacity-50 transition-all active:scale-[0.98]"
                  >
                    {isSavingCategory ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Create Category'}
                  </button>
                </div>
              </div>

              {/* Existing Categories List */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-muted">Existing Categories</h4>
                {categories.length === 0 ? (
                  <p className="text-xs text-muted italic">No categories created yet.</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {categories.map((cat) => (
                      <div key={cat.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-xl hover:bg-slate-50/50 transition">
                        <div>
                          <div className="text-sm font-bold text-heading">{cat.name}</div>
                          {cat.description && <div className="text-xs text-muted mt-0.5">{cat.description}</div>}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Category"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end bg-slate-50 px-6 py-4 border-t border-border">
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="px-5 py-2.5 bg-border text-body rounded-xl text-sm font-bold hover:bg-border/80 transition-all"
              >
                Close
              </button>
            </div>
          </Card>
        </div>
      )}

      {showDefaultTemplateModal && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl rounded-[2rem] bg-white shadow-2xl overflow-hidden flex flex-col border border-border/50 max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <Mail size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight text-heading">
                    {selectedDefaultTemplate ? 'Customize Template' : 'Choose a Starting Template'}
                  </h3>
                  <p className="text-sm font-medium text-muted">
                    {selectedDefaultTemplate ? 'Select your preferred layout style and color theme.' : 'Select a template to customize or start from scratch.'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowDefaultTemplateModal(false);
                  setTimeout(() => setSelectedDefaultTemplate(null), 300);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {!selectedDefaultTemplate ? (
              <div className="p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 bg-slate-50/50 overflow-y-auto custom-scrollbar">
                {DEFAULT_EMAIL_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => {
                      if (tmpl.id === 'blank') {
                        setShowDefaultTemplateModal(false);
                        navigate(`${basePath}/new/builder`, { state: { draftData: { ...tmpl.draftData, body_html: '' } } });
                      } else {
                        setSelectedDefaultTemplate(tmpl);
                      }
                    }}
                    className="flex flex-col text-left bg-white border border-slate-200 hover:border-primary/40 shadow-sm hover:shadow-xl hover:shadow-primary/5 p-6 rounded-2xl transition-all duration-300 group hover:-translate-y-1"
                  >
                    <div className="h-12 w-12 rounded-xl bg-slate-100 group-hover:bg-primary flex items-center justify-center mb-5 text-slate-500 group-hover:text-white transition-all duration-300">
                      <tmpl.icon size={24} />
                    </div>
                    <h4 className="text-base font-black text-slate-900 mb-1.5 group-hover:text-primary transition-colors">{tmpl.name}</h4>
                    <p className="text-xs font-medium text-slate-500 leading-relaxed">{tmpl.description}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden bg-slate-50/50">
                <div className="w-full md:w-1/3 p-6 border-r border-slate-200 overflow-y-auto custom-scrollbar bg-white flex flex-col">
                  <div className="space-y-6 flex-1">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 block">Color Theme</label>
                      <div className="grid grid-cols-2 gap-3">
                        {THEME_COLORS.map(color => (
                          <button
                            key={color.id}
                            onClick={() => setSelectedThemeColor(color.id)}
                            className={'flex flex-col items-center p-3 rounded-xl border-2 transition-all ' + (selectedThemeColor === color.id ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200')}
                          >
                            <div className={'w-8 h-8 rounded-full mb-2 ' + color.bg} />
                            <span className={'text-xs font-bold ' + (selectedThemeColor === color.id ? color.text : 'text-slate-600')}>{color.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 block">Layout Style</label>
                      <div className="space-y-3">
                        {LAYOUT_STYLES.map(style => (
                          <button
                            key={style.id}
                            onClick={() => setSelectedLayoutStyle(style.id)}
                            className={'w-full flex items-start p-4 rounded-xl border-2 transition-all text-left ' + (selectedLayoutStyle === style.id ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-200')}
                          >
                            <div className={'mt-0.5 w-4 h-4 rounded-full border-2 mr-3 flex-shrink-0 ' + (selectedLayoutStyle === style.id ? 'border-primary bg-primary' : 'border-slate-300')} />
                            <div>
                              <div className={'text-sm font-bold ' + (selectedLayoutStyle === style.id ? 'text-primary' : 'text-slate-700')}>{style.name}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{style.description}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 space-y-3 pt-6 border-t border-slate-100">
                    <button
                      onClick={() => {
                        const html = generateTemplateHtml(selectedDefaultTemplate.id, selectedThemeColor, selectedLayoutStyle);
                        setShowDefaultTemplateModal(false);
                        setTimeout(() => setSelectedDefaultTemplate(null), 300);
                        navigate(`${basePath}/new/builder`, { state: { draftData: { ...selectedDefaultTemplate.draftData, body_html: html } } });
                      }}
                      className="w-full py-3.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-[#003d2f] transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
                    >
                      Use This Template
                    </button>
                    <button
                      onClick={() => setSelectedDefaultTemplate(null)}
                      className="w-full py-3.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all active:scale-[0.98]"
                    >
                      Back to Templates
                    </button>
                  </div>
                </div>
                
                <div className="hidden md:flex flex-1 p-8 items-center justify-center bg-slate-100/50 overflow-y-auto custom-scrollbar">
                  <div className="w-full h-full max-w-2xl bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                      <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                      <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                      <span className="ml-2 text-xs font-medium text-slate-400">Live Preview</span>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto custom-scrollbar bg-slate-50" dangerouslySetInnerHTML={{ __html: generateTemplateHtml(selectedDefaultTemplate.id, selectedThemeColor, selectedLayoutStyle) }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const Field = ({ label, children, error = '' }) => (
  <div className="space-y-1.5">
    <label className="text-[0.625rem] font-bold uppercase tracking-widest text-muted ml-1">{label}</label>
    {children}
    {error ? (
      <div className="flex items-start gap-1.5 px-1 text-[0.68rem] font-bold leading-snug text-rose-600">
        <AlertCircle size={12} className="mt-0.5 shrink-0" />
        <span>{error}</span>
      </div>
    ) : null}
  </div>
);

export default CommunicationTemplates;
