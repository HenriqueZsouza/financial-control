const dateTime = { type: 'string', format: 'date-time' } as const;

export const openApiSchemas = {
  ErrorResponse: {
    type: 'object',
    required: ['code', 'message'],
    properties: {
      code: { type: 'string', example: 'VALIDATION_ERROR' },
      message: { type: 'string', example: 'Dados inválidos.' },
      details: { type: 'object', additionalProperties: true },
    },
  },
  User: {
    type: 'object',
    required: ['id', 'firstName', 'lastName', 'email', 'phone', 'createdAt', 'updatedAt'],
    properties: {
      id: { type: 'integer', minimum: 1, example: 1 },
      firstName: { type: 'string', maxLength: 80, example: 'Ana' },
      lastName: { type: 'string', maxLength: 80, example: 'Silva' },
      email: { type: 'string', format: 'email', maxLength: 254, example: 'ana@example.com' },
      phone: { type: 'string', minLength: 8, maxLength: 30, example: '+5511999999999' },
      createdAt: dateTime,
      updatedAt: dateTime,
    },
  },
  UserResponse: {
    type: 'object', required: ['user'], properties: { user: { $ref: '#/components/schemas/User' } },
  },
  RegisterRequest: {
    type: 'object',
    required: ['firstName', 'lastName', 'email', 'phone', 'password', 'confirmPassword'],
    properties: {
      firstName: { type: 'string', minLength: 1, maxLength: 80, example: 'Ana' },
      lastName: { type: 'string', minLength: 1, maxLength: 80, example: 'Silva' },
      email: { type: 'string', format: 'email', maxLength: 254, example: 'ana@example.com' },
      phone: { type: 'string', minLength: 8, maxLength: 30, example: '+5511999999999' },
      password: { type: 'string', format: 'password', minLength: 8, maxLength: 128, example: 'senha-segura' },
      confirmPassword: { type: 'string', format: 'password', example: 'senha-segura' },
    },
  },
  LoginRequest: {
    type: 'object', required: ['email', 'password'], properties: {
      email: { type: 'string', format: 'email', example: 'ana@example.com' },
      password: { type: 'string', format: 'password', minLength: 1, example: 'senha-segura' },
    },
  },
  AuthLoginResponse: {
    type: 'object', required: ['token', 'user'], properties: {
      token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiJ9...' }, user: { $ref: '#/components/schemas/User' },
    },
  },
  UpdateUserRequest: {
    type: 'object',
    properties: {
      firstName: { type: 'string', minLength: 1, maxLength: 80 },
      lastName: { type: 'string', minLength: 1, maxLength: 80 },
      phone: { type: 'string', minLength: 8, maxLength: 30 },
      password: { type: 'string', format: 'password', minLength: 8, maxLength: 128 },
      confirmPassword: { type: 'string', format: 'password' },
    },
  },
  Category: {
    type: 'object', required: ['id', 'name', 'slug', 'icon', 'createdAt', 'updatedAt'], properties: {
      id: { type: 'integer', minimum: 1, example: 1 }, name: { type: 'string', example: 'Alimentação' }, slug: { type: 'string', example: 'alimentacao' },
      icon: { type: 'string', nullable: true, example: 'shopping_cart' }, createdAt: dateTime, updatedAt: dateTime,
    },
  },
  TransactionType: { type: 'string', enum: ['INCOME', 'EXPENSE', 'INVESTMENT'] },
  PaymentType: { type: 'string', enum: ['CASH', 'CREDIT_1X', 'INSTALLMENT'] },
  Transaction: {
    type: 'object',
    required: ['id', 'userId', 'categoryId', 'type', 'name', 'amount', 'paymentType', 'date', 'createdAt', 'updatedAt', 'deletedAt'],
    properties: {
      id: { type: 'integer', minimum: 1, example: 1 }, userId: { type: 'integer', minimum: 1, example: 1 }, categoryId: { type: 'integer', minimum: 1, example: 1 },
      type: { $ref: '#/components/schemas/TransactionType' }, name: { type: 'string', maxLength: 160, example: 'Mercado' },
      amount: { type: 'integer', minimum: 1, description: 'Valor monetário em centavos.', example: 15000 },
      paymentType: { $ref: '#/components/schemas/PaymentType' }, installmentsCount: { type: 'integer', minimum: 2, maximum: 120, nullable: true },
      installmentGroupId: { type: 'integer', minimum: 1, nullable: true, example: 1 }, installmentNumber: { type: 'integer', nullable: true },
      payableId: { type: 'integer', minimum: 1, nullable: true, description: 'Preenchido quando a linha entra em uma fatura fechada.' },
      date: dateTime, createdAt: dateTime, updatedAt: dateTime, deletedAt: { ...dateTime, nullable: true },
      category: { $ref: '#/components/schemas/Category' },
    },
  },
  CreateTransactionRequest: {
    type: 'object', required: ['type', 'name', 'amount', 'categoryId', 'paymentType'], properties: {
      type: { $ref: '#/components/schemas/TransactionType' }, name: { type: 'string', minLength: 1, maxLength: 160, example: 'Mercado' },
      amount: { type: 'integer', minimum: 1, description: 'Valor monetário em centavos.', example: 15000 }, categoryId: { type: 'integer', minimum: 1, example: 1 },
      paymentType: { $ref: '#/components/schemas/PaymentType' }, installmentsCount: { type: 'integer', minimum: 2, maximum: 120 },
      date: { type: 'string', format: 'date-time', description: 'AAAA-MM-DD ou ISO 8601 com horário da operação.', example: '2026-08-12T18:30:00.000Z' },
    },
  },
  UpdateTransactionRequest: {
    type: 'object', properties: {
      type: { $ref: '#/components/schemas/TransactionType' }, name: { type: 'string', minLength: 1, maxLength: 160 },
      amount: { type: 'integer', minimum: 1, description: 'Valor monetário em centavos.' }, categoryId: { type: 'integer', minimum: 1 },
      paymentType: { $ref: '#/components/schemas/PaymentType' }, date: { type: 'string', format: 'date-time', description: 'AAAA-MM-DD ou ISO 8601 com horário da operação.' },
    },
  },
  TransactionsResponse: { type: 'object', required: ['transactions'], properties: { transactions: { type: 'array', items: { $ref: '#/components/schemas/Transaction' } } } },
  TransactionResponse: { type: 'object', required: ['transaction'], properties: { transaction: { $ref: '#/components/schemas/Transaction' } } },
  CategoryTotal: {
    type: 'object', required: ['categoryId', 'name', 'total'], properties: {
      categoryId: { type: 'integer', minimum: 1, example: 1 }, name: { type: 'string', example: 'Alimentação' }, total: { type: 'integer', description: 'Valor monetário em centavos.', example: 15000 },
    },
  },
  DashboardSummary: {
    type: 'object',
    required: ['period', 'openingBalance', 'totalIncome', 'totalExpense', 'totalInvestment', 'balance', 'byCategory'],
    properties: {
      period: { type: 'object', required: ['month', 'year'], properties: { month: { type: 'integer', minimum: 1, maximum: 12 }, year: { type: 'integer', minimum: 2000, maximum: 9999 } } },
      openingBalance: { type: 'integer', description: 'Saldo herdado do mês anterior (entradas − despesas com date anterior ao período), em centavos.', example: 30000 },
      totalIncome: { type: 'integer', description: 'Valor monetário em centavos.', example: 500000 },
      totalExpense: { type: 'integer', description: 'Valor monetário em centavos.', example: 150000 },
      totalInvestment: { type: 'integer', description: 'Valor monetário em centavos. Não entra no saldo.', example: 200000 },
      balance: { type: 'integer', description: 'openingBalance + entradas − despesas do período, em centavos. Investimentos não entram.', example: 380000 },
      byCategory: { type: 'array', items: { $ref: '#/components/schemas/CategoryTotal' } },
    },
  },
  CreditCardReport: {
    type: 'object',
    required: ['period', 'totalCredit1x', 'totalInstallment', 'total', 'credit1xCount', 'installmentCount', 'credit1x', 'installments'],
    properties: {
      period: { type: 'object', required: ['month', 'year'], properties: { month: { type: 'integer', minimum: 1, maximum: 12 }, year: { type: 'integer', minimum: 2000, maximum: 9999 } } },
      totalCredit1x: { type: 'integer', description: 'Soma em centavos das compras CREDIT_1X no período.', example: 13500 },
      totalInstallment: { type: 'integer', description: 'Soma em centavos das parcelas INSTALLMENT no período.', example: 30000 },
      total: { type: 'integer', description: 'totalCredit1x + totalInstallment, em centavos.', example: 43500 },
      credit1xCount: { type: 'integer', example: 2 },
      installmentCount: { type: 'integer', example: 1 },
      credit1x: { type: 'array', items: { $ref: '#/components/schemas/Transaction' } },
      installments: { type: 'array', items: { $ref: '#/components/schemas/Transaction' } },
    },
  },
  OpenCreditCardInvoice: {
    type: 'object',
    required: ['total', 'totalCredit1x', 'totalInstallment', 'credit1xCount', 'installmentCount', 'itemCount'],
    properties: {
      total: { type: 'integer', description: 'Soma em centavos da fatura em aberto.', example: 43500 },
      totalCredit1x: { type: 'integer', example: 13500 },
      totalInstallment: { type: 'integer', example: 30000 },
      credit1xCount: { type: 'integer', example: 2 },
      installmentCount: { type: 'integer', example: 1 },
      itemCount: { type: 'integer', example: 3 },
    },
  },
  CloseInvoiceRequest: {
    type: 'object',
    required: ['dueDate'],
    properties: {
      dueDate: { type: 'string', format: 'date', example: '2026-09-10', description: 'Data de vencimento da fatura (AAAA-MM-DD).' },
    },
  },
  PayableSource: { type: 'string', enum: ['CREDIT_CARD_INVOICE'] },
  PayableStatus: { type: 'string', enum: ['PENDING'] },
  Payable: {
    type: 'object',
    required: ['id', 'name', 'amount', 'dueDate', 'source', 'status', 'closedAt', 'createdAt'],
    properties: {
      id: { type: 'integer', minimum: 1, example: 1 },
      name: { type: 'string', example: 'Fatura do cartão · venc. 10/09/2026' },
      amount: { type: 'integer', description: 'Valor em centavos (snapshot do fechamento).', example: 43500 },
      dueDate: { type: 'string', format: 'date', example: '2026-09-10' },
      source: { $ref: '#/components/schemas/PayableSource' },
      status: { $ref: '#/components/schemas/PayableStatus' },
      closedAt: dateTime,
      createdAt: dateTime,
    },
  },
  PayableList: {
    type: 'object',
    required: ['period', 'totalAmount', 'count', 'items'],
    properties: {
      period: { type: 'object', required: ['month', 'year'], properties: { month: { type: 'integer', minimum: 1, maximum: 12 }, year: { type: 'integer', minimum: 2000, maximum: 9999 } } },
      totalAmount: { type: 'integer', description: 'Soma em centavos das contas do período.', example: 43500 },
      count: { type: 'integer', example: 1 },
      items: { type: 'array', items: { $ref: '#/components/schemas/Payable' } },
    },
  },
} as const;
