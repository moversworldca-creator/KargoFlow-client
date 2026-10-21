import { saveBlob } from '../../../shared/utils/downloadBlob';
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Download, Loader2 } from 'lucide-react';
import Card from '../../../shared/ui/Card';
import SignaturePadModal from '../../../shared/ui/SignaturePadModal';
import {
  getPublicEstimatePortal, getPublicContractPortal, approvePublicEstimatePortal,
  signPublicContractPortal, downloadPublicPortal, publicPortalImageUrl,
} from '../../../services/api';

const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';
const buttonClass = 'rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';

function documentHtml(html, kind, token) {
  const imageUrl = publicPortalImageUrl(kind, token, 1);
  const imageOrigin = new URL(imageUrl, window.location.origin).origin;
  const policy = `default-src 'none'; img-src data: ${imageOrigin}; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'`;
  return `<meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="referrer" content="no-referrer">`
    + String(html || '').replace(/kf-asset:(\d+)/g, (_, id) => publicPortalImageUrl(kind, token, id).replaceAll('&', '&amp;'));
}

function IssuedCustomerPortal({ kind, token }) {
  const [portal, setPortal] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [signatureField, setSignatureField] = useState(null);

  const read = kind === 'estimate' ? getPublicEstimatePortal : getPublicContractPortal;
  useEffect(() => {
    let active = true;
    if (!token) return;
    read(token).then((response) => {
      if (!active) return;
      setPortal(response?.data ?? response);
      setLoading(false);
    }).catch((failure) => {
      if (!active) return;
      setError(failure?.response?.data?.detail || 'This link is expired or unavailable. Ask your moving company for a new link.');
      setLoading(false);
    });
    return () => { active = false; };
  }, [read, token]);

  const update = (key, value) => setFields((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const submitted = (portal.required_fields || []).map((field) => ({ field_key: field.field_key,
        ...(['signature', 'initial'].includes(field.field_type)
          ? { signature_payload: fields[field.field_key] || '' }
          : { value_text: fields[field.field_key] || '' }),
      }));
      const send = kind === 'estimate' ? approvePublicEstimatePortal : signPublicContractPortal;
      await send({ token, snapshot_id: portal.snapshot_id, approved_by_name: name.trim(), approved_by_email: email.trim(), consent_accepted: consent, fields: submitted });
      const refreshed = await read(token);
      setPortal(refreshed?.data ?? refreshed);
    } catch (failure) {
      setError(failure?.response?.data?.detail || 'Unable to submit this document. Review the required fields and try again.');
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    setBusy(true);
    try {
      const blob = await downloadPublicPortal(kind, token);
      saveBlob(blob, `${kind}-document.pdf`);
    } catch {
      setError('The PDF could not be downloaded. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!token) return <p role="alert" className="p-6">The document link is missing. Ask your moving company for a new link.</p>;
  if (loading) return <p role="status" className="flex items-center gap-2 p-6"><Loader2 className="animate-spin" />Loading your document…</p>;
  if (!portal) return <p role="alert" className="p-6">{error}</p>;
  const completed = portal.submitted || ['accepted', 'signed'].includes(portal.status);
  return (
    <main className="min-h-screen bg-page px-3 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-xl font-bold">{portal.title}</h1><p className="text-sm text-slate-600">{completed ? 'Your response has been recorded.' : 'Review your document and complete the required fields.'}</p></div>
          <button type="button" className={buttonClass} disabled={busy} onClick={download}><Download className="mr-2 inline" size={16} />Download PDF</button>
        </header>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
        <iframe title="Issued document" sandbox="" referrerPolicy="no-referrer" srcDoc={documentHtml(portal.content_html, kind, token)} className="min-h-[65vh] w-full rounded-xl border bg-white" />
        {!completed && (
          <Card className="p-5">
            <form onSubmit={submit} className="space-y-4">
              <h2 className="text-lg font-semibold">{kind === 'estimate' ? 'Approve estimate' : 'Sign document'}</h2>
              <p className="text-sm text-slate-600">Signing as {String(portal.signer_role || 'customer').replaceAll('_', ' ')}.</p>
              <label className="block">Your name<input required maxLength={255} className={inputClass} value={name} onChange={(event) => setName(event.target.value)} /></label>
              <label className="block">Email<input type="email" maxLength={254} className={inputClass} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
              {(portal.required_fields || []).map((field) => {
                const key = field.field_key;
                const label = `${field.label || key}${field.is_required ? ' *' : ''}`;
                if (['signature', 'initial'].includes(field.field_type)) return (
                  <div key={key} className="space-y-2"><p>{label}</p>{fields[key] && <img src={fields[key]} alt={`${label} preview`} className="max-h-24 max-w-full" />}<button type="button" className={buttonClass} onClick={() => setSignatureField(field)}>{fields[key] ? 'Update' : 'Add'} {field.field_type === 'initial' ? 'initials' : 'signature'}</button></div>
                );
                if (['select', 'multiselect'].includes(field.field_type)) {
                  const multiple = field.field_type === 'multiselect';
                  return <label key={key} className="block">{label}<select className={inputClass} required={field.is_required} multiple={multiple} value={multiple ? JSON.parse(fields[key] || '[]') : fields[key] || ''} onChange={(event) => update(key, multiple ? event.target.selectedOptions.length ? JSON.stringify(Array.from(event.target.selectedOptions, (option) => option.value)) : '' : event.target.value)}>
                    {!multiple && <option value="">Select an option</option>}
                    {(field.choices || []).map((choice) => <option key={choice.key} value={choice.key}>{choice.name}{choice.total ? ` · ${choice.total}` : ''}</option>)}
                  </select></label>;
                }
                if (field.field_type === 'checkbox') return <label key={key} className="flex items-center gap-2"><input type="checkbox" required={field.is_required} checked={fields[key] === 'true'} onChange={(event) => update(key, event.target.checked ? 'true' : '')} />{label}</label>;
                return <label key={key} className="block">{label}<input className={inputClass} type={field.field_type === 'date' ? 'date' : 'text'} required={field.is_required} maxLength={4000} value={fields[key] || ''} onChange={(event) => update(key, event.target.value)} /></label>;
              })}
              <label className="flex items-start gap-2"><input type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>{portal.consent_text}</span></label>
              <button type="submit" disabled={busy || !consent} className={buttonClass}>{busy ? 'Submitting…' : kind === 'estimate' ? 'Approve estimate' : 'Submit signature'}</button>
            </form>
          </Card>
        )}
        <SignaturePadModal open={Boolean(signatureField)} resetKey={signatureField?.field_key || ''} title={signatureField?.field_type === 'initial' ? 'Initials' : 'Signature'} onClose={() => setSignatureField(null)} onSave={(value) => { if (value) update(signatureField.field_key, value); setSignatureField(null); }} />
      </div>
    </main>
  );
}

export function IssuedEstimatePortal() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  return <IssuedCustomerPortal key={token} kind="estimate" token={token} />;
}

export function IssuedDocumentPortal() {
  const { token = '' } = useParams();
  return <IssuedCustomerPortal key={token} kind="contract" token={token} />;
}
