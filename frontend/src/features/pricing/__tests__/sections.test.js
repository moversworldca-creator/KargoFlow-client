import { describe, expect, it } from 'vitest';
import { buildCondition, describeCondition, isCalendarCondition, parseCondition } from '../conditions';
import { accessorialRuleBody, sectionForRule, travelMethodOf, travelRuleBody } from '../components/RevisionSections';
import { groupCharges } from '../components/RunViewer';
import { sectionForIssue } from '../components/RevisionWorkspace';

describe('conditions in plain language', () => {
  it('builds and reads back the guided shapes', () => {
    const cases = [
      ['weekend', {}, 'is_weekend', 'Weekends (Saturday and Sunday)'],
      ['weekdays', { days: ['Sat', 'Sun'] }, 'weekday == 6 or weekday == 7', 'On Sat, Sun'],
      ['months', { months: ['Jun', 'Jul', 'Aug'] }, 'month == 6 or month == 7 or month == 8', 'In Jun, Jul, Aug'],
      ['month_end', { fromDay: '25' }, 'day_of_month >= 25', 'From day 25 of the month (month end)'],
      ['dates', { dates: ['2027-07-04', '2027-12-25'] }, "service_date == '2027-07-04' or service_date == '2027-12-25'", 'On 2027-07-04, 2027-12-25'],
    ];
    for (const [kind, value, expr, text] of cases) {
      expect(buildCondition(kind, value)).toBe(expr);
      expect(parseCondition(expr).kind).toBe(kind);
      expect(describeCondition({ expr })).toBe(text);
      expect(isCalendarCondition({ expr })).toBe(true);
    }
    expect(describeCondition({})).toBe('Always');
    expect(describeCondition({ expr: 'crew_size >= 3' })).toBe('Custom: crew_size >= 3');
    expect(isCalendarCondition({ expr: 'crew_size >= 3' })).toBe(false);
    expect(buildCondition('dates', { dates: ["2027-01-01' or 1"] })).toBe("service_date == '2027-01-01 or 1'");
  });
});

describe('travel configuration', () => {
  it('maps each moving-company method to one canonical rule', () => {
    expect(travelRuleBody('flat', { amount: '150' })).toMatchObject({ rule_type: 'travel', calculation_type: 'flat', base_amount: '150' });
    expect(travelRuleBody('travel_time', { rate: '90', minimum: '1' })).toMatchObject({ calculation_type: 'distance', pricing_model: 'hourly', rate_amount: '90', minimum_quantity: '1', quantity_source: 'travel_hours' });
    expect(travelRuleBody('round_trip_mileage', { rate: '2.10' })).toMatchObject({ pricing_model: 'round_trip_mileage', unit: 'mile', rate_amount: '2.10' });
    expect(travelRuleBody('zone', { table: '7' })).toMatchObject({ pricing_model: 'zone', rate_table_id: 7, rate_amount: null });
    expect(travelMethodOf(undefined)).toBe('none');
    expect(travelMethodOf({ calculation_type: 'flat' })).toBe('flat');
    expect(travelMethodOf({ calculation_type: 'distance', pricing_model: 'drive_time' })).toBe('drive_time');
    expect(travelMethodOf({ calculation_type: 'formula' })).toBe('custom');
  });
});

describe('accessorials', () => {
  it('never depends on a job flag that may be missing', () => {
    const piano = accessorialRuleBody({ code: 'piano', name: 'Piano', method: 'when_present', rate: '250' });
    expect(piano).toMatchObject({ calculation_type: 'quantity', quantity_source: 'accessorials.piano', rate_amount: '250', condition_expression: {} });
    expect(accessorialRuleBody({ code: 'stairs', name: 'Stairs', method: 'per_unit', unit: 'flight', rate: '40' })).toMatchObject({ quantity_source: 'accessorials.stairs', unit: 'flight' });
    expect(accessorialRuleBody({ code: 'extra_stop', name: 'Extra stop', method: 'per_stop', rate: '75' })).toMatchObject({ quantity_source: 'extra_stops' });
    expect(accessorialRuleBody({ code: 'waiting_time', name: 'Waiting', method: 'per_hour', rate: '60' })).toMatchObject({ calculation_type: 'hourly' });
  });
});

describe('validation issues link to their section', () => {
  const content = { rules: [{ rule_key: 'fuel', rule_type: 'fuel' }, { rule_key: 'sat', rule_type: 'surcharge', condition_expression: { expr: 'is_weekend' } }, { rule_key: 'boxes', rule_type: 'material', quantity_source: 'materials.box' }] };
  it('routes each object type', () => {
    expect(sectionForIssue({ object_type: 'rule', object_key: 'fuel' }, content)).toBe('adjustments');
    expect(sectionForIssue({ object_type: 'rule', object_key: 'sat' }, content)).toBe('calendar');
    expect(sectionForIssue({ object_type: 'rule', object_key: 'boxes' }, content)).toBe('packing');
    expect(sectionForIssue({ object_type: 'rate_table', object_key: 'crew' }, content)).toBe('rates');
    expect(sectionForIssue({ object_type: 'scenario', object_key: 'x' }, content)).toBe('tests');
    expect(sectionForRule({ rule_type: 'transportation', calculation_type: 'weight' })).toBe('transport');
  });
});

describe('charges grouping', () => {
  const line = (key, category, jobId, scope = 'job') => ({ charge_key: key, category, job_id: jobId, scope, amount: '1.00' });
  it('groups by category for one job', () => {
    const [section] = groupCharges([line('a', 'travel', 1), line('b', 'labor', 1), line('c', 'material', 1)]);
    expect(section.groups.map((g) => g.title)).toEqual(['Moving', 'Travel', 'Materials']);
  });
  it('groups by job plus shared Estimate charges for several jobs', () => {
    const sections = groupCharges([line('a', 'labor', 1), line('b', 'packing', 2), line('c', 'fuel', null, 'estimate')], { 1: 'Moving', 2: 'Packing day' });
    expect(sections.map((s) => s.title)).toEqual(['Moving', 'Packing day', 'Shared (whole Estimate)']);
  });
});
