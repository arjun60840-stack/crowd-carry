import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

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
      usersByRole, packagesByStatus,
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
        select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true, trustScore: true, riskLevel: true },
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
    ]);

    // Revenue approximation (sum of rewards for delivered packages)
    const revenueData = await prisma.package.aggregate({
      where: { status: 'DELIVERED' },
      _sum: { rewardAmount: true },
    });

    // CO2 saved
    const co2Data = await prisma.package.aggregate({
      where: { status: 'DELIVERED', co2Saved: { not: null } },
      _sum: { co2Saved: true },
    });

    // High risk items
    const highRiskUsers = await prisma.user.count({ where: { riskLevel: 'HIGH' } });
    const highRiskPackages = await prisma.package.count({ where: { riskLevel: 'HIGH', status: { not: 'DELIVERED' } } });

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers, totalTravelers, totalPackages, totalTrips,
          deliveredPackages, pendingPackages, activeTrips,
          totalReviews, pendingReports: totalReports,
          totalRevenue: revenueData._sum.rewardAmount || 0,
          totalCO2Saved: (co2Data._sum.co2Saved || 0) / 1000, // kg
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

    res.json({ success: true, message: 'User verified', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to verify user' });
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
    res.json({ success: true, message: 'Report updated', data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update report' });
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
