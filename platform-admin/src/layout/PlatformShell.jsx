import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  Building2, Layers, Sliders, Shield, Key, 
  History, Users, CreditCard, Activity, 
  LogOut, Sun, Moon, ShieldCheck, ChevronRight,
  Menu, X, Sparkles, AlertCircle
} from 'lucide-react';
import { usePlatformAuth } from '../auth/PlatformAuthContext';
import { PLATFORM_ROLES, PLATFORM_PERMISSIONS } from '../rbac/platformRbac';
import kargoflowLogo from '../assets/logo.png';
import kargoflowIcon from '../assets/comapny_logo.png';

export default function PlatformShell() {
  const { platformUser, logout, hasPermission } = usePlatformAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('platform_theme') === 'dark' ||
      (!('platform_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('platform_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('platform_theme', 'light');
    }
  }, [darkMode]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const roleConfig = PLATFORM_ROLES[platformUser?.role] || {};

  const NAV_ITEMS = [
    { 
      to: '/', 
      label: 'Dashboard', 
      icon: Activity, 
      permission: null 
    },
    { 
      to: '/tenants', 
      label: 'Tenants', 
      icon: Building2, 
      permission: PLATFORM_PERMISSIONS.TENANTS_VIEW 
    },
    { 
      to: '/subscriptions', 
      label: 'Subscriptions', 
      icon: CreditCard, 
      permission: PLATFORM_PERMISSIONS.SUBSCRIPTIONS_VIEW 
    },
    { 
      to: '/plans', 
      label: 'Plans Catalog', 
      icon: Layers, 
      permission: PLATFORM_PERMISSIONS.PLANS_VIEW 
    },
    { 
      to: '/features', 
      label: 'Features Matrix', 
      icon: Sliders, 
      permission: PLATFORM_PERMISSIONS.PLANS_VIEW 
    },
    { 
      to: '/entitlements', 
      label: 'Entitlements & Overrides', 
      icon: Shield, 
      permission: PLATFORM_PERMISSIONS.OVERRIDES_MANAGE 
    },
    { 
      to: '/support', 
      label: 'Support Sessions', 
      icon: Key, 
      permission: PLATFORM_PERMISSIONS.SUPPORT_SESSIONS_VIEW 
    },
    { 
      to: '/admins', 
      label: 'Platform Staff & RBAC', 
      icon: Users, 
      permission: PLATFORM_PERMISSIONS.USERS_VIEW 
    },
    { 
      to: '/audit', 
      label: 'Audit Trail', 
      icon: History, 
      permission: PLATFORM_PERMISSIONS.AUDIT_VIEW 
    },
  ];

  // Filter items or show disabled lock if user lacks permission
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      {/* Top Header Bar */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="flex items-center justify-center p-1 sm:p-1.5 rounded-xl bg-white dark:bg-white/95 shadow-xs border border-slate-200/80 dark:border-slate-700/60 transition-transform group-hover:scale-[1.02]">
              <img
                src={kargoflowLogo}
                alt="KargoFlow Logo"
                className="h-6 sm:h-7 w-auto max-w-[120px] sm:max-w-[145px] object-contain shrink-0"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300">
                  Platform Admin
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
                Multi-Tenant SaaS Control Center
              </p>
            </div>
          </NavLink>
        </div>

        {/* Staff User Badge & Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {platformUser && (
            <div className="hidden sm:flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-end gap-1.5">
                  <span>{platformUser.name}</span>
                  <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full border ${roleConfig.badgeClass || 'bg-slate-100 text-slate-700'}`}>
                    {roleConfig.name || platformUser.role}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {platformUser.company_scope_type === 'all'
                    ? 'Global Scope (All Companies)'
                    : `Assigned: ${(platformUser.assigned_companies || []).length} Company(s)`}
                </div>
              </div>
            </div>
          )}

          {/* Dark / Light Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Sign out of Platform Control Plane"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hidden md:flex flex-col justify-between shrink-0">
          <div className="p-4 space-y-1.5 overflow-y-auto">
            <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Control Plane Navigation
            </div>

            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`
                  }
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>

          {/* Sidebar Footer Info */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Control Plane Online</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Isolated staff instance &middot; 2.4-GA
            </p>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex">
            <div className="w-72 bg-white dark:bg-slate-900 h-full p-4 flex flex-col justify-between shadow-2xl">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-2">
                  <div className="p-1 rounded-xl bg-white dark:bg-white/95 border border-slate-200 dark:border-slate-700/60 shadow-2xs">
                    <img src={kargoflowLogo} alt="KargoFlow" className="h-6 w-auto object-contain" />
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    title="Close navigation"
                  >
                    <X size={18} />
                  </button>
                </div>

                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`
                      }
                    >
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>

              {platformUser && (
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <div className="text-xs font-bold">{platformUser.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{platformUser.email}</div>
                  <button
                    onClick={logout}
                    className="mt-3 w-full py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <LogOut size={14} />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Main Routed Page Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
