import type {
  AppNotification,
  Category,
  CreditCardReport,
  FamilyGroup,
  FamilyInvite,
  OpenCreditCardInvoice,
  Payable,
  PayableList,
  Summary,
  Transaction,
  TelegramConnection,
  User,
} from './types';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('financial-control:token') : null;

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => ({}));

  if (!response.ok) throw new ApiError(body.code ?? 'REQUEST_ERROR', body.message ?? 'Não foi possível concluir a solicitação.', body.details);
  return body as T;
}

export const services = {
  me: () => api<{ user: User }>('/api/auth/me'),
  login: (data: { email: string; password: string }) => api<{ token: string; user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: Record<string, string>) => api<{ user: User }>('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  categories: () => api<Category[]>('/api/categories'),
  summary: (month: number, year: number) => api<Summary>(`/api/dashboard/summary?month=${month}&year=${year}`),
  creditCardReport: (month: number, year: number) => api<CreditCardReport>(`/api/credit-card/report?month=${month}&year=${year}`),
  openCreditCardInvoice: () => api<OpenCreditCardInvoice>('/api/credit-card/open-invoice'),
  closeCreditCardInvoice: (dueDate: string) => api<Payable>('/api/credit-card/invoices/close', {
    method: 'POST',
    body: JSON.stringify({ dueDate }),
  }),
  payables: (month: number, year: number) => api<PayableList>(`/api/payables?month=${month}&year=${year}`),
  transactions: (query: URLSearchParams) => api<{ transactions: Transaction[] }>(`/api/transactions?${query.toString()}`),
  transaction: (id: number | string) => api<{ transaction: Transaction }>(`/api/transactions/${id}`),
  createTransaction: (data: Record<string, unknown>) => api<{ transactions: Transaction[] }>('/api/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id: number | string, data: Record<string, unknown>) => api<{ transaction: Transaction }>(`/api/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTransaction: (id: number | string) => api<void>(`/api/transactions/${id}`, { method: 'DELETE' }),
  updateProfile: (data: Record<string, string>) => api<{ user: User }>('/api/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
  telegramConnection: () => api<{ connection: TelegramConnection | null }>('/api/integrations/telegram'),
  createTelegramLink: () => api<{ linkUrl: string; expiresAt: string }>('/api/integrations/telegram/link-token', { method: 'POST' }),
  removeTelegramConnection: () => api<void>('/api/integrations/telegram', { method: 'DELETE' }),
  family: () => api<{ group: FamilyGroup | null }>('/api/family'),
  inviteFamily: (email: string) => api<{ invite: FamilyInvite }>('/api/family/invites', { method: 'POST', body: JSON.stringify({ email }) }),
  receivedInvites: () => api<{ invites: FamilyInvite[] }>('/api/family/invites/received'),
  acceptInvite: (id: number) => api<{ group: FamilyGroup }>(`/api/family/invites/${id}/accept`, { method: 'POST' }),
  declineInvite: (id: number) => api<void>(`/api/family/invites/${id}/decline`, { method: 'POST' }),
  removeFamilyMember: (userId: number) => api<void>(`/api/family/members/${userId}`, { method: 'DELETE' }),
  leaveFamily: () => api<void>('/api/family/leave', { method: 'POST' }),
  dissolveFamily: () => api<void>('/api/family/dissolve', { method: 'POST' }),
  notifications: () => api<{ notifications: { items: AppNotification[]; unreadCount: number } }>('/api/notifications'),
  readNotification: (id: number) => api<void>(`/api/notifications/${id}/read`, { method: 'POST' }),
  readAllNotifications: () => api<void>('/api/notifications/read-all', { method: 'POST' }),
};
