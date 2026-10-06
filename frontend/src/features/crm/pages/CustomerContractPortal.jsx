import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { CheckCircle2, FileSignature, Loader2, ShieldAlert } from 'lucide-react';

import { getPublicContractPortal, signPublicContractPortal } from '../../../services/api';
import SignaturePadModal from '../../../shared/ui/SignaturePadModal';
import { getPortalBaseUrl } from '../../../shared/utils/portalBaseUrl';

const Card = ({ children, className = '' }) => (
  <div
    className={`rounded-[2rem] border border-white/60 bg-gradient-to-br from-[#f8fcff]/95 via-[#edf6ff]/90 to-[#dff0ff]/85 backdrop-blur-2xl shadow-[0_24px_80px_-28px_rgba(59,130,246,0.28)] overflow-hidden ${className}`}
  >
    {children}
  </div>
);

const Button = ({ children, className = '', ...props }) => (
  <button
    type="button"
    className={[
      'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-extrabold uppercase tracking-widest transition',
      className,
    ].join(' ')}
    {...props}
  >
    {children}
  </button>
);

const DEFAULT_TEMPLATE_CSS = `
.contract-portal {
  color: #0f172a;
  word-wrap: break-word;
  word-break: break-word;
}
.contract-portal a {
  color: #2563eb;
  text-decoration: underline;
  font-weight: 800;
}
.contract-portal h1, .contract-portal h2, .contract-portal h3 {
  letter-spacing: -0.02em;
  font-weight: 900;
}
.contract-portal h1 { font-size: clamp(1.5rem, 4vw, 2rem); line-height: 1.2; }
.contract-portal h2 { font-size: clamp(1.2rem, 3vw, 1.5rem); line-height: 1.3; margin-top: 1.5rem; }
.contract-portal h3 { font-size: clamp(1rem, 2.5vw, 1.125rem); line-height: 1.4; margin-top: 1.25rem; }
.contract-portal p { margin-top: 0.75rem; color: #334155; font-weight: 600; }
.contract-portal ul { margin-top: 0.75rem; padding-left: 1.25rem; list-style: disc; color: #334155; font-weight: 600; }
.contract-portal hr { margin: 1.25rem 0; border: 0; height: 1px; background: #e2e8f0; }

.table-responsive-wrapper {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}
.table-responsive-wrapper table {
  margin: 0 !important;
  width: 100% !important;
  min-width: 600px;
}
.contract-portal th, .contract-portal td {
  padding: 10px 12px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
}
.contract-portal img {
  max-width: 100% !important;
  height: auto !important;
  object-fit: contain;
}
.contract-portal img.signed-contract-signature,
.contract-portal img[alt='signature'] {
  max-width: 260px !important;
  max-height: 120px !important;
  display: block;
  margin: 12px 0;
}
.contract-portal img[alt='initial'] {
  max-width: 100px !important;
  max-height: 60px !important;
  display: block;
  margin: 8px 0;
}
.contract-portal span[data-sign][data-key] {
  display: inline-block;
  vertical-align: middle;
  margin: 4px 0;
}
`;

const todayISO = () => new Date().toISOString().slice(0, 10);
const isSignatureFieldType = (type) => ['signature', 'initial'].includes(String(type || '').toLowerCase());

const getApiBaseUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const explicit = String(import.meta.env.VITE_API_URL || '').trim();
    if (explicit) {
      try {
        return new URL(explicit, window.location.origin).origin;
      } catch {
        return explicit.replace(/\/+$/, '').replace(/\/api\/?$/, '');
      }
    }
  }
  return 'http://localhost:8000';
};

const makeAbsoluteMediaUrl = (url) => {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^(https?:|data:|cid:)/i.test(value)) return value;
  if (!value.startsWith('/media/')) return value;
  return `${getApiBaseUrl().replace(/\/+$/, '')}${value}`;
};

const rewriteContractMediaUrls = (html) =>
  String(html || '').replace(
    /(<img\b[^>]*\bsrc=["'])(\/media\/[^"']+)(["'][^>]*>)/gi,
    (_, prefix, src, suffix) => `${prefix}${makeAbsoluteMediaUrl(src)}${suffix}`
  );

const getSignFieldNodes = () => {
  if (typeof document === 'undefined') return [];
  return Array.from(document.querySelectorAll('span[data-sign][data-key]'));
};

const InlineFieldShell = ({ children }) => (
  <span className="inline-flex align-middle max-w-full my-0.5">
    <span className="rounded-xl border border-white/70 bg-white/90 px-2.5 py-1.5 shadow-sm max-w-full overflow-x-auto">{children}</span>
  </span>
);

const InlineSignField = ({
  label,
  fieldKey,
  fieldType,
  disabled,
  value,
  onOpenPad,
  onChangeText,
}) => {
  const type = String(fieldType || '').toLowerCase();
  const isSig = isSignatureFieldType(type);
  if (isSig) {
    return (
      <InlineFieldShell>
        <div className="flex flex-wrap items-center gap-2 max-w-full">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#0f172a] truncate max-w-[150px] sm:max-w-none" title={label}>{label}</div>
          {value?.signature_payload ? (
            <img
              src={value.signature_payload}
              alt={label}
              className="max-h-12 max-w-32 object-contain rounded-lg border border-white/70 bg-white shrink-0"
            />
          ) : (
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#5d7894] shrink-0">Pending</div>
          )}
          {!disabled ? (
            <button
              type="button"
              onClick={() => onOpenPad({ field_key: fieldKey, field_type: type })}
              className="ml-auto rounded-lg bg-primary px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-white hover:bg-primary-dark transition shrink-0"
            >
              {value?.signature_payload ? 'Update' : 'Add'}
            </button>
          ) : null}
        </div>
      </InlineFieldShell>
    );
  }

  return (
    <InlineFieldShell>
      <div className="flex flex-wrap items-center gap-2 max-w-full">
        <input
          value={value?.value_text || ''}
          onChange={(e) => onChangeText(fieldKey, e.target.value)}
          disabled={disabled}
          className="w-full sm:w-48 max-w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-[#0f172a] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-60"
          placeholder={type === 'date' ? 'YYYY-MM-DD' : 'Enter value'}
        />
      </div>
    </InlineFieldShell>
  );
};

export default function CustomerContractPortal() {
  const { token = '' } = useParams();

  const [portal, setPortal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [modalField, setModalField] = useState(null); // {field_key, field_type}
  const [isSignatureSavedInModal, setIsSignatureSavedInModal] = useState(false);
  const fetchRef = useRef(false);

  const requiredFields = useMemo(() => portal?.required_fields || [], [portal]);
  const isSigned = String(portal?.status || '').toLowerCase() === 'signed';

  const [fieldValues, setFieldValues] = useState({}); // key -> { signature_payload? value_text? }

  const ensureDefaults = useCallback((fields) => {
    setFieldValues((prev) => {
      const next = { ...(prev || {}) };
      (fields || []).forEach((f) => {
        const key = String(f?.field_key || '');
        const type = String(f?.field_type || '').toLowerCase();
        if (!key) return;
        if (type === 'date' && !next[key]?.value_text) {
          next[key] = { ...(next[key] || {}), value_text: todayISO() };
        }
      });
      return next;
    });
  }, []);

  const loadPortal = useCallback(async () => {
    if (!token) {
      setError('Missing contract portal token.');
      setLoading(false);
      return;
    }
    if (fetchRef.current) return;
    fetchRef.current = true;

    setLoading(true);
    setError('');
    try {
      const res = await getPublicContractPortal(token);
      const data = res?.data ?? res;
      setPortal(data);
      if (String(data?.status || '').toLowerCase() === 'signed' && Array.isArray(data?.signed_fields)) {
        const signedFieldValues = {};
        data.signed_fields.forEach((field) => {
          const key = String(field?.field_key || '');
          if (!key) return;
          signedFieldValues[key] = {
            value_text: String(field?.value_text || ''),
            signature_payload: String(field?.signature_payload || ''),
          };
        });
        setFieldValues(signedFieldValues);
      }
      ensureDefaults(data?.required_fields || []);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to load this contract portal.');
      setPortal(null);
    } finally {
      setLoading(false);
      fetchRef.current = false;
    }
  }, [token, ensureDefaults]);

  useEffect(() => {
    loadPortal();
  }, [loadPortal]);

  const setFieldValue = useCallback((key, patch) => {
    setFieldValues((prev) => ({ ...(prev || {}), [key]: { ...((prev || {})[key] || {}), ...(patch || {}) } }));
  }, []);

  const onInlineChangeText = useCallback(
    (fieldKey, nextValue) => {
      setFieldValue(fieldKey, { value_text: nextValue });
    },
    [setFieldValue]
  );

  const openSignaturePad = useCallback((field) => {
    setIsSignatureSavedInModal(false);
    setModalField(field);
  }, []);

  const closeSignaturePad = useCallback(() => {
    setModalField(null);
    setIsSignatureSavedInModal(false);
  }, []);

  const isFieldComplete = useCallback(
    (field) => {
      const key = String(field?.field_key || '');
      const type = String(field?.field_type || '').toLowerCase();
      const value = fieldValues?.[key] || {};
      if (!key) return false;
      if (isSignatureFieldType(type)) return Boolean(value.signature_payload);
      if (type === 'date' || type === 'text') return Boolean(String(value.value_text || '').trim());
      return false;
    },
    [fieldValues]
  );

  const getOrderedRequiredFields = useCallback(() => {
    const fieldsByKey = new Map(
      requiredFields
        .map((field) => [String(field?.field_key || ''), field])
        .filter(([key]) => key)
    );
    const domOrderedKeys = getSignFieldNodes()
      .map((node) => String(node.getAttribute('data-key') || ''))
      .filter((key) => fieldsByKey.has(key));
    const orderedFields = [
      ...domOrderedKeys.map((key) => fieldsByKey.get(key)),
      ...requiredFields.filter((field) => !domOrderedKeys.includes(String(field?.field_key || ''))),
    ];
    return orderedFields;
  }, [requiredFields]);

  const getNextIncompleteSignatureField = useCallback((currentFieldKey = '') => {
    const orderedFields = getOrderedRequiredFields().filter((field) => isSignatureFieldType(field?.field_type));
    const incompleteFields = orderedFields.filter((f) => !isFieldComplete(f));
    if (!incompleteFields.length) return null;

    let nextIncomplete = incompleteFields[0];
    const currentIndex = orderedFields.findIndex(
      (f) => String(f?.field_key || '') === String(currentFieldKey || '')
    );
    if (currentIndex >= 0) {
      nextIncomplete =
        orderedFields.slice(currentIndex + 1).find((f) => !isFieldComplete(f)) ||
        incompleteFields[0];
    }

    return nextIncomplete || null;
  }, [getOrderedRequiredFields, isFieldComplete]);

  const canSubmit = useMemo(() => {
    if (isSigned) return false;
    if (!requiredFields.length) return false;
    return requiredFields.every(isFieldComplete);
  }, [isSigned, requiredFields, isFieldComplete]);

  const submitSignature = async () => {
    if (!token) return;
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const fields = requiredFields.map((f) => {
        const key = String(f.field_key || '');
        const type = String(f.field_type || '').toLowerCase();
        const value = fieldValues?.[key] || {};
        if (isSignatureFieldType(type)) {
          return { field_key: key, field_type: type, signature_payload: value.signature_payload };
        }
        return { field_key: key, field_type: type, value_text: String(value.value_text || '').trim() };
      });
      await signPublicContractPortal({ token, fields });
      await loadPortal();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to submit your signature.');
    } finally {
      setSubmitting(false);
    }
  };

  const filledCount = useMemo(() => {
    return requiredFields.filter(isFieldComplete).length;
  }, [requiredFields, isFieldComplete]);

  const nextFieldAfterModalSave = modalField?.field_key
    ? getNextIncompleteSignatureField(modalField.field_key)
    : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page p-8">
        <div className="flex items-center gap-3 text-content-sec font-semibold">
          <Loader2 className="animate-spin" size={18} />
          Loading contract…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-page p-6">
        <div className="mx-auto max-w-4xl">
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center shrink-0">
                <ShieldAlert size={22} />
              </div>
              <div>
                <div className="text-sm font-extrabold text-content-main">Unable to load portal</div>
                <div className="mt-1 text-sm font-semibold text-content-sec">{error}</div>
                <div className="mt-5">
                  <Button className="bg-primary text-white" onClick={loadPortal}>
                    Try again
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const html = portal?.content_html || portal?.content || '';
  const signedPdfUrl = portal?.signed_pdf_url || '';
  const renderedHtml = rewriteContractMediaUrls(html);

  return (
    <div className="min-h-screen bg-page pb-28 pt-4 px-2 sm:px-6">
      <style>{DEFAULT_TEMPLATE_CSS}</style>
      <div className="mx-auto max-w-4xl bg-white border border-white/70 rounded-2xl sm:rounded-[2rem] shadow-[0_24px_80px_-28px_rgba(59,130,246,0.15)] overflow-hidden">
        <div className="p-4 sm:p-10">
          <ContractInlineRenderer
            html={renderedHtml}
            fieldValues={fieldValues}
            isSigned={isSigned}
            onOpenPad={openSignaturePad}
            onChangeText={onInlineChangeText}
          />
         
        </div>
      </div>

      {/* Floating / Sticky bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/60 bg-white/80 backdrop-blur-xl py-3 px-4 sm:px-6 shadow-[0_-12px_40px_rgba(0,0,0,0.08)]">
        <div className="mx-auto max-w-4xl flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            {isSigned ? (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-extrabold uppercase tracking-widest text-emerald-700">
                <CheckCircle2 size={16} />
                Signed & Validated
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-extrabold uppercase tracking-widest text-blue-700">
                <FileSignature size={16} />
                {requiredFields.length ? `${filledCount} of ${requiredFields.length} fields filled` : 'Signature required'}
              </div>
            )}
          </div>

          {!isSigned && (
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                className={canSubmit ? 'bg-primary text-white shadow-[0_14px_28px_-18px_rgba(59,130,246,0.6)] hover:bg-primary-dark hover:scale-[1.02] active:scale-[0.98]' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
                disabled={!canSubmit || submitting}
                onClick={submitSignature}
              >
                {submitting ? <Loader2 className="animate-spin" size={16} /> : <FileSignature size={16} />}
                Submit signature
              </Button>
            </div>
          )}
        </div>
      </div>

      <SignaturePadModal
        open={Boolean(modalField)}
        title={modalField?.field_type === 'initial' ? 'Initials' : 'Signature'}
        resetKey={modalField?.field_key || ''}
        description="Use this popup to add your electronic signature to the selected signature block in the document. After you save, the signature is placed into the document for final submission."
        saved={isSignatureSavedInModal}
        savedDescription={
          nextFieldAfterModalSave
            ? 'Your signature was added to this block. Continue to the next required signing block when you are ready.'
            : 'Your signature was added to this block. You can close this popup and submit once every required field is complete.'
        }
        onNext={nextFieldAfterModalSave ? () => {
          setIsSignatureSavedInModal(false);
          setModalField({
            field_key: nextFieldAfterModalSave.field_key,
            field_type: String(nextFieldAfterModalSave.field_type || '').toLowerCase(),
          });
        } : null}
        onClose={closeSignaturePad}
        onSave={(dataUrl) => {
          if (!modalField?.field_key) return;
          setFieldValue(modalField.field_key, { signature_payload: dataUrl });
          setIsSignatureSavedInModal(true);
        }}
      />
    </div>
  );
}

function ContractInlineRenderer({
  html,
  fieldValues,
  isSigned,
  onOpenPad,
  onChangeText,
}) {
  const containerRef = useRef(null);
  const [placeholders, setPlaceholders] = useState([]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    container.innerHTML = html;
    container.querySelectorAll('table').forEach((table) => {
      if (table.parentElement.classList.contains('table-responsive-wrapper')) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'table-responsive-wrapper';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
    const nodes = Array.from(container.querySelectorAll('span[data-sign][data-key]'));
    nodes.forEach((node) => { node.innerHTML = ''; });
    setPlaceholders(nodes);
  }, [html]);

  return <>
    <div ref={containerRef} className="contract-portal prose max-w-none" />
    {placeholders.map((node, index) => {
      const kind = (node.getAttribute('data-sign') || '').trim().toLowerCase();
      const key = (node.getAttribute('data-key') || '').trim();
      const label = kind === 'initial' ? 'Initial' : kind === 'signature' ? 'Signature' : kind.toUpperCase();
      return createPortal(
        <InlineSignField
          label={`${label} (${key})`}
          fieldKey={key}
          fieldType={kind}
          disabled={Boolean(isSigned)}
          value={fieldValues?.[key] || {}}
          onOpenPad={onOpenPad}
          onChangeText={onChangeText}
        />, node, `${key}-${index}`,
      );
    })}
  </>;
}
