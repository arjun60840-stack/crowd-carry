import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@crowdcarry.com' },
    update: {},
    create: {
      email: 'admin@crowdcarry.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isVerified: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      trustScore: 100,
      rating: 5.0,
      isTrustedTraveler: true,
      isVerifiedBadge: true,
      isTopCarrier: true,
    },
  });

  // Create demo travelers
  const travelerPassword = await bcrypt.hash('Demo@123', 12);

  const traveler1 = await prisma.user.upsert({
    where: { email: 'john.traveler@example.com' },
    update: {},
    create: {
      email: 'john.traveler@example.com',
      password: travelerPassword,
      firstName: 'John',
      lastName: 'Smith',
      role: 'TRAVELER',
      phone: '+1234567890',
      isEmailVerified: true,
      isPhoneVerified: true,
      isVerified: true,
      trustScore: 87.5,
      rating: 4.8,
      totalRatings: 23,
      completedDeliveries: 18,
      totalTrips: 20,
      successRate: 0.9,
      isTrustedTraveler: true,
      isVerifiedBadge: true,
      bio: 'Frequent traveler between major cities. Love helping people and reducing delivery costs!',
      city: 'New York',
      country: 'USA',
    },
  });

  const traveler2 = await prisma.user.upsert({
    where: { email: 'priya.traveler@example.com' },
    update: {},
    create: {
      email: 'priya.traveler@example.com',
      password: travelerPassword,
      firstName: 'Priya',
      lastName: 'Patel',
      role: 'TRAVELER',
      phone: '+9876543210',
      isEmailVerified: true,
      isPhoneVerified: true,
      isVerified: true,
      trustScore: 92.3,
      rating: 4.9,
      totalRatings: 45,
      completedDeliveries: 42,
      totalTrips: 48,
      successRate: 0.875,
      isTrustedTraveler: true,
      isVerifiedBadge: true,
      isTopCarrier: true,
      bio: 'Top carrier on the platform. Business traveler who loves sustainable delivery.',
      city: 'Mumbai',
      country: 'India',
    },
  });

  // Create demo sender
  const sender = await prisma.user.upsert({
    where: { email: 'alice.sender@example.com' },
    update: {},
    create: {
      email: 'alice.sender@example.com',
      password: travelerPassword,
      firstName: 'Alice',
      lastName: 'Johnson',
      role: 'USER',
      isEmailVerified: true,
      trustScore: 55.0,
      rating: 4.5,
      totalRatings: 8,
      city: 'Los Angeles',
      country: 'USA',
    },
  });

  // Create trips
  const trip1 = await prisma.trip.upsert({
    where: { id: 'seed-trip-1' },
    update: {},
    create: {
      id: 'seed-trip-1',
      userId: traveler1.id,
      sourceCity: 'New York',
      sourceCountry: 'USA',
      sourceLat: 40.7128,
      sourceLng: -74.0060,
      destinationCity: 'Los Angeles',
      destinationCountry: 'USA',
      destinationLat: 34.0522,
      destinationLng: -118.2437,
      travelDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      travelTime: '09:00',
      vehicleType: 'FLIGHT',
      availableCapacity: 23,
      availableWeight: 15,
      pricePerKg: 5,
      notes: 'Flying first class, can carry small to medium packages safely.',
      routeDistance: 4500,
    },
  });

  const trip2 = await prisma.trip.upsert({
    where: { id: 'seed-trip-2' },
    update: {},
    create: {
      id: 'seed-trip-2',
      userId: traveler2.id,
      sourceCity: 'Mumbai',
      sourceCountry: 'India',
      sourceLat: 19.0760,
      sourceLng: 72.8777,
      destinationCity: 'Delhi',
      destinationCountry: 'India',
      destinationLat: 28.6139,
      destinationLng: 77.2090,
      travelDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      travelTime: '14:30',
      vehicleType: 'TRAIN',
      availableCapacity: 30,
      availableWeight: 20,
      pricePerKg: 3,
      notes: 'Taking Rajdhani Express. Safe and reliable. Documents and electronics welcome.',
      routeDistance: 1400,
    },
  });

  // Create packages
  await prisma.package.upsert({
    where: { id: 'seed-pkg-1' },
    update: {},
    create: {
      id: 'seed-pkg-1',
      userId: sender.id,
      title: 'Important Documents',
      description: 'Sealed legal documents, handle with care',
      pickupAddress: '123 Broadway, New York',
      pickupCity: 'New York',
      pickupCountry: 'USA',
      pickupLat: 40.7128,
      pickupLng: -74.0060,
      destinationAddress: '456 Sunset Blvd, Los Angeles',
      destinationCity: 'Los Angeles',
      destinationCountry: 'USA',
      destinationLat: 34.0522,
      destinationLng: -118.2437,
      weight: 0.5,
      size: 'SMALL',
      category: 'DOCUMENTS',
      urgency: 'EXPRESS',
      rewardAmount: 25,
      suggestedMin: 18,
      suggestedRecommended: 25,
      suggestedPremium: 34,
      status: 'PENDING',
    },
  });

  // Create some reviews
  await prisma.review.upsert({
    where: { id: 'seed-review-1' },
    update: {},
    create: {
      id: 'seed-review-1',
      reviewerId: sender.id,
      revieweeId: traveler1.id,
      rating: 5,
      comment: 'Excellent delivery! John was very professional and delivered my package safely. Highly recommended!',
    },
  });

  await prisma.review.upsert({
    where: { id: 'seed-review-2' },
    update: {},
    create: {
      id: 'seed-review-2',
      reviewerId: sender.id,
      revieweeId: traveler2.id,
      rating: 5,
      comment: 'Priya is amazing! Super fast and reliable. Package arrived in perfect condition.',
    },
  });

  console.log('✅ Seed completed!');
  console.log('📧 Admin: admin@crowdcarry.com / Admin@123');
  console.log('📧 Traveler 1: john.traveler@example.com / Demo@123');
  console.log('📧 Traveler 2: priya.traveler@example.com / Demo@123');
  console.log('📧 Sender: alice.sender@example.com / Demo@123');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
