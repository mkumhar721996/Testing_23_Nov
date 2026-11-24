import { UnauthorizedException, createParamDecorator, type ExecutionContext } from '@nestjs/common';

// The customer id comes only from the authenticated principal (ADR-0005), never the request body.
// The Entra ID guard that sets `request.user` is not built yet.
export const CurrentCustomer = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<{ user?: { customerId?: string } }>();
  const customerId = request.user?.customerId;
  if (!customerId) throw new UnauthorizedException();
  return customerId;
});
