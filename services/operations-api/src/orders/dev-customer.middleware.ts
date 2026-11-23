// TEMPORARY: stands in for the Entra ID auth middleware (ADR-0005) until the auth story lands.
// main.ts only installs it outside production, when DEV_CUSTOMER_ID is set. Remove it with that story.
export function devCustomerIdFromEnv(env: {
  NODE_ENV?: string;
  DEV_CUSTOMER_ID?: string;
}): string | undefined {
  // Explicit opt-in: an unset or any other NODE_ENV leaves the shortcut off.
  return env.NODE_ENV === 'development' && env.DEV_CUSTOMER_ID ? env.DEV_CUSTOMER_ID : undefined;
}

export function devCustomerMiddleware(customerId: string) {
  return (req: { customerId?: string }, _res: unknown, next: () => void): void => {
    req.customerId = customerId;
    next();
  };
}
