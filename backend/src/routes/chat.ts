import express, { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/chat/:matchId
router.get('/:matchId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const matchId = req.params.matchId;

    // Verify user is part of this match (either sender or traveler)
    const match = await prisma.match.findUnique({
      where: { id: matchId }
    });

    if (!match) {
      res.status(404).json({ success: false, message: 'Match not found' });
      return;
    }

    if (match.senderId !== req.user!.id && match.travelerId !== req.user!.id) {
      res.status(403).json({ success: false, message: 'Not authorized to view this chat' });
      return;
    }

    const messages = await prisma.message.findMany({
      where: { matchId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatar: true } }
      }
    });

    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch chat history' });
  }
});

export default router;
