import { prisma } from '../../config/database.config';
import { logger } from '../../utils/logger';
import { sendPushNotification, FcmMessage } from '../../config/firebase.config';

export interface FailedNotification {
  id: string;
  token: string;
  message: FcmMessage;
  attempts: number;
  lastAttempt: Date;
}

// Global in-memory queue for failed push notifications
export const failedNotificationQueue: FailedNotification[] = [];

export class JobsService {
  private db = prisma;

  /**
   * Cleans up expired OTP tokens from the database
   */
  public async cleanupExpiredOtps(): Promise<number> {
    const now = new Date();
    const result = await this.db.oTPVerification.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });
    logger.info(`🧹 Expired OTP cleanup job finished: deleted ${result.count} tokens.`);
    return result.count;
  }

  /**
   * Cleans up expired Refresh Tokens from the database
   */
  public async cleanupExpiredRefreshTokens(): Promise<number> {
    const now = new Date();
    const result = await this.db.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });
    logger.info(`🧹 Expired RefreshToken cleanup job finished: deleted ${result.count} tokens.`);
    return result.count;
  }

  /**
   * Cleans up carts abandoned for more than 14 days
   */
  public async cleanupAbandonedCarts(): Promise<number> {
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // 14 days ago
    const result = await this.db.cart.deleteMany({
      where: {
        updatedAt: { lt: cutoff },
      },
    });
    logger.info(`🧹 Abandoned Cart cleanup job finished: deleted ${result.count} carts.`);
    return result.count;
  }

  /**
   * Retries failed push notifications stored in the queue
   */
  public async retryFailedNotifications(): Promise<{ retriedCount: number; successCount: number }> {
    const now = new Date();
    const retriedCount = failedNotificationQueue.length;
    let successCount = 0;

    logger.info(`📳 Retrying ${retriedCount} failed notifications...`);

    const queueCopy = [...failedNotificationQueue];
    failedNotificationQueue.length = 0; // Clear queue for processing

    for (const item of queueCopy) {
      item.attempts += 1;
      item.lastAttempt = now;

      const success = await sendPushNotification(item.token, item.message);
      if (success) {
        successCount += 1;
        logger.info(`✅ Successfully retried notification ${item.id}`);
      } else if (item.attempts < 3) {
        // Put back in queue if below max attempts
        failedNotificationQueue.push(item);
        logger.info(`❌ Retry failed for notification ${item.id}. Attempt ${item.attempts}/3.`);
      } else {
        logger.warn(`⚠️ Discarded notification ${item.id} after 3 failed attempts.`);
      }
    }

    return { retriedCount, successCount };
  }

  /**
   * Run all cleanup and processing background jobs
   */
  public async runAllJobs(): Promise<any> {
    logger.info('⚙️ Executing all platform cleanup and maintenance background jobs...');
    try {
      const [otpsDeleted, tokensDeleted, cartsDeleted, notificationStats] = await Promise.all([
        this.cleanupExpiredOtps(),
        this.cleanupExpiredRefreshTokens(),
        this.cleanupAbandonedCarts(),
        this.retryFailedNotifications(),
      ]);

      return {
        success: true,
        otpsDeleted,
        tokensDeleted,
        cartsDeleted,
        notificationsRetried: notificationStats.retriedCount,
        notificationsSucceeded: notificationStats.successCount,
      };
    } catch (error) {
      logger.error('Failed to execute background jobs', { error });
      throw error;
    }
  }

  /**
   * Starts periodic interval timers to run jobs automatically in background (local dev / production fallback)
   */
  public startIntervalScheduler(intervalMs = 60 * 60 * 1000): NodeJS.Timeout {
    logger.info(`⏳ Starting periodic background jobs scheduler. Interval: ${intervalMs / 1000 / 60} minutes.`);
    return setInterval(async () => {
      try {
        await this.runAllJobs();
      } catch (error) {
        logger.error('Error running scheduled background jobs', { error });
      }
    }, intervalMs);
  }
}

export const jobsService = new JobsService();
export default jobsService;
