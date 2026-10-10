import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  Building2, Layers, Sliders, Shield, Key, 
  History, Users, CreditCard, Activity, 
  LogOut, Sun, Moon, ShieldCheck, ChevronRight, ChevronDown, User, Bell,
  Menu, X, Sparkles, AlertCircle, CheckCircle2, CheckCheck, Trash2
} from 'lucide-react';
import { usePlatformAuth } from '../auth/PlatformAuthContext';
import { PLATFORM_ROLES, PLATFORM_PERMISSIONS } from '../rbac/platformRbac';
import platformApi from '../api/platformApi';
import kargoflowLogo from '../assets/full_logo.png';
import kargoflowIcon from '../assets/comapny_logo.png';

export default function PlatformShell() {
  const { platformUser, logout, hasPermission } = usePlatformAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef(null);
  const [notificationFilter, setNotificationFilter] = useState('all'); // 'all' | 'unread'
  const [notificationsList, setNotificationsList] = useState([
    {
      id: 1,
      title: 'Database Migrations Complete',
      message: 'Schema v2.4 successfully applied to all active tenant clusters.',
      time: '10m ago',
      unread: true,
      type: 'success',
      link: '/audit',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/60 dark:border-emerald-800/40',
    },
    {
      id: 2,
      title: 'New Tenant Provisioned',
      message: 'Apex Freight Logistics onboarded with Enterprise tier.',
      time: '1h ago',
      unread: true,
      type: 'tenant',
      link: '/tenants',
      icon: Building2,
      iconColor: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200/60 dark:border-blue-800/40',
    },
    {
      id: 3,
      title: 'Audit Snapshot Archived',
      message: 'Platform audit logs successfully synced and encrypted.',
      time: '4h ago',
      unread: false,
      type: 'system',
      link: '/audit',
      icon: ShieldCheck,
      iconColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200/60 dark:border-indigo-800/40',
    },
  ]);
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

  // Load recent audit events as control plane notifications on mount
  useEffect(() => {
    const fetchRecentAuditEvents = async () => {
      try {
        const res = await platformApi.getAuditLogs({ page_size: 4 });
        const events = res?.data?.results || (Array.isArray(res?.data) ? res.data : []);
        if (events && events.length > 0) {
          const mapped = events.map((log, idx) => ({
            id: `audit-${log.id || idx}`,
            title: log.action_display || log.action || 'Control Plane Activity',
            message: log.description || log.details || `Action recorded for ${log.actor_email || 'platform staff'}`,
            time: log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
            unread: idx < 2,
            type: 'audit',
            link: '/audit',
            icon: History,
            iconColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200/60 dark:border-indigo-800/40',
          }));
          setNotificationsList((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newItems = mapped.filter((m) => !existingIds.has(m.id));
            return [...newItems, ...prev].slice(0, 10);
          });
        }
      } catch {
        // Retain initial notifications
      }
    };
    fetchRecentAuditEvents();
  }, []);

  const handleNotificationClick = (item) => {
    setNotificationsList((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, unread: false } : n))
    );
    if (item.link) {
      navigate(item.link);
      setNotificationsOpen(false);
    }
  };

  const handleDismissNotification = (e, id) => {
    e.stopPropagation();
    setNotificationsList((prev) => prev.filter((n) => n.id !== id));
  };

  const handleMarkAllRead = () => {
    setNotificationsList((prev) => prev.map((item) => ({ ...item, unread: false })));
  };

  const handleClearAll = () => {
    setNotificationsList([]);
  };

  // Close profile dropdown & notifications on click outside or Escape
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setProfileDropdownOpen(false);
        setNotificationsOpen(false);
      }
    };

    if (profileDropdownOpen || notificationsOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [profileDropdownOpen, notificationsOpen]);

  // Close mobile sidebar, notifications, and profile dropdown on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
    setNotificationsOpen(false);
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
      <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <NavLink to="/" className="flex items-center group focus:outline-none" title="KargoFlow Platform Admin">
            {/* KargoFlow Full Brand Logo */}
            <div className="flex items-center shrink-0 transition-transform group-hover:opacity-95">
              <img
                src={kargoflowLogo}
                alt="KargoFlow"
                className="h-8 sm:h-9 w-auto max-w-[140px] sm:max-w-[180px] object-contain shrink-0"
              />
            </div>
          </NavLink>
        </div>

        {/* Controls & Profile Dropdown */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 mr-1 sm:mr-3 lg:mr-4">
          {/* Notifications Button & Dropdown */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen((prev) => !prev);
                setProfileDropdownOpen(false);
              }}
              className={`w-9 h-9 rounded-xl border transition-all cursor-pointer relative flex items-center justify-center focus:outline-none shadow-2xs ${
                notificationsOpen
                  ? 'border-blue-300 dark:border-blue-700 bg-blue-50/80 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20'
                  : 'border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
              title="Platform Alerts & Notifications"
              aria-label="Notifications"
            >
              <Bell size={17} strokeWidth={1.8} />
              {notificationsList.some((n) => n.unread) && (
                <span className="absolute -top-1 -right-1 px-1 min-w-[17px] h-[17px] text-[10px] font-black rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-xs pointer-events-none">
                  {notificationsList.filter((n) => n.unread).length}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:right-[-4.5rem] sm:top-full mt-2.5 w-auto sm:w-88 max-w-[calc(100vw-2rem)] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Header */}
                <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Platform Notifications
                    </span>
                    {notificationsList.some((n) => n.unread) && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {notificationsList.filter((n) => n.unread).length} new
                      </span>
                    )}
                  </div>
                  {notificationsList.some((n) => n.unread) && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <CheckCheck size={13} />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                {/* Filter Tabs & Quick Actions */}
                <div className="px-3 py-2 bg-slate-50/50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-200/60 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => setNotificationFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        notificationFilter === 'all'
                          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      All ({notificationsList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotificationFilter('unread')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        notificationFilter === 'unread'
                          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Unread ({notificationsList.filter((n) => n.unread).length})
                    </button>
                  </div>

                  {notificationsList.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-[11px] font-medium text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1 cursor-pointer pr-1"
                      title="Clear all notifications"
                    >
                      <Trash2 size={12} />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                {/* Notification Items List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                  {notificationsList.length === 0 ? (
                    <div className="p-6 text-center">
                      <div className="mx-auto w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
                        <Bell size={18} />
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        No notifications
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        You're all caught up with control plane events.
                      </p>
                    </div>
                  ) : (
                    (notificationFilter === 'unread'
                      ? notificationsList.filter((n) => n.unread)
                      : notificationsList
                    ).map((item) => {
                      const IconComponent = item.icon || Bell;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleNotificationClick(item)}
                          className={`group p-3.5 flex items-start gap-3 transition-colors cursor-pointer relative ${
                            item.unread
                              ? 'bg-blue-50/30 dark:bg-blue-950/20 hover:bg-blue-50/50 dark:hover:bg-blue-950/40'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 opacity-85 hover:opacity-100'
                          }`}
                        >
                          {/* Event Icon */}
                          <div
                            className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${item.iconColor}`}
                          >
                            <IconComponent size={14} />
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {item.title}
                              </p>
                              {item.unread && (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                              {item.message}
                            </p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                {item.time}
                              </span>
                              {item.link && (
                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <span>View</span>
                                  <ChevronRight size={10} />
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Dismiss Button on Hover */}
                          <button
                            type="button"
                            onClick={(e) => handleDismissNotification(e, item.id)}
                            className="absolute top-3 right-3 w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                            title="Dismiss notification"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Control Plane Feed
                  </span>
                  <NavLink
                    to="/audit"
                    onClick={() => setNotificationsOpen(false)}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Audit Trail</span>
                    <ChevronRight size={12} />
                  </NavLink>
                </div>
              </div>
            )}
          </div>

          {/* Dark / Light Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-9 h-9 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all shadow-2xs cursor-pointer focus:outline-none"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
          </button>

          {/* User Profile Avatar Button with Dropdown */}
          {platformUser && (
            <div className="relative" ref={profileDropdownRef}>
              <button
                type="button"
                onClick={() => setProfileDropdownOpen((prev) => !prev)}
                className={`w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-100 dark:to-slate-200 text-white dark:text-slate-900 flex items-center justify-center text-sm font-bold shadow-xs transition-all cursor-pointer focus:outline-none ${
                  profileDropdownOpen
                    ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 scale-105'
                    : 'hover:opacity-90 hover:scale-105 active:scale-95'
                }`}
                title={platformUser.name || 'Account menu'}
                aria-label="Account menu"
              >
                {(platformUser.name || platformUser.email || 'P')[0].toUpperCase()}
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:right-0 mt-2.5 w-auto sm:w-68 max-w-[calc(100vw-2rem)] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* User Overview Section */}
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                        {(platformUser.name || platformUser.email || 'P')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {platformUser.name || 'Platform Admin'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {platformUser.email || 'admin@example.com'}
                        </p>
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-900/60">
                            {roleConfig.name || platformUser.role || 'Super Admin'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions / Logout */}
                  <div className="p-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors text-left cursor-pointer"
                    >
                      <LogOut size={16} />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex max-h- overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="w-64 border-r max-h-lvh border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hidden md:flex flex-col justify-between shrink-0">
          <div className="p-3 space-y-1 overflow-y-auto">
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
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800 mb-3">
                  <div className="flex flex-col gap-1">
                    <img src={kargoflowLogo} alt="KargoFlow" className="h-7 w-auto object-contain" />
                    <span className="text-[10px] font-black tracking-wider uppercase text-blue-600 dark:text-blue-400">
                      Platform Admin
                    </span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
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
                <div className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/90 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-2xs text-xs font-black shrink-0">
                      {(platformUser.name || 'A')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold truncate text-slate-900 dark:text-white leading-tight">{platformUser.name}</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full border uppercase ${roleConfig.badgeClass || 'bg-blue-50 text-blue-700'}`}>
                          {roleConfig.name || platformUser.role}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">{platformUser.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">
                      {platformUser.company_scope_type === 'all'
                        ? 'Global Scope • All Companies'
                        : `Assigned: ${(platformUser.assigned_companies || []).length} Companies`}
                    </span>
                  </div>

                  <button
                    onClick={logout}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-4.5 lg:p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
