import { DomainError, notFound } from '../../../domain/shared/errors.js';
import type { UpdateCurrentUser, UpdateCurrentUserInput } from '../../ports/inbound/auth.js';
import type { PasswordHasher } from '../../ports/outbound/security.js';
import type { UpdateUserData, UserRepository } from '../../ports/outbound/user-repository.js';

export class UpdateCurrentUserUseCase implements UpdateCurrentUser {
  constructor(private readonly users: UserRepository, private readonly hasher: PasswordHasher) {}
  async execute(userId: number, input: UpdateCurrentUserInput) {
    if (!(await this.users.findActiveById(userId))) throw notFound('Usuário');
    const data: UpdateUserData = {};
    if (input.firstName !== undefined) data.firstName = input.firstName;
    if (input.lastName !== undefined) data.lastName = input.lastName;
    if (input.phone !== undefined) data.phone = input.phone;
    if (input.password !== undefined) data.passwordHash = await this.hasher.hash(input.password);
    if (Object.keys(data).length === 0) throw new DomainError('NO_CHANGES', 'Informe ao menos um campo para atualizar.');
    const user = await this.users.updateActive(userId, data);
    if (!user) throw notFound('Usuário');
    return user;
  }
}
