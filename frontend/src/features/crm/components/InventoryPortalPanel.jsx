import React, { useEffect, useRef, useState } from 'react';
import { getInventoryPortal, manageInventoryPortal, getPortalEstimates } from '../../../services/api';
import Card from '../../../shared/ui/Card';

const button = 'rounded-lg border px-3 py-2 text-sm disabled:opacity-50';
export default function InventoryPortalPanel({ leadId, opportunityId, canEdit = false }) {
  const [estimates, setEstimates] = useState([]);
  const [estimateId, setEstimateId] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const emailKey = useRef(null);
  const kind = leadId ? 'lead' : 'estimate';
  const recordId = leadId || estimateId;
  useEffect(() => {
    if (leadId || !opportunityId) return;
    let active = true;
    getPortalEstimates(opportunityId).then((rows) => { if (active) { setEstimates(rows); setEstimateId(String(rows[0]?.id || '')); } })
      .catch((failure) => { if (active) setError(failure.response?.data?.detail || 'Could not load estimates.'); });
    return () => { active = false; };
  }, [leadId, opportunityId]);
  useEffect(() => {
    if (!recordId) return;
    let active = true;
    getInventoryPortal(kind, Number(recordId)).then((result) => { if (active) { setData(result); setError(''); } })
      .catch((failure) => { if (active) { setData(null); setError(failure.response?.data?.detail || 'Could not load inventory.'); } });
    return () => { active = false; };
  }, [kind, recordId, refresh]);
  const act = async (operation) => {
    setBusy(true); setError(''); setNotice('');
    try {
      if (operation === 'copy') { await navigator.clipboard.writeText(data.portal.url); setNotice('Inventory link copied.'); }
      else {
        if (operation === 'email' && !emailKey.current) emailKey.current = crypto.randomUUID();
        const result = await manageInventoryPortal(kind, Number(recordId), operation, operation === 'email' ? emailKey.current : undefined);
        if (operation === 'email') { emailKey.current = null; setNotice('Inventory email queued.'); }
        else setData(result);
        setRefresh((value) => value + 1);
      }
    } catch (failure) { setError(failure.response?.data?.detail || 'The inventory action could not be completed.'); }
    finally { setBusy(false); }
  };
  const portal = data?.portal;
  const expired = portal && new Date(portal.expires_at) <= new Date();
  const current = portal && !expired && !portal.stale;
  return <Card className="space-y-4 p-5">
    <div className="flex justify-between gap-3"><h2 className="text-lg font-semibold">Inventory portal</h2><button className={button} disabled={busy} onClick={() => setRefresh((value) => value + 1)}>Refresh inventory</button></div>
    {!leadId && <label>Inventory estimate<select aria-label="Inventory estimate" disabled={busy} className="ml-3 rounded border p-2" value={estimateId} onChange={(event) => { setData(null); setEstimateId(event.target.value); }}><option value="">Select estimate</option>{estimates.map((row) => <option key={row.id} value={row.id}>{row.estimate_number}</option>)}</select></label>}
    {error && <p role="alert" className="text-red-700">{error}</p>}{notice && <p role="status">{notice}</p>}
    {!recordId && <p>Create an estimate to request customer inventory for this opportunity.</p>}
    {data && <>
      <p>{data.locked ? 'Read-only' : 'Open for customer updates'} · {portal ? portal.stale ? 'Estimate changed; issue a new link' : expired ? 'Link expired' : portal.submitted_at ? 'Inventory submitted' : portal.viewed_at ? 'Customer viewed' : 'Awaiting customer' : 'No active link'}</p>
      <div className="flex flex-wrap gap-2">
        {current && <><a className={button} href={portal.url} target="_blank" rel="noopener noreferrer">Open inventory portal</a><button className={button} disabled={busy} onClick={() => act('copy')}>Copy inventory link</button></>}
        {canEdit && <>
          {!current && <button className={button} disabled={busy || data.locked} onClick={() => act('issue')}>Create inventory link</button>}
          {current && <><button className={button} disabled={busy || data.locked} onClick={() => act('email')}>Email inventory link</button><button className={button} disabled={busy || data.locked} onClick={() => act('rotate')}>Replace inventory link</button></>}
          {portal && <button className={button} disabled={busy} onClick={() => act('revoke')}>Revoke inventory link</button>}
          <button className={button} disabled={busy} onClick={() => act(data.locked ? 'unlock' : 'lock')}>{data.locked ? 'Unlock inventory' : 'Lock inventory'}</button>
        </>}
      </div>
      <p className="text-sm text-slate-600">Customer submissions are available for review here. Estimate pricing is managed separately.</p>
      {data.items.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Room</th><th>Item</th><th>Quantity</th><th>Notes</th></tr></thead><tbody>{data.items.map((item) => <tr key={item.id}><td>{item.room_name}</td><td>{item.item_name}{item.is_fragile ? ' · Fragile' : ''}{item.is_special ? ' · Special' : ''}</td><td>{item.quantity}</td><td>{item.notes}</td></tr>)}</tbody></table></div> : <p>No inventory submitted yet.</p>}
      {!!data.photos?.length && <p>{data.photos.length} inventory photos · view photos in the inventory portal.</p>}
    </>}
  </Card>;
}
