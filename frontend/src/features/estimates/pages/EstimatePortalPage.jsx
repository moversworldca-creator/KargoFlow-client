// Customer Estimate / Change Order portal (/portal/estimate?token=...).
// The customer is not signed in: the link's secret is sent to the backend,
// which answers with customer-safe content only (no internal ids, cost or
// margin). Acceptance is the customer's own typed name plus an explicit
// consent; nothing is drawn or signed for them, and accepting never books.
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, Loader2, ShieldAlert } from 'lucide-react';
import { formatDateOnly, formatDateTime, formatMoney, humanize } from '../../pricing/format';
import { portalApi } from '../api';

const BINDING_TEXT = {
  binding: 'Binding estimate: the price for the described services will not increase unless the scope changes.',
  non_binding: 'Non-binding estimate: the final price is based on the actual services provided.',
};
const CONSTRAINT_TEXT = {
  not_to_exceed: (amount, c) => `Not-to-exceed: you will not pay more than ${formatMoney(amount, c)} for the described services.`,
  fixed_price: (amount, c) => `Fixed price of ${formatMoney(amount, c)} for the described services.`,
  minimum: (amount, c) => `A minimum charge of ${formatMoney(amount, c)} applies.`,
};

function Shell({ company, children }) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:py-10">
      <main className="mx-auto max-w-3xl space-y-4">
        {company && (
          <header className="flex items-center gap-3">
            {company.logo_url && <img src={company.logo_url} alt="" className="h-10 w-10 rounded-lg object-contain" />}
            <div>
              <p className="text-lg font-bold">{company.company_name}</p>
              <p className="text-xs text-slate-600">{[company.branch_name, company.company_phone, company.company_email].filter(Boolean).join(' · ')}</p>
            </div>
          </header>
        )}
        {children}
      </main>
    </div>
  );
}

function Notice({ icon: IconCmp, title, children, tone = 'slate' }) {
  const tones = { slate: 'border-slate-200 bg-white', amber: 'border-amber-200 bg-amber-50', green: 'border-emerald-200 bg-emerald-50', red: 'border-rose-200 bg-rose-50' };
  return (
    <section role={tone === 'red' || tone === 'amber' ? 'alert' : 'status'} className={`flex gap-3 rounded-2xl border p-4 ${tones[tone]}`}>
      <IconCmp size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div><h2 className="text-sm font-bold">{title}</h2><div className="mt-1 text-sm">{children}</div></div>
    </section>
  );
}

function PricingTable({ pricing, currency }) {
  if (!pricing) return null;
  const c = currency || pricing.currency;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4" aria-label="Price">
      <table className="w-full text-sm">
        <caption className="sr-only">Charges</caption>
        <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
          <tr><th scope="col" className="pb-2">Service</th><th scope="col" className="pb-2 text-right">Amount</th></tr>
        </thead>
        <tbody>
          {pricing.lines.map((line, index) => (
            <tr key={`${line.name}-${line.job}-${index}`} className="border-t border-slate-100">
              <td className="py-2 pr-2">
                {line.name}
                {(line.job || (line.quantity && line.unit)) && (
                  <span className="block text-xs text-slate-500">
                    {line.job}{line.job && line.quantity && line.unit ? ' · ' : ''}{line.quantity && line.unit ? `${line.quantity} ${line.unit} × ${formatMoney(line.unit_rate, c)}` : ''}
                  </span>
                )}
              </td>
              <td className="py-2 text-right tabular-nums">{formatMoney(line.amount, c)}</td>
            </tr>
          ))}
          {pricing.adjustments.map((a) => (
            <tr key={a.name} className="border-t border-slate-100"><td className="py-2">{a.name}</td><td className="py-2 text-right tabular-nums">{formatMoney(a.amount, c)}</td></tr>
          ))}
        </tbody>
      </table>
      <dl className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-sm">
        <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatMoney(pricing.totals.subtotal, c)}</dd></div>
        {pricing.taxes.map((t) => <div key={t.name} className="flex justify-between text-slate-600"><dt>{t.name} ({t.rate}%)</dt><dd className="tabular-nums">{formatMoney(t.amount, c)}</dd></div>)}
        <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(pricing.totals.grand_total, c)}</dd></div>
        {pricing.totals.deposit_amount && Number(pricing.totals.deposit_amount) !== 0 && (
          <div className="flex justify-between text-slate-600"><dt>Deposit due at booking</dt><dd className="tabular-nums">{formatMoney(pricing.totals.deposit_amount, c)}</dd></div>
        )}
      </dl>
      {CONSTRAINT_TEXT[pricing.constraint?.type] && <p className="mt-3 rounded-lg bg-slate-50 p-2 text-xs">{CONSTRAINT_TEXT[pricing.constraint.type](pricing.constraint.amount, c)}</p>}
      {pricing.constraint?.type === 'range' && <p className="mt-3 rounded-lg bg-slate-50 p-2 text-xs">Expected price between {formatMoney(pricing.constraint.range_min, c)} and {formatMoney(pricing.constraint.range_max, c)}.</p>}
    </section>
  );
}

function AcceptForm({ consentText, label, onAccepted, token, optionKey }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim() || !consent) { setError('Type your full name and confirm that you accept.'); return; }
    setBusy(true);
    setError('');
    try {
      onAccepted(await portalApi.accept(token, { signer_name: name.trim(), signer_email: email.trim(), consent: true, ...(optionKey ? { option_key: optionKey } : {}) }));
    } catch (err) {
      setError(err?.response?.data?.detail || 'Your acceptance could not be recorded. Please try again or contact us.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4" aria-label={`Accept ${label}`}>
      <h2 className="text-sm font-bold">Accept {label}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold">Your full name
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
        </label>
        <label className="text-xs font-semibold">Email (optional)
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" />
        </label>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4" />
        <span>{consentText}</span>
      </label>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} Accept
      </button>
    </form>
  );
}

export default function EstimatePortalPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const client = useQueryClient();
  const [optionKey, setOptionKey] = useState('');
  const query = useQuery({
    queryKey: ['estimate-portal', token, optionKey], queryFn: () => portalApi.view(token, optionKey), enabled: Boolean(token),
    retry: false, staleTime: Infinity, refetchOnWindowFocus: false,
  });
  const data = query.data;

  if (!token || query.isError) {
    const status = query.error?.response?.status;
    return (
      <Shell>
        <Notice icon={ShieldAlert} title="This link is not valid" tone="red">
          {status === 429 ? 'Too many attempts. Please wait a minute and try again.' : 'The link may have expired or been replaced by a newer one. Please contact your moving company for a new link.'}
        </Notice>
      </Shell>
    );
  }
  if (query.isLoading || !data) {
    return <Shell><div role="status" className="flex items-center gap-2 text-sm text-slate-600"><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Loading…</div></Shell>;
  }

  const onAccepted = (next) => { setOptionKey(''); client.setQueryData(['estimate-portal', token, ''], next); };
  const currency = data.company?.currency;

  if (data.kind === 'change_order') {
    const order = data.change_order;
    return (
      <Shell company={data.company}>
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Change Order {order.number}</p>
          <h1 className="text-xl font-bold">{order.title}</h1>
          <p className="mt-1 text-sm text-slate-700">{order.reason}</p>
          {data.jobs.length > 0 && <ul className="mt-2 text-sm">{data.jobs.map((j) => <li key={j.title}>{j.title}: {humanize(j.change_type)}</li>)}</ul>}
          {order.delta_total && <p className="mt-3 text-base font-bold">Price change: {Number(order.delta_total) > 0 ? '+' : ''}{formatMoney(order.delta_total, currency)}</p>}
        </section>
        <PricingTable pricing={data.pricing} currency={currency} />
        {data.acceptance && <Notice icon={CheckCircle2} title="Accepted" tone="green">Accepted by {data.acceptance.signer_name} on {formatDateTime(data.acceptance.accepted_at)}.</Notice>}
        {data.can_accept && <AcceptForm token={token} label={`Change Order ${order.number}`} consentText={data.consent_text} onAccepted={onAccepted} />}
      </Shell>
    );
  }

  const estimate = data.estimate;
  return (
    <Shell company={data.company}>
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs text-slate-500">Estimate {estimate.number}{estimate.version_number ? ` · version ${estimate.version_number}` : ''}</p>
        <h1 className="text-xl font-bold">{estimate.label}</h1>
        {data.customer_name && <p className="text-sm text-slate-600">Prepared for {data.customer_name}</p>}
        {estimate.description && <p className="mt-2 whitespace-pre-line text-sm">{estimate.description}</p>}
        <p className="mt-2 text-xs text-slate-600">{BINDING_TEXT[estimate.binding_type]}</p>
        {estimate.expires_at && estimate.state !== 'accepted' && <p className="mt-1 flex items-center gap-1 text-xs text-slate-600"><Clock size={12} aria-hidden="true" /> Valid until {formatDateTime(estimate.expires_at)}</p>}
        {data.jobs.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {data.jobs.map((job) => <li key={`${job.title}-${job.service_date}`}><span className="font-semibold">{job.title}</span>{job.service_type && ` · ${job.service_type}`}{job.service_date && ` · ${formatDateOnly(job.service_date)}`}</li>)}
          </ul>
        )}
      </section>

      {data.options?.length > 1 && (
        <section aria-label="Your options" className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-bold">Your options</h2>
          <p className="mb-3 text-xs text-slate-600">Choose the option that fits. Accepting one replaces the others.</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {data.options.map((option) => (
              <button key={option.option_key} type="button" aria-pressed={option.selected}
                onClick={() => setOptionKey(option.selected ? optionKey : option.option_key)}
                className={`rounded-xl border p-3 text-left ${option.selected ? 'border-slate-900 ring-2 ring-slate-900' : 'border-slate-200 hover:border-slate-400'}`}>
                <span className="block text-sm font-bold">{option.label}</span>
                {option.description && <span className="block text-xs text-slate-600">{option.description}</span>}
                <span className="mt-1 block text-base font-bold tabular-nums">{option.pricing_current ? formatMoney(option.grand_total, currency) : 'Being updated'}</span>
                {option.state === 'accepted' && <span className="text-xs font-semibold text-emerald-700">Accepted</span>}
              </button>
            ))}
          </div>
        </section>
      )}
      {estimate.state === 'expired' && <Notice icon={Clock} title="This estimate has expired" tone="amber">Contact us for an updated estimate.</Notice>}
      {['superseded', 'cancelled'].includes(estimate.state) && <Notice icon={ShieldAlert} title="This estimate is no longer active" tone="amber">A newer version may have been sent to you.</Notice>}
      {!data.pricing_current && !['expired', 'superseded', 'cancelled', 'accepted'].includes(estimate.state) && (
        <Notice icon={Clock} title="This estimate is being updated" tone="amber">The price below may change. You will receive the updated estimate shortly; it cannot be accepted until then.</Notice>
      )}

      <PricingTable pricing={data.pricing} currency={currency} />

      {data.acceptance && (
        <Notice icon={CheckCircle2} title="Thank you, your estimate is accepted" tone="green">
          Accepted by {data.acceptance.signer_name} on {formatDateTime(data.acceptance.accepted_at)}. {estimate.is_booked ? 'Your move is booked.' : 'We will contact you to confirm your booking.'}
        </Notice>
      )}
      {data.can_accept && <AcceptForm token={token} optionKey={optionKey} label={data.options?.length ? `“${estimate.label}”` : 'this estimate'} consentText={data.consent_text} onAccepted={onAccepted} />}
    </Shell>
  );
}
