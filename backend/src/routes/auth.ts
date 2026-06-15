import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { calculateTrustScore } from '../engines/trustEngine';
import { calculateUserRisk } from '../engines/riskEngine';
import { sendEmail } from '../utils/mailer';
import { logger } from '../utils/logger';

const router = Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('role').optional().isIn(['USER', 'TRAVELER', 'ADMIN']).withMessage('Invalid role'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

// Generate JWT token
function generateToken(userId: string, email: string, role: string): string {
  return jwt.sign(
    { id: userId, email, role },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
  );
}

// POST /api/auth/register
router.post('/register', registerValidation, async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const { email, password, firstName, lastName, phone, role = 'USER' } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ success: false, message: 'Email already registered' });
      return;
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const emailVerifyToken = uuidv4();

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: role as any,
        emailVerifyToken,
      },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, createdAt: true, trustScore: true,
      },
    });

    const token = generateToken(user.id, user.email, user.role);

    // Create welcome notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'SYSTEM',
        title: 'Welcome to Crowd Carry! 🎉',
        message: `Hi ${user.firstName}! Welcome to the Crowd Carry platform. Start by verifying your email and setting up your profile.`,
      },
    });

    // Send verification email (non-blocking)
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify-email?token=${emailVerifyToken}`;
    sendEmail(
      user.email,
      'Welcome to Crowd Carry - Verify Your Email! 📧',
      `<h1>Welcome to Crowd Carry! 🎉</h1>
       <p>Hi ${user.firstName},</p>
       <p>Thank you for registering. Please verify your email by clicking the link below:</p>
       <p><a href="${verificationUrl}" style="padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a></p>
       <p>Or copy and paste this link in your browser:</p>
       <p>${verificationUrl}</p>
       <br>
       <p>Best regards,<br>The Crowd Carry Team</p>`
    ).catch(err => logger.error('Failed to send registration email', err));

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user, token },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', loginValidation, async (req: Request, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = generateToken(user.id, user.email, user.role);

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: userWithoutPassword, token },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      
      // Always return success to prevent email enumeration
      if (!user) {
        res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
        return;
      }

      const resetToken = uuidv4();
      const resetExpiry = new Date(Date.now() + 3600000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpiry: resetExpiry,
        },
      });

      // Send password reset email
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
      sendEmail(
        user.email,
        'Reset Your Password - Crowd Carry 🔑',
        `<h1>Password Reset Request</h1>
         <p>Hi ${user.firstName},</p>
         <p>We received a request to reset your password. Click the link below to set a new password:</p>
         <p><a href="${resetUrl}" style="padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
         <p>Or copy and paste this link in your browser:</p>
         <p>${resetUrl}</p>
         <p>This link will expire in 1 hour.</p>
         <p>If you did not request this, please ignore this email.</p>
         <br>
         <p>Best regards,<br>The Crowd Carry Team</p>`
      ).catch(err => logger.error('Failed to send password reset email', err));

      const response: any = { success: true, message: 'Password reset link sent to your email.' };
      if (process.env.NODE_ENV === 'development') {
        response.resetToken = resetToken; // Only in dev!
      }

      res.json(response);
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to process request' });
    }
  }
);

// POST /api/auth/reset-password
router.post('/reset-password',
  [
    body('token').notEmpty(),
    body('password').isLength({ min: 8 }),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { token, password } = req.body;

    try {
      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpiry: { gt: new Date() },
        },
      });

      if (!user) {
        res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        return;
      }

      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpiry: null,
        },
      });

      res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to reset password' });
    }
  }
);

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
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
        isTopCarrier: true, riskScore: true, riskLevel: true, createdAt: true,
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

// POST /api/auth/verify-email
router.post('/verify-email', async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body;

  try {
    const user = await prisma.user.findFirst({ where: { emailVerifyToken: token } });

    if (!user) {
      res.status(400).json({ success: false, message: 'Invalid verification token' });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerifyToken: null },
    });

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

export default router;
