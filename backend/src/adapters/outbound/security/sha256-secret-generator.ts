import { createHash, randomBytes } from 'node:crypto';
import type { SecretGenerator } from '../../../application/ports/outbound/security.js';

export class Sha256SecretGenerator implements SecretGenerator {
  generate() { return randomBytes(24).toString('base64url'); }
  hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
}
