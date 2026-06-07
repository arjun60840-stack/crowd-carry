/**
 * Sustainability Engine - Custom Algorithm
 * Calculates CO2 savings from crowdshipping vs traditional delivery
 * No external API used
 */

export type VehicleType = 'CAR' | 'MOTORCYCLE' | 'BICYCLE' | 'PUBLIC_TRANSPORT' | 'WALK' | 'TRAIN' | 'FLIGHT';

// CO2 emissions in grams per km per kg (cargo)
const TRADITIONAL_DELIVERY_EMISSIONS = {
  VAN: 250,          // g CO2/km for a delivery van
  TRUCK: 400,        // g CO2/km for a truck
  MOTORCYCLE: 120,   // g CO2/km for motorcycle courier
};

// CO2 emissions in grams per km (vehicle type, per person)
const CROWDCARRY_EMISSIONS: Record<VehicleType, number> = {
  CAR: 120,              // g CO2/km (average car)
  MOTORCYCLE: 90,         // g CO2/km
  BICYCLE: 0,             // Zero emissions!
  PUBLIC_TRANSPORT: 40,   // g CO2/km (train/bus average)
  WALK: 0,               // Zero emissions!
  TRAIN: 35,             // g CO2/km
  FLIGHT: 285,           // g CO2/km (per passenger)
};

// Average delivery cost vs crowdshipping
const TRADITIONAL_DELIVERY_COST_PER_KM = 2.50; // USD per km

export interface SustainabilityInput {
  distanceKm: number;
  weightKg: number;
  vehicleType: VehicleType;
  rewardAmount: number;
}

export interface SustainabilityResult {
  co2SavedGrams: number;
  co2SavedKg: number;
  distanceKm: number;
  moneySavedUSD: number;
  treesEquivalent: number;    // Trees needed to absorb this CO2 in a year
  carKmEquivalent: number;    // Equivalent km not driven by a car
  impactLabel: string;        // "Great Impact", "Good Impact", etc.
  breakdown: {
    traditionalEmissions: number;
    crowdCarryEmissions: number;
    traditionalCost: number;
    crowdCarryCost: number;
  };
}

/**
 * Calculate CO2 savings for a single delivery
 */
export function calculateDeliverySustainability(input: SustainabilityInput): SustainabilityResult {
  const { distanceKm, weightKg, vehicleType, rewardAmount } = input;

  // Traditional delivery emissions (motorcycle courier baseline for comparison)
  const traditionalEmissions = TRADITIONAL_DELIVERY_EMISSIONS.MOTORCYCLE * distanceKm;

  // Crowd carry marginal emissions (traveler was already going this route)
  // We only count the marginal emissions from the slight detour/added weight
  // Approximating as 10% of vehicle emissions since it's a shared trip
  const crowdCarryEmissions = CROWDCARRY_EMISSIONS[vehicleType] * distanceKm * 0.1;

  const co2SavedGrams = Math.max(0, traditionalEmissions - crowdCarryEmissions);
  const co2SavedKg = co2SavedGrams / 1000;

  // Cost savings (traditional delivery cost minus reward)
  const traditionalCost = TRADITIONAL_DELIVERY_COST_PER_KM * distanceKm;
  const crowdCarryCost = rewardAmount;
  const moneySaved = Math.max(0, traditionalCost - crowdCarryCost);

  // Impact conversions
  // A tree absorbs ~22kg CO2/year
  const treesEquivalent = co2SavedKg / 22;
  // A car emits ~120g CO2/km
  const carKmEquivalent = co2SavedGrams / 120;

  // Impact label
  let impactLabel: string;
  if (co2SavedKg >= 10) impactLabel = 'Exceptional Impact';
  else if (co2SavedKg >= 5) impactLabel = 'Great Impact';
  else if (co2SavedKg >= 2) impactLabel = 'Good Impact';
  else if (co2SavedKg >= 0.5) impactLabel = 'Positive Impact';
  else impactLabel = 'Minimal Impact';

  return {
    co2SavedGrams: Math.round(co2SavedGrams),
    co2SavedKg: Math.round(co2SavedKg * 100) / 100,
    distanceKm,
    moneySavedUSD: Math.round(moneySaved * 100) / 100,
    treesEquivalent: Math.round(treesEquivalent * 100) / 100,
    carKmEquivalent: Math.round(carKmEquivalent * 10) / 10,
    impactLabel,
    breakdown: {
      traditionalEmissions: Math.round(traditionalEmissions),
      crowdCarryEmissions: Math.round(crowdCarryEmissions),
      traditionalCost: Math.round(traditionalCost * 100) / 100,
      crowdCarryCost: Math.round(crowdCarryCost * 100) / 100,
    },
  };
}

/**
 * Aggregate sustainability stats for the platform
 */
export interface PlatformSustainabilityStats {
  totalCO2SavedKg: number;
  totalDeliveries: number;
  totalMoneySaved: number;
  totalDistanceOptimized: number;
  treesEquivalent: number;
  co2PerDelivery: number;
}

export function aggregateSustainabilityStats(
  deliveries: Array<{ co2Saved: number; moneySaved: number; distanceSaved: number }>
): PlatformSustainabilityStats {
  const totalCO2SavedGrams = deliveries.reduce((sum, d) => sum + (d.co2Saved || 0), 0);
  const totalMoneySaved = deliveries.reduce((sum, d) => sum + (d.moneySaved || 0), 0);
  const totalDistanceOptimized = deliveries.reduce((sum, d) => sum + (d.distanceSaved || 0), 0);

  const totalCO2SavedKg = totalCO2SavedGrams / 1000;

  return {
    totalCO2SavedKg: Math.round(totalCO2SavedKg * 10) / 10,
    totalDeliveries: deliveries.length,
    totalMoneySaved: Math.round(totalMoneySaved * 100) / 100,
    totalDistanceOptimized: Math.round(totalDistanceOptimized),
    treesEquivalent: Math.round((totalCO2SavedKg / 22) * 10) / 10,
    co2PerDelivery: deliveries.length > 0
      ? Math.round((totalCO2SavedKg / deliveries.length) * 100) / 100
      : 0,
  };
}
