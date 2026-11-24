// Port implemented by Cart & checkout. Contract: ADD to the customer's existing cart, never
// replace or clear it, and increase the quantity when the same menu item is already there.
export interface CartPort {
  addItems(
    customerId: string,
    items: { menuItemId: string; quantity: number }[],
  ): Promise<{ cartId: string }>;
}

export const CART_PORT = Symbol('CART_PORT');
