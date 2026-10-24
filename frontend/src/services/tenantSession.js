// The session itself lives in an HttpOnly cookie that JavaScript cannot read.
// The browser only remembers which client this tab is (tenant or support
// console) so requests name the right cookie; that value grants nothing.
const LEGACY_KEYS = ['access_token', 'refresh_token', 'user', 'active_company', 'active_company_id', 'isAuthenticated'];
const CLIENT_MODE_KEY = 'kf_client_mode';

export const getClientMode = () => (sessionStorage.getItem(CLIENT_MODE_KEY) === 'support' ? 'support' : 'tenant');

export function setClientMode(mode) {
  if (mode === 'support') sessionStorage.setItem(CLIENT_MODE_KEY, 'support');
  else sessionStorage.removeItem(CLIENT_MODE_KEY);
}

// Bumped on every sign-in and sign-out, so a 401 from a request that belongs
// to an earlier session cannot end the current one.
let sessionGeneration = 0;
export const getSessionGeneration = () => sessionGeneration;
export const nextSessionGeneration = () => ++sessionGeneration;

export function readCsrfToken() {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export function clearTenantSession() {
  // Tokens from before cookie sessions; never read, only removed.
  sessionStorage.removeItem('tenant_access_token');
  sessionStorage.removeItem(CLIENT_MODE_KEY);
  for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  window.__activeCompanyId = null;
}

export function expireTenantSession() {
  clearTenantSession();
  window.dispatchEvent(new Event('tenant:session-expired'));
}
