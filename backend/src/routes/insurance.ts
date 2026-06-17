import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// POST /api/insurance/claim - Submit a claim
router.post('/claim', authenticate, [
  body('packageId').isUUID(),
  body('amountClaimed').isFloat({ min: 1 }),
  body('description').trim().notEmpty().withMessage('Description of incident is required'),
  body('evidenceUrls').optional().isArray(),
], async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const { packageId, amountClaimed, description, evidenceUrls = [] } = req.body;
  const claimantId = req.user!.id;

  try {
    const policy = await prisma.insurancePolicy.findUnique({
      where: { packageId },
      include: { package: true }
    });

    if (!policy) {
      res.status(404).json({ success: false, message: 'No active insurance policy found for this package.' });
      return;
    }

    if (policy.package.userId !== claimantId && req.user!.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Only the package owner can file insurance claims.' });
      return;
    }

    if (parseFloat(amountClaimed) > policy.coverageAmount) {
      res.status(400).json({
        success: false,
        message: `Claim amount cannot exceed policy coverage limit of ₹${policy.coverageAmount}`
      });
      return;
    }

    const claim = await prisma.insuranceClaim.create({
      data: {
        policyId: policy.id,
        claimantId,
        amountClaimed: parseFloat(amountClaimed),
        description,
        evidenceUrls: JSON.stringify(evidenceUrls),
        status: 'SUBMITTED',
      }
    });

    res.status(201).json({
      success: true,
      message: 'Insurance claim submitted successfully. The review team will contact you shortly.',
      data: claim,
    });
  } catch (error) {
    logger.error('Failed to file insurance claim:', error);
    res.status(500).json({ success: false, message: 'Failed to file claim' });
  }
});

// GET /api/insurance/claims - Fetch current user's claims
router.get('/claims', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const claims = await prisma.insuranceClaim.findMany({
      where: { claimantId: req.user!.id },
      include: {
        policy: {
          include: { package: { select: { id: true, title: true } } }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: claims });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch claims' });
  }
});

// GET /api/insurance/admin/claims - (Admin only) Fetch all claims
router.get('/admin/claims', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const claims = await prisma.insuranceClaim.findMany({
      include: {
        claimant: { select: { id: true, firstName: true, lastName: true, email: true } },
        policy: {
          include: { package: { select: { id: true, title: true, rewardAmount: true } } }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: claims });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch admin claims' });
  }
});

// PUT /api/insurance/admin/claims/:id/resolve - (Admin only) Resolve claim
router.put('/admin/claims/:id/resolve', authenticate, authorize('ADMIN'), [
  param('id').isUUID(),
  body('status').isIn(['APPROVED', 'REJECTED']),
  body('settlementAmount').optional().isFloat(),
  body('adminNotes').optional().trim(),
], async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const { status, settlementAmount, adminNotes } = req.body;

  try {
    const claim = await prisma.insuranceClaim.findUnique({
      where: { id: req.params.id },
      include: { policy: true }
    });

    if (!claim) {
      res.status(404).json({ success: false, message: 'Claim not found' });
      return;
    }

    const updatedClaim = await prisma.insuranceClaim.update({
      where: { id: claim.id },
      data: {
        status,
        settlementAmount: status === 'APPROVED' ? parseFloat(settlementAmount || claim.amountClaimed) : null,
        adminNotes,
      }
    });

    if (status === 'APPROVED') {
      await prisma.insurancePolicy.update({
        where: { id: claim.policyId },
        data: { status: 'CLAIMED' }
      });
    }

    // Notify user
    await prisma.notification.create({
      data: {
        userId: claim.claimantId,
        type: 'SYSTEM',
        title: `Insurance Claim ${status}! 🛡️`,
        message: `Your insurance claim for policy ID ${claim.policyId} has been ${status.toLowerCase()}. Settlement amount: ₹${settlementAmount || claim.amountClaimed}.`,
      }
    });

    res.json({ success: true, message: 'Claim resolved successfully', data: updatedClaim });
  } catch (error) {
    logger.error('Failed to resolve claim:', error);
    res.status(500).json({ success: false, message: 'Failed to resolve claim' });
  }
});

export default router;
