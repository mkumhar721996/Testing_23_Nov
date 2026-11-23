import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import type { RestaurantRepository } from './restaurants.repository';
import type { MenuItem, RestaurantMenu, RestaurantSummary } from './restaurants.types';

const SUMMARY_COLUMNS = `r.id, r.name, r.cuisine, r.is_open AS "isOpen", r.hours_label AS "hoursLabel",
  r.delivery_fee_cents AS "deliveryFeeCents", r.eta_label AS "etaLabel"`;

@Injectable()
export class PgRestaurantsRepository implements RestaurantRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async list(location?: string): Promise<RestaurantSummary[]> {
    const where = location
      ? `WHERE EXISTS (SELECT 1 FROM restaurant_service_area a WHERE a.restaurant_id = r.id AND a.location = $1)`
      : '';
    const { rows } = await this.pool.query<RestaurantSummary>(
      `SELECT ${SUMMARY_COLUMNS} FROM restaurant r ${where} ORDER BY r.name`,
      location ? [location] : [],
    );
    return rows;
  }

  async findMenu(id: string): Promise<RestaurantMenu | null> {
    const found = await this.pool.query<RestaurantSummary & { menuUpdatedAt: Date }>(
      `SELECT ${SUMMARY_COLUMNS}, r.menu_updated_at AS "menuUpdatedAt" FROM restaurant r WHERE r.id = $1`,
      [id],
    );
    if (found.rows.length === 0) return null;
    const { menuUpdatedAt, ...summary } = found.rows[0];

    const areas = await this.pool.query<{ location: string }>(
      `SELECT location FROM restaurant_service_area WHERE restaurant_id = $1 ORDER BY location`,
      [id],
    );
    const categoryRows = await this.pool.query<{ id: string; name: string }>(
      `SELECT id, name FROM menu_category WHERE restaurant_id = $1 ORDER BY position, name, id`,
      [id],
    );
    const itemRows = await this.pool.query<MenuItem & { categoryId: string }>(
      `SELECT i.category_id AS "categoryId", i.id, i.name, i.description,
              i.price_cents AS "priceCents", i.is_available AS "isAvailable"
         FROM menu_item i JOIN menu_category c ON c.id = i.category_id
        WHERE c.restaurant_id = $1
        ORDER BY i.position, i.name, i.id`,
      [id],
    );

    const categories = categoryRows.rows.map((c) => ({
      name: c.name,
      items: itemRows.rows
        .filter((i) => i.categoryId === c.id)
        .map(({ categoryId: _categoryId, ...item }) => item),
    }));

    return {
      ...summary,
      serviceLocations: areas.rows.map((a) => a.location),
      menuUpdatedAt: new Date(menuUpdatedAt).toISOString(),
      categories,
    };
  }
}
