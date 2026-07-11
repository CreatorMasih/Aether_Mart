import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../../config/database.config';
import { getCache } from '../../config/redis.config';
import { sendSuccess, sendError, HttpStatus, ErrorCodes } from '../../utils/response.util';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: System health check
 *     description: Returns the health status of the API, database, and cache layer.
 *     security: []
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: ok
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     uptime:
 *                       type: number
 *                       example: 3600
 *                     services:
 *                       type: object
 *                       properties:
 *                         database:
 *                           type: string
 *                           example: healthy
 *                         cache:
 *                           type: string
 *                           example: healthy
 *       503:
 *         description: One or more services are unhealthy
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const [dbHealthy, cacheHealthy] = await Promise.all([
      checkDatabaseHealth(),
      getCache().isHealthy(),
    ]);

    const status = dbHealthy ? 'ok' : 'degraded';
    const httpStatus = dbHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;

    const payload = {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        cache: cacheHealthy ? 'healthy' : 'unhealthy',
      },
    };

    if (!dbHealthy) {
      return sendError(res, 'Service degraded — database unavailable', HttpStatus.SERVICE_UNAVAILABLE, ErrorCodes.SERVICE_UNAVAILABLE, payload);
    }

    return sendSuccess(res, payload, 'System is healthy', httpStatus);
  } catch (error) {
    logger.error('Health check failed', { error });
    return sendError(res, 'Health check failed', HttpStatus.SERVICE_UNAVAILABLE, ErrorCodes.SERVICE_UNAVAILABLE);
  }
});

export default router;
