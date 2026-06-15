import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { calculatePricing, estimateDistanceFromCities } from '../engines/pricingEngine';
import { calculatePackageRisk } from '../engines/riskEngine';
import { calculateDeliverySustainability } from '../engines/sustainabilityEngine';

const router = Router();

// Configure multer for package images
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(`${uploadDir}/packages`)) fs.mkdirSync(`${uploadDir}/packages`, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, `${uploadDir}/packages`),
  filename: (req: any, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `pkg-${req.user.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype);
    if (extname && mimetype) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// POST /api/packages
router.post('/', authenticate, upload.array('images', 5), [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('pickupAddress').trim().notEmpty(),
  body('pickupCity').trim().notEmpty(),
  body('pickupLat').optional({ checkFalsy: true }).isFloat({ min: -90, max: 90 }).withMessage('Pickup latitude must be between -90 and 90'),
  body('pickupLng').optional({ checkFalsy: true }).isFloat({ min: -180, max: 180 }).withMessage('Pickup longitude must be between -180 and 180'),
  body('destinationAddress').trim().notEmpty(),
  body('destinationCity').trim().notEmpty(),
  body('destinationLat').optional({ checkFalsy: true }).isFloat({ min: -90, max: 90 }).withMessage('Destination latitude must be between -90 and 90'),
  body('destinationLng').optional({ checkFalsy: true }).isFloat({ min: -180, max: 180 }).withMessage('Destination longitude must be between -180 and 180'),
  body('weight').isFloat({ min: 0.01 }).withMessage('Weight must be positive'),
  body('size').isIn(['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE']),
  body('category').isIn(['DOCUMENTS', 'ELECTRONICS', 'CLOTHING', 'FOOD', 'MEDICINE', 'BOOKS', 'ACCESSORIES', 'OTHER']),
  body('urgency').isIn(['STANDARD', 'EXPRESS', 'URGENT']),
  body('rewardAmount').isFloat({ min: 5, max: 50000 }).withMessage('Reward must be between 5 and 50000'),
], async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const {
    title, description,
    pickupAddress, pickupCity, pickupCountry, pickupLat, pickupLng,
    destinationAddress, destinationCity, destinationCountry, destinationLat, destinationLng,
    weight, size, category, urgency, rewardAmount, estimatedValue,
  } = req.body;

  try {
    const files = req.files as Express.Multer.File[];
    const imageUrls = files ? files.map(f => `/uploads/packages/${f.filename}`) : [];

    // Calculate distance
    let distanceKm = 500; // fallback
    if (pickupLat && pickupLng && destinationLat && destinationLng) {
      const R = 6371;
      const dLat = ((parseFloat(destinationLat) - parseFloat(pickupLat)) * Math.PI) / 180;
      const dLng = ((parseFloat(destinationLng) - parseFloat(pickupLng)) * Math.PI) / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos((parseFloat(pickupLat) * Math.PI) / 180) * Math.cos((parseFloat(destinationLat) * Math.PI) / 180) *
        Math.sin(dLng/2) * Math.sin(dLng/2);
      distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    } else {
      distanceKm = estimateDistanceFromCities(pickupCity, destinationCity);
    }

    // Calculate suggested pricing
    const pricing = calculatePricing({
      distanceKm,
      weightKg: parseFloat(weight),
      urgency,
      size,
      estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
    });

    // Get sender info for risk calculation
    const sender = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const reportsCount = await prisma.report.count({ where: { reportedUserId: req.user!.id } });
    const totalUserPackages = await prisma.package.count({ where: { userId: req.user!.id } });

    // Calculate risk
    const riskResult = calculatePackageRisk({
      estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
      weight: parseFloat(weight),
      category,
      rewardAmount: parseFloat(rewardAmount),
      urgency,
      sender: {
        createdAt: sender!.createdAt,
        isEmailVerified: sender!.isEmailVerified,
        isPhoneVerified: sender!.isPhoneVerified,
        completedDeliveries: sender!.completedDeliveries,
        successRate: sender!.successRate,
        totalRatings: sender!.totalRatings,
        rating: sender!.rating,
        reportsAgainstCount: reportsCount,
        totalPackages: totalUserPackages,
        totalTrips: sender!.totalTrips,
      },
    });

    const pkg = await prisma.package.create({
      data: {
        userId: req.user!.id,
        title, description,
        pickupAddress, pickupCity, pickupCountry,
        pickupLat: pickupLat ? parseFloat(pickupLat) : null,
        pickupLng: pickupLng ? parseFloat(pickupLng) : null,
        destinationAddress, destinationCity, destinationCountry,
        destinationLat: destinationLat ? parseFloat(destinationLat) : null,
        destinationLng: destinationLng ? parseFloat(destinationLng) : null,
        weight: parseFloat(weight),
        size, category, urgency,
        rewardAmount: parseFloat(rewardAmount),
        suggestedMin: pricing.minimum,
        suggestedRecommended: pricing.recommended,
        suggestedPremium: pricing.premium,
        imageUrls: JSON.stringify(imageUrls),
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null,
        riskScore: riskResult.riskScore,
        riskLevel: riskResult.riskLevel as any,
      },
      include: { user: { select: { firstName: true, lastName: true, avatar: true } } },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: req.user!.id,
        type: 'SYSTEM',
        title: 'Package Posted!',
        message: `Your package "${title}" is now live. Travelers matching your route will be notified.`,
      },
    });

    res.status(201).json({
      success: true, message: 'Package created',
      data: { ...pkg, pricing, risk: riskResult },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to create package' });
  }
});

// GET /api/packages
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    pickupCity, destinationCity, status, category, urgency,
    minWeight, maxWeight, page = '1', limit = '20', myPackages,
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = Math.min(parseInt(limit as string), 50);
  const skip = (pageNum - 1) * limitNum;

  try {
    const where: any = {};

    if (myPackages && req.user) where.userId = req.user.id;
    if (pickupCity) where.pickupCity = { contains: pickupCity as string, mode: 'insensitive' };
    if (destinationCity) where.destinationCity = { contains: destinationCity as string, mode: 'insensitive' };
    if (status) where.status = status;
    else where.status = { in: ['PENDING', 'MATCHED'] };
    if (category) where.category = category;
    if (urgency) where.urgency = urgency;
    if (minWeight || maxWeight) {
      where.weight = {};
      if (minWeight) where.weight.gte = parseFloat(minWeight as string);
      if (maxWeight) where.weight.lte = parseFloat(maxWeight as string);
    }

    const [packages, total] = await Promise.all([
      prisma.package.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, avatar: true, rating: true },
          },
        },
        orderBy: [{ urgency: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limitNum,
      }),
      prisma.package.count({ where }),
    ]);

    res.json({
      success: true, data: packages,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch packages' });
  }
});

// GET /api/packages/:id
router.get('/:id', [
  param('id').isUUID().withMessage('Invalid package ID format')
], async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }
  try {
    const pkg = await prisma.package.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true, rating: true, trustScore: true } },
        transactions: {
          select: {
            id: true,
            type: true,
            status: true,
            amount: true,
            createdAt: true,
          }
        },
        matches: {
          where: { isRejected: false },
          include: {
            traveler: { select: { id: true, firstName: true, lastName: true, avatar: true, rating: true, trustScore: true } },
            trip: { select: { id: true, sourceCity: true, destinationCity: true, travelDate: true, vehicleType: true } },
          },
          orderBy: { matchScore: 'desc' },
        },
      },
    });

    if (!pkg) { res.status(404).json({ success: false, message: 'Package not found' }); return; }

    res.json({ success: true, data: pkg });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch package' });
  }
});

// PUT /api/packages/:id
router.put('/:id', authenticate, [
  param('id').isUUID().withMessage('Invalid package ID format')
], async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }
  try {
    const pkg = await prisma.package.findUnique({ where: { id: req.params.id } });
    if (!pkg) { res.status(404).json({ success: false, message: 'Package not found' }); return; }
    if (pkg.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Not authorized' }); return;
    }

    const allowedUpdates = ['title', 'description', 'rewardAmount', 'status', 'urgency', 'notes'];
    const updates: any = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    // Handle status transitions
    if (req.body.status === 'DELIVERED') {
      updates.deliveredAt = new Date();
      
      // Calculate sustainability impact
      const trip = await prisma.match.findFirst({
        where: { packageId: pkg.id, isAccepted: true },
        include: { trip: true },
      });
      
      if (trip) {
        const sustainability = calculateDeliverySustainability({
          distanceKm: trip.trip.routeDistance || 500,
          weightKg: pkg.weight,
          vehicleType: trip.trip.vehicleType as any,
          rewardAmount: pkg.rewardAmount,
        });
        updates.co2Saved = sustainability.co2SavedGrams;
        updates.moneySaved = sustainability.moneySavedUSD;
        updates.distanceSaved = sustainability.distanceKm;
      }

      // Update traveler stats
      const acceptedMatch = await prisma.match.findFirst({
        where: { packageId: pkg.id, isAccepted: true },
      });
      if (acceptedMatch) {
        const traveler = await prisma.user.findUnique({ where: { id: acceptedMatch.travelerId } });
        if (traveler) {
          const newCompleted = traveler.completedDeliveries + 1;
          const newTotal = newCompleted + (traveler.totalTrips - traveler.completedDeliveries);
          await prisma.user.update({
            where: { id: traveler.id },
            data: {
              completedDeliveries: { increment: 1 },
              successRate: newCompleted / Math.max(traveler.totalTrips, newCompleted),
            },
          });
        }
        // Notify traveler
        await prisma.notification.create({
          data: {
            userId: acceptedMatch.travelerId,
            type: 'PACKAGE_DELIVERED',
            title: 'Delivery Confirmed! 🎉',
            message: `"${pkg.title}" has been delivered successfully. Thank you for using Crowd Carry!`,
          },
        });
      }

      // Notify sender
      await prisma.notification.create({
        data: {
          userId: pkg.userId,
          type: 'PACKAGE_DELIVERED',
          title: 'Your Package Arrived! 📦',
          message: `Your package "${pkg.title}" has been delivered successfully!`,
        },
      });
    }

    if (req.body.status === 'PICKED_UP') {
      updates.pickedUpAt = new Date();
    }

    const updated = await prisma.package.update({ where: { id: req.params.id }, data: updates });
    res.json({ success: true, message: 'Package updated', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update package' });
  }
});

// DELETE /api/packages/:id
router.delete('/:id', authenticate, [
  param('id').isUUID().withMessage('Invalid package ID format')
], async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }
  try {
    const pkg = await prisma.package.findUnique({ where: { id: req.params.id } });
    if (!pkg) { res.status(404).json({ success: false, message: 'Package not found' }); return; }
    if (pkg.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Not authorized' }); return;
    }

    await prisma.package.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } });
    res.json({ success: true, message: 'Package cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to cancel package' });
  }
});

// GET /api/packages/:id/pricing
router.get('/:id/pricing', [
  param('id').isUUID().withMessage('Invalid package ID format')
], async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }
  try {
    const pkg = await prisma.package.findUnique({ where: { id: req.params.id } });
    if (!pkg) { res.status(404).json({ success: false, message: 'Package not found' }); return; }

    const distanceKm = estimateDistanceFromCities(pkg.pickupCity, pkg.destinationCity);
    const pricing = calculatePricing({
      distanceKm,
      weightKg: pkg.weight,
      urgency: pkg.urgency as any,
      size: pkg.size as any,
      estimatedValue: pkg.estimatedValue || undefined,
    });

    res.json({ success: true, data: pricing });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to calculate pricing' });
  }
});

// POST /api/packages/:id/deliver
router.post('/:id/deliver', authenticate, [
  param('id').isUUID().withMessage('Invalid package ID format'),
  body('pin').trim().notEmpty().withMessage('Delivery PIN is required')
], async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }
  try {
    const { pin } = req.body;

    const pkg = await prisma.package.findUnique({
      where: { id: req.params.id },
      include: {
        matches: {
          where: { isAccepted: true }
        }
      }
    });

    if (!pkg) { res.status(404).json({ success: false, message: 'Package not found' }); return; }
    
    // Check if the current user is the accepted carrier for this package
    const acceptedMatch = pkg.matches[0];
    if (!acceptedMatch || acceptedMatch.travelerId !== req.user!.id) {
      res.status(403).json({ success: false, message: 'Not authorized to deliver this package' });
      return;
    }

    if (pkg.status !== 'ACCEPTED') {
      res.status(400).json({ success: false, message: 'Package is not in transit' });
      return;
    }

    if (pkg.deliveryPin !== pin) {
      res.status(400).json({ success: false, message: 'Invalid delivery PIN' });
      return;
    }

    // PIN is correct, mark as delivered
    await prisma.package.update({
      where: { id: pkg.id },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date()
      }
    });

    // Notify sender
    await prisma.notification.create({
      data: {
        userId: pkg.userId,
        type: 'PACKAGE_DELIVERED',
        title: 'Package Delivered! 📦',
        message: `Your package to ${pkg.destinationCity} has been successfully delivered by the carrier.`,
        data: JSON.stringify({ packageId: pkg.id }),
      },
    });

    // Update carrier stats
    await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        completedDeliveries: { increment: 1 }
      }
    });

    res.json({ success: true, message: 'Package delivered successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to verify delivery' });
  }
});

export default router;
