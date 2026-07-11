import { UserRole } from '../modules/auth/auth.types';

/**
 * Typed Socket.IO event payloads for type-safe event emission and handling.
 */

// ─── Server → Client Events ──────────────────────────────────────────────────

export interface ServerToClientEvents {
  // Order events
  'order:status_updated': (payload: OrderStatusUpdatedPayload) => void;
  'order:rider_assigned': (payload: OrderRiderAssignedPayload) => void;
  'order:cancelled': (payload: OrderCancelledPayload) => void;

  // Rider events
  'rider:location_updated': (payload: RiderLocationPayload) => void;
  'rider:eta_updated': (payload: RiderEtaPayload) => void;

  // Merchant events
  'merchant:new_order': (payload: MerchantNewOrderPayload) => void;
  'merchant:order_cancelled': (payload: OrderCancelledPayload) => void;

  // Admin events
  'admin:new_merchant': (payload: AdminNewMerchantPayload) => void;
  'admin:new_rider': (payload: AdminNewRiderPayload) => void;
  'admin:order_placed': (payload: AdminOrderPlacedPayload) => void;

  // Push notification
  'notification:push': (payload: PushNotificationPayload) => void;

  // System
  'error': (payload: { code: string; message: string }) => void;
  'connected': (payload: { socketId: string }) => void;
}

// ─── Client → Server Events ──────────────────────────────────────────────────

export interface ClientToServerEvents {
  'rider:update_location': (payload: RiderLocationUpdatePayload) => void;
  'customer:join_order': (payload: { orderId: string }) => void;
  'customer:leave_order': (payload: { orderId: string }) => void;
  'merchant:join_store': (payload: { storeId: string }) => void;
  'merchant:leave_store': (payload: { storeId: string }) => void;
}

// ─── Inter-Server Events (for scaling) ───────────────────────────────────────

export interface InterServerEvents {
  ping: () => void;
}

// ─── Socket Data (attached to socket instance) ────────────────────────────────

export interface SocketData {
  userId: string;
  role: UserRole;
  storeId?: string;
}

// ─── Payload Types ────────────────────────────────────────────────────────────

export interface OrderStatusUpdatedPayload {
  orderId: string;
  status: string;
  updatedAt: string;
  message?: string;
}

export interface OrderRiderAssignedPayload {
  orderId: string;
  rider: {
    id: string;
    fullName: string;
    phone: string;
    vehicleType: string;
    rating: number;
  };
}

export interface OrderCancelledPayload {
  orderId: string;
  reason?: string;
  cancelledAt: string;
}

export interface RiderLocationPayload {
  orderId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  eta?: number; // minutes
  recordedAt: string;
}

export interface RiderEtaPayload {
  orderId: string;
  eta: number; // minutes
}

export interface MerchantNewOrderPayload {
  orderId: string;
  orderNumber: string;
  customerName: string;
  itemCount: number;
  totalAmount: number;
  createdAt: string;
}

export interface AdminNewMerchantPayload {
  merchantId: string;
  storeName: string;
  submittedAt: string;
}

export interface AdminNewRiderPayload {
  riderId: string;
  riderName: string;
  submittedAt: string;
}

export interface AdminOrderPlacedPayload {
  orderId: string;
  storeId: string;
  totalAmount: number;
  createdAt: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export interface RiderLocationUpdatePayload {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
}
