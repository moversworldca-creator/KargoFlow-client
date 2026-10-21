import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createBuilderTemplate, duplicateBuilderTemplate, getBuilderMeta, getBuilderTemplates, getApiErrorMessage } from '../../../services/api';

export default function GlobalTemplateCreateForm({ onCreated, onClose, initialKind = 'document', initialSubtype = '' }) {
  const [kinds, setKinds] = useState([]);
  const [values, setValues] = useState({ kind: initialKind, subtype: initialSubtype, name: '', category: 'general', startingTemplateId: '' });
  const [startingTemplates, setStartingTemplates] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    getBuilderMeta().then(({ data }) => {
      if (!active) return;
      setKinds(data.kinds);
      setValues((current) => {
        const profile = data.kinds.find((kind) => kind.kind === current.kind);
        return profile && !profile.subtypes.some((subtype) => subtype.key === current.subtype)
          ? { ...current, subtype: profile.subtypes[0].key } : current;
      });
    })
      .catch((err) => { if (active) setError(getApiErrorMessage(err)); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!values.kind || !values.subtype) return undefined;
    getBuilderTemplates({ kind: values.kind, subtype: values.subtype, state: 'active', limit: 50, offset: 0 })
      .then(({ data }) => { if (active) setStartingTemplates(data.results || []); })
      .catch((err) => { if (active) setError(getApiErrorMessage(err)); });
    return () => { active = false; };
  }, [values.kind, values.subtype]);

  const create = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const { startingTemplateId, ...template } = values;
      const { data } = startingTemplateId
        ? await duplicateBuilderTemplate(startingTemplateId, { name: template.name })
        : await createBuilderTemplate(template);
      await onCreated(data);
    }
    catch (err) { setError(getApiErrorMessage(err)); }
    finally { setBusy(false); }
  };
  const selectedKind = kinds.find((kind) => kind.kind === values.kind);
  const form = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label="Create global template">
      <form onSubmit={create} className="flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Create Document</h2>
            <p className="mt-1 text-xs text-slate-500">Configure your template and select a starting layout.</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close dialog" className="rounded-lg px-3 py-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50">×</button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
          <label className="block text-xs font-semibold tracking-wide text-slate-700">
            {values.kind === 'communication' ? 'MESSAGE TYPE' : 'DOCUMENT APPLIES TO'} <span className="text-blue-600">*</span>
            <select
              aria-label={values.kind === 'communication' ? 'Message type' : 'Document applies to'}
              value={values.subtype}
              onChange={(event) => setValues({ ...values, subtype: event.target.value, startingTemplateId: '' })}
              className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              {(selectedKind?.subtypes || []).map((subtype) => <option key={subtype.key} value={subtype.key}>{subtype.label}</option>)}
            </select>
            <span className="mt-1.5 block text-[11px] font-normal tracking-normal text-slate-500">Determines available merge fields and template capabilities.</span>
          </label>
          <label className="block text-xs font-semibold tracking-wide text-slate-700">
            TEMPLATE TITLE <span className="text-blue-600">*</span>
            <input
              aria-label="Template title"
              required
              maxLength={255}
              value={values.name}
              onChange={(event) => setValues({ ...values, name: event.target.value })}
              className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-800 transition placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <span className="mt-1.5 block text-[11px] font-normal tracking-normal text-slate-500">A descriptive name for this global template.</span>
          </label>
          <label className="block text-xs font-semibold tracking-wide text-slate-700">
            STARTING TEMPLATE <span className="text-blue-600">*</span>
            <select
              aria-label="Starting template"
              value={values.startingTemplateId}
              onChange={(event) => setValues({ ...values, startingTemplateId: event.target.value })}
              className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Blank template</option>
              {startingTemplates.map((template) => <option key={template.id} value={template.id}>{template.name} (copy)</option>)}
            </select>
            <span className="mt-1.5 block text-[11px] font-normal tracking-normal text-slate-500">Start blank or copy an existing global template of this type.</span>
          </label>
          <label className="block text-xs font-semibold tracking-wide text-slate-700">
            CATEGORY
            <input maxLength={80} value={values.category} onChange={(e) => setValues({ ...values, category: e.target.value })} className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium tracking-normal text-slate-700 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </label>
        </div>
        <footer className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-3 sm:px-6">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>
          <button disabled={busy || !selectedKind || !values.name.trim()} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Creating…' : 'Create Document'}</button>
        </footer>
      </form>
    </div>
  );
  return createPortal(form, document.body);
}
