import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import { useModal } from '../../../hooks/useModal';
import { createBuilderTemplate, duplicateBuilderTemplate, getBuilderMeta, getBuilderTemplates, getGlobalTemplateCategories, getApiErrorMessage } from '../../../services/api';

const FIELD_CLASS = 'mt-1.5 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 aria-invalid:border-red-500 aria-invalid:focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500';
const LABEL_CLASS = 'block text-xs font-semibold text-slate-700';
const FORM_KINDS = {
  document: { label: 'Document', title: 'Create Document', type: 'Document type', placeholder: 'e.g. Moving service agreement', help: 'Contracts, bills of lading, waivers, and operational documents.' },
  estimate_portal: { label: 'Estimate', title: 'Create Estimate', type: 'Estimate type', placeholder: 'e.g. Standard binding estimate', help: 'Customer estimates and pricing presentations.' },
  invoice: { label: 'Invoice', title: 'Create Invoice', type: 'Invoice type', placeholder: 'e.g. Deposit invoice', help: 'Final, deposit, storage, and progress invoices.' },
  communication: { label: 'Email & SMS', title: 'Create Message Template', type: 'Message type', placeholder: 'e.g. Booking confirmation', help: 'Reusable email and SMS message templates.' },
};

export default function GlobalTemplateCreateForm({ onCreated, onClose, initialKind = 'document', initialSubtype = '', fixedKind = false }) {
  const [kinds, setKinds] = useState([]);
  const [values, setValues] = useState({ kind: initialKind, subtype: initialSubtype, name: '', category: 'general', startingTemplateId: '' });
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [startingTemplates, setStartingTemplates] = useState([]);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const dialogRef = useRef(null);
  const titleRef = useRef(null);
  const submitting = useRef(false);
  const selectedKind = kinds.find((kind) => kind.kind === values.kind);
  const config = FORM_KINDS[values.kind] || FORM_KINDS.document;
  const validType = selectedKind?.subtypes.some((subtype) => subtype.key === values.subtype);
  useModal(true, busy ? undefined : onClose);

  useEffect(() => {
    const previousFocus = document.activeElement;
    titleRef.current?.focus();
    return () => { previousFocus?.focus?.(); };
  }, []);

  useEffect(() => {
    if (busy) dialogRef.current?.focus();
  }, [busy]);

  useEffect(() => {
    let active = true;
    setMetadataLoading(true);
    setError('');
    getBuilderMeta().then(({ data }) => {
      if (!active) return;
      const profiles = data.kinds || [];
      if (!profiles.some((kind) => kind.kind === initialKind && kind.subtypes?.length)) throw new Error('Template types are unavailable. Please try again.');
      setKinds(profiles);
      setValues((current) => {
        const profile = profiles.find((kind) => kind.kind === current.kind);
        return profile?.subtypes.some((subtype) => subtype.key === current.subtype)
          ? current : { ...current, subtype: profile?.subtypes[0]?.key || '', startingTemplateId: '' };
      });
    })
      .catch((err) => { if (active) setError(getApiErrorMessage(err)); })
      .finally(() => { if (active) setMetadataLoading(false); });
    return () => { active = false; };
  }, [initialKind, retry]);

  useEffect(() => {
    let active = true;
    getGlobalTemplateCategories().then(({ data }) => { if (active && Array.isArray(data)) setCategories(data); })
      .catch(() => { /* Category suggestions are optional; users can always enter a category. */ });
    return () => { active = false; };
  }, []);

  const changeField = (key, value) => {
    setValues((current) => ({ ...current, [key]: value,
      ...(key === 'kind' ? { subtype: kinds.find((kind) => kind.kind === value)?.subtypes[0]?.key || '', startingTemplateId: '' } : {}),
      ...(key === 'subtype' ? { startingTemplateId: '' } : {}),
    }));
    setFieldErrors((current) => ({ ...current, [key]: '' }));
    setError('');
  };
  const errorFor = (key) => fieldErrors[key] ? <span id={`template-${key}-error`} className="mt-1 block text-xs font-normal text-red-600">{fieldErrors[key]}</span> : null;
  const fieldAccessibility = (key) => ({ 'aria-invalid': Boolean(fieldErrors[key]),
    ...(fieldErrors[key] ? { 'aria-describedby': `template-${key}-error` } : {}) });

  useEffect(() => {
    let active = true;
    setStartingTemplates([]);
    setTemplatesError('');
    if (!values.kind || !values.subtype) return undefined;
    setTemplatesLoading(true);
    const loadTemplates = async () => {
      const loaded = [];
      let offset = 0;
      while (active) {
        const { data } = await getBuilderTemplates({ kind: values.kind, subtype: values.subtype, state: 'active', limit: 50, offset });
        if (!active) return;
        const page = data.results || [];
        loaded.push(...page);
        if (!page.length || loaded.length >= (data.count ?? loaded.length)) break;
        offset += page.length;
      }
      if (active) setStartingTemplates([...new Map(loaded.filter((template) => template.kind === values.kind && template.subtype === values.subtype).map((template) => [template.id, template])).values()]);
    };
    loadTemplates()
      .catch((err) => { if (active) setTemplatesError(getApiErrorMessage(err)); })
      .finally(() => { if (active) setTemplatesLoading(false); });
    return () => { active = false; };
  }, [values.kind, values.subtype, retry]);

  const create = async (event) => {
    event.preventDefault();
    if (submitting.current || metadataLoading || !validType) return;
    const name = values.name.trim();
    if (!name) { setError('Enter a template title.'); titleRef.current?.focus(); return; }
    if (values.startingTemplateId && !startingTemplates.some((template) => String(template.id) === values.startingTemplateId && template.kind === values.kind && template.subtype === values.subtype)) {
      setError('Choose an available starting template or start blank.');
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      const { startingTemplateId, ...template } = values;
      const category = values.category.trim() || 'general';
      const details = { description: description.trim() };
      const { data } = startingTemplateId
        ? await duplicateBuilderTemplate(startingTemplateId, { name, category, ...details })
        : await createBuilderTemplate({ ...template, name, category, ...details });
      await onCreated(data);
    }
    catch (err) {
      const data = err.response?.data || {};
      const errors = {};
      ['name', 'kind', 'subtype', 'category', 'description'].forEach((key) => {
        if (data[key]) errors[key] = Array.isArray(data[key]) ? data[key].join(' ') : String(data[key]);
      });
      setFieldErrors(errors);
      setError(Object.keys(errors).length ? 'Please check the highlighted fields.' : getApiErrorMessage(err));
    }
    finally { submitting.current = false; setBusy(false); }
  };

  const trapFocus = (event) => {
    if (event.key !== 'Tab') return;
    const controls = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)')];
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first || document.activeElement === dialogRef.current) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
      return;
    }
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };

  return createPortal(
    <div ref={dialogRef} tabIndex={-1} onKeyDown={trapFocus} className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-3 outline-none backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-label="Create global template" aria-describedby="global-template-description">
      <form onSubmit={create} aria-busy={busy} className="flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{config.title}</h2>
            <p id="global-template-description" className="mt-1 text-sm text-slate-500">{config.help}</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"><X size={18} /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}
            {!validType && !metadataLoading && <button type="button" onClick={() => setRetry((value) => value + 1)} className="ml-2 underline">Try again</button>}
          </div>}
          <fieldset disabled={busy} className="min-w-0 space-y-4">
            <label className={LABEL_CLASS}>Template title <span className="text-red-600" aria-hidden="true">*</span>
              <input ref={titleRef} aria-label="Template title" required maxLength={255} autoComplete="off" placeholder={config.placeholder} {...fieldAccessibility('name')}
                value={values.name} onChange={(event) => changeField('name', event.target.value)} className={`${FIELD_CLASS} ${fieldErrors.name ? 'border-red-500' : ''}`} />
              {errorFor('name')}
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className={LABEL_CLASS}>Template <span className="text-red-600" aria-hidden="true">*</span>
                <select aria-label="Template" required disabled={fixedKind || metadataLoading || busy} value={values.kind} {...fieldAccessibility('kind')}
                  onChange={(event) => changeField('kind', event.target.value)} className={FIELD_CLASS}>
                  {metadataLoading ? <option value={values.kind}>Loading templates…</option>
                    : kinds.map((kind) => <option key={kind.kind} value={kind.kind}>{FORM_KINDS[kind.kind]?.label || kind.label}</option>)}
                </select>
                {errorFor('kind')}
              </label>
              <label className={LABEL_CLASS}>{config.type} <span className="text-red-600" aria-hidden="true">*</span>
                <select aria-label={config.type} required disabled={metadataLoading || !selectedKind || busy} value={values.subtype} {...fieldAccessibility('subtype')}
                  onChange={(event) => changeField('subtype', event.target.value)} className={FIELD_CLASS}>
                  {metadataLoading ? <option value="">Loading types…</option> : !selectedKind ? <option value="">Types unavailable</option>
                    : selectedKind.subtypes.map((subtype) => <option key={subtype.key} value={subtype.key}>{subtype.label}</option>)}
                </select>
                {errorFor('subtype')}
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className={LABEL_CLASS}>Category <span className="font-normal text-slate-400">(optional)</span>
                <input aria-label="Category" list="global-template-categories" maxLength={80} value={values.category} placeholder="Choose or enter a category" {...fieldAccessibility('category')}
                  onChange={(event) => changeField('category', event.target.value)} className={FIELD_CLASS} />
                <datalist id="global-template-categories">{categories.map((category) => <option key={category} value={category} />)}</datalist>
                {errorFor('category')}
              </label>
            <label className={LABEL_CLASS}>Starting template <span className="font-normal text-slate-400">(optional)</span>
              <select aria-label="Starting template" disabled={templatesLoading || !validType || busy} value={values.startingTemplateId}
                onChange={(event) => changeField('startingTemplateId', event.target.value)} className={FIELD_CLASS}>
                <option value="">{templatesLoading ? 'Loading starting templates…' : 'Blank template'}</option>
                {startingTemplates.map((template) => <option key={template.id} value={template.id}>{template.name} (copy)</option>)}
              </select>
              <span className="mt-1.5 block text-xs font-normal text-slate-500">Start blank or copy a template of the selected type.</span>
            </label>
            </div>
            <label className={LABEL_CLASS}>Description <span className="font-normal text-slate-400">(optional)</span>
              <textarea aria-label="Description" rows={2} maxLength={2000} value={description} placeholder="Describe when this template should be used." {...fieldAccessibility('description')}
                onChange={(event) => { setDescription(event.target.value); setFieldErrors((current) => ({ ...current, description: '' })); }}
                className={`${FIELD_CLASS} resize-y`} />
              {errorFor('description')}
            </label>
            {templatesError && <p role="status" className="text-xs text-amber-700">Starting templates could not be loaded. You can still start blank.
              <button type="button" onClick={() => setRetry((value) => value + 1)} className="ml-2 underline">Retry</button>
            </p>}
          </fieldset>
        </div>
        <footer className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3 sm:px-6">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={busy || metadataLoading || !validType || !values.name.trim()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            {busy && <Loader2 size={16} className="animate-spin" />}{busy ? 'Creating…' : config.title}
          </button>
        </footer>
      </form>
    </div>, document.body,
  );
}
