import { BaseRepository } from '../../../core/network/base-repository';
import type { RiderEarningsData, PayoutData, OrderData } from '../../../types';
import { mapOrderListDto } from '../../customer-checkout/services/cart-mappers';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface DeliveryAssignmentData {
  id: string;
  orderId: string;
  riderId: string;
  status: 'ASSIGNED' | 'ACCEPTED' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';
  pickupOtp: string;
  deliveryOtp: string;
  acceptedAt: string | null;
  pickedAt: string | null;
  deliveredAt: string | null;
  order: OrderData;
}

export class RiderService extends BaseRepository {
  /**
   * Fetches earnings stats and payout history for a rider.
   */
  public async getEarnings(): Promise<RiderEarningsData> {
    return this.executeRequest(async () => {
      const response = await this.client.get<ApiEnvelope<RiderEarningsData>>(
        '/rider/earnings'
      );
      return response.data.data;
    });
  }

  /**
   * Requests payout of current rider balance to bank.
   */
  public async requestPayout(): Promise<PayoutData> {
    return this.executeRequest(async () => {
      const response = await this.client.post<ApiEnvelope<PayoutData>>(
        '/rider/payout'
      );
      return response.data.data;
    });
  }

  /**
   * Fetches nearby available deliveries ready for pickup.
   */
  public async getAvailableDeliveries(lat?: number, lng?: number): Promise<OrderData[]> {
    return this.executeRequest(async () => {
      const response = await this.client.get<ApiEnvelope<unknown[]>>(
        '/rider/deliveries/available',
        { params: { lat, lng } }
      );
      return mapOrderListDto(response.data.data ?? []);
    });
  }

  /**
   * Fetches current rider assignments (active and history).
   */
  public async getAssignments(): Promise<DeliveryAssignmentData[]> {
    return this.executeRequest(async () => {
      const response = await this.client.get<ApiEnvelope<any[]>>(
        '/rider/assignments'
      );
      const raw = response.data.data ?? [];
      return raw.map((ass) => ({
        id: ass.id,
        orderId: ass.orderId,
        riderId: ass.riderId,
        status: ass.status,
        pickupOtp: ass.pickupOtp,
        deliveryOtp: ass.deliveryOtp,
        acceptedAt: ass.acceptedAt,
        pickedAt: ass.pickedAt,
        deliveredAt: ass.deliveredAt,
        order: mapOrderListDto([ass.order])[0],
      }));
    });
  }

  /**
   * Accepts an assigned delivery.
   */
  public async acceptDelivery(orderId: string): Promise<DeliveryAssignmentData> {
    return this.executeRequest(async () => {
      const response = await this.client.post<ApiEnvelope<any>>(
        `/rider/deliveries/${orderId}/accept`
      );
      const ass = response.data.data;
      return {
        id: ass.id,
        orderId: ass.orderId,
        riderId: ass.riderId,
        status: ass.status,
        pickupOtp: ass.pickupOtp,
        deliveryOtp: ass.deliveryOtp,
        acceptedAt: ass.acceptedAt,
        pickedAt: ass.pickedAt,
        deliveredAt: ass.deliveredAt,
        order: mapOrderListDto([ass.order])[0],
      };
    });
  }

  /**
   * Confirms pickup at the store using pickup OTP code.
   */
  public async confirmPickup(orderId: string, pickupOtp: string): Promise<DeliveryAssignmentData> {
    return this.executeRequest(async () => {
      const response = await this.client.post<ApiEnvelope<any>>(
        `/rider/deliveries/${orderId}/pickup`,
        { pickupOtp }
      );
      const ass = response.data.data;
      return {
        id: ass.id,
        orderId: ass.orderId,
        riderId: ass.riderId,
        status: ass.status,
        pickupOtp: ass.pickupOtp,
        deliveryOtp: ass.deliveryOtp,
        acceptedAt: ass.acceptedAt,
        pickedAt: ass.pickedAt,
        deliveredAt: ass.deliveredAt,
        order: mapOrderListDto([ass.order])[0],
      };
    });
  }

  /**
   * Confirms delivery completion to customer using delivery OTP.
   */
  public async confirmDelivery(orderId: string, deliveryOtp: string): Promise<DeliveryAssignmentData> {
    return this.executeRequest(async () => {
      const response = await this.client.post<ApiEnvelope<any>>(
        `/rider/deliveries/${orderId}/complete`,
        { deliveryOtp }
      );
      const ass = response.data.data;
      return {
        id: ass.id,
        orderId: ass.orderId,
        riderId: ass.riderId,
        status: ass.status,
        pickupOtp: ass.pickupOtp,
        deliveryOtp: ass.deliveryOtp,
        acceptedAt: ass.acceptedAt,
        pickedAt: ass.pickedAt,
        deliveredAt: ass.deliveredAt,
        order: mapOrderListDto([ass.order])[0],
      };
    });
  }

  /**
   * Logs coordinate heartbeat updates and shifts online status.
   */
  public async sendHeartbeat(latitude: number, longitude: number, isOnline: boolean): Promise<any> {
    return this.executeRequest(async () => {
      const response = await this.client.post<ApiEnvelope<any>>(
        '/rider/heartbeat',
        { latitude, longitude, isOnline }
      );
      return response.data.data;
    });
  }

  /**
   * Updates rider profile parameters (licence numbers, plate, vehicle type).
   */
  public async updateProfile(params: {
    fullName?: string;
    vehicleType?: 'BICYCLE' | 'MOTORBIKE';
    vehiclePlateNumber?: string;
    licenseNumber?: string;
    rcNumber?: string;
  }): Promise<any> {
    return this.executeRequest(async () => {
      const response = await this.client.put<ApiEnvelope<any>>(
        '/rider/profile',
        params
      );
      return response.data.data;
    });
  }
}

export const riderService = new RiderService();
export default riderService;
