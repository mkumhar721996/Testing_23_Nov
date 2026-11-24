import type { CustomerProducts } from './product.repository';

const gbp = (amountMinor: number) => ({ amountMinor, currency: 'GBP' });
const usd = (amountMinor: number) => ({ amountMinor, currency: 'USD' });

// Sample customers keyed by Entra subject (oid).
export const SAMPLE_CUSTOMERS: Record<string, CustomerProducts> = {
  'cust-maya': {
    name: 'Maya',
    products: [
      {
        id: 'maya-fd-1',
        type: 'fixed_deposit',
        name: 'Fixed deposit',
        last4: '7710',
        currency: 'GBP',
        depositedAmount: gbp(500000),
        maturityDate: '2027-03-14',
        interestRatePercent: 4.6,
      },
      {
        id: 'maya-loan-1',
        type: 'loan',
        name: 'Personal loan',
        last4: '4406',
        currency: 'GBP',
        outstandingBalance: gbp(685000),
      },
      {
        id: 'maya-card-1',
        type: 'credit_card',
        name: 'Credit card',
        last4: '0952',
        currency: 'GBP',
        amountOwed: gbp(38642),
        availableCredit: gbp(461358),
      },
      {
        id: 'maya-acc-1',
        type: 'account',
        name: 'Checking account',
        last4: '2291',
        currency: 'GBP',
        currentBalance: gbp(421580),
      },
      {
        id: 'maya-acc-2',
        type: 'account',
        name: 'Savings account',
        last4: '8830',
        currency: 'GBP',
        currentBalance: gbp(1293000),
      },
    ],
    transactions: [
      { id: 'maya-t01', productId: 'maya-acc-1', description: 'Tesco Stores', category: 'Groceries', date: '2026-11-22', amount: gbp(-6219) },
      { id: 'maya-t02', productId: 'maya-acc-1', description: 'Salary', category: 'Income', date: '2026-11-21', amount: gbp(314000) },
      { id: 'maya-t03', productId: 'maya-card-1', description: 'Waterstones', category: 'Shopping', date: '2026-11-20', amount: gbp(-2450) },
      { id: 'maya-t04', productId: 'maya-acc-2', description: 'Transfer to savings', category: 'Transfer', date: '2026-11-19', amount: gbp(50000) },
      { id: 'maya-t05', productId: 'maya-card-1', description: 'Pret A Manger', category: 'Eating out', date: '2026-11-18', amount: gbp(-780) },
      { id: 'maya-t06', productId: 'maya-acc-1', description: 'Thames Water', category: 'Bills', date: '2026-11-17', amount: gbp(-3400) },
      { id: 'maya-t07', productId: 'maya-card-1', description: 'Uber', category: 'Travel', date: '2026-11-16', amount: gbp(-1260) },
      { id: 'maya-t08', productId: 'maya-acc-1', description: 'Netflix', category: 'Subscriptions', date: '2026-11-15', amount: gbp(-1099) },
      { id: 'maya-t09', productId: 'maya-acc-2', description: 'Interest paid', category: 'Income', date: '2026-11-14', amount: gbp(1830) },
      { id: 'maya-t10', productId: 'maya-card-1', description: 'Boots', category: 'Health', date: '2026-11-13', amount: gbp(-1535) },
      { id: 'maya-t11', productId: 'maya-loan-1', description: 'Loan repayment', category: 'Loan', date: '2026-11-23', amount: gbp(-25000) },
      { id: 'maya-t12', productId: 'maya-fd-1', description: 'Deposit interest', category: 'Income', date: '2026-11-24', amount: gbp(1917) },
    ],
  },
  'cust-two-cards': {
    name: 'Jordan',
    products: [
      {
        id: 'jordan-card-1',
        type: 'credit_card',
        name: 'Rewards credit card',
        last4: '1180',
        currency: 'USD',
        amountOwed: usd(120000),
        availableCredit: usd(380000),
      },
      {
        id: 'jordan-card-2',
        type: 'credit_card',
        name: 'Travel credit card',
        last4: '3345',
        currency: 'GBP',
        amountOwed: gbp(9900),
        availableCredit: gbp(290100),
      },
      {
        id: 'jordan-acc-1',
        type: 'account',
        name: 'Checking account',
        last4: '5521',
        currency: 'USD',
        currentBalance: usd(250075),
      },
    ],
    transactions: [
      { id: 'jordan-t01', productId: 'jordan-card-2', description: 'Pret A Manger', category: 'Eating out', date: '2026-11-22', amount: gbp(-780) },
      { id: 'jordan-t02', productId: 'jordan-acc-1', description: 'Corner Cafe', category: 'Eating out', date: '2026-11-21', amount: usd(-1200) },
      { id: 'jordan-t03', productId: 'jordan-card-1', description: 'Delta Airlines', category: 'Travel', date: '2026-11-19', amount: usd(-45000) },
    ],
  },
  'cust-no-fd': {
    name: 'Sam',
    products: [
      {
        id: 'sam-acc-1',
        type: 'account',
        name: 'Checking account',
        last4: '6073',
        currency: 'GBP',
        currentBalance: gbp(88000),
      },
    ],
    transactions: [
      { id: 'sam-t01', productId: 'sam-acc-1', description: 'Sainsbury’s', category: 'Groceries', date: '2026-11-22', amount: gbp(-4210) },
      { id: 'sam-t02', productId: 'sam-acc-1', description: 'Salary', category: 'Income', date: '2026-11-20', amount: gbp(210000) },
      { id: 'sam-t03', productId: 'sam-acc-1', description: 'TfL', category: 'Travel', date: '2026-11-18', amount: gbp(-850) },
    ],
  },
  'cust-no-name': {
    name: null,
    products: [
      {
        id: 'noname-acc-1',
        type: 'account',
        name: 'Savings account',
        last4: '9912',
        currency: 'USD',
        currentBalance: usd(100000),
      },
    ],
    transactions: [],
  },
};
