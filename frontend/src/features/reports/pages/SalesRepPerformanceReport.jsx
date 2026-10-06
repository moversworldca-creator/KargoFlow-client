import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  ArrowLeft,
  ArrowRight,
  BarChart2,
  CalendarClock,
  Loader2,
  RefreshCcw,
  Search,
  TrendingUp,
  Users,
  Mail,
} from 'lucide-react';

import { useToast } from '../../../shared/context/ToastContext';
import Card from '../../../shared/ui/Card';
import ReportEmailModal from '../components/ReportEmailModal';
import {
  getBranchLookups,
  getLookupUsers,
  getSalesPersonPerformanceRecords,
  getSalesPersonPerformanceSummary,
  sendReportEmail,
} from '../../../services/api';
import { rowsToCsv } from '../utils/reportEmail';

const ORDER_BY_OPTIONS = [
  { value: 'received_at', label: 'Received At' },
  { value: 'salesperson_name', label: 'Sales Rep' },
  { value: 'customer_name', label: 'Customer' },
  { value: 'outcome', label: 'Outcome' },
  { value: 'booked_value', label: 'Booked Value' },
];

const OUTCOME_OPTIONS = [
  { value: '', label: 'All Outcomes' },
  { value: 'bad', label: 'Bad' },
  { value: 'pending', label: 'Pending' },
  { value: 'booked', label: 'Booked' },
  { value: 'lost', label: 'Lost' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200];

const toInputDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  return [];
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDateString = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const toDateTimeString = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const toMoney = (value) => {
  const amount = toNumber(value);
  return amount.toLocaleString('en-CA', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
};

const toPercent = (value) => {
  const amount = toNumber(value);
  return `${amount.toFixed(1)}%`;
};

const formatUserOption = (user) => {
  const fullName = String(user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim()).trim();
  const fallback = String(user?.email || `User #${user?.id || 'Unknown'}`);
  return `${fullName || fallback} (${fallback})`;
};

const formatCustomerDetails = (row) => {
  const details = [row?.customer_name, row?.email, row?.phone]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  return details.length ? details.join(' | ') : '-';
};

const initialDateRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  return {
    startDate: toInputDate(start),
    endDate: toInputDate(end),
  };
};

const formatOptions = [
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'Excel' },
];

const toCsvValue = (value) => {
  if (value === null || value === undefined) return '';
  const raw = String(value);
  const escaped = raw.replace(/"/g, '""');
  return /[",\n\r]/.test(raw) ? `"${escaped}"` : escaped;
};

const rowsToSheet = (rows, columns) => {
  const headerRow = columns.map((column) => column.header);
  const data = [headerRow, ...rows.map((row) => columns.map((column) => column.value(row)))];
  return XLSX.utils.aoa_to_sheet(data);
};

const SalesRepPerformanceReport = () => {
  const { showToast } = useToast();
  const todayRange = initialDateRange();
  const [filterInputs, setFilterInputs] = useState({
    startDate: todayRange.startDate,
    endDate: todayRange.endDate,
    branchId: '',
    salespersonId: '',
    outcome: '',
    orderBy: 'received_at',
    descending: true,
    pageSize: 50,
  });
  const [activeFilters, setActiveFilters] = useState({
    ...todayRange,
    branchId: '',
    salespersonId: '',
    outcome: '',
    orderBy: 'received_at',
    descending: true,
    pageSize: 50,
  });
  const [recordsPage, setRecordsPage] = useState(1);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailDraft, setEmailDraft] = useState({ email: '', format: 'xlsx' });
  const [loading, setLoading] = useState({
    lookups: false,
    summary: false,
    records: false,
  });
  const [summary, setSummary] = useState({ rows: [], totals: null, start_date: null, end_date: null });
  const [records, setRecords] = useState({ rows: [], count: 0, page: 1, page_size: 50 });
  const [branchLookups, setBranchLookups] = useState([]);
  const [salesPeople, setSalesPeople] = useState([]);

  const loadLookups = useCallback(async () => {
    setLoading((prev) => ({ ...prev, lookups: true }));
    try {
      const [branchesResp, usersResp] = await Promise.all([
        getBranchLookups({ limit: 250 }),
        getLookupUsers({ limit: 250 }),
      ]);
      setBranchLookups(asArray(branchesResp));
      setSalesPeople(asArray(usersResp));
    } catch (err) {
      showToast('Unable to load report filters.', 'error', 4000);
      console.error('Failed to load report lookups:', err);
    } finally {
      setLoading((prev) => ({ ...prev, lookups: false }));
    }
  }, [showToast]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  const summaryRequestParams = useMemo(() => {
    const branchId = Number(activeFilters.branchId);
    const salespersonId = Number(activeFilters.salespersonId);
    return {
      start_date: activeFilters.startDate,
      end_date: activeFilters.endDate,
      ...(Number.isFinite(branchId) && branchId > 0 ? { branch_id: branchId } : {}),
      ...(Number.isFinite(salespersonId) && salespersonId > 0 ? { salesperson_id: salespersonId } : {}),
    };
  }, [activeFilters]);

  const recordsRequestParams = useMemo(() => {
    const branchId = Number(activeFilters.branchId);
    const salespersonId = Number(activeFilters.salespersonId);
    const pageSize = Number(activeFilters.pageSize) || 50;
    return {
      start_date: activeFilters.startDate,
      end_date: activeFilters.endDate,
      page: recordsPage,
      page_size: pageSize,
      order_by: activeFilters.orderBy || 'received_at',
      descending: activeFilters.descending ? 'true' : 'false',
      ...(activeFilters.outcome ? { outcome: activeFilters.outcome } : {}),
      ...(Number.isFinite(branchId) && branchId > 0 ? { branch_id: branchId } : {}),
      ...(Number.isFinite(salespersonId) && salespersonId > 0 ? { salesperson_id: salespersonId } : {}),
    };
  }, [activeFilters, recordsPage]);

  const loadReportData = useCallback(async () => {
    setLoading((prev) => ({ ...prev, summary: true, records: true }));
    try {
      const [summaryResponse, recordsResponse] = await Promise.all([
        getSalesPersonPerformanceSummary(summaryRequestParams),
        getSalesPersonPerformanceRecords(recordsRequestParams),
      ]);

      const nextSummary = summaryResponse?.data || summaryResponse || {};
      const nextRecords = recordsResponse?.data || recordsResponse || {};
      setSummary({
        rows: asArray(nextSummary.rows),
        totals: nextSummary.totals || null,
        start_date: nextSummary.start_date || null,
        end_date: nextSummary.end_date || null,
      });
      setRecords({
        rows: asArray(nextRecords.rows),
        count: toNumber(nextRecords.count),
        page: toNumber(nextRecords.page) || recordsPage,
        page_size: toNumber(nextRecords.page_size) || Number(activeFilters.pageSize),
      });
    } catch (err) {
      setSummary((prev) => ({ ...prev, rows: [], totals: null }));
      setRecords((prev) => ({ ...prev, rows: [], count: 0, page: 1 }));
      showToast(err?.response?.data?.detail || 'Failed to load sales performance report.', 'error', 5000);
      console.error('Failed to load sales performance report:', err);
    } finally {
      setLoading((prev) => ({ ...prev, summary: false, records: false }));
    }
  }, [
    showToast,
    summaryRequestParams,
    recordsRequestParams,
    recordsPage,
    activeFilters.pageSize,
  ]);

  useEffect(() => {
    if (!activeFilters.startDate || !activeFilters.endDate) return;
    loadReportData();
  }, [loadReportData, activeFilters]);

  const onApplyFilters = useCallback(
    (event) => {
      event.preventDefault();
      const start = new Date(filterInputs.startDate);
      const end = new Date(filterInputs.endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
        showToast('Invalid date range. Start date cannot be after end date.', 'warning', 3000);
        return;
      }
      setRecordsPage(1);
      setActiveFilters({
        ...filterInputs,
        branchId: String(filterInputs.branchId || ''),
        salespersonId: String(filterInputs.salespersonId || ''),
        outcome: String(filterInputs.outcome || ''),
        orderBy: String(filterInputs.orderBy || 'received_at'),
        descending: Boolean(filterInputs.descending),
        pageSize: Number(filterInputs.pageSize) || 50,
      });
    },
    [filterInputs, showToast],
  );

  const pageCount = useMemo(() => {
    const pageSize = Number(records.page_size || activeFilters.pageSize || 50);
    if (!pageSize) return 1;
    return Math.max(1, Math.ceil((records.count || 0) / pageSize));
  }, [records.count, records.page_size, activeFilters.pageSize]);

  const goPreviousPage = useCallback(() => {
    setRecordsPage((value) => Math.max(1, value - 1));
  }, []);

  const goNextPage = useCallback(() => {
    setRecordsPage((value) => Math.min(pageCount, value + 1));
  }, [pageCount]);

  useEffect(() => {
    if (recordsPage > pageCount) {
      setRecordsPage(pageCount);
    }
  }, [recordsPage, pageCount]);

  const totalsRow = summary.totals
    ? {
        salesperson_name: summary.totals.salesperson_name || 'Total',
        leads_received: toNumber(summary.totals.leads_received),
        bad: toNumber(summary.totals.bad),
        sent: toNumber(summary.totals.sent),
        pending: toNumber(summary.totals.pending),
        booked: toNumber(summary.totals.booked),
        booked_percent: toNumber(summary.totals.booked_percent),
        lost: toNumber(summary.totals.lost),
        cancelled: toNumber(summary.totals.cancelled),
        booked_total: toNumber(summary.totals.booked_total),
        average_booking: toNumber(summary.totals.average_booking),
      }
    : null;

  const fetchAllRecordsForExport = useCallback(async () => {
    const baseParams = {
      ...recordsRequestParams,
      page: 1,
      page_size: 500,
    };
    const firstResponse = await getSalesPersonPerformanceRecords(baseParams);
    const firstData = firstResponse?.data || firstResponse || {};
    const totalCount = toNumber(firstData.count);
    const pageSize = toNumber(firstData.page_size) || 500;
    const rows = asArray(firstData.rows);

    if (!totalCount || rows.length >= totalCount) {
      return rows;
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const remainingRequests = [];
    for (let page = 2; page <= totalPages; page += 1) {
      remainingRequests.push(
        getSalesPersonPerformanceRecords({
          ...baseParams,
          page,
        }),
      );
    }

    const remainingResponses = await Promise.all(remainingRequests);
    const remainingRows = remainingResponses.flatMap((response) => asArray(response?.data || response || {}));
    return [...rows, ...remainingRows];
  }, [recordsRequestParams]);

  const onEmailReport = useCallback(async () => {
    setEmailModalOpen(true);
  }, []);

  const sendEmailReport = useCallback(async () => {
    const toEmail = String(emailDraft.email || '').trim();
    if (!toEmail) {
      showToast('Enter an email address.', 'warning', 3000);
      return;
    }
    const attachmentFormat = emailDraft.format === 'csv' ? 'csv' : 'xlsx';

    try {
      const rows = await fetchAllRecordsForExport();
      const subject = `Sales Rep Performance Report (${activeFilters.startDate} to ${activeFilters.endDate})`;
      const csvColumns = [
        { header: 'Lead ID', value: (row) => row.lead_id || '' },
        { header: 'Sales Representative', value: (row) => row.salesperson_name || '' },
        { header: 'Branch', value: (row) => row.branch_name || '' },
        { header: 'Customer Name', value: (row) => row.customer_name || '' },
        { header: 'Customer Details', value: (row) => formatCustomerDetails(row) },
        { header: 'Outcome', value: (row) => row.outcome || '' },
        { header: 'Received At', value: (row) => toDateTimeString(row.received_at) },
        { header: 'Move Date', value: (row) => toDateString(row.move_date) },
        { header: 'Booked At', value: (row) => toDateTimeString(row.booked_at) },
        { header: 'Booked Value', value: (row) => toMoney(row.booked_value) },
      ];
      let attachmentContent;
      let filename;
      let contentType;

      if (attachmentFormat === 'csv') {
        const csv = rowsToCsv(rows, csvColumns);
        attachmentContent = window.btoa(unescape(encodeURIComponent(csv)));
        filename = 'sales-rep-performance-records.csv';
        contentType = 'text/csv';
      } else {
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, rowsToSheet(rows, csvColumns), 'Records');
        const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        bytes.forEach((byte) => {
          binary += String.fromCharCode(byte);
        });
        attachmentContent = window.btoa(binary);
        filename = 'sales-rep-performance-records.xlsx';
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      }

      await sendReportEmail({
        to_email: toEmail,
        subject,
        body: `Attached is the sales rep performance report for ${activeFilters.startDate} to ${activeFilters.endDate}.`,
        filename,
        content_type: contentType,
        content_b64: attachmentContent,
        ...(activeFilters.branchId ? { branch_id: Number(activeFilters.branchId) } : {}),
      });
      showToast('Report emailed successfully.', 'success', 3000);
      setEmailModalOpen(false);
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Failed to email report.', 'error', 5000);
    }
  }, [
    activeFilters.branchId,
    activeFilters.endDate,
    activeFilters.startDate,
    emailDraft.email,
    emailDraft.format,
    fetchAllRecordsForExport,
    showToast,
  ]);

  return (
    <div className="space-y-6">
      <header className="bg-brand-surface rounded-2xl p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Link
              to="/analytics"
              className="inline-flex items-center gap-2 text-sm font-semibold text-content-sec hover:text-primary"
            >
              <ArrowLeft size={16} />
              Back to Reports
            </Link>
            <p className="text-sm uppercase tracking-wide text-content-sec">Sales</p>
            <h1 className="text-3xl font-bold text-heading">Sales Rep Performance</h1>
            <p className="mt-2 text-content-sec">
              Filter by date range, branch, sales rep, and outcome to review lead conversion and booking details.
            </p>
          </div>
          <button
            type="button"
            onClick={loadReportData}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark disabled:opacity-60"
            disabled={loading.summary || loading.records}
          >
            {loading.summary || loading.records ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCcw size={16} />
            )}
            Refresh
          </button>
          <button
            type="button"
            onClick={onEmailReport}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50"
          >
            <Mail size={16} />
            Email Report
          </button>
        </div>
      </header>
      <ReportEmailModal
        open={emailModalOpen}
        title="Email Sales Rep Performance Report"
        email={emailDraft.email}
        setEmail={(value) => setEmailDraft((prev) => ({ ...prev, email: value }))}
        format={emailDraft.format}
        setFormat={(value) => setEmailDraft((prev) => ({ ...prev, format: value }))}
        onClose={() => setEmailModalOpen(false)}
        onSend={sendEmailReport}
        sending={loading.summary || loading.records}
        formats={formatOptions}
      />

      <Card title="Report Filters">
        <form className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4" onSubmit={onApplyFilters}>
          <label className="space-y-2">
            <span className="text-sm font-medium text-content-main flex items-center gap-2">
              <CalendarClock size={16} />
              Start Date
            </span>
            <input
              type="date"
              value={filterInputs.startDate}
              onChange={(e) => setFilterInputs((value) => ({ ...value, startDate: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white"
              required
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-content-main flex items-center gap-2">
              <CalendarClock size={16} />
              End Date
            </span>
            <input
              type="date"
              value={filterInputs.endDate}
              onChange={(e) => setFilterInputs((value) => ({ ...value, endDate: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white"
              required
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-content-main">Branch</span>
            <select
              value={filterInputs.branchId}
              onChange={(e) => setFilterInputs((value) => ({ ...value, branchId: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white"
            >
              <option value="">All Branches</option>
              {branchLookups.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name || `Branch ${branch.id}`}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-content-main">Sales Representative</span>
            <select
              value={filterInputs.salespersonId}
              onChange={(e) => setFilterInputs((value) => ({ ...value, salespersonId: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white"
            >
              <option value="">All Reps</option>
              {salesPeople.map((person) => (
                <option key={person.id} value={person.id}>
                  {formatUserOption(person)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-content-main">Outcome</span>
            <select
              value={filterInputs.outcome}
              onChange={(e) => setFilterInputs((value) => ({ ...value, outcome: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white"
            >
              {OUTCOME_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-content-main">Order By</span>
            <select
              value={filterInputs.orderBy}
              onChange={(e) => setFilterInputs((value) => ({ ...value, orderBy: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white"
            >
              {ORDER_BY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-content-main">Rows Per Page</span>
            <select
              value={filterInputs.pageSize}
              onChange={(e) => setFilterInputs((value) => ({ ...value, pageSize: Number(e.target.value) }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 bg-white"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 flex flex-col">
            <span className="text-sm font-medium text-content-main">Sort Direction</span>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={filterInputs.descending}
                  onChange={() => setFilterInputs((value) => ({ ...value, descending: true }))}
                />
                Descending
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={!filterInputs.descending}
                  onChange={() => setFilterInputs((value) => ({ ...value, descending: false }))}
                />
                Ascending
              </label>
            </div>
          </label>
          <div className="md:col-span-2 xl:col-span-4 flex items-center justify-end pt-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
            >
              <Search size={16} />
              Apply Filters
            </button>
          </div>
        </form>
      </Card>

      <Card
        title="Summary"
        extraHeader={
          summary.start_date && summary.end_date ? (
            <span className="text-sm text-content-sec">
              Showing {summary.start_date} to {summary.end_date}
            </span>
          ) : null
        }
      >
        {loading.summary ? (
          <div className="flex items-center justify-center py-8 text-content-sec">
            <Loader2 size={20} className="animate-spin" />
            <span className="ml-2">Loading summary...</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-content-sec flex items-center gap-2">
                  <Users size={16} />
                  Total Leads
                </p>
                <p className="mt-2 text-2xl font-bold text-heading">
                  {toNumber(summary.totals?.leads_received).toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-content-sec flex items-center gap-2">
                  <TrendingUp size={16} />
                  Booked Value
                </p>
                <p className="mt-2 text-2xl font-bold text-heading">
                  {toMoney(summary.totals?.booked_total || 0)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-content-sec flex items-center gap-2">
                  <BarChart2 size={16} />
                  Average Booking
                </p>
                <p className="mt-2 text-2xl font-bold text-heading">
                  {toMoney(summary.totals?.average_booking || 0)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-content-sec">Booked Count</p>
                <p className="mt-2 text-2xl font-bold text-heading">
                  {toNumber(summary.totals?.booked).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-[900px] w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-content-sec border-b">
                    <th className="py-3 pr-4 font-semibold">Sales Rep</th>
                    <th className="py-3 pr-4 font-semibold">Leads</th>
                    <th className="py-3 pr-4 font-semibold">Booked</th>
                    <th className="py-3 pr-4 font-semibold">Booked %</th>
                    <th className="py-3 pr-4 font-semibold">Booked Total</th>
                    <th className="py-3 pr-4 font-semibold">Avg Booking</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.rows.length === 0 ? (
                    <tr>
                      <td className="py-6 text-content-sec" colSpan={6}>
                        No summary records for this date range.
                      </td>
                    </tr>
                  ) : (
                    summary.rows.map((row, index) => (
                      <tr key={`${row.salesperson_id || 'unassigned'}-${row.salesperson_name || 'row'}-${index}`} className="border-b">
                        <td className="py-3 pr-4">{row.salesperson_name || 'Unknown'}</td>
                        <td className="py-3 pr-4">{toNumber(row.leads_received).toLocaleString()}</td>
                        <td className="py-3 pr-4">{toNumber(row.booked).toLocaleString()}</td>
                        <td className="py-3 pr-4">{toPercent(row.booked_percent)}</td>
                        <td className="py-3 pr-4">{toMoney(row.booked_total)}</td>
                        <td className="py-3 pr-4">{toMoney(row.average_booking)}</td>
                      </tr>
                    ))
                  )}
                  {totalsRow ? (
                    <tr className="bg-slate-50">
                      <td className="py-3 pr-4 font-semibold">{totalsRow.salesperson_name}</td>
                      <td className="py-3 pr-4 font-semibold">{totalsRow.leads_received.toLocaleString()}</td>
                      <td className="py-3 pr-4 font-semibold">{totalsRow.booked.toLocaleString()}</td>
                      <td className="py-3 pr-4 font-semibold">{toPercent(totalsRow.booked_percent)}</td>
                      <td className="py-3 pr-4 font-semibold">{toMoney(totalsRow.booked_total)}</td>
                      <td className="py-3 pr-4 font-semibold">{toMoney(totalsRow.average_booking)}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Card
        title="Records"
        extraHeader={
          <span className="text-sm text-content-sec">
            {`Page ${records.page} of ${pageCount} (${records.count} total)`}
          </span>
        }
      >
        {loading.records ? (
          <div className="flex items-center justify-center py-8 text-content-sec">
            <Loader2 size={20} className="animate-spin" />
            <span className="ml-2">Loading records...</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-content-sec border-b">
                    <th className="py-3 pr-4 font-semibold">Lead ID</th>
                    <th className="py-3 pr-4 font-semibold">Sales Rep</th>
                    <th className="py-3 pr-4 font-semibold">Branch</th>
                    <th className="py-3 pr-4 font-semibold">Customer Name</th>
                    <th className="py-3 pr-4 font-semibold">Customer Details</th>
                    <th className="py-3 pr-4 font-semibold">Outcome</th>
                    <th className="py-3 pr-4 font-semibold">Received At</th>
                    <th className="py-3 pr-4 font-semibold">Move Date</th>
                    <th className="py-3 pr-4 font-semibold">Booked At</th>
                    <th className="py-3 pr-4 font-semibold text-right">Booked Value</th>
                  </tr>
                </thead>
                <tbody>
                  {records.rows.length === 0 ? (
                    <tr>
                      <td className="py-6 text-content-sec" colSpan={10}>
                        No records for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    records.rows.map((row, index) => (
                      <tr key={`${row.lead_id || row.id || 'lead'}-${row.customer_name || 'customer'}-${row.received_at || 'date'}-${index}`} className="border-b">
                        <td className="py-3 pr-4">{row.lead_id || '-'}</td>
                        <td className="py-3 pr-4">{row.salesperson_name || '-'}</td>
                        <td className="py-3 pr-4">{row.branch_name || '-'}</td>
                        <td className="py-3 pr-4">{row.customer_name || '-'}</td>
                        <td className="py-3 pr-4 text-xs text-content-sec">{formatCustomerDetails(row)}</td>
                        <td className="py-3 pr-4 capitalize">{row.outcome || '-'}</td>
                        <td className="py-3 pr-4">{toDateTimeString(row.received_at)}</td>
                        <td className="py-3 pr-4">{toDateString(row.move_date)}</td>
                        <td className="py-3 pr-4">{toDateTimeString(row.booked_at)}</td>
                        <td className="py-3 pr-4 text-right">{toMoney(row.booked_value)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-content-sec">
                Loaded {records.rows.length} of {records.count}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goPreviousPage}
                  disabled={recordsPage <= 1}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:opacity-50"
                >
                  <ArrowLeft size={16} />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={goNextPage}
                  disabled={recordsPage >= pageCount}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:opacity-50"
                >
                  Next
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default SalesRepPerformanceReport;
