-- Report display: hide rows with zero / empty quantities (default on).
-- Safe to re-run only once (tracked by schema_migrations); skip if column exists.

ALTER TABLE CompanySettings ADD COLUMN hideZeroReportRows INTEGER NOT NULL DEFAULT 1;
