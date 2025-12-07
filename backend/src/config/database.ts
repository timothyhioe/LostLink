import { db, pool } from "./drizzle";
import { sql } from "drizzle-orm";

export { db };

export async function connectDatabase(): Promise<void> {
  try {
    const result = await db.execute(sql`SELECT NOW()`);
    console.log("PostgreSQL connected via Drizzle:", result);
  } catch (error) {
    console.error("Failed to connect to database:", error);
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
