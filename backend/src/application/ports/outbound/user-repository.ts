import type { User, UserPublic } from '../../../domain/user/user.js';

export interface CreateUserData { firstName: string; lastName: string; email: string; phone: string; passwordHash: string }
export interface UpdateUserData { firstName?: string; lastName?: string; phone?: string; passwordHash?: string }
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findActiveById(id: number): Promise<UserPublic | null>;
  create(data: CreateUserData): Promise<UserPublic>;
  updateActive(id: number, data: UpdateUserData): Promise<UserPublic | null>;
}
