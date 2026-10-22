import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { usePlatformAuth } from './auth/PlatformAuthContext';
import PlatformShell from './layout/PlatformShell';

const TenantPortal = lazy(() => import('./tenant/TenantPortal'));
const LoginPage = lazy(() => import('./auth/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TenantsPage = lazy(() => import('./pages/TenantsPage'));
const SubscriptionsPage = lazy(() => import('./pages/SubscriptionsPage'));
const PlansPage = lazy(() => import('./pages/PlansPage'));
const EntitlementsPage = lazy(() => import('./pages/EntitlementsPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const CommunicationPage = lazy(() => import('./pages/CommunicationPage'));
const DocumentTemplatesPage = lazy(() => import('./pages/DocumentTemplatesPage'));
const AdminsPage = lazy(() => import('./pages/AdminsPage'));
const AuditPage = lazy(() => import('./pages/AuditPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

function RequireAuth() {
  const { isAuthenticated, isLoading } = usePlatformAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 size={28} className="animate-spin text-blue-500" />
        <span className="text-xs font-semibold">Verifying platform staff credentials...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <Suspense fallback={
      <div role="status" className="min-h-screen flex items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 size={18} className="animate-spin" />
        <span>Loading page...</span>
      </div>
    }>
      <Routes>
        <Route path="/tenant/*" element={<TenantPortal />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route element={<RequireAuth />}>
          <Route element={<PlatformShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/tenants" element={<TenantsPage />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/entitlements" element={<EntitlementsPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/communication" element={<CommunicationPage />} />
            <Route path="/document-templates" element={<DocumentTemplatesPage />} />
            <Route path="/document-templates/*" element={<DocumentTemplatesPage />} />
            <Route path="/estimate-portal-templates/*" element={<DocumentTemplatesPage />} />
            <Route path="/communication-templates/*" element={<DocumentTemplatesPage />} />
            <Route path="/admins" element={<AdminsPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
