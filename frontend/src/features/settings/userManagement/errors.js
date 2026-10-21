// Turns backend refusals into messages an administrator can act on.
//
// Backend envelopes:
//   {"error": "<code>", "detail": "<business message>"}   domain / DB rules (403, 404, 409, 422)
//   {"detail": "..."}                                      DRF permission / auth (401, 403)
//   {"field": ["message", ...]}                            DRF validation (400)
// Business messages written by the backend (e.g. "Only an active employee can
// be invited to log in.") are safe to show and are shown as written.

const READ_ONLY_CODES = new Set(['tenant_read_only', 'subscription_access_denied']);
const BLOCKED_CODES = new Set(['tenant_blocked']);

export const ERROR_KIND = Object.freeze({
  VALIDATION: 'validation',     // 400 / 422: fix the input
  DENIED: 'denied',             // 403: no permission for this record or action
  READ_ONLY: 'read_only',       // 403: subscription allows reading only
  BLOCKED: 'blocked',           // 403: tenant access blocked
  NOT_FOUND: 'not_found',       // 404
  CONFLICT: 'conflict',         // 409: duplicate / already exists
  SESSION: 'session',           // 401: signed out
  NETWORK: 'network',
  SERVER: 'server',
});

const firstFieldMessage = (data) => {
  for (const [field, value] of Object.entries(data || {})) {
    if (field === 'error') continue;
    if (Array.isArray(value) && value.length) return { field, message: String(value[0]) };
    if (typeof value === 'string' && field !== 'detail') return { field, message: value };
  }
  return null;
};

/** Field-level messages from a DRF 400 response, keyed by field name. */
export const fieldErrors = (error) => {
  const data = error?.response?.data;
  if (error?.response?.status !== 400 || !data || typeof data !== 'object') return {};
  const out = {};
  for (const [field, value] of Object.entries(data)) {
    if (field === 'detail' || field === 'error') continue;
    out[field] = Array.isArray(value) ? value.map(String).join(' ') : String(value);
  }
  return out;
};

/**
 * Classify a failed request. Returns { kind, status, message, code }.
 * `fallback` is used only when the backend sent no usable message.
 */
export const describeError = (error, fallback = 'The request could not be completed.') => {
  const response = error?.response;
  if (!response) {
    return { kind: ERROR_KIND.NETWORK, status: 0, code: '', message: error?.message && !/status code/i.test(error.message) ? error.message : 'The server could not be reached. Check your connection and try again.' };
  }
  const { status } = response;
  const data = response.data && typeof response.data === 'object' ? response.data : {};
  const code = typeof data.error === 'string' ? data.error : '';
  const detail = typeof data.detail === 'string' && data.detail ? data.detail : '';

  if (status === 401) {
    return { kind: ERROR_KIND.SESSION, status, code, message: 'Your session has ended. Sign in again to continue.' };
  }
  if (status === 403) {
    if (READ_ONLY_CODES.has(code)) {
      return { kind: ERROR_KIND.READ_ONLY, status, code, message: "Your company's subscription is read-only. Changes are disabled until the subscription is active again." };
    }
    if (BLOCKED_CODES.has(code)) {
      return { kind: ERROR_KIND.BLOCKED, status, code, message: "Your company's access is blocked. Contact your account owner." };
    }
    return { kind: ERROR_KIND.DENIED, status, code, message: detail || 'You do not have permission to do this.' };
  }
  if (status === 404) return { kind: ERROR_KIND.NOT_FOUND, status, code, message: detail || 'This record no longer exists.' };
  if (status === 409) return { kind: ERROR_KIND.CONFLICT, status, code, message: detail || 'This already exists.' };
  if (status === 400 || status === 422) {
    const field = firstFieldMessage(data);
    const message = detail || (field ? (field.field === 'non_field_errors' ? field.message : `${humanize(field.field)}: ${field.message}`) : fallback);
    return { kind: ERROR_KIND.VALIDATION, status, code, message };
  }
  return { kind: ERROR_KIND.SERVER, status, code, message: detail || fallback };
};

export const errorMessage = (error, fallback) => describeError(error, fallback).message;

const humanize = (field) => String(field).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
