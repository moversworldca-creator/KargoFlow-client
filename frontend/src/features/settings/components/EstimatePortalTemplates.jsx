import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, PlusCircle, Save, Trash2, Edit2, ArrowLeft, FileText, Copy, Search, Layout, X } from 'lucide-react';

import Card from '../../../shared/ui/Card';
import EstimateBuilderFullPage from './EstimateBuilderFullPage';
import {
  createEstimatePortalTemplate,
  deactivateEstimatePortalTemplate,
  getEstimatePortalTemplates,
  getDocumentVariableRegistry,
  getTemplateVariables,
  updateEstimatePortalTemplate,
  duplicateEstimatePortalTemplate,
  getBranches,
} from '../../../services/api';
import api from '../../../services/api'
const DEFAULT_TEMPLATE_CSS = `
.portal-template {
    box-sizing: border-box;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

.portal-template .breakdown-table-wrapper {
    border: 1px solid #e2e8f0; 
    border-radius: 0.5rem; 
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
}
.portal-template .breakdown-table-wrapper table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
    text-align: left;
    min-width: 600px;
}
.portal-template .breakdown-table-wrapper th {
    background-color: #f8fafc;
    padding: 0.875rem 1rem;
    font-weight: 600;
    color: #475569;
    border-bottom: 2px solid #e2e8f0;
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
}
.portal-template .breakdown-table-wrapper td {
    padding: 1rem;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
    vertical-align: top;
}
.portal-template .breakdown-table-wrapper tr:last-child td {
    border-bottom: none;
}
.portal-template .breakdown-table-wrapper tr:nth-child(even) td {
    background-color: #f8fafc;
}

.portal-template [data-portal-block="payment"] {
    display: block;
    width: 100%;
}

.portal-template [data-portal-block="signing"] {
    display: none;
}

.portal-template .sign-button {
    background-color: #1d4ed8;
    color: #ffffff;
    border: none;
    border-radius: 0.375rem;
    padding: 0.75rem 1.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    width: 100%;
    transition: background-color 0.2s;
    text-align: center;
    display: inline-block;
}
.portal-template .sign-button:hover {
    background-color: #1e40af;
}

.portal-template .sign-optional-note {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: #64748b;
}

@media (max-width: 1024px) {
    .portal-template .financial-box-width {
        width: 55% !important;
    }
    .portal-template .responsive-grid-3 {
        gap: 1rem !important;
    }
    .portal-template .mobile-padding {
        padding-left: 2rem !important;
        padding-right: 2rem !important;
    }
}

@media (max-width: 768px) {
    .portal-template .mobile-padding {
        padding-left: 1.5rem !important;
        padding-right: 1.5rem !important;
        padding-top: 1.5rem !important;
        padding-bottom: 1.5rem !important;
    }
    .portal-template .responsive-grid-3 {
        grid-template-columns: 1fr 1fr !important; 
        gap: 1rem !important;
    }
    .portal-template .responsive-grid-3 > div:last-child {
        grid-column: span 2 !important;
    }
    .portal-template .responsive-grid-2 {
        grid-template-columns: 1fr !important;
        gap: 1.5rem !important;
    }
    .portal-template .financial-box-width {
        width: 100% !important;
        min-width: 0 !important;
    }
    .portal-template .responsive-flex {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 1rem !important;
    }
    .portal-template .mobile-header-text {
        text-align: left !important;
    }
    .portal-template .route-arrow-h {
        display: none !important;
    }
    .portal-template .route-connector-v {
        display: block !important;
        width: 2px !important;
        height: 20px !important;
        background-color: #cbd5e1 !important;
        margin: 0.25rem 0 0.25rem 0.9375rem !important; 
    }
    .portal-template .route-container {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 0 !important;
    }
    .portal-template .route-item {
        width: 100% !important;
    }
    .portal-template .mobile-logo {
        height: 2.75rem !important;
        margin-bottom: 0 !important;
    }
}

@media (max-width: 480px) {
    .portal-template .mobile-padding {
        padding-left: 1rem !important;
        padding-right: 1rem !important;
        padding-top: 1.25rem !important;
        padding-bottom: 1.25rem !important;
    }
    .portal-template .responsive-grid-3 {
        grid-template-columns: 1fr !important; 
        gap: 1rem !important;
    }
    .portal-template .responsive-grid-3 > div:last-child {
        grid-column: span 1 !important;
    }
    .portal-template .mobile-title {
        font-size: 1.5rem !important; 
    }
    .portal-template .mobile-logo {
        height: 2.25rem !important; 
    }
    .portal-template .financial-box-width div {
        font-size: 0.8125rem !important;
    }
    .portal-template .financial-box-width div:last-child span {
        font-size: 1.25rem !important;
    }
}
`;

const SAMPLE_VARIABLES = {
  'Company.name': 'KargoFlow',
  'company_name': 'KargoFlow',
  'Company.logo_url': 'https://placehold.co/150x50?text=KargoFlow',
  'company_logo_url': 'https://placehold.co/150x50?text=KargoFlow',
  'Estimate.estimate_number': 'EST-00042',
  'estimate_number': 'EST-00042',
  'sales_number': 'OPP-89232',
  'Customer.full_name': 'Alex Customer',
  'customer_name': 'Alex Customer',
  'customer_email': 'alex.customer@example.com',
  'customer_phone': '(555) 019-2834',
  'Opportunity.move_date': '2026-06-15',
  'move_date': '2026-06-15',
  'move_size_label': '3 Bedroom House',
  'move_type_label': 'Local Moving',
  'origin_address': '123 Main St, Vancouver, BC',
  'origin_meta': 'Ground Floor, No elevator',
  'destination_address': '456 Oak Ave, Burnaby, BC',
  'destination_meta': '3rd Floor, Elevator available',
  'route_stops_count': '2',
  'route_stops_summary': 'Stop 1: 987 Storage Rd, Richmond, BC\nStop 2: 654 Donation Ln, New Westminster, BC',
  'route_stops_html': '<div><strong>Stop 1</strong><br/>987 Storage Rd, Richmond, BC</div><div style="margin-top:8px;"><strong>Stop 2</strong><br/>654 Donation Ln, New Westminster, BC</div>',
  'sales_rep_name': 'Sarah Representative',
  'sales_rep_phone': '(555) 019-5678',
  'subtotal': '$950.00',
  'discount_amount': '$50.00',
  'sales_tax_amount': '$108.00',
  'Estimate.grand_total': '$1,008.00',
  'grand_total': '$1,008.00',
  'Estimate.deposit_amount': '$100.00',
  'deposit_amount': '$100.00',
  'balance_due': '$908.00',
  'inventory_link': 'https://example.com/inventory',
  'invoice_number': 'INV-2026-77',
  'payment_amount': '$250.00',
  'payment_method': 'Credit Card',
  'agent_phone': '+1 416 555 0100',
  'referral_source': 'Google Search',
  'claim_number': 'CLM-9001',
  'claim_date': '2026-05-18',
  'closure_date': '2026-05-16',
  'user_phone': '+1 416 555 0105',
  'user_email': 'morgan@example.com',
  'document_type': 'Invoice',
  'document_id': 'DOC-5501',
  'completed_date': '2026-05-15',
  'failure_reason': 'Customer Canceled',
  'arrival_window': '8:00 AM - 10:00 AM',
  'invoice_amount': '$1,250.00',
  'full_name': 'Alex Customer',
  'invoice_total': '$1,250.00',
  'warehouse_phone_number': '+1 416 555 0199',
  'warehouse_email': 'warehouse@example.com',
  'Opportunity.preferred_start_time': '09:00:00',
  'Company.phone': '+1 800 555 0199',
  'quote_link': 'https://example.com/quote/123',
  'payment_link': 'https://example.com/pay/123',
  'recall_reson': 'Follow up requested',
  'recall_reason': 'Follow up requested',
  'recall_date': '2026-05-22',
  'contract_link': 'http://localhost:5173/portal/contracts/sample-token',
  'booking_details_link': 'https://example.com/booking/123',
  'estimate_link': 'https://example.com/estimate/123',
  'job_start_time': '08:00:00',
  'opportunity_status': 'booked',
  'estimate_pdf_link': 'https://example.com/estimate.pdf',
  'document_pdf_link': 'http://localhost:8000/api/public/documents/pdf/?token=123',
  'job_status': 'confirmed',
  'terms_title': 'Terms & Conditions',
  'terms_body': 'This estimate is based on the information provided. Final charges may change if actual move details differ.',
  'checkbox_text': 'I agree to the moving terms.',
  'signature_text': 'Customer signature / acceptance block.',
  'payment_authorization_text': 'I authorize the deposit payment.',
};


const normalizeTemplateHtml = (html) => {
  let normalized = String(html || '');
  normalized = normalized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  return normalized;
};

const replaceTemplateVariables = (rawHtml, isSample) => {
  let raw = String(rawHtml || '');
  if (!isSample) return raw;
  const withCurlies = raw.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}/g, (match, key) => {
    return SAMPLE_VARIABLES[key.trim()] !== undefined ? SAMPLE_VARIABLES[key.trim()] : match;
  });
  return withCurlies.replace(/@([a-zA-Z_][a-zA-Z0-9_.]*)/g, (match, key) => {
    return SAMPLE_VARIABLES[key.trim()] !== undefined ? SAMPLE_VARIABLES[key.trim()] : match;
  });
};

const scopePortalCss = (css, containerId) => {
  if (!css || !css.trim()) return '';
  return css.replace(/(^|\})\s*([^{]+)\s*\{/g, (match, p1, p2) => {
    if (p2.includes('@media') || p2.includes('@keyframes') || p2.includes('@font-face')) {
      return match;
    }
    const scoped = p2.split(',').map(selector => {
      const s = selector.trim();
      if (!s) return '';
      if (s === 'body' || s === 'html' || s === ':root') return `#${containerId}`;
      return `#${containerId} ${s}`;
    }).join(', ');
    return `${p1} ${scoped} {`;
  });
};

function PreviewPortal({ templateDraft }) {
  const draft = templateDraft || {};
  const pageHtml = String(draft.html_content || '').trim();
  const pageCss = String(draft.css_content || '').trim();
  const ignoreDefaultStyles = draft.ignore_default_styles || false;

  useEffect(() => {
    if (pageHtml.includes('cdn.tailwindcss.com')) {
      const scriptId = 'tailwind-cdn-script';
      let script = document.getElementById(scriptId);
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://cdn.tailwindcss.com';
        document.head.appendChild(script);
      }
    }
  }, [pageHtml]);

  // Preview uses placeholders (no mock data). Real values are injected at runtime on the customer portal.
  const normalizedHtml = pageHtml ? normalizeTemplateHtml(pageHtml) : '';
  const rendered = normalizedHtml ? replaceTemplateVariables(normalizedHtml, {}) : '';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-black font-sans">
      {!ignoreDefaultStyles && <style dangerouslySetInnerHTML={{ __html: DEFAULT_TEMPLATE_CSS }} />}
      {pageCss ? <style dangerouslySetInnerHTML={{ __html: scopePortalCss(pageCss) }} /> : null}
      <div className="w-full">
        <div className="bg-white min-h-screen">
          <div className="w-full">
            {rendered ? (
              <div className="portal-template" dangerouslySetInnerHTML={{ __html: rendered }} />
            ) : (
              <div className="p-8 text-sm font-semibold text-slate-600">
                Add `layout_config.page_html` (with @variables like `@customer_name`) to see a preview.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const ESTIMATE_PORTAL_TEMPLATE_TYPES = [
  { value: 'moving', label: 'Moving' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'minimal', label: 'Minimal' },
];
const ESTIMATE_PORTAL_TEMPLATE_TYPE_VALUES = ESTIMATE_PORTAL_TEMPLATE_TYPES.map((type) => type.value);
const DEFAULT_ESTIMATE_PORTAL_TEMPLATE_TYPE = 'moving';
const DEFAULT_ESTIMATE_PORTAL_TEMPLATE_VERSION = 1;
const getTemplateTypeLabel = (value) => (
  ESTIMATE_PORTAL_TEMPLATE_TYPES.find((type) => type.value === value)?.label || value
);
const toPositiveIntegerVersion = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return DEFAULT_ESTIMATE_PORTAL_TEMPLATE_VERSION;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const EMPTY_TEMPLATE = {
  id: null,
  branch: null,
  name: '',
  template_type: DEFAULT_ESTIMATE_PORTAL_TEMPLATE_TYPE,
  applies_to_entity: 'opportunity',
  applies_to_service_type: '',
  applies_to_binding_type: '',
  applies_to_opp_type: '',
  subject: '',
  version: DEFAULT_ESTIMATE_PORTAL_TEMPLATE_VERSION,
  is_active: true,
  html_content: '',
};







const toastCls = (type) =>
  type === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
    : 'border-rose-200 bg-rose-50 text-rose-900';

const getApiErrorMessage = (err, fallback) => {
  const data = err?.response?.data;
  if (data && typeof data === 'object') {
    const fieldMessages = Object.entries(data)
      .filter(([key]) => key !== 'detail' && key !== 'message')
      .flatMap(([key, value]) => {
        const messages = Array.isArray(value) ? value : [value];
        return messages
          .map((message) => String(message || '').trim())
          .filter(Boolean)
          .map((message) => `${key}: ${message}`);
      });
    if (fieldMessages.length) return fieldMessages.join(' ');
  }
  const detail = data?.detail || data?.message || err?.message;
  return detail ? String(detail) : fallback;
};

const normalize = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
};

const buildPlaceholder = (kind, key) => `<span data-sign="${kind}" data-key="${key}"></span>`;
const tokenWrap = (key) => `{{${String(key || '').trim()}}}`;

const safeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
};

export default function EstimatePortalTemplates({ branchId = null, builderRouteView = '', builderRouteItemId = null }) {
  const navigate = useNavigate();
  const [view, setView] = useState('list'); // 'list' | 'edit'
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_TEMPLATE);
  const [variables, setVariables] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState(branchId ? String(branchId) : '');

  useEffect(() => {
    if (branchId !== null) {
      setBranchFilter(String(branchId));
    }
  }, [branchId]);
  const [branches, setBranches] = useState([]);

  const [registry, setRegistry] = useState([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registryError, setRegistryError] = useState('');
  const [registrySearch, setRegistrySearch] = useState('');
  const [previewOpportunityId, setPreviewOpportunityId] = useState('');
  const [previewMode, setPreviewMode] = useState('sample'); // sample | opportunity
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  const [opportunitySearchQuery, setOpportunitySearchQuery] = useState('');
  const [opportunitySearchResults, setOpportunitySearchResults] = useState([]);
  const [isSearchingOpps, setIsSearchingOpps] = useState(false);

  useEffect(() => {
    if (!opportunitySearchQuery || opportunitySearchQuery.length < 2) {
      setOpportunitySearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingOpps(true);
      try {
        const res = await api.get('/sales/opportunities/', { params: { search: opportunitySearchQuery, limit: 5 } });
        setOpportunitySearchResults(res?.data?.results || []);
      } catch (e) {
        // Ignore
      } finally {
        setIsSearchingOpps(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [opportunitySearchQuery]);

  const lastBuilderRouteRef = useRef('');
  const messageTimeoutRef = useRef(null);

  const notify = (type, text, duration = 3000) => {
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
      messageTimeoutRef.current = null;
    }
    setMessage({ type, text });
    if (duration) {
      messageTimeoutRef.current = setTimeout(() => {
        setMessage({ type: '', text: '' });
        messageTimeoutRef.current = null;
      }, duration);
    }
  };

  const templateTypes = useMemo(() => {
    const unique = Array.from(
      new Set([
        ...ESTIMATE_PORTAL_TEMPLATE_TYPE_VALUES,
        ...(items || []).map((t) => String(t.template_type || '').trim()).filter(Boolean),
      ])
    );
    return unique;
  }, [items]);

  const filtered = useMemo(() => {
    const term = String(searchTerm || '').trim().toLowerCase();
    return (items || []).filter((t) => {
      const matchesSearch = !term || String(t.name || '').toLowerCase().includes(term);
      const matchesType = typeFilter === 'all' || String(t.template_type || '') === typeFilter;
      const matchesActive =
        activeFilter === 'all' ? true : Boolean(t.is_active) === (activeFilter === 'active');
      const matchesBranch = !branchFilter || String(t.branch || '') === String(branchFilter);
      return matchesSearch && matchesType && matchesActive && matchesBranch;
    });
  }, [items, searchTerm, typeFilter, activeFilter, branchFilter]);

  const loadTemplates = async () => {
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const params = { is_active: 'all' };
      if (branchFilter) params.branch = branchFilter;
      const res = await getEstimatePortalTemplates(params);
      const list = normalize(res?.data ?? res);
      setItems(list);
    } catch (err) {
      setItems([]);
      setMessage({ type: 'error', text: err?.response?.data?.detail || 'Unable to load templates.' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadVariables = async (templateId) => {
    if (!templateId) {
      setVariables([]);
      return;
    }
    try {
      const res = await getTemplateVariables({ template: templateId });
      setVariables(normalize(res?.data ?? res));
    } catch {
      setVariables([]);
    }
  };

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchFilter]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getBranches();
        const rows = normalize(res?.data ?? res);
        setBranches(rows);
        if (!branchFilter && rows.length) setBranchFilter(String(rows[0].id));
      } catch {
        setBranches([]);
      }
    })();
  }, [branchFilter]);

  useEffect(() => {
    if (!selectedId) return;
    const template = items.find((t) => t.id === selectedId);
    if (template) setDraft({ ...EMPTY_TEMPLATE, ...template });
    loadVariables(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const beginNewTemplate = () => {
    navigate('/settings/estimate-portal-templates/new/builder');
  };

  useEffect(() => {
    if (builderRouteView !== 'builder') {
      lastBuilderRouteRef.current = '';
      if (isBuilderOpen) setIsBuilderOpen(false);
      return;
    }
    if (isLoading) return;

    const routeKey = `${builderRouteItemId || 'new'}:builder`;
    if (lastBuilderRouteRef.current === routeKey && isBuilderOpen) return;

    if (builderRouteItemId && builderRouteItemId !== 'new') {
      const template = items.find((row) => String(row.id) === String(builderRouteItemId));
      if (!template) {
        setMessage({ type: 'error', text: 'Estimate portal template not found.' });
        navigate('/settings/estimate-portal-templates', { replace: true });
        return;
      }
      setSelectedId(template.id);
      setDraft({ ...EMPTY_TEMPLATE, ...template });
      loadVariables(template.id);
      setView('edit');
    } else {
      setSelectedId(null);
      setVariables([]);
      setDraft({
        ...EMPTY_TEMPLATE,
        template_type: typeFilter !== 'all' && ESTIMATE_PORTAL_TEMPLATE_TYPE_VALUES.includes(typeFilter)
          ? typeFilter
          : DEFAULT_ESTIMATE_PORTAL_TEMPLATE_TYPE,
        branch: branchFilter ? Number(branchFilter) : null,
      });
      setView('edit');
    }

    setIsBuilderOpen(true);
    lastBuilderRouteRef.current = routeKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builderRouteView, builderRouteItemId, isLoading, items, navigate, isBuilderOpen]);

  const openEstimateBuilder = () => {
    const templateId = draft?.id || selectedId;
    navigate(templateId ? `/settings/estimate-portal-templates/${templateId}/builder` : '/settings/estimate-portal-templates/builder');
  };

  const closeEstimateBuilder = () => {
    setIsBuilderOpen(false);
    if (builderRouteView === 'builder') {
      navigate('/settings/estimate-portal-templates');
    }
  };


  const duplicateTemplate = async () => {
    if (!draft.id) return;
    const newDraft = { ...draft };
    delete newDraft.id;
    newDraft.name = `Copy of ${newDraft.name}`;
    setDraft(newDraft);
    setMessage({ type: 'success', text: 'Template duplicated. Click Save to create it.' });
  };

  const handleDuplicate = async (id) => {
    try {
      await duplicateEstimatePortalTemplate(id);
      await loadTemplates();
      notify('success', 'Template duplicated successfully.');
    } catch (err) {
      notify('error', getApiErrorMessage(err, 'Unable to duplicate template.'));
    }
  };

  const saveTemplate = async () => {
    const payload = {
      name: String(draft.name || '').trim(),
      template_type: String(draft.template_type || '').trim(),
      applies_to_entity: String(draft.applies_to_entity || '').trim() || 'opportunity',
      applies_to_service_type: String(draft.applies_to_service_type || '').trim(),
      applies_to_binding_type: String(draft.applies_to_binding_type || '').trim(),
      applies_to_opp_type: String(draft.applies_to_opp_type || '').trim(),
      subject: String(draft.subject || '').trim(),
      version: toPositiveIntegerVersion(draft.version),
      branch: draft.branch ? Number(draft.branch) : null,
      is_active: Boolean(draft.is_active),
      html_content: String(draft.html_content || ''),
    };
    if (!payload.name) {
      notify('error', 'Estimate portal template name is required.');
      return null;
    }
    if (!payload.template_type) {
      notify('error', 'Estimate portal template type is required.');
      return null;
    }
    if (!ESTIMATE_PORTAL_TEMPLATE_TYPE_VALUES.includes(payload.template_type)) {
      notify('error', `Estimate portal template type must be one of: ${ESTIMATE_PORTAL_TEMPLATE_TYPES.map((type) => type.label).join(', ')}.`);
      return null;
    }
    if (!payload.branch) {
      notify('error', 'Choose a branch before saving this document template.');
      return null;
    }
    if (payload.version === null) {
      notify('error', 'Version must be a positive whole number.');
      return null;
    }

    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const wasExisting = Boolean(draft.id);
      const res = draft.id ? await updateEstimatePortalTemplate(draft.id, payload) : await createEstimatePortalTemplate(payload);
      const saved = res?.data ?? res;
      await loadTemplates();
      setSelectedId(saved?.id || null);
      notify('success', wasExisting ? 'Estimate portal template updated.' : 'Estimate portal template created.');
      return saved;
    } catch (err) {
      notify('error', getApiErrorMessage(err, 'Unable to save template.'));
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const removeTemplate = async (id, name) => {
    const ok = window.confirm(`Delete template "${name}"?`);
    if (!ok) return;
    setIsDeleting(true);
    setMessage({ type: '', text: '' });
    try {
      await deactivateEstimatePortalTemplate(id);
      await loadTemplates();
      if (selectedId === id) {
        setView('list');
        setSelectedId(null);
      }
      notify('success', 'Estimate portal template deleted.');
    } catch (err) {
      notify('error', getApiErrorMessage(err, 'Unable to delete template.'));
    } finally {
      setIsDeleting(false);
    }
  };

  const appendToHtml = (snippet) => {
    const next = `${draft.html_content || ''}${draft.html_content ? '\n' : ''}${snippet}`;
    setDraft((prev) => ({ ...prev, html_content: next }));
  };

  const insertToken = (tokenKey) => {
    const key = String(tokenKey || '').trim();
    if (!key) return;
    appendToHtml(tokenWrap(key));
  };

  const quickTokens = useMemo(() => {
    const fromVars = (variables || [])
      .map((v) => String(v.token_key || '').trim())
      .filter(Boolean);
    const defaults = [
      'Customer.full_name',
      'Customer.email',
      'Customer.primary_phone',
      'Opportunity.opportunity_number',
      'Opportunity.move_date',
      'Company.name',
      'Contract.contract_number',
      'Contract.portal_link',
    ];
    return Array.from(new Set([...fromVars, ...defaults])).slice(0, 16);
  }, [variables]);

  const loadRegistry = async () => {
    setRegistryLoading(true);
    setRegistryError('');
    try {
      const res = await getDocumentVariableRegistry();
      const groups = safeList(res?.data?.groups ?? res?.data ?? res);
      setRegistry(groups);
    } catch (err) {
      setRegistry([]);
      setRegistryError(err?.response?.data?.detail || 'Unable to load variable registry.');
    } finally {
      setRegistryLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'edit') {
      loadRegistry();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const filteredRegistry = useMemo(() => {
    const term = String(registrySearch || '').trim().toLowerCase();
    if (!term) return registry;
    return (registry || [])
      .map((group) => {
        const fields = (group?.fields || []).filter((f) =>
          String(f?.key || '').toLowerCase().includes(term)
        );
        if (!fields.length) return null;
        return { ...group, fields };
      })
      .filter(Boolean);
  }, [registry, registrySearch]);

  const runPreview = async () => {
    setIsPreviewOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {message.text ? (
        <div
          className={`fixed right-4 top-6 z-[70000] flex max-w-[min(420px,calc(100vw-2rem))] items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-2xl ${toastCls(message.type)}`}
        >
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      ) : null}

      <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Estimate Portal Templates</h2>
                <p className="text-sm text-slate-500 mt-1">Manage standard HTML templates for estimate portals.</p>
              </div>
              <button
                type="button"
                onClick={beginNewTemplate}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm hover:bg-blue-700 transition"
              >
                <PlusCircle size={18} /> New Template
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search templates..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All Types</option>
                {templateTypes.map((t) => (
                  <option key={t} value={t}>{getTemplateTypeLabel(t)}</option>
                ))}
              </select>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              {!branchId && (
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              )}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-blue-500" size={24} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                <FileText className="mx-auto mb-3 opacity-50" size={32} />
                <p className="font-medium text-sm">No templates found matching your criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-xs font-bold">
                    <tr>
                      <th className="px-6 py-4">Template Name</th>
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Version</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                              <FileText size={16} />
                            </div>
                            <div>
                              <div>{t.name}</div>
                              <div className="text-[11px] font-normal text-slate-500">{t.subject || 'No subject'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                            {getTemplateTypeLabel(t.template_type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-600">{t.version || '-'}</td>
                        <td className="px-6 py-4">
                          {t.is_active ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => handleDuplicate(t.id)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
                            title="Duplicate Template"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={() => navigate(`/settings/estimate-portal-templates/${t.id}/builder`)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
                            title="Edit Template"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => removeTemplate(t.id, t.name)}
                            disabled={isDeleting}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                            title="Delete Template"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

      {/* Full Page Builder Overlay */}
      {isBuilderOpen ? (
        <EstimateBuilderFullPage
          draft={draft}
          onChange={(newDraft) => setDraft(newDraft)}
          onSave={async () => {
            const saved = await saveTemplate();
            if (saved?.id) {
              navigate(`/settings/estimate-portal-templates/${saved.id}/builder`, { replace: true });
            }
          }}
          onBack={closeEstimateBuilder}
          onDuplicate={duplicateTemplate}
          onPreview={() => {
            closeEstimateBuilder();
            setIsPreviewOpen(true);
          }}
          variables={variables}
          registry={registry}
          branches={branches}
          templateTypes={ESTIMATE_PORTAL_TEMPLATE_TYPES}
        />
      ) : null}

      {/* Fullscreen Overlay Preview Modal */}
      

    </div>
  );
}
