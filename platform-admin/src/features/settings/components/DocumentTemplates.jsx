import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSignature, Plus, Search, Loader2, Copy, Archive, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePlatformAuth } from '../../../auth/PlatformAuthContext';
import { PLATFORM_PERMISSIONS } from '../../../rbac/platformRbac';
import {
  getBuilderTemplates, getBuilderTemplate, getBuilderTemplateDraft, getBuilderTemplateRevision,
  startBuilderTemplateDraft, updateBuilderTemplate, archiveBuilderTemplate,
  activateBuilderTemplate, deactivateBuilderTemplate, duplicateBuilderTemplate, getApiErrorMessage,
} from '../../../services/api';
import UnifiedTemplateBuilder from './UnifiedTemplateBuilder/UnifiedTemplateBuilder';
import GlobalTemplateCreateForm from './GlobalTemplateCreateForm';
import { fromGlobalDocument, getTemplateMode } from './UnifiedTemplateBuilder/core/globalTemplateAdapter';

const BASE = '/document-templates';
const PAGE_SIZE = 50;

export default function DocumentTemplates({ builderRouteView = '', builderRouteItemId = null, initialKind = '' }) {
  const navigate = useNavigate();
  const { hasPermission } = usePlatformAuth();
  const canManage = hasPermission(PLATFORM_PERMISSIONS.TEMPLATES_MANAGE);
  const canPublish = hasPermission(PLATFORM_PERMISSIONS.TEMPLATES_PUBLISH);
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(initialKind);
  const [state, setState] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState(null);
  const [editorLoading, setEditorLoading] = useState(false);
  const creating = builderRouteView === 'builder' && (!builderRouteItemId || builderRouteItemId === 'new');
  const editingId = builderRouteView === 'builder' && !creating ? builderRouteItemId : null;

  useEffect(() => {
    if (creating || editingId) return;
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
  }, [query, filter, state, offset, refresh, creating, editingId]);

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

  return <div className="max-w-7xl mx-auto space-y-5 pb-8">
    <div className="flex items-center justify-between gap-4">
      <div><h1 className="flex items-center gap-2 text-xl font-bold"><FileSignature size={22} />Global Templates</h1>
        <p className="text-sm text-slate-500 mt-1">Manage reusable email, SMS, estimate, invoice and document templates.</p></div>
      {canManage && !creating && <button className="px-4 py-2 rounded-lg bg-blue-600 text-white flex gap-2 items-center" onClick={() => navigate(`${BASE}/new/builder`)}><Plus size={16} />New template</button>}
    </div>
    {error && <div role="alert" className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg">{error}</div>}
    {editingId ? <div className="p-8 flex gap-3 items-center">{editorLoading && <Loader2 className="animate-spin" size={20} />}
      {editorLoading ? 'Loading template…' : 'Unable to open this template.'}<button onClick={back}>Back to templates</button></div>
    : creating ? canManage ? <GlobalTemplateCreateForm initialKind={initialKind || 'document'} onClose={back} onCreated={(data) => {
      setRefresh((n) => n + 1);
      navigate(`${BASE}/${data.id}/builder`, { replace: true });
    }} /> : <p role="alert">You do not have permission to create global templates.</p> : <>
      <div className="flex flex-wrap gap-3">
        <label className="flex gap-2 items-center border rounded-lg px-3 bg-white"><Search size={16} /><input aria-label="Search templates" placeholder="Search templates" value={query} onChange={(e) => { setQuery(e.target.value); setOffset(0); }} className="p-2 outline-none" /></label>
        <select aria-label="Template type" value={filter} onChange={(e) => { setFilter(e.target.value); setOffset(0); }} className="border rounded-lg p-2">
          <option value="">All types</option><option value="communication">All communication</option><option value="email">Email</option><option value="sms">SMS</option><option value="estimate_portal">Estimate</option><option value="invoice">Invoice</option><option value="document">Document</option>
        </select>
        <select aria-label="Template state" value={state} onChange={(e) => { setState(e.target.value); setOffset(0); }} className="border rounded-lg p-2">
          <option value="">Active and inactive</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option><option value="all">All states</option>
        </select>
      </div>
      {loading ? <p className="flex gap-2 items-center p-8"><Loader2 className="animate-spin" size={20} />Loading templates…</p>
        : !items.length ? <p className="p-8 text-slate-500">No global templates found.</p>
        : <div className="overflow-x-auto border rounded-xl bg-white"><table className="w-full text-sm text-left">
          <thead className="bg-slate-50"><tr>{['Name', 'Type / variation', 'Publication', 'State', 'Actions'].map((label) => <th key={label} className="p-4">{label}</th>)}</tr></thead>
          <tbody>{items.map((item) => <tr key={item.id} className="border-t"><td className="p-4 font-medium">{item.name}</td>
            <td className="p-4">{item.kind.replaceAll('_', ' ')} / {item.subtype}</td><td className="p-4">{item.draft_revision ? 'Draft available' : item.published_revision ? `Published v${item.published_revision.revision_number}` : 'Unpublished'}</td><td className="p-4">{item.state}</td>
            <td className="p-4"><div className="flex gap-3 items-center">
              {item.state !== 'archived' && <button disabled={busy} onClick={() => navigate(`${BASE}/${item.id}/builder`)} className="text-blue-600">{canManage ? 'Edit' : 'View'}</button>}
              {canManage && <><button aria-label={`Duplicate ${item.name}`} disabled={busy || item.state === 'archived'} onClick={() => mutate(() => duplicateBuilderTemplate(item.id))}><Copy size={16} /></button>
                <button disabled={busy} onClick={() => mutate(() => item.state === 'active' ? deactivateBuilderTemplate(item.id) : activateBuilderTemplate(item.id))}>{item.state === 'active' ? 'Deactivate' : 'Activate'}</button>
                {item.state !== 'archived' && <button aria-label={`Archive ${item.name}`} disabled={busy} onClick={() => { if (window.confirm(`Archive “${item.name}”?`)) mutate(() => archiveBuilderTemplate(item.id)); }}><Archive size={16} /></button>}</>}
            </div></td></tr>)}</tbody>
        </table></div>}
      <div className="flex justify-between items-center text-sm"><span>{count} templates</span><div className="flex gap-3">
        <button aria-label="Previous page" disabled={!offset || loading} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}><ChevronLeft size={18} /></button>
        <span>Page {Math.floor(offset / PAGE_SIZE) + 1}</span><button aria-label="Next page" disabled={offset + PAGE_SIZE >= count || loading} onClick={() => setOffset(offset + PAGE_SIZE)}><ChevronRight size={18} /></button>
      </div></div>
    </>}
  </div>;
}
