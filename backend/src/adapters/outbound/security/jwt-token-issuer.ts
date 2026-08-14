import jwt from 'jsonwebtoken';
import type { TokenIssuer } from '../../../application/ports/outbound/security.js';
export class JwtTokenIssuer implements TokenIssuer {
  constructor(private readonly secret: string, private readonly expiresIn: string) {}
  sign(userId: number) { return jwt.sign({ userId }, this.secret, { expiresIn: this.expiresIn as jwt.SignOptions['expiresIn'] }); }
  verify(token: string) {
    const payload = jwt.verify(token, this.secret);
    if (typeof payload === 'string' || typeof payload.userId !== 'number' || !Number.isInteger(payload.userId) || payload.userId < 1) throw new Error('Invalid token');
    return payload.userId;
  }
}
