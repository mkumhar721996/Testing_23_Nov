import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Principal } from '../organizations/organization.types';

export const CurrentPrincipal = createParamDecorator((_data: unknown, context: ExecutionContext): Principal =>
  context.switchToHttp().getRequest<{ principal: Principal }>().principal,
);
