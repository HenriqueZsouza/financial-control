import type { NextFunction, Request, Response } from 'express';
import type { TokenIssuer } from '../../../../application/ports/outbound/security.js';
export const authenticate = (tokens: TokenIssuer) => (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ code: 'UNAUTHENTICATED', message: 'Token de acesso ausente.' });
  try { req.userId = tokens.verify(token); return next(); }
  catch { return res.status(401).json({ code: 'UNAUTHENTICATED', message: 'Token de acesso inválido ou expirado.' }); }
};
