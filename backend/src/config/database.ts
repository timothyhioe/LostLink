import pg from 'pg';
import { env } from './env';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.POSTGRESQL_URI,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on('error', (error) => {
  console.error('PostgreSQL pool error:', error);
});

export async function connectDatabase(): Promise<void> {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('PostgreSQL connected:', result.rows[0]);
  } catch (error) {
    console.error('Failed to connect to database:', error);
    throw error;
  }
}