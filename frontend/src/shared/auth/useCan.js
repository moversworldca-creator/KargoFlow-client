import { useMemo } from 'react';
import { useAuth } from '../../features/auth/context/AuthContext';
import { can, canAll, canAny } from '../permissions/registry';

export const useCan = () => {
  const { permissionSet, user } = useAuth();

  const ctx = useMemo(() => ({
    permissions: permissionSet,
    isSuperuser: Boolean(user?.is_superuser),
    isSystemAdmin: Boolean(user?.is_system_admin),
    isCompanyAdmin: Boolean(permissionSet?.has?.('crm.admin')),
  }), [permissionSet, user?.is_superuser, user?.is_system_admin]);

  return useMemo(() => ({
    can: (required) => can(required, ctx),
    canAll: (required) => canAll(required, ctx),
    canAny: (required) => canAny(required, ctx),
    context: ctx,
  }), [ctx]);
};

export default useCan;
