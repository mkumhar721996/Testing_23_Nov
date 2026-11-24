// Mirrors the Operations API contract (services/operations-api/openapi.yaml).
export type Money = { amountMinor: number; currency: string };

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
