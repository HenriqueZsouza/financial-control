import assert from 'node:assert/strict';
import test from 'node:test';
import { DomainError } from '../../domain/shared/errors.js';
import { periodOf } from '../../domain/shared/period.js';
import { isCashExpense, splitInstallments } from '../../domain/transaction/transaction.js';
import type { CategoryRepository } from '../ports/outbound/category-repository.js';
import type { Clock, IdGenerator, PasswordHasher, TokenIssuer } from '../ports/outbound/security.js';
import type { CloseInvoiceData, PayableRepository } from '../ports/outbound/payable-repository.js';
import type { CreateTransactionData, TransactionRepository } from '../ports/outbound/transaction-repository.js';
import type { CreateUserData, UpdateUserData, UserRepository } from '../ports/outbound/user-repository.js';
import type { Payable } from '../../domain/payable/payable.js';
import { RegisterUserUseCase } from './auth/register-user.js';
import { LoginUserUseCase } from './auth/login-user.js';
import { GetCurrentUserUseCase } from './auth/get-current-user.js';
import { UpdateCurrentUserUseCase } from './users/update-current-user.js';
import { CreateTransactionUseCase } from './transactions/create-transaction.js';
import { UpdateTransactionUseCase } from './transactions/update-transaction.js';
import { GetTransactionUseCase } from './transactions/get-transaction.js';
import { DeleteTransactionUseCase } from './transactions/delete-transaction.js';
import { ListTransactionsUseCase } from './transactions/list-transactions.js';
import { GetDashboardSummaryUseCase } from './dashboard/get-dashboard-summary.js';
import { GetCreditCardReportUseCase } from './credit-card/get-credit-card-report.js';
import { GetOpenCreditCardInvoiceUseCase } from './credit-card/get-open-credit-card-invoice.js';
import { CloseCreditCardInvoiceUseCase } from './credit-card/close-credit-card-invoice.js';
import { ListPayablesUseCase } from './payables/list-payables.js';

const fixedClock: Clock = { now: () => new Date('2026-08-13T12:34:56.000Z') };
const hasher: PasswordHasher = { hash: async (value) => `hash:${value}`, compare: async (value, hash) => hash === `hash:${value}` };
const tokens: TokenIssuer = { sign: (id) => `token:${id}`, verify: (token) => Number(token.slice(6)) };
const ids: IdGenerator = { generate: async () => 1 };
const publicUser = { id: 1, firstName: 'Ana', lastName: 'Silva', email: 'ana@example.com', phone: '11999999999', createdAt: fixedClock.now(), updatedAt: fixedClock.now() };
class Users implements UserRepository {
  user: ({ passwordHash: string; deletedAt: Date | null } & typeof publicUser) | null = null;
  async findByEmail(email: string) { return this.user?.email === email ? this.user : null; }
  async findActiveById(id: number) { return this.user?.id === id && !this.user.deletedAt ? publicUser : null; }
  async create(data: CreateUserData) { this.user = { ...publicUser, ...data, id: 1, createdAt: fixedClock.now(), updatedAt: fixedClock.now(), deletedAt: null }; return publicUser; }
  async updateActive(id: number, data: UpdateUserData) { if (!this.user || this.user.id !== id || this.user.deletedAt) return null; Object.assign(this.user, data); return { ...publicUser, ...data }; }
}
class Categories implements CategoryRepository { async list() { return []; } async exists(id: number) { return id === 1; } }
class Transactions implements TransactionRepository {
  created: CreateTransactionData[] = [];
  items: Array<CreateTransactionData & { id: number; createdAt: Date; updatedAt: Date; deletedAt: Date | null; payableId: number | null }> = [];
  current: any = null;
  deleted = false;
  summaryResult = {
    totalIncome: 5000,
    totalExpense: 1800,
    totalInvestment: 0,
    openingBalance: 0,
    byCategory: [{ categoryId: 1, name: 'Mercado', total: 1800 }],
  };

  async create(data: CreateTransactionData) {
    const row = {
      id: this.items.length + 1,
      ...data,
      payableId: null,
      createdAt: fixedClock.now(),
      updatedAt: fixedClock.now(),
      deletedAt: null,
    };
    this.created.push(data);
    this.items.push(row);
    return row;
  }

  async createMany(data: CreateTransactionData[]) {
    return Promise.all(data.map((item) => this.create(item)));
  }

  async list(userId: number, filters: Parameters<TransactionRepository['list']>[1] = {}) {
    return this.items.filter((item) => {
      if (item.deletedAt) return false;
      if (filters.userIds ? !filters.userIds.includes(item.userId) : item.userId !== userId) return false;
      if (filters.type && item.type !== filters.type) return false;
      if (filters.paymentTypes?.length && !filters.paymentTypes.includes(item.paymentType)) return false;
      if (filters.period && (item.date < filters.period.start || item.date >= filters.period.end)) return false;
      if (filters.categoryIds?.length && !filters.categoryIds.includes(item.categoryId)) return false;
      return true;
    }) as any;
  }

  async findActiveById(userId: number, id: number) {
    return this.current?.id === id && this.current.userId === userId && !this.current.deletedAt ? this.current : null;
  }

  async update(_id: number, data: any) {
    return { ...this.current, ...data };
  }

  async softDelete(_id: number) {
    this.deleted = true;
  }

  async summary(userId: number, period?: Parameters<TransactionRepository['summary']>[1]) {
    if (!this.items.length) return this.summaryResult;
    const rows = this.items.filter((item) => !item.deletedAt && item.userId === userId);
    const inPeriod = period
      ? rows.filter((item) => item.date >= period.start && item.date < period.end)
      : rows;
    const prior = period ? rows.filter((item) => item.date < period.start) : [];
    const sum = (list: typeof rows) => list.reduce((total, item) => total + item.amount, 0);
    const cash = (list: typeof rows) => list.filter((item) => isCashExpense(item.type, item.paymentType));
    const expenseRows = cash(inPeriod);
    const byCategoryMap = new Map<number, number>();
    for (const item of expenseRows) {
      byCategoryMap.set(item.categoryId, (byCategoryMap.get(item.categoryId) ?? 0) + item.amount);
    }
    return {
      totalIncome: sum(inPeriod.filter((item) => item.type === 'INCOME')),
      totalExpense: sum(expenseRows),
      totalInvestment: sum(inPeriod.filter((item) => item.type === 'INVESTMENT')),
      openingBalance: sum(prior.filter((item) => item.type === 'INCOME')) - sum(cash(prior)),
      byCategory: [...byCategoryMap.entries()].map(([categoryId, total]) => ({
        categoryId,
        name: 'Mercado',
        total,
      })),
    };
  }

  async listOpenCreditCard(userId: number, now: Date) {
    return this.items.filter((item) => {
      if (item.deletedAt) return false;
      if (item.userId !== userId) return false;
      if (item.paymentType !== 'CREDIT_1X' && item.paymentType !== 'INSTALLMENT') return false;
      if (item.payableId != null) return false;
      if (item.date > now) return false;
      return true;
    }) as any;
  }
}

class Payables implements PayableRepository {
  items: Payable[] = [];

  constructor(private readonly transactions: Transactions) {}

  async closeInvoice(data: CloseInvoiceData) {
    const open = this.transactions.items.filter((item) => (
      data.transactionIds.includes(item.id)
      && item.payableId == null
      && !item.deletedAt
    ));
    if (!open.length) {
      throw new DomainError('EMPTY_OPEN_INVOICE', 'Não há compras em aberto para fechar a fatura.');
    }
    const amount = open.reduce((sum, item) => sum + item.amount, 0);
    const payable: Payable = {
      id: this.items.length + 1,
      userId: data.userId,
      name: data.name,
      amount,
      dueDate: data.dueDate,
      source: 'CREDIT_CARD_INVOICE',
      status: 'PENDING',
      closedAt: data.closedAt,
      createdAt: data.closedAt,
      updatedAt: data.closedAt,
      deletedAt: null,
    };
    this.items.push(payable);
    for (const item of open) {
      item.payableId = payable.id;
    }
    return payable;
  }

  async list(userId: number, period: { start: Date; end: Date }) {
    return this.items
      .filter((item) => (
        item.userId === userId
        && !item.deletedAt
        && item.dueDate >= period.start
        && item.dueDate < period.end
      ))
      .sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime() || left.id - right.id);
  }
}
const expectsDomainError = async (run: () => Promise<unknown>, code: string) => assert.rejects(run, (error: unknown) => error instanceof DomainError && error.code === code);

test('auth: registra sem expor hash, autentica e protege usuário removido', async () => {
  const users = new Users(); const register = new RegisterUserUseCase(users, hasher);
  const created = await register.execute({ firstName: 'Ana', lastName: 'Silva', email: 'ana@example.com', phone: '11999999999', password: 'senha-segura' });
  assert.equal('passwordHash' in created, false); assert.equal(users.user?.passwordHash, 'hash:senha-segura');
  await expectsDomainError(() => register.execute({ firstName: 'A', lastName: 'B', email: 'ana@example.com', phone: '11999999999', password: 'senha-segura' }), 'EMAIL_ALREADY_EXISTS');
  assert.deepEqual(await new LoginUserUseCase(users, hasher, tokens).execute({ email: 'ana@example.com', password: 'senha-segura' }), { token: 'token:1', user: publicUser });
  users.user!.deletedAt = fixedClock.now();
  await expectsDomainError(() => new LoginUserUseCase(users, hasher, tokens).execute({ email: 'ana@example.com', password: 'senha-segura' }), 'INVALID_CREDENTIALS');
  await expectsDomainError(() => new GetCurrentUserUseCase(users).execute(1), 'NOT_FOUND');
});

test('users: exige mudança e aplica hash à nova senha', async () => {
  const users = new Users(); await users.create({ ...publicUser, passwordHash: 'hash:old' });
  const update = new UpdateCurrentUserUseCase(users, hasher);
  await expectsDomainError(() => update.execute(1, {}), 'NO_CHANGES');
  await update.execute(1, { firstName: 'Bea', password: 'nova-senha' });
  assert.equal(users.user?.firstName, 'Bea'); assert.equal(users.user?.passwordHash, 'hash:nova-senha');
});

test('parcelas preservam centavos e meses, e cash gera um lançamento', async () => {
  assert.deepEqual(splitInstallments(100, 3, new Date('2026-01-15T00:00:00Z')).map((item) => item.amount), [33, 33, 34]);
  const repository = new Transactions(); const create = new CreateTransactionUseCase(repository, new Categories(), fixedClock, ids);
  const installment = await create.execute(1, { type: 'EXPENSE', name: 'Compra', amount: 100, categoryId: 1, paymentType: 'INSTALLMENT', installmentsCount: 3, date: new Date('2026-01-15T00:00:00Z') });
  assert.equal(installment.length, 3); assert.equal(repository.created.reduce((sum, item) => sum + item.amount, 0), 100); assert.deepEqual(repository.created.map((item) => item.date.getUTCMonth()), [0, 1, 2]);
  assert.deepEqual(repository.created.map((item) => item.date.getUTCHours()), [12, 12, 12]);
  assert.deepEqual(repository.created.map((item) => item.date.getUTCMinutes()), [34, 34, 34]);
  repository.created = [];
  await create.execute(1, { type: 'INCOME', name: 'Salário', amount: 1000, categoryId: 1, paymentType: 'CASH' });
  assert.equal(repository.created[0].installmentsCount, null);
  assert.equal(repository.created[0].date.toISOString(), '2026-08-13T12:34:56.000Z');
  repository.created = [];
  const timed = await create.execute(1, { type: 'EXPENSE', name: 'Uber', amount: 2500, categoryId: 1, paymentType: 'CASH', date: new Date('2026-02-10T18:22:11.000Z') });
  assert.equal(timed[0].date.toISOString(), '2026-02-10T18:22:11.000Z');
  repository.created = [];
  const credit = await create.execute(1, { type: 'EXPENSE', name: 'Restaurante', amount: 8500, categoryId: 1, paymentType: 'CREDIT_1X', date: new Date('2026-02-10T00:00:00Z') });
  assert.equal(credit.length, 1);
  assert.equal(credit[0].paymentType, 'CREDIT_1X');
  assert.equal(credit[0].installmentsCount, null);
  assert.equal(credit[0].date.toISOString(), '2026-02-10T12:34:56.000Z');
  await expectsDomainError(() => create.execute(1, { type: 'INCOME', name: 'X', amount: 1, categoryId: 99, paymentType: 'CASH' }), 'INVALID_CATEGORY');
});

test('transações isolam usuário, restringem parcela e fazem soft delete', async () => {
  const repo = new Transactions(); repo.current = { id: 1, userId: 1, installmentGroupId: 1, deletedAt: null };
  await expectsDomainError(() => new GetTransactionUseCase(repo).execute(2, 1), 'NOT_FOUND');
  const update = new UpdateTransactionUseCase(repo, new Categories(), fixedClock);
  await expectsDomainError(() => update.execute(1, 1, { amount: 2 }), 'INSTALLMENT_RESTRICTION');
  repo.current.installmentGroupId = null;
  await expectsDomainError(() => update.execute(1, 1, { paymentType: 'INSTALLMENT' }), 'PAYMENT_TYPE_RESTRICTION');
  await new DeleteTransactionUseCase(repo, fixedClock).execute(1, 1); assert.equal(repo.deleted, true);
});

test('dashboard usa o período atual, calcula saldo e expõe investimentos à parte', async () => {
  const repo = new Transactions();
  const summary = await new GetDashboardSummaryUseCase(repo, fixedClock).execute(1);
  assert.deepEqual(summary, {
    period: { month: 8, year: 2026 },
    totalIncome: 5000,
    totalExpense: 1800,
    totalInvestment: 0,
    openingBalance: 0,
    balance: 3200,
    byCategory: [{ categoryId: 1, name: 'Mercado', total: 1800 }],
  });
  repo.summaryResult = {
    totalIncome: 5000,
    totalExpense: 1800,
    totalInvestment: 2000,
    openingBalance: 0,
    byCategory: [{ categoryId: 1, name: 'Mercado', total: 1800 }],
  };
  const withInvestment = await new GetDashboardSummaryUseCase(repo, fixedClock).execute(1);
  assert.equal(withInvestment.totalInvestment, 2000);
  assert.equal(withInvestment.balance, 3200);
  repo.summaryResult = {
    totalIncome: 0,
    totalExpense: 0,
    totalInvestment: 0,
    openingBalance: 30000,
    byCategory: [],
  };
  const inherited = await new GetDashboardSummaryUseCase(repo, fixedClock).execute(1);
  assert.equal(inherited.openingBalance, 30000);
  assert.equal(inherited.balance, 30000);
  repo.summaryResult = {
    totalIncome: 10000,
    totalExpense: 4000,
    totalInvestment: 0,
    openingBalance: -15000,
    byCategory: [],
  };
  const negative = await new GetDashboardSummaryUseCase(repo, fixedClock).execute(1);
  assert.equal(negative.balance, -9000);
  assert.equal(periodOf(2, 2026).start.toISOString(), '2026-02-01T00:00:00.000Z');
});

test('investimento à vista e parcelado; listagem isola o tipo', async () => {
  const repository = new Transactions();
  const create = new CreateTransactionUseCase(repository, new Categories(), fixedClock, ids);
  const cash = await create.execute(1, {
    type: 'INVESTMENT',
    name: 'Tesouro',
    amount: 100000,
    categoryId: 1,
    paymentType: 'CASH',
  });
  assert.equal(cash.length, 1);
  assert.equal(cash[0].type, 'INVESTMENT');
  repository.created = [];
  const installment = await create.execute(1, {
    type: 'INVESTMENT',
    name: 'CDB',
    amount: 100,
    categoryId: 1,
    paymentType: 'INSTALLMENT',
    installmentsCount: 3,
    date: new Date('2026-01-15T00:00:00Z'),
  });
  assert.equal(installment.length, 3);
  assert.ok(installment.every((item) => item.type === 'INVESTMENT'));
  const list = new ListTransactionsUseCase(repository);
  const investments = await list.execute(1, { type: 'INVESTMENT' });
  assert.equal(investments.length, 4);
  assert.ok(investments.every((item) => item.type === 'INVESTMENT'));
  const expenses = await list.execute(1, { type: 'EXPENSE' });
  assert.equal(expenses.length, 0);
});

test('relatório de cartão agrupa 1x e parcelas, ignora cash, outro usuário e soft delete', async () => {
  const repo = new Transactions();
  const august = new Date('2026-08-10T12:00:00.000Z');
  const stamp = { createdAt: fixedClock.now(), updatedAt: fixedClock.now(), deletedAt: null as Date | null, payableId: null as number | null };
  repo.items = [
    { id: 1, userId: 1, categoryId: 1, type: 'EXPENSE', name: 'Restaurante', amount: 8500, paymentType: 'CREDIT_1X', installmentsCount: null, installmentGroupId: null, installmentNumber: null, date: august, ...stamp },
    { id: 2, userId: 1, categoryId: 1, type: 'EXPENSE', name: 'Notebook', amount: 30000, paymentType: 'INSTALLMENT', installmentsCount: 12, installmentGroupId: 1, installmentNumber: 2, date: august, ...stamp },
    { id: 3, userId: 1, categoryId: 1, type: 'EXPENSE', name: 'Mercado', amount: 15000, paymentType: 'CASH', installmentsCount: null, installmentGroupId: null, installmentNumber: null, date: august, ...stamp },
    { id: 4, userId: 1, categoryId: 1, type: 'INVESTMENT', name: 'ETF', amount: 5000, paymentType: 'CREDIT_1X', installmentsCount: null, installmentGroupId: null, installmentNumber: null, date: august, ...stamp },
    { id: 5, userId: 1, categoryId: 1, type: 'EXPENSE', name: 'Julho', amount: 1000, paymentType: 'CREDIT_1X', installmentsCount: null, installmentGroupId: null, installmentNumber: null, date: new Date('2026-07-10T12:00:00.000Z'), ...stamp },
    { id: 6, userId: 2, categoryId: 1, type: 'EXPENSE', name: 'Outro', amount: 9999, paymentType: 'CREDIT_1X', installmentsCount: null, installmentGroupId: null, installmentNumber: null, date: august, ...stamp },
    { id: 7, userId: 1, categoryId: 1, type: 'EXPENSE', name: 'Apagado', amount: 1111, paymentType: 'CREDIT_1X', installmentsCount: null, installmentGroupId: null, installmentNumber: null, date: august, ...stamp, deletedAt: fixedClock.now() },
  ];
  const report = await new GetCreditCardReportUseCase(repo, fixedClock).execute(1, periodOf(8, 2026));
  assert.equal(report.totalCredit1x, 13500);
  assert.equal(report.totalInstallment, 30000);
  assert.equal(report.total, 43500);
  assert.equal(report.credit1xCount, 2);
  assert.equal(report.installmentCount, 1);
  assert.equal(report.credit1x.some((item) => item.paymentType === 'CASH'), false);
  assert.ok(report.credit1x.some((item) => item.type === 'INVESTMENT'));
  const current = await new GetCreditCardReportUseCase(repo, fixedClock).execute(1);
  assert.deepEqual(current.period, { month: 8, year: 2026 });
});

test('despesa no cartão não entra em totalExpense nem reduz o saldo', async () => {
  const repo = new Transactions();
  const august = new Date('2026-08-10T12:00:00.000Z');
  const stamp = { createdAt: fixedClock.now(), updatedAt: fixedClock.now(), deletedAt: null as Date | null, payableId: null as number | null };
  repo.items = [
    { id: 1, userId: 1, categoryId: 1, type: 'EXPENSE', name: 'Mercado', amount: 1800, paymentType: 'CASH', installmentsCount: null, installmentGroupId: null, installmentNumber: null, date: august, ...stamp },
    { id: 2, userId: 1, categoryId: 1, type: 'EXPENSE', name: 'Restaurante', amount: 8500, paymentType: 'CREDIT_1X', installmentsCount: null, installmentGroupId: null, installmentNumber: null, date: august, ...stamp },
    { id: 3, userId: 1, categoryId: 1, type: 'EXPENSE', name: 'Parcela', amount: 30000, paymentType: 'INSTALLMENT', installmentsCount: 12, installmentGroupId: 1, installmentNumber: 2, date: august, ...stamp },
    { id: 4, userId: 1, categoryId: 1, type: 'INCOME', name: 'Salário', amount: 5000, paymentType: 'CASH', installmentsCount: null, installmentGroupId: null, installmentNumber: null, date: august, ...stamp },
  ];
  const summary = await new GetDashboardSummaryUseCase(repo, fixedClock).execute(1, periodOf(8, 2026));
  assert.equal(isCashExpense('EXPENSE', 'CASH'), true);
  assert.equal(isCashExpense('EXPENSE', 'CREDIT_1X'), false);
  assert.equal(isCashExpense('EXPENSE', 'INSTALLMENT'), false);
  assert.equal(summary.totalIncome, 5000);
  assert.equal(summary.totalExpense, 1800);
  assert.equal(summary.balance, 3200);
  assert.deepEqual(summary.byCategory, [{ categoryId: 1, name: 'Mercado', total: 1800 }]);
});

test('fatura em aberto ignora cash, futuro, fechado, outro usuário e soft delete', async () => {
  const repo = new Transactions();
  const now = fixedClock.now();
  const stamp = { createdAt: now, updatedAt: now, deletedAt: null as Date | null, payableId: null as number | null };
  repo.items = [
    { id: 1, userId: 1, categoryId: 1, type: 'EXPENSE', name: 'Restaurante', amount: 8500, paymentType: 'CREDIT_1X', installmentsCount: null, installmentGroupId: null, installmentNumber: null, date: now, ...stamp },
    { id: 2, userId: 1, categoryId: 1, type: 'EXPENSE', name: 'Parcela futura', amount: 30000, paymentType: 'INSTALLMENT', installmentsCount: 12, installmentGroupId: 1, installmentNumber: 5, date: new Date('2026-09-13T12:34:56.000Z'), ...stamp },
    { id: 3, userId: 1, categoryId: 1, type: 'EXPENSE', name: 'Mercado', amount: 15000, paymentType: 'CASH', installmentsCount: null, installmentGroupId: null, installmentNumber: null, date: now, ...stamp },
    { id: 4, userId: 1, categoryId: 1, type: 'EXPENSE', name: 'Já fechada', amount: 5000, paymentType: 'CREDIT_1X', installmentsCount: null, installmentGroupId: null, installmentNumber: null, date: now, ...stamp, payableId: 9 },
    { id: 5, userId: 1, categoryId: 1, type: 'EXPENSE', name: 'Julho', amount: 1000, paymentType: 'CREDIT_1X', installmentsCount: null, installmentGroupId: null, installmentNumber: null, date: new Date('2026-07-10T12:00:00.000Z'), ...stamp },
    { id: 6, userId: 2, categoryId: 1, type: 'EXPENSE', name: 'Outro', amount: 9999, paymentType: 'CREDIT_1X', installmentsCount: null, installmentGroupId: null, installmentNumber: null, date: now, ...stamp },
    { id: 7, userId: 1, categoryId: 1, type: 'EXPENSE', name: 'Apagado', amount: 1111, paymentType: 'CREDIT_1X', installmentsCount: null, installmentGroupId: null, installmentNumber: null, date: now, ...stamp, deletedAt: now },
  ];
  const open = await new GetOpenCreditCardInvoiceUseCase(repo, fixedClock).execute(1);
  assert.equal(open.total, 9500);
  assert.equal(open.credit1xCount, 2);
  assert.equal(open.installmentCount, 0);
  assert.equal(open.itemCount, 2);
});

test('fechar fatura cria conta a pagar, esvazia aberto e não muda o saldo', async () => {
  const repo = new Transactions();
  const payables = new Payables(repo);
  const now = fixedClock.now();
  const stamp = { createdAt: now, updatedAt: now, deletedAt: null as Date | null, payableId: null as number | null };
  repo.items = [
    { id: 1, userId: 1, categoryId: 1, type: 'EXPENSE', name: 'Restaurante', amount: 8500, paymentType: 'CREDIT_1X', installmentsCount: null, installmentGroupId: null, installmentNumber: null, date: now, ...stamp },
    { id: 2, userId: 1, categoryId: 1, type: 'EXPENSE', name: 'Parcela', amount: 30000, paymentType: 'INSTALLMENT', installmentsCount: 12, installmentGroupId: 1, installmentNumber: 2, date: now, ...stamp },
    { id: 3, userId: 1, categoryId: 1, type: 'EXPENSE', name: 'Futura', amount: 30000, paymentType: 'INSTALLMENT', installmentsCount: 12, installmentGroupId: 1, installmentNumber: 5, date: new Date('2026-09-13T12:34:56.000Z'), ...stamp },
  ];
  repo.summaryResult = {
    totalIncome: 5000,
    totalExpense: 38500,
    totalInvestment: 0,
    openingBalance: 0,
    byCategory: [],
  };
  const close = new CloseCreditCardInvoiceUseCase(repo, payables, fixedClock);
  const payable = await close.execute(1, { dueDate: new Date('2026-09-10T00:00:00.000Z') });
  assert.equal(payable.amount, 38500);
  assert.equal(payable.source, 'CREDIT_CARD_INVOICE');
  assert.equal(payable.status, 'PENDING');
  assert.equal(payable.name, 'Fatura do cartão · venc. 10/09/2026');
  assert.equal(repo.items[0].payableId, payable.id);
  assert.equal(repo.items[1].payableId, payable.id);
  assert.equal(repo.items[2].payableId, null);
  const after = await new GetOpenCreditCardInvoiceUseCase(repo, fixedClock).execute(1);
  assert.equal(after.total, 0);
  const summary = await new GetDashboardSummaryUseCase(repo, fixedClock).execute(1);
  assert.equal(summary.totalExpense, 0);
  assert.equal(summary.balance, 0);
  await expectsDomainError(() => close.execute(1, { dueDate: new Date('2026-09-10T00:00:00.000Z') }), 'EMPTY_OPEN_INVOICE');

  const laterClock: Clock = { now: () => new Date('2026-09-13T12:34:56.000Z') };
  const laterOpen = await new GetOpenCreditCardInvoiceUseCase(repo, laterClock).execute(1);
  assert.equal(laterOpen.total, 30000);
  assert.equal(laterOpen.installmentCount, 1);
});

test('contas a pagar filtram pelo mês do vencimento e usam o relógio quando o período é omitido', async () => {
  const repo = new Transactions();
  const payables = new Payables(repo);
  const due = new Date('2026-09-10T00:00:00.000Z');
  payables.items = [{
    id: 1,
    userId: 1,
    name: 'Fatura do cartão · venc. 10/09/2026',
    amount: 43500,
    dueDate: due,
    source: 'CREDIT_CARD_INVOICE',
    status: 'PENDING',
    closedAt: fixedClock.now(),
    createdAt: fixedClock.now(),
    updatedAt: fixedClock.now(),
    deletedAt: null,
  }, {
    id: 2,
    userId: 2,
    name: 'Outro usuário',
    amount: 100,
    dueDate: due,
    source: 'CREDIT_CARD_INVOICE',
    status: 'PENDING',
    closedAt: fixedClock.now(),
    createdAt: fixedClock.now(),
    updatedAt: fixedClock.now(),
    deletedAt: null,
  }];
  const list = new ListPayablesUseCase(payables, fixedClock);
  const september = await list.execute(1, periodOf(9, 2026));
  assert.equal(september.count, 1);
  assert.equal(september.totalAmount, 43500);
  const august = await list.execute(1, periodOf(8, 2026));
  assert.equal(august.count, 0);
  const omitted = await list.execute(1);
  assert.deepEqual(omitted.period, { month: 8, year: 2026 });
  assert.equal(omitted.count, 0);
});

test('lançamento em fatura fechada não exclui nem altera valor', async () => {
  const repo = new Transactions();
  repo.current = { id: 1, userId: 1, payableId: 3, installmentGroupId: null, deletedAt: null };
  await expectsDomainError(() => new DeleteTransactionUseCase(repo, fixedClock).execute(1, 1), 'INVOICE_LOCKED');
  assert.equal(repo.deleted, false);
  const update = new UpdateTransactionUseCase(repo, new Categories(), fixedClock);
  await expectsDomainError(() => update.execute(1, 1, { amount: 2 }), 'INVOICE_LOCKED');
  await expectsDomainError(() => update.execute(1, 1, { paymentType: 'CASH' }), 'INVOICE_LOCKED');
  const renamed = await update.execute(1, 1, { name: 'Ajuste' });
  assert.equal(renamed.name, 'Ajuste');
});

