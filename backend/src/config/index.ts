import { z } from 'zod';
const schema = z.object({ PORT: z.coerce.number().int().positive().default(3333), DATABASE_URL: z.string().url(), JWT_SECRET: z.string().min(16), JWT_EXPIRES_IN: z.string().default('7d'), FRONTEND_URL: z.string().default('http://localhost:3000,http://localhost:3001') });
const parsed = schema.safeParse(process.env);
if (!parsed.success) { console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors); throw new Error('Invalid environment configuration'); }
const frontendOrigins = parsed.data.FRONTEND_URL.split(',').map((origin) => origin.trim()).filter(Boolean);
for (const origin of frontendOrigins) if (!z.string().url().safeParse(origin).success) throw new Error(`Invalid FRONTEND_URL origin: ${origin}`);
export const config = { port: parsed.data.PORT, jwtSecret: parsed.data.JWT_SECRET, jwtExpiresIn: parsed.data.JWT_EXPIRES_IN, frontendOrigins };
