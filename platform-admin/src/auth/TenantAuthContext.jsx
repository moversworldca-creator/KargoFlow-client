import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import tenantApi from '../api/tenantApi';

const TenantAuthContext = createContext(null);
// Storage keys from before cookie sessions; removed, never read.
const LEGACY_KEYS = ['tenant_access_token', 'tenant_user'];
const isTenantRoute = (pathname) => pathname === '/tenant' || pathname.startsWith('/tenant/');

export function useTenantAuth() {
  const value = useContext(TenantAuthContext);
  if (!value) throw new Error('useTenantAuth must be used within TenantAuthProvider');
  return value;
}

export function TenantAuthProvider({ children }) {
  const location = useLocation();
  // The session is an HttpOnly cookie; the profile is kept in memory only.
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(() => isTenantRoute(location.pathname));
  const checked = useRef(false);
  const navigate = useNavigate();

  const clearSession = useCallback((redirect = true) => {
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
    setUser(null);
    setPermissions([]);
    if (redirect) navigate('/tenant/login');
  }, [navigate]);

  const refresh = useCallback(async () => {
    try {
      // A 401 here just means "not signed in"; it must not fire session expiry.
      const response = await tenantApi.me({ skipSessionExpiry: true });
      if (response?.user?.identity_type !== 'tenant') throw new Error('Not a tenant session');
      setUser(response.user);
      setPermissions(response.permissions || []);
      return true;
    } catch {
      clearSession(false);
      return false;
    } finally { setIsLoading(false); }
  }, [clearSession]);

  useEffect(() => {
    const onExpired = () => clearSession();
    window.addEventListener('tenant:session_expired', onExpired);
    return () => window.removeEventListener('tenant:session_expired', onExpired);
  }, [clearSession]);

  // Only the company-admin portal (/tenant/*) uses this session; platform
  // pages do not ask the server about it.
  useEffect(() => {
    if (checked.current || !isTenantRoute(location.pathname)) return;
    checked.current = true;
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
    setIsLoading(true);
    refresh();
  }, [location.pathname, refresh]);

  const login = async (email, password) => {
    await tenantApi.ensureCsrf();
    // The session token is set as an HttpOnly cookie and never reaches this code.
    const response = await tenantApi.login({ email, password });
    if (response.identity_type !== 'tenant') throw new Error('A tenant session was not returned.');
    checked.current = true;
    setUser({ id: response.user_id, email, identity_type: 'tenant' });
    if (!await refresh()) throw new Error('Sign in succeeded, but the tenant session could not be verified. Try again.');
    return response;
  };

  const acceptInvitation = (token, password) => tenantApi.acceptInvitation(token, password);

  const logout = async () => {
    try { await tenantApi.logout(); } finally { clearSession(); }
  };

  // On first arrival at /tenant the check has not started yet; report loading
  // so the guard does not bounce a signed-in user to the login page.
  const loading = isLoading || (!checked.current && isTenantRoute(location.pathname));
  const value = useMemo(() => ({ user, permissions, isLoading: loading, isAuthenticated: Boolean(user), login, logout, refresh, acceptInvitation }), [user, permissions, loading, login, logout, refresh]);
  return <TenantAuthContext.Provider value={value}>{children}</TenantAuthContext.Provider>;
}
