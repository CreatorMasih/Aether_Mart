import { BaseRepository } from '../../common/repositories/base.repository';
import { User, UserRole, RefreshToken, Customer, Merchant, Rider, Address, Store } from '@prisma/client';

export class AuthRepository extends BaseRepository {
  /**
   * Finds a user by email or phone.
   */
  public async findUserByIdentifier(identifier: string): Promise<User | null> {
    return this.db.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier },
        ],
      },
    });
  }

  /**
   * Finds a user by ID including their specific profile relation.
   */
  public async findUserWithProfile(id: string): Promise<any> {
    return this.db.user.findUnique({
      where: { id },
      include: {
        addresses: true,
        customer: true,
        merchant: {
          include: {
            store: true,
          },
        },
        rider: true,
      },
    });
  }

  /**
   * Creates a user account.
   */
  public async createUser(data: {
    phone?: string;
    email?: string;
    role: UserRole;
    isVerified?: boolean;
  }): Promise<User> {
    return this.db.user.create({
      data: {
        phone: data.phone || null,
        email: data.email || null,
        role: data.role,
        isVerified: data.isVerified || false,
      },
    });
  }

  /**
   * Creates a Customer profile and establishes a wallet.
   */
  public async createCustomerProfile(
    userId: string,
    fullName?: string,
    email?: string
  ): Promise<Customer> {
    return this.db.$transaction(async (tx) => {
      // Create profile
      const customer = await tx.customer.create({
        data: {
          userId,
          fullName: fullName || null,
          referralCode: `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        },
      });

      // Create initial wallet
      await tx.wallet.create({
        data: {
          customerId: customer.id,
          balance: 0.0,
        },
      });

      // Update email in user model if supplied
      if (email) {
        await tx.user.update({
          where: { id: userId },
          data: { email },
        });
      }

      return customer;
    });
  }

  /**
   * Guarantees a customer profile exists for the given user ID and returns the customer.id.
   */
  public async ensureCustomerId(userId: string): Promise<string> {
    const profile = await this.findUserWithProfile(userId);
    if (profile?.customer?.id) {
      return profile.customer.id;
    }
    const user = profile || (await this.db.user.findUnique({ where: { id: userId } }));
    const name = user?.email?.split('@')[0] || user?.phone || 'Customer';
    const customer = await this.createCustomerProfile(userId, name, user?.email || undefined);
    return customer.id;
  }

  /**
   * Creates a Merchant profile.
   */
  public async createMerchantProfile(
    userId: string,
    fullName: string,
    email: string
  ): Promise<Merchant> {
    return this.db.$transaction(async (tx) => {
      const merchant = await tx.merchant.create({
        data: {
          userId,
          fullName,
        },
      });

      // Sync user email
      await tx.user.update({
        where: { id: userId },
        data: { email },
      });

      return merchant;
    });
  }

  /**
   * Creates a Rider profile.
   */
  public async createRiderProfile(
    userId: string,
    fullName: string,
    vehicleType: any,
    vehiclePlateNumber?: string,
    licenseNumber?: string,
    email?: string
  ): Promise<Rider> {
    return this.db.$transaction(async (tx) => {
      const rider = await tx.rider.create({
        data: {
          userId,
          fullName,
          vehicleType,
          vehiclePlateNumber: vehiclePlateNumber || null,
          licenseNumber: licenseNumber || null,
        },
      });

      if (email) {
        await tx.user.update({
          where: { id: userId },
          data: { email },
        });
      }

      return rider;
    });
  }

  /**
   * Adds a new address to a customer user.
   */
  public async createAddress(userId: string, address: any): Promise<Address> {
    return this.db.address.create({
      data: {
        userId,
        label: address.label,
        receiverName: address.receiverName,
        receiverPhone: address.receiverPhone,
        streetAddress: address.streetAddress,
        apartmentSuite: address.apartmentSuite || null,
        postalCode: address.postalCode,
        city: address.city,
        latitude: address.latitude,
        longitude: address.longitude,
        isDefault: address.isDefault || false,
      },
    });
  }

  /**
   * Creates a Store linked to a merchant.
   */
  public async createStore(merchantId: string, store: any): Promise<Store> {
    return this.db.store.create({
      data: {
        merchantId,
        name: store.name,
        address: store.address,
        latitude: store.latitude,
        longitude: store.longitude,
        deliveryRadiusKm: store.deliveryRadiusKm,
        isOpen: true,
      },
    });
  }

  /**
   * Stores a generated refresh token for session tracking.
   */
  public async createRefreshToken(data: {
    userId: string;
    token: string;
    expiresAt: Date;
    deviceId?: string;
    userAgent?: string;
    ipAddress?: string;
    family: string;
  }): Promise<RefreshToken> {
    return this.db.refreshToken.create({
      data: {
        userId: data.userId,
        token: data.token,
        expiresAt: data.expiresAt,
        deviceId: data.deviceId || null,
        userAgent: data.userAgent || null,
        ipAddress: data.ipAddress || null,
        family: data.family,
      },
    });
  }

  /**
   * Finds a refresh token with its owner info.
   */
  public async findRefreshToken(token: string): Promise<RefreshToken | null> {
    return this.db.refreshToken.findUnique({
      where: { token },
    });
  }

  /**
   * Revokes a specific session token.
   */
  public async revokeRefreshToken(id: string): Promise<RefreshToken> {
    return this.db.refreshToken.update({
      where: { id },
      data: { isRevoked: true },
    });
  }

  /**
   * Revokes an entire token family (used to mitigate replay attacks).
   */
  public async revokeRefreshTokenFamily(family: string): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { family },
      data: { isRevoked: true },
    });
  }

  /**
   * Revokes all active refresh sessions for a specific user (Logout all).
   */
  public async revokeAllRefreshTokensForUser(userId: string): Promise<void> {
    await this.db.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }

  /**
   * Updates user general details.
   */
  public async updateUser(id: string, data: any): Promise<User> {
    return this.db.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Updates customer profile details.
   */
  public async updateCustomerProfile(id: string, data: any): Promise<Customer> {
    return this.db.customer.update({
      where: { id },
      data,
    });
  }

  /**
   * Updates merchant profile details.
   */
  public async updateMerchantProfile(id: string, data: any): Promise<Merchant> {
    return this.db.merchant.update({
      where: { id },
      data,
    });
  }

  /**
   * Updates rider profile details.
   */
  public async updateRiderProfile(id: string, data: any): Promise<Rider> {
    return this.db.rider.update({
      where: { id },
      data,
    });
  }
}

export const authRepository = new AuthRepository();
export default authRepository;
