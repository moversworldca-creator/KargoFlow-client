import { describe, expect, it } from 'vitest';
import { decimalSign, formatDateOnly, formatMoney, localInputToIso } from '../format';
import { toSimpleConfig, EMPTY_SIMPLE } from '../components/SimpleTariffForm';
import { cleanJobInputs, jobInputsToForm, EMPTY_JOB_INPUTS } from '../components/JobInputsForm';
import { revisionDiff } from '../components/RevisionDiff';
import { listToMask, maskToList } from '../components/ApplicabilityEditor';
import { WEEKDAYS, MONTHS } from '../constants';
import { pricingError } from '../errors';
import { buildCalculationBody } from '../../estimates/components/EstimateDetail';

describe('money and dates are displayed, never computed', () => {
  it('formats backend decimal strings without float conversion', () => {
    expect(formatMoney('1418.75', 'USD')).toBe('$1,418.75');
    expect(formatMoney('-80', 'USD')).toBe('-$80.00');
    expect(formatMoney('0.1', 'USD')).toBe('$0.10');
    expect(formatMoney('247.500000', 'USD')).toBe('$247.500000');
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney('12345678901234567890.01', 'USD')).toBe('$12,345,678,901,234,567,890.01');
  });

  it('reads the sign of a decimal string', () => {
    expect(decimalSign('0.00')).toBe(0);
    expect(decimalSign('-0')).toBe(0);
    expect(decimalSign('-3.10')).toBe(-1);
    expect(decimalSign('40.00')).toBe(1);
    expect(decimalSign('abc')).toBe(0);
  });

  it('shows business dates exactly as stored (no timezone shift)', () => {
    expect(formatDateOnly('2026-10-21')).toBe('Oct 21, 2026');
    expect(formatDateOnly('2026-01-01')).toBe('Jan 1, 2026');
    expect(formatDateOnly('')).toBe('—');
  });

  it('converts a local date-time input to an ISO instant with offset', () => {
    expect(new Date(localInputToIso('2026-10-21T09:30')).getTime()).toBe(new Date('2026-10-21T09:30').getTime());
    expect(localInputToIso('2026-10-21T09:30')).toMatch(/Z$/);
    expect(localInputToIso('')).toBeNull();
  });
});

describe('Simple Tariff configuration', () => {
  it('produces the backend Simple configuration from the guided form', () => {
    const { config, errors } = toSimpleConfig({
      ...EMPTY_SIMPLE,
      crew_rates: [{ crew_size: '2', truck_count: '1', rate: '180' }, { crew_size: '3', truck_count: '1', rate: '225' }],
      minimum_hours: '3', travel_model: 'flat', travel_amount: '150', weekend_surcharge_pct: '10', deposit_pct: '10',
      materials: [{ key: 'box', price: '4' }],
    });
    expect(errors).toEqual({});
    expect(config).toEqual({
      crew_rates: [{ crew_size: 2, truck_count: 1, rate: '180' }, { crew_size: 3, truck_count: 1, rate: '225' }],
      minimum_hours: '3', travel: { model: 'flat', amount: '150' }, weekend_surcharge_pct: '10', deposit_pct: '10',
      materials: { box: '4' },
    });
  });

  it('rejects duplicates, missing rates and bad material codes', () => {
    const { errors } = toSimpleConfig({
      ...EMPTY_SIMPLE,
      crew_rates: [{ crew_size: '2', truck_count: '1', rate: '' }, { crew_size: '2', truck_count: '1', rate: '1' }],
      materials: [{ key: 'Big Box', price: '' }],
    });
    expect(errors.rate_0).toBeTruthy();
    expect(errors.crew_1).toMatch(/twice/);
    expect(errors.material_0).toBeTruthy();
    expect(errors.material_price_0).toBeTruthy();
  });

  it('uses a flat price instead of crew rates', () => {
    expect(toSimpleConfig({ ...EMPTY_SIMPLE, mode: 'flat', flat_rate: '3500' }).config).toEqual({ flat_rate: '3500' });
    expect(toSimpleConfig({ ...EMPTY_SIMPLE, mode: 'flat' }).errors.flat_rate).toBeTruthy();
  });
});

describe('calculation request', () => {
  it('keeps inputs as typed and drops empty fields', () => {
    const form = jobInputsToForm({});
    form.crew = { crew_size: '3', truck_count: '1', skills: { piano: '1', mover: '' } };
    form.estimated_hours = '5.25';
    form.distance = { value: '42', unit: 'mile' };
    form.materials = { box: '20', '': '' };
    form.flags = { has_stairs: true, has_elevator: false };
    expect(cleanJobInputs(form)).toEqual({
      crew: { crew_size: 3, truck_count: 1, skills: { piano: 1 } }, estimated_hours: '5.25',
      distance: { value: '42', unit: 'mile' }, materials: { box: 20 }, flags: { has_stairs: true },
    });
    expect(cleanJobInputs(EMPTY_JOB_INPUTS)).toEqual({});
  });

  it('builds the estimate body: scope jobs, constraint, discounts', () => {
    const body = buildCalculationBody(
      [{ job_id: 501, is_included: true }, { job_id: 502, is_included: false }],
      {
        jobs: { 501: { estimated_hours: '5' } },
        estimate: { constraint_type: 'not_to_exceed', amount: '3200', promotions: [{ name: 'Spring', percentage: '-5' }],
          manual_adjustments: [{ name: 'Goodwill', amount: '-50', reason: 'late' }], tax_exempt: false },
      },
    );
    expect(body.jobs).toEqual([{ job_id: 501, inputs: { estimated_hours: '5' } }]);
    expect(body.estimate.constraints).toEqual([{ constraint_type: 'not_to_exceed', amount: '3200' }]);
    expect(body.estimate.promotions).toEqual([{ key: 'promo1', name: 'Spring', percentage: '-5' }]);
    expect(body.estimate.manual_adjustments[0]).toMatchObject({ amount: '-50', reason: 'late', source: 'manual' });
    expect(body.estimate.tax_exempt).toBeUndefined();
  });

  it('sends a range constraint with both bounds', () => {
    const body = buildCalculationBody([{ job_id: 1 }], { estimate: { constraint_type: 'range', range_min: '1000', range_max: '1500' } });
    expect(body.estimate.constraints).toEqual([{ constraint_type: 'range', range_min: '1000', range_max: '1500' }]);
  });
});

describe('revision comparison and masks', () => {
  it('reports added, removed and changed items by key', () => {
    const older = { rules: [{ id: 1, rule_key: 'labor', rate_amount: '180' }, { id: 2, rule_key: 'fuel', percentage: '5' }],
      rate_tables: [{ table_key: 'crew', cells: [{ cell_key: 'c3', amount: '225' }] }] };
    const newer = { rules: [{ id: 9, rule_key: 'labor', rate_amount: '190' }, { id: 10, rule_key: 'travel', base_amount: '150' }],
      rate_tables: [{ table_key: 'crew', cells: [{ cell_key: 'c3', amount: '230' }] }] };
    const sections = Object.fromEntries(revisionDiff(older, newer));
    expect(sections.Rules).toEqual([
      { key: 'labor', change: 'changed', fields: [{ field: 'rate_amount', from: '180', to: '190' }] },
      { key: 'travel', change: 'added', fields: [] },
      { key: 'fuel', change: 'removed', fields: [] },
    ]);
    expect(sections['Rate cells'][0]).toMatchObject({ key: 'crew › c3', change: 'changed' });
  });

  it('weekday and month masks match the resolver bit order', () => {
    expect(listToMask(['Sat', 'Sun'], WEEKDAYS)).toBe(0b1100000);
    expect(maskToList(0b11100000, MONTHS)).toEqual(['Jun', 'Jul', 'Aug']);
  });
});

describe('pricing errors', () => {
  it('maps stable codes to actionable messages and keeps the detail', () => {
    const info = pricingError({ response: { status: 409, data: { error: 'conflict', code: 'STALE_VERSION', detail: 'changed' } } });
    expect(info.code).toBe('STALE_VERSION');
    expect(info.message).toMatch(/Someone else changed/);
    expect(info.kind).toBe('conflict');
    const denied = pricingError({ response: { status: 403, data: { error: 'access_denied', code: 'UNAUTHORIZED_PRICING_OVERRIDE', permission_key: 'pricing.override_nte' } } });
    expect(denied.permissionKey).toBe('pricing.override_nte');
    expect(denied.kind).toBe('denied');
  });
});
