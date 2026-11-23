export const ORDER_STEPS = ['placed', 'accepted', 'preparing', 'ready', 'completed'] as const;
export type OrderStep = (typeof ORDER_STEPS)[number];
export type Fulfilment = 'pickup' | 'delivery';

const LABELS: Record<OrderStep, string> = {
  placed: 'Placed',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
};

export function stepLabel(step: OrderStep, fulfilment: Fulfilment): string {
  return step === 'ready' && fulfilment === 'delivery' ? 'Out for delivery' : LABELS[step];
}

export function nextStep(step: OrderStep): OrderStep | null {
  return ORDER_STEPS[ORDER_STEPS.indexOf(step) + 1] ?? null;
}
