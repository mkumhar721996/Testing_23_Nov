import { describe, expect, it } from 'vitest';
import { ORDER_STEPS, nextStep, stepLabel } from './order-status';

describe('order steps', () => {
  it('lists the five steps in order', () => {
    expect(ORDER_STEPS).toEqual(['placed', 'accepted', 'preparing', 'ready', 'completed']);
  });

  it('labels pickup steps by name', () => {
    expect(ORDER_STEPS.map((s) => stepLabel(s, 'pickup'))).toEqual([
      'Placed',
      'Accepted',
      'Preparing',
      'Ready',
      'Completed',
    ]);
  });

  it('reads Ready as Out for delivery for delivery orders only', () => {
    expect(stepLabel('ready', 'delivery')).toBe('Out for delivery');
    expect(stepLabel('ready', 'pickup')).toBe('Ready');
    expect(ORDER_STEPS.filter((s) => s !== 'ready').map((s) => stepLabel(s, 'delivery'))).toEqual([
      'Placed',
      'Accepted',
      'Preparing',
      'Completed',
    ]);
  });

  it('moves to the next step and stops after completed', () => {
    expect(nextStep('placed')).toBe('accepted');
    expect(nextStep('ready')).toBe('completed');
    expect(nextStep('completed')).toBeNull();
  });
});
