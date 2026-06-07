import { Router, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/reviews
router.post('/', authenticate, [
  body('revieweeId').notEmpty().withMessage('Reviewee ID required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('comment').optional().isLength({ max: 1000 }),
  body('packageId').optional(),
], async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const { revieweeId, rating, comment, packageId } = req.body;

  if (revieweeId === req.user!.id) {
    res.status(400).json({ success: false, message: 'Cannot review yourself' });
    return;
  }

  try {
    // Check if already reviewed for this package
    if (packageId) {
      const existing = await prisma.review.findFirst({
        where: { reviewerId: req.user!.id, packageId },
      });
      if (existing) {
        res.status(409).json({ success: false, message: 'Already reviewed this delivery' });
        return;
      }
    }

    const review = await prisma.review.create({
      data: {
        reviewerId: req.user!.id,
        revieweeId,
        rating: parseInt(rating),
        comment,
        packageId,
      },
      include: {
        reviewer: { select: { firstName: true, lastName: true, avatar: true } },
      },
    });

    // Update reviewee's average rating
    const allRatings = await prisma.review.findMany({
      where: { revieweeId },
      select: { rating: true },
    });

    const avgRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;

    await prisma.user.update({
      where: { id: revieweeId },
      data: {
        rating: Math.round(avgRating * 10) / 10,
        totalRatings: allRatings.length,
      },
    });

    // Notify reviewee
    await prisma.notification.create({
      data: {
        userId: revieweeId,
        type: 'REVIEW_RECEIVED',
        title: 'New Review Received! ⭐',
        message: `You received a ${rating}-star review${comment ? `: "${comment.substring(0, 50)}..."` : '!'}`,
        data: JSON.stringify({ reviewId: review.id, rating }),
      },
    });

    res.status(201).json({ success: true, message: 'Review submitted', data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to submit review' });
  }
});

// GET /api/reviews/user/:userId
router.get('/user/:userId', async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '20' } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = Math.min(parseInt(limit as string), 50);

  try {
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { revieweeId: req.params.userId },
        include: {
          reviewer: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.review.count({ where: { revieweeId: req.params.userId } }),
    ]);

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    res.json({
      success: true,
      data: { reviews, total, avgRating: Math.round(avgRating * 10) / 10 },
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
});

export default router;
