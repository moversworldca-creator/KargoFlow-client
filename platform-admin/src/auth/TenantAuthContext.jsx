import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import tenantApi from '../api/tenantApi';

const TenantAuthContext = createContext(null);

export function useTenantAuth() {
  const value = useContext(TenantAuthContext);
  if (!value) throw new Error('useTenantAuth must be used within TenantAuthProvider');
  return value;
}

export function TenantAuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tenant_user') || 'null'); } catch { return null; }
  });
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(localStorage.getItem('tenant_access_token')));
  const navigate = useNavigate();

  const clearSession = useCallback((redirect = true) => {
    localStorage.removeItem('tenant_access_token');
    localStorage.removeItem('tenant_user');
    setUser(null);
    setPermissions([]);
    if (redirect) navigate('/tenant/login');
  }, [navigate]);

  const refresh = useCallback(async () => {
    if (!localStorage.getItem('tenant_access_token')) { setIsLoading(false); return; }
    try {
      const response = await tenantApi.me();
      if (response?.user?.identity_type !== 'tenant') throw new Error('Not a tenant session');
      setUser(response.user);
      setPermissions(response.permissions || []);
      localStorage.setItem('tenant_user', JSON.stringify(response.user));
      return true;
    } catch {
      clearSession(false);
      return false;
    } finally { setIsLoading(false); }
  }, [clearSession]);

  useEffect(() => {
    refresh();
    const onExpired = () => clearSession();
    window.addEventListener('tenant:session_expired', onExpired);
    return () => window.removeEventListener('tenant:session_expired', onExpired);
  }, [refresh, clearSession]);

  const login = async (email, password) => {
    const response = await tenantApi.login({ email, password });
    const token = response.access_token || response.token;
    if (!token || response.identity_type !== 'tenant') throw new Error('A tenant session was not returned.');
    localStorage.setItem('tenant_access_token', token);
    const nextUser = { id: response.user_id, email, identity_type: 'tenant' };
    localStorage.setItem('tenant_user', JSON.stringify(nextUser));
    setUser(nextUser);
    if (!await refresh()) throw new Error('Sign in succeeded, but the tenant session could not be verified. Try again.');
    return response;
  };

  const acceptInvitation = (token, password) => tenantApi.acceptInvitation(token, password);

  const logout = async () => {
    try { await tenantApi.logout(); } finally { clearSession(); }
  };

  const value = useMemo(() => ({ user, permissions, isLoading, isAuthenticated: Boolean(user), login, logout, refresh, acceptInvitation }), [user, permissions, isLoading, login, logout, refresh]);
  return <TenantAuthContext.Provider value={value}>{children}</TenantAuthContext.Provider>;
}
