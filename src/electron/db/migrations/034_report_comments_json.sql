-- Per-report comments JSON map on CompanySettings.
-- Keys are report route ids; values are comment text.
-- Legacy stockCommitmentReportComments is migrated in db/index.ts.

ALTER TABLE CompanySettings ADD COLUMN reportCommentsJson TEXT NOT NULL DEFAULT '{}';
