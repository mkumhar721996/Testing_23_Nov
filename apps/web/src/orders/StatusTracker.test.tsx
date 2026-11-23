import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusTracker } from './StatusTracker';
import { makeOrder } from './orderFixtures';
import type { OrderStep } from './types';

const STEPS: OrderStep[] = ['placed', 'accepted', 'preparing', 'ready', 'completed'];
const pickup = makeOrder('o1');

describe('StatusTracker', () => {
  it('lists the five steps in order', () => {
    render(<StatusTracker steps={pickup.steps} status="placed" />);
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Placed',
      'Accepted',
      'Preparing',
      'Ready',
      'Completed',
    ]);
  });

  it.each(STEPS)('marks only %s as the current step', (status) => {
    const { container } = render(<StatusTracker steps={pickup.steps} status={status} />);
    const current = container.querySelectorAll('[aria-current="step"]');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent(pickup.steps.find((s) => s.key === status)!.label);
  });

  it('marks earlier steps done and sets the progress value', () => {
    const { container } = render(<StatusTracker steps={pickup.steps} status="preparing" />);
    expect(container.querySelectorAll('.is-done')).toHaveLength(2);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  });

  it('reads Ready as Out for delivery for a delivery order', () => {
    const order = makeOrder('o2', 'ready', 'delivery');
    render(<StatusTracker steps={order.steps} status={order.status} />);
    expect(screen.getByText('Out for delivery')).toHaveAttribute('aria-current', 'step');
    expect(screen.queryByText('Ready')).toBeNull();
  });
});
