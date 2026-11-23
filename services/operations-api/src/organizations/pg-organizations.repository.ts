import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import type { OrganizationDetail, OrganizationListItem } from './organization.types';
import type { OrganizationsRepository } from './organizations.repository';

interface ListRow {
  id: string;
  name: string;
  address: string;
  admin: string;
  created_by: string;
}

interface DetailRow extends ListRow {
  consultant_name: string | null;
  consultant_email: string | null;
  consultant_phone: string | null;
}

const BASE_SELECT = `
  select o.id, o.name, o.address, admin.full_name as admin, creator.full_name as created_by
    from organizations o
    join users admin on admin.id = o.admin_user_id
    join users creator on creator.id = o.created_by_user_id`;

const toListItem = (row: ListRow): OrganizationListItem => ({
  id: row.id,
  name: row.name,
  address: row.address,
  admin: row.admin,
  createdBy: row.created_by,
});

@Injectable()
export class PgOrganizationsRepository implements OrganizationsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async list(scope: { organizationId: string | null }): Promise<OrganizationListItem[]> {
    const { rows } = await this.pool.query<ListRow>(
      `${BASE_SELECT} where ($1::uuid is null or o.id = $1::uuid) order by o.name, o.id`,
      [scope.organizationId],
    );
    return rows.map(toListItem);
  }

  async findById(id: string): Promise<OrganizationDetail | null> {
    const { rows } = await this.pool.query<DetailRow>(
      `select o.id, o.name, o.address, admin.full_name as admin, creator.full_name as created_by,
              consultant.full_name as consultant_name, consultant.email as consultant_email,
              consultant.phone as consultant_phone
         from organizations o
         join users admin on admin.id = o.admin_user_id
         join users creator on creator.id = o.created_by_user_id
         left join users consultant on consultant.id = o.fundraising_consultant_user_id
        where o.id = $1::uuid`,
      [id],
    );
    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      ...toListItem(row),
      consultant:
        row.consultant_name === null
          ? null
          : {
              fullName: row.consultant_name,
              email: row.consultant_email,
              phone: row.consultant_phone,
            },
    };
  }
}
