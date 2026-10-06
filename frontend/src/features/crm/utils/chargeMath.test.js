import { test, assert } from 'vitest';
import {
  computeChargeTotal,
  formatHoursAsCompactDuration,
  parseDurationToHours,
} from './chargeMath.js';

const approxEqual = (actual, expected, epsilon = 1e-9) =>
  Math.abs(actual - expected) <= epsilon;

test('parseDurationToHours handles minutes, hours, blank, and invalid values', () => {
  assert.equal(parseDurationToHours('30m'), 0.5);
  assert.equal(parseDurationToHours('2h'), 2);
  assert.equal(parseDurationToHours('4.5'), 4.5);
  assert.equal(parseDurationToHours('', 7), 7);
  assert.equal(parseDurationToHours('not-a-duration', 3), 3);
});

test('formatHoursAsCompactDuration formats compact durations', () => {
  assert.equal(formatHoursAsCompactDuration(0), '0h');
  assert.equal(formatHoursAsCompactDuration(2), '2h');
  assert.equal(formatHoursAsCompactDuration(0.5), '30m');
});

test('computeChargeTotal calculates hourly moving labor correctly', () => {
  const total = computeChargeTotal(
    {
      category: 'moving_labor',
      labor_time_display: '2h',
      moving_labor_mode: 'hourly',
      hourly_rate_override: '150',
    },
    { estimatedHours: 2, hourlyRate: 100 }
  );

  assert.equal(total, 300);
});

test('computeChargeTotal calculates flat plus hourly moving labor correctly', () => {
  const total = computeChargeTotal(
    {
      category: 'moving_labor',
      labor_time_display: '5h',
      moving_labor_mode: 'flat_plus_hourly',
      flat_rate: '400',
      included_hours: '3h',
      additional_hourly_rate: '120',
    },
    { estimatedHours: 5, hourlyRate: 100 }
  );

  assert.equal(total, 640);
});

test('computeChargeTotal handles discount charges as negative values', () => {
  assert.equal(
    computeChargeTotal({ category: 'discount', unit_price: '75' }, {}),
    -75
  );
});

test('computeChargeTotal handles fuel surcharge against transportation base', () => {
  assert.equal(
    computeChargeTotal(
      { category: 'fuel_surcharge', unit_price: '10', quantity: '200' },
      { transportationBase: 200 }
    ),
    20
  );
});

test('computeChargeTotal handles valuation against labor base', () => {
  assert.equal(
    computeChargeTotal(
      { category: 'valuation', unit_price: '5', quantity: '200' },
      { laborBase: 200 }
    ),
    10
  );
});

test('computeChargeTotal handles trip and travel mileage presets with minimum cost', () => {
  const total = computeChargeTotal(
    {
      category: 'trip_and_travel',
      mileage: '100',
      included_miles: '20',
      cost_per_mile: '2',
      min_cost: '50',
    },
    { distanceMiles: 80 },
    { presetMode: 'mileage' }
  );

  assert.equal(total, 160);
});

test('computeChargeTotal handles trip and travel flat presets', () => {
  assert.equal(
    computeChargeTotal(
      { category: 'trip_and_travel', unit_price: '45' },
      {},
      { presetMode: 'flat' }
    ),
    45
  );
});

test('computeChargeTotal handles trip and travel percentage presets', () => {
  const total = computeChargeTotal(
    { category: 'trip_and_travel', quantity: '250', percentage_rate: '12' },
    { transportationBase: 250 },
    { presetMode: 'percentage' }
  );

  assert.equal(total, 30);
});

test('computeChargeTotal handles trip and travel unit presets', () => {
  assert.equal(
    computeChargeTotal(
      { category: 'trip_and_travel', quantity: '3', unit_price: '25' },
      {},
      { presetMode: 'unit' }
    ),
    75
  );
});

test('computeChargeTotal handles additional services percentage presets', () => {
  const total = computeChargeTotal(
    { category: 'additional_services', quantity: '300', percentage_rate: '10' },
    { laborBase: 300 },
    { presetMode: 'percentage' }
  );

  assert.equal(total, 30);
});

test('computeChargeTotal falls back to quantity times unit price', () => {
  const total = computeChargeTotal(
    { category: 'other', quantity: '4', unit_price: '12.5' },
    {}
  );

  assert.ok(approxEqual(total, 50));
});

test('computeChargeTotal keeps additional lbs at zero when quantity is zero', () => {
  const total = computeChargeTotal(
    { category: 'additional_lbs', quantity: '0', unit_price: '1.1' },
    {}
  );

  assert.equal(total, 0);
});

test('computeChargeTotal handles preset-driven fuel surcharge mileage calculations with truck multiplier', () => {
  const total = computeChargeTotal(
    {
      category: 'fuel_surcharge',
      mileage: '100',
      included_miles: '20',
      cost_per_mile: '2',
      min_cost: '50',
      trucks: '2',
    },
    {},
    { presetMode: 'mileage' }
  );

  assert.equal(total, 320);
});

test('computeChargeTotal handles packing hourly labor calculations', () => {
  const total = computeChargeTotal(
    {
      category: 'packing',
      crew: '3',
      labor_time_display: '4h',
      unit_price: '50',
    },
    {},
    { presetMode: 'hourly_labor' }
  );
  assert.equal(total, 600); // 4 hours * 3 packers * $50/hr
});

test('computeChargeTotal handles packing flat rate plus hourly calculations', () => {
  const total = computeChargeTotal(
    {
      category: 'packing',
      flat_rate: '300',
      included_hours: '2h',
      labor_time_display: '5h',
      additional_hourly_rate: '40',
      crew: '2',
    },
    {},
    { presetMode: 'flat_plus_hourly' }
  );
  assert.equal(total, 540); // $300 + (3 extra hours * 2 packers * $40/hr)
});

test('computeChargeTotal handles packing unit (by container) calculations', () => {
  const total = computeChargeTotal(
    {
      category: 'packing',
      quantity: '15',
      unit_price: '8',
    },
    {},
    { presetMode: 'unit' }
  );
  assert.equal(total, 120); // 15 containers * $8/each
});

test('computeChargeTotal handles packing weight (by cwt) calculations', () => {
  const total = computeChargeTotal(
    {
      category: 'packing',
      weight: '5000',
      unit_price: '12',
    },
    {},
    { presetMode: 'weight' }
  );
  assert.equal(total, 600); // (5000 lbs / 100) * $12/cwt
});

