export type Money = { amountMinor: number; currency: string }; // ISO 4217, minor units

type Base = { id: string; name: string; last4: string; currency: string };

export type Product =
  | (Base & { type: 'account'; currentBalance: Money })
  | (Base & { type: 'credit_card'; amountOwed: Money; availableCredit: Money })
  | (Base & { type: 'loan'; outstandingBalance: Money })
  | (Base & {
      type: 'fixed_deposit';
      depositedAmount: Money;
      maturityDate: string;
      interestRatePercent: number;
    });

export type DashboardResponse = { customer: { name: string | null }; products: Product[] };
