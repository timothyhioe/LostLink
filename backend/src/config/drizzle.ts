import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "./env";
import * as schema from "../db/schema";

const useSSL =
  env.NODE_ENV === "production" ||
  env.POSTGRESQL_URI.includes("neon.tech");

const pool = new Pool({
  connectionString: env.POSTGRESQL_URI,
  ...(useSSL ? { ssl: { rejectUnauthorized: false } } : {}),
});

export const db = drizzle(pool, { schema });
export { pool };
