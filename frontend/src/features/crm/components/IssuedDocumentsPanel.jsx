import { saveBlob } from '../../../shared/utils/downloadBlob';
import React, { useEffect, useRef, useState } from 'react';
import { getIssuedPortals, getPortalEstimates, issueBuilderDocuments, revokeIssuedPortal, emailIssuedPortal, downloadIssuedPortal } from '../../../services/api';
import Card from '../../../shared/ui/Card';

const buttonClass = 'rounded-lg border px-3 py-2 text-sm disabled:opacity-50';
const message = (error) => error?.response?.data?.detail || 'The document action could not be completed.';
export default function IssuedDocumentsPanel({ opportunityId, canEdit = false }) {
  const [portals, setPortals] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [estimateId, setEstimateId] = useState('');
  const [stage, setStage] = useState('estimate_send');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const requestKeys = useRef(new Map());
  const requestKey = (action) => {
    if (!requestKeys.current.has(action)) requestKeys.current.set(action, crypto.randomUUID());
    return requestKeys.current.get(action);
  };
  useEffect(() => {
    if (!opportunityId) return;
    let active = true;
    Promise.all([getIssuedPortals(opportunityId), getPortalEstimates(opportunityId)]).then(([links, rows]) => {
      if (!active) return;
      setPortals(links);
      setEstimates(rows);
      setError('');
    }).catch((failure) => { if (active) setError(message(failure)); });
    return () => { active = false; };
  }, [opportunityId, refresh]);
  const action = async (callback) => {
    setBusy(true); setError(''); setNotice('');
    try { await callback(); setRefresh((value) => value + 1); }
    catch (failure) { setError(message(failure)); }
    finally { setBusy(false); }
  };
  if (!opportunityId) return <p role="status">Select an opportunity to manage its documents.</p>;
  return (
    <Card className="space-y-4 p-5">
      <div className="flex justify-between gap-3"><h2 className="text-lg font-semibold">Estimate & document portals</h2><button className={buttonClass} disabled={busy} onClick={() => setRefresh((value) => value + 1)}>Refresh status</button></div>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {canEdit && <div className="flex flex-wrap items-end gap-3">
        <label>Document stage<select aria-label="Document stage" className="block rounded-lg border p-2" value={stage} onChange={(event) => setStage(event.target.value)}><option value="estimate_send">Estimate</option><option value="booking">Booking documents</option></select></label>
        {stage === 'estimate_send' && <label>Estimate<select aria-label="Estimate" className="block rounded-lg border p-2" value={estimateId} onChange={(event) => setEstimateId(event.target.value)}><option value="">Select estimate</option>{estimates.filter((item) => ['draft', 'sent', 'viewed'].includes(item.state)).map((item) => <option key={item.id} value={item.id}>{item.estimate_number}</option>)}</select></label>}
        <button className={buttonClass} disabled={busy || stage === 'estimate_send' && !estimateId} onClick={() => action(async () => {
          const key = `issue:${stage}:${estimateId}:${opportunityId}`;
          await issueBuilderDocuments(stage, { source: stage === 'estimate_send' ? { type: 'estimate', id: Number(estimateId) } : { type: 'opportunity', id: Number(opportunityId) }, send: true }, requestKey(key));
          requestKeys.current.delete(key);
          setNotice('Documents published. Use Email link to send the customer their portal.');
        })}>Publish documents</button>
      </div>}
      <p className="text-sm text-slate-600">Uses the published templates assigned to this stage. Each signer receives a separate link. Email delivery uses your connected mailbox.</p>
      {!portals.length && <p>No documents have been issued for this move.</p>}
      <ul className="space-y-3">{portals.map((item) => {
        const expired = new Date(item.expires_at) <= new Date();
        const superseded = item.is_current === false || item.is_current === null;
        const inactive = ['draft', 'cancelled', 'voided', 'expired', 'superseded', 'reapproval_required'].includes(item.document_state);
        const unavailable = item.revoked_at || expired || superseded || inactive;
        const state = item.revoked_at ? 'Revoked' : expired ? 'Expired' : superseded ? 'Superseded'
          : inactive ? item.document_state.replaceAll('_', ' ') : item.submitted_at || ['accepted', 'signed'].includes(item.document_state) ? 'Signed'
            : item.viewed_at ? 'Viewed' : 'Awaiting response';
        return <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
          <div><p className="font-medium">{item.kind === 'estimate' ? 'Estimate' : 'Document'} #{item.record_id} · {item.signer_role.replaceAll('_', ' ')}</p><p className="text-sm text-slate-600">{state}</p></div>
          <div className="flex flex-wrap gap-2"><button className={buttonClass} disabled={busy} onClick={() => action(async () => saveBlob(await downloadIssuedPortal(item.id, opportunityId), 'document.pdf'))}>Download PDF</button>{!unavailable && <>
            <a className={buttonClass} href={item.url} target="_blank" rel="noopener noreferrer">Open portal</a>
            <button className={buttonClass} disabled={busy} onClick={() => action(async () => { await navigator.clipboard.writeText(item.url); setNotice('Portal link copied.'); })}>Copy link</button>
            {canEdit && item.signer_role === 'customer' && <button className={buttonClass} disabled={busy} onClick={() => action(async () => { await emailIssuedPortal(item.id, opportunityId, requestKey(`email:${item.id}`)); requestKeys.current.delete(`email:${item.id}`); setNotice('Portal email queued.'); })}>Email link</button>}
          </>}{canEdit && !item.revoked_at && <button className={buttonClass} disabled={busy} onClick={() => action(() => revokeIssuedPortal(item.id, opportunityId))}>Revoke link</button>}</div>
        </li>;
      })}</ul>
    </Card>
  );
}
