import Database from "better-sqlite3";
import { app } from "electron";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedDefaultPermissions } from "../auth/permissions/service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: Database.Database | null = null;

function getMigrationsDir(): string {
  return path.join(__dirname, "migrations");
}

function isCustomerIdInteger(database: Database.Database): boolean {
  const row = database
    .prepare("SELECT type FROM pragma_table_info('Customer') WHERE name = 'id'")
    .get() as { type: string } | undefined;

  return row?.type.toUpperCase().includes("INT") ?? false;
}

function salesPointHasPeriodColumns(database: Database.Database): boolean {
  const row = database
    .prepare(
      `SELECT 1 FROM pragma_table_info('SalesPoint') WHERE name = 'workingCalendarYear' LIMIT 1`,
    )
    .get();

  return row != null;
}

function salesPointHasTimestamps(database: Database.Database): boolean {
  const columns = getTableColumns(database, "SalesPoint");
  return columns.has("createdAt") && columns.has("updatedAt");
}

function recoverSalesPointTable(database: Database.Database): void {
  const salesPoint = database
    .prepare(
      `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'SalesPoint' LIMIT 1`,
    )
    .get();
  const salesPointNew = database
    .prepare(
      `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'SalesPoint__new' LIMIT 1`,
    )
    .get();

  if (!salesPoint && salesPointNew) {
    database.exec(`
      ALTER TABLE SalesPoint__new RENAME TO SalesPoint;
      CREATE INDEX IF NOT EXISTS SalesPoint_mill_idx ON SalesPoint (millId);
    `);
  }
}

function getTableColumns(database: Database.Database, table: string): Set<string> {
  return new Set(
    database
      .prepare(`SELECT name FROM pragma_table_info(?)`)
      .all(table)
      .map((row) => (row as { name: string }).name),
  );
}

function applySalesPointSimplifyMigration(database: Database.Database): void {
  recoverSalesPointTable(database);

  database.exec(`
    DROP INDEX IF EXISTS SalesPoint_workingMonthSetBy_idx;
    DROP TABLE IF EXISTS SalesPoint__new;
  `);

  const columns = getTableColumns(database, "SalesPoint");
  const periodColumns = [
    "workingCalendarYear",
    "workingCalendarMonth",
    "workingFinancialYear",
    "workingMonthSetAt",
    "workingMonthSetById",
  ];

  for (const column of periodColumns) {
    if (columns.has(column)) {
      database.exec(`ALTER TABLE SalesPoint DROP COLUMN ${column}`);
    }
  }

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const refreshedColumns = getTableColumns(database, "SalesPoint");

  if (!refreshedColumns.has("createdAt")) {
    database.exec(`ALTER TABLE SalesPoint ADD COLUMN createdAt TEXT`);
    database.prepare(`UPDATE SalesPoint SET createdAt = ? WHERE createdAt IS NULL`).run(now);
  }

  if (!getTableColumns(database, "SalesPoint").has("updatedAt")) {
    database.exec(`ALTER TABLE SalesPoint ADD COLUMN updatedAt TEXT`);
    database.prepare(`UPDATE SalesPoint SET updatedAt = ? WHERE updatedAt IS NULL`).run(now);
  }
}

function applyLocationMasterMigration(database: Database.Database): void {
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  database.exec(`
    CREATE TABLE IF NOT EXISTS Location (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      locationName TEXT NOT NULL UNIQUE,
      createdAt TEXT NOT NULL DEFAULT '1970-01-01 00:00:00',
      updatedAt TEXT NOT NULL DEFAULT '1970-01-01 00:00:00'
    );
  `);

  database.prepare(
    `UPDATE Location SET createdAt = ? WHERE createdAt IS NULL OR createdAt = '1970-01-01 00:00:00'`,
  ).run(now);
  database.prepare(
    `UPDATE Location SET updatedAt = ? WHERE updatedAt IS NULL OR updatedAt = '1970-01-01 00:00:00'`,
  ).run(now);

  const storageColumns = getTableColumns(database, "StorageLocation");
  if (!storageColumns.has("name")) {
    if (!storageColumns.has("locationId")) {
      throw new Error("StorageLocation is missing both name and locationId.");
    }
    return;
  }

  const distinctNames = database
    .prepare(
      `SELECT DISTINCT name FROM StorageLocation WHERE name IS NOT NULL AND TRIM(name) != ''`,
    )
    .all() as Array<{ name: string }>;

  const insertLocation = database.prepare(`
    INSERT INTO Location (locationName, createdAt, updatedAt)
    SELECT ?, ?, ?
    WHERE NOT EXISTS (SELECT 1 FROM Location WHERE locationName = ?)
  `);

  for (const row of distinctNames) {
    insertLocation.run(row.name, now, now, row.name);
  }

  if (!storageColumns.has("locationId")) {
    database.exec(
      `ALTER TABLE StorageLocation ADD COLUMN locationId INTEGER REFERENCES Location(id)`,
    );
  }

  database.exec(`
    UPDATE StorageLocation
    SET locationId = (
      SELECT l.id FROM Location l WHERE l.locationName = StorageLocation.name LIMIT 1
    )
    WHERE locationId IS NULL
  `);

  const orphan = database
    .prepare(`SELECT COUNT(*) AS count FROM StorageLocation WHERE locationId IS NULL`)
    .get() as { count: number };

  if (orphan.count > 0) {
    throw new Error("StorageLocation rows could not be linked to Location.");
  }

  database.pragma("foreign_keys = OFF");
  database.exec(`
    DROP TABLE IF EXISTS StorageLocation__new;
    CREATE TABLE StorageLocation__new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      salesPointId INTEGER NOT NULL REFERENCES SalesPoint(id) ON DELETE CASCADE,
      locationId INTEGER NOT NULL REFERENCES Location(id) ON DELETE RESTRICT,
      createdAt TEXT NOT NULL DEFAULT '1970-01-01 00:00:00',
      updatedAt TEXT NOT NULL DEFAULT '1970-01-01 00:00:00',
      isDefault INTEGER NOT NULL DEFAULT 0 CHECK (isDefault IN (0, 1)),
      isSellable INTEGER NOT NULL DEFAULT 1 CHECK (isSellable IN (0, 1)),
      UNIQUE (salesPointId, locationId)
    );

    INSERT INTO StorageLocation__new (
      id, salesPointId, locationId, createdAt, updatedAt, isDefault, isSellable
    )
    SELECT
      id,
      salesPointId,
      locationId,
      COALESCE(createdAt, datetime('now')),
      COALESCE(updatedAt, datetime('now')),
      isDefault,
      isSellable
    FROM StorageLocation;

    DROP TABLE StorageLocation;
    ALTER TABLE StorageLocation__new RENAME TO StorageLocation;
    CREATE INDEX IF NOT EXISTS StorageLocation_salesPoint_idx ON StorageLocation (salesPointId);
    CREATE INDEX IF NOT EXISTS StorageLocation_location_idx ON StorageLocation (locationId);
  `);
  database.pragma("foreign_keys = ON");
}

function locationSchemaIsCurrent(database: Database.Database): boolean {
  const locationTable = database
    .prepare(
      `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'Location' LIMIT 1`,
    )
    .get();

  if (!locationTable) {
    return false;
  }

  const storageColumns = getTableColumns(database, "StorageLocation");
  return storageColumns.has("locationId") && !storageColumns.has("name");
}

const LEGACY_ROLE_MAP: Record<string, string> = {
  ADMIN: "ADMIN",
  DIRECTOR: "MANAGER",
  MANAGER: "MANAGER",
  OFFICER: "SALES_CLERK",
  SENIOR_SUPERVISOR: "SENIOR_SALES_SUPERVISOR",
  SUPERVISOR: "SENIOR_SALES_SUPERVISOR",
  CLERK: "SALES_CLERK",
};

function rolesSchemaIsCurrent(database: Database.Database): boolean {
  const legacyTables = [
    "GlobalRoleDefinition",
    "RolePermission",
    "GlobalRolePermission",
    "CommercialServiceRole",
    "CommercialServiceRolePermission",
  ];

  for (const tableName of legacyTables) {
    const row = database
      .prepare(
        `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1`,
      )
      .get(tableName);

    if (row) {
      return false;
    }
  }

  const userColumns = getTableColumns(database, "User");
  if (
    userColumns.has("globalRoleDefinitionId") ||
    userColumns.has("commercialServiceRoleId")
  ) {
    return false;
  }

  const createSqlRow = database
    .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'User'`)
    .get() as { sql: string } | undefined;

  return createSqlRow?.sql.includes("SENIOR_SALES_SUPERVISOR") ?? false;
}

function applySimplifiedRolesMigration(database: Database.Database): void {
  for (const [oldRole, newRole] of Object.entries(LEGACY_ROLE_MAP)) {
    if (oldRole !== newRole) {
      database.prepare(`UPDATE User SET role = ? WHERE role = ?`).run(newRole, oldRole);
    }
  }

  database.prepare(`
    UPDATE User
    SET role = 'SALES_CLERK'
    WHERE role NOT IN (
      'ADMIN',
      'MANAGER',
      'SENIOR_SALES_SUPERVISOR',
      'STATISTICS_SUPERVISOR',
      'SALES_CLERK'
    )
  `).run();

  database.pragma("foreign_keys = OFF");
  database.exec(`
    DROP INDEX IF EXISTS User_commercialServiceRole_idx;
    DROP INDEX IF EXISTS RolePermission_key_idx;
    DROP INDEX IF EXISTS GlobalRolePermission_key_idx;
    DROP INDEX IF EXISTS CommercialServiceRolePermission_key_idx;
    DROP INDEX IF EXISTS CommercialServiceRole_service_active_idx;

    DROP TABLE IF EXISTS CommercialServiceRolePermission;
    DROP TABLE IF EXISTS GlobalRolePermission;
    DROP TABLE IF EXISTS RolePermission;
    DROP TABLE IF EXISTS GlobalRoleDefinition;
    DROP TABLE IF EXISTS CommercialServiceRole;
  `);

  const userColumns = getTableColumns(database, "User");
  if (
    userColumns.has("commercialServiceRoleId") ||
    userColumns.has("globalRoleDefinitionId") ||
    !rolesSchemaIsCurrent(database)
  ) {
    database.exec(`
      DROP TABLE IF EXISTS User__new;
      CREATE TABLE User__new (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'SALES_CLERK' CHECK (role IN ('ADMIN','MANAGER','SENIOR_SALES_SUPERVISOR','STATISTICS_SUPERVISOR','SALES_CLERK')),
        isActive INTEGER NOT NULL DEFAULT 1 CHECK (isActive IN (0, 1)),
        username TEXT NOT NULL UNIQUE,
        passwordPlain TEXT,
        salesPointId INTEGER REFERENCES SalesPoint(id),
        passwordHash TEXT,
        commercialServiceId TEXT REFERENCES CommercialService(id),
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
      );

      INSERT INTO User__new (
        id,
        name,
        role,
        isActive,
        username,
        passwordPlain,
        salesPointId,
        passwordHash,
        commercialServiceId,
        createdAt,
        updatedAt
      )
      SELECT
        id,
        name,
        role,
        isActive,
        username,
        passwordPlain,
        salesPointId,
        passwordHash,
        commercialServiceId,
        createdAt,
        updatedAt
      FROM User;

      DROP TABLE User;
      ALTER TABLE User__new RENAME TO User;

      CREATE INDEX IF NOT EXISTS User_commercialService_idx ON User (commercialServiceId);
    `);
  }

  database.pragma("foreign_keys = ON");
}

function permissionsSchemaIsCurrent(database: Database.Database): boolean {
  const routeTable = database
    .prepare(
      `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'RoleRoutePermission' LIMIT 1`,
    )
    .get();
  const actionTable = database
    .prepare(
      `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'RoleActionPermission' LIMIT 1`,
    )
    .get();

  if (!routeTable || !actionTable) {
    return false;
  }

  const count = database
    .prepare(`SELECT COUNT(*) AS count FROM RoleRoutePermission`)
    .get() as { count: number };

  return count.count > 0;
}

function applyRolePermissionsMigration(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS RoleRoutePermission (
      role TEXT NOT NULL CHECK (role IN ('ADMIN','MANAGER','SENIOR_SALES_SUPERVISOR','STATISTICS_SUPERVISOR','SALES_CLERK')),
      routeId TEXT NOT NULL,
      access TEXT NOT NULL DEFAULT 'NONE' CHECK (access IN ('NONE', 'READ', 'WRITE')),
      PRIMARY KEY (role, routeId)
    );

    CREATE TABLE IF NOT EXISTS RoleActionPermission (
      role TEXT NOT NULL CHECK (role IN ('ADMIN','MANAGER','SENIOR_SALES_SUPERVISOR','STATISTICS_SUPERVISOR','SALES_CLERK')),
      actionKey TEXT NOT NULL,
      allowed INTEGER NOT NULL DEFAULT 0 CHECK (allowed IN (0, 1)),
      PRIMARY KEY (role, actionKey)
    );
  `);

  seedDefaultPermissions(database);
}

function applyDropEmployeeMigration(database: Database.Database): void {
  database.exec(`
    DELETE FROM RoleRoutePermission WHERE routeId = 'employees';
    DROP INDEX IF EXISTS Employee_name_idx;
    DROP INDEX IF EXISTS Employee_estate_idx;
    DROP TABLE IF EXISTS Employee;
  `);
}

function employeeTableExists(database: Database.Database): boolean {
  const row = database
    .prepare(
      `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'Employee' LIMIT 1`,
    )
    .get();

  return row != null;
}

function companySettingsThemesAreCurrent(database: Database.Database): boolean {
  return companySettingsAgroDarkAreCurrent(database);
}

function companySettingsAgroDarkAreCurrent(database: Database.Database): boolean {
  const row = database
    .prepare(
      `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'CompanySettings'`,
    )
    .get() as { sql: string } | undefined;

  const sql = row?.sql ?? "";
  return sql.includes("'agro'") && !sql.includes("'solarized'");
}

function taxTablesAreCompressed(database: Database.Database): boolean {
  const taxType = database
    .prepare(
      `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'TaxType' LIMIT 1`,
    )
    .get();
  if (taxType) {
    return false;
  }

  const columns = getTableColumns(database, "TaxRegime");
  return columns.has("kind") && !columns.has("vatApplies");
}

function applyCompressTaxTablesMigration(database: Database.Database): void {
  database.pragma("foreign_keys = OFF");

  database.exec(`
    DELETE FROM RoleRoutePermission
    WHERE routeId IN ('tax-types', 'tax-rate-schedules', 'tax-regime-taxes');
  `);

  const taxRegimeColumns = getTableColumns(database, "TaxRegime");
  const hasVatApplies = taxRegimeColumns.has("vatApplies");

  if (hasVatApplies) {
    database.exec(`
      INSERT INTO TaxRegime (id, name, vatApplies, kind, commercialServiceId, createdAt, updatedAt)
      SELECT 'tax-regime-actual', 'Actual', 1, 'REAL', NULL, datetime('now'), datetime('now')
      WHERE NOT EXISTS (SELECT 1 FROM TaxRegime WHERE id = 'tax-regime-actual');

      INSERT INTO TaxRegime (id, name, vatApplies, kind, commercialServiceId, createdAt, updatedAt)
      SELECT 'tax-regime-simplified', 'Simplified', 1, 'SIMPLIFIED', NULL, datetime('now'), datetime('now')
      WHERE NOT EXISTS (SELECT 1 FROM TaxRegime WHERE id = 'tax-regime-simplified');
    `);
  } else {
    database.exec(`
      INSERT INTO TaxRegime (id, name, kind, commercialServiceId, createdAt, updatedAt)
      SELECT 'tax-regime-actual', 'Actual', 'REAL', NULL, datetime('now'), datetime('now')
      WHERE NOT EXISTS (SELECT 1 FROM TaxRegime WHERE id = 'tax-regime-actual');

      INSERT INTO TaxRegime (id, name, kind, commercialServiceId, createdAt, updatedAt)
      SELECT 'tax-regime-simplified', 'Simplified', 'SIMPLIFIED', NULL, datetime('now'), datetime('now')
      WHERE NOT EXISTS (SELECT 1 FROM TaxRegime WHERE id = 'tax-regime-simplified');
    `);
  }

  database.exec(`
    UPDATE Customer
    SET taxRegimeId = 'tax-regime-actual'
    WHERE taxRegimeId IN (
      SELECT id FROM TaxRegime WHERE kind = 'REAL' AND id != 'tax-regime-actual'
    );

    UPDATE Customer
    SET taxRegimeId = 'tax-regime-simplified'
    WHERE taxRegimeId IN (
      SELECT id FROM TaxRegime WHERE kind = 'SIMPLIFIED' AND id != 'tax-regime-simplified'
    );

    UPDATE Customer
    SET taxRegimeId = 'tax-regime-simplified'
    WHERE taxRegimeId IS NULL
       OR taxRegimeId NOT IN (SELECT id FROM TaxRegime);

    UPDATE Sale
    SET taxRegimeId = 'tax-regime-actual'
    WHERE taxRegimeId IN (
      SELECT id FROM TaxRegime WHERE kind = 'REAL' AND id != 'tax-regime-actual'
    );

    UPDATE Sale
    SET taxRegimeId = 'tax-regime-simplified'
    WHERE taxRegimeId IS NULL
       OR taxRegimeId IN (
         SELECT id FROM TaxRegime WHERE kind = 'SIMPLIFIED' AND id != 'tax-regime-simplified'
       )
       OR taxRegimeId NOT IN ('tax-regime-actual', 'tax-regime-simplified');

    DELETE FROM TaxRegime
    WHERE id NOT IN ('tax-regime-actual', 'tax-regime-simplified');

    UPDATE TaxRegime SET name = 'Actual', kind = 'REAL' WHERE id = 'tax-regime-actual';
    UPDATE TaxRegime SET name = 'Simplified', kind = 'SIMPLIFIED' WHERE id = 'tax-regime-simplified';

    DROP TABLE IF EXISTS TaxRegimeTax;
    DROP TABLE IF EXISTS TaxRateSchedule;
    DROP TABLE IF EXISTS TaxType;
  `);

  database.exec(`
    DROP TABLE IF EXISTS SaleAppliedTax__new;
    CREATE TABLE SaleAppliedTax__new (
      id TEXT PRIMARY KEY NOT NULL,
      saleId TEXT NOT NULL REFERENCES Sale(id) ON DELETE CASCADE,
      taxTypeId TEXT,
      codeSnapshot TEXT NOT NULL,
      labelSnapshot TEXT NOT NULL,
      rateSnapshot TEXT NOT NULL,
      amount TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT INTO SaleAppliedTax__new (
      id, saleId, taxTypeId, codeSnapshot, labelSnapshot, rateSnapshot, amount, createdAt
    )
    SELECT id, saleId, taxTypeId, codeSnapshot, labelSnapshot, rateSnapshot, amount, createdAt
    FROM SaleAppliedTax;

    DROP TABLE SaleAppliedTax;
    ALTER TABLE SaleAppliedTax__new RENAME TO SaleAppliedTax;
    CREATE INDEX IF NOT EXISTS SaleAppliedTax_sale_idx ON SaleAppliedTax (saleId);
  `);

  if (hasVatApplies || !taxTablesAreCompressed(database)) {
    database.exec(`
      DROP TABLE IF EXISTS TaxRegime__new;
      CREATE TABLE TaxRegime__new (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
        kind TEXT NOT NULL DEFAULT 'SIMPLIFIED' CHECK (kind IN ('SIMPLIFIED', 'REAL')),
        commercialServiceId TEXT REFERENCES CommercialService(id),
        UNIQUE (commercialServiceId, name)
      );

      INSERT INTO TaxRegime__new (id, name, createdAt, updatedAt, kind, commercialServiceId)
      SELECT id, name, createdAt, updatedAt, kind, commercialServiceId
      FROM TaxRegime;

      DROP TABLE TaxRegime;
      ALTER TABLE TaxRegime__new RENAME TO TaxRegime;
      CREATE INDEX IF NOT EXISTS TaxRegime_service_idx ON TaxRegime (commercialServiceId);
    `);
  }

  database.pragma("foreign_keys = ON");
}

function applyCompanySettingsThemesMigration(database: Database.Database): void {
  applyCompanySettingsAgroDarkMigration(database);
}

function applyCompanySettingsAgroDarkMigration(database: Database.Database): void {
  database.pragma("foreign_keys = OFF");
  database.exec(`
    DROP TABLE IF EXISTS CompanySettings__new;
    CREATE TABLE CompanySettings__new (
      id TEXT PRIMARY KEY NOT NULL DEFAULT 'default',
      companyName TEXT NOT NULL,
      department TEXT,
      vatRate TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      fiscalYearStartMonth INTEGER NOT NULL DEFAULT 1,
      logoUrl TEXT,
      uiThemePreset TEXT NOT NULL DEFAULT 'agro'
        CHECK (uiThemePreset IN ('agro', 'dark'))
    );

    INSERT INTO CompanySettings__new (
      id,
      companyName,
      department,
      vatRate,
      createdAt,
      updatedAt,
      fiscalYearStartMonth,
      logoUrl,
      uiThemePreset
    )
    SELECT
      id,
      companyName,
      department,
      vatRate,
      createdAt,
      updatedAt,
      fiscalYearStartMonth,
      logoUrl,
      CASE uiThemePreset
        WHEN 'dark' THEN 'dark'
        ELSE 'agro'
      END
    FROM CompanySettings;

    DROP TABLE CompanySettings;
    ALTER TABLE CompanySettings__new RENAME TO CompanySettings;
  `);
  database.pragma("foreign_keys = ON");
}

const USER_TABLE_COLUMN_ORDER = [
  "id",
  "name",
  "role",
  "isActive",
  "username",
  "passwordPlain",
  "salesPointId",
  "passwordHash",
  "commercialServiceId",
  "createdAt",
  "updatedAt",
] as const;

function userSchemaIsCurrent(database: Database.Database): boolean {
  const columns = database
    .prepare(`SELECT name FROM pragma_table_info('User') ORDER BY cid`)
    .all() as { name: string }[];
  const names = columns.map((column) => column.name);
  return names.join(",") === USER_TABLE_COLUMN_ORDER.join(",");
}

function applyUserDropServiceFactoryMigration(database: Database.Database): void {
  if (userSchemaIsCurrent(database)) {
    return;
  }

  database.pragma("foreign_keys = OFF");
  database.exec(`
    DROP INDEX IF EXISTS User_factory_idx;
    DROP INDEX IF EXISTS User_commercialService_idx;
    DROP TABLE IF EXISTS User__new;

    CREATE TABLE User__new (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'SALES_CLERK' CHECK (role IN ('ADMIN','MANAGER','SENIOR_SALES_SUPERVISOR','STATISTICS_SUPERVISOR','SALES_CLERK')),
      isActive INTEGER NOT NULL DEFAULT 1 CHECK (isActive IN (0, 1)),
      username TEXT NOT NULL UNIQUE,
      passwordPlain TEXT,
      salesPointId INTEGER REFERENCES SalesPoint(id),
      passwordHash TEXT,
      commercialServiceId TEXT REFERENCES CommercialService(id),
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT INTO User__new (
      id,
      name,
      role,
      isActive,
      username,
      passwordPlain,
      salesPointId,
      passwordHash,
      commercialServiceId,
      createdAt,
      updatedAt
    )
    SELECT
      id,
      name,
      role,
      isActive,
      username,
      passwordPlain,
      salesPointId,
      passwordHash,
      commercialServiceId,
      createdAt,
      updatedAt
    FROM User;

    DROP TABLE User;
    ALTER TABLE User__new RENAME TO User;

    CREATE INDEX IF NOT EXISTS User_commercialService_idx ON User (commercialServiceId);
  `);
  database.pragma("foreign_keys = ON");
}

function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = new Set(
    database
      .prepare("SELECT name FROM schema_migrations")
      .all()
      .map((row) => (row as { name: string }).name),
  );

  const migrationFiles = readdirSync(getMigrationsDir())
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const fileName of migrationFiles) {
    if (applied.has(fileName)) {
      continue;
    }

    if (fileName === "007_customer_integer_id.sql" && isCustomerIdInteger(database)) {
      database.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(fileName);
      continue;
    }

    if (
      fileName === "009_sales_point_simplify.sql" &&
      !salesPointHasPeriodColumns(database) &&
      salesPointHasTimestamps(database)
    ) {
      database.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(fileName);
      continue;
    }

    if (fileName === "009_sales_point_simplify.sql") {
      applySalesPointSimplifyMigration(database);
      database.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(fileName);
      continue;
    }

    if (fileName === "010_location_master.sql" && locationSchemaIsCurrent(database)) {
      database.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(fileName);
      continue;
    }

    if (fileName === "010_location_master.sql") {
      applyLocationMasterMigration(database);
      database.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(fileName);
      continue;
    }

    if (fileName === "011_simplified_roles.sql" && rolesSchemaIsCurrent(database)) {
      database.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(fileName);
      continue;
    }

    if (fileName === "011_simplified_roles.sql") {
      applySimplifiedRolesMigration(database);
      database.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(fileName);
      continue;
    }

    if (fileName === "012_role_permissions.sql" && permissionsSchemaIsCurrent(database)) {
      database.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(fileName);
      continue;
    }

    if (fileName === "012_role_permissions.sql") {
      applyRolePermissionsMigration(database);
      database.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(fileName);
      continue;
    }

    if (fileName === "013_drop_employee.sql" && !employeeTableExists(database)) {
      database.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(fileName);
      continue;
    }

    if (fileName === "013_drop_employee.sql") {
      applyDropEmployeeMigration(database);
      database.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(fileName);
      continue;
    }

    if (
      fileName === "014_company_settings_themes.sql" &&
      companySettingsThemesAreCurrent(database)
    ) {
      database.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(fileName);
      continue;
    }

    if (fileName === "014_company_settings_themes.sql") {
      applyCompanySettingsThemesMigration(database);
      database.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(fileName);
      continue;
    }

    if (
      fileName === "015_company_settings_agro_dark.sql" &&
      companySettingsAgroDarkAreCurrent(database)
    ) {
      database.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(fileName);
      continue;
    }

    if (fileName === "015_company_settings_agro_dark.sql") {
      applyCompanySettingsAgroDarkMigration(database);
      database.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(fileName);
      continue;
    }

    if (fileName === "016_compress_tax_tables.sql" && taxTablesAreCompressed(database)) {
      database.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(fileName);
      continue;
    }

    if (fileName === "016_compress_tax_tables.sql") {
      applyCompressTaxTablesMigration(database);
      database.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(fileName);
      continue;
    }

    if (fileName === "019_user_drop_service_factory.sql" && userSchemaIsCurrent(database)) {
      database.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(fileName);
      continue;
    }

    if (fileName === "019_user_drop_service_factory.sql") {
      applyUserDropServiceFactoryMigration(database);
      database.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(fileName);
      continue;
    }

    const sql = readFileSync(path.join(getMigrationsDir(), fileName), "utf8");
    database.exec(sql);
    database.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(fileName);
  }
}

export function initDatabase(): Database.Database {
  if (db) {
    return db;
  }

  const dbPath = path.join(app.getPath("userData"), "sales.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  // Fill any new route/action defaults for existing DBs (INSERT OR IGNORE).
  seedDefaultPermissions(db);

  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error("Database has not been initialized");
  }

  return db;
}

export function closeDatabase(): void {
  if (!db) {
    return;
  }

  db.close();
  db = null;
}
