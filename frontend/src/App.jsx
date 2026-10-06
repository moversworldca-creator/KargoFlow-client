import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './shared/layout/Sidebar';
import Header from './shared/layout/Header';
const Dashboard = React.lazy(() => import('./features/crm/pages/Dashboard'));
const Sales = React.lazy(() => import('./features/crm/pages/Sales'));
const SalesDetail = React.lazy(() => import('./features/crm/pages/SalesDetail'));
const NewLeadPage = React.lazy(() => import('./features/crm/pages/NewLeadPage'));
const CustomerEstimatePortal = React.lazy(() => import('./features/crm/pages/CustomerEstimatePortal'));
const CustomerInventoryPortal = React.lazy(() => import('./features/crm/pages/CustomerInventoryPortal'));
const CustomerContractPortal = React.lazy(() => import('./features/crm/pages/CustomerContractPortal'));
const PublicLeadIntakePage = React.lazy(() => import('./features/crm/pages/PublicLeadIntakePage'));
const CRMHub = React.lazy(() => import('./features/crm/pages/CRMHub'));
const Jobs = React.lazy(() => import('./features/operations/pages/Jobs'));
const JobDetail = React.lazy(() => import('./features/operations/pages/JobDetail'));
const Fleet = React.lazy(() => import('./features/operations/pages/Fleet'));
const Analytics = React.lazy(() => import('./features/reports/pages/Analytics'));
const SalesRepPerformanceReport = React.lazy(() => import('./features/reports/pages/SalesRepPerformanceReport'));
const SalesPersonActivitySummaryReport = React.lazy(() => import('./features/reports/pages/SalesPersonActivitySummaryReport'));
const SalesPersonActivityDetailsReport = React.lazy(() => import('./features/reports/pages/SalesPersonActivityDetailsReport'));
const LoginHistoryReport = React.lazy(() => import('./features/reports/pages/LoginHistoryReport'));
const NewLeadsReport = React.lazy(() => import('./features/reports/pages/NewLeadsReport'));
const CancellationDetailsReport = React.lazy(() => import('./features/reports/pages/CancellationDetailsReport'));
const OpportunitiesBookedByDateReport = React.lazy(() => import('./features/reports/pages/OpportunitiesBookedByDateReport'));
const JobsByServiceDateReport = React.lazy(() => import('./features/reports/pages/JobsByServiceDateReport'));
const PaymentInOutReport = React.lazy(() => import('./features/reports/pages/PaymentInOutReport'));
const OutstandingBalancesReport = React.lazy(() => import('./features/reports/pages/OutstandingBalancesReport'));
const Communication = React.lazy(() => import('./features/crm/pages/Communication'));
const Marketing = React.lazy(() => import('./features/crm/pages/Marketing'));
const Automation = React.lazy(() => import('./features/automation/pages/Automation'));
const AutomationTemplateEditor = React.lazy(() => import('./features/automation/components/TemplateEditor'));
const PaymentsPage = React.lazy(() => import('./features/payments/pages/Payments'));
const Settings = React.lazy(() => import('./features/settings/pages/Settings'));
const SuperuserCreateCompanyPage = React.lazy(() => import('./features/settings/pages/SuperuserCreateCompanyPage'));
import LoginPage from './features/auth/pages/LoginPage';
import Profile from './features/auth/pages/Profile';
const EstimateViewPlaywrightHarness = React.lazy(() => import('./features/crm/pages/EstimateViewPlaywrightHarness'));
const DocumentTemplatesPlaywrightHarness = React.lazy(() => import('./features/settings/pages/DocumentTemplatesPlaywrightHarness'));
import { useAuth } from './features/auth/context/AuthContext';
import { ToastProvider } from './shared/context/ToastContext';
import { Toaster } from 'sonner';
import PermissionRoute from './shared/auth/PermissionRoute';
import { ROUTE_PERMISSIONS } from './shared/permissions/registry';
const isPlaywrightHarnessEnabled =
  import.meta.env.DEV || import.meta.env.MODE === 'test' || import.meta.env.VITE_ENABLE_PLAYWRIGHT_HARNESS === '1';

const MainLayout = () => {
  const { logout, user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  return (
    <div className="flex h-screen font-body text-heading bg-page overflow-hidden selection:bg-primary-tint selection:text-primary">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header onLogout={logout} user={user} onMenuToggle={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10">
          <Suspense fallback={<div role="status" className="flex h-64 items-center justify-center text-slate-500">Loading...</div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-page">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const SuperuserRoute = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-page">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.is_superuser && !user?.is_system_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const PageTitleUpdater = () => {
  const location = useLocation();

  React.useEffect(() => {
    const getTitleFromPath = (pathname) => {
      if (pathname === '/login') return 'Login';
      if (pathname === '/dashboard') return 'Dashboard';
      if (pathname === '/portal/estimate') return 'Estimate Portal';
      if (pathname === '/portal/inventory') return 'Inventory Portal';
      if (pathname.startsWith('/portal/contracts/')) return 'Contract Portal';
      if (pathname === '/intake') return 'Lead Intake';
      
      if (pathname === '/leads/new') return 'New Lead';
      if (pathname.startsWith('/leads/')) {
        if (pathname.startsWith('/leads/table/')) {
          const tabSegment = pathname.substring('/leads/table/'.length);
          const tabTitles = {
            'dashboard': 'Dashboard',
            'all-leads': 'All Leads',
            'new-leads': 'New Leads',
            'pipeline': 'Leads & Opportunities',
            'booked': 'Booked',
            'confirmed': 'Confirmed',
            'completed': 'Completed',
            'follow-up': 'Follow-up',
            'lost-leads': 'Lost Leads',
          };
          return tabTitles[tabSegment] || 'Leads';
        }
        if (pathname === '/leads/table') {
          return 'Leads & Opportunities';
        }
        // Let SalesDetail component handle its own title dynamically with customer name
        return null;
      }
      if (pathname === '/leads') return 'Leads & Opportunities';

      if (pathname.startsWith('/sales/')) {
        // Let SalesDetail component handle its own title dynamically with customer name
        return null;
      }
      if (pathname === '/sales') return 'Leads & Opportunities';

      if (pathname.startsWith('/crm/')) {
        if (pathname.startsWith('/crm/activities')) {
          return 'CRM Activities';
        }
        // Let SalesDetail component handle its own title dynamically with customer name
        return null;
      }

      if (pathname === '/payments') return 'Payments';

      if (pathname.startsWith('/jobs/')) {
        // Let JobDetail component handle its own title dynamically with customer name
        return null;
      }
      if (pathname === '/jobs') return 'Jobs';

      if (pathname === '/analytics') return 'Analytics';
      if (pathname === '/analytics/sales-rep-performance') return 'Sales Rep Performance';
      if (pathname === '/analytics/sales-person-activity-summary') return 'Sales Person Activity Summary';
      if (pathname === '/analytics/sales-person-activity-details') return 'Sales Person Activity Details';
      if (pathname === '/analytics/login-history') return 'Login History';
      if (pathname === '/analytics/new-leads') return 'New Leads';
      if (pathname === '/analytics/cancellation-details') return 'Cancellation Details';
      if (pathname === '/analytics/opportunities-booked-by-date') return 'Opportunities Booked By Date';
      if (pathname === '/analytics/jobs-by-service-date') return 'Jobs By Service Date';
      if (pathname === '/analytics/payment-in-out') return 'Payment In / Out Report';
      if (pathname === '/analytics/outstanding-balances') return 'Outstanding Balances';
      if (pathname === '/fleet') return 'Fleet';
      if (pathname === '/communication') return 'Communication';
      if (pathname === '/marketing') return 'Marketing';
      if (pathname === '/automation') return 'Automation';
      if (pathname.startsWith('/settings')) {
        // Handled dynamically in Settings.jsx, return null to skip setting title
        return null;
      }
      if (pathname === '/superuser/settings/company') return 'Superuser - Create Company Profile';
      if (pathname === '/profile') return 'Profile';
      if (pathname === '/__playwright__/estimate-view') return 'Playwright Estimate View';
      if (pathname === '/__playwright__/document-templates') return 'Playwright Document Templates';

      return '';
    };

    const title = getTitleFromPath(location.pathname);
    if (title !== null) {
      if (title) {
        document.title = `${title} - KargoFlow CRM`;
      } else {
        document.title = 'KargoFlow CRM';
      }
    }
  }, [location.pathname]);

  return null;
};

function App() {
  const { isAuthenticated, login } = useAuth();
  const withPermission = (path, element) => (
    <PermissionRoute required={ROUTE_PERMISSIONS[path]}>
      {element}
    </PermissionRoute>
  );

  return (
    <ToastProvider>
      <Router>
        <PageTitleUpdater />
        <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-page">Loading...</div>}>
        <Routes>
          <Route 
            path="/login" 
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={login} />
            } 
          />
          <Route path="/portal/estimate" element={<CustomerEstimatePortal />} />
          <Route path="/portal/inventory" element={<CustomerInventoryPortal />} />
          <Route path="/portal/contracts/:token" element={<CustomerContractPortal />} />
          <Route path="/intake" element={<PublicLeadIntakePage />} />
          <Route
            path="/__playwright__/estimate-view"
            element={isPlaywrightHarnessEnabled ? <EstimateViewPlaywrightHarness /> : <Navigate to="/" replace />}
          />
          <Route
            path="/__playwright__/document-templates"
            element={isPlaywrightHarnessEnabled ? <DocumentTemplatesPlaywrightHarness /> : <Navigate to="/" replace />}
          />
          
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <MainLayout />
              </ProtectedRoute>
              }
            >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={withPermission('/dashboard', <Dashboard />)} />
            
            <Route path="leads" element={withPermission('/leads', <Sales />)} />
            <Route path="leads/table" element={withPermission('/leads', <Sales />)} />
            <Route path="leads/table/:tableTab" element={withPermission('/leads', <Sales />)} />
            <Route path="leads/new" element={withPermission('/leads/new', <NewLeadPage />)} />
            <Route path="leads/:id" element={withPermission('/leads/:id', <SalesDetail />)} />
            <Route path="leads/:id/:tabId" element={withPermission('/leads/:id', <SalesDetail />)} />
            <Route path="leads/:id/:tabId/:estimateTabId" element={withPermission('/leads/:id', <SalesDetail />)} />
            
            <Route path="sales" element={withPermission('/sales', <Sales />)} />
            <Route path="sales/:id" element={withPermission('/sales/:id', <SalesDetail />)} />
            <Route path="sales/:id/:tabId" element={withPermission('/sales/:id', <SalesDetail />)} />
            <Route path="sales/:id/:tabId/:estimateTabId" element={withPermission('/sales/:id', <SalesDetail />)} />
            <Route path="crm/:entityType/:id" element={withPermission('/sales/:id', <SalesDetail />)} />
            <Route path="crm/:entityType/:id/:tabId" element={withPermission('/sales/:id', <SalesDetail />)} />
            <Route path="crm/:entityType/:id/:tabId/:estimateTabId" element={withPermission('/sales/:id', <SalesDetail />)} />
            <Route path="payments" element={withPermission('/payments', <PaymentsPage />)} />
            
            <Route path="jobs" element={withPermission('/jobs', <Jobs />)} />
            <Route path="jobs/:id" element={withPermission('/jobs/:id', <JobDetail />)} />
            <Route path="analytics" element={withPermission('/analytics', withPermission('/analytics', <Analytics />))} />
            <Route
              path="analytics/sales-rep-performance"
              element={withPermission('/analytics', <SalesRepPerformanceReport />)}
            />
            <Route
              path="analytics/sales-person-activity-summary"
              element={withPermission('/analytics', <SalesPersonActivitySummaryReport />)}
            />
            <Route
              path="analytics/sales-person-activity-details"
              element={withPermission('/analytics', <SalesPersonActivityDetailsReport />)}
            />
            <Route
              path="analytics/login-history"
              element={withPermission('/analytics', <LoginHistoryReport />)}
            />
            <Route
              path="analytics/new-leads"
              element={withPermission('/analytics', <NewLeadsReport />)}
            />
            <Route
              path="analytics/cancellation-details"
              element={withPermission('/analytics', <CancellationDetailsReport />)}
            />
            <Route
              path="analytics/opportunities-booked-by-date"
              element={withPermission('/analytics', <OpportunitiesBookedByDateReport />)}
            />
            <Route
              path="analytics/jobs-by-service-date"
              element={withPermission('/analytics', <JobsByServiceDateReport />)}
            />
            <Route
              path="analytics/payment-in-out"
              element={withPermission('/analytics', <PaymentInOutReport />)}
            />
            <Route
              path="analytics/outstanding-balances"
              element={withPermission('/analytics', <OutstandingBalancesReport />)}
            />
            <Route path="fleet" element={withPermission('/fleet', <Fleet />)} />
            <Route path="communication" element={withPermission('/communication', <Communication />)} />
            <Route path="marketing" element={withPermission('/marketing', <Marketing />)} />
            <Route path="automation" element={withPermission('/automation', <Automation />)} />
            <Route path="automation/templates" element={withPermission('/automation/templates', <AutomationTemplateEditor />)} />
            <Route path="automation/templates/:tabId" element={withPermission('/automation/templates/:tabId', <AutomationTemplateEditor />)} />
            <Route path="automation/templates/:itemId/:subView" element={withPermission('/automation/templates/:itemId/:subView', <AutomationTemplateEditor />)} />

            <Route path="crm/activities" element={withPermission('/crm/activities', <CRMHub defaultTab="activities" />)} />

            <Route path="settings" element={withPermission('/settings', <Settings />)} />
            <Route path="settings/:tabId" element={withPermission('/settings', <Settings />)} />
            <Route path="settings/:tabId/:subView" element={withPermission('/settings', <Settings />)} />
            <Route path="settings/:tabId/:itemId/:subView" element={withPermission('/settings', <Settings />)} />
            <Route path="superuser/settings/company" element={<SuperuserRoute><SuperuserCreateCompanyPage /></SuperuserRoute>} />
            <Route path="profile" element={<Profile />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </Router>
      <Toaster 
        position="bottom-right" 
        closeButton
        toastOptions={{
          className: '!bg-white/80 !backdrop-blur-xl !border !border-white/40 !shadow-[0_8px_30px_rgb(0,0,0,0.08)] !rounded-2xl !p-4',
          classNames: {
            toast: 'group',
            title: '!text-sm !font-bold !text-slate-800 !tracking-tight',
            description: '!text-xs !font-semibold !text-slate-500 !mt-0.5',
            icon: '!w-5 !h-5',
            success: '!bg-green-50/80 !border-green-200/50 !text-green-800',
            error: '!bg-rose-50/80 !border-rose-200/50 !text-rose-800',
            warning: '!bg-amber-50/80 !border-amber-200/50 !text-amber-800',
            info: '!bg-blue-50/80 !border-blue-200/50 !text-blue-800',
            actionButton: '!bg-blue-600 hover:!bg-blue-700 !text-white !text-xs !font-bold !px-4 !py-2 !rounded-xl !transition-colors !shadow-sm',
            cancelButton: '!bg-slate-100 hover:!bg-slate-200 !text-slate-700 !text-xs !font-bold !px-4 !py-2 !rounded-xl !transition-colors',
            closeButton: '!bg-white/80 hover:!bg-slate-100 !border-slate-200 !text-slate-500 hover:!text-slate-800 transition-colors backdrop-blur-sm'
          }
        }} 
      />
    </ToastProvider>
  );
}



export default App;
