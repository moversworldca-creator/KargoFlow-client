// Rule conditions in plain language, and the guided condition builder.
// A condition is text in the Pricing Engine's safe expression language,
// stored as {"expr": "..."}; the backend validates and evaluates it. This
// module only writes the common shapes and describes them back to people.
import { MONTHS, WEEKDAYS } from './constants';

const quote = (value) => `'${String(value).replace(/'/g, '')}'`;

/** Guided choice -> expression text. Returns '' for "always". */
export function buildCondition(kind, value = {}) {
  switch (kind) {
    case 'always':
      return '';
    case 'weekend':
      return 'is_weekend';
    case 'weekdays': {
      const days = (value.days || []).map((d) => WEEKDAYS.indexOf(d) + 1).filter((n) => n > 0);
      return days.map((n) => `weekday == ${n}`).join(' or ');
    }
    case 'months': {
      const months = (value.months || []).map((m) => MONTHS.indexOf(m) + 1).filter((n) => n > 0);
      return months.map((n) => `month == ${n}`).join(' or ');
    }
    case 'month_end':
      return `day_of_month >= ${Number(value.fromDay) || 25}`;
    case 'dates':
      return (value.dates || []).filter(Boolean).map((d) => `service_date == ${quote(d)}`).join(' or ');
    case 'flag':
      return value.code ? `flags.${value.code}` : '';
    case 'custom':
      return String(value.expr || '').trim();
    default:
      return '';
  }
}

/** Expression text -> {kind, value} when it is one of the guided shapes. */
export function parseCondition(expr) {
  const text = String(expr || '').trim();
  if (!text) return { kind: 'always', value: {} };
  if (text === 'is_weekend') return { kind: 'weekend', value: {} };
  const parts = text.split(/\s+or\s+/);
  const all = (re) => parts.every((p) => re.test(p.trim()));
  if (all(/^weekday == [1-7]$/)) {
    return { kind: 'weekdays', value: { days: parts.map((p) => WEEKDAYS[Number(p.trim().slice(-1)) - 1]) } };
  }
  if (all(/^month == (1[0-2]|[1-9])$/)) {
    return { kind: 'months', value: { months: parts.map((p) => MONTHS[Number(p.trim().split('== ')[1]) - 1]) } };
  }
  const monthEnd = /^day_of_month >= (\d{1,2})$/.exec(text);
  if (monthEnd) return { kind: 'month_end', value: { fromDay: monthEnd[1] } };
  if (all(/^service_date == '\d{4}-\d{2}-\d{2}'$/)) {
    return { kind: 'dates', value: { dates: parts.map((p) => p.trim().slice(17, -1)) } };
  }
  const flag = /^flags\.([a-z0-9_]+)$/.exec(text);
  if (flag) return { kind: 'flag', value: { code: flag[1] } };
  return { kind: 'custom', value: { expr: text } };
}

const humanCode = (code) => String(code).replace(/_/g, ' ');

/** Plain-language description of a stored condition. */
export function describeCondition(condition) {
  const expr = typeof condition === 'string' ? condition : condition?.expr;
  const { kind, value } = parseCondition(expr);
  switch (kind) {
    case 'always': return 'Always';
    case 'weekend': return 'Weekends (Saturday and Sunday)';
    case 'weekdays': return `On ${value.days.join(', ')}`;
    case 'months': return `In ${value.months.join(', ')}`;
    case 'month_end': return `From day ${value.fromDay} of the month (month end)`;
    case 'dates': return `On ${value.dates.join(', ')}`;
    case 'flag': return `When the job has ${humanCode(value.code)}`;
    default: return `Custom: ${value.expr}`;
  }
}

/** Calendar variables a condition may read: used to recognize calendar periods. */
export const isCalendarCondition = (condition) => {
  const expr = typeof condition === 'string' ? condition : condition?.expr;
  return /\b(is_weekend|weekday|month|day_of_month|service_date)\b/.test(String(expr || ''));
};
