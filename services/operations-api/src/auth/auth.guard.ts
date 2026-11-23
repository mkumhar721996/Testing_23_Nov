import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Principal } from '../organizations/organization.types';
import {
  PRINCIPAL_RESOLVER,
  TOKEN_VERIFIER,
  type PrincipalResolver,
  type TokenVerifier,
} from './principal-resolver';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_VERIFIER) private readonly verifier: TokenVerifier,
    @Inject(PRINCIPAL_RESOLVER) private readonly resolver: PrincipalResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined>; principal?: Principal }>();
    const header = request.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException();
    }
    const objectId = await this.verifier.verify(token);
    const principal = objectId ? await this.resolver.resolve(objectId) : null;
    if (!principal) {
      throw new UnauthorizedException();
    }
    request.principal = principal;
    return true;
  }
}
