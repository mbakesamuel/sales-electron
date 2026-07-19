-- Carry-forward stock uses tagged stock adjustments that set desired on-hand.
-- Safe to re-run only once (tracked by schema_migrations).

ALTER TABLE StockAdjustment ADD COLUMN sourceKind TEXT NOT NULL DEFAULT 'NORMAL';
