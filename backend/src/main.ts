import 'dotenv/config';
import { createHttpApp } from './adapters/inbound/http/app.js';
import { AuthController } from './adapters/inbound/http/controllers/auth-controller.js';
import { CategoriesController } from './adapters/inbound/http/controllers/categories-controller.js';
import { CreditCardController } from './adapters/inbound/http/controllers/credit-card-controller.js';
import { DashboardController } from './adapters/inbound/http/controllers/dashboard-controller.js';
import { PayableController } from './adapters/inbound/http/controllers/payable-controller.js';
import { TransactionsController } from './adapters/inbound/http/controllers/transactions-controller.js';
import { UsersController } from './adapters/inbound/http/controllers/users-controller.js';
import { FamilyController } from './adapters/inbound/http/controllers/family-controller.js';
import { NotificationsController } from './adapters/inbound/http/controllers/notifications-controller.js';
import { TelegramIntegrationsController, TelegramWebhookController } from './adapters/inbound/http/controllers/telegram-controller.js';
import { SystemClock } from './adapters/outbound/clock/system-clock.js';
import { PrismaCategoryRepository } from './adapters/outbound/prisma/prisma-category-repository.js';
import { PrismaSequenceIdGenerator } from './adapters/outbound/prisma/prisma-sequence-id-generator.js';
import { PrismaPayableRepository } from './adapters/outbound/prisma/prisma-payable-repository.js';
import { PrismaTransactionRepository } from './adapters/outbound/prisma/prisma-transaction-repository.js';
import { PrismaUserRepository } from './adapters/outbound/prisma/prisma-user-repository.js';
import { PrismaFamilyRepository, PrismaNotificationRepository } from './adapters/outbound/prisma/prisma-family-repository.js';
import { PrismaTelegramRepository } from './adapters/outbound/prisma/prisma-telegram-repository.js';
import { BcryptPasswordHasher } from './adapters/outbound/security/bcrypt-password-hasher.js';
import { JwtTokenIssuer } from './adapters/outbound/security/jwt-token-issuer.js';
import { Sha256SecretGenerator } from './adapters/outbound/security/sha256-secret-generator.js';
import { TelegramBotApiClient } from './adapters/outbound/telegram/telegram-bot-api-client.js';
import { RuleBasedTelegramInterpreter } from './adapters/outbound/telegram/rule-based-telegram-interpreter.js';
import { GetCurrentUserUseCase } from './application/use-cases/auth/get-current-user.js';
import { LoginUserUseCase } from './application/use-cases/auth/login-user.js';
import { RegisterUserUseCase } from './application/use-cases/auth/register-user.js';
import { ListCategoriesUseCase } from './application/use-cases/categories/list-categories.js';
import { GetCreditCardReportUseCase } from './application/use-cases/credit-card/get-credit-card-report.js';
import { GetOpenCreditCardInvoiceUseCase } from './application/use-cases/credit-card/get-open-credit-card-invoice.js';
import { CloseCreditCardInvoiceUseCase } from './application/use-cases/credit-card/close-credit-card-invoice.js';
import { GetDashboardSummaryUseCase } from './application/use-cases/dashboard/get-dashboard-summary.js';
import { ListPayablesUseCase } from './application/use-cases/payables/list-payables.js';
import { DeleteTransactionUseCase } from './application/use-cases/transactions/delete-transaction.js';
import { CreateTransactionUseCase } from './application/use-cases/transactions/create-transaction.js';
import { GetTransactionUseCase } from './application/use-cases/transactions/get-transaction.js';
import { ListTransactionsUseCase } from './application/use-cases/transactions/list-transactions.js';
import { UpdateTransactionUseCase } from './application/use-cases/transactions/update-transaction.js';
import { UpdateCurrentUserUseCase } from './application/use-cases/users/update-current-user.js';
import { CreateTelegramLinkTokenUseCase, GetTelegramConnectionUseCase, ProcessTelegramUpdateUseCase, RevokeTelegramConnectionUseCase } from './application/use-cases/telegram/telegram-use-cases.js';
import {
  AcceptFamilyInviteUseCase,
  DeclineFamilyInviteUseCase,
  DissolveFamilyGroupUseCase,
  GetMyFamilyUseCase,
  InviteFamilyMemberUseCase,
  LeaveFamilyGroupUseCase,
  ListReceivedInvitesUseCase,
  RemoveFamilyMemberUseCase,
} from './application/use-cases/family/family-use-cases.js';
import {
  ListNotificationsUseCase,
  MarkAllNotificationsReadUseCase,
  MarkNotificationReadUseCase,
} from './application/use-cases/notifications/notification-use-cases.js';
import { config } from './config/index.js';

const users = new PrismaUserRepository();
const categories = new PrismaCategoryRepository();
const transactions = new PrismaTransactionRepository();
const payables = new PrismaPayableRepository();
const family = new PrismaFamilyRepository();
const notifications = new PrismaNotificationRepository();
const telegram = new PrismaTelegramRepository();
const clock = new SystemClock();
const ids = new PrismaSequenceIdGenerator();
const hasher = new BcryptPasswordHasher();
const tokens = new JwtTokenIssuer(config.jwtSecret, config.jwtExpiresIn);
const secrets = new Sha256SecretGenerator();
const createTransaction = new CreateTransactionUseCase(transactions, categories, clock, ids);

const controllers = {
  auth: new AuthController(
    new RegisterUserUseCase(users, hasher),
    new LoginUserUseCase(users, hasher, tokens),
    new GetCurrentUserUseCase(users),
  ),
  users: new UsersController(new UpdateCurrentUserUseCase(users, hasher)),
  categories: new CategoriesController(new ListCategoriesUseCase(categories)),
  transactions: new TransactionsController(
    createTransaction,
    new ListTransactionsUseCase(transactions, family),
    new GetTransactionUseCase(transactions),
    new UpdateTransactionUseCase(transactions, categories, clock),
    new DeleteTransactionUseCase(transactions, clock),
  ),
  dashboard: new DashboardController(new GetDashboardSummaryUseCase(transactions, clock)),
  creditCard: new CreditCardController(
    new GetCreditCardReportUseCase(transactions, payables, clock),
    new GetOpenCreditCardInvoiceUseCase(transactions, clock),
    new CloseCreditCardInvoiceUseCase(transactions, payables, clock),
  ),
  payables: new PayableController(new ListPayablesUseCase(payables, clock)),
  family: new FamilyController(
    new GetMyFamilyUseCase(family),
    new InviteFamilyMemberUseCase(family, users, notifications, clock),
    new ListReceivedInvitesUseCase(family),
    new AcceptFamilyInviteUseCase(family, notifications, clock),
    new DeclineFamilyInviteUseCase(family, notifications, clock),
    new RemoveFamilyMemberUseCase(family, notifications, clock),
    new LeaveFamilyGroupUseCase(family, clock),
    new DissolveFamilyGroupUseCase(family, notifications, clock),
  ),
  notifications: new NotificationsController(
    new ListNotificationsUseCase(notifications),
    new MarkNotificationReadUseCase(notifications, clock),
    new MarkAllNotificationsReadUseCase(notifications, clock),
  ),
  telegram: new TelegramIntegrationsController(
    new CreateTelegramLinkTokenUseCase(telegram, secrets, clock, config.telegramEnabled, config.telegramBotUsername ?? ''),
    new GetTelegramConnectionUseCase(telegram),
    new RevokeTelegramConnectionUseCase(telegram, clock),
  ),
};

const telegramWebhook = config.telegramEnabled
  ? new TelegramWebhookController(
    new ProcessTelegramUpdateUseCase(telegram, new TelegramBotApiClient(config.telegramBotToken!), new RuleBasedTelegramInterpreter(), categories, createTransaction, clock, secrets),
    config.telegramWebhookSecret!,
  )
  : undefined;
const app = createHttpApp(controllers, tokens, config.frontendOrigins, config.swaggerEnabled, telegramWebhook);
app.listen(config.port, () => console.info(`API disponível em http://localhost:${config.port}`));
