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
    let rider = await riderRepository.findRiderByUserId(userId);
    if (!rider) throw new NotFoundError('Rider Profile');

    // Auto-approve rider profile if not approved yet to allow instant duty activation
    if (!rider.isApproved) {
      rider = await riderRepository.prisma.rider.update({
        where: { id: rider.id },
        data: { isApproved: true },
      });
    }

    log.info(`[Rider Heartbeat] riderId=${rider.id}, isOnline=${params.isOnline}, lat=${params.latitude}, lng=${params.longitude}`);

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
    let rider = await riderRepository.findRiderByUserId(userId);
    if (!rider) throw new NotFoundError('Rider Profile');

    // Auto-approve rider profile if pending
    if (!rider.isApproved) {
      rider = await riderRepository.prisma.rider.update({
        where: { id: rider.id },
        data: { isApproved: true },
      });
    }

    const orders = await riderRepository.findAvailableDeliveries();

    const validRiderLat = (riderLat !== undefined && !isNaN(riderLat)) ? riderLat : (rider.currentLatitude ?? 21.1085);
    const validRiderLng = (riderLng !== undefined && !isNaN(riderLng)) ? riderLng : (rider.currentLongitude ?? 82.0965);

    const mapped = orders.map((order: any) => {
      const storeLat = order.store?.latitude ?? 21.1085;
      const storeLng = order.store?.longitude ?? 82.0965;
      const custLat = order.deliveryAddress?.latitude ?? 21.1085;
      const custLng = order.deliveryAddress?.longitude ?? 82.0965;

      const distRiderToStore = haversineDistance(
        { latitude: validRiderLat, longitude: validRiderLng },
        { latitude: storeLat, longitude: storeLng }
      );

      const distStoreToCustomer = haversineDistance(
        { latitude: storeLat, longitude: storeLng },
        { latitude: custLat, longitude: custLng }
      );

      return {
        ...order,
        store: order.store ? {
          ...order.store,
          latitude: storeLat,
          longitude: storeLng,
        } : {
          id: order.storeId,
          name: order.storeName || 'Aether Store',
          address: 'Mahasamund Store',
          latitude: storeLat,
          longitude: storeLng,
        },
        deliveryAddress: order.deliveryAddress ? {
          ...order.deliveryAddress,
          latitude: custLat,
          longitude: custLng,
        } : {
          latitude: custLat,
          longitude: custLng,
          streetAddress: 'Customer Location',
        },
        distanceToStoreKm: isNaN(distRiderToStore) ? 0.5 : parseFloat(distRiderToStore.toFixed(2)),
        distanceStoreToCustomerKm: isNaN(distStoreToCustomer) ? 1.5 : parseFloat(distStoreToCustomer.toFixed(2)),
      };
    });

    log.info(
      `[Rider Deliveries] riderId=${rider.id}, riderRole=RIDER, riderOnlineStatus=${rider.isOnline}, riderLat=${validRiderLat}, riderLng=${validRiderLng}, count=${mapped.length}`
    );

    return mapped.sort((a: any, b: any) => a.distanceToStoreKm - b.distanceToStoreKm);
  }

  /**
   * Accepts a delivery task.
   */
  public async acceptDelivery(userId: string, orderId: string): Promise<any> {
    let rider = await riderRepository.findRiderByUserId(userId);
    if (!rider) throw new NotFoundError('Rider Profile');

    if (!rider.isApproved) {
      rider = await riderRepository.prisma.rider.update({
        where: { id: rider.id },
        data: { isApproved: true },
      });
    }

    let assignment = await riderRepository.findActiveAssignment(rider.id, orderId);
    if (!assignment) {
      const order = await riderRepository.prisma.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundError('Order');

      if (order.status === OrderStatus.CANCELLED) {
        throw new BadRequestError('This order has been cancelled and cannot be accepted.');
      }

      // Check if an existing delivery assignment exists for this order
      const existingUnassigned = await riderRepository.prisma.deliveryAssignment.findFirst({
        where: { orderId },
      });

      if (existingUnassigned && existingUnassigned.riderId && existingUnassigned.riderId !== rider.id && existingUnassigned.status === DeliveryStatus.ACCEPTED) {
        throw new BadRequestError('This job was already accepted by another delivery partner.');
      }

      const pickupOtp = Math.floor(1000 + Math.random() * 9000).toString();
      const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

      if (existingUnassigned) {
        assignment = await riderRepository.prisma.deliveryAssignment.update({
          where: { id: existingUnassigned.id },
          data: {
            riderId: rider.id,
            status: DeliveryStatus.ASSIGNED,
            pickupOtp: existingUnassigned.pickupOtp || pickupOtp,
            deliveryOtp: existingUnassigned.deliveryOtp || deliveryOtp,
          },
        });
      } else {
        assignment = await riderRepository.prisma.deliveryAssignment.create({
          data: {
            orderId,
            riderId: rider.id,
            status: DeliveryStatus.ASSIGNED,
            pickupOtp,
            deliveryOtp,
          },
        });
      }
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

      // Update Order timeline to CONFIRMED if PLACED, otherwise retain READY_FOR_PICKUP / PACKING
      const nextStatus = order.status === OrderStatus.PLACED ? OrderStatus.CONFIRMED : order.status;
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { 
          status: nextStatus,
        },
        include: { store: true, deliveryAddress: true },
      });

      return { assignment: updatedAss, order: updatedOrder };
    }, { maxWait: 15000, timeout: 15000 });

    log.info(`[Rider Accept] riderId=${rider.id}, assignmentId=${updated.assignment.id}, orderId=${orderId}`);

    // Emit confirmation event
    orderEventEmitter.emitEvent(OrderEvent.CONFIRMED, { order: updated.order });

    return updated.assignment;
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
    }, { maxWait: 15000, timeout: 15000 });

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

      // 1. Calculate rider earnings for this shipment (deliveryFee + driverTip)
      const earnings = order.deliveryFee + (order.driverTip || 0);

      // 2. Increment rider balance
      await tx.rider.update({
        where: { id: rider.id },
        data: { balance: { increment: earnings } },
      });

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
    }, { maxWait: 15000, timeout: 15000 });

    // Emit delivered event
    orderEventEmitter.emitEvent(OrderEvent.DELIVERED, { order: result.order });

    return result.assignment;
  }

  /**
   * Retrieves earnings overview and stats for a rider.
   */
  public async getEarnings(userId: string): Promise<any> {
    const rider = await riderRepository.findRiderByUserId(userId);
    if (!rider) throw new NotFoundError('Rider Profile');

    // Calculate start of today in India Standard Time (Asia/Kolkata, UTC+5:30)
    const now = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(now.getTime() + istOffsetMs);
    const startOfTodayIST = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate()) - istOffsetMs);

    // Sum today's earnings
    const todayAssignments = await riderRepository.prisma.deliveryAssignment.findMany({
      where: {
        riderId: rider.id,
        status: DeliveryStatus.DELIVERED,
        deliveredAt: { gte: startOfTodayIST },
      },
      include: { order: true },
    });

    const todayEarnings = todayAssignments.reduce((acc, ass) => {
      return acc + (ass.order?.deliveryFee || 25) + (ass.order?.driverTip || 0);
    }, 0);

    const todayCompletedCount = todayAssignments.length;

    const completedCount = await riderRepository.prisma.deliveryAssignment.count({
      where: {
        riderId: rider.id,
        status: DeliveryStatus.DELIVERED,
      },
    });

    // Payout logs
    const payouts = await riderRepository.prisma.payout.findMany({
      where: { riderId: rider.id },
      orderBy: { createdAt: 'desc' },
    });

    const payoutHistory = payouts.map((p) => ({
      id: p.id.substring(0, 8).toUpperCase(),
      date: p.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      amount: p.amount,
      status: p.status,
    }));

    return {
      balance: rider.balance,
      todayEarnings,
      todayCompletedCount,
      completedCount,
      rating: rider.rating,
      payoutHistory,
    };
  }

  /**
   * Requests transfer of rider wallet balance to bank.
   */
  public async requestPayout(userId: string): Promise<any> {
    const rider = await riderRepository.findRiderByUserId(userId);
    if (!rider) throw new NotFoundError('Rider Profile');

    if (rider.balance <= 0) {
      throw new BadRequestError('No earnings balance available for payout transfer');
    }

    const amount = rider.balance;

    const payout = await riderRepository.prisma.$transaction(async (tx) => {
      // 1. Reset rider balance
      await tx.rider.update({
        where: { id: rider.id },
        data: { balance: 0.0 },
      });

      // 2. Create Payout log
      return tx.payout.create({
        data: {
          riderId: rider.id,
          amount,
          status: 'SUCCESS',
        },
      });
    });

    return {
      id: payout.id.substring(0, 8).toUpperCase(),
      amount: payout.amount,
      status: payout.status,
      date: payout.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
  }
}

export const riderService = new RiderService();
export default riderService;
