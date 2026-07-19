import http from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { verifyAccessToken } from '../utils/jwt.util';
import { logger } from '../utils/logger';
import { prisma } from '../config/database.config';
import { orderEventEmitter, OrderEvent } from '../common/events/order-event.emitter';

let io: Server;
const lastLocationTime = new Map<string, number>();

/**
 * Configure domain event listeners to broadcast database/status updates to Socket.IO clients
 */
function setupDomainEventListeners(): void {
  const events = Object.values(OrderEvent);

  for (const event of events) {
    orderEventEmitter.on(event, (data: { order: any; extra?: any }) => {
      const { order } = data;
      if (!order) return;

      // Broadcast to specific order tracking room
      io.to(`order:${order.id}`).emit('order:status_update', {
        event,
        orderId: order.id,
        status: order.status,
        order,
      });

      // Broadcast to customer room
      io.to(`customer:${order.customerId}`).emit('order:status_update', {
        event,
        orderId: order.id,
        status: order.status,
        order,
      });

      // Broadcast to store/merchant room
      io.to(`store:${order.storeId}`).emit('order:status_update', {
        event,
        orderId: order.id,
        status: order.status,
        order,
      });

      // Notify merchant about new orders instantly
      if (event === OrderEvent.PLACED) {
        io.to(`store:${order.storeId}`).emit('merchant:new_order', order);
      }

      // Notify admins about all platform events
      io.to('admins').emit('admin:order_event', {
        event,
        orderId: order.id,
        order,
      });
    });
  }
}

/**
 * Initialize Socket.IO Server with JWT authentication and role-based rooms
 */
export async function initializeSocket(server: http.Server): Promise<Server> {
  io = new Server(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:5173',
        'http://localhost:5173',
        'https://aether-mart-six.vercel.app',
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  if (process.env.REDIS_ENABLED === 'true') {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    logger.info(`Socket.IO initializing Redis adapter with URL: ${redisUrl}`);
    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('✅ Socket.IO Redis adapter connected');
  } else {
    logger.info('Socket.IO using default in-memory adapter');
  }

  // Authentication connection middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      if (!token) {
        return next(new Error('Authentication error: Token is required'));
      }
      const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;
      const decoded = verifyAccessToken(cleanToken);
      socket.data.user = decoded;
      next();
    } catch (error) {
      logger.error('Socket authentication failed', { error });
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const { userId, role } = socket.data.user;
    logger.info(`Socket connected: ${socket.id} (User: ${userId}, Role: ${role})`);

    // Join general user room
    socket.join(`user:${userId}`);

    // Role-specific rooms config
    try {
      if (role === 'CUSTOMER') {
        const customer = await prisma.customer.findUnique({ where: { userId } });
        if (customer) {
          socket.data.customerId = customer.id;
          socket.join(`customer:${customer.id}`);
          socket.join('customers');
          logger.info(`Customer socket joined room: customer:${customer.id}`);
        }
      } else if (role === 'SHOPKEEPER') {
        const merchant = await prisma.merchant.findFirst({
          where: { userId, deletedAt: null },
          include: { store: true },
        });
        if (merchant?.store) {
          socket.data.merchantId = merchant.id;
          socket.data.storeId = merchant.store.id;
          socket.join(`store:${merchant.store.id}`);
          socket.join('merchants');
          logger.info(`Merchant socket joined room: store:${merchant.store.id}`);
        }
      } else if (role === 'RIDER') {
        const rider = await prisma.rider.findUnique({ where: { userId } });
        if (rider) {
          socket.data.riderId = rider.id;
          socket.join(`rider:${rider.id}`);
          socket.join('riders');
          logger.info(`Rider socket joined room: rider:${rider.id}`);
        }
      } else if (role === 'ADMIN') {
        socket.join('admins');
        logger.info('Admin socket joined room: admins');
      }
    } catch (error) {
      logger.error(`Error setting up roles rooms for socket ${socket.id}`, { error });
    }

    // ─── Socket Events ──────────────────────────────────────────────────────────

    // Subscribe to track order coordinates / updates
    socket.on('order:track', (data: { orderId: string }, callback?: (ack: any) => void) => {
      if (!data?.orderId) {
        if (callback) callback({ success: false, error: 'orderId is required' });
        return;
      }
      socket.join(`order:${data.orderId}`);
      logger.info(`Socket ${socket.id} tracking order:${data.orderId}`);
      if (callback) callback({ success: true, message: `Started tracking order:${data.orderId}` });
    });

    // Unsubscribe from order updates
    socket.on('order:untrack', (data: { orderId: string }, callback?: (ack: any) => void) => {
      if (!data?.orderId) {
        if (callback) callback({ success: false, error: 'orderId is required' });
        return;
      }
      socket.leave(`order:${data.orderId}`);
      logger.info(`Socket ${socket.id} untracking order:${data.orderId}`);
      if (callback) callback({ success: true, message: `Stopped tracking order:${data.orderId}` });
    });

    // Stream rider coordinates (throttled)
    socket.on('rider:location_update', async (
      data: { orderId?: string; latitude: number; longitude: number },
      callback?: (ack: any) => void
    ) => {
      const riderId = socket.data.riderId;
      if (!riderId) {
        if (callback) callback({ success: false, error: 'Only riders can emit location updates' });
        return;
      }

      const now = Date.now();
      const lastTime = lastLocationTime.get(riderId) || 0;

      // Throttle broadcast to once every 5 seconds to avoid socket flooding
      if (now - lastTime < 5000) {
        if (callback) callback({ success: true, status: 'throttled', message: 'Location update throttled' });
        return;
      }

      lastLocationTime.set(riderId, now);

      // Broadcast location to specific order room if tracking a delivery
      if (data?.orderId) {
        io.to(`order:${data.orderId}`).emit('rider:location_update', {
          orderId: data.orderId,
          riderId,
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: now,
        });
      }

      // Also send coordinates to admins
      io.to('admins').emit('rider:location_update', {
        riderId,
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: now,
      });

      if (callback) callback({ success: true, message: 'Location updated' });
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id} (User: ${userId})`);
      if (socket.data.riderId) {
        lastLocationTime.delete(socket.data.riderId);
      }
    });
  });

  setupDomainEventListeners();

  return io;
}

/**
 * Accessor for the active Socket.IO server instance
 */
export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO server has not been initialized');
  }
  return io;
}
