import { calculatePricing, estimateDistanceFromCities } from '../engines/pricingEngine';
import type { PricingInput, PricingResult } from '../engines/pricingEngine';

/**
 * Package Business Logic Unit Tests
 * Tests pricing calculations, status transitions, and delivery PIN generation.
 */

describe('Pricing Engine - calculatePricing', () => {
  const baseInput: PricingInput = {
    distanceKm: 100,
    weightKg: 2,
    urgency: 'STANDARD',
    size: 'SMALL',
  };

  it('should return pricing with minimum, recommended, and premium tiers', () => {
    const result = calculatePricing(baseInput);
    expect(result).toHaveProperty('minimum');
    expect(result).toHaveProperty('recommended');
    expect(result).toHaveProperty('premium');
    expect(result).toHaveProperty('currency', 'USD');
    expect(result).toHaveProperty('breakdown');
  });

  it('should have minimum <= recommended <= premium', () => {
    const result = calculatePricing(baseInput);
    expect(result.minimum).toBeLessThanOrEqual(result.recommended);
    expect(result.recommended).toBeLessThanOrEqual(result.premium);
  });

  it('should enforce minimum price of $5', () => {
    const shortTrip: PricingInput = {
      distanceKm: 1,
      weightKg: 0.1,
      urgency: 'STANDARD',
      size: 'SMALL',
    };
    const result = calculatePricing(shortTrip);
    expect(result.minimum).toBeGreaterThanOrEqual(5);
    expect(result.recommended).toBeGreaterThanOrEqual(5);
  });

  it('should enforce maximum price of $500', () => {
    const bigTrip: PricingInput = {
      distanceKm: 10000,
      weightKg: 50,
      urgency: 'URGENT',
      size: 'EXTRA_LARGE',
    };
    const result = calculatePricing(bigTrip);
    expect(result.premium).toBeLessThanOrEqual(500);
  });

  it('should charge more for EXPRESS urgency than STANDARD', () => {
    const standard = calculatePricing({ ...baseInput, urgency: 'STANDARD' });
    const express = calculatePricing({ ...baseInput, urgency: 'EXPRESS' });
    expect(express.recommended).toBeGreaterThan(standard.recommended);
  });

  it('should charge more for URGENT than EXPRESS', () => {
    const express = calculatePricing({ ...baseInput, urgency: 'EXPRESS' });
    const urgent = calculatePricing({ ...baseInput, urgency: 'URGENT' });
    expect(urgent.recommended).toBeGreaterThan(express.recommended);
  });

  it('should charge more for LARGE size than SMALL', () => {
    const small = calculatePricing({ ...baseInput, size: 'SMALL' });
    const large = calculatePricing({ ...baseInput, size: 'LARGE' });
    expect(large.recommended).toBeGreaterThan(small.recommended);
  });

  it('should charge more for heavier packages', () => {
    const light = calculatePricing({ ...baseInput, weightKg: 1 });
    const heavy = calculatePricing({ ...baseInput, weightKg: 10 });
    expect(heavy.recommended).toBeGreaterThan(light.recommended);
  });

  it('should charge more for longer distances', () => {
    const short = calculatePricing({ ...baseInput, distanceKm: 50 });
    const long = calculatePricing({ ...baseInput, distanceKm: 500 });
    expect(long.recommended).toBeGreaterThan(short.recommended);
  });

  it('should include insurance factor for high-value items', () => {
    const noValue = calculatePricing(baseInput);
    const highValue = calculatePricing({ ...baseInput, estimatedValue: 1000 });
    expect(highValue.recommended).toBeGreaterThanOrEqual(noValue.recommended);
  });

  it('should return rounded values (2 decimal places)', () => {
    const result = calculatePricing(baseInput);
    expect(result.minimum).toBe(Math.round(result.minimum * 100) / 100);
    expect(result.recommended).toBe(Math.round(result.recommended * 100) / 100);
    expect(result.premium).toBe(Math.round(result.premium * 100) / 100);
  });

  it('should include breakdown details', () => {
    const result = calculatePricing(baseInput);
    expect(result.breakdown).toHaveProperty('distanceCost');
    expect(result.breakdown).toHaveProperty('weightCost');
    expect(result.breakdown).toHaveProperty('urgencyMultiplier');
    expect(result.breakdown).toHaveProperty('sizeCost');
    expect(result.breakdown).toHaveProperty('basePrice');
    expect(result.breakdown.urgencyMultiplier).toBe(1.0); // STANDARD
  });
});

describe('Pricing Engine - estimateDistanceFromCities', () => {
  it('should return known distance for a city pair in the lookup table', () => {
    const distance = estimateDistanceFromCities('Mumbai', 'Delhi');
    expect(distance).toBe(1400);
  });

  it('should return known distance regardless of city order', () => {
    const d1 = estimateDistanceFromCities('London', 'Paris');
    const d2 = estimateDistanceFromCities('Paris', 'London');
    expect(d1).toBe(d2);
    expect(d1).toBe(340);
  });

  it('should be case-insensitive', () => {
    const d1 = estimateDistanceFromCities('MUMBAI', 'DELHI');
    const d2 = estimateDistanceFromCities('mumbai', 'delhi');
    expect(d1).toBe(d2);
  });

  it('should return a fallback distance for unknown cities', () => {
    const distance = estimateDistanceFromCities('Atlantis', 'El Dorado');
    expect(distance).toBeGreaterThanOrEqual(100);
    expect(distance).toBeLessThanOrEqual(3000);
  });

  it('should return consistent fallback for same unknown city pair', () => {
    const d1 = estimateDistanceFromCities('CityA', 'CityB');
    const d2 = estimateDistanceFromCities('CityA', 'CityB');
    expect(d1).toBe(d2);
  });
});

describe('Package Status Transitions', () => {
  // Valid status flow as implemented in the backend
  const VALID_STATUS_FLOW = [
    'PENDING',
    'MATCHED',
    'ACCEPTED',
    'IN_TRANSIT',
    'DELIVERED',
  ];

  const TERMINAL_STATES = ['DELIVERED', 'CANCELLED'];

  // Validates that a transition from `from` -> `to` is in valid sequential order
  const isValidTransition = (from: string, to: string): boolean => {
    if (TERMINAL_STATES.includes(from)) return false; // Cannot transition from terminal state
    if (to === 'CANCELLED') return true; // Can cancel from any non-terminal state

    const fromIndex = VALID_STATUS_FLOW.indexOf(from);
    const toIndex = VALID_STATUS_FLOW.indexOf(to);

    if (fromIndex === -1 || toIndex === -1) return false;
    return toIndex === fromIndex + 1; // Must be the next sequential state
  };

  it('should allow PENDING -> MATCHED', () => {
    expect(isValidTransition('PENDING', 'MATCHED')).toBe(true);
  });

  it('should allow MATCHED -> ACCEPTED', () => {
    expect(isValidTransition('MATCHED', 'ACCEPTED')).toBe(true);
  });

  it('should allow ACCEPTED -> IN_TRANSIT', () => {
    expect(isValidTransition('ACCEPTED', 'IN_TRANSIT')).toBe(true);
  });

  it('should allow IN_TRANSIT -> DELIVERED', () => {
    expect(isValidTransition('IN_TRANSIT', 'DELIVERED')).toBe(true);
  });

  it('should NOT allow skipping states (PENDING -> ACCEPTED)', () => {
    expect(isValidTransition('PENDING', 'ACCEPTED')).toBe(false);
  });

  it('should NOT allow backwards transitions (DELIVERED -> PENDING)', () => {
    expect(isValidTransition('DELIVERED', 'PENDING')).toBe(false);
  });

  it('should NOT allow transitions from DELIVERED', () => {
    expect(isValidTransition('DELIVERED', 'IN_TRANSIT')).toBe(false);
    expect(isValidTransition('DELIVERED', 'CANCELLED')).toBe(false);
  });

  it('should NOT allow transitions from CANCELLED', () => {
    expect(isValidTransition('CANCELLED', 'PENDING')).toBe(false);
  });

  it('should allow cancellation from any non-terminal state', () => {
    expect(isValidTransition('PENDING', 'CANCELLED')).toBe(true);
    expect(isValidTransition('MATCHED', 'CANCELLED')).toBe(true);
    expect(isValidTransition('ACCEPTED', 'CANCELLED')).toBe(true);
    expect(isValidTransition('IN_TRANSIT', 'CANCELLED')).toBe(true);
  });

  it('should reject invalid/unknown status values', () => {
    expect(isValidTransition('UNKNOWN', 'PENDING')).toBe(false);
    expect(isValidTransition('PENDING', 'UNKNOWN')).toBe(false);
  });
});

describe('Delivery PIN Generation', () => {
  // Mirrors the production logic from matches.ts:
  // Math.floor(1000 + Math.random() * 9000).toString()
  const generateDeliveryPin = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  it('should generate a 4-digit string', () => {
    const pin = generateDeliveryPin();
    expect(pin).toHaveLength(4);
  });

  it('should be a numeric string', () => {
    const pin = generateDeliveryPin();
    expect(/^\d{4}$/.test(pin)).toBe(true);
  });

  it('should be between 1000 and 9999', () => {
    for (let i = 0; i < 100; i++) {
      const pin = generateDeliveryPin();
      const num = parseInt(pin, 10);
      expect(num).toBeGreaterThanOrEqual(1000);
      expect(num).toBeLessThanOrEqual(9999);
    }
  });

  it('should never start with 0', () => {
    for (let i = 0; i < 100; i++) {
      const pin = generateDeliveryPin();
      expect(pin[0]).not.toBe('0');
    }
  });

  it('should generate varying PINs (not always the same)', () => {
    const pins = new Set<string>();
    for (let i = 0; i < 50; i++) {
      pins.add(generateDeliveryPin());
    }
    // With 50 samples from a 9000-value range, we should get at least 10 unique values
    expect(pins.size).toBeGreaterThan(10);
  });
});
