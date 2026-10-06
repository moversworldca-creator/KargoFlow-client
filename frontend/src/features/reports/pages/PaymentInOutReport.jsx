import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { ArrowLeft, ArrowRight, CalendarClock, Loader2, RefreshCcw, Search, Mail } from 'lucide-react';

import { useToast } from '../../../shared/context/ToastContext';
import Card from '../../../shared/ui/Card';
import ReportEmailModal from '../components/ReportEmailModal';
import { getBranchLookups, getPaymentGateways, getPaymentInOutReport, sendReportEmail } from '../../../services/api';
import { rowsToCsv } from '../utils/reportEmail';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const toInputDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const initialDateRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return { startDate: toInputDate(start), endDate: toInputDate(end) };
};

const asList = (data) => (Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []);
const formatOptions = [{ value: 'csv', label: 'CSV' }, { value: 'xlsx', label: 'Excel' }];
const rowsToSheet = (rows, columns) => XLSX.utils.aoa_to_sheet([columns.map((c) => c.header), ...rows.map((row) => columns.map((c) => c.value(row)))]);

const money = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: (currency || 'USD').toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const toDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const PaymentInOutReport = () => {
  const { showToast } = useToast();
  const todayRange = initialDateRange();

  const [filterInputs, setFilterInputs] = useState({
    startDate: todayRange.startDate,
    endDate: todayRange.endDate,
    pageSize: 25,
    paymentStatus: '',
    refundStatus: '',
    sourceType: '',
    branchId: '',
    minAmount: '',
    maxAmount: '',
  });
  const [activeFilters, setActiveFilters] = useState({
    ...todayRange,
    pageSize: 25,
    paymentStatus: '',
    refundStatus: '',
    sourceType: '',
    paymentGatewayId: '',
    branchId: '',
    minAmount: '',
    maxAmount: '',
  });
  const [loading, setLoading] = useState({ payments: false, refunds: false, gateways: false });
  const [branches, setBranches] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [payments, setPayments] = useState({ rows: [], count: 0, page: 1, page_size: 25, summary: null });
  const [refunds, setRefunds] = useState({ rows: [], count: 0, page: 1, page_size: 25 });
  const [paymentPage, setPaymentPage] = useState(1);
  const [refundPage, setRefundPage] = useState(1);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailDraft, setEmailDraft] = useState({ email: '', format: 'xlsx' });
  const pageSize = Number(activeFilters.pageSize) || 25;

  const paginateRows = (rows, page) => {
    const offset = (page - 1) * pageSize;
    return rows.slice(offset, offset + pageSize);
  };

  const loadGateways = async (branchId = '') => {
    setLoading((prev) => ({ ...prev, gateways: true }));
    try {
      const response = await getPaymentGateways(branchId ? { branch: branchId } : undefined);
      setGateways(asList(response?.data || response || {}));
    } catch (err) {
      console.error('Unable to load payment gateways for report:', err);
    } finally {
      setLoading((prev) => ({ ...prev, gateways: false }));
    }
  };

  const loadBranches = async () => {
    try {
      const response = await getBranchLookups({ limit: 250 });
      setBranches(asList(response?.data || response || {}));
    } catch (err) {
      console.error('Unable to load branches for report:', err);
    }
  };

  const loadData = async () => {
    setLoading({ payments: true, refunds: true });
    try {
      const response = await getPaymentInOutReport({
        start_date: activeFilters.startDate,
        end_date: activeFilters.endDate,
        payment_status: activeFilters.paymentStatus || undefined,
        refund_status: activeFilters.refundStatus || undefined,
        source_type: activeFilters.sourceType || undefined,
        payment_gateway_id: activeFilters.paymentGatewayId || undefined,
        branch_id: activeFilters.branchId || undefined,
        min_amount: activeFilters.minAmount || undefined,
        max_amount: activeFilters.maxAmount || undefined,
      });
      const data = response?.data || response || {};
      const filteredPayments = asList(data.payments);
      const filteredRefunds = asList(data.refunds);
      setPayments({
        rows: paginateRows(filteredPayments, paymentPage),
        count: filteredPayments.length,
        page: paymentPage,
        page_size: pageSize,
      });
      setRefunds({
        rows: paginateRows(filteredRefunds, refundPage),
        count: filteredRefunds.length,
        page: refundPage,
        page_size: pageSize,
      });
      const summary = data.summary || {};
      setPayments((prev) => ({ ...prev, summary }));
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Unable to load payment report.', 'error', 5000);
    } finally {
      setLoading({ payments: false, refunds: false });
    }
  };

  useEffect(() => {
    loadBranches();
    loadGateways(activeFilters.branchId);
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters, paymentPage, refundPage]);

  const applyFilters = (event) => {
    event.preventDefault();
    const start = new Date(filterInputs.startDate);
    const end = new Date(filterInputs.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      showToast('Invalid date range.', 'warning', 3000);
      return;
    }
    setPaymentPage(1);
    setRefundPage(1);
    setActiveFilters({
      startDate: filterInputs.startDate,
      endDate: filterInputs.endDate,
      pageSize: Number(filterInputs.pageSize) || 25,
      paymentStatus: String(filterInputs.paymentStatus || ''),
      refundStatus: String(filterInputs.refundStatus || ''),
      sourceType: String(filterInputs.sourceType || ''),
      paymentGatewayId: String(filterInputs.paymentGatewayId || ''),
      branchId: String(filterInputs.branchId || ''),
      minAmount: String(filterInputs.minAmount || ''),
      maxAmount: String(filterInputs.maxAmount || ''),
    });
  };

  const totalIncoming = Number(payments.summary?.incoming_total || 0);
  const totalOutgoing = Number(payments.summary?.outgoing_total || 0);
  const net = Number(payments.summary?.net_total || (totalIncoming - totalOutgoing));
  const paymentPageCount = Math.max(1, Math.ceil((payments.count || 0) / (payments.page_size || pageSize)));
  const refundPageCount = Math.max(1, Math.ceil((refunds.count || 0) / (refunds.page_size || pageSize)));
  const emailColumns = [
    { header: 'Section', value: (row) => row.section || '' },
    { header: 'ID', value: (row) => row.id || '' },
    { header: 'Method', value: (row) => row.method_summary || row.method || '' },
    { header: 'Branch', value: (row) => row.branch_name || '' },
    { header: 'Status', value: (row) => row.status || '' },
    { header: 'Reference', value: (row) => row.estimate_id || row.payment_request_id || row.payment_id || '' },
    { header: 'Date', value: (row) => row.timestamp || row.paid_at || row.captured_at || row.created_at || row.refunded_at || '' },
    { header: 'Reason', value: (row) => row.reason || '' },
    { header: 'Amount', value: (row) => Number(row.amount || 0) },
    { header: 'Currency', value: (row) => row.currency || '' },
  ];
  const sendEmailReport = async () => {
    const toEmail = String(emailDraft.email || '').trim();
    if (!toEmail) return showToast('Enter an email address.', 'warning', 3000);
    const format = emailDraft.format === 'csv' ? 'csv' : 'xlsx';
    const combinedRows = [
      ...payments.rows.map((row) => ({ ...row, section: 'Incoming' })),
      ...refunds.rows.map((row) => ({ ...row, section: 'Outgoing' })),
    ];
    let content_b64;
    let filename;
    let content_type;
    if (format === 'csv') {
      content_b64 = window.btoa(unescape(encodeURIComponent(rowsToCsv(combinedRows, emailColumns))));
      filename = 'payment-in-out.csv';
      content_type = 'text/csv';
    } else {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, rowsToSheet(combinedRows, emailColumns), 'Payments');
      const bytes = new Uint8Array(XLSX.write(wb, { bookType: 'xlsx', type: 'array' }));
      let binary = '';
      bytes.forEach((b) => { binary += String.fromCharCode(b); });
      content_b64 = window.btoa(binary);
      filename = 'payment-in-out.xlsx';
      content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
    await sendReportEmail({ to_email: toEmail, subject: `Payment In / Out (${activeFilters.startDate} to ${activeFilters.endDate})`, body: 'Attached is the payment in / out report.', filename, content_type, content_b64 });
    setEmailModalOpen(false);
    showToast('Report emailed successfully.', 'success', 3000);
  };

  return (
    <div className="space-y-6">
      <header className="bg-brand-surface rounded-2xl p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Link to="/analytics" className="inline-flex items-center gap-2 text-sm font-semibold text-content-sec hover:text-primary">
              <ArrowLeft size={16} />
              Back to Reports
            </Link>
            <p className="text-sm uppercase tracking-wide text-content-sec">Payments</p>
            <h1 className="text-3xl font-bold text-heading">Payment In / Out Report</h1>
            <p className="mt-2 text-content-sec">
              Review incoming captured payments and outgoing refunds over a date range.
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark disabled:opacity-60"
            disabled={loading.payments || loading.refunds}
          >
            {loading.payments || loading.refunds ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
            Refresh
          </button>
          <button type="button" onClick={() => setEmailModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold">
            <Mail size={16} /> Email Report
          </button>
        </div>
      </header>
      <ReportEmailModal open={emailModalOpen} title="Email Payment In / Out" email={emailDraft.email} setEmail={(value) => setEmailDraft((prev) => ({ ...prev, email: value }))} format={emailDraft.format} setFormat={(value) => setEmailDraft((prev) => ({ ...prev, format: value }))} onClose={() => setEmailModalOpen(false)} onSend={sendEmailReport} sending={loading.payments || loading.refunds} formats={formatOptions} />

      <Card title="Report Filters">
        <form className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4" onSubmit={applyFilters}>
          <label className="space-y-2">
            <span className="text-sm font-medium text-content-main flex items-center gap-2">
              <CalendarClock size={16} />
              Start Date
            </span>
            <input type="date" value={filterInputs.startDate} onChange={(e) => setFilterInputs((v) => ({ ...v, startDate: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white" required />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-content-main flex items-center gap-2">
              <CalendarClock size={16} />
              End Date
            </span>
            <input type="date" value={filterInputs.endDate} onChange={(e) => setFilterInputs((v) => ({ ...v, endDate: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white" required />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-content-main">Rows Per Page</span>
            <select value={filterInputs.pageSize} onChange={(e) => setFilterInputs((v) => ({ ...v, pageSize: Number(e.target.value) }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white">
              {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-content-main">Payment Status</span>
            <select
              value={filterInputs.paymentStatus}
              onChange={(e) => setFilterInputs((v) => ({ ...v, paymentStatus: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white"
            >
              <option value="">All Payment Statuses</option>
              <option value="pending">Pending</option>
              <option value="succeeded">Succeeded</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="partially_refunded">Partially Refunded</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-content-main">Refund Status</span>
            <select
              value={filterInputs.refundStatus}
              onChange={(e) => setFilterInputs((v) => ({ ...v, refundStatus: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white"
            >
              <option value="">All Refund Statuses</option>
              <option value="pending">Pending</option>
              <option value="succeeded">Succeeded</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-content-main">Payment Source</span>
            <select
              value={filterInputs.sourceType}
              onChange={(e) => setFilterInputs((v) => ({ ...v, sourceType: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white"
            >
              <option value="">All Sources</option>
              <option value="gateway">Gateway</option>
              <option value="manual">Manual</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-content-main">Payment Gateway</span>
            <select
              value={filterInputs.paymentGatewayId}
              onChange={(e) => setFilterInputs((v) => ({ ...v, paymentGatewayId: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white"
              disabled={loading.gateways}
            >
              <option value="">All Gateways</option>
              {gateways.map((gateway) => (
                <option key={gateway.id} value={gateway.id}>
                  {gateway.display_name || `${String(gateway.provider || 'Gateway').toUpperCase()} #${gateway.id}`}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-content-main">Branch</span>
            <select
              value={filterInputs.branchId}
              onChange={(e) => {
                const nextBranchId = e.target.value;
                setFilterInputs((v) => ({ ...v, branchId: nextBranchId, paymentGatewayId: '' }));
                setGateways([]);
                loadGateways(nextBranchId);
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white"
            >
              <option value="">All Branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name || `Branch ${branch.id}`}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-content-main">Min Amount</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={filterInputs.minAmount}
              onChange={(e) => setFilterInputs((v) => ({ ...v, minAmount: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white"
              placeholder="0.00"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-content-main">Max Amount</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={filterInputs.maxAmount}
              onChange={(e) => setFilterInputs((v) => ({ ...v, maxAmount: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white"
              placeholder="0.00"
            />
          </label>
          <div className="md:col-span-2 xl:col-span-4 flex items-center justify-end">
            <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800">
              <Search size={16} />
              Apply Filters
            </button>
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Incoming">
          <div className="text-2xl font-bold text-heading">{money(totalIncoming)}</div>
          <div className="text-sm text-content-sec mt-1">{payments.count} payment(s)</div>
        </Card>
        <Card title="Outgoing">
          <div className="text-2xl font-bold text-heading">{money(totalOutgoing)}</div>
          <div className="text-sm text-content-sec mt-1">{refunds.count} refund(s)</div>
        </Card>
        <Card title="Net">
          <div className="text-2xl font-bold text-heading">{money(net)}</div>
          <div className="text-sm text-content-sec mt-1">Incoming minus outgoing</div>
        </Card>
      </div>

      <Card title="Incoming Payments" extraHeader={<span className="text-sm text-content-sec">Page {payments.page} of {paymentPageCount}</span>}>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-content-sec border-b">
                <th className="py-3 pr-4 font-semibold">Payment ID</th>
                <th className="py-3 pr-4 font-semibold">Method</th>
                <th className="py-3 pr-4 font-semibold">Branch</th>
                <th className="py-3 pr-4 font-semibold">Status</th>
                <th className="py-3 pr-4 font-semibold">Estimate</th>
                <th className="py-3 pr-4 font-semibold">Captured At</th>
                <th className="py-3 pr-4 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading.payments ? (
                <tr><td className="py-6 text-content-sec" colSpan={7}>Loading payments...</td></tr>
              ) : payments.rows.length ? payments.rows.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-3 pr-4">{row.id}</td>
                  <td className="py-3 pr-4">{row.method_summary || row.method || '-'}</td>
                  <td className="py-3 pr-4">{row.branch_name || '-'}</td>
                  <td className="py-3 pr-4 capitalize">{row.status || '-'}</td>
                  <td className="py-3 pr-4">{row.estimate_id || row.payment_request_id || '-'}</td>
                  <td className="py-3 pr-4">{toDateTime(row.paid_at || row.captured_at || row.created_at)}</td>
                  <td className="py-3 pr-4 text-right">{money(row.amount, row.currency)}</td>
                </tr>
              )) : (
                <tr><td className="py-6 text-content-sec" colSpan={7}>No incoming payments for the selected range.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-content-sec">Loaded {payments.rows.length} of {payments.count}</div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPaymentPage((v) => Math.max(1, v - 1))} disabled={paymentPage <= 1} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:opacity-50"><ArrowLeft size={16} />Previous</button>
            <button type="button" onClick={() => setPaymentPage((v) => Math.min(paymentPageCount, v + 1))} disabled={paymentPage >= paymentPageCount} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:opacity-50">Next<ArrowRight size={16} /></button>
          </div>
        </div>
      </Card>

      <Card title="Outgoing Payments" extraHeader={<span className="text-sm text-content-sec">Page {refunds.page} of {refundPageCount}</span>}>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-content-sec border-b">
                <th className="py-3 pr-4 font-semibold">Refund ID</th>
                <th className="py-3 pr-4 font-semibold">Payment ID</th>
                <th className="py-3 pr-4 font-semibold">Branch</th>
                <th className="py-3 pr-4 font-semibold">Status</th>
                <th className="py-3 pr-4 font-semibold">Refunded At</th>
                <th className="py-3 pr-4 font-semibold">Reason</th>
                <th className="py-3 pr-4 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading.refunds ? (
                <tr><td className="py-6 text-content-sec" colSpan={7}>Loading refunds...</td></tr>
              ) : refunds.rows.length ? refunds.rows.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-3 pr-4">{row.id}</td>
                  <td className="py-3 pr-4">{row.payment_id}</td>
                  <td className="py-3 pr-4">{row.branch_name || '-'}</td>
                  <td className="py-3 pr-4 capitalize">{row.status || '-'}</td>
                  <td className="py-3 pr-4">{toDateTime(row.refunded_at || row.created_at)}</td>
                  <td className="py-3 pr-4">{row.reason || '-'}</td>
                  <td className="py-3 pr-4 text-right">{money(row.amount, row.currency)}</td>
                </tr>
              )) : (
                <tr><td className="py-6 text-content-sec" colSpan={7}>No outgoing payments for the selected range.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-content-sec">Loaded {refunds.rows.length} of {refunds.count}</div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setRefundPage((v) => Math.max(1, v - 1))} disabled={refundPage <= 1} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:opacity-50"><ArrowLeft size={16} />Previous</button>
            <button type="button" onClick={() => setRefundPage((v) => Math.min(refundPageCount, v + 1))} disabled={refundPage >= refundPageCount} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:opacity-50">Next<ArrowRight size={16} /></button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PaymentInOutReport;
