import postgres from "postgres";
import { loadDbConfig, type DbConfig, type DbTarget } from "./config.js";

const dbConfig = loadDbConfig();

export const sql = postgres(dbConfig.databaseUrl, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
  transform: {
    undefined: null,
  },
});

export function getDbConfig(): DbConfig {
  return dbConfig;
}

export function getDbTarget(): DbTarget {
  return dbConfig.target;
}

export async function checkDbConnection(): Promise<boolean> {
  try {
    const res = await sql`SELECT 1 as connected`;
    return Boolean(res && res.length > 0);
  } catch (err) {
    console.error("Database connection check failed:", err);
    return false;
  }
}
