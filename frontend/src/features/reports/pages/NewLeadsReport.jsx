import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { ArrowLeft, ArrowLeft as PrevIcon, ArrowRight, Loader2, RefreshCcw, Search, Mail } from 'lucide-react';

import { useToast } from '../../../shared/context/ToastContext';
import Card from '../../../shared/ui/Card';
import ReportEmailModal from '../components/ReportEmailModal';
import { getBranchLookups, getNewLeadsReport, sendReportEmail } from '../../../services/api';
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
  start.setDate(end.getDate() - 1);
  return { startDate: toInputDate(start), endDate: toInputDate(end) };
};

const asList = (value) => (Array.isArray(value?.rows) ? value.rows : Array.isArray(value?.results) ? value.results : Array.isArray(value) ? value : []);

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

const formatOptions = [{ value: 'csv', label: 'CSV' }, { value: 'xlsx', label: 'Excel' }];
const rowsToSheet = (rows, columns) => XLSX.utils.aoa_to_sheet([columns.map((c) => c.header), ...rows.map((row) => columns.map((c) => c.value(row)))]);

const NewLeadsReport = () => {
  const { showToast } = useToast();
  const todayRange = initialDateRange();
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
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
    branchId: '',
  });
  const [draft, setDraft] = useState({
    startDate: todayRange.startDate,
    endDate: todayRange.endDate,
    pageSize: 50,
    branchId: '',
  });

  useEffect(() => {
    getBranchLookups({ limit: 250 })
      .then((response) => setBranches(asList(response?.data || response || {})))
      .catch(() => {});
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const response = await getNewLeadsReport({
        start_date: filters.startDate,
        end_date: filters.endDate,
        ...(filters.branchId ? { branch_id: filters.branchId } : {}),
        page,
        page_size: filters.pageSize,
      });
      const data = response?.data || response || {};
      setRows(asList(data.rows));
      setCount(Number(data.count || 0));
      setPageSize(Number(data.page_size || filters.pageSize || 50));
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Unable to load new leads report.', 'error', 5000);
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
      branchId: String(draft.branchId || ''),
    });
  };

  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  const visibleRows = useMemo(() => rows, [rows]);
  const emailColumns = [
    { header: 'Quote #', value: (row) => row.sales_number || row.lead_id || '' },
    { header: 'Customer Name', value: (row) => row.customer_name || '' },
    { header: 'Customer Email', value: (row) => row.email || '' },
    { header: 'Customer Phone', value: (row) => row.phone || '' },
    { header: 'Referral Source', value: (row) => row.referral_source || '' },
    { header: 'Received At', value: (row) => fmt(row.received_at) },
    { header: 'Move Date', value: (row) => row.move_date || '' },
    { header: 'Origin', value: (row) => row.origin_address || '' },
    { header: 'Destination', value: (row) => row.destination_address || '' },
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
      filename = 'new-leads.csv';
      content_type = 'text/csv';
    } else {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, rowsToSheet(rows, emailColumns), 'New Leads');
      const bytes = new Uint8Array(XLSX.write(wb, { bookType: 'xlsx', type: 'array' }));
      let binary = '';
      bytes.forEach((b) => { binary += String.fromCharCode(b); });
      content_b64 = window.btoa(binary);
      filename = 'new-leads.xlsx';
      content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
    await sendReportEmail({ to_email: toEmail, subject: `New Leads (${filters.startDate} to ${filters.endDate})`, body: 'Attached is the new leads report.', filename, content_type, content_b64 });
    setEmailModalOpen(false);
    showToast('Report emailed successfully.', 'success', 3000);
  }, [emailColumns, emailDraft.email, emailDraft.format, filters.endDate, filters.startDate, rows, showToast]);

  return (
    <div className="space-y-6">
      <header className="bg-brand-surface rounded-2xl p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Link to="/analytics" className="inline-flex items-center gap-2 text-sm font-semibold text-content-sec hover:text-primary">
              <ArrowLeft size={16} /> Back to Reports
            </Link>
            <p className="text-sm uppercase tracking-wide text-content-sec">Reporting</p>
            <h1 className="text-3xl font-bold text-heading">New Leads</h1>
          </div>
          <button type="button" onClick={loadReport} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />} Refresh
          </button>
          <button type="button" onClick={() => setEmailModalOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold"><Mail size={16} /> Email Report</button>
        </div>
      </header>
      <ReportEmailModal open={emailModalOpen} title="Email New Leads" email={emailDraft.email} setEmail={(value) => setEmailDraft((prev) => ({ ...prev, email: value }))} format={emailDraft.format} setFormat={(value) => setEmailDraft((prev) => ({ ...prev, format: value }))} onClose={() => setEmailModalOpen(false)} onSend={sendEmailReport} sending={loading} formats={formatOptions} />

      <Card title="Filters">
        <form className="grid grid-cols-1 md:grid-cols-4 gap-4" onSubmit={applyFilters}>
          <input type="date" value={draft.startDate} onChange={(e) => setDraft((v) => ({ ...v, startDate: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2" required />
          <input type="date" value={draft.endDate} onChange={(e) => setDraft((v) => ({ ...v, endDate: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2" required />
          <select value={draft.branchId} onChange={(e) => setDraft((v) => ({ ...v, branchId: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 bg-white">
            <option value="">All Branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.label || branch.name || `Branch ${branch.id}`}
              </option>
            ))}
          </select>
          <select value={draft.pageSize} onChange={(e) => setDraft((v) => ({ ...v, pageSize: Number(e.target.value) }))} className="rounded-lg border border-slate-200 px-3 py-2">
            {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
          <div className="md:col-span-4 flex justify-end">
            <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold">
              <Search size={16} /> Apply Filters
            </button>
          </div>
        </form>
      </Card>

      <Card title="New Leads" extraHeader={<span className="text-sm text-content-sec">Page {page} of {pageCount} ({count} total)</span>}>
        <div className="overflow-x-auto">
          <table className="min-w-[1600px] w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-content-sec border-b">
                <th className="py-3 pr-4 font-semibold">Quote #</th>
                <th className="py-3 pr-4 font-semibold">Customer Name</th>
                <th className="py-3 pr-4 font-semibold">Customer Email</th>
                <th className="py-3 pr-4 font-semibold">Customer Phone</th>
                <th className="py-3 pr-4 font-semibold">Referral Source</th>
                <th className="py-3 pr-4 font-semibold">Received At</th>
                <th className="py-3 pr-4 font-semibold">Move Date</th>
                <th className="py-3 pr-4 font-semibold">Origin</th>
                <th className="py-3 pr-4 font-semibold">Destination</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length ? visibleRows.map((row) => (
                <tr key={row.lead_id} className="border-b">
                  <td className="py-3 pr-4">{row.sales_number || row.lead_id}</td>
                  <td className="py-3 pr-4">{row.customer_name || '-'}</td>
                  <td className="py-3 pr-4">{row.email || '-'}</td>
                  <td className="py-3 pr-4">{row.phone || '-'}</td>
                  <td className="py-3 pr-4">{row.referral_source || '-'}</td>
                  <td className="py-3 pr-4">{fmt(row.received_at)}</td>
                  <td className="py-3 pr-4">{row.move_date || '-'}</td>
                  <td className="py-3 pr-4">{row.origin_address || '-'}</td>
                  <td className="py-3 pr-4">{row.destination_address || '-'}</td>
                </tr>
              )) : (
                <tr>
                  <td className="py-6 text-content-sec" colSpan={9}>
                    {loading ? 'Loading new leads...' : 'No new leads for the selected range.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-content-sec">Loaded {visibleRows.length} of {count}</div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage((v) => Math.max(1, v - 1))} disabled={page <= 1} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:opacity-50"><PrevIcon size={16} />Previous</button>
            <button type="button" onClick={() => setPage((v) => Math.min(pageCount, v + 1))} disabled={page >= pageCount} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:opacity-50">Next <ArrowRight size={16} /></button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default NewLeadsReport;
