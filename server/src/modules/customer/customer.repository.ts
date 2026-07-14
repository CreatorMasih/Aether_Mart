import { BaseRepository } from '../../common/repositories/base.repository';
import { Address } from '@prisma/client';

export class CustomerRepository extends BaseRepository {
  public async findAddressesByUserId(userId: string): Promise<Address[]> {
    return this.db.address.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async findAddressById(id: string): Promise<Address | null> {
    return this.db.address.findUnique({
      where: { id },
    });
  }

  public async createAddress(userId: string, data: any): Promise<Address> {
    if (data.isDefault) {
      await this.db.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.db.address.create({
      data: {
        userId,
        label: data.label,
        receiverName: data.receiverName,
        receiverPhone: data.receiverPhone,
        streetAddress: data.streetAddress,
        apartmentSuite: data.apartmentSuite || null,
        postalCode: data.postalCode,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
        isDefault: data.isDefault || false,
      },
    });
  }

  public async updateAddress(id: string, userId: string, data: any): Promise<Address> {
    if (data.isDefault) {
      await this.db.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.db.address.update({
      where: { id },
      data: {
        label: data.label,
        receiverName: data.receiverName,
        receiverPhone: data.receiverPhone,
        streetAddress: data.streetAddress,
        apartmentSuite: data.apartmentSuite || null,
        postalCode: data.postalCode,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
        isDefault: data.isDefault,
      },
    });
  }

  public async deleteAddress(id: string): Promise<void> {
    await this.db.address.delete({
      where: { id },
    });
  }
}

export const customerRepository = new CustomerRepository();
export default customerRepository;
