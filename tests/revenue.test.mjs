import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRevenue, defaultsFor, AREAS, PLANNING_DEFAULTS, INPUT_LIMITS, calculatePlan, compareScenarios } from '../revenue.js';

test('gross revenue uses occupied nights and monthly averages', () => {
  const result = calculateRevenue(1000, 80);
  assert.equal(result.annual, 292000);
  assert.equal(result.monthly, 292000 / 12);
  assert.equal(result.low, 248200);
  assert.equal(result.high, 335800);
  assert.equal(result.bookedNights, 292);
});

const plan = (overrides = {}) => ({ ...PLANNING_DEFAULTS, nightly: 1000, occupancy: 80, ...overrides });

test('planner deducts owner nights, booking costs, both gross-based fees and full-year fixed costs', () => {
  const result = calculatePlan(plan({ ownerNights: 15, cleaning: 100, propertyValue: 2000000 }));
  assert.equal(result.availableNights, 350);
  assert.equal(result.bookedNights, 280);
  assert.equal(result.bookings, 56);
  assert.equal(result.gross, 280000);
  assert.deepEqual(result.costs, { management: 56000, platform: 8400, utilities: 12000, maintenance: 3000, cleaning: 5600, other: 1500 });
  assert.equal(result.totalCosts, 86500);
  assert.equal(result.net, 193500);
  assert.equal(result.yield, 9.675);
  assert.ok(Math.abs(calculatePlan(plan({ ownerNights: 15, cleaning: 100, occupancy: result.breakEven })).net) < 0.000001);
});

test('vacant and owner-blocked years retain fixed costs and allow losses', () => {
  for (const input of [plan({ occupancy: 0 }), plan({ ownerNights: 365 })]) {
    const result = calculatePlan(input);
    assert.equal(result.gross, 0);
    assert.equal(result.net, -16500);
    assert.equal(result.yield, null);
    assert.equal(result.costs.cleaning, 0);
  }
  assert.equal(calculatePlan(plan({ ownerNights: 365 })).breakEven, null);
  assert.equal(calculatePlan(plan({ nightly: 100, cleaning: 10000, averageStay: 1 })).breakEven, null);
  assert.equal(calculatePlan(plan({ otherAnnual: 10000000 })).breakEven, null);
});

test('zero-cost scenario returns the full revenue and no costs are inferred', () => {
  const input = plan({ managementFee: 0, platformFee: 0, utilities: 0, maintenance: 0, cleaning: 0, otherAnnual: 0 });
  const result = calculatePlan(input);
  assert.equal(result.gross, result.net);
  assert.equal(result.totalCosts, 0);
  assert.equal(result.breakEven, 0);
});

test('planner rejects missing, non-finite, out-of-range and fractional owner-night inputs', () => {
  for (const [key, [min, max]] of Object.entries(INPUT_LIMITS)) {
    for (const value of [NaN, Infinity, undefined, min - 1, max + 1]) assert.throws(() => calculatePlan(plan({ [key]: value })), RangeError);
  }
  assert.throws(() => calculatePlan(plan({ ownerNights: 1.5 })), RangeError);
  assert.throws(() => compareScenarios(plan({ occupancy: 101 })), RangeError);
});

test('scenario comparisons adjust only rate and occupancy, respect bounds and leave the original unchanged', () => {
  const input = plan({ nightly: 15000, occupancy: 95, ownerNights: 20 });
  const scenarios = compareScenarios(input);
  assert.equal(scenarios[0].assumptions.nightly, 13500);
  assert.equal(scenarios[0].assumptions.occupancy, 85);
  assert.equal(scenarios[2].assumptions.nightly, 15000);
  assert.equal(scenarios[2].assumptions.occupancy, 100);
  assert.deepEqual(scenarios[1].result, calculatePlan(input));
  assert.equal(scenarios[2].assumptions.ownerNights, 20);
  assert.equal(input.occupancy, 95);
  assert.equal(compareScenarios(plan({ nightly: 100, occupancy: 0 }))[0].assumptions.occupancy, 0);
});
test('higher occupancy and nightly rates produce higher revenue', () => {
  assert.ok(calculateRevenue(1000, 85).annual > calculateRevenue(1000, 70).annual);
  assert.ok(calculateRevenue(1200, 70).annual > calculateRevenue(1000, 70).annual);
});
test('invalid or non-finite financial inputs are rejected', () => {
  for (const nightly of [0, -1, NaN, Infinity, 15001]) assert.throws(() => calculateRevenue(nightly, 75), RangeError);
  for (const occupancy of [0, -1, 96, NaN, Infinity]) assert.throws(() => calculateRevenue(650, occupancy), RangeError);
});
test('property presets produce valid calculations for every supported combination', () => {
  for (const area of Object.keys(AREAS)) {
    for (let bedrooms = 0; bedrooms <= 5; bedrooms++) {
      for (const type of bedrooms >= 2 ? ['apartment', 'villa'] : ['apartment']) {
        const preset = defaultsFor(area, type, bedrooms);
        assert.ok(calculateRevenue(preset.nightly, preset.occupancy).annual > 0);
      }
    }
  }
  assert.throws(() => defaultsFor('marina', 'villa', 0), RangeError);
  assert.throws(() => defaultsFor('missing', 'apartment', 1), RangeError);
  assert.throws(() => defaultsFor('marina', 'apartment', 1.5), RangeError);
});
