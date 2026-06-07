import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/notifications
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '20', unreadOnly } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = Math.min(parseInt(limit as string), 50);

  try {
    const where: any = { userId: req.user!.id };
    if (unreadOnly === 'true') where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user!.id, isRead: false } }),
    ]);

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update notifications' });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete notification' });
  }
});

export default router;
