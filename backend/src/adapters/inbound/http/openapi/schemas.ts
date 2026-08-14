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
      id: { type: 'string', format: 'uuid' },
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
      id: { type: 'string', format: 'uuid' }, name: { type: 'string', example: 'Alimentação' }, slug: { type: 'string', example: 'alimentacao' },
      icon: { type: 'string', nullable: true, example: 'shopping_cart' }, createdAt: dateTime, updatedAt: dateTime,
    },
  },
  TransactionType: { type: 'string', enum: ['INCOME', 'EXPENSE'] },
  PaymentType: { type: 'string', enum: ['CASH', 'INSTALLMENT'] },
  Transaction: {
    type: 'object',
    required: ['id', 'userId', 'categoryId', 'type', 'name', 'amount', 'paymentType', 'date', 'createdAt', 'updatedAt', 'deletedAt'],
    properties: {
      id: { type: 'string', format: 'uuid' }, userId: { type: 'string', format: 'uuid' }, categoryId: { type: 'string', format: 'uuid' },
      type: { $ref: '#/components/schemas/TransactionType' }, name: { type: 'string', maxLength: 160, example: 'Mercado' },
      amount: { type: 'integer', minimum: 1, description: 'Valor monetário em centavos.', example: 15000 },
      paymentType: { $ref: '#/components/schemas/PaymentType' }, installmentsCount: { type: 'integer', minimum: 2, maximum: 120, nullable: true },
      installmentGroupId: { type: 'string', format: 'uuid', nullable: true }, installmentNumber: { type: 'integer', nullable: true },
      date: dateTime, createdAt: dateTime, updatedAt: dateTime, deletedAt: { ...dateTime, nullable: true },
      category: { $ref: '#/components/schemas/Category' },
    },
  },
  CreateTransactionRequest: {
    type: 'object', required: ['type', 'name', 'amount', 'categoryId', 'paymentType'], properties: {
      type: { $ref: '#/components/schemas/TransactionType' }, name: { type: 'string', minLength: 1, maxLength: 160, example: 'Mercado' },
      amount: { type: 'integer', minimum: 1, description: 'Valor monetário em centavos.', example: 15000 }, categoryId: { type: 'string', minLength: 1, example: '<id>' },
      paymentType: { $ref: '#/components/schemas/PaymentType' }, installmentsCount: { type: 'integer', minimum: 2, maximum: 120 },
      date: { type: 'string', format: 'date', pattern: '^\\d{4}-\\d{2}-\\d{2}$', example: '2026-08-12' },
    },
  },
  UpdateTransactionRequest: {
    type: 'object', properties: {
      type: { $ref: '#/components/schemas/TransactionType' }, name: { type: 'string', minLength: 1, maxLength: 160 },
      amount: { type: 'integer', minimum: 1, description: 'Valor monetário em centavos.' }, categoryId: { type: 'string', minLength: 1 },
      paymentType: { $ref: '#/components/schemas/PaymentType' }, date: { type: 'string', format: 'date', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    },
  },
  TransactionsResponse: { type: 'object', required: ['transactions'], properties: { transactions: { type: 'array', items: { $ref: '#/components/schemas/Transaction' } } } },
  TransactionResponse: { type: 'object', required: ['transaction'], properties: { transaction: { $ref: '#/components/schemas/Transaction' } } },
  CategoryTotal: {
    type: 'object', required: ['categoryId', 'name', 'total'], properties: {
      categoryId: { type: 'string', format: 'uuid' }, name: { type: 'string', example: 'Alimentação' }, total: { type: 'integer', description: 'Valor monetário em centavos.', example: 15000 },
    },
  },
  DashboardSummary: {
    type: 'object', required: ['period', 'totalIncome', 'totalExpense', 'balance', 'byCategory'], properties: {
      period: { type: 'object', required: ['month', 'year'], properties: { month: { type: 'integer', minimum: 1, maximum: 12 }, year: { type: 'integer', minimum: 2000, maximum: 9999 } } },
      totalIncome: { type: 'integer', description: 'Valor monetário em centavos.', example: 500000 }, totalExpense: { type: 'integer', description: 'Valor monetário em centavos.', example: 150000 },
      balance: { type: 'integer', description: 'Valor monetário em centavos.', example: 350000 }, byCategory: { type: 'array', items: { $ref: '#/components/schemas/CategoryTotal' } },
    },
  },
} as const;
