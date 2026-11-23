export interface Account {
  id: string;
  name: string;
  maskedNumber: string;
  balance: number;
  note?: string;
}

export interface Transaction {
  id: string;
  payee: string;
  date: string;
  accountName: string;
  amount: number;
}

export interface ProductSummary {
  id: string;
  kind: 'savings' | 'fixed-deposit' | 'nps' | 'debit-card' | 'credit-card' | 'home-loan';
  title: string;
  maskedNumber?: string;
  status?: string;
  details: string[];
  progress?: { label: string; percent: number };
}

export interface DashboardData {
  customerName: string;
  currency: string;
  totalBalance: number;
  moneyInThisMonth: number;
  moneyOutThisMonth: number;
  accounts: Account[];
  recentTransactions: Transaction[];
  savings: ProductSummary[];
  cards: ProductSummary[];
  loans: ProductSummary[];
  spendingByCategory: { category: string; amount: number }[];
}
