import * as admin from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';
import { createModuleLogger } from '../utils/logger';

const log = createModuleLogger('Firebase');

let isInitialized = false;

// ─── Initialization ───────────────────────────────────────────────────────────

export function initializeFirebase(): void {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  // Skip if using placeholder values (local dev without FCM)
  if (
    !projectId ||
    projectId === 'placeholder' ||
    !clientEmail ||
    clientEmail.includes('placeholder') ||
    !privateKey ||
    privateKey.includes('placeholder')
  ) {
    log.warn('Firebase not configured — push notifications disabled (placeholder credentials)');
    return;
  }

  if (admin.apps.length > 0) {
    isInitialized = true;
    return;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
    isInitialized = true;
    log.info('✅ Firebase Admin initialized');
  } catch (error) {
    log.error('Firebase initialization failed', { error });
  }
}

// ─── FCM Helpers ──────────────────────────────────────────────────────────────

export interface FcmMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

/**
 * Send a push notification to a specific device token.
 * Silently fails if Firebase is not configured.
 */
export async function sendPushNotification(
  fcmToken: string,
  message: FcmMessage
): Promise<boolean> {
  if (!isInitialized) {
    log.debug('Firebase not initialized — skipping push notification');
    return false;
  }

  try {
    const messaging = getMessaging();
    await messaging.send({
      token: fcmToken,
      notification: {
        title: message.title,
        body: message.body,
        imageUrl: message.imageUrl,
      },
      data: message.data,
      android: {
        notification: { clickAction: 'FLUTTER_NOTIFICATION_CLICK' },
        priority: 'high',
      },
      apns: {
        payload: { aps: { badge: 1, sound: 'default' } },
      },
    });
    return true;
  } catch (error) {
    log.error('Failed to send push notification', { fcmToken, error });
    return false;
  }
}

/**
 * Send push notifications to multiple device tokens (batch).
 */
export async function sendMulticastPushNotification(
  fcmTokens: string[],
  message: FcmMessage
): Promise<{ successCount: number; failureCount: number }> {
  if (!isInitialized || fcmTokens.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  try {
    const messaging = getMessaging();
    const response = await messaging.sendEachForMulticast({
      tokens: fcmTokens,
      notification: {
        title: message.title,
        body: message.body,
        imageUrl: message.imageUrl,
      },
      data: message.data,
    });

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    log.error('Failed to send multicast notification', { error });
    return { successCount: 0, failureCount: fcmTokens.length };
  }
}

export { admin };
export { isInitialized as isFirebaseInitialized };
