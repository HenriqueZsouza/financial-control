import type { Category, Summary, Transaction, User } from './types';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';
export class ApiError extends Error { constructor(public code: string, message: string, public details?: unknown) { super(message); } }

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('financial-control:token') : null;
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
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
  transactions: (query: URLSearchParams) => api<{ transactions: Transaction[] }>(`/api/transactions?${query.toString()}`),
  transaction: (id: string) => api<{ transaction: Transaction }>(`/api/transactions/${id}`),
  createTransaction: (data: Record<string, unknown>) => api<{ transactions: Transaction[] }>('/api/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id: string, data: Record<string, unknown>) => api<{ transaction: Transaction }>(`/api/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTransaction: (id: string) => api<void>(`/api/transactions/${id}`, { method: 'DELETE' }),
  updateProfile: (data: Record<string, string>) => api<{ user: User }>('/api/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
};
