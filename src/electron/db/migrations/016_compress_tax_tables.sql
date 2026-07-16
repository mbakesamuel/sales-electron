-- Compress tax model: keep TaxRegime (Actual/Simplified), drop unused tax catalog tables.
-- Applied programmatically in db/index.ts (SQLite table rebuild + column detect).
-- This file marks the migration as applied after the programmatic path runs.
SELECT 1;
