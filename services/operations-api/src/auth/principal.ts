import type { Request } from 'express';

export interface Principal {
  userId: string;
  roles: string[];
}

export const ADMIN_ROLE = 'admin';

export const PRINCIPAL_RESOLVER = Symbol('PRINCIPAL_RESOLVER');

/** Seam for the Entra ID token validation (ADR-0005), which is not built yet. */
export interface PrincipalResolver {
  resolve(req: Request): Principal | null | Promise<Principal | null>;
}

/** Fails closed: nobody is signed in until a real resolver is provided. */
export class NoPrincipalResolver implements PrincipalResolver {
  resolve(): null {
    return null;
  }
}

export type RequestWithPrincipal = Request & { principal?: Principal };
