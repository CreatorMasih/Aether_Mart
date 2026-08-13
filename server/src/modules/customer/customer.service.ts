import { customerRepository } from './customer.repository';
import { authRepository } from '../auth/auth.repository';
import { prisma } from '../../config/database.config';
import { NotFoundError, ForbiddenError } from '../../common/middlewares/errorHandler.middleware';
import { Address } from '@prisma/client';

export class CustomerService {
  /**
   * Auto-provisions Customer profile and wallet if missing for a valid authenticated user.
   */
  private async ensureCustomerProfile(userId: string): Promise<void> {
    const profile = await authRepository.findUserWithProfile(userId);
    if (profile && !profile.customer) {
      const name = profile.fullName || profile.email?.split('@')[0] || 'Customer';
      await authRepository.createCustomerProfile(userId, name, profile.email || undefined);
    }
  }

  public async getAddresses(userId: string): Promise<Address[]> {
    await this.ensureCustomerProfile(userId);
    return customerRepository.findAddressesByUserId(userId);
  }

  public async createAddress(userId: string, data: any): Promise<Address> {
    await this.ensureCustomerProfile(userId);
    return customerRepository.createAddress(userId, data);
  }

  public async updateAddress(userId: string, id: string, data: any): Promise<Address> {
    await this.ensureCustomerProfile(userId);
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
    await this.ensureCustomerProfile(userId);
    const address = await customerRepository.findAddressById(id);
    if (!address) {
      throw new NotFoundError('Address');
    }
    if (address.userId !== userId) {
      throw new ForbiddenError('Not authorized to access this address');
    }
    await customerRepository.deleteAddress(id);
  }

  public async getWallet(userId: string): Promise<any> {
    await this.ensureCustomerProfile(userId);
    const profile = await authRepository.findUserWithProfile(userId);
    const customerId = profile?.customer?.id;
    if (!customerId) return { balance: 0.0 };

    let wallet = await prisma.wallet.findUnique({ where: { customerId } });
    if (!wallet) {
      wallet = await prisma.wallet.create({ data: { customerId, balance: 0.0 } });
    }
    return wallet;
  }
}

export const customerService = new CustomerService();
export default customerService;
