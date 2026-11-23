export type OrderStep = 'placed' | 'accepted' | 'preparing' | 'ready' | 'completed';
export type Fulfilment = 'pickup' | 'delivery';

export type OrderStatusView = {
  id: string;
  restaurantName: string;
  placedAt: string;
  fulfilment: Fulfilment;
  status: OrderStep;
  steps: { key: OrderStep; label: string }[];
};
