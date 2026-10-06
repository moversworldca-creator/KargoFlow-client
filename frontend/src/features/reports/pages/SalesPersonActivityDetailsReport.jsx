import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, RefreshCcw } from 'lucide-react';

import { useToast } from '../../../shared/context/ToastContext';
import Card from '../../../shared/ui/Card';
import { getLookupUsers, getSalesPersonActivityDetails } from '../../../services/api';

const asList = (value) => {
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.rows)) return value.rows;
  if (Array.isArray(value)) return value;
  return [];
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const SalesPersonActivityDetailsReport = () => {
  const { showToast } = useToast();
  const [salesPeople, setSalesPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', salespersonId: '' });

  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 1);
    const toDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    setFilters({ startDate: toDate(start), endDate: toDate(end), salespersonId: '' });
    Promise.all([getLookupUsers({ limit: 250 })])
      .then(([u]) => {
        setSalesPeople(asList(u?.data || u || {}));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!filters.salespersonId && salesPeople.length) {
      setFilters((prev) => ({ ...prev, salespersonId: String(salesPeople[0].id || '') }));
    }
  }, [salesPeople, filters.salespersonId]);

  const load = async () => {
    setLoading(true);
    try {
      const response = await getSalesPersonActivityDetails({
        start_date: filters.startDate,
        end_date: filters.endDate,
        salesperson_id: filters.salespersonId || undefined,
      });
      setRows(asList(response?.data || response || {}));
    } catch (err) {
      showToast(err?.response?.data?.detail || 'Unable to load activity details.', 'error', 5000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filters.startDate && filters.endDate && filters.salespersonId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.startDate, filters.endDate, filters.salespersonId]);

  return (
    <div className="space-y-6">
      <header className="bg-brand-surface rounded-2xl p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Link to="/analytics" className="inline-flex items-center gap-2 text-sm font-semibold text-content-sec hover:text-primary">
              <ArrowLeft size={16} /> Back to Reports
            </Link>
            <p className="text-sm uppercase tracking-wide text-content-sec">Reporting</p>
            <h1 className="text-3xl font-bold text-heading">Sales Person Activity Details</h1>
          </div>
          <button type="button" onClick={load} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />} Refresh
          </button>
        </div>
      </header>

      <Card title="Filters">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="date" value={filters.startDate} onChange={(e) => setFilters((v) => ({ ...v, startDate: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2" />
          <input type="date" value={filters.endDate} onChange={(e) => setFilters((v) => ({ ...v, endDate: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2" />
          <select value={filters.salespersonId} onChange={(e) => setFilters((v) => ({ ...v, salespersonId: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2">
            <option value="" disabled>Select a salesperson</option>
            {salesPeople.map((user) => (
              <option key={user.id} value={user.id}>
                {user.label || user.full_name || [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.email || `User ${user.id}`}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card title="Activity Timeline">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead><tr className="text-left border-b"><th className="py-3 pr-4 font-semibold">Activity Time</th><th className="py-3 pr-4 font-semibold">Details</th></tr></thead>
            <tbody>
              {rows.length ? rows.map((row, index) => (
                <tr key={`${row.activity_time || 'activity'}-${row.details || 'details'}-${index}`} className="border-b">
                  <td className="py-3 pr-4">{formatDateTime(row.activity_time)}</td>
                  <td className="py-3 pr-4">{row.details}</td>
                </tr>
              )) : <tr><td colSpan={2} className="py-8 text-content-sec">{loading ? 'Loading activity details...' : 'No activity details for the selected person and date range.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default SalesPersonActivityDetailsReport;
