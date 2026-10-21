import React, { useEffect, useRef, useState } from 'react';
import { listLeadInventory, createLeadInventoryItem, updateLeadInventoryItem, deleteLeadInventoryItem, inventorySummary } from './leadInventoryApi';
import { recordWorkError as getErrorMessage } from './recordWorkError';
const empty = { room_name: '', item_name: '', quantity: 1, weight_lbs_each: '0.00', is_fragile: false, is_special: false, notes: '' };
export default function LeadInventory({ leadId, canView, canEdit }) {
  const [state, setState] = useState({ rows: [], loading: true, error: '' });
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    const token = ++generation.current;
    setDraft(null); setMessage(''); setBusy(false);
    setState({ rows: [], loading: Boolean(leadId && canView), error: '' });
    if (leadId && canView) listLeadInventory(leadId).then(result => {
      if (token === generation.current) setState({ rows: Array.isArray(result) ? result : result.results, loading: false, error: '' });
    }).catch(error => {
      if (token === generation.current) setState({ rows: [], loading: false, error: getErrorMessage(error, 'Could not load inventory. Please retry.') });
    });
    return () => { generation.current++; };
  }, [leadId, canView, revision]);
  const mutate = async (operation, success) => {
    const token = generation.current;
    setBusy(true); setMessage('');
    try {
      const result = await operation();
      if (token !== generation.current) return;
      setState(previous => ({ ...previous, rows: success(previous.rows, result) }));
      setDraft(null); setMessage('Inventory updated.');
    } catch (error) {
      if (token === generation.current) setMessage(getErrorMessage(error, 'Could not save inventory. Please retry.'));
    } finally { if (token === generation.current) setBusy(false); }
  };
  const save = event => {
    event.preventDefault();
    if (!canEdit || busy) return;
    const quantity = Number(draft.quantity), weight = Number(draft.weight_lbs_each);
    if (!draft.room_name.trim() || !draft.item_name.trim() || !Number.isInteger(quantity) || quantity < 0 || quantity > 32767 || !Number.isFinite(weight) || weight < 0) {
      setMessage('Enter a room, item name, integer quantity from 0 to 32767 and nonnegative weight.'); return;
    }
    const payload = { ...draft, room_name: draft.room_name.trim(), item_name: draft.item_name.trim(), quantity, weight_lbs_each: weight.toFixed(2) };
    mutate(() => draft.id ? updateLeadInventoryItem(leadId, draft.id, payload) : createLeadInventoryItem(leadId, payload),
      (rows, result) => draft.id ? rows.map(item => item.id === draft.id ? result : item) : [...rows, result]);
  };
  if (!leadId) return <section className="rounded-xl border p-4">Inventory unavailable: this opportunity has no linked lead.</section>;
  if (!canView) return <section className="rounded-xl border p-4">You do not have permission to view lead inventory.</section>;
  const summary = inventorySummary(state.rows);
  return <section className="rounded-xl border bg-white p-4 space-y-3" aria-label="Lead inventory">
    <div className="flex justify-between"><h3 className="font-bold">Inventory</h3><div className="flex gap-3">
      <button disabled={busy || state.loading} onClick={() => setRevision(value => value + 1)}>Refresh inventory</button>
      {canEdit && <button disabled={busy || state.loading || Boolean(state.error)} onClick={() => setDraft({ ...empty })}>Add item</button>}
    </div></div>
    {message && <p role="status">{message}</p>}
    {state.loading ? <div role="status" className="animate-pulse rounded bg-slate-100 p-6">Loading inventory…</div> : state.error ? <div role="alert">{state.error} <button onClick={() => setRevision(value => value + 1)}>Retry</button></div> : <>
      <p>{summary.rooms.size} rooms · {summary.quantity} items · {summary.weight.toFixed(2)} lbs estimated · {summary.fragile} fragile · {summary.special} special</p>
      {!state.rows.length && <p>No inventory items yet.</p>}
      {[...summary.rooms].sort().map(room => <div key={room}><h4 className="font-semibold">{room}</h4>{state.rows.filter(item => item.room_name === room).map(item => <div key={item.id} className="border-b py-2">
        <p>{item.item_name} × {item.quantity} · {item.weight_lbs_each} lbs each {item.is_fragile && '· Fragile'} {item.is_special && '· Special handling'}</p><p>{item.notes}</p>
        {canEdit && <div className="flex gap-3"><button disabled={busy} onClick={() => setDraft({ ...item })}>Edit item</button><button disabled={busy} onClick={() => {
          if (window.confirm(`Delete ${item.item_name}?`)) mutate(() => deleteLeadInventoryItem(leadId, item.id), rows => rows.filter(row => row.id !== item.id));
        }}>Delete item</button></div>}
      </div>)}</div>)}
    </>}
    {draft && canEdit && <form onSubmit={save} className="space-y-2 border-t pt-3"><fieldset disabled={busy} className="space-y-2">
      <legend>{draft.id ? 'Edit inventory item' : 'Add inventory item'}</legend>
      {['room_name', 'item_name', 'quantity', 'weight_lbs_each', 'notes'].map(field => <label className="block" key={field}>{({room_name:'Room',item_name:'Item name',quantity:'Quantity',weight_lbs_each:'Weight per item (lbs)',notes:'Notes'})[field]}
        <input className="block border rounded p-2 w-full" required={field !== 'notes'} maxLength={field === 'room_name' ? 100 : field === 'item_name' ? 255 : undefined} type={['quantity','weight_lbs_each'].includes(field) ? 'number' : 'text'} min="0" max={field === 'quantity' ? 32767 : field === 'weight_lbs_each' ? 99999999.99 : undefined} step={field === 'quantity' ? 1 : '0.01'} value={draft[field]} onChange={event => setDraft({ ...draft, [field]: event.target.value })}/>
      </label>)}
      {['is_fragile','is_special'].map(field => <label className="block" key={field}><input type="checkbox" checked={draft[field]} onChange={event => setDraft({ ...draft, [field]: event.target.checked })}/>{field === 'is_fragile' ? 'Fragile' : 'Special handling'}</label>)}
      <button type="submit">{busy ? 'Saving…' : 'Save item'}</button> <button type="button" onClick={() => setDraft(null)}>Cancel</button>
    </fieldset></form>}
  </section>;
}
