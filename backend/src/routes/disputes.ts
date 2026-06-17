import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { recalculateAndSaveTrustScore } from './users';
import { logger } from '../utils/logger';

const router = Router();

// POST /api/disputes - File a new dispute
router.post('/', authenticate, [
  body('packageId').isUUID(),
  body('type').isIn(['LOST_PACKAGE', 'DAMAGED_PACKAGE', 'WRONG_DELIVERY', 'PAYMENT_ISSUE', 'CARRIER_MISCONDUCT']),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('evidenceUrls').optional().isArray(),
], async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const { packageId, reportedUserId, type, description, evidenceUrls = [] } = req.body;
  const reporterId = req.user!.id;

  try {
    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
      include: { matches: { where: { isAccepted: true } } }
    });

    if (!pkg) {
      res.status(404).json({ success: false, message: 'Package not found' });
      return;
    }

    // Attempt to automatically resolve the reported user (the other side of the matched pair)
    let resolvedReportedUserId = reportedUserId;
    if (!resolvedReportedUserId) {
      const activeMatch = pkg.matches[0];
      if (activeMatch) {
        resolvedReportedUserId = activeMatch.travelerId === reporterId ? activeMatch.senderId : activeMatch.travelerId;
      }
    }

    const dispute = await prisma.dispute.create({
      data: {
        packageId,
        reporterId,
        reportedUserId: resolvedReportedUserId || null,
        type,
        description,
        evidenceUrls: JSON.stringify(evidenceUrls),
        status: 'PENDING',
      }
    });

    // Notify admins (mock report created) and the reported user
    if (resolvedReportedUserId) {
      await prisma.notification.create({
        data: {
          userId: resolvedReportedUserId,
          type: 'WARNING',
          title: 'Dispute Filed Against You ⚖️',
          message: `A dispute of type "${type}" has been opened against you for package ID ${packageId}.`,
        }
      });
      // Recalculate trust scores (disputes decrease score by 15 points)
      await recalculateAndSaveTrustScore(resolvedReportedUserId);
    }

    await recalculateAndSaveTrustScore(reporterId);

    res.status(201).json({
      success: true,
      message: 'Dispute filed successfully. Administrators have been notified.',
      data: dispute,
    });
  } catch (error) {
    logger.error('Failed to create dispute:', error);
    res.status(500).json({ success: false, message: 'Failed to file dispute' });
  }
});

// GET /api/disputes - Get current user's disputes
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;

  try {
    const disputes = await prisma.dispute.findMany({
      where: {
        OR: [
          { reporterId: userId },
          { reportedUserId: userId }
        ]
      },
      include: {
        package: { select: { id: true, title: true, status: true, rewardAmount: true } },
        reporter: { select: { id: true, firstName: true, lastName: true } },
        reportedUser: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: disputes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch disputes' });
  }
});

// GET /api/disputes/:id - Get a specific dispute
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dispute = await prisma.dispute.findUnique({
      where: { id: req.params.id },
      include: {
        package: { select: { id: true, title: true, status: true, rewardAmount: true } },
        reporter: { select: { id: true, firstName: true, lastName: true, email: true } },
        reportedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      }
    });

    if (!dispute) {
      res.status(404).json({ success: false, message: 'Dispute not found' });
      return;
    }

    if (dispute.reporterId !== req.user!.id && dispute.reportedUserId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Not authorized' });
      return;
    }

    res.json({ success: true, data: dispute });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch dispute' });
  }
});

export default router;
