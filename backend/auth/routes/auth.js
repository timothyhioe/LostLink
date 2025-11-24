import crypto from 'crypto';

import express from 'express';
import jwt from 'jsonwebtoken';

import { User, roles } from '../models/User.js';
import { sendEmail } from '../utils/sendEmail.js';

const router = express.Router();
const allowedDomain = process.env.UNIVERSITY_EMAIL_DOMAIN || 'lostlink.edu';

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'student' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail.endsWith(`@${allowedDomain}`)) {
      return res.status(400).json({ message: `Email must be within the ${allowedDomain} domain` });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'Account already exists' });
    }

    if (!roles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const verificationCode = crypto.randomBytes(20).toString('hex');

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role,
      verificationCode
    });

    console.log(`Verification code for ${normalizedEmail}: ${verificationCode}`);
    await sendEmail({
      to: normalizedEmail,
      subject: 'Verify your LostLink account',
      text: `Your verification code is ${verificationCode}`
    });

    return res.status(201).json({
      message: 'Account created. Check your email for verification instructions.',
      user: { id: user.id, name: user.name, email: user.email, role: user.role, isVerified: user.isVerified }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordMatches = await user.comparePassword(password);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Account not verified' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, isVerified: user.isVerified }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Login failed' });
  }
});

router.get('/verify/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const user = await User.findOne({ verificationCode: code });

    if (!user) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    user.isVerified = true;
    user.verificationCode = null;
    await user.save();

    return res.json({ message: 'Account verified' });
  } catch (error) {
    return res.status(500).json({ message: 'Verification failed' });
  }
});

export default router;
