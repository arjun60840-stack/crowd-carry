import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { calculateTrustScore } from '../engines/trustEngine';
import { calculateUserRisk } from '../engines/riskEngine';

const router = Router();

// Configure multer for avatar upload
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(`${uploadDir}/avatars`)) fs.mkdirSync(`${uploadDir}/avatars`, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, `${uploadDir}/avatars`),
  filename: (req: any, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.user.id}-${Date.now()}${ext}`);
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

// GET /api/users/profile
router.get('/profile', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, avatar: true, role: true, isVerified: true,
        isEmailVerified: true, isPhoneVerified: true, bio: true,
        city: true, country: true, trustScore: true, rating: true,
        totalRatings: true, completedDeliveries: true, totalTrips: true,
        successRate: true, isTrustedTraveler: true, isVerifiedBadge: true,
        isTopCarrier: true, createdAt: true,
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

    res.json({ success: true, data: user });
  } catch (error) {
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

  try {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
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

  try {
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { avatar: avatarUrl },
      select: { id: true, avatar: true },
    });

    res.json({ success: true, message: 'Avatar uploaded', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to upload avatar' });
  }
});

// GET /api/users/:id/public
router.get('/:id/public', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, firstName: true, lastName: true, avatar: true,
        rating: true, totalRatings: true, completedDeliveries: true,
        trustScore: true, isTrustedTraveler: true, isVerifiedBadge: true,
        isTopCarrier: true, createdAt: true, city: true, country: true,
        bio: true,
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

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
});

// POST /api/users/recalculate-trust
router.post('/recalculate-trust', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }

    const reportsCount = await prisma.report.count({ where: { reportedUserId: user.id } });
    const totalPackages = await prisma.package.count({ where: { userId: user.id } });

    const trustResult = calculateTrustScore({
      isVerified: user.isVerified,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      idDocumentUrl: user.idDocumentUrl,
      completedDeliveries: user.completedDeliveries,
      successRate: user.successRate,
      rating: user.rating,
      totalRatings: user.totalRatings,
      createdAt: user.createdAt,
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

    await prisma.user.update({
      where: { id: user.id },
      data: {
        trustScore: trustResult.trustScore,
        isTrustedTraveler: trustResult.badges.includes('trusted_traveler'),
        isVerifiedBadge: user.isEmailVerified && user.isPhoneVerified,
        isTopCarrier: trustResult.badges.includes('top_carrier'),
        riskScore: riskResult.riskScore,
        riskLevel: riskResult.riskLevel as any,
      },
    });

    res.json({ success: true, data: { trust: trustResult, risk: riskResult } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to recalculate scores' });
  }
});

export default router;
