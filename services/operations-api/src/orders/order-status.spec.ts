import { describe, expect, it } from 'vitest';
import { canCancel } from './order-status';

describe('canCancel', () => {
  it('allows cancelling a placed order', () => {
    expect(canCancel('placed')).toBe(true);
  });

  it.each(['accepted', 'preparing', 'ready', 'completed', 'rejected', 'cancelled'] as const)(
    'does not allow cancelling a %s order',
    (status) => {
      expect(canCancel(status)).toBe(false);
    },
  );
});
