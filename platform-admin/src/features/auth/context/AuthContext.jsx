import React, { createContext } from 'react';
import { usePlatformAuth } from '../../../auth/PlatformAuthContext';

export const AuthContext = createContext(null);

export function useAuth() {
  const auth = usePlatformAuth();
  const user = auth?.platformUser
    ? {
        ...auth.platformUser,
        role: auth.platformUser.role || 'platform_admin',
        is_superuser: true,
        is_admin: true,
        branches: auth.platformUser.branches || [],
      }
    : {
        id: 'platform-staff',
        role: 'platform_super_admin',
        is_superuser: true,
        is_admin: true,
        branches: [],
      };

  return {
    ...auth,
    user,
    hasPermission: auth?.hasPermission || (() => true),
  };
}

export default useAuth;
