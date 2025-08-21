import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { env } from '../env.ts';

async function createDatabase() {
  if (env.NODE_ENV === 'test') {
    const pgLite = new PGlite();
    const db = drizzlePglite(pgLite);
    await migrate(db, {
      migrationsFolder: resolve(process.cwd(), 'drizzle'),
    });

    return db;
  }

  return drizzle(env.DATABASE_URL, {
    logger: env.NODE_ENV === 'development',
  });
}

export const db = await createDatabase();
