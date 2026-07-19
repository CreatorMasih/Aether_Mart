import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createServer, Server as HttpServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createApp } from '../../src/config/app.config';
import { connectDatabase, disconnectDatabase, prisma } from '../../src/config/database.config';
import { initializeCache, disconnectCache } from '../../src/config/redis.config';
import { initializeSocket } from '../../src/socket/socket.gateway';
import { signAccessToken } from '../../src/utils/jwt.util';
import { orderEventEmitter, OrderEvent } from '../../src/common/events/order-event.emitter';

let server: HttpServer;
let port: number;

let customerToken: string;
let merchantToken: string;
let riderToken: string;
let adminToken: string;

let customerId: string;
let storeId: string;
let riderId: string;

const openSockets: ClientSocket[] = [];

function createClientSocket(token: string): ClientSocket {
  const socket = Client(`http://127.0.0.1:${port}`, {
    auth: { token: `Bearer ${token}` },
    autoConnect: false,
  });
  openSockets.push(socket);
  return socket;
}

function connectSocket(socket: ClientSocket): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (socket.connected) return resolve();
    socket.once('connect', () => resolve());
    socket.once('connect_error', (err) => reject(err));
    socket.connect();
  });
}

beforeAll(async () => {
  await connectDatabase();
  await initializeCache();

  // 1. Seed test entities
  const passwordHash = '$2a$12$L7pY6H2e8uWz7wWwWwWwWux1yP.3W7PZ61KjF1X2Y3Z4c5e6g7h8i';

  // Customer
  const customerUser = await prisma.user.upsert({
    where: { email: 'customer-socket-test@aethermart.com' },
    update: {},
    create: {
      email: 'customer-socket-test@aethermart.com',
      phone: '+919999999981',
      passwordHash,
      role: 'CUSTOMER',
      isVerified: true,
    },
  });
  const customer = await prisma.customer.upsert({
    where: { userId: customerUser.id },
    update: {},
    create: {
      userId: customerUser.id,
      fullName: 'Socket Test Customer',
    },
  });
  customerId = customer.id;
  customerToken = signAccessToken({
    userId: customerUser.id,
    role: 'CUSTOMER',
    email: customerUser.email,
    phone: customerUser.phone || undefined,
  });

  // Merchant / Store
  const merchantUser = await prisma.user.upsert({
    where: { email: 'merchant-socket-test@aethermart.com' },
    update: {},
    create: {
      email: 'merchant-socket-test@aethermart.com',
      phone: '+919999999982',
      passwordHash,
      role: 'SHOPKEEPER',
      isVerified: true,
    },
  });
  const merchant = await prisma.merchant.upsert({
    where: { userId: merchantUser.id },
    update: {},
    create: {
      userId: merchantUser.id,
      fullName: 'Socket Test Merchant',
    },
  });
  const store = await prisma.store.upsert({
    where: { merchantId: merchant.id },
    update: { isHoliday: false },
    create: {
      merchantId: merchant.id,
      name: 'Socket Test Store',
      address: 'Socket St',
      latitude: 12.9716,
      longitude: 77.5946,
      isOpen: true,
    },
  });
  storeId = store.id;
  merchantToken = signAccessToken({
    userId: merchantUser.id,
    role: 'SHOPKEEPER',
    email: merchantUser.email,
    phone: merchantUser.phone || undefined,
  });

  // Rider
  const riderUser = await prisma.user.upsert({
    where: { email: 'rider-socket-test@aethermart.com' },
    update: {},
    create: {
      email: 'rider-socket-test@aethermart.com',
      phone: '+919999999983',
      passwordHash,
      role: 'RIDER',
      isVerified: true,
    },
  });
  const rider = await prisma.rider.upsert({
    where: { userId: riderUser.id },
    update: { isApproved: true, isOnline: true },
    create: {
      userId: riderUser.id,
      fullName: 'Socket Test Rider',
      vehicleType: 'MOTORBIKE',
      vehiclePlateNumber: 'KA-01-XX-9999',
      isApproved: true,
      isOnline: true,
    },
  });
  riderId = rider.id;
  riderToken = signAccessToken({
    userId: riderUser.id,
    role: 'RIDER',
    email: riderUser.email,
    phone: riderUser.phone || undefined,
  });

  // Admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin-socket-test@aethermart.com' },
    update: {},
    create: {
      email: 'admin-socket-test@aethermart.com',
      phone: '+919999999984',
      passwordHash,
      role: 'ADMIN',
      isVerified: true,
    },
  });
  adminToken = signAccessToken({
    userId: adminUser.id,
    role: 'ADMIN',
    email: adminUser.email,
    phone: adminUser.phone || undefined,
  });

  // 2. Initialize App and Server
  const app = createApp();
  server = createServer(app);
  await initializeSocket(server);

  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const address = server.address();
      port = typeof address === 'string' ? 0 : address?.port || 0;
      resolve();
    });
  });
});

afterAll(async () => {
  // 1. Clean up socket connections
  for (const socket of openSockets) {
    if (socket.connected) {
      socket.disconnect();
    }
  }

  // 2. Close Server
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });

  // 3. Clean up DB records
  await prisma.store.deleteMany({ where: { name: 'Socket Test Store' } });
  await prisma.rider.deleteMany({ where: { userId: { in: [riderId] } } });
  await prisma.merchant.deleteMany({ where: { fullName: 'Socket Test Merchant' } });
  await prisma.customer.deleteMany({ where: { fullName: 'Socket Test Customer' } });

  const emails = [
    'customer-socket-test@aethermart.com',
    'merchant-socket-test@aethermart.com',
    'rider-socket-test@aethermart.com',
    'admin-socket-test@aethermart.com',
  ];
  await prisma.user.deleteMany({ where: { email: { in: emails } } });

  await disconnectDatabase();
  await disconnectCache();
});

afterEach(() => {
  // Clear all listeners on orderEventEmitter to prevent event leakage between tests
  orderEventEmitter.removeAllListeners();
  
  // Disconnect all sockets and clean up listeners
  for (const socket of openSockets) {
    if (socket.connected) {
      socket.disconnect();
    }
    socket.removeAllListeners();
  }
});

describe('⚡ Socket.IO Real-time Gateway Integration Tests', () => {
  it('Should fail connection without token authentication', () => {
    return new Promise<void>((resolve) => {
      const socket = Client(`http://127.0.0.1:${port}`, {
        autoConnect: false,
      });
      openSockets.push(socket);

      socket.connect();
      socket.on('connect_error', (err) => {
        expect(err.message).toContain('Authentication error');
        socket.disconnect();
        resolve();
      });
    });
  });

  it('Should fail connection with an invalid token authentication', () => {
    return new Promise<void>((resolve) => {
      const socket = Client(`http://127.0.0.1:${port}`, {
        auth: { token: 'Bearer invalid-token-string' },
        autoConnect: false,
      });
      openSockets.push(socket);

      socket.connect();
      socket.on('connect_error', (err) => {
        expect(err.message).toContain('Authentication error');
        socket.disconnect();
        resolve();
      });
    });
  });

  it('Should connect successfully with a valid Customer token', () => {
    return new Promise<void>((resolve) => {
      const socket = createClientSocket(customerToken);
      socket.connect();

      socket.on('connect', () => {
        expect(socket.connected).toBe(true);
        socket.disconnect();
        resolve();
      });
    });
  });

  it('Should allow client to join/leave order tracking room and receive live updates', () => {
    return new Promise<void>((resolve, reject) => {
      const customerSocket = createClientSocket(customerToken);
      const mockOrderId = 'mock-order-uuid-1234';

      console.log('--- TEST 4: Connecting customerSocket...');
      customerSocket.connect();

      customerSocket.on('connect_error', (err) => {
        console.error('--- TEST 4: customerSocket connect_error:', err);
        reject(err);
      });

      customerSocket.on('connect', () => {
        console.log('--- TEST 4: customerSocket connected successfully. Emitting order:track...');
        // Track order
        customerSocket.emit('order:track', { orderId: mockOrderId }, (ack: any) => {
          console.log('--- TEST 4: order:track ack received:', ack);
          expect(ack.success).toBe(true);
          expect(ack.message).toContain('Started tracking');

          // Trigger simulated domain event
          console.log('--- TEST 4: Emitting OrderEvent.CONFIRMED...');
          orderEventEmitter.emitEvent(OrderEvent.CONFIRMED, {
            order: {
              id: mockOrderId,
              orderNumber: 'ORD-MOCK-1',
              customerId,
              storeId,
              status: 'CONFIRMED',
            },
          });
        });
      });

      customerSocket.on('order:status_update', (data: any) => {
        console.log('--- TEST 4: order:status_update received:', data);
        expect(data.orderId).toBe(mockOrderId);
        expect(data.status).toBe('CONFIRMED');
        expect(data.event).toBe(OrderEvent.CONFIRMED);

        customerSocket.disconnect();
        resolve();
      });
    });
  });

  it('Should instantly notify Merchant about a new placed order', () => {
    return new Promise<void>((resolve) => {
      const merchantSocket = createClientSocket(merchantToken);
      const mockOrder = {
        id: 'mock-order-placed-123',
        orderNumber: 'ORD-PLACED-123',
        customerId,
        storeId,
        status: 'PLACED',
      };

      merchantSocket.connect();

      merchantSocket.on('connect', () => {
        // Emit PLACED domain event after a short delay to allow async server setup
        setTimeout(() => {
          orderEventEmitter.emitEvent(OrderEvent.PLACED, { order: mockOrder });
        }, 200);
      });

      merchantSocket.on('merchant:new_order', (order: any) => {
        expect(order.id).toBe(mockOrder.id);
        expect(order.orderNumber).toBe(mockOrder.orderNumber);
        expect(order.storeId).toBe(storeId);

        merchantSocket.disconnect();
        resolve();
      });
    });
  });

  it('Should broadcast live Rider coordinates to tracking Customer and Admin', async () => {
    const customerSocket = createClientSocket(customerToken);
    const riderSocket = createClientSocket(riderToken);
    const adminSocket = createClientSocket(adminToken);

    const mockOrderId = 'mock-order-tracking-555';

    await Promise.all([
      connectSocket(customerSocket),
      connectSocket(riderSocket),
      connectSocket(adminSocket),
    ]);

    return new Promise<void>((resolve) => {
      let customerReceived = false;
      let adminReceived = false;

      const checkFinish = () => {
        if (customerReceived && adminReceived) {
          customerSocket.disconnect();
          riderSocket.disconnect();
          adminSocket.disconnect();
          resolve();
        }
      };

      customerSocket.on('rider:location_update', (data: any) => {
        expect(data.orderId).toBe(mockOrderId);
        expect(data.riderId).toBe(riderId);
        expect(data.latitude).toBe(12.9716);
        expect(data.longitude).toBe(77.5946);
        customerReceived = true;
        checkFinish();
      });

      adminSocket.on('rider:location_update', (data: any) => {
        expect(data.riderId).toBe(riderId);
        expect(data.latitude).toBe(12.9716);
        expect(data.longitude).toBe(77.5946);
        adminReceived = true;
        checkFinish();
      });

      // Join tracking room, then emit rider update after short delay to ensure async rooms are joined
      customerSocket.emit('order:track', { orderId: mockOrderId }, () => {
        setTimeout(() => {
          riderSocket.emit('rider:location_update', {
            orderId: mockOrderId,
            latitude: 12.9716,
            longitude: 77.5946,
          });
        }, 200);
      });
    });
  });

  it('Should throttle Rider coordinate updates to once every 5 seconds', () => {
    return new Promise<void>((resolve) => {
      const riderSocket = createClientSocket(riderToken);
      const mockOrderId = 'mock-order-throttle-888';

      riderSocket.connect();

      riderSocket.on('connect', () => {
        // First update - should be success
        riderSocket.emit(
          'rider:location_update',
          { orderId: mockOrderId, latitude: 12.97, longitude: 77.59 },
          (ack1: any) => {
            expect(ack1.success).toBe(true);

            // Second instant update - should be throttled
            riderSocket.emit(
              'rider:location_update',
              { orderId: mockOrderId, latitude: 12.98, longitude: 77.60 },
              (ack2: any) => {
                expect(ack2.success).toBe(true);
                expect(ack2.status).toBe('throttled');
                expect(ack2.message).toContain('throttled');

                riderSocket.disconnect();
                resolve();
              }
            );
          }
        );
      });
    });
  });
});
