import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../../features/auth/store/auth-store';

const API_BASE_URL = 
  (import.meta.env.VITE_API_BASE_URL as string) || 
  (import.meta.env.VITE_API_URL as string) || 
  'http://localhost:5000/api';
const SOCKET_URL = API_BASE_URL.replace('/api', '');

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();

  constructor() {
    // Connect initially if we already have a session token
    let currentToken = useAuthStore.getState().accessToken;
    if (currentToken) {
      this.connect(currentToken);
    }

    // Listen to auth state transitions manually
    useAuthStore.subscribe((state) => {
      const nextToken = state.accessToken;
      if (nextToken !== currentToken) {
        currentToken = nextToken;
        if (nextToken) {
          this.connect(nextToken);
        } else {
          this.disconnect();
        }
      }
    });
  }

  public connect(token: string): Socket {
    if (this.socket?.connected) {
      // If already connected with the same token, do nothing
      if (this.socket.auth && (this.socket.auth as any).token === `Bearer ${token}`) {
        return this.socket;
      }
      this.disconnect();
    }

    this.socket = io(SOCKET_URL, {
      auth: { token: `Bearer ${token}` },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      console.log(`🔌 Socket connected: ${this.socket?.id}`);
      // Re-register all existing event listeners
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach((cb) => {
          this.socket?.on(event, cb);
        });
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${reason}`);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error);
    });

    return this.socket;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('🔌 Socket connection closed manually');
    }
  }

  /**
   * Register a callback listener for a WebSocket event
   */
  public on(event: string, callback: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Unregister a callback listener
   */
  public off(event: string, callback: (...args: any[]) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }

    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  /**
   * Emit an event to the Socket.IO gateway
   */
  public emit(event: string, data: any, ackCallback?: (response: any) => void): void {
    if (!this.socket?.connected) {
      console.warn(`🔌 Socket not connected. Cannot emit event: ${event}`);
      return;
    }
    if (ackCallback) {
      this.socket.emit(event, data, ackCallback);
    } else {
      this.socket.emit(event, data);
    }
  }

  /**
   * Subscribe to live updates for a specific order
   */
  public trackOrder(orderId: string, onStatusUpdate?: (data: any) => void): void {
    this.emit('order:track', { orderId }, (ack: any) => {
      if (ack?.success) {
        console.log(`🔌 Tracking order: ${orderId}`);
      } else {
        console.error(`🔌 Failed to track order: ${orderId}`, ack?.error);
      }
    });

    if (onStatusUpdate) {
      this.on('order:status_update', onStatusUpdate);
    }
  }

  /**
   * Unsubscribe from order updates
   */
  public untrackOrder(orderId: string, onStatusUpdate?: (data: any) => void): void {
    this.emit('order:untrack', { orderId }, (ack: any) => {
      if (ack?.success) {
        console.log(`🔌 Untracked order: ${orderId}`);
      }
    });

    if (onStatusUpdate) {
      this.off('order:status_update', onStatusUpdate);
    }
  }

  /**
   * Stream rider coordinates
   */
  public updateRiderLocation(orderId: string | undefined, latitude: number, longitude: number): void {
    this.emit('rider:location_update', { orderId, latitude, longitude }, (ack: any) => {
      if (ack?.status === 'throttled') {
        // Ignored, location throttled silently
      } else if (ack?.success) {
        console.log(`🔌 Sent rider location update: ${latitude}, ${longitude}`);
      }
    });
  }
}

export const socketService = new SocketService();
export default socketService;
