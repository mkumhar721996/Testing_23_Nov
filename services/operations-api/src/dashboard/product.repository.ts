import type { Product } from './dashboard.types';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export type CustomerProducts = { name: string | null; products: Product[] };

export interface ProductRepository {
  findByCustomerId(customerId: string): Promise<CustomerProducts>;
}
