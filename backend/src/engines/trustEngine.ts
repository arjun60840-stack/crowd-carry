/**
 * Trust Score Engine - Custom Hackathon-Grade Algorithm
 * Calculates a dynamic trust score (0-100) based on positive behaviors and safety violations.
 */

export interface UserTrustData {
  isVerified?: boolean;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  idDocumentUrl?: string | null;
  completedDeliveries: number;
  successRate?: number;
  rating: number;
  totalRatings: number;
  createdAt: Date;

  // KYC Level System
  verificationLevel?: number;

  // Violations & Adjustments
  activeDisputesCount?: number;
  lostDamagedAtFaultCount?: number;
  failedDeliveriesCount?: number;
  policyWarningsCount?: number;
  fakePackageReportsCount?: number;
}

export interface TrustResult {
  trustScore: number;           // 0-100
  trustLevel: string;           // "Risky", "Average", "Trusted", "Elite"
  badges: string[];             // Array of earned badges
  breakdown: {
    baseScore: number;
    deliveriesBonus: number;
    ratingBonus: number;
    verificationBonus: number;
    accountAgeBonus: number;
    disputesPenalty: number;
    lostDamagedPenalty: number;
    failedDeliveriesPenalty: number;
    policyWarningsPenalty: number;
    fakeReportsPenalty: number;
  };
}

/**
 * Determine trust level label based on score:
 * - 0-40 = Risky
 * - 41-70 = Average
 * - 71-90 = Trusted
 * - 91-100 = Elite Carrier
 */
export function determineTrustLevel(score: number): string {
  if (score <= 40) return 'Risky';
  if (score <= 70) return 'Average';
  if (score <= 90) return 'Trusted';
  return 'Elite';
}

/**
 * Calculate dynamic trust score
 */
export function calculateTrustScore(user: UserTrustData): TrustResult {
  const baseScore = 100;

  // 1. Calculate Increases
  // Successful Deliveries: +5 points per delivery
  const deliveriesBonus = user.completedDeliveries * 5;

  // Positive Ratings: +10 if rating >= 4.5, +15 if rating === 5.0
  let ratingBonus = 0;
  if (user.totalRatings > 0) {
    if (user.rating === 5.0) {
      ratingBonus = 15;
    } else if (user.rating >= 4.5) {
      ratingBonus = 10;
    }
  }

  // Identity Verification Levels
  // Level 1: +5, Level 2: +15, Level 3: +25, Level 4: +35
  let level = user.verificationLevel ?? 0;
  if (user.verificationLevel === undefined) {
    // Infer level for backwards compatibility
    if (user.isEmailVerified) level = 0;
    if (user.isPhoneVerified) level = 1;
    if (user.idDocumentUrl) level = 2;
    if (user.isVerified) level = 3;
  }

  let verificationBonus = 0;
  if (level === 1) verificationBonus = 5;
  else if (level === 2) verificationBonus = 15;
  else if (level === 3) verificationBonus = 25;
  else if (level >= 4) verificationBonus = 35;

  // Account Age: +5 for > 30 days, +10 for > 90 days, +15 for > 180 days
  const ageInDays = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  let accountAgeBonus = 0;
  if (ageInDays > 180) accountAgeBonus = 15;
  else if (ageInDays > 90) accountAgeBonus = 10;
  else if (ageInDays > 30) accountAgeBonus = 5;

  // 2. Calculate Decreases (Violations)
  const disputesPenalty = (user.activeDisputesCount || 0) * 15;
  const lostDamagedPenalty = (user.lostDamagedAtFaultCount || 0) * 25;
  const failedDeliveriesPenalty = (user.failedDeliveriesCount || 0) * 20;
  const policyWarningsPenalty = (user.policyWarningsCount || 0) * 30;
  const fakeReportsPenalty = (user.fakePackageReportsCount || 0) * 40;

  // Sum calculations
  const totalIncreases = deliveriesBonus + ratingBonus + verificationBonus + accountAgeBonus;
  const totalDecreases = disputesPenalty + lostDamagedPenalty + failedDeliveriesPenalty + policyWarningsPenalty + fakeReportsPenalty;

  // Final score: starting at 100, add bonuses, subtract penalties, bound between 0 and 100
  const trustScore = Math.max(0, Math.min(100, baseScore + totalIncreases - totalDecreases));

  // Determine badges
  const badges: string[] = [];
  if (level >= 1) badges.push('phone_verified');
  if (level >= 2) badges.push('id_verified');
  if (level >= 3) badges.push('selfie_verified');
  if (level >= 4) badges.push('trusted_carrier');

  if (user.completedDeliveries >= 1) badges.push('first_delivery');
  if (user.completedDeliveries >= 10) badges.push('active_carrier');
  if (user.completedDeliveries >= 50) badges.push('top_carrier');
  if (trustScore >= 90) badges.push('elite_traveler');

  const trustLevel = determineTrustLevel(trustScore);

  return {
    trustScore,
    trustLevel,
    badges,
    breakdown: {
      baseScore,
      deliveriesBonus,
      ratingBonus,
      verificationBonus,
      accountAgeBonus,
      disputesPenalty,
      lostDamagedPenalty,
      failedDeliveriesPenalty,
      policyWarningsPenalty,
      fakeReportsPenalty,
    },
  };
}

/**
 * Quick helper to check badge status
 */
export function hasBadge(badges: string[], badge: string): boolean {
  return badges.includes(badge);
}
