import React from 'react';
import { useLocation } from 'react-router-dom';
import { usePlatformAuth } from '../auth/PlatformAuthContext';
import AccessDenied from '../components/AccessDenied';
import DocumentTemplates from '../features/settings/components/DocumentTemplates';
import { PLATFORM_PERMISSIONS } from '../rbac/platformRbac';

export default function DocumentTemplatesPage() {
  const { hasPermission } = usePlatformAuth();
  const { pathname } = useLocation();
  if (!hasPermission(PLATFORM_PERMISSIONS.TEMPLATES_VIEW)) {
    return <AccessDenied requiredPermission={PLATFORM_PERMISSIONS.TEMPLATES_VIEW} />;
  }
  const parts = pathname.replace(/^\/(document-templates|estimate-portal-templates|invoice-templates|communication-templates)\/?/, '').split('/').filter(Boolean);
  const initialKind = pathname.startsWith('/estimate-portal-templates') ? 'estimate_portal'
    : pathname.startsWith('/invoice-templates') ? 'invoice'
      : pathname.startsWith('/communication-templates') ? 'communication' : '';
  return <DocumentTemplates
    key={initialKind} initialKind={initialKind}
    builderRouteView={parts.includes('builder') ? 'builder' : ''}
    builderRouteItemId={parts[0] === 'builder' ? 'new' : parts[0] || null}
  />;
}
