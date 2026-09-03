-- Transportation cost: when enabled, compute and monthly report include only Moliwe collection point.

ALTER TABLE CompanySettings ADD COLUMN transportCostMoliweOnlyPolicy INTEGER NOT NULL DEFAULT 0 CHECK (transportCostMoliweOnlyPolicy IN (0, 1));
