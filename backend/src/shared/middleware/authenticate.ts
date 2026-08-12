import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ code: 'UNAUTHENTICATED', message: 'Token de acesso ausente.' });

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (typeof payload === 'string' || typeof payload.userId !== 'string') throw new Error('invalid token');
    req.userId = payload.userId;
    return next();
  } catch {
    return res.status(401).json({ code: 'UNAUTHENTICATED', message: 'Token de acesso inválido ou expirado.' });
  }
}
