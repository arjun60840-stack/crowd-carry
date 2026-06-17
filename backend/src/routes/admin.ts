import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { recalculateAndSaveTrustScore } from './users';
import { cacheDel } from '../lib/redis';
import { logger } from '../utils/logger';

const router = Router();

// All admin routes require ADMIN role
router.use(authenticate, authorize('ADMIN'));

// GET /api/admin/dashboard
router.get('/dashboard', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalUsers, totalTravelers, totalPackages, totalTrips,
      deliveredPackages, pendingPackages, activeTrips,
      totalReviews, totalReports, recentUsers, recentPackages,
      usersByRole, packagesByStatus, totalDisputes, pendingDisputes,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'TRAVELER' } }),
      prisma.package.count(),
      prisma.trip.count(),
      prisma.package.count({ where: { status: 'DELIVERED' } }),
      prisma.package.count({ where: { status: 'PENDING' } }),
      prisma.trip.count({ where: { isActive: true, isCompleted: false } }),
      prisma.review.count(),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.user.findMany({
        select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true, trustScore: true, riskLevel: true, verificationLevel: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.package.findMany({
        select: { id: true, title: true, status: true, pickupCity: true, destinationCity: true, rewardAmount: true, createdAt: true, riskLevel: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
      prisma.package.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.dispute.count(),
      prisma.dispute.count({ where: { status: 'PENDING' } }),
    ]);

    const revenueData = await prisma.package.aggregate({
      where: { status: 'DELIVERED' },
      _sum: { rewardAmount: true },
    });

    const co2Data = await prisma.package.aggregate({
      where: { status: 'DELIVERED', co2Saved: { not: null } },
      _sum: { co2Saved: true },
    });

    const highRiskUsers = await prisma.user.count({ where: { riskLevel: 'HIGH' } });
    const highRiskPackages = await prisma.package.count({ where: { riskLevel: 'HIGH', status: { not: 'DELIVERED' } } });

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers, totalTravelers, totalPackages, totalTrips,
          deliveredPackages, pendingPackages, activeTrips,
          totalReviews, pendingReports: totalReports,
          totalDisputes, pendingDisputes,
          totalRevenue: revenueData._sum.rewardAmount || 0,
          totalCO2Saved: (co2Data._sum.co2Saved || 0) / 1000,
          highRiskUsers, highRiskPackages,
        },
        charts: {
          usersByRole,
          packagesByStatus,
        },
        recentUsers,
        recentPackages,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard' });
  }
});

// GET /api/admin/users
router.get('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '20', search, role, riskLevel } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = Math.min(parseInt(limit as string), 100);

  try {
    const where: any = {};
    if (role) where.role = role;
    if (riskLevel) where.riskLevel = riskLevel;
    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, isVerified: true, isEmailVerified: true, isPhoneVerified: true,
          trustScore: true, riskScore: true, riskLevel: true,
          completedDeliveries: true, rating: true, createdAt: true, lastLoginAt: true,
          kycStatus: true, verificationLevel: true, selfieImage: true, aadhaarNumber: true, panNumber: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true, data: users,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// PUT /api/admin/users/:id/verify
router.put('/users/:id/verify', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isVerified: true, isEmailVerified: true },
      select: { id: true, email: true, isVerified: true },
    });

    await prisma.notification.create({
      data: {
        userId: req.params.id,
        type: 'SYSTEM',
        title: 'Account Verified! ✅',
        message: 'Your account has been verified by the Crowd Carry team. You now have full access to all features!',
      },
    });

    await recalculateAndSaveTrustScore(req.params.id);

    res.json({ success: true, message: 'User verified', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to verify user' });
  }
});

// PUT /api/admin/kyc/:userId/verify
router.put('/kyc/:userId/verify', async (req: AuthRequest, res: Response): Promise<void> => {
  const { userId } = req.params;
  const { action, level } = req.body; // action: APPROVE, REJECT; level: 2 (ID), 3 (Selfie), 4 (Trusted Carrier)

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (action === 'APPROVE') {
      const nextLevel = Math.max(user.verificationLevel, parseInt(level || '2'));
      await prisma.user.update({
        where: { id: userId },
        data: {
          kycStatus: 'APPROVED',
          verificationLevel: nextLevel,
          verificationDate: new Date(),
          verifiedBadge: true,
          ...(nextLevel >= 4 && { isTrustedTraveler: true }),
        }
      });

      await prisma.notification.create({
        data: {
          userId,
          type: 'SYSTEM',
          title: `KYC Approved - Level ${nextLevel}! 🎉`,
          message: `Congratulations! Your identity document checks for Level ${nextLevel} have been successfully verified.`,
        }
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: {
          kycStatus: 'REJECTED',
        }
      });

      await prisma.notification.create({
        data: {
          userId,
          type: 'WARNING',
          title: 'KYC Document Rejected ⚠️',
          message: 'The identity documents uploaded did not pass verification. Please upload clear documents and resubmit.',
        }
      });
    }

    // Recalculate trust score
    const result = await recalculateAndSaveTrustScore(userId);

    res.json({
      success: true,
      message: `KYC check processed: ${action}`,
      data: result?.updatedUser,
    });
  } catch (error) {
    logger.error('Admin verify KYC failed:', error);
    res.status(500).json({ success: false, message: 'Failed to process KYC verification' });
  }
});

// GET /api/admin/reports
router.get('/reports', async (req: AuthRequest, res: Response): Promise<void> => {
  const { status = 'PENDING', page = '1', limit = '20' } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = Math.min(parseInt(limit as string), 50);

  try {
    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: { status: status as any },
        include: {
          reporter: { select: { id: true, firstName: true, lastName: true, email: true } },
          reportedUser: { select: { id: true, firstName: true, lastName: true, email: true, riskLevel: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.report.count({ where: { status: status as any } }),
    ]);

    res.json({
      success: true, data: reports,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch reports' });
  }
});

// PUT /api/admin/reports/:id
router.put('/reports/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, adminNotes } = req.body;

  try {
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: {
        ...(status && { status }),
        ...(adminNotes && { adminNotes }),
      },
    });

    if (report.reportedUserId) {
      await recalculateAndSaveTrustScore(report.reportedUserId);
    }

    res.json({ success: true, message: 'Report updated', data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update report' });
  }
});

// GET /api/admin/disputes
router.get('/disputes', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const disputes = await prisma.dispute.findMany({
      include: {
        package: { select: { id: true, title: true, status: true, rewardAmount: true } },
        reporter: { select: { id: true, firstName: true, lastName: true, email: true } },
        reportedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: disputes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch disputes' });
  }
});

// PUT /api/admin/disputes/:id/resolve
router.put('/disputes/:id/resolve', async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { resolution, resolutionNotes, adminNotes } = req.body; // resolution: REFUND, COMPENSATION, WARNING, ACCOUNT_SUSPENSION

  try {
    const dispute = await prisma.dispute.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolution,
        resolutionNotes,
        adminNotes,
      }
    });

    // Handle warning or account suspension actions
    if (resolution === 'ACCOUNT_SUSPENSION' && dispute.reportedUserId) {
      // Deactivate/suspend reported user account (could flag isVerified = false, or similar block logic)
      await prisma.user.update({
        where: { id: dispute.reportedUserId },
        data: { isVerified: false, role: 'USER' }
      });
    }

    // Trigger trust score recalculations
    await recalculateAndSaveTrustScore(dispute.reporterId);
    if (dispute.reportedUserId) {
      await recalculateAndSaveTrustScore(dispute.reportedUserId);
    }

    // Create notifications for involved users
    await prisma.notification.create({
      data: {
        userId: dispute.reporterId,
        type: 'SYSTEM',
        title: 'Dispute Resolved ⚖️',
        message: `Your filed dispute regarding package ID ${dispute.packageId} has been resolved with action: ${resolution}.`,
      }
    });

    if (dispute.reportedUserId) {
      await prisma.notification.create({
        data: {
          userId: dispute.reportedUserId,
          type: 'WARNING',
          title: 'Dispute Resolution Notification ⚖️',
          message: `A dispute filed against you has been resolved by an administrator. Action taken: ${resolution}.`,
        }
      });
    }

    res.json({ success: true, message: 'Dispute resolved successfully', data: dispute });
  } catch (error) {
    logger.error('Failed to resolve dispute:', error);
    res.status(500).json({ success: false, message: 'Failed to resolve dispute' });
  }
});

// GET /api/admin/packages
router.get('/packages', async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '20', status, riskLevel } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = Math.min(parseInt(limit as string), 50);

  try {
    const where: any = {};
    if (status) where.status = status;
    if (riskLevel) where.riskLevel = riskLevel;

    const [packages, total] = await Promise.all([
      prisma.package.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
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

export default router;
