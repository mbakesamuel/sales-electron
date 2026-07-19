-- Persistent comments for the Stock vs Commitments report.
-- Safe to re-run only once (tracked by schema_migrations); skip if column exists.

ALTER TABLE CompanySettings ADD COLUMN stockCommitmentReportComments TEXT;
