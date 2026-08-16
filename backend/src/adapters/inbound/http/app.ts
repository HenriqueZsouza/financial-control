import express from 'express';
import cors from 'cors';
import type { TokenIssuer } from '../../../application/ports/outbound/security.js';
import { errorHandler } from './presenters/error-presenter.js';
import { apiRoutes, type HttpControllers } from './routes/api-routes.js';
import { registerSwagger } from './openapi/register-swagger.js';
export function createHttpApp(controllers: HttpControllers, tokens: TokenIssuer, frontendOrigins: string[], swaggerEnabled = true) {
  const app = express();
  app.use(cors({ origin: frontendOrigins, credentials: false })); app.use(express.json({ limit: '1mb' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
  if (swaggerEnabled) registerSwagger(app);
  app.use('/api', apiRoutes(controllers, tokens));
  app.use((_req, res) => res.status(404).json({ code: 'NOT_FOUND', message: 'Rota não encontrada.' })); app.use(errorHandler);
  return app;
}
