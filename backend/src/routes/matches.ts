import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { calculateMatch, findBestMatches, TravelerData, PackageData } from '../engines/matchEngine';

const router = Router();

// GET /api/matches/package/:packageId - Find matches for a package
router.get('/package/:packageId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pkg = await prisma.package.findUnique({
      where: { id: req.params.packageId },
    });

    if (!pkg) {
      res.status(404).json({ success: false, message: 'Package not found' });
      return;
    }

    if (pkg.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }

    // Find active trips that could match
    const trips = await prisma.trip.findMany({
      where: {
        isActive: true,
        isCompleted: false,
        travelDate: { gte: new Date() },
        availableWeight: { gte: pkg.weight },
      },
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true, avatar: true,
            rating: true, successRate: true, completedDeliveries: true,
            trustScore: true, isTrustedTraveler: true, isVerifiedBadge: true, isTopCarrier: true,
          },
        },
      },
    });

    // Run match engine
    const packageData: PackageData = {
      pickupCity: pkg.pickupCity,
      destinationCity: pkg.destinationCity,
      pickupLat: pkg.pickupLat,
      pickupLng: pkg.pickupLng,
      destinationLat: pkg.destinationLat,
      destinationLng: pkg.destinationLng,
      weight: pkg.weight,
      urgency: pkg.urgency,
    };

    const travelerData: TravelerData[] = trips.map(t => ({
      id: t.id,
      sourceCity: t.sourceCity,
      destinationCity: t.destinationCity,
      sourceLat: t.sourceLat,
      sourceLng: t.sourceLng,
      destinationLat: t.destinationLat,
      destinationLng: t.destinationLng,
      travelDate: t.travelDate,
      availableWeight: t.availableWeight,
      availableCapacity: t.availableCapacity,
      rating: t.user.rating,
      successRate: t.user.successRate,
      completedDeliveries: t.user.completedDeliveries,
    }));

    const bestMatches = findBestMatches(travelerData, packageData, 30);

    // Save/update matches in database
    const savedMatches = await Promise.all(
      bestMatches.slice(0, 20).map(async ({ traveler, match }) => {
        const trip = trips.find(t => t.id === traveler.id)!;
        
        return prisma.match.upsert({
          where: { packageId_tripId: { packageId: pkg.id, tripId: trip.id } },
          update: {
            matchScore: match.matchScore,
            routeScore: match.factors.routeScore,
            dateScore: match.factors.dateScore,
            weightScore: match.factors.weightScore,
            ratingScore: match.factors.ratingScore,
            successRateScore: match.factors.successRateScore,
            matchQuality: match.matchQuality,
            explanation: match.explanation,
          },
          create: {
            packageId: pkg.id,
            tripId: trip.id,
            travelerId: trip.userId,
            senderId: pkg.userId,
            matchScore: match.matchScore,
            routeScore: match.factors.routeScore,
            dateScore: match.factors.dateScore,
            weightScore: match.factors.weightScore,
            ratingScore: match.factors.ratingScore,
            successRateScore: match.factors.successRateScore,
            matchQuality: match.matchQuality,
            explanation: match.explanation,
          },
          include: {
            trip: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true, rating: true, trustScore: true, completedDeliveries: true, isTrustedTraveler: true, isTopCarrier: true } } } },
          },
        });
      })
    );

    // Update package status to MATCHED if we found good matches
    if (bestMatches.length > 0 && pkg.status === 'PENDING') {
      await prisma.package.update({
        where: { id: pkg.id },
        data: { status: 'MATCHED' },
      });
    }

    // Notify top 3 travelers
    for (const { traveler: td, match } of bestMatches.slice(0, 3)) {
      const trip = trips.find(t => t.id === td.id)!;
      if (match.matchScore >= 60) {
        await prisma.notification.create({
          data: {
            userId: trip.userId,
            type: 'MATCH_FOUND',
            title: `New Package Match! ${Math.round(match.matchScore)}% Match`,
            message: `A package from ${pkg.pickupCity} to ${pkg.destinationCity} matches your trip. Score: ${match.matchScore.toFixed(1)}%`,
            data: JSON.stringify({ packageId: pkg.id, matchScore: match.matchScore }),
          },
        });
      }
    }

    res.json({
      success: true,
      data: {
        matches: savedMatches,
        total: bestMatches.length,
        package: { id: pkg.id, title: pkg.title, pickupCity: pkg.pickupCity, destinationCity: pkg.destinationCity },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to find matches' });
  }
});

// GET /api/matches/:id - Get specific match
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      include: {
        package: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
        trip: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true, rating: true, trustScore: true } } } },
        traveler: { select: { id: true, firstName: true, lastName: true, avatar: true, rating: true, trustScore: true } },
        sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });

    if (!match) { res.status(404).json({ success: false, message: 'Match not found' }); return; }

    res.json({ success: true, data: match });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch match' });
  }
});

// POST /api/matches/:id/accept - Accept a match
router.post('/:id/accept', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.id },
      include: { package: true, trip: true },
    });

    if (!match) { res.status(404).json({ success: false, message: 'Match not found' }); return; }
    if (match.senderId !== req.user!.id && match.travelerId !== req.user!.id && req.user!.role !== 'ADMIN') { 
      res.status(403).json({ success: false, message: 'Not authorized' }); 
      return; 
    }

    const updated = await prisma.match.update({
      where: { id: req.params.id },
      data: { isAccepted: true, acceptedAt: new Date() },
    });

    // Generate a random 4-digit delivery PIN
    const deliveryPin = Math.floor(1000 + Math.random() * 9000).toString();

    // Update package status and add the PIN
    await prisma.package.update({
      where: { id: match.packageId },
      data: { 
        status: 'ACCEPTED',
        deliveryPin
      },
    });

    // Notify the other party (sender or traveler)
    const recipientId = match.senderId === req.user!.id ? match.travelerId : match.senderId;
    const notificationTitle = match.senderId === req.user!.id 
      ? 'A sender accepted your trip match! 🎉'
      : 'Your Package Was Accepted! 🎉';
    const notificationMessage = match.senderId === req.user!.id
      ? `A sender has accepted your trip to deliver their package from ${match.package.pickupCity} to ${match.package.destinationCity}.`
      : `A traveler has accepted your package delivery request. They will pick it up soon.`;

    await prisma.notification.create({
      data: {
        userId: recipientId,
        type: 'PACKAGE_ACCEPTED',
        title: notificationTitle,
        message: notificationMessage,
        data: JSON.stringify({ matchId: match.id, packageId: match.packageId }),
      },
    });

    res.json({ success: true, message: 'Match accepted', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to accept match' });
  }
});

// POST /api/matches/:id/reject - Reject a match
router.post('/:id/reject', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const match = await prisma.match.findUnique({ where: { id: req.params.id } });
    if (!match) { res.status(404).json({ success: false, message: 'Match not found' }); return; }
    if (match.senderId !== req.user!.id && match.travelerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Not authorized' }); return;
    }

    await prisma.match.update({ where: { id: req.params.id }, data: { isRejected: true } });
    res.json({ success: true, message: 'Match rejected' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reject match' });
  }
});

// GET /api/matches/traveler/my-matches - Get matches for logged in traveler
router.get('/traveler/my-matches', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const matches = await prisma.match.findMany({
      where: { travelerId: req.user!.id, isRejected: false },
      include: {
        package: {
          include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
        },
        trip: { select: { sourceCity: true, destinationCity: true, travelDate: true } },
      },
      orderBy: { matchScore: 'desc' },
    });

    res.json({ success: true, data: matches });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch matches' });
  }
});

export default router;
