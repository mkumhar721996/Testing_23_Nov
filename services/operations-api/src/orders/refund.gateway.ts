export const REFUND_GATEWAY = Symbol('REFUND_GATEWAY');

/** The seam to Cart & checkout's payment. */
export interface RefundGateway {
  refundFull(orderId: string): Promise<void>;
}
