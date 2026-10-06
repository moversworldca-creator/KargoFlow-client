import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../features/auth/context/AuthContext';
import {
  getBranchLookups,
  getLookupUsers,
  getReferralSourceLookups,
  getMoverSizeLookups,
  getStatusCodeLookups,
  getUnreadNotificationsCount,
  getCommunicationTemplates,
  getCommunicationTemplateCategories,
  getTasks,
  getLeadActivities,
} from '../../services/api';
import { getUserBranchIds } from '../utils/branchScope';

const asList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.results)) return res.results;
  return [];
};

const sharedQueryOptions = {
  staleTime: 30 * 60 * 1000,
  gcTime: 60 * 60 * 1000,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
};

export const useBranchesLookup = () => {
  const { user } = useAuth();
  const allowedBranchIds = getUserBranchIds(user);
  const restrictToAccessibleBranches = allowedBranchIds.length > 0 && !user?.is_superuser && !user?.is_system_admin;

  return useQuery({
    queryKey: ['branches', restrictToAccessibleBranches ? allowedBranchIds.join(',') : 'all'],
    queryFn: async () => {
      const rows = asList(await getBranchLookups());
      return restrictToAccessibleBranches
        ? rows.filter((branch) => allowedBranchIds.includes(String(branch.id)))
        : rows;
    },
    ...sharedQueryOptions,
  });
};

export const useUsersLookup = (branch = null) => {
  const { user } = useAuth();
  const allowedBranchIds = getUserBranchIds(user);
  const restrictToAccessibleBranches = allowedBranchIds.length > 0 && !user?.is_superuser && !user?.is_system_admin;

  return useQuery({
    queryKey: ['users', branch || 'all', restrictToAccessibleBranches ? allowedBranchIds.join(',') : 'all'],
    queryFn: async () => {
      const rows = asList(await getLookupUsers(branch ? { branch } : { limit: 100 }));
      return restrictToAccessibleBranches
        ? rows.filter((item) => getUserBranchIds(item).some((branchId) => allowedBranchIds.includes(String(branchId))))
        : rows;
    },
    ...sharedQueryOptions,
  });
};

export const useStatusLookups = (branch = null) =>
  useQuery({
    queryKey: ['statuses', branch || 'all'],
    queryFn: async () => asList(await getStatusCodeLookups(branch ? { branch } : { limit: 100 })),
    ...sharedQueryOptions,
  });

export const useReferralSourcesLookup = () =>
  useQuery({
    queryKey: ['lead-sources'],
    queryFn: async () => asList(await getReferralSourceLookups()),
    ...sharedQueryOptions,
  });

export const useMoverSizesLookup = (branch = null) =>
  useQuery({
    queryKey: ['mover-sizes', branch || 'all'],
    queryFn: async () => asList(await getMoverSizeLookups(branch ? { branch } : {})),
    ...sharedQueryOptions,
  });

export const useUnreadNotificationsCount = () =>
  useQuery({
    queryKey: ['unreadNotificationsCount'],
    queryFn: async () => {
      const res = await getUnreadNotificationsCount();
      return Number(res?.unread ?? 0);
    },
    staleTime: 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    placeholderData: (prev) => prev,
  });

export const useCommunicationTemplatesLookup = (branch = null, channel = null) =>
  useQuery({
    queryKey: ['communicationTemplates', branch || 'all', channel || 'all'],
    queryFn: async () => asList(await getCommunicationTemplates({ ...(branch ? { branch } : {}), ...(channel ? { channel } : {}), limit: 500 })),
    ...sharedQueryOptions,
  });

export const useCommunicationTemplateCategoriesLookup = (branch = null) =>
  useQuery({
    queryKey: ['communicationTemplateCategories', branch || 'all'],
    queryFn: async () => asList(await getCommunicationTemplateCategories(branch ? { branch } : {})),
    ...sharedQueryOptions,
  });

export const useLeadActivitiesLookup = (params) =>
  useQuery({
    queryKey: ['leadActivities', params],
    queryFn: async () => asList(await getLeadActivities(params)),
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

export const useTasksLookup = (params) =>
  useQuery({
    queryKey: ['tasks', params],
    queryFn: async () => asList(await getTasks(params)),
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
