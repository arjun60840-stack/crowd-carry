/**
 * AI Match Engine - Custom Algorithm
 * Matches packages with travelers based on multiple factors
 * No external AI API used
 */

export interface MatchFactors {
  routeScore: number;       // 0-100: How well routes overlap
  dateScore: number;        // 0-100: How close travel dates are
  weightScore: number;      // 0-100: Weight compatibility
  ratingScore: number;      // 0-100: Traveler rating quality
  successRateScore: number; // 0-100: Historical success rate
}

export interface MatchResult {
  matchScore: number;
  matchQuality: string;
  explanation: string;
  factors: MatchFactors;
}

export interface TravelerData {
  id: string;
  sourceCity: string;
  destinationCity: string;
  sourceLat?: number | null;
  sourceLng?: number | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  travelDate: Date;
  availableWeight: number;
  availableCapacity: number;
  rating: number;
  successRate: number;
  completedDeliveries: number;
}

export interface PackageData {
  pickupCity: string;
  destinationCity: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  weight: number;
  urgency: string;
}

/**
 * Calculate distance between two lat/lng points using Haversine formula
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate route similarity score (0-100)
 * Checks if package pickup/destination is "on the way" for the traveler
 */
function calculateRouteScore(traveler: TravelerData, pkg: PackageData): number {
  // City name matching (case-insensitive partial match)
  const sourceMatch =
    traveler.sourceCity.toLowerCase().includes(pkg.pickupCity.toLowerCase()) ||
    pkg.pickupCity.toLowerCase().includes(traveler.sourceCity.toLowerCase());
  const destMatch =
    traveler.destinationCity.toLowerCase().includes(pkg.destinationCity.toLowerCase()) ||
    pkg.destinationCity.toLowerCase().includes(traveler.destinationCity.toLowerCase());

  if (sourceMatch && destMatch) return 100;
  if (destMatch && !sourceMatch) return 70; // Destination matches but pickup needs a detour
  if (sourceMatch && !destMatch) return 60; // Source matches but destination differs

  // If we have coordinates, calculate geographic proximity
  if (
    traveler.sourceLat && traveler.sourceLng &&
    traveler.destinationLat && traveler.destinationLng &&
    pkg.pickupLat && pkg.pickupLng &&
    pkg.destinationLat && pkg.destinationLng
  ) {
    const tripDistance = haversineDistance(
      traveler.sourceLat, traveler.sourceLng,
      traveler.destinationLat, traveler.destinationLng
    );

    const pickupDeviation = haversineDistance(
      traveler.sourceLat, traveler.sourceLng,
      pkg.pickupLat, pkg.pickupLng
    );

    const destDeviation = haversineDistance(
      traveler.destinationLat, traveler.destinationLng,
      pkg.destinationLat, pkg.destinationLng
    );

    const totalDeviation = pickupDeviation + destDeviation;
    const deviationRatio = totalDeviation / Math.max(tripDistance, 1);

    if (deviationRatio < 0.1) return 95;
    if (deviationRatio < 0.2) return 85;
    if (deviationRatio < 0.3) return 75;
    if (deviationRatio < 0.5) return 60;
    if (deviationRatio < 1.0) return 40;
    return 20;
  }

  // Fuzzy string matching fallback
  const sourceWords = traveler.sourceCity.toLowerCase().split(/\s+/);
  const destWords = traveler.destinationCity.toLowerCase().split(/\s+/);
  const pkgSourceWords = pkg.pickupCity.toLowerCase().split(/\s+/);
  const pkgDestWords = pkg.destinationCity.toLowerCase().split(/\s+/);

  const sourceOverlap = sourceWords.filter(w => pkgSourceWords.some(pw => pw.includes(w) || w.includes(pw))).length;
  const destOverlap = destWords.filter(w => pkgDestWords.some(pw => pw.includes(w) || w.includes(pw))).length;

  const sourceScore = (sourceOverlap / Math.max(sourceWords.length, pkgSourceWords.length)) * 100;
  const destScore = (destOverlap / Math.max(destWords.length, pkgDestWords.length)) * 100;

  return (sourceScore * 0.4 + destScore * 0.6);
}

/**
 * Calculate date proximity score (0-100)
 * Closer dates = higher score
 */
function calculateDateScore(travelDate: Date, urgency: string): number {
  const now = new Date();
  const daysUntilTravel = (travelDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (daysUntilTravel < 0) return 0; // Past trip

  let score = 0;
  if (daysUntilTravel <= 1) score = 100;
  else if (daysUntilTravel <= 3) score = 90;
  else if (daysUntilTravel <= 7) score = 80;
  else if (daysUntilTravel <= 14) score = 65;
  else if (daysUntilTravel <= 30) score = 50;
  else if (daysUntilTravel <= 60) score = 30;
  else score = 15;

  // Urgency modifier
  if (urgency === 'URGENT' && daysUntilTravel <= 3) score = Math.min(100, score + 10);
  if (urgency === 'EXPRESS' && daysUntilTravel <= 7) score = Math.min(100, score + 5);

  return score;
}

/**
 * Calculate weight compatibility score (0-100)
 */
function calculateWeightScore(availableWeight: number, packageWeight: number): number {
  if (availableWeight <= 0) return 0;
  if (packageWeight > availableWeight) return 0; // Can't carry

  const utilizationRatio = packageWeight / availableWeight;

  // Ideal utilization is 20-80% of capacity
  if (utilizationRatio >= 0.2 && utilizationRatio <= 0.8) return 100;
  if (utilizationRatio < 0.2) return 60 + (utilizationRatio / 0.2) * 40; // Under-utilized
  if (utilizationRatio <= 0.95) return 80; // Close to max but manageable
  return 50; // Very tight fit
}

/**
 * Calculate rating score (0-100)
 */
function calculateRatingScore(rating: number, completedDeliveries: number): number {
  if (completedDeliveries === 0) return 50; // New traveler, neutral score

  const ratingScore = (rating / 5) * 100;
  // Boost for experienced travelers
  const experienceBoost = Math.min(10, completedDeliveries * 0.5);

  return Math.min(100, ratingScore + experienceBoost);
}

/**
 * Calculate success rate score (0-100)
 */
function calculateSuccessRateScore(successRate: number, completedDeliveries: number): number {
  if (completedDeliveries === 0) return 50; // Neutral for new travelers
  return successRate * 100;
}

/**
 * Generate human-readable explanation for the match
 */
function generateExplanation(factors: MatchFactors, matchScore: number): string {
  const parts: string[] = [];

  if (factors.routeScore >= 90) {
    parts.push('✅ Perfect route match — traveler goes directly through pickup and delivery locations');
  } else if (factors.routeScore >= 70) {
    parts.push('✅ Good route overlap with minimal detour required');
  } else if (factors.routeScore >= 50) {
    parts.push('⚠️ Moderate route match — some detour may be needed');
  } else {
    parts.push('⚠️ Route has significant deviation from traveler\'s path');
  }

  if (factors.dateScore >= 90) {
    parts.push('✅ Traveler departs very soon — excellent timing');
  } else if (factors.dateScore >= 70) {
    parts.push('✅ Travel date fits well within delivery window');
  } else {
    parts.push('⚠️ Travel date is further out');
  }

  if (factors.weightScore >= 90) {
    parts.push('✅ Package weight fits perfectly within available capacity');
  } else if (factors.weightScore >= 60) {
    parts.push('✅ Package weight is within acceptable range');
  } else if (factors.weightScore === 0) {
    parts.push('❌ Package exceeds traveler\'s weight limit');
  }

  if (factors.ratingScore >= 85) {
    parts.push('⭐ Highly rated traveler with excellent track record');
  } else if (factors.ratingScore >= 70) {
    parts.push('⭐ Good traveler rating');
  } else {
    parts.push('ℹ️ New or average-rated traveler');
  }

  return parts.join(' | ');
}

/**
 * Main matching function
 * Formula: 40% Route + 20% Date + 15% Weight + 15% Rating + 10% Success Rate
 */
export function calculateMatch(traveler: TravelerData, pkg: PackageData): MatchResult {
  const routeScore = calculateRouteScore(traveler, pkg);
  const dateScore = calculateDateScore(traveler.travelDate, pkg.urgency);
  const weightScore = calculateWeightScore(traveler.availableWeight, pkg.weight);
  const ratingScore = calculateRatingScore(traveler.rating, traveler.completedDeliveries);
  const successRateScore = calculateSuccessRateScore(traveler.successRate, traveler.completedDeliveries);

  const matchScore =
    routeScore * 0.40 +
    dateScore * 0.20 +
    weightScore * 0.15 +
    ratingScore * 0.15 +
    successRateScore * 0.10;

  const roundedScore = Math.round(matchScore * 10) / 10;

  let matchQuality: string;
  if (roundedScore >= 90) matchQuality = 'Excellent';
  else if (roundedScore >= 75) matchQuality = 'Good';
  else if (roundedScore >= 60) matchQuality = 'Average';
  else matchQuality = 'Poor';

  const factors: MatchFactors = {
    routeScore: Math.round(routeScore),
    dateScore: Math.round(dateScore),
    weightScore: Math.round(weightScore),
    ratingScore: Math.round(ratingScore),
    successRateScore: Math.round(successRateScore),
  };

  return {
    matchScore: roundedScore,
    matchQuality,
    explanation: generateExplanation(factors, roundedScore),
    factors,
  };
}

/**
 * Find best matches from a list of travelers for a package
 * Returns sorted by match score descending
 */
export function findBestMatches(
  travelers: TravelerData[],
  pkg: PackageData,
  minScore: number = 40
): Array<{ traveler: TravelerData; match: MatchResult }> {
  const results = travelers
    .map(traveler => ({
      traveler,
      match: calculateMatch(traveler, pkg),
    }))
    .filter(r => r.match.matchScore >= minScore)
    .sort((a, b) => b.match.matchScore - a.match.matchScore);

  return results;
}
