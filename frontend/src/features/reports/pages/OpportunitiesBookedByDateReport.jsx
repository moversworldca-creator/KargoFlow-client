import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { ArrowLeft, ArrowRight, CalendarClock, Loader2, RefreshCcw, Search, Mail } from 'lucide-react';

import { useToast } from '../../../shared/context/ToastContext';
import Card from '../../../shared/ui/Card';
import ReportEmailModal from '../components/ReportEmailModal';
import { getBranchLookups, getOpportunityBookedByDateReport, sendReportEmail } from '../../../services/api';
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

const asList = (value) => (Array.isArray(value?.rows) ? value.rows : Array.isArray(value?.results) ? value.results : Array.isArray(value) ? value : []);
const formatOptions = [{ value: 'csv', label: 'CSV' }, { value: 'xlsx', label: 'Excel' }];
const rowsToSheet = (rows, columns) => XLSX.utils.aoa_to_sheet([columns.map((c) => c.header), ...rows.map((row) => columns.map((c) => c.value(row)))]);

const toDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
};

const OpportunitiesBookedByDateReport = () => {
  const { showToast } = useToast();
  const todayRange = initialDateRange();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailDraft, setEmailDraft] = useState({ email: '', format: 'xlsx' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filters, setFilters] = useState({
    startDate: todayRange.startDate,
    endDate: todayRange.endDate,
    branchId: '',
    pageSize: 25,
  });
  const [draft, setDraft] = useState({
    startDate: todayRange.startDate,
    endDate: todayRange.endDate,
    branchId: '',
    pageSize: 25,
  });

  const loadBranches = async () => {
    try {
      const response = await getBranchLookups({ limit: 250 });
      setBranches(asList(response?.data || response || {}));
    } catch (err) {
      console.error('Unable to load branches:', err);
    }
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      const response = await getOpportunityBookedByDateReport({
        start_date: filters.startDate,
        end_date: filters.endDate,
        ...(filters.branchId ? { branch_id: filters.branchId } : {}),
      });
      const data = response?.data || response || {};
      setRows(asList(data.rows));
      setCount(Number(data.count || 0));
      setPageSize(Number(filters.pageSize || 25));
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Unable to load opportunities booked report.', 'error', 5000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      branchId: String(draft.branchId || ''),
      pageSize: Number(draft.pageSize) || 25,
    });
    window.setTimeout(loadReport, 0);
  };

  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  const visibleRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);
  const emailColumns = [
    { header: 'Opportunity', value: (row) => row.sales_number || row.opportunity_number || row.id || '' },
    { header: 'Customer', value: (row) => row.customer_name || '' },
    { header: 'Branch', value: (row) => row.branch_name || '' },
    { header: 'Service Type', value: (row) => row.service_type || '' },
    { header: 'Booked At', value: (row) => toDate(row.booked_at) },
    { header: 'Move Date', value: (row) => toDate(row.move_date) },
    { header: 'Status', value: (row) => row.status || '' },
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
      filename = 'opportunities-booked-by-date.csv';
      content_type = 'text/csv';
    } else {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, rowsToSheet(rows, emailColumns), 'Booked Opportunities');
      const bytes = new Uint8Array(XLSX.write(wb, { bookType: 'xlsx', type: 'array' }));
      let binary = '';
      bytes.forEach((b) => { binary += String.fromCharCode(b); });
      content_b64 = window.btoa(binary);
      filename = 'opportunities-booked-by-date.xlsx';
      content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
    await sendReportEmail({ to_email: toEmail, subject: `Opportunities Booked By Date (${draft.startDate} to ${draft.endDate})`, body: 'Attached is the opportunities booked by date report.', filename, content_type, content_b64 });
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
            <p className="text-sm uppercase tracking-wide text-content-sec">Sales</p>
            <h1 className="text-3xl font-bold text-heading">Opportunities Booked By Date</h1>
          </div>
          <button type="button" onClick={loadReport} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
            Refresh
          </button>
          <button type="button" onClick={() => setEmailModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold">
            <Mail size={16} /> Email Report
          </button>
        </div>
      </header>
      <ReportEmailModal open={emailModalOpen} title="Email Opportunities Booked By Date" email={emailDraft.email} setEmail={(value) => setEmailDraft((prev) => ({ ...prev, email: value }))} format={emailDraft.format} setFormat={(value) => setEmailDraft((prev) => ({ ...prev, format: value }))} onClose={() => setEmailModalOpen(false)} onSend={sendEmailReport} sending={loading} formats={formatOptions} />

      <Card title="Report Filters">
        <form className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4" onSubmit={applyFilters}>
          <label className="space-y-2">
            <span className="text-sm font-medium text-content-main flex items-center gap-2"><CalendarClock size={16} /> Start Date</span>
            <input type="date" value={draft.startDate} onChange={(e) => setDraft((v) => ({ ...v, startDate: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white" required />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-content-main flex items-center gap-2"><CalendarClock size={16} /> End Date</span>
            <input type="date" value={draft.endDate} onChange={(e) => setDraft((v) => ({ ...v, endDate: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white" required />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-content-main">Branch</span>
            <select value={draft.branchId} onChange={(e) => setDraft((v) => ({ ...v, branchId: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white">
              <option value="">All Branches</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name || `Branch ${branch.id}`}</option>)}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-content-main">Rows Per Page</span>
            <select value={draft.pageSize} onChange={(e) => setDraft((v) => ({ ...v, pageSize: Number(e.target.value) }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white">
              {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <div className="md:col-span-2 xl:col-span-4 flex items-center justify-end">
            <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800">
              <Search size={16} />
              Apply Filters
            </button>
          </div>
        </form>
      </Card>

      <Card title="Booked Opportunities" extraHeader={<span className="text-sm text-content-sec">Page {page} of {pageCount} ({count} total)</span>}>
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-content-sec border-b">
                <th className="py-3 pr-4 font-semibold">Opportunity</th>
                <th className="py-3 pr-4 font-semibold">Customer</th>
                <th className="py-3 pr-4 font-semibold">Branch</th>
                <th className="py-3 pr-4 font-semibold">Service Type</th>
                <th className="py-3 pr-4 font-semibold">Booked At</th>
                <th className="py-3 pr-4 font-semibold">Move Date</th>
                <th className="py-3 pr-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length ? visibleRows.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-3 pr-4">{row.sales_number || row.opportunity_number || row.id}</td>
                  <td className="py-3 pr-4">{row.customer_name || '-'}</td>
                  <td className="py-3 pr-4">{row.branch_name || '-'}</td>
                  <td className="py-3 pr-4">{row.service_type || '-'}</td>
                  <td className="py-3 pr-4">{toDate(row.booked_at)}</td>
                  <td className="py-3 pr-4">{toDate(row.move_date)}</td>
                  <td className="py-3 pr-4 capitalize">{row.status || '-'}</td>
                </tr>
              )) : (
                <tr><td className="py-6 text-content-sec" colSpan={7}>{loading ? 'Loading booked opportunities...' : 'No booked opportunities for the selected range.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-content-sec">Loaded {visibleRows.length} of {count}</div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage((v) => Math.max(1, v - 1))} disabled={page <= 1} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:opacity-50"><ArrowLeft size={16} />Previous</button>
            <button type="button" onClick={() => setPage((v) => Math.min(pageCount, v + 1))} disabled={page >= pageCount} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:opacity-50">Next<ArrowRight size={16} /></button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default OpportunitiesBookedByDateReport;
