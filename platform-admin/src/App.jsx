import React from 'react';
import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { usePlatformAuth } from './auth/PlatformAuthContext';

import LoginPage from './auth/LoginPage';
import PlatformShell from './layout/PlatformShell';

import DashboardPage from './pages/DashboardPage';
import TenantsPage from './pages/TenantsPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import PlansPage from './pages/PlansPage';
import FeaturesPage from './pages/FeaturesPage';
import EntitlementsPage from './pages/EntitlementsPage';
import SupportPage from './pages/SupportPage';
import AdminsPage from './pages/AdminsPage';
import AuditPage from './pages/AuditPage';

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
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes */}
      <Route element={<RequireAuth />}>
        <Route element={<PlatformShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/tenants" element={<TenantsPage />} />
          <Route path="/subscriptions" element={<SubscriptionsPage />} />
          <Route path="/plans" element={<PlansPage />} />
          {/* <Route path="/features" element={<FeaturesPage />} /> */}
          <Route path="/entitlements" element={<EntitlementsPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/admins" element={<AdminsPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
