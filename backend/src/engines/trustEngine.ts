/**
 * Trust Score Engine - Custom Algorithm
 * Calculates a trust score for travelers based on multiple factors
 * Formula: 30% Verification + 30% Deliveries + 20% Rating + 20% Account Age
 */

export interface TrustFactors {
  verificationScore: number;  // 0-100
  deliveryScore: number;      // 0-100
  ratingScore: number;        // 0-100
  accountAgeScore: number;    // 0-100
}

export interface TrustResult {
  trustScore: number;           // 0-100
  trustLevel: string;           // "Trusted", "Verified", "Standard", "New"
  badges: string[];             // Array of earned badges
  breakdown: TrustFactors;
}

export interface UserTrustData {
  isVerified: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  idDocumentUrl: string | null;
  completedDeliveries: number;
  successRate: number;
  rating: number;
  totalRatings: number;
  createdAt: Date;
}

/**
 * Calculate verification score (0-100)
 * Email (30) + Phone (30) + ID Document (40)
 */
function calculateVerificationScore(user: UserTrustData): number {
  let score = 0;

  if (user.isEmailVerified) score += 30;
  if (user.isPhoneVerified) score += 30;
  if (user.idDocumentUrl) score += 35;
  if (user.isVerified) score += 5; // Admin-verified bonus

  return Math.min(100, score);
}

/**
 * Calculate delivery score based on completed deliveries and success rate (0-100)
 */
function calculateDeliveryScore(completedDeliveries: number, successRate: number): number {
  if (completedDeliveries === 0) return 0;

  // Logarithmic growth: 1=10pts, 5=30pts, 10=50pts, 25=70pts, 50=90pts, 100=100pts
  const deliveryPoints = Math.min(80, Math.log10(completedDeliveries + 1) * 40);

  // Success rate multiplier
  const successMultiplier = successRate; // 0-1

  return Math.min(100, deliveryPoints + deliveryPoints * successMultiplier * 0.25);
}

/**
 * Calculate rating score (0-100)
 */
function calculateRatingScore(rating: number, totalRatings: number): number {
  if (totalRatings === 0) return 50; // Neutral for new users

  const baseScore = (rating / 5) * 100;

  // Confidence bonus for many ratings
  const confidenceBonus = Math.min(10, Math.log10(totalRatings + 1) * 5);

  return Math.min(100, baseScore + confidenceBonus);
}

/**
 * Calculate account age score (0-100)
 * New accounts start low, build trust over time
 */
function calculateAccountAgeScore(createdAt: Date): number {
  const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

  if (ageInDays < 7) return 10;      // Less than 1 week
  if (ageInDays < 30) return 25;     // Less than 1 month
  if (ageInDays < 90) return 45;     // Less than 3 months
  if (ageInDays < 180) return 65;    // Less than 6 months
  if (ageInDays < 365) return 80;    // Less than 1 year
  if (ageInDays < 730) return 92;    // Less than 2 years
  return 100;                         // 2+ years
}

/**
 * Determine badges based on trust data
 */
function determineBadges(
  user: UserTrustData,
  trustScore: number,
  breakdown: TrustFactors
): string[] {
  const badges: string[] = [];

  if (user.isEmailVerified) badges.push('email_verified');
  if (user.isPhoneVerified) badges.push('phone_verified');
  if (user.idDocumentUrl) badges.push('id_verified');
  if (user.isVerified) badges.push('admin_verified');

  if (user.completedDeliveries >= 5) badges.push('active_carrier');
  if (user.completedDeliveries >= 20) badges.push('experienced_carrier');
  if (user.completedDeliveries >= 50) badges.push('top_carrier');

  if (user.successRate >= 0.95 && user.completedDeliveries >= 10) {
    badges.push('reliability_expert');
  }

  if (user.rating >= 4.8 && user.totalRatings >= 10) {
    badges.push('highly_rated');
  }

  if (trustScore >= 80) badges.push('trusted_traveler');
  if (trustScore >= 90) badges.push('elite_traveler');

  return badges;
}

/**
 * Determine trust level label
 */
function determineTrustLevel(trustScore: number, user: UserTrustData): string {
  if (trustScore >= 85 && user.completedDeliveries >= 20) return 'Elite';
  if (trustScore >= 70 && user.completedDeliveries >= 5) return 'Trusted';
  if (user.isEmailVerified && user.isPhoneVerified) return 'Verified';
  if (user.isEmailVerified) return 'Standard';
  return 'New';
}

/**
 * Main trust score calculator
 * Formula: 30% Verification + 30% Deliveries + 20% Rating + 20% Account Age
 */
export function calculateTrustScore(user: UserTrustData): TrustResult {
  const verificationScore = calculateVerificationScore(user);
  const deliveryScore = calculateDeliveryScore(user.completedDeliveries, user.successRate);
  const ratingScore = calculateRatingScore(user.rating, user.totalRatings);
  const accountAgeScore = calculateAccountAgeScore(user.createdAt);

  const trustScore =
    verificationScore * 0.30 +
    deliveryScore * 0.30 +
    ratingScore * 0.20 +
    accountAgeScore * 0.20;

  const roundedScore = Math.round(trustScore * 10) / 10;

  const breakdown: TrustFactors = {
    verificationScore: Math.round(verificationScore),
    deliveryScore: Math.round(deliveryScore),
    ratingScore: Math.round(ratingScore),
    accountAgeScore: Math.round(accountAgeScore),
  };

  const badges = determineBadges(user, roundedScore, breakdown);
  const trustLevel = determineTrustLevel(roundedScore, user);

  return {
    trustScore: roundedScore,
    trustLevel,
    badges,
    breakdown,
  };
}

/**
 * Quick helper to check if user has specific badges
 */
export function hasBadge(badges: string[], badge: string): boolean {
  return badges.includes(badge);
}
