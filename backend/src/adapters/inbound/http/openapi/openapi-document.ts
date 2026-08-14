import { openApiSchemas } from './schemas.js';

const json = (schema: string, example?: unknown) => ({ content: { 'application/json': { schema: { $ref: `#/components/schemas/${schema}` }, ...(example === undefined ? {} : { example }) } } });
const error = (description: string, code: string) => ({ description, ...json('ErrorResponse', { code, message: description }) });
const bearerSecurity = [{ bearerAuth: [] }];
const periodParameters = [
  { name: 'month', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 12 }, description: 'Informe junto com `year`, ou omita ambos.' },
  { name: 'year', in: 'query', required: false, schema: { type: 'integer', minimum: 2000, maximum: 9999 }, description: 'Informe junto com `month`, ou omita ambos.' },
] as const;

export const openApiDocument = {
  openapi: '3.0.3',
  info: { title: 'Financial Control API', version: '1.0.0', description: 'API local do Financial Control. Valores monetários em centavos (Int).' },
  servers: [{ url: 'http://localhost:3333', description: 'Ambiente local' }],
  paths: {
    '/health': {
      get: { tags: ['Health'], summary: 'Verifica a disponibilidade da API', responses: { '200': { description: 'API disponível', content: { 'application/json': { schema: { type: 'object', required: ['status', 'timestamp'], properties: { status: { type: 'string', example: 'ok' }, timestamp: { type: 'string', format: 'date-time' } } } } } } } },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'], summary: 'Cria uma conta', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' }, example: { firstName: 'Ana', lastName: 'Silva', email: 'ana@example.com', phone: '+5511999999999', password: 'senha-segura', confirmPassword: 'senha-segura' } } } },
        responses: { '201': { description: 'Conta criada', ...json('UserResponse') }, '400': error('Dados inválidos.', 'VALIDATION_ERROR'), '409': error('E-mail já cadastrado.', 'EMAIL_ALREADY_EXISTS'), '500': error('Ocorreu um erro inesperado.', 'INTERNAL_ERROR') },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Autentica um usuário', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' }, example: { email: 'ana@example.com', password: 'senha-segura' } } } },
        responses: { '200': { description: 'Token JWT e usuário', ...json('AuthLoginResponse') }, '400': error('Dados inválidos.', 'VALIDATION_ERROR'), '401': error('Credenciais inválidas.', 'INVALID_CREDENTIALS'), '500': error('Ocorreu um erro inesperado.', 'INTERNAL_ERROR') },
      },
    },
    '/api/auth/me': {
      get: { tags: ['Auth'], summary: 'Obtém o usuário autenticado', security: bearerSecurity, responses: { '200': { description: 'Usuário autenticado', ...json('UserResponse') }, '401': error('Token ausente ou inválido.', 'UNAUTHENTICATED'), '404': error('Usuário não encontrado.', 'NOT_FOUND') } },
    },
    '/api/users/me': {
      patch: { tags: ['Users'], summary: 'Atualiza o perfil do usuário autenticado', security: bearerSecurity, requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateUserRequest' } } } }, responses: { '200': { description: 'Perfil atualizado', ...json('UserResponse') }, '400': error('Dados inválidos ou nenhuma alteração informada.', 'NO_CHANGES'), '401': error('Token ausente ou inválido.', 'UNAUTHENTICATED'), '404': error('Usuário não encontrado.', 'NOT_FOUND') } },
    },
    '/api/categories': {
      get: { tags: ['Categories'], summary: 'Lista as categorias disponíveis', security: bearerSecurity, responses: { '200': { description: 'Categorias', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Category' } } } } }, '401': error('Token ausente ou inválido.', 'UNAUTHENTICATED') } },
    },
    '/api/transactions': {
      get: {
        tags: ['Transactions'], summary: 'Lista lançamentos', security: bearerSecurity,
        description: '`month` e `year` devem ser informados juntos ou omitidos. `categoryIds` aceita IDs separados por vírgula ou repetidos na query.',
        parameters: [...periodParameters, { name: 'categoryIds', in: 'query', required: false, schema: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] }, description: 'IDs de categoria, separados por vírgula ou repetidos.' }, { name: 'type', in: 'query', required: false, schema: { $ref: '#/components/schemas/TransactionType' } }],
        responses: { '200': { description: 'Lançamentos', ...json('TransactionsResponse') }, '400': error('Mês e ano devem formar um período válido.', 'VALIDATION_ERROR'), '401': error('Token ausente ou inválido.', 'UNAUTHENTICATED') },
      },
      post: {
        tags: ['Transactions'], summary: 'Cria um ou mais lançamentos', security: bearerSecurity,
        description: '`amount` é inteiro em centavos. `INSTALLMENT` exige `installmentsCount` entre 2 e 120; o parcelamento cria várias linhas no mesmo grupo, distribuindo o resto na última parcela.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateTransactionRequest' }, examples: {
          cash: { summary: 'Compra à vista', value: { type: 'EXPENSE', name: 'Mercado', amount: 15000, categoryId: '<id>', paymentType: 'CASH', date: '2026-08-12' } },
          installment: { summary: 'Compra parcelada', value: { type: 'EXPENSE', name: 'Notebook', amount: 360000, categoryId: '<id>', paymentType: 'INSTALLMENT', installmentsCount: 12, date: '2026-08-12' } },
        } } } },
        responses: { '201': { description: 'Lançamento(s) criado(s)', ...json('TransactionsResponse') }, '400': error('Categoria inválida.', 'INVALID_CATEGORY'), '401': error('Token ausente ou inválido.', 'UNAUTHENTICATED'), '500': error('Ocorreu um erro inesperado.', 'INTERNAL_ERROR') },
      },
    },
    '/api/transactions/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'ID do lançamento.' }],
      get: { tags: ['Transactions'], summary: 'Obtém um lançamento', security: bearerSecurity, responses: { '200': { description: 'Lançamento', ...json('TransactionResponse') }, '401': error('Token ausente ou inválido.', 'UNAUTHENTICATED'), '404': error('Lançamento não encontrado.', 'NOT_FOUND') } },
      patch: { tags: ['Transactions'], summary: 'Atualiza um lançamento', security: bearerSecurity, description: '`amount` é inteiro em centavos. A quantidade de parcelas não pode ser alterada.', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateTransactionRequest' } } } }, responses: { '200': { description: 'Lançamento atualizado', ...json('TransactionResponse') }, '400': error('Categoria inválida ou dados inválidos.', 'INVALID_CATEGORY'), '401': error('Token ausente ou inválido.', 'UNAUTHENTICATED'), '404': error('Lançamento não encontrado.', 'NOT_FOUND'), '422': error('Alteração de parcela não permitida.', 'INSTALLMENT_RESTRICTION') } },
      delete: { tags: ['Transactions'], summary: 'Exclui um lançamento', security: bearerSecurity, description: 'A exclusão é lógica (soft delete); o registro não é removido fisicamente.', responses: { '204': { description: 'Lançamento removido sem corpo de resposta' }, '401': error('Token ausente ou inválido.', 'UNAUTHENTICATED'), '404': error('Lançamento não encontrado.', 'NOT_FOUND') } },
    },
    '/api/dashboard/summary': {
      get: {
        tags: ['Dashboard'], summary: 'Obtém o resumo financeiro', security: bearerSecurity, description: '`month` e `year` devem ser informados juntos ou omitidos; sem filtro, usa o período atual.', parameters: periodParameters,
        responses: { '200': { description: 'Resumo do período', ...json('DashboardSummary', { period: { month: 8, year: 2026 }, totalIncome: 500000, totalExpense: 150000, balance: 350000, byCategory: [{ categoryId: '<id>', name: 'Alimentação', total: 150000 }] }) }, '400': error('Mês e ano devem formar um período válido.', 'VALIDATION_ERROR'), '401': error('Token ausente ou inválido.', 'UNAUTHENTICATED') },
      },
    },
  },
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } }, schemas: openApiSchemas },
} as const;
