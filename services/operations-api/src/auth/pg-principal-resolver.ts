import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import type { Principal, Role } from '../organizations/organization.types';
import type { PrincipalResolver } from './principal-resolver';

@Injectable()
export class PgPrincipalResolver implements PrincipalResolver {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async resolve(entraObjectId: string): Promise<Principal | null> {
    const { rows } = await this.pool.query<{ id: string; role: Role; organization_id: string | null }>(
      'select id, role, organization_id from users where entra_object_id = $1',
      [entraObjectId],
    );
    const row = rows[0];
    return row ? { userId: row.id, role: row.role, organizationId: row.organization_id } : null;
  }
}
