import { riderRepository } from './rider.repository';
import { orderEventEmitter, OrderEvent } from '../../common/events/order-event.emitter';
import { haversineDistance } from '../../utils/geo.util';
import { 
  BadRequestError, 
  NotFoundError, 
  ForbiddenError 
} from '../../common/middlewares/errorHandler.middleware';
import { ErrorCodes } from '../../utils/response.util';
import { createModuleLogger } from '../../utils/logger';
import { OrderStatus, DeliveryStatus, PaymentStatus, VehicleType } from '@prisma/client';

const log = createModuleLogger('RiderService');

export class RiderService {
  /**
   * Updates rider basic details.
   */
  public async updateRiderProfile(
    userId: string,
    params: {
      fullName?: string;
      vehicleType?: VehicleType;
      vehiclePlateNumber?: string;
      licenseNumber?: string;
    }
  ): Promise<any> {
    const rider = await riderRepository.findRiderByUserId(userId);
    if (!rider) throw new NotFoundError('Rider Profile');

    const updated = await riderRepository.prisma.$transaction(async (tx) => {
      // If full name is changed, sync with User
      if (params.fullName) {
        await tx.user.update({
          where: { id: userId },
          data: {
            customer: { update: { fullName: params.fullName } },
          },
        });
      }

      return tx.rider.update({
        where: { id: rider.id },
        data: {
          vehicleType: params.vehicleType,
          vehiclePlateNumber: params.vehiclePlateNumber,
          licenseNumber: params.licenseNumber,
          fullName: params.fullName,
        },
      });
    });

    return updated;
  }

  /**
   * Updates rider's live coordinates, tracks active delivery pathways, and writes heartbeat coordinates.
   */
  public async saveHeartbeat(
    userId: string,
    params: {
      latitude: number;
      longitude: number;
      isOnline: boolean;
    }
  ): Promise<any> {
    const rider = await riderRepository.findRiderByUserId(userId);
    if (!rider) throw new NotFoundError('Rider Profile');

    // Authority: must be approved to send online heartbeats
    if (params.isOnline && !rider.isApproved) {
      throw new ForbiddenError('Your rider profile is pending admin approval.');
    }

    const updatedRider = await riderRepository.updateRiderStatus(
      rider.id,
      params.isOnline,
      params.latitude,
      params.longitude
    );

    // 1. Log generic rider movement history
    await riderRepository.logRiderLocationHistory(rider.id, params.latitude, params.longitude);

    // 2. If active delivery exists (ACCEPTED / PICKED_UP), record path segment in DeliveryTracking
    const activeAssignments = await riderRepository.prisma.deliveryAssignment.findMany({
      where: {
        riderId: rider.id,
        status: { in: [DeliveryStatus.ACCEPTED, DeliveryStatus.PICKED_UP] },
      },
    });

    for (const assignment of activeAssignments) {
      await riderRepository.logDeliveryTracking(assignment.id, params.latitude, params.longitude);
    }

    return updatedRider;
  }

  /**
   * Returns nearby orders matching the delivery radius from rider's heartbeat coordinate.
   */
  public async findAvailableDeliveries(
    userId: string,
    riderLat?: number,
    riderLng?: number
  ): Promise<any[]> {
    const rider = await riderRepository.findRiderByUserId(userId);
    if (!rider) throw new NotFoundError('Rider Profile');
    if (!rider.isApproved) throw new ForbiddenError('Rider profile not approved');

    const orders = await riderRepository.findAvailableDeliveries();

    // Sort by distance to store if rider coordinates are provided
    if (riderLat !== undefined && riderLng !== undefined) {
      const mapped = orders.map((order: any) => {
        const distance = haversineDistance(
          { latitude: riderLat, longitude: riderLng },
          { latitude: order.store.latitude, longitude: order.store.longitude }
        );
        return {
          ...order,
          distanceToStoreKm: parseFloat(distance.toFixed(2)),
        };
      });

      // Filter: Within 10km of current rider location
      return mapped
        .filter((o: any) => o.distanceToStoreKm <= 10.0)
        .sort((a: any, b: any) => a.distanceToStoreKm - b.distanceToStoreKm);
    }

    return orders;
  }

  /**
   * Accepts a delivery task.
   */
  public async acceptDelivery(userId: string, orderId: string): Promise<any> {
    const rider = await riderRepository.findRiderByUserId(userId);
    if (!rider) throw new NotFoundError('Rider Profile');
    if (!rider.isApproved || !rider.isOnline) {
      throw new BadRequestError('You must be online and approved to accept delivery tasks.');
    }

    const assignment = await riderRepository.findActiveAssignment(rider.id, orderId);
    if (!assignment) {
      throw new NotFoundError('No assignment matched this order for you.');
    }

    if (assignment.status !== DeliveryStatus.ASSIGNED) {
      throw new BadRequestError(`Cannot accept delivery assignment in state: ${assignment.status}`);
    }

    const updated = await riderRepository.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundError('Order');

      // Update assignment
      const updatedAss = await tx.deliveryAssignment.update({
        where: { id: assignment.id },
        data: {
          status: DeliveryStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
        include: { order: true },
      });

      // Update Order timeline to CONFIRMED / ASSIGNED
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CONFIRMED },
      });

      return updatedAss;
    });

    return updated;
  }

  /**
   * Confirms pickup using store OTP.
   */
  public async confirmPickup(userId: string, orderId: string, otp: string): Promise<any> {
    const rider = await riderRepository.findRiderByUserId(userId);
    if (!rider) throw new NotFoundError('Rider Profile');

    const assignment = await riderRepository.findActiveAssignment(rider.id, orderId);
    if (!assignment) throw new NotFoundError('Delivery Assignment');

    if (assignment.status !== DeliveryStatus.ACCEPTED) {
      throw new BadRequestError('Pickup can only be completed after accepting the assignment.');
    }

    if (assignment.pickupOtp !== otp) {
      throw new BadRequestError('Invalid pickup OTP provided.', ErrorCodes.OTP_INVALID);
    }

    const result = await riderRepository.prisma.$transaction(async (tx) => {
      const updatedAss = await tx.deliveryAssignment.update({
        where: { id: assignment.id },
        data: {
          status: DeliveryStatus.PICKED_UP,
          pickedAt: new Date(),
        },
        include: { order: true },
      });

      // Transition order status to OUT_FOR_DELIVERY
      const order = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.OUT_FOR_DELIVERY },
      });

      return { assignment: updatedAss, order };
    });

    // Emit event
    orderEventEmitter.emitEvent(OrderEvent.OUT_FOR_DELIVERY, { order: result.order });

    return result.assignment;
  }

  /**
   * Confirms delivery completion using customer OTP.
   */
  public async confirmDelivery(userId: string, orderId: string, otp: string): Promise<any> {
    const rider = await riderRepository.findRiderByUserId(userId);
    if (!rider) throw new NotFoundError('Rider Profile');

    const assignment = await riderRepository.findActiveAssignment(rider.id, orderId);
    if (!assignment) throw new NotFoundError('Delivery Assignment');

    if (assignment.status !== DeliveryStatus.PICKED_UP) {
      throw new BadRequestError('Delivery can only be confirmed after picking up the order.');
    }

    if (assignment.deliveryOtp !== otp) {
      throw new BadRequestError('Invalid delivery OTP provided.', ErrorCodes.OTP_INVALID);
    }

    const result = await riderRepository.prisma.$transaction(async (tx) => {
      const updatedAss = await tx.deliveryAssignment.update({
        where: { id: assignment.id },
        data: {
          status: DeliveryStatus.DELIVERED,
          deliveredAt: new Date(),
        },
        include: { order: true },
      });

      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundError('Order');

      let paymentStatus = order.paymentStatus;
      if (order.paymentMethod === 'COD') {
        paymentStatus = PaymentStatus.PAID;
        await tx.payment.updateMany({
          where: { orderId },
          data: { status: PaymentStatus.PAID },
        });
      }

      // Transition order status to DELIVERED
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.DELIVERED, paymentStatus },
        include: { store: true, items: true },
      });

      return { assignment: updatedAss, order: updatedOrder };
    });

    // Emit delivered event
    orderEventEmitter.emitEvent(OrderEvent.DELIVERED, { order: result.order });

    return result.assignment;
  }
}

export const riderService = new RiderService();
export default riderService;
