import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CreditCard, RefreshCw, RotateCcw } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { createRefund, getPaymentRequests, getPayments, getPaymentsHealth, getRefunds } from '../../../services/api';
import useCan from '../../../shared/auth/useCan';
import { useToast } from '../../../shared/context/ToastContext';
import { PERMISSIONS } from '../../../shared/permissions/registry';

const money = (amount, currency = 'CAD') => {
  const value = Number(amount || 0);
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: (currency || 'CAD').toUpperCase(),
    minimumFractionDigits: 2,
  }).format(value);
};

const StatusPill = ({ value }) => {
  const status = String(value || '').toLowerCase();
  const styles = {
    succeeded: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    created: 'bg-sky-50 text-sky-700 border-sky-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    failed: 'bg-rose-50 text-rose-700 border-rose-200',
    refunded: 'bg-stone-100 text-stone-700 border-stone-200',
    partially_refunded: 'bg-stone-100 text-stone-700 border-stone-200',
  }[status] || 'bg-stone-50 text-stone-700 border-stone-200';

  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${styles}`}>{status || 'unknown'}</span>;
};

const checkoutDisplay = (row) => {
  const status = String(row?.status || '').toLowerCase();
  if (status === 'paid') return { label: 'Completed', actionable: false };
  if (status === 'refunded') return { label: 'Refunded', actionable: false };
  if (status === 'failed') return { label: 'Failed', actionable: false };
  if (status === 'expired') return { label: 'Expired', actionable: false };
  if (status === 'cancelled') return { label: 'Closed', actionable: false };
  if (row?.checkout_url) return { label: 'Open', actionable: true };
  return { label: '-', actionable: false };
};

export default function PaymentsPage() {
  const { canAll } = useCan();
  const { showToast } = useToast();
  const [params] = useSearchParams();
  const [tab, setTab] = useState('requests');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [health, setHealth] = useState(null);
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [payments, setPayments] = useState([]);
  const [refunds, setRefunds] = useState([]);

  const [refundModal, setRefundModal] = useState({ open: false, payment: null, amount: '' });
  const [submittingRefund, setSubmittingRefund] = useState(false);

  const asList = (data) => Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [requestsRes, paymentsRes, refundsRes, healthRes] = await Promise.all([
        getPaymentRequests(),
        getPayments(),
        getRefunds(),
        getPaymentsHealth(),
      ]);
      setPaymentRequests(asList(requestsRes));
      setPayments(asList(paymentsRes));
      setRefunds(asList(refundsRes));
      setHealth(healthRes || null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to load payments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const nextTab = params.get('tab');
    if (nextTab && ['requests', 'payments', 'refunds'].includes(nextTab)) {
      setTab(nextTab);
    }
  }, [params]);

  const selectedRequestId = params.get('request_id') || '';
  const selectedRequest = useMemo(() => {
    if (!selectedRequestId) return null;
    return paymentRequests.find((pr) => String(pr.id) === String(selectedRequestId)) || null;
  }, [paymentRequests, selectedRequestId]);
  const selectedPayments = useMemo(() => {
    if (!selectedRequest?.id) return [];
    return (payments || []).filter((p) => String(p.payment_request_id) === String(selectedRequest.id));
  }, [payments, selectedRequest]);

  const openRefund = (payment) => {
    if (!canAll([PERMISSIONS.INTEGRATIONS_CHANGE_PAYMENT_GATEWAY])) {
      showToast('You do not have permission to create refunds.', 'warning');
      return;
    }
    setRefundModal({ open: true, payment, amount: '' });
    setError('');
  };

  const submitRefund = async () => {
    if (!refundModal.payment?.id) {
      return;
    }
    if (!canAll([PERMISSIONS.INTEGRATIONS_CHANGE_PAYMENT_GATEWAY])) {
      showToast('You do not have permission to create refunds.', 'warning');
      return;
    }
    setSubmittingRefund(true);
    setError('');
    try {
      const payload = { payment_id: refundModal.payment.id };
      if (refundModal.amount !== '') {
        payload.amount = refundModal.amount;
      }
      await createRefund(payload);
      setRefundModal({ open: false, payment: null, amount: '' });
      await load();
    } catch (err) {
      const nextError =
        err.response?.data?.detail ||
        Object.values(err.response?.data || {}).flat().join(' ') ||
        'Unable to create refund.';
      setError(nextError);
    } finally {
      setSubmittingRefund(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-stone-950 p-3 text-white shadow-sm">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Payments</h1>
            <p className="text-sm text-slate-500">Manage payment requests, captured payments, and refunds.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      ) : null}

      {health && (health.event_errors_24h > 0 || health.events_unprocessed_24h > 0) ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="text-sm font-medium">
            Payments health: {health.event_errors_24h} webhook error(s) and {health.events_unprocessed_24h} unprocessed event(s) in the last 24h.
          </div>
        </div>
      ) : null}

      {selectedRequest ? (
        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-500">Payment Request</div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <div className="text-lg font-semibold text-slate-900">
                  {selectedRequest.sales_number ? `Quote #${selectedRequest.sales_number}` : `Request #${selectedRequest.id}`}
                </div>
                <StatusPill value={selectedRequest.status} />
                <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-semibold text-stone-700">
                  {String(selectedRequest.payment_option || '').toUpperCase()}
                </span>
              </div>
              <div className="mt-2 text-sm text-slate-600">{money(selectedRequest.amount, selectedRequest.currency)}</div>
            </div>

            {selectedRequest.checkout_url ? (
              <a
                href={selectedRequest.checkout_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-red-300 hover:text-red-600"
              >
                Open Checkout
              </a>
            ) : null}
          </div>

          {selectedPayments.length ? (
            <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payments for this request</div>
              <div className="mt-2 space-y-2">
                {selectedPayments.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">Payment #{p.id}</div>
                      <div className="text-xs text-slate-500">{p.method_summary || p.provider_reference || ''}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-900">{money(p.amount, p.currency)}</div>
                      <div className="mt-0.5">
                        <StatusPill value={p.status} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-[1.75rem] border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 px-5 py-4">
          <button
            type="button"
            onClick={() => setTab('requests')}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              tab === 'requests' ? 'bg-stone-950 text-white' : 'text-slate-700 hover:bg-stone-100'
            }`}
          >
            Payment Requests
          </button>
          <button
            type="button"
            onClick={() => setTab('payments')}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              tab === 'payments' ? 'bg-stone-950 text-white' : 'text-slate-700 hover:bg-stone-100'
            }`}
          >
            Payments
          </button>
          <button
            type="button"
            onClick={() => setTab('refunds')}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              tab === 'refunds' ? 'bg-stone-950 text-white' : 'text-slate-700 hover:bg-stone-100'
            }`}
          >
            Refunds
          </button>
        </div>

        {tab === 'requests' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Quote</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Option</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Provider Ref</th>
                  <th className="px-5 py-3">Checkout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {(paymentRequests || []).map((row) => (
                  <tr key={row.id} className="hover:bg-stone-50/60">
                    <td className="px-5 py-3 font-semibold text-slate-900">#{row.id}</td>
                    <td className="px-5 py-3 text-slate-700">{row.sales_number ? `Quote #${row.sales_number}` : '-'}</td>
                    <td className="px-5 py-3">
                      <StatusPill value={row.status} />
                    </td>
                    <td className="px-5 py-3 text-slate-700">{row.payment_option || '-'}</td>
                    <td className="px-5 py-3 font-semibold text-slate-900">{money(row.amount, row.currency)}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600">{row.provider_reference || '-'}</td>
                    <td className="px-5 py-3">
                      {checkoutDisplay(row).actionable ? (
                        <a href={row.checkout_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-red-600 hover:text-red-700">
                          Open
                        </a>
                      ) : (
                        <span className="text-slate-600">{checkoutDisplay(row).label}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!paymentRequests?.length ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                      No payment requests yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : tab === 'payments' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Request</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Captured</th>
                  <th className="px-5 py-3">Provider Ref</th>
                  <th className="px-5 py-3">Refund</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {(payments || []).map((row) => {
                  const isSucceeded = String(row.status || '').toLowerCase() === 'succeeded';
                  return (
                    <tr key={row.id} className="hover:bg-stone-50/60">
                      <td className="px-5 py-3 font-semibold text-slate-900">#{row.id}</td>
                      <td className="px-5 py-3 text-slate-700">{row.payment_request_id || '-'}</td>
                      <td className="px-5 py-3">
                        <StatusPill value={row.status} />
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-900">{money(row.amount, row.currency)}</td>
                      <td className="px-5 py-3 text-slate-700">{row.captured_at ? new Date(row.captured_at).toLocaleString() : '-'}</td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-600">{row.provider_reference || '-'}</td>
                      <td className="px-5 py-3">
                        {canAll([PERMISSIONS.INTEGRATIONS_CHANGE_PAYMENT_GATEWAY]) ? (
                          <button
                            type="button"
                            onClick={() => openRefund(row)}
                            disabled={!isSucceeded}
                            className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Refund
                          </button>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!payments?.length ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                      No payments captured yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Payment</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Refunded</th>
                  <th className="px-5 py-3">Provider Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {(refunds || []).map((row) => (
                  <tr key={row.id} className="hover:bg-stone-50/60">
                    <td className="px-5 py-3 font-semibold text-slate-900">#{row.id}</td>
                    <td className="px-5 py-3 text-slate-700">{row.payment_id || '-'}</td>
                    <td className="px-5 py-3">
                      <StatusPill value={row.status} />
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-900">{money(row.amount, row.currency)}</td>
                    <td className="px-5 py-3 text-slate-700">{row.refunded_at ? new Date(row.refunded_at).toLocaleString() : '-'}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600">{row.provider_reference || '-'}</td>
                  </tr>
                ))}
                {!refunds?.length ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                      No refunds yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {refundModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Create Refund</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Payment #{refundModal.payment?.id} • {money(refundModal.payment?.amount, refundModal.payment?.currency)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRefundModal({ open: false, payment: null, amount: '' })}
                className="rounded-xl px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-stone-100 hover:text-slate-700"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-sm font-semibold text-slate-700">Amount (optional)</label>
              <input
                type="number"
                step="0.01"
                value={refundModal.amount}
                onChange={(e) => setRefundModal((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="Leave blank for full refund"
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-300"
              />
              <p className="text-xs text-slate-500">Final refund status updates via webhook.</p>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefundModal({ open: false, payment: null, amount: '' })}
                className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-stone-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRefund}
                disabled={submittingRefund}
                className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingRefund ? 'Submitting…' : 'Create Refund'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
