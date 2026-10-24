import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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

// Storage keys from before cookie sessions; removed, never read.
const LEGACY_KEYS = ['platform_access_token', 'platform_user'];

export const PlatformAuthProvider = ({ children }) => {
  // The session is an HttpOnly cookie; the profile is kept in memory only,
  // so nothing about the signed-in staff member outlives the browser.
  const [platformUser, setPlatformUser] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const verificationStarted = useRef(false);
  const navigate = useNavigate();

  const clearLocalSession = useCallback(() => {
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
    setPlatformUser(null);
    setPermissions([]);
  }, []);

  const logout = useCallback(() => {
    clearLocalSession();
    navigate('/login');
    // The server revokes the session and deletes the cookie.
    platformApi.logout().catch(() => {});
  }, [clearLocalSession, navigate]);

  const verifyAndRefreshUser = useCallback(async () => {
    try {
      // A 401 here just means "not signed in"; it must not fire session expiry.
      const res = await platformApi.getPlatformAuthMe({ skipSessionExpiry: true });
      if (res?.data?.user) {
        setPlatformUser(res.data.user);
        setPermissions(Array.isArray(res.data.permissions) ? res.data.permissions : null);
      } else {
        setPlatformUser(null);
        setPermissions(null);
      }
    } catch (err) {
      if (err?.response?.status !== 401) {
        console.warn('Platform authentication verification failed:', err?.response?.data || err?.message);
      }
      // Never keep protected routes mounted when the server cannot verify the user.
      setPlatformUser(null);
      setPermissions(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!verificationStarted.current) {
      verificationStarted.current = true;
      for (const key of LEGACY_KEYS) localStorage.removeItem(key);
      verifyAndRefreshUser();
    }

    const handleSessionExpired = () => {
      clearLocalSession();
      navigate('/login');
    };

    window.addEventListener('platform:session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('platform:session_expired', handleSessionExpired);
    };
  }, [verifyAndRefreshUser, clearLocalSession, navigate]);

  const login = async (email, password) => {
    await platformApi.ensureCsrf();
    const res = await platformApi.login({ email, password });
    if (res.status === 202 || res.data?.mfa_required) {
      return res.data;
    }

    // The session token is set as an HttpOnly cookie and never reaches this code.
    const { user, permissions: perms } = res.data || {};
    if (user) {
      setPlatformUser(user);
      setPermissions(Array.isArray(perms) ? perms : null);
    } else {
      await verifyAndRefreshUser();
    }
    return res.data;
  };

  const checkPermission = useCallback(
    (permissionCode) => {
      if (!platformUser) return false;
      if (permissions !== null) return permissions.includes(permissionCode);
      return hasPlatformPermission(platformUser, permissionCode);
    },
    [platformUser, permissions]
  );

  const switchPersona = async (userId) => {
    const res = await platformApi.switchPlatformUser(userId);
    const { active_user } = res.data;

    if (active_user) {
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
