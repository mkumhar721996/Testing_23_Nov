import type { Product } from './dashboard.types';

const TYPE_RANK: Record<Product['type'], number> = {
  account: 0,
  credit_card: 1,
  loan: 2,
  fixed_deposit: 3,
};

export function sortProducts(products: Product[]): Product[] {
  return [...products].sort((a, b) => TYPE_RANK[a.type] - TYPE_RANK[b.type]);
}
