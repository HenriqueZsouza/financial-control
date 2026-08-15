export const queryKeys = {
  categories: ['categories'] as const,
  summary: (month: number, year: number) => ['summary', month, year] as const,
  transactions: (query: string) => ['transactions', query] as const,
  transaction: (id: string) => ['transaction', id] as const,
  report: (query: string) => ['report', query] as const,
};
