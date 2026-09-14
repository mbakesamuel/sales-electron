-- 118_sync_outbox_and_state.sql
-- Transactional outbox for offline-first sync to central PostgreSQL via Hono API.

CREATE TABLE IF NOT EXISTS SyncOutbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entityType TEXT NOT NULL,
  entityId TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'UPSERT')),
  payloadJson TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_FLIGHT', 'FAILED', 'SYNCED')),
  retryCount INTEGER NOT NULL DEFAULT 0,
  lastError TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  syncedAt TEXT
);

CREATE INDEX IF NOT EXISTS SyncOutbox_status_idx ON SyncOutbox (status, id);
CREATE INDEX IF NOT EXISTS SyncOutbox_entity_idx ON SyncOutbox (entityType, entityId);

CREATE TABLE IF NOT EXISTS SyncState (
  id TEXT PRIMARY KEY NOT NULL DEFAULT 'default',
  syncServerUrl TEXT NOT NULL DEFAULT 'http://localhost:3001',
  apiToken TEXT,
  salesPointId INTEGER REFERENCES SalesPoint(id),
  deviceId TEXT NOT NULL DEFAULT 'terminal-01',
  lastPulledAt TEXT,
  lastPushedAt TEXT,
  autoSyncEnabled INTEGER NOT NULL DEFAULT 1 CHECK (autoSyncEnabled IN (0, 1)),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO SyncState (id, syncServerUrl, deviceId, autoSyncEnabled, updatedAt)
VALUES ('default', 'http://localhost:3001', 'term-' || lower(hex(randomblob(4))), 1, datetime('now'));

-- Permissions for sync-settings route
INSERT OR IGNORE INTO RoleRoutePermission (role, routeId, access)
VALUES
  ('ADMIN', 'sync-settings', 'WRITE'),
  ('MANAGER', 'sync-settings', 'READ'),
  ('SENIOR_SALES_SUPERVISOR', 'sync-settings', 'NONE'),
  ('STATISTICS_CLERK', 'sync-settings', 'NONE'),
  ('STORE_KEEPER', 'sync-settings', 'NONE');
