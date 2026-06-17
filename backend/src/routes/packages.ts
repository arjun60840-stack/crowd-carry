import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { calculatePricing, estimateDistanceFromCities } from '../engines/pricingEngine';
import { calculatePackageRisk } from '../engines/riskEngine';
import { calculateDeliverySustainability } from '../engines/sustainabilityEngine';
import { recalculateAndSaveTrustScore } from './users';
import { cacheGet, cacheSet, cacheDel } from '../lib/redis';
import { logger } from '../utils/logger';

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
  body('pickupLat').optional({ checkFalsy: true }).isFloat({ min: -90, max: 90 }),
  body('pickupLng').optional({ checkFalsy: true }).isFloat({ min: -180, max: 180 }),
  body('destinationAddress').trim().notEmpty(),
  body('destinationCity').trim().notEmpty(),
  body('destinationLat').optional({ checkFalsy: true }).isFloat({ min: -90, max: 90 }),
  body('destinationLng').optional({ checkFalsy: true }).isFloat({ min: -180, max: 180 }),
  body('weight').isFloat({ min: 0.01 }).withMessage('Weight must be positive'),
  body('size').isIn(['SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE']),
  body('category').isIn(['DOCUMENTS', 'ELECTRONICS', 'CLOTHING', 'FOOD', 'MEDICINE', 'BOOKS', 'ACCESSORIES', 'OTHER']),
  body('urgency').isIn(['STANDARD', 'EXPRESS', 'URGENT']),
  body('rewardAmount').isFloat({ min: 5, max: 50000 }).withMessage('Reward must be between 5 and 50000'),
  body('isInsured').optional().isBoolean(),
  body('insurancePlan').optional().isIn(['BASIC', 'PREMIUM', 'ENTERPRISE']),
  body('dimensions').optional().trim(),
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
    isInsured = false, insurancePlan, dimensions,
  } = req.body;

  try {
    const files = req.files as Express.Multer.File[];
    const imageUrls = files ? files.map(f => `/uploads/packages/${f.filename}`) : [];

    // Calculate distance
    let distanceKm = 500;
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

    const pricing = calculatePricing({
      distanceKm,
      weightKg: parseFloat(weight),
      urgency,
      size,
      estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
    });

    const sender = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const reportsCount = await prisma.report.count({ where: { reportedUserId: req.user!.id } });
    const totalUserPackages = await prisma.package.count({ where: { userId: req.user!.id } });

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

    const pkgId = uuidv4();
    const qrCodeData = `cc-package-qr:${pkgId}`;
    const parsedIsInsured = String(isInsured) === 'true';

    const pkg = await prisma.package.create({
      data: {
        id: pkgId,
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
        dimensions,
        qrCodeData,
        isInsured: parsedIsInsured,
        insurancePlan: parsedIsInsured ? insurancePlan : null,
      },
      include: { user: { select: { firstName: true, lastName: true, avatar: true } } },
    });

    // Create Initial Package History entry
    await prisma.packageHistory.create({
      data: {
        packageId: pkg.id,
        status: 'CREATED',
        description: 'Package posted and verified by sender.',
        scanType: 'VERIFICATION',
        operatorId: req.user!.id,
      }
    });

    // Handle Insurance Policy Creation
    if (parsedIsInsured && estimatedValue && insurancePlan) {
      const val = parseFloat(estimatedValue);
      let rate = 0.01;
      if (insurancePlan === 'PREMIUM') rate = 0.02;
      else if (insurancePlan === 'ENTERPRISE') rate = 0.035;

      if (riskResult.riskLevel === 'MEDIUM') rate *= 1.2;
      else if (riskResult.riskLevel === 'HIGH') rate *= 1.5;

      const premiumPaid = Math.round(val * rate * 100) / 100;
      await prisma.insurancePolicy.create({
        data: {
          packageId: pkg.id,
          plan: insurancePlan,
          premiumPaid,
          coverageAmount: val,
          status: 'ACTIVE',
        }
      });
    }

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
    logger.error('Failed to create package:', error);
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
  param('id').matches(/^[a-zA-Z0-9-]+$/).withMessage('Invalid package ID format')
], async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const pkgId = req.params.id;
  const cacheKey = `package:details:${pkgId}`;

  try {
    // Attempt cache hit
    const cachedData = await cacheGet(cacheKey);
    if (cachedData) {
      res.json({ success: true, data: JSON.parse(cachedData), fromCache: true });
      return;
    }

    const pkg = await prisma.package.findUnique({
      where: { id: pkgId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true, rating: true, trustScore: true, verificationLevel: true } },
        transactions: {
          select: { id: true, type: true, status: true, amount: true, createdAt: true }
        },
        packageHistories: {
          orderBy: { createdAt: 'asc' }
        },
        disputes: {
          orderBy: { createdAt: 'desc' }
        },
        insurancePolicy: {
          include: { claims: true }
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

    if (!pkg) {
      res.status(404).json({ success: false, message: 'Package not found' });
      return;
    }

    // Cache key for 5 minutes
    await cacheSet(cacheKey, JSON.stringify(pkg), 300);

    res.json({ success: true, data: pkg });
  } catch (error) {
    logger.error('Failed to fetch package:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch package' });
  }
});

// GET /api/packages/:id/qr
router.get('/:id/qr', [
  param('id').matches(/^[a-zA-Z0-9-]+$/).withMessage('Invalid package ID format')
], async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pkg = await prisma.package.findUnique({
      where: { id: req.params.id },
      select: { qrCodeData: true }
    });
    if (!pkg) {
      res.status(404).json({ success: false, message: 'Package not found' });
      return;
    }
    res.json({ success: true, data: { qrCodeData: pkg.qrCodeData } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch QR code' });
  }
});

// POST /api/packages/:id/scan
router.post('/:id/scan', authenticate, [
  param('id').matches(/^[a-zA-Z0-9-]+$/).withMessage('Invalid package ID format'),
  body('scanType').isIn(['PICKUP', 'TRANSIT', 'DELIVERY']),
  body('latitude').optional().isFloat(),
  body('longitude').optional().isFloat(),
  body('qrPayload').trim().notEmpty().withMessage('QR Payload is required'),
], async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const { scanType, latitude, longitude, qrPayload } = req.body;
  const pkgId = req.params.id;

  try {
    const pkg = await prisma.package.findUnique({
      where: { id: pkgId },
      include: {
        matches: { where: { isAccepted: true } }
      }
    });

    if (!pkg) {
      res.status(404).json({ success: false, message: 'Package not found' });
      return;
    }

    // Verify QR code payload matching
    const expectedQr = pkg.qrCodeData || `cc-package-qr:${pkg.id}`;
    if (expectedQr !== qrPayload) {
      res.status(400).json({ success: false, message: 'Invalid QR payload. QR Code verification failed.' });
      return;
    }

    const acceptedMatch = pkg.matches[0];
    if (!acceptedMatch) {
      res.status(400).json({ success: false, message: 'Package is not matched with any carrier yet.' });
      return;
    }

    // Authorization checks
    if (acceptedMatch.travelerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Not authorized to perform scans on this package.' });
      return;
    }

    const lat = latitude ? parseFloat(latitude) : null;
    const lng = longitude ? parseFloat(longitude) : null;
    let nextStatus = pkg.status;
    let description = '';

    if (scanType === 'PICKUP') {
      if (pkg.status !== 'MATCHED' && pkg.status !== 'ACCEPTED') {
        res.status(400).json({ success: false, message: 'Package status must be MATCHED or ACCEPTED to be picked up.' });
        return;
      }
      nextStatus = 'PICKED_UP';
      description = 'Package successfully picked up by carrier.';
    } else if (scanType === 'TRANSIT') {
      if (pkg.status !== 'PICKED_UP' && pkg.status !== 'IN_TRANSIT') {
        res.status(400).json({ success: false, message: 'Package must be PICKED_UP to transition to transit.' });
        return;
      }
      nextStatus = 'IN_TRANSIT';
      description = 'Package in transit with carrier.';
    } else if (scanType === 'DELIVERY') {
      if (pkg.status !== 'IN_TRANSIT' && pkg.status !== 'PICKED_UP') {
        res.status(400).json({ success: false, message: 'Package must be picked up and in transit before delivery.' });
        return;
      }
      nextStatus = 'DELIVERED';
      description = 'Package delivered successfully and verified via QR scan.';
    }

    // Update package status
    const updatedPkg = await prisma.package.update({
      where: { id: pkgId },
      data: {
        status: nextStatus,
        ...(scanType === 'PICKUP' && { pickedUpAt: new Date() }),
        ...(scanType === 'DELIVERY' && { deliveredAt: new Date() }),
      }
    });

    // Log tracking scan
    await prisma.packageHistory.create({
      data: {
        packageId: pkgId,
        status: nextStatus,
        description,
        latitude: lat,
        longitude: lng,
        scanType,
        operatorId: req.user!.id,
      }
    });

    // If delivered, execute stats increments and trust score updates
    if (scanType === 'DELIVERY') {
      const traveler = await prisma.user.findUnique({ where: { id: acceptedMatch.travelerId } });
      if (traveler) {
        await prisma.user.update({
          where: { id: traveler.id },
          data: {
            completedDeliveries: { increment: 1 },
          }
        });

        // Recalculate trust score for traveler
        await recalculateAndSaveTrustScore(traveler.id);

        // Recalculate trust score for sender
        await recalculateAndSaveTrustScore(pkg.userId);
      }

      // Create notifications
      await prisma.notification.create({
        data: {
          userId: pkg.userId,
          type: 'PACKAGE_DELIVERED',
          title: 'Package Delivered! 📦',
          message: `Your package "${pkg.title}" has been successfully delivered.`,
        }
      });

      await prisma.notification.create({
        data: {
          userId: acceptedMatch.travelerId,
          type: 'PACKAGE_DELIVERED',
          title: 'Delivery Confirmed! 🎉',
          message: `Package "${pkg.title}" delivery verified. Reward details updated.`,
        }
      });
    }

    // Invalidate Redis caches
    await cacheDel(`package:details:${pkgId}`);

    res.json({
      success: true,
      message: `Package scan successful: ${scanType}`,
      data: updatedPkg,
    });
  } catch (error) {
    logger.error('Failed to process package scan:', error);
    res.status(500).json({ success: false, message: 'Failed to process package scan' });
  }
});

// PUT /api/packages/:id
router.put('/:id', authenticate, [
  param('id').matches(/^[a-zA-Z0-9-]+$/).withMessage('Invalid package ID format')
], async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }
  const pkgId = req.params.id;

  try {
    const pkg = await prisma.package.findUnique({ where: { id: pkgId } });
    if (!pkg) { res.status(404).json({ success: false, message: 'Package not found' }); return; }
    if (pkg.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Not authorized' }); return;
    }

    const allowedUpdates = ['title', 'description', 'rewardAmount', 'status', 'urgency', 'notes', 'dimensions'];
    const updates: any = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (req.body.status === 'DELIVERED') {
      updates.deliveredAt = new Date();
      
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

      const acceptedMatch = await prisma.match.findFirst({
        where: { packageId: pkg.id, isAccepted: true },
      });
      if (acceptedMatch) {
        const traveler = await prisma.user.findUnique({ where: { id: acceptedMatch.travelerId } });
        if (traveler) {
          const newCompleted = traveler.completedDeliveries + 1;
          await prisma.user.update({
            where: { id: traveler.id },
            data: {
              completedDeliveries: { increment: 1 },
              successRate: newCompleted / Math.max(traveler.totalTrips, newCompleted),
            },
          });
          await recalculateAndSaveTrustScore(traveler.id);
        }
        await prisma.notification.create({
          data: {
            userId: acceptedMatch.travelerId,
            type: 'PACKAGE_DELIVERED',
            title: 'Delivery Confirmed! 🎉',
            message: `"${pkg.title}" has been delivered successfully. Thank you for using Crowd Carry!`,
          },
        });
      }

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

    const updated = await prisma.package.update({ where: { id: pkgId }, data: updates });

    // Invalidate caches
    await cacheDel(`package:details:${pkgId}`);

    res.json({ success: true, message: 'Package updated', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update package' });
  }
});

// DELETE /api/packages/:id
router.delete('/:id', authenticate, [
  param('id').matches(/^[a-zA-Z0-9-]+$/).withMessage('Invalid package ID format')
], async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }
  const pkgId = req.params.id;

  try {
    const pkg = await prisma.package.findUnique({ where: { id: pkgId } });
    if (!pkg) { res.status(404).json({ success: false, message: 'Package not found' }); return; }
    if (pkg.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Not authorized' }); return;
    }

    await prisma.package.update({ where: { id: pkgId }, data: { status: 'CANCELLED' } });

    // Invalidate caches
    await cacheDel(`package:details:${pkgId}`);

    res.json({ success: true, message: 'Package cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to cancel package' });
  }
});

// GET /api/packages/:id/pricing
router.get('/:id/pricing', [
  param('id').matches(/^[a-zA-Z0-9-]+$/).withMessage('Invalid package ID format')
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
  param('id').matches(/^[a-zA-Z0-9-]+$/).withMessage('Invalid package ID format'),
  body('pin').trim().notEmpty().withMessage('Delivery PIN is required')
], async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }
  const pkgId = req.params.id;

  try {
    const { pin } = req.body;

    const pkg = await prisma.package.findUnique({
      where: { id: pkgId },
      include: {
        matches: { where: { isAccepted: true } }
      }
    });

    if (!pkg) { res.status(404).json({ success: false, message: 'Package not found' }); return; }
    
    const acceptedMatch = pkg.matches[0];
    if (!acceptedMatch || acceptedMatch.travelerId !== req.user!.id) {
      res.status(403).json({ success: false, message: 'Not authorized to deliver this package' });
      return;
    }

    if (pkg.status !== 'ACCEPTED' && pkg.status !== 'IN_TRANSIT' && pkg.status !== 'PICKED_UP') {
      res.status(400).json({ success: false, message: 'Package is not in a valid transit state for delivery' });
      return;
    }

    if (pkg.deliveryPin !== pin) {
      res.status(400).json({ success: false, message: 'Invalid delivery PIN' });
      return;
    }

    await prisma.package.update({
      where: { id: pkgId },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date()
      }
    });

    await prisma.packageHistory.create({
      data: {
        packageId: pkgId,
        status: 'DELIVERED',
        description: 'Package delivered and verified via Receiver PIN.',
        scanType: 'DELIVERY',
        operatorId: req.user!.id,
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

    // Update carrier stats & recalculate trust
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { completedDeliveries: { increment: 1 } }
    });

    await recalculateAndSaveTrustScore(req.user!.id);
    await recalculateAndSaveTrustScore(pkg.userId);

    // Invalidate cache
    await cacheDel(`package:details:${pkgId}`);

    res.json({ success: true, message: 'Package delivered successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to verify delivery' });
  }
});

export default router;
