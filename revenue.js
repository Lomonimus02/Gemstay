// Illustrative assumptions for a working preview, not measured market data.
// Replace with validated GemStay rates or a market-data integration before launch.
export const AREAS = {
  marina: { name: 'Dubai Marina', rate: 650, occupancy: 75 },
  downtown: { name: 'Downtown Dubai', rate: 750, occupancy: 74 },
  palm: { name: 'Palm Jumeirah', rate: 900, occupancy: 70 },
  jbr: { name: 'Jumeirah Beach Residence', rate: 720, occupancy: 75 },
  business: { name: 'Business Bay', rate: 560, occupancy: 72 },
  jvc: { name: 'Jumeirah Village Circle', rate: 380, occupancy: 70 },
};
const BEDROOM_FACTORS = [0.76, 1, 1.48, 2.1, 2.75, 3.4];
export function defaultsFor(area, type, bedrooms) {
  if (!AREAS[area] || !['apartment', 'villa'].includes(type) || !Number.isInteger(bedrooms) || bedrooms < 0 || bedrooms > 5 || (type === 'villa' && bedrooms < 2)) throw new RangeError('Invalid property details');
  return { nightly: Math.round(AREAS[area].rate * BEDROOM_FACTORS[bedrooms] * (type === 'villa' ? 1.5 : 1)), occupancy: AREAS[area].occupancy };
}
export function calculateRevenue(nightly, occupancy) {
  if (!Number.isFinite(nightly) || nightly < 100 || nightly > 15000 || !Number.isFinite(occupancy) || occupancy < 20 || occupancy > 95) throw new RangeError('Enter a nightly rate from AED 100 to 15,000 and occupancy from 20% to 95%.');
  const annual = nightly * 365 * occupancy / 100;
  return { annual, monthly: annual / 12, low: annual * 0.85, high: annual * 1.15, bookedNights: Math.round(365 * occupancy / 100) };
}

// Planning assumptions only. Fees are both calculated on gross accommodation revenue.
export const PLANNING_DEFAULTS = {
  ownerNights: 0, averageStay: 5, managementFee: 20, platformFee: 3,
  utilities: 1000, maintenance: 250, cleaning: 0, otherAnnual: 1500, propertyValue: 0,
};
export const INPUT_LIMITS = {
  nightly: [100, 15000], occupancy: [0, 100], ownerNights: [0, 365],
  averageStay: [1, 90], managementFee: [0, 50], platformFee: [0, 30],
  utilities: [0, 100000], maintenance: [0, 100000], cleaning: [0, 10000],
  otherAnnual: [0, 10000000], propertyValue: [0, 1000000000],
};

export function calculatePlan(input) {
  for (const [key, [min, max]] of Object.entries(INPUT_LIMITS)) {
    if (!Number.isFinite(input[key]) || input[key] < min || input[key] > max) throw new RangeError(`Invalid ${key}`);
  }
  if (!Number.isInteger(input.ownerNights)) throw new RangeError('Owner nights must be a whole number');
  const availableNights = 365 - input.ownerNights;
  const bookedNights = availableNights * input.occupancy / 100;
  const bookings = bookedNights / input.averageStay;
  const gross = input.nightly * bookedNights;
  const costs = {
    management: gross * input.managementFee / 100,
    platform: gross * input.platformFee / 100,
    utilities: input.utilities * 12,
    maintenance: input.maintenance * 12,
    cleaning: bookings * input.cleaning,
    other: input.otherAnnual,
  };
  const totalCosts = Object.values(costs).reduce((sum, cost) => sum + cost, 0);
  const net = gross - totalCosts;
  const contributionPerNight = input.nightly * (1 - (input.managementFee + input.platformFee) / 100) - input.cleaning / input.averageStay;
  const fixedCosts = costs.utilities + costs.maintenance + costs.other;
  const capacityContribution = availableNights * contributionPerNight;
  // Null means the entered costs cannot be covered within the available year.
  const breakEven = fixedCosts === 0 && contributionPerNight >= 0 ? 0
    : capacityContribution > 0 && fixedCosts <= capacityContribution ? fixedCosts / capacityContribution * 100 : null;
  return { gross, net, totalCosts, costs, availableNights, bookedNights, bookings,
    yield: input.propertyValue > 0 ? net / input.propertyValue * 100 : null, breakEven };
}

export function compareScenarios(input) {
  calculatePlan(input);
  return [
    { id: 'cautious', name: 'Cautious', rateFactor: 0.9, occupancyChange: -10 },
    { id: 'base', name: 'Your plan', rateFactor: 1, occupancyChange: 0 },
    { id: 'upside', name: 'Upside', rateFactor: 1.1, occupancyChange: 10 },
  ].map(scenario => {
    const assumptions = { ...input,
      nightly: Math.max(100, Math.min(15000, input.nightly * scenario.rateFactor)),
      occupancy: Math.max(0, Math.min(100, input.occupancy + scenario.occupancyChange)),
    };
    return { ...scenario, assumptions, result: calculatePlan(assumptions) };
  });
}
