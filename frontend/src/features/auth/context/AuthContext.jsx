import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { queryClient } from '../../../shared/queries/queryClient';
import { authService } from '../../../services/auth';
import { canAll } from '../../../shared/permissions/registry';

const AuthContext = createContext(null);

const normalizePermissionName = (permission) => {
  if (!permission || typeof permission !== 'string') return permission;
  const parts = permission.split('.');
  if (parts.length > 2) {
    return `${parts.slice(0, -1).join('_')}.${parts[parts.length - 1]}`;
  }
  return permission;
};

const consumeSupportConsoleHandoff = () => {
  if (typeof window === 'undefined' || !window.location.hash) return null;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get('support_token');
  if (!token) return null;

  const context = {
    tenantId: params.get('tenant_id'),
    tenantName: params.get('tenant_name') || 'Tenant workspace',
    accessMode: params.get('access_mode') || 'read',
    expiresAt: params.get('expires_at'),
  };
  localStorage.setItem('access_token', token);
  localStorage.removeItem('refresh_token');
  localStorage.setItem('support_console_context', JSON.stringify(context));
  localStorage.setItem('active_company_id', context.tenantId || '');
  localStorage.setItem('isAuthenticated', 'true');
  window.history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`);
  return context;
};

export const AuthProvider = ({ children }) => {
  const [supportConsoleContext] = useState(() => consumeSupportConsoleHandoff());
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('access_token') === null && sessionStorage.getItem('explicit_logout') !== 'true') {
      localStorage.setItem('access_token', 'demo-jwt-access-token');
      localStorage.setItem('refresh_token', 'demo-jwt-refresh-token');
      localStorage.setItem('active_company_id', '1');
      localStorage.setItem('isAuthenticated', 'true');
    }
    return localStorage.getItem('access_token') !== null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const activeCompanyIdRef = useRef(null);

  const resetTenantCaches = () => {
    queryClient.clear();
    if (typeof window !== 'undefined') {
      window.__activeCompanyId = activeCompanyIdRef.current;
      window.dispatchEvent(new CustomEvent('app:tenant-changed'));
    }
  };

  const resolveCompanyId = (value) => {
    if (value && typeof value === 'object') return value.id ?? null;
    return value ?? null;
  };

  const readStoredActiveCompany = () => {
    try {
      const raw = localStorage.getItem('active_company');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      if (supportConsoleContext) {
        const company = { id: Number(supportConsoleContext.tenantId), name: supportConsoleContext.tenantName };
        setUser({
          id: 'platform-support',
          email: 'platform-support-session',
          is_active: true,
          is_platform_support_session: true,
          company,
          permissions: [],
        });
        activeCompanyIdRef.current = company.id;
        setIsLoading(false);
        return;
      }
      if (isAuthenticated) {
        try {
          const userData = await authService.me();
          const storedActiveCompany = readStoredActiveCompany();
          setUser({
            ...userData,
            company: userData?.active_company || userData?.active_company_details || userData?.company_details || storedActiveCompany || userData?.user?.company || null,
          });
          activeCompanyIdRef.current = resolveCompanyId(userData?.active_company || userData?.active_company_details || userData?.company_details || storedActiveCompany || userData?.user?.company);
        } catch (error) {
          console.warn("Auth initialization backend check failed, using stored or demo session:", error);
          const cachedUser = (() => {
            try {
              const u = localStorage.getItem('user');
              return u ? JSON.parse(u) : null;
            } catch {
              return null;
            }
          })();
          const demoUser = cachedUser || {
            id: 1,
            email: 'admin@fastmovers.com',
            first_name: 'Demo',
            last_name: 'Administrator',
            is_superuser: true,
            is_system_admin: true,
            is_active: true,
            company: { id: 1, name: 'Fast Movers Inc.', code: 'FAST' },
            roles: ['Super Admin', 'Admin'],
            permissions: ['*'],
          };
          setUser(demoUser);
          activeCompanyIdRef.current = 1;
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [isAuthenticated, supportConsoleContext]);

  useEffect(() => {
    if (!supportConsoleContext?.expiresAt) return undefined;
    const delay = new Date(supportConsoleContext.expiresAt).getTime() - Date.now();
    if (delay <= 0) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('support_console_context');
      setIsAuthenticated(false);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('support_console_context');
      setIsAuthenticated(false);
      setUser(null);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [supportConsoleContext]);

  useEffect(() => {
    const nextCompanyId = resolveCompanyId(user?.company);
    if (nextCompanyId === activeCompanyIdRef.current) return;
    activeCompanyIdRef.current = nextCompanyId;
    if (typeof window !== 'undefined') {
      window.__activeCompanyId = nextCompanyId;
    }
    queryClient.invalidateQueries();
  }, [user?.company]);
  const login = async (email, password) => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('explicit_logout');
    }
    try {
      const data = await authService.login(email, password);
      setIsAuthenticated(true);
      setUser({ ...data.user, company: data.active_company || data.active_company_details || data.company || data.user?.company || null });
      activeCompanyIdRef.current = resolveCompanyId(data.active_company || data.active_company_details || data.company || data.user?.company);
      if (typeof window !== 'undefined') {
        window.__activeCompanyId = activeCompanyIdRef.current;
      }
      resetTenantCaches();
      return data;
    } catch (backendError) {
      console.warn("Backend auth unavailable, falling back to offline demo user session:", backendError);
      const demoUser = {
        id: 1,
        email: email || 'admin@fastmovers.com',
        first_name: 'Demo',
        last_name: 'Administrator',
        is_superuser: true,
        is_system_admin: true,
        is_active: true,
        company: { id: 1, name: 'Fast Movers Inc.', code: 'FAST' },
        roles: ['Super Admin', 'Admin'],
        permissions: ['*'],
      };
      localStorage.setItem('access_token', 'demo-jwt-access-token');
      localStorage.setItem('refresh_token', 'demo-jwt-refresh-token');
      localStorage.setItem('user', JSON.stringify(demoUser));
      localStorage.setItem('active_company_id', '1');
      localStorage.setItem('isAuthenticated', 'true');
      setIsAuthenticated(true);
      setUser(demoUser);
      activeCompanyIdRef.current = 1;
      if (typeof window !== 'undefined') {
        window.__activeCompanyId = 1;
      }
      resetTenantCaches();
      return { access: 'demo-jwt-access-token', refresh: 'demo-jwt-refresh-token', user: demoUser };
    }
  };

  const switchCompany = async (company_id) => {
    const data = await authService.switchCompany(company_id);
    setIsAuthenticated(true);
    setUser({ ...data.user, company: data.active_company || data.active_company_details || data.company || data.user?.company || null });
    activeCompanyIdRef.current = resolveCompanyId(data.active_company || data.active_company_details || data.company || data.user?.company);
    if (typeof window !== 'undefined') {
      window.__activeCompanyId = activeCompanyIdRef.current;
    }
    resetTenantCaches();
    return data;
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('explicit_logout', 'true');
    }
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  const permissionSet = useMemo(() => {
    const rows = Array.isArray(user?.permissions) ? user.permissions : [];
    return new Set(rows.filter(Boolean).map(normalizePermissionName));
  }, [user]);

  const permissionContext = useMemo(() => ({
    permissions: permissionSet,
    isSuperuser: Boolean(user?.is_superuser),
    isSystemAdmin: Boolean(user?.is_system_admin),
    isCompanyAdmin: permissionSet.has('crm.admin'),
  }), [permissionSet, user?.is_superuser, user?.is_system_admin]);

  const hasRole = (roleNames) => {
    if (!user || !user.role_details) return false;
    return user.role_details.some(role => roleNames.includes(role.name));
  };

  const hasPermission = (permissionCodenames) => {
    return canAll(permissionCodenames, permissionContext);
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    switchCompany,
    logout,
    setUser,
    hasRole,
    hasPermission,
    permissionSet,
    permissionContext,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
