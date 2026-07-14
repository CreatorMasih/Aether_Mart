import { customerRepository } from './customer.repository';
import { NotFoundError, ForbiddenError } from '../../common/middlewares/errorHandler.middleware';
import { Address } from '@prisma/client';

export class CustomerService {
  public async getAddresses(userId: string): Promise<Address[]> {
    return customerRepository.findAddressesByUserId(userId);
  }

  public async createAddress(userId: string, data: any): Promise<Address> {
    return customerRepository.createAddress(userId, data);
  }

  public async updateAddress(userId: string, id: string, data: any): Promise<Address> {
    const address = await customerRepository.findAddressById(id);
    if (!address) {
      throw new NotFoundError('Address');
    }
    if (address.userId !== userId) {
      throw new ForbiddenError('Not authorized to access this address');
    }
    return customerRepository.updateAddress(id, userId, data);
  }

  public async deleteAddress(userId: string, id: string): Promise<void> {
    const address = await customerRepository.findAddressById(id);
    if (!address) {
      throw new NotFoundError('Address');
    }
    if (address.userId !== userId) {
      throw new ForbiddenError('Not authorized to access this address');
    }
    await customerRepository.deleteAddress(id);
  }
}

export const customerService = new CustomerService();
export default customerService;
