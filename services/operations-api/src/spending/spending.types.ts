export type CategoryTotal = { category: string | null; totalMinor: number };

export type MonthlySpendingResponse = {
  month: string; // YYYY-MM in the customer's time zone
  currency: string;
  totalMinor: number;
  categories: CategoryTotal[];
};
