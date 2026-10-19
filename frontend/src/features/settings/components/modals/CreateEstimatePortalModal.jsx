import React, { useState, useEffect, useRef } from 'react';
import { X, FileSpreadsheet, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { createEstimatePortalTemplate } from '../../../../services/api';

export const ESTIMATE_PORTAL_TYPES = [
  { id: 'binding', label: 'Binding Estimate' },
  { id: 'non_binding', label: 'Non-Binding Estimate' },
  { id: 'hourly', label: 'Hourly Rate Estimate' },
  { id: 'flat_rate', label: 'Flat Rate Estimate' },
];

export const ESTIMATE_PRESET_LAYOUTS = [
  { id: 'standard', label: 'Standard Interactive Portal Preset' },
  { id: 'minimal', label: 'Modern Clean Estimate Preset' },
  { id: 'blank', label: 'Blank Canvas' },
];

export default function CreateEstimatePortalModal({
  isOpen,
  onClose,
  onBack,
  onCreated,
  branches = [],
  defaultBranchId = null,
}) {
  const [name, setName] = useState('Binding Estimate Portal');
  const [templateType, setTemplateType] = useState('binding');
  const [startingLayout, setStartingLayout] = useState('standard');
  const [selectedBranch, setSelectedBranch] = useState(defaultBranchId ? String(defaultBranchId) : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const nameInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName('Binding Estimate Portal');
      setTemplateType('binding');
      setStartingLayout('standard');
      setSelectedBranch(defaultBranchId ? String(defaultBranchId) : (branches[0]?.id ? String(branches[0].id) : ''));
      setErrorMessage('');
      setTimeout(() => nameInputRef.current?.focus(), 80);
    }
  }, [isOpen, defaultBranchId, branches]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const cleanName = String(name || '').trim();
    if (!cleanName || cleanName.length < 3) {
      setErrorMessage('Template name must be at least 3 characters.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        name: cleanName,
        subtype: templateType,
        template_type: templateType,
        applies_to_entity: 'opportunity',
        subject: cleanName,
        version: 1,
        branch: selectedBranch ? Number(selectedBranch) : null,
        is_active: true,
        html_content: startingLayout === 'blank' ? '<div></div>' : '',
      };

      const res = await createEstimatePortalTemplate(payload);
      const created = res?.data ?? res;
      onCreated?.(created);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || err?.response?.data?.name?.[0] || err?.message || 'Unable to create estimate template.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-estimate-template-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Back to step 1"
                className="rounded-xl p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h2 id="create-estimate-template-title" className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="text-purple-600" size={18} />
                <span>New Estimate Portal Template</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Set up initial properties for the interactive customer portal.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="bg-slate-50/75 dark:bg-slate-800/40 px-6 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
          <span className="text-slate-400">Step 1: Category</span>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white text-[10px] font-bold">2</span>
          <span className="text-slate-800 dark:text-slate-200 font-bold">Step 2: Estimate Details</span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g. Premium Moving Estimate Portal"
              maxLength={120}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="modal-portal-type-select" className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Portal Type
              </label>
              <select
                id="modal-portal-type-select"
                aria-label="Portal Type"
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {ESTIMATE_PORTAL_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Starting Layout
              </label>
              <select
                value={startingLayout}
                onChange={(e) => setStartingLayout(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {ESTIMATE_PRESET_LAYOUTS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {branches.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                Branch Scope
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Branches (Global)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-5 py-2 text-xs font-bold rounded-xl shadow-sm transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create & Open Builder</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
