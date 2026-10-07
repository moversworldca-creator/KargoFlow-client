import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import platformApi from '../api/platformApi';
import { hasPlatformPermission } from '../rbac/platformRbac';

const PlatformAuthContext = createContext(null);

export const usePlatformAuth = () => {
  const context = useContext(PlatformAuthContext);
  if (!context) {
    throw new Error('usePlatformAuth must be used within a PlatformAuthProvider');
  }
  return context;
};

// Aliased export for compatibility with components expecting useAuth
export const useAuth = usePlatformAuth;

export const PlatformAuthProvider = ({ children }) => {
  const [platformUser, setPlatformUser] = useState(() => {
    try {
      const stored = localStorage.getItem('platform_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const logout = useCallback(() => {
    localStorage.removeItem('platform_access_token');
    localStorage.removeItem('platform_user');
    setPlatformUser(null);
    setPermissions([]);
    navigate('/login');
  }, [navigate]);

  const verifyAndRefreshUser = useCallback(async () => {
    const token = localStorage.getItem('platform_access_token');
    if (!token) {
      setPlatformUser(null);
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    try {
      const res = await platformApi.getPlatformAuthMe();
      if (res?.data?.user) {
        setPlatformUser(res.data.user);
        setPermissions(res.data.permissions || []);
        localStorage.setItem('platform_user', JSON.stringify(res.data.user));
      }
    } catch (err) {
      console.warn('Platform authentication verification failed:', err?.response?.data || err?.message);
      // If unauthorized, clear state
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        localStorage.removeItem('platform_access_token');
        localStorage.removeItem('platform_user');
        setPlatformUser(null);
        setPermissions([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    verifyAndRefreshUser();

    const handleSessionExpired = (e) => {
      logout();
    };

    window.addEventListener('platform:session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('platform:session_expired', handleSessionExpired);
    };
  }, [verifyAndRefreshUser, logout]);

  const login = async (email, password) => {
    const res = await platformApi.login({ email, password });
    if (res.status === 202 || res.data?.mfa_required) {
      return res.data;
    }

    const token = res.data.access_token || res.data.token;
    const { user, permissions: perms } = res.data;
    if (!token) {
      throw new Error('Login response did not include an access token.');
    }

    localStorage.setItem('platform_access_token', token);
    if (user) {
      localStorage.setItem('platform_user', JSON.stringify(user));
    }

    setPlatformUser(user || null);
    setPermissions(perms || []);
    return res.data;
  };

  const checkPermission = useCallback(
    (permissionCode) => {
      if (!platformUser) return false;
      return hasPlatformPermission(platformUser, permissionCode);
    },
    [platformUser]
  );

  const switchPersona = async (userId) => {
    const res = await platformApi.switchPlatformUser(userId);
    const { token, active_user } = res.data;

    if (token) {
      localStorage.setItem('platform_access_token', token);
    }
    if (active_user) {
      localStorage.setItem('platform_user', JSON.stringify(active_user));
      setPlatformUser(active_user);
    }
    // Refresh to get full permissions, scope, and company details
    await verifyAndRefreshUser();
    return res.data;
  };

  return (
    <PlatformAuthContext.Provider
      value={{
        platformUser,
        user: platformUser, // alias
        permissions,
        isLoading,
        isAuthenticated: Boolean(platformUser),
        login,
        logout,
        switchPersona,
        hasPermission: checkPermission,
        refreshUser: verifyAndRefreshUser,
      }}
    >
      {children}
    </PlatformAuthContext.Provider>
  );
};

export default PlatformAuthProvider;
