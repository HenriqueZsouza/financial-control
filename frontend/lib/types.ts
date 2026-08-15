export type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt?: string;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
};

export type TransactionType = 'INCOME' | 'EXPENSE';
export type PaymentType = 'CASH' | 'CREDIT_1X' | 'INSTALLMENT';

export type Transaction = {
  id: number;
  name: string;
  amount: number;
  type: TransactionType;
  paymentType: PaymentType;
  installmentsCount?: number | null;
  installmentGroupId?: number | null;
  installmentNumber?: number | null;
  date: string;
  categoryId: number;
  category: Category;
  createdAt: string;
  member?: { id: number; firstName: string; lastName: string };
};

export type FamilyGroup = {
  id: number;
  name: string;
  members: {
    userId: number;
    firstName: string;
    lastName: string;
    role: 'OWNER' | 'MEMBER';
    status: string;
    joinedAt: string;
  }[];
};

export type FamilyInvite = {
  id: number;
  familyGroupId: number;
  inviterId: number;
  inviteeId: number;
  inviteeEmail: string;
  status: string;
  createdAt: string;
};

export type AppNotification = {
  id: number;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export type Summary = {
  period: { month: number; year: number };
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byCategory: { categoryId: number; name: string; total: number }[];
};
