import { z } from 'zod';
const phone = z.string().trim().min(8, 'Informe um telefone válido.').max(30);
export const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(80), lastName: z.string().trim().min(1).max(80), email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()), phone,
  password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.').max(128), confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'As senhas não coincidem.' });
export const loginSchema = z.object({ email: z.string().trim().email().transform((value) => value.toLowerCase()), password: z.string().min(1) });
export const updateUserSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(), lastName: z.string().trim().min(1).max(80).optional(), phone: z.string().trim().min(8).max(30).optional(),
  password: z.string().min(8).max(128).optional(), confirmPassword: z.string().optional(),
}).refine((data) => !data.password || data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'As senhas não coincidem.' });
