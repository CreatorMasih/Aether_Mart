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
    const user = await this.db.user.findUnique({ where: { id: userId }, include: { customer: true } });
    const receiverName = data.receiverName?.trim() || user?.customer?.fullName || user?.email?.split('@')[0] || 'Customer';
    const receiverPhone = data.receiverPhone?.trim() || user?.phone || '9999999999';

    if (data.isDefault) {
      await this.db.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.db.address.create({
      data: {
        userId,
        label: data.label || 'Home',
        receiverName,
        receiverPhone,
        streetAddress: data.streetAddress,
        apartmentSuite: data.apartmentSuite || null,
        houseNumber: data.houseNumber || null,
        street: data.street || null,
        landmark: data.landmark || null,
        postalCode: data.postalCode,
        city: data.city || 'Mahasamund',
        district: data.district || 'Mahasamund',
        state: data.state || 'Chhattisgarh',
        country: data.country || 'India',
        latitude: data.latitude ?? 21.1085,
        longitude: data.longitude ?? 82.0965,
        isDefault: data.isDefault || false,
      },
    });
  }

  public async updateAddress(id: string, userId: string, data: any): Promise<Address> {
    const user = await this.db.user.findUnique({ where: { id: userId }, include: { customer: true } });
    const receiverName = data.receiverName?.trim() || user?.customer?.fullName || user?.email?.split('@')[0] || 'Customer';
    const receiverPhone = data.receiverPhone?.trim() || user?.phone || '9999999999';

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
        receiverName,
        receiverPhone,
        streetAddress: data.streetAddress,
        apartmentSuite: data.apartmentSuite || null,
        houseNumber: data.houseNumber || null,
        street: data.street || null,
        landmark: data.landmark || null,
        postalCode: data.postalCode,
        city: data.city || 'Mahasamund',
        district: data.district || 'Mahasamund',
        state: data.state || 'Chhattisgarh',
        country: data.country || 'India',
        latitude: data.latitude ?? 21.1085,
        longitude: data.longitude ?? 82.0965,
        isDefault: data.isDefault ?? false,
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
