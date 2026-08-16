import { DomainError } from '../../../domain/shared/errors.js';
import { emailOf } from '../../../domain/user/email.js';
import type { LoginUser, LoginUserInput } from '../../ports/inbound/auth.js';
import type { PasswordHasher, TokenIssuer } from '../../ports/outbound/security.js';
import type { UserRepository } from '../../ports/outbound/user-repository.js';

export class LoginUserUseCase implements LoginUser {
  constructor(private readonly users: UserRepository, private readonly hasher: PasswordHasher, private readonly tokens: TokenIssuer) {}
  async execute(input: LoginUserInput) {
    const user = await this.users.findByEmail(emailOf(input.email));
    if (!user || user.deletedAt || !(await this.hasher.compare(input.password, user.passwordHash))) {
      throw new DomainError('INVALID_CREDENTIALS', 'Email ou senha inválidos.');
    }
    const { passwordHash: _passwordHash, deletedAt: _deletedAt, ...publicUser } = user;
    return { token: this.tokens.sign(user.id), user: publicUser };
  }
}
