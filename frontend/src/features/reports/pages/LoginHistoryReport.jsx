import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { ArrowLeft, ArrowLeft as PrevIcon, ArrowRight, Loader2, RefreshCcw, Mail } from 'lucide-react';

import { useToast } from '../../../shared/context/ToastContext';
import Card from '../../../shared/ui/Card';
import ReportEmailModal from '../components/ReportEmailModal';
import { getLoginHistoryReport, sendReportEmail } from '../../../services/api';
import { rowsToCsv } from '../utils/reportEmail';

const toInputDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const initialDateRange = () => {
  const end = new Date();
  const start = new Date();
  start.setMonth(end.getMonth());
  start.setDate(1);
  return { startDate: toInputDate(start), endDate: toInputDate(end) };
};

const fmt = (value) => {
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

const formatOptions = [
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'Excel' },
];

const rowsToSheet = (rows, columns) => XLSX.utils.aoa_to_sheet([columns.map((c) => c.header), ...rows.map((row) => columns.map((c) => c.value(row)))]);

const LoginHistoryReport = () => {
  const { showToast } = useToast();
  const todayRange = initialDateRange();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailDraft, setEmailDraft] = useState({ email: '', format: 'xlsx' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [filters, setFilters] = useState({
    startDate: todayRange.startDate,
    endDate: todayRange.endDate,
    pageSize: 50,
  });
  const [draft, setDraft] = useState({
    startDate: todayRange.startDate,
    endDate: todayRange.endDate,
    pageSize: 50,
  });

  const loadReport = async () => {
    setLoading(true);
    try {
      const response = await getLoginHistoryReport({
        start_date: filters.startDate,
        end_date: filters.endDate,
        page,
        page_size: filters.pageSize,
      });
      const data = response?.data || response || {};
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setCount(Number(data.count || 0));
      setPageSize(Number(data.page_size || filters.pageSize || 50));
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Unable to load login history.', 'error', 5000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters.startDate, filters.endDate, filters.pageSize]);

  const applyFilters = (event) => {
    event.preventDefault();
    const start = new Date(draft.startDate);
    const end = new Date(draft.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      showToast('Invalid date range.', 'warning', 3000);
      return;
    }
    setPage(1);
    setFilters({
      startDate: draft.startDate,
      endDate: draft.endDate,
      pageSize: Number(draft.pageSize) || 50,
    });
  };

  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  const emailColumns = [
    { header: 'Login Time Stamp', value: (row) => fmt(row.login_time_stamp) },
    { header: 'User Name', value: (row) => row.user_name || '' },
    { header: 'User Email', value: (row) => row.user_email || '' },
    { header: 'User IP Address', value: (row) => row.user_ip_address || '' },
    { header: 'Application', value: (row) => row.application || '' },
  ];

  const sendEmailReport = useCallback(async () => {
    const toEmail = String(emailDraft.email || '').trim();
    if (!toEmail) return showToast('Enter an email address.', 'warning', 3000);
    const format = emailDraft.format === 'csv' ? 'csv' : 'xlsx';
    const rowsToSend = rows.slice();
    const subject = `Login History Report (${filters.startDate} to ${filters.endDate})`;
    let content_b64;
    let filename;
    let content_type;
    if (format === 'csv') {
      content_b64 = window.btoa(unescape(encodeURIComponent(rowsToCsv(rowsToSend, emailColumns))));
      filename = 'login-history.csv';
      content_type = 'text/csv';
    } else {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, rowsToSheet(rowsToSend, emailColumns), 'Login History');
      const bytes = new Uint8Array(XLSX.write(wb, { bookType: 'xlsx', type: 'array' }));
      let binary = '';
      bytes.forEach((b) => { binary += String.fromCharCode(b); });
      content_b64 = window.btoa(binary);
      filename = 'login-history.xlsx';
      content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
    await sendReportEmail({ to_email: toEmail, subject, body: `Attached is the login history report for ${filters.startDate} to ${filters.endDate}.`, filename, content_type, content_b64 });
    setEmailModalOpen(false);
    showToast('Report emailed successfully.', 'success', 3000);
  }, [emailColumns, emailDraft.email, emailDraft.format, filters.endDate, filters.startDate, rows, showToast]);

  return (
    <div className="space-y-6">
      <header className="bg-brand-surface rounded-2xl p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Link to="/analytics" className="inline-flex items-center gap-2 text-sm font-semibold text-content-sec hover:text-primary">
              <ArrowLeft size={16} />
              Back to Reports
            </Link>
            <p className="text-sm uppercase tracking-wide text-content-sec">Reporting</p>
            <h1 className="text-3xl font-bold text-heading">Login History</h1>
          </div>
          <button type="button" onClick={loadReport} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />} Refresh
          </button>
          <button type="button" onClick={() => setEmailModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold">
            <Mail size={16} /> Email Report
          </button>
        </div>
      </header>
      <ReportEmailModal open={emailModalOpen} title="Email Login History" email={emailDraft.email} setEmail={(value) => setEmailDraft((prev) => ({ ...prev, email: value }))} format={emailDraft.format} setFormat={(value) => setEmailDraft((prev) => ({ ...prev, format: value }))} onClose={() => setEmailModalOpen(false)} onSend={sendEmailReport} sending={loading} formats={formatOptions} />

      <Card title="Filters">
        <form className="grid grid-cols-1 md:grid-cols-3 gap-4" onSubmit={applyFilters}>
          <input type="date" value={draft.startDate} onChange={(e) => setDraft((v) => ({ ...v, startDate: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2" required />
          <input type="date" value={draft.endDate} onChange={(e) => setDraft((v) => ({ ...v, endDate: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2" required />
          <select value={draft.pageSize} onChange={(e) => setDraft((v) => ({ ...v, pageSize: Number(e.target.value) }))} className="rounded-lg border border-slate-200 px-3 py-2">
            {[25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
          <div className="md:col-span-3 flex justify-end">
            <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-white text-sm font-semibold">
              Apply Filters
            </button>
          </div>
        </form>
      </Card>

      <Card title="Login History" extraHeader={<span className="text-sm text-content-sec">Page {page} of {pageCount} ({count} total)</span>}>
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-content-sec border-b">
                <th className="py-3 pr-4 font-semibold">Login Time Stamp</th>
                <th className="py-3 pr-4 font-semibold">User Name</th>
                <th className="py-3 pr-4 font-semibold">User Email</th>
                <th className="py-3 pr-4 font-semibold">User IP Address</th>
                <th className="py-3 pr-4 font-semibold">Application</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row, index) => (
                <tr key={`${row.login_time_stamp || 'login'}-${row.user_email || 'user'}-${index}`} className="border-b">
                  <td className="py-3 pr-4">{fmt(row.login_time_stamp)}</td>
                  <td className="py-3 pr-4">{row.user_name || '-'}</td>
                  <td className="py-3 pr-4">{row.user_email || '-'}</td>
                  <td className="py-3 pr-4">{row.user_ip_address || '-'}</td>
                  <td className="py-3 pr-4">{row.application || '-'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="py-8 text-content-sec">
                    {loading ? 'Loading login history...' : 'No login history for the selected range.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-content-sec">Loaded {rows.length} of {count}</div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage((v) => Math.max(1, v - 1))} disabled={page <= 1} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:opacity-50">
              <PrevIcon size={16} /> Previous
            </button>
            <button type="button" onClick={() => setPage((v) => Math.min(pageCount, v + 1))} disabled={page >= pageCount} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:opacity-50">
              Next <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LoginHistoryReport;
