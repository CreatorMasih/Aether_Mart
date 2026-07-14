import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

import { globalRateLimiter } from '../common/middlewares/rateLimit.middleware';
import { requestLogger } from '../common/middlewares/requestLogger.middleware';
import { errorHandler } from '../common/middlewares/errorHandler.middleware';
import { swaggerSpec } from './swagger.config';
import indexRouter from '../common/routes/index.routes';
import { sendError, HttpStatus, ErrorCodes } from '../utils/response.util';
import { logger } from '../utils/logger';

// ─── App Factory ──────────────────────────────────────────────────────────────

export function createApp(): Application {
  const app = express();

  // ── Security Middleware ────────────────────────────────────────────────────

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow CDN images
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        const allowedOrigins = [
          process.env.FRONTEND_URL || 'http://localhost:5173',
          'http://localhost:5173',
          'http://localhost:3000',
        ];

        // Allow requests with no origin (e.g. Postman, curl, mobile apps)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        logger.warn(`CORS blocked origin: ${origin}`);
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true, // Required for withCredentials (refresh token cookie)
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Idempotency-Key'],
      exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
    })
  );

  // ── Body Parsing ───────────────────────────────────────────────────────────

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // ── Performance ────────────────────────────────────────────────────────────

  app.use(compression());

  // ── Trust Proxy (for correct IP behind Nginx / load balancer) ─────────────

  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // ── Request Logging ────────────────────────────────────────────────────────

  app.use(requestLogger);

  // ── Global Rate Limiting ───────────────────────────────────────────────────

  app.use(globalRateLimiter);

  // ── Swagger UI (available in non-production or can be gated) ──────────────

  if (process.env.NODE_ENV !== 'production') {
    app.use(
      '/api/docs',
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        customSiteTitle: 'Aether Mart API Docs',
        customCss: '.swagger-ui .topbar { display: none }',
        swaggerOptions: {
          persistAuthorization: true,
        },
      })
    );

    // Expose raw OpenAPI JSON
    app.get('/api/docs.json', (_req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });

    logger.info('📖 Swagger UI available at /api/docs');
  }

  // ── API Routes ─────────────────────────────────────────────────────────────

  app.use('/api', indexRouter);

  // ── 404 Handler ───────────────────────────────────────────────────────────

  app.use((req: Request, res: Response) => {
    sendError(
      res,
      `Route not found: ${req.method} ${req.originalUrl}`,
      HttpStatus.NOT_FOUND,
      ErrorCodes.NOT_FOUND
    );
  });

  // ── Global Error Handler (must be last) ───────────────────────────────────

  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    errorHandler(err, req, res, next);
  });

  return app;
}
