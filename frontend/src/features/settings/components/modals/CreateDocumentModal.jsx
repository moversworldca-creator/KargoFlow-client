import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, FileSignature, Truck, Receipt, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { createDocumentTemplate } from '../../../../services/api';

export const DOCUMENT_CATEGORIES = [
  {
    id: 'contract',
    label: 'Moving Contract',
    subLabel: 'Opportunity / Sales',
    scope_type: 'opportunity',
    template_type: 'contract',
    defaultTitle: 'Moving Services Contract',
    presetName: 'Services Contract',
    icon: FileSignature,
  },
  {
    id: 'bol',
    label: 'Bill of Lading — LOC',
    subLabel: 'Job / Operations',
    scope_type: 'job',
    template_type: 'bol',
    defaultTitle: 'Uniform Bill of Lading',
    presetName: 'Uniform Bill of Lading',
    icon: Truck,
  },
  {
    id: 'invoice',
    label: 'Payment Invoice',
    subLabel: 'Opportunity & Billing',
    scope_type: 'opportunity',
    template_type: 'invoice',
    defaultTitle: 'Payment Invoice',
    presetName: 'Payment Invoice',
    icon: Receipt,
  },
  {
    id: 'credit_card_authorization',
    label: 'Credit Card Authorization',
    subLabel: 'Opportunity',
    scope_type: 'opportunity',
    template_type: 'credit_card_authorization',
    defaultTitle: 'Credit Card Authorization',
    presetName: 'Credit Card Auth',
    icon: CreditCard,
  },
];

export default function CreateDocumentModal({
  isOpen,
  onClose,
  onCreated,
  existingTemplates = [],
  branches = [],
  defaultBranchId = null,
  initialCategory = 'contract',
  presetLayouts = [],
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategory || 'contract');
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [startingTemplate, setStartingTemplate] = useState('preset'); // 'blank' | 'preset' | 'template:{id}'
  const [selectedBranch, setSelectedBranch] = useState(defaultBranchId ? String(defaultBranchId) : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const titleInputRef = useRef(null);

  // Sync initial category when modal opens
  useEffect(() => {
    if (isOpen) {
      const cat = DOCUMENT_CATEGORIES.some((c) => c.id === initialCategory)
        ? initialCategory
        : 'contract';
      setSelectedCategoryId(cat);
      const categoryObj = DOCUMENT_CATEGORIES.find((c) => c.id === cat);
      setTitle(categoryObj?.defaultTitle || '');
      setTitleTouched(false);
      setStartingTemplate('preset');
      setSelectedBranch(defaultBranchId ? String(defaultBranchId) : (branches[0]?.id ? String(branches[0].id) : ''));
      setErrorMessage('');

      // Auto-focus title after mount
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
    return DOCUMENT_CATEGORIES.find((c) => c.id === selectedCategoryId) || DOCUMENT_CATEGORIES[0];
  }, [selectedCategoryId]);

  // Filter custom templates compatible with the selected document type
  const compatibleCustomTemplates = useMemo(() => {
    return (existingTemplates || []).filter((t) => {
      const type = String(t.template_type || '').toLowerCase();
      if (selectedCategoryId === 'contract') {
        return type === 'contract' || type === 'agreement';
      }
      if (selectedCategoryId === 'bol') {
        return type === 'bol' || type.includes('lading') || type.includes('loc');
      }
      if (selectedCategoryId === 'invoice') {
        return type === 'invoice' || type.includes('receipt');
      }
      if (selectedCategoryId === 'credit_card_authorization') {
        return type === 'credit_card_authorization' || type === 'cc_auth';
      }
      return type === selectedCategoryId;
    });
  }, [existingTemplates, selectedCategoryId]);

  // When category changes, update title suggestion if user hasn't typed a custom title
  const handleCategoryChange = (newCatId) => {
    setSelectedCategoryId(newCatId);
    const newCategory = DOCUMENT_CATEGORIES.find((c) => c.id === newCatId);
    if (!titleTouched || !title.trim()) {
      setTitle(newCategory?.defaultTitle || '');
    }
    // Reset starting template to preset if previous custom template is incompatible
    setStartingTemplate('preset');
    setErrorMessage('');
  };

  // Validation
  const trimmedTitle = title.trim();
  const isTitleValid = trimmedTitle.length >= 3 && trimmedTitle.length <= 120;
  const isFormValid = isTitleValid && Boolean(selectedCategoryId) && Boolean(startingTemplate);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // 1. Resolve starting content and layout
      let initialContent = { docSettings: { format: 'Letter', margin: '40px' }, blocks: [] };
      let initialHtml = '';
      let initialSubject = '';

      if (startingTemplate === 'blank') {
        // Genuinely blank canvas
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
        // Load matched standard preset from PRESET_LAYOUTS
        const matchedPreset = (presetLayouts || []).find((p) => {
          if (currentCategory.id === 'contract') return p.name === 'Services Contract';
          if (currentCategory.id === 'bol') return p.name === 'Uniform Bill of Lading';
          if (currentCategory.id === 'invoice') return p.name === 'Payment Invoice';
          if (currentCategory.id === 'credit_card_authorization') return p.name === 'Credit Card Auth';
          return false;
        });
        initialSubject = matchedPreset?.subject || `${currentCategory.label} {{Contract.contract_number}}`;
        initialHtml = matchedPreset?.html || '';
        initialContent = { docSettings: { format: 'Letter', margin: '40px' }, blocks: [] };
      } else if (startingTemplate.startsWith('template:')) {
        // Clone from selected existing custom template (deep-cloned so original stays unchanged)
        const sourceId = Number(startingTemplate.replace('template:', ''));
        const sourceTemplate = (existingTemplates || []).find((t) => Number(t.id) === sourceId);
        if (sourceTemplate) {
          initialSubject = sourceTemplate.subject || '';
          initialHtml = sourceTemplate.html_content || '';
          let clonedContent = { docSettings: { format: 'Letter', margin: '40px' }, blocks: [] };
          if (sourceTemplate.content) {
            try {
              clonedContent = structuredClone(sourceTemplate.content);
            } catch {
              clonedContent = JSON.parse(JSON.stringify(sourceTemplate.content));
            }
          }
          initialContent = clonedContent;
        }
      }

      // 2. Resolve branch
      const branchVal = selectedBranch
        ? Number(selectedBranch)
        : defaultBranchId
        ? Number(defaultBranchId)
        : branches[0]?.id
        ? Number(branches[0].id)
        : null;

      // 3. Assemble backend payload
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

      // 4. API Dispatch
      const res = await createDocumentTemplate(payload);
      const saved = res?.data ?? res;

      if (!saved?.id) {
        throw new Error('Server returned an unexpected response with no template ID.');
      }

      // Notify parent on success
      onCreated(saved, payload);
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Unable to create document template. Please check your inputs and try again.';
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
        aria-labelledby="create-document-modal-title"
        aria-describedby="create-document-modal-description"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 id="create-document-modal-title" className="text-xl font-extrabold text-slate-900 tracking-tight">
              Create Document
            </h3>
            <p id="create-document-modal-description" className="text-xs text-slate-500 mt-0.5">
              Configure your document settings and select a starting layout.
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 1. Document Applies To */}
          <div>
            <label htmlFor="document-applies-to" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Document Applies To <span className="text-blue-600">*</span>
            </label>
            <select
              id="document-applies-to"
              value={selectedCategoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              disabled={isSubmitting}
              className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-slate-800 disabled:opacity-60 transition"
            >
              <optgroup label="Opportunity Scope (Generated Once per Estimate)">
                <option value="contract">Moving Contract</option>
                <option value="invoice">Payment Invoice</option>
                <option value="credit_card_authorization">Credit Card Authorization</option>
              </optgroup>
              <optgroup label="Job Scope (Generated per Move Day / Segment)">
                <option value="bol">Bill of Lading — LOC</option>
              </optgroup>
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Determines dynamic merge tags and template calculation capabilities.
            </p>
          </div>

          {/* 2. Document Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="document-title" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Document Title <span className="text-blue-600">*</span>
              </label>
              <span className="text-[11px] font-semibold text-slate-400">
                {title.length} / 120
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
              placeholder="e.g. Standard Residential Moving Contract"
              disabled={isSubmitting}
              maxLength={120}
              className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-slate-800 disabled:opacity-60 transition"
            />
            {titleTouched && !isTitleValid && (
              <p className="text-[11px] text-rose-500 font-medium mt-1">
                Title must be between 3 and 120 characters.
              </p>
            )}
            {!titleTouched || isTitleValid ? (
              <p className="text-[11px] text-slate-400 mt-1">
                A descriptive title for your document or template.
              </p>
            ) : null}
          </div>

          {/* 3. Starting Template */}
          <div>
            <label htmlFor="starting-template" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Starting Template <span className="text-blue-600">*</span>
            </label>
            <select
              id="starting-template"
              value={startingTemplate}
              onChange={(e) => setStartingTemplate(e.target.value)}
              disabled={isSubmitting}
              className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-slate-800 disabled:opacity-60 transition"
            >
              <optgroup label="Standard Starting Points">
                <option value="preset">
                  {currentCategory.presetName || currentCategory.label} Preset (Recommended)
                </option>
                <option value="blank">
                  Blank Canvas (Clean Page)
                </option>
              </optgroup>
              {compatibleCustomTemplates.length > 0 ? (
                <optgroup label="Clone From Existing Saved Templates">
                  {compatibleCustomTemplates.map((t) => (
                    <option key={t.id} value={`template:${t.id}`}>
                      {t.name} {t.version ? `(v${t.version})` : ''}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Start with an empty page, the built-in preset layout, or derive from an existing template.
            </p>
          </div>

          {/* Optional Branch Assignment (if user has multi-branch access) */}
          {branches && branches.length > 1 ? (
            <div>
              <label htmlFor="document-branch" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Branch Scope
              </label>
              <select
                id="document-branch"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                disabled={isSubmitting}
                className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold text-slate-800 disabled:opacity-60 transition"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Creating Document...</span>
                </>
              ) : (
                <span>Create Document</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
