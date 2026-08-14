import { notFound } from '../../../domain/shared/errors.js';
import type { GetCurrentUser } from '../../ports/inbound/auth.js';
import type { UserRepository } from '../../ports/outbound/user-repository.js';
export class GetCurrentUserUseCase implements GetCurrentUser {
  constructor(private readonly users: UserRepository) {}
  async execute(userId: string) {
    const user = await this.users.findActiveById(userId);
    if (!user) throw notFound('Usuário');
    return user;
  }
}
