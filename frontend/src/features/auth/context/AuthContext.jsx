import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { queryClient } from '../../../shared/queries/queryClient';
import { authService } from '../../../services/auth';
import { clearTenantSession, getClientMode, setClientMode } from '../../../services/tenantSession';
import { canAll } from '../../../shared/permissions/registry';

const AuthContext = createContext(null);

function clearCaches() {
  queryClient.clear();
  window.dispatchEvent(new Event('app:tenant-changed'));
}

// The platform admin opens this app with a one-time support code in the URL
// fragment (never sent to any server). It is removed from the address bar at
// once and exchanged for an HttpOnly support-console cookie.
function consumeSupportConsoleHandoff() {
  if (typeof window === 'undefined' || !window.location.hash) return null;

  const params = new URLSearchParams(window.location.hash.slice(1));
  const code = params.get('support_code');
  if (!code && !params.has('support_token')) return null;

  window.history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`);
  // Links from before cookie sessions carried a bearer token; it is dropped unused.
  if (!code) return null;
  return {
    code,
    context: {
      tenantId: params.get('tenant_id') || '',
      tenantName: params.get('tenant_name') || '',
      accessMode: params.get('access_mode') || 'read',
      expiresAt: params.get('expires_at') || '',
    },
  };
}

// A support code works once; StrictMode and remounts must reuse one exchange.
const supportExchanges = new Map();
function exchangeSupportHandoffOnce(code) {
  if (!supportExchanges.has(code)) supportExchanges.set(code, authService.exchangeSupportHandoff(code));
  return supportExchanges.get(code);
}

export const AuthProvider = ({ children }) => {
  const [supportHandoff] = useState(() => consumeSupportConsoleHandoff());
  const supportConsoleContext = supportHandoff ? supportHandoff.context : null;
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
      const mode = getClientMode();
      clearTenantSession();
      setClientMode(mode);
      try {
        if (supportHandoff) await exchangeSupportHandoffOnce(supportHandoff.code);
        // The session cookie is invisible to JavaScript, so ask the server.
        const profile = await authService.me(undefined, { probe: true });
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
    user, isAuthenticated: Boolean(user), isLoading, login, logout, switchCompany, setUser, supportConsoleContext,
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
