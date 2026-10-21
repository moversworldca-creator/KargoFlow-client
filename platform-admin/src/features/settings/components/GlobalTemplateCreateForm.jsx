import React, { useEffect, useState } from 'react';
import { createBuilderTemplate, getBuilderMeta, getApiErrorMessage } from '../../../services/api';

export default function GlobalTemplateCreateForm({ onCreated, onClose, initialKind = 'document', initialSubtype = '' }) {
  const [kinds, setKinds] = useState([]);
  const [values, setValues] = useState({ kind: initialKind, subtype: initialSubtype, name: '', category: 'general' });
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
  const create = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try { const { data } = await createBuilderTemplate(values); await onCreated(data); }
    catch (err) { setError(getApiErrorMessage(err)); }
    finally { setBusy(false); }
  };
  return <form onSubmit={create} className="p-6 rounded-xl border bg-white space-y-4 max-w-xl">
    <button type="button" onClick={onClose} disabled={busy} className="text-sm text-blue-600">Back to templates</button>
    <h2 className="font-semibold">Create global template</h2>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <label className="block text-sm">Name<input required maxLength={255} value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} className="block border rounded p-2 mt-1 w-full" /></label>
    <label className="block text-sm">Type<select value={values.kind} onChange={(e) => {
      const kind = kinds.find((item) => item.kind === e.target.value);
      setValues({ ...values, kind: kind.kind, subtype: kind.subtypes[0].key });
    }} className="block border rounded p-2 mt-1 w-full">
      {kinds.map((kind) => <option key={kind.kind} value={kind.kind}>{kind.label}</option>)}
    </select></label>
    <label className="block text-sm">Variation<select value={values.subtype} onChange={(e) => setValues({ ...values, subtype: e.target.value })} className="block border rounded p-2 mt-1 w-full">
      {(kinds.find((kind) => kind.kind === values.kind)?.subtypes || []).map((subtype) => <option key={subtype.key} value={subtype.key}>{subtype.label}</option>)}
    </select></label>
    <label className="block text-sm">Category<input required maxLength={80} value={values.category} onChange={(e) => setValues({ ...values, category: e.target.value })} className="block border rounded p-2 mt-1 w-full" /></label>
    <button disabled={busy || !kinds.length || !values.name.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">{busy ? 'Creating…' : 'Create template'}</button>
  </form>;
}
