import 'dotenv/config';
import { createHttpApp } from './adapters/inbound/http/app.js';
import { AuthController } from './adapters/inbound/http/controllers/auth-controller.js';
import { CategoriesController } from './adapters/inbound/http/controllers/categories-controller.js';
import { DashboardController } from './adapters/inbound/http/controllers/dashboard-controller.js';
import { TransactionsController } from './adapters/inbound/http/controllers/transactions-controller.js';
import { UsersController } from './adapters/inbound/http/controllers/users-controller.js';
import { SystemClock, UuidGenerator } from './adapters/outbound/clock/system-clock.js';
import { PrismaCategoryRepository } from './adapters/outbound/prisma/prisma-category-repository.js';
import { PrismaTransactionRepository } from './adapters/outbound/prisma/prisma-transaction-repository.js';
import { PrismaUserRepository } from './adapters/outbound/prisma/prisma-user-repository.js';
import { BcryptPasswordHasher } from './adapters/outbound/security/bcrypt-password-hasher.js';
import { JwtTokenIssuer } from './adapters/outbound/security/jwt-token-issuer.js';
import { GetCurrentUserUseCase } from './application/use-cases/auth/get-current-user.js';
import { LoginUserUseCase } from './application/use-cases/auth/login-user.js';
import { RegisterUserUseCase } from './application/use-cases/auth/register-user.js';
import { ListCategoriesUseCase } from './application/use-cases/categories/list-categories.js';
import { GetDashboardSummaryUseCase } from './application/use-cases/dashboard/get-dashboard-summary.js';
import { DeleteTransactionUseCase } from './application/use-cases/transactions/delete-transaction.js';
import { CreateTransactionUseCase } from './application/use-cases/transactions/create-transaction.js';
import { GetTransactionUseCase } from './application/use-cases/transactions/get-transaction.js';
import { ListTransactionsUseCase } from './application/use-cases/transactions/list-transactions.js';
import { UpdateTransactionUseCase } from './application/use-cases/transactions/update-transaction.js';
import { UpdateCurrentUserUseCase } from './application/use-cases/users/update-current-user.js';
import { config } from './config/index.js';

const users = new PrismaUserRepository(); const categories = new PrismaCategoryRepository(); const transactions = new PrismaTransactionRepository();
const clock = new SystemClock(); const ids = new UuidGenerator(); const hasher = new BcryptPasswordHasher(); const tokens = new JwtTokenIssuer(config.jwtSecret, config.jwtExpiresIn);
const controllers = {
  auth: new AuthController(new RegisterUserUseCase(users, hasher), new LoginUserUseCase(users, hasher, tokens), new GetCurrentUserUseCase(users)),
  users: new UsersController(new UpdateCurrentUserUseCase(users, hasher)), categories: new CategoriesController(new ListCategoriesUseCase(categories)),
  transactions: new TransactionsController(new CreateTransactionUseCase(transactions, categories, clock, ids), new ListTransactionsUseCase(transactions), new GetTransactionUseCase(transactions), new UpdateTransactionUseCase(transactions, categories), new DeleteTransactionUseCase(transactions, clock)),
  dashboard: new DashboardController(new GetDashboardSummaryUseCase(transactions, clock)),
};
const app = createHttpApp(controllers, tokens, config.frontendOrigins);
app.listen(config.port, () => console.info(`API disponível em http://localhost:${config.port}`));
