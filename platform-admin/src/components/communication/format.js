// Shared presentation helpers for the Communication Infrastructure Console.
// The API returns null for anything the platform has no fact for; every
// helper here renders that as a dash instead of a made-up value.

export const DASH = '—';

export const PROVIDER_LABEL = { resend: 'Resend', telnyx: 'Telnyx' };

export function count(value) {
  return value === null || value === undefined ? DASH : Number(value).toLocaleString();
}

export function percent(value, digits = 2) {
  return value === null || value === undefined ? DASH : `${Number(value).toFixed(digits)}%`;
}

export function money(value, currency) {
  if (value === null || value === undefined) return DASH;
  const amount = Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${amount} ${currency}` : amount;
}

export function dateTime(value) {
  if (!value) return DASH;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? DASH : date.toLocaleString();
}

export function ago(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function titleCase(value) {
  if (!value) return DASH;
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const TONES = {
  good: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400',
  warn: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400',
  bad: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400',
  idle: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
};
const DOTS = { good: 'bg-emerald-500', warn: 'bg-amber-500', bad: 'bg-rose-500', idle: 'bg-slate-400', info: 'bg-blue-500' };

export function toneClass(tone) {
  return TONES[tone] || TONES.idle;
}

export function dotClass(tone) {
  return DOTS[tone] || DOTS.idle;
}

// Health status of a provider row from /health/ and /overview/.
const HEALTH = {
  operational: ['Operational', 'good'],
  degraded: ['Degraded', 'warn'],
  down: ['Connection failing', 'bad'],
  suspended: ['Suspended', 'bad'],
  unconfigured: ['Not configured', 'idle'],
  disabled: ['Disabled', 'idle'],
  unknown: ['Not tested', 'warn'],
  simulated: ['Simulated', 'info'],
};

export function healthBadge(status) {
  const [label, tone] = HEALTH[status] || [titleCase(status), 'idle'];
  return { label, tone };
}

// Lifecycle states of messages, domains, numbers and DNS records.
const GOOD = ['verified', 'delivered', 'sent', 'active', 'provisioned', 'approved', 'enabled', 'legacy_imported', 'not_required'];
const BAD = ['failed', 'bounced', 'complained', 'suspended', 'rejected', 'cancelled'];

export function stateTone(state) {
  if (GOOD.includes(state)) return 'good';
  if (BAD.includes(state)) return 'bad';
  if (!state) return 'idle';
  return 'warn';
}

export function apiError(error, fallback) {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data.detail === 'string') return data.detail;
  if (typeof data.error === 'string' && data.error !== 'domain_error') return data.error;
  const first = Object.values(data).flat().find((item) => typeof item === 'string');
  return first || fallback;
}
