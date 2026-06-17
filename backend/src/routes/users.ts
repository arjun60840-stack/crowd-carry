import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { calculateTrustScore } from '../engines/trustEngine';
import { calculateUserRisk } from '../engines/riskEngine';
import { cacheGet, cacheSet, cacheDel } from '../lib/redis';
import { logger } from '../utils/logger';

const router = Router();

// Configure multer for avatar and KYC image uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(`${uploadDir}/avatars`)) fs.mkdirSync(`${uploadDir}/avatars`, { recursive: true });
if (!fs.existsSync(`${uploadDir}/kyc`)) fs.mkdirSync(`${uploadDir}/kyc`, { recursive: true });

const storage = multer.diskStorage({
  destination: (req: any, file, cb) => {
    if (file.fieldname === 'selfie') {
      cb(null, `${uploadDir}/kyc`);
    } else {
      cb(null, `${uploadDir}/avatars`);
    }
  },
  filename: (req: any, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${req.user.id}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * Recalculate user trust and risk scores, then save to DB and clear Redis cache.
 */
export async function recalculateAndSaveTrustScore(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      disputesFiled: true,
      disputesAgainst: true,
      insuranceClaims: true,
    }
  });

  if (!user) return null;

  const activeDisputesCount = user.disputesAgainst.filter(d => d.status === 'PENDING' || d.status === 'INVESTIGATING').length;
  const lostDamagedAtFaultCount = user.disputesAgainst.filter(d => d.resolution === 'ACCOUNT_SUSPENSION' || d.resolution === 'COMPENSATION').length;
  const failedDeliveriesCount = user.disputesAgainst.filter(d => d.type === 'LOST_PACKAGE' && d.status === 'RESOLVED').length;
  const reportsCount = await prisma.report.count({ where: { reportedUserId: user.id } });
  const totalPackages = await prisma.package.count({ where: { userId: user.id } });

  const trustResult = calculateTrustScore({
    completedDeliveries: user.completedDeliveries,
    rating: user.rating,
    totalRatings: user.totalRatings,
    createdAt: user.createdAt,
    verificationLevel: user.verificationLevel,
    activeDisputesCount,
    lostDamagedAtFaultCount,
    failedDeliveriesCount,
    policyWarningsCount: reportsCount,
    fakePackageReportsCount: 0,
  });

  const riskResult = calculateUserRisk({
    createdAt: user.createdAt,
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified,
    completedDeliveries: user.completedDeliveries,
    successRate: user.successRate,
    totalRatings: user.totalRatings,
    rating: user.rating,
    reportsAgainstCount: reportsCount,
    totalPackages,
    totalTrips: user.totalTrips,
  });

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      trustScore: trustResult.trustScore,
      isTrustedTraveler: trustResult.badges.includes('trusted_traveler'),
      isVerifiedBadge: user.isEmailVerified && user.isPhoneVerified && user.verificationLevel >= 2,
      isTopCarrier: trustResult.badges.includes('top_carrier'),
      riskScore: riskResult.riskScore,
      riskLevel: riskResult.riskLevel as any,
    },
  });

  // Clear Redis cache
  await cacheDel(`user:profile:${userId}`);

  return { trustResult, riskResult, updatedUser };
}

// GET /api/users/profile
router.get('/profile', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const cacheKey = `user:profile:${userId}`;

  try {
    // Attempt Redis cache hit
    const cachedProfile = await cacheGet(cacheKey);
    if (cachedProfile) {
      res.json({ success: true, data: JSON.parse(cachedProfile), fromCache: true });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, avatar: true, role: true, isVerified: true,
        isEmailVerified: true, isPhoneVerified: true, bio: true,
        city: true, country: true, trustScore: true, rating: true,
        totalRatings: true, completedDeliveries: true, totalTrips: true,
        successRate: true, isTrustedTraveler: true, isVerifiedBadge: true,
        isTopCarrier: true, kycStatus: true, verificationLevel: true,
        selfieImage: true, aadhaarNumber: true, panNumber: true,
        createdAt: true,
        trips: { select: { id: true, sourceCity: true, destinationCity: true, travelDate: true, isCompleted: true }, take: 5, orderBy: { createdAt: 'desc' } },
        packages: { select: { id: true, title: true, status: true, createdAt: true }, take: 5, orderBy: { createdAt: 'desc' } },
        reviewsReceived: {
          select: { rating: true, comment: true, reviewer: { select: { firstName: true, lastName: true, avatar: true } }, createdAt: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Cache in Redis for 5 minutes (300 seconds)
    await cacheSet(cacheKey, JSON.stringify(user), 300);

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Failed to fetch profile:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

// PUT /api/users/profile
router.put('/profile', authenticate, [
  body('firstName').optional().trim().notEmpty(),
  body('lastName').optional().trim().notEmpty(),
  body('phone').optional().isMobilePhone('any'),
  body('bio').optional().isLength({ max: 500 }),
  body('city').optional().trim(),
  body('country').optional().trim(),
], async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const { firstName, lastName, phone, bio, city, country } = req.body;
  const userId = req.user!.id;

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone && { phone }),
        ...(bio !== undefined && { bio }),
        ...(city && { city }),
        ...(country && { country }),
      },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, avatar: true, role: true, bio: true, city: true, country: true,
      },
    });

    // Invalidate Redis profile cache
    await cacheDel(`user:profile:${userId}`);

    res.json({ success: true, message: 'Profile updated', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

// POST /api/users/avatar
router.post('/avatar', authenticate, upload.single('avatar'), async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No file uploaded' });
    return;
  }

  const userId = req.user!.id;

  try {
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
      select: { id: true, avatar: true },
    });

    // Invalidate Redis cache
    await cacheDel(`user:profile:${userId}`);

    res.json({ success: true, message: 'Avatar uploaded', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to upload avatar' });
  }
});

// GET /api/users/:id/public
router.get('/:id/public', async (req: AuthRequest, res: Response): Promise<void> => {
  const targetUserId = req.params.id;
  const cacheKey = `user:public:${targetUserId}`;

  try {
    const cachedPublic = await cacheGet(cacheKey);
    if (cachedPublic) {
      res.json({ success: true, data: JSON.parse(cachedPublic), fromCache: true });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true, firstName: true, lastName: true, avatar: true,
        rating: true, totalRatings: true, completedDeliveries: true,
        trustScore: true, isTrustedTraveler: true, isVerifiedBadge: true,
        isTopCarrier: true, verificationLevel: true, kycStatus: true,
        createdAt: true, city: true, country: true, bio: true,
        reviewsReceived: {
          select: {
            rating: true, comment: true, createdAt: true,
            reviewer: { select: { firstName: true, lastName: true, avatar: true } },
          },
          take: 10, orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    await cacheSet(cacheKey, JSON.stringify(user), 300);

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
});

// POST /api/users/recalculate-trust
router.post('/recalculate-trust', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await recalculateAndSaveTrustScore(req.user!.id);
    if (!result) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, data: { trust: result.trustResult, risk: result.riskResult } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to recalculate scores' });
  }
});

// POST /api/users/kyc/submit
router.post('/kyc/submit', authenticate, upload.single('selfie'), [
  body('aadhaarNumber').isLength({ min: 12, max: 12 }).withMessage('Aadhaar number must be 12 digits'),
  body('panNumber').isLength({ min: 10, max: 10 }).withMessage('PAN number must be 10 characters'),
], async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const { aadhaarNumber, panNumber } = req.body;
  const userId = req.user!.id;
  const selfieImage = req.file ? `/uploads/kyc/${req.file.filename}` : null;

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        aadhaarNumber,
        panNumber,
        ...(selfieImage && { selfieImage }),
        kycStatus: 'PENDING',
      },
      select: {
        id: true, kycStatus: true, verificationLevel: true,
      }
    });

    // Clear Redis cache
    await cacheDel(`user:profile:${userId}`);

    res.json({
      success: true,
      message: 'KYC documents submitted. Pending admin approval.',
      data: user,
    });
  } catch (error) {
    logger.error('Failed to submit KYC:', error);
    res.status(500).json({ success: false, message: 'Failed to submit KYC' });
  }
});

// GET /api/users/kyc/status
router.get('/kyc/status', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        kycStatus: true,
        verificationLevel: true,
        aadhaarNumber: true,
        panNumber: true,
        selfieImage: true,
        verificationDate: true,
        verifiedBadge: true,
      }
    });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve KYC status' });
  }
});

// POST /api/users/verify-email
router.post('/verify-email', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { 
        isEmailVerified: true,
      },
    });

    await recalculateAndSaveTrustScore(userId);
    res.json({ success: true, message: 'Email verified', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to verify email' });
  }
});

// POST /api/users/verify-phone
router.post('/verify-phone', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  try {
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!currentUser) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const nextLevel = Math.max(currentUser.verificationLevel, 1);

    const user = await prisma.user.update({
      where: { id: userId },
      data: { 
        isPhoneVerified: true,
        verificationLevel: nextLevel,
      },
    });

    await recalculateAndSaveTrustScore(userId);
    res.json({ success: true, message: 'Phone verified successfully', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to verify phone' });
  }
});

export default router;
