import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, FileSignature, Truck, Receipt, CreditCard, FileText, Mail, MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import {
  createDocumentTemplate,
  createEstimatePortalTemplate,
  createCommunicationTemplate,
} from '../../../../services/api';

export const UNIVERSAL_CATEGORIES = [
  // Legal & Operational Documents - Opportunity Scope
  {
    id: 'contract',
    aliasId: 'legal:contract',
    group: 'legal',
    label: 'Moving Contract',
    subLabel: 'Opportunity / Sales Scope',
    scope_type: 'opportunity',
    template_type: 'contract',
    builderMode: 'contract',
    defaultTitle: 'Moving Services Contract',
    presetName: 'Services Contract',
    icon: FileSignature,
  },
  {
    id: 'invoice',
    aliasId: 'legal:invoice',
    group: 'legal',
    label: 'Payment Invoice',
    subLabel: 'Opportunity & Billing Scope',
    scope_type: 'opportunity',
    template_type: 'invoice',
    builderMode: 'invoice',
    defaultTitle: 'Payment Invoice',
    presetName: 'Payment Invoice',
    icon: Receipt,
  },
  {
    id: 'credit_card_authorization',
    aliasId: 'legal:credit_card_authorization',
    group: 'legal',
    label: 'Credit Card Authorization',
    subLabel: 'Opportunity Scope',
    scope_type: 'opportunity',
    template_type: 'credit_card_authorization',
    builderMode: 'cc_auth',
    defaultTitle: 'Credit Card Authorization',
    presetName: 'Credit Card Auth',
    icon: CreditCard,
  },
  // Legal & Operational Documents - Job Scope
  {
    id: 'bol',
    aliasId: 'legal:bol',
    group: 'legal',
    label: 'Bill of Lading — LOC',
    subLabel: 'Job / Move Day Scope',
    scope_type: 'job',
    template_type: 'bol',
    builderMode: 'bol',
    defaultTitle: 'Uniform Bill of Lading',
    presetName: 'Uniform Bill of Lading',
    icon: Truck,
  },
  // Customer Estimate Portals
  {
    id: 'estimate:moving',
    group: 'estimate',
    label: 'Residential Moving Estimate',
    subLabel: 'Customer Portal',
    estimate_type: 'moving',
    builderMode: 'estimate',
    defaultTitle: 'Residential Moving Estimate',
    icon: FileText,
  },
  {
    id: 'estimate:commercial',
    group: 'estimate',
    label: 'Commercial Office & Freight Estimate',
    subLabel: 'Customer Portal',
    estimate_type: 'commercial',
    builderMode: 'estimate',
    defaultTitle: 'Commercial Freight Estimate',
    icon: FileText,
  },
  {
    id: 'estimate:minimal',
    group: 'estimate',
    label: 'Minimal Single-Total Rate Quote',
    subLabel: 'Customer Portal',
    estimate_type: 'minimal',
    builderMode: 'estimate',
    defaultTitle: 'Quick Rate Estimate',
    icon: FileText,
  },
  // Customer Communications - Email
  {
    id: 'comm:email:quote_sent',
    group: 'comm',
    channel: 'email',
    label: 'Quote Sent Email Template',
    subLabel: 'Transactional Email',
    defaultKey: 'quote_sent',
    defaultSubject: 'Your Moving Estimate from {{Company.name}}',
    builderMode: 'email',
    defaultTitle: 'Quote Sent Customer Email',
    icon: Mail,
  },
  {
    id: 'comm:email:booking_confirmed',
    group: 'comm',
    channel: 'email',
    label: 'Booking Confirmation Email',
    subLabel: 'Transactional Email',
    defaultKey: 'booking_confirmed',
    defaultSubject: 'Booking Confirmed! Details for your upcoming move',
    builderMode: 'email',
    defaultTitle: 'Booking Confirmation Email',
    icon: Mail,
  },
  {
    id: 'comm:email:custom_email',
    group: 'comm',
    channel: 'email',
    label: 'Custom Transactional Email',
    subLabel: 'Transactional Email',
    defaultKey: 'custom_notification',
    defaultSubject: 'Update regarding your move with {{Company.name}}',
    builderMode: 'email',
    defaultTitle: 'Custom Transactional Email',
    icon: Mail,
  },
  // Customer Communications - SMS
  {
    id: 'comm:sms:quote_sent_sms',
    group: 'comm',
    channel: 'sms',
    label: 'Quote Sent SMS Alert',
    subLabel: 'Mobile SMS Alert',
    defaultKey: 'quote_sent_sms',
    builderMode: 'sms',
    defaultTitle: 'Quote Sent SMS Alert',
    icon: MessageSquare,
  },
  {
    id: 'comm:sms:crew_dispatched_sms',
    group: 'comm',
    channel: 'sms',
    label: 'Move Day Crew Dispatch SMS',
    subLabel: 'Mobile SMS Alert',
    defaultKey: 'crew_dispatched_sms',
    builderMode: 'sms',
    defaultTitle: 'Crew Dispatched SMS Alert',
    icon: MessageSquare,
  },
  {
    id: 'comm:sms:custom_sms',
    group: 'comm',
    channel: 'sms',
    label: 'Custom Operational SMS Alert',
    subLabel: 'Mobile SMS Alert',
    defaultKey: 'custom_sms_notification',
    builderMode: 'sms',
    defaultTitle: 'Custom Operational SMS Alert',
    icon: MessageSquare,
  },
];

const TEMPLATE_KEY_RE = /^[a-zA-Z0-9_.:-]+$/;

const DEFAULT_SAMPLE_HTML = `<div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#0f172a; padding: 24px;">
  <h2 style="font-size: 24px; font-weight: 800; color: #1e3a8a;">{{Company.name}}</h2>
  <p style="font-size: 14px; color: #475569; margin-top: 8px;">Hello {{Customer.full_name}},</p>
  <p style="font-size: 14px; color: #334155; line-height: 1.6; margin-top: 12px;">
    Thank you for choosing {{Company.name}} for your moving needs. Please find the details for your upcoming move below.
  </p>
</div>`;

export default function CreateUniversalDocumentModal({
  isOpen,
  onClose,
  onCreated,
  existingLegalTemplates = [],
  existingEstimateTemplates = [],
  existingCommTemplates = [],
  branches = [],
  defaultBranchId = null,
  initialCategory = 'legal:contract',
  presetLayouts = [],
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategory || 'legal:contract');
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [subject, setSubject] = useState('');
  const [templateKey, setTemplateKey] = useState('');
  const [startingTemplate, setStartingTemplate] = useState('preset'); // 'preset' | 'blank' | 'template:{id}'
  const [selectedBranch, setSelectedBranch] = useState(defaultBranchId ? String(defaultBranchId) : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const titleInputRef = useRef(null);

  const resolveCategory = (catKey) => {
    if (!catKey) return UNIVERSAL_CATEGORIES[0];
    return (
      UNIVERSAL_CATEGORIES.find((c) => c.id === catKey || c.aliasId === catKey) ||
      UNIVERSAL_CATEGORIES[0]
    );
  };

  // Sync initial category and defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      const categoryObj = resolveCategory(initialCategory);
      setSelectedCategoryId(categoryObj.id);
      setTitle(categoryObj?.defaultTitle || '');
      setSubject(categoryObj?.defaultSubject || '');
      setTemplateKey(categoryObj?.defaultKey ? `${categoryObj.defaultKey}_${Date.now().toString(36).slice(-4)}` : '');
      setTitleTouched(false);
      setStartingTemplate('preset');
      setSelectedBranch(defaultBranchId ? String(defaultBranchId) : (branches[0]?.id ? String(branches[0].id) : ''));
      setErrorMessage('');

      const timer = setTimeout(() => {
        if (titleInputRef.current) {
          titleInputRef.current.focus();
          titleInputRef.current.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialCategory, defaultBranchId, branches]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  const currentCategory = useMemo(() => {
    return resolveCategory(selectedCategoryId);
  }, [selectedCategoryId]);

  // Filter compatible custom templates strictly by selected category
  const compatibleCustomTemplates = useMemo(() => {
    if (currentCategory.group === 'legal') {
      return (existingLegalTemplates || []).filter((t) => {
        const type = String(t.template_type || '').toLowerCase();
        if (currentCategory.template_type === 'contract') {
          return type === 'contract' || type === 'agreement';
        }
        if (currentCategory.template_type === 'bol') {
          return type === 'bol' || type.includes('lading') || type.includes('loc');
        }
        if (currentCategory.template_type === 'invoice') {
          return type === 'invoice' || type.includes('receipt') || type.includes('bill');
        }
        if (currentCategory.template_type === 'credit_card_authorization') {
          return type === 'credit_card_authorization' || type === 'cc_auth';
        }
        return type === currentCategory.template_type;
      });
    }

    if (currentCategory.group === 'estimate') {
      return (existingEstimateTemplates || []).filter((t) => {
        const type = String(t.template_type || '').toLowerCase();
        return type === currentCategory.estimate_type || !type;
      });
    }

    if (currentCategory.group === 'comm') {
      return (existingCommTemplates || []).filter((t) => {
        const ch = String(t.channel || '').toLowerCase();
        return ch === currentCategory.channel;
      });
    }

    return [];
  }, [existingLegalTemplates, existingEstimateTemplates, existingCommTemplates, currentCategory]);

  // Category switch handler
  const handleCategoryChange = (newCatId) => {
    const newCategory = resolveCategory(newCatId);
    setSelectedCategoryId(newCategory.id);
    if (!titleTouched || !title.trim()) {
      setTitle(newCategory?.defaultTitle || '');
    }
    if (newCategory?.defaultSubject) {
      setSubject(newCategory.defaultSubject);
    }
    if (newCategory?.defaultKey) {
      setTemplateKey(`${newCategory.defaultKey}_${Date.now().toString(36).slice(-4)}`);
    } else {
      setTemplateKey('');
    }
    setStartingTemplate('preset');
    setErrorMessage('');
  };

  // Validation
  const trimmedTitle = title.trim();
  const isTitleValid = trimmedTitle.length >= 3 && trimmedTitle.length <= 120;
  const isEmailValid = currentCategory.channel !== 'email' || Boolean(subject.trim());
  const isTemplateKeyValid = currentCategory.group !== 'comm' || (Boolean(templateKey.trim()) && TEMPLATE_KEY_RE.test(templateKey.trim()));
  const isFormValid = isTitleValid && isEmailValid && isTemplateKeyValid && Boolean(startingTemplate);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const branchVal = selectedBranch
        ? Number(selectedBranch)
        : defaultBranchId
        ? Number(defaultBranchId)
        : branches[0]?.id
        ? Number(branches[0].id)
        : null;

      // ==========================================
      // 1. LEGAL & OPERATIONAL DOCUMENTS DISPATCH
      // ==========================================
      if (currentCategory.group === 'legal') {
        let initialContent = { docSettings: { format: 'Letter', margin: '40px' }, blocks: [] };
        let initialHtml = '';
        let initialSubject = '';

        if (startingTemplate === 'blank') {
          initialContent = {
            version: 2,
            id: `template-${Date.now()}`,
            name: trimmedTitle,
            settings: {
              pageSize: 'Letter',
              orientation: 'Portrait',
              category: currentCategory.label,
            },
            items: [],
            pages: [{ id: 'page-1', name: 'Page 1', items: [] }],
          };
          initialHtml = '';
          initialSubject = trimmedTitle;
        } else if (startingTemplate === 'preset') {
          const matchedPreset = (presetLayouts || []).find((p) => {
            if (currentCategory.template_type === 'contract') return p.name === 'Services Contract';
            if (currentCategory.template_type === 'bol') return p.name === 'Uniform Bill of Lading';
            if (currentCategory.template_type === 'invoice') return p.name === 'Payment Invoice';
            if (currentCategory.template_type === 'credit_card_authorization') return p.name === 'Credit Card Auth';
            return false;
          });
          initialSubject = matchedPreset?.subject || `${currentCategory.label} {{Contract.contract_number}}`;
          initialHtml = matchedPreset?.html || '';
          initialContent = { docSettings: { format: 'Letter', margin: '40px' }, blocks: [] };
        } else if (startingTemplate.startsWith('template:')) {
          const sourceId = Number(startingTemplate.replace('template:', ''));
          const sourceTemplate = (existingLegalTemplates || []).find((t) => Number(t.id) === sourceId);
          if (sourceTemplate) {
            initialSubject = sourceTemplate.subject || '';
            initialHtml = sourceTemplate.html_content || '';
            try {
              initialContent = structuredClone(sourceTemplate.content);
            } catch {
              initialContent = JSON.parse(JSON.stringify(sourceTemplate.content || {}));
            }
          }
        }

        const payload = {
          name: trimmedTitle,
          template_type: currentCategory.template_type,
          scope_type: currentCategory.scope_type,
          applies_to_entity: currentCategory.scope_type === 'job' ? 'planned_sub_job' : currentCategory.scope_type,
          applies_to_service_type: '',
          applies_to_binding_type: '',
          applies_to_opp_type: '',
          subject: initialSubject,
          version: '1.0',
          branch: branchVal,
          is_active: true,
          content: initialContent,
          html_content: initialHtml,
        };

        const res = await createDocumentTemplate(payload);
        const saved = res?.data ?? res;
        if (!saved?.id) throw new Error('Server returned an unexpected response with no template ID.');

        onCreated(saved, {
          group: 'legal',
          mode: currentCategory.builderMode,
          payload,
        });
        return;
      }

      // ==========================================
      // 2. ESTIMATE PORTAL TEMPLATES DISPATCH
      // ==========================================
      if (currentCategory.group === 'estimate') {
        let initialHtml = '';
        if (startingTemplate === 'blank') {
          initialHtml = '';
        } else if (startingTemplate === 'preset') {
          initialHtml = `<div class="portal-template" style="padding: 24px; font-family: sans-serif;">
  <h1 style="font-size: 28px; font-weight: bold; color: #1e3a8a;">{{Company.name}} — Estimate</h1>
  <p>Customer: {{Customer.full_name}} | Opportunity: {{Opportunity.opportunity_number}}</p>
  <div style="margin-top: 20px;" data-portal-block="summary">Estimate Summary</div>
</div>`;
        } else if (startingTemplate.startsWith('template:')) {
          const sourceId = Number(startingTemplate.replace('template:', ''));
          const sourceTemplate = (existingEstimateTemplates || []).find((t) => Number(t.id) === sourceId);
          if (sourceTemplate) {
            initialHtml = sourceTemplate.html_content || '';
          }
        }

        const payload = {
          name: trimmedTitle,
          template_type: currentCategory.estimate_type,
          applies_to_entity: 'opportunity',
          applies_to_service_type: '',
          applies_to_binding_type: '',
          applies_to_opp_type: '',
          subject: `${trimmedTitle} - {{Opportunity.opportunity_number}}`,
          version: 1,
          branch: branchVal || 1,
          is_active: true,
          html_content: initialHtml,
        };

        const res = await createEstimatePortalTemplate(payload);
        const saved = res?.data ?? res;
        if (!saved?.id) throw new Error('Server returned an unexpected response with no template ID.');

        onCreated(saved, {
          group: 'estimate',
          mode: 'estimate',
          payload,
        });
        return;
      }

      // ==========================================
      // 3. COMMUNICATION (EMAIL & SMS) DISPATCH
      // ==========================================
      if (currentCategory.group === 'comm') {
        let initialBody = '';
        let initialHtml = '';

        if (startingTemplate === 'blank') {
          initialBody = '';
          initialHtml = '';
        } else if (startingTemplate === 'preset') {
          if (currentCategory.channel === 'email') {
            initialHtml = DEFAULT_SAMPLE_HTML;
            initialBody = 'Hello {{Customer.full_name}}, thank you for choosing us.';
          } else {
            initialBody = 'Hi {{Customer.first_name}}, this is {{Company.name}} regarding your upcoming move.';
          }
        } else if (startingTemplate.startsWith('template:')) {
          const sourceId = Number(startingTemplate.replace('template:', ''));
          const sourceTemplate = (existingCommTemplates || []).find((t) => Number(t.id) === sourceId);
          if (sourceTemplate) {
            initialBody = sourceTemplate.body || '';
            initialHtml = sourceTemplate.body_html || '';
          }
        }

        const payload = {
          name: trimmedTitle,
          channel: currentCategory.channel,
          template_key: templateKey.trim() || `${currentCategory.defaultKey || 'custom'}_${Date.now()}`,
          subject: currentCategory.channel === 'email' ? subject.trim() : '',
          body: initialBody,
          body_html: currentCategory.channel === 'email' ? initialHtml : '',
          branch: branchVal,
          is_active: true,
        };

        const res = await createCommunicationTemplate(payload);
        const saved = res?.data ?? res;
        if (!saved?.id) throw new Error('Server returned an unexpected response with no template ID.');

        onCreated(saved, {
          group: 'comm',
          mode: currentCategory.channel === 'sms' ? 'sms' : 'email',
          payload,
        });
        return;
      }
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Unable to create template. Please verify your inputs and try again.';
      setErrorMessage(String(detail));
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70000] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
      role="presentation"
    >
      <div
        className="w-full max-w-[620px] bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-universal-document-modal-title"
        aria-describedby="create-universal-document-modal-description"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 id="create-universal-document-modal-title" className="text-xl font-extrabold text-slate-900 tracking-tight">
              Create Document
            </h3>
            <p id="create-universal-document-modal-description" className="text-xs text-slate-500 mt-0.5">
              Select a category, configure settings, and choose your starting layout.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Alert Banner */}
        {errorMessage ? (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
            <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        ) : null}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Field 1: Document Applies To */}
          <div>
            <label htmlFor="document-applies-to" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Document Applies To <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                id="document-applies-to"
                value={selectedCategoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all appearance-none cursor-pointer disabled:opacity-50"
              >
                <optgroup label="Opportunity Scope (Legal & Billing)">
                  <option value="contract">Moving Contract</option>
                  <option value="invoice">Payment Invoice</option>
                  <option value="credit_card_authorization">Credit Card Authorization</option>
                </optgroup>
                <optgroup label="Job Scope (Operations & Move Day)">
                  <option value="bol">Bill of Lading — LOC</option>
                </optgroup>
                <optgroup label="Customer Estimate Portals (Sales Acceptance)">
                  <option value="estimate:moving">Residential Moving Estimate</option>
                  <option value="estimate:commercial">Commercial Office & Freight Estimate</option>
                  <option value="estimate:minimal">Minimal Single-Total Rate Quote</option>
                </optgroup>
                <optgroup label="Customer Communications (Automated Triggers)">
                  <option value="comm:email:quote_sent">Quote Sent Email Template</option>
                  <option value="comm:email:booking_confirmed">Booking Confirmation Email</option>
                  <option value="comm:email:custom_email">Custom Transactional Email</option>
                  <option value="comm:sms:quote_sent_sms">Quote Sent SMS Alert</option>
                  <option value="comm:sms:crew_dispatched_sms">Move Day Crew Dispatch SMS</option>
                  <option value="comm:sms:custom_sms">Custom Operational SMS Alert</option>
                </optgroup>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {currentCategory.subLabel} — determines the target builder and execution context.
            </p>
          </div>

          {/* Field 2: Document Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="document-title" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Document Title <span className="text-rose-500">*</span>
              </label>
              <span className={`text-[11px] font-semibold ${trimmedTitle.length < 3 || trimmedTitle.length > 120 ? 'text-amber-600' : 'text-slate-400'}`}>
                {trimmedTitle.length}/120
              </span>
            </div>
            <input
              ref={titleInputRef}
              id="document-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleTouched(true);
              }}
              placeholder="e.g. Standard Moving Agreement"
              maxLength={120}
              disabled={isSubmitting}
              className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-50 ${
                titleTouched && !isTitleValid
                  ? 'border-rose-300 focus:ring-rose-500'
                  : 'border-slate-200'
              }`}
            />
            {titleTouched && !isTitleValid && (
              <p className="text-[11px] text-rose-600 font-semibold mt-1">
                Title must be between 3 and 120 characters.
              </p>
            )}
          </div>

          {/* Conditional Email Subject */}
          {currentCategory.channel === 'email' && (
            <div className="animate-in fade-in duration-150">
              <label htmlFor="universal-email-subject" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Email Subject <span className="text-rose-500">*</span>
              </label>
              <input
                id="universal-email-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Your Moving Estimate from {{Company.name}}"
                disabled={isSubmitting}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-50"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Merge tags like <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">{"{{Company.name}}"}</code> are supported.
              </p>
            </div>
          )}

          {/* Conditional Template Key for Communications */}
          {currentCategory.group === 'comm' && (
            <div className="animate-in fade-in duration-150">
              <label htmlFor="universal-template-key" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Trigger Key / Slug <span className="text-rose-500">*</span>
              </label>
              <input
                id="universal-template-key"
                type="text"
                value={templateKey}
                onChange={(e) => setTemplateKey(e.target.value)}
                placeholder="e.g. quote_sent"
                disabled={isSubmitting}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-50"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Used in automated workflows to identify this notification template.
              </p>
            </div>
          )}

          {/* Field 3: Starting Template Selector */}
          <div>
            <label htmlFor="starting-template" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Starting Template <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                id="starting-template"
                value={startingTemplate}
                onChange={(e) => setStartingTemplate(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all appearance-none cursor-pointer disabled:opacity-50"
              >
                <option value="preset">
                  {currentCategory.presetName || currentCategory.label} Preset (Recommended)
                </option>
                <option value="blank">
                  Blank Canvas (Clean Page)
                </option>
                {compatibleCustomTemplates.length > 0 && (
                  <optgroup label="Compatible Existing Templates">
                    {compatibleCustomTemplates.map((t) => (
                      <option key={t.id} value={`template:${t.id}`}>
                        {t.name} {t.branch ? `(Branch #${t.branch})` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Start with the recommended system preset, create from scratch, or clone an existing template.
            </p>
          </div>

          {/* Optional Branch Assignment */}
          {branches && branches.length > 0 && (
            <div>
              <label htmlFor="universal-document-branch" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Branch Scope
              </label>
              <div className="relative">
                <select
                  id="universal-document-branch"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all appearance-none cursor-pointer disabled:opacity-50"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 mt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Document'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
