import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSignature, Plus, Search, Loader2, Copy, ChevronLeft, ChevronRight, FileText, Mail, Pencil, FileSpreadsheet, Trash2 } from 'lucide-react';
import { usePlatformAuth } from '../../../auth/PlatformAuthContext';
import { PLATFORM_PERMISSIONS } from '../../../rbac/platformRbac';
import {
  getBuilderTemplates, getBuilderTemplate, getBuilderTemplateDraft, getBuilderTemplateRevision,
  startBuilderTemplateDraft, updateBuilderTemplate, archiveBuilderTemplate,
  activateBuilderTemplate, deactivateBuilderTemplate, duplicateBuilderTemplate, getApiErrorMessage,
} from '../../../services/api';
import UnifiedTemplateBuilder from './UnifiedTemplateBuilder/UnifiedTemplateBuilder';
import GlobalTemplateCreateForm from './GlobalTemplateCreateForm';
import ChooseTemplateTypeModal from './modals/ChooseTemplateTypeModal';
import { fromGlobalDocument, getTemplateMode } from './UnifiedTemplateBuilder/core/globalTemplateAdapter';

const BASE = '/document-templates';
const PAGE_SIZE = 50;
const TEMPLATE_SECTIONS = [
  {
    id: 'document',
    label: 'Document Templates',
    description: 'Design and manage legal contracts, bills of lading, payment invoices, and credit card authorizations.',
    icon: FileSignature,
  },
  {
    id: 'estimate_portal',
    label: 'Estimate Templates',
    description: 'Design customer-facing estimate portals and pricing summaries.',
    icon: FileSpreadsheet,
  },
  {
    id: 'communication',
    label: 'Email & SMS Templates',
    description: 'Manage reusable email notifications and SMS templates.',
    icon: Mail,
  },
];

export default function DocumentTemplates({ builderRouteView = '', builderRouteItemId = null, initialKind = '' }) {
  const navigate = useNavigate();
  const { hasPermission } = usePlatformAuth();
  const canManage = hasPermission(PLATFORM_PERMISSIONS.TEMPLATES_MANAGE);
  const canPublish = hasPermission(PLATFORM_PERMISSIONS.TEMPLATES_PUBLISH);
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(['email', 'sms'].includes(initialKind) ? 'communication' : initialKind || 'document');
  const [state, setState] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState(null);
  const [editorLoading, setEditorLoading] = useState(false);
  const [createKind, setCreateKind] = useState(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const creating = builderRouteView === 'builder' && (!builderRouteItemId || builderRouteItemId === 'new');
  const showCreateForm = creating || Boolean(createKind);
  const editingId = builderRouteView === 'builder' && !creating ? builderRouteItemId : null;
  const activeSection = TEMPLATE_SECTIONS.find((section) => section.id === filter) || TEMPLATE_SECTIONS[0];
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const firstItem = count ? offset + 1 : 0;
  const lastItem = Math.min(offset + PAGE_SIZE, count);

  useEffect(() => {
    if (showCreateForm || editingId) return;
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      const kind = ['email', 'sms'].includes(filter) ? 'communication' : filter;
      getBuilderTemplates({ kind, ...(kind === 'communication' && filter !== kind ? { subtype: filter } : {}),
        q: query, state, limit: PAGE_SIZE, offset })
        .then(({ data }) => { if (active) { setItems(data.results); setCount(data.count); setError(''); } })
        .catch((err) => { if (active) { setItems([]); setError(getApiErrorMessage(err)); } })
        .finally(() => { if (active) setLoading(false); });
    }, query ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [query, filter, state, offset, refresh, showCreateForm, editingId]);

  useEffect(() => {
    setEditor(null);
    if (!editingId) return;
    let active = true;
    setEditorLoading(true);
    setError('');
    (async () => {
      const { data: template } = await getBuilderTemplate(editingId);
      if (!canManage && !template.draft_revision && !template.published_revision) throw new Error("This template has no saved revision.");
      const { data: draft } = canManage ? await startBuilderTemplateDraft(editingId)
        : template.draft_revision ? await getBuilderTemplateDraft(editingId)
        : await getBuilderTemplateRevision(editingId, template.published_revision.id);
      if (!active) return;
      const mode = getTemplateMode(template);
      const content = fromGlobalDocument(draft.document, { name: template.name, mode });
      setEditor({ ...template, mode, content: { ...content, lock_version: draft.revision.lock_version },
        lock_version: draft.revision.lock_version, isHydratedFromServer: true });
    })().catch((err) => { if (active) setError(getApiErrorMessage(err)); })
      .finally(() => { if (active) setEditorLoading(false); });
    return () => { active = false; };
  }, [editingId, canManage]);

  const back = () => { setError(''); setRefresh((n) => n + 1); navigate(BASE); };
  const closeCreate = () => {
    setCreateKind(null);
    setShowTypePicker(false);
    if (creating) back();
  };
  const chooseCreateKind = (selected) => {
    setCreateKind(selected === 'estimate' ? 'estimate_portal' : selected);
    setShowTypePicker(false);
  };
  const changeSection = (sectionId) => {
    setFilter(sectionId);
    setOffset(0);
    setQuery('');
    setState('');
  };
  const mutate = async (operation) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try { await operation(); setRefresh((n) => n + 1); }
    catch (err) { setError(getApiErrorMessage(err)); }
    finally { setBusy(false); }
  };

  if (editingId && editor) return <UnifiedTemplateBuilder
    key={editor.id} mode={editor.mode} template={editor} canSave={canManage} canPublish={canManage && canPublish}
    onBack={back}
    onSave={async (payload) => {
      await updateBuilderTemplate(editor.id, { name: payload.name,
        ...(payload.category ? { category: payload.category } : {}) });
    }}
  />;

  return <div className="max-w-7xl mx-auto space-y-4 pb-8">
    <nav aria-label="Global template categories" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      {TEMPLATE_SECTIONS.map((section) => {
        const Icon = section.icon;
        const selected = activeSection.id === section.id;
        return <button
          key={section.id}
          type="button"
          aria-pressed={selected}
          onClick={() => changeSection(section.id)}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            selected ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        ><Icon size={16} />{section.label}</button>;
      })}
    </nav>
    {error && <div role="alert" className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg">{error}</div>}
    {editingId ? <div className="p-8 flex gap-3 items-center">{editorLoading && <Loader2 className="animate-spin" size={20} />}
      {editorLoading ? 'Loading template…' : 'Unable to open this template.'}<button onClick={back}>Back to templates</button></div>
    : showCreateForm ? canManage ? <GlobalTemplateCreateForm initialKind={createKind || initialKind || 'document'} onClose={closeCreate} onCreated={(data) => {
      setCreateKind(null);
      setRefresh((n) => n + 1);
      navigate(`${BASE}/${data.id}/builder`, { replace: true });
    }} /> : <p role="alert">You do not have permission to create global templates.</p> : <>
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{activeSection.label}</h1>
          <p className="mt-1 text-sm text-slate-600">{activeSection.description}</p>
        </div>
        {canManage && <button className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white shadow-sm transition-colors hover:bg-blue-700" onClick={() => setShowTypePicker(true)}><Plus size={18} />New {activeSection.id === 'document' ? 'Document' : activeSection.id === 'estimate_portal' ? 'Estimate' : 'Template'}</button>}
      </div>
      <div className="mb-6 flex gap-3">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-4 text-slate-400">
          <Search size={18} /><input aria-label="Search templates" placeholder="Search templates..." value={query} onChange={(e) => { setQuery(e.target.value); setOffset(0); }} className="w-full py-3 text-sm text-slate-800 outline-none" />
        </label>
        <select aria-label="Template state" value={state} onChange={(e) => { setState(e.target.value); setOffset(0); }} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800">
          <option value="">All Statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option><option value="all">All states</option>
        </select>
      </div>
      {loading ? <p className="flex gap-2 items-center p-8"><Loader2 className="animate-spin" size={20} />Loading templates…</p>
        : !items.length ? <p className="p-8 text-slate-500">No global templates found.</p>
        : <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[1100px] table-fixed text-sm">
          <colgroup>
            <col className="w-[30%]" /><col className="w-[10%]" /><col className="w-[12%]" />
            <col className="w-[7%]" /><col className="w-[10%]" /><col className="w-[9%]" /><col className="w-[22%]" />
          </colgroup>
          <thead className="bg-sky-50 text-xs font-bold uppercase tracking-wider text-slate-700"><tr>
            <th scope="col" className="px-4 py-4 text-left">Template Name</th>
            {['Type', 'Applies To', 'Version', 'Branch', 'Status', 'Action'].map((label) => <th scope="col" key={label} className="px-3 py-4 text-center">{label}</th>)}
          </tr></thead>
          <tbody>{items.map((item) => {
            const Icon = item.kind === 'communication' ? Mail : item.kind === 'estimate_portal' ? FileSpreadsheet : FileText;
            const typeLabel = item.kind === 'communication' ? item.subtype.toUpperCase()
              : item.kind === 'estimate_portal' ? 'ESTIMATE'
                : item.subtype.replaceAll('_', ' ').toUpperCase();
            const appliesTo = item.kind === 'communication' ? 'Email / SMS'
              : item.kind === 'estimate_portal' ? 'Customer Portal' : 'Opportunity';
            return <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/70">
            <td className="px-4 py-4 text-left"><div className="flex min-w-0 items-center gap-3"><span className="shrink-0 rounded-lg bg-indigo-50 p-2 text-indigo-600"><Icon size={18} /></span><div className="min-w-0"><p className="break-words font-bold leading-5 text-slate-900">{item.name}</p><p className="mt-0.5 break-words text-xs leading-4 text-slate-500">{item.description || 'Global template'}</p></div></div></td>
            <td className="px-3 py-4 text-center"><span className="inline-block max-w-full whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold tracking-wide text-slate-700">{typeLabel}</span></td>
            <td className="px-3 py-4 text-center"><span className="inline-block max-w-full whitespace-nowrap rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{appliesTo}</span></td>
            <td className="px-3 py-4 text-center text-slate-600">{item.published_revision ? `v${item.published_revision.revision_number}` : '—'}</td>
            <td className="px-3 py-4 text-center text-slate-600">Global</td>
            <td className="px-3 py-4 text-center"><span className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${item.state === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{item.state === 'active' && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}{item.state === 'active' ? 'Active' : item.state}</span></td>
            <td className="px-3 py-4 text-center"><div className="flex flex-nowrap items-center justify-center gap-1.5">
              {item.state !== 'archived' && <button aria-label={`${canManage ? 'Edit' : 'View'} ${item.name}`} disabled={busy} onClick={() => navigate(`${BASE}/${item.id}/builder`)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100">{canManage ? <Pencil size={16} /> : 'View'}</button>}
              {canManage && <><button aria-label={`Duplicate ${item.name}`} disabled={busy || item.state === 'archived'} onClick={() => mutate(() => duplicateBuilderTemplate(item.id))} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"><Copy size={16} /></button>
                <button aria-label={item.state === 'active' ? `Deactivate ${item.name}` : `Activate ${item.name}`} disabled={busy} onClick={() => mutate(() => item.state === 'active' ? deactivateBuilderTemplate(item.id) : activateBuilderTemplate(item.id))} className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100">{item.state === 'active' ? 'Deactivate' : 'Activate'}</button>
                {item.state !== 'archived' && <button aria-label={`Archive ${item.name}`} disabled={busy} onClick={() => { if (window.confirm(`Archive “${item.name}”?`)) mutate(() => archiveBuilderTemplate(item.id)); }} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"><Trash2 size={16} /></button>}</>}
            </div></td></tr>;
          })}</tbody>
        </table></div>}
      <footer className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-center text-slate-500 sm:text-left">
          Showing <span className="font-semibold text-slate-700">{firstItem}–{lastItem}</span> of{' '}
          <span className="font-semibold text-slate-700">{count}</span> templates
        </p>
        <nav aria-label="Template pagination" className="flex items-center justify-center gap-2 sm:justify-end">
          <button
            type="button"
            aria-label="Previous page"
            disabled={!offset || loading}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          ><ChevronLeft size={18} /></button>
          <span aria-live="polite" className="min-w-24 text-center text-slate-600">Page {currentPage} of {pageCount}</span>
          <button
            type="button"
            aria-label="Next page"
            disabled={offset + PAGE_SIZE >= count || loading}
            onClick={() => setOffset(offset + PAGE_SIZE)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          ><ChevronRight size={18} /></button>
        </nav>
      </footer>
      </section>
    </>}
    {!creating && <ChooseTemplateTypeModal
      isOpen={showTypePicker}
      onClose={() => setShowTypePicker(false)}
      onSelectType={chooseCreateKind}
      initialType={initialKind === 'estimate_portal' ? 'estimate' : initialKind || 'document'}
    />}
  </div>;
}
