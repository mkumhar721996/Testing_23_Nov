import { describe, expect, it } from 'vitest';
import { OrdersModule } from './orders/orders.module';
import { AppModule, ordersApiEnabled } from './app.module';

describe('AppModule', () => {
  it('keeps the orders API off unless explicitly enabled', () => {
    expect(ordersApiEnabled({})).toBe(false);
    expect(ordersApiEnabled({ ORDERS_API_ENABLED: 'false' })).toBe(false);
    expect(ordersApiEnabled({ ORDERS_API_ENABLED: 'true' })).toBe(true);
  });

  it('does not import OrdersModule by default', () => {
    const imports = Reflect.getMetadata('imports', AppModule) as unknown[];
    expect(imports).not.toContain(OrdersModule);
  });
});
