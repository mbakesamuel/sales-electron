-- Seed default admin user for local development.
-- Username: admin  |  Password: admin123

INSERT INTO User (
  id,
  name,
  role,
  isActive,
  username,
  passwordHash,
  commercialServiceId,
  createdAt,
  updatedAt
)
SELECT
  'seed-admin-001',
  'Administrator',
  'ADMIN',
  1,
  'admin',
  'scrypt$09421910787e3c18b245bf531f6ca81f$5402aa4b2c5712875dde82de540f77ec1f8190bbf3949c1a77d76bcfcc76a9da7a6e4e59d844a564164083859d643bcc4ae0976d49c9f9d5ff975d0be6409ac2',
  (SELECT id FROM CommercialService ORDER BY sortOrder ASC, name ASC LIMIT 1),
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM User WHERE lower(username) = 'admin'
);
