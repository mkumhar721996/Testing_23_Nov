import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';

export const PG_POOL = Symbol('PG_POOL');

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: (): Pool => {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
          throw new Error('DATABASE_URL is not set');
        }
        const pool = new Pool({ connectionString });
        // An error on an idle client would otherwise be an unhandled 'error' event and crash the process.
        pool.on('error', (err) => console.error('Unexpected PostgreSQL pool error', err));
        return pool;
      },
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}
