export const getPortalBaseUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const explicit =
      String(import.meta.env.PORTAL_BASE_URL || import.meta.env.VITE_PORTAL_BASE_URL || '').trim();
    if (explicit) return explicit.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }

  return '';
};
