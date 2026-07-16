-- Products
-- Requires: 00_prerequisites.sql, 01_product_cat.sql

INSERT INTO Product (productId, productName, productCode, productCatId, commercialServiceId, uom)
SELECT 1, 'Grade A Palm Oil', 'PO-A', 1, 'seed-cs-001', 'Kg'
WHERE NOT EXISTS (SELECT 1 FROM Product WHERE productId = 1);

INSERT INTO Product (productId, productName, productCode, productCatId, commercialServiceId, uom)
SELECT 2, 'Grade B Palm Oil', 'PO-B', 1, 'seed-cs-001', 'Kg'
WHERE NOT EXISTS (SELECT 1 FROM Product WHERE productId = 2);

INSERT INTO Product (productId, productName, productCode, productCatId, commercialServiceId, uom)
SELECT 3, '1L Bottled Palm Oil', 'BO-1L', 2, 'seed-cs-001', 'Unit'
WHERE NOT EXISTS (SELECT 1 FROM Product WHERE productId = 3);
