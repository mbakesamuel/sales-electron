-- Demo reference data for POS / sales screen development.

INSERT INTO CompanySettings (id, companyName, department, vatRate, fiscalYearStartMonth)
SELECT 'default', 'Sales Electron Demo', 'Commercial', '0.1925', 1
WHERE NOT EXISTS (SELECT 1 FROM CompanySettings WHERE id = 'default');

INSERT INTO CommercialService (id, code, name, invoicePrefix, isActive, sortOrder, siteKind)
SELECT 'seed-cs-001', 'MAIN', 'Main Commercial Service', 'INV', 1, 0, 'SALES_POINT'
WHERE NOT EXISTS (SELECT 1 FROM CommercialService WHERE id = 'seed-cs-001');

INSERT INTO SalesPoint (id, name)
SELECT 1, 'Main Sales Point'
WHERE NOT EXISTS (SELECT 1 FROM SalesPoint WHERE id = 1);

INSERT INTO Location (locationName)
SELECT 'Main Store'
WHERE NOT EXISTS (SELECT 1 FROM Location WHERE locationName = 'Main Store');

INSERT INTO StorageLocation (salesPointId, locationId, isDefault)
SELECT
  1,
  (SELECT id FROM Location WHERE locationName = 'Main Store' LIMIT 1),
  1
WHERE NOT EXISTS (
  SELECT 1 FROM StorageLocation sl
  INNER JOIN Location l ON l.id = sl.locationId
  WHERE sl.salesPointId = 1 AND l.locationName = 'Main Store'
);

INSERT INTO CustomerTypeDefinition (id, code, name, sortOrder, isActive, isSystem)
SELECT 'seed-ct-retail', 'RETAIL', 'Retail', 0, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM CustomerTypeDefinition WHERE id = 'seed-ct-retail');

INSERT INTO TaxRegime (id, name, kind, commercialServiceId)
SELECT 'tax-regime-actual', 'Actual', 'REAL', NULL
WHERE NOT EXISTS (SELECT 1 FROM TaxRegime WHERE id = 'tax-regime-actual');

INSERT INTO TaxRegime (id, name, kind, commercialServiceId)
SELECT 'tax-regime-simplified', 'Simplified', 'SIMPLIFIED', NULL
WHERE NOT EXISTS (SELECT 1 FROM TaxRegime WHERE id = 'tax-regime-simplified');

INSERT INTO TaxRateSchedule (id, rateKind, rate, effectiveFrom)
SELECT 'tax-rate-vat-default', 'VAT', '0.1925', '1970-01-01'
WHERE NOT EXISTS (SELECT 1 FROM TaxRateSchedule WHERE id = 'tax-rate-vat-default');

INSERT INTO TaxRateSchedule (id, rateKind, rate, effectiveFrom)
SELECT 'tax-rate-actual-default', 'SALES_ACTUAL', '0.02', '1970-01-01'
WHERE NOT EXISTS (SELECT 1 FROM TaxRateSchedule WHERE id = 'tax-rate-actual-default');

INSERT INTO TaxRateSchedule (id, rateKind, rate, effectiveFrom)
SELECT 'tax-rate-simplified-default', 'SALES_SIMPLIFIED', '0.05', '1970-01-01'
WHERE NOT EXISTS (SELECT 1 FROM TaxRateSchedule WHERE id = 'tax-rate-simplified-default');

INSERT INTO TaxRateSchedule (id, rateKind, rate, effectiveFrom)
SELECT 'tax-rate-no-taxpayer-default', 'SALES_NO_TAXPAYER', '0.10', '1970-01-01'
WHERE NOT EXISTS (SELECT 1 FROM TaxRateSchedule WHERE id = 'tax-rate-no-taxpayer-default');

INSERT INTO Customer (name, phone, commercialServiceId, customerTypeId, taxRegimeId, residency, taxpayerId)
SELECT 'Acme Trading Ltd', '600000001', 'seed-cs-001', 'seed-ct-retail', 'tax-regime-actual', 'LOCAL', 'NIU-ACME-001'
WHERE NOT EXISTS (
  SELECT 1 FROM Customer
  WHERE name = 'Acme Trading Ltd' AND commercialServiceId = 'seed-cs-001'
);

INSERT INTO Customer (name, phone, commercialServiceId, customerTypeId, taxRegimeId, residency, taxpayerId)
SELECT 'Simplified Retail SARL', '600000002', 'seed-cs-001', 'seed-ct-retail', 'tax-regime-simplified', 'LOCAL', 'NIU-SIMP-002'
WHERE NOT EXISTS (
  SELECT 1 FROM Customer
  WHERE name = 'Simplified Retail SARL' AND commercialServiceId = 'seed-cs-001'
);

INSERT INTO Customer (name, phone, commercialServiceId, customerTypeId, taxRegimeId, residency, taxpayerId)
SELECT 'Cash Buyer No Card', '600000003', 'seed-cs-001', 'seed-ct-retail', 'tax-regime-actual', 'LOCAL', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM Customer
  WHERE name = 'Cash Buyer No Card' AND commercialServiceId = 'seed-cs-001'
);

INSERT INTO Customer (name, phone, commercialServiceId, customerTypeId, taxRegimeId, residency, taxpayerId)
SELECT 'Overseas Exports Ltd', '600000004', 'seed-cs-001', 'seed-ct-retail', 'tax-regime-simplified', 'OVERSEAS', 'NIU-OVRS-004'
WHERE NOT EXISTS (
  SELECT 1 FROM Customer
  WHERE name = 'Overseas Exports Ltd' AND commercialServiceId = 'seed-cs-001'
);
INSERT INTO ProductCat (productCatId, productCat, productCode, isMain)
SELECT 1, 'Palm Oil', 'PO', 1
WHERE NOT EXISTS (SELECT 1 FROM ProductCat WHERE productCatId = 1);

INSERT INTO Product (productId, productName, productCode, productCatId, commercialServiceId, uom)
SELECT 1, 'Grade A Palm Oil', 'PO-A', 1, 'seed-cs-001', 'Kg'
WHERE NOT EXISTS (SELECT 1 FROM Product WHERE productId = 1);

INSERT INTO Product (productId, productName, productCode, productCatId, commercialServiceId, uom)
SELECT 2, 'Grade B Palm Oil', 'PO-B', 1, 'seed-cs-001', 'Kg'
WHERE NOT EXISTS (SELECT 1 FROM Product WHERE productId = 2);

INSERT INTO PaymentMethodDefinition (id, code, name, kind, sortOrder, isActive, isSystem)
SELECT 'seed-pm-cash', 'CASH', 'Cash', 'SIMPLE', 0, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM PaymentMethodDefinition WHERE id = 'seed-pm-cash');

INSERT INTO PaymentMethodDefinition (id, code, name, kind, sortOrder, isActive, isSystem)
SELECT 'seed-pm-cheque', 'CHEQUE', 'Cheque', 'CHEQUE', 1, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM PaymentMethodDefinition WHERE id = 'seed-pm-cheque');
