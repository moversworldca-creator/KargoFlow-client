import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import auth from '../services/auth';
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
    auth.logout();
    setPlatformUser(null);
    setPermissions([]);
    navigate('/login');
  }, [navigate]);

  const verifyAndRefreshUser = useCallback(async () => {
    const token = localStorage.getItem('platform_access_token') || localStorage.getItem('access_token');
    if (!token) {
      setPlatformUser(null);
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    try {
      const res = await auth.getPlatformAuthMe();
      const user = res?.data?.user || res?.data;
      if (user) {
        setPlatformUser(user);
        setPermissions(res?.data?.permissions || user?.permissions || []);
        localStorage.setItem('platform_user', JSON.stringify(user));
      }
    } catch (err) {
      console.warn('Platform authentication verification failed:', err?.response?.data || err?.message);
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        localStorage.removeItem('platform_access_token');
        localStorage.removeItem('access_token');
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

    const handleSessionExpired = () => {
      setPlatformUser(null);
      setPermissions([]);
      navigate('/login');
    };

    window.addEventListener('platform:session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('platform:session_expired', handleSessionExpired);
    };
  }, [verifyAndRefreshUser, navigate]);

  const login = async (email, password) => {
    const res = await auth.login({
      email,
      password,
      identity_type: 'platform',
    });
    const data = res.data;
    const user = data.user || {
      id: data.user_id,
      email,
      role: 'super_admin',
      name: email.split('@')[0],
      status: 'active',
      is_active: true,
      company_scope_type: 'all',
      identity_type: data.identity_type || 'platform',
    };
    const perms = data.permissions || [];

    setPlatformUser(user);
    setPermissions(perms);
    return data;
  };

  const checkPermission = useCallback(
    (permissionCode) => {
      if (!platformUser) return false;
      return hasPlatformPermission(platformUser, permissionCode);
    },
    [platformUser]
  );

  const switchPersona = async (userId) => {
    const res = await auth.switchPlatformUser(userId);
    const { token, active_user } = res.data || {};

    if (token) {
      localStorage.setItem('platform_access_token', token);
      localStorage.setItem('access_token', token);
    }
    if (active_user) {
      localStorage.setItem('platform_user', JSON.stringify(active_user));
      setPlatformUser(active_user);
    }
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
