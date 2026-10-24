const LEGACY_KEYS = ['access_token', 'refresh_token', 'user', 'active_company', 'active_company_id', 'isAuthenticated'];

export const getTenantToken = () => sessionStorage.getItem('tenant_access_token');

export function clearTenantSession() {
  sessionStorage.removeItem('tenant_access_token');
  sessionStorage.removeItem('support_console_context');
  for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  window.__activeCompanyId = null;
}

export function expireTenantSession() {
  clearTenantSession();
  window.dispatchEvent(new Event('tenant:session-expired'));
}
