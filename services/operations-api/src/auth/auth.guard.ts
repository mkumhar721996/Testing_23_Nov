import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { TOKEN_VERIFIER, type TokenVerifier } from './token-verifier';

export type AuthenticatedRequest = Request & { customerId?: string };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(TOKEN_VERIFIER) private readonly verifier: TokenVerifier) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const match = /^Bearer (.+)$/.exec(request.headers.authorization ?? '');
    if (!match) throw new UnauthorizedException();
    try {
      request.customerId = (await this.verifier.verify(match[1])).subject;
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }
}
