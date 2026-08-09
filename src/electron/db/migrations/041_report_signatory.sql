-- Global report signatory history (name + title with effective-from date).

CREATE TABLE IF NOT EXISTS ReportSignatory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  effectiveFrom TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (effectiveFrom)
);

INSERT OR IGNORE INTO ReportSignatory (id, name, title, effectiveFrom)
VALUES (
  'seed-signatory-default',
  'NYAKE VICTORINE Epse MBUA',
  'Manager, Palm Oil Sales',
  '2000-01-01'
);
