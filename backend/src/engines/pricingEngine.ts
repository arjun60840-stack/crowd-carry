/**
 * Smart Pricing Engine - Custom Algorithm
 * Generates suggested pricing for package delivery
 * No external API used
 */

export type UrgencyLevel = 'STANDARD' | 'EXPRESS' | 'URGENT';
export type PackageSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE';

export interface PricingInput {
  distanceKm: number;
  weightKg: number;
  urgency: UrgencyLevel;
  size: PackageSize;
  estimatedValue?: number;
}

export interface PricingResult {
  minimum: number;
  recommended: number;
  premium: number;
  currency: string;
  breakdown: {
    distanceCost: number;
    weightCost: number;
    urgencyMultiplier: number;
    sizeCost: number;
    basePrice: number;
  };
}

// Base rates
const BASE_RATE_PER_KM = 0.08;          // $0.08 per km
const BASE_RATE_PER_KG = 0.50;          // $0.50 per kg
const MIN_PRICE = 5.00;                  // Minimum $5 reward
const MAX_PRICE = 500.00;               // Maximum $500 reward

// Urgency multipliers
const URGENCY_MULTIPLIERS: Record<UrgencyLevel, number> = {
  STANDARD: 1.0,
  EXPRESS: 1.4,
  URGENT: 1.8,
};

// Size base costs
const SIZE_COSTS: Record<PackageSize, number> = {
  SMALL: 0,
  MEDIUM: 2,
  LARGE: 5,
  EXTRA_LARGE: 10,
};

// Distance tier adjustments (longer = slightly cheaper per km due to efficiency)
function getDistanceRate(distanceKm: number): number {
  if (distanceKm <= 50) return BASE_RATE_PER_KM * 1.5;   // Short: premium rate
  if (distanceKm <= 200) return BASE_RATE_PER_KM * 1.2;   // Medium: slight premium
  if (distanceKm <= 500) return BASE_RATE_PER_KM;          // Long: base rate
  return BASE_RATE_PER_KM * 0.85;                           // Very long: discount
}

/**
 * Calculate suggested pricing
 */
export function calculatePricing(input: PricingInput): PricingResult {
  const { distanceKm, weightKg, urgency, size, estimatedValue } = input;

  // Distance cost
  const distanceRate = getDistanceRate(distanceKm);
  const distanceCost = distanceKm * distanceRate;

  // Weight cost
  const weightCost = weightKg * BASE_RATE_PER_KG;

  // Size cost
  const sizeCost = SIZE_COSTS[size];

  // Urgency multiplier
  const urgencyMultiplier = URGENCY_MULTIPLIERS[urgency];

  // Base price calculation
  const basePrice = (distanceCost + weightCost + sizeCost) * urgencyMultiplier;

  // Insurance factor for valuable items
  let insuranceFactor = 0;
  if (estimatedValue && estimatedValue > 100) {
    insuranceFactor = Math.min(20, estimatedValue * 0.01); // 1% of value, max $20
  }

  // Calculate price tiers
  const recommended = Math.max(MIN_PRICE, Math.min(MAX_PRICE, basePrice + insuranceFactor));
  const minimum = Math.max(MIN_PRICE, recommended * 0.7);
  const premium = Math.min(MAX_PRICE, recommended * 1.35);

  return {
    minimum: Math.round(minimum * 100) / 100,
    recommended: Math.round(recommended * 100) / 100,
    premium: Math.round(premium * 100) / 100,
    currency: 'USD',
    breakdown: {
      distanceCost: Math.round(distanceCost * 100) / 100,
      weightCost: Math.round(weightCost * 100) / 100,
      urgencyMultiplier,
      sizeCost,
      basePrice: Math.round(basePrice * 100) / 100,
    },
  };
}

/**
 * Estimate distance between two cities (fallback when no coordinates available)
 * Uses a simplified lookup table for common routes
 */
export function estimateDistanceFromCities(fromCity: string, toCity: string): number {
  const normalize = (s: string) => s.toLowerCase().trim();
  const from = normalize(fromCity);
  const to = normalize(toCity);

  // Common city distances (km) - simplified lookup
  const distanceMap: Record<string, Record<string, number>> = {
    'new york': { 'los angeles': 4500, 'chicago': 1270, 'miami': 2050, 'boston': 345, 'london': 5570 },
    'london': { 'paris': 340, 'berlin': 930, 'amsterdam': 360, 'madrid': 1260, 'rome': 1430 },
    'mumbai': { 'delhi': 1400, 'bangalore': 980, 'chennai': 1330, 'kolkata': 2050, 'hyderabad': 710 },
    'delhi': { 'bangalore': 2150, 'chennai': 2170, 'kolkata': 1470, 'hyderabad': 1570, 'jaipur': 270 },
  };

  if (distanceMap[from]?.[to]) return distanceMap[from][to];
  if (distanceMap[to]?.[from]) return distanceMap[to][from];

  // Random realistic estimate based on city name hash for consistency
  const hashCode = (s: string) => s.split('').reduce((a, b) => (a * 31 + b.charCodeAt(0)) | 0, 0);
  const combined = Math.abs(hashCode(from) ^ hashCode(to));
  return 100 + (combined % 2900); // 100-3000 km range
}
