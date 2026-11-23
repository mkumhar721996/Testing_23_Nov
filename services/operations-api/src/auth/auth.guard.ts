import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PRINCIPAL_RESOLVER } from './principal';
import type { PrincipalResolver, RequestWithPrincipal } from './principal';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(PRINCIPAL_RESOLVER) private readonly resolver: PrincipalResolver) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithPrincipal>();
    const principal = await this.resolver.resolve(req);
    if (!principal) throw new UnauthorizedException({ code: 'not_signed_in', message: 'Sign in to continue.' });
    req.principal = principal;
    return true;
  }
}
