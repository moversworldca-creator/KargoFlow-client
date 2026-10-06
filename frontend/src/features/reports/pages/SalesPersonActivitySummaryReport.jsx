import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { ArrowLeft, Loader2, RefreshCcw, Mail } from 'lucide-react';

import { useToast } from '../../../shared/context/ToastContext';
import Card from '../../../shared/ui/Card';
import ReportEmailModal from '../components/ReportEmailModal';
import { getBranchLookups, getLookupUsers, getSalesPersonActivitySummary, sendReportEmail } from '../../../services/api';
import { rowsToCsv } from '../utils/reportEmail';

const asList = (value) => {
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value)) return value;
  return [];
};

const money = (value) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));

const formatOptions = [
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'Excel' },
];

const rowsToSheet = (rows, columns) => XLSX.utils.aoa_to_sheet([columns.map((c) => c.header), ...rows.map((row) => columns.map((c) => c.value(row)))]);

const SalesPersonActivitySummaryReport = () => {
  const { showToast } = useToast();
  const [branches, setBranches] = useState([]);
  const [salesPeople, setSalesPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailDraft, setEmailDraft] = useState({ email: '', format: 'xlsx' });
  const [filters, setFilters] = useState({ startDate: '', endDate: '', branchId: '', salespersonId: '' });

  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    const toDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setFilters({ startDate: toDate(start), endDate: toDate(end), branchId: '', salespersonId: '' });
    Promise.all([getBranchLookups({ limit: 250 }), getLookupUsers({ limit: 250 })])
      .then(([b, u]) => {
        setBranches(asList(b?.data || b || {}));
        setSalesPeople(asList(u?.data || u || {}));
      })
      .catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const response = await getSalesPersonActivitySummary({
        start_date: filters.startDate,
        end_date: filters.endDate,
        ...(filters.branchId ? { branch_id: filters.branchId } : {}),
        ...(filters.salespersonId ? { salesperson_id: filters.salespersonId } : {}),
      });
      setRows(asList(response?.data || response || {}));
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Unable to load activity summary.', 'error', 5000);
    } finally {
      setLoading(false);
    }
  };

  const emailColumns = [
    { header: 'Sales Person', value: (row) => row.salesperson_name || '' },
    { header: 'Booked', value: (row) => row.booked || '' },
    { header: 'Quotes Sent', value: (row) => row.quotes_sent || '' },
    { header: 'Opportunities', value: (row) => row.opportunities || '' },
    { header: 'Emails', value: (row) => row.emails || '' },
    { header: 'Total Calls', value: (row) => row.total_calls || '' },
    { header: 'Inbound Calls', value: (row) => row.inbound_calls || '' },
    { header: 'Texts Sent', value: (row) => row.texts_sent || '' },
    { header: 'Follow-ups Completed', value: (row) => row.follow_ups_completed || '' },
    { header: 'Booked Total', value: (row) => money(row.booked_total) },
  ];

  const sendEmailReport = useCallback(async () => {
    const toEmail = String(emailDraft.email || '').trim();
    if (!toEmail) return showToast('Enter an email address.', 'warning', 3000);
    const format = emailDraft.format === 'csv' ? 'csv' : 'xlsx';
    let content_b64;
    let filename;
    let content_type;
    if (format === 'csv') {
      content_b64 = window.btoa(unescape(encodeURIComponent(rowsToCsv(rows, emailColumns))));
      filename = 'sales-person-activity-summary.csv';
      content_type = 'text/csv';
    } else {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, rowsToSheet(rows, emailColumns), 'Summary');
      const bytes = new Uint8Array(XLSX.write(wb, { bookType: 'xlsx', type: 'array' }));
      let binary = '';
      bytes.forEach((b) => { binary += String.fromCharCode(b); });
      content_b64 = window.btoa(binary);
      filename = 'sales-person-activity-summary.xlsx';
      content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
    await sendReportEmail({ to_email: toEmail, subject: `Sales Person Activity Summary (${filters.startDate} to ${filters.endDate})`, body: 'Attached is the sales person activity summary report.', filename, content_type, content_b64 });
    setEmailModalOpen(false);
    showToast('Report emailed successfully.', 'success', 3000);
  }, [emailColumns, emailDraft.email, emailDraft.format, filters.endDate, filters.startDate, rows, showToast]);

  useEffect(() => {
    if (filters.startDate && filters.endDate) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.startDate, filters.endDate]);

  return (
    <div className="space-y-6">
      <header className="bg-brand-surface rounded-2xl p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Link to="/analytics" className="inline-flex items-center gap-2 text-sm font-semibold text-content-sec hover:text-primary">
              <ArrowLeft size={16} /> Back to Reports
            </Link>
            <p className="text-sm uppercase tracking-wide text-content-sec">Reporting</p>
            <h1 className="text-3xl font-bold text-heading">Sales Person Activity Summary</h1>
          </div>
          <button type="button" onClick={load} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />} Refresh
          </button>
          <button type="button" onClick={() => setEmailModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold">
            <Mail size={16} /> Email Report
          </button>
        </div>
      </header>
      <ReportEmailModal open={emailModalOpen} title="Email Activity Summary" email={emailDraft.email} setEmail={(value) => setEmailDraft((prev) => ({ ...prev, email: value }))} format={emailDraft.format} setFormat={(value) => setEmailDraft((prev) => ({ ...prev, format: value }))} onClose={() => setEmailModalOpen(false)} onSend={sendEmailReport} sending={loading} formats={formatOptions} />

      <Card title="Filters">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input type="date" value={filters.startDate} onChange={(e) => setFilters((v) => ({ ...v, startDate: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2" />
          <input type="date" value={filters.endDate} onChange={(e) => setFilters((v) => ({ ...v, endDate: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2" />
          <select value={filters.branchId} onChange={(e) => setFilters((v) => ({ ...v, branchId: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2">
            <option value="">All Branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.label || branch.name || `Branch ${branch.id}`}
              </option>
            ))}
          </select>
          <select value={filters.salespersonId} onChange={(e) => setFilters((v) => ({ ...v, salespersonId: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2">
            <option value="">All Salespeople</option>
            {salesPeople.map((user) => (
              <option key={user.id} value={user.id}>
                {user.label || user.full_name || [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.email || `User ${user.id}`}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card title="Salesperson Activity Summary">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead><tr className="text-left border-b">{['Sales Person', '# Booked', '# Quotes Sent', '# Opportunities', '# Emails', '# Total Calls', '# Inbound Calls', '# Texts Sent', '# Follow-ups Completed', '$ Booked'].map((col) => <th key={col} className="py-3 pr-4 font-semibold">{col}</th>)}</tr></thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={row.salesperson_id || row.salesperson_name} className="border-b">
                  <td className="py-3 pr-4">{row.salesperson_name}</td>
                  <td className="py-3 pr-4">{row.booked}</td>
                  <td className="py-3 pr-4">{row.quotes_sent}</td>
                  <td className="py-3 pr-4">{row.opportunities}</td>
                  <td className="py-3 pr-4">{row.emails}</td>
                  <td className="py-3 pr-4">{row.total_calls}</td>
                  <td className="py-3 pr-4">{row.inbound_calls}</td>
                  <td className="py-3 pr-4">{row.texts_sent}</td>
                  <td className="py-3 pr-4">{row.follow_ups_completed}</td>
                  <td className="py-3 pr-4">{money(row.booked_total)}</td>
                </tr>
              )) : <tr><td colSpan={10} className="py-8 text-content-sec">{loading ? 'Loading summary...' : 'No activity summary for the selected range.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default SalesPersonActivitySummaryReport;
