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
    '/api/integrations/telegram': {
      get: { tags: ['Integrations'], summary: 'Obtém o estado do vínculo Telegram', security: bearerSecurity, responses: { '200': { description: 'Vínculo atual', ...json('TelegramConnectionResponse') }, '401': error('Token ausente ou inválido.', 'UNAUTHENTICATED') } },
      delete: { tags: ['Integrations'], summary: 'Desvincula o Telegram', security: bearerSecurity, responses: { '204': { description: 'Vínculo revogado' }, '401': error('Token ausente ou inválido.', 'UNAUTHENTICATED') } },
    },
    '/api/integrations/telegram/link-token': {
      post: { tags: ['Integrations'], summary: 'Gera link temporário para conectar o Telegram', security: bearerSecurity, responses: { '201': { description: 'Link de vínculo válido por 10 minutos', ...json('TelegramLinkResponse') }, '401': error('Token ausente ou inválido.', 'UNAUTHENTICATED'), '503': error('Integração Telegram desativada.', 'TELEGRAM_NOT_CONFIGURED') } },
    },
    '/api/categories': {
      get: { tags: ['Categories'], summary: 'Lista as categorias disponíveis', security: bearerSecurity, responses: { '200': { description: 'Categorias', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Category' } } } } }, '401': error('Token ausente ou inválido.', 'UNAUTHENTICATED') } },
    },
    '/api/transactions': {
      get: {
        tags: ['Transactions'], summary: 'Lista lançamentos', security: bearerSecurity,
        description: '`month` e `year` devem ser informados juntos ou omitidos. `categoryIds` aceita IDs separados por vírgula ou repetidos na query.',
        parameters: [...periodParameters, { name: 'categoryIds', in: 'query', required: false, schema: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'integer', minimum: 1 } }] }, description: 'IDs numéricos de categoria, separados por vírgula ou repetidos.' }, { name: 'type', in: 'query', required: false, schema: { $ref: '#/components/schemas/TransactionType' } }],
        responses: { '200': { description: 'Lançamentos', ...json('TransactionsResponse') }, '400': error('Mês e ano devem formar um período válido.', 'VALIDATION_ERROR'), '401': error('Token ausente ou inválido.', 'UNAUTHENTICATED') },
      },
      post: {
        tags: ['Transactions'], summary: 'Cria um ou mais lançamentos', security: bearerSecurity,
        description: '`amount` é inteiro em centavos. `CASH` e `CREDIT_1X` criam um único lançamento. `INSTALLMENT` exige `installmentsCount` entre 2 e 120; o parcelamento cria várias linhas no mesmo grupo, distribuindo o resto na última parcela.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateTransactionRequest' }, examples: {
          cash: { summary: 'Compra à vista', value: { type: 'EXPENSE', name: 'Mercado', amount: 15000, categoryId: 1, paymentType: 'CASH', date: '2026-08-12T18:30:00.000Z' } },
          credit1x: { summary: 'Crédito à vista (1x)', value: { type: 'EXPENSE', name: 'Restaurante', amount: 8500, categoryId: 1, paymentType: 'CREDIT_1X', date: '2026-08-12T18:30:00.000Z' } },
          installment: { summary: 'Compra parcelada', value: { type: 'EXPENSE', name: 'Notebook', amount: 360000, categoryId: 1, paymentType: 'INSTALLMENT', installmentsCount: 12, date: '2026-08-12T18:30:00.000Z' } },
          investment: { summary: 'Investimento à vista', value: { type: 'INVESTMENT', name: 'Tesouro Selic', amount: 100000, categoryId: 1, paymentType: 'CASH', date: '2026-08-30T18:00:00.000Z' } },
        } } } },
        responses: { '201': { description: 'Lançamento(s) criado(s)', ...json('TransactionsResponse') }, '400': error('Categoria inválida.', 'INVALID_CATEGORY'), '401': error('Token ausente ou inválido.', 'UNAUTHENTICATED'), '500': error('Ocorreu um erro inesperado.', 'INTERNAL_ERROR') },
      },
    },
    '/api/transactions/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 }, description: 'ID numérico sequencial do lançamento.' }],
      get: { tags: ['Transactions'], summary: 'Obtém um lançamento', security: bearerSecurity, responses: { '200': { description: 'Lançamento', ...json('TransactionResponse') }, '401': error('Token ausente ou inválido.', 'UNAUTHENTICATED'), '404': error('Lançamento não encontrado.', 'NOT_FOUND') } },
      patch: { tags: ['Transactions'], summary: 'Atualiza um lançamento', security: bearerSecurity, description: '`amount` é inteiro em centavos. A quantidade de parcelas não pode ser alterada. Lançamento já vinculado a fatura fechada não altera valor nem forma de pagamento.', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateTransactionRequest' } } } }, responses: { '200': { description: 'Lançamento atualizado', ...json('TransactionResponse') }, '400': error('Categoria inválida ou dados inválidos.', 'INVALID_CATEGORY'), '401': error('Token ausente ou inválido.', 'UNAUTHENTICATED'), '404': error('Lançamento não encontrado.', 'NOT_FOUND'), '422': error('Alteração não permitida (parcela ou fatura fechada).', 'INVOICE_LOCKED') } },
      delete: { tags: ['Transactions'], summary: 'Exclui um lançamento', security: bearerSecurity, description: 'A exclusão é lógica (soft delete); o registro não é removido fisicamente. Lançamento já vinculado a fatura fechada não pode ser excluído.', responses: { '204': { description: 'Lançamento removido sem corpo de resposta' }, '401': error('Token ausente ou inválido.', 'UNAUTHENTICATED'), '404': error('Lançamento não encontrado.', 'NOT_FOUND'), '422': error('Lançamento já faz parte de uma fatura fechada.', 'INVOICE_LOCKED') } },
    },
    '/api/dashboard/summary': {
      get: {
        tags: ['Dashboard'], summary: 'Obtém o resumo financeiro', security: bearerSecurity, description: '`month` e `year` devem ser informados juntos ou omitidos; sem filtro, usa o período atual.', parameters: periodParameters,
        responses: { '200': { description: 'Resumo do período', ...json('DashboardSummary', { period: { month: 8, year: 2026 }, openingBalance: 30000, totalIncome: 500000, totalExpense: 150000, totalInvestment: 200000, balance: 380000, byCategory: [{ categoryId: 1, name: 'Alimentação', total: 150000 }] }) }, '400': error('Mês e ano devem formar um período válido.', 'VALIDATION_ERROR'), '401': error('Token ausente ou inválido.', 'UNAUTHENTICATED') },
      },
    },
    '/api/credit-card/report': {
      get: {
        tags: ['Credit card'],
        summary: 'Relatório mensal de compras no cartão',
        security: bearerSecurity,
        description: 'Soma e lista lançamentos `CREDIT_1X` e `INSTALLMENT` das faturas que vencem no período. A fatura aberta aparece no mês seguinte ao vencimento da última fatura fechada, ou no mês atual se não houver uma anterior. `CASH` não entra. Sem `month`/`year`, usa o mês atual.',
        parameters: periodParameters,
        responses: {
          '200': { description: 'Relatório do período', ...json('CreditCardReport') },
          '400': error('Mês e ano devem formar um período válido.', 'VALIDATION_ERROR'),
          '401': error('Token ausente ou inválido.', 'UNAUTHENTICATED'),
        },
      },
    },
    '/api/credit-card/open-invoice': {
      get: {
        tags: ['Credit card'],
        summary: 'Fatura em aberto',
        security: bearerSecurity,
        description: 'Totais das compras `CREDIT_1X` e `INSTALLMENT` ainda sem conta a pagar, com `date` até agora. Não fecha a fatura.',
        responses: {
          '200': { description: 'Fatura em aberto', ...json('OpenCreditCardInvoice') },
          '401': error('Token ausente ou inválido.', 'UNAUTHENTICATED'),
        },
      },
    },
    '/api/credit-card/invoices/close': {
      post: {
        tags: ['Credit card'],
        summary: 'Fecha a fatura em aberto',
        security: bearerSecurity,
        description: 'Única forma de fechar a fatura. Cria uma conta a pagar com o vencimento informado e vincula as linhas em aberto. Não cria despesa nova.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CloseInvoiceRequest' }, example: { dueDate: '2026-09-10' } } } },
        responses: {
          '201': { description: 'Conta a pagar criada', ...json('Payable') },
          '400': error('Data de vencimento inválida.', 'VALIDATION_ERROR'),
          '401': error('Token ausente ou inválido.', 'UNAUTHENTICATED'),
          '422': error('Não há compras em aberto para fechar a fatura.', 'EMPTY_OPEN_INVOICE'),
        },
      },
    },
    '/api/payables': {
      get: {
        tags: ['Payables'],
        summary: 'Relatório de contas a pagar',
        security: bearerSecurity,
        description: 'Lista contas a pagar do usuário filtradas pelo mês/ano do vencimento. Sem `month`/`year`, usa o mês atual. Não há cadastro manual nesta versão.',
        parameters: periodParameters,
        responses: {
          '200': { description: 'Contas do período', ...json('PayableList') },
          '400': error('Mês e ano devem formar um período válido.', 'VALIDATION_ERROR'),
          '401': error('Token ausente ou inválido.', 'UNAUTHENTICATED'),
        },
      },
    },
  },
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } }, schemas: openApiSchemas },
} as const;
