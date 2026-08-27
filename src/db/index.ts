import dotenv from 'dotenv';
dotenv.config();

import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from './schema.ts';

export const createPool = () => {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl || (!databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://'))) {
    throw new Error('[SPIP DATABASE] DATABASE_URL must be a valid PostgreSQL connection string.');
  }

  return new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10000,
    statement_timeout: 30000,
    max: 5,
    idleTimeoutMillis: 10000,
    allowExitOnIdle: true,
    ssl: databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false }
  });
};

const pool = createPool();

pool.on('error', (err) => {
  console.error('[SPIP DATABASE] Unexpected idle client error:', err);
});

export const db = drizzle(pool, { schema });
