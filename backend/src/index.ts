import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { validateConfig } from './shared/config';

dotenv.config();
validateConfig();

import { config } from './shared/config';
import authRoutes from './modules/auth/routes';
import categoriesRoutes from './modules/categories/routes';
import transactionsRoutes from './modules/transactions/routes';
import dashboardRoutes from './modules/dashboard/routes';
import usersRoutes from './modules/users/routes';
import { authenticate } from './shared/middleware/authenticate';

const app = express();

// Middleware
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Auth routes (public)
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/categories', authenticate, categoriesRoutes);
app.use('/api/transactions', authenticate, transactionsRoutes);
app.use('/api/dashboard', authenticate, dashboardRoutes);
app.use('/api/users', authenticate, usersRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`�������������������������������������������������������������������������������������������������������������������������🚀 Server running on http://localhost:${PORT}`);
});