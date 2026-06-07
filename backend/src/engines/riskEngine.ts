/**
 * Risk Detection Engine - Custom Algorithm
 * Detects suspicious activity and high-risk users/packages
 * No external AI API used - Rule-based intelligence
 */

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface UserRiskData {
  createdAt: Date;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  completedDeliveries: number;
  successRate: number;
  totalRatings: number;
  rating: number;
  reportsAgainstCount: number;
  totalPackages: number;
  totalTrips: number;
}

export interface PackageRiskData {
  estimatedValue?: number;
  weight: number;
  category: string;
  rewardAmount: number;
  urgency: string;
  sender: UserRiskData;
}

export interface RiskResult {
  riskScore: number;    // 0-100 (higher = more risky)
  riskLevel: RiskLevel;
  flags: string[];
  recommendations: string[];
}

/**
 * Calculate user account risk score
 */
export function calculateUserRisk(user: UserRiskData): RiskResult {
  const flags: string[] = [];
  const recommendations: string[] = [];
  let riskScore = 0;

  // Account age risk
  const accountAgeDays = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  if (accountAgeDays < 1) {
    riskScore += 30;
    flags.push('VERY_NEW_ACCOUNT');
    recommendations.push('Account created less than 24 hours ago. Verify identity before proceeding.');
  } else if (accountAgeDays < 7) {
    riskScore += 20;
    flags.push('NEW_ACCOUNT');
    recommendations.push('New account (less than 7 days). Consider requesting additional verification.');
  } else if (accountAgeDays < 30) {
    riskScore += 10;
    flags.push('RECENT_ACCOUNT');
  }

  // Verification risk
  if (!user.isEmailVerified) {
    riskScore += 25;
    flags.push('EMAIL_NOT_VERIFIED');
    recommendations.push('Email address not verified. Send verification email.');
  }
  if (!user.isPhoneVerified) {
    riskScore += 15;
    flags.push('PHONE_NOT_VERIFIED');
  }

  // Activity risk
  if (user.completedDeliveries === 0 && user.totalTrips > 3) {
    riskScore += 10;
    flags.push('HIGH_TRIPS_NO_DELIVERIES');
  }

  // Reports risk
  if (user.reportsAgainstCount >= 3) {
    riskScore += 35;
    flags.push('MULTIPLE_REPORTS');
    recommendations.push('User has 3+ reports. Admin review recommended.');
  } else if (user.reportsAgainstCount >= 1) {
    riskScore += 15;
    flags.push('HAS_REPORTS');
  }

  // Rating risk
  if (user.totalRatings >= 5 && user.rating < 3.0) {
    riskScore += 20;
    flags.push('LOW_RATING');
    recommendations.push('User has consistently low ratings. Monitor interactions.');
  }

  // Low success rate
  if (user.completedDeliveries >= 5 && user.successRate < 0.7) {
    riskScore += 15;
    flags.push('LOW_SUCCESS_RATE');
  }

  // Suspicious activity: many packages but few completions
  if (user.totalPackages > 20 && user.completedDeliveries < 2) {
    riskScore += 20;
    flags.push('SUSPICIOUS_PATTERN');
    recommendations.push('High package creation with low completion rate. Possible fraud indicator.');
  }

  const finalScore = Math.min(100, riskScore);
  const riskLevel: RiskLevel = finalScore >= 60 ? 'HIGH' : finalScore >= 30 ? 'MEDIUM' : 'LOW';

  return {
    riskScore: finalScore,
    riskLevel,
    flags,
    recommendations,
  };
}

/**
 * Calculate package risk score
 */
export function calculatePackageRisk(pkg: PackageRiskData): RiskResult {
  const flags: string[] = [];
  const recommendations: string[] = [];
  let riskScore = 0;

  // Sender risk contribution
  const senderRisk = calculateUserRisk(pkg.sender);
  riskScore += senderRisk.riskScore * 0.4;
  if (senderRisk.flags.length > 0) {
    flags.push(...senderRisk.flags.map(f => `SENDER_${f}`));
  }

  // High value package
  if (pkg.estimatedValue && pkg.estimatedValue > 1000) {
    riskScore += 20;
    flags.push('HIGH_VALUE_PACKAGE');
    recommendations.push('High value item. Consider insurance and additional verification.');
  } else if (pkg.estimatedValue && pkg.estimatedValue > 500) {
    riskScore += 10;
    flags.push('MEDIUM_VALUE_PACKAGE');
  }

  // Suspicious reward amounts
  const valueToRewardRatio = pkg.estimatedValue
    ? pkg.rewardAmount / pkg.estimatedValue
    : null;

  if (valueToRewardRatio !== null) {
    if (valueToRewardRatio > 0.5) {
      // Offering >50% of value as reward is suspicious
      riskScore += 15;
      flags.push('UNUSUALLY_HIGH_REWARD');
      recommendations.push('Reward amount is unusually high relative to package value. Verify legitimacy.');
    }
  }

  // Category risk (restricted or fragile items)
  const riskyCategories = ['MEDICINE', 'ELECTRONICS'];
  if (riskyCategories.includes(pkg.category)) {
    riskScore += 5;
    flags.push(`SENSITIVE_CATEGORY_${pkg.category}`);
  }

  // Weight anomaly
  if (pkg.weight > 25) {
    riskScore += 10;
    flags.push('HEAVY_PACKAGE');
    recommendations.push('Heavy package (>25kg). Verify traveler vehicle capacity.');
  }

  // Urgency risk
  if (pkg.urgency === 'URGENT') {
    riskScore += 5;
    flags.push('URGENT_DELIVERY');
  }

  const finalScore = Math.min(100, riskScore);
  const riskLevel: RiskLevel = finalScore >= 60 ? 'HIGH' : finalScore >= 30 ? 'MEDIUM' : 'LOW';

  if (riskLevel === 'HIGH') {
    recommendations.push('HIGH RISK: Manual review by admin recommended before processing.');
  }

  return {
    riskScore: finalScore,
    riskLevel,
    flags,
    recommendations,
  };
}
