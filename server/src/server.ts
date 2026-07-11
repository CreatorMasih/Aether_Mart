/**
 * Aether Mart API — Server Entry Point
 *
 * Boot sequence:
 * 1. Load environment variables
 * 2. Initialize infrastructure (DB, cache, external services)
 * 3. Create Express app
 * 4. Start HTTP server
 * 5. Attach Socket.IO (Phase 7)
 * 6. Register graceful shutdown handlers
 */

import 'dotenv/config';
import http from 'http';
import { createApp } from './config/app.config';
import { connectDatabase, disconnectDatabase } from './config/database.config';
import { initializeCache, disconnectCache } from './config/redis.config';
import { initializeCloudinary } from './config/cloudinary.config';
import { initializeFirebase } from './config/firebase.config';
import { initializeSocket } from './socket/socket.gateway';
import { jobsService } from './modules/admin/jobs.service';
import { logger } from './utils/logger';

// ─── Validate Critical Environment Variables ──────────────────────────────────

function validateEnvironment(): void {
  const required = [
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// ─── Server Bootstrap ─────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  logger.info('🚀 Starting Aether Mart API server...');

  // 1. Validate environment
  validateEnvironment();

  // 2. Initialize infrastructure
  try {
    await connectDatabase();
    await initializeCache();
    initializeCloudinary();
    initializeFirebase();
  } catch (error) {
    logger.error('Failed to initialize infrastructure', { error });
    process.exit(1);
  }

  // 3. Create Express app
  const app = createApp();

  // 4. Create HTTP server
  const PORT = parseInt(process.env.PORT || '5000', 10);
  const server = http.createServer(app);

  // 5. Socket.IO initialization (Phase 7)
  await initializeSocket(server);

  // 5.5 Start Periodic Background Jobs (Phase 8)
  jobsService.startIntervalScheduler();

  // 6. Start listening
  server.listen(PORT, () => {
    logger.info(`✅ Server running on http://localhost:${PORT}`);
    logger.info(`📖 API Docs: http://localhost:${PORT}/api/docs`);
    logger.info(`🏥 Health: http://localhost:${PORT}/api/health`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
  });

  // ── Graceful Shutdown ────────────────────────────────────────────────────

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — initiating graceful shutdown...`);

    // Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        await disconnectDatabase();
        await disconnectCache();
        logger.info('✅ Graceful shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown', { error });
        process.exit(1);
      }
    });

    // Force shutdown after 10 seconds if graceful shutdown hangs
    setTimeout(() => {
      logger.error('Force shutdown — graceful shutdown timeout exceeded');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled Promise Rejection', { reason });
    // Don't exit — let the app handle it gracefully
  });

  // Handle uncaught exceptions — these are fatal
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception — shutting down', { error: error.message, stack: error.stack });
    process.exit(1);
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────

bootstrap().catch((error) => {
  logger.error('Bootstrap failed', { error });
  process.exit(1);
});
