// Display helpers. Money arrives from the backend as exact decimal strings and
// is only formatted here: never added, multiplied or rounded into a new total.

const CURRENCY_DIGITS = 2;

/** "1418.75" -> "$1,418.75" for display. Returns '—' for empty values. */
export function formatMoney(value, currency = 'USD') {
  if (value === null || value === undefined || value === '') return '—';
  const text = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) return text;
  const negative = text.startsWith('-');
  const [whole, fraction = ''] = text.replace('-', '').split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  // Pad or keep the backend's own scale; a longer scale (rates) is shown as sent.
  const digits = fraction.length >= CURRENCY_DIGITS ? fraction : fraction.padEnd(CURRENCY_DIGITS, '0');
  const symbol = currencySymbol(currency);
  return `${negative ? '-' : ''}${symbol}${grouped}.${digits}`;
}

function currencySymbol(currency) {
  try {
    const parts = new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value || '$';
  } catch {
    return '$';
  }
}

/** Sign of a backend decimal string without converting it to a float. */
export function decimalSign(value) {
  const text = String(value ?? '').trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) return 0;
  if (/^-?0+(\.0+)?$/.test(text)) return 0;
  return text.startsWith('-') ? -1 : 1;
}

export function formatPercent(value) {
  if (value === null || value === undefined || value === '') return '—';
  return `${value}%`;
}

/**
 * A business date (YYYY-MM-DD) shown as written: it is a calendar date in the
 * branch's timezone, so it must never pass through `new Date()` (which would
 * shift it by the browser's UTC offset).
 */
export function formatDateOnly(value) {
  if (!value) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (!match) return String(value);
  const [, y, m, d] = match;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(m) - 1]} ${Number(d)}, ${y}`;
}

/** An instant (ISO with offset) shown in the viewer's local time. */
export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** Local date-time input value ("YYYY-MM-DDTHH:mm") -> ISO instant with offset. */
export function localInputToIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function isoToLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const humanize = (code) => String(code || '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

// Backend states, shown with their own names.
export const REVISION_STATE_TONE = {
  draft: 'slate', validated: 'blue', pending_approval: 'amber', approved: 'indigo', scheduled: 'violet',
  published: 'green', retired: 'dark', rejected: 'rose',
};
export const TARIFF_STATE_TONE = { draft: 'slate', active: 'green', inactive: 'amber', archived: 'dark' };
export const ESTIMATE_STATE_TONE = {
  draft: 'slate', ready: 'blue', sent: 'indigo', viewed: 'violet', accepted: 'green',
  reapproval_required: 'amber', superseded: 'dark', expired: 'rose', cancelled: 'rose',
};
export const CHANGE_ORDER_STATE_TONE = {
  draft: 'slate', ready: 'blue', sent: 'indigo', viewed: 'violet', accepted: 'green', cancelled: 'rose', superseded: 'dark',
};
export const SEVERITY_TONE = { error: 'rose', warning: 'amber', info: 'blue' };
