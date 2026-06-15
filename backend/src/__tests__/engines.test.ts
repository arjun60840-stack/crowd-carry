import {
  calculateDeliverySustainability,
  aggregateSustainabilityStats,
} from '../engines/sustainabilityEngine';
import type {
  SustainabilityInput,
  SustainabilityResult,
  PlatformSustainabilityStats,
} from '../engines/sustainabilityEngine';

/**
 * Sustainability Engine Unit Tests
 * Tests CO2 calculations, aggregation, impact labels, and edge cases.
 */

describe('calculateDeliverySustainability', () => {
  const baseInput: SustainabilityInput = {
    distanceKm: 100,
    weightKg: 5,
    vehicleType: 'CAR',
    rewardAmount: 50,
  };

  it('should return all expected fields', () => {
    const result = calculateDeliverySustainability(baseInput);

    expect(result).toHaveProperty('co2SavedGrams');
    expect(result).toHaveProperty('co2SavedKg');
    expect(result).toHaveProperty('distanceKm');
    expect(result).toHaveProperty('moneySavedUSD');
    expect(result).toHaveProperty('treesEquivalent');
    expect(result).toHaveProperty('carKmEquivalent');
    expect(result).toHaveProperty('impactLabel');
    expect(result).toHaveProperty('breakdown');
    expect(result.breakdown).toHaveProperty('traditionalEmissions');
    expect(result.breakdown).toHaveProperty('crowdCarryEmissions');
    expect(result.breakdown).toHaveProperty('traditionalCost');
    expect(result.breakdown).toHaveProperty('crowdCarryCost');
  });

  it('should calculate CO2 savings correctly for CAR at 100km', () => {
    const result = calculateDeliverySustainability(baseInput);

    // Traditional: MOTORCYCLE baseline = 120 g/km * 100 km = 12000 g
    const expectedTraditional = 120 * 100;
    // CrowdCarry: CAR = 120 g/km * 100 km * 0.1 (marginal) = 1200 g
    const expectedCrowdCarry = 120 * 100 * 0.1;
    const expectedSaved = expectedTraditional - expectedCrowdCarry;

    expect(result.breakdown.traditionalEmissions).toBe(expectedTraditional);
    expect(result.breakdown.crowdCarryEmissions).toBe(expectedCrowdCarry);
    expect(result.co2SavedGrams).toBe(Math.round(expectedSaved));
    expect(result.co2SavedKg).toBe(Math.round((expectedSaved / 1000) * 100) / 100);
  });

  it('should calculate zero marginal emissions for BICYCLE', () => {
    const input: SustainabilityInput = { ...baseInput, vehicleType: 'BICYCLE' };
    const result = calculateDeliverySustainability(input);

    // BICYCLE emissions = 0, so marginal = 0 * 100 * 0.1 = 0
    expect(result.breakdown.crowdCarryEmissions).toBe(0);
    // Full traditional emissions saved
    expect(result.co2SavedGrams).toBe(120 * 100); // 12000g
  });

  it('should calculate zero marginal emissions for WALK', () => {
    const input: SustainabilityInput = { ...baseInput, vehicleType: 'WALK' };
    const result = calculateDeliverySustainability(input);

    expect(result.breakdown.crowdCarryEmissions).toBe(0);
    expect(result.co2SavedGrams).toBe(120 * 100);
  });

  it('should calculate correct money saved', () => {
    const result = calculateDeliverySustainability(baseInput);

    // Traditional cost: $2.50/km * 100 km = $250
    // CrowdCarry cost: reward = $50
    // Saved: $250 - $50 = $200
    expect(result.breakdown.traditionalCost).toBe(250);
    expect(result.breakdown.crowdCarryCost).toBe(50);
    expect(result.moneySavedUSD).toBe(200);
  });

  it('should calculate trees equivalent correctly', () => {
    const result = calculateDeliverySustainability(baseInput);
    const expectedTrees = result.co2SavedKg / 22;
    expect(result.treesEquivalent).toBe(Math.round(expectedTrees * 100) / 100);
  });

  it('should calculate car km equivalent correctly', () => {
    const result = calculateDeliverySustainability(baseInput);
    const expectedCarKm = result.co2SavedGrams / 120;
    expect(result.carKmEquivalent).toBe(Math.round(expectedCarKm * 10) / 10);
  });

  it('should preserve distanceKm from input', () => {
    const result = calculateDeliverySustainability(baseInput);
    expect(result.distanceKm).toBe(100);
  });

  describe('Impact Labels', () => {
    it('should label "Exceptional Impact" for >= 10 kg CO2 saved', () => {
      // Need ~83.33 km to save 10 kg with BICYCLE: 120 * distance = 10000 => ~83.3 km
      const input: SustainabilityInput = {
        distanceKm: 100,
        weightKg: 5,
        vehicleType: 'BICYCLE',
        rewardAmount: 10,
      };
      const result = calculateDeliverySustainability(input);
      // 120 * 100 = 12000g = 12 kg saved
      expect(result.impactLabel).toBe('Exceptional Impact');
    });

    it('should label "Great Impact" for >= 5 and < 10 kg CO2 saved', () => {
      // BICYCLE at ~50 km: 120 * 50 = 6000g = 6 kg
      const input: SustainabilityInput = {
        distanceKm: 50,
        weightKg: 2,
        vehicleType: 'BICYCLE',
        rewardAmount: 10,
      };
      const result = calculateDeliverySustainability(input);
      expect(result.co2SavedKg).toBeGreaterThanOrEqual(5);
      expect(result.co2SavedKg).toBeLessThan(10);
      expect(result.impactLabel).toBe('Great Impact');
    });

    it('should label "Good Impact" for >= 2 and < 5 kg CO2 saved', () => {
      // BICYCLE at ~25 km: 120 * 25 = 3000g = 3 kg
      const input: SustainabilityInput = {
        distanceKm: 25,
        weightKg: 1,
        vehicleType: 'BICYCLE',
        rewardAmount: 5,
      };
      const result = calculateDeliverySustainability(input);
      expect(result.co2SavedKg).toBeGreaterThanOrEqual(2);
      expect(result.co2SavedKg).toBeLessThan(5);
      expect(result.impactLabel).toBe('Good Impact');
    });

    it('should label "Positive Impact" for >= 0.5 and < 2 kg CO2 saved', () => {
      // BICYCLE at ~10 km: 120 * 10 = 1200g = 1.2 kg
      const input: SustainabilityInput = {
        distanceKm: 10,
        weightKg: 1,
        vehicleType: 'BICYCLE',
        rewardAmount: 5,
      };
      const result = calculateDeliverySustainability(input);
      expect(result.co2SavedKg).toBeGreaterThanOrEqual(0.5);
      expect(result.co2SavedKg).toBeLessThan(2);
      expect(result.impactLabel).toBe('Positive Impact');
    });

    it('should label "Minimal Impact" for < 0.5 kg CO2 saved', () => {
      const input: SustainabilityInput = {
        distanceKm: 2,
        weightKg: 0.5,
        vehicleType: 'BICYCLE',
        rewardAmount: 1,
      };
      const result = calculateDeliverySustainability(input);
      // 120 * 2 = 240g = 0.24 kg
      expect(result.co2SavedKg).toBeLessThan(0.5);
      expect(result.impactLabel).toBe('Minimal Impact');
    });
  });

  describe('FLIGHT vehicle type', () => {
    it('should calculate higher crowd-carry emissions for FLIGHT', () => {
      const carResult = calculateDeliverySustainability({ ...baseInput, vehicleType: 'CAR' });
      const flightResult = calculateDeliverySustainability({ ...baseInput, vehicleType: 'FLIGHT' });

      // FLIGHT = 285 g/km, CAR = 120 g/km → flight has higher marginal emissions
      expect(flightResult.breakdown.crowdCarryEmissions).toBeGreaterThan(
        carResult.breakdown.crowdCarryEmissions,
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero distance', () => {
      const input: SustainabilityInput = { ...baseInput, distanceKm: 0 };
      const result = calculateDeliverySustainability(input);

      expect(result.co2SavedGrams).toBe(0);
      expect(result.co2SavedKg).toBe(0);
      expect(result.moneySavedUSD).toBe(0);
      expect(result.treesEquivalent).toBe(0);
      expect(result.carKmEquivalent).toBe(0);
    });

    it('should handle zero weight', () => {
      const input: SustainabilityInput = { ...baseInput, weightKg: 0 };
      const result = calculateDeliverySustainability(input);

      // Weight doesn't directly factor into the calculation (only vehicle type + distance)
      // So result should still be valid
      expect(result.co2SavedGrams).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero reward amount', () => {
      const input: SustainabilityInput = { ...baseInput, rewardAmount: 0 };
      const result = calculateDeliverySustainability(input);

      // Traditional cost = 2.50 * 100 = 250, crowdCarry cost = 0
      expect(result.moneySavedUSD).toBe(250);
    });

    it('should never return negative CO2 saved', () => {
      // Even with FLIGHT (285 g/km) at 10% marginal = 28.5 g/km
      // Traditional MOTORCYCLE = 120 g/km → still saves CO2
      // But just in case, Math.max(0, ...) is used
      const input: SustainabilityInput = {
        distanceKm: 100,
        weightKg: 1,
        vehicleType: 'FLIGHT',
        rewardAmount: 10,
      };
      const result = calculateDeliverySustainability(input);
      expect(result.co2SavedGrams).toBeGreaterThanOrEqual(0);
    });

    it('should never return negative money saved', () => {
      // If reward > traditional cost
      const input: SustainabilityInput = {
        distanceKm: 1,
        weightKg: 1,
        vehicleType: 'CAR',
        rewardAmount: 1000, // Way more than traditional cost
      };
      const result = calculateDeliverySustainability(input);
      expect(result.moneySavedUSD).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('aggregateSustainabilityStats', () => {
  it('should aggregate multiple deliveries correctly', () => {
    const deliveries = [
      { co2Saved: 5000, moneySaved: 100, distanceSaved: 200 },
      { co2Saved: 3000, moneySaved: 50, distanceSaved: 150 },
      { co2Saved: 2000, moneySaved: 30, distanceSaved: 100 },
    ];

    const stats = aggregateSustainabilityStats(deliveries);

    expect(stats.totalCO2SavedKg).toBe(10); // (5000+3000+2000)/1000 = 10
    expect(stats.totalDeliveries).toBe(3);
    expect(stats.totalMoneySaved).toBe(180);
    expect(stats.totalDistanceOptimized).toBe(450);
  });

  it('should calculate trees equivalent from total CO2', () => {
    const deliveries = [
      { co2Saved: 22000, moneySaved: 0, distanceSaved: 0 }, // 22 kg CO2
    ];

    const stats = aggregateSustainabilityStats(deliveries);
    // 22 kg / 22 = 1 tree
    expect(stats.treesEquivalent).toBe(1);
  });

  it('should calculate CO2 per delivery average', () => {
    const deliveries = [
      { co2Saved: 6000, moneySaved: 0, distanceSaved: 0 },
      { co2Saved: 4000, moneySaved: 0, distanceSaved: 0 },
    ];

    const stats = aggregateSustainabilityStats(deliveries);
    // Total = 10000g = 10 kg, 2 deliveries → 5 kg/delivery
    expect(stats.co2PerDelivery).toBe(5);
  });

  it('should handle empty deliveries array', () => {
    const stats = aggregateSustainabilityStats([]);

    expect(stats.totalCO2SavedKg).toBe(0);
    expect(stats.totalDeliveries).toBe(0);
    expect(stats.totalMoneySaved).toBe(0);
    expect(stats.totalDistanceOptimized).toBe(0);
    expect(stats.treesEquivalent).toBe(0);
    expect(stats.co2PerDelivery).toBe(0); // No division by zero
  });

  it('should handle single delivery', () => {
    const deliveries = [
      { co2Saved: 10000, moneySaved: 200, distanceSaved: 500 },
    ];

    const stats = aggregateSustainabilityStats(deliveries);

    expect(stats.totalCO2SavedKg).toBe(10);
    expect(stats.totalDeliveries).toBe(1);
    expect(stats.totalMoneySaved).toBe(200);
    expect(stats.totalDistanceOptimized).toBe(500);
    expect(stats.co2PerDelivery).toBe(10);
  });

  it('should handle deliveries with zero values', () => {
    const deliveries = [
      { co2Saved: 0, moneySaved: 0, distanceSaved: 0 },
      { co2Saved: 0, moneySaved: 0, distanceSaved: 0 },
    ];

    const stats = aggregateSustainabilityStats(deliveries);

    expect(stats.totalCO2SavedKg).toBe(0);
    expect(stats.totalDeliveries).toBe(2);
    expect(stats.totalMoneySaved).toBe(0);
    expect(stats.co2PerDelivery).toBe(0);
  });

  it('should handle missing/undefined data gracefully via || 0', () => {
    // Simulate partial data: the reduce uses (d.co2Saved || 0)
    const deliveries = [
      { co2Saved: undefined as unknown as number, moneySaved: 100, distanceSaved: 50 },
      { co2Saved: 5000, moneySaved: undefined as unknown as number, distanceSaved: 100 },
    ];

    const stats = aggregateSustainabilityStats(deliveries);

    // undefined || 0 = 0, so totals = 5000g = 5 kg CO2, $100 money, 150 distance
    expect(stats.totalCO2SavedKg).toBe(5);
    expect(stats.totalMoneySaved).toBe(100);
    expect(stats.totalDistanceOptimized).toBe(150);
    expect(stats.totalDeliveries).toBe(2);
  });

  it('should return rounded values', () => {
    const deliveries = [
      { co2Saved: 1234, moneySaved: 56.789, distanceSaved: 123.456 },
    ];

    const stats = aggregateSustainabilityStats(deliveries);

    // totalCO2SavedKg rounded to 1 decimal: 1.234 → 1.2
    expect(stats.totalCO2SavedKg).toBe(1.2);
    // totalMoneySaved rounded to 2 decimals: 56.789 → 56.79
    expect(stats.totalMoneySaved).toBe(56.79);
    // totalDistanceOptimized rounded to integer: 123.456 → 123
    expect(stats.totalDistanceOptimized).toBe(123);
  });
});
