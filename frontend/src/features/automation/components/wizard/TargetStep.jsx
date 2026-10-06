import React, { useEffect, useMemo, useState } from 'react';
import { getAutomationVariables } from '../../../../services/api';

const tokenLabel = (token) => {
  const labels = {
    contact1: 'Lead contact',
    contact2: 'Lead contact 2',
    contact3: 'Lead contact 3',
    customer: 'Customer',
    sales_person_email: 'Sales person email',
    branch_email: 'Branch email',
  };
  return labels[token] || token.replaceAll('_', ' ');
};

export default function TargetStep({ draft, dispatch }) {
  const [recipientTokens, setRecipientTokens] = useState([]);
  const tokens = draft.recipients?.tokens || [];

  const visibleTokens = useMemo(() => recipientTokens.filter((token) => {
    if (draft.meta?.target_type === 'lead') return ['contact1', 'contact2', 'contact3', 'sales_person_email', 'branch_email'].includes(token);
    if (draft.meta?.target_type === 'opportunity') return ['customer', 'sales_person_email', 'branch_email'].includes(token);
    return ['customer', 'sales_person_email', 'branch_email'].includes(token);
  }), [draft.meta?.target_type, recipientTokens]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getAutomationVariables(draft.meta?.target_type || 'lead');
        setRecipientTokens(res?.recipient_tokens || []);
      } catch {
        if (draft.meta?.target_type === 'lead') {
          setRecipientTokens(['contact1', 'contact2', 'contact3', 'sales_person_email', 'branch_email']);
        } else if (draft.meta?.target_type === 'opportunity') {
          setRecipientTokens(['customer', 'sales_person_email', 'branch_email']);
        } else {
          setRecipientTokens(['customer', 'sales_person_email', 'branch_email']);
        }
      }
    };
    load();
  }, [draft.meta?.target_type]);

  const toggleToken = (t) => {
    const next = tokens.includes(t) ? tokens.filter((x) => x !== t) : [...tokens, t];
    dispatch({ type: 'recipients', patch: { tokens: next } });
  };

  const addCustomEmail = (value) => {
    const email = String(value || '').trim();
    if (!email) return;
    const next = Array.from(new Set([...(draft.recipients?.custom_emails || []), email]));
    dispatch({ type: 'recipients', patch: { custom_emails: next } });
  };

  const addCustomPhone = (value) => {
    const phone = String(value || '').trim();
    if (!phone) return;
    const next = Array.from(new Set([...(draft.recipients?.custom_phones || []), phone]));
    dispatch({ type: 'recipients', patch: { custom_phones: next } });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-heading">Who should receive this?</h2>
        <p className="text-sm text-muted">Choose who will be targeted by this automation</p>
      </div>

      <div className="rounded-xl border border-border p-4 space-y-3">
        <div className="text-sm font-bold text-heading">Dynamic recipients</div>
        <div className="space-y-2">
          {visibleTokens.map((t) => {
            const enabled = tokens.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleToken(t)}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                  enabled ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-subtle/60'
                }`}
              >
                <div>
                  <div className="text-sm font-bold text-heading">{tokenLabel(t)}</div>
                  <div className="text-xs text-muted">
                    {enabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
                <div className={`h-5 w-9 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-disabled'}`}>
                  <div
                    className={`mt-[2px] ml-[2px] h-4 w-4 rounded-full bg-white transition-transform ${
                      enabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </div>
              </button>
            );
          })}
          {!visibleTokens.length && <div className="text-sm text-muted">No tokens available</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border p-4 space-y-3">
          <div className="text-sm font-bold text-heading">Custom emails</div>
          <input
            className="w-full px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
            placeholder="Type email and press Enter"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomEmail(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
          />
          <div className="flex flex-wrap gap-2">
            {(draft.recipients?.custom_emails || []).map((e) => (
              <button
                key={e}
                type="button"
                className="rounded-lg bg-border px-3 py-1.5 text-[0.6875rem] font-bold"
                onClick={() =>
                  dispatch({
                    type: 'recipients',
                    patch: { custom_emails: (draft.recipients?.custom_emails || []).filter((x) => x !== e) },
                  })
                }
              >
                {e} ×
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border p-4 space-y-3">
          <div className="text-sm font-bold text-heading">Custom phone numbers</div>
          <input
            className="w-full px-3 py-2 bg-subtle rounded-xl text-sm outline-none"
            placeholder="Type phone and press Enter"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomPhone(e.currentTarget.value);
                e.currentTarget.value = '';
              }
            }}
          />
          <div className="flex flex-wrap gap-2">
            {(draft.recipients?.custom_phones || []).map((p) => (
              <button
                key={p}
                type="button"
                className="rounded-lg bg-border px-3 py-1.5 text-[0.6875rem] font-bold"
                onClick={() =>
                  dispatch({
                    type: 'recipients',
                    patch: { custom_phones: (draft.recipients?.custom_phones || []).filter((x) => x !== p) },
                  })
                }
              >
                {p} ×
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
