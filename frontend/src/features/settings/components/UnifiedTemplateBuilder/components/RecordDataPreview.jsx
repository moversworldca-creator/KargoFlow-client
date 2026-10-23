import React, { useEffect, useRef, useState } from 'react';

export default function RecordDataPreview({ mode, onRender, document }) {
  const sources = ['estimate', 'estimate_portal'].includes(mode)
    ? ['estimate', 'opportunity']
    : mode === 'invoice' ? ['invoice', 'job', 'opportunity'] : ['opportunity', 'estimate', 'job', 'invoice'];
  const [sourceType, setSourceType] = useState(sources[0]);
  const [recordId, setRecordId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const request = useRef(0);
  useEffect(() => {
    request.current += 1;
    setResult(null); setError(''); setLoading(false);
    return () => { request.current += 1; };
  }, [document]);

  const clear = () => { request.current += 1; setResult(null); setError(''); setLoading(false); };
  const run = async (event) => {
    event.preventDefault();
    const id = Number(recordId);
    if (!Number.isSafeInteger(id) || id <= 0) { setError('Enter a valid record ID.'); return; }
    const current = ++request.current;
    setLoading(true); setResult(null); setError('');
    try {
      const data = await onRender({ type: sourceType, id });
      if (current === request.current) setResult(data);
    } catch (failure) {
      const detail = failure?.response?.data?.detail;
      if (current === request.current) setError((typeof detail === 'string' && detail) || failure?.message || 'Unable to load record values.');
    } finally {
      if (current === request.current) setLoading(false);
    }
  };

  return <details className="shrink-0 border-b border-slate-200 bg-white px-4 py-2">
    <summary className="cursor-pointer text-sm font-semibold text-slate-700">Check actual record values</summary>
    <p className="my-2 text-xs text-slate-500">Verify the current template against a record you can access. The canvas below uses sample data.</p>
    {!onRender ? <p className="text-xs text-slate-600">Save this template before checking a record.</p> : <form onSubmit={run} className="flex flex-wrap items-end gap-2">
      <label className="text-xs">Record type<select aria-label="Record type" value={sourceType} onChange={event => { clear(); setSourceType(event.target.value); }} className="ml-2 rounded border p-1">
        {sources.map(source => <option key={source} value={source}>{source}</option>)}
      </select></label>
      <label className="text-xs">Record ID<input aria-label="Record ID" type="number" min="1" step="1" required value={recordId} onChange={event => { clear(); setRecordId(event.target.value); }} className="ml-2 w-28 rounded border p-1" /></label>
      <button type="submit" disabled={loading} className="rounded bg-blue-600 px-3 py-1 text-xs text-white disabled:opacity-50">{loading ? 'Checking…' : 'Check values'}</button>
    </form>}
    {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
    {result && <div className="mt-2 max-h-80 overflow-auto">
      <p role="status" className="text-xs text-slate-700">Actual values from {result.source?.type} #{result.source?.id}. Missing values: {result.missing_variables?.length || 0}.</p>
      {!!result.missing_variables?.length && <p className="my-1 text-xs text-amber-800">Missing: {result.missing_variables.join(', ')}</p>}
      <table className="mt-2 w-full text-left text-xs"><thead><tr><th className="p-1">Tag</th><th className="p-1">Actual value</th></tr></thead><tbody>
        {Object.entries(result.resolved_variables || {}).map(([token, value]) => <tr key={token}><td className="p-1 font-mono">{`{{${token}}}`}</td><td className="p-1">{String(value ?? '') || 'Missing'}</td></tr>)}
      </tbody></table>
      {result.html && <iframe title="Actual record document" sandbox="" srcDoc={result.html} className="mt-3 h-80 w-full border" />}
    </div>}
  </details>;
}
