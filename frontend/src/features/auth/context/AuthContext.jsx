import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { queryClient } from '../../../shared/queries/queryClient';
import { authService } from '../../../services/auth';
import { clearTenantSession, getTenantToken } from '../../../services/tenantSession';
import { canAll } from '../../../shared/permissions/registry';

const AuthContext = createContext(null);

function clearCaches() {
  queryClient.clear();
  window.dispatchEvent(new Event('app:tenant-changed'));
}

function consumeSupportConsoleHandoff() {
  if (typeof window === 'undefined') return null;

  if (window.location.hash) {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('support_token');
    if (token) {
      const context = {
        tenantId: params.get('tenant_id') || '',
        tenantName: params.get('tenant_name') || '',
        accessMode: params.get('access_mode') || 'read',
        expiresAt: params.get('expires_at') || '',
      };
      sessionStorage.setItem('tenant_access_token', token);
      sessionStorage.setItem('support_console_context', JSON.stringify(context));
      window.history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`);
      return context;
    }
  }

  try {
    const saved = sessionStorage.getItem('support_console_context');
    if (saved && sessionStorage.getItem('tenant_access_token')) {
      return JSON.parse(saved);
    }
  } catch {}

  return null;
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

  // Re-read the session's permissions after an administrator changes roles,
  // grants, overrides or login state, or when the backend refuses something
  // the UI offered (403): the backend is authoritative and the UI follows it.
  const refreshInFlight = useRef(null);
  const lastRefresh = useRef(0);
  const refreshSession = useCallback(async () => {
    if (!getTenantToken()) return null;
    if (refreshInFlight.current) return refreshInFlight.current;
    const attempt = operation.current;
    refreshInFlight.current = (async () => {
      try {
        const profile = await authService.me();
        if (attempt === operation.current) setUser(profile);
        return profile;
      } catch {
        // A revoked or expired session is handled by the API client (401).
        return null;
      } finally {
        lastRefresh.current = Date.now();
        refreshInFlight.current = null;
      }
    })();
    return refreshInFlight.current;
  }, []);

  useEffect(() => {
    const onForbidden = () => {
      // At most once every 5 seconds, so a denied action never loops.
      if (Date.now() - lastRefresh.current < 5000) return;
      refreshSession();
    };
    window.addEventListener('app:forbidden', onForbidden);
    return () => window.removeEventListener('app:forbidden', onForbidden);
  }, [refreshSession]);

  const switchCompany = async () => {
    throw new Error('Sign out and sign in with an account belonging to that company.');
  };
  const isPlatformSupport = user?.identity_type === 'platform_support' || Boolean(supportConsoleContext);
  const supportAccessMode = supportConsoleContext?.accessMode || user?.access_mode || 'read';
  const isSupportReadOnly = isPlatformSupport && (supportAccessMode === 'read' || supportAccessMode === 'support_read');

  const permissionSet = useMemo(() => new Set(user?.permissions || []), [user]);
  const permissionContext = useMemo(() => ({
    permissions: permissionSet,
    isSuperuser: false,
    isSystemAdmin: false,
  }), [permissionSet]);

  const value = {
    user, isAuthenticated: Boolean(user), isLoading, login, logout, switchCompany, setUser, supportConsoleContext,
    permissionSet, permissionContext, refreshSession,
    isReadOnly: isSupportReadOnly,
    isSupportReadOnly,
    hasPermission: (permissions) => {
      if (isSupportReadOnly) {
        const perms = Array.isArray(permissions) ? permissions : [permissions];
        const hasWritePerm = perms.some((p) => {
          const str = String(p);
          return !str.endsWith('.view') && !str.includes('.view') && !str.includes('_view');
        });
        if (hasWritePerm) return false;
      }
      return canAll(permissions, permissionContext);
    },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
