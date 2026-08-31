export const queryKeys = {
  categories: ['categories'] as const,
  summary: (month: number, year: number) => ['summary', month, year] as const,
  creditCard: (month: number, year: number) => ['credit-card', month, year] as const,
  openInvoice: ['open-invoice'] as const,
  payables: (month: number, year: number) => ['payables', month, year] as const,
  transactions: (query: string) => ['transactions', query] as const,
  transaction: (id: string) => ['transaction', id] as const,
  report: (query: string) => ['report', query] as const,
  family: ['family'] as const,
  familyInvites: ['family-invites'] as const,
  notifications: ['notifications'] as const,
  telegramConnection: ['telegram-connection'] as const,
};
