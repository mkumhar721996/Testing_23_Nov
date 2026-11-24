import type { Product, Transaction } from './dashboard.types';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export type CustomerProducts = {
  name: string | null;
  products: Product[];
  transactions: Transaction[]; // every transaction of the customer, any product type
};

export interface ProductRepository {
  findByCustomerId(customerId: string): Promise<CustomerProducts>;
}
