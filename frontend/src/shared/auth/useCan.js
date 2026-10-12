import { useMemo } from 'react';
import { useAuth } from '../../features/auth/context/AuthContext';
import { can, canAll, canAny } from '../permissions/registry';

export const useCan = () => {
  const { permissionSet, user } = useAuth();

  const ctx = useMemo(() => ({
    permissions: permissionSet,
    isSuperuser: Boolean(user?.is_superuser) || Boolean(permissionSet?.has?.('*')),
    isSystemAdmin: Boolean(user?.is_system_admin),
    isCompanyAdmin: Boolean(user?.is_company_owner) || Boolean(permissionSet?.has?.('crm.admin')) || Boolean(permissionSet?.has?.('settings.manage')) || Boolean(permissionSet?.has?.('*')),
  }), [permissionSet, user?.is_superuser, user?.is_system_admin, user?.is_company_owner]);

  return useMemo(() => ({
    can: (required) => can(required, ctx),
    canAll: (required) => canAll(required, ctx),
    canAny: (required) => canAny(required, ctx),
    context: ctx,
  }), [ctx]);
};

export default useCan;
