import { Router } from 'express';
import type { TokenIssuer } from '../../../../application/ports/outbound/security.js';
import { authenticate } from '../middleware/authenticate.js';
import type { AuthController } from '../controllers/auth-controller.js';
import type { CategoriesController } from '../controllers/categories-controller.js';
import type { DashboardController } from '../controllers/dashboard-controller.js';
import type { TransactionsController } from '../controllers/transactions-controller.js';
import type { UsersController } from '../controllers/users-controller.js';
import type { FamilyController } from '../controllers/family-controller.js';
import type { NotificationsController } from '../controllers/notifications-controller.js';

export interface HttpControllers {
  auth: AuthController;
  users: UsersController;
  categories: CategoriesController;
  transactions: TransactionsController;
  dashboard: DashboardController;
  family: FamilyController;
  notifications: NotificationsController;
}

export function apiRoutes(controllers: HttpControllers, tokens: TokenIssuer) {
  const router = Router();
  const protectedRoute = authenticate(tokens);

  router.post('/auth/register', controllers.auth.register);
  router.post('/auth/login', controllers.auth.login);
  router.get('/auth/me', protectedRoute, controllers.auth.me);

  router.get('/categories', protectedRoute, controllers.categories.list);

  router.get('/transactions', protectedRoute, controllers.transactions.list);
  router.post('/transactions', protectedRoute, controllers.transactions.create);
  router.get('/transactions/:id', protectedRoute, controllers.transactions.getById);
  router.patch('/transactions/:id', protectedRoute, controllers.transactions.update);
  router.delete('/transactions/:id', protectedRoute, controllers.transactions.remove);

  router.get('/dashboard/summary', protectedRoute, controllers.dashboard.summary);
  router.patch('/users/me', protectedRoute, controllers.users.updateMe);

  router.get('/family', protectedRoute, controllers.family.get);
  router.post('/family/invites', protectedRoute, controllers.family.createInvite);
  router.get('/family/invites/received', protectedRoute, controllers.family.listReceived);
  router.post('/family/invites/:id/accept', protectedRoute, controllers.family.acceptInvite);
  router.post('/family/invites/:id/decline', protectedRoute, controllers.family.declineInvite);
  router.delete('/family/members/:userId', protectedRoute, controllers.family.remove);
  router.post('/family/leave', protectedRoute, controllers.family.leave);
  router.post('/family/dissolve', protectedRoute, controllers.family.dissolve);

  router.get('/notifications', protectedRoute, controllers.notifications.list);
  router.post('/notifications/:id/read', protectedRoute, controllers.notifications.read);
  router.post('/notifications/read-all', protectedRoute, controllers.notifications.readAll);

  return router;
}
