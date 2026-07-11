import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

/**
 * HTTP request logger middleware.
 * Logs method, URL, status code, duration, and user context (if authenticated).
 * Uses Winston for structured JSON output.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const { method, originalUrl, ip } = req;

  // Capture response finish to log outcome
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const userId = req.user?.userId;

    const logData = {
      method,
      url: originalUrl,
      statusCode,
      duration: `${duration}ms`,
      ip,
      userId,
      userAgent: req.headers['user-agent'],
    };

    if (statusCode >= 500) {
      logger.error('HTTP Request', logData);
    } else if (statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });

  next();
}
