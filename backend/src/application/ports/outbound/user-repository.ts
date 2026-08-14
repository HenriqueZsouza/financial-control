import type { User, UserPublic } from '../../../domain/user/user.js';

export interface CreateUserData { firstName: string; lastName: string; email: string; phone: string; passwordHash: string }
export interface UpdateUserData { firstName?: string; lastName?: string; phone?: string; passwordHash?: string }
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findActiveById(id: string): Promise<UserPublic | null>;
  create(data: CreateUserData): Promise<UserPublic>;
  updateActive(id: string, data: UpdateUserData): Promise<UserPublic | null>;
}
