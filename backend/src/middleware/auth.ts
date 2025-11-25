import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../utils/logger';

interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization ?? '';

  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    //env.JWT_SECRET is guaranteed to exist by zod schema with default value
    // @ts-expect-error - Zod schema ensures JWT_SECRET is always defined
    const decoded = jwt.verify(token, env.JWT_SECRET);

    // Type guard for our payload
    const payload = decoded as unknown as JwtPayload;

    // Validate payload structure
    if (!payload.userId || !payload.email) {
      logger.error('Invalid JWT payload structure', { payload });
      res.status(401).json({ message: 'Invalid token payload' });
      return;
    }

    // Attach user to request
    req.user = {
      userId: payload.userId,
      email: payload.email,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Expired token attempt');
      res.status(401).json({ message: 'Token expired' });
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid token attempt', { error: error.message });
      res.status(401).json({ message: 'Invalid token' });
    } else {
      logger.error('Token verification error', { error });
      res.status(401).json({ message: 'Authentication failed' });
    }
  }
}

// Convenience export
export const requireAuth = authenticate;
