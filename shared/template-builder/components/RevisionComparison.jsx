import React, { useEffect, useRef, useState } from 'react';

const display = (value) => value === undefined ? '—' : typeof value === 'string' ? value : JSON.stringify(value);

function changes(result) {
  const rows = [...(result.settings || []), ...(result.fields || [])];
  Object.entries(result.blocks || {}).forEach(([action, blocks]) => {
    blocks.forEach((block) => rows.push({ path: `${block.key} (${action})`,
      before: block.before ?? block.from ?? (action === 'removed' ? block.type : undefined),
      after: block.after ?? block.to ?? (action === 'added' ? block.type : undefined) }));
  });
  ['rules', 'attachments'].forEach((group) => Object.entries(result[group] || {}).forEach(([action, keys]) => {
    keys.forEach((key) => rows.push({ path: `${group}: ${key}`, before: action === 'removed' ? 'Present' : undefined,
      after: action === 'added' ? 'Added' : action === 'changed' ? 'Changed' : 'Removed' }));
  }));
  return rows;
}

export default function RevisionComparison({ revisions, onCompare }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  useEffect(() => {
    return () => { request.current += 1; };
  }, []);
  if (revisions.length < 2) return null;
  const selectedFrom = from || String(revisions[1].id);
  const selectedTo = to || String(revisions[0].id);
  const select = (setter, value) => {
    request.current += 1;
    setBusy(false);
    setResult(null);
    setError('');
    setter(value);
  };

  const compare = async () => {
    const id = ++request.current;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const response = await onCompare(selectedFrom, selectedTo);
      if (id === request.current) setResult(response.data ?? response);
    } catch (err) {
      if (id === request.current) setError(err.response?.data?.detail || err.message || 'Unable to compare revisions.');
    } finally { if (id === request.current) setBusy(false); }
  };
  return <section aria-label="Revision comparison" className="space-y-3 border-b border-slate-200 p-4">
    <div className="flex flex-wrap items-end gap-3">
      {[['From revision', selectedFrom, setFrom], ['To revision', selectedTo, setTo]].map(([label, value, setValue]) =>
        <label key={label} className="text-xs font-semibold text-slate-700">{label}
          <select aria-label={label} value={value} onChange={(event) => select(setValue, event.target.value)} className="ml-2 rounded border border-slate-300 p-2">
            {revisions.map((revision) => <option key={revision.id} value={revision.id}>v{revision.revision_number} ({revision.state})</option>)}
          </select>
        </label>)}
      <button type="button" disabled={busy || selectedFrom === selectedTo} onClick={compare}
        className="rounded bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy ? 'Comparing…' : 'Compare revisions'}</button>
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {result && <div role="status" className="max-h-64 overflow-auto text-xs">
      {!result.has_changes ? <p>No changes between these revisions.</p> : <table className="w-full text-left">
        <caption className="text-left font-semibold">Changes between revisions</caption>
        <thead><tr><th className="p-2">Content</th><th className="p-2">Before</th><th className="p-2">After</th></tr></thead>
        <tbody>{changes(result).map((row, index) => <tr key={`${row.path}-${index}`} className="border-t">
          <th className="p-2 align-top">{row.path}</th><td className="max-w-48 break-words p-2 align-top">{display(row.before)}</td>
          <td className="max-w-48 break-words p-2 align-top">{display(row.after)}</td>
        </tr>)}</tbody>
      </table>}
    </div>}
  </section>;
}
