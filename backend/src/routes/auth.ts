import type { Request, Response } from 'express';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

import User from '../models/User';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import sendEmail from '../utils/sendEmail';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const ALLOWED_DOMAIN = '@stud.h-da.de';
const SALT_ROUNDS = 12;

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a new user
 *     description: Create a new account with @stud.h-da.de email address
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *                 description: Full name of the user
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@stud.h-da.de
 *                 description: University email address
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: MySecurePassword123
 *                 description: Password (min 8 characters)
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Account created successfully
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input or email domain
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: 'Name, email, and password are required' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 8 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Email domain validation (also enforced by User model)
    if (!normalizedEmail.endsWith(ALLOWED_DOMAIN)) {
      return res
        .status(400)
        .json({ message: `Email must be from ${ALLOWED_DOMAIN}` });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const verificationCode = crypto.randomInt(100000, 999999).toString();
    const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      emailVerified: false,
      verificationCode,
      verificationCodeExpires,
    });

    logger.info('User registered', { userId: user._id, email: user.email });

    // TODO: implement real email verification via external API
    await sendEmail({
      to: normalizedEmail,
      subject: 'LostLink Verification Code',
      text: `Your verification code is ${verificationCode}. It expires in 15 minutes.`,
    });

    return res.status(201).json({
      message: 'Account created. Please verify your email using the code sent.',
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    logger.error('Registration failed', { error });
    return res.status(500).json({ message: 'Registration failed' });
  }
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Login user
 *     description: Authenticate user and receive JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@stud.h-da.de
 *                 description: University email address
 *               password:
 *                 type: string
 *                 format: password
 *                 example: MySecurePassword123
 *                 description: User password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT authentication token
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Missing email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Email not verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare password
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check email verification
    if (!user.emailVerified) {
      return res.status(403).json({
        message: 'Email not verified. Please verify your email first.',
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    logger.info('User logged in', { userId: user._id, email: user.email });

    return res.json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    logger.error('Login failed', { error });
    return res.status(500).json({ message: 'Login failed' });
  }
});

/**
 * @openapi
 * /auth/verify-code:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Verify email using code
 *     description: Verify a user's email by submitting the code sent via email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@stud.h-da.de
 *                 description: Registered email address
 *               code:
 *                 type: string
 *                 example: "123456"
 *                 description: Six-digit verification code
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Email verified successfully
 *       400:
 *         description: Invalid code or email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/verify-code', async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res
        .status(400)
        .json({ message: 'Email and verification code are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select(
      '+verificationCode +verificationCodeExpires'
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.emailVerified) {
      return res.status(200).json({ message: 'Email already verified' });
    }

    if (
      !user.verificationCode ||
      !user.verificationCodeExpires ||
      user.verificationCode !== code ||
      user.verificationCodeExpires < new Date()
    ) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    user.emailVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpires = null;
    await user.save();

    logger.info('User verified email', { userId: user._id, email: user.email });

    return res.json({ message: 'Email verified successfully' });
  } catch (error) {
    logger.error('Email verification failed', { error });
    return res.status(500).json({ message: 'Verification failed' });
  }
});

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get current user
 *     description: Get authenticated user's information
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    logger.error('Get user failed', { error });
    return res.status(500).json({ message: 'Failed to get user' });
  }
});

export {router as authRouter}
