import type { UserRepository, CreateUserData, UpdateUserData } from '../../../application/ports/outbound/user-repository.js';
import type { User, UserPublic } from '../../../domain/user/user.js';
import { prisma } from './prisma-client.js';

const publicSelect = { id: true, firstName: true, lastName: true, email: true, phone: true, createdAt: true, updatedAt: true } as const;
export class PrismaUserRepository implements UserRepository {
  findByEmail(email: string): Promise<User | null> { return prisma.user.findUnique({ where: { email } }); }
  findActiveById(id: string): Promise<UserPublic | null> { return prisma.user.findFirst({ where: { id, deletedAt: null }, select: publicSelect }); }
  create(data: CreateUserData): Promise<UserPublic> { return prisma.user.create({ data, select: publicSelect }); }
  updateActive(id: string, data: UpdateUserData): Promise<UserPublic | null> {
    return prisma.user.updateMany({ where: { id, deletedAt: null }, data }).then(async (result) => result.count ? this.findActiveById(id) : null);
  }
}
