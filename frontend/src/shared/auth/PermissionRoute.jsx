import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useCan from './useCan';
import { useToast } from '../context/ToastContext';

const PermissionRoute = ({ required, children, fallbackPath = '/dashboard' }) => {
  const { canAll, canAny } = useCan();
  const location = useLocation();
  const { showToast } = useToast();
  const normalizedRequired = required && typeof required === 'object' && !Array.isArray(required) && !(required instanceof Set)
    ? required
    : { permissions: required, match: undefined };
  const matchMode = normalizedRequired.match || (location.pathname.startsWith('/settings') ? 'any' : 'all');
  const permissions = normalizedRequired.permissions;

  const allowed = matchMode === 'any' ? canAny(permissions) : canAll(permissions);

  useEffect(() => {
    if (!allowed) {
      showToast('You do not have access to that page.', 'warning', 3000);
    }
  }, [allowed, showToast]);

  if (!allowed) {
    return <Navigate to={fallbackPath} replace state={{ from: location.pathname }} />;
  }

  return children;
};

export default PermissionRoute;
