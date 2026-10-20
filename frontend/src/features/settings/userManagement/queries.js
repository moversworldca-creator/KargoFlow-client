// Server state for User Management / RBAC (TanStack Query).
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getBranches, getEmployeeInvitations, getEmployees, getEntitlementSnapshot, getPermissions, getRoles,
  getUserAccess, getUserOverrides, getUsers,
} from '../../../services/api';
import { useAuth } from '../../auth/context/AuthContext';

export const userAdminKeys = {
  all: ['user-admin'],
  employees: (params) => ['user-admin', 'employees', params],
  users: () => ['user-admin', 'users'],
  invitations: () => ['user-admin', 'invitations'],
  access: (userId) => ['user-admin', 'access', userId],
  roles: () => ['user-admin', 'roles'],
  permissions: () => ['user-admin', 'permissions'],
  overrides: (params) => ['user-admin', 'overrides', params],
  branches: () => ['user-admin', 'branches'],
  entitlements: () => ['user-admin', 'entitlements'],
};

const list = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

// Administrative screens show what is true now, not a five-minute-old copy.
const fresh = { staleTime: 0, refetchOnMount: 'always', retry: false };

export const useEmployees = (params, enabled = true) => useQuery({
  queryKey: userAdminKeys.employees(params),
  queryFn: () => getEmployees(params),
  enabled,
  placeholderData: (previous) => previous,
  ...fresh,
});

export const useUsers = (enabled) => useQuery({
  queryKey: userAdminKeys.users(), queryFn: async () => list(await getUsers()), enabled, ...fresh,
});

export const useInvitations = (enabled) => useQuery({
  queryKey: userAdminKeys.invitations(), queryFn: async () => list(await getEmployeeInvitations()), enabled, ...fresh,
});

export const useUserAccess = (userId, enabled) => useQuery({
  queryKey: userAdminKeys.access(userId), queryFn: () => getUserAccess(userId), enabled: Boolean(userId) && enabled, ...fresh,
});

export const useRoles = (enabled) => useQuery({
  queryKey: userAdminKeys.roles(), queryFn: async () => list(await getRoles()), enabled, ...fresh,
});

export const usePermissionCatalog = (enabled) => useQuery({
  queryKey: userAdminKeys.permissions(), queryFn: async () => list(await getPermissions()), enabled, staleTime: 5 * 60 * 1000, retry: false,
});

export const useOverrides = (params, enabled) => useQuery({
  queryKey: userAdminKeys.overrides(params), queryFn: async () => list(await getUserOverrides(params)), enabled, ...fresh,
});

export const useBranchCatalog = (enabled) => useQuery({
  queryKey: userAdminKeys.branches(), queryFn: async () => list(await getBranches()), enabled, staleTime: 60 * 1000, retry: false,
});

/**
 * Plan features and subscription access mode. Only readable with
 * entitlements.view; without it the UI does not guess and the backend's answer
 * to each change is shown instead.
 */
export const useEntitlements = (enabled) => useQuery({
  queryKey: userAdminKeys.entitlements(), queryFn: getEntitlementSnapshot, enabled, staleTime: 60 * 1000, retry: false,
});

export const isReadOnlyMode = (snapshot) => ['read_only', 'blocked'].includes(snapshot?.access_mode);
export const featureMode = (snapshot, key) => snapshot?.features?.[key] ?? null;

/**
 * After any change to employees, logins, roles, grants or overrides: refetch
 * the administrative lists and the signed-in user's own permissions, which the
 * change may have altered (an admin editing a role they hold, for example).
 */
export const useRefreshAfterChange = () => {
  const queryClient = useQueryClient();
  const { refreshSession } = useAuth();
  return useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: userAdminKeys.all }),
      refreshSession ? refreshSession() : Promise.resolve(),
    ]);
  }, [queryClient, refreshSession]);
};
