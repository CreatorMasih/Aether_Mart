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
          'https://aether-mart-six.vercel.app',
        ];

        // Allow requests with no origin (e.g. Postman, curl, mobile native apps)
        if (!origin) return callback(null, true);

        // Match explicit allowed origins or any Aether Mart vercel deployment
        const isVercelOrigin = origin.endsWith('.vercel.app') && origin.includes('aether-mart');
        if (allowedOrigins.includes(origin) || isVercelOrigin) {
          return callback(null, true);
        }

        logger.warn(`CORS blocked origin: ${origin}`);
        return callback(null, false);
      },
      credentials: true, // Required for withCredentials (refresh token cookie)
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Idempotency-Key',
        'X-Device-Id',
        'Accept',
        'Cookie',
      ],
      exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining', 'Set-Cookie'],
    })
  );

  // ── Body Parsing ───────────────────────────────────────────────────────────

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // ── Performance ────────────────────────────────────────────────────────────

  app.use(compression());

  // ── Trust Proxy Configuration ────────────────────────────────────────────────
  // Configured specifically for 1 reverse proxy hop (Render / Vercel / Nginx)
  // or customized via TRUST_PROXY env variable ('loopback', 1, etc.).
  // This prevents malicious clients from spoofing X-Forwarded-For headers.
  const envTrustProxy = process.env.TRUST_PROXY;
  const trustProxySetting = envTrustProxy
    ? (!isNaN(Number(envTrustProxy)) ? Number(envTrustProxy) : envTrustProxy)
    : 1; // Default to 1 hop (Render reverse proxy standard)

  app.set('trust proxy', trustProxySetting);

  // ── Request Logging ────────────────────────────────────────────────────────

  app.use(requestLogger);

  // ── Global Rate Limiting ───────────────────────────────────────────────────

  app.use(globalRateLimiter);

  // ── Swagger UI Interactive API Documentation ─────────────────────────────

  const swaggerCustomOptions = {
    customSiteTitle: 'Aether Mart API Documentation',
    customCss: '.swagger-ui .topbar { display: none } .swagger-ui .info { margin: 20px 0 }',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
    },
  };

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerCustomOptions));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerCustomOptions));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerCustomOptions));

  // Expose raw OpenAPI JSON
  app.get('/api/docs.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  app.get('/api-docs.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  logger.info('📖 Swagger UI available at /api/docs');

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
