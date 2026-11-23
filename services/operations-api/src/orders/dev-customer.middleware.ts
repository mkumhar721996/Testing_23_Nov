// TEMPORARY: stands in for the Entra ID auth middleware (ADR-0005) until the auth story lands.
// main.ts only installs it outside production, when DEV_CUSTOMER_ID is set. Remove it with that story.
export function devCustomerMiddleware(customerId: string) {
  return (req: { customerId?: string }, _res: unknown, next: () => void): void => {
    req.customerId = customerId;
    next();
  };
}
