import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/sales_central";

export const sql = postgres(databaseUrl, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
  transform: {
    undefined: null,
  },
});

export async function checkDbConnection(): Promise<boolean> {
  try {
    const res = await sql`SELECT 1 as connected`;
    return Boolean(res && res.length > 0);
  } catch (err) {
    console.error("Database connection check failed:", err);
    return false;
  }
}
