import { UnauthorizedException, createParamDecorator, type ExecutionContext } from '@nestjs/common';

// The customer id is the one the authentication middleware (Entra ID, ADR-0005) sets on the request
// as `customerId`. Without it the caller is not signed in.
export const CurrentCustomer = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const customerId = ctx.switchToHttp().getRequest<{ customerId?: string }>().customerId;
  if (!customerId) throw new UnauthorizedException();
  return customerId;
});
