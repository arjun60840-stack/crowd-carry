import express, { Response } from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();
const prisma = new PrismaClient();

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY) 
  : null;

// POST /api/payments/create-checkout
router.post('/create-checkout', authenticate, [
  body('packageId').isUUID().withMessage('Invalid package ID format')
], async (req: AuthRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }
  try {
    const { packageId } = req.body;

    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
    });

    if (!pkg) {
      res.status(404).json({ success: false, message: 'Package not found' });
      return;
    }

    if (pkg.userId !== req.user!.id) {
      res.status(403).json({ success: false, message: 'Not authorized to fund this package' });
      return;
    }

    // Amount in cents (INR or USD)
    const amountInCents = Math.round(pkg.rewardAmount * 100);

    if (process.env.NODE_ENV === 'production' && !stripe) {
      logger.error('Production Stripe configuration missing. Rejecting payment request.');
      res.status(503).json({ success: false, message: 'Stripe payments are currently unavailable.' });
      return;
    }

    if (stripe) {
      // Real Stripe Checkout
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'inr',
              product_data: {
                name: `Crowd Carry Escrow: ${pkg.title}`,
                description: `Secure Escrow hold for package delivery from ${pkg.pickupCity} to ${pkg.destinationCity}.`,
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/packages/${pkg.id}?payment=success`,
        cancel_url: `${process.env.FRONTEND_URL}/packages/${pkg.id}?payment=cancelled`,
        metadata: {
          packageId: pkg.id,
          userId: req.user!.id,
        },
      });

      res.json({ success: true, url: session.url });
    } else {
      // Mock Escrow Mode if no Stripe key is found (and not in production)
      logger.info('Stripe key missing. Using Mock Escrow flow.');
      
      await prisma.$transaction(async (tx) => {
        await tx.package.update({
          where: { id: pkg.id },
          data: { 
            status: 'ESCROW_FUNDED',
            escrowStatus: 'FUNDED',
            paymentStatus: 'PAID'
          },
        });

        await tx.transaction.create({
          data: {
            userId: req.user!.id,
            packageId: pkg.id,
            type: 'escrow_hold',
            amount: pkg.rewardAmount,
            currency: 'INR',
            status: 'completed',
            description: 'Mock Escrow Funding',
          }
        });
      });

      res.json({ success: true, url: `${process.env.FRONTEND_URL}/packages/${pkg.id}?payment=success` });
    }
  } catch (error: any) {
    logger.error('Checkout error:', error);
    res.status(500).json({ success: false, message: 'Failed to create checkout session' });
  }
});

// POST /api/payments/webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: express.Request, res: Response) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    res.status(400).send('Stripe not configured');
    return;
  }

  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle successful checkout
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const packageId = session.metadata?.packageId;
    const userId = session.metadata?.userId;

    if (packageId && userId) {
      try {
        // Create transaction record and update package statuses atomically
        await prisma.$transaction(async (tx) => {
          await tx.package.update({
            where: { id: packageId },
            data: {
              status: 'ESCROW_FUNDED',
              escrowStatus: 'FUNDED',
              paymentStatus: 'PAID'
            }
          });

          await tx.transaction.create({
            data: {
              userId,
              packageId,
              type: 'escrow_hold',
              amount: (session.amount_total || 0) / 100,
              currency: session.currency || 'INR',
              status: 'completed',
              description: 'Stripe Escrow Funding',
            }
          });
        });
        logger.info(`Escrow funded successfully for package ${packageId}`);
      } catch (dbError) {
        logger.error(`Failed database transaction for package ${packageId}:`, dbError);
        res.status(500).send('Database transaction failed');
        return;
      }
    }
  }

  res.json({ received: true });
});

export default router;
