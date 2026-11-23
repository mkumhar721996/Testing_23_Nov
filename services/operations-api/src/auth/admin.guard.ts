import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ADMIN_ROLE } from './principal';
import type { RequestWithPrincipal } from './principal';

/** Run after AuthGuard: refuses any principal without the admin role. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const principal = context.switchToHttp().getRequest<RequestWithPrincipal>().principal;
    if (!principal) throw new UnauthorizedException({ code: 'not_signed_in', message: 'Sign in to continue.' });
    if (!principal.roles.includes(ADMIN_ROLE)) {
      throw new ForbiddenException({ code: 'not_admin', message: 'Only admins can change expense categories.' });
    }
    return true;
  }
}
