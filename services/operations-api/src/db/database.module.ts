import { Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { Pool } from 'pg';

export const PG_POOL = Symbol('PG_POOL');

@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () => {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
          throw new Error('DATABASE_URL is not set: point it at the PostgreSQL database.');
        }
        return new Pool({ connectionString });
      },
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
