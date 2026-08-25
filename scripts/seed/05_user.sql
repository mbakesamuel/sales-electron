-- Users
-- Requires: 00_prerequisites.sql
--
-- Demo credentials:
--   admin / admin123
--   manager / manager123
--   supervisor / supervisor123
--   clerk / clerk123
--   bota_clerk / clerk123

INSERT INTO User (
  id,
  name,
  role,
  isActive,
  username,
  passwordHash,
  commercialServiceId,
  salesPointId,
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
  'seed-cs-001',
  NULL,
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM User WHERE lower(username) = 'admin'
);

INSERT INTO User (
  id,
  name,
  role,
  isActive,
  username,
  passwordHash,
  commercialServiceId,
  salesPointId,
  createdAt,
  updatedAt
)
SELECT
  'seed-manager-001',
  'Site Manager',
  'MANAGER',
  1,
  'manager',
  'scrypt$12288f6ad293024461d18cf10693f970$a7e610263638aea44a3084594ad32551edbcb357942cb8171b204f26d460c586d61f88362952f9f6066ff31fe1a6269e2d39044a2ee4fae63a38d8ae06e73d5c',
  'seed-cs-001',
  1,
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM User WHERE lower(username) = 'manager'
);

INSERT INTO User (
  id,
  name,
  role,
  isActive,
  username,
  passwordHash,
  commercialServiceId,
  salesPointId,
  createdAt,
  updatedAt
)
SELECT
  'seed-supervisor-001',
  'Sales Supervisor',
  'SENIOR_SALES_SUPERVISOR',
  1,
  'supervisor',
  'scrypt$28508f919ff8259a5ee8b757c6123597$77df77c45613816b77d8cfe1d273d78447554f995ffb7d99122d0aefb3fd8f981815e905bdcc6562841672bf0ae32587616af619c9544ce0aefe2e1416461a80',
  'seed-cs-001',
  1,
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM User WHERE lower(username) = 'supervisor'
);

INSERT INTO User (
  id,
  name,
  role,
  isActive,
  username,
  passwordHash,
  commercialServiceId,
  salesPointId,
  createdAt,
  updatedAt
)
SELECT
  'seed-clerk-001',
  'Main Sales Clerk',
  'STORE_KEEPER',
  1,
  'clerk',
  'scrypt$41ea3979fd2d52e9bbf8c0f19f695be5$4f26ee04439884109e1f2f8b02fa85115f37ac1d4ad52e036667b8ac969238adcf60b81c4590cbd9543147a05363d5ef41b00241bf98693847b48b3106a4997a',
  'seed-cs-001',
  1,
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM User WHERE lower(username) = 'clerk'
);

INSERT INTO User (
  id,
  name,
  role,
  isActive,
  username,
  passwordHash,
  commercialServiceId,
  salesPointId,
  createdAt,
  updatedAt
)
SELECT
  'seed-clerk-bota-001',
  'BOTA Sales Clerk',
  'STORE_KEEPER',
  1,
  'bota_clerk',
  'scrypt$41ea3979fd2d52e9bbf8c0f19f695be5$4f26ee04439884109e1f2f8b02fa85115f37ac1d4ad52e036667b8ac969238adcf60b81c4590cbd9543147a05363d5ef41b00241bf98693847b48b3106a4997a',
  'seed-cs-001',
  2,
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM User WHERE lower(username) = 'bota_clerk'
);
