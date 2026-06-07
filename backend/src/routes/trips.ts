import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/trips
router.post('/', authenticate, [
  body('sourceCity').trim().notEmpty().withMessage('Source city required'),
  body('destinationCity').trim().notEmpty().withMessage('Destination city required'),
  body('travelDate').isISO8601().withMessage('Valid travel date required'),
  body('availableWeight').isFloat({ min: 0.1 }).withMessage('Available weight must be positive'),
  body('availableCapacity').isFloat({ min: 0.1 }).withMessage('Available capacity must be positive'),
  body('vehicleType').isIn(['CAR', 'MOTORCYCLE', 'BICYCLE', 'PUBLIC_TRANSPORT', 'WALK', 'TRAIN', 'FLIGHT']),
], async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const {
    sourceCity, sourceCountry, sourceLat, sourceLng,
    destinationCity, destinationCountry, destinationLat, destinationLng,
    travelDate, travelTime, vehicleType, availableCapacity, availableWeight,
    pricePerKg, notes,
  } = req.body;

  try {
    const trip = await prisma.trip.create({
      data: {
        userId: req.user!.id,
        sourceCity, sourceCountry, sourceLat, sourceLng,
        destinationCity, destinationCountry, destinationLat, destinationLng,
        travelDate: new Date(travelDate),
        travelTime, vehicleType, availableCapacity: parseFloat(availableCapacity),
        availableWeight: parseFloat(availableWeight),
        pricePerKg: pricePerKg ? parseFloat(pricePerKg) : null,
        notes,
      },
      include: { user: { select: { firstName: true, lastName: true, avatar: true, rating: true, trustScore: true } } },
    });

    // Update user total trips
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { totalTrips: { increment: 1 } },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: req.user!.id,
        type: 'SYSTEM',
        title: 'Trip Created!',
        message: `Your trip from ${sourceCity} to ${destinationCity} has been posted. Senders can now find and request you!`,
      },
    });

    res.status(201).json({ success: true, message: 'Trip created', data: trip });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create trip' });
  }
});

// GET /api/trips
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    sourceCity, destinationCity, date, vehicleType, minWeight,
    page = '1', limit = '20', myTrips,
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = Math.min(parseInt(limit as string), 50);
  const skip = (pageNum - 1) * limitNum;

  try {
    const where: any = { isActive: true };

    if (myTrips && req.user) {
      where.userId = req.user.id;
    }
    if (sourceCity) {
      where.sourceCity = { contains: sourceCity as string, mode: 'insensitive' };
    }
    if (destinationCity) {
      where.destinationCity = { contains: destinationCity as string, mode: 'insensitive' };
    }
    if (vehicleType) {
      where.vehicleType = vehicleType;
    }
    if (minWeight) {
      where.availableWeight = { gte: parseFloat(minWeight as string) };
    }
    if (date) {
      const startDate = new Date(date as string);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      where.travelDate = { gte: startDate, lt: endDate };
    } else {
      where.travelDate = { gte: new Date() };
    }

    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where,
        include: {
          user: {
            select: {
              id: true, firstName: true, lastName: true, avatar: true,
              rating: true, trustScore: true, completedDeliveries: true,
              isTrustedTraveler: true, isVerifiedBadge: true, isTopCarrier: true,
            },
          },
        },
        orderBy: { travelDate: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.trip.count({ where }),
    ]);

    res.json({
      success: true,
      data: trips,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch trips' });
  }
});

// GET /api/trips/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true, avatar: true,
            rating: true, trustScore: true, completedDeliveries: true,
            isTrustedTraveler: true, isVerifiedBadge: true, isTopCarrier: true, bio: true,
          },
        },
        matches: {
          include: {
            package: { select: { id: true, title: true, weight: true, status: true } },
          },
          where: { isRejected: false },
        },
      },
    });

    if (!trip) {
      res.status(404).json({ success: false, message: 'Trip not found' });
      return;
    }

    res.json({ success: true, data: trip });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch trip' });
  }
});

// PUT /api/trips/:id
router.put('/:id', authenticate, [
  body('sourceCity').optional().trim().notEmpty(),
  body('destinationCity').optional().trim().notEmpty(),
  body('travelDate').optional().isISO8601(),
  body('availableWeight').optional().isFloat({ min: 0.1 }),
  body('availableCapacity').optional().isFloat({ min: 0.1 }),
], async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const trip = await prisma.trip.findUnique({ where: { id: req.params.id } });

    if (!trip) { res.status(404).json({ success: false, message: 'Trip not found' }); return; }
    if (trip.userId !== req.user!.id) { res.status(403).json({ success: false, message: 'Not authorized' }); return; }

    const {
      sourceCity, sourceCountry, sourceLat, sourceLng,
      destinationCity, destinationCountry, destinationLat, destinationLng,
      travelDate, travelTime, vehicleType, availableCapacity, availableWeight,
      pricePerKg, notes, isActive,
    } = req.body;

    const updated = await prisma.trip.update({
      where: { id: req.params.id },
      data: {
        ...(sourceCity && { sourceCity }),
        ...(destinationCity && { destinationCity }),
        ...(travelDate && { travelDate: new Date(travelDate) }),
        ...(vehicleType && { vehicleType }),
        ...(availableWeight && { availableWeight: parseFloat(availableWeight) }),
        ...(availableCapacity && { availableCapacity: parseFloat(availableCapacity) }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({ success: true, message: 'Trip updated', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update trip' });
  }
});

// DELETE /api/trips/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const trip = await prisma.trip.findUnique({ where: { id: req.params.id } });
    if (!trip) { res.status(404).json({ success: false, message: 'Trip not found' }); return; }
    if (trip.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Not authorized' }); return;
    }

    await prisma.trip.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Trip deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete trip' });
  }
});

// POST /api/trips/:id/complete
router.post('/:id/complete', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const trip = await prisma.trip.findUnique({ where: { id: req.params.id } });
    if (!trip) { res.status(404).json({ success: false, message: 'Trip not found' }); return; }
    if (trip.userId !== req.user!.id) { res.status(403).json({ success: false, message: 'Not authorized' }); return; }

    await prisma.trip.update({
      where: { id: req.params.id },
      data: { isCompleted: true, isActive: false },
    });

    res.json({ success: true, message: 'Trip marked as completed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to complete trip' });
  }
});

export default router;
