import bcrypt from 'bcryptjs';
import type { PasswordHasher } from '../../../application/ports/outbound/security.js';
export class BcryptPasswordHasher implements PasswordHasher {
  hash(value: string) { return bcrypt.hash(value, 12); }
  compare(value: string, hash: string) { return bcrypt.compare(value, hash); }
}
