import type { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../shared/prisma';
import { AppError, notFound } from '../../shared/http';

const schema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().min(8).max(30).optional(),
  password: z.string().min(8).max(128).optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => !data.password || data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'As senhas não coincidem.' });

export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const input = schema.parse(req.body);
    const existing = await prisma.user.findFirst({ where: { id: req.userId, deletedAt: null } });
    if (!existing) throw notFound('Usuário');
    const { password, confirmPassword: _confirmPassword, ...profile } = input;
    const data: { firstName?: string; lastName?: string; phone?: string; passwordHash?: string } = profile;
    if (password) data.passwordHash = await bcrypt.hash(password, 12);
    if (Object.keys(data).length === 0) throw new AppError(400, 'NO_CHANGES', 'Informe ao menos um campo para atualizar.');
    const user = await prisma.user.update({
      where: { id: existing.id }, data,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, createdAt: true, updatedAt: true },
    });
    return res.json({ user });
  } catch (error) { return next(error); }
}
