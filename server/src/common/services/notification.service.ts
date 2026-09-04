import { prisma } from '../../config/database.config';
import { createModuleLogger } from '../../utils/logger';

const log = createModuleLogger('NotificationService');

export interface CreateNotificationParams {
  userId: string;
  title: string;
  body: string;
  type: string;
  data?: any;
}

export class NotificationService {
  /**
   * Creates and persists a notification in PostgreSQL database.
   */
  public async createNotification(params: CreateNotificationParams): Promise<any> {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: params.userId,
          title: params.title,
          body: params.body,
          type: params.type,
          data: params.data ? JSON.stringify(params.data) : null,
        },
      });
      log.info(`Notification created for user ${params.userId}: "${params.title}" (${params.type})`);
      return notification;
    } catch (error) {
      log.error('Failed to create notification', { error, params });
      throw error;
    }
  }

  /**
   * Retrieves notifications for a specific user.
   */
  public async getUserNotifications(userId: string): Promise<any[]> {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      title: n.title,
      body: n.body,
      type: n.type,
      isRead: n.isRead,
      data: n.data ? JSON.parse(n.data) : null,
      createdAt: n.createdAt,
    }));
  }

  /**
   * Marks a notification as read.
   */
  public async markAsRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  /**
   * Marks all notifications as read for a user.
   */
  public async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}

export const notificationService = new NotificationService();
export default notificationService;
