import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.BACKEND_PORT || '3333', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL,
} as const;

export function validateConfig() {
  const required = ['databaseUrl', 'jwtSecret'];
  const missing = required.filter((key) => !config[key as keyof typeof config]);
  if (missing.length > 0) {
    throw new Error(`Configurações obrigatórias ausentes: ${missing.join(', ')}`);
  }
  if (config.jwtSecret.length < 32) {
    console.warn('⚠️  JWT_SECRET deve ter pelo menos 32 caracteres em produção');
  }
}