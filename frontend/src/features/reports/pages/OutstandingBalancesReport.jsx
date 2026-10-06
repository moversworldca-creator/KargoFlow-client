import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { ArrowLeft, Loader2, RefreshCcw, Mail } from 'lucide-react';

import { useToast } from '../../../shared/context/ToastContext';
import Card from '../../../shared/ui/Card';
import ReportEmailModal from '../components/ReportEmailModal';
import { getOutstandingBalancesReport, sendReportEmail } from '../../../services/api';
import { rowsToCsv } from '../utils/reportEmail';

const asList = (value) => {
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value)) return value;
  return [];
};

const money = (value, currency = 'USD') =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: (currency || 'USD').toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-CA');
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-CA', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
const formatOptions = [{ value: 'csv', label: 'CSV' }, { value: 'xlsx', label: 'Excel' }];
const rowsToSheet = (rows, columns) => XLSX.utils.aoa_to_sheet([columns.map((c) => c.header), ...rows.map((row) => columns.map((c) => c.value(row)))]);

const OutstandingBalancesReport = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ startDate: '', endDate: '' });
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailDraft, setEmailDraft] = useState({ email: '', format: 'xlsx' });

  useEffect(() => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    const toDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setFilters({ startDate: toDate(start), endDate: toDate(end) });
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const response = await getOutstandingBalancesReport({
        start_date: filters.startDate,
        end_date: filters.endDate,
        page: 1,
        page_size: 200,
      });
      setRows(asList(response?.data || response || {}));
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Unable to load outstanding balances.', 'error', 5000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filters.startDate && filters.endDate) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.startDate, filters.endDate]);
  const emailColumns = [
    { header: 'Customer Name', value: (row) => row.customer_name || '' },
    { header: 'Quote #', value: (row) => row.quote_number || row.opportunity_number || '' },
    { header: 'Service Date', value: (row) => formatDate(row.service_date) },
    { header: 'Invoice Sent At', value: (row) => formatDateTime(row.invoice_sent_at) },
    { header: 'Opportunity Total', value: (row) => Number(row.opportunity_total || 0) },
    { header: 'Payments', value: (row) => Number(row.payments || 0) },
    { header: 'Balance', value: (row) => Number(row.balance || 0) },
  ];
  const sendEmailReport = async () => {
    const toEmail = String(emailDraft.email || '').trim();
    if (!toEmail) return showToast('Enter an email address.', 'warning', 3000);
    const format = emailDraft.format === 'csv' ? 'csv' : 'xlsx';
    let content_b64;
    let filename;
    let content_type;
    if (format === 'csv') {
      content_b64 = window.btoa(unescape(encodeURIComponent(rowsToCsv(rows, emailColumns))));
      filename = 'outstanding-balances.csv';
      content_type = 'text/csv';
    } else {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, rowsToSheet(rows, emailColumns), 'Balances');
      const bytes = new Uint8Array(XLSX.write(wb, { bookType: 'xlsx', type: 'array' }));
      let binary = '';
      bytes.forEach((b) => { binary += String.fromCharCode(b); });
      content_b64 = window.btoa(binary);
      filename = 'outstanding-balances.xlsx';
      content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
    await sendReportEmail({ to_email: toEmail, subject: `Outstanding Balances (${filters.startDate} to ${filters.endDate})`, body: 'Attached is the outstanding balances report.', filename, content_type, content_b64 });
    setEmailModalOpen(false);
    showToast('Report emailed successfully.', 'success', 3000);
  };

  return (
    <div className="space-y-6">
      <header className="bg-brand-surface rounded-2xl p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Link to="/analytics" className="inline-flex items-center gap-2 text-sm font-semibold text-content-sec hover:text-primary">
              <ArrowLeft size={16} /> Back to Reports
            </Link>
            <p className="text-sm uppercase tracking-wide text-content-sec">Reporting</p>
            <h1 className="text-3xl font-bold text-heading">Outstanding Balances</h1>
            <p className="mt-2 text-content-sec">Invoices with remaining balances, grouped like the SmartMoving balances report.</p>
          </div>
          <button type="button" onClick={load} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />} Refresh
          </button>
          <button type="button" onClick={() => setEmailModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold">
            <Mail size={16} /> Email Report
          </button>
        </div>
      </header>
      <ReportEmailModal open={emailModalOpen} title="Email Outstanding Balances" email={emailDraft.email} setEmail={(value) => setEmailDraft((prev) => ({ ...prev, email: value }))} format={emailDraft.format} setFormat={(value) => setEmailDraft((prev) => ({ ...prev, format: value }))} onClose={() => setEmailModalOpen(false)} onSend={sendEmailReport} sending={loading} formats={formatOptions} />

      <Card title="Filters">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <input type="date" value={filters.startDate} onChange={(e) => setFilters((v) => ({ ...v, startDate: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2" />
          <input type="date" value={filters.endDate} onChange={(e) => setFilters((v) => ({ ...v, endDate: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2" />
        </div>
      </Card>

      <Card title="Outstanding Balances">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-3 pr-4 font-semibold">Customer Name</th>
                <th className="py-3 pr-4 font-semibold">Quote #</th>
                <th className="py-3 pr-4 font-semibold">Service Date</th>
                <th className="py-3 pr-4 font-semibold">Invoice Sent At</th>
                <th className="py-3 pr-4 font-semibold">Opportunity Total</th>
                <th className="py-3 pr-4 font-semibold">Payments</th>
                <th className="py-3 pr-4 font-semibold">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={row.invoice_id} className="border-b">
                  <td className="py-3 pr-4">{row.customer_name}</td>
                  <td className="py-3 pr-4">{row.quote_number || row.opportunity_number}</td>
                  <td className="py-3 pr-4">{formatDate(row.service_date)}</td>
                  <td className="py-3 pr-4">{formatDateTime(row.invoice_sent_at)}</td>
                  <td className="py-3 pr-4">{money(row.opportunity_total, row.currency)}</td>
                  <td className="py-3 pr-4">{money(row.payments, row.currency)}</td>
                  <td className="py-3 pr-4 font-semibold">{money(row.balance, row.currency)}</td>
                </tr>
              )) : <tr><td colSpan={7} className="py-8 text-content-sec">{loading ? 'Loading outstanding balances...' : 'No outstanding balances for the selected range.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default OutstandingBalancesReport;
