import { PrismaClient } from '@prisma/client';
import { prisma } from '../../config/database.config';

/**
 * Generic base repository providing the Prisma client to all derived repositories.
 *
 * All module-specific repositories extend this class to gain access to the
 * shared Prisma client singleton without re-instantiating it.
 *
 * Usage:
 *   class ProductRepository extends BaseRepository {
 *     async findById(id: string) {
 *       return this.db.product.findUnique({ where: { id } });
 *     }
 *   }
 */
export abstract class BaseRepository {
  protected readonly db: PrismaClient;

  constructor() {
    this.db = prisma;
  }

  public get prisma(): PrismaClient {
    return this.db;
  }
}
