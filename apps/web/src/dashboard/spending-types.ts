export type CategoryTotal = { category: string | null; totalMinor: number };

export type MonthlySpendingResponse = {
  month: string; // YYYY-MM
  currency: string;
  totalMinor: number;
  categories: CategoryTotal[];
};
