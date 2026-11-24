export type OrderStatus =
  | 'placed'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export interface OrderSummary {
  id: string;
  restaurantId: string;
  restaurantName: string;
  status: OrderStatus;
  placedAt: string;
  itemCount: number;
  totalMinor: number;
  currency: string;
}

export interface OrderLists {
  active: OrderSummary[];
  past: OrderSummary[];
}
