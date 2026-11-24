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
  },
};
