import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { queryClient } from '../../../shared/queries/queryClient';
import { authService } from '../../../services/auth';
import { clearTenantSession, getTenantToken } from '../../../services/tenantSession';
import { canAll } from '../../../shared/permissions/registry';

const AuthContext = createContext(null);

function clearCaches() {
  queryClient.clear();
  window.dispatchEvent(new Event('app:tenant-changed'));
}

export const AuthProvider = ({ children }) => {
  const [supportConsoleContext] = useState(() => consumeSupportConsoleHandoff());
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const operation = useRef(0);
  const loginRequest = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const attempt = ++operation.current;
    const expire = () => {
      ++operation.current;
      setUser(null);
      setIsLoading(false);
      clearCaches();
    };
    window.addEventListener('tenant:session-expired', expire);
    const init = async () => {
      // Retire legacy demo credentials; only server-validated sessions restore access.
      const token = getTenantToken();
      clearTenantSession();
      if (token) sessionStorage.setItem('tenant_access_token', token);
      try {
        const profile = token ? await authService.me() : null;
        if (!cancelled && attempt === operation.current) {
          window.__activeCompanyId = profile?.company?.id ?? null;
          setUser(profile);
        }
      } catch {
        if (!cancelled && attempt === operation.current) {
          clearTenantSession();
          setUser(null);
          clearCaches();
        }
      } finally {
        if (!cancelled && attempt === operation.current) setIsLoading(false);
      }
    };
    init();
    return () => {
      cancelled = true;
      loginRequest.current?.abort();
      window.removeEventListener('tenant:session-expired', expire);
    };
  }, []);

  const login = async (email, password) => {
    const attempt = ++operation.current;
    loginRequest.current?.abort();
    const controller = new AbortController();
    loginRequest.current = controller;
    setUser(null);
    clearCaches();
    const data = await authService.login(email, password, controller.signal);
    if (attempt === operation.current) {
      window.__activeCompanyId = data.user.company.id;
      setUser(data.user);
      setIsLoading(false);
      clearCaches();
    }
    return data;
  };

  const logout = async () => {
    ++operation.current;
    loginRequest.current?.abort();
    setUser(null);
    setIsLoading(false);
    const pending = authService.logout();
    clearCaches();
    await pending;
  };

  const switchCompany = async () => {
    throw new Error('Sign out and sign in with an account belonging to that company.');
  };
  const permissionSet = useMemo(() => new Set(user?.permissions || []), [user]);
  const permissionContext = useMemo(() => ({
    permissions: permissionSet,
    isSuperuser: false,
    isSystemAdmin: false,
    isCompanyAdmin: permissionSet.has('crm.admin'),
  }), [permissionSet]);

  const value = {
    user, isAuthenticated: Boolean(user), isLoading, login, logout, switchCompany, setUser,
    permissionSet, permissionContext,
    hasRole: (names) => Boolean(user?.role_details?.some(role => names.includes(role.name))),
    hasPermission: (permissions) => canAll(permissions, permissionContext),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
