import { DomainError } from '../../../domain/shared/errors.js';
import { emailOf } from '../../../domain/user/email.js';
import type { RegisterUser, RegisterUserInput } from '../../ports/inbound/auth.js';
import type { PasswordHasher } from '../../ports/outbound/security.js';
import type { UserRepository } from '../../ports/outbound/user-repository.js';

export class RegisterUserUseCase implements RegisterUser {
  constructor(private readonly users: UserRepository, private readonly hasher: PasswordHasher) {}
  async execute(input: RegisterUserInput) {
    const email = emailOf(input.email);
    if (await this.users.findByEmail(email)) throw new DomainError('EMAIL_ALREADY_EXISTS', 'Já existe uma conta com este email.');
    const { password, ...profile } = input;
    return this.users.create({ ...profile, email, passwordHash: await this.hasher.hash(password) });
  }
}
