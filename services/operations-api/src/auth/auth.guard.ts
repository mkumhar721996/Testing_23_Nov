import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ONBOARDING_REPOSITORY } from '../onboarding/onboarding.repository';
import type { OnboardingRepository } from '../onboarding/onboarding.repository';
import { IS_PUBLIC } from './public.decorator';
import type { Principal, Role } from './principal';
import { TOKEN_VERIFIER } from './token-verifier';
import type { TokenVerifier } from './token-verifier';

// Highest role first: a person holding several app roles gets the strongest.
const ROLES_BY_RANK: Role[] = ['administrator', 'manager', 'employee'];

/** Default-deny: every route needs a valid Entra ID bearer token unless marked @Public(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(TOKEN_VERIFIER) private readonly verifier: TokenVerifier,
    @Inject(ONBOARDING_REPOSITORY) private readonly repo: OnboardingRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const match = /^Bearer (.+)$/.exec(req.headers?.authorization ?? '');
    if (!match) throw new UnauthorizedException();

    let token;
    try {
      token = await this.verifier.verify(match[1]);
    } catch {
      throw new UnauthorizedException();
    }

    const role = ROLES_BY_RANK.find((r) => token.roles.includes(r));
    if (!role) throw new ForbiddenException();

    const employee = await this.repo.findEmployeeByOid(token.oid);
    const principal: Principal = {
      oid: token.oid,
      role,
      employeeId: employee?.id ?? null,
      displayName: token.name,
    };
    req.principal = principal;
    return true;
  }
}

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Principal =>
    context.switchToHttp().getRequest().principal,
);
