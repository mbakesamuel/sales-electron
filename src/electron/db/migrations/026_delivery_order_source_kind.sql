-- Carry-forward delivery orders are sellable validated DOs created via the admin CF screen.
-- Safe to re-run only once (tracked by schema_migrations).

ALTER TABLE DeliveryOrder ADD COLUMN sourceKind TEXT NOT NULL DEFAULT 'NORMAL';
