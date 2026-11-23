import type { DashboardData } from './types';

// Test fixture only; production code has no sample data.
export function makeDashboard(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    customerName: 'Alex Morgan',
    currency: 'USD',
    totalBalance: 34723.35,
    moneyInThisMonth: 5120,
    moneyOutThisMonth: 3482.17,
    accounts: [
      { id: 'a1', name: 'Everyday Current', maskedNumber: '····4821', balance: 4210.1 },
      {
        id: 'a2',
        name: 'Platinum Credit',
        maskedNumber: '····0952',
        balance: -500,
        note: 'Credit card',
      },
    ],
    recentTransactions: [
      {
        id: 't1',
        payee: 'Harbour Coffee Co.',
        date: new Date().toISOString(),
        accountName: 'Everyday Current',
        amount: -6.4,
      },
      {
        id: 't2',
        payee: 'Salary — Acme Ltd',
        date: new Date(Date.now() - 86_400_000).toISOString(),
        accountName: 'Everyday Current',
        amount: 3200,
      },
      {
        id: 't3',
        payee: 'City Power & Light',
        date: '2020-11-21T09:00:00Z',
        accountName: 'Everyday Current',
        amount: -94.18,
      },
    ],
    savings: [
      {
        id: 's1',
        kind: 'savings',
        title: 'Savings Plus ····7733',
        details: ['Interest rate 3.10% p.a.', 'Balance $19,600.45'],
      },
    ],
    cards: [
      {
        id: 'c1',
        kind: 'debit-card',
        title: 'Debit card ····6614',
        status: 'Active',
        details: ['Linked to Everyday Current'],
      },
    ],
    loans: [
      {
        id: 'l1',
        kind: 'home-loan',
        title: 'Home loan ····2210',
        details: ['Outstanding $182,450.00 of $240,000.00'],
        progress: { label: 'Home loan repaid', percent: 24 },
      },
    ],
    spendingByCategory: [
      { category: 'Housing', amount: 1450 },
      { category: 'Groceries', amount: 812.4 },
      { category: 'Dining', amount: 799 },
    ],
    ...overrides,
  };
}
