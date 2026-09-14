import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigration() {
  const databaseUrl =
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/sales_central";

  const schemaPath = path.join(__dirname, "../../schema/postgres_schema.sql");
  console.log(`Running migration from: ${schemaPath}`);

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found at ${schemaPath}`);
  }

  const sqlContent = fs.readFileSync(schemaPath, "utf8");

  // Parse connection URL to check / create the target database if it does not exist
  let targetDbName = "sales_central";
  let adminUrl = databaseUrl;

  try {
    const parsed = new URL(databaseUrl);
    targetDbName = parsed.pathname.replace(/^\//, "") || "sales_central";
    parsed.pathname = "/postgres";
    adminUrl = parsed.toString();
  } catch {
    // If not a parseable URL, proceed directly
  }

  console.log(`Checking if database "${targetDbName}" exists...`);
  const adminSql = postgres(adminUrl, { max: 1, connect_timeout: 10 });

  try {
    const exists = await adminSql`
      SELECT 1 FROM pg_database WHERE datname = ${targetDbName}
    `;

    if (exists.length === 0) {
      console.log(`Database "${targetDbName}" does not exist. Creating...`);
      // Database names cannot be parameterized in CREATE DATABASE
      const safeDbName = targetDbName.replace(/"/g, '""');
      await adminSql.unsafe(`CREATE DATABASE "${safeDbName}"`);
      console.log(`Database "${targetDbName}" created successfully!`);
    } else {
      console.log(`Database "${targetDbName}" already exists.`);
    }
  } finally {
    await adminSql.end();
  }

  // Connect to target database and apply schema
  console.log(`Applying schema to "${targetDbName}"...`);
  const targetSql = postgres(databaseUrl, { max: 1, connect_timeout: 10 });

  try {
    await targetSql.unsafe(sqlContent);

    // Apply incremental schema updates if tables already existed
    await targetSql.unsafe(`
      ALTER TABLE sales ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
      ALTER TABLE sales ADD COLUMN IF NOT EXISTS cancelled_by_user_id TEXT;
      ALTER TABLE sales ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
    `);

    console.log("Migration executed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await targetSql.end();
  }
}

void runMigration();
