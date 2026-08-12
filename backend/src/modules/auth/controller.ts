import type { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../shared/prisma';
import { AppError, notFound } from '../../shared/http';
import { config } from '../../shared/config';

const phone = z.string().trim().min(8, 'Informe um telefone válido.').max(30);
const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  phone,
  password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.').max(128),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'As senhas não coincidem.' });

const loginSchema = z.object({ email: z.string().trim().email().transform((v) => v.toLowerCase()), password: z.string().min(1) });

const userSelect = { id: true, firstName: true, lastName: true, email: true, phone: true, createdAt: true, updatedAt: true } as const;
const sign = (userId: string) => jwt.sign({ userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] });

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const input = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'Já existe uma conta com este email.');
    const { confirmPassword: _confirmPassword, password, ...data } = input;
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { ...data, passwordHash }, select: userSelect });
    return res.status(201).json({ user });
  } catch (error) { return next(error); }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || user.deletedAt || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email ou senha inválidos.');
    }
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return res.json({ token: sign(user.id), user: safeUser });
  } catch (error) { return next(error); }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findFirst({ where: { id: req.userId, deletedAt: null }, select: userSelect });
    if (!user) throw notFound('Usuário');
    return res.json({ user });
  } catch (error) { return next(error); }
}
