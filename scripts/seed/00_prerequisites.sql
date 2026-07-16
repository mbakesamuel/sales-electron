-- Prerequisites for catalog / location / user seeds.
-- Safe to re-run: only inserts when missing.

INSERT INTO CompanySettings (id, companyName, department, vatRate, fiscalYearStartMonth)
SELECT 'default', 'Sales Electron Demo', 'Commercial', '0.1925', 1
WHERE NOT EXISTS (SELECT 1 FROM CompanySettings WHERE id = 'default');

INSERT INTO CommercialService (id, code, name, invoicePrefix, isActive, sortOrder, siteKind)
SELECT 'seed-cs-001', 'MAIN', 'Main Commercial Service', 'INV', 1, 0, 'SALES_POINT'
WHERE NOT EXISTS (SELECT 1 FROM CommercialService WHERE id = 'seed-cs-001');

INSERT INTO SalesPoint (id, name)
SELECT 1, 'Main Sales Point'
WHERE NOT EXISTS (SELECT 1 FROM SalesPoint WHERE id = 1);

INSERT INTO SalesPoint (id, name)
SELECT 2, 'BOTA Outlet'
WHERE NOT EXISTS (SELECT 1 FROM SalesPoint WHERE id = 2);
