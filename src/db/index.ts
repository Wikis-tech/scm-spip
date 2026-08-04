import dotenv from 'dotenv';
dotenv.config({ override: true });

import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from './schema.ts';

export const createPool = () => {
  // If AI Studio Cloud SQL credentials are provided in the container environment, use them directly
  if (process.env.SQL_HOST && process.env.SQL_USER && process.env.SQL_PASSWORD && process.env.SQL_DB_NAME) {
    console.log('[SCM DATABASE] Initializing database pool via SQL_HOST environment credentials.');
    return new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      connectionTimeoutMillis: 10000,
      statement_timeout: 30000,
      max: 5,
      idleTimeoutMillis: 1000,
      allowExitOnIdle: true,
    });
  }

  let databaseUrl = process.env.DATABASE_URL;

  // If DATABASE_URL or SUPABASE_URL is provided as an HTTPS URL (e.g. https://erkdqtgvhdvkhhosphir.supabase.co)
  const targetUrl = (databaseUrl && databaseUrl.startsWith('http')) ? databaseUrl : process.env.SUPABASE_URL;
  if (targetUrl && targetUrl.startsWith('http')) {
    const match = targetUrl.match(/https?:\/\/([^.]+)\.supabase\.(co|net|com)/);
    if (match && match[1]) {
      const projectRef = match[1];
      const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.POSTGRES_PASSWORD;
      if (dbPassword) {
        databaseUrl = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;
        console.log(`[SCM DATABASE] Constructed direct Supabase PostgreSQL connection URL for project ${projectRef}`);
      } else {
        if (databaseUrl && databaseUrl.startsWith('http')) {
          console.warn(`[SCM DATABASE] DATABASE_URL is set to Supabase API URL (${databaseUrl}). Direct PostgreSQL connection requires a postgresql:// connection string or SUPABASE_DB_PASSWORD.`);
        }
        databaseUrl = undefined;
      }
    }
  }

  if (!databaseUrl || (!databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://'))) {
    console.warn('[SCM DATABASE] PostgreSQL connection string not configured — operating with resilient memory fallback.');
    return new Pool({
      connectionString: 'postgres://postgres:postgres@127.0.0.1:5432/mock_db',
      connectionTimeoutMillis: 1000,
      statement_timeout: 1000,
      max: 1,
      allowExitOnIdle: true,
    });
  }

  console.log('[SCM DATABASE] Connecting to Supabase PostgreSQL database...');
  return new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10000,
    statement_timeout: 30000, // Safe query/statement timeout in milliseconds
    max: 10,                 // Optimized pool limit for Supabase
    idleTimeoutMillis: 10000, // Graceful idle timeout
    allowExitOnIdle: true,
    ssl: databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
  });
};

const pool = createPool();

pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

export const db = drizzle(pool, { schema });

