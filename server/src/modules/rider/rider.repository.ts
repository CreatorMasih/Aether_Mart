import { BaseRepository } from '../../common/repositories/base.repository';
import { Rider, DeliveryAssignment, DeliveryTracking, Order, OrderStatus } from '@prisma/client';

export class RiderRepository extends BaseRepository {
  public async findRiderByUserId(userId: string): Promise<Rider | null> {
    return this.db.rider.findUnique({
      where: { userId },
    });
  }

  public async updateRiderStatus(
    riderId: string,
    isOnline: boolean,
    latitude: number,
    longitude: number
  ): Promise<Rider> {
    return this.db.rider.update({
      where: { id: riderId },
      data: {
        isOnline,
        currentLatitude: latitude,
        currentLongitude: longitude,
      },
    });
  }

  public async logRiderLocationHistory(riderId: string, latitude: number, longitude: number): Promise<void> {
    await this.db.riderLocationHistory.create({
      data: {
        riderId,
        latitude,
        longitude,
      },
    });
  }

  public async findRiderAssignments(riderId: string): Promise<DeliveryAssignment[]> {
    return this.db.deliveryAssignment.findMany({
      where: { riderId },
      include: {
        order: {
          include: {
            store: true,
            deliveryAddress: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findActiveAssignment(riderId: string, orderId: string): Promise<DeliveryAssignment | null> {
    return this.db.deliveryAssignment.findFirst({
      where: { riderId, orderId },
      include: { order: true },
    });
  }

  /**
   * Retrieves orders in READY_FOR_PICKUP status that do not have any active rider assignment.
   */
  public async findAvailableDeliveries(): Promise<Order[]> {
    return this.db.order.findMany({
      where: {
        status: OrderStatus.READY_FOR_PICKUP,
        deliveryAssignment: null,
      },
      include: {
        store: true,
        deliveryAddress: true,
      },
    }) as any;
  }

  public async logDeliveryTracking(
    assignmentId: string,
    latitude: number,
    longitude: number
  ): Promise<DeliveryTracking> {
    return this.db.deliveryTracking.create({
      data: {
        assignmentId,
        latitude,
        longitude,
      },
    });
  }
}

export const riderRepository = new RiderRepository();
export default riderRepository;
