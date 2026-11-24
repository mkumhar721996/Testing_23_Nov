import { Injectable } from '@nestjs/common';
import { SAMPLE_CUSTOMERS } from './sample-data';
import type { CustomerProducts, ProductRepository } from './product.repository';

@Injectable()
export class SampleProductRepository implements ProductRepository {
  async findByCustomerId(customerId: string): Promise<CustomerProducts> {
    const customer = Object.hasOwn(SAMPLE_CUSTOMERS, customerId)
      ? SAMPLE_CUSTOMERS[customerId]
      : undefined;
    return customer
      ? {
          name: customer.name,
          products: [...customer.products],
          transactions: [...customer.transactions],
        }
      : { name: null, products: [], transactions: [] };
  }
}
