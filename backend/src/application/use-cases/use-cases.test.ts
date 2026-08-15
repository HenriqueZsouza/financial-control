import assert from 'node:assert/strict';
import test from 'node:test';
import { DomainError } from '../../domain/shared/errors.js';
import { periodOf } from '../../domain/shared/period.js';
import { splitInstallments } from '../../domain/transaction/transaction.js';
import type { CategoryRepository } from '../ports/outbound/category-repository.js';
import type { Clock, IdGenerator, PasswordHasher, TokenIssuer } from '../ports/outbound/security.js';
import type { CreateTransactionData, TransactionRepository } from '../ports/outbound/transaction-repository.js';
import type { CreateUserData, UpdateUserData, UserRepository } from '../ports/outbound/user-repository.js';
import { RegisterUserUseCase } from './auth/register-user.js';
import { LoginUserUseCase } from './auth/login-user.js';
import { GetCurrentUserUseCase } from './auth/get-current-user.js';
import { UpdateCurrentUserUseCase } from './users/update-current-user.js';
import { CreateTransactionUseCase } from './transactions/create-transaction.js';
import { UpdateTransactionUseCase } from './transactions/update-transaction.js';
import { GetTransactionUseCase } from './transactions/get-transaction.js';
import { DeleteTransactionUseCase } from './transactions/delete-transaction.js';
import { GetDashboardSummaryUseCase } from './dashboard/get-dashboard-summary.js';

const fixedClock: Clock = { now: () => new Date('2026-08-13T12:00:00.000Z') };
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
  created: CreateTransactionData[] = []; current: any = null; deleted = false;
  async create(data: CreateTransactionData) { this.created.push(data); return { id: 1, ...data, createdAt: fixedClock.now(), updatedAt: fixedClock.now(), deletedAt: null }; }
  async createMany(data: CreateTransactionData[]) { return Promise.all(data.map((item, index) => this.create(item).then((value) => ({ ...value, id: index + 1 })))); }
  async list() { return []; }
  async findActiveById(userId: number, id: number) { return this.current?.id === id && this.current.userId === userId && !this.current.deletedAt ? this.current : null; }
  async update(_id: number, data: any) { return { ...this.current, ...data }; }
  async softDelete(_id: number) { this.deleted = true; }
  async summary() { return { totalIncome: 5000, totalExpense: 1800, byCategory: [{ categoryId: 1, name: 'Mercado', total: 1800 }] }; }
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
  repository.created = [];
  await create.execute(1, { type: 'INCOME', name: 'Salário', amount: 1000, categoryId: 1, paymentType: 'CASH' });
  assert.equal(repository.created[0].installmentsCount, null);
  repository.created = [];
  const credit = await create.execute(1, { type: 'EXPENSE', name: 'Restaurante', amount: 8500, categoryId: 1, paymentType: 'CREDIT_1X', date: new Date('2026-02-10T00:00:00Z') });
  assert.equal(credit.length, 1);
  assert.equal(credit[0].paymentType, 'CREDIT_1X');
  assert.equal(credit[0].installmentsCount, null);
  await expectsDomainError(() => create.execute(1, { type: 'INCOME', name: 'X', amount: 1, categoryId: 99, paymentType: 'CASH' }), 'INVALID_CATEGORY');
});

test('transações isolam usuário, restringem parcela e fazem soft delete', async () => {
  const repo = new Transactions(); repo.current = { id: 1, userId: 1, installmentGroupId: 1, deletedAt: null };
  await expectsDomainError(() => new GetTransactionUseCase(repo).execute(2, 1), 'NOT_FOUND');
  const update = new UpdateTransactionUseCase(repo, new Categories());
  await expectsDomainError(() => update.execute(1, 1, { amount: 2 }), 'INSTALLMENT_RESTRICTION');
  repo.current.installmentGroupId = null;
  await expectsDomainError(() => update.execute(1, 1, { paymentType: 'INSTALLMENT' }), 'PAYMENT_TYPE_RESTRICTION');
  await new DeleteTransactionUseCase(repo, fixedClock).execute(1, 1); assert.equal(repo.deleted, true);
});

test('dashboard usa o período atual e calcula saldo', async () => {
  const summary = await new GetDashboardSummaryUseCase(new Transactions(), fixedClock).execute(1);
  assert.deepEqual(summary, { period: { month: 8, year: 2026 }, totalIncome: 5000, totalExpense: 1800, balance: 3200, byCategory: [{ categoryId: 1, name: 'Mercado', total: 1800 }] });
  assert.equal(periodOf(2, 2026).start.toISOString(), '2026-02-01T00:00:00.000Z');
});
