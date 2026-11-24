import { Inject, Injectable } from '@nestjs/common';
import type { DashboardResponse } from './dashboard.types';
import { PRODUCT_REPOSITORY, type ProductRepository } from './product.repository';
import { selectRecentTransactions } from './recent-transactions';
import { sortProducts } from './sort-products';

@Injectable()
export class DashboardService {
  constructor(@Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository) {}

  async getOverview(customerId: string): Promise<DashboardResponse> {
    const { name, products, transactions } = await this.products.findByCustomerId(customerId);
    return {
      customer: { name },
      products: sortProducts(products),
      recentTransactions: selectRecentTransactions(products, transactions),
    };
  }
}
