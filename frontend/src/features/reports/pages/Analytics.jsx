import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart2, CalendarRange, ChevronRight, Coins, Truck, CalendarCheck2, UsersRound, Activity, CalendarClock, LogIn, WalletCards, UserPlus, CircleSlash2 } from 'lucide-react';

const REPORTS = [
  {
    id: 'sales-rep-performance',
    title: 'Sales Rep Performance',
    description: 'Lead conversion, booking totals, and rep-level outcomes in one place.',
    icon: BarChart2,
    path: '/analytics/sales-rep-performance',
    enabled: true,
  },
  {
    id: 'sales-person-activity-summary',
    title: 'Sales Person Activity Summary',
    description: 'Aggregate activity counts, call breakdowns, and booking totals by salesperson.',
    icon: Activity,
    path: '/analytics/sales-person-activity-summary',
    enabled: true,
  },
  {
    id: 'sales-person-activity-details',
    title: 'Sales Person Activity Details',
    description: 'Detailed activity timeline for a salesperson on a selected day.',
    icon: CalendarClock,
    path: '/analytics/sales-person-activity-details',
    enabled: true,
  },
  {
    id: 'login-history',
    title: 'Login History',
    description: 'Chronological login audit trail with IP address and application.',
    icon: LogIn,
    path: '/analytics/login-history',
    enabled: true,
  },
  {
    id: 'new-leads',
    title: 'New Leads',
    description: 'Recent incoming leads with customer and move details.',
    icon: UserPlus,
    path: '/analytics/new-leads',
    enabled: true,
  },
  {
    id: 'cancellation-details',
    title: 'Cancellation Details',
    description: 'Cancelled opportunities with reason, amount, and contact details.',
    icon: CircleSlash2,
    path: '/analytics/cancellation-details',
    enabled: true,
  },
  {
    id: 'opportunities-booked-by-date',
    title: 'Opportunities Booked By Date',
    description: 'Booked opportunities grouped by booked date.',
    icon: CalendarCheck2,
    path: '/analytics/opportunities-booked-by-date',
    enabled: true,
  },
  {
    id: 'jobs-by-service-date',
    title: 'Jobs By Service Date',
    description: 'Scheduled jobs grouped by service date.',
    icon: Truck,
    path: '/analytics/jobs-by-service-date',
    enabled: true,
  },
  {
    id: 'payment-in-out',
    title: 'Payment In / Out',
    description: 'Incoming payments, outgoing refunds, and net cash movement.',
    icon: Coins,
    path: '/analytics/payment-in-out',
    enabled: true,
  },
  {
    id: 'outstanding-balances',
    title: 'Outstanding Balances',
    description: 'Open invoices, collected payments, and remaining balances.',
    icon: WalletCards,
    path: '/analytics/outstanding-balances',
    enabled: true,
  },
];

const Analytics = () => {
  return (
    <div className="space-y-6">
      <header className="bg-brand-surface rounded-2xl p-6">
        <p className="text-sm uppercase tracking-wide text-content-sec">Analytics</p>
        <h1 className="text-3xl font-bold text-heading mt-2">Reports</h1>
        <p className="mt-2 text-content-sec max-w-2xl">
          Pick a report to open its dedicated view with report-specific filters and export controls.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {REPORTS.map((report) => {
          const ReportIcon = report.icon;

          if (!report.enabled) {
            return (
              <div
                key={report.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 opacity-70"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-content-sec">Report</p>
                    <p className="mt-1 text-lg font-semibold text-heading">{report.title}</p>
                    <p className="mt-2 text-sm text-content-sec">{report.description}</p>
                    <p className="mt-3 text-xs font-semibold text-content-sec">Coming soon</p>
                  </div>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <ReportIcon size={18} />
                  </span>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={report.id}
              to={report.path}
              className="block rounded-2xl border border-slate-200 bg-white p-5 transition hover:bg-slate-50 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-wide text-content-sec">Report</p>
                  <p className="mt-1 text-lg font-semibold text-heading">{report.title}</p>
                  <p className="mt-2 text-sm text-content-sec">{report.description}</p>
                </div>
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ReportIcon size={18} />
                </div>
              </div>

              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                Open report <ChevronRight size={16} />
              </div>
            </Link>
          );
        })}
      </section>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-content-sec">
        <p className="inline-flex items-center gap-2">
          <CalendarRange size={16} />
          <span>More reports can be added here as standalone pages in the same pattern.</span>
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-content-sec">
        <p className="inline-flex items-center gap-2">
          <UsersRound size={16} />
          <span>Each report page can define its own filters, pagination, and export actions.</span>
        </p>
      </div>
    </div>
  );
};

export default Analytics;
