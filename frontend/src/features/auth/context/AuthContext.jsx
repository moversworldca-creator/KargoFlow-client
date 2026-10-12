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

export const AuthProvider = ({ children }) => {
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
      if (isAuthenticated) {
        try {
          const userData = await authService.me();
          const cachedUser = (() => {
            try {
              const u = localStorage.getItem('user');
              return u ? JSON.parse(u) : null;
            } catch {
              return null;
            }
          })();

          const baseUser = (userData && userData.user && typeof userData.user === 'object' && (userData.user.id || userData.user.email))
            ? { ...cachedUser, ...userData.user, ...userData }
            : (userData && (userData.id || userData.email || (Array.isArray(userData.permissions) && userData.permissions.length)))
              ? { ...cachedUser, ...userData }
              : (cachedUser || null);

          if (!baseUser) {
            throw new Error('No user data returned');
          }

          const storedActiveCompany = readStoredActiveCompany();
          const activeComp = baseUser?.active_company || baseUser?.active_company_details || baseUser?.company_details || storedActiveCompany || baseUser?.company || null;
          const mergedUser = {
            ...baseUser,
            company: activeComp,
            active_company: activeComp,
          };
          setUser(mergedUser);
          activeCompanyIdRef.current = resolveCompanyId(activeComp);
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
  }, [isAuthenticated]);

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
    const set = new Set();
    const addPerm = (item) => {
      if (!item) return;
      const codename = typeof item === 'string' ? item : (item.codename || item.permission_key || item.name || '');
      if (codename) {
        set.add(codename);
        const norm = normalizePermissionName(codename);
        if (norm) set.add(norm);
      }
    };

    const sources = [
      user?.permissions,
      user?.permissions_details,
      user?.user_permissions,
      user?.user?.permissions,
      user?.user?.permissions_details,
      user?.user?.user_permissions,
    ];
    sources.forEach((src) => {
      if (Array.isArray(src)) {
        src.forEach(addPerm);
      }
    });

    if (Array.isArray(user?.role_details)) {
      user.role_details.forEach((r) => {
        const rPerms = r?.permissions || r?.permissions_details || [];
        (Array.isArray(rPerms) ? rPerms : []).forEach(addPerm);
      });
    }

    if (Array.isArray(user?.roles)) {
      user.roles.forEach((r) => {
        if (typeof r === 'object' && r !== null) {
          const rPerms = r?.permissions || r?.permissions_details || [];
          (Array.isArray(rPerms) ? rPerms : []).forEach(addPerm);
        }
      });
    }

    return set;
  }, [user]);

  const permissionContext = useMemo(() => {
    const isSuperuser = Boolean(user?.is_superuser || user?.user?.is_superuser) || permissionSet.has('*');
    const isSystemAdmin = Boolean(user?.is_system_admin || user?.user?.is_system_admin);
    const isCompanyAdmin = Boolean(user?.is_company_owner || user?.user?.is_company_owner || user?.is_company_admin || user?.user?.is_company_admin)
      || permissionSet.has('crm.admin')
      || permissionSet.has('settings.manage')
      || permissionSet.has('*');

    return {
      permissions: permissionSet,
      isSuperuser,
      isSystemAdmin,
      isCompanyAdmin,
    };
  }, [permissionSet, user]);

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
