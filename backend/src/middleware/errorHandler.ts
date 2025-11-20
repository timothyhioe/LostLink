import type { NextFunction, Request, Response } from 'express';

import { logger } from '../utils/logger';

export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next();
    return;
  }

  res.status(404).json({
    message: `Route ${req.originalUrl} not found`
  });
}

export function errorHandler(error: unknown, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  const status = typeof (error as { status?: number }).status === 'number' ? (error as { status?: number }).status! : 500;
  const message =
    typeof (error as { message?: string }).message === 'string'
      ? (error as { message?: string }).message!
      : 'An unexpected error occurred';

  logger.error(`Error processing ${req.method} ${req.originalUrl}: ${message}`);

  res.status(status).json({
    message
  });
}

